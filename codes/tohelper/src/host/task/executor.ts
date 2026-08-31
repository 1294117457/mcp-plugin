import type { Context } from '@deepseek-ai/cordis'
import type { LLMSlot, TaskConfig } from '../../types.js'

const MAX_TURNS = 15
const TIMEOUT_MS = 120_000

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

export function extractUserInput(args: unknown): string {
  if (typeof args === 'string') return args
  if (args && typeof args === 'object' && 'input' in args) {
    const input = (args as any).input
    if (typeof input === 'string') return input
  }
  return stringify(args)
}

function getToolSchemas(ctx: Context, toolNames: string[], agent?: any): any[] {
  if (toolNames.length === 0) return []
  try {
    const all: any[] = (ctx as any).tools.schemas(agent)
    const matched = all.filter((s: any) => toolNames.includes(s.name))
    console.log(`[tohelper:task] tool lookup: wanted=[${toolNames.join(', ')}] available=${all.length} matched=${matched.length}`)
    if (matched.length < toolNames.length) {
      const allNames = all.map((s: any) => s.name)
      const missing = toolNames.filter(n => !allNames.includes(n))
      if (missing.length > 0) console.log(`[tohelper:task] missing tools: ${missing.join(', ')}`)
    }
    return matched
  } catch (e) {
    console.error(`[tohelper:task] tool schema fetch failed:`, e)
    return []
  }
}

async function callLlm(
  ctx: Context,
  llm: LLMSlot,
  system: string,
  messages: any[],
  tools?: any[],
): Promise<{ blocks: any[]; text: string }> {
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
  const assembler = new BlockAssembler()

  const options = {
    provider: llm.provider,
    model: llm.model,
    ...(llm.temperature !== undefined ? { temperature: llm.temperature } : {}),
    ...(llm.maxTokens !== undefined ? { maxTokens: llm.maxTokens } : {}),
    system,
    messages,
    signal,
    ...(tools && tools.length > 0 ? { tools } : {}),
  }

  console.log(`[tohelper:llm] stream: ${llm.provider}/${llm.model} | system=${system.length}chars | msgs=${messages.length} | tools=${tools?.length ?? 0}`)
  if (tools && tools.length > 0) {
    console.log(`[tohelper:llm] tools passed to stream:`, JSON.stringify(tools.map((t: any) => ({ name: t.name, keys: Object.keys(t) }))))
  }

  const stream = (ctx as any).llm.stream(options)

  let chunkCount = 0
  for await (const chunk of stream) {
    chunkCount++
    if (chunkCount <= 3) {
      console.log(`[tohelper:llm] chunk #${chunkCount}: ${JSON.stringify(chunk)}`)
    }
    assembler.push(chunk)
  }

  const blocks = assembler.blocks()
  const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
  console.log(`[tohelper:llm] done: ${chunkCount} chunks, ${blocks.length} blocks (${blocks.map((b: any) => b.type).join(',')}) text=${text.length}chars`)
  return { blocks, text }
}

async function executeToolCall(ctx: Context, call: any, agent?: any): Promise<{ content: any[]; textSummary: string }> {
  try {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
    const result = await (ctx as any).tools.execute({
      signal: AbortSignal.timeout(TIMEOUT_MS),
      callId: call.id,
      name: call.name,
      arguments: args,
      ...(agent ? { agent } : {}),
    })
    const content = result.content ?? [{ type: 'text', text: stringify(result.value ?? result) }]
    const textSummary = content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
    return { content, textSummary }
  } catch (e: any) {
    const errText = `[Tool error] ${e?.message ?? String(e)}`
    return { content: [{ type: 'text', text: errText }], textSummary: errText }
  }
}

/**
 * Build a JSON-schema summary for the LLM to understand what parameters a tool needs.
 */
function describeToolParams(schema: any): string {
  const params = schema?.parameters
  if (!params) return '(无参数)'
  const props = params.properties
  if (!props || Object.keys(props).length === 0) return '(无参数)'
  const required = new Set<string>(params.required ?? [])
  const lines = Object.entries(props).map(([key, val]: [string, any]) => {
    const req = required.has(key) ? '(必填)' : '(可选)'
    const desc = val.description ?? val.type ?? ''
    return `  - ${key} ${req}: ${desc}`
  })
  return lines.join('\n')
}

/**
 * Run a Task: use the LLM to extract parameters from taskPrompt + input,
 * then call each tool directly, then use the LLM to summarize results.
 *
 * This "extract → call → summarize" flow avoids relying on unreliable
 * function calling from lightweight models.
 */
export async function runTaskLoop(
  ctx: Context,
  task: TaskConfig,
  input: string,
  agent?: any,
): Promise<string> {
  const llm = task.llm
  const toolSchemas = getToolSchemas(ctx, task.tools, agent)

  console.log(`[tohelper:task] runTaskLoop "${task.name}" | llm=${llm.provider}/${llm.model} | tools=${toolSchemas.length}`)

  if (toolSchemas.length === 0) {
    const { text } = await callLlm(ctx, llm, task.taskPrompt, [
      { role: 'user', content: [{ type: 'text', text: input }] },
    ])
    return text || '(no output)'
  }

  const allResults: string[] = []

  for (const schema of toolSchemas) {
    const params = schema.parameters
    const props = params?.properties
    const hasRequiredParams = props
      && Object.keys(props).length > 0
      && params.required?.length > 0

    let toolArgs: any = {}

    if (hasRequiredParams) {
      const paramDesc = describeToolParams(schema)
      const extractPrompt = `你需要为工具 "${schema.name}" 提取调用参数。\n\n工具说明: ${schema.description ?? ''}\n工具参数:\n${paramDesc}\n\n任务要求: ${task.taskPrompt}\n用户输入: ${input}\n\n请直接输出一个 JSON 对象作为工具参数，不要输出其他内容。只输出 JSON。`
      console.log(`[tohelper:task] "${task.name}" | extracting params for ${schema.name}`)
      const { text: argsText } = await callLlm(ctx, llm, extractPrompt, [
        { role: 'user', content: [{ type: 'text', text: `请提取参数` }] },
      ])
      try {
        const jsonMatch = argsText.match(/\{[\s\S]*\}/)
        toolArgs = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
        console.log(`[tohelper:task] "${task.name}" | extracted params: ${JSON.stringify(toolArgs)}`)
      } catch {
        console.warn(`[tohelper:task] "${task.name}" | param extraction failed, using empty: "${argsText}"`)
        toolArgs = {}
      }
    }

    console.log(`[tohelper:task] "${task.name}" | calling ${schema.name} with args=${JSON.stringify(toolArgs)}`)
    const { textSummary } = await executeToolCall(ctx, {
      id: `task_${Date.now()}`,
      name: schema.name,
      arguments: toolArgs,
    }, agent)
    console.log(`[tohelper:task] "${task.name}" | ${schema.name} → ${textSummary.length} chars`)
    allResults.push(textSummary)
  }

  const toolData = allResults.join('\n\n')

  const summaryPrompt = `${task.taskPrompt}\n\n以下是工具返回的原始数据:\n${toolData}\n\n用户请求: ${input}\n\n请基于工具返回的数据回答用户。`
  const { text } = await callLlm(ctx, llm, summaryPrompt, [
    { role: 'user', content: [{ type: 'text', text: input }] },
  ])
  return text || toolData
}

/**
 * LLM call without tool support, used by Node-level orchestration (pipeline summary, loop).
 */
export { callLlm }
