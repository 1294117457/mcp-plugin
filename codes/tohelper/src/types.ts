// ===== LLM 配置 =====
export interface LLMSlot {
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
}

// ===== Task 配置 =====

/**
 * Task = 任务单元，可独立装配为 DSH tool。
 * 执行流程：用户输入 → LLM + 工具 → 格式化输出
 */
export interface TaskConfig {
  id: string
  name: string
  description: string

  taskPrompt: string
  llm: LLMSlot
  tools: string[]

  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>

  createdAt: string
  updatedAt?: string
}

// ===== Node 配置 =====

export type NodeMode = 'pipeline' | 'loop'

/**
 * Node = 多任务编排，通过 Task ID 引用已定义的 Task。
 * pipeline: 顺序链式执行
 * loop: Node LLM 动态编排，循环直到完成
 */
export interface NodeConfig {
  id: string
  name: string
  description: string

  mode: NodeMode
  nodePrompt: string
  llm: LLMSlot
  tasks: string[]

  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>

  createdAt: string
  updatedAt?: string
}

// ===== 配置文件 =====

export interface ConfigFile {
  version: 2
  tasks: Record<string, TaskConfig>
  nodes: Record<string, NodeConfig>
  equipped: string[]
}
