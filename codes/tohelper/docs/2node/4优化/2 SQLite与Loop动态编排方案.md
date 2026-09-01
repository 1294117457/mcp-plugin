# SQLite 持久化与 Loop 动态编排方案

> 适用项目：`tohelper`
>
> 文档范围：SQLite 持久化、配置迁移、运行历史、Loop 动态编排
>
> 文档状态：方案设计，暂不修改代码
>
> 更新时间：2026-08-31

## 1. 背景与目标

第一阶段解决配置统一、结构化执行结果和固定 Pipeline。本方案处理两个后续问题：

1. 是否将当前 JSON 配置改为 SQLite，以及如何迁移、查询和记录运行历史。
2. 如何让 Loop 支持受控的动态任务编排，并在失败、重试、重复执行和无法完成时返回准确结果。

本方案的基本判断是：

- SQLite 适合作为单机插件的主数据存储。
- JSON 仍适合作为导入、导出和备份格式。
- SQLite 只负责可靠存储，不负责决定 Node 是否触发。
- Loop 允许动态选择 Task，但必须在 Node 配置定义的边界内运行。
- 固定 Pipeline 和动态 Loop 是两种不同的执行语义，不能使用同一套隐式规则。

## 2. 为什么采用 SQLite

### 2.1 继续使用 JSON 的适用边界

JSON 文件适合：

- 配置对象数量少。
- 只有一个进程写入。
- 只需要整体加载和整体保存。
- 不需要执行历史。
- 不需要按引用关系查询。
- 不需要并发运行和运行状态更新。

当前项目已经开始超出这个边界。Node 与 Task 的关系、装配状态、运行记录、每一步的错误和重试都需要单独查询和更新。继续使用整体覆盖式 JSON 保存，会使以下操作越来越复杂：

- 查询引用某 Task 的所有 Node。
- 保存 Node 和 Node-Task 关系时保证一致性。
- 运行中实时更新某一步状态。
- 保留配置历史和运行历史。
- 多个请求同时修改配置或启动工作流。
- 防止 debounce 保存覆盖较新的修改。

### 2.2 SQLite 的适用边界

SQLite 适合当前插件，因为：

- 数据文件是单机本地文件，不需要独立数据库服务。
- 支持事务，可以同时保存 Node 和 Task 引用关系。
- 支持索引和条件查询。
- 支持运行记录、步骤记录和状态更新。
- 支持 WAL 模式，适合 UI 查询和 Host 写入并存。
- 便于导入、导出和备份。

SQLite 不能自动解决：

- MCP 服务连接失败。
- Agent 是否调用 Node。
- LLM 输出不符合协议。
- 多进程同时运行时的业务级锁。
- 敏感 Token 的安全存储。

## 3. 存储边界

### 3.1 SQLite 保存的内容

建议保存：

- Task 定义。
- Node 定义。
- Node 与 Task 的引用顺序和输入映射。
- Node 的触发策略和失败策略。
- 装配意图，即用户希望哪些 Task/Node 在 Agent 创建后自动注册。
- 工作流运行实例。
- 每个运行实例的步骤结果。
- 配置迁移和运行错误的结构化信息。

### 3.2 不直接保存到业务数据库的内容

以下内容建议继续由对应模块管理：

- 当前 Agent 对象和 disposer。
- 当前 Agent scope 下的临时 Tool 注册状态。
- MCP 连接对象。
- LLM stream 对象。
- AbortController 和运行时 Promise。
- UI 的画布 viewport、节点坐标和折叠状态，除非后续需要跨设备同步。

### 3.3 MCP 配置处理

当前 `tool-config.json` 中包含 MCP Server 配置，并且示例中直接保存了 Authorization Token。SQLite 迁移时有两种选择：

#### 方案 A：MCP 配置仍保留 `tool-config.json`

优点：改动小，MCP 模块边界清晰。

缺点：业务配置分散在两个存储中。

#### 方案 B：MCP Server 元数据进入 SQLite，密钥单独保存

建议的拆分：

```text
SQLite:
  server_name
  transport
  url
  command
  args_json
  auto_connect
  added_at

Secret storage:
  Authorization Token
  headers 中的敏感字段
  command 所需的敏感环境变量
```

推荐使用方案 B 作为长期方向，但它不是 Node/Task 迁移的前置条件。第一版 SQLite 可以只迁移 Task、Node 和运行记录，保留 `tool-config.json`，同时禁止在新代码中把敏感值打印到日志。

## 4. 数据库文件和初始化

### 4.1 文件位置

建议数据库位置为：

```text
DATA_DIR/tohelper.sqlite
```

不要将数据库放在 `dist` 或源码目录之外的临时目录中。`DATA_DIR` 应由 Host 统一计算，Node、Task、Tool 模块共用同一数据目录解析逻辑。

### 4.2 SQLite 初始化选项

初始化时建议设置：

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
PRAGMA synchronous = NORMAL;
```

说明：

- `WAL` 允许读取和写入更好地并行。
- `foreign_keys` 保证 Node-Task 引用不会产生孤儿关系。
- `busy_timeout` 避免短暂锁竞争立即失败。
- `synchronous = NORMAL` 在本地插件场景下通常可以平衡性能和安全性。

数据库初始化必须是幂等的，重复启动不会重复创建表或重复插入默认数据。

### 4.3 数据库版本

使用单独的 schema version 表：

```sql
CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

示例：

```text
key = 'schema_version'
value = '1'
```

每次 schema 升级都使用事务：

```text
BEGIN
  检查当前 schema_version
  执行当前版本到目标版本的迁移
  更新 schema_version
COMMIT
```

迁移失败必须回滚，不允许数据库处于半迁移状态。

## 5. 推荐数据模型

### 5.1 tasks

```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  task_prompt TEXT NOT NULL,
  llm_json TEXT NOT NULL,
  tools_json TEXT NOT NULL DEFAULT '[]',
  input_schema_json TEXT NOT NULL,
  output_schema_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

字段说明：

- `id` 保持应用层生成的 Task ID，便于兼容现有配置。
- `name` 作为 Tool 名称，因此必须唯一。
- `llm_json` 保存 provider、model、temperature 和 maxTokens。
- `tools_json` 保存 Task 允许调用的 Tool 名称数组。
- `status` 支持 `active`、`disabled`、`deleted`，避免删除历史引用后完全丢失对象。
- `version` 用于检测运行过程中配置是否被更新。

### 5.2 nodes

```sql
CREATE TABLE nodes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  mode TEXT NOT NULL CHECK (mode IN ('pipeline', 'loop')),
  node_prompt TEXT NOT NULL,
  llm_json TEXT NOT NULL,
  input_schema_json TEXT NOT NULL,
  output_schema_json TEXT NOT NULL,
  trigger_mode TEXT NOT NULL DEFAULT 'both'
    CHECK (trigger_mode IN ('agent', 'explicit', 'both')),
  failure_policy TEXT NOT NULL DEFAULT 'fail_fast'
    CHECK (failure_policy IN ('fail_fast', 'continue', 'retry_then_continue')),
  status TEXT NOT NULL DEFAULT 'active',
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

Node 的工作流定义和 Node 的运行实例必须分离。修改 Node 定义不应覆盖历史运行记录。

### 5.3 node_steps

不建议长期继续使用 `nodes.tasks` 单纯保存 Task ID 数组。推荐使用关系表：

```sql
CREATE TABLE node_steps (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  position INTEGER NOT NULL,
  input_mapping_json TEXT,
  required INTEGER NOT NULL DEFAULT 1,
  retry_count INTEGER NOT NULL DEFAULT 0,
  timeout_ms INTEGER,
  allow_repeat INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE RESTRICT,
  UNIQUE (node_id, position),
  UNIQUE (node_id, id)
);
```

索引：

```sql
CREATE INDEX idx_node_steps_node_position
  ON node_steps(node_id, position);

CREATE INDEX idx_node_steps_task
  ON node_steps(task_id);
```

字段说明：

- `position` 支持固定 Pipeline 顺序。
- `input_mapping_json` 支持原始输入、前一步输出或指定 Task 输出。
- `required` 决定失败是否使整个工作流失败。
- `retry_count` 控制当前步骤的最大重试次数。
- `timeout_ms` 覆盖全局默认超时。
- `allow_repeat` 只影响 Loop，不允许 Pipeline 隐式重复执行。

### 5.4 equipped_entities

当前使用 `equipped: string[]` 混合保存 Task ID 和 Node ID。SQLite 中建议明确类型：

```sql
CREATE TABLE equipped_entities (
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'node')),
  entity_id TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (entity_type, entity_id)
);
```

这样不需要依赖 `task-` 和 `node-` 前缀判断类型。JSON 导出时仍可兼容原来的混合 ID 数组。

### 5.5 workflow_runs

```sql
CREATE TABLE workflow_runs (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL,
  node_version INTEGER NOT NULL,
  trigger_source TEXT NOT NULL
    CHECK (trigger_source IN ('agent', 'command', 'ui', 'api', 'system')),
  status TEXT NOT NULL
    CHECK (status IN ('queued', 'running', 'success', 'partial_failure', 'failed', 'timeout', 'cancelled')),
  input_json TEXT,
  output_json TEXT,
  error_json TEXT,
  started_at TEXT,
  finished_at TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (node_id) REFERENCES nodes(id) ON DELETE RESTRICT
);
```

### 5.6 workflow_steps

```sql
CREATE TABLE workflow_steps (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_version INTEGER NOT NULL,
  sequence INTEGER NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('pending', 'running', 'success', 'failed', 'timeout', 'cancelled', 'skipped')),
  attempt INTEGER NOT NULL DEFAULT 1,
  input_json TEXT,
  output_json TEXT,
  error_json TEXT,
  started_at TEXT,
  finished_at TEXT,
  duration_ms INTEGER,
  FOREIGN KEY (run_id) REFERENCES workflow_runs(id) ON DELETE CASCADE
);
```

建议每次重试插入一条新的 `workflow_steps` 记录，或者增加 `attempt` 维度，而不是覆盖首次失败信息。

索引：

```sql
CREATE INDEX idx_workflow_steps_run_sequence
  ON workflow_steps(run_id, sequence);

CREATE INDEX idx_workflow_runs_node_created
  ON workflow_runs(node_id, created_at DESC);
```

## 6. 存储层接口

Host 业务模块不应直接在各处拼接 SQL。建议增加 Repository 层：

```ts
interface TaskRepository {
  list(): Promise<TaskConfig[]>
  get(id: string): Promise<TaskConfig | undefined>
  create(task: TaskConfig): Promise<void>
  update(task: TaskConfig): Promise<void>
  delete(id: string): Promise<void>
}

interface NodeRepository {
  list(): Promise<NodeConfig[]>
  get(id: string): Promise<NodeConfig | undefined>
  create(node: NodeConfig, steps: NodeStep[]): Promise<void>
  update(node: NodeConfig, steps: NodeStep[]): Promise<void>
  delete(id: string): Promise<void>
}

interface RunRepository {
  create(run: WorkflowRun): Promise<void>
  updateStatus(id: string, status: RunStatus, patch?: unknown): Promise<void>
  addStep(step: WorkflowStep): Promise<void>
  updateStep(id: string, patch: unknown): Promise<void>
  get(id: string): Promise<WorkflowRun | undefined>
}
```

读取配置时转换成应用层的 `TaskConfig`、`NodeConfig`；执行器不应依赖 SQL 行结构。

### 6.1 配置保存事务

保存 Node 时需要在一个事务中完成：

```text
BEGIN
  更新 nodes
  删除该 Node 原有 node_steps
  插入新的 node_steps
  COMMIT
```

如果任意一步失败，Node 定义和步骤关系都保持原状态。

### 6.2 删除策略

Task 被 Node 引用时不能物理删除。建议：

- 默认 API 返回引用冲突，并拒绝删除。
- 管理员确认后可以标记 `status = deleted`。
- 历史运行仍然保留 Task 快照和版本号。
- 只有没有引用、没有运行历史的对象才允许物理清理。

## 7. JSON 到 SQLite 迁移

### 7.1 迁移前准备

1. 停止可能写入配置的 Host 进程。
2. 创建原始文件备份。
3. 读取唯一配置入口。
4. 先执行 version 1 到 version 2 的结构迁移。
5. 验证 Task、Node 和引用关系。
6. 在 SQLite 事务中导入。
7. 导入后执行数量和引用校验。

### 7.2 导入规则

version 2 JSON：

```text
config.tasks       -> tasks
config.nodes       -> nodes
node.tasks[]       -> node_steps.position
config.equipped[]  -> equipped_entities
```

Node 中缺少 `triggerMode`、`failurePolicy` 时使用默认值：

```text
triggerMode = both
failurePolicy = fail_fast
```

### 7.3 导入校验

导入前后至少检查：

- Task 数量一致。
- Node 数量一致。
- 每个 Node 的 Task 引用数量一致。
- Task 和 Node 名称唯一。
- `equipped` 中有效 ID 数量一致。
- JSON Schema 可以被解析。
- LLM 配置字段完整。

导入失败时必须回滚整个事务，并保留错误报告：

```json
{
  "ok": false,
  "source": "config.json",
  "errorCode": "IMPORT_VALIDATION_ERROR",
  "errors": [
    {
      "entity": "node-xxx",
      "field": "tasks[1]",
      "message": "task not found"
    }
  ]
}
```

### 7.4 导出规则

提供完整导出：

```text
GET /api/tohelper/config/export
```

导出的 JSON 应包含：

- schema version。
- tasks。
- nodes。
- Node steps 的顺序和映射。
- equipped 状态。
- 不包含运行历史中的大文本，运行历史另设导出接口。

导出内容可以用于版本控制，但敏感配置必须脱敏或使用环境变量引用。

## 8. 运行历史和并发

### 8.1 运行快照

工作流开始时读取 Node、Task 和步骤定义的快照，保存：

- `node_version`。
- 每个 Task 的 `task_version`。
- 输入快照。
- 输入映射快照。
- 运行时使用的模型配置。

这样配置在运行过程中更新，也不会改变当前运行的语义。

### 8.2 并发限制

第一版建议按 Node 支持以下策略之一：

```ts
type ConcurrencyPolicy = 'allow' | 'single' | 'queue'
```

推荐：

- 无副作用查询 Node：`allow`。
- 有写入、发送、下单副作用的 Node：`single`。
- 需要保持顺序的 Node：`queue`。

并发策略应属于 Node 配置，但需要在执行器中实现业务级判断，不能只依赖 SQLite 的锁。

### 8.3 运行状态恢复

进程异常退出后，数据库中可能存在 `running` 状态的 Run。启动时应将超过恢复窗口的运行标记为：

```text
failed / PROCESS_RESTARTED
```

如果未来实现断点恢复，需要保存每一步的输入快照和幂等信息。对于有副作用的 Tool，不应自动重放未知是否成功的步骤。

### 8.4 数据保留

运行结果可能包含很大的 Tool 返回内容。建议：

- 默认保留最近 1000 次运行，或保留最近 30 天。
- 大字段超过阈值时压缩或存文件，数据库只保存引用。
- 提供清理 API。
- 清理运行历史不能影响 Task、Node 定义。

## 9. Loop 的目标语义

### 9.1 Pipeline 与 Loop 的区别

Pipeline：

```text
Node 配置决定顺序
每个步骤按顺序执行
Node LLM 只负责汇总
```

Loop：

```text
Node LLM 决定下一步
只能选择 Node 配置允许的 Task
执行结果回到编排器
直到显式完成、失败或达到限制
```

Loop 不应该被用于“本来顺序已经确定”的工作流。固定的多个 Task 应使用 Pipeline，这样更容易测试、重试和审计。

### 9.2 Loop 状态

```ts
type LoopStatus =
  | 'running'
  | 'completed'
  | 'failed'
  | 'max_turns'
  | 'stalled'
  | 'cancelled'

type LoopState = {
  turn: number
  maxTurns: number
  originalInput: unknown
  taskResults: Record<string, TaskResult[]>
  completedTaskIds: Set<string>
  retryCount: Record<string, number>
  lastDecision?: LoopDecision
  status: LoopStatus
}
```

必须使用 Task ID 作为状态键，不能使用 Task name。name 是 Tool 名称，可能被修改，也不应成为运行时唯一标识。

## 10. Loop 决策协议

### 10.1 决策类型

Loop 编排器每一轮只能产生以下两种业务决策：

```ts
type LoopDecision =
  | {
      action: 'run_task'
      taskId: string
      input?: unknown
      reason?: string
    }
  | {
      action: 'finish'
      answer: string
      reason?: string
    }
```

失败和重试不应只依赖 LLM 自由发挥。执行器根据错误和 Task 配置决定是否重试；如果需要让模型选择重试，可增加受控决策：

```ts
{
  action: 'retry_task',
  taskId: 'task-xxx',
  reason: '上次参数不完整'
}
```

但执行器必须检查重试次数和 `allow_repeat`，不能无条件接受。

### 10.2 决策 JSON Schema

编排器要求模型严格返回 JSON：

```json
{
  "oneOf": [
    {
      "type": "object",
      "required": ["action", "taskId"],
      "properties": {
        "action": { "const": "run_task" },
        "taskId": { "type": "string" },
        "input": {},
        "reason": { "type": "string" }
      }
    },
    {
      "type": "object",
      "required": ["action", "answer"],
      "properties": {
        "action": { "const": "finish" },
        "answer": { "type": "string" },
        "reason": { "type": "string" }
      }
    }
  ]
}
```

如果模型输出无法解析：

1. 记录 `DECISION_PARSE_ERROR`。
2. 最多进行一次格式修复请求。
3. 修复仍然失败则 Loop 状态为 `failed`，而不是当作“完成”。

### 10.3 编排器上下文

每轮发送给 Node LLM 的内容应包含：

- Node 的编排目标。
- 原始用户输入。
- 可用 Task 的 ID、名称、描述和输入要求。
- 已执行步骤及其状态。
- 成功输出的摘要或完整结构化输出。
- 可重试 Task 和剩余重试次数。
- 当前轮数、最大轮数。

建议使用结构化文本或 JSON，而不是把所有内容拼接成无边界的自然语言。大输出应截断并保留引用，避免上下文无限增长。

### 10.4 可用 Task 白名单

每轮决策后执行器必须验证：

- `taskId` 是否属于当前 Node。
- Task 是否 active。
- Task 是否允许在当前状态下执行。
- 输入是否符合 Task 的 inputSchema。
- 是否超过重复执行次数。
- 是否超过总预算和超时时间。

任何一项失败都返回明确的编排错误，不调用未授权的 Task。

## 11. Loop 执行流程

```text
1. 读取 Node 和 Task 快照
2. 创建 workflow_run，状态 running
3. 初始化 LoopState
4. 生成可用 Task 摘要
5. 调用 Node LLM 获取 LoopDecision
6. 校验 LoopDecision
7. 如果 action = run_task：
   7.1 解析输入映射
   7.2 创建 workflow_step
   7.3 执行 Task
   7.4 保存 TaskResult
   7.5 根据结果更新状态
   7.6 回到第 4 步
8. 如果 action = finish：
   8.1 校验是否满足最低完成条件
   8.2 保存最终输出
   8.3 将 Run 标记为 success 或 partial_failure
9. 达到 maxTurns：标记 max_turns
10. 用户取消或超时：标记 cancelled 或 timeout
```

### 11.1 完成条件

Loop 不能仅因为 LLM 返回普通文本就完成。至少应满足以下一个条件：

- LLM 返回 `action = finish`。
- Node 配置指定的 required Task 已完成。
- Node 配置指定的完成条件被验证器确认。

建议增加：

```ts
completionPolicy: 'llm_finish' | 'all_required' | 'llm_and_required'
```

默认使用 `llm_and_required`：模型必须请求完成，并且所有 required Task 已成功或被允许跳过。

### 11.2 重复执行

每个步骤分别控制：

```ts
allowRepeat: boolean
maxAttempts: number
```

默认：

```text
allowRepeat = false
maxAttempts = 1
```

对于允许重复的 Task，必须记录每次输入和输出。对于有副作用的 Task，默认禁止自动重复，除非 Tool 明确支持幂等键。

### 11.3 停滞检测

以下情况应触发 `stalled`：

- 连续两轮生成相同的 `run_task` 决策和相同输入。
- 连续多轮没有新的成功结果。
- 模型反复请求已失败且不可重试的 Task。
- 模型只返回无法执行的 Task ID。

停滞后可以进行一次最终汇总请求；如果仍然不能完成，则返回 `stalled`，不无限循环。

## 12. Loop 失败和返回协议

### 12.1 状态定义

Loop 使用统一的 WorkflowResult：

```ts
interface WorkflowResult {
  ok: boolean
  status:
    | 'success'
    | 'partial_failure'
    | 'failed'
    | 'timeout'
    | 'cancelled'
    | 'max_turns'
    | 'stalled'
  runId: string
  nodeId: string
  output?: unknown
  error?: {
    code: string
    message: string
    taskId?: string
    retryable?: boolean
  }
  steps: TaskResult[]
}
```

### 12.2 典型情况

#### Task 失败且可继续

```text
Loop 继续执行其他允许的 Task。
最终状态：partial_failure。
输出包含成功 Task 的结果和失败 Task 的错误摘要。
```

#### Task 失败且为 required

```text
Loop 可以尝试配置允许的重试。
重试耗尽后停止。
最终状态：failed。
```

#### Node LLM 无法作出合法决策

```text
最终状态：failed。
error.code = DECISION_PARSE_ERROR 或 INVALID_DECISION。
```

#### 达到最大轮数

```text
最终状态：max_turns。
保留已完成 Task 的结果。
明确告诉用户工作流没有确认完成。
```

#### 用户取消

```text
最终状态：cancelled。
正在执行的可取消 Tool 使用 AbortSignal 中止。
已经完成的步骤保留。
```

### 12.3 用户可读结果

例如：

```text
工作流未确认完成，已达到最大执行轮数。

已完成：
- 数据读取
- 数据清洗

未完成：
- 报告生成

已生成的中间结果仍然保存在运行记录 run-xxx 中。
```

用户可读文本不能掩盖状态。Agent Tool 的结构化返回中必须保留 `status` 和 `runId`。

## 13. Loop 的工具调用方式

当前实现为每轮构建虚拟 Task Tool，并解析模型生成的 Tool Call。这个方式可以继续使用，但需要补充以下约束：

- 虚拟 Tool 的名称使用稳定 Task ID，例如 `task_<id>`，不要只使用 Task name。
- 必须提供完成工具，例如 `workflow_finish`，避免“没有 Tool Call 就认为完成”。
- Tool Call 参数必须先通过 JSON Schema 校验。
- 未知 Tool Call 必须计入错误次数，不能静默跳过。
- 每一轮的多个 Tool Call 需要明确是否允许并行。

推荐第一版 Loop 每轮只允许一个 `run_task` 决策。这样更容易处理：

- Task 输入依赖。
- 失败和重试。
- 运行日志。
- 上下文更新。

未来确认状态模型稳定后，再增加同一轮多个互不依赖 Task 的并行执行。

## 14. 事务和运行时边界

配置事务和工作流执行不能包在同一个长事务中。推荐：

```text
短事务：创建 Run 和步骤记录
事务外：执行 LLM、MCP Tool 和 Task
短事务：更新步骤结果和 Run 状态
```

不能在调用外部 MCP 服务时长期持有 SQLite 写锁，否则 UI 查询和其他运行都会受到影响。

每次外部调用都应设置：

- 单步超时。
- 全局工作流超时。
- AbortSignal。
- 结构化错误码。

## 15. API 规划

### 15.1 运行历史

```text
GET /api/tohelper/runs?nodeId=<id>&limit=<n>
GET /api/tohelper/runs/<runId>
POST /api/tohelper/runs/<runId>/cancel
DELETE /api/tohelper/runs/cleanup
```

### 15.2 配置导入导出

```text
GET /api/tohelper/config/export
POST /api/tohelper/config/import
GET /api/tohelper/config/backup
```

### 15.3 运行统计

```text
GET /api/tohelper/node/<nodeId>/stats
```

第一版统计只需要：

- 总运行次数。
- 成功、失败、部分成功次数。
- 平均耗时。
- 各 Task 失败次数。
- 最近一次运行状态。

## 16. 实施阶段

### 阶段 E：SQLite 基础设施

1. 选择 SQLite 驱动，并确认 Node 运行环境的原生支持情况。
2. 建立统一数据库路径和初始化模块。
3. 创建 schema_meta、tasks、nodes、node_steps、equipped_entities。
4. 建立 Repository 层。
5. 为配置 CRUD 接口切换到 Repository。
6. 添加 JSON 导入导出。

### 阶段 F：运行记录

1. 增加 workflow_runs 和 workflow_steps。
2. Node Runtime 创建运行快照。
3. 每个 Task 步骤写入状态和结果。
4. 增加运行查询和取消接口。
5. 增加异常重启后的运行恢复处理。
6. 添加运行历史清理策略。

### 阶段 G：Loop 重构

1. 使用 Task ID 作为 Loop 状态键。
2. 定义 `run_task` 和 `finish` 决策协议。
3. 增加决策 JSON Schema 校验。
4. 增加完成条件、最大轮数和全局预算。
5. 增加 Task 白名单、重复执行限制和重试策略。
6. 增加停滞检测。
7. 将每轮决策写入运行记录。

### 阶段 H：并行和高级能力

1. 支持同一轮多个无依赖 Task。
2. 支持 DAG 步骤和显式依赖。
3. 支持运行断点恢复。
4. 支持副作用 Tool 的幂等键。
5. 支持更细的权限、审计和人工确认点。

## 17. 测试计划

### SQLite

- 首次启动能创建数据库。
- 重复启动不会重复初始化。
- 配置写入事务失败时完全回滚。
- 删除被引用的 Task 会被拒绝或标记删除。
- JSON 导入数量和引用关系一致。
- 并发读取和写入不会产生随机锁错误。
- schema version 迁移失败可以回滚。

### 运行历史

- Run 创建后状态为 running。
- 每个步骤都能记录 pending、running、success、failed 和 skipped。
- 重试不会覆盖之前的错误。
- 进程重启后遗留 running Run 能被标记。
- 大结果不会无限制膨胀数据库。

### Loop

- LLM 返回合法 `run_task` 时执行正确 Task。
- LLM 返回未知 Task ID 时不执行未授权 Task。
- LLM 返回 `finish` 时按 completionPolicy 校验。
- 非法 JSON 经过一次修复仍失败后正确终止。
- required Task 失败后按照策略停止或重试。
- allowRepeat 为 false 时阻止重复执行。
- 连续相同决策会触发 stalled。
- 达到 maxTurns 后返回 max_turns。
- 取消时保留已经完成的步骤。
- Loop 最终返回成功结果和所有步骤状态。

## 18. 风险和取舍

### 18.1 SQLite 驱动兼容性

Node.js 版本、运行环境和打包方式会影响 SQLite 驱动选择。应先验证目标 DSH 运行环境是否支持：

- Node 原生 `node:sqlite`。
- 已安装的 SQLite npm 驱动。
- 原生模块编译和分发。

驱动选择必须先做最小验证，不应在没有确认运行环境的情况下直接绑定某个原生依赖。

### 18.2 结构化输出体积

LLM 和 MCP 返回结果可能很大。需要限制：

- 单步输出最大保存大小。
- 发送给 Loop LLM 的上下文大小。
- UI 查询单次返回大小。
- 日志中参数和 Token 的脱敏。

### 18.3 Loop 的不可预测性

Loop 即使有协议，也仍然依赖 LLM 产生决策。因此：

- 对固定流程优先使用 Pipeline。
- 对副作用操作优先使用显式触发。
- 关键步骤使用 required 和 completionPolicy。
- 每轮决策必须可审计。
- 不允许 Loop 访问 Node 白名单外的 Task。

### 18.4 配置版本与运行版本

运行开始后不能直接引用正在变化的对象。必须使用 Node/Task 快照或版本号，否则用户修改配置可能导致同一次运行前后行为不一致。

## 19. 最终结论

SQLite 适合作为 `tohelper` 的长期主存储，因为项目已经需要关系查询、事务、运行历史和步骤状态。推荐采用：

```text
SQLite：Task、Node、Node-Step、装配意图、运行历史
JSON：导入、导出、备份
Secret Storage：MCP Token 和其他敏感信息
```

Loop 不应继续依赖“模型没有 Tool Call 就视为完成”的隐式行为。应改为受控协议：

```text
run_task(taskId, input)
finish(answer)
```

再配合 Task 白名单、完成条件、最大轮数、重试次数、重复执行限制、停滞检测和结构化运行记录。

最终建议保持以下判断：

- 顺序明确的多个 Task 使用 Pipeline。
- 需要动态决定下一步的场景使用 Loop。
- 需要一定执行的场景使用显式命令或 UI 按钮。
- Agent 自主匹配只作为可选入口。
- SQLite 解决数据一致性和历史追踪，不能替代执行器和触发器设计。