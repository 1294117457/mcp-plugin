// ===== LLM 配置 =====
export interface LLMSlot {
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
}

// ===== Task 配置 =====

/**
 * Task 配置定义（新架构）
 * 设计理念：Task = LLM + Tools + Prompt
 */
export interface TaskConfig {
  id: string
  name: string
  description?: string
  
  // 核心字段
  taskPrompt: string              // Task 的任务提示词（替代 systemPrompt）
  tools: string[]                 // Task 可用的工具列表（支持多个）
  
  // 兼容旧版执行器和配置文件
  type?: 'llm-call' | 'tool-call' | 'transform' | 'conditional'
  config?: TaskTypeConfig

  // 可选配置
  llm?: LLMSlot                   // 独立 LLM 配置（可选，继承 Node 配置）
  outputFormat?: 'text' | 'json'  // 输出格式
  userPromptTemplate?: string     // 用户输入模板
}

// ===== 向后兼容：旧版本 Task 配置 =====

/**
 * 旧版本 Task 配置（向后兼容）
 * @deprecated 请使用新版本 TaskConfig
 */
export interface LegacyTaskConfig {
  id: string
  name: string
  description?: string
  type: 'llm-call' | 'tool-call' | 'transform' | 'conditional'
  config: TaskTypeConfig
  llm?: LLMSlot
}

/**
 * 不同 Task 类型的配置（旧版本）
 */
export type TaskTypeConfig = 
  | LLMCallTaskConfig
  | ToolCallTaskConfig
  | TransformTaskConfig
  | ConditionalTaskConfig

/**
 * LLM 调用 Task 配置（旧版本）
 */
export interface LLMCallTaskConfig {
  systemPrompt: string
  userPromptTemplate?: string
  outputFormat?: 'text' | 'json'
}

/**
 * Tool 调用 Task 配置（旧版本）
 */
export interface ToolCallTaskConfig {
  toolName: string
  inputMapping?: InputMapping
  outputMapping?: OutputMapping
}

/**
 * 数据转换 Task 配置（旧版本）
 */
export interface TransformTaskConfig {
  script: string
}

/**
 * 条件分支 Task 配置（旧版本）
 */
export interface ConditionalTaskConfig {
  condition: string
  trueBranch: string
  falseBranch: string
}

/**
 * 输入映射规则
 */
export interface InputMapping {
  type: 'direct' | 'extract' | 'template'
  extractPaths?: Record<string, string>
  template?: string
}

/**
 * 输出映射规则
 */
export interface OutputMapping {
  type: 'direct' | 'extract' | 'wrap'
  extractPaths?: Record<string, string>
  wrapTemplate?: Record<string, string>
}

// ===== Node 配置 =====

/**
 * 执行模式
 */
export type ExecutionMode = 'direct' | 'pipeline' | 'loop'

/**
 * Node 配置定义（新架构）
 * 设计理念：Node = LLM + Tasks + Mode + NodePrompt
 */
export interface CanvasPoint {
  x: number
  y: number
}

export interface CanvasSize {
  width: number
  height: number
}

export interface CanvasItemLayout {
  position: CanvasPoint
  size: CanvasSize
  collapsed?: boolean
  zIndex?: number
}

export interface NodeCanvasLayout {
  version: 1
  viewport?: {
    x: number
    y: number
    zoom: number
  }
  nodes: Record<string, CanvasItemLayout>
  tasks: Record<string, CanvasItemLayout>
}

export interface NodeConfig {
  id: string
  name: string
  description?: string
  
  // 核心字段
  nodePrompt: string              // Node 的任务描述
  llm: LLMSlot                    // Node 级别的 LLM（必需）
  mode: ExecutionMode             // 执行模式：direct/pipeline/loop

  // 兼容旧版执行器和配置文件
  executionMode?: 'direct' | 'pipeline' | 'subagent'
  systemPrompt?: string
  
  // 任务列表
  tasks: TaskConfig[]             // Task 列表
  
  // 工具列表（Task 未配置时使用）
  tools: string[]
  
  // Schema
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  
  // 画板布局（可选，兼容旧配置）
  canvasLayout?: NodeCanvasLayout
  
  // 元数据
  createdAt: string
  updatedAt?: string
}

/**
 * 向后兼容：旧版本 Node 配置
 * @deprecated 请使用新版本 NodeConfig
 */
export interface LegacyNodeConfig {
  id: string
  name: string
  description: string
  
  // 执行模式
  executionMode: 'direct' | 'pipeline' | 'subagent'
  
  // direct 模式字段
  systemPrompt?: string
  llm?: LLMSlot
  
  // pipeline 模式字段
  tasks?: LegacyTaskConfig[]
  
  // 通用字段
  tools?: string[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  
  // 元数据
  createdAt: string
  updatedAt?: string
}

export interface NodeConfigFile {
  version: 1
  nodes: Record<string, NodeConfig>
  equipped: string[]
}
