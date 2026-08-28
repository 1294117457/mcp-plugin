# Client 实现

## 整体交互设计

### 行星菜单

点击主悬浮按钮后，周围展开子按钮（类 radial menu）：

```
        [Node]
          ↑
          |  r=60px
    ──── [●] ────   ← 主按钮
          |
          ↓
        [Tool]
```

Phase 1 只有两个子按钮（Tool、Node），按钮沿主按钮周围等距分布。后续可扩展更多（如 Workflow、Settings）。

### 面板规格

| 面板 | 尺寸 | 内容 |
|---|---|---|
| ToolPanel | 420×700 | 统一装配面板：Builtin / MCP / Skills / **Node** 分组 |
| NodePanel | 480×600 | Node 定义管理：NodeList + NodeEditor |

面板定位：出现在主按钮附近，智能避开屏幕边缘。

### 面板职责分离

- **Tool 面板**：展示所有类型 tool（含 Node 创建好的）+ 装配/卸载操作
- **Node 面板**：Node 的创建/编辑/删除（纯定义管理，不做装配）

用户心智模型：Node 面板是"制作工具的工厂"，Tool 面板是"装备工具的背包"。

## client/home/ — 入口层

### index.tsx

```tsx
import { useState, useEffect, useCallback } from 'react'
import { FloatingButton } from './FloatingButton'
import { SatelliteMenu } from './SatelliteMenu'
import { ToolPanel } from '../tool/ToolPanel'
import { NodePanel } from '../node/NodePanel'
import { CSS } from '../shared/styles'

type ActivePanel = 'tool' | 'node' | null

export function TohelperApp() {
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  useEffect(() => {
    // 注入 CSS（同现有逻辑）
    // 初始化位置
  }, [])

  const handleSatelliteClick = useCallback((id: string) => {
    setMenuOpen(false)
    setActivePanel(id as ActivePanel)
  }, [])

  return (
    <div className="th-root" style={{ position: 'fixed', zIndex: 900, pointerEvents: 'none' }}>
      <FloatingButton
        pos={btnPos}
        onPosChange={setBtnPos}
        isOpen={menuOpen}
        onToggle={() => setMenuOpen(v => !v)}
      />
      {menuOpen && (
        <SatelliteMenu
          center={btnPos}
          items={[
            { id: 'tool', label: '工具', icon: 'wrench' },
            { id: 'node', label: '节点', icon: 'node' },
          ]}
          onSelect={handleSatelliteClick}
        />
      )}
      {activePanel === 'tool' && (
        <ToolPanel btnPos={btnPos} onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'node' && (
        <NodePanel btnPos={btnPos} onClose={() => setActivePanel(null)} />
      )}
    </div>
  )
}
```

### SatelliteMenu.tsx

```tsx
interface SatelliteItem {
  id: string
  label: string
  icon: string
}

interface Props {
  center: { x: number; y: number }
  items: SatelliteItem[]
  onSelect: (id: string) => void
}

export function SatelliteMenu({ center, items, onSelect }: Props) {
  const RADIUS = 60
  const ITEM_SIZE = 40

  return (
    <>
      {items.map((item, i) => {
        // 等距分布：从顶部开始，顺时针
        const angle = (2 * Math.PI * i) / items.length - Math.PI / 2
        const x = center.x + 40 + RADIUS * Math.cos(angle) - ITEM_SIZE / 2
        const y = center.y + 40 + RADIUS * Math.sin(angle) - ITEM_SIZE / 2

        return (
          <div
            key={item.id}
            className="th-satellite-item"
            style={{
              position: 'fixed',
              left: x,
              top: y,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              pointerEvents: 'auto',
            }}
            onClick={() => onSelect(item.id)}
            title={item.label}
          >
            <SatelliteIcon type={item.icon} />
          </div>
        )
      })}
    </>
  )
}
```

动画：子按钮从中心位置展开到目标位置，使用 CSS transition（`transform` + `opacity`）。

## client/tool/ — Tool 面板（统一装配）

Tool 面板改造为分组展示所有类型的 tool：

### ToolPanel.tsx（改造）

```tsx
export function ToolPanel({ btnPos, onClose }: Props) {
  const [tab, setTab] = useState<'all' | 'mcp-manage'>('all')
  // ...

  return (
    <div className="th-panel" style={computePanelPosition(btnPos)}>
      <header>
        <h3>工具装配</h3>
        <nav>
          <button onClick={() => setTab('all')}>全部工具</button>
          <button onClick={() => setTab('mcp-manage')}>MCP 管理</button>
        </nav>
        <button onClick={onClose}>✕</button>
      </header>
      {tab === 'all' ? <ToolsAllTab /> : <McpManageTab />}
    </div>
  )
}
```

### ToolsAllTab.tsx（新，统一列表）

按来源分组展示所有 tool，每个都可以装配/卸载：

```tsx
export function ToolsAllTab({ data, onEquip, onUnequip }: Props) {
  return (
    <div className="th-tools-all">
      {/* Builtin Tools */}
      <ToolGroup title="内置工具" tools={data.builtin} type="builtin" />

      {/* MCP Tools */}
      <ToolGroup title="MCP 工具" tools={data.mcp} type="mcp" />

      {/* Skill Tools */}
      <ToolGroup title="技能工具" tools={data.skills} type="skill" />

      {/* Node Tools — 来自 Node 面板定义的 */}
      <ToolGroup title="节点工具" tools={data.nodes} type="node" />

      {/* Workflow Tools — Phase 3 */}
      {data.workflows?.length > 0 && (
        <ToolGroup title="工作流工具" tools={data.workflows} type="workflow" />
      )}
    </div>
  )
}

function ToolGroup({ title, tools, type }: GroupProps) {
  return (
    <section className="th-tool-group">
      <h4>{title} <span className="th-count">{tools.length}</span></h4>
      {tools.map(tool => (
        <div key={tool.name} className="th-tool-item">
          <span className="th-tool-name">{tool.name}</span>
          <span className="th-tool-desc">{tool.description}</span>
          <EquipToggle tool={tool} type={type} />
        </div>
      ))}
    </section>
  )
}
```

### EquipToggle 行为差异

| Tool 类型 | 装配操作 | 卸载操作 |
|---|---|---|
| Builtin / MCP | 从 deny 列表中移除 | 加入 deny 列表 |
| Node | POST /node/equip | POST /node/unequip |
| Workflow | POST /workflow/equip（Phase 3） | POST /workflow/unequip |

### McpManageTab.tsx

从现有 McpTab.tsx 迁移，专注于 MCP server 的增删管理（不做装配，装配统一在 ToolsAllTab）。

---

## client/node/ — Node 面板（定义管理）

Node 面板只负责 Node 的创建/编辑/删除，**不包含装配操作**。

### NodePanel.tsx

```tsx
interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
}

export function NodePanel({ btnPos, onClose }: Props) {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingNode, setEditingNode] = useState<NodeConfig | null>(null)
  const [nodes, setNodes] = useState<NodeConfig[]>([])

  useEffect(() => { api.node.list().then(r => setNodes(r.nodes)) }, [])

  return (
    <div className="th-panel th-node-panel" style={computePanelPosition(btnPos)}>
      <header>
        <h3>节点定义</h3>
        <button onClick={onClose}>✕</button>
      </header>
      <p className="th-hint">在此创建节点，创建后可在 Tool 面板中装配使用</p>
      {view === 'list' ? (
        <NodeList
          nodes={nodes}
          onEdit={(node) => { setEditingNode(node); setView('editor') }}
          onCreate={() => { setEditingNode(null); setView('editor') }}
          onDelete={(id) => api.node.delete(id).then(reload)}
        />
      ) : (
        <NodeEditor
          initial={editingNode}
          onSave={(data) => { /* create or update, then back to list */ }}
          onCancel={() => setView('list')}
        />
      )}
    </div>
  )
}
```

### NodeList.tsx

```tsx
export function NodeList({ nodes, onEdit, onCreate, onDelete }: Props) {
  return (
    <div className="th-node-list">
      <button className="th-btn-create" onClick={onCreate}>+ 创建节点</button>
      {nodes.length === 0 && <p className="th-empty">暂无节点，点击上方创建</p>}
      {nodes.map(node => (
        <div key={node.id} className="th-node-card">
          <div className="th-node-card-header">
            <span className="th-node-name">{node.name}</span>
          </div>
          <p className="th-node-desc">{node.description}</p>
          <div className="th-node-meta">
            {node.llm && <span>LLM: {node.llm.model}</span>}
            {node.tools?.length && <span>工具: {node.tools.length}个</span>}
          </div>
          <div className="th-node-actions">
            <button onClick={() => onEdit(node)}>编辑</button>
            <button className="th-btn-danger" onClick={() => onDelete(node.id)}>删除</button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

注意：**没有装配/卸载按钮**——装配统一在 Tool 面板完成。

### NodeEditor.tsx

```tsx
export function NodeEditor({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '')
  const [llmProvider, setLlmProvider] = useState(initial?.llm?.provider ?? '')
  const [llmModel, setLlmModel] = useState(initial?.llm?.model ?? '')
  const [tools, setTools] = useState<string[]>(initial?.tools ?? [])
  const [inputSchemaText, setInputSchemaText] = useState(
    initial ? JSON.stringify(initial.inputSchema, null, 2) : TEMPLATE_SCHEMA
  )

  // 可选：从 /api/tohelper/tools 拉取可选工具列表供勾选
  const [availableTools, setAvailableTools] = useState<string[]>([])

  return (
    <div className="th-node-editor">
      <h4>{initial ? '编辑节点' : '创建节点'}</h4>

      <label>名称（tool name）</label>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="code_reviewer" />

      <label>描述（agent 可见）</label>
      <input value={description} onChange={e => setDescription(e.target.value)} />

      <label>System Prompt</label>
      <textarea rows={6} value={systemPrompt} onChange={e => setSystemPrompt(e.target.value)} />

      <label>LLM（留空使用默认）</label>
      <div className="th-row">
        <input value={llmProvider} onChange={...} placeholder="provider" />
        <input value={llmModel} onChange={...} placeholder="model" />
      </div>

      <label>可用工具</label>
      <ToolSelector available={availableTools} selected={tools} onChange={setTools} />

      <label>输入参数 Schema (JSON)</label>
      <textarea rows={8} value={inputSchemaText} onChange={e => setInputSchemaText(e.target.value)} />

      <div className="th-editor-actions">
        <button onClick={onCancel}>取消</button>
        <button className="th-btn-primary" onClick={() => onSave(buildPayload())}>
          {initial ? '保存' : '创建'}
        </button>
      </div>
    </div>
  )
}
```

## client/api/node.ts — API 调用

```typescript
const BASE = '/api/tohelper/node'

export const nodeApi = {
  list: () => get<{ ok: boolean; nodes: NodeConfig[]; equipped: string[] }>(`${BASE}/list`),
  create: (data: CreateNodePayload) => post<{ ok: boolean; node: NodeConfig }>(`${BASE}/create`, data),
  update: (data: UpdateNodePayload) => post<{ ok: boolean }>(`${BASE}/update`, data),
  delete: (id: string) => post<{ ok: boolean }>(`${BASE}/delete`, { id }),
  equip: (id: string) => post<{ ok: boolean }>(`${BASE}/equip`, { id }),
  unequip: (id: string) => post<{ ok: boolean }>(`${BASE}/unequip`, { id }),
}
```

## 从现有代码迁移

| 现有文件 | 迁移目标 |
|---|---|
| `components/App.tsx` | `home/index.tsx`（重写交互逻辑） |
| `components/FloatingButton.tsx` | `home/FloatingButton.tsx`（保持，去掉原 toggle 直接开面板的逻辑） |
| `components/Panel.tsx` | `tool/ToolPanel.tsx`（重命名） |
| `components/ToolsTab.tsx` | `tool/ToolsTab.tsx`（平移） |
| `components/McpTab.tsx` | `tool/McpTab.tsx`（平移） |
| `components/SkillsTab.tsx` | `tool/SkillsTab.tsx`（平移） |
| `api.ts` | `api/tool.ts`（重命名） |
| `styles.ts` | `shared/styles.ts`（扩展 node 相关样式） |

## 样式要点

行星菜单动画：

```css
.th-satellite-item {
  border-radius: 50%;
  background: var(--th-bg, #1a1a2e);
  border: 1px solid var(--th-border, #333);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.3s ease, opacity 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.th-satellite-item:hover {
  transform: scale(1.15);
  border-color: var(--th-accent, #4fc3f7);
}
```

Node 卡片：

```css
.th-node-card {
  padding: 12px;
  margin: 8px 0;
  border-radius: 8px;
  background: var(--th-card-bg, #1e1e2e);
  border: 1px solid var(--th-border, #333);
}

.th-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--th-accent, #4fc3f7);
  color: #000;
}
```
