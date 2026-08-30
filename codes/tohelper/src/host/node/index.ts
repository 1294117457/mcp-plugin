import type { Context } from '@deepseek-ai/cordis'
import type { AgentTracker } from '../agent-tracker.js'
import type { NodeConfig, NodeConfigFile } from '../../types.js'
import { loadNodeConfig, saveNodeConfigDebounced } from './config.js'
import { createNodeExecutor, type NodeExecutor } from './executor.js'
import { registerNodeRoutes } from './routes.js'

export interface NodeModule {
  config: NodeConfigFile
  executor: NodeExecutor
  equippedDisposers: Map<string, () => void>
  equipNode(nodeId: string): { ok: boolean; error?: string; toolName?: string }
  unequipNode(nodeId: string): { ok: boolean; error?: string }
  getNodeToolsList(): Array<{ name: string; description: string; nodeId: string; equipped: boolean }>
}

export function setupNodeModule(ctx: Context, tracker: AgentTracker): void {
  const config = loadNodeConfig()
  const executor = createNodeExecutor(ctx)
  const equippedDisposers = new Map<string, () => void>()

  console.log(`[tohelper] node config loaded: ${Object.keys(config.nodes).length} nodes, ${config.equipped.length} equipped`)

  function equipNode(nodeId: string): { ok: boolean; error?: string; toolName?: string } {
    const agent = tracker.getAgent()
    if (!agent) return { ok: false, error: 'no active agent' }

    const node = config.nodes[nodeId]
    if (!node) return { ok: false, error: 'node not found' }
    if (equippedDisposers.has(nodeId)) return { ok: false, error: 'already equipped' }

    // Check name conflict with existing tools
    try {
      const schemas = ctx.tools.schemas(agent)
      if (schemas.some((s: any) => s.name === node.name)) {
        return { ok: false, error: `tool name conflicts with existing: ${node.name}` }
      }
    } catch { /* empty */ }

    try {
      const toolDef = {
        name: node.name,
        description: node.description,
        parameters: node.inputSchema,
        output: {
          schema: node.outputSchema,
          render: (_args: unknown, value: any) => [{ type: 'text', text: value?.result ?? String(value ?? '') }],
        },
        async execute(args: unknown) {
          return executor.run(node, args, agent)
        },
      }

      // Try agent-scoped registration first, then context-level
      let disposer: () => void
      try {
        disposer = agent.ctx.tools.register(toolDef)
      } catch {
        disposer = ctx.tools.register(toolDef)
      }

      equippedDisposers.set(nodeId, disposer)

      if (!config.equipped.includes(nodeId)) {
        config.equipped.push(nodeId)
        saveNodeConfigDebounced(config)
      }

      console.log(`[tohelper] node "${node.name}" equipped`)
      return { ok: true, toolName: node.name }
    } catch (e: any) {
      console.error(`[tohelper] node equip failed:`, e)
      return { ok: false, error: String(e?.message ?? e) }
    }
  }

  function unequipNode(nodeId: string): { ok: boolean; error?: string } {
    const disposer = equippedDisposers.get(nodeId)
    if (!disposer) return { ok: false, error: 'not equipped' }

    disposer()
    equippedDisposers.delete(nodeId)
    config.equipped = config.equipped.filter(id => id !== nodeId)
    saveNodeConfigDebounced(config)

    const node = config.nodes[nodeId]
    console.log(`[tohelper] node "${node?.name ?? nodeId}" unequipped`)
    return { ok: true }
  }

  function getNodeToolsList(): Array<{ name: string; description: string; nodeId: string; equipped: boolean }> {
    return Object.values(config.nodes).map(node => ({
      name: node.name,
      description: node.description,
      nodeId: node.id,
      equipped: equippedDisposers.has(node.id),
    }))
  }

  // Agent lifecycle handling
  try {
    ctx.on('agent/disposed' as any, ({ agent }: any) => {
      if (agent === tracker.getAgent()) {
        for (const dispose of equippedDisposers.values()) {
          dispose()
        }
        equippedDisposers.clear()
      }
    })

    ctx.on('agent/created' as any, () => {
      const toEquip = [...config.equipped]
      equippedDisposers.clear()
      for (const nodeId of toEquip) {
        if (config.nodes[nodeId]) {
          equipNode(nodeId)
        }
      }
    })
  } catch { /* empty */ }

  // Auto-equip on startup
  setTimeout(() => {
    if (tracker.getAgent() && config.equipped.length > 0) {
      const toEquip = [...config.equipped]
      config.equipped = []
      equippedDisposers.clear()
      for (const nodeId of toEquip) {
        if (config.nodes[nodeId]) equipNode(nodeId)
      }
    }
  }, 2000)

  const nodeModule: NodeModule = { config, executor, equippedDisposers, equipNode, unequipNode, getNodeToolsList }
  registerNodeRoutes(ctx, nodeModule, tracker)
}
