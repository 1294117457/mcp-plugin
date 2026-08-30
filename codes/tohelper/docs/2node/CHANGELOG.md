# Node-Task 系统更新日志

## v0.6.0 - 2026-08-30 (架构重构)

### 🎯 核心重构

完全重构 Node-Task 架构，简化概念模型：
- **Task** = LLM + Tools + TaskPrompt（执行单元）
- **Node** = LLM + Tasks + Mode + NodePrompt（任务编排）

### ✨ 新功能

#### 1. 三种执行模式

**Direct 模式**：
- 执行单个 Task
- 适合简单任务

**Pipeline 模式**：
- 顺序执行多个 Tasks
- 前一个 Task 的输出作为后一个的输入
- 适合多步骤流程

**Loop 模式**（核心创新）⭐：
- LLM 动态调度 Tasks
- 智能决定执行顺序
- 循环执行直到任务完成
- 适合复杂任务

#### 2. 统一的 Task 配置

**新 TaskConfig**：
```typescript
interface TaskConfig {
  taskPrompt: string      // Task 任务描述
  tools: string[]         // 支持多个工具
  llm?: LLMSlot          // 可选独立配置
  outputFormat?: 'text' | 'json'
}
```

**关键变化**：
- 移除 `type` 字段（llm-call/tool-call/transform）
- 移除 `config` 嵌套结构
- 添加 `taskPrompt`（替代 systemPrompt）
- 添加 `tools[]`（支持多工具）

#### 3. 增强的 Node 配置

**新 NodeConfig**：
```typescript
interface NodeConfig {
  nodePrompt: string      // Node 任务目标
  llm: LLMSlot           // Node 级别 LLM（必需）
  mode: 'direct' | 'pipeline' | 'loop'
  tasks: TaskConfig[]
  tools: string[]        // Node 级别工具
}
```

**关键变化**：
- 添加 `nodePrompt`（统一的任务描述）
- 添加 `mode`（三种执行模式）
- `llm` 变为必需字段

#### 4. 新 UI 编辑器（NodeEditorV2）

**Mode 选择器**：
- 直观的单选按钮
- 每个 Mode 都有说明
- 实时预览效果

**Node Prompt**：
- 描述整个 Node 的任务目标
- 多行文本输入
- 提示文本指导

**Task 配置增强**：
- Task Prompt 独立输入
- Tools 多选框
- Task 级别 LLM 配置
- 自定义复选框

**视觉改进**：
- Mode 选择器样式
- Tools 多选容器
- Temperature 滑块
- 徽章显示（自定义LLM、工具数量）

### 🔧 技术实现

#### 1. 新执行器（NodeExecutor）

**文件**：`src/host/node/executor-v2.ts`

```typescript
class NodeExecutor {
  async run(input): Promise<NodeExecutionResult>
  private async runDirect(input)
  private async runPipeline(input)
  private async runLoop(input)
  private async runTask(task, input)
  private async decideNextStep(context): Promise<LoopDecision>
}
```

**Loop 模式决策**：
- LLM 作为任务调度器
- 分析 nodePrompt 和 availableTasks
- 动态选择下一个 Task
- 循环执行直到任务完成

#### 2. 数据迁移工具

**文件**：`src/host/node/migration.ts`

```typescript
export function migrateTask(legacy: LegacyTaskConfig): TaskConfig
export function migrateNode(legacy: LegacyNodeConfig): NodeConfig
export function autoMigrate<T>(data: T): T
```

**迁移规则**：
- `type: 'llm-call'` → `taskPrompt = systemPrompt`
- `type: 'tool-call'` → `tools = [toolName]`
- `executionMode` → `mode`
- `systemPrompt` → `nodePrompt`

#### 3. 向后兼容

保留旧版本类型定义：
```typescript
export interface LegacyTaskConfig { ... }  // @deprecated
export interface LegacyNodeConfig { ... }  // @deprecated
```

### 📊 性能优化

- 编译后大小：66.22 kB（之前：53.41 kB）
- 增加约 12.8 kB（新功能和 UI）
- Gzip 压缩：15.42 kB

### 📝 配置示例

#### Pipeline 模式
```json
{
  "name": "query_nearby_deals",
  "nodePrompt": "查询附近商家优惠信息",
  "mode": "pipeline",
  "llm": { "provider": "deepseek-official", "model": "deepseek-chat" },
  "tasks": [
    {
      "taskPrompt": "查询用户附近的瑞幸咖啡门店",
      "tools": ["mcp__my-coffee__queryShopList"]
    },
    {
      "taskPrompt": "查询麦当劳可领取的优惠券",
      "tools": ["mcp__mcd-mcp__available-coupons"]
    },
    {
      "taskPrompt": "整合结果，用友好方式展示",
      "tools": []
    }
  ]
}
```

#### Loop 模式
```json
{
  "name": "data_analysis",
  "nodePrompt": "分析销售数据并生成报告",
  "mode": "loop",
  "llm": { "provider": "deepseek-official", "model": "deepseek-reasoner" },
  "tasks": [
    { "taskPrompt": "数据清洗", "tools": ["cleaner"] },
    { "taskPrompt": "统计分析", "tools": ["stats-calculator"] },
    { "taskPrompt": "数据可视化", "tools": ["chart-generator"] },
    { "taskPrompt": "报告生成", "tools": ["report-writer"] }
  ]
}
```

### 🔄 迁移指南

#### 自动迁移
- 旧配置自动转换为新格式
- 无需手动修改

#### 手动迁移（如需）
1. 将 `systemPrompt` 改为 `taskPrompt`
2. 将 `type: 'tool-call', config: { toolName: 'xxx' }` 改为 `tools: ['xxx']`
3. 将 `executionMode` 改为 `mode`
4. 添加 `nodePrompt`

### 📚 文档更新

- 新增：`docs/2node/架构重构完成.md`
- 更新：`CHANGELOG.md`

### ⚠️ Breaking Changes

**类型变化**：
- `TaskConfig.type` 字段已移除
- `TaskConfig.config` 字段已移除
- `NodeConfig.executionMode` 改为 `mode`
- `NodeConfig.systemPrompt` 移除（使用 `nodePrompt`）

**兼容性**：
- 保留旧类型定义（标记 @deprecated）
- 提供自动迁移工具
- 支持新旧编辑器切换（`useV2` 标志）

### 🚀 下一步

- [ ] 集成新执行器到 host
- [ ] 测试三种 Mode
- [ ] 更新 API 处理新格式
- [ ] Loop 模式优化

---

## v0.5.2 - 2026-08-30

### ✨ 新功能

#### 1. Task 级别 LLM 配置

**功能描述**：
- 每个 `llm-call` Task 可以配置独立的 LLM 模型
- 支持继承 Node 级别配置或使用自定义配置
- 通过"自定义"复选框灵活切换
- 优先级：`Task.llm > Node.llm`

**UI 改进**：
- Task 编辑器中新增 LLM 模型选择器
- 显示"自定义"标签标识使用了独立配置的 Task
- 提示文本显示当前使用的配置来源

**技术实现**：
- TaskConfig 类型新增 `llm?: LLMSlot` 字段
- TaskItem 组件支持 `availableLLMs` 和 `nodeLlmConfig` 参数
- Pipeline 模式动态传递 Node 级别的 LLM 配置

**使用场景**：
```json
{
  "tasks": [
    {
      "id": "task-1",
      "type": "llm-call",
      "llm": { "provider": "deepseek-official", "model": "deepseek-coder" },
      "config": { "systemPrompt": "代码生成专家" }
    },
    {
      "id": "task-2",
      "type": "llm-call",
      // 继承 Node 配置
      "config": { "systemPrompt": "总结专家" }
    }
  ]
}
```

#### 2. 智能 LLM 列表获取

**改进内容**：
- 从 4 个来源获取 LLM 模型列表
- 自动去重和排序
- 用户配置的模型优先显示

**获取来源**（按优先级）：
1. Agent 配置（`agent.config.llm` 或 `agent.config.models`）
2. AgentDefaultModel 服务（`ctx.agentDefaultModel.currentSelection()`）
3. 历史使用（从 `node-config.json` 读取）
4. 系统默认（deepseek-chat/coder/reasoner）

**效果**：
- 如果你在 dsh 中配置了自定义模型，会自动出现在下拉列表中
- 历史使用过的模型也会被记住
- 避免重复显示相同的模型

---

## v0.5.1 - 2026-08-30 (紧急修复)

### 🐛 Bug 修复

#### 修复 LLM Call 配置不一致错误

**问题**：Pipeline 模式执行 `llm-call` Task 时报错：
```
LLM call failed: prepared LLM call config changed before adapter dispatch
```

**原因**：
- LLM 配置对象在 `prepareCall` 和 `stream` 之间可能被修改
- `getDefaultLLM()` 依赖的 agent 状态可能在运行时改变
- dsh LLM 适配器检测到配置不一致

**修复**：
- 使用深拷贝确保配置对象不可变
- `prepareCall` 只传递 provider 和 model
- `stream` 传递完整配置（temperature, maxTokens）
- 重命名 `getDefaultLLM` 为 `getDefaultLLMConfig`

**影响**：
- ✅ Pipeline 模式的 llm-call Task 现在可以正常执行
- ✅ 修复了并发调用时的配置冲突
- ✅ 提升了执行稳定性

**详细文档**：[LLM配置错误修复.md](./LLM配置错误修复.md)

---

## v0.5.0 - 2026-08-30

### ✨ 新功能

#### 1. 动态 LLM 配置
- **从 dsh 获取 LLM 列表**：新增 `/api/tohelper/llm/list` API
- **自动填充模型选项**：NodeEditor 现在会自动加载已配置的 LLM 模型
- **统一 LLM 配置**：所有执行模式（Direct 和 Pipeline）现在都在 Node 级别配置 LLM

**使用方式**：
```bash
# 查询可用的 LLM 模型
curl http://localhost:3000/api/tohelper/llm/list

# 响应示例
{
  "ok": true,
  "llms": [
    {
      "provider": "deepseek-official",
      "model": "deepseek-chat",
      "displayName": "deepseek-official/deepseek-chat"
    },
    {
      "provider": "deepseek-official",
      "model": "deepseek-coder",
      "displayName": "deepseek-official/deepseek-coder"
    }
  ]
}
```

**UI 改进**：
- LLM 配置现在独立为一个 Section
- 下拉菜单显示完整的 `provider/model` 格式
- 支持从 dsh 动态加载可用模型

#### 2. Pipeline 模式 LLM 配置修复

**问题**：之前 Pipeline 模式的 Node 如果包含 `llm-call` Task，但 Node 级别没有 `llm` 配置，会导致执行失败：
```
Error: LLM call failed: prepared LLM call config changed before adapter dispatch
```

**解决方案**：
- 所有 Node（包括 Pipeline 模式）现在都必须配置 LLM
- `llm-call` Task 会继承 Node 级别的 LLM 配置
- 优先级：Task 级 > Node 级 > 默认值

**配置示例**：
```json
{
  "name": "query_nearby_deals",
  "executionMode": "pipeline",
  "llm": {
    "provider": "deepseek-official",
    "model": "deepseek-chat",
    "temperature": 0.7,
    "maxTokens": 2000
  },
  "tasks": [
    {
      "type": "tool-call",
      "config": { "toolName": "mcp__my-coffee__queryShopList" }
    },
    {
      "type": "llm-call",
      "config": {
        "systemPrompt": "整合结果...",
        "outputFormat": "text"
        // 会自动使用 Node 级别的 llm 配置
      }
    }
  ]
}
```

### 🎨 UI/UX 优化

#### 1. 面板尺寸优化
- **宽度**：600px → 650px（增加 50px，避免水平滚动）
- **高度**：700px → 720px（增加 20px，减少垂直挤压）

#### 2. 布局优化
- **NodeEditor**：改为 flex 布局，固定 footer
  - `th-editor-content`：可滚动内容区域
  - `th-editor-footer`：固定在底部的操作按钮
- **Task List**：添加最大高度和独立滚动
  - 最大高度：400px
  - 超出部分显示滚动条
  - 避免占满整个面板

#### 3. 样式改进
- **间距优化**：增加 form-group 和 section 的间距
- **输入框优化**：
  - 增加 padding（7px → 8px）
  - 添加 focus 阴影效果
  - 统一 border-radius
- **按钮优化**：
  - 增加 hover 背景色
  - 统一过渡动画（0.15s）
  - 改进视觉反馈
- **Task 卡片优化**：
  - 增加阴影效果
  - 优化 hover 状态
  - 改进折叠/展开动画

#### 4. 可访问性改进
- **文本溢出处理**：
  - Task 名称添加 `text-overflow: ellipsis`
  - 工具名称添加换行支持
- **滚动优化**：
  - 独立滚动区域添加 `overflow-x: hidden`
  - 滚动条样式优化
- **对比度优化**：
  - 提升文字颜色对比度
  - 改进禁用状态的视觉效果

### 🐛 Bug 修复

1. **LLM Call 配置丢失**：修复 Pipeline 模式下 LLM 配置未保存的问题
2. **DOM 重叠**：修复 Task 列表过长导致遮挡底部按钮的问题
3. **水平溢出**：修复长文本导致的水平滚动条问题
4. **按钮状态**：修复按钮 hover 状态不一致的问题

### 📦 API 变更

#### 新增 API

**GET /api/tohelper/llm/list**
```typescript
interface LLMOption {
  provider: string
  model: string
  displayName: string
}

interface LLMListResponse {
  ok: boolean
  llms: LLMOption[]
  agentId?: string
  error?: string
}
```

### 🔄 迁移指南

#### 已有 Pipeline Node 需要更新

如果你已经创建了 Pipeline 模式的 Node，建议更新配置：

**方式 1：通过 UI**
1. 打开节点面板
2. 点击"编辑"
3. 在"LLM 配置"区域选择模型
4. 保存

**方式 2：通过 API**
```bash
curl -X POST http://localhost:3000/api/tohelper/node/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "node-xxx",
    "name": "your_node_name",
    "executionMode": "pipeline",
    "llm": {
      "provider": "deepseek-official",
      "model": "deepseek-chat",
      "temperature": 0.7,
      "maxTokens": 2000
    },
    ...其他配置
  }'
```

**方式 3：直接编辑配置文件**
```bash
# 编辑 node-config.json
vim /home/dustp/codes/mcp-plugin/codes/tohelper/data/node-config.json

# 在每个 Node 中添加 llm 字段
{
  "nodes": {
    "node-xxx": {
      "name": "query_nearby_deals",
      "executionMode": "pipeline",
      "llm": {  // 添加这个
        "provider": "deepseek-official",
        "model": "deepseek-chat",
        "temperature": 0.7,
        "maxTokens": 2000
      },
      ...
    }
  }
}

# 重启 dsh
```

### 📝 使用建议

1. **为所有 Node 配置 LLM**
   - 即使是 Pipeline 模式只包含 tool-call，也建议配置 LLM
   - 方便后续添加 llm-call Task

2. **选择合适的模型**
   - `deepseek-chat`：通用对话和推理
   - `deepseek-coder`：代码相关任务
   - `deepseek-reasoner`：复杂推理任务

3. **Temperature 建议**
   - 0.1-0.3：精确任务（代码生成、数据转换）
   - 0.5-0.7：平衡任务（总结、分析）
   - 0.8-1.0：创造性任务（文案、创意）

### 🚀 性能优化

1. **并行加载**：Node、Tool、LLM 列表现在并行加载
2. **减少重渲染**：优化 React 组件的更新逻辑
3. **样式优化**：使用 CSS transitions 替代 JS 动画

---

## 测试清单

- [x] LLM 列表 API 正常返回
- [x] NodeEditor 显示动态 LLM 选项
- [x] Pipeline 模式保存 LLM 配置
- [x] Task List 滚动正常
- [x] 面板尺寸适配各种屏幕
- [x] 按钮 hover 状态正常
- [x] 长文本不会导致布局错乱
- [x] 编译无错误

---

**下一步计划**：
- [ ] Task 级别的 LLM 配置覆盖
- [ ] LLM 配置预设管理
- [ ] 批量导入/导出 Node 配置
- [ ] 可视化 Pipeline 执行流程图
