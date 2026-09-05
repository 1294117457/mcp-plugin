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
  /**
   * Task 作为工具使用时的描述，供其他 Agent / Node 调用时参考。
   * 框架会自动用 taskPrompt 派生默认值，可留空。
   */
  description?: string

  /**
   * 任务说明（用户配置的 task prompt）。
   * 描述这个 task 要做什么、调用什么工具、输出什么。
   * task 是自包含的执行单位——即使运行时 input 为空也应能自主完成基本工作。
   */
  taskPrompt: string
  llm: LLMSlot
  tools: string[]

  /**
   * 直接模式：跳过参数提取步骤，直接将工具 Schema 传给 LLM，让 LLM 自己提取参数并通过 function calling 执行。
   * 适用于支持 function calling 的模型（如 deepseek-reasoner、claude 等）。
   * 关闭时使用三段式流程：LLM 提取参数 → 直接调用工具 → LLM 汇总。
   */
  directMode?: boolean

  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>

  createdAt: string
  updatedAt?: string
}

// ===== Node 配置 =====

export type NodeMode = 'pipeline' | 'loop'
export type TriggerMode = 'agent' | 'explicit' | 'both'
export type FailurePolicy = 'fail_fast' | 'continue' | 'retry_then_continue'

/**
 * pipeline 模式下第一个 task 的输入来源策略：
 * - 'self':  空字符串，task 自包含（默认，推荐）
 * - 'user':  使用 node 运行时的用户输入（向后兼容）
 */
export type FirstTaskInputStrategy = 'self' | 'user'

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
  /**
   * Node 编排层的 prompt，用于指导 Node LLM 如何编排任务。
   * 在 pipeline 模式下用于汇总各 task 输出；在 loop 模式下用于指导任务选择。
   */
  nodePrompt: string
  llm: LLMSlot
  tasks: string[]

  /**
   * pipeline 模式下第一个 task 的输入来源。
   * 'self'（默认）：空字符串，task 自包含，不受 node 用户输入污染
   * 'user'：使用 node 运行时的用户输入
   */
  firstTaskInput?: FirstTaskInputStrategy

  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>

  triggerMode?: TriggerMode
  failurePolicy?: FailurePolicy

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

// ===== 执行结果 =====

export type ExecutionStatus =
  | 'success'
  | 'failed'
  | 'timeout'
  | 'cancelled'
  | 'skipped'

export interface ExecutionError {
  code: string
  message: string
  retryable?: boolean
  cause?: string
}

export interface TaskResult {
  taskId: string
  taskName: string
  status: ExecutionStatus
  input?: unknown
  output?: unknown
  error?: ExecutionError
  attempt: number
  durationMs: number
  startedAt: string
  finishedAt: string
}

export type WorkflowStatus =
  | 'success'
  | 'partial_failure'
  | 'failed'
  | 'timeout'
  | 'cancelled'

export interface WorkflowResult {
  ok: boolean
  status: WorkflowStatus
  runId: string
  nodeId: string
  nodeName: string
  input?: unknown
  output?: unknown
  error?: ExecutionError
  steps: TaskResult[]
  startedAt: string
  finishedAt: string
}
