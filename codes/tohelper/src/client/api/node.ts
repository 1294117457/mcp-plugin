import type { NodeConfig, TaskConfig } from '../../types'

// ===== Task API =====

export interface TaskListResponse {
  ok: boolean
  tasks: TaskConfig[]
  equipped: string[]
}

export interface CreateTaskPayload {
  name: string
  description: string
  taskPrompt: string
  llm: { provider: string; model: string; temperature?: number; maxTokens?: number }
  tools?: string[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export type UpdateTaskPayload = CreateTaskPayload & { id: string }

const TASK_BASE = '/api/tohelper/task'

export const taskApi = {
  list: () => fetchJson<TaskListResponse>(`${TASK_BASE}/list`),
  create: (data: CreateTaskPayload) => postJson<{ ok: boolean; task?: TaskConfig; error?: string }>(`${TASK_BASE}/create`, data),
  update: (data: UpdateTaskPayload) => postJson<{ ok: boolean; error?: string }>(`${TASK_BASE}/update`, data),
  delete: (id: string) => postJson<{ ok: boolean; error?: string }>(`${TASK_BASE}/delete`, { id }),
  equip: (id: string) => postJson<{ ok: boolean; toolName?: string; error?: string }>(`${TASK_BASE}/equip`, { id }),
  unequip: (id: string) => postJson<{ ok: boolean; error?: string }>(`${TASK_BASE}/unequip`, { id }),
}

// ===== Node API =====

export interface NodeListResponse {
  ok: boolean
  nodes: NodeConfig[]
  equipped: string[]
}

export interface CreateNodePayload {
  name: string
  description: string
  mode: 'pipeline' | 'loop'
  nodePrompt: string
  llm: { provider: string; model: string; temperature?: number; maxTokens?: number }
  tasks: string[]
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
}

export type UpdateNodePayload = CreateNodePayload & { id: string }

const NODE_BASE = '/api/tohelper/node'

export const nodeApi = {
  list: () => fetchJson<NodeListResponse>(`${NODE_BASE}/list`),
  create: (data: CreateNodePayload) => postJson<{ ok: boolean; node?: NodeConfig; error?: string }>(`${NODE_BASE}/create`, data),
  update: (data: UpdateNodePayload) => postJson<{ ok: boolean; warning?: string; error?: string }>(`${NODE_BASE}/update`, data),
  delete: (id: string) => postJson<{ ok: boolean; error?: string }>(`${NODE_BASE}/delete`, { id }),
  equip: (id: string) => postJson<{ ok: boolean; toolName?: string; error?: string }>(`${NODE_BASE}/equip`, { id }),
  unequip: (id: string) => postJson<{ ok: boolean; error?: string }>(`${NODE_BASE}/unequip`, { id }),
  run: (nodeId: string, input?: unknown) =>
    postJson<{ ok: boolean; runId?: string; status?: string; result?: unknown; error?: string }>(
      `${NODE_BASE}/run`,
      { nodeId, input },
    ),
}

// ===== Config API =====

export const configApi = {
  reload: () => fetchJson<{ ok: boolean; tasks?: number; nodes?: number; equipped?: number; results?: string[]; error?: string }>('/api/tohelper/config/reload'),
}

// ===== Helpers =====

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  return res.json()
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}
