# Node 配置规格

## 核心类型定义

```typescript
// src/types.ts — host/client 共享

/** LLM 配置槽 */
interface LLMSlot {
  provider: string    // 映射到 ctx.llm 已注册的 provider，如 'deepseek-official'
  model: string       // 如 'deepseek-v4', 'deepseek-v4-flash'
  temperature?: number
  maxTokens?: number
}

/** Node 定义（持久化单元） */
interface NodeConfig {
  id: string                    // UUID，创建时生成
  name: string                  // tool 名称，如 'code_reviewer'（需符合 tool 命名规范）
  description: string           // tool 描述，agent 会看到用于决定是否调用
  systemPrompt: string          // Node 执行时的 system prompt
  llm?: LLMSlot                 // 不填则使用当前 agent 的默认 LLM
  tools?: string[]              // 允许使用的 tool 名列表（为空表示不使用工具）
  inputSchema: JSONSchema       // Node 作为 tool 时的参数 schema
  createdAt: string             // ISO 时间
  updatedAt?: string            // 最后修改时间
}

/** 持久化文件结构 */
interface NodeConfigFile {
  version: 1
  nodes: Record<string, NodeConfig>
  equipped: string[]            // 当前装配的 node id 列表
}

/** JSON Schema 子集（用于 inputSchema） */
interface JSONSchema {
  type: 'object'
  properties: Record<string, {
    type: 'string' | 'number' | 'boolean' | 'array'
    description?: string
    enum?: string[]
    items?: { type: string }
    default?: unknown
  }>
  required?: string[]
}
```

## Node 命名规范

| 规则 | 说明 |
|---|---|
| 格式 | `[a-z][a-z0-9_]*`，全小写 + 下划线 |
| 长度 | 3~50 字符 |
| 禁止前缀 | `mcp__`（MCP 工具保留）、`run_code`（DSH 保留） |
| 唯一性 | 不能与已有 builtin/MCP tool 同名 |

命名在创建时校验，冲突时拒绝并提示。

## inputSchema 设计指南

inputSchema 定义了 Node 作为 tool 时接受的参数。主 agent 在调用时需要按此 schema 传参。

### 简单示例：翻译助手

```json
{
  "type": "object",
  "properties": {
    "text": { "type": "string", "description": "要翻译的文本" },
    "target_lang": { "type": "string", "description": "目标语言", "enum": ["en", "zh", "ja"] }
  },
  "required": ["text", "target_lang"]
}
```

### 复杂示例：代码审查

```json
{
  "type": "object",
  "properties": {
    "file_path": { "type": "string", "description": "要审查的文件路径" },
    "focus": { "type": "string", "description": "审查重点（如：错误处理、性能、安全）" },
    "severity": { "type": "string", "description": "报告详细程度", "enum": ["brief", "detailed"] }
  },
  "required": ["file_path"]
}
```

### 无参数示例：日报生成

```json
{
  "type": "object",
  "properties": {
    "date": { "type": "string", "description": "日期，默认今天" }
  }
}
```

## LLMSlot 配置说明

| 字段 | 必填 | 默认值 | 说明 |
|---|---|---|---|
| `provider` | 是（若填 llm） | — | 已注册的 LLM provider 名 |
| `model` | 是（若填 llm） | — | 该 provider 下的模型名 |
| `temperature` | 否 | provider 默认 | 0~2 |
| `maxTokens` | 否 | provider 默认 | 最大输出 token |

**整个 `llm` 字段可选**：不填时 Node 执行使用当前 agent 的默认 LLM 配置（通过 `ctx.agentDefaultModel` 获取）。

## tools 字段说明

Node 的 `tools` 字段控制 Node 执行时能使用哪些工具。

| 值 | 含义 |
|---|---|
| `undefined` / `[]` | Node 不使用任何工具（纯 LLM 对话） |
| `["read_file", "grep"]` | 只能使用指定工具 |
| 包含 `mcp__xxx__yyy` | 可使用已连接的 MCP 工具 |

**Phase 1 限制**：Node 内的 tool use 仅在子 agent 模式下可用（Phase 2）。Phase 1 的 direct 模式下，`tools` 字段作为元数据保留但不执行 tool call。

## Node 生命周期

```
创建 → 持久化 → (可选)编辑 → 装配 → 使用 → 卸载 → (可选)删除
                                ↑                    │
                                └────────────────────┘
                                   可反复装配/卸载
```

| 状态 | 存储位置 | 说明 |
|---|---|---|
| 已定义 | `data/node-config.json` | 仅存储，不影响对话 |
| 已装配 | config.equipped + agent scope | 注册为当前 agent 的 tool |
| 执行中 | 内存（executor） | tool execute 被调用 |

## 校验规则

### 创建/更新时

1. `name` 符合命名规范
2. `name` 不与已有 tool（builtin + MCP + 其他 node）冲突
3. `description` 非空且 ≤ 200 字符
4. `systemPrompt` 非空
5. `inputSchema.type` 必须是 `'object'`
6. `llm`（若填）的 provider 必须是已注册的
7. `tools`（若填）中每个名称必须是已知 tool

### 装配时

1. nodeId 必须存在于 nodes 中
2. 不能重复装配同一 node
3. 当前 agent 必须存在（未就绪时拒绝）
