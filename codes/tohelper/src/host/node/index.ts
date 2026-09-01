import type { Context } from '@deepseek-ai/cordis'
import type { AgentTracker } from '../agent-tracker.js'
import type { ConfigFile } from '../../types.js'
import { saveConfigDebounced } from './config.js'
import { createNodeExecutor, type NodeExecutor } from './executor.js'
import { registerNodeRoutes } from './routes.js'

export interface NodeModule {
  executor: NodeExecutor
  equippedDisposers: Map<string, () => void>
  equipNode(nodeId: string): { ok: boolean; error?: string; toolName?: string }
  unequipNode(nodeId: string): { ok: boolean; error?: string }
}

export function setupNodeModule(ctx: Context, config: ConfigFile, tracker: AgentTracker): NodeModule {
  const executor = createNodeExecutor(ctx, config)
  const equippedDisposers = new Map<string, () => void>()

  console.log(`[tohelper] node module: ${Object.keys(config.nodes).length} nodes`)

  function buildToolDef(node: ConfigFile['nodes'][string]) {
    return {
      name: node.name,
      description: node.description,
      parameters: node.inputSchema,
      output: {
        schema: node.outputSchema,
        render: (_args: unknown, value: any) => {
          // value is WorkflowResult
          if (value && typeof value === 'object' && 'status' in value) {
            const result = value as any
            return [{ type: 'text', text: result.output ?? result.result ?? String(result) }]
          }
          return [{ type: 'text', text: value?.result ?? String(value ?? '') }]
        },
      },
      async execute(args: unknown) {
        const currentAgent = tracker.getAgent()
        if (!currentAgent) throw new Error('no active agent for node execution')
        return executor.run(node, args, currentAgent)
      },
    }
  }

  function equipNodeOnAgent(nodeId: string, agent: any): { ok: boolean; error?: string; toolName?: string } {
    const node = config.nodes[nodeId]
    if (!node) return { ok: false, error: 'node not found' }
    if (equippedDisposers.has(nodeId)) return { ok: false, error: 'already equipped' }

    try {
      const toolDef = buildToolDef(node)
      const disposer = agent.ctx.tools.register(toolDef)
      equippedDisposers.set(nodeId, disposer)

      if (!config.equipped.includes(nodeId)) {
        config.equipped.push(nodeId)
        saveConfigDebounced(config)
      }

      console.log(`[tohelper] node "${node.name}" equipped on agent ${agent.id ?? '(unknown)'}`)
      return { ok: true, toolName: node.name }
    } catch (e: any) {
      console.error(`[tohelper] node equip on agent scope failed:`, e?.message)
      // Fallback to global registration
      try {
        const toolDef = buildToolDef(node)
        const disposer = ctx.tools.register(toolDef)
        equippedDisposers.set(nodeId, disposer)
        if (!config.equipped.includes(nodeId)) {
          config.equipped.push(nodeId)
          saveConfigDebounced(config)
        }
        console.log(`[tohelper] node "${node.name}" equipped (global fallback)`)
        return { ok: true, toolName: node.name }
      } catch (e2: any) {
        console.error(`[tohelper] node equip global fallback also failed:`, e2?.message)
        return { ok: false, error: String(e2?.message ?? e2) }
      }
    }
  }

  function equipNode(nodeId: string): { ok: boolean; error?: string; toolName?: string } {
    const agent = tracker.getAgent()
    if (!agent) return { ok: false, error: 'no active agent' }
    return equipNodeOnAgent(nodeId, agent)
  }

  function unequipNode(nodeId: string): { ok: boolean; error?: string } {
    const disposer = equippedDisposers.get(nodeId)
    if (!disposer) return { ok: false, error: 'not equipped' }

    try { disposer() } catch { /* disposed scope is fine */ }
    equippedDisposers.delete(nodeId)
    config.equipped = config.equipped.filter(id => id !== nodeId)
    saveConfigDebounced(config)

    const node = config.nodes[nodeId]
    console.log(`[tohelper] node "${node?.name ?? nodeId}" unequipped`)
    return { ok: true }
  }

  function equipAllOnAgent(agent: any) {
    // Clear old disposers from previous agent
    for (const d of equippedDisposers.values()) { try { d() } catch { /* empty */ } }
    equippedDisposers.clear()

    const toEquip = config.equipped.filter(id => id.startsWith('node-'))
    for (const nodeId of toEquip) {
      if (config.nodes[nodeId]) equipNodeOnAgent(nodeId, agent)
    }
  }

  // Re-equip when a new agent session starts
  try {
    ctx.on('agent/created' as any, (payload: any) => {
      const agent = payload?.agent ?? payload
      if (!agent?.ctx) return
      console.log(`[tohelper:node] agent/created → re-equip on agent ${agent.id ?? '(unknown)'}`)
      equipAllOnAgent(agent)
    })
  } catch { /* empty */ }

  // Startup fallback: equip after tracker has an agent
  setTimeout(() => {
    if (!equippedDisposers.size && tracker.getAgent()) {
      const toEquip = config.equipped.filter(id => id.startsWith('node-'))
      if (toEquip.length > 0) {
        console.log(`[tohelper:node] startup fallback equip`)
        for (const nodeId of toEquip) {
          if (config.nodes[nodeId]) equipNode(nodeId)
        }
      }
    }
  }, 3000)

  const nodeModule: NodeModule = { executor, equippedDisposers, equipNode, unequipNode }
  registerNodeRoutes(ctx, config, nodeModule, tracker)

  return nodeModule
}
