import type { Context } from '@deepseek-ai/cordis'
import { createAgentTracker } from './agent-tracker.js'
import { setupToolModule } from './tool/index.js'
import { setupNodeModule } from './node/index.js'
import { registerBuiltinTasks } from './task/index.js'

export const name = 'tohelper'
export const inject = ['webServer', 'tools', 'llm'] as const

export function apply(ctx: Context): void {
  console.log('[tohelper] plugin loaded')
  
  // 1. 注册内置 Task 类型
  registerBuiltinTasks()
  
  // 2. 初始化 Agent Tracker
  const tracker = createAgentTracker(ctx)
  
  // 3. 初始化 Tool 模块
  setupToolModule(ctx, tracker)
  
  // 4. 初始化 Node 模块
  setupNodeModule(ctx, tracker)
  
  console.log('[tohelper] all modules initialized')
}
