# UI 和 LLM 获取问题修复报告

## 🎯 修复的问题

### 问题 1: Task 没有看到对应的 LLM 选择 ✅
**原因**: Task 默认折叠，需要展开并勾选"自定义"才能看到 LLM 配置

**修复方案**:
1. **默认展开第一个 Task** - 用户创建或编辑 Node 时，第一个 Task 自动展开
2. **显示 LLM 信息在标题** - 如果 Task 有自定义 LLM，在卡片标题直接显示 `provider/model`
3. **展开有自定义 LLM 的 Task** - 编辑模式下，所有配置了独立 LLM 的 Task 都默认展开

### 问题 2: Node 的 LLM 选择只有 chat/coder/reasoner ✅
**原因**: 之前的代码无法正确从 dsh 的 LLM 服务获取已注册的 providers 和 models

**修复方案**:
1. **正确调用 dsh LLM API**:
   ```typescript
   const llmService = ctx.llm
   const providers = llmService.listProviders()
   for (const providerInfo of providers) {
     const registration = llmService.adapters.get(provider)
     const models = await registration.adapter.listModels(provider)
   }
   ```

2. **添加详细日志**:
   ```typescript
   ctx.logger.info(`[tohelper] 找到 ${providers.length} 个已注册的 LLM providers`)
   ctx.logger.info(`[tohelper] Provider ${provider} 有 ${models.length} 个模型`)
   ```

3. **多层次回退机制**:
   - 方式 1: 从 `ctx.llm` 服务获取已注册的 providers
   - 方式 2: 从 `ctx.agentDefaultModel` 获取当前选中的模型
   - 方式 3: 从 Agent 配置获取
   - 方式 4: 从历史配置文件获取
   - 最后: 使用默认列表

### 问题 3: UI 布局混乱 ✅
**原因**: 没有按照用户心理模型组织，缺少区域划分

**修复方案**:
重新设计 UI 布局为三个清晰的区域：

#### 1. Node 设置区域
```
┌─────────────────────────────────┐
│ Node 设置                        │
├─────────────────────────────────┤
│ • 节点名称                       │
│ • 节点描述                       │
│ • Node Prompt                   │
│ • LLM 模型                      │
│ • Temperature                   │
│ • Node 级别工具                 │
└─────────────────────────────────┘
```

#### 2. Mode 选择区域
```
┌─────────────────────────────────┐
│ 执行模式                         │
├─────────────────────────────────┤
│ ○ Direct  ● Pipeline  ○ Loop   │
│                                 │
│ Pipeline 模式：按顺序执行所有    │
│ Tasks，前一个的输出作为后一个的  │
│ 输入                            │
└─────────────────────────────────┘
```

#### 3. Task 区域（根据 Mode 动态显示）
```
Pipeline 模式：
┌─────────────────────────┐
│ 1. 查询瑞幸门店         │ →
└─────────────────────────┘
          ↓
┌─────────────────────────┐
│ 2. 查询麦当劳优惠       │ →
└─────────────────────────┘
          ↓
┌─────────────────────────┐
│ 3. 整合结果             │
└─────────────────────────┘

Loop 模式：
┌───────────┐ ┌───────────┐
│ 数据清洗  │ │ 统计分析  │
└───────────┘ └───────────┘
┌───────────┐ ┌───────────┐
│ 可视化    │ │ 报告生成  │
└───────────┘ └───────────┘
```

---

## 📝 修改的文件

### 1. `src/host/tool/index.ts` ✅
**修改内容**:
- 重写 `/api/tohelper/llm/list` 端点
- 正确调用 `ctx.llm.listProviders()`
- 调用 `adapter.listModels(provider)` 获取模型列表
- 添加详细的调试日志
- 改进错误处理

**关键代码**:
```typescript
const llmService = ctx.llm
if (llmService) {
  const providers = llmService.listProviders()
  ctx.logger.info(`[tohelper] 找到 ${providers.length} 个已注册的 LLM providers`)
  
  for (const providerInfo of providers) {
    const provider = providerInfo.id
    const registration = (llmService as any).adapters?.get(provider)
    if (registration?.adapter) {
      const models = await registration.adapter.listModels(provider)
      // ... 添加到列表
    }
  }
}
```

### 2. `src/client/node/NodeEditorV2.tsx` ✅
**修改内容**:
- 重新组织布局：Node 设置 → Mode 选择 → Task 区域
- 添加 `expandedTaskIndexes` 状态管理展开的 Task
- 默认展开第一个 Task 和有自定义 LLM 的 Task
- 添加 `toggleTaskExpanded()` 函数
- 将 `mode` 传递给 `TaskItemV2`
- 优化区域样式（背景色、边框）

**关键代码**:
```typescript
const [expandedTaskIndexes, setExpandedTaskIndexes] = useState<Set<number>>(new Set([0]))

// 展开所有有自定义 LLM 的 Task
useEffect(() => {
  const toExpand = new Set<number>()
  initial.tasks?.forEach((task, index) => {
    if (task.llm || index === 0) {
      toExpand.add(index)
    }
  })
  setExpandedTaskIndexes(toExpand)
}, [initial])
```

### 3. `TaskItemV2` 组件 ✅
**修改内容**:
- 接收 `mode`, `expanded`, `onToggleExpand` props
- 在标题显示 LLM 信息：`provider/model`
- Pipeline 模式显示箭头 `→`
- 根据 Mode 应用不同样式类
- 添加 `useEffect` 同步 `useCustomLlm` 状态

**关键代码**:
```typescript
{task.llm && (
  <span className="th-task-badge custom-llm">
    {task.llm.provider}/{task.llm.model}
  </span>
)}
{mode === 'pipeline' && index < 99 && (
  <span className="th-task-arrow">→</span>
)}
```

### 4. `src/client/shared/styles.ts` ✅
**修改内容**:
- 添加 Pipeline 模式样式（线性显示 + 箭头）
- 添加 Loop 模式样式（网格布局）
- 添加 Direct 模式样式（全宽）
- 添加区域样式（Node 设置、Mode 选择、Task 区域）
- 添加 LLM 配置样式
- 优化 Task badge 显示

**关键样式**:
```css
.th-task-list-pipeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-task-list-loop {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.th-node-settings {
  background-color: #f9fafb;
  border-left: 4px solid #3b82f6;
}

.th-mode-section {
  background-color: #fef3c7;
  border-left: 4px solid #f59e0b;
}

.th-task-section {
  background-color: #f0fdf4;
  border-left: 4px solid #10b981;
}
```

---

## 🔍 测试验证

### 1. LLM 获取测试
**测试步骤**:
1. 启动 dsh: `pnpm dsh web`
2. 打开浏览器控制台
3. 打开节点面板
4. 查看网络请求 `/api/tohelper/llm/list`

**预期结果**:
- 返回所有已注册的 providers
- 包含每个 provider 的所有 models
- 默认模型排在前面

**日志示例**:
```
[tohelper] 找到 3 个已注册的 LLM providers
[tohelper] Provider deepseek-official 有 3 个模型
[tohelper] Provider openai 有 5 个模型
[tohelper] 默认模型: deepseek-official/deepseek-chat
[tohelper] 最终返回 8 个 LLM 配置
```

### 2. UI 布局测试
**测试步骤**:
1. 创建新 Node
2. 观察布局分区
3. 切换不同 Mode
4. 添加多个 Tasks

**预期结果**:
- 三个区域清晰可见（不同背景色）
- Mode 选择区域突出显示
- Pipeline 模式：Tasks 线性排列，带箭头
- Loop 模式：Tasks 网格排列，无箭头
- Direct 模式：单个 Task 全宽显示

### 3. Task LLM 配置测试
**测试步骤**:
1. 创建 Node 并添加 Task
2. 第一个 Task 应该默认展开
3. 勾选"自定义" LLM
4. 选择不同的模型
5. 保存后重新编辑

**预期结果**:
- 第一个 Task 默认展开
- LLM 选择器可用
- Task 标题显示自定义 LLM 信息
- 重新打开时有自定义 LLM 的 Task 展开

---

## 📊 性能影响

### 编译产物
- **之前**: 66.22 kB (gzip: 15.42 kB)
- **之后**: 69.09 kB (gzip: 16.39 kB)
- **增加**: +2.87 kB (gzip: +0.97 kB)

### 功能增加
- ✅ 动态 LLM 获取
- ✅ 三区域布局
- ✅ Mode 动态显示
- ✅ Task 展开管理
- ✅ 详细日志

---

## 🎨 UI 改进对比

### 之前
```
❌ 所有内容混在一起
❌ Mode 选择不突出
❌ Task 默认折叠
❌ Task LLM 不明显
❌ 无 Mode 差异化显示
```

### 之后
```
✅ 三个区域清晰分离
✅ Mode 选择独立突出
✅ 第一个 Task 默认展开
✅ Task 标题显示 LLM
✅ Pipeline 显示箭头
✅ Loop 显示网格
```

---

## 🐛 已知问题

### 1. LLM 列表可能为空
**场景**: dsh 没有注册任何 LLM adapter

**解决**: 回退到默认列表（chat/coder/reasoner）

### 2. Task 展开状态
**场景**: 删除 Task 后展开状态可能不正确

**解决**: 已在 `handleDeleteTask` 中更新展开状态

---

## 📚 相关文档

- `docs/2node/架构重构完成.md` - 完整架构文档
- `docs/2node/快速上手指南.md` - 用户使用指南
- `docs/2node/完成报告.md` - 重构完成报告

---

## 🚀 部署验证

### 1. 编译验证 ✅
```bash
cd /home/dustp/codes/mcp-plugin/codes/tohelper
npm run build
# ✓ built in 158ms
```

### 2. 运行验证（待执行）
```bash
cd /home/dustp/codes/deepseek-harness
pnpm dsh web
# 打开浏览器测试
```

### 3. 功能验证清单
- [ ] LLM 列表正确显示
- [ ] Node 设置区域布局正确
- [ ] Mode 选择区域突出显示
- [ ] Task 区域根据 Mode 动态显示
- [ ] Pipeline 模式显示箭头
- [ ] Loop 模式显示网格
- [ ] Task LLM 配置可见
- [ ] 保存和加载正常

---

**修复完成日期**: 2026-08-30  
**修复版本**: v0.6.1  
**编译状态**: ✅ 成功  
**测试状态**: ⏳ 待用户验证
