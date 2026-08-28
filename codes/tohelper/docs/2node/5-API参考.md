# API 参考

## 路由总览

### Node 管理（CRUD）

| Method | Path | 功能 |
|---|---|---|
| GET | `/api/tohelper/node/list` | 列出所有 Node 定义 |
| POST | `/api/tohelper/node/create` | 创建 Node |
| POST | `/api/tohelper/node/update` | 更新 Node |
| POST | `/api/tohelper/node/delete` | 删除 Node |

### Node 装配（由 Tool 面板调用）

| Method | Path | 功能 |
|---|---|---|
| POST | `/api/tohelper/node/equip` | 装配 Node 到当前 agent |
| POST | `/api/tohelper/node/unequip` | 卸载 Node |

### 统一工具列表（Tool 面板使用）

| Method | Path | 功能 |
|---|---|---|
| GET | `/api/tohelper/tools` | 列出所有工具（builtin + MCP + **node**）+ 装配状态 |
| GET | `/api/tohelper/skills` | 列出技能 |

### MCP 管理

| Method | Path | 功能 |
|---|---|---|
| GET | `/api/tohelper/mcp/servers` | MCP server 列表 |
| POST | `/api/tohelper/mcp/add` | 添加 MCP server |
| POST | `/api/tohelper/mcp/add-batch` | 批量添加 |
| POST | `/api/tohelper/mcp/remove` | 移除 MCP server |
| POST | `/api/tohelper/mcp/deny` | 设置 denied tools（builtin/MCP） |
| POST | `/api/tohelper/mcp/reset` | 清除 deny |

### 状态

| Method | Path | 功能 |
|---|---|---|
| GET | `/api/tohelper/status` | 插件状态 |

---

## Node API 详细定义

### GET /api/tohelper/node/list

列出所有已定义的 Node 及其装配状态。

**Response:**

```json
{
  "ok": true,
  "nodes": [
    {
      "id": "uuid-1",
      "name": "code_reviewer",
      "description": "代码审查专家",
      "systemPrompt": "你是...",
      "llm": { "provider": "deepseek-official", "model": "deepseek-v4" },
      "tools": ["read_file", "grep"],
      "inputSchema": { "type": "object", "properties": { ... }, "required": [...] },
      "createdAt": "2026-08-28T06:00:00.000Z"
    }
  ],
  "equipped": ["uuid-1"]
}
```

---

### POST /api/tohelper/node/create

创建新 Node。

**Request:**

```json
{
  "name": "code_reviewer",
  "description": "代码审查专家，给出详细修改建议",
  "systemPrompt": "你是一位资深代码审查工程师，请仔细审查代码并给出改进建议。",
  "llm": { "provider": "deepseek-official", "model": "deepseek-v4" },
  "tools": ["read_file", "grep"],
  "inputSchema": {
    "type": "object",
    "properties": {
      "file_path": { "type": "string", "description": "要审查的文件路径" }
    },
    "required": ["file_path"]
  }
}
```

**字段说明：**

| 字段 | 必填 | 说明 |
|---|---|---|
| `name` | 是 | tool 名称，需符合 `[a-z][a-z0-9_]*`，3~50 字符 |
| `description` | 是 | tool 描述，≤200 字符 |
| `systemPrompt` | 是 | Node 执行时的 system prompt |
| `llm` | 否 | LLM 配置；不填使用默认 |
| `llm.provider` | 是（若填 llm） | 已注册 provider 名 |
| `llm.model` | 是（若填 llm） | 模型名 |
| `llm.temperature` | 否 | 温度 |
| `llm.maxTokens` | 否 | 最大输出 token |
| `tools` | 否 | 允许使用的工具名列表 |
| `inputSchema` | 是 | JSON Schema，定义 tool 参数 |

**Success Response:**

```json
{
  "ok": true,
  "node": { "id": "generated-uuid", "name": "code_reviewer", ... }
}
```

**Error Response:**

```json
{
  "ok": false,
  "error": "name conflicts with existing tool: code_reviewer"
}
```

---

### POST /api/tohelper/node/update

更新已有 Node。已装配的 Node 更新后需要重新装配才生效。

**Request:**

```json
{
  "id": "uuid-1",
  "name": "code_reviewer",
  "description": "更新后的描述",
  "systemPrompt": "更新后的 prompt",
  "llm": { "provider": "deepseek-official", "model": "deepseek-v4-flash" },
  "tools": ["read_file"],
  "inputSchema": { ... }
}
```

**Response:**

```json
{ "ok": true }
```

若 Node 当前已装配，响应中额外返回提示：

```json
{ "ok": true, "warning": "node is currently equipped, re-equip to apply changes" }
```

---

### POST /api/tohelper/node/delete

删除 Node。若已装配则先自动卸载。

**Request:**

```json
{ "id": "uuid-1" }
```

**Response:**

```json
{ "ok": true }
```

---

### POST /api/tohelper/node/equip

装配 Node 到当前 agent（注册为 tool）。

**Request:**

```json
{ "id": "uuid-1" }
```

**Success Response:**

```json
{ "ok": true, "toolName": "code_reviewer" }
```

**Error Response:**

```json
{ "ok": false, "error": "no active agent" }
{ "ok": false, "error": "node not found" }
{ "ok": false, "error": "already equipped" }
{ "ok": false, "error": "tool name conflicts with existing: code_reviewer" }
```

---

### POST /api/tohelper/node/unequip

卸载 Node（移除 tool 注册）。

**Request:**

```json
{ "id": "uuid-1" }
```

**Response:**

```json
{ "ok": true }
```

---

## GET /api/tohelper/tools 改造

Tool 面板需要一个统一的接口获取所有类型的 tool 及其装配状态。改造现有 `/tools` 接口：

**Response:**

```json
{
  "ok": true,
  "agentId": "session-123",
  "builtin": [
    { "name": "read_file", "description": "Read a file", "source": "builtin", "denied": false },
    { "name": "grep", "description": "Search files", "source": "builtin", "denied": true }
  ],
  "mcp": [
    { "name": "mcp__gh__search", "description": "Search repos", "source": "mcp", "denied": false }
  ],
  "node": [
    {
      "name": "code_reviewer",
      "description": "代码审查专家",
      "source": "node",
      "nodeId": "uuid-1",
      "equipped": true
    },
    {
      "name": "translator",
      "description": "翻译助手",
      "source": "node",
      "nodeId": "uuid-2",
      "equipped": false
    }
  ]
}
```

**变更说明：**
- 新增 `node` 数组：列出所有已定义的 Node（无论是否装配）
- 每个 node 条目包含 `equipped: boolean` 标识当前装配状态
- 前端用 `source` 字段区分分组展示
- builtin/mcp 的 `denied` 字段含义不变（denied = 未装配）

**装配状态映射：**

| 类型 | "已装配" 条件 | "未装配" 条件 |
|---|---|---|
| builtin | `denied: false` | `denied: true` |
| mcp | `denied: false` | `denied: true` |
| node | `equipped: true` | `equipped: false` |

---

## 错误码约定

| HTTP Status | 含义 |
|---|---|
| 200 | 操作成功 |
| 400 | 请求参数错误（缺字段、格式不对、名称冲突） |
| 404 | Node 不存在 |
| 500 | 内部错误（LLM 调用失败等） |

所有响应体都包含 `ok: boolean`，失败时包含 `error: string`。
