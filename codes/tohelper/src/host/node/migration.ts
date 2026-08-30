/**
 * 数据迁移工具
 * 将旧版本的 Node 和 Task 配置迁移到新架构
 */

import type { NodeConfig, TaskConfig, LegacyNodeConfig, LegacyTaskConfig } from '../../types.js'

/**
 * 迁移 Task 配置
 */
export function migrateTask(legacy: LegacyTaskConfig): TaskConfig {
  // 提取 tools
  let tools: string[] = []
  
  if (legacy.type === 'tool-call' && 'toolName' in legacy.config) {
    tools = [legacy.config.toolName]
  }
  
  // 提取 taskPrompt
  let taskPrompt = ''
  if (legacy.type === 'llm-call' && 'systemPrompt' in legacy.config) {
    taskPrompt = legacy.config.systemPrompt || ''
  } else if (legacy.type === 'tool-call') {
    taskPrompt = `调用工具：${tools.join(', ')}`
  } else if (legacy.type === 'transform' && 'script' in legacy.config) {
    taskPrompt = `执行转换脚本`
  }
  
  // 提取 outputFormat
  let outputFormat: 'text' | 'json' | undefined
  if (legacy.type === 'llm-call' && 'outputFormat' in legacy.config) {
    outputFormat = legacy.config.outputFormat
  }
  
  // 提取 userPromptTemplate
  let userPromptTemplate: string | undefined
  if (legacy.type === 'llm-call' && 'userPromptTemplate' in legacy.config) {
    userPromptTemplate = legacy.config.userPromptTemplate
  }
  
  return {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description,
    taskPrompt,
    tools,
    llm: legacy.llm,
    outputFormat,
    userPromptTemplate
  }
}

/**
 * 迁移 Node 配置
 */
export function migrateNode(legacy: LegacyNodeConfig): NodeConfig {
  // 提取 nodePrompt
  let nodePrompt = legacy.systemPrompt || legacy.description || ''
  
  // 提取 mode
  let mode: 'direct' | 'pipeline' | 'loop' = 'pipeline'
  if (legacy.executionMode === 'direct') {
    mode = 'direct'
  } else if (legacy.executionMode === 'pipeline') {
    mode = 'pipeline'
  }
  
  // 迁移 tasks
  let tasks: TaskConfig[] = []
  if (legacy.tasks && legacy.tasks.length > 0) {
    tasks = legacy.tasks.map(migrateTask)
  } else if (legacy.executionMode === 'direct' && legacy.systemPrompt) {
    // direct 模式下创建一个默认 Task
    tasks = [{
      id: `task-${Date.now()}`,
      name: 'Main Task',
      taskPrompt: legacy.systemPrompt,
      tools: legacy.tools || [],
      outputFormat: 'text'
    }]
  }
  
  // 提取 llm（必需）
  const llm = legacy.llm || {
    provider: 'deepseek-official',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2000
  }
  
  return {
    id: legacy.id,
    name: legacy.name,
    description: legacy.description,
    nodePrompt,
    llm,
    mode,
    tasks,
    tools: legacy.tools || [],
    inputSchema: legacy.inputSchema,
    outputSchema: legacy.outputSchema,
    createdAt: legacy.createdAt,
    updatedAt: legacy.updatedAt
  }
}

/**
 * 检测是否为旧版本配置
 */
export function isLegacyTask(task: any): task is LegacyTaskConfig {
  return task && typeof task === 'object' && 'type' in task && 'config' in task
}

export function isLegacyNode(node: any): node is LegacyNodeConfig {
  return node && typeof node === 'object' && 'executionMode' in node && !('mode' in node)
}

/**
 * 自动迁移配置
 */
export function autoMigrate<T>(data: T): T {
  if (isLegacyNode(data)) {
    return migrateNode(data) as any
  }
  if (isLegacyTask(data)) {
    return migrateTask(data) as any
  }
  return data
}
