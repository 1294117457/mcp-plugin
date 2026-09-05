import type { Context } from '@deepseek-ai/cordis'
import type { LLMSlot, TaskConfig } from '../../types.js'

const MAX_TURNS = 15
const TIMEOUT_MS = 120_000

/**
 * 框架内置行为守则，所有 task 的 system prompt 都会强制注入此内容。
 * 这些规则不可被用户的 taskPrompt 覆盖，框架在拼接 prompt 时始终置于最前。
 */
const FRAMEWORK_SYSTEM_PROMPT = `你是一个工具执行者，必须严格按照以下指令完成任务。

重要规则:
1. 必须调用提供的工具获取真实数据，不要凭空回答
2. 禁止向用户反问或索要信息
3. 工具返回为空时返回明确"无结果"，不要编造
4. 最终输出简洁、结构化
5. 如果任务没有明确要求输出格式，默认输出纯文本描述结果`

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

  const stream = (ctx as any).llm.stream(options)

  for await (const chunk of stream) {
    assembler.push(chunk)
  }

  const blocks = assembler.blocks()
  const text = blocks.filter((b: any) => b.type === 'text').map((b: any) => b.text).join('\n')
  return { blocks, text }
}

/**
 * Validate tool arguments against the tool's inputSchema.
 * Returns null if valid, or an error message if invalid.
 */
function validateToolArgs(schema: any, args: any): string | null {
  const params = schema?.parameters
  if (!params) return null
  const required: string[] = params.required ?? []
  const properties = params.properties ?? {}

  // Check required parameters
  for (const field of required) {
    if (!(field in args) || args[field] === undefined || args[field] === null || args[field] === '') {
      return `Missing required parameter: ${field}`
    }
  }

  // Validate types and constraints
  for (const [key, spec] of Object.entries<any>(properties)) {
    const value = args[key]
    if (value === undefined || value === null) continue // optional fields with no value are fine

    const expectedType = spec.type

    // Type validation
    if (expectedType === 'string' && typeof value !== 'string') {
      return `Parameter "${key}" must be a string, got ${typeof value}`
    }
    if (expectedType === 'number' && typeof value !== 'number') {
      return `Parameter "${key}" must be a number, got ${typeof value}`
    }
    if (expectedType === 'boolean' && typeof value !== 'boolean') {
      return `Parameter "${key}" must be a boolean, got ${typeof value}`
    }
    if (expectedType === 'array' && !Array.isArray(value)) {
      return `Parameter "${key}" must be an array, got ${typeof value}`
    }
    if (expectedType === 'object' && (typeof value !== 'object' || value === null || Array.isArray(value))) {
      return `Parameter "${key}" must be an object, got ${typeof value}`
    }

    // String constraints
    if (typeof value === 'string') {
      if (spec.minLength !== undefined && value.length < spec.minLength) {
        return `Parameter "${key}" must be at least ${spec.minLength} characters, got ${value.length}`
      }
      if (spec.maxLength !== undefined && value.length > spec.maxLength) {
        return `Parameter "${key}" must be at most ${spec.maxLength} characters, got ${value.length}`
      }
      if (spec.pattern) {
        const re = new RegExp(spec.pattern)
        if (!re.test(value)) {
          return `Parameter "${key}" does not match pattern: ${spec.pattern}`
        }
      }
    }

    // Number constraints
    if (typeof value === 'number') {
      if (spec.minimum !== undefined && value < spec.minimum) {
        return `Parameter "${key}" must be >= ${spec.minimum}, got ${value}`
      }
      if (spec.maximum !== undefined && value > spec.maximum) {
        return `Parameter "${key}" must be <= ${spec.maximum}, got ${value}`
      }
    }

    // Enum validation
    if (spec.enum && !spec.enum.includes(value)) {
      return `Parameter "${key}" must be one of: ${spec.enum.join(', ')}`
    }
  }

  return null
}

async function executeToolCall(
  ctx: Context,
  call: any,
  agent?: any,
  toolSchema?: any,
): Promise<{ content: any[]; textSummary: string; validationError?: string }> {
  // Validate arguments against schema before executing
  if (toolSchema) {
    const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : call.arguments
    const validationError = validateToolArgs(toolSchema, args)
    if (validationError) {
      console.warn(`[tohelper:task] argument validation failed for "${call.name}": ${validationError}`)
      return {
        content: [{ type: 'text', text: `[Validation Error] ${validationError}` }],
        textSummary: `[Validation Error] ${validationError}`,
        validationError,
      }
    }
  }

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
 * Direct Mode: single LLM call with tool schemas.
 * The LLM extracts parameters and calls tools via function calling.
 * This avoids extra LLM calls for parameter extraction and summary.
 * Works best with models that have strong function calling support.
 *
 * Force-tool fallback: if LLM returns no tool calls, retry once with
 * an explicit instruction to call the available tools.
 */
async function runTaskDirect(
  ctx: Context,
  task: TaskConfig,
  input: string,
  agent?: any,
): Promise<string> {
  const llm = task.llm
  const toolSchemas = getToolSchemas(ctx, task.tools, agent)
  const systemPrompt = `${FRAMEWORK_SYSTEM_PROMPT}\n\n${task.taskPrompt}`

  // Prepare user message: if input is empty, use a clear no-input instruction
  const effectiveInput = input.trim()
    ? input
    : '（无用户输入。请严格按照上方任务说明执行，直接调用工具获取真实数据，不要反问，不要编造。）'

  console.log(`[tohelper:task] direct mode "${task.name}" | llm=${llm.provider}/${llm.model} | tools=${toolSchemas.length} | inputEmpty=${!input.trim()}`)

  if (toolSchemas.length === 0) {
    const { text } = await callLlm(ctx, llm, systemPrompt, [
      { role: 'user', content: [{ type: 'text', text: effectiveInput }] },
    ])
    return text || '(no output)'
  }

  // Build messages: user input
  const messages = [
    { role: 'user', content: [{ type: 'text', text: effectiveInput }] },
  ]

  // LLM call with tool schemas (first attempt)
  const attempt1 = await callLlm(ctx, llm, systemPrompt, messages, toolSchemas)
  let toolCalls = attempt1.blocks.filter((b: any) => b.type === 'tool-call')

  // Fallback: if no tool calls, retry once with explicit force-call instruction
  if (toolCalls.length === 0) {
    console.log(`[tohelper:task] direct mode "${task.name}" | no tool calls, retrying with force-call instruction`)
    const retrySystem = `${systemPrompt}\n\n你必须从以下工具中选择一个调用来完成上面的任务:\n${toolSchemas.map((s: any) => `  - ${s.name}: ${s.description}`).join('\n')}\n\n请直接调用工具，不要只返回文字描述。`
    const attempt2 = await callLlm(ctx, llm, retrySystem, messages, [])
    toolCalls = attempt2.blocks.filter((b: any) => b.type === 'tool-call')
  }

  if (toolCalls.length === 0) {
    // Still no tool calls — return text directly
    const text = attempt1.text || attempt1.blocks.find((b: any) => b.type === 'text')?.text || ''
    console.log(`[tohelper:task] direct mode "${task.name}" | no tool calls after retry, returning text (${text.length} chars)`)
    return text || '(no output)'
  }

  // Execute all tool calls (with schema validation)
  const toolSchemaMap = Object.fromEntries(toolSchemas.map((s: any) => [s.name, s]))
  const toolResults: string[] = []
  for (const call of toolCalls) {
    const schema = toolSchemaMap[call.name]
    const { textSummary, validationError } = await executeToolCall(ctx, call, agent, schema)
    if (validationError) {
      console.warn(`[tohelper:task] direct mode "${task.name}" | ${call.name} validation failed: ${validationError}`)
      toolResults.push(`[${call.name}] 参数验证失败: ${validationError}`)
    } else {
      console.log(`[tohelper:task] direct mode "${task.name}" | ${call.name} → ${textSummary.length} chars`)
      toolResults.push(`[${call.name}]\n${textSummary}`)
    }
  }

  // Feed results back to LLM for final answer
  const toolData = toolResults.join('\n\n')
  const summaryMessages = [
    ...messages,
    ...toolCalls.map((call: any) => ({
      role: 'assistant' as const,
      content: [{ type: 'text', text: `(called tool: ${call.name})` }],
    })),
    {
      role: 'user' as const,
      content: [
        { type: 'text', text: `以下是工具返回的结果:\n${toolData}\n\n请基于以上结果回答用户最初的问题。` },
      ],
    },
  ]

  const { text: finalText } = await callLlm(ctx, llm, systemPrompt, summaryMessages)
  return finalText || toolData
}

/**
 * Legacy Mode (default): three-phase flow.
 * 1. LLM extracts parameters from taskPrompt + input
 * 2. Execute tools directly with extracted parameters
 * 3. LLM summarizes all results
 *
 * This avoids relying on function calling which lightweight models do unreliably.
 */
async function runTaskLegacy(
  ctx: Context,
  task: TaskConfig,
  input: string,
  agent?: any,
): Promise<string> {
  const llm = task.llm
  const toolSchemas = getToolSchemas(ctx, task.tools, agent)
  const systemPrompt = `${FRAMEWORK_SYSTEM_PROMPT}\n\n${task.taskPrompt}`

  // Prepare user message: if input is empty, use a clear no-input instruction
  const effectiveInput = input.trim()
    ? input
    : '（无用户输入。请严格按照上方任务说明执行，直接调用工具获取真实数据，不要反问，不要编造。）'

  console.log(`[tohelper:task] legacy mode "${task.name}" | llm=${llm.provider}/${llm.model} | tools=${toolSchemas.length} | inputEmpty=${!input.trim()}`)

  if (toolSchemas.length === 0) {
    const { text } = await callLlm(ctx, llm, systemPrompt, [
      { role: 'user', content: [{ type: 'text', text: effectiveInput }] },
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
    const { textSummary, validationError } = await executeToolCall(ctx, {
      id: `task_${Date.now()}`,
      name: schema.name,
      arguments: toolArgs,
    }, agent, schema)
    if (validationError) {
      console.warn(`[tohelper:task] "${task.name}" | ${schema.name} validation failed: ${validationError}`)
      allResults.push(`[${schema.name}] 参数验证失败: ${validationError}`)
      continue
    }
    console.log(`[tohelper:task] "${task.name}" | ${schema.name} → ${textSummary.length} chars`)
    allResults.push(textSummary)
  }

  const toolData = allResults.join('\n\n')

  const summaryPrompt = `${systemPrompt}\n\n以下是工具返回的原始数据:\n${toolData}\n\n用户请求: ${effectiveInput}\n\n请基于工具返回的数据回答用户。`
  const { text } = await callLlm(ctx, llm, summaryPrompt, [
    { role: 'user', content: [{ type: 'text', text: effectiveInput }] },
  ])
  return text || toolData
}

/**
 * Run a Task.
 * - directMode=true: use LLM function calling (faster, fewer LLM calls)
 * - directMode=false (default): use legacy three-phase flow (more reliable for weak models)
 */
export async function runTaskLoop(
  ctx: Context,
  task: TaskConfig,
  input: string,
  agent?: any,
): Promise<string> {
  if (task.directMode) {
    return runTaskDirect(ctx, task, input, agent)
  }
  return runTaskLegacy(ctx, task, input, agent)
}

/**
 * LLM call without tool support, used by Node-level orchestration (pipeline summary, loop).
 */
export { callLlm }
