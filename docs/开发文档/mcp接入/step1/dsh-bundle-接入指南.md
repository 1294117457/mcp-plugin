# dsh 外部 Bundle 接入指南

> 这份文档给**已经读懂 dsh 架构**的人（见 `dsh-架构与插件机制.md`）：手把手教你做一个外部 bundle，跑通到能在 dsh web 设置里看到你的 tab。
>
> 工作目录：`my-dsh-plugin/mcp/`。对 deepseek-harness 仓库**零修改**。

---

## 0. 30 秒心智模型

**dsh 装一个插件 = 一个 npm 包**。包里会有两个入口：

- `lib/index.js` — **Host 端**（Node.js 进程里跑），导出 `apply(ctx)` 拿到 Node 端 cordis 树
- `lib/client.js` — **Client 端**（浏览器里跑），导出 `apply(ctx)` 拿到浏览器端 cordis 树。**这个文件必须由 tsdown（不是 tsc）编译**，因为浏览器通过 `<script src=...>` 加载时它必须是 classic CJS，且必须用 `window.__ModuleLoader__.load({ id, factory })` 注册 factory。

两边各管各的事：
- Host 端负责：读/写文件系统、启动子进程、注册 HTTP 路由、调 `ctx.tools` 注册工具
- Client 端负责：渲染 UI、注册到 `settings.section` slot、响应用户交互、调 `ctx.connection.api.xxx()` 调 Host

要 dsh 识别你这个包，你**只**需要做四件事：
1. 写 `apply(ctx)` 两份
2. 写 `cordis.patch.yml` 一份（host 端入口）
3. 在 `package.json` 加 `dsh.bundle.patch` + `dsh.client` 两个字段；`exports["./client"]` 指向 `lib/client.js`（tsdown 产物）
4. 跑 `dsh plugin --profile web add 'file:/path/to/your/pkg'`

---

## 1. 工程骨架（一次成型）

```
my-dsh-plugin/mcp/
├── package.json                       ← 4 个 dsh 字段 + 2 个 entry
├── cordis.patch.yml                   ← host 端入口（一行 insert）
├── tsconfig.json                      ← extends dsh 仓库的 tsconfig.base.json
├── README.md
│
├── src/                               ← HOST 端源代码
│   ├── index.ts                       ← apply(ctx) 入口，注册 webserver 路由
│   ├── webserver-routes.ts            ← JSON API 端点（fetch 进来的）
│   ├── patch-store.ts                 ← 读 / 写 ~/.dsh/profiles/<n>/cordis.patch.yml
│   ├── config-schema.ts               ← 复用 dsh-mcp-client 的 Config
│   ├── types.ts                       ← 你自己的小类型
│   └── ambient.d.ts                   ← ctx.webServer / ctx.loader 类型扩展
│
└── src/client/                        ← CLIENT 端源代码
    ├── index.ts                       ← apply(ctx) 入口，注册 settings.section
    ├── McpSection.tsx                 ← 这个 tab 的根组件
    ├── McpRow.tsx                     ← 列表里一行
    ├── McpForm.tsx                    ← 添加 / 编辑表单
    ├── mcp-store.ts                   ← 客户端状态 + 调 ctx.connection.api
    ├── locales.ts                     ← zh / en 文案
    ├── McpSection.module.css          ← 样式
    └── ambient.d.ts (可选)            ← LocaleNamespaceMap 扩展
```

**组件原则**（来自 `packages/client/AGENTS.md`）：
- 业务组件（tsx）**不直接 import ctx**——只通过 props 拿到 `useSnapshot` / `store` / `t`
- 每条 reactive fact 要么是 stack hook、要么是 declared store、要么是 inject callback——禁止组件自己 `useSyncExternalStore` 监听别的 ctx 状态
- 所有 ctx 服务调用都在 `apply(ctx)` 闭包里

---

## 2. `package.json` 完整配置

这是**最容易翻车**的文件。三个字段都得对：

```jsonc
{
  "name": "my-dsh-mcp-settings",
  "version": "0.1.0",
  "description": "External MCP settings bundle for dsh",
  "type": "module",
  "main": "lib/index.js",
  "types": "lib/index.d.ts",
  "exports": {
    // Host 端入口：dsh 启动时 import './lib/index.js'
    ".": {
      "types": "./lib/index.d.ts",
      "default": "./lib/index.js"
    },
    // Client 端入口：浏览器通过 /plugins/my-dsh-mcp-settings/client.js 加载
    "./client": {
      "types": "./lib/client/index.d.ts",
      "default": "./lib/client/index.js"
    },
    // 这俩保留否则 dsh 加载不到 patch 文件
    "./cordis.patch.yml": "./cordis.patch.yml",
    "./package.json": "./package.json"
  },
  "files": [
    "lib",
    "cordis.patch.yml",
    "README.md"
  ],

  // ★ 关键字段 ★
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"     // 唯一被 host 端读到的字段
      // ⚠ 不要在这里写 "client" 字段——无效。client 走下面的 dsh.client
    },
    "client": {
      "platform": "web",                // 唯一被 browser 端 client-modules 读到的字段
      "inject": [                       // 信息性 peer 列表（不控加载顺序）
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-api-remotes"
      ],
      "immediately": false              // 阶段一 prefetch；MCP 设置基本不用
    }
  },

  "scripts": {
    "build": "tsc -p . && tsdown",
    "build:client": "tsdown",
    "build:host": "tsc -p .",
    "clean": "rm -rf lib",
    "prepack": "pnpm run clean && pnpm run build",
    "prepublishOnly": "pnpm run prepack"
  },

  "dependencies": {
    "@deepseek-ai/cordis": "^4.0.1",
    "@deepseek-ai/cordis-plugin-include": "^1.0.6",
    "@deepseek-ai/dsh-home-paths": "*",
    "@deepseek-ai/dsh-mcp-client": "*",
    "@deepseek-ai/dsh-host-webserver": "*",
    "@deepseek-ai/dsh-client-runtime": "*",
    "@deepseek-ai/dsh-client-ui-slots": "*",
    "@deepseek-ai/dsh-client-ui-settings": "*",
    "@deepseek-ai/dsh-client-locale": "*",
    "@deepseek-ai/dsh-client-connection": "*",
    "@deepseek-ai/dsh-api-remotes": "*",
    "js-yaml": "^4.1.0"
  },

  "peerDependencies": {
    "@deepseek-ai/dsh-host-webserver": "*"
  },
  "peerDependenciesMeta": {
    "@deepseek-ai/dsh-host-webserver": { "optional": true }
  },

  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^18.3.0",
    "@types/js-yaml": "^4.0.9",
    "react": "^18.3.0",
    "typescript": "^5.6.0"
  },

  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  }
}
```

**4 个最常见的错**：

1. 把 `dsh.client` 写成 `dsh.bundle.client` → client 半边整套不加载，host 端正常（症状：host API 200，UI tab 不出现）
2. 忘了 `dsh.client.platform` 字段 → 整个 client bundle 被 client-modules 跳过
3. 把 `exports` 字段写成 `"typings"` 而非 `"types"` → 旧版 npm 风格，dsh 启动时 module 解析失败
4. 没把 `cordis.patch.yml` 加进 `files` 数组 → publish 后 cordis 找不到 patch 文件

---

## 3. `cordis.patch.yml` — Host 端入口声明

```yaml
# Bundle patch: registers the host (Node.js) half of my-dsh-mcp-settings.
# Loader sees `name: my-dsh-mcp-settings`, resolves the npm package, and calls
# its `apply(ctx)` in the host cordis tree.
- insert:
    - id: my-dsh-mcp-settings
      name: my-dsh-mcp-settings
      apply: ./lib/index.js
```

这是**只有 host 端**的入口。Client 端**不**在 patch 里——它在 `dsh.client` → `exports["./client"]` → 被 client-modules 自动扫描发现。

**多行 row 的写法**（如果你的 bundle 想 register 多个 cordis plugin）：

```yaml
- insert:
    - id: my-dsh-mcp-settings
      name: my-dsh-mcp-settings
      apply: ./lib/index.js
    - id: my-dsh-mcp-status
      name: my-dsh-mcp-settings:status
      apply: ./lib/status-watcher.js
      config:
        pollIntervalMs: 5000
```

**Patch 字段路径**：patch 文件用 `apply: ./lib/index.js` 时，路径是**相对于 package.json** 解析的。Cordis 用 `require.resolve` 走 Node 解析算法。

---

## 4. Host 端代码（5 个文件）

### 4.1 `src/types.ts` — 数据形状

```ts
import type { Config } from '@deepseek-ai/dsh-mcp-client'

// Host / Client 共享的形状
export type McpServerConfig = Config

// 列表里的一行（给 UI 看的）
export interface McpListEntry {
  serverName: string
  transport: 'stdio' | 'streamable-http'
  command?: string
  args?: string[]
  env?: Record<string, string>
  cwd?: string
  url?: string
  headers?: Record<string, string>
  toolCallTimeoutMs?: number
  failOnStartupError?: boolean
}

// 远端 API 统一返回类型
export type Result<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: string; message: string } }
```

### 4.2 `src/config-schema.ts` — 复用 dsh-mcp-client 的 Config

```ts
export { Config as McpClientConfigSchema } from '@deepseek-ai/dsh-mcp-client'
export type { Config } from '@deepseek-ai/dsh-mcp-client'

export const SERVER_NAME_PATTERN = /^[A-Za-z0-9_-]{1,32}$/
export function isValidServerName(value: string): boolean {
  return SERVER_NAME_PATTERN.test(value)
}
```

**为什么要复用**：你的 host 端校验和 client 表单校验必须用同一份 schema。自造一份会导致两端不一致。

### 4.3 `src/patch-store.ts` — 读 / 写 patch 文件

**最关键的文件**。绝对不能 `yaml.dump()` 裸写——会破坏用户的 `!!js` 表达式和其他 row。

```ts
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { dshHomePath } from '@deepseek-ai/dsh-home-paths'
import { applyEntryPatches, entryListSchema, type PatchOptions } from '@deepseek-ai/cordis-plugin-include'
import * as yaml from 'js-yaml'
import type { Config } from '@deepseek-ai/dsh-mcp-client'
import type { McpListEntry, Result } from './types.js'

const ROW_NAME = '@deepseek-ai/dsh-mcp-client'

interface PatchRow {
  id?: string
  name?: string
  config?: Config
}

function patchPath(profileName: string | null): string {
  return profileName
    ? dshHomePath('profiles', profileName, 'cordis.patch.yml')
    : dshHomePath('cordis.patch.yml')
}

function loadPatch(p: string): PatchOptions[] {
  const txt = readFileSync(p, 'utf8')
  return yaml.load(txt, { schema: entryListSchema }) as PatchOptions[]
}

function writePatch(p: string, layers: PatchOptions[]): void {
  // 重新合一遍：保证 !!js 表达式、其他 row 完整 round-trip
  const composed = applyEntryPatches([], layers)
  const text = yaml.dump(composed, { schema: entryListSchema, noRefs: true })
  // 原子写：tmp + rename
  const tmp = `${p}.tmp`
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, p)
}

export function createPatchStore(profileName: string | null) {
  const file = patchPath(profileName)

  return {
    list(): McpListEntry[] {
      if (!existsSync(file)) return []
      const layers = loadPatch(file)
      const out: McpListEntry[] = []
      for (const layer of layers) {
        for (const row of (layer.insert ?? []) as PatchRow[]) {
          if (row.name === ROW_NAME && row.config) {
            out.push({ ...row.config, serverName: row.config.serverName })
          }
        }
      }
      return out
    },

    add(config: Config): Result<true> {
      try {
        const layers = existsSync(file) ? loadPatch(file) : []
        // 删掉同 serverName 的旧行（按 row.name 筛所有 mcp-client 行）
        for (const layer of layers) {
          if (Array.isArray(layer.insert)) {
            layer.insert = (layer.insert as PatchRow[]).filter(
              r => !(r.name === ROW_NAME && r.config?.serverName === config.serverName),
            )
          }
        }
        // 准备新行
        const newRow: PatchRow = { id: `mcp-${config.serverName}`, name: ROW_NAME, config }
        if (!Array.isArray(layers[0]?.insert)) layers[0] = { insert: [] }
        ;(layers[0]!.insert as PatchRow[]).push(newRow)
        writePatch(file, layers)
        return { ok: true, value: true }
      } catch (e) {
        return { ok: false, error: { code: 'PATCH_WRITE', message: String(e) } }
      }
    },

    remove(serverName: string): Result<true> {
      try {
        if (!existsSync(file)) return { ok: true, value: true }
        const layers = loadPatch(file)
        for (const layer of layers) {
          if (Array.isArray(layer.insert)) {
            layer.insert = (layer.insert as PatchRow[]).filter(
              r => !(r.name === ROW_NAME && r.config?.serverName === serverName),
            )
          }
        }
        writePatch(file, layers)
        return { ok: true, value: true }
      } catch (e) {
        return { ok: false, error: { code: 'PATCH_WRITE', message: String(e) } }
      }
    },
  }
}

export type PatchStore = ReturnType<typeof createPatchStore>
```

### 4.4 `src/webserver-routes.ts` — HTTP API

```ts
import type { Context } from '@deepseek-ai/cordis'
import type { Config } from '@deepseek-ai/dsh-mcp-client'
import { createPatchStore, type McpListEntry, type Result } from './patch-store.js'
import { isValidServerName } from './config-schema.js'

interface AddRequestBody { config: Config }
interface RemoveRequestBody { serverName: string }

function isAddBody(v: unknown): v is AddRequestBody {
  return typeof v === 'object' && v !== null && typeof (v as any).config === 'object'
}
function isRemoveBody(v: unknown): v is RemoveRequestBody {
  return typeof v === 'object' && v !== null && typeof (v as any).serverName === 'string'
}
function isValidConfig(c: unknown): c is Config {
  if (typeof c !== 'object' || c === null) return false
  const cfg = c as Config
  if (typeof cfg.serverName !== 'string' || !isValidServerName(cfg.serverName)) return false
  if (cfg.transport !== 'stdio' && cfg.transport !== 'streamable-http') return false
  if (cfg.transport === 'stdio' && typeof cfg.command !== 'string') return false
  if (cfg.transport === 'streamable-http' && typeof cfg.url !== 'string') return false
  return true
}

function jsonResponse(res: any, status: number, body: unknown): void {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(text).toString(),
  })
  res.end(text)
}

async function readJsonBody(req: any): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of req) chunks.push(chunk)
  if (chunks.length === 0) return undefined
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) }
  catch { return null }
}

function resolveProfileName(): string | null {
  const fromProc = process.env['DSH_PROFILE']
  return typeof fromProc === 'string' && fromProc.length > 0 ? fromProc : null
}

export function registerMcpRoutes(ctx: Context): () => void {
  const store = createPatchStore(resolveProfileName())
  const disposers: (() => void)[] = []

  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/mcp/list',
    handler(_req, res) {
      jsonResponse(res, 200, { ok: true, value: store.list() })
    },
  }))

  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/mcp/add',
    async handler(req, res) {
      const body = await readJsonBody(req)
      if (!isAddBody(body) || !isValidConfig(body.config)) {
        jsonResponse(res, 400, { ok: false, error: { code: 'BAD_REQUEST', message: 'invalid config' } })
        return
      }
      const result = store.add(body.config)
      jsonResponse(res, result.ok ? 200 : 500, result)
    },
  }))

  disposers.push(ctx.webServer.register({
    kind: 'exact',
    path: '/api/mcp/remove',
    async handler(req, res) {
      const body = await readJsonBody(req)
      if (!isRemoveBody(body) || !isValidServerName(body.serverName)) {
        jsonResponse(res, 400, { ok: false, error: { code: 'BAD_REQUEST', message: 'invalid serverName' } })
        return
      }
      const result = store.remove(body.serverName)
      jsonResponse(res, result.ok ? 200 : 500, result)
    },
  }))

  return () => { for (const d of disposers) d() }
}
```

### 4.5 `src/ambient.d.ts` — ctx 类型扩展

```ts
import type { Context } from '@deepseek-ai/cordis'

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Registered by @deepseek-ai/dsh-host-webserver at app boot. */
    webServer: {
      register(route: {
        kind: 'exact'
        path: string
        handler: (req: unknown, res: unknown) => void | Promise<void>
      }): () => void
    }
    /** Registered by cordis-loader. */
    loader: {
      entries(): Iterable<{
        id: string
        options: { name?: string; config?: unknown; disabled?: boolean }
        fiber?: { state: number }
      }>
    }
  }
}
```

### 4.6 `src/index.ts` — Host 端 apply 入口

```ts
import type { Context } from '@deepseek-ai/cordis'
import { registerMcpRoutes } from './webserver-routes.js'

export const name = 'my-dsh-mcp-settings'

/** Wait for the host webServer so we can register routes against it. */
export const inject = ['webServer'] as const

export function apply(ctx: Context): void {
  // cordis effect expects a SyncEffect (Disposable | Iterable<Disposable>);
  // wrap the composite disposer in a one-element array so per-route
  // disposers land in the effect's teardown chain together.
  const dispose = registerMcpRoutes(ctx)
  ctx.effect(
    () => [dispose] as Iterable<() => void>,
    'my-dsh-mcp-settings: dispose webserver routes',
  )
}
```

---

## 5. Client 端代码（7 个文件）

### 5.1 `src/client/locales.ts`

```ts
export const zh = {
  'nav': 'MCP 服务',
  'add': '添加',
  'edit': '编辑',
  'remove': '删除',
  'save': '保存',
  'cancel': '取消',
  'serverName': '名称',
  'transport': '连接方式',
  'command': '命令行',
  'url': 'URL',
  'restartHint': 'Web 模式下需重启 dsh 生效',
  'badName': '名称必须 1-32 位字母数字或 _-',
  'writeError': '写入失败',
} as const

export const en: typeof zh = {
  'nav': 'MCP Servers',
  'add': 'Add',
  'edit': 'Edit',
  'remove': 'Remove',
  'save': 'Save',
  'cancel': 'Cancel',
  'serverName': 'Name',
  'transport': 'Transport',
  'command': 'Command',
  'url': 'URL',
  'restartHint': 'Restart dsh to apply changes in Web mode',
  'badName': 'Name must be 1-32 chars, letters/digits/_/-',
  'writeError': 'Write failed',
}

export type McpKey = keyof typeof zh
```

### 5.2 `src/client/mcp-store.ts`

```ts
import { defineStore } from '@deepseek-ai/dsh-client-web-react'
import type { Config } from '@deepseek-ai/dsh-mcp-client'
import type { McpListEntry, Result } from '../types.js'

// remote API 接口（ctx.connection.api 实际类型）
interface Remote {
  mcpSettings: {
    list(): Promise<Result<McpListEntry[]>>
    add(config: Config): Promise<Result<true>>
    remove(serverName: string): Promise<Result<true>>
  }
}

interface State {
  entries: McpListEntry[]
  status: 'idle' | 'loading' | 'error'
  error: string | null
  editing: McpListEntry | null
}

export function createMcpStore(api: Remote) {
  const store = defineStore<State>({
    entries: [],
    status: 'idle',
    error: null,
    editing: null,
  })

  return {
    ...store,
    load: async () => {
      store.update(s => ({ ...s, status: 'loading', error: null }))
      const r = await api.mcpSettings.list()
      if (r.ok) store.update(s => ({ ...s, entries: r.value, status: 'idle' }))
      else store.update(s => ({ ...s, status: 'error', error: r.error.message }))
    },
    startAdd: () => store.update(s => ({ ...s, editing: null })),
    startEdit: (entry: McpListEntry) => store.update(s => ({ ...s, editing: entry })),
    cancelEdit: () => store.update(s => ({ ...s, editing: null })),
    save: async (cfg: Config) => {
      const r = await api.mcpSettings.add(cfg)
      if (r.ok) await store.load()
      else store.update(s => ({ ...s, status: 'error', error: r.error.message }))
    },
    remove: async (serverName: string) => {
      const r = await api.mcpSettings.remove(serverName)
      if (r.ok) await store.load()
      else store.update(s => ({ ...s, status: 'error', error: r.error.message }))
    },
  }
}

export type McpStore = ReturnType<typeof createMcpStore>
```

### 5.3 `src/client/McpRow.tsx`

```tsx
import css from './McpSection.module.css'
import type { McpListEntry } from '../types.js'

interface Props {
  entry: McpListEntry
  t: (key: string) => string
  onEdit: () => void
  onRemove: () => void
}

export function McpRow({ entry, t, onEdit, onRemove }: Props) {
  const detail = entry.transport === 'stdio'
    ? `${entry.command ?? ''} ${(entry.args ?? []).join(' ')}`
    : entry.url ?? ''
  return (
    <li className={css.row}>
      <span className={css.name}>{entry.serverName}</span>
      <span className={css.transport}>{entry.transport}</span>
      <span className={css.detail}>{detail}</span>
      <button onClick={onEdit} type="button">{t('edit')}</button>
      <button onClick={onRemove} type="button">{t('remove')}</button>
    </li>
  )
}
```

### 5.4 `src/client/McpForm.tsx`

```tsx
import { useState } from 'react'
import css from './McpSection.module.css'
import type { Config } from '@deepseek-ai/dsh-mcp-client'
import type { McpListEntry } from '../types.js'
import { isValidServerName } from '../config-schema.js'
import type { McpStore } from './mcp-store.js'

interface Props {
  store: McpStore
  t: (key: string) => string
  initial?: McpListEntry
  onCancel: () => void
}

export function McpForm({ store, t, initial, onCancel }: Props) {
  const [serverName, setServerName] = useState(initial?.serverName ?? '')
  const [transport, setTransport] = useState<'stdio' | 'streamable-http'>(
    initial?.transport ?? 'stdio',
  )
  const [command, setCommand] = useState(initial?.command ?? '')
  const [url, setUrl] = useState(initial?.url ?? '')

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValidServerName(serverName)) {
      alert(t('badName'))
      return
    }
    const cfg: Config = transport === 'stdio'
      ? { serverName, transport, command, args: [] }
      : { serverName, transport, url }
    await store.save(cfg)
    onCancel()
  }

  return (
    <form onSubmit={onSubmit} className={css.form}>
      <label>{t('serverName')}<input
        value={serverName}
        onChange={e => setServerName(e.target.value)}
        disabled={!!initial}
      /></label>
      <label>{t('transport')}<select
        value={transport}
        onChange={e => setTransport(e.target.value as 'stdio' | 'streamable-http')}
      >
        <option value="stdio">stdio</option>
        <option value="streamable-http">streamable-http</option>
      </select></label>
      {transport === 'stdio' ? (
        <label>{t('command')}<input value={command} onChange={e => setCommand(e.target.value)} /></label>
      ) : (
        <label>{t('url')}<input value={url} onChange={e => setUrl(e.target.value)} /></label>
      )}
      <button type="submit">{t('save')}</button>
      <button type="button" onClick={onCancel}>{t('cancel')}</button>
    </form>
  )
}
```

### 5.5 `src/client/McpSection.tsx`

```tsx
import css from './McpSection.module.css'
import { McpRow } from './McpRow.js'
import { McpForm } from './McpForm.js'
import type { McpStore } from './mcp-store.js'

export interface McpSectionInjected {
  store: McpStore
  t: (key: string) => string
}

export interface McpSectionProps {
  useSnapshot: McpStore['useSnapshot']
  inject: McpSectionInjected
}

export function McpSection({ useSnapshot, inject }: McpSectionProps) {
  const state = useSnapshot(s => s)
  const { store, t } = inject

  return (
    <div className={css.section}>
      <header className={css.header}>
        <h2>{t('nav')}</h2>
        <button onClick={() => store.startAdd()} type="button">{t('add')}</button>
      </header>
      <ul className={css.list}>
        {state.entries.map(e => (
          <McpRow
            key={e.serverName}
            entry={e}
            t={t}
            onEdit={() => store.startEdit(e)}
            onRemove={() => store.remove(e.serverName)}
          />
        ))}
      </ul>
      <McpForm store={store} t={t} onCancel={() => store.cancelEdit()} />
      {state.error && <div className={css.error}>{state.error}</div>}
      <div className={css.hint}>{t('restartHint')}</div>
    </div>
  )
}
```

### 5.6 `src/client/McpSection.module.css`

```css
.section { padding: 16px; color: var(--dsw-fg, #222); }
.header { display: flex; gap: 12px; align-items: center; }
.list { list-style: none; padding: 0; }
.row { display: grid; grid-template-columns: 200px 120px 1fr auto auto; gap: 8px; padding: 8px 0; border-bottom: 1px solid var(--dsw-border, #eee); }
.name { font-weight: 600; }
.transport { font-family: var(--dsw-mono, monospace); }
.form { display: grid; gap: 8px; margin-top: 16px; }
.error { background: var(--dsw-err-bg, #fee); color: var(--dsw-err, #c33); padding: 8px; }
.hint { color: var(--dsw-fg-muted, #888); font-size: 12px; margin-top: 8px; }
```

### 5.7 `src/client/index.ts` — **关键：注册到 settings.section**

```ts
import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
// 类型扩展：让 ctx 认得 slots / locale / connection / settings
import type {} from '@deepseek-ai/dsh-client-ui-slots/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'

import { McpSection, type McpSectionInjected } from './McpSection.js'
import { createMcpStore } from './mcp-store.js'
import { zh, en, type McpKey } from './locales.js'

export const name = 'my-dsh-mcp-settings:client'

export const inject = ['slots', 'locale', 'connection'] as const

const NS = 'settings.mcp'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  // 把我们的 locale namespace 注入到全局的合并类型
  interface LocaleNamespaceMap {
    'settings.mcp': McpKey
  }
}

export function apply(ctx: ClientContext): void {
  // 1. 注册文案
  ctx.effect(
    () => ctx.locale.register(NS, { zh, en }),
    'my-dsh-mcp-settings: register locale',
  )
  const t = ctx.locale.bind(NS) as (key: McpKey) => string

  // 2. 创建 store
  const connection = ctx.get('connection') as unknown as {
    api: {
      mcpSettings: {
        list(): Promise<unknown>
        add(config: unknown): Promise<unknown>
        remove(serverName: string): Promise<unknown>
      }
    }
  }
  const store = createMcpStore(connection.api as any)

  // 3. 预热
  ctx.effect(() => { void store.load() }, 'my-dsh-mcp-settings: initial-load')

  // 4. 注册到 settings.section slot
  //    ⚠ 必须两层：外层 inject 等 slot 声明；内层 register 落地
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'mcp',
        order: 20,
        label: () => t('nav'),
        locale: NS,
        inject: (): McpSectionInjected => ({ store, t }),
      },
      McpSection as any,
    ),
  )
}
```

**踩坑列举**：

- `store` 在模块级别 `new` → 所有 ctx 共享同一个实例，HMR/多 profile 串

---

### 5.8 `tsdown.config.ts` — **关键：client 端产物格式**

**为什么不能用 `tsc` 编 client**：浏览器通过 `<script src="/plugins/<id>/client.js">` 加载 bundle 时，期望的是 **classic CJS + `window.__ModuleLoader__.load({ id, factory })` 包裹**。`tsc -p .` 编出来是 ESM，浏览器 `import` 关键字 syntax error，factory 永远不注册。

正确的产物：

```js
window.__ModuleLoader__.load({
  id: "my-dsh-mcp-settings",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var _react = require("react");
    var _jsx = require("react/jsx-runtime");
    // ... 你的源码 ...
    exports.apply = apply;
    return module.exports;
  }
});
```

**最小 `tsdown.config.ts`**（镜像 `packages/client/tsdown.client.ts`）：

```ts
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { transform } from 'lightningcss'
import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'my-dsh-mcp-settings'
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

// Loader module table 的 seed words —— 必须是 external，不能 inline
const CLIENT_EXTERNALS = [
  'react', 'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default defineConfig({
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',         // 必须是 cjs
  platform: 'browser',   // 必须是 browser
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source, importer) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined
        ? new URL(source, new URL(importer, 'file://')).pathname
        : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId, code: source,
        cssModules: { pattern: '[hash]_[local]' }, minify: true,
      })
      const classMap = {}
      for (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(`${PLUGIN_ID}/${basename(fileId)}`)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
```

devDependencies 加：`tsdown`, `lightningcss`。

`build` 脚本两条流水线：

```jsonc
"scripts": {
  "build": "tsc -p . && tsdown",
  "build:client": "tsdown",
  "build:host": "tsc -p ."
}
```

**踩坑**：
- `format: 'esm'` + `platform: 'browser'` 编出来**仍然是 ESM**——浏览器 `<script>` 不支持 import。**`format: 'cjs'` 是必需的**。
- `lib/client.js` 输出后，`package.json` 的 `exports["./client"]` 必须指向 `lib/client.js`（**不是** `lib/client/index.js`）。`client-modules` 直接读 `pkg.exports["./client"]` 拼绝对路径——指错路径 dsh 就返回 404。
- CSS Modules 不写 lightningcss plugin：导入 `*.module.css` 时 tsdown 抛 "no loader for .css"。把 CSS 通过虚拟模块转成 inline JS + `<style data-plugin>` 注入。
- **Client 端禁止通过 `import type` 拉跨包 `@deepseek-ai/dsh-mcp-client`** —— tsdown 跟随 pnpm workspace link 解析到 `packages/mcp/mcp-client/src/index.ts`（注意 `"./src/*": "./src/*"` 导出规则），把 `Config = z.union(...)` 的 Schemastery 运行时 + MCP SDK + subprocess + tools 全拉进 bundle。即使 `import type {}` 在 tsc 下能擦除，tsdown 的 noExternal 默认会 inline。Client 只用 `Config` 的形状，**在 `src/client/config.ts` 里自己 mirror 一份**（保持结构同步；host 端仍用上游 schema 验证）。Client **也不能 import 任何带运行时副作用的 host-side 模块**——比如 `McpForm.tsx` 不能 `import { SERVER_NAME_PATTERN } from '../config-schema'`，因为 `config-schema.ts` 也 re-export 运行时 `Config` 值。`SERVER_NAME_PATTERN` 也要在 client 端 inline。
- 验证 build 体积是健康信号：从 718 KB 减到 26 KB 说明清理成功——意味着 bundle 只含你的组件代码 + css（已 inline）。如果还是几百 KB，**必有某个上游 dsh 包被隐式 inline 了**——`grep -c 'require("node:')` `grep -c 'modelcontextprotocol'` 应该是 0。

---

## 6. 终端命令流

```bash
# 1. 编译
cd my-dsh-plugin/mcp
pnpm install
pnpm build         # → 产出 lib/

# 2. 装到 dsh web profile
dsh plugin --profile web add 'file:/path/to/my-dsh-plugin/mcp'
#   ↳ dsh 内部：pnpm add + reconcile dsh.profile.bundles 列表

# 3. 启动
dsh web
#   ↳ 监听 0.0.0.0:3000（默认）

# 4. 验证 host 端
curl http://localhost:3000/api/mcp/list
# 期望: { ok: true, value: [] }

# 5. 验证 client 端（浏览器 DevTools Console）
JSON.parse(document.querySelector('script:not([src])').textContent.replace('window.__DSH_BOOT__ = ', ''))
  .entries.map(e => e.id)
# 期望包含: "my-dsh-mcp-settings"

# 6. 验证 client bundle 路由
curl -I http://localhost:3000/plugins/my-dsh-mcp-settings/client.js
# 期望: 200 OK

# 7. 打开浏览器 → 设置 → 看 "MCP 服务" tab
```

---

## 7. 调试清单

| 现象 | 原因 | 修法 |
|---|---|---|
| `dsh plugin add` 报 `declares no dsh.bundle` | `package.json` 缺 `dsh.bundle.patch` | 加上：`"dsh": { "bundle": { "patch": "./cordis.patch.yml" } }` |
| `dsh web` 启动时 `failed to compose client bundle` | `dsh.client` 缺 `platform` 或 `exports["./client"]` 打不到 | 照 §2 模板补齐 |
| `添加` 按钮调 API 报 404 | host 端 route 没注册 | 看 `dsh web` 启动日志是否 fatal；`ctx.webServer` 是否在 `inject` 列表里 |
| UI tab 不出现 | `ctx.slots.inject('settings.section')` 漏外层 | 改成 `slots.inject('settings.section', () => slots.register(...))` |
| UI 上 `serverName` 改成 `my-server` 提示 invalid | 不满足 `^[A-Za-z0-9_-]{1,32}$` 模式 | 改用 `my-server-1` 之类 |
| `dsh` 重启后 UI 没更新 | 用户在 `~/.dsh/profiles/web/cordis.patch.yml` 改了；web 模式 HMR disabled | 手动 `dsh web` 重启 |
| Browser devtools 看到 `__DSH_BOOT__` entries 列表里没有我的 bundle | `dsh.client.platform` 字段缺失或者 `@deepseek-ai/dsh-client-modules` 启动时早于你 bundle | 确认 `dsh.client` 字段存在；`dsh web` 重启（module 启动是 dsh boot 时一次性） |
| 在 `~/.dsh/profiles/web` 里 `pnpm update` 后 bundle 报错 | peer 错配（rc.5 vs rc.6） | 跟进 dsh 当前装的版本，把你 peer 钉到一致 |

---

## 8. 升华规则

读懂 dsh 工程的最佳方法是看几个真实例子：

- **完整 settings.section 范例**：`packages/client/ui-settings-models/src/client/index.ts`（models tab 的注册）
- **完整 webserver 路由范例**：`packages/host/webserver/src/index.ts`
- **完整 client manifest 范例**：`packages/client/ui-settings-general/package.json`
- **完整 cordis.patch.yml 范例**：`packages/bundle/base/cordis.patch.yml`
- **MCP client Config 字段**：`packages/mcp/mcp-client/src/index.ts:107-128`
- **Slot 系统规则**：`packages/client/AGENTS.md:7-17`（一图会全部讲）
- **ctx 不可见的红线**：`packages/client/AGENTS.md:36-69`

这些文件**就在 deepseek-harness 仓库里**，改 bundle 时随时打开参考。
