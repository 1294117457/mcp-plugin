import { taskRegistry } from './registry.js'
import { llmCallExecutor, toolCallExecutor, transformExecutor } from './builtin/index.js'

export { taskRegistry } from './registry.js'
export type { TaskExecutor, TaskContext, PipelineState } from './types.js'

/**
 * 注册所有内置 Task 类型
 */
export function registerBuiltinTasks(): void {
  taskRegistry.register(llmCallExecutor)
  taskRegistry.register(toolCallExecutor)
  taskRegistry.register(transformExecutor)
  
  console.log(`[tohelper] Registered ${taskRegistry.listTypes().length} builtin task types`)
}
