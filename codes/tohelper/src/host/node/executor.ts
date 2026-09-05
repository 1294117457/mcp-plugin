import type { Context } from '@deepseek-ai/cordis'
import type { ConfigFile, NodeConfig, TaskConfig, WorkflowResult, TaskResult, ExecutionError } from '../../types.js'
import { runTaskLoop, extractUserInput, callLlm } from '../task/executor.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown, agent?: any): Promise<WorkflowResult>
}

function generateRunId(): string {
  return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const MAX_LOOP_TURNS = 20

export function createNodeExecutor(ctx: Context, config: ConfigFile): NodeExecutor {
  function resolveTask(taskId: string): TaskConfig | undefined {
    return config.tasks[taskId]
  }

  function resolveTasks(node: NodeConfig): TaskConfig[] {
    const resolved: TaskConfig[] = []
    console.log(`[tohelper:node] resolveTasks: node "${node.name}" has ${node.tasks.length} task IDs, config has ${Object.keys(config.tasks).length} tasks`)
    for (const tid of node.tasks) {
      const task = resolveTask(tid)
      if (task) resolved.push(task)
      else console.warn(`[tohelper:node] task "${tid}" referenced by node "${node.name}" not found`)
    }
    console.log(`[tohelper:node] resolveTasks: resolved ${resolved.length}/${node.tasks.length} tasks: [${resolved.map(t => t.name).join(', ')}]`)
    return resolved
  }

  return {
    async run(node, args, agent) {
      const runId = generateRunId()
      const startedAt = new Date().toISOString()
      console.log(`[tohelper:node] ===== Node "${node.name}" START | runId=${runId} | mode=${node.mode} =====`)
      
      try {
        let result: WorkflowResult
        if (node.mode === 'pipeline') {
          result = await runPipeline(ctx, node, resolveTasks(node), args, agent, runId, startedAt)
        } else if (node.mode === 'loop') {
          result = await runLoop(ctx, node, resolveTasks(node), args, agent, runId, startedAt)
        } else {
          const error: ExecutionError = {
            code: 'INVALID_MODE',
            message: `Unknown mode: ${node.mode}`,
          }
          result = {
            ok: false,
            status: 'failed',
            runId,
            nodeId: node.id,
            nodeName: node.name,
            input: args,
            error,
            steps: [],
            startedAt,
            finishedAt: new Date().toISOString(),
          }
        }
        console.log(`[tohelper:node] ===== Node "${node.name}" END | status=${result.status} =====`)
        return result
      } catch (e: any) {
        console.error(`[tohelper:node] ===== Node "${node.name}" ERROR: ${e?.message} =====`)
        const error: ExecutionError = {
          code: 'NODE_EXECUTION_ERROR',
          message: e?.message ?? String(e),
        }
        return {
          ok: false,
          status: 'failed',
          runId,
          nodeId: node.id,
          nodeName: node.name,
          input: args,
          error,
          steps: [],
          startedAt,
          finishedAt: new Date().toISOString(),
        }
      }
    },
  }
}

/**
 * Resolve the first task's input in pipeline mode based on firstTaskInput strategy.
 * - 'self' (default): empty string — task is self-contained, not polluted by node user input
 * - 'user': use node user input (backward compatible)
 */
function resolveFirstTaskInput(node: NodeConfig, userInput: string): string {
  if (node.firstTaskInput === 'user') {
    console.log(`[tohelper:node] pipeline firstTaskInput='user' → using node user input (${userInput.length} chars)`)
    return userInput
  }
  // Default: 'self' — task is self-contained
  console.log(`[tohelper:node] pipeline firstTaskInput='self' → task self-contained (node input=${userInput.length} chars, ignored)`)
  return ''
}

/**
 * Pipeline: sequential chain — each Task receives the previous Task's output as input.
 * After all Tasks complete, the Node LLM produces a summary.
 */
async function runPipeline(
  ctx: Context,
  node: NodeConfig,
  tasks: TaskConfig[],
  args: unknown,
  agent: any,
  runId: string,
  startedAt: string,
): Promise<WorkflowResult> {
  if (tasks.length === 0) {
    const error: ExecutionError = {
      code: 'NO_TASKS',
      message: 'Pipeline requires at least one task',
    }
    return {
      ok: false,
      status: 'failed',
      runId,
      nodeId: node.id,
      nodeName: node.name,
      input: args,
      error,
      steps: [],
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  const steps: TaskResult[] = []
  const originalInput = extractUserInput(args)
  // First task input: resolved by strategy, not polluted from node user input
  let chainInput = resolveFirstTaskInput(node, originalInput)
  const failurePolicy = node.failurePolicy || 'fail_fast'
  let hasFailure = false

  for (const task of tasks) {
    const taskStartedAt = new Date().toISOString()
    const start = Date.now()
    console.log(`[tohelper:node] pipeline → "${task.name}" | input (${chainInput.length} chars)`)
    
    try {
      const output = await runTaskLoop(ctx, task, chainInput, agent)
      const end = Date.now()
      console.log(`[tohelper:node] pipeline → "${task.name}" done (${end - start}ms) | output (${output.length} chars)`)
      
      const taskResult: TaskResult = {
        taskId: task.id,
        taskName: task.name,
        status: 'success',
        input: chainInput,
        output,
        attempt: 1,
        durationMs: end - start,
        startedAt: taskStartedAt,
        finishedAt: new Date().toISOString(),
      }
      steps.push(taskResult)
      chainInput = output
    } catch (e: any) {
      const end = Date.now()
      const error: ExecutionError = {
        code: 'TASK_EXECUTION_ERROR',
        message: e?.message ?? String(e),
        retryable: false,
      }
      
      const taskResult: TaskResult = {
        taskId: task.id,
        taskName: task.name,
        status: 'failed',
        input: chainInput,
        error,
        attempt: 1,
        durationMs: end - start,
        startedAt: taskStartedAt,
        finishedAt: new Date().toISOString(),
      }
      steps.push(taskResult)
      hasFailure = true
      
      if (failurePolicy === 'fail_fast') {
        // Mark remaining tasks as skipped
        const remainingIndex = tasks.indexOf(task) + 1
        for (let i = remainingIndex; i < tasks.length; i++) {
          const skippedTask = tasks[i]
          const now = new Date().toISOString()
          steps.push({
            taskId: skippedTask.id,
            taskName: skippedTask.name,
            status: 'skipped',
            attempt: 0,
            durationMs: 0,
            startedAt: now,
            finishedAt: now,
          })
        }
        
        return {
          ok: false,
          status: 'failed',
          runId,
          nodeId: node.id,
          nodeName: node.name,
          input: args,
          error,
          steps,
          startedAt,
          finishedAt: new Date().toISOString(),
        }
      } else if (failurePolicy === 'continue') {
        // Continue with empty output
        chainInput = ''
        continue
      }
    }
  }

  // Generate summary
  const taskOutputs = steps
    .filter(s => s.status === 'success')
    .map((s, i) => `[Task ${i + 1}: ${s.taskName}]\n${s.output}`)
    .join('\n\n')

  let finalOutput = chainInput

  if (node.nodePrompt && steps.some(s => s.status === 'success')) {
    try {
      const summaryInput = `用户请求:\n${originalInput || '(空)'}\n\n各 Task 执行结果:\n\n${taskOutputs}\n\n请汇总以上结果。`
      const { text } = await callLlm(ctx, node.llm, node.nodePrompt, [
        { role: 'user', content: [{ type: 'text', text: summaryInput }] },
      ])
      finalOutput = text || taskOutputs
    } catch (e: any) {
      console.error(`[tohelper:node] pipeline summary failed: ${e?.message}`)
      // Use last successful output as fallback
      finalOutput = taskOutputs || chainInput
    }
  }

  const status = hasFailure ? 'partial_failure' : 'success'

  return {
    ok: !hasFailure,
    status,
    runId,
    nodeId: node.id,
    nodeName: node.name,
    input: args,
    output: finalOutput,
    steps,
    startedAt,
    finishedAt: new Date().toISOString(),
  }
}

/**
 * Build virtual ToolSchemas for a single-turn LLM dispatch call.
 * Uses stable Task ID (not task name) for the tool name.
 * Includes explicit workflow_finish tool.
 *
 * Tool descriptions include the full taskPrompt so that the orchestrating LLM
 * can make informed decisions about which task to call with what input.
 */
function buildLoopTools(tasks: TaskConfig[], completedIds: Set<string>): any[] {
  const tools = tasks
    .filter(t => !completedIds.has(t.id))
    .map(t => ({
      // Use Task ID for stability — name can change without breaking Loop
      name: `task_${t.id}`,
      description: `[${t.id}] ${t.description || t.taskPrompt}\n\n任务说明: ${t.taskPrompt}`,
      parameters: {
        type: 'object',
        properties: {
          input: {
            type: 'string',
            description: `传递给该任务的附加请求（可选）。task 是自包含的，无 input 时会按任务说明自主完成。${t.taskPrompt}`,
          },
        },
        required: [],
      },
    }))

  // Explicit finish tool — LLM must call this to confirm completion
  tools.push({
    name: 'workflow_finish',
    description: '当前所有必要任务已完成，输出最终结果。必须提供 answer 字段作为最终输出。',
    parameters: {
      type: 'object',
      properties: {
        answer: { type: 'string', description: '最终输出/回答内容' },
        reason: { type: 'string', description: '为什么现在完成？已完成哪些任务？' },
      },
      required: ['answer'],
    },
  })

  return tools
}

/**
 * Parse a LoopDecision from LLM tool calls.
 * Supports both explicit protocol (action field) and legacy tool names.
 */
interface LoopDecision {
  action: 'run_task' | 'retry_task' | 'finish'
  taskId?: string
  input?: string
  answer?: string
  reason?: string
  rawCallName: string
}

function parseLoopDecision(call: any, taskMap: Record<string, TaskConfig>): LoopDecision {
  const callName = call.name || ''
  const args = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : (call.arguments ?? {})

  if (callName === 'workflow_finish') {
    return {
      action: 'finish',
      answer: args.answer || '',
      reason: args.reason,
      rawCallName: callName,
    }
  }

  // Support explicit protocol: task_<action>_<taskId>
  const explicitMatch = callName.match(/^task_(run_task|retry_task)_(.+)$/)
  if (explicitMatch) {
    const [, action, taskId] = explicitMatch
    return {
      action: action === 'run_task' ? 'run_task' : 'retry_task',
      taskId,
      input: args.input,
      reason: args.reason,
      rawCallName: callName,
    }
  }

  // Legacy support: task_<taskId> or task_<taskName>
  const legacyMatch = callName.match(/^task_(.+)$/)
  if (legacyMatch) {
    const identifier = legacyMatch[1]
    // Prefer Task ID match (stable), fall back to name match (for migration)
    const byId = taskMap[identifier]
    const byName = Object.values(taskMap).find(t => t.name === identifier)
    const resolvedTask = byId || byName
    return {
      action: 'run_task',
      taskId: resolvedTask?.id,
      input: args.input,
      rawCallName: callName,
    }
  }

  // Unknown tool — report it as an error decision
  return {
    action: 'run_task',
    taskId: undefined,
    input: args.input,
    rawCallName: callName,
  }
}

/**
 * Validate a taskId against the allowed task list.
 * Rejects unknown or unauthorized task IDs.
 */
function validateTaskId(taskId: string | undefined, taskMap: Record<string, TaskConfig>, completedIds: Set<string>): { valid: boolean; task?: TaskConfig; reason?: string } {
  if (!taskId) return { valid: false, reason: 'no taskId provided' }
  const task = taskMap[taskId]
  if (!task) return { valid: false, reason: `unknown taskId: ${taskId}` }
  if (completedIds.has(taskId)) return { valid: false, reason: `task "${task.name}" already completed` }
  return { valid: true, task }
}

/**
 * Loop: each turn is a FRESH single-message LLM call with tools.
 * Previous results are included in the user prompt text, avoiding
 * multi-turn tool-call/tool-result messages that crash some adapters.
 *
 * Decision protocol:
 * - action='finish': LLM explicitly signals completion with final answer
 * - action='run_task': execute the specified Task with given input
 * - action='retry_task': re-execute a task (with same or modified input)
 *
 * Tool names use stable Task ID (not task name) for reliability.
 */
async function runLoop(
  ctx: Context,
  node: NodeConfig,
  tasks: TaskConfig[],
  args: unknown,
  agent: any,
  runId: string,
  startedAt: string,
): Promise<WorkflowResult> {
  if (tasks.length === 0) {
    const error: ExecutionError = {
      code: 'NO_TASKS',
      message: 'Loop requires at least one task',
    }
    return {
      ok: false,
      status: 'failed',
      runId,
      nodeId: node.id,
      nodeName: node.name,
      input: args,
      error,
      steps: [],
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  // Build stable task map by ID (not name)
  const taskMap: Record<string, TaskConfig> = Object.fromEntries(tasks.map(t => [t.id, t]))
  const userInput = extractUserInput(args)
  const steps: TaskResult[] = []
  const completedIds = new Set<string>()
  // Track decisions for stalled detection
  const recentDecisions: string[] = []

  for (let turn = 0; turn < MAX_LOOP_TURNS; turn++) {
    const loopTools = buildLoopTools(tasks, completedIds)

    if (loopTools.length <= 1) {
      // Only workflow_finish left — all tasks done
      console.log(`[tohelper:node] loop turn ${turn + 1} | all tasks completed (${completedIds.size}/${tasks.length})`)
      break
    }

    // Build context with previous results
    let promptText = userInput
    if (steps.length > 0) {
      const resultsSummary = steps
        .filter(s => s.status === 'success')
        .map(s => `[${s.taskName}] 已完成\n${s.output}`)
        .join('\n\n')
      const failedSummary = steps
        .filter(s => s.status === 'failed')
        .map(s => `[${s.taskName}] 失败: ${s.error?.message}`)
        .join('\n\n')
      const remaining = tasks.filter(t => !completedIds.has(t.id)).map(t => `  - ${t.name} (${t.id})`).join('\n')
      promptText = `${userInput}\n\n已完成任务:\n${resultsSummary || '(无)'}\n\n失败任务:\n${failedSummary || '(无)'}\n\n剩余可执行任务:\n${remaining}\n\n请选择下一个要执行的任务，或调用 workflow_finish 结束。`
    }

    // System prompt: clearly separate "orchestration reference" from "task input"
    // node 用户输入仅供参考，不直接污染 task
    const system = `${node.nodePrompt}

=== 编排规则 ===
1. 每次只选一个 task 调用；所有 task 完成后必须调用 workflow_finish 结束
2. [node 用户输入] 仅作为你编排决策的参考，不要直接作为 task 的 input
3. task 的 input 由你根据 task 描述判断：
   - 无 input 时：task 自包含，会按任务说明自主完成
   - 有 input 时：作为附加请求传给 task
4. 已完成的任务不能重复执行
5. 如果无法完成任务，调用 workflow_finish 并说明原因

[node 用户输入]: ${userInput || '(空)'}

你必须为每个 task 显式指定 input（可以为空字符串表示无附加请求）。`

    const messages = [
      { role: 'user', content: [{ type: 'text', text: promptText }] },
    ]

    console.log(`[tohelper:node] loop turn ${turn + 1}/${MAX_LOOP_TURNS} | calling LLM ${node.llm.provider}/${node.llm.model} | remaining=${loopTools.length - 1}`)
    const { blocks, text } = await callLlm(ctx, node.llm, system, messages, loopTools)
    const toolCalls = blocks.filter((b: any) => b.type === 'tool-call')

    if (toolCalls.length === 0) {
      // No tool calls — check for explicit finish text
      const finishHint = text?.trim()
      console.log(`[tohelper:node] loop turn ${turn + 1} | no tool calls, text (${text.length} chars): "${text.slice(0, 100)}"`)
      // Implicit finish: use LLM text as answer
      steps.push({
        taskId: '__finish__',
        taskName: '__finish__',
        status: 'success',
        input: text,
        output: text,
        attempt: 1,
        durationMs: 0,
        startedAt: new Date().toISOString(),
        finishedAt: new Date().toISOString(),
      })
      break
    }

    for (const call of toolCalls) {
      const decision = parseLoopDecision(call, taskMap)
      const decisionKey = `${decision.action}:${decision.taskId || ''}:${decision.input || ''}`
      recentDecisions.push(decisionKey)
      // Keep only last 4 decisions for stalled detection
      if (recentDecisions.length > 4) recentDecisions.shift()

      if (decision.action === 'finish') {
        console.log(`[tohelper:node] loop turn ${turn + 1} | LLM requested finish: "${decision.answer?.slice(0, 80)}"`)
        steps.push({
          taskId: '__finish__',
          taskName: '__finish__',
          status: 'success',
          input: text,
          output: decision.answer,
          attempt: 1,
          durationMs: 0,
          startedAt: new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        })
        break
      }

      if (decision.action === 'run_task' || decision.action === 'retry_task') {
        const validation = validateTaskId(decision.taskId, taskMap, completedIds)

        if (!validation.valid) {
          console.warn(`[tohelper:node] loop turn ${turn + 1} | invalid task "${decision.taskId}": ${validation.reason}`)
          // Don't count invalid decisions as task failures — just skip
          steps.push({
            taskId: decision.taskId || '__unknown__',
            taskName: decision.taskId || validation.reason || '__unknown__',
            status: 'failed',
            input: decision.input,
            error: { code: 'INVALID_TASK', message: validation.reason || 'invalid task', retryable: false },
            attempt: 1,
            durationMs: 0,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          })
          // Don't mark as completed — allow retry with correct ID
          continue
        }

        const task = validation.task!
        const taskInput = decision.input ?? userInput
        const taskStartedAt = new Date().toISOString()
        const start = Date.now()

        // Stall detection: if same decision repeats, force finish
        const stallCandidates = recentDecisions.filter(d => d === decisionKey)
        if (stallCandidates.length >= 3) {
          console.warn(`[tohelper:node] loop turn ${turn + 1} | stalled: repeated decision "${decisionKey}", forcing finish`)
          steps.push({
            taskId: '__stalled__',
            taskName: '__stalled__',
            status: 'failed',
            input: taskInput,
            error: { code: 'STALLED', message: `Loop stalled: repeated decision "${decisionKey}"`, retryable: false },
            attempt: 1,
            durationMs: 0,
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
          })
          break
        }

        console.log(`[tohelper:node] loop turn ${turn + 1} | dispatching "${task.name}" (${task.id}) | input (${taskInput.length} chars)`)

        try {
          const output = await runTaskLoop(ctx, task, taskInput, agent)
          const end = Date.now()
          console.log(`[tohelper:node] loop turn ${turn + 1} | "${task.name}" done (${end - start}ms)`)

          steps.push({
            taskId: task.id,
            taskName: task.name,
            status: 'success',
            input: taskInput,
            output,
            attempt: 1,
            durationMs: end - start,
            startedAt: taskStartedAt,
            finishedAt: new Date().toISOString(),
          })
          completedIds.add(task.id)
        } catch (e: any) {
          const end = Date.now()
          const errMsg = e?.message ?? String(e)
          console.error(`[tohelper:node] loop turn ${turn + 1} | "${task.name}" failed: ${errMsg}`)

          steps.push({
            taskId: task.id,
            taskName: task.name,
            status: 'failed',
            input: taskInput,
            error: { code: 'TASK_EXECUTION_ERROR', message: errMsg, retryable: true },
            attempt: 1,
            durationMs: end - start,
            startedAt: taskStartedAt,
            finishedAt: new Date().toISOString(),
          })
          completedIds.add(task.id) // Mark as completed even if failed (don't retry infinitely)
        }
      }
    }

    // Check if we've been asked to finish
    const hasFinish = steps.some(s => s.taskName === '__finish__' || s.taskId === '__stalled__')
    if (hasFinish) break

    // Check stall: all recent decisions are identical
    if (recentDecisions.length >= 3) {
      const allSame = recentDecisions.every(d => d === recentDecisions[0])
      if (allSame) {
        console.warn(`[tohelper:node] loop turn ${turn + 1} | stalled: all recent decisions identical`)
        break
      }
    }
  }

  if (steps.length === 0) {
    return {
      ok: true,
      status: 'success',
      runId,
      nodeId: node.id,
      nodeName: node.name,
      input: args,
      output: '(no output)',
      steps: [],
      startedAt,
      finishedAt: new Date().toISOString(),
    }
  }

  const hasFailure = steps.some(s => s.status === 'failed')
  const hasFinish = steps.some(s => s.taskId === '__finish__' || s.taskId === '__stalled__')
  const successSteps = steps.filter(s => s.status === 'success' && s.taskId !== '__finish__' && s.taskId !== '__stalled__')

  let finalOutput: string

  // If LLM explicitly finished, use its answer
  const finishStep = steps.find(s => s.taskId === '__finish__')
  if (finishStep?.output) {
    finalOutput = String(finishStep.output)
  } else if (hasFinish && steps.find(s => s.taskId === '__stalled__')) {
    const stalled = steps.find(s => s.taskId === '__stalled__')
    finalOutput = `⚠️ Loop 停滞未能完成。\n\n已完成 (${successSteps.length}):\n${successSteps.map(s => `  ✓ ${s.taskName}`).join('\n')}\n\n错误: ${stalled?.error?.message || 'repeated identical decisions'}`
  } else if (successSteps.length > 1 && node.nodePrompt) {
    // Multi-step summary
    try {
      const summaryInput = `用户请求:\n${userInput}\n\n各任务执行结果:\n\n${successSteps.map(s => `[${s.taskName}]\n${s.output}`).join('\n\n')}\n\n请汇总以上结果。`
      const { text } = await callLlm(ctx, node.llm, node.nodePrompt, [
        { role: 'user', content: [{ type: 'text', text: summaryInput }] },
      ])
      finalOutput = text || successSteps.map(s => `[${s.taskName}]\n${s.output}`).join('\n\n')
    } catch (e: any) {
      console.error(`[tohelper:node] loop summary failed: ${e?.message}`)
      finalOutput = successSteps.map(s => `[${s.taskName}]\n${s.output}`).join('\n\n')
    }
  } else {
    finalOutput = successSteps.map(s => `[${s.taskName}]\n${s.output}`).join('\n\n')
  }

  const status = hasFailure && !hasFinish ? 'partial_failure'
    : hasFinish && successSteps.length === 0 ? 'failed'
    : 'success'

  return {
    ok: !hasFailure || hasFinish,
    status,
    runId,
    nodeId: node.id,
    nodeName: node.name,
    input: args,
    output: finalOutput,
    steps,
    startedAt,
    finishedAt: new Date().toISOString(),
  }
}
