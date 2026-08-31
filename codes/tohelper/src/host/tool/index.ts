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

  // --- LLM 配置查询 ---
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/llm/list',
    async handler(_req: IncomingMessage, res: ServerResponse) {
      try {
        const agent = tracker.getAgent()
        const llms: Array<{ provider: string; model: string; displayName: string }> = []
        
        // 方式 1: 从 ctx.llm 服务获取已注册的 providers
        try {
          const llmService = ctx.llm
          if (llmService) {
            // 获取所有已注册的 providers
            const providers = llmService.listProviders()
            ctx.logger.info(`[tohelper] 找到 ${providers.length} 个已注册的 LLM providers`)
            
            for (const providerInfo of providers) {
              const provider = providerInfo.id
              
              // 尝试从对应的 adapter 获取模型列表
              try {
                const registration = (llmService as any).adapters?.get(provider)
                if (registration?.adapter) {
                  const models = await registration.adapter.listModels(provider)
                  ctx.logger.info(`[tohelper] Provider ${provider} 有 ${models.length} 个模型`)
                  
                  for (const modelInfo of models) {
                    const displayName = `${provider}/${modelInfo.id}`
                    if (!llms.find(l => l.displayName === displayName)) {
                      llms.push({
                        provider,
                        model: modelInfo.id,
                        displayName
                      })
                    }
                  }
                }
              } catch (err) {
                ctx.logger.warn(`[tohelper] 无法从 provider ${provider} 获取模型列表:`, err)
              }
            }
          }
        } catch (err) {
          ctx.logger.warn('[tohelper] 从 llm 服务获取 providers 失败:', err)
        }
        
        // 方式 2: 从 ctx.agentDefaultModel 获取当前选中的模型
        try {
          const defaultModel = ctx.agentDefaultModel
          if (defaultModel) {
            const sel = defaultModel.currentSelection()
            if (sel) {
              const key = `${sel.provider}/${sel.model}`
              ctx.logger.info(`[tohelper] 默认模型: ${key}`)
              if (!llms.find(l => l.displayName === key)) {
                llms.unshift({
                  provider: sel.provider,
                  model: sel.model,
                  displayName: key
                })
              }
            }
          }
        } catch (err) {
          ctx.logger.warn('[tohelper] 从 agentDefaultModel 获取默认模型失败:', err)
        }
        
        // 方式 3: 从 Agent 配置获取
        try {
          if (agent) {
            const agentConfig = (agent as any).config
            if (agentConfig?.llm) {
              const configLlm = agentConfig.llm
              const key = typeof configLlm === 'string' ? configLlm : `${configLlm.provider}/${configLlm.model}`
              ctx.logger.info(`[tohelper] Agent 配置的模型: ${key}`)
              if (!llms.find(l => l.displayName === key)) {
                const [provider, model] = key.split('/')
                llms.unshift({
                  provider: provider || 'deepseek-official',
                  model: model || 'deepseek-chat',
                  displayName: key
                })
              }
            }
          }
        } catch (err) {
          ctx.logger.warn('[tohelper] 从 Agent 配置获取模型失败:', err)
        }
        
        // 方式 4: 从 config.json 获取已配置的模型
        try {
          const { DATA_DIR } = await import('./config.js')
          const { resolve } = await import('path')
          const fs = await import('fs/promises')
          const configContent = await fs.readFile(resolve(DATA_DIR, 'config.json'), 'utf-8')
          const cfgFile = JSON.parse(configContent)

          for (const item of [...Object.values(cfgFile.tasks ?? {}), ...Object.values(cfgFile.nodes ?? {})] as any[]) {
            if (item.llm) {
              const key = `${item.llm.provider}/${item.llm.model}`
              if (!llms.find(l => l.displayName === key)) {
                llms.push({ provider: item.llm.provider, model: item.llm.model, displayName: key })
              }
            }
          }
        } catch (err) {
          ctx.logger.warn('[tohelper] 从配置文件获取模型失败:', err)
        }
        
        // 如果仍然没有任何模型，使用默认列表
        if (llms.length === 0) {
          ctx.logger.warn('[tohelper] 未找到任何 LLM 配置，使用默认列表')
          llms.push(
            { provider: 'deepseek-official', model: 'deepseek-chat', displayName: 'deepseek-official/deepseek-chat' },
            { provider: 'deepseek-official', model: 'deepseek-coder', displayName: 'deepseek-official/deepseek-coder' },
            { provider: 'deepseek-official', model: 'deepseek-reasoner', displayName: 'deepseek-official/deepseek-reasoner' }
          )
        }
        
        // 去重
        const uniqueLLMs = llms.reduce((acc, curr) => {
          if (!acc.find(l => l.displayName === curr.displayName)) {
            acc.push(curr)
          }
          return acc
        }, [] as typeof llms)
        
        // 排序：用户配置的模型优先
        uniqueLLMs.sort((a, b) => {
          const aIsDefault = a.provider === 'deepseek-official' && ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'].includes(a.model)
          const bIsDefault = b.provider === 'deepseek-official' && ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'].includes(b.model)
          if (aIsDefault && !bIsDefault) return 1
          if (!aIsDefault && bIsDefault) return -1
          return 0
        })
        
        ctx.logger.info(`[tohelper] 最终返回 ${uniqueLLMs.length} 个 LLM 配置`)
        json(res, { ok: true, llms: uniqueLLMs, agentId: agent?.id })
      } catch (e: any) {
        ctx.logger.error('[tohelper] LLM 列表查询失败:', e)
        json(res, { ok: false, llms: [], error: String(e?.message ?? e) }, 500)
      }
    },
  })
}
