# Node 工作画板：Node 与 Task 拖动缩放方案

> 状态：设计评审稿
>
> 目标：在 Node 面板中增加工作画板，使 Node 与内部 Task 可视化展示，并支持 Node、Task 的拖动与缩放。
>
> 本文只描述方案，不包含代码修改。

## 1. 背景与目标

当前 Node 面板采用“Node 列表”和“Node 编辑器”二选一的方式展示。该方式适合编辑单个对象，但不适合观察多个 Node 的整体关系，也不能直观看出一个 Node 内部包含哪些 Task、Task 在不同执行模式下如何组织。

本方案将 Node 面板改造成左右分栏的工作区：

```text
┌──────────────────────────────────────────────────────────────┐
│ Node 工作画板                                          关闭  │
├──────────────────────────────────┬───────────────────────────┤
│                                  │                           │
│  画板工具栏                       │  属性检查器               │
│  ＋ 创建 Node   缩放   排列       │  当前 Node / Task 配置    │
│                                  │                           │
│  Node 画布                        │  表单编辑区               │
│  ┌──────────── Node ───────────┐ │                           │
│  │       Task 1                │ │                           │
│  │          ↓                 │ │                           │
│  │       Task 2                │ │                           │
│  └────────── Node 底座 ────────┘ │                           │
│                                  │                           │
└──────────────────────────────────┴───────────────────────────┘
```

目标包括：

1. 点击悬浮按钮中的 Node 后，直接打开 Node 工作画板。
2. 画板左侧显示所有 Node，右侧显示当前选中 Node 或 Task 的编辑器。
3. Node 内部提供添加 Task 的入口。
4. Node 和 Task 都支持拖动。
5. Node 和 Task 都支持缩放。
6. Direct、Pipeline、Loop 三种模式使用不同的视觉布局和连接关系。
7. Node 与 Task 的位置、缩放比例和折叠状态可以持久化。
8. 画板操作不改变执行语义：Pipeline 的 Task 顺序仍由明确的顺序字段决定，不能由像素位置隐式决定。

## 2. 设计原则

### 2.1 画板是可视化编排层，配置表单是属性编辑层

左侧画板负责：

- 展示 Node 与 Task 的层级关系。
- 展示执行模式。
- 展示 Pipeline 的顺序连接。
- 展示 Loop 的无序任务池。
- 选择、拖动、缩放和折叠对象。
- 创建 Node 和添加 Task。

右侧检查器负责：

- 编辑 Node 的名称、描述、Node Prompt、LLM、Tools、执行模式等字段。
- 编辑 Task 的名称、描述、Task Prompt、LLM、Tools、输出格式等字段。
- 显示当前对象的校验错误。
- 保存服务端数据。

画板不直接承担复杂表单编辑，表单也不负责推断画板布局。两者通过选中对象 ID 关联。

### 2.2 视觉位置与执行顺序分离

拖动 Task 只能改变 Task 在画板中的位置，不应默认改变执行顺序。

对于 Pipeline：

- 执行顺序由 `order` 字段确定。
- 连接线根据 `order` 绘制。
- 拖动只改变 `position`。
- 如果需要调整执行顺序，使用明确的“调整顺序”操作，或在后续版本增加排序拖拽模式。

这样可以避免用户只是为了整理画面而拖动 Task，却意外改变业务执行逻辑。

### 2.3 缩放分为对象缩放和画布缩放

“缩放”需要明确区分两种行为：

1. **对象缩放**：改变某个 Node 或 Task 在画板中的尺寸，影响该对象的布局区域，不改变配置内容。
2. **画布缩放**：改变整个画板的视图比例，用于查看大规模布局，不改变任何对象的实际尺寸数据。

界面必须提供清晰反馈，避免用户无法判断自己缩放的是对象还是整个画板。

推荐交互：

- 拖动 Node 或 Task 的边缘/右下角控制点：对象缩放。
- `Ctrl/Cmd + 滚轮`：画布缩放。
- 画板工具栏提供 `+`、`-`、`100%` 和“适应画布”。
- 普通滚轮：画板滚动。
- 空白区域拖动：画布平移。

## 3. 数据模型方案

当前类型中 `NodeConfig` 包含 Node 配置、执行模式和 `tasks`，`TaskConfig` 包含 Task 配置，但两者都没有画布布局信息。因此建议增加独立的布局字段，而不是把位置字段混入业务配置字段。

### 3.1 推荐的数据结构

```ts
interface CanvasPoint {
  x: number
  y: number
}

interface CanvasSize {
  width: number
  height: number
}

interface CanvasItemLayout {
  position: CanvasPoint
  size: CanvasSize
  collapsed?: boolean
  zIndex?: number
}

interface NodeCanvasLayout {
  version: 1
  viewport?: {
    x: number
    y: number
    zoom: number
  }
  nodes: Record<string, CanvasItemLayout>
  tasks: Record<string, CanvasItemLayout>
}
```

Node 配置建议增加可选字段：

```ts
interface NodeConfig {
  // 现有业务字段
  id: string
  name: string
  description?: string
  nodePrompt: string
  llm: LLMSlot
  mode: ExecutionMode
  tasks: TaskConfig[]
  tools: string[]

  // 新增：画板布局信息
  canvasLayout?: NodeCanvasLayout

  // 现有 schema 和元数据
  inputSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}
```

### 3.2 为什么布局放在 Node 内部

Task 是 Node 的内部对象，Task 的画布位置只有在所属 Node 的上下文中才有意义。因此建议将 Node 和 Task 的布局统一放在 `NodeConfig.canvasLayout` 下，而不是给每个 Task 单独增加顶层布局对象。

优点：

- 一个 Node 的业务配置与自己的布局一起导出。
- 删除 Node 时不需要额外清理独立的布局记录。
- Task ID 只需要在 Node 内保证唯一。
- 旧配置没有 `canvasLayout` 时可以自动生成默认布局。

### 3.3 为什么仍然使用 ID 映射

不建议把布局直接按数组下标保存，因为 Task 的新增、删除和排序都会导致下标变化。

推荐：

```ts
canvasLayout.tasks[task.id] = {
  position: { x: 120, y: 180 },
  size: { width: 180, height: 72 },
  collapsed: true,
}
```

这样 Task 顺序变化不会导致其他 Task 的位置错误关联。

### 3.4 布局版本

布局结构必须带 `version`：

```ts
canvasLayout: {
  version: 1,
  // ...
}
```

后续增加锚点、端口、分组或连线配置时，可以通过版本迁移处理，不影响业务配置迁移。

### 3.5 服务端兼容策略

`canvasLayout` 应为可选字段：

- 旧 Node 没有该字段时，前端使用默认布局。
- 用户第一次移动或缩放后再写入布局。
- 服务端读取和保存时保留未知字段，避免旧版本覆盖新布局。
- 如果当前服务端有严格 Schema 校验，需要同步允许 `canvasLayout` 字段。

## 4. 画板布局结构

### 4.1 Node 的视觉形态

建议采用“热气球隐喻的扁平化版本”：

- Node 主体是一个大号圆角容器或轻微弧形边界。
- Node 底部是明显的底座，显示名称、模式和 Task 数量。
- Task 位于 Node 主体内部。
- 选中 Node 时，主体边界和底座同时高亮。
- 不使用复杂的气球插画，避免装饰干扰连接线、文字和编辑操作。

示意：

```text
              Node 主体区域
        ╭────────────────────╮
        │       Task 1        │
        │          ↓          │
        │       Task 2        │
        ╰────────────────────╯
        ┌────────────────────┐
        │ Node 名称 · Pipeline│
        └────────────────────┘
```

### 4.2 Node 的可操作区域

Node 需要同时支持选择、拖动、缩放和折叠，因此操作区域必须区分：

- Node 标题栏：点击选中，拖动整个 Node。
- Node 主体空白区域：点击选中，拖动整个 Node。
- Node 右下角：对象缩放控制点。
- Node 标题栏右侧：折叠/展开按钮。
- Node 底座中的添加 Task 按钮：创建 Task，不触发 Node 拖动。
- Task 卡片：点击选择 Task，拖动 Task，不触发 Node 拖动。

事件处理必须阻止子节点事件冒泡到 Node 拖动逻辑，否则点击或拖动 Task 会同时移动 Node。

### 4.3 Task 的可操作区域

Task 节点建议保持紧凑：

```text
┌────────────────────────┐
│ ①  Task 名称       ▼  │
│     LLM · Tools · 输出 │
└────────────────────────┘
```

Task 支持：

- 点击 Task：选中并打开右侧 Task 检查器。
- 拖动 Task 标题栏：移动 Task。
- 拖动右下角：缩放 Task。
- 点击折叠按钮：收起 Task 内容，只保留摘要。
- 点击删除按钮：删除 Task，并同步更新连接线和布局。

Task 的缩放只改变画板节点外观，不改变右侧表单的字段尺寸。

## 5. 三种执行模式的画板规则

## 5.1 Direct 模式

Direct Node 只允许一个 Task。

布局：

```text
        ╭────────────────╮
        │     Task 1     │
        ╰───────┬────────╯
                │
        ┌───────┴────────┐
        │   Direct Node  │
        └─────────────────┘
```

规则：

- Node 创建后可以自动创建一个默认 Task，或者显示添加 Task 引导。
- 已有一个 Task 时，添加 Task 按钮变为禁用状态。
- 画板只显示单个 Task。
- Task 与 Node 底座之间显示一条简单连接线。
- Task 可拖动，但不能拖出 Node 的有效区域；如果拖动到边界，自动限制在 Node 内部。
- Node 缩放时，Task 按相对坐标保持位置。
- Direct 切换到其他模式时，不删除已有 Task。
- Pipeline 或 Loop 切换回 Direct 时，如果存在多个 Task，应显示校验提示，而不是静默删除 Task。

## 5.2 Pipeline 模式

Pipeline 需要明确展示顺序。

布局：

```text
        ╭────────────────╮
        │ ①  Task A      │
        ╰───────┬────────╯
                ↓
        ╭────────────────╮
        │ ②  Task B      │
        ╰───────┬────────╯
                ↓
        ╭────────────────╮
        │ ③  Task C      │
        ╰────────────────╯
        ┌─────────────────┐
        │ Pipeline Node   │
        └─────────────────┘
```

规则：

- 默认布局为纵向排列。
- 连接线根据 Task 的 `order` 字段绘制。
- 连接线位于 Task 卡片之间，不放在 Task 标题栏内部。
- Task 可以自由拖动，但连接线随 Task 位置更新。
- Task 的拖动不改变 `order`。
- 新增 Task 默认追加到顺序末尾，并放在最后一个 Task 的下方。
- 删除 Task 后重新计算连接线，但不强制重排其他 Task 的位置。
- 可以在 Task 卡片上显示顺序编号。
- 建议后续增加独立的“调整顺序”模式，避免普通画布拖动改变执行语义。

### Pipeline 顺序调整的两个阶段

第一阶段：

- 普通拖动只改位置。
- 使用 Task 卡片上的“上移”和“下移”按钮调整 `order`。

第二阶段：

- 增加“排序模式”。
- 在排序模式下拖动 Task 到其他 Task 上方才改变执行顺序。
- 排序模式下显示明确提示，例如“当前拖动会改变执行顺序”。

不建议第一版直接使用自由拖动推断 Pipeline 顺序。

## 5.3 Loop 模式

Loop 表示由 LLM 动态选择 Task，不能用固定方向的顺序连接表达。

布局：

```text
          ╭────────────╮
          │  Task A    │
          ╰────────────╯

    ╭────────────╮      ╭────────────╮
    │  Task B    │      │  Task C    │
    ╰────────────╯      ╰────────────╯

          ╭────────────╮
          │ Loop Node  │
          │ 动态调度   │
          ╰────────────╯
```

规则：

- 默认使用网格布局，避免暗示固定顺序。
- 不显示 Task 之间的顺序箭头。
- Task 可以在 Node 主体区域内自由拖动。
- 可以用轻量环形标识表示“动态调度”，但不要绘制具体 Task 之间的固定连线。
- Task 的编号只用于识别时，应避免使用容易被理解为执行顺序的样式。
- 新增 Task 自动放入网格的下一个空位置。
- Node 底座显示 `Loop · 动态调度`。

## 6. 拖动方案

### 6.1 拖动状态

拖动过程中至少需要维护：

```ts
interface DragState {
  kind: 'node' | 'task'
  id: string
  startPointer: { x: number; y: number }
  startPosition: { x: number; y: number }
  pointerOffset: { x: number; y: number }
}
```

计算位置时需要考虑当前画布缩放比例：

```text
对象位移 = 指针位移 / 画布 zoom
```

否则画布放大或缩小时，拖动速度会不一致。

### 6.2 Node 拖动

Node 拖动规则：

- 只能通过 Node 标题栏或主体空白区域开始。
- 拖动 Node 时，Node 内部 Task 的绝对画布位置可以整体平移。
- 更推荐保存 Task 相对于 Node 的位置，这样 Node 移动时 Task 关系稳定。
- Node 不允许被拖出画布可见工作区域，至少保留标题栏可重新抓取。
- 多选拖动可以留到后续版本。

推荐使用相对坐标：

```ts
interface CanvasItemLayout {
  position: {
    x: number
    y: number
  }
  // Task 在 Node 内部使用相对坐标
}
```

Node 位置是画布坐标，Task 位置是 Node 内容区域坐标。渲染时再计算 Task 的实际画布坐标。

### 6.3 Task 拖动

Task 拖动规则：

- Task 只能在所属 Node 内移动。
- Task 拖动到 Node 边界时进行边界限制。
- 拖动时显示位置辅助线或吸附提示，但不自动改变 Pipeline 顺序。
- Loop 模式可以自由排列。
- Direct 模式只存在一个 Task。
- 拖动结束后使用防抖保存布局，或在显式保存时统一提交。

### 6.4 拖动与编辑的区分

需要区分点击和拖动：

- 指针移动距离小于 3 至 5 像素：视为点击。
- 超过阈值：视为拖动。
- 点击打开检查器。
- 拖动结束后不重复触发点击选择逻辑，避免选中状态闪烁或打开错误编辑器。

当前悬浮按钮已经采用类似的“移动阈值后才算拖动”逻辑，画板可以沿用该行为模式。

## 7. 对象缩放方案

### 7.1 缩放手柄

Node 和 Task 右下角显示缩放手柄：

```text
┌────────────────────┐
│                    │
│                    │
│                 ◢  │  ← resize handle
└────────────────────┘
```

手柄要求：

- 只有选中对象时显示。
- 触控区域至少 12 至 16 像素。
- 鼠标悬停时显示 `nwse-resize` 光标。
- 缩放事件不能冒泡成拖动事件。
- 缩放结束后保存 `size`。

### 7.2 最小和最大尺寸

建议定义统一限制：

```ts
const NODE_MIN_SIZE = { width: 300, height: 240 }
const NODE_MAX_SIZE = { width: 1200, height: 900 }
const TASK_MIN_SIZE = { width: 150, height: 64 }
const TASK_MAX_SIZE = { width: 480, height: 360 }
```

实际数值应根据面板可用空间调整，但必须保证：

- 标题、折叠按钮和删除按钮始终可见。
- Node 内部 Task 不因缩放而溢出到其他 Node。
- Task 文字长时换行或省略，不撑大父容器。
- 缩放尺寸以画布坐标保存，不受当前 viewport zoom 影响。

### 7.3 Node 缩放时的内部布局

Node 缩放不能破坏 Task 布局。建议分两种情况：

- 放大 Node：保留 Task 的相对坐标和实际尺寸，空白区域增加。
- 缩小 Node：对 Task 位置进行边界限制；必要时将超出边界的 Task 移到最近可见位置。

不建议自动按比例缩放所有 Task，因为这会让 Task 文字过小，并且用户无法预测结果。

### 7.4 对象缩放与内容折叠

折叠状态和尺寸必须独立保存：

```ts
{
  position: { x: 120, y: 80 },
  size: { width: 220, height: 80 },
  collapsed: true
}
```

折叠对象再次展开时恢复展开前尺寸，而不是使用折叠后的高度覆盖原尺寸。

## 8. 画布缩放、平移和导航

### 8.1 Viewport 状态

画布需要维护：

```ts
interface CanvasViewport {
  x: number
  y: number
  zoom: number
}
```

其中：

- `x`、`y` 表示画布平移偏移。
- `zoom` 表示画布视图缩放比例。
- viewport 只影响观察方式，不改变 Node/Task 的布局尺寸。

### 8.2 交互规则

推荐交互：

- 空白区域拖动：平移画布。
- `Ctrl/Cmd + 滚轮`：以指针位置为中心缩放画布。
- 工具栏 `+`：放大视图。
- 工具栏 `-`：缩小视图。
- `100%`：恢复默认比例。
- “适应画布”：计算所有 Node 的边界并自动居中。
- “定位选中项”：将当前 Node 或 Task 滚动到可视区域中心。

### 8.3 缩放范围

建议：

```text
最小 zoom: 0.5
默认 zoom: 1
最大 zoom: 2
```

如果 Node 数量较多，最小值可以降低到 `0.35`，但不应让文字完全无法辨识。

### 8.4 画布背景

画布可以使用浅色网格背景帮助用户理解空间位置，但网格应保持低对比度：

- 不使用强烈渐变。
- 不使用装饰性光晕。
- 网格不应比 Node 边界更醒目。
- 选中对象和连接线必须有足够对比度。

## 9. 右侧属性检查器

### 9.1 未选中状态

当没有选中对象时，右侧显示引导内容：

```text
选择一个 Node 或 Task
查看并编辑它的配置
```

同时保留“创建 Node”入口，避免用户必须先理解画板操作。

### 9.2 选中 Node

右侧标题显示：

```text
Node 配置
query_nearby_deals · Pipeline
```

字段分组：

1. 基本信息：名称、描述。
2. Node 目标：Node Prompt。
3. Node 默认 LLM：Provider、Model、Temperature。
4. Node 级 Tools。
5. 执行模式：Direct、Pipeline、Loop。
6. Tasks 概览：Task 数量、添加 Task、全部展开/折叠。

### 9.3 选中 Task

右侧顶部保留上下文路径：

```text
Node: query_nearby_deals
└── Task: 查找瑞幸门店
```

字段分组：

1. Task 基本信息：名称、描述。
2. Task Prompt。
3. LLM：继承 Node 或自定义。
4. Tools：Task 级工具。
5. 输出格式。
6. Pipeline 顺序：显示当前顺序，提供上移/下移操作。

### 9.4 表单编辑与画板同步

右侧表单编辑时：

- 名称变化实时同步到画板节点标题。
- 模式变化实时切换画板布局。
- Task 数量变化实时更新 Node 底座计数。
- 连接线根据模式和 Task 列表实时刷新。
- 保存失败时保留当前画板和表单状态，并在右侧显示错误。

## 10. 创建、删除和保存流程

### 10.1 创建 Node

推荐采用本地草稿方式：

1. 点击画板顶部“创建 Node”。
2. 生成带临时 ID 的 Node 草稿。
3. 将其放置在画布中心或当前可视区域中心。
4. 自动选中新 Node。
5. 右侧打开 Node 检查器。
6. 用户填写必要字段。
7. 点击保存后调用 `nodeApi.create`。
8. 服务端返回正式 ID 后，替换临时 ID，并保存布局。

这样可以避免用户点击创建后取消，却在服务端留下空 Node。

### 10.2 添加 Task

1. 点击 Node 底座或 Node 检查器中的“添加 Task”。
2. 生成临时 Task ID。
3. 根据模式计算默认位置。
4. 自动选中新 Task。
5. 右侧打开 Task 检查器。
6. 保存 Node 时一起提交 Task。

Direct 模式下：

- 已有 Task 时不允许继续添加。
- 按钮显示原因，而不是完全隐藏。

Pipeline 模式下：

- 新 Task 追加到顺序末尾。
- 位置放在现有最下方。

Loop 模式下：

- 新 Task 放入网格的下一个位置。

### 10.3 删除对象

删除 Node：

- 删除 Node 及其所有 Task。
- 清理当前选中状态。
- 如果删除的是临时草稿，只清理本地状态。
- 删除已保存 Node 前需要确认。

删除 Task：

- 清理 Task 的布局记录。
- 清理当前选中状态。
- Pipeline 重新绘制连接线。
- 不自动改变其他 Task 的画布位置。
- 重新计算顺序编号展示。

### 10.4 保存策略

建议分为两类保存：

1. **业务配置保存**：点击右侧或底部“保存”，提交 Node、Task 和布局。
2. **布局保存**：拖动或缩放结束后进行防抖保存，或先标记为未保存，在用户点击保存时统一提交。

第一版推荐：

- 所有修改先保存在前端状态。
- 拖动和缩放只修改本地布局状态。
- 用户点击“保存”时统一调用 Node API。
- 离开当前 Node 前，如果存在未保存修改，显示确认提示。

这样可以保证业务字段与布局字段保持同一版本，避免布局已保存而表单尚未保存的中间状态。

## 11. 组件拆分建议

建议将当前 Node 面板拆分为以下组件：

```text
NodePanel
├── NodeWorkspace
│   ├── WorkspaceToolbar
│   ├── NodeCanvas
│   │   ├── CanvasViewport
│   │   ├── CanvasGrid
│   │   ├── NodeCanvasItem
│   │   │   ├── NodeHeader
│   │   │   ├── TaskCanvasItem[]
│   │   │   ├── PipelineEdges
│   │   │   └── ResizeHandle
│   │   └── CanvasEmptyState
│   └── NodeInspector
│       ├── EmptyInspector
│       ├── NodeInspectorForm
│       └── TaskInspectorForm
└── WorkspaceFooter
```

职责建议：

- `NodePanel`：加载 Node、Tools、LLM，处理 API 保存、删除和装配。
- `NodeWorkspace`：维护选中对象、拖动状态、缩放状态和本地草稿。
- `NodeCanvas`：渲染画布、viewport 和对象布局。
- `NodeCanvasItem`：渲染单个 Node 及其内部 Task。
- `PipelineEdges`：只负责 Pipeline 连接线，不参与表单逻辑。
- `NodeInspector`：根据选中对象显示 Node 或 Task 表单。
- `NodeList`：可以保留为兼容组件，但不再作为 Node 主视图。

## 12. 状态管理建议

### 12.1 工作区状态

```ts
interface WorkspaceState {
  nodes: NodeConfig[]
  selectedNodeId: string | null
  selectedTaskId: string | null
  viewport: CanvasViewport
  draftNodeIds: string[]
  dirty: boolean
}
```

### 12.2 选中规则

- 选中 Node 时：`selectedNodeId` 有值，`selectedTaskId` 为 `null`。
- 选中 Task 时：`selectedNodeId` 和 `selectedTaskId` 都有值。
- 点击空白区域：清空选中状态，或者只保留当前 Node，二者需要统一。
- 删除选中对象：选择邻近对象或回到空选中状态。

推荐点击空白区域后清空对象选中状态，右侧显示引导页。

### 12.3 状态更新方式

建议使用不可变更新：

```ts
setNodes(current => current.map(node =>
  node.id === nodeId
    ? updateNodeLayout(node, layout)
    : node,
))
```

不要在拖动过程中直接修改原始 Node 对象，否则 React 渲染、撤销和脏状态判断容易出现不一致。

## 13. 技术实现选择

### 13.1 自研 DOM 画布

方案：使用普通 React 元素、CSS `transform`、Pointer Events 和自定义连接线。

优点：

- 与当前项目依赖最匹配。
- 不需要新增依赖。
- 表单、拖动和 React 状态容易直接整合。
- 画板规模较小时实现简单。

缺点：

- 需要自行实现拖动、缩放、边界限制和连接线。
- 大量 Node 时需要关注渲染性能。

适用范围：当前 Node 编辑器规模较小，推荐采用。

### 13.2 使用画布/流程图库

可以考虑 React Flow 等流程图库，但需要评估：

- 当前插件运行环境是否允许新增依赖。
- 是否与现有 React 版本兼容。
- Node 内嵌 Task、Node 自身缩放、嵌套节点和自定义检查器是否容易实现。
- 库的样式是否会覆盖现有插件样式。
- 包体积是否可以接受。

如果未来要支持 Node 之间的连线、端口、自动布局、撤销重做和复杂拓扑，流程图库会更有价值。当前第一版可以先采用自研 DOM 画布，等 Node 间工作流需求明确后再决定是否引入图库。

## 14. 连接线实现建议

第一版不建议使用 SVG 绘制整个 Node 和 Task，而是：

- Node 和 Task 使用 DOM 元素。
- Pipeline 连接线使用单独的 SVG 层，位于 Node 内部内容层下方。
- 连接线根据 Task 的实际边界计算起点和终点。
- 连接线使用 `pointer-events: none`，避免阻塞对象选择和拖动。

示意：

```text
Node content layer
├── SVG edge layer
└── Task DOM layer
```

Pipeline 连接线至少需要：

- 从前一个 Task 的底部中心连接到后一个 Task 的顶部中心。
- Task 移动或缩放时实时刷新。
- 不覆盖 Task 标题、按钮和表单内容。
- Task 折叠或展开时重新计算端点。

Loop 模式不绘制固定 Task-to-Task 连接线。

## 15. 响应式布局

当前 Node 面板固定为约 `650px` 宽，无法舒适容纳画布和检查器。建议改为动态尺寸：

```ts
const panelWidth = Math.min(1180, window.innerWidth - 32)
const panelHeight = Math.min(820, window.innerHeight - 32)
```

布局规则：

- 宽度大于 900px：左右分栏。
- 宽度在 640px 至 900px：画布和检查器按比例缩小，保留最小检查器宽度。
- 宽度小于 640px：改为上下布局。
- 移动或窄窗口下，顶部增加“画板 / 编辑器”切换标签。

左右分栏建议：

```text
画布：minmax(0, 1fr)
检查器：minmax(320px, 380px)
```

检查器不能被 Node 画布挤压到无法填写表单的宽度。

## 16. 撤销与恢复

拖动和缩放会产生大量连续状态变化，建议后续增加撤销/恢复：

```ts
interface WorkspaceHistoryEntry {
  nodes: NodeConfig[]
  viewport: CanvasViewport
}
```

第一版可以暂不提供按钮，但状态更新应避免直接修改原对象，为后续撤销保留基础。

撤销粒度建议：

- 一次完整拖动算一步。
- 一次完整缩放算一步。
- 一次表单编辑保存算一步。
- 连续输入不必每个字符都形成撤销记录。

## 17. 校验规则

### Node

- Node 名称必须符合现有命名规则。
- Node Prompt 不能为空。
- Direct 模式必须有且只能有一个 Task。
- Pipeline 模式至少需要一个 Task。
- Loop 模式至少需要一个 Task。

### Task

- Task 名称可以为空时显示默认名称，但保存前建议提示。
- Task Prompt 不能为空。
- Task ID 在所属 Node 内必须唯一。
- Task 布局必须存在于所属 Node 的布局映射中，缺失时自动生成。

### 布局

- 位置必须是有限数字。
- 尺寸必须在最小和最大范围内。
- `zoom` 必须在允许范围内。
- 布局中的无效 ID 在加载时清理。
- 配置中的新 Node/Task 自动补充布局项。
- 已删除 Node/Task 的旧布局项自动清理。

## 18. 测试方案

### 18.1 数据和默认布局

1. 读取没有 `canvasLayout` 的旧 Node，能显示默认布局。
2. 读取包含未知布局版本的 Node，能回退或提示迁移。
3. 新增 Node 自动获得布局。
4. 新增 Task 自动获得布局。
5. 删除 Task 后不会留下孤立布局项。

### 18.2 选择和编辑

1. 点击 Node 打开 Node 检查器。
2. 点击 Task 打开 Task 检查器。
3. 编辑名称后画板标题实时更新。
4. 切换模式后布局和连接线正确变化。
5. 表单保存失败后状态不丢失。

### 18.3 拖动

1. Node 可以拖动。
2. Task 可以在 Node 内拖动。
3. 拖动 Task 不会移动 Node。
4. 点击 Task 不会误触发拖动。
5. Pipeline 连接线跟随 Task 移动。
6. Loop 模式拖动不会生成顺序线。
7. 对象不能拖到非法边界之外。

### 18.4 缩放

1. Node 可以使用右下角手柄缩放。
2. Task 可以使用右下角手柄缩放。
3. 缩放不能低于最小尺寸。
4. 缩放不能超过最大尺寸。
5. 缩放 Task 不会改变业务配置。
6. 折叠后再次展开能够恢复合理尺寸。
7. 画布 zoom 不会改变保存的对象尺寸。

### 18.5 三种模式

Direct：

- 只能存在一个 Task。
- 显示单连接线。
- 切换到 Direct 时多个 Task 会触发校验。

Pipeline：

- 显示顺序编号。
- 只绘制相邻 Task 之间的连接线。
- 最后一个 Task 后没有多余箭头。
- 调整顺序后连接线按新顺序绘制。

Loop：

- Task 使用无序网格。
- 不显示固定顺序连接线。
- Task 可以自由排列。

### 18.6 响应式和性能

1. 窄窗口切换为上下布局。
2. 画布和检查器不会相互遮挡。
3. 20 个 Node、每个 10 个 Task 时仍能拖动。
4. 拖动过程中不会因每个像素都触发网络请求而卡顿。
5. 窗口大小变化后 Node 和 Task 仍在可视区域内。

## 19. 实施阶段

### 阶段一：数据和状态基础

1. 增加 `NodeCanvasLayout` 类型。
2. 增加布局版本和默认布局生成器。
3. 增加工作区选中状态。
4. 统一 `NodeConfig.mode` 的使用，清理 UI 中对旧 `executionMode` 的依赖。
5. 实现本地草稿和脏状态。

### 阶段二：工作区框架

1. 修改 Node 面板为左右分栏。
2. 增加画板工具栏。
3. 增加 Node 画布容器。
4. 增加右侧 Node/Task 检查器。
5. 保留现有表单字段和保存 API。

### 阶段三：Node 和 Task 可视化

1. 实现 Node 容器。
2. 实现 Task 子节点。
3. 实现 Node 和 Task 选择。
4. 实现折叠状态。
5. 实现创建 Node 和添加 Task。
6. 实现 Direct、Pipeline、Loop 默认布局。

### 阶段四：拖动和对象缩放

1. 实现 Pointer Events 拖动。
2. 增加 Node 边界限制。
3. 增加 Task 在 Node 内的边界限制。
4. 增加 Node 缩放手柄。
5. 增加 Task 缩放手柄。
6. 增加拖动/点击阈值。
7. 增加布局本地保存。

### 阶段五：画布缩放和连接线

1. 实现画布平移。
2. 实现画布 zoom。
3. 实现适应画布和定位选中项。
4. 使用 SVG 绘制 Pipeline 连接线。
5. 增加连接线刷新和折叠适配。

### 阶段六：稳定性和体验

1. 增加未保存离开提示。
2. 增加布局清理和版本迁移。
3. 增加响应式布局。
4. 增加键盘辅助操作。
5. 增加测试和性能验证。

## 20. 第一版建议明确不做的内容

为控制复杂度，第一版暂不包含：

- Node 与 Node 之间的连线。
- 多选和批量移动。
- 任意旋转 Node 或 Task。
- 通过自由拖动自动改变 Pipeline 顺序。
- Loop 模式的运行时路径可视化。
- 自动布局算法与手动布局同时存在时的复杂冲突处理。
- 协同编辑。
- 无限画布和超大规模虚拟化。
- 撤销/恢复按钮。

这些功能可以在基础画布稳定后单独设计。

## 21. 关键决策总结

1. Node 面板改为“左侧画板 + 右侧检查器”。
2. Node 是带底座的大型容器，Task 是 Node 内部节点，使用扁平化热气球视觉隐喻。
3. Node 和 Task 都支持拖动和对象缩放。
4. 画布缩放与对象缩放分离。
5. Task 位置与执行顺序分离。
6. Direct 只允许一个 Task，并显示单连接线。
7. Pipeline 按 `order` 显示顺序连接，普通拖动不改变顺序。
8. Loop 使用无序网格，不绘制固定 Task 顺序线。
9. 布局信息放入 `NodeConfig.canvasLayout`，通过 ID 映射保存。
10. 先采用 React + DOM + Pointer Events + SVG 连接线，不急于引入流程图库。
11. 第一版优先保证编辑、选择、拖动、缩放、保存和三种模式展示正确。
