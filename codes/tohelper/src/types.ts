export interface LLMSlot {
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
}

export interface NodeConfig {
  id: string
  name: string
  description: string
  systemPrompt: string
  llm?: LLMSlot
  tools?: string[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

export interface NodeConfigFile {
  version: 1
  nodes: Record<string, NodeConfig>
  equipped: string[]
}
