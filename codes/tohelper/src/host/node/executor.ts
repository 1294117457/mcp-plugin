import type { Context } from '@deepseek-ai/cordis'
import type { LLMSlot, NodeConfig, TaskConfig } from '../../types.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown, agent?: any): Promise<{ result: string }>
}

const MAX_TASK_TURNS = 15
const TASK_TIMEOUT_MS = 120_000

export function createNodeExecutor(ctx: Context): NodeExecutor {
  return {
    async run(node, args, agent) {
      const mode = node.mode || (node as any).executionMode || 'direct'
      console.log(`[tohelper:executor] ===== Node "${node.name}" START | mode=${mode} =====`)
      try {
        let result: { result: string }
        if (mode === 'direct') result = await runDirectMode(ctx, node, args, agent)
        else if (mode === 'pipeline') result = await runPipelineMode(ctx, node, args, agent)
        else if (mode === 'loop') result = await runLoopMode(ctx, node, args, agent)
        else result = { result: `[Error] Unknown execution mode: ${mode}` }
        console.log(`[tohelper:executor] ===== Node "${node.name}" END | result (${result.result.length} chars): "${result.result.slice(0, 200)}" =====`)
        return result
      } catch (e: any) {
        console.error(`[tohelper:executor] ===== Node "${node.name}" ERROR: ${e?.message ?? String(e)} =====`)
        return { result: `[Node execution error] ${e?.message ?? String(e)}` }
      }
    },
  }
}

interface TaskLog {
  taskId: string; taskName: string
  startMs: number; endMs: number
  ok: boolean; error?: string
  output: string
}

function stringify(value: unknown): string {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2)
}

function resolveLlm(task: TaskConfig, node: NodeConfig): LLMSlot {
  return task.llm ?? node.llm ?? { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 }
}

function getToolSchemas(ctx: Context, toolNames: string[], agent?: any): any[] {
  if (toolNames.length === 0) return []
  try {
    const all: any[] = (ctx as any).tools.schemas(agent)
    const matched = all.filter((s: any) => toolNames.includes(s.name))
    console.log(`[tohelper:executor] tool lookup: wanted=[${toolNames.join(', ')}] available=${all.length} matched=${matched.length}`)
    if (matched.length < toolNames.length) {
      const allNames = all.map((s: any) => s.name)
      const missing = toolNames.filter(n => !allNames.includes(n))
      if (missing.length > 0) console.log(`[tohelper:executor] missing tools: ${missing.join(', ')}`)
    }
    return matched
  } catch (e) {
    console.error(`[tohelper:executor] tool schema fetch failed:`, e)
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
  const signal = AbortSignal.timeout(TASK_TIMEOUT_MS)
  const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
  const assembler = new BlockAssembler()

  const callConfig = {
    provider: llm.provider,
    model: llm.model,
    ...(llm.temperature !== undefined ? { temperature: llm.temperature } : {}),
    ...(llm.maxTokens !== undefined ? { maxTokens: llm.maxTokens } : {}),
  }

  const prepared = await (ctx as any).llm.prepareCall(callConfig, signal)

  const stream = prepared.stream({
    ...prepared.config,
    system,
    messages,
    signal,
    ...(tools && tools.length > 0 ? { tools } : {}),
  })

  for await (const chunk of stream) {
    assembler.push(chunk)
  }

  const blocks = assembler.blocks()
  const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
  return { blocks, text }
}

async function executeToolCall(ctx: Context, call: any, agent?: any): Promise<{ content: any[]; textSummary: string }> {
  try {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
    const result = await (ctx as any).tools.execute({
      signal: AbortSignal.timeout(TASK_TIMEOUT_MS),
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
 * Run a mini agent loop for one Task: LLM calls tools iteratively until
 * the model returns a text-only response or the turn limit is reached.
 *
 * When the LLM returns empty text after a tool call, the tool result
 * text is used as the Task output (some models return empty after receiving
 * tool results, treating the data as self-explanatory).
 */
async function runTaskLoop(
  ctx: Context,
  task: TaskConfig,
  node: NodeConfig,
  input: string,
  agent?: any,
): Promise<string> {
  const llm = resolveLlm(task, node)
  const toolSchemas = getToolSchemas(ctx, task.tools, agent)
  const system = task.taskPrompt || node.nodePrompt || ''
  console.log(`[tohelper:executor] runTaskLoop "${task.name}" | llm=${llm.provider}/${llm.model} | tools=${toolSchemas.length} | system="${system.slice(0, 60)}"`)
  const messages: any[] = [
    { role: 'user', content: [{ type: 'text', text: input }] },
  ]

  let lastToolResultText = ''

  for (let turn = 0; turn < MAX_TASK_TURNS; turn++) {
    console.log(`[tohelper:executor] "${task.name}" turn ${turn + 1}/${MAX_TASK_TURNS}`)
    const { blocks } = await callLlm(ctx, llm, system, messages, toolSchemas)
    const toolCalls = blocks.filter((b: any) => b.type === 'tool-call')

    if (toolCalls.length === 0) {
      const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      if (text) {
        console.log(`[tohelper:executor] "${task.name}" turn ${turn + 1} → text response (${text.length} chars): "${text.slice(0, 100)}"`)
        return text
      }
      if (lastToolResultText) {
        console.log(`[tohelper:executor] "${task.name}" turn ${turn + 1} → empty LLM response, using last tool result (${lastToolResultText.length} chars)`)
        return lastToolResultText
      }
      console.log(`[tohelper:executor] "${task.name}" turn ${turn + 1} → empty response, no tool results available`)
      return '(no output)'
    }

    console.log(`[tohelper:executor] "${task.name}" turn ${turn + 1} → ${toolCalls.length} tool call(s): ${toolCalls.map((c: any) => c.name).join(', ')}`)
    messages.push({ role: 'assistant', content: blocks })

    const toolResultParts: string[] = []
    for (const call of toolCalls) {
      const { content, textSummary } = await executeToolCall(ctx, call, agent)
      console.log(`[tohelper:executor] "${task.name}" tool "${call.name}" result: ${textSummary.slice(0, 200)}`)
      toolResultParts.push(textSummary)
      messages.push({
        role: 'user',
        content: [{ type: 'tool-result', toolCallId: call.id, content, isError: false }],
      })
    }
    lastToolResultText = toolResultParts.join('\n\n')
  }

  const lastAssistant = [...messages].reverse().find((m: any) => m.role === 'assistant')
  if (lastAssistant) {
    const text = lastAssistant.content.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
    if (text) return text
  }
  if (lastToolResultText) return lastToolResultText
  return '[Warning] Task reached max turns without a final text response'
}

// ===== Direct mode: single Task with mini agent loop =====

async function runDirectMode(
  ctx: Context,
  node: NodeConfig,
  args: unknown,
  agent?: any,
): Promise<{ result: string }> {
  const input = stringify(args)
  const task = node.tasks?.[0]

  if (task) {
    const result = await runTaskLoop(ctx, task, node, input, agent)
    return { result }
  }

  const llm = node.llm ?? { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 }
  const toolSchemas = getToolSchemas(ctx, node.tools ?? [], agent)
  const system = node.nodePrompt || ''
  const messages: any[] = [{ role: 'user', content: [{ type: 'text', text: input }] }]

  for (let turn = 0; turn < MAX_TASK_TURNS; turn++) {
    const { blocks } = await callLlm(ctx, llm, system, messages, toolSchemas)
    const toolCalls = blocks.filter((b: any) => b.type === 'tool-call')

    if (toolCalls.length === 0) {
      const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
      return { result: text || '(no output)' }
    }

    messages.push({ role: 'assistant', content: blocks })
    for (const call of toolCalls) {
      const { content } = await executeToolCall(ctx, call, agent)
      messages.push({
        role: 'user',
        content: [{ type: 'tool-result', toolCallId: call.id, content, isError: false }],
      })
    }
  }

  return { result: '[Warning] Direct mode reached max turns' }
}

// ===== Pipeline mode: sequential Tasks, each with mini agent loop =====

async function runPipelineMode(
  ctx: Context,
  node: NodeConfig,
  args: unknown,
  agent?: any,
): Promise<{ result: string }> {
  if (!node.tasks || node.tasks.length === 0) {
    return { result: '[Error] Pipeline mode requires at least one task' }
  }

  const logs: TaskLog[] = []
  const originalInput = stringify(args)

  for (const task of node.tasks) {
    const start = Date.now()
    console.log(`[tohelper:executor] pipeline → starting "${task.name}" | input (${originalInput.length} chars)`)
    try {
      const output = await runTaskLoop(ctx, task, node, originalInput, agent)
      console.log(`[tohelper:executor] pipeline → "${task.name}" done (${Date.now() - start}ms) | output (${output.length} chars): "${output.slice(0, 100)}"`)
      logs.push({ taskId: task.id, taskName: task.name, startMs: start, endMs: Date.now(), ok: true, output })
    } catch (e: any) {
      logs.push({ taskId: task.id, taskName: task.name, startMs: start, endMs: Date.now(), ok: false, error: e?.message ?? String(e), output: '' })
      const logText = logs.map(l => `  ${l.taskName}: ${l.ok ? 'OK' : 'FAILED'} (${l.endMs - l.startMs}ms)${l.error ? ` - ${l.error}` : ''}`).join('\n')
      return { result: `[Pipeline error at ${task.name}] ${e?.message}\n\nExecution log:\n${logText}` }
    }
  }

  const taskOutputs = logs
    .map((l, i) => `[Task ${i + 1}: ${l.taskName}] ${l.ok ? '执行成功' : '执行失败'}\n${l.output}`)
    .join('\n\n')

  console.log(`[tohelper:executor] pipeline → all tasks done | combined outputs (${taskOutputs.length} chars)`)

  if (node.nodePrompt) {
    const llm = node.llm ?? { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 }
    const summaryInput = `用户原始请求:\n${originalInput}\n\n以下是各 Task 的执行结果:\n\n${taskOutputs}\n\n请根据以上结果，为用户提供完整的汇总回答。`
    console.log(`[tohelper:executor] pipeline → node summary | prompt (${summaryInput.length} chars): "${summaryInput.slice(0, 300)}"`)
    const { text } = await callLlm(ctx, llm, node.nodePrompt, [
      { role: 'user', content: [{ type: 'text', text: summaryInput }] },
    ])
    console.log(`[tohelper:executor] pipeline → node summary result (${text.length} chars): "${text.slice(0, 200)}"`)
    const result = text || taskOutputs
    return { result }
  }

  return { result: taskOutputs }
}

// ===== Loop mode: Node LLM decides which Task to run =====

async function runLoopMode(
  ctx: Context,
  node: NodeConfig,
  args: unknown,
  agent?: any,
): Promise<{ result: string }> {
  if (!node.tasks || node.tasks.length === 0) {
    return { result: '[Error] Loop mode requires at least one task' }
  }

  const llm = node.llm ?? { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 }
  const taskMap = Object.fromEntries(node.tasks.map(t => [t.name, t]))
  const taskList = node.tasks.map(t => `- ${t.name}: ${t.taskPrompt || t.description || '(no description)'}`).join('\n')

  const system = `${node.nodePrompt || '你是一个任务编排器。'}\n\n可用 Task:\n${taskList}\n\n规则:\n- 回复 JSON: {"task": "task_name", "input": "..."} 来执行一个 Task\n- 回复 JSON: {"done": true, "result": "..."} 来结束并返回最终结果\n- 每轮你会收到 Task 的执行结果，据此决定下一步`

  const messages: any[] = [
    { role: 'user', content: [{ type: 'text', text: stringify(args) }] },
  ]

  for (let turn = 0; turn < MAX_TASK_TURNS; turn++) {
    const { text } = await callLlm(ctx, llm, system, messages)

    let parsed: any
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null
    } catch { parsed = null }

    if (!parsed) {
      return { result: text || '(no output)' }
    }

    if (parsed.done) {
      return { result: parsed.result ?? text }
    }

    const taskName = parsed.task
    const task = taskMap[taskName]
    if (!task) {
      messages.push({ role: 'assistant', content: [{ type: 'text', text }] })
      messages.push({ role: 'user', content: [{ type: 'text', text: `[Error] Task "${taskName}" not found. Available: ${Object.keys(taskMap).join(', ')}` }] })
      continue
    }

    messages.push({ role: 'assistant', content: [{ type: 'text', text }] })

    const taskInput = parsed.input ?? stringify(args)
    const taskResult = await runTaskLoop(ctx, task, node, taskInput, agent)

    messages.push({ role: 'user', content: [{ type: 'text', text: `[Task "${taskName}" result]\n${taskResult}` }] })
  }

  return { result: '[Warning] Loop mode reached max turns' }
}
