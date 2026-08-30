import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentTracker } from '../agent-tracker.js'
import type { NodeModule } from './index.js'
import { readBody, json } from '../util.js'
import { generateNodeId, validateNodeConfig, saveNodeConfigDebounced } from './config.js'

export function registerNodeRoutes(ctx: Context, nodeModule: NodeModule, _tracker: AgentTracker): void {
  const { config } = nodeModule

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/list',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const nodes = Object.values(config.nodes)
      const equipped = [...nodeModule.equippedDisposers.keys()]
      json(res, { ok: true, nodes, equipped })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/node/create',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        const { error, node } = validateNodeConfig(body)
        if (error || !node) { json(res, { ok: false, error }, 400); return }

        // Check name conflicts
        const existing = Object.values(config.nodes).find(n => n.name === node.name)
        if (existing) { json(res, { ok: false, error: `node with name "${node.name}" already exists` }, 400); return }

        const id = generateNodeId()
        const full = { ...node, id, createdAt: new Date().toISOString() }
        config.nodes[id] = full
        saveNodeConfigDebounced(config)

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

        const { error, node } = validateNodeConfig(body)
        if (error || !node) { json(res, { ok: false, error }, 400); return }

        // Check name conflicts (excluding self)
        const conflict = Object.values(config.nodes).find(n => n.name === node.name && n.id !== body.id)
        if (conflict) { json(res, { ok: false, error: `name "${node.name}" conflicts with another node` }, 400); return }

        config.nodes[body.id] = { ...node, id: body.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
        saveNodeConfigDebounced(config)

        const warning = nodeModule.equippedDisposers.has(body.id)
          ? 'node is currently equipped, re-equip to apply changes'
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

        // Unequip if equipped
        if (nodeModule.equippedDisposers.has(id)) {
          nodeModule.unequipNode(id)
        }

        delete config.nodes[id]
        config.equipped = config.equipped.filter(eid => eid !== id)
        saveNodeConfigDebounced(config)

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
        if (!result.ok) {
          json(res, result, 400)
        } else {
          json(res, result)
        }
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
        if (!result.ok) {
          json(res, result, 400)
        } else {
          json(res, result)
        }
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  // Task API
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/types',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const { taskRegistry } = require('../task/index.js')
      const types = taskRegistry.listTypes()
      json(res, { ok: true, types })
    },
  })
}
