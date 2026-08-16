# dsh 架构

> 写作目的：在动手开发 dsh 外部插件之前，先把 dsh 内部的"运转模型"理清楚。
> 不是逐文件读源码的摘要，而是从插件作者视角，**知道 dsh 在启动那一刻到一次用户操作之间，发生了哪些事情，哪些钩子点对我开放**。

---

## 1. 一句话总览

dsh 是一个**双进程 + 双 bundle 加载**的模型：

```
┌─────────────────────┐        ┌─────────────────────┐
│        HOST         │        │        CLIENT       │
│  Node.js 主进程      │   ↔   │  浏览器里的 React    │
│                     │   SSE/  │                     │
│  - cordis IoC 容器  │  fetch  │  - React UI         │
│  - Loader 动态加载   │   ↔    │  - slots 套件       │
│  - webServer HTTP   │        │  - 独立的 plugin     │
│  - tools 注册中心    │        │    runtime          │
│                     │        │                     │
└──────────┬──────────┘        └──────────┬──────────┘
           │                              │
           │     共享磁盘状态               │
           ▼                              ▼
    ~/.dsh/profiles/<name>/
      ├─ cordis.patch.yml          ← 真实配置源（人改/插件改都被监听）
      └─ node_modules/             ← 已安装的 bundle 都在这
```

- **HOST**（Node 端）跟 dsh-cli 同一个进程，跑 `dsh web`、`dsh tui`、模型转发；由 cordis 容器做依赖注入，所有插件的 host 部分都注册到这里。
- **CLIENT**（浏览器端）是一个独立的 React bundle，靠 HTML 里 `<script src=...>` 加载；每个 client 插件是另一个 `<script src="/plugins/<id>/client.js">`。
- 两者**不共享 JS 运行时**，**不共享进程内存**，通过 `fetch()` (主→从 REST) + SSE (server→browser 事件流) 沟通。
- 持久态只在磁盘：`~/.dsh/profiles/<name>/cordis.patch.yml` + 若干 `node_modules/` 下的插件源码。

---

## 2. HOST：cordis 容器 + Loader + 配置 patch 文件

### 2.1 cordis：dsh 的"插件总线"

dsh 内部所有功能都装在一个 **cordis** IoC 容器里。cordis 模型：

- 一个长生命周期的 `Context`（一个插件树节点），上面挂许多 service。
- 通过 `inject = ['webServer', 'locale', 'slots', ...]` 声明"我等谁启动好"。
- 通过 `apply(ctx)` 注入代码；返回一个 `dispose` 函数，下一次插件 disable 时跑。
- `cordis.patch.yml` 是这套模型的**配置 DSL**：每一行就是一个 `id` + `name`（npm 包名）+ `apply`（在该包里）。

参考位置：`packages/cordis/src/*`、`packages/boot/app-boot/src/profile.ts`。

dsh 自带的 service 大致有：

| service | 来源 | 谁用 |
|---|---|---|
| `webServer` | `@deepseek-ai/dsh-host-webserver` | 注册 HTTP 端点 |
| `loader` | `@deepseek-ai/cordis-plugin-loader` | 装载 `cordis.patch.yml` 里的行 |
| `tools` | `@deepseek-ai/dsh-tools` | 注册 tool (`{name: 'mcp__...', ...}`) 供 agent 调用 |
| `locale`（client） | `@deepseek-ai/dsh-client-locale` | 注册中英文案 |
| `slots`（client） | `@deepseek-ai/dsh-client-ui-slots` | 注册 UI 套件 |

### 2.2 Loader：动态加载 + HMR

**Loader** (`packages/cordis-plugin-loader`) 是把 `cordis.patch.yml` 兑现成实际插件实例的引擎。

- 一行 patch `{ id: 'foo', name: '@scope/pkg', config: {...} }` → 它会 `import('@scope/pkg')` → 取到该包的 `apply` → 创建一条 fiber（一根独立的"插件生命周期线"），调 `apply(fiberCtx, config)`。
- Loader 把每次 `patch.patch.yml` 变更翻译成 `entry.create/update/dispose`，**完美跟霍 HMR 接驳**：文件变了 → Loader 看见 → 对应 entry 跟 diff → 新 mcp-client 实例 active，旧的 dispose。
- `cordis.patch.yml` 这文件的 schema 用 `@deepseek-ai/cordis-plugin-include` 提供：`entryListSchema`（YAML schema，允许 `!!js/function` 这类自定义类型）。

### 2.3 双层 patch

看 `dsh-cli/profile-boot.ts`：

- `~/.dsh/cordis.patch.yml` —— "home 层"，跨 profile 公用。
- `~/.dsh/profiles/<name>/cordis.patch.yml` —— "profile 层"，每个 profile 自己。

CLI 启动时把两层 union 起来，watch 同一个目录。两个文件任一变化都会触发 HMR。

我们这个项目**只写 profile 层**（`dshHomePath('profiles', profileName, 'cordis.patch.yml')`）——这是 dsh Loader 在文件变更时唯一会重新扫的那一份。

### 2.4 webServer：唯一 HTTP 出入口

dsh 的所有 REST 端点都靠 `@deepseek-ai/dsh-host-webserver` 暴露。Loader 自身 zero HTTP 端口——端口打开后，**任何插件**都可以通过：

```ts
await ctx.webServer.register({
  kind: 'exact',
  path: '/api/my-plugin/...',
  handler: (req, res) => { ... },
})
```

加自己的路由。这是你作为外部插件往 dsh **注入 HTTP 能力**的唯一官方姿势。后面"开发步骤"会用上。

### 2.5 tools：唯一的 agent 出口

agent 调工具用 `ctx.tools.register({ name: 'mcp__<server>__<tool>', ... })`。任何 plugin 把能力暴露给 agent 的方式都走这里。Loader 自身不注册 tool——它只是个"插件生命周期管理"。

> MCP 实际物理写入 `tools` 的，是 `@deepseek-ai/dsh-mcp-client`（mcp-client 包）在它自己的 `apply(ctx, config)` 里跑的。我们的插件**不直接写 tools**——我们改 patch 文件，Loader 启动新一条 `@deepseek-ai/dsh-mcp-client` 实例，它写 tools。

---

## 3. CLIENT：浏览器端的 React + slots 体系

### 3.1 客户端运行时

浏览器加载 dsh 那一刻会注入一个 `window.__ModuleLoader__`，之后 dsh 会在合适时机调：

```js
window.__ModuleLoader__.load({
  id: 'my-dsh-mcp-settings',
  factory: (require) => {
    // 外部 bundle 的整个 client 部分都在这里 require
    const { name, apply } = require('./index.js')
    // 然后 dsh-runtime 会 (等会儿) 用 ClientContext 调 apply(ctx)
  }
})
```

这截 banner / footer 是 `tsdown.config.ts` 自动加的（见开发步骤 4）。**理解了**这个，就能理解"为什么 client 是 closure-factory 而不是 ESM"——浏览器没法做 import map，得 runtime 帮忙 resolve externals。

参考：`packages/client/modules/src/index.ts`。

### 3.2 slots：UI 注入点

UI 是一个 React 组件树。挂新东西到设置弹窗/侧边栏/聊天输入框……这些地方都叫 **slot**，由 `slots.register({ name: 'settings.section', id: 'mcp', label, order, locale, inject }, McpSection)` 实现。

`settings.section` 是个 namespace，许多 tab 都注册进来——按 `order` 排序显示。

注意约束：

- 你的 slot 注册**不能立刻跑**，要等 slot owner（这里是 `dsh-client-ui-settings`）起来。所以你的 `apply()` 里调 `ctx.slots.inject('settings.section', () => ctx.slots.register(...))`——slot 系统保证 owner 没起之前你的注册会排队。
- 组件 prop 通过 `inject` 工厂注入——`{ store, t }` 这种，自己不能 `import 'ctx'`。

参考：`packages/client/ui-slots/src/index.ts`。

### 3.3 locale：i18n

`ctx.locale.register(namespace, { zh, en })` 注册中英文案，`ctx.locale.bind(ns)` 取 `t: (key) => string`。

UI 组件最终拿的是 `t`，不是原始文案——这是 i18n 的全部。

注意 `keys` 类型要是 `Record<McpKey, string>`，否则 dsh 的 locale merge 会报 `Subsequent property declarations must have the same type`（参考 `src/ambient.d.ts` 的注释）。

### 3.4 模块白名单：bundle 编译期 inject

外部 bundle 编译时要决定**哪些包走 windows runtime 提供，其余内联进 bundle**。`tsdown.config.ts` 里的 `CLIENT_EXTERNALS` 就是这张名单。

`package.json` 里 `dsh.client.inject` 是另一张运行时白名单——这个 list 之外的 npm 包**不能在 client 端 import**，否则 codepath 会在浏览器里炸。

`react`, `cordis`, `dsh-client-runtime/client` 等都在名单上——这意味着 client 端可以自由用 React、可以自由拿 runtime hooks，但 `@modelcontextprotocol/sdk` 这种**不行**（它在 host 端用，不在 inject 名单）。

参考 `package.json` 的 `peerDependencies` + `dsh.client.inject`：
```jsonc
"dsh": {
  "client": {
    "platform": "web",
    "inject": [
      "@deepseek-ai/dsh-client-runtime",
      "@deepseek-ai/dsh-client-ui-slots",
      "@deepseek-ai/dsh-client-ui-settings",
      "@deepseek-ai/dsh-client-locale",
      "@deepseek-ai/dsh-client-connection",
      "@deepseek-ai/dsh-api-remotes"
    ],
    "immediately": false
  }
}
```

---

## 4. 一次典型交互的"完整路径"

用户在 dsh web 设置弹窗里点 "添加 MCP server → 保存"，背后所有发生的事情：

```
[点击保存] (browser)
  │
  │ McpForm.onSubmit → McpSection.submitConfig → store.add(config)
  ▼
fetch('/api/mcp/add', POST { config })
  │
  │ ← host 路由 webserver-routes.ts 的 handler
  ▼
patch-store.add(config)
  │  1. 读 ~/.dsh/profiles/web/cordis.patch.yml
  │  2. 抹掉同 serverName 的旧行
  │  3. push 新行 { id: 'mcp-<server>', name: '@deepseek-ai/dsh-mcp-client', config }
  │  4. applyEntryPatches 合成 → yaml.dump → 临时文件 → rename (原子写)
  ▼
filesystems inotify → cordis-plugin-hmr.fire('fileChanged')
  │
  │ HMR 调 entry.update({ config: { patches: [...] } })
  ▼
Loader 收到 update，diff 出 "new mcp entry" 一行
  │  import('@deepseek-ai/dsh-mcp-client') → 取到 apply
  │  创建新 fiber，ctx.effect → mcp-client.startConnection(serverName)
  ▼
mcp-client spawn child (stdio) / 打开 http 连接
  │  handshake: initialize → tools/list
  │  每个 tool → ctx.tools.register({ name: 'mcp__<server>__<tool>', ... })
  ▼
host 的 tools 表已经更新
  │  dsh-internal: sse-bus 发 'tools/change' 事件给浏览器
  ▼
[McpSection 收到事件 / setTimeout 250ms 后 store.load() 主动拉]
  fetch('/api/mcp/status')  +  fetch('/api/mcp/tools')
  │
  ▼
McpRow 列表刷新，"展开工具 (N)" 按钮出现
  │
  ▼
用户问 "我有哪些 repo"，agent 调 mcp__github__list_repos
```

整个流程**零重启**，全是 patch 文件 ↔ HMR ↔ Loader ↔ mcp-client 之间的连锁。**只要你写对了** `cordis.patch.yml`，dsh 自己就把剩下的事干了。

---

## 5. 给插件作者的"白名单扩展点"

| 想做什么 | 走哪里 | 例子 |
|---|---|---|
| 增加 HTTP 端点 | `ctx.webServer.register(...)` | `/api/mcp/list` |
| 加 tab 到设置弹窗 | `ctx.slots.register('settings.section', ...)` | MCP 服务 |
| 多语言文案 | `ctx.locale.register(ns, { zh, en })` | `settings.mcp` ns |
| 改 cordis 配置 | 改 `cordis.patch.yml`（patch-store） | 加一行 mcp-client |
| 启动后台任务 | `ctx.effect(() => disposable, 'msg')` | 轮询 / 监听器 |
| 读/写 ctx.tools | `ctx.get('tools')` / 间接（patch 文件改） | 收集 mcp tool 列表 |

**不能**做的：
- 你**不能**直接 import `@modelcontextprotocol/sdk` 到 client bundle（不在 inject 白名单）。
- 你**不能**在客户端 `fetch('/api/')` 之外，靠"导入一个 host 模块" 来通信；唯一通道是 HTTP 端点 + SSE。
- 你**不能**改 dsh 自家 bundle 的 `cordis.patch.yml`——你只能追加自己的行。

---

## 6. 跟传统 React / Node 插件的差异

| 维度 | 传统 React app | 传统 Node plugin | dsh plugin |
|---|---|---|---|
| 启动入口 | `main` 字段 | `main` 字段 | 双入口：`main` (host) + `exports["./client"]` (client) |
| 注册 API | 一次性 mount | 自己 require | `apply(ctx)` + `ctx.webServer.register`/`ctx.slots.register` |
| 状态保存 | localStorage / IndexedDB | 内存 | 写 `cordis.patch.yml` + HMR |
| UI 框架 | React | — | **强制** React（client bundle injected with `react` external） |
| CSS | 随意 | — | **强制** CSS Modules（lightningcss），最终 inlined 进 bundle |
| 重载方式 | dev server HMR | — | patch 文件 HMR（host 端受 `cordis-plugin-hmr` 管；client 端自己随页面 reload） |
| 调试 | 一套 dev server | — | 双端各开 devtools / 各自 console |
| 发布 | `npm publish` | `npm publish` | `npm pack` 然后**文件路径**给 dsh-cli：`dsh plugin --profile X add file:./pkg-0.1.0.tgz` |

理解"双端 + 配置驱动 HMR"这两个核心概念，剩下都是体力活。
