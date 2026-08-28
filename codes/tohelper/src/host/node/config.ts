import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { NodeConfig, NodeConfigFile } from '../../types.js'
import { DATA_DIR } from '../tool/config.js'

const CONFIG_PATH = resolve(DATA_DIR, 'node-config.json')

const DEFAULT_CONFIG: NodeConfigFile = {
  version: 1,
  nodes: {},
  equipped: [],
}

export function loadNodeConfig(): NodeConfigFile {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed.version === 1) return parsed
    return { ...DEFAULT_CONFIG }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveNodeConfig(config: NodeConfigFile): void {
  const tmp = CONFIG_PATH + '.tmp'
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8')
  renameSync(tmp, CONFIG_PATH)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveNodeConfigDebounced(config: NodeConfigFile): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveNodeConfig(config)
    debounceTimer = null
  }, 100)
}

export function generateNodeId(): string {
  return `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const NODE_NAME_RE = /^[a-z][a-z0-9_]{2,49}$/

export function validateNodeName(name: string): string | null {
  if (!NODE_NAME_RE.test(name)) {
    return 'name must be 3-50 chars, lowercase + digits + underscore, starting with a letter'
  }
  if (name.startsWith('mcp__')) return 'name cannot start with mcp__'
  if (name === 'run_code') return 'name "run_code" is reserved'
  return null
}

export function validateNodeConfig(data: any): { error?: string; node?: Omit<NodeConfig, 'id' | 'createdAt'> } {
  if (!data.name || typeof data.name !== 'string') return { error: 'name is required' }
  const nameError = validateNodeName(data.name)
  if (nameError) return { error: nameError }

  if (!data.description || typeof data.description !== 'string') return { error: 'description is required' }
  if (data.description.length > 200) return { error: 'description must be ≤ 200 chars' }

  if (!data.systemPrompt || typeof data.systemPrompt !== 'string') return { error: 'systemPrompt is required' }

  const DEFAULT_INPUT_SCHEMA = {
    type: 'object' as const,
    properties: { input: { type: 'string', description: '用户输入的文本内容' } },
    required: ['input'],
  }

  const DEFAULT_OUTPUT_SCHEMA = {
    type: 'object' as const,
    properties: { result: { type: 'string', description: '模型输出的文本结果' } },
    required: ['result'],
  }

  if (data.inputSchema) {
    if (typeof data.inputSchema !== 'object') return { error: 'inputSchema must be an object' }
    if (data.inputSchema.type !== 'object') return { error: 'inputSchema.type must be "object"' }
  }

  if (data.outputSchema) {
    if (typeof data.outputSchema !== 'object') return { error: 'outputSchema must be an object' }
    if (data.outputSchema.type !== 'object') return { error: 'outputSchema.type must be "object"' }
  }

  const node: Omit<NodeConfig, 'id' | 'createdAt'> = {
    name: data.name,
    description: data.description,
    systemPrompt: data.systemPrompt,
    inputSchema: data.inputSchema || DEFAULT_INPUT_SCHEMA,
    outputSchema: data.outputSchema || DEFAULT_OUTPUT_SCHEMA,
  }

  if (data.llm) {
    if (!data.llm.provider || !data.llm.model) return { error: 'llm requires provider and model' }
    node.llm = { provider: data.llm.provider, model: data.llm.model }
    if (data.llm.temperature != null) node.llm.temperature = data.llm.temperature
    if (data.llm.maxTokens != null) node.llm.maxTokens = data.llm.maxTokens
  }

  if (data.tools && Array.isArray(data.tools)) {
    node.tools = data.tools.filter((t: unknown) => typeof t === 'string')
  }

  return { node }
}
