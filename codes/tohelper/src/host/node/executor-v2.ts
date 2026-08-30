/**
 * Node 执行器（新架构）
 * 支持三种模式：direct, pipeline, loop
 */

import type { NodeConfig, TaskConfig, ExecutionMode } from '../../types.js'
import type { Context } from 'cordis'

export interface NodeExecutorContext {
  ctx: Context
  llm: any
  tools: any
  nodeConfig: NodeConfig
}

export interface TaskExecutionResult {
  taskId: string
  taskName: string
  success: boolean
  output: unknown
  error?: string
  duration: number
}

export interface NodeExecutionResult {
  success: boolean
  output: unknown
  executionLog: TaskExecutionResult[]
  mode: ExecutionMode
  duration: number
}

/**
 * Loop 模式的决策结果
 */
export interface LoopDecision {
  action: 'execute' | 'done' | 'retry'
  taskId?: string
  result?: unknown
  reasoning?: string
}

/**
 * Node 执行器
 */
export class NodeExecutor {
  private context: NodeExecutorContext
  
  constructor(context: NodeExecutorContext) {
    this.context = context
  }
  
  /**
   * 执行 Node
   */
  async run(input: unknown): Promise<NodeExecutionResult> {
    const startTime = Date.now()
    const { nodeConfig } = this.context
    
    try {
      let output: unknown
      let executionLog: TaskExecutionResult[] = []
      
      switch (nodeConfig.mode) {
        case 'direct':
          ({ output, executionLog } = await this.runDirect(input))
          break
        case 'pipeline':
          ({ output, executionLog } = await this.runPipeline(input))
          break
        case 'loop':
          ({ output, executionLog } = await this.runLoop(input))
          break
        default:
          throw new Error(`Unknown execution mode: ${nodeConfig.mode}`)
      }
      
      return {
        success: true,
        output,
        executionLog,
        mode: nodeConfig.mode,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        success: false,
        output: null,
        executionLog: [],
        mode: nodeConfig.mode,
        duration: Date.now() - startTime
      }
    }
  }
  
  /**
   * Direct 模式：执行单个 Task
   */
  private async runDirect(input: unknown): Promise<{ output: unknown; executionLog: TaskExecutionResult[] }> {
    const { nodeConfig } = this.context
    
    if (nodeConfig.tasks.length === 0) {
      throw new Error('Direct mode requires at least one task')
    }
    
    const task = nodeConfig.tasks[0]
    const result = await this.runTask(task, input)
    
    return {
      output: result.output,
      executionLog: [result]
    }
  }
  
  /**
   * Pipeline 模式：顺序执行多个 Task
   */
  private async runPipeline(input: unknown): Promise<{ output: unknown; executionLog: TaskExecutionResult[] }> {
    const { nodeConfig } = this.context
    const executionLog: TaskExecutionResult[] = []
    
    let currentInput = input
    
    for (const task of nodeConfig.tasks) {
      const result = await this.runTask(task, currentInput)
      executionLog.push(result)
      
      if (!result.success) {
        throw new Error(`Task ${task.name} failed: ${result.error}`)
      }
      
      currentInput = result.output
    }
    
    return {
      output: currentInput,
      executionLog
    }
  }
  
  /**
   * Loop 模式：LLM 动态调度 Tasks
   */
  private async runLoop(input: unknown): Promise<{ output: unknown; executionLog: TaskExecutionResult[] }> {
    const { nodeConfig, llm } = this.context
    const executionLog: TaskExecutionResult[] = []
    
    let context = {
      input,
      history: [] as Array<{ taskId: string; taskName: string; output: unknown }>,
      completed: [] as string[]
    }
    
    const maxIterations = 10
    let iteration = 0
    
    while (iteration < maxIterations) {
      // LLM 决定下一步
      const decision = await this.decideNextStep(context)
      
      if (decision.action === 'done') {
        return {
          output: decision.result || context.input,
          executionLog
        }
      }
      
      if (decision.action === 'execute' && decision.taskId) {
        const task = nodeConfig.tasks.find(t => t.id === decision.taskId)
        if (!task) {
          throw new Error(`Task not found: ${decision.taskId}`)
        }
        
        const result = await this.runTask(task, context.input)
        executionLog.push(result)
        
        if (result.success) {
          context.history.push({
            taskId: task.id,
            taskName: task.name,
            output: result.output
          })
          context.completed.push(task.id)
          context.input = result.output
        }
      }
      
      iteration++
    }
    
    // 达到最大迭代次数
    return {
      output: context.input,
      executionLog
    }
  }
  
  /**
   * 执行单个 Task
   */
  private async runTask(task: TaskConfig, input: unknown): Promise<TaskExecutionResult> {
    const startTime = Date.now()
    const { nodeConfig, llm, ctx } = this.context
    
    try {
      // 获取 LLM 配置（Task 级别 > Node 级别）
      const taskLLM = task.llm || nodeConfig.llm
      
      // 获取 Tools（Task 级别 > Node 级别）
      const tools = task.tools.length > 0 ? task.tools : nodeConfig.tools
      
      // 准备 LLM 调用
      const prepared = await llm.prepareCall(
        {
          provider: taskLLM.provider,
          model: taskLLM.model
        },
        AbortSignal.timeout(120_000)
      )
      
      // 构造用户输入
      let userContent: string
      if (task.userPromptTemplate) {
        userContent = this.replaceVariables(task.userPromptTemplate, { input })
      } else {
        userContent = typeof input === 'string' ? input : JSON.stringify(input, null, 2)
      }
      
      // 调用 LLM
      const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
      const assembler = new BlockAssembler()
      
      const stream = prepared.stream({
        provider: taskLLM.provider,
        model: taskLLM.model,
        system: task.taskPrompt,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: userContent }]
        }],
        temperature: taskLLM.temperature || 0.7,
        maxTokens: taskLLM.maxTokens || 2000,
        tools: tools.length > 0 ? tools : undefined
      })
      
      for await (const chunk of stream) {
        assembler.push(chunk)
      }
      
      const blocks = assembler.blocks()
      const textParts = blocks
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
      
      let output: unknown = textParts.join('\n') || '(no output)'
      
      // 处理输出格式
      if (task.outputFormat === 'json') {
        try {
          output = JSON.parse(output as string)
        } catch {
          throw new Error('LLM output is not valid JSON')
        }
      }
      
      return {
        taskId: task.id,
        taskName: task.name,
        success: true,
        output,
        duration: Date.now() - startTime
      }
    } catch (error: any) {
      return {
        taskId: task.id,
        taskName: task.name,
        success: false,
        output: null,
        error: error?.message || String(error),
        duration: Date.now() - startTime
      }
    }
  }
  
  /**
   * Loop 模式：LLM 决定下一步
   */
  private async decideNextStep(context: any): Promise<LoopDecision> {
    const { nodeConfig, llm } = this.context
    
    // 构造决策提示
    const systemPrompt = `
你是任务调度专家。根据以下信息决定下一步：

**Node Prompt（任务目标）**：
${nodeConfig.nodePrompt}

**可用 Tasks**：
${nodeConfig.tasks.map((t, i) => `${i + 1}. [${t.id}] ${t.name}: ${t.taskPrompt}`).join('\n')}

**已完成 Tasks**：
${context.completed.length > 0 ? context.completed.join(', ') : '无'}

**执行历史**：
${context.history.length > 0 ? context.history.map((h: any) => `- ${h.taskName}: ${JSON.stringify(h.output).slice(0, 100)}`).join('\n') : '无'}

**决策选项**：
- execute: 选择一个 Task 执行（提供 taskId）
- done: 任务完成，返回最终结果

**输出格式（JSON）**：
{
  "action": "execute" | "done",
  "taskId": "task-xxx",  // 当 action=execute 时
  "result": {},          // 当 action=done 时
  "reasoning": "决策理由"
}
`.trim()
    
    const userPrompt = `当前输入数据：\n${JSON.stringify(context.input, null, 2)}`
    
    try {
      const prepared = await llm.prepareCall(
        {
          provider: nodeConfig.llm.provider,
          model: nodeConfig.llm.model
        },
        AbortSignal.timeout(60_000)
      )
      
      const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
      const assembler = new BlockAssembler()
      
      const stream = prepared.stream({
        provider: nodeConfig.llm.provider,
        model: nodeConfig.llm.model,
        system: systemPrompt,
        messages: [{
          role: 'user',
          content: [{ type: 'text', text: userPrompt }]
        }],
        temperature: 0.3, // 降低温度以获得更稳定的决策
        maxTokens: 1000
      })
      
      for await (const chunk of stream) {
        assembler.push(chunk)
      }
      
      const blocks = assembler.blocks()
      const textParts = blocks
        .filter((b: any) => b.type === 'text')
        .map((b: any) => b.text)
      
      const output = textParts.join('\n')
      const decision: LoopDecision = JSON.parse(output)
      
      return decision
    } catch (error: any) {
      // 决策失败，返回 done
      return {
        action: 'done',
        result: context.input,
        reasoning: `Decision failed: ${error?.message || String(error)}`
      }
    }
  }
  
  /**
   * 替换变量
   */
  private replaceVariables(template: string, data: any): string {
    return template.replace(/\$\{([^}]+)\}/g, (_, path) => {
      const value = this.getValueByPath(data, path)
      return value !== undefined ? String(value) : `\${${path}}`
    })
  }
  
  private getValueByPath(obj: any, path: string): any {
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
}
