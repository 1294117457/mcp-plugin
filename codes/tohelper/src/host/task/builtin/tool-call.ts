import type { TaskExecutor } from '../types.js'
import type { TaskConfig, ToolCallTaskConfig, InputMapping, OutputMapping } from '../../../types.js'
import type { TaskContext } from '../types.js'

export const toolCallExecutor: TaskExecutor = {
  type: 'tool-call',
  
  async execute(config: TaskConfig, context: TaskContext): Promise<unknown> {
    const taskConfig = config.config as ToolCallTaskConfig
    
    // 检查 Tool 是否在允许列表中
    if (context.nodeConfig.tools && !context.nodeConfig.tools.includes(taskConfig.toolName)) {
      throw new Error(`Tool "${taskConfig.toolName}" not allowed in this Node`)
    }
    
    // 输入映射
    let toolInput: any
    if (taskConfig.inputMapping) {
      toolInput = mapInput(context.input, taskConfig.inputMapping)
    } else {
      toolInput = context.input
    }
    
    try {
      // 调用 dsh Tool
      const agent = context.agent
      const result = agent
        ? await context.tools.execute(taskConfig.toolName, toolInput, agent)
        : await context.tools.execute(taskConfig.toolName, toolInput)
      
      // 输出映射
      if (taskConfig.outputMapping) {
        return mapOutput(result, taskConfig.outputMapping)
      }
      
      return result
    } catch (error: any) {
      throw new Error(`Tool call failed: ${error?.message ?? String(error)}`)
    }
  }
}

// 输入映射辅助函数
function mapInput(input: unknown, mapping: InputMapping): any {
  if (mapping.type === 'direct') {
    return input
  }
  
  if (mapping.type === 'extract') {
    const result: any = {}
    for (const [key, path] of Object.entries(mapping.extractPaths || {})) {
      result[key] = extractByPath(input, path)
    }
    return result
  }
  
  if (mapping.type === 'template') {
    return replaceVariables(mapping.template || '', { input })
  }
  
  return input
}

// 输出映射辅助函数
function mapOutput(output: unknown, mapping: OutputMapping): any {
  if (mapping.type === 'direct') {
    return output
  }
  
  if (mapping.type === 'extract') {
    const result: any = {}
    for (const [key, path] of Object.entries(mapping.extractPaths || {})) {
      result[key] = extractByPath(output, path)
    }
    return result
  }
  
  if (mapping.type === 'wrap') {
    const result: any = {}
    for (const [key, template] of Object.entries(mapping.wrapTemplate || {})) {
      result[key] = replaceVariables(template, { output, input: output })
    }
    return result
  }
  
  return output
}

// JSONPath 简化实现
function extractByPath(obj: any, path: string): any {
  if (path.startsWith('$.')) {
    path = path.slice(2)
  }
  const keys = path.split('.')
  let result = obj
  for (const key of keys) {
    if (result && typeof result === 'object') {
      result = result[key]
    } else {
      return undefined
    }
  }
  return result
}

function replaceVariables(template: string, data: any): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = extractByPath(data, path)
    return value !== undefined ? String(value) : `\${${path}}`
  })
}
