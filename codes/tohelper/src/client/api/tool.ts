export interface ToolItem {
  name: string
  description: string
  source: 'builtin' | 'mcp'
  denied?: boolean
  inputSchema?: Record<string, unknown> | null
  outputSchema?: Record<string, unknown> | null
}

export interface ToolsResponse {
  ok: boolean
  agentId?: string
  builtin: ToolItem[]
  mcp: ToolItem[]
  error?: string
}

export interface SkillItem {
  name: string
  description: string
  modelInvocable: boolean
  userInvocable: boolean
}

export interface SkillsResponse {
  ok: boolean
  skills: SkillItem[]
}

export interface McpServer {
  serverName: string
  transport: string
  toolCount: number
}

export interface McpServersResponse {
  ok: boolean
  servers: McpServer[]
  denied: string[]
}

export interface StatusResponse {
  ok: boolean
  hasAgent: boolean
  agentId?: string
  toolCount: number
  deniedCount: number
}

export interface LLMOption {
  provider: string
  model: string
  displayName: string
}

export interface LLMListResponse {
  ok: boolean
  llms: LLMOption[]
  agentId?: string
  error?: string
}

export interface McpConfigEntry {
  type?: string
  transport?: string
  url?: string
  command?: string
  args?: string[]
  headers?: Record<string, string>
  env?: Record<string, string>
}

export interface McpConfigBatch {
  mcpServers: Record<string, McpConfigEntry>
}

export interface AddBatchResult {
  ok: boolean
  results: Array<{ serverName: string; ok: boolean; error?: string }>
}

const BASE = '/api/tohelper'

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

export const toolApi = {
  getTools: () => get<ToolsResponse>('/tools'),
  getSkills: () => get<SkillsResponse>('/skills'),
  getMcpServers: () => get<McpServersResponse>('/mcp/servers'),
  addMcpServer: (config: { serverName: string; transport: string; command?: string; args?: string[]; url?: string; headers?: Record<string, string> }) =>
    post<{ ok: boolean; serverName?: string; error?: string }>('/mcp/add', config),
  addMcpBatch: (config: McpConfigBatch) =>
    post<AddBatchResult>('/mcp/add-batch', config),
  removeMcpServer: (serverName: string) => post<{ ok: boolean }>('/mcp/remove', { serverName }),
  denyTools: (names: string[]) => post<{ ok: boolean; denied: string[] }>('/mcp/deny', { names }),
  resetDeny: () => post<{ ok: boolean }>('/mcp/reset'),
  getStatus: () => get<StatusResponse>('/status'),
  getLLMs: () => get<LLMListResponse>('/llm/list'),
}
