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

interface TaskLog {
  taskId: string
  taskName: string
  startMs: number
  endMs: number
  ok: boolean
  error?: string
  output: string
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
  let chainInput = originalInput
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
      const summaryInput = `用户请求:\n${originalInput}\n\n各 Task 执行结果:\n\n${taskOutputs}\n\n请汇总以上结果。`
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
 * Only includes tasks not yet completed.
 */
function buildLoopTools(tasks: TaskConfig[], completedNames: Set<string>): any[] {
  const taskTools = tasks
    .filter(t => !completedNames.has(t.name))
    .map(t => ({
      name: `task_${t.name}`,
      description: `执行任务: ${t.description}`,
      parameters: {
        type: 'object',
        properties: {
          input: { type: 'string', description: '传递给该任务的输入内容' },
        },
        required: ['input'],
      },
    }))

  return taskTools
}

/**
 * Loop: each turn is a FRESH single-message LLM call with tools.
 * Previous results are included in the user prompt text, avoiding
 * multi-turn tool-call/tool-result messages that crash some adapters.
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

  const taskMap = Object.fromEntries(tasks.map(t => [`task_${t.name}`, t]))
  const userInput = extractUserInput(args)
  const steps: TaskResult[] = []
  const completedNames = new Set<string>()

  for (let turn = 0; turn < MAX_LOOP_TURNS; turn++) {
    const loopTools = buildLoopTools(tasks, completedNames)

    if (loopTools.length === 0) {
      console.log(`[tohelper:node] loop turn ${turn + 1} | all tasks completed`)
      break
    }

    let promptText = userInput
    if (steps.length > 0) {
      const resultsSummary = steps
        .filter(s => s.status === 'success')
        .map(s => `[${s.taskName} 已完成]\n${s.output}`)
        .join('\n\n')
      promptText = `${userInput}\n\n以下任务已完成:\n${resultsSummary}\n\n请继续执行剩余的任务。`
    }

    const system = `${node.nodePrompt}\n\n你是一个任务编排器。通过调用工具来执行任务。每次选择一个最合适的任务工具并调用它。`
    const messages = [
      { role: 'user', content: [{ type: 'text', text: promptText }] },
    ]

    console.log(`[tohelper:node] loop turn ${turn + 1}/${MAX_LOOP_TURNS} | calling LLM ${node.llm.provider}/${node.llm.model} | remaining tasks=${loopTools.length}`)
    const { blocks, text } = await callLlm(ctx, node.llm, system, messages, loopTools)
    const toolCalls = blocks.filter((b: any) => b.type === 'tool-call')

    if (toolCalls.length === 0) {
      console.log(`[tohelper:node] loop turn ${turn + 1} | no tool calls, text response (${text.length} chars)`)
      break
    }

    for (const call of toolCalls) {
      const callArgs = typeof call.arguments === 'string' ? JSON.parse(call.arguments) : (call.arguments ?? {})
      const task = taskMap[call.name]
      if (!task) {
        console.warn(`[tohelper:node] loop turn ${turn + 1} | unknown tool call: ${call.name}`)
        continue
      }

      const taskInput = callArgs.input ?? userInput
      const taskStartedAt = new Date().toISOString()
      const start = Date.now()
      console.log(`[tohelper:node] loop turn ${turn + 1} | dispatching task "${task.name}" | input (${taskInput.length} chars)`)

      try {
        const taskResult = await runTaskLoop(ctx, task, taskInput, agent)
        const end = Date.now()
        console.log(`[tohelper:node] loop turn ${turn + 1} | task "${task.name}" done (${taskResult.length} chars)`)
        
        steps.push({
          taskId: task.id,
          taskName: task.name,
          status: 'success',
          input: taskInput,
          output: taskResult,
          attempt: 1,
          durationMs: end - start,
          startedAt: taskStartedAt,
          finishedAt: new Date().toISOString(),
        })
        completedNames.add(task.name)
      } catch (e: any) {
        const end = Date.now()
        const error: ExecutionError = {
          code: 'TASK_EXECUTION_ERROR',
          message: e?.message ?? String(e),
          retryable: false,
        }
        console.error(`[tohelper:node] loop turn ${turn + 1} | task "${task.name}" failed: ${error.message}`)
        
        steps.push({
          taskId: task.id,
          taskName: task.name,
          status: 'failed',
          input: taskInput,
          error,
          attempt: 1,
          durationMs: end - start,
          startedAt: taskStartedAt,
          finishedAt: new Date().toISOString(),
        })
        completedNames.add(task.name)
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
  const successSteps = steps.filter(s => s.status === 'success')

  let finalOutput: string

  if (node.nodePrompt && successSteps.length > 1) {
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
