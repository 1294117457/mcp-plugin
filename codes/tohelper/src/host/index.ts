import type { Context } from '@deepseek-ai/cordis'
import { createAgentTracker } from './agent-tracker.js'
import { setupToolModule } from './tool/index.js'
import { setupNodeModule } from './node/index.js'

export const name = 'tohelper'
export const inject = ['webServer', 'tools', 'llm'] as const

export function apply(ctx: Context): void {
  console.log('[tohelper] plugin loaded')
  const tracker = createAgentTracker(ctx)
  setupToolModule(ctx, tracker)
  setupNodeModule(ctx, tracker)
  console.log('[tohelper] all modules initialized')
}
