# API 参考：tohelper 使用的 harness 扩展点

本文档列出 Phase 1 中 tohelper 实际调用的 harness API，附使用姿势和注意事项。

---

## ctx.commands — 命令注册服务

**来源**: `@deepseek-ai/dsh-commands`

### register(definition)

注册一个用户命令。命令只在 UI 层面可见（如 Web 对话框的 `/` 菜单），不进入模型历史。

```ts
const dispose = ctx.commands.register({
  name: 'equip',                          // 命令名，不含 /
  description: 'Equip tools for this session',
  input: { hint: '<tool-names>' },         // 可选，输入提示
  recordInput: true,                       // 是否在 session log 记录输入
  handler: async (invocation) => {
    // invocation.agent  — 当前 Agent 实例
    // invocation.rawInput — 用户输入的参数文本（不含命令名）
    // invocation.signal — AbortSignal
    return { kind: 'success', text: '...' }
    // 或 { kind: 'error', text: '...' }
  },
})
```

**注意事项**：
- `name` 必须匹配 `/^[a-z][a-z0-9_-]*$/`
- handler 返回值不会发送给模型，只展示给用户
- 如果需要让模型看到命令结果，需显式调用 `agent.inject()` 或 `agent.steer()`
- registration 是 effect，plugin dispose 时自动移除

---

## ctx.tools — 工具注册与发现服务

**来源**: `@deepseek-ai/dsh-tools` (ToolRuntime)

### schemas(scope?)

返回指定 scope 可见的全部工具 schema。

```ts
// 全局视图（不受任何 restrict 影响）
const allTools = ctx.tools.schemas()

// agent 可见视图（受 restrict 过滤）
const agentTools = ctx.tools.schemas(agent)
```

返回 `ToolSchema[]`，每个包含 `name`, `description`, `parameters` 等字段。

### restrict(restriction)

**必须在 scoped context 上调用**（`agent.ctx`），设置该 agent 的工具可见性过滤。

```ts
// 只允许这三个工具
const dispose = agent.ctx.tools.restrict({
  allow: ['read_file', 'write', 'grep']
})

// 之后要改变限制：先 dispose 旧的，再设新的
dispose()
const newDispose = agent.ctx.tools.restrict({
  allow: ['read_file', 'web_search']
})
```

**语义**：
- `allow`: 白名单模式，只有列出的工具可见
- `deny`: 黑名单模式，列出的工具不可见
- 两者同时存在时取交集
- 只过滤**继承**的全局/祖先工具，agent 自己 scope 注册的工具不受影响
- 调用返回 disposer，执行后移除该限制

### get(name, scope?)

获取单个工具的定义。

```ts
const def = ctx.tools.get('read_file')  // 全局查
const def2 = ctx.tools.get('read_file', agent)  // agent scope 查（受 restrict）
```

返回 `ToolDefinition | undefined`。

---

## ctx.on('tools/change', handler) — 工具集变化事件

当任何工具注册、注销、或 restrict 变化时触发。

```ts
ctx.on('tools/change', () => {
  // 重新读取工具列表、更新缓存等
})
```

**注意**：这是全局事件（unfiltered），任何 scope 的变化都会触发。

---

## agent.ctx — Agent 的 scoped context

每个 Agent 有自己的 Cordis context，通过它注册的 service 只对该 agent 可见。

```ts
// 在 command handler 中
handler: ({ agent }) => {
  // agent.ctx.tools.restrict(...)  ← 对该 agent 设限制
  // agent.ctx.tools.register(...)  ← 只对该 agent 注册工具
}
```

**生命周期**：agent.ctx 在 agent 销毁时自动 dispose 所有 effect。

---

## ctx.systemPrompt.context() — 动态运行时上下文（可选增强）

注册一段动态文本，每次 prompt 组装时计算，作为 runtime context 发送给模型。

```ts
ctx.systemPrompt.context({
  name: 'tohelper-status',
  order: 50,
  text: () => {
    // 返回 string 注入，返回 undefined 跳过
    const set = getEquipped(currentAgent)
    if (!set) return undefined
    return `Currently equipped tools: ${[...set].join(', ')}`
  },
})
```

**注意**：`text` 函数必须是纯函数（不能有副作用），每个 step 都会调用。

---

## ToolSchema 结构

`ctx.tools.schemas()` 返回的每个元素：

```ts
interface ToolSchema {
  name: string           // 工具名，如 'read_file' 或 'mcp__github__search'
  description: string    // 模型看到的描述
  parameters: object     // JSON Schema 形式的参数定义
}
```

### MCP 工具命名规则

MCP server 注册的工具名格式：`mcp__<serverName>__<rawToolName>`

示例：
- `mcp__github__search_repositories` → serverName=github, tool=search_repositories
- `mcp__filesystem__read_file` → serverName=filesystem, tool=read_file

可通过 `name.startsWith('mcp__')` 判断来源，通过 `name.split('__')` 解析。

---

## CommandInvocation 结构

命令 handler 接收的参数：

```ts
interface CommandInvocation {
  commandId: string       // 注册时的 name
  agent: Agent            // 当前 Agent 实例（含 agent.ctx）
  rawInput: string        // 用户输入的参数文本（不含 /command 部分）
  attachments: unknown[]  // 附件（图片等）
  signal: AbortSignal     // 取消信号
}
```

## CommandResult 结构

handler 的返回值：

```ts
type CommandResult =
  | { kind: 'success'; text?: string; sourceEventSeq?: number }
  | { kind: 'error'; text: string }
```

- `success` + `text`: 文本展示给用户（不发给模型）
- `error` + `text`: 错误提示
- `sourceEventSeq`: 关联的 session event 序号（Phase 1 不用）
