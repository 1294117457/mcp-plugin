import type { TaskConfig, TaskContext, TaskExecutor } from './types.js'

/**
 * Task Registry（单例）
 */
class TaskRegistry {
  private executors = new Map<string, TaskExecutor>()
  
  /**
   * 注册 Task 类型
   */
  register(executor: TaskExecutor): void {
    if (this.executors.has(executor.type)) {
      throw new Error(`Task type "${executor.type}" already registered`)
    }
    this.executors.set(executor.type, executor)
    console.log(`[tohelper] Task type "${executor.type}" registered`)
  }
  
  /**
   * 获取 Task 执行器
   */
  getExecutor(type: string): TaskExecutor | undefined {
    return this.executors.get(type)
  }
  
  /**
   * 执行 Task
   */
  async execute(config: TaskConfig, context: TaskContext): Promise<unknown> {
    const executor = this.executors.get(config.type)
    if (!executor) {
      throw new Error(`Unknown task type: ${config.type}`)
    }
    
    // 记录执行日志
    const startTime = Date.now()
    context.pipelineState.executionLog.push({
      taskId: config.id,
      startTime,
      endTime: 0,
      success: false
    })
    
    try {
      const result = await executor.execute(config, context)
      
      // 更新日志
      const log = context.pipelineState.executionLog[context.pipelineState.executionLog.length - 1]
      log.endTime = Date.now()
      log.success = true
      
      // 保存输出
      context.pipelineState.taskOutputs[config.id] = result
      
      return result
    } catch (error: any) {
      // 更新日志
      const log = context.pipelineState.executionLog[context.pipelineState.executionLog.length - 1]
      log.endTime = Date.now()
      log.success = false
      log.error = error?.message ?? String(error)
      
      throw error
    }
  }
  
  /**
   * 列出所有已注册的 Task 类型
   */
  listTypes(): string[] {
    return Array.from(this.executors.keys())
  }
}

// 全局单例
export const taskRegistry = new TaskRegistry()
