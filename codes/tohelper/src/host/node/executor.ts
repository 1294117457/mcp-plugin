import type { Context } from '@deepseek-ai/cordis'
import type { ConfigFile, NodeConfig, TaskConfig } from '../../types.js'
import { runTaskLoop, extractUserInput, callLlm } from '../task/executor.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown, agent?: any): Promise<{ result: string }>
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
      console.log(`[tohelper:node] ===== Node "${node.name}" START | mode=${node.mode} =====`)
      try {
        let result: { result: string }
        if (node.mode === 'pipeline') result = await runPipeline(ctx, node, resolveTasks(node), args, agent)
        else if (node.mode === 'loop') result = await runLoop(ctx, node, resolveTasks(node), args, agent)
        else result = { result: `[Error] Unknown mode: ${node.mode}` }
        console.log(`[tohelper:node] ===== Node "${node.name}" END (${result.result.length} chars) =====`)
        return result
      } catch (e: any) {
        console.error(`[tohelper:node] ===== Node "${node.name}" ERROR: ${e?.message} =====`)
        return { result: `[Node error] ${e?.message ?? String(e)}` }
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
  agent?: any,
): Promise<{ result: string }> {
  if (tasks.length === 0) {
    return { result: '[Error] Pipeline requires at least one task' }
  }

  const logs: TaskLog[] = []
  const originalInput = extractUserInput(args)
  let chainInput = originalInput

  for (const task of tasks) {
    const start = Date.now()
    console.log(`[tohelper:node] pipeline → "${task.name}" | input (${chainInput.length} chars)`)
    try {
      const output = await runTaskLoop(ctx, task, chainInput, agent)
      console.log(`[tohelper:node] pipeline → "${task.name}" done (${Date.now() - start}ms) | output (${output.length} chars)`)
      logs.push({ taskId: task.id, taskName: task.name, startMs: start, endMs: Date.now(), ok: true, output })
      chainInput = output
    } catch (e: any) {
      logs.push({ taskId: task.id, taskName: task.name, startMs: start, endMs: Date.now(), ok: false, error: e?.message ?? String(e), output: '' })
      const logText = logs.map(l => `  ${l.taskName}: ${l.ok ? 'OK' : 'FAILED'} (${l.endMs - l.startMs}ms)${l.error ? ` - ${l.error}` : ''}`).join('\n')
      return { result: `[Pipeline error at ${task.name}] ${e?.message}\n\nLog:\n${logText}` }
    }
  }

  const taskOutputs = logs
    .map((l, i) => `[Task ${i + 1}: ${l.taskName}]\n${l.output}`)
    .join('\n\n')

  if (node.nodePrompt) {
    const summaryInput = `用户请求:\n${originalInput}\n\n各 Task 执行结果:\n\n${taskOutputs}\n\n请汇总以上结果。`
    const { text } = await callLlm(ctx, node.llm, node.nodePrompt, [
      { role: 'user', content: [{ type: 'text', text: summaryInput }] },
    ])
    return { result: text || taskOutputs }
  }

  return { result: chainInput }
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
  agent?: any,
): Promise<{ result: string }> {
  if (tasks.length === 0) {
    return { result: '[Error] Loop requires at least one task' }
  }

  const taskMap = Object.fromEntries(tasks.map(t => [`task_${t.name}`, t]))
  const userInput = extractUserInput(args)
  const collectedResults: { taskName: string; output: string }[] = []
  const completedNames = new Set<string>()

  for (let turn = 0; turn < MAX_LOOP_TURNS; turn++) {
    const loopTools = buildLoopTools(tasks, completedNames)

    if (loopTools.length === 0) {
      console.log(`[tohelper:node] loop turn ${turn + 1} | all tasks completed`)
      break
    }

    let promptText = userInput
    if (collectedResults.length > 0) {
      const resultsSummary = collectedResults.map(r => `[${r.taskName} 已完成]\n${r.output}`).join('\n\n')
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
      console.log(`[tohelper:node] loop turn ${turn + 1} | dispatching task "${task.name}" | input (${taskInput.length} chars)`)

      try {
        const taskResult = await runTaskLoop(ctx, task, taskInput, agent)
        console.log(`[tohelper:node] loop turn ${turn + 1} | task "${task.name}" done (${taskResult.length} chars)`)
        collectedResults.push({ taskName: task.name, output: taskResult })
        completedNames.add(task.name)
      } catch (e: any) {
        const errText = `[Task error] ${e?.message ?? String(e)}`
        console.error(`[tohelper:node] loop turn ${turn + 1} | task "${task.name}" failed: ${errText}`)
        collectedResults.push({ taskName: task.name, output: errText })
        completedNames.add(task.name)
      }
    }
  }

  if (collectedResults.length === 0) {
    return { result: '(no output)' }
  }

  if (node.nodePrompt && collectedResults.length > 1) {
    const summaryInput = `用户请求:\n${userInput}\n\n各任务执行结果:\n\n${collectedResults.map(r => `[${r.taskName}]\n${r.output}`).join('\n\n')}\n\n请汇总以上结果。`
    const { text } = await callLlm(ctx, node.llm, node.nodePrompt, [
      { role: 'user', content: [{ type: 'text', text: summaryInput }] },
    ])
    if (text) return { result: text }
  }

  return { result: collectedResults.map(r => `[${r.taskName}]\n${r.output}`).join('\n\n') }
}
