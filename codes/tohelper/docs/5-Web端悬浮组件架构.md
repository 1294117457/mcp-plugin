# Web 端悬浮组件架构

## 结论：不需要侵入 dsh 代码

**tohelper 插件工程中就够了。** harness 的 slot 系统专门为外部插件设计了以下注入点：

| Slot | 类型 | 用途 | 风险 |
|---|---|---|---|
| `shell.overlay` | list (可叠加) | 全局悬浮层，覆盖所有列，click-through | `none` |
| `conversation.input.left` | list (可叠加) | 输入框左侧工具栏按钮 | `none` |
| `conversation.input.right` | list (可叠加) | 输入框右侧（发送按钮前）按钮 | `none` |

三个 slot 的 `replaceRisk` 都是 `none`，`occupants` 允许外部插件自由添加。

---

## UI 设计方案

```
┌──────────────────────────────────────────────────────┐
│  sidebar  │        conversation area          │      │
│           │                                   │      │
│           │   ┌─────────────────────────┐     │      │
│           │   │  Tool Assembly Panel    │     │      │
│           │   │  (shell.overlay)        │     │      │
│           │   │                         │     │      │
│           │   │  ┌─────────────────┐    │     │      │
│           │   │  │ [✓] read_file   │    │     │      │
│           │   │  │ [✓] write       │    │     │      │
│           │   │  │ [ ] grep        │    │     │      │
│           │   │  │ [ ] mcp__gh__*  │    │     │      │
│           │   │  └─────────────────┘    │     │      │
│           │   │  [Apply]  [Reset]       │     │      │
│           │   └─────────────────────────┘     │      │
│           │                                   │      │
│           │  ┌───────────────────────────┐    │      │
│           │  │ [🔧] [attach] [input...  ]│[send]│    │
│           │  │  ↑                        │    │      │
│           │  │  toggle button            │    │      │
│           │  │  (conversation.input.left)│    │      │
│           │  └───────────────────────────┘    │      │
└──────────────────────────────────────────────────────┘
```

**交互流程**：
1. 输入框左侧有一个工具图标按钮（注册到 `conversation.input.left`）
2. 点击按钮，弹出悬浮面板（注册到 `shell.overlay`）
3. 面板中列出所有工具（checkbox 选择）
4. 点 Apply → 通过 HTTP API 告知 Host 端 → Host 调用 `restrict()`
5. 面板关闭，工具过滤生效

---

## 代码架构（完整目录结构）

```
tohelper/
├── package.json              # dsh.bundle + dsh.client 双声明
├── tsconfig.json             # host 端 tsc
├── tsdown.config.ts          # client 端 tsdown 打包
├── cordis.patch.yml          # host 注册
│
├── src/
│   ├── index.ts              # Host 入口：命令 + HTTP 路由 + restrict 逻辑
│   ├── discovery.ts          # 工具发现
│   ├── assembly.ts           # 装配状态管理
│   ├── routes.ts             # HTTP API 端点（给 Client 调用）
│   └── types.ts              # 共享类型
│
└── src/client/
    ├── index.ts              # Client 入口：注册 slot
    ├── ToolToggleButton.tsx   # 输入框旁的 toggle 按钮
    ├── ToolPanel.tsx          # 悬浮面板主体
    ├── ToolItem.tsx           # 单个工具 checkbox 行
    ├── store.ts              # Client 状态管理（fetch wrapper）
    └── styles.module.css     # 样式（CSS Modules）
```

---

## 通信架构

```
浏览器 (Client)                          Node.js (Host)
─────────────────                        ─────────────────
ToolPanel.tsx                            routes.ts
  │                                        │
  ├─ GET /api/tohelper/tools ──────────►   listAllTools(ctx)
  │     ← JSON: ToolInfo[] ◄───────────    ctx.tools.schemas()
  │                                        │
  ├─ GET /api/tohelper/equipped ────────►  getEquipped(agent)
  │     ← JSON: string[] ◄─────────────   stateMap.get(agent)
  │                                        │
  ├─ POST /api/tohelper/equip ─────────►   equipTools(ctx, agent, names)
  │     body: { names: string[] }          agent.ctx.tools.restrict(...)
  │     ← JSON: { ok, equipped } ◄─────   
  │                                        │
  └─ POST /api/tohelper/unequip-all ───►   unequipAll(agent)
       ← JSON: { ok } ◄────────────────   dispose restriction
```

**为什么需要 HTTP 路由？**

Client（浏览器）和 Host（Node.js）是两棵独立的 Cordis 树，不共享 ctx。Client 无法直接调用 `ctx.tools.schemas()` 或 `agent.ctx.tools.restrict()`，必须通过 HTTP API 中转。

---

## Host 端新增部分

### src/routes.ts — HTTP API

```ts
import type { Context } from '@deepseek-ai/cordis'

export function registerRoutes(ctx: Context): () => void {
  const disposers: (() => void)[] = []

  // GET /api/tohelper/tools — 列出全量工具
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/tools',
    handler(req, res) { /* listAllTools(ctx) → JSON */ },
  }))

  // GET /api/tohelper/equipped — 获取当前装配状态
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/equipped',
    handler(req, res) { /* getEquipped(agent) → JSON */ },
  }))

  // POST /api/tohelper/equip — 装配工具
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/equip',
    handler(req, res) { /* equipTools(ctx, agent, names) → JSON */ },
  }))

  // POST /api/tohelper/unequip-all — 清除限制
  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/tohelper/unequip-all',
    handler(req, res) { /* unequipAll(agent) → JSON */ },
  }))

  return () => disposers.forEach(d => d())
}
```

### src/index.ts — Host 入口（新增 inject webServer）

```ts
export const name = 'tohelper'
export const inject = ['commands', 'tools', 'webServer'] as const

export function apply(ctx: Context): void {
  // 注册 /tools, /equip, /unequip 命令（Phase 1 已有）
  registerCommands(ctx)

  // 注册 HTTP 路由给 Client 调用
  const disposeRoutes = registerRoutes(ctx)
  ctx.effect(() => disposeRoutes, 'tohelper: dispose HTTP routes')
}
```

---

## Client 端详细设计

### src/client/index.ts — Client 入口

```ts
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import { ToolToggleButton } from './ToolToggleButton'
import { ToolPanel } from './ToolPanel'
import { ToolAssemblyStore } from './store'

export const name = 'tohelper:client'
export const inject = ['slots'] as const

export function apply(ctx: ClientContext): void {
  const store = new ToolAssemblyStore()

  // 1. 注册 toggle 按钮到输入框左侧
  ctx.slots.inject('conversation.input.left', () =>
    ctx.slots.register(
      { name: 'conversation.input.left', id: 'tohelper-toggle', order: 50 },
      (props) => ToolToggleButton({ ...props, store }),
    )
  )

  // 2. 注册悬浮面板到 shell.overlay
  ctx.slots.inject('shell.overlay', () =>
    ctx.slots.register(
      { name: 'shell.overlay', id: 'tohelper-panel', order: 100 },
      () => ToolPanel({ store }),
    )
  )
}
```

### src/client/store.ts — 状态管理

```ts
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { useSyncExternalStore } from 'react'

interface ToolAssemblyState {
  panelOpen: boolean
  tools: ToolInfo[]           // 全量工具列表
  equipped: Set<string>       // 已装配的工具名
  status: 'idle' | 'loading' | 'ready' | 'error'
}

export class ToolAssemblyStore {
  private store = createSnapshotStore<ToolAssemblyState>({
    panelOpen: false,
    tools: [],
    equipped: new Set(),
    status: 'idle',
  })

  togglePanel(): void { /* 切换面板开关 */ }
  async loadTools(): Promise<void> { /* GET /api/tohelper/tools */ }
  async loadEquipped(): Promise<void> { /* GET /api/tohelper/equipped */ }
  async applyEquip(names: string[]): Promise<void> { /* POST /api/tohelper/equip */ }
  async resetAll(): Promise<void> { /* POST /api/tohelper/unequip-all */ }

  useSnapshot(): ToolAssemblyState {
    return useSyncExternalStore(
      (cb) => this.store.subscribe(cb),
      () => this.store.getSnapshot(),
    )
  }
}
```

### src/client/ToolToggleButton.tsx — 按钮组件

```tsx
export function ToolToggleButton({ store }: { store: ToolAssemblyStore }) {
  const { panelOpen, equipped } = store.useSnapshot()
  
  return (
    <button
      onClick={() => store.togglePanel()}
      title={`Tools: ${equipped.size} equipped`}
      style={{ pointerEvents: 'auto' }}
    >
      🔧 {equipped.size > 0 && <span>{equipped.size}</span>}
    </button>
  )
}
```

### src/client/ToolPanel.tsx — 悬浮面板

```tsx
export function ToolPanel({ store }: { store: ToolAssemblyStore }) {
  const { panelOpen, tools, equipped, status } = store.useSnapshot()

  if (!panelOpen) return null  // 关闭时渲染 null（shell.overlay 的约定）

  return (
    <div style={{ /* 固定定位悬浮面板，pointer-events: auto */ }}>
      <header>Tool Assembly</header>
      <div className="tool-list">
        {tools.map(tool => (
          <ToolItem
            key={tool.name}
            tool={tool}
            checked={equipped.has(tool.name)}
            onToggle={(name, checked) => { /* 本地更新选中态 */ }}
          />
        ))}
      </div>
      <footer>
        <button onClick={() => store.applyEquip([...localSelected])}>Apply</button>
        <button onClick={() => store.resetAll()}>Reset All</button>
      </footer>
    </div>
  )
}
```

---

## package.json（更新为双 bundle）

```json
{
  "name": "tohelper",
  "version": "0.1.0",
  "type": "module",
  "main": "lib/index.js",
  "exports": {
    ".": { "types": "./lib/index.d.ts", "default": "./lib/index.js" },
    "./client": { "types": "./lib/client/index.d.ts", "default": "./lib/client.js" },
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": ["lib", "cordis.patch.yml"],
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-slots"
      ],
      "immediately": false
    }
  },
  "peerDependencies": {
    "@deepseek-ai/cordis": "*",
    "@deepseek-ai/dsh-host-webserver": "*",
    "@deepseek-ai/dsh-client-runtime": "*",
    "@deepseek-ai/dsh-client-ui-slots": "*"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "@types/react": "^18.3.1",
    "react": "^18.3.1",
    "tsdown": "^0.22.0",
    "typescript": "^5.6.0"
  }
}
```

---

## 关键约束（来自 slot-catalog 文档）

1. **不能 import 设计系统组件** — 用 `React.createElement` + CSS 变量（`var(--dsw-alias-bg-layer-1)` 等）
2. **`shell.overlay` 默认 click-through** — 面板容器必须显式声明 `pointer-events: auto`
3. **面板关闭时渲染 null** — 不要渲染隐藏的 DOM，slot 系统要求不可见时返回 null
4. **不在模块顶层持有 ctx** — 所有状态必须在 `apply()` 中实例化
5. **CSS 必须 `.module.css`** — 通过 lightningcss 编译注入

---

## 开发阶段简化方案

正式打包前，可以先跳过 Client 端的 tsdown 构建，**先跑通 Host 命令版本**（Phase 1 的 `/tools` + `/equip`），确认 restrict 逻辑正确。然后再加 Client 端的悬浮面板。

开发顺序建议：
1. Host 命令 → 验证 restrict 生效（已在 Phase 1 文档中）
2. Host HTTP 路由 → 用 `curl` 或浏览器 DevTools 验证 API
3. Client 按钮 + 面板 → tsdown 打包后验证 UI

---

## 是否需要侵入 dsh 原本代码？

| 需求 | 是否侵入 | 说明 |
|---|---|---|
| 注册 `/tools`、`/equip` 命令 | **否** | `ctx.commands.register()` 公开 API |
| 过滤 agent 工具可见性 | **否** | `agent.ctx.tools.restrict()` 公开 API |
| 添加 HTTP 路由 | **否** | `ctx.webServer.register()` 公开 API |
| 输入框按钮 | **否** | `conversation.input.left` slot, replaceRisk=none |
| 悬浮面板 | **否** | `shell.overlay` slot, replaceRisk=none, occupants=[] |
| 获取全量工具列表 | **否** | `ctx.tools.schemas()` 公开 API |
| CSS 样式 | **否** | CSS Modules + 主题变量, 不覆盖任何已有样式 |

**完全不需要修改 deepseek-harness 任何一行代码。** 所有能力都通过 harness 设计好的扩展点（slot + service API + webServer routes）实现。tohelper 插件工程中自给自足。
