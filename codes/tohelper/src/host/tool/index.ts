import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentTracker } from '../agent-tracker.js'
import { readBody, json } from '../util.js'
import {
  loadToolConfig, configAddServer, configRemoveServer, configUpdateDenied,
  type ToolConfig,
} from './config.js'

export function setupToolModule(ctx: Context, tracker: AgentTracker): void {
  const config: ToolConfig = loadToolConfig()
  console.log(`[tohelper] tool config loaded: ${Object.keys(config.servers).length} servers, ${config.denied.length} denied tools`)

  const deniedTools = new Set<string>(config.denied)
  let restrictDisposer: (() => void) | null = null

  function applyRestriction(): void {
    if (restrictDisposer) { restrictDisposer(); restrictDisposer = null }
    const agent = tracker.getAgent()
    if (!agent || deniedTools.size === 0) return
    try {
      const schemas = ctx.tools.schemas(agent)
      const valid = [...deniedTools].filter(n => schemas.some((s: any) => s.name === n))
      if (valid.length > 0) restrictDisposer = agent.ctx.tools.restrict({ deny: valid })
    } catch (e) {
      console.warn('[tohelper] restrict failed:', e)
    }
  }

  // Re-apply when agent changes
  try {
    ctx.on('agent/created' as any, () => {
      if (deniedTools.size > 0) applyRestriction()
    })
  } catch { /* empty */ }

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
  ): Promise<number> {
    const mcpClient = await import('@deepseek-ai/dsh-mcp-client')
    const mcpConfig = transport === 'stdio'
      ? { transport: 'stdio' as const, serverName, command: opts.command ?? '', args: opts.args ?? [], env: opts.env ?? {}, cwd: process.cwd(), toolCallTimeoutMs: 60000, failOnStartupError: false }
      : { transport: 'streamable-http' as const, serverName, url: opts.url ?? '', headers: opts.headers ?? {}, toolCallTimeoutMs: 60000, failOnStartupError: false }

    const fiber = ctx.plugin(mcpClient, mcpConfig)
    mcpDisposers.set(serverName, { dispose: () => (fiber as any).dispose(), transport })
    console.log(`[tohelper] MCP server "${serverName}" connected (${transport})`)

    // Wait for tools to appear using the tools/change event + polling fallback
    const prefix = `mcp__${serverName}__`

    function countTools(): number {
      try {
        const agent = tracker.getAgent()
        const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
        return schemas.filter((s: any) => ((s as any).name ?? '').startsWith(prefix)).length
      } catch {
        try { return ctx.tools.schemas().filter((s: any) => ((s as any).name ?? '').startsWith(prefix)).length }
        catch { return 0 }
      }
    }

    const toolCount = await new Promise<number>(resolve => {
      const timeout = setTimeout(() => { cleanup(); resolve(countTools()) }, 10000)
      let changeDisposer: (() => void) | undefined
      let pollTimer: ReturnType<typeof setInterval> | undefined

      function cleanup() {
        clearTimeout(timeout)
        if (pollTimer) clearInterval(pollTimer)
        if (changeDisposer) changeDisposer()
      }

      function check() {
        const n = countTools()
        if (n > 0) { cleanup(); resolve(n) }
      }

      // Listen for tools/change events
      try {
        changeDisposer = ctx.on('tools/change' as any, check)
      } catch { /* empty */ }

      // Also poll every 500ms as fallback
      pollTimer = setInterval(check, 500)

      // Initial check after a short delay
      setTimeout(check, 800)
    })

    console.log(`[tohelper] MCP "${serverName}" tool discovery: ${toolCount} tools found`)
    return toolCount
  }

  // --- Auto-connect persisted servers ---
  ;(async () => {
    for (const [serverName, entry] of Object.entries(config.servers)) {
      if (!entry.autoConnect) continue
      try {
        await connectMcpServer(serverName, entry.transport, {
          command: entry.command, args: entry.args, url: entry.url, headers: entry.headers, env: entry.env,
        })
      } catch (e) {
        console.warn(`[tohelper] auto-connect failed: ${serverName}`, e)
      }
    }
    if (Object.keys(config.servers).length > 0) {
      console.log(`[tohelper] auto-connect complete: ${mcpDisposers.size} connected`)
    }
  })()

  // --- API routes ---
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/tools',
    handler(_req: IncomingMessage, res: ServerResponse) {
      try {
        const agent = tracker.getAgent()
        const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
        const builtin: any[] = []
        const mcp: any[] = []
        let logged = false
        for (const s of schemas) {
          const nm = (s as any).name ?? ''
          const ds = (s as any).description ?? ''
          const params = (s as any).parameters ?? (s as any).inputSchema ?? (s as any).input_schema ?? null
          let outputSchema: any = null
          try {
            const def = agent ? ctx.tools.get(nm, agent) : ctx.tools.get(nm)
            if (def?.output?.schema) outputSchema = def.output.schema
          } catch { /* empty */ }
          if (!outputSchema) {
            try { outputSchema = (s as any).output?.schema ?? (s as any).outputSchema ?? null }
            catch { /* empty */ }
          }
          // Debug: log first MCP tool's schema keys
          if (!logged && nm.startsWith('mcp__')) {
            console.log(`[tohelper] schema keys for "${nm}":`, Object.keys(s))
            console.log(`[tohelper] parameters type:`, typeof params, params ? 'has value' : 'null')
            logged = true
          }
          if (nm.startsWith('mcp__')) {
            mcp.push({ name: nm, description: ds, source: 'mcp', denied: deniedTools.has(nm), inputSchema: params, outputSchema })
          } else {
            builtin.push({ name: nm, description: ds, source: 'builtin', inputSchema: params, outputSchema })
          }
        }
        for (const d of deniedTools) {
          if (!mcp.some(t => t.name === d)) {
            mcp.push({ name: d, description: '(denied)', source: 'mcp', denied: true, inputSchema: null, outputSchema: null })
          }
        }
        json(res, { ok: true, agentId: agent?.id, builtin, mcp })
      } catch (e: any) {
        json(res, { ok: false, builtin: [], mcp: [], error: String(e?.message ?? e) }, 500)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/skills',
    async handler(_req: IncomingMessage, res: ServerResponse) {
      try {
        const agent = tracker.getAgent()
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

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/mcp/servers',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const agent = tracker.getAgent()
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
        const toolCount = await connectMcpServer(serverName, normalizedTransport, { command, args, url, headers })
        configAddServer(config, serverName, { transport: normalizedTransport, url, headers, command, args })
        json(res, { ok: true, serverName, toolCount })
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
        const results: Array<{ serverName: string; ok: boolean; toolCount?: number; error?: string }> = []

        for (const [serverName, entry] of Object.entries(mcpServers)) {
          if (mcpDisposers.has(serverName)) {
            results.push({ serverName, ok: false, error: 'already exists' })
            continue
          }
          try {
            const transport = normalizeTransport(entry.type || entry.transport || 'streamable-http')
            const opts = { command: entry.command, args: entry.args, url: entry.url, headers: entry.headers, env: entry.env }
            const toolCount = await connectMcpServer(serverName, transport, opts)
            configAddServer(config, serverName, { transport, ...opts })
            results.push({ serverName, ok: true, toolCount })
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
      configUpdateDenied(config, [])
      json(res, { ok: true, denied: [] })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/status',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const agent = tracker.getAgent()
      const schemas = agent ? ctx.tools.schemas(agent) : ctx.tools.schemas()
      json(res, { ok: true, hasAgent: !!agent, agentId: agent?.id, toolCount: schemas.length, deniedCount: deniedTools.size })
    },
  })
}
