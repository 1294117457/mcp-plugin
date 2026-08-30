import type { TaskExecutor } from '../types.js'
import type { TaskConfig, TransformTaskConfig } from '../../../types.js'
import type { TaskContext } from '../types.js'

export const transformExecutor: TaskExecutor = {
  type: 'transform',
  
  async execute(config: TaskConfig, context: TaskContext): Promise<unknown> {
    const taskConfig = config.config as TransformTaskConfig
    
    try {
      // 创建安全的执行上下文
      const sandbox = {
        input: context.input,
        state: context.pipelineState.taskOutputs,
        JSON: JSON,
        Math: Math,
        Date: Date,
        // 不暴露危险的全局对象
      }
      
      // 执行转换脚本
      const func = new Function(...Object.keys(sandbox), `return (${taskConfig.script})`)
      const result = func(...Object.values(sandbox))
      
      return result
    } catch (error: any) {
      throw new Error(`Transform failed: ${error?.message ?? String(error)}`)
    }
  }
}
