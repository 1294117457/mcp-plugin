# Task 与 Node 架构重设计

## 问题总结

1. **Task 不能独立使用** — 必须包在 Node 里，但大部分场景只需要一个 Task
2. **Node 的 direct 模式多余** — 和单个 Task 功能重复
3. **Pipeline 不是真正的顺序** — 当前每个 Task 收到相同的原始输入，不是链式传递
4. **Task 和 Node 职责重叠** — 两层都有 LLM + 工具调用能力，边界模糊
5. **旧类型残留过多** — `LegacyTaskConfig`、`TaskTypeConfig`、`type` 字段等未使用

## 新架构

### 核心定义

```
Task = 任务单元（可独立装配为 DSH tool）
Node = 多任务编排（pipeline / loop，也可装配为 DSH tool）
```

Task 和 Node 都不是 Agent。它们是被 DSH Agent 调用的工具：

```
用户 ←→ DSH Agent（对话） → 调用 tool → Task 或 Node 执行 → 返回结果
```

### 复用 DSH 已有能力

不需要重新实现 tool calling，全部基于 DSH 的两个核心 API：

| 能力 | DSH API | 说明 |
|------|---------|------|
| LLM 调用 | `ctx.llm.prepareCall()` + `prepared.stream()` | 自动处理 adapter 选择、schema 格式转换、流式传输 |
| 工具 schema | `ctx.tools.schemas(agent)` | 获取所有已注册工具（内置 + MCP）的 schema |
| 工具执行 | `ctx.tools.execute({ name, arguments })` | 执行任意已注册工具 |

自己实现的只有：
- **mini agent loop**（约 30 行）：LLM 调用 → tool-call → 执行工具 → 结果喂回 LLM → 循环
- **Pipeline / Loop 编排逻辑**

## Task 设计

Task 是面向普通用户的"输入 → LLM + 工具 → 输出"处理单元。

```typescript
interface TaskConfig {
  id: string
  name: string
  description: string

  taskPrompt: string        // 告诉 LLM：任务是什么、输入格式、输出格式
  llm: LLMSlot              // 使用哪个模型
  tools: string[]            // 可调用的工具列表

  inputSchema: JSONSchema    // 作为 DSH tool 时的输入定义
  outputSchema: JSONSchema   // 作为 DSH tool 时的输出定义

  createdAt: string
  updatedAt?: string
}
```

**执行流程：**

```
用户输入 "查附近瑞幸门店"
  → LLM 读 taskPrompt，理解任务目标
  → LLM 决定调用 queryShopList 工具（通过 ctx.tools.execute）
  → 工具返回原始 JSON（门店列表）
  → LLM 根据 taskPrompt 中的输出格式要求，整理成可读结果
  → 返回
```

**用户配置步骤：**

1. 起个名字和描述
2. 选一个或多个工具（来自 MCP 或内置）
3. 选一个模型
4. 写一段 taskPrompt 描述任务目标和期望的输出格式
5. 保存 → 可直接装配为 DSH tool 使用

## Node 设计

Node 只负责编排多个 Task，只有两种模式。

```typescript
interface NodeConfig {
  id: string
  name: string
  description: string

  mode: 'pipeline' | 'loop'
  nodePrompt: string        // pipeline: 最终汇总指令 / loop: 编排目标和完成条件
  llm: LLMSlot              // pipeline: 汇总用 / loop: 编排器用
  tasks: string[]            // Task ID 引用列表

  inputSchema: JSONSchema
  outputSchema: JSONSchema

  createdAt: string
  updatedAt?: string
}
```

不再有 direct 模式 — 单步骤直接用 Task。

## 执行模式

### Pipeline（顺序链式）

Tasks 按顺序执行，前一个的输出作为下一个的输入。

```
用户输入
  → Task 1 (输入=用户输入)  → 输出 A
  → Task 2 (输入=输出 A)    → 输出 B
  → Task 3 (输入=输出 B)    → 输出 C
  → [可选] Node LLM 汇总    → 最终结果
```

适用场景：流水线处理，如"查询数据 → 清洗 → 格式化"。

### Loop（循环编排）

Node LLM 作为编排器，动态选择 Task 执行，循环直到完成。

```
用户输入
  → Node LLM 看所有可用 Task，决定先执行哪个
  → 执行 Task X → 返回结果
  → Node LLM 评估：完成了吗？
    → 没完成 → 选下一个 Task（或重复某个 Task）
    → 完成了 → 输出最终结果
```

适用场景：复杂任务，需要根据中间结果动态决定下一步。

## 配置文件

从单一 `node-config.json` 改为统一存储 Task 和 Node：

```json
{
  "version": 2,
  "tasks": {
    "task-1": {
      "name": "查询瑞幸门店",
      "description": "查询附近瑞幸咖啡门店",
      "taskPrompt": "你是门店查询助手。请调用 queryShopList 工具获取门店列表，然后整理成「店名 - 地址」的格式返回。",
      "llm": { "provider": "deepseek-official", "model": "deepseek-chat" },
      "tools": ["mcp__my-coffee__queryShopList"],
      "inputSchema": { "type": "object", "properties": { "input": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "result": { "type": "string" } } }
    },
    "task-2": {
      "name": "查询麦当劳优惠券",
      "description": "查询当前可领取的麦当劳优惠券",
      "taskPrompt": "你是优惠券查询助手。请调用 available-coupons 工具获取优惠券列表，然后整理成「券名 - 状态」的格式返回。",
      "llm": { "provider": "deepseek-official", "model": "deepseek-chat" },
      "tools": ["mcp__mcd-mcp__available-coupons"],
      "inputSchema": { "type": "object", "properties": { "input": { "type": "string" } } },
      "outputSchema": { "type": "object", "properties": { "result": { "type": "string" } } }
    }
  },
  "nodes": {
    "node-1": {
      "name": "餐饮信息汇总",
      "description": "查询瑞幸门店和麦当劳优惠券并汇总",
      "mode": "pipeline",
      "nodePrompt": "请将各步骤查询到的门店和优惠券信息合并，以友好的方式呈现给用户。",
      "llm": { "provider": "deepseek-official", "model": "deepseek-chat" },
      "tasks": ["task-1", "task-2"]
    }
  },
  "equipped": ["task-1", "node-1"]
}
```

`equipped` 列表中 Task 和 Node 都可以出现。

## 类型定义

### 删除

- `LegacyTaskConfig`、`LegacyNodeConfig`
- `TaskTypeConfig`、`LLMCallTaskConfig`、`ToolCallTaskConfig`、`TransformTaskConfig`、`ConditionalTaskConfig`
- `InputMapping`、`OutputMapping`
- `TaskConfig.type`、`TaskConfig.config`
- `NodeConfig.executionMode`、`NodeConfig.systemPrompt`、`NodeConfig.tools`
- `ExecutionMode` 中的 `'direct'`

### 保留/修改

```typescript
interface LLMSlot {
  provider: string
  model: string
  temperature?: number
  maxTokens?: number
}

interface TaskConfig {
  id: string
  name: string
  description: string
  taskPrompt: string
  llm: LLMSlot              // 必填
  tools: string[]
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

type NodeMode = 'pipeline' | 'loop'

interface NodeConfig {
  id: string
  name: string
  description: string
  mode: NodeMode
  nodePrompt: string
  llm: LLMSlot
  tasks: string[]            // Task ID 引用
  inputSchema: Record<string, unknown>
  outputSchema: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

interface ConfigFile {
  version: 2
  tasks: Record<string, TaskConfig>
  nodes: Record<string, NodeConfig>
  equipped: string[]          // Task ID 和 Node ID 混合
}
```

## 装配体系

Task 和 Node 都可以独立装配为 DSH tool：

```
equipTask(taskId) → ctx.tools.register({ name, parameters, output, execute: runTaskLoop })
equipNode(nodeId) → ctx.tools.register({ name, parameters, output, execute: runPipeline/runLoop })
```

## API 路由

| 路由 | 说明 |
|------|------|
| `GET /api/tohelper/tasks` | Task 列表 |
| `POST /api/tohelper/tasks` | 创建 Task |
| `PUT /api/tohelper/tasks/:id` | 更新 Task |
| `DELETE /api/tohelper/tasks/:id` | 删除 Task |
| `POST /api/tohelper/tasks/:id/equip` | 装配 Task |
| `POST /api/tohelper/tasks/:id/unequip` | 卸载 Task |
| `GET /api/tohelper/nodes` | Node 列表 |
| `POST /api/tohelper/nodes` | 创建 Node |
| `PUT /api/tohelper/nodes/:id` | 更新 Node |
| `DELETE /api/tohelper/nodes/:id` | 删除 Node |
| `POST /api/tohelper/nodes/:id/equip` | 装配 Node |
| `POST /api/tohelper/nodes/:id/unequip` | 卸载 Node |

## Client 变更

### 导航结构

```
悬浮按钮
  ├── Tool（MCP 工具管理 + 统一装配视图）
  ├── Task（Task 管理面板）
  └── Node（Node 编排面板）
```

### Task 管理面板

- Task 列表：所有已定义的 Task，支持创建/编辑/删除
- Task 编辑器：name、description、taskPrompt、LLM 选择、工具多选、inputSchema、outputSchema
- 装配按钮：直接将 Task 装配为 DSH tool

### Node 编排面板

- Node 列表：所有已定义的 Node
- Node 编辑器：name、description、mode（pipeline/loop）、nodePrompt、LLM、从 Task 库选择 Tasks
- 画布视图：可视化 Task 执行顺序
- 装配按钮：将 Node 装配为 DSH tool

### Tool 面板

统一显示所有已装配和可装配的 tool：
- 内置工具
- MCP 工具
- Task（标记来源）
- Node（标记来源）

## 实施步骤

### 阶段 1：类型和数据

1. 重写 `types.ts` — 只保留新的 `TaskConfig`、`NodeConfig`、`ConfigFile`
2. 新建 `data/config.json`（version 2 格式），删除旧 `node-config.json`
3. 更新 config 读写逻辑

### 阶段 2：Host 执行器和装配

1. 提取 `host/task/executor.ts` — Task 执行器（从现有 `runTaskLoop` 演变）
2. 重写 `host/node/executor.ts` — 只保留 pipeline 和 loop
3. 实现 `host/task/index.ts` — Task CRUD + 装配逻辑
4. 更新 `host/node/index.ts` — Node 通过 Task ID 加载执行
5. 新增 Task 和 Node 的 API 路由

### 阶段 3：Client UI

1. 新增 Task 管理面板（TaskPanel + TaskEditor + TaskList）
2. 更新 Node 编辑器（从 Task 库选择 Task，不再内联创建）
3. 更新 Tool 面板（统一显示 Task 和 Node）
4. 更新悬浮菜单（新增 Task 入口）
