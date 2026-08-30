import type { NodeConfig, TaskConfig } from '../../types.js'

/**
 * Task 执行上下文（运行时）
 */
export interface TaskContext {
  // dsh 服务注入
  llm: any
  tools: any
  agent?: any
  
  // Node 级配置
  nodeConfig: NodeConfig
  
  // Pipeline 状态
  pipelineState: PipelineState
  
  // 当前输入
  input: unknown
}

/**
 * Pipeline 状态（Task 间共享）
 */
export interface PipelineState {
  // 所有 Task 的输出结果
  taskOutputs: Record<string, unknown>
  
  // 全局变量（可选）
  variables: Record<string, unknown>
  
  // 执行历史（调试用）
  executionLog: Array<{
    taskId: string
    startTime: number
    endTime: number
    success: boolean
    error?: string
  }>
}

/**
 * Task 执行器接口
 */
export interface TaskExecutor {
  type: string
  execute(config: TaskConfig, context: TaskContext): Promise<unknown>
}
