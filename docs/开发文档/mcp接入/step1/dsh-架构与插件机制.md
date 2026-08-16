# dsh 工程架构与插件机制

> 这份文档解释**整个 dsh 仓库怎么运转**、**插件怎么被识别**、**Host/Browser 两半边怎么分开加载**。
> 不写具体代码——只画地图。代码示例和套路在 `dsh-bundle-接入指南.md`。

---

## 1. 一句话总览

**dsh = 一个 npm 包管理器 + 一个 profile 装配器 + 两个 cordis 树（Node 端 + 浏览器端）+ 一个 HTTP 桥**。

```
dsh --profile web
  │
  ▼
profile 装配（按顺序叠加 patch 层）
  │  第 1 层: @deepseek-ai/dsh-base 的 cordis.patch.yml
  │  第 2 层: @deepseek-ai/dsh-web-app 的 cordis.patch.yml
  │  第 3 层: 你的外部 bundle 的 cordis.patch.yml
  │  第 4 层: ~/.dsh/profiles/web/cordis.patch.yml（用户自己的）
  │  第 5 层: --patch 覆盖
  ▼
applyEntryPatches 合成一个 entry 列表
  │
  ▼
cordis Loader 把这些 entry 加载到两棵并行的树：
  - Host 树（Node.js 进程，import('./lib/index.js') 走 Node ESM）
  - Client 树（浏览器，import('/plugins/<id>/client.js') 走 client bundle）
  │
  ▼
两棵树之间用 HTTP + SSE 桥（@deepseek-ai/dsh-connection 接 dsh-host-webserver）
  │
  ▼
浏览器看到 dsh Web UI，可以开始跟 Agent 聊
```

---

## 2. 仓库结构（pnpm monorepo）

```
deepseek-harness/
├── apps/
│   ├── cli/                    ← dsh 命令本身（apps/cli/lib/bin.js）
│   ├── web/                    ← React shell（apps/web/dist/ 给浏览器加载）
│   └── playground/             ← 单进程的诊断 demo
│
├── packages/                   ← 全部业务包（目录下按职责再分）
│   ├── boot/
│   │   ├── app-boot/          ← @deepseek-ai/dsh-app-boot（profile 加载、装配）
│   │   ├── cmdline/           ← CLI 公共参数解析
│   │   └── runtime-diagnostics/
│   ├── bundle/                 ← dsh 启动默认要加载的几个大包
│   │   ├── base/               ← @deepseek-ai/dsh-base（host 端核心）
│   │   ├── web-app/            ← @deepseek-ai/dsh-web-app（web 端壳）
│   │   └── headless/           ← @deepseek-ai/dsh-headless（无浏览器）
│   ├── client/                 ← 浏览器端的 UI 包（@deepseek-ai/dsh-client-*）
│   │   ├── modules/            ← client/main module 系统（dsh.client 扫描机制）
│   │   ├── runtime/            ← 浏览器 ctx 类型 + Connection/Session 管理
│   │   ├── ui-settings/        ← 设置弹窗的 slot 契约
│   │   ├── ui-settings-general/ ← 设置弹窗（"通用"tab）
│   │   ├── ui-settings-models/  ← 设置弹窗（"模型"tab）
│   │   ├── ui-settings-plugins/ ← 设置弹窗（"插件"tab）
│   │   ├── ui-sidebar/         ← 侧栏
│   │   └── ui-commands/        ← 命令面板
│   ├── host/                   ← Node 端 HTTP 服务
│   │   ├── webserver/          ← @deepseek-ai/dsh-host-webserver（HTTP 路由）
│   │   └── connection/         ← 浏览器↔host 的 RPC 桥
│   ├── mcp/
│   │   └── mcp-client/         ← @deepseek-ai/dsh-mcp-client（MCP 协议 client）
│   ├── extensions/             ← 通用扩展（cordis-loader、typert 编译工具）
│   ├── typert/                 ← Typert：编译时 RPC 描述符生成器
│   ├── credentials/            ← 凭证持久化
│   ├── settings/               ← 设置 schema 树
│   └── ...                     ← 100+ 包
│
├── examples/                   ← 给 dsh 编译期 / 测试用的样品
│   ├── mcp-memory/             ← MCP server 示例
│   └── ...
│
└── docs/                       ← 内部架构文档 / 用 AGENTS.md 治理
```

dsh 启动时**只加载 `packages/bundle/*` 打头的三层 + 你 profile 里 add 的那一坨**——其他包都是这仨的 transitive dependencies。

---

## 3. 启动流程（按真实顺序）

### 3.1 `dsh web` 这条命令干了什么

```
$ dsh web
  │
  └─ apps/cli/lib/bin.js  (process.argv 解析)
       │
       ├─ 解析：--profile web  → 用 "web" profile
       │
       ├─ loadProfile("web", INSTALL_ANCHOR, DSCH_HOME)
       │     │
       │     ├─ ~/.dsh/profiles/web/package.json 存在 → 读它的 dsh.profile.bundles
       │     │  例如: ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app",
       │     │          "my-dsh-mcp-settings"]
       │     │
       │     └─ 对每个 bundle name:
       │            1. resolveBundleDir(name, INSTALL_ANCHOR, profileDir)
       │               先在 dsh 安装目录里找 → 再去 profile 的 node_modules 找
       │            2. 读它的 package.json 拿 dsh.bundle.patch 字段
       │            3. 加载 patch 文件 + 解析成 PatchOptions[]
       │
       ├─ applyEntryPatches([], layers)   ← 按顺序叠加，得出 entry 列表
       │
       ├─ Profile { layers, patchPath, patches }  ← 完整 profile 数据结构
       │
       ├─ boot("dsh", absoluteConfigPath, patches, ...)
       │     │
       │     ├─ 创建根 Context
       │     ├─ 注册 cordis loader, webServer, settings, hmr 等内置插件
       │     ├─ 加载 base + web-app 配置（cordis.yml）
       │     ├─ 加载叠加的 patch（base 提供的 mcp-client、settings、tools 等）
       │     ├─ 加载 web-app 配置 → dsh-web-app 接管一切 web 启动
       │     ├─ 加载用户 bundle（如 my-dsh-mcp-settings）
       │     │     └─ cordis Loader 看到 row { id: "my-dsh-mcp-settings",
       │     │                          name: "my-dsh-mcp-settings",
       │     │                          apply: "./lib/index.js" }
       │     │     └─ import bundle 的 lib/index.js → 拿到 { name, inject, apply }
       │     │     └─ ctx.plugin(plugin) → apply(ctx) 被调用
       │     │          └─ ctx.effect(() => registerMcpRoutes(ctx))
       │     │              └─ ctx.webServer.register({ kind: 'exact', path: '/api/mcp/list', ... })
       │     │
       │     └─ boots 终态
       │
       └─ dsh-web-app 接着接管：
              ├─ ctx.webServer 监听一个端口
              ├─ 读 apps/web/dist/index.html 模板
              ├─ 注入 window.__DSH_BOOT__  ← 客户端要加载的 plugin manifest
              │      ← 这一步由 @deepseek-ai/dsh-client-modules 负责
              │      ← 它扫所有 loader entry 的 package.json，看 dsh.client 字段
              │      ← 生成 [{ id, url: '/plugins/<id>/client.js?rev=<hash>' }, ...]
              │      ← 序列化成 <script> 注入到 <head>
              │
              ├─ GET / → 返回带 __DSH_BOOT__ 的 HTML
              ├─ GET /plugins/<id>/client.js → 返回 bundle 的 client 产物
              └─ 浏览器开始跑 React → 加载各个 client plugin
```

### 3.2 浏览器端的并行走

```
浏览器加载 index.html
  │
  ▼
读 window.__DSH_BOOT__ → BootManifest
  │
  ▼
对每个 entry { id, url, rev }:
  │  经典 <script src="/plugins/<id>/client.js?rev=...">
  │  加载后只是把 factory 注册到 window.__ModuleLoader__.load({ id, factory })
  │  工厂函数不会立即执行
  ▼
shell 启动 → cordis Loader 接管
  │
  ▼
对每个 entry (与 Node 端 loader 同名):
  │  ctx.plugin({ name, inject, apply: factory })
  │  factory(require) 首次被调用 → JS 执行，Cordis fiber 启动
  │  Client 端的 apply(ctx) 会拿到 ctx.slots / ctx.locale / ctx.connection
  │  apply 注册到 settings.section slot
  ▼
设置弹窗的 navigation row 出现 "MCP 服务" tab
```

**关键**：Node 端和浏览器端**用同一个 package 的两个不同入口**。`exports["./client"]` 走到 `lib/client/index.js`，`exports["."]` 走到 `lib/index.js`。

---

## 4. 插件机制——三层声明

一个 npm 包要成为 dsh 可见的"插件"，**必须**在 `package.json` 用对**三个**字段：

| 字段 | 作用 | 谁读 | 何时读 |
|---|---|---|---|
| `dsh.bundle.patch` | Host 端入口 patch 文件路径 | `app-boot/loadProfile` | profile 启动时 |
| `dsh.client.platform` (= `"web"`) | "我是个 browser 包" | `client-modules` | host 端扫描完毕后注入 `__DSH_BOOT__` 时 |
| `dsh.client.inject` (可选) | "我依赖这些 peer" | `client-modules` | 同上 |

**漏一个就缺一半**：

| 缺的字段 | 现象 |
|---|---|
| 没 `dsh.bundle.patch` | `dsh plugin add` 时报 `declares no dsh.bundle`；profile 启动直接失败 |
| 没 `dsh.client.platform` | Host 端完全 OK，browser 端整个 bundle **静默不加载**（client-modules 看到没 platform 就当 null 跳过）|

之前已踩了一个坑：把 `dsh.client` 写成 `dsh.bundle.client`——client-modules 不读 `dsh.bundle` 任何字段，这是无效字段。**`dsh.bundle` 只接受 `.patch` 一个子键**。

### 4.1 `dsh.bundle` 完整 schema

```jsonc
"dsh": {
  "bundle": {
    "patch": "./cordis.patch.yml"   // 唯一有效字段
  }
}
```

### 4.2 `dsh.client` 完整 schema

```jsonc
"dsh": {
  "client": {
    "platform": "web",                // 唯一平台；目前所有都是 web
    "inject": [                       // 信息性 peer 列表 (不控制加载顺序)
      "@deepseek-ai/dsh-client-runtime",
      "@deepseek-ai/dsh-client-ui-slots"
    ],
    "immediately": false              // 可选；true = 阶段一 prefetch
  }
}
```

### 4.3 `cordis.patch.yml` 完整 schema

```yaml
# 一行或多个 insert 项
- insert:
    - id: my-dsh-mcp-settings         # 可选；同时是 entry id
      name: my-dsh-mcp-settings       # 必填：cordis 'name' 字段
      apply: ./lib/index.js           # 必填：相对于 package 根的 import spec
      config:                         # 可选：传给 apply 的初始配置
        someKey: someValue
```

更多 patch 字段（id 替换、disable、!!js 表达式）见 `@deepseek-ai/cordis-plugin-include` 文档。

---

## 5. 关键子系统速查

### 5.1 Profile 系统

**位置**：`packages/boot/app-boot/src/profile.ts`

- `loadProfile(name, installAnchor, home)` → 装配出一个 `Profile { layers, patches }`
- `resolveBundleDir(name, installAnchor, profileDir)` → 装哪查哪（先 dsh 安装目录，再 profile 自己的 node_modules）
- `PROFILE_TEMPLATES` = `{ web: [...base, ...web-app], headless: [...base, ...headless] }`

`dsh plugin --profile web add <pkg>` 的流程：
1. 在 `~/.dsh/profiles/web/` 跑 `pnpm add <pkg>`（把依赖装进 profile 自己的 node_modules）
2. pnpm 退成功 → dsh 读 profile manifest 的 dependencies
3. 对每个 dependency 调 `packageName → dsh.bundle.patch ?` 决策
4. 凡是 bundle 的，按 dependency 顺序追加到 `dsh.profile.bundles` 列表
5. 写回 profile 的 package.json

### 5.2 模块运行时（Node 端）

- `ctx.loader` — 内置 cordis-loader，扫描所有 enabled entry 解析 apply
- `ctx.webServer` — `dsh-host-webserver` 提供的 HTTP 注册器（`register({kind: 'exact'|'prefix', path, handler})`）
- `ctx.settings` — 设置 schema 树
- `ctx.hmr` — 文件监听 + 重载（profile 自己的 cordis.patch.yml 改了会自动重载，但你 bundle 的 cordis.patch.yml 改完需要重启——profile 重启时它会重新读）

### 5.3 模块运行时（浏览器端）

- `ctx.slots` — slot 注册器（`slots.register({ name, id, order, label, inject }, Component)`）
- `ctx.locale` — 文案注册器（`locale.register(namespace, { zh, en })`）
- `ctx.connection` — browser→host 的 RPC 通道（HTTP + SSE）；`ctx.connection.api.xxx(...)` 调 host 端
- `ctx.remote` — Typert 远端方法调用器（若你的 host 端有 TypertRemoteService，peer 关系就靠它）
- `ctx.modules` — client module 系统（host 端 `@deepseek-ai/dsh-client-modules` 注入的 `ClientModuleSystem`）

### 5.4 Slot 系统

**位置**：`packages/client/ui-settings/src/client/contract/slots.ts`

`settings.section` 是最常用的入口：

```ts
declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface SlotMap {
    'settings.section': {
      kind: 'list';
      scope: 'root';
      owner: SettingsSectionOwnerProps;  // { close: () => void }
    }
  }
}
```

每注册一个 `settings.section` 行，设置弹窗左侧的导航就多一项 row。`order` 决定 nav 顺序（general=0, models=10, plugins=15, 你的可以 20）。

**关键点**：你的 `apply(ctx)` 里必须用 `ctx.slots.inject('settings.section', () => ctx.slots.register(...))` 两层结构。**外层 inject 会等"settings.section"这个 SLOT 本身被声明**（即 `ui-settings-general` 加载完），内层 register 才执行。你直接写 `ctx.slots.register(...)` 会抛 "未声明 slot"。

### 5.5 patch 文件加载顺序

profile boot 时按这个顺序**叠加** patch：

```
1. base bundle (dsh-base) 的 cordis.patch.yml
2. web-app bundle (dsh-web-app) 的 cordis.patch.yml
3. 你的 bundle (my-dsh-mcp-settings) 的 cordis.patch.yml   ← 你写的
4. ~/.dsh/profiles/web/cordis.patch.yml                     ← 用户写的
5. ~/.dsh/cordis.patch.yml                                  ← home-level
6. dsh --patch <file>                                       ← 命令行最后
```

每一层都是**完整 row**（`id`、`name`、`apply` 都可以重定义）。**id 重复时后层覆盖前层**——所以你 bundle 里如果写了 `id: settings-cord-controller-row`，会被用户在 profile 里的同样 id 覆盖。

### 5.6 HMR 范围

- `~/.dsh/profiles/web/cordis.patch.yml` 改了 → **自动 reload**（`watchUserPatches` service 监听）
- 你 bundle 里的 `cordis.patch.yml` 改了 → **必须重启 dsh**（npm 装进来的代码，模块解析在 dsh 启动时一次性完成）
- `lib/index.js` 整个重 build → 同上
- `lib/client/index.js` 整个重 build → 浏览器刷新就行（client-modules 用了 content hash 缓存，但你重启浏览器就重读）

---

## 6. 容易被误解的几件事

### 6.1 "我的 plugin 怎么被 dsh 自动发现"

**答案：不是自动发现**。你需要：
1. 执行 `dsh plugin --profile web add 'file:/path/to/your-plugin'`（或者发布到 npm 后 `dsh plugin add <pkg-name>`）
2. dsh 读你 package.json 的 `dsh.bundle.patch` 字段，把它加入 `dsh.profile.bundles` 列表
3. 下次 `dsh web` 启动时你的 bundle 才被加载

没有 "扫 ~/.dsh/ 目录自动发现" 这种机制——profile 的 `dsh.profile.bundles` 是**显式列表**。

### 6.2 "只需要写前端 UI，或只需要写后端 API，行吗"

**部分行**。你可以省略其中一半（host-only 或 client-only），但**省哪边哪边就完全失效**：

- 只有 host（没 `dsh.client`）→ `/api/mcp/*` 端点能跑，但浏览器看不到你的 UI
- 只有 client（没 `dsh.bundle.patch`）→ 浏览器能看到 UI，但 host 没有任何东西在跑

**MCP 这个插件最好两边都写**——后端读 patch 文件，前端展示状态。

### 6.3 "要做 HMR，在哪儿改"

- 用户自己的 `cordis.patch.yml` 改 → 立即生效
- 你 bundle 里的 `cordis.patch.yml` 改 → 不会生效（重启 dsh）
- 你 bundle 里的 JS 代码改 → 不会生效（重启 dsh，或者你也是 profile-level patch）

**简化**：web 模式下，每次改 bundle 的代码都 `pnpm dsh web` 重启；用户改他自己 `cordis.patch.yml` 才会 HMR。

### 6.4 "我有 type-only 依赖，要装在 dependencies 还是 devDependencies"

**装在 dependencies**。type-only 指的是 `import type {} from '@deepseek-ai/dsh-client-ui-settings/client'`——这种 zero-cost 的引入必须**发出**在 npm 包里，没有 source map 就没有 ctx 扩展。

```
// 装在 dependencies 清单
dependencies:
  "@deepseek-ai/dsh-client-ui-settings": "*"
  "@deepseek-ai/dsh-client-locale": "*"
  "@deepseek-ai/dsh-client-connection": "*"
  "@deepseek-ai/dsh-client-ui-slots": "*"
  "@deepseek-ai/dsh-api-remotes": "*"

// 装在 devDependencies 清单
devDependencies:
  "react": "^18.2.0"
  "@types/react": "~18.3.1"
```

type-only 的 client 包没货（运行时不需要），但 require resolve 还需要它们在 deps 列表里（pnpm 决定解算路径时需要拿到它的 package.json）。

### 6.5 "为什么我的 dsh 启动慢 / 报 module not found"

最常见原因：

- **profile 缺依赖**：跑 `dsh plugin --profile web install` 让 pnpm 拉齐
- **bundle 清单不一致**：`dsh.profile.bundles` 列表里有包名，但 `dependencies` 里没有；或反过来。`dsh plugin` 子命令会自动 reconcile，但手改 manifest 可能破坏
- **peer 错配**：你的 bundle 声明 `@deepseek-ai/dsh-mcp-client@*`，但当前 dsh 安装实际上装的是 `^0.1.0-rc.5`，rc 跨级不兼容。**把你的 peer 钉到 dsh 当前用的 rc**——通常 `dsh plugin --profile web add` 后看 `~/.dsh/profiles/web/node_modules/<dsh-rc-N>/package.json` 里的版本

---

## 7. 调试工具

| 工具 | 用途 |
|---|---|
| `dsh --profile web --dump-config` | 打印装配出来的完整 entry 列表（看你的 row 在不在、id 对不对） |
| `dsh --profile web --dump-default-config` | 打印不带任何用户 patch 的基础列表 |
| `dsh web --port 0` | 启动并打印随机端口（用于跑脚本） |
| `curl http://localhost:3000/api/mcp/list` | 测你的 host 端 route |
| `curl http://localhost:3000/plugins/<id>/client.js` | 测 client bundle 路由 |
| browser DevTools Console | `JSON.parse(document.querySelector('script:not([src])').textContent.replace('window.__DSH_BOOT__ = ', ''))` 看 client-modules 装载的 entries |
| browser DevTools → Network | 看 `client.js` 有没有被拉到，HTTP 码 200 |
| `@deepseek-ai/dsh-mcp-client` 编译输出 | 看 `lib/client/index.js` 是不是 bundle 后的产物（带 `__DSH_BOOT__` 驱动） |

---

## 8. 不要再走弯路的"决策表"

| 你的需求 | 写 host | 写 client | 改哪个文件 |
|---|---|---|---|
| 暴露 HTTP API 给前端 | ✅ | ❌ | `src/index.ts` + `src/webserver-routes.ts` |
| 设置弹窗多一个 tab | ❌ | ✅ | `src/client/index.ts` + `src/client/Mcp*.tsx` |
| 注册一个 LLM 工具 | ✅ | ❌ | `src/index.ts` + 读 `ctx.tools` |
| 启动后台进程 | ✅ | ❌ | `src/index.ts` + `ctx.effect` |
| 多语言 UI | ❌ | ✅ | `src/client/locales.ts` |
| 持久化配置 | ✅ | ❌ | `src/patch-store.ts` |
| 把 UI 状态存到 Host | ✅ | ✅ | ctx.connection 或 Typert 远端 |

**明示规则**：所有 `ctx.*` 系统调用都在 `apply(ctx)` 闭包里。组件（tsx）不能 `import { ctx }`——它们通过 props 拿到 `useSnapshot` / `store` / `t`。
