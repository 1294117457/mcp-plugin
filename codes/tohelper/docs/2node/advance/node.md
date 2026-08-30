# Node 系统完整文档

> **tohelper** 插件的 Node-Task 编排系统

---

## 目录

1. [概述](#概述)
2. [核心概念](#核心概念)
3. [执行模式](#执行模式)
4. [Task 类型](#task-类型)
5. [使用指南](#使用指南)
6. [API 参考](#api-参考)
7. [最佳实践](#最佳实践)
8. [故障排查](#故障排查)

---

## 概述

Node 系统是 tohelper 插件的核心功能，允许用户通过可视化 UI 创建和管理可复用的 Agent 工具。每个 Node 可以：

- 📦 **封装复杂逻辑**：将多步骤操作封装为单个工具
- 🔄 **灵活编排**：支持 LLM 调用、Tool 调用、数据转换的自由组合
- 🎯 **一键装配**：创建后即可装配为 dsh Tool，在对话中使用
- 🛡️ **完全隔离**：不侵入 dsh 代码，基于 Cordis 插件机制

---

## 核心概念

### Node（节点）

一个 Node 代表一个**内聚的工作单元**，对外表现为一个 dsh Tool。

```
Node = 封装的业务逻辑 + 输入/输出定义
     ↓ 装配
   dsh Tool（可在对话中调用）
```

**特点**：
- 有明确的名称和描述
- 有定义的输入/输出 Schema
- 可以装配/卸载
- 支持不同的执行模式

### Task（任务）

Task 是 **Pipeline 模式下的执行单元**，代表一个原子操作。

```
Pipeline Node = Task₁ → Task₂ → Task₃ → ... → 结果
```

**特点**：
- 按顺序执行
- 数据自动传递
- 可以是 LLM 调用、Tool 调用或数据转换
- 支持独立的 LLM 配置

### 执行模式

Node 支持三种执行模式：

| 模式 | 描述 | 适用场景 |
|-----|------|---------|
| **Direct** | 单次 LLM 调用 | 翻译、总结、问答 |
| **Pipeline** | 多 Task 串行编排 | 代码审查、数据处理 |
| **Subagent** | 复杂的自主决策（未来） | 多轮交互、工具自选 |

---

## 执行模式

### Direct 模式

**最简单的模式**，一次 LLM 调用完成任务。

#### 配置项
- `systemPrompt`: System Prompt
- `llm`: LLM 配置（provider, model, temperature, maxTokens）
- `tools`: 可选工具列表（暂不使用）

#### 示例：文本翻译器
```json
{
  "name": "text_translator",
  "executionMode": "direct",
  "systemPrompt": "You are a professional translator. Translate to English.",
  "llm": {
    "provider": "deepseek-official",
    "model": "deepseek-chat",
    "temperature": 0.3
  }
}
```

#### 执行流程
```
用户输入 → LLM 调用 → 返回结果
```

---

### Pipeline 模式

**最灵活的模式**，通过多个 Task 编排实现复杂逻辑。

#### 配置项
- `tasks`: Task 列表（按顺序执行）
- `tools`: 允许的工具列表（白名单）

#### 示例：代码分析器
```json
{
  "name": "code_analyzer",
  "executionMode": "pipeline",
  "tasks": [
    {
      "id": "task-read",
      "name": "Read File",
      "type": "tool-call",
      "config": { "toolName": "read_file" }
    },
    {
      "id": "task-analyze",
      "name": "Analyze",
      "type": "llm-call",
      "config": {
        "systemPrompt": "Analyze this code for security issues",
        "outputFormat": "text"
      }
    }
  ],
  "tools": ["read_file"]
}
```

#### 执行流程
```
用户输入: { filepath: "src/auth.ts" }
  ↓
Task 1: read_file("src/auth.ts")
  ↓ 输出: "const auth = ..."
Task 2: LLM 分析代码
  ↓ 输出: "发现 3 个问题..."
```

#### Pipeline 状态

Pipeline 执行时维护共享状态：

```typescript
{
  taskOutputs: {
    "task-read": "file content...",
    "task-analyze": "analysis result..."
  },
  executionLog: [
    { taskId: "task-read", success: true, duration: 50 },
    { taskId: "task-analyze", success: true, duration: 2000 }
  ]
}
```

---

## Task 类型

### 1. LLM Call Task

**调用 LLM 生成内容**

#### 配置
```typescript
{
  type: "llm-call",
  config: {
    systemPrompt: string,           // System Prompt
    userPromptTemplate?: string,    // 用户输入模板（可选）
    outputFormat?: "text" | "json"  // 输出格式
  },
  llm?: {                           // 可选：覆盖 Node 级 LLM 配置
    provider: string,
    model: string,
    temperature?: number,
    maxTokens?: number
  }
}
```

#### 功能
- ✅ 支持 System Prompt
- ✅ 支持用户输入模板（变量替换）
- ✅ 支持 JSON 输出格式
- ✅ 支持独立的 LLM 配置

#### 变量替换

在 `userPromptTemplate` 中可以使用变量：

```javascript
// 模板
"分析文件：${input.filepath}\n\n内容：\n${input.content}"

// 实际输入
{ filepath: "test.js", content: "const x = 1;" }

// 生成的 Prompt
"分析文件：test.js\n\n内容：\nconst x = 1;"
```

支持的变量：
- `${input}` - 当前输入
- `${input.field}` - 输入的某个字段
- `${state.taskId}` - 之前 Task 的输出

#### 示例
```json
{
  "id": "task-summarize",
  "name": "Summarize",
  "type": "llm-call",
  "config": {
    "systemPrompt": "Summarize in 3 sentences",
    "userPromptTemplate": "Text to summarize:\n\n${input}",
    "outputFormat": "text"
  }
}
```

---

### 2. Tool Call Task

**调用已装配的工具**

#### 配置
```typescript
{
  type: "tool-call",
  config: {
    toolName: string,              // Tool 名称
    inputMapping?: InputMapping,   // 输入映射（可选）
    outputMapping?: OutputMapping  // 输出映射（可选）
  }
}
```

#### 输入映射

控制如何将上一步的输出传递给 Tool：

**1. Direct（直接传递）**
```json
{ "type": "direct" }
```

**2. Extract（提取字段）**
```json
{
  "type": "extract",
  "extractPaths": {
    "path": "$.filepath",
    "encoding": "$.options.encoding"
  }
}
```

**3. Template（模板生成）**
```json
{
  "type": "template",
  "template": "/path/to/${input.filename}"
}
```

#### 输出映射

控制如何处理 Tool 的输出：

**1. Direct（直接传递）**
```json
{ "type": "direct" }
```

**2. Extract（提取字段）**
```json
{
  "type": "extract",
  "extractPaths": {
    "content": "$.result",
    "metadata": "$.meta"
  }
}
```

**3. Wrap（包装成新对象）**
```json
{
  "type": "wrap",
  "wrapTemplate": {
    "filepath": "${input.filepath}",
    "content": "${output}"
  }
}
```

#### 示例
```json
{
  "id": "task-read",
  "name": "Read File",
  "type": "tool-call",
  "config": {
    "toolName": "read_file",
    "inputMapping": {
      "type": "extract",
      "extractPaths": { "path": "$.filepath" }
    },
    "outputMapping": {
      "type": "wrap",
      "wrapTemplate": {
        "filepath": "${input.filepath}",
        "content": "${output}"
      }
    }
  }
}
```

---

### 3. Transform Task

**JavaScript 数据转换**

#### 配置
```typescript
{
  type: "transform",
  config: {
    script: string  // JavaScript 表达式
  }
}
```

#### 功能
- ✅ 支持 JavaScript 表达式
- ✅ 访问当前输入（`input`）
- ✅ 访问之前的输出（`state`）
- ✅ 沙箱执行（限制全局对象）

#### 可用变量
- `input` - 当前输入
- `state` - 之前所有 Task 的输出（`{ taskId: output }`）
- `JSON` - JSON 对象
- `Math` - Math 对象
- `Date` - Date 对象

#### 示例

**1. 简单转换**
```json
{
  "config": {
    "script": "input.toUpperCase()"
  }
}
```

**2. 提取字段**
```json
{
  "config": {
    "script": "input.issues.length"
  }
}
```

**3. 生成对象**
```json
{
  "config": {
    "script": "{ filepath: input.filepath, issues: input.issues || [], summary: `Found ${input.issues?.length || 0} issues` }"
  }
}
```

**4. 访问之前的输出**
```json
{
  "config": {
    "script": "{ file: state['task-read'], analysis: input }"
  }
}
```

---

## 使用指南

### 创建 Node

#### 步骤 1: 打开 Node 面板
1. 点击右下角悬浮按钮
2. 选择"节点"

#### 步骤 2: 填写基础信息
- **节点名称**：小写字母、数字、下划线，3-50 字符，以字母开头
- **节点描述**：最多 200 字符
- **执行模式**：Direct 或 Pipeline

#### 步骤 3: 配置执行模式

**Direct 模式**：
- 填写 System Prompt
- 选择 LLM 模型
- 设置 Temperature

**Pipeline 模式**：
- 点击"+ 添加 Task"
- 配置每个 Task（名称、类型、配置）
- 按需调整 Task 顺序

#### 步骤 4: 选择工具（可选）
- 在"允许的工具"中勾选需要的工具
- 只有勾选的工具才能在 Tool Call Task 中使用

#### 步骤 5: 保存
- 点击"保存"按钮
- 检查是否有验证错误

---

### 装配 Node

#### 装配
1. 在节点列表中找到目标 Node
2. 点击"装配"按钮
3. 成功后按钮变为"✓ 已装配"

#### 使用
在对话框中使用装配的 Node：

```
帮我用 <node_name> 处理 <input>
```

例如：
```
帮我用 code_analyzer 分析 src/auth.ts
```

#### 卸载
1. 在节点列表中找到已装配的 Node
2. 点击"✓ 已装配"按钮
3. 确认卸载

---

### 编辑 Node

1. 在节点列表中点击"编辑"按钮
2. 修改配置
3. 点击"保存"
4. **注意**：如果 Node 已装配，修改后需要**重新装配**才能生效

---

### 删除 Node

1. 在节点列表中点击"删除"按钮
2. 确认删除
3. **注意**：删除操作不可恢复

---

## API 参考

### Node API

#### GET /api/tohelper/node/list
获取所有 Node

**响应**:
```json
{
  "ok": true,
  "nodes": [ /* NodeConfig[] */ ],
  "equipped": [ "node-id-1", "node-id-2" ]
}
```

#### POST /api/tohelper/node/create
创建 Node

**请求**:
```json
{
  "name": "my_node",
  "description": "My node description",
  "executionMode": "direct",
  "systemPrompt": "You are...",
  "llm": { "provider": "deepseek-official", "model": "deepseek-chat" }
}
```

**响应**:
```json
{
  "ok": true,
  "node": { /* NodeConfig */ }
}
```

#### POST /api/tohelper/node/update
更新 Node

**请求**:
```json
{
  "id": "node-xxx",
  "name": "updated_name",
  ...
}
```

#### POST /api/tohelper/node/delete
删除 Node

**请求**:
```json
{
  "id": "node-xxx"
}
```

#### POST /api/tohelper/node/equip
装配 Node

**请求**:
```json
{
  "id": "node-xxx"
}
```

#### POST /api/tohelper/node/unequip
卸载 Node

**请求**:
```json
{
  "id": "node-xxx"
}
```

### Task API

#### GET /api/tohelper/task/types
获取所有 Task 类型

**响应**:
```json
{
  "ok": true,
  "types": ["llm-call", "tool-call", "transform"]
}
```

---

## 最佳实践

### Node 设计

#### 1. 颗粒度适中
- ✅ 一个 Node = 一个明确的业务职责
- ❌ 不要过细（一个 Node 只做一件琐碎的事）
- ❌ 不要过粗（一个 Node 做太多事情）

#### 2. 命名清晰
- ✅ 使用动词+名词：`analyze_code`, `translate_text`
- ❌ 避免模糊名称：`helper`, `processor`

#### 3. 描述详细
- ✅ 说明输入和输出
- ✅ 说明适用场景
- ❌ 不要只写一个单词

### Pipeline 设计

#### 1. Task 职责单一
每个 Task 只做一件事：
- ✅ Task 1: 读文件
- ✅ Task 2: 分析
- ✅ Task 3: 格式化
- ❌ Task 1: 读文件+分析+格式化

#### 2. 数据流清晰
- ✅ 使用 Transform Task 调整数据格式
- ✅ 使用输入/输出映射控制数据流
- ❌ 不要依赖隐式的数据结构

#### 3. 错误处理
- ✅ 在 System Prompt 中说明错误情况
- ✅ 使用 Transform Task 验证数据
- ❌ 不要假设数据一定正确

### LLM 配置

#### 1. Temperature 选择
- **0.0-0.3**: 确定性任务（翻译、格式化）
- **0.5-0.7**: 平衡任务（分析、总结）
- **0.8-1.0**: 创造性任务（写作、头脑风暴）

#### 2. Task 级覆盖
在 Pipeline 中，不同 Task 可以用不同的 LLM：
- Task 1（查找）: deepseek-chat, temperature=0.3
- Task 2（生成方案）: deepseek-chat, temperature=0.7
- Task 3（执行）: deepseek-chat, temperature=0.5

---

## 故障排查

### 问题 1: Node 保存失败

**症状**: 点击保存后提示错误

**可能原因**:
1. 节点名称不符合规则
2. Direct 模式缺少 System Prompt
3. Pipeline 模式没有 Task

**解决**:
- 检查表单验证错误提示
- 确保必填字段都已填写

### 问题 2: Node 装配失败

**症状**: 点击装配后提示错误

**可能原因**:
1. 没有 active agent
2. 节点名称与现有工具冲突

**解决**:
- 刷新页面重新连接
- 修改节点名称

### 问题 3: Pipeline 执行失败

**症状**: 使用 Node 后返回错误

**可能原因**:
1. Tool 不存在或未装配
2. Task 配置错误
3. 数据格式不匹配

**解决**:
- 查看错误日志中的 Execution log
- 检查每个 Task 的配置
- 使用简单的 Pipeline 测试

### 问题 4: Tool Call Task 找不到工具

**症状**: `Tool "xxx" not allowed in this Node`

**可能原因**:
- 工具未在 Node 的"允许的工具"中勾选

**解决**:
- 编辑 Node
- 在"允许的工具"中勾选对应工具
- 保存并重新装配

---

## 附录

### 配置文件位置
```
/home/dustp/codes/deepseek-harness/data/node-config.json
```

### 日志位置
- 浏览器控制台（F12 → Console）
- dsh 服务器日志

### 相关文档
- [Host 端设计](./1.host端设计.md)
- [Client 端设计](./2.client端设计.md)
- [快速测试指南](./4.快速测试指南.md)

---

**版本**: v1.0  
**最后更新**: 2026-08-30
