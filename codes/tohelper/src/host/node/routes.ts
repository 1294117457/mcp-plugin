import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentTracker } from '../agent-tracker.js'
import type { ConfigFile, NodeConfig } from '../../types.js'
import type { NodeModule } from './index.js'
import { readBody, json } from '../util.js'
import { generateId, validateNodeData, saveConfigDebounced } from './config.js'

export function registerNodeRoutes(ctx: Context, config: ConfigFile, nodeModule: NodeModule, _tracker: AgentTracker): void {
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/list',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const nodes = Object.values(config.nodes)
      const equipped = config.equipped.filter(id => id.startsWith('node-'))
      json(res, { ok: true, nodes, equipped })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/create',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        const allTaskIds = Object.keys(config.tasks)
        const { error, node } = validateNodeData(body, allTaskIds)
        if (error || !node) { json(res, { ok: false, error }, 400); return }

        const existing = Object.values(config.nodes).find(n => n.name === node.name)
        if (existing) { json(res, { ok: false, error: `node "${node.name}" already exists` }, 400); return }

        const id = generateId('node')
        const full: NodeConfig = { ...node, id, createdAt: new Date().toISOString() }
        config.nodes[id] = full
        saveConfigDebounced(config)

        json(res, { ok: true, node: full })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/update',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        if (!body.id) { json(res, { ok: false, error: 'id is required' }, 400); return }

        const existing = config.nodes[body.id]
        if (!existing) { json(res, { ok: false, error: 'node not found' }, 404); return }

        const allTaskIds = Object.keys(config.tasks)
        const { error, node } = validateNodeData(body, allTaskIds)
        if (error || !node) { json(res, { ok: false, error }, 400); return }

        const conflict = Object.values(config.nodes).find(n => n.name === node.name && n.id !== body.id)
        if (conflict) { json(res, { ok: false, error: `name "${node.name}" conflicts` }, 400); return }

        config.nodes[body.id] = { ...node, id: body.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
        saveConfigDebounced(config)

        const warning = nodeModule.equippedDisposers.has(body.id)
          ? 'node is equipped, re-equip to apply changes'
          : undefined

        json(res, { ok: true, warning })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/delete',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        if (!config.nodes[id]) { json(res, { ok: false, error: 'node not found' }, 404); return }

        if (nodeModule.equippedDisposers.has(id)) {
          nodeModule.unequipNode(id)
        }

        delete config.nodes[id]
        config.equipped = config.equipped.filter(eid => eid !== id)
        saveConfigDebounced(config)

        json(res, { ok: true })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/equip',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        const result = nodeModule.equipNode(id)
        json(res, result, result.ok ? 200 : 400)
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/unequip',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        const result = nodeModule.unequipNode(id)
        json(res, result, result.ok ? 200 : 400)
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })
}
