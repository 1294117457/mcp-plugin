import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { TaskConfig, NodeConfig, ConfigFile } from '../../types.js'
import { DATA_DIR } from '../tool/config.js'
import { loadConfigWithMigration } from './migrate.js'

const CONFIG_PATH = resolve(DATA_DIR, 'config.json')

const DEFAULT_CONFIG: ConfigFile = {
  version: 2,
  tasks: {},
  nodes: {},
  equipped: [],
}

export function loadConfig(): ConfigFile {
  // Use migration logic to handle v1 → v2
  return loadConfigWithMigration()
}

/** Re-read config.json from disk and merge into the live config object. */
export function reloadConfigFromDisk(config: ConfigFile): { changed: boolean; error?: string } {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed.version !== 2) return { changed: false, error: 'invalid config version' }

    config.tasks = parsed.tasks ?? {}
    config.nodes = parsed.nodes ?? {}
    config.equipped = parsed.equipped ?? []
    return { changed: true }
  } catch (e: any) {
    return { changed: false, error: String(e?.message ?? e) }
  }
}

export function saveConfig(config: ConfigFile): void {
  const tmp = CONFIG_PATH + '.tmp'
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }
  writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8')
  renameSync(tmp, CONFIG_PATH)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveConfigDebounced(config: ConfigFile): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveConfig(config)
    debounceTimer = null
  }, 100)
}

export function generateId(prefix: 'task' | 'node'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

const NAME_RE = /^[a-z][a-z0-9_]{2,49}$/

export function validateName(name: string): string | null {
  if (!NAME_RE.test(name)) {
    return 'name must be 3-50 chars, lowercase + digits + underscore, starting with a letter'
  }
  if (name.startsWith('mcp__')) return 'name cannot start with mcp__'
  if (name === 'run_code') return 'name "run_code" is reserved'
  return null
}

const DEFAULT_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: { input: { type: 'string', description: '输入文本' } },
  required: ['input'],
}

const DEFAULT_OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: { result: { type: 'string', description: '输出结果' } },
  required: ['result'],
}

export function validateTaskData(data: any): { error?: string; task?: Omit<TaskConfig, 'id' | 'createdAt'> } {
  if (!data.name || typeof data.name !== 'string') return { error: 'name is required' }
  const nameError = validateName(data.name)
  if (nameError) return { error: nameError }

  if (!data.description || typeof data.description !== 'string') return { error: 'description is required' }
  if (data.description.length > 200) return { error: 'description must be ≤ 200 chars' }

  if (!data.taskPrompt || typeof data.taskPrompt !== 'string') return { error: 'taskPrompt is required' }

  if (!data.llm || !data.llm.provider || !data.llm.model) {
    return { error: 'llm with provider and model is required' }
  }

  const task: Omit<TaskConfig, 'id' | 'createdAt'> = {
    name: data.name,
    description: data.description,
    taskPrompt: data.taskPrompt,
    llm: {
      provider: data.llm.provider,
      model: data.llm.model,
      ...(data.llm.temperature != null ? { temperature: data.llm.temperature } : {}),
      ...(data.llm.maxTokens != null ? { maxTokens: data.llm.maxTokens } : {}),
    },
    tools: Array.isArray(data.tools) ? data.tools.filter((t: unknown) => typeof t === 'string') : [],
    inputSchema: data.inputSchema || DEFAULT_INPUT_SCHEMA,
    outputSchema: data.outputSchema || DEFAULT_OUTPUT_SCHEMA,
  }

  return { task }
}

export function validateNodeData(data: any, allTaskIds: string[]): { error?: string; node?: Omit<NodeConfig, 'id' | 'createdAt'> } {
  if (!data.name || typeof data.name !== 'string') return { error: 'name is required' }
  const nameError = validateName(data.name)
  if (nameError) return { error: nameError }

  if (!data.description || typeof data.description !== 'string') return { error: 'description is required' }
  if (data.description.length > 200) return { error: 'description must be ≤ 200 chars' }

  const mode = data.mode
  if (!mode || !['pipeline', 'loop'].includes(mode)) {
    return { error: 'mode must be "pipeline" or "loop"' }
  }

  if (!data.nodePrompt || typeof data.nodePrompt !== 'string') return { error: 'nodePrompt is required' }

  if (!data.llm || !data.llm.provider || !data.llm.model) {
    return { error: 'llm with provider and model is required' }
  }

  if (!Array.isArray(data.tasks) || data.tasks.length === 0) {
    return { error: 'tasks must be a non-empty array of Task IDs' }
  }

  for (const tid of data.tasks) {
    if (typeof tid !== 'string') return { error: 'tasks must be an array of string IDs' }
    if (!allTaskIds.includes(tid)) return { error: `referenced task "${tid}" does not exist` }
  }

  const triggerMode = data.triggerMode || 'both'
  if (!['agent', 'explicit', 'both'].includes(triggerMode)) {
    return { error: 'triggerMode must be "agent", "explicit", or "both"' }
  }

  const failurePolicy = data.failurePolicy || 'fail_fast'
  if (!['fail_fast', 'continue', 'retry_then_continue'].includes(failurePolicy)) {
    return { error: 'failurePolicy must be "fail_fast", "continue", or "retry_then_continue"' }
  }

  const node: Omit<NodeConfig, 'id' | 'createdAt'> = {
    name: data.name,
    description: data.description,
    mode,
    nodePrompt: data.nodePrompt,
    llm: {
      provider: data.llm.provider,
      model: data.llm.model,
      ...(data.llm.temperature != null ? { temperature: data.llm.temperature } : {}),
      ...(data.llm.maxTokens != null ? { maxTokens: data.llm.maxTokens } : {}),
    },
    tasks: data.tasks,
    inputSchema: data.inputSchema || DEFAULT_INPUT_SCHEMA,
    outputSchema: data.outputSchema || DEFAULT_OUTPUT_SCHEMA,
    triggerMode,
    failurePolicy,
    ...(Array.isArray(data.aliases) && data.aliases.length > 0 ? { aliases: data.aliases } : {}),
  }

  return { node }
}
