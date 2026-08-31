import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CanvasItemLayout, CanvasPoint, CanvasSize, ExecutionMode, NodeCanvasLayout, NodeConfig, TaskConfig } from '../../types'
import type { LLMOption } from '../api'

interface Props {
  nodes: NodeConfig[]
  availableTools: string[]
  availableLLMs: LLMOption[]
  loading: boolean
  onSave: (node: NodeConfig) => Promise<boolean>
  onDelete: (id: string) => Promise<void>
  onEquip: (id: string, equipped: boolean) => Promise<void>
  equippedNodeIds: string[]
  onClose: () => void
}

type Selection = { nodeId: string; taskId?: string } | null
type DragMode = 'move-node' | 'move-task' | 'resize-node' | 'resize-task' | 'pan'

const DEFAULT_NODE_SIZE = { width: 360, height: 330 }
const DEFAULT_TASK_SIZE = { width: 220, height: 72 }
const MIN_NODE_SIZE = { width: 300, height: 220 }
const MAX_NODE_SIZE = { width: 2400, height: 3000 }
const MIN_TASK_SIZE = { width: 150, height: 58 }
const MAX_TASK_SIZE = { width: 1200, height: 800 }
const MIN_ZOOM = 0.15
const MAX_ZOOM = 4
const CANVAS_INSET = 12
const NODE_HEADER_HEIGHT = 64
const NODE_BASE_HEIGHT = 48
const DEFAULT_VIEWPORT = { x: 40, y: 40, zoom: 1 }

function defaultLayout(node: NodeConfig, index: number): NodeCanvasLayout {
  const mode = getMode(node)
  const tasks = node.tasks || []
  const taskLayouts: Record<string, CanvasItemLayout> = {}
  tasks.forEach((task, taskIndex) => {
    const position = mode === 'pipeline'
      ? { x: 70, y: 54 + taskIndex * 92 }
      : mode === 'loop'
        ? { x: 42 + (taskIndex % 2) * 158, y: 52 + Math.floor(taskIndex / 2) * 92 }
        : { x: 70, y: 76 }
    taskLayouts[task.id] = { position, size: DEFAULT_TASK_SIZE, collapsed: taskIndex > 0 }
  })
  return {
    version: 1,
    viewport: { ...DEFAULT_VIEWPORT, x: 40 + (index % 3) * 420, y: 40 + Math.floor(index / 3) * 390 },
    nodes: { [node.id]: { position: { x: 40 + (index % 3) * 420, y: 40 + Math.floor(index / 3) * 390 }, size: DEFAULT_NODE_SIZE } },
    tasks: taskLayouts,
  }
}

function getMode(node: NodeConfig): ExecutionMode {
  return node.mode || (node as any).executionMode || 'direct'
}

function getNodePrompt(node: NodeConfig): string {
  return node.nodePrompt || (node as any).systemPrompt || ''
}

function normalizeNode(node: NodeConfig): NodeConfig {
  const mode = getMode(node)
  const tasks = Array.isArray(node.tasks) ? node.tasks : []
  return {
    ...node,
    mode,
    nodePrompt: getNodePrompt(node),
    description: node.description || '',
    llm: node.llm || { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 },
    tasks: tasks.map((task: any) => ({
      ...task,
      taskPrompt: task.taskPrompt || task.config?.systemPrompt || '',
      tools: Array.isArray(task.tools) ? task.tools : [],
      outputFormat: task.outputFormat || task.config?.outputFormat || 'text',
    })),
    tools: Array.isArray(node.tools) ? node.tools : [],
  }
}

function ensureLayout(node: NodeConfig, index: number): NodeCanvasLayout {
  const existing = node.canvasLayout
  const fallback = defaultLayout(node, index)
  if (!existing || existing.version !== 1) return fallback
  const nodeLayout = existing.nodes[node.id] || fallback.nodes[node.id]
  const tasks = { ...existing.tasks }
  node.tasks.forEach((task, taskIndex) => {
    if (!tasks[task.id]) tasks[task.id] = fallback.tasks[task.id] || {
      position: { x: 60, y: 60 + taskIndex * 92 }, size: DEFAULT_TASK_SIZE, collapsed: false,
    }
  })
  return constrainLayout({ ...existing, nodes: { ...existing.nodes, [node.id]: nodeLayout }, tasks }, node.id)
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function clampSize(size: CanvasSize, min: CanvasSize, max: CanvasSize): CanvasSize {
  return { width: clamp(size.width, min.width, max.width), height: clamp(size.height, min.height, max.height) }
}

function getNodeBodySize(size: CanvasSize): CanvasSize {
  return {
    width: Math.max(0, size.width),
    height: Math.max(0, size.height - NODE_HEADER_HEIGHT - NODE_BASE_HEIGHT),
  }
}

function getTaskPositionBounds(nodeSize: CanvasSize, taskSize: CanvasSize) {
  const body = getNodeBodySize(nodeSize)
  return {
    minX: CANVAS_INSET,
    maxX: Math.max(CANVAS_INSET, body.width - taskSize.width - CANVAS_INSET),
    minY: CANVAS_INSET,
    maxY: Math.max(CANVAS_INSET, body.height - taskSize.height - CANVAS_INSET),
  }
}

function getNodeMinimumSize(layout: NodeCanvasLayout, nodeId: string): CanvasSize {
  const nodeItem = layout.nodes[nodeId]
  if (!nodeItem) return MIN_NODE_SIZE
  return Object.values(layout.tasks).reduce((minimum, task) => ({
    width: Math.max(minimum.width, task.position.x + task.size.width + CANVAS_INSET),
    height: Math.max(minimum.height, NODE_HEADER_HEIGHT + NODE_BASE_HEIGHT + task.position.y + task.size.height + CANVAS_INSET),
  }), MIN_NODE_SIZE)
}

function constrainLayout(layout: NodeCanvasLayout, nodeId: string): NodeCanvasLayout {
  const nodeItem = layout.nodes[nodeId]
  if (!nodeItem) return layout
  const taskEntries = Object.entries(layout.tasks).map(([taskId, task]) => [taskId, {
    ...task,
    size: clampSize(task.size, MIN_TASK_SIZE, MAX_TASK_SIZE),
  }] as const)
  const minimum = getNodeMinimumSize({ ...layout, tasks: Object.fromEntries(taskEntries) }, nodeId)
  const nodeSize = clampSize({
    width: Math.max(nodeItem.size.width, minimum.width),
    height: Math.max(nodeItem.size.height, minimum.height),
  }, MIN_NODE_SIZE, MAX_NODE_SIZE)
  const tasks = Object.fromEntries(taskEntries.map(([taskId, task]) => {
    const bounds = getTaskPositionBounds(nodeSize, task.size)
    return [taskId, { ...task, position: {
      x: clamp(task.position.x, bounds.minX, bounds.maxX),
      y: clamp(task.position.y, bounds.minY, bounds.maxY),
    } }]
  }))
  return { ...layout, nodes: { ...layout.nodes, [nodeId]: { ...nodeItem, size: nodeSize } }, tasks }
}

function makeTask(index: number): TaskConfig {
  return { id: `task-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`, name: `Task ${index + 1}`, taskPrompt: '', tools: [], outputFormat: 'text' }
}

export function NodeWorkspace({ nodes: sourceNodes, availableTools, availableLLMs, loading, onSave, onDelete, onEquip, equippedNodeIds }: Props) {
  const [nodes, setNodes] = useState<NodeConfig[]>(() => sourceNodes.map(normalizeNode))
  const [selection, setSelection] = useState<Selection>(null)
  const [layouts, setLayouts] = useState<Record<string, NodeCanvasLayout>>({})
  const [viewport, setViewport] = useState({ x: DEFAULT_VIEWPORT.x, y: DEFAULT_VIEWPORT.y, zoom: DEFAULT_VIEWPORT.zoom })
  const [dirty, setDirty] = useState(false)
  const [drag, setDrag] = useState<{ mode: DragMode; nodeId?: string; taskId?: string; start: CanvasPoint; position: CanvasPoint; size: CanvasSize } | null>(null)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const normalized = sourceNodes.map(normalizeNode)
    setNodes(normalized)
    const nextLayouts: Record<string, NodeCanvasLayout> = {}
    normalized.forEach((node, index) => { nextLayouts[node.id] = ensureLayout(node, index) })
    setLayouts(nextLayouts)
    const firstViewport = normalized[0]?.canvasLayout?.viewport
    if (firstViewport) setViewport(firstViewport)
  }, [sourceNodes])

  const selectedNode = selection ? nodes.find(node => node.id === selection.nodeId) || null : null
  const selectedTask = selectedNode && selection?.taskId ? selectedNode.tasks.find(task => task.id === selection.taskId) || null : null

  const updateNode = useCallback((nodeId: string, update: Partial<NodeConfig>) => {
    setNodes(current => current.map(node => node.id === nodeId ? { ...node, ...update } : node))
    setDirty(true)
  }, [])

  const updateTask = useCallback((nodeId: string, taskId: string, update: Partial<TaskConfig>) => {
    setNodes(current => current.map(node => node.id === nodeId
      ? { ...node, tasks: node.tasks.map(task => task.id === taskId ? { ...task, ...update } : task) }
      : node))
    setDirty(true)
  }, [])

  const updateLayout = useCallback((nodeId: string, update: Partial<NodeCanvasLayout>) => {
    setLayouts(current => {
      const base = current[nodeId]
      if (!base) return current
      const next = constrainLayout({ ...base, ...update }, nodeId)
      return { ...current, [nodeId]: next }
    })
    setDirty(true)
  }, [])

  const addNode = useCallback(() => {
    const id = `node-draft-${Date.now().toString(36)}`
    const node: NodeConfig = {
      id,
      name: 'new_node',
      description: '',
      nodePrompt: '',
      llm: { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 },
      mode: 'direct',
      tasks: [makeTask(0)],
      tools: [],
      createdAt: new Date().toISOString(),
    }
    const layout = defaultLayout(node, nodes.length)
    setNodes(current => [...current, node])
    setLayouts(current => ({ ...current, [id]: layout }))
    setSelection({ nodeId: id })
    setDirty(true)
  }, [nodes.length])

  const addTask = useCallback((nodeId: string) => {
    const node = nodes.find(item => item.id === nodeId)
    if (!node || (getMode(node) === 'direct' && node.tasks.length >= 1)) return
    const task = makeTask(node.tasks.length)
    const currentLayout = layouts[nodeId] || ensureLayout(node, 0)
    const mode = getMode(node)
    const index = node.tasks.length
    const position = mode === 'pipeline'
      ? { x: 60, y: 52 + index * 92 }
      : mode === 'loop'
        ? { x: 42 + (index % 2) * 158, y: 52 + Math.floor(index / 2) * 92 }
        : { x: 60, y: 72 }
    setNodes(current => current.map(item => item.id === nodeId ? { ...item, tasks: [...item.tasks, task] } : item))
    setLayouts(current => ({ ...current, [nodeId]: { ...currentLayout, tasks: { ...currentLayout.tasks, [task.id]: { position, size: DEFAULT_TASK_SIZE, collapsed: false } } } }))
    setSelection({ nodeId, taskId: task.id })
    setDirty(true)
  }, [layouts, nodes])

  const deleteTask = useCallback((nodeId: string, taskId: string) => {
    setNodes(current => current.map(node => node.id === nodeId ? { ...node, tasks: node.tasks.filter(task => task.id !== taskId) } : node))
    setLayouts(current => {
      const layout = current[nodeId]
      if (!layout) return current
      const { [taskId]: _removed, ...remaining } = layout.tasks
      return { ...current, [nodeId]: { ...layout, tasks: remaining } }
    })
    setSelection({ nodeId })
    setDirty(true)
  }, [])

  const beginPointer = useCallback((event: React.PointerEvent, mode: DragMode, nodeId: string, taskId?: string) => {
    const target = event.target as HTMLElement
    if (mode !== 'resize-node' && mode !== 'resize-task' && target.closest('button, input, textarea, select, .th-canvas-resize')) return
    const layout = layouts[nodeId]
    if (!layout) return
    const item = taskId ? layout.tasks[taskId] : layout.nodes[nodeId]
    if (!item) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag({ mode, nodeId, taskId, start: { x: event.clientX, y: event.clientY }, position: item.position, size: item.size })
    event.preventDefault()
  }, [layouts])

  const onPointerMove = useCallback((event: React.PointerEvent) => {
    if (!drag) return
    if (drag.mode === 'pan') {
      const dx = event.clientX - drag.start.x
      const dy = event.clientY - drag.start.y
      setViewport(current => ({ ...current, x: drag.position.x + dx, y: drag.position.y + dy }))
      return
    }
    if (!drag.nodeId) return
    const dx = (event.clientX - drag.start.x) / viewport.zoom
    const dy = (event.clientY - drag.start.y) / viewport.zoom
    const layout = layouts[drag.nodeId]
    if (!layout) return
    if (drag.mode === 'move-node') {
      const next = { x: drag.position.x + dx, y: drag.position.y + dy }
      updateLayout(drag.nodeId, { nodes: { ...layout.nodes, [drag.nodeId]: { ...layout.nodes[drag.nodeId], position: next } } })
    } else if (drag.mode === 'move-task' && drag.taskId) {
      const nodeSize = layout.nodes[drag.nodeId].size
      const size = layout.tasks[drag.taskId].size
      const bounds = getTaskPositionBounds(nodeSize, size)
      const next = {
        x: clamp(drag.position.x + dx, bounds.minX, bounds.maxX),
        y: clamp(drag.position.y + dy, bounds.minY, bounds.maxY),
      }
      updateLayout(drag.nodeId, { tasks: { ...layout.tasks, [drag.taskId]: { ...layout.tasks[drag.taskId], position: next } } })
    } else if (drag.mode === 'resize-node') {
      const minimum = getNodeMinimumSize(layout, drag.nodeId)
      const nextSize = clampSize({ width: drag.size.width + dx, height: drag.size.height + dy }, minimum, MAX_NODE_SIZE)
      updateLayout(drag.nodeId, { nodes: { ...layout.nodes, [drag.nodeId]: { ...layout.nodes[drag.nodeId], size: nextSize } } })
    } else if (drag.mode === 'resize-task' && drag.taskId) {
      const nodeSize = layout.nodes[drag.nodeId].size
      const position = layout.tasks[drag.taskId].position
      const available = {
        width: Math.max(MIN_TASK_SIZE.width, nodeSize.width - position.x - CANVAS_INSET),
        height: Math.max(MIN_TASK_SIZE.height, getNodeBodySize(nodeSize).height - position.y - CANVAS_INSET),
      }
      const nextSize = clampSize({ width: drag.size.width + dx, height: drag.size.height + dy }, MIN_TASK_SIZE, { width: Math.min(MAX_TASK_SIZE.width, available.width), height: Math.min(MAX_TASK_SIZE.height, available.height) })
      updateLayout(drag.nodeId, { tasks: { ...layout.tasks, [drag.taskId]: { ...layout.tasks[drag.taskId], size: nextSize } } })
    }
  }, [drag, layouts, updateLayout, viewport.zoom])

  const endPointer = useCallback(() => setDrag(null), [])

  const changeMode = useCallback((nodeId: string, mode: ExecutionMode) => {
    const node = nodes.find(item => item.id === nodeId)
    if (!node) return
    updateNode(nodeId, { mode })
    const layout = layouts[nodeId] || ensureLayout(node, 0)
    const nextTasks = { ...layout.tasks }
    node.tasks.forEach((task, index) => {
      const current = nextTasks[task.id] || { position: { x: 60, y: 52 }, size: DEFAULT_TASK_SIZE }
      const position = mode === 'pipeline'
        ? { x: 60, y: 52 + index * 92 }
        : mode === 'loop'
          ? { x: 42 + (index % 2) * 158, y: 52 + Math.floor(index / 2) * 92 }
          : { x: 60, y: 72 }
      nextTasks[task.id] = { ...current, position }
    })
    updateLayout(nodeId, { tasks: nextTasks })
  }, [layouts, nodes, updateLayout, updateNode])

  const saveAll = useCallback(async () => {
    try {
      for (const node of nodes) {
        const layout = layouts[node.id] || ensureLayout(node, 0)
        const payload = { ...node, canvasLayout: { ...layout, viewport } }
        const ok = await onSave(payload)
        if (!ok) return
      }
      setDirty(false)
      setError('')
    } catch (e: any) {
      setError(e.message || '保存失败')
    }
  }, [layouts, nodes, onSave, viewport])

  const fitCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const bounds = nodes.reduce((result, node, index) => {
      const item = (layouts[node.id] || ensureLayout(node, index)).nodes[node.id]
      return {
        left: Math.min(result.left, item.position.x),
        top: Math.min(result.top, item.position.y),
        right: Math.max(result.right, item.position.x + item.size.width),
        bottom: Math.max(result.bottom, item.position.y + item.size.height),
      }
    }, { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity })
    const zoom = clamp(Math.min((rect.width - 80) / (bounds.right - bounds.left), (rect.height - 80) / (bounds.bottom - bounds.top)), MIN_ZOOM, MAX_ZOOM)
    setViewport({ zoom, x: (rect.width - (bounds.right - bounds.left) * zoom) / 2 - bounds.left * zoom, y: (rect.height - (bounds.bottom - bounds.top) * zoom) / 2 - bounds.top * zoom })
  }, [layouts, nodes])

  const handleWheel = useCallback((event: React.WheelEvent) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    setViewport(current => ({ ...current, zoom: clamp(current.zoom - event.deltaY * 0.001, MIN_ZOOM, MAX_ZOOM) }))
  }, [])

  const toggleNodeCollapsed = useCallback((nodeId: string) => {
    const node = nodes.find(item => item.id === nodeId)
    const layout = layouts[nodeId] || (node ? ensureLayout(node, 0) : null)
    if (!layout || !node) return
    const current = layout.nodes[nodeId]
    updateLayout(nodeId, { nodes: { ...layout.nodes, [nodeId]: { ...current, collapsed: !current.collapsed } } })
  }, [layouts, nodes, updateLayout])

  const toggleTaskCollapsed = useCallback((nodeId: string, taskId: string) => {
    const layout = layouts[nodeId]
    if (!layout || !layout.tasks[taskId]) return
    updateLayout(nodeId, { tasks: { ...layout.tasks, [taskId]: { ...layout.tasks[taskId], collapsed: !layout.tasks[taskId].collapsed } } })
  }, [layouts, updateLayout])

  const selectedLayout = selectedNode ? (layouts[selectedNode.id] || ensureLayout(selectedNode, 0)) : null
  const selectedNodeLayout = selectedNode && selectedLayout ? selectedLayout.nodes[selectedNode.id] : null

  return (
    <div className="th-workspace">
      <div className="th-workspace-toolbar">
        <div className="th-workspace-heading"><span className="th-workspace-mark">⌘</span><div><strong>Node 工作画板</strong><span>{nodes.length} 个 Node{dirty ? ' · 有未保存修改' : ''}</span></div></div>
        <div className="th-workspace-actions">
          <button className="th-canvas-btn th-canvas-btn-create" onClick={addNode}>＋ 创建 Node</button>
          <button className="th-canvas-btn" onClick={() => setViewport(current => ({ ...current, zoom: clamp(current.zoom + 0.1, MIN_ZOOM, MAX_ZOOM) }))}>＋</button>
          <button className="th-canvas-btn" onClick={() => setViewport(current => ({ ...current, zoom: clamp(current.zoom - 0.1, MIN_ZOOM, MAX_ZOOM) }))}>−</button>
          <button className="th-canvas-btn th-canvas-zoom" onClick={() => setViewport({ ...DEFAULT_VIEWPORT })}>{Math.round(viewport.zoom * 100)}%</button>
          <button className="th-canvas-btn" onClick={fitCanvas}>适应画布</button>
          <button className="th-canvas-btn th-canvas-save" onClick={saveAll} disabled={!dirty}>保存</button>
        </div>
      </div>
      {error && <div className="th-workspace-error">{error}</div>}
      <div className="th-workspace-main">
        <div className={`th-canvas-shell${drag?.mode === 'pan' ? ' panning' : ''}`} ref={canvasRef} onWheel={handleWheel} onPointerDown={(event) => {
          const target = event.target as HTMLElement
          if (event.button === 1 || (event.button === 0 && (target === canvasRef.current || target.classList.contains('th-canvas-viewport')))) {
            event.preventDefault()
            ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
            setDrag({ mode: 'pan', start: { x: event.clientX, y: event.clientY }, position: { x: viewport.x, y: viewport.y }, size: { width: 0, height: 0 } })
            if (event.button === 0) setSelection(null)
          }
        }} onPointerMove={onPointerMove} onPointerUp={endPointer}>
          {loading ? <div className="th-canvas-empty">加载 Node 中...</div> : nodes.length === 0 ? <div className="th-canvas-empty"><strong>还没有 Node</strong><span>点击上方“创建 Node”开始配置</span><button className="th-canvas-btn th-canvas-btn-create" onClick={addNode}>＋ 创建 Node</button></div> : (
            <div className="th-canvas-viewport" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
              {nodes.map((node, index) => {
                const layout = layouts[node.id] || ensureLayout(node, index)
                const nodeItem = layout.nodes[node.id]
                return <CanvasNode key={node.id} node={node} layout={layout} nodeItem={nodeItem} selected={selection?.nodeId === node.id && !selection.taskId} selectedTaskId={selection?.nodeId === node.id ? selection.taskId : undefined} equipped={equippedNodeIds.includes(node.id)} onSelect={(taskId) => setSelection({ nodeId: node.id, taskId })} onToggleNode={() => toggleNodeCollapsed(node.id)} onToggleTask={(taskId) => toggleTaskCollapsed(node.id, taskId)} onBegin={beginPointer} onAddTask={addTask} onDeleteTask={deleteTask} onResize={(event) => beginPointer(event, 'resize-node', node.id)} onChangeMode={changeMode} />
              })}
            </div>
          )}
        </div>
        <Inspector selectedNode={selectedNode} selectedTask={selectedTask} nodeLayout={selectedNodeLayout} availableTools={availableTools} availableLLMs={availableLLMs} equipped={selectedNode ? equippedNodeIds.includes(selectedNode.id) : false} onUpdateNode={updateNode} onUpdateTask={updateTask} onChangeMode={changeMode} onAddTask={addTask} onDeleteTask={deleteTask} onDeleteNode={onDelete} onEquip={onEquip} onSelectTask={(taskId) => selectedNode && setSelection({ nodeId: selectedNode.id, taskId })} />
      </div>
    </div>
  )
}

interface CanvasNodeProps {
  node: NodeConfig
  layout: NodeCanvasLayout
  nodeItem: CanvasItemLayout
  selected: boolean
  selectedTaskId?: string
  equipped: boolean
  onSelect: (taskId?: string) => void
  onToggleNode: () => void
  onToggleTask: (taskId: string) => void
  onBegin: (event: React.PointerEvent, mode: DragMode, nodeId: string, taskId?: string) => void
  onAddTask: (nodeId: string) => void
  onDeleteTask: (nodeId: string, taskId: string) => void
  onResize: (event: React.PointerEvent) => void
  onChangeMode: (nodeId: string, mode: ExecutionMode) => void
}

function CanvasNode({ node, layout, nodeItem, selected, selectedTaskId, onSelect, onToggleNode, onToggleTask, onBegin, onAddTask, onDeleteTask, onResize, onChangeMode }: CanvasNodeProps) {
  const mode = getMode(node)
  const taskLayouts = layout.tasks
  const expanded = !nodeItem.collapsed
  const collapsedHeight = NODE_HEADER_HEIGHT + NODE_BASE_HEIGHT
  const taskNodes = node.tasks.map((task, index) => {
    const item = taskLayouts[task.id] || { position: { x: 60, y: 52 + index * 92 }, size: DEFAULT_TASK_SIZE }
    return { task, item, index }
  })
  const pipelineEdges = mode === 'pipeline' ? taskNodes.slice(0, -1).map((current, index) => {
    const next = taskNodes[index + 1]
    return { x1: current.item.position.x + current.item.size.width / 2, y1: current.item.position.y + current.item.size.height, x2: next.item.position.x + next.item.size.width / 2, y2: next.item.position.y }
  }) : []
  const llm = node.llm || { model: 'deepseek-chat', temperature: 0.7 }
  const modelShort = llm.model?.replace(/^.*\//, '') || 'default'
  const modeOrder: ExecutionMode[] = ['direct', 'pipeline', 'loop']
  function cycleMode(event: React.MouseEvent) {
    event.stopPropagation()
    const nextIndex = (modeOrder.indexOf(mode) + 1) % modeOrder.length
    onChangeMode(node.id, modeOrder[nextIndex])
  }
  return (
    <section className={`th-canvas-node th-canvas-node-${mode} ${selected ? 'selected' : ''} ${expanded ? '' : 'collapsed'}`} style={{ left: nodeItem.position.x, top: nodeItem.position.y, width: nodeItem.size.width, height: expanded ? nodeItem.size.height : collapsedHeight, zIndex: nodeItem.zIndex || 1 }} onPointerDown={(event) => { if ((event.target as HTMLElement).closest('.th-canvas-task, button, .th-canvas-resize')) return; onSelect(); onBegin(event, 'move-node', node.id) }}>
      <div className="th-canvas-node-header">
        <span className="th-canvas-node-icon">{mode === 'loop' ? '⟳' : mode === 'pipeline' ? '≡' : '●'}</span>
        <div className="th-canvas-node-title">
          <strong>{node.name || '未命名 Node'}</strong>
          <span>{mode.toUpperCase()} · {node.tasks.length} Task · {modelShort} · T={llm.temperature ?? 0.7}</span>
        </div>
        <button className="th-canvas-collapse" onClick={(event) => { event.stopPropagation(); onToggleNode() }}>{nodeItem.collapsed ? '›' : '⌄'}</button>
      </div>
      {expanded && <div className="th-canvas-node-body">
        <svg className="th-canvas-edges" width="100%" height="100%" aria-hidden="true"><defs><marker id={`arrow-${node.id}`} markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto"><path d="M0,0 L7,3.5 L0,7 z" fill="#10b981" /></marker></defs>{pipelineEdges.map((edge, index) => <path key={index} d={`M ${edge.x1} ${edge.y1} C ${edge.x1} ${edge.y1 + 14}, ${edge.x2} ${edge.y2 - 14}, ${edge.x2} ${edge.y2}`} markerEnd={`url(#arrow-${node.id})`} />)}</svg>
        {taskNodes.map(({ task, item, index }) => <CanvasTask key={task.id} nodeId={node.id} task={task} item={item} index={index} mode={mode} selected={selectedTaskId === task.id} onSelect={() => onSelect(task.id)} onToggleTask={onToggleTask} onBegin={onBegin} onDelete={() => onDeleteTask(node.id, task.id)} onResize={(event) => onBegin(event, 'resize-task', node.id, task.id)} />)}
        <button className="th-canvas-add-task" onClick={(event) => { event.stopPropagation(); onAddTask(node.id) }} disabled={mode === 'direct' && node.tasks.length >= 1}>＋ 添加 Task</button>
      </div>}
      <div className="th-canvas-node-base"><span>{node.description || '未填写描述'}</span><span className="th-canvas-mode-pill clickable" onClick={cycleMode} title="点击切换模式">{mode}</span></div>
      {expanded && <button className="th-canvas-resize" aria-label="缩放 Node" onPointerDown={onResize}>◢</button>}
    </section>
  )
}

interface CanvasTaskProps { nodeId: string; task: TaskConfig; item: CanvasItemLayout; index: number; mode: ExecutionMode; selected: boolean; onSelect: () => void; onToggleTask: (taskId: string) => void; onBegin: (event: React.PointerEvent, mode: DragMode, nodeId: string, taskId?: string) => void; onDelete: () => void; onResize: (event: React.PointerEvent) => void }
function CanvasTask({ nodeId, task, item, index, mode, selected, onSelect, onToggleTask, onBegin, onDelete, onResize }: CanvasTaskProps) {
  return <div className={`th-canvas-task ${selected ? 'selected' : ''} ${item.collapsed ? 'collapsed' : ''}`} style={{ left: item.position.x, top: item.position.y, width: item.size.width, height: item.size.height }} onPointerDown={(event) => { event.stopPropagation(); onSelect(); onBegin(event, 'move-task', nodeId, task.id) }}>
    <span className="th-canvas-task-number">{mode === 'loop' ? '·' : index + 1}</span><div className="th-canvas-task-content"><strong>{task.name || `Task ${index + 1}`}</strong><span>{task.llm?.model || '继承 Node'} · {task.tools.length} Tools · {task.outputFormat || 'text'}</span></div><button className="th-canvas-task-delete" onClick={(event) => { event.stopPropagation(); onDelete() }}>×</button><button className="th-canvas-task-toggle" onClick={(event) => { event.stopPropagation(); onToggleTask(task.id) }}>{item.collapsed ? '›' : '⌄'}</button><button className="th-canvas-resize" aria-label="缩放 Task" onPointerDown={onResize}>◢</button>
  </div>
}

interface InspectorProps { selectedNode: NodeConfig | null; selectedTask: TaskConfig | null; nodeLayout: CanvasItemLayout | null; availableTools: string[]; availableLLMs: LLMOption[]; equipped: boolean; onUpdateNode: (id: string, update: Partial<NodeConfig>) => void; onUpdateTask: (nodeId: string, taskId: string, update: Partial<TaskConfig>) => void; onChangeMode: (nodeId: string, mode: ExecutionMode) => void; onAddTask: (nodeId: string) => void; onDeleteTask: (nodeId: string, taskId: string) => void; onDeleteNode: (id: string) => Promise<void>; onEquip: (id: string, equipped: boolean) => Promise<void>; onSelectTask: (taskId: string) => void }
function Inspector({ selectedNode, selectedTask, nodeLayout, availableTools, availableLLMs, equipped, onUpdateNode, onUpdateTask, onChangeMode, onAddTask, onDeleteTask, onDeleteNode, onEquip, onSelectTask }: InspectorProps) {
  if (!selectedNode) return <aside className="th-inspector th-inspector-empty"><div className="th-inspector-empty-icon">⌘</div><strong>选择一个 Node 或 Task</strong><span>在左侧画板中点击对象，查看并编辑配置</span></aside>
  if (selectedTask) return <TaskInspector node={selectedNode} task={selectedTask} availableTools={availableTools} availableLLMs={availableLLMs} onUpdate={(update) => onUpdateTask(selectedNode.id, selectedTask.id, update)} onDelete={() => onDeleteTask(selectedNode.id, selectedTask.id)} />
  return <NodeInspector node={selectedNode} availableTools={availableTools} availableLLMs={availableLLMs} equipped={equipped} onUpdate={(update) => onUpdateNode(selectedNode.id, update)} onChangeMode={(mode) => onChangeMode(selectedNode.id, mode)} onAddTask={() => onAddTask(selectedNode.id)} onDelete={() => onDeleteNode(selectedNode.id)} onEquip={() => onEquip(selectedNode.id, equipped)} onSelectTask={onSelectTask} />
}

interface NodeInspectorProps { node: NodeConfig; availableTools: string[]; availableLLMs: LLMOption[]; equipped: boolean; onUpdate: (update: Partial<NodeConfig>) => void; onChangeMode: (mode: ExecutionMode) => void; onAddTask: () => void; onDelete: () => Promise<void>; onEquip: () => Promise<void>; onSelectTask: (taskId: string) => void }
function NodeInspector({ node, availableTools, availableLLMs, equipped, onUpdate, onChangeMode, onAddTask, onDelete, onEquip, onSelectTask }: NodeInspectorProps) {
  const mode = getMode(node)
  const llm = node.llm || { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7 }
  const [open, setOpen] = useState({ identity: true, target: true, runtime: true, tasks: true })
  const toggle = (key: keyof typeof open) => setOpen(current => ({ ...current, [key]: !current[key] }))
  return <aside className="th-inspector"><InspectorTitle eyebrow="NODE" title={node.name || '未命名 Node'} meta={`${mode.toUpperCase()} · ${node.tasks.length} TASKS`} />
    <InspectorGroup title="基本信息" open={open.identity} onToggle={() => toggle('identity')}><div className="th-inspector-row"><label className="th-inspector-row-item">名称<input value={node.name} onChange={(e) => onUpdate({ name: e.target.value })} /></label><label className="th-inspector-row-item">描述<input value={node.description || ''} onChange={(e) => onUpdate({ description: e.target.value })} /></label></div></InspectorGroup>
    <InspectorGroup title="Node 目标" open={open.target} onToggle={() => toggle('target')}><label>Node Prompt<textarea rows={4} value={node.nodePrompt || ''} onChange={(e) => onUpdate({ nodePrompt: e.target.value })} /></label></InspectorGroup>
    <InspectorGroup title="运行配置" open={open.runtime} onToggle={() => toggle('runtime')}><div className="th-inspector-row"><label className="th-inspector-row-item th-inspector-row-flex2">默认 LLM<select value={`${llm.provider}/${llm.model}`} onChange={(e) => { const [provider, model] = e.target.value.split('/'); onUpdate({ llm: { ...llm, provider, model } }) }}>{(availableLLMs.length ? availableLLMs : [{ provider: 'deepseek-official', model: 'deepseek-chat', displayName: 'deepseek-official/deepseek-chat' }, { provider: 'deepseek-official', model: 'deepseek-reasoner', displayName: 'deepseek-official/deepseek-reasoner' }]).map(item => <option key={item.displayName} value={`${item.provider}/${item.model}`}>{item.displayName}</option>)}</select></label><label className="th-inspector-row-item">Temperature<input type="number" min="0" max="2" step="0.1" value={llm.temperature ?? 0.7} onChange={(e) => onUpdate({ llm: { ...llm, temperature: Number(e.target.value) } })} /></label></div><span className="th-inspector-label">执行模式</span><div className="th-inspector-mode-buttons">{(['direct', 'pipeline', 'loop'] as ExecutionMode[]).map(item => <button key={item} className={mode === item ? 'active' : ''} onClick={() => onChangeMode(item)}>{item}</button>)}</div><span className="th-inspector-hint">{mode === 'direct' ? '单个 Task，直接执行' : mode === 'pipeline' ? 'Task 按 order 顺序执行' : 'LLM 动态选择 Task'}</span></InspectorGroup>
    <InspectorGroup title="Tasks" count={node.tasks.length} open={open.tasks} onToggle={() => toggle('tasks')}><div className="th-inspector-task-list">{node.tasks.map((task, index) => <button key={task.id} onClick={() => onSelectTask(task.id)} className="th-inspector-task-row"><span>{index + 1}</span><strong>{task.name || `Task ${index + 1}`}</strong><small>{task.outputFormat || 'text'}</small></button>)}</div><button className="th-inspector-add" onClick={onAddTask} disabled={mode === 'direct' && node.tasks.length >= 1}>＋ 添加 Task</button></InspectorGroup>
    <div className="th-inspector-footer"><button onClick={onEquip} className={equipped ? 'equipped' : ''}>{equipped ? '✓ 已装配' : '装配 Node'}</button><button className="danger" onClick={() => { if (confirm(`确定删除节点“${node.name}”？`)) onDelete() }}>删除</button></div>
  </aside>
}

interface TaskInspectorProps { node: NodeConfig; task: TaskConfig; availableTools: string[]; availableLLMs: LLMOption[]; onUpdate: (update: Partial<TaskConfig>) => void; onDelete: () => void }
function TaskInspector({ node, task, availableTools, availableLLMs, onUpdate, onDelete }: TaskInspectorProps) {
  const nodeLlm = node.llm || { provider: 'deepseek-official', model: 'deepseek-chat' }
  const taskLlm = task.llm || nodeLlm
  const [custom, setCustom] = useState(!!task.llm)
  return <aside className="th-inspector"><InspectorTitle eyebrow={node.name || 'NODE'} title={task.name || '未命名 Task'} meta="TASK 配置" /><div className="th-inspector-breadcrumb">Node / {node.name} / <strong>{task.name || 'Task'}</strong></div><InspectorGroup title="Task 基本信息" open={true} onToggle={() => {}}><label>名称<input value={task.name} onChange={(e) => onUpdate({ name: e.target.value })} /></label><label>Task Prompt<textarea rows={5} value={task.taskPrompt} onChange={(e) => onUpdate({ taskPrompt: e.target.value })} /></label></InspectorGroup><InspectorGroup title="LLM 配置" open={true} onToggle={() => {}}><label className="th-inspector-checkbox"><input type="checkbox" checked={custom} onChange={(e) => { setCustom(e.target.checked); onUpdate({ llm: e.target.checked ? { ...nodeLlm } : undefined }) }} />使用独立 LLM</label><select value={`${taskLlm.provider}/${taskLlm.model}`} onChange={(e) => { const [provider, model] = e.target.value.split('/'); setCustom(true); onUpdate({ llm: { ...taskLlm, provider, model } }) }}>{(availableLLMs.length ? availableLLMs : [{ provider: 'deepseek-official', model: 'deepseek-chat', displayName: 'deepseek-official/deepseek-chat' }]).map(item => <option key={item.displayName} value={`${item.provider}/${item.model}`}>{custom ? item.displayName : `继承 Node: ${item.displayName}`}</option>)}</select></InspectorGroup><InspectorGroup title="Tools" open={true} onToggle={() => {}}><select multiple size={Math.min(5, Math.max(availableTools.length, 1))} value={task.tools} onChange={(e) => onUpdate({ tools: Array.from(e.target.selectedOptions).map(option => option.value) })}>{availableTools.length ? availableTools.map(tool => <option key={tool} value={tool}>{tool}</option>) : <option disabled>暂无可用工具</option>}</select></InspectorGroup><InspectorGroup title="输出格式" open={true} onToggle={() => {}}><div className="th-inspector-mode-buttons"><button className={task.outputFormat !== 'json' ? 'active' : ''} onClick={() => onUpdate({ outputFormat: 'text' })}>Text</button><button className={task.outputFormat === 'json' ? 'active' : ''} onClick={() => onUpdate({ outputFormat: 'json' })}>JSON</button></div></InspectorGroup><div className="th-inspector-footer"><button className="danger" onClick={onDelete}>删除 Task</button></div></aside>
}

function InspectorTitle({ eyebrow, title, meta }: { eyebrow: string; title: string; meta: string }) { return <div className="th-inspector-title"><span>{eyebrow}</span><h2>{title}</h2><small>{meta}</small></div> }
function InspectorGroup({ title, count, open, onToggle, children }: { title: string; count?: number; open: boolean; onToggle: () => void; children: React.ReactNode }) { return <section className="th-inspector-group"><button className="th-inspector-group-title" onClick={onToggle}><span>{open ? '⌄' : '›'}</span><strong>{title}</strong>{count !== undefined && <em>{count}</em>}</button>{open && <div className="th-inspector-group-body">{children}</div>}</section> }
