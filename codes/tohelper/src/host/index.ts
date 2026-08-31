import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createAgentTracker } from './agent-tracker.js'
import { setupToolModule } from './tool/index.js'
import { loadConfig, reloadConfigFromDisk } from './node/config.js'
import { setupTaskModule } from './task/index.js'
import { setupNodeModule } from './node/index.js'
import { json } from './util.js'

export const name = 'tohelper'
export const inject = ['webServer', 'tools', 'llm'] as const

export function apply(ctx: Context): void {
  console.log('[tohelper] plugin loaded')

  const tracker = createAgentTracker(ctx)
  const config = loadConfig()

  console.log(`[tohelper] config v${config.version}: ${Object.keys(config.tasks).length} tasks, ${Object.keys(config.nodes).length} nodes, ${config.equipped.length} equipped`)

  setupToolModule(ctx, tracker)
  const taskModule = setupTaskModule(ctx, config, tracker)
  const nodeModule = setupNodeModule(ctx, config, tracker)

  // Config reload endpoint
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/config/reload',
    handler(_req: IncomingMessage, res: ServerResponse) {
      // Unequip all current tools
      for (const nodeId of [...nodeModule.equippedDisposers.keys()]) {
        nodeModule.unequipNode(nodeId)
      }
      // (tasks don't expose equippedDisposers, unequip via taskModule)
      const oldTaskEquipped = config.equipped.filter(id => id.startsWith('task-'))
      for (const taskId of oldTaskEquipped) {
        taskModule.unequipTask(taskId)
      }

      // Reload from disk
      const { changed, error } = reloadConfigFromDisk(config)
      if (!changed) {
        json(res, { ok: false, error: error ?? 'no change' }, 400)
        return
      }

      console.log(`[tohelper] config reloaded: ${Object.keys(config.tasks).length} tasks, ${Object.keys(config.nodes).length} nodes, ${config.equipped.length} equipped`)

      // Re-equip
      const agent = tracker.getAgent()
      const results: string[] = []
      if (agent) {
        for (const id of config.equipped) {
          if (id.startsWith('node-') && config.nodes[id]) {
            const r = nodeModule.equipNode(id)
            results.push(`node ${config.nodes[id]?.name}: ${r.ok ? 'ok' : r.error}`)
          } else if (id.startsWith('task-') && config.tasks[id]) {
            const r = taskModule.equipTask(id)
            results.push(`task ${config.tasks[id]?.name}: ${r.ok ? 'ok' : r.error}`)
          }
        }
      } else {
        results.push('no active agent — tools will equip when agent starts')
      }

      json(res, {
        ok: true,
        tasks: Object.keys(config.tasks).length,
        nodes: Object.keys(config.nodes).length,
        equipped: config.equipped.length,
        results,
      })
    },
  })

  console.log('[tohelper] all modules initialized')
}
