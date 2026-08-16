# 问题 2：保存什么 + 保存到哪 + agent 怎么用

> 现象：用户点 "保存"，UI 没反应 / 列表没变化 / 重启 dsh 后也没看到新增的 MCP server。
> 本文先回答三个设计问题——保存什么 / 保存到哪 / agent 怎么发现——然后给完整推荐方案 + 落地清单。
> 本文**只做分析和方案**，不修改代码；确认方案后再切到 Agent 模式落地。

---

## 1. 三个问题的简短回答

| 问题 | 答案 |
|---|---|
| **保存什么？** | 保存 **server 配置**（transport + command/url + env/headers + serverName）。**不**保存 tool 列表——tool 列表是 server 启动后**自己声明**的，每次连接都不一样，不应该存到 patch 文件。 |
| **保存到哪？** | 写到 `~/.dsh/profiles/<active-profile>/cordis.patch.yml`，作为一条 mcp-client 的 cordis entry。 |
| **agent 怎么用？** | cordis Loader 监听到 patch 文件变化 → 自动新建 mcp-client fiber → mcp-client 调 MCP server → 拿到 tools 后注册到 `ctx.tools` → dsh agent prompt 已经订阅 `ctx.tools`，**自动**感知到新的 `mcp__<server>__<tool>`。 |

下面详细解释为什么是这个答案、错在哪里、落地步骤是什么。

---

## 2. 为什么"只保存 server 配置"是正确的

### 2.1 tool 列表是动态数据

MCP server 可能在以下场景**改变**它的工具集：

- 服务端版本升级加了 tool
- 服务端动态注册 tool（stdio server 启动后才 build tool 列表）
- 服务端根据用户权限裁剪 tool
- 服务端 schema 漂移（参数改了）

把这些**写死**到 patch 文件意味着每次 server 端变化都得人工编辑——错误且脆弱。正确做法：**server 配置写一次，启动时每次重新问 server**。

### 2.2 dsh 的"配置驱动 HMR"模型就是为了这个

dsh 自己设计的：

```
patch 文件 (人类可读、YAML、慢节奏)
   ↓ (fsnotify → HMR)
Loader (diff entries → spawn/dispose fibers)
   ↓
Plugin instances (短周期、长生命周期内的快速迭代)
   ↓
tools (运行时由 plugin 决定、每次 reconcile 都重新注册)
```

把 tool 列表塞进 patch 文件是**破坏了这个分层**——你让慢节奏的配置层承担快节奏的运行时数据。

### 2.3 我们当前 patch-store 的写入格式就是 server 配置

看 `patch-store.ts:128`：

```ts
const newRow: PatchRow = { id: `mcp-${config.serverName}`, name: MCP_CLIENT_NAME, config }
```

`config` 是 `Config = StdioConfig | StreamableHttpConfig`：

```ts
{ transport, serverName, command, args, env, cwd, url, headers, toolCallTimeoutMs, failOnStartupError }
```

**没有 `tools` 字段**。这是对的——你的直觉"保存整个 mcp 还是只保存 tool"问的其实是"patch 文件里要不要写 tools"——**不要**。

### 2.4 反例：如果你把 tools 写进 patch 会发生什么

```yaml
- insert:
    - id: mcp-github
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: streamable-http
        url: ...
        tools:                              # ← 错
          - name: create_issue
            description: 创建 GitHub Issue
```

后果：
- 服务端加了 `create_pr` → 你得手动改 YAML
- 服务端删了 `create_issue` → 你手动改之前，每次启动 dsh 都看到 `create_issue`，但 agent 调它会失败
- patch 文件变得巨大（GitHub MCP 几十个 tool 全列出来）
- `applyEntryPatches` 在并发写入时容易冲突（patch 是"声明意图"，不该带运行时数据）

所以**只存 server 配置**，**永远不存 tools**。

---

## 3. 保存到 cordis.patch.yml —— 为什么是这个文件

### 3.1 dsh 的双层 patch 模型

```
~/.dsh/cordis.patch.yml                          ← home 层（跨 profile 公用）
~/.dsh/profiles/<active-profile>/cordis.patch.yml  ← profile 层（每个 profile 自己的）
```

CLI 启动时 union 两层，watch 两层。**两层都会被监听**，HMR 都能触发。

### 3.2 应该写哪一层

| 层 | 用途 | 写 MCP 配置的合理性 |
|---|---|---|
| home 层 | 全局默认（如全局 theme / 全局 base 插件） | ❌ 不适合——MCP server 通常带环境特异性（github token 是某个用户的） |
| profile 层 | 当前 profile 的特定配置 | ✅ 适合——不同 profile 可挂不同 MCP（比如 dev profile 接 mock server，prod profile 接真服务） |

**结论**：写 **profile 层**，即 `~/.dsh/profiles/<DSH_PROFILE>/cordis.patch.yml`。这也是我们当前代码的实现路径（`patch-store.ts:46-47`）：

```ts
function patchPath(profileName: string | null): string {
  return profileName !== null && profileName.length > 0
    ? dshHomePath('profiles', profileName, 'cordis.patch.yml')
    : dshHomePath('cordis.patch.yml')
}
```

`DSH_PROFILE` 是当前 profile 名（`dsh web` 默认是 `web`，也可以 `dsh --profile foo web`）。

### 3.3 文件格式——为什么用 patch 而不是别的

我们写入的格式是 cordis 的 entry patch 格式：

```yaml
- insert:
    - id: mcp-<serverName>
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        transport: stdio
        serverName: foo
        command: npx
        args: [...]
        ...
```

**为什么不用 JSON / SQLite / 自己的格式**：

- cordis Loader **只**认识这种 patch 格式（schema 在 `cordis-plugin-include` 里）
- 人类可读、可 diff（Git 版本控制友好）
- 原子写（tmp + rename），HMR 安全
- 多 entry 共享一个文件（其他 plugin / 用户手动配置都共存）

代价：不能跑 SQL 查询，但 MCP 配置是"几十行 YAML" 量级，不需要。

### 3.4 必须 atomic 写的原因

`patch-store.ts:60-70`：

```ts
function writePatchLayers(p: string, layers: PatchOptions[]): void {
  const composed = applyEntryPatches([], layers, () => { /* silent */ })
  const text = yaml.dump(composed, { schema: entryListSchema, noRefs: true })
  mkdirSync(dirname(p), { recursive: true })
  const tmp = `${p}.tmp`
  writeFileSync(tmp, text, 'utf8')
  renameSync(tmp, p)            // ← atomic
}
```

为什么不 `writeFileSync` 直接覆盖：
- 写到一半进程被 kill → patch 文件半残 → dsh 启动时 yaml 解析失败 → 全 plugin 树加载失败
- `inotify` 看到的是中间状态，可能触发 HMR 误判

`tmp + rename` 在 POSIX 上是 atomic（rename 是 inode rename syscall）。这是必须的，**不要**改。

---

## 4. agent 怎么发现 + 怎么调用——这才是关键的链路

### 4.1 完整事件链

```
[1] 用户在 UI 点 "保存"
       ↓
[2] McpForm.onSubmit → store.add(config) → fetch POST /api/mcp/add
       ↓
[3] host /api/mcp/add → patch-store.add(config) → 原子写 patch 文件
       ↓
[4] fsnotify → cordis-plugin-hmr.fire('fileChanged')
       ↓
[5] hmr 注册回调 entry.update({ config: { patches: [新 patch] } })
       ↓
[6] cordis Loader diff：发现一个 entry 变了（id: mcp-<serverName>）
       ↓
[7] 旧 entry dispose（如果存在），新 entry 创建 fiber
       ↓
[8] fiber 调 apply(ctx, config) —— 这里是 @deepseek-ai/dsh-mcp-client 包的 apply
       ↓
[9] mcp-client.startConnection(config)
       ├─ stdio: child_process.spawn(command, args, env) → 在 stdin/stdout 上跑 JSON-RPC
       └─ streamable-http: 打开 HTTPS 连接 → 跑 SSE + POST
       ↓
[10] MCP 协议握手：
       ├─ initialize (客户端/服务端交换 capabilities)
       └─ notifications/initialized
       ↓
[11] mcp-client.listTools() → 拿到 tools 列表
       ↓
[12] 对每个 tool：
       ctx.tools.register({
         name: 'mcp__<serverName>__<rawName>',
         description: ...,
         parameters: <JSON Schema>,
         execute: async (args) => { return await mcpClient.callTool(rawName, args) }
       })
       ↓
[13] dsh-internal: tools 变化事件 → 通过 sse-bus 推到浏览器
       ↓
[14] 浏览器 McpSection 收到（或者 setTimeout 250ms 后主动 reload）→ state.tools 更新 → UI 显示
```

**关键观察**：agent **不需要**被显式通知"有一个新的 mcp server 加进来了"——它**永远**从 `ctx.tools` 拿 tool 列表。`ctx.tools` 是 dsh 自家的 tool registry，里面有什么 agent 就有什么。

### 4.2 agent prompt 的 tool 发现

dsh agent 的 prompt 是这么生成的（简化）：

```ts
const allTools = ctx.tools.layers.merge(undefined, layer => layer.tools)
const toolSpecs = allTools.map(([name, def]) => `## ${name}\n${def.description}\n${JSONSchemaToMarkdown(def.parameters)}`)
const prompt = systemPrompt + '\n\n## Available tools\n' + toolSpecs.join('\n')
```

也就是说 **每次 agent 接到一个新 turn 都会重新拿 `ctx.tools` 的全集**。所以只要 mcp-client 注册了 tool，agent 下一个 turn 立即看到。

### 4.3 agent 怎么调用

```ts
// 用户的 prompt：'我有哪些 repo'
// agent 推理 → 决定调 mcp__github__list_repos
// dsh agent runtime 在 tool name 上做 routing：
//   - 'mcp__github__list_repos' 命中
//   - 提取 serverName='github', rawName='list_repos'
//   - 找到对应的 mcp-client 实例（注册时绑定的）
//   - 调 mcpClient.callTool(rawName, args)
//   - 返回结果
```

agent **不需要**知道 MCP server 怎么连接、JSON-RPC schema 长什么样。**它只看到一个普通 tool**——跟 dsh-internal 的工具一样调用。

### 4.4 tool name 的命名约束

`mcp__<serverName>__<rawName>` 是 dsh 强制的格式：

- 必须以 `mcp__` 开头
- 跟一个 `<serverName>`（**这**就是你在表单里填的 `serverName` 字段，必须 1-32 位 `[A-Za-z0-9_-]`）
- 跟一个 `<rawName>`（服务端 tool 原始名）

这是为什么 `config-schema.ts:12` 限制 serverName 长度：tool name 总长度有限，serverName 留 32 给 rawName。

---

## 5. 当前"保存没变化"的真正根因

按可能性从高到低排：

### 5.1 按钮被 `submitDisabled` 锁住

**`McpForm.tsx:193`**：

```ts
const submitDisabled = busy || nameInvalid || serverName.length === 0 || missingTransportField
```

`missingTransportField` 看 165-166：

```ts
if (transport === 'stdio' && command.trim().length === 0) return    // 静默 return，不 alert
if (transport === 'streamable-http' && url.trim().length === 0) return
```

按钮 disabled 但没有视觉提示 → 用户以为点保存但其实根本没发请求。

**修复**：把字段空值标红 + 给 button 加 `aria-disabled` 提示。

### 5.2 浏览器缓存

新 build 的 `client.js` 还在缓存里，老 client 调旧的 store → 旧 store 不知道新的 API → 看起来"没变化"。

**修复**：`Ctrl+Shift+R` 硬刷。**长线方案**：tsdown 加 content hash 到 `client.js` 文件名，dsh 每次扫新版。

### 5.3 host 端 400 但 client 没显示错误

`mcp-store.ts:127-128`：

```ts
if (!r.ok) {
  this.store.update((s) => { s.error = r.error?.message ?? 'add failed' })
  return
}
```

错误写到 `state.error`，但 `McpSection.tsx:85` 只渲染在**顶部**的 intro 下方，表单展开时**看不见**。

**修复**：McpForm 自己展示 `state.error`（通过 inject 的 store 拿），或者改 fetch 后立即在表单内显示。

### 5.4 patch 文件写了但 mcp-client 起不来

这是最阴的：patch 文件确实写了，HMR 也触发了，但 mcp-client 在 spawn child process 时**就挂了**：

- `command: 'npx'` 但 `npx` 不在 PATH
- `command: 'memorix'` 但没装
- streamable-http URL 拼错
- stdio 的 env 里缺 PATH
- ...

UI 上 `state.entries` **会增加一行**（因为 `state.entries` 是从 `listWithStatus(ctx)` 拼出来的，**`status` 字段会是 `'failed'`**），但右侧"展开工具 (0)"按钮看起来"没变化"——因为你看到的是"工具列表不变"，其实**状态变了**。

**修复**：
- UI 在每个 row 的 `StatusBadge` 旁边加更醒目的"失败原因"，**点击看完整 error log**
- host 端 `/api/mcp/status` 增加 `lastError` 字段，从 mcp-client 实例读
- 用户能直接 dsh 控制台 `mcp-client(<name>): ...` 找根因

### 5.5 Loader 没拾到新 row

极少见但可能：patch 文件被 atomic 写但 Loader 的 watch 因为 fsnotify 限制**丢了事件**。**修复**：手动 `touch ~/.dsh/profiles/web/cordis.patch.yml` 触发。

---

## 6. 推荐方案：分三阶段落地

### 阶段 1：让"保存"立即可见（用户痛点优先）

**目标**：保存后 UI 立即出现新行 + 状态清晰。

1. `McpForm.tsx`：把 `state.error` 透传到表单内（通过 inject prop）；transport 字段空值标红 + `aria-invalid`；button disabled 时显示原因 tooltip。
2. `McpSection.tsx`：保存成功立即 `store.load()`（去掉 250ms setTimeout），让用户看到新行立刻出现，状态变化后用 SSE 自然跟进。
3. `McpSection.tsx`：列表为空时也显示一个"提示"——告诉用户**这是新加的、可能还在连接中、状态徽标会变化**。
4. `McpSection.module.css`：失败状态徽标用更显眼的红色 + 抖动动画。
5. `webserver-routes.ts`：`/api/mcp/status` 增加 `lastError` 字段。

### 阶段 2：测试连接结果可视化（接 step2/1-测试连接不渲染.md 方案 A）

按那篇文档的方案 A 实施：McpRow 加"测试发现 N 个工具（临时）"折叠区。

### 阶段 3：跟 agent 的端到端打通（验证"我能不能调用"）

1. 在 dsh 主页（chat）输入："我有哪些 MCP 工具 / 列出当前可用的 tool"
   - 期望 agent 自己回答"我有 mcp__github__list_repos, mcp__github__create_issue, ..."
2. 调一个简单 tool："列我 github 上的 5 个 repo"
3. 在 dsh 终端日志看：`mcp-client(github): tool call list_repos → 200`

**这步确认 agent 已经能发现 + 调用 tool**——是设计闭环的最后一公里。

---

## 7. 完整落地清单（按阶段 1）

1. **修改** `src/client/McpForm.tsx`：
   - 加 `submitError?: string` prop
   - 表单顶部 `<div className={css.formError}>{submitError}</div>`
   - `submitDisabled` 同时计算并写到 `aria-disabled`
2. **修改** `src/client/McpSection.tsx`：
   - `state.error` 不再只渲染在顶部（已经在 86 行），**额外**通过 `submitError={state.error}` 传给 McpForm
   - 保存成功后 `setAdding(false); setEditing(null); setError(null)`——手动清错误
   - `store.add` 成功后**立即**调 `store.load()`（不要 setTimeout）
3. **修改** `src/client/McpSection.module.css`：
   - `.formError` —— 表单内错误条样式
   - `.statusBadgeFailed` 加 `@keyframes pulse` 动画
4. **修改** `src/webserver-routes.ts`：
   - `StatusEntry` 接口加 `lastError?: string`
   - `listWithStatus` 增加从 `ctx.loader.entries()` 里读 `lastError`
5. **修改** `src/client/McpSection.tsx`：McpRow 加 `lastError` prop，状态徽标旁显示感叹号图标 + tooltip
6. **修改** `src/client/locales.ts`：加 `formError`, `statusFailedHint` 等 locale key
7. **不改**：
   - `patch-store.ts` —— 写入逻辑正确
   - `test-connection.ts` —— host API 正确
   - `mcp-store.ts` 的 add/remove —— 逻辑正确，只去掉那个 250ms setTimeout

---

## 8. 验证步骤

1. 重新 build + pack + 重装 + 重启 dsh + **Ctrl+Shift+R 硬刷浏览器**
2. DevTools → Network → 监听 `mcp/add`
3. UI 上添加 server → **看 Network 请求真的发出**
4. 期望：
   - 表格立即多一行
   - 状态徽标短暂显示"loading"或"pending"（取决于 mcp-client 启动速度）
   - 2-5 秒内变"active"或"failed"
   - 失败时徽标红色 + 感叹号 tooltip 显示 lastError
5. 在主页 chat："列出所有可用的 MCP 工具"
   - 期望 agent 列出 `mcp__<server>__<tool>` 全集
6. 调一个 tool："fetch github mcp 提供的 list_repos"
   - 期望返回结果；终端日志 `mcp-client(github): tool call list_repos → 200`

---

## 9. 不要做的事

- **不要**写一个自己的配置文件（比如 `~/.dsh/mcp-settings.json`），绕过 patch 文件。这样 dsh Loader 看不到，agent 调不到。
- **不要**在 patch 文件里写 `tools: [...]`，会破坏分层。
- **不要**用 IPC 通道通知 dsh "agent 来调我这个 server"——agent **永远**从 `ctx.tools` 拿，你只需要确保 mcp-client 起来后 `ctx.tools.register` 跑过了。
- **不要**改 dsh-internal 的 tool registry schema——它是 cordis 服务的一部分，跨 plugin 共享。
- **不要**在 `cordis.patch.yml` 里写 mcp-client 的 `id` 跟 `@deepseek-ai/dsh-mcp-client` 的 `name` 之外的字段，Loader schema 不接受。

---

## 10. 总结一句话

> **保存 server 配置到 cordis.patch.yml，agent 通过 ctx.tools 自动发现 tool。** 你不需要在 patch 里写 tools 列表（那是运行时数据），不需要给 agent 发通知（它每 turn 自己扫 ctx.tools）。当前"保存没反应"的最大嫌疑是 (a) 按钮 disabled 没视觉提示、(b) 浏览器缓存、(c) patch 写了但 mcp-client 起不来且 UI 不显示失败原因。