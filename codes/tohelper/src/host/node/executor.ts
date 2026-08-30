import type { Context } from '@deepseek-ai/cordis'
import type { NodeConfig } from '../../types.js'
import { taskRegistry } from '../task/index.js'
import type { TaskContext, PipelineState } from '../task/types.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown, agent?: any): Promise<{ result: string }>
}

export function createNodeExecutor(ctx: Context): NodeExecutor {
  return {
    async run(node, args, agent) {
      // ===== 1. direct 模式：单次 LLM 调用 =====
      if (node.executionMode === 'direct' || !node.executionMode) {
        return runDirectMode(ctx, node, args, agent)
      }
      
      // ===== 2. pipeline 模式：Task 编排 =====
      if (node.executionMode === 'pipeline') {
        return runPipelineMode(ctx, node, args, agent)
      }
      
      // ===== 3. subagent 模式：未来扩展 =====
      if (node.executionMode === 'subagent') {
        return { result: '[Error] subagent mode not implemented yet' }
      }
      
      return { result: `[Error] Unknown execution mode: ${node.executionMode}` }
    }
  }
}

/**
 * Direct 模式执行（兼容旧版）
 */
async function runDirectMode(
  ctx: Context,
  node: NodeConfig,
  args: unknown,
  agent?: any
): Promise<{ result: string }> {
  const userContent = typeof args === 'string'
    ? args
    : JSON.stringify(args, null, 2)

  const llmConfig = node.llm ?? getDefaultLlmConfig(ctx)

  try {
    const prepared = await (ctx as any).llm.prepareCall(
      {
        provider: llmConfig.provider,
        model: llmConfig.model,
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
      },
      AbortSignal.timeout(120_000),
    )

    const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
    const assembler = new BlockAssembler()

    const stream = prepared.stream({
      provider: llmConfig.provider,
      model: llmConfig.model,
      system: node.systemPrompt || '',
      messages: [{ role: 'user', content: [{ type: 'text', text: userContent }] }],
      temperature: llmConfig.temperature,
      maxTokens: llmConfig.maxTokens,
    })

    for await (const chunk of stream) {
      assembler.push(chunk)
    }

    const blocks = assembler.blocks()
    const textParts = blocks
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
    const result = textParts.join('\n') || '(no output)'

    return { result }
  } catch (e: any) {
    return { result: `[Node execution error] ${e?.message ?? String(e)}` }
  }
}

/**
 * Pipeline 模式执行（Task 编排）
 */
async function runPipelineMode(
  ctx: Context,
  node: NodeConfig,
  args: unknown,
  agent?: any
): Promise<{ result: string }> {
  if (!node.tasks || node.tasks.length === 0) {
    return { result: '[Error] Pipeline mode requires at least one task' }
  }
  
  // 初始化 Pipeline 状态
  const pipelineState: PipelineState = {
    taskOutputs: {},
    variables: {},
    executionLog: []
  }
  
  let currentInput = args
  
  try {
    // 串行执行所有 Task
    for (const taskConfig of node.tasks) {
      const taskContext: TaskContext = {
        llm: (ctx as any).llm,
        tools: (ctx as any).tools,
        agent,
        nodeConfig: node,
        pipelineState,
        input: currentInput
      }
      
      // 执行 Task
      const output = await taskRegistry.execute(taskConfig, taskContext)
      
      // 传递给下一个 Task
      currentInput = output
    }
    
    // 格式化最终输出
    const result = typeof currentInput === 'string'
      ? currentInput
      : JSON.stringify(currentInput, null, 2)
    
    return { result }
  } catch (e: any) {
    // 返回详细的错误信息（包含执行日志）
    const errorLog = pipelineState.executionLog
      .map(log => `  ${log.taskId}: ${log.success ? 'OK' : 'FAILED'} (${log.endTime - log.startTime}ms)${log.error ? ` - ${log.error}` : ''}`)
      .join('\n')
    
    return {
      result: `[Pipeline execution error] ${e?.message ?? String(e)}\n\nExecution log:\n${errorLog}`
    }
  }
}

function getDefaultLlmConfig(ctx: Context): { provider: string; model: string } {
  try {
    const sel = (ctx as any).agentDefaultModel?.currentSelection?.()
    if (sel) return { provider: sel.provider, model: sel.model }
  } catch { /* empty */ }
  return { provider: 'deepseek-official', model: 'deepseek-chat' }
}
