# Task 级别 LLM 配置 - 完整实现

## 🎉 新功能

### 1. Task 级别 LLM 配置

现在可以为每个 `llm-call` Task 配置独立的 LLM 模型了！

#### 功能特点

- **独立配置**：每个 Task 可以选择使用自己的 LLM 配置
- **继承机制**：如果不配置，将自动使用 Node 级别的 LLM 配置
- **灵活切换**：通过"自定义"复选框切换是否使用独立配置
- **优先级明确**：`Task.llm > Node.llm`

#### UI 界面

在 Task 编辑器中，llm-call Task 增加了：

```
┌─────────────────────────────────────────┐
│ Task 3: 整合结果                    [×] │
├─────────────────────────────────────────┤
│ Task 名称: 整合结果                     │
│ Task 类型: LLM Call                     │
│                                         │
│ LLM 模型:                               │
│ [☑ 自定义]                              │
│ ┌─────────────────────────────────┐    │
│ │ deepseek-official/deepseek-coder│    │ ← 选择自定义模型
│ └─────────────────────────────────┘    │
│ 此 Task 使用独立的 LLM 配置             │
│                                         │
│ System Prompt:                          │
│ ┌─────────────────────────────────┐    │
│ │ 你是优惠查询助手...              │    │
│ └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

#### 配置示例

**方式 1: 继承 Node 配置（推荐）**
```json
{
  "id": "task-1",
  "name": "Task 1",
  "type": "llm-call",
  "config": {
    "systemPrompt": "...",
    "outputFormat": "text"
  }
  // 没有 llm 字段，自动继承 Node 配置
}
```

**方式 2: 自定义 LLM**
```json
{
  "id": "task-2",
  "name": "Task 2",
  "type": "llm-call",
  "config": {
    "systemPrompt": "...",
    "outputFormat": "json"
  },
  "llm": {
    "provider": "deepseek-official",
    "model": "deepseek-coder"  // 独立的模型配置
  }
}
```

### 2. 智能 LLM 列表获取

改进了 LLM 列表 API，支持从多个来源获取用户配置的模型：

#### 获取优先级

1. **Agent 配置**：从 dsh Agent 配置中获取 LLM 设置
2. **AgentDefaultModel**：从 dsh 的默认模型服务获取
3. **历史使用**：从 Node 配置文件（`node-config.json`）中获取历史使用的模型
4. **系统默认**：最后回退到 deepseek 系统默认模型

#### 去重和排序

- 自动去重，避免重复显示相同的模型
- 用户配置的模型优先显示在列表顶部
- 系统默认模型（deepseek-chat/coder/reasoner）放在底部

## 📝 使用场景

### 场景 1: 不同 Task 使用不同模型

```typescript
{
  "name": "multi_model_workflow",
  "llm": {
    "provider": "deepseek-official",
    "model": "deepseek-chat",
    "temperature": 0.7
  },
  "tasks": [
    {
      "id": "task-1",
      "type": "tool-call",
      "config": { ... }
    },
    {
      "id": "task-2",
      "name": "代码生成",
      "type": "llm-call",
      "llm": {
        "provider": "deepseek-official",
        "model": "deepseek-coder"  // 独立的 coder 模型
      },
      "config": {
        "systemPrompt": "你是一个代码生成专家",
        "outputFormat": "json"
      }
    },
    {
      "id": "task-3",
      "name": "结果总结",
      "type": "llm-call",
      // 继承 Node 配置 (deepseek-chat)
      "config": {
        "systemPrompt": "你是一个总结专家",
        "outputFormat": "text"
      }
    }
  ]
}
```

### 场景 2: 高效任务专用模型

```typescript
{
  "name": "smart_workflow",
  "llm": {
    "provider": "deepseek-official",
    "model": "deepseek-chat",
    "temperature": 0.7
  },
  "tasks": [
    {
      "id": "task-1",
      "name": "简单查询",
      "type": "llm-call",
      // 使用便宜快速的模型
      "llm": {
        "provider": "deepseek-official",
        "model": "deepseek-chat"
      },
      "config": {
        "systemPrompt": "简单回答用户问题",
        "outputFormat": "text"
      }
    },
    {
      "id": "task-2",
      "name": "深度推理",
      "type": "llm-call",
      // 使用强大的推理模型
      "llm": {
        "provider": "deepseek-official",
        "model": "deepseek-reasoner"
      },
      "config": {
        "systemPrompt": "进行深度分析和推理",
        "outputFormat": "json"
      }
    }
  ]
}
```

## 🔧 技术实现

### 前端改动

#### NodeEditor.tsx

- TaskItem 组件新增 `availableLLMs` 和 `nodeLlmConfig` 参数
- 添加"自定义"复选框，切换 Task 级别 LLM 配置
- 下拉菜单显示所有可用模型，并标注当前使用的是否为自定义配置

#### TaskConfig 类型

```typescript
export interface TaskConfig {
  id: string
  name: string
  description?: string
  type: 'llm-call' | 'tool-call' | 'transform' | 'conditional'
  config: TaskTypeConfig
  llm?: LLMSlot  // ← 新增字段
}
```

### 后端改动

#### LLM API (tool/index.ts)

增强 `/api/tohelper/llm/list` 端点：

1. **方式 1**: 从 `ctx.llm.providers()` 获取系统模型
2. **方式 2**: 从 `agent.config.llm` 或 `agent.config.models` 获取 Agent 配置
3. **方式 3**: 从 `ctx.agentDefaultModel.currentSelection()` 获取默认模型
4. **方式 4**: 从 `node-config.json` 获取历史使用的模型

#### LLM Call Task (llm-call.ts)

优先级机制：
```typescript
const llmConfig = 
  config.llm                          // Task 级别
  ?? context.nodeConfig.llm          // Node 级别
  ?? getDefaultLLMConfig(context)     // 系统默认
```

## 📊 性能对比

| 配置方式 | 响应速度 | 成本 | 适用场景 |
|---------|---------|------|---------|
| deepseek-chat | 快 | 低 | 简单查询、快速响应 |
| deepseek-coder | 中 | 中 | 代码生成、代码分析 |
| deepseek-reasoner | 慢 | 高 | 复杂推理、深度分析 |

## 🧪 测试指南

### 测试 1: Task 级别 LLM 配置

1. 创建或编辑一个 Pipeline Node
2. 添加多个 llm-call Task
3. 为第一个 Task 配置自定义 LLM（如 deepseek-coder）
4. 第二个 Task 不配置，使用默认继承
5. 保存并装配
6. 测试执行，观察不同 Task 使用不同的模型

### 测试 2: LLM 列表智能获取

```bash
# 重启 dsh（加载新插件）
# 测试 LLM 列表 API
curl http://localhost:3000/api/tohelper/llm/list | jq

# 期望：列表中包含历史使用的模型
```

### 测试 3: 错误修复验证

```bash
# 测试 query_nearby_deals（之前会失败）
用户: 帮我查询附近的优惠
```

**期望结果**：
- ✅ Task 1 (查询瑞幸): OK
- ✅ Task 2 (查询麦当劳): OK
- ✅ Task 3 (整合结果): OK ← 之前会失败
- ✅ 返回整合后的结果

## 📚 相关文档

- [CHANGELOG.md](./CHANGELOG.md) - 更新日志
- [LLM配置错误修复.md](./LLM配置错误修复.md) - 配置不一致错误修复
- [快速修复指南.md](./快速修复指南.md) - 用户修复指导

---

**版本**: v0.5.2  
**发布日期**: 2026-08-30  
**主要特性**: Task 级别 LLM 配置 + 智能 LLM 列表获取
