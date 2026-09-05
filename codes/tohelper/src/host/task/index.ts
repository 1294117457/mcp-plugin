import type { Context } from '@deepseek-ai/cordis'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { AgentTracker } from '../agent-tracker.js'
import type { ConfigFile, TaskConfig } from '../../types.js'
import { readBody, json } from '../util.js'
import { generateId, validateTaskData, saveConfigDebounced } from '../node/config.js'
import { runTaskLoop, extractUserInput } from './executor.js'

export interface TaskModule {
  equipTask(taskId: string): { ok: boolean; error?: string; toolName?: string }
  unequipTask(taskId: string): { ok: boolean; error?: string }
}

export function setupTaskModule(ctx: Context, config: ConfigFile, tracker: AgentTracker): TaskModule {
  const equippedDisposers = new Map<string, () => void>()

  function buildToolDef(task: ConfigFile['tasks'][string]) {
    return {
      name: task.name,
      description: task.description || task.taskPrompt,
      parameters: task.inputSchema,
      output: {
        schema: task.outputSchema,
        render: (_args: unknown, value: any) => [{ type: 'text', text: value?.result ?? String(value ?? '') }],
      },
      async execute(args: unknown) {
        const currentAgent = tracker.getAgent()
        if (!currentAgent) throw new Error('no active agent for task execution')
        const input = extractUserInput(args)
        const result = await runTaskLoop(ctx, task, input, currentAgent)
        return { result }
      },
    }
  }

  function equipTaskOnAgent(taskId: string, agent: any): { ok: boolean; error?: string; toolName?: string } {
    const task = config.tasks[taskId]
    if (!task) return { ok: false, error: 'task not found' }
    if (equippedDisposers.has(taskId)) return { ok: false, error: 'already equipped' }

    try {
      const toolDef = buildToolDef(task)
      const disposer = agent.ctx.tools.register(toolDef)
      equippedDisposers.set(taskId, disposer)

      if (!config.equipped.includes(taskId)) {
        config.equipped.push(taskId)
        saveConfigDebounced(config)
      }

      console.log(`[tohelper] task "${task.name}" equipped on agent ${agent.id ?? '(unknown)'}`)
      return { ok: true, toolName: task.name }
    } catch (e: any) {
      console.error(`[tohelper] task equip on agent scope failed:`, e?.message)
      try {
        const toolDef = buildToolDef(task)
        const disposer = ctx.tools.register(toolDef)
        equippedDisposers.set(taskId, disposer)
        if (!config.equipped.includes(taskId)) {
          config.equipped.push(taskId)
          saveConfigDebounced(config)
        }
        console.log(`[tohelper] task "${task.name}" equipped (global fallback)`)
        return { ok: true, toolName: task.name }
      } catch (e2: any) {
        console.error(`[tohelper] task equip global fallback also failed:`, e2?.message)
        return { ok: false, error: String(e2?.message ?? e2) }
      }
    }
  }

  function equipTask(taskId: string): { ok: boolean; error?: string; toolName?: string } {
    const agent = tracker.getAgent()
    if (!agent) return { ok: false, error: 'no active agent' }
    return equipTaskOnAgent(taskId, agent)
  }

  function unequipTask(taskId: string): { ok: boolean; error?: string } {
    const disposer = equippedDisposers.get(taskId)
    if (!disposer) return { ok: false, error: 'not equipped' }

    try { disposer() } catch { /* disposed scope is fine */ }
    equippedDisposers.delete(taskId)
    config.equipped = config.equipped.filter(id => id !== taskId)
    saveConfigDebounced(config)

    const task = config.tasks[taskId]
    console.log(`[tohelper] task "${task?.name ?? taskId}" unequipped`)
    return { ok: true }
  }

  function equipAllOnAgent(agent: any) {
    for (const d of equippedDisposers.values()) { try { d() } catch { /* empty */ } }
    equippedDisposers.clear()

    const toEquip = config.equipped.filter(id => id.startsWith('task-'))
    for (const taskId of toEquip) {
      if (config.tasks[taskId]) equipTaskOnAgent(taskId, agent)
    }
  }

  // Re-equip when a new agent session starts
  try {
    ctx.on('agent/created' as any, (payload: any) => {
      const agent = payload?.agent ?? payload
      if (!agent?.ctx) return
      console.log(`[tohelper:task] agent/created → re-equip on agent ${agent.id ?? '(unknown)'}`)
      equipAllOnAgent(agent)
    })
  } catch { /* empty */ }

  // Startup fallback
  setTimeout(() => {
    if (!equippedDisposers.size && tracker.getAgent()) {
      const toEquip = config.equipped.filter(id => id.startsWith('task-'))
      if (toEquip.length > 0) {
        console.log(`[tohelper:task] startup fallback equip`)
        for (const taskId of toEquip) {
          if (config.tasks[taskId]) equipTask(taskId)
        }
      }
    }
  }, 3000)

  // Register API routes
  registerTaskRoutes(ctx, config, { equipTask, unequipTask })

  return { equipTask, unequipTask }
}

function registerTaskRoutes(
  ctx: Context,
  config: ConfigFile,
  taskModule: TaskModule,
): void {
  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/list',
    handler(_req: IncomingMessage, res: ServerResponse) {
      const tasks = Object.values(config.tasks)
      const equipped = config.equipped.filter(id => id.startsWith('task-'))
      json(res, { ok: true, tasks, equipped })
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/create',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        const { error, task } = validateTaskData(body)
        if (error || !task) { json(res, { ok: false, error }, 400); return }

        const existing = Object.values(config.tasks).find(t => t.name === task.name)
        if (existing) { json(res, { ok: false, error: `task "${task.name}" already exists` }, 400); return }

        const id = generateId('task')
        const full: TaskConfig = { ...task, id, createdAt: new Date().toISOString() }
        config.tasks[id] = full
        saveConfigDebounced(config)

        json(res, { ok: true, task: full })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/update',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const body = JSON.parse(await readBody(req))
        if (!body.id) { json(res, { ok: false, error: 'id is required' }, 400); return }

        const existing = config.tasks[body.id]
        if (!existing) { json(res, { ok: false, error: 'task not found' }, 404); return }

        const { error, task } = validateTaskData(body)
        if (error || !task) { json(res, { ok: false, error }, 400); return }

        const conflict = Object.values(config.tasks).find(t => t.name === task.name && t.id !== body.id)
        if (conflict) { json(res, { ok: false, error: `name "${task.name}" conflicts` }, 400); return }

        config.tasks[body.id] = { ...task, id: body.id, createdAt: existing.createdAt, updatedAt: new Date().toISOString() }
        saveConfigDebounced(config)

        json(res, { ok: true })
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/delete',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        if (!config.tasks[id]) { json(res, { ok: false, error: 'task not found' }, 404); return }

        const referencingNodes = Object.values(config.nodes).filter(n => n.tasks.includes(id))
        if (referencingNodes.length > 0) {
          const names = referencingNodes.map(n => n.name).join(', ')
          json(res, { ok: false, error: `task is referenced by node(s): ${names}` }, 400)
          return
        }

        taskModule.unequipTask(id)
        delete config.tasks[id]
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
    path: '/api/tohelper/task/equip',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        const result = taskModule.equipTask(id)
        json(res, result, result.ok ? 200 : 400)
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })

  ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/task/unequip',
    async handler(req: IncomingMessage, res: ServerResponse) {
      try {
        const { id } = JSON.parse(await readBody(req))
        if (!id) { json(res, { ok: false, error: 'id is required' }, 400); return }
        const result = taskModule.unequipTask(id)
        json(res, result, result.ok ? 200 : 400)
      } catch (e: any) {
        json(res, { ok: false, error: String(e?.message ?? e) }, 400)
      }
    },
  })
}
