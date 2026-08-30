import type { TaskExecutor } from '../types.js'
import type { TaskConfig, LLMCallTaskConfig } from '../../../types.js'
import type { TaskContext } from '../types.js'

// 深拷贝辅助函数
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export const llmCallExecutor: TaskExecutor = {
  type: 'llm-call',
  
  async execute(config: TaskConfig, context: TaskContext): Promise<unknown> {
    const taskConfig = config.config as LLMCallTaskConfig
    
    // 构造用户输入
    let userContent: string
    if (taskConfig.userPromptTemplate) {
      // 使用模板（支持变量替换）
      userContent = replaceVariables(taskConfig.userPromptTemplate, {
        input: context.input,
        state: context.pipelineState.taskOutputs
      })
    } else {
      // 直接使用输入
      userContent = typeof context.input === 'string'
        ? context.input
        : JSON.stringify(context.input, null, 2)
    }
    
    // LLM 配置（Task 级 > Node 级 > 默认）- 一次性获取并深拷贝，确保配置不变
    const baseLlmConfig = config.llm ?? context.nodeConfig.llm ?? getDefaultLLMConfig(context)
    const llmConfig = deepClone(baseLlmConfig)
    
    // 确保必需字段有默认值
    if (llmConfig.temperature == null) llmConfig.temperature = 0.7
    if (llmConfig.maxTokens == null) llmConfig.maxTokens = 2000
    
    try {
      // 调用 dsh LLM - 只传递 provider 和 model 到 prepareCall
      const prepared = await context.llm.prepareCall(
        {
          provider: llmConfig.provider,
          model: llmConfig.model,
        },
        AbortSignal.timeout(120_000)
      )
      
      const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
      const assembler = new BlockAssembler()
      
      // stream 调用中使用完整配置（包括 temperature 和 maxTokens）
      const stream = prepared.stream({
        provider: llmConfig.provider,
        model: llmConfig.model,
        system: taskConfig.systemPrompt,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: userContent }]
        }],
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
      
      const output = textParts.join('\n') || '(no output)'
      
      // 根据输出格式处理
      if (taskConfig.outputFormat === 'json') {
        try {
          return JSON.parse(output)
        } catch {
          throw new Error('LLM output is not valid JSON')
        }
      }
      
      return output
    } catch (error: any) {
      throw new Error(`LLM call failed: ${error?.message ?? String(error)}`)
    }
  }
}

// 变量替换辅助函数
function replaceVariables(template: string, data: any): string {
  return template.replace(/\$\{([^}]+)\}/g, (_, path) => {
    const value = getValueByPath(data, path)
    return value !== undefined ? String(value) : `\${${path}}`
  })
}

function getValueByPath(obj: any, path: string): any {
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

function getDefaultLLMConfig(context: TaskContext): any {
  // 从 dsh 获取默认 LLM 配置
  try {
    const sel = (context as any).agentDefaultModel?.currentSelection?.()
    if (sel) return { provider: sel.provider, model: sel.model }
  } catch {}
  return { provider: 'deepseek-official', model: 'deepseek-chat' }
}
