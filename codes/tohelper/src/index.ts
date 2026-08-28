import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { loadConfig, configAddServer, configRemoveServer, configUpdateDenied, type TohelperConfig } from './config.js'

export const name = 'tohelper'
export const inject = ['webServer', 'tools'] as const

export function apply(ctx: Context): void {
  console.log('[tohelper] plugin loaded')

  // --- Load persisted config ---
  const config: TohelperConfig = loadConfig()
  console.log(`[tohelper] config loaded: ${Object.keys(config.servers).length} servers, ${config.denied.length} denied tools`)

  // --- Track agent ---
  let currentAgent: any
  try {
    ctx.on('agent/created' as any, ({ agent }: any) => {
      currentAgent = agent
      console.log('[tohelper] agent created:', agent.id)
      // Re-apply restrictions when a new agent is created
      if (deniedTools.size > 0) applyRestriction()
    })
    ctx.on('agent/disposed' as any, ({ agent }: any) => {
      if (currentAgent === agent) currentAgent = undefined
    })
  } catch (e) {
    console.log('[tohelper] agent tracking skipped:', e)
  }

  function getAgent(): any {
    if (currentAgent) return currentAgent
    try {
      const agents = (ctx as any).agents
      if (agents && typeof agents.list === 'function') return agents.list()[0]
    } catch { /* empty */ }
    return undefined
  }

  // --- State (initialized from persisted config) ---
  const deniedTools = new Set<string>(config.denied)
  let restrictDisposer: (() => void) | null = null

  function applyRestriction(): void {
    if (restrictDisposer) { restrictDisposer(); restrictDisposer = null }
    const agent = getAgent()
    if (!agent || deniedTools.size === 0) return
    try {
      const schemas = ctx.tools.schemas(agent)
      const valid = [...deniedTools].filter(n => schemas.some((s: any) => s.name === n))
      if (valid.length > 0) restrictDisposer = agent.ctx.tools.restrict({ deny: valid })
    } catch (e) {
      console.warn('[tohelper] restrict failed:', e)
    }
  }

  // --- MCP server management ---
  const mcpDisposers = new Map<string, { dispose: () => void; transport: string }>()

  function normalizeTransport(raw: string): 'stdio' | 'streamable-http' {
    const lower = raw.toLowerCase().replace(/[\s_-]/g, '')
    if (lower === 'stdio') return 'stdio'
    return 'streamable-http'
  }

  async function connectMcpServer(
    serverName: string,
    transport: 'stdio' | 'streamable-http',
    opts: { command?: string; args?: string[]; url?: string; headers?: Record<string, string>; env?: Record<string, string> },
  ): Promise<void> {
    const mcpClient = await import('@deepseek-ai/dsh-mcp-client')
    const config = transport === 'stdio'
      ? { transport: 'stdio' as const, serverName, command: opts.command ?? '', args: opts.args ?? [], env: opts.env ?? {}, cwd: process.cwd(), toolCallTimeoutMs: 60000, failOnStartupError: false }
      : { transport: 'streamable-http' as const, serverName, url: opts.url ?? '', headers: opts.headers ?? {}, toolCallTimeoutMs: 60000, failOnStartupError: false }

    const fiber = ctx.plugin(mcpClient, config)
    mcpDisposers.set(serverName, { dispose: () => (fiber as any).dispose(), transport })
    console.log(`[tohelper] MCP server "${serverName}" connected (${transport})`)
  }

  // --- Auto-connect persisted servers ---
  ;(async () => {
    for (const [serverName, entry] of Object.entries(config.servers)) {
      if (!entry.autoConnect) continue
      try {
        await connectMcpServer(serverName, entry.transport, {
          command: entry.command,
          args: entry.args,
          url: entry.url,
          headers: entry.headers,
          env: entry.env,
        })
      } catch (e) {
        console.warn(`[tohelper] auto-connect failed: ${serverName}`, e)
      }
    }
    if (Object.keys(config.servers).length > 0) {
      console.log(`[tohelper] auto-connect complete: ${mcpDisposers.size} connected`)
    }
  })()

  // --- API: list tools ---
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/tools',
    handler(_req: IncomingMessage, res: ServerResponse) {
      try {
        const agent = getAgent()
        const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
        const builtin: any[] = []
        const mcp: any[] = []
        for (const s of schemas) {
          const nm = (s as any).name ?? ''
          const ds = (s as any).description ?? ''
          if (nm.startsWith('mcp__')) {
            mcp.push({ name: nm, description: ds, source: 'mcp', denied: deniedTools.has(nm) })
          } else {
            builtin.push({ name: nm, description: ds, source: 'builtin' })
          }
        }
        for (const d of deniedTools) {
          if (!mcp.some(t => t.name === d)) {
            mcp.push({ name: d, description: '(denied)', source: 'mcp', denied: true })
          }
        }
        json(res, { ok: true, agentId: agent?.id, builtin, mcp })
      } catch (e: any) {
        json(res, { ok: false, builtin: [], mcp: [], error: String(e?.message ?? e) }, 500)
      }
    },
  })

  // --- API: list skills ---
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/skills',
    async handler(_req: IncomingMessage, res: ServerResponse) {
      try {
        const agent = getAgent()
        const skills = (ctx as any).skills
        if (!skills || !agent) { json(res, { ok: true, skills: [] }); return }
        const list = await skills.list({ scope: agent, cwd: agent.session?.header?.cwd })
        json(res, {
          ok: true,
          skills: (list || []).map((s: any) => ({
            name: s.name,
            description: s.description ?? '',
            modelInvocable: s.invocation?.modelInvocable ?? true,
            userInvocable: s.invocation?.userInvocable ?? true,
          })),
        })
      } catch {
        json(res, { ok: true, skills: [] })
      }
    },
  })

  // --- API: MCP servers ---
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/servers',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const agent = getAgent()
      const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
      const servers = [...mcpDisposers.entries()].map(([sn, entry]) => ({
        serverName: sn,
        transport: entry.transport,
        toolCount: schemas.filter((s: any) => ((s as any).name ?? '').startsWith(`mcp__${sn}__`)).length,
        autoConnect: config.servers[sn]?.autoConnect ?? true,
      }))
      json(res, { ok: true, servers, denied: [...deniedTools] })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/add',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        const { serverName, transport, command, args, url, headers } = body
        if (!serverName) { json(res, { ok: false, error: 'serverName required' }, 400); return }
        if (mcpDisposers.has(serverName)) { json(res, { ok: false, error: 'already exists' }, 400); return }

        const normalizedTransport = normalizeTransport(transport)
        await connectMcpServer(serverName, normalizedTransport, { command, args, url, headers })

        // Persist
        configAddServer(config, serverName, {
          transport: normalizedTransport,
          url, headers, command, args,
        })

        json(res, { ok: true, serverName })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/add-batch',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        const mcpServers: Record<string, any> = body.mcpServers ?? body
        const results: Array<{ serverName: string; ok: boolean; error?: string }> = []

        for (const [serverName, entry] of Object.entries(mcpServers)) {
          if (mcpDisposers.has(serverName)) {
            results.push({ serverName, ok: false, error: 'already exists' })
            continue
          }
          try {
            const transport = normalizeTransport(entry.type || entry.transport || 'streamable-http')
            const opts = {
              command: entry.command,
              args: entry.args,
              url: entry.url,
              headers: entry.headers,
              env: entry.env,
            }
            await connectMcpServer(serverName, transport, opts)

            // Persist
            configAddServer(config, serverName, { transport, ...opts })

            results.push({ serverName, ok: true })
          } catch (e: any) {
            results.push({ serverName, ok: false, error: String(e?.message ?? e) })
          }
        }

        json(res, { ok: true, results })
      } catch (e: any) {
        json(res, { ok: false, results: [], error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/remove',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { serverName } = JSON.parse(await readBody(req))
        const entry = mcpDisposers.get(serverName)
        if (!entry) { json(res, { ok: false, error: 'not found' }, 404); return }
        entry.dispose()
        mcpDisposers.delete(serverName)
        for (const n of [...deniedTools]) {
          if (n.startsWith(`mcp__${serverName}__`)) deniedTools.delete(n)
        }
        applyRestriction()

        // Persist
        configRemoveServer(config, serverName)

        json(res, { ok: true })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/deny',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { names } = JSON.parse(await readBody(req))
        deniedTools.clear()
        for (const n of (names ?? [])) deniedTools.add(n)
        applyRestriction()

        // Persist
        configUpdateDenied(config, [...deniedTools])

        json(res, { ok: true, denied: [...deniedTools] })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/reset',
    handler(_req: IncomingMessage, res: ServerResponse) {
      deniedTools.clear()
      if (restrictDisposer) { restrictDisposer(); restrictDisposer = null }

      // Persist
      configUpdateDenied(config, [])

      json(res, { ok: true, denied: [] })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/status',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const agent = getAgent()
      const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
      json(res, { ok: true, hasAgent: !!agent, agentId: agent?.id, toolCount: schemas.length, deniedCount: deniedTools.size })
    },
  })

  console.log('[tohelper] routes registered')
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    req.on('data', (c: Buffer) => chunks.push(c))
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}
