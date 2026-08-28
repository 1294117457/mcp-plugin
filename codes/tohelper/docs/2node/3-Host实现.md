# Host 实现

## 模块职责

| 文件 | 职责 |
|---|---|
| `host/index.ts` | 插件主入口，inject 声明，组合子模块 |
| `host/agent-tracker.ts` | agent 生命周期追踪（tool/node 共用） |
| `host/util.ts` | HTTP 工具函数 |
| `host/node/index.ts` | Node 管理核心逻辑 |
| `host/node/routes.ts` | API 路由注册 |
| `host/node/config.ts` | Node 持久化 |
| `host/node/executor.ts` | Node 执行引擎 |

## host/index.ts — 主入口

```typescript
import type { Context } from '@deepseek-ai/cordis'
import { createAgentTracker } from './agent-tracker.js'
import { setupToolModule } from './tool/index.js'
import { setupNodeModule } from './node/index.js'

export const name = 'tohelper'
export const inject = ['webServer', 'tools', 'llm'] as const

export function apply(ctx: Context): void {
  const tracker = createAgentTracker(ctx)
  setupToolModule(ctx, tracker)
  setupNodeModule(ctx, tracker)
  console.log('[tohelper] plugin loaded')
}
```

## host/node/index.ts — Node 管理核心

```typescript
import type { Context } from '@deepseek-ai/cordis'
import type { AgentTracker } from '../agent-tracker.js'
import type { NodeConfig } from '../../types.js'
import { loadNodeConfig, saveNodeConfig } from './config.js'
import { createNodeExecutor } from './executor.js'
import { registerNodeRoutes } from './routes.js'

export function setupNodeModule(ctx: Context, tracker: AgentTracker): void {
  const config = loadNodeConfig()
  const executor = createNodeExecutor(ctx)

  // 装配状态：nodeId → dispose 函数
  const equippedDisposers = new Map<string, () => void>()

  function equipNode(nodeId: string): { ok: boolean; error?: string } {
    const agent = tracker.getAgent()
    if (!agent) return { ok: false, error: 'no active agent' }

    const node = config.nodes[nodeId]
    if (!node) return { ok: false, error: 'node not found' }
    if (equippedDisposers.has(nodeId)) return { ok: false, error: 'already equipped' }

    // 注册为 agent scope 的 tool
    const disposer = agent.ctx.tools.register({
      name: node.name,
      description: node.description,
      parameters: node.inputSchema,
      output: { schema: { type: 'object', properties: { result: { type: 'string' } } } },
      async execute(args: unknown) {
        return executor.run(node, args)
      },
    })

    equippedDisposers.set(nodeId, disposer)

    // 持久化 equipped 状态
    if (!config.equipped.includes(nodeId)) {
      config.equipped.push(nodeId)
      saveNodeConfig(config)
    }

    return { ok: true }
  }

  function unequipNode(nodeId: string): { ok: boolean; error?: string } {
    const disposer = equippedDisposers.get(nodeId)
    if (!disposer) return { ok: false, error: 'not equipped' }

    disposer()
    equippedDisposers.delete(nodeId)
    config.equipped = config.equipped.filter(id => id !== nodeId)
    saveNodeConfig(config)

    return { ok: true }
  }

  // Agent 销毁时清理装配
  ctx.on('agent/disposed' as any, ({ agent }: any) => {
    if (agent === tracker.getAgent()) {
      for (const [id, dispose] of equippedDisposers) {
        dispose()
      }
      equippedDisposers.clear()
    }
  })

  // 新 agent 创建时自动重新装配
  ctx.on('agent/created' as any, () => {
    const toEquip = [...config.equipped]
    config.equipped = []
    equippedDisposers.clear()
    for (const nodeId of toEquip) {
      equipNode(nodeId)
    }
  })

  // 注册 API 路由
  registerNodeRoutes(ctx, { config, equipNode, unequipNode, equippedDisposers })
}
```

## host/node/executor.ts — 执行引擎

Phase 1 采用 **direct 模式**：直接调用 `ctx.llm` 完成单轮对话，不创建子 agent。

```typescript
import type { Context } from '@deepseek-ai/cordis'
import type { NodeConfig } from '../../types.js'

export interface NodeExecutor {
  run(node: NodeConfig, args: unknown): Promise<{ result: string }>
}

export function createNodeExecutor(ctx: Context): NodeExecutor {
  return {
    async run(node, args) {
      // 1. 组装 prompt
      const userContent = typeof args === 'string'
        ? args
        : JSON.stringify(args, null, 2)

      // 2. 解析 LLM 配置
      const llmConfig = node.llm ?? getDefaultLlmConfig(ctx)

      // 3. prepare + stream
      const prepared = await ctx.llm.prepareCall(
        { provider: llmConfig.provider, model: llmConfig.model },
        AbortSignal.timeout(120_000),
      )

      const { BlockAssembler } = await import('@deepseek-ai/dsh-llm')
      const assembler = new BlockAssembler()

      const stream = prepared.stream({
        provider: llmConfig.provider,
        model: llmConfig.model,
        system: node.systemPrompt,
        messages: [{ role: 'user', content: [{ type: 'text', text: userContent }] }],
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.maxTokens,
      })

      for await (const chunk of stream) {
        assembler.push(chunk)
      }

      // 4. 提取文本结果
      const blocks = assembler.blocks()
      const textParts = blocks
        .filter(b => b.type === 'text')
        .map(b => b.text)
      const result = textParts.join('\n') || '(no output)'

      return { result }
    },
  }
}

function getDefaultLlmConfig(ctx: Context): { provider: string; model: string } {
  // 尝试从 agentDefaultModel 获取
  try {
    const sel = (ctx as any).agentDefaultModel?.currentSelection?.()
    if (sel) return { provider: sel.provider, model: sel.model }
  } catch { /* empty */ }
  return { provider: 'deepseek-official', model: 'deepseek-chat' }
}
```

### Phase 2 扩展点

Phase 2 将增加子 agent 模式，支持 Node 内部进行多轮 tool use：

```typescript
// Phase 2: executor 增加 agent 模式
async runAsAgent(node, args) {
  const handle = await ctx.agents.create({
    agentOptions: node.llm ? { provider: node.llm.provider, model: node.llm.model } : undefined,
    setup: (childCtx) => {
      childCtx.systemPrompt.section({ name: `node:${node.id}`, content: node.systemPrompt })
      if (node.tools?.length) childCtx.tools.restrict({ allow: node.tools })
    },
  })
  handle.agent.followup(userMessage(args))
  await handle.agent.whenIdle()
  const result = extractLastAssistantMessage(handle.agent.session)
  await handle.dispose()
  return { result }
}
```

## host/node/config.ts — 持久化

```typescript
import type { NodeConfig } from '../../types.js'

interface NodeConfigFile {
  version: 1
  nodes: Record<string, NodeConfig>
  equipped: string[]
}

const CONFIG_PATH = resolve(DATA_DIR, 'node-config.json')

const DEFAULT: NodeConfigFile = { version: 1, nodes: {}, equipped: [] }

export function loadNodeConfig(): NodeConfigFile { /* 类似现有 tool config */ }
export function saveNodeConfig(config: NodeConfigFile): void { /* atomic write */ }
```

复用现有 `config.ts` 的 atomic-write 模式（tmp + rename）。

## host/node/routes.ts — API 路由

```typescript
export function registerNodeRoutes(ctx: Context, deps: NodeDeps): void {
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/list', handler: ... })
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/create', handler: ... })
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/update', handler: ... })
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/delete', handler: ... })
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/equip', handler: ... })
  ctx.webServer.register({ kind: 'exact', path: '/api/tohelper/node/unequip', handler: ... })
}
```

详细 API 见 [5-API参考.md](./5-API参考.md)。

## 从现有代码迁移

| 现有文件 | 迁移目标 | 变更 |
|---|---|---|
| `src/index.ts` L1-55 (inject, tracker, restrict) | `host/index.ts` + `host/agent-tracker.ts` + `host/tool/index.ts` | 拆分 |
| `src/index.ts` L57-100 (MCP connect) | `host/tool/index.ts` | 平移 |
| `src/index.ts` L102-311 (所有路由) | `host/tool/routes.ts` | 平移，路径前缀改为 `/api/tohelper/tool/*` |
| `src/index.ts` L314-327 (readBody, json) | `host/util.ts` | 提取公共 |
| `src/config.ts` | `host/tool/config.ts` | 重命名，文件路径改为 `data/tool-config.json` |

**注意**：迁移后原有的 tool API 路径需要决定是否变更。建议：
- 保持 `/api/tohelper/tools`、`/api/tohelper/mcp/*` 不变（向后兼容）
- 新增 `/api/tohelper/node/*`
