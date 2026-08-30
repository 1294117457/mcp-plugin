import type { NodeConfig, TaskConfig } from '../../types'

export interface NodeListResponse {
  ok: boolean
  nodes: NodeConfig[]
  equipped: string[]
}

export interface CreateNodePayload {
  name: string
  description: string
  executionMode: 'direct' | 'pipeline' | 'subagent'
  
  // direct 模式字段
  systemPrompt?: string
  llm?: { provider: string; model: string; temperature?: number; maxTokens?: number }
  
  // pipeline 模式字段
  tasks?: TaskConfig[]
  
  // 通用字段
  tools?: string[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export type UpdateNodePayload = CreateNodePayload & { id: string }

export interface TaskTypesResponse {
  ok: boolean
  types: string[]
}

const BASE = '/api/tohelper/node'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  return res.json()
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

export const nodeApi = {
  list: () => get<NodeListResponse>('/list'),
  create: (data: CreateNodePayload) => post<{ ok: boolean; node?: NodeConfig; error?: string }>('/create', data),
  update: (data: UpdateNodePayload) => post<{ ok: boolean; warning?: string; error?: string }>('/update', data),
  delete: (id: string) => post<{ ok: boolean; error?: string }>('/delete', { id }),
  equip: (id: string) => post<{ ok: boolean; toolName?: string; error?: string }>('/equip', { id }),
  unequip: (id: string) => post<{ ok: boolean; error?: string }>('/unequip', { id }),
}

export const taskApi = {
  getTypes: async (): Promise<TaskTypesResponse> => {
    const res = await fetch('/api/tohelper/task/types')
    return res.json()
  }
}
