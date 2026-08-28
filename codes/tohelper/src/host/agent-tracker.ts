import type { Context } from '@deepseek-ai/cordis'

export interface AgentTracker {
  getAgent(): any | undefined
}

export function createAgentTracker(ctx: Context): AgentTracker {
  let currentAgent: any

  // Try multiple event patterns — DSH versions use different names
  const eventVariants = [
    'agent/created',
    'agent-created',
    'agent.created',
  ]
  const disposeVariants = [
    'agent/disposed',
    'agent-disposed',
    'agent.disposed',
  ]

  for (const evt of eventVariants) {
    try {
      ctx.on(evt as any, (payload: any) => {
        const agent = payload?.agent ?? payload
        if (agent && (agent.id || agent.ctx)) {
          currentAgent = agent
          console.log(`[tohelper] agent tracked via "${evt}":`, agent.id ?? '(no id)')
        }
      })
    } catch { /* empty */ }
  }

  for (const evt of disposeVariants) {
    try {
      ctx.on(evt as any, (payload: any) => {
        const agent = payload?.agent ?? payload
        if (currentAgent === agent) currentAgent = undefined
      })
    } catch { /* empty */ }
  }

  function findAgent(): any | undefined {
    if (currentAgent) return currentAgent

    // Fallback: ctx.agents service
    try {
      const agents = (ctx as any).agents
      if (agents) {
        if (typeof agents.list === 'function') {
          const list = agents.list()
          if (list?.length) return list[0]
        }
        if (typeof agents.current === 'function') return agents.current()
        if (agents.current) return agents.current
      }
    } catch { /* empty */ }

    // Fallback: ctx.agent direct property
    try {
      if ((ctx as any).agent) return (ctx as any).agent
    } catch { /* empty */ }

    // Fallback: walk up scope chain looking for agent
    try {
      let scope: any = ctx
      while (scope) {
        if (scope.agent) return scope.agent
        scope = scope.parent ?? scope.caller
      }
    } catch { /* empty */ }

    return undefined
  }

  return { getAgent: findAgent }
}
