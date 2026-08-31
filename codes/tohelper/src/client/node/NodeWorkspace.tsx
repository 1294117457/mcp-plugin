import { useCallback, useEffect, useRef, useState } from 'react'
import type { NodeConfig, NodeMode, TaskConfig } from '../../types'
import type { LLMOption } from '../api'
import { taskApi } from '../api'

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

interface NodePosition {
  x: number
  y: number
  width: number
  height: number
}

const DEFAULT_VIEWPORT = { x: 40, y: 40, zoom: 1 }
const MIN_ZOOM = 0.15
const MAX_ZOOM = 4
const DEFAULT_NODE_W = 360
const DEFAULT_NODE_H = 240

function clamp(v: number, min: number, max: number) { return Math.max(min, Math.min(max, v)) }

export function NodeWorkspace({ nodes: sourceNodes, availableTools, availableLLMs, loading, onSave, onDelete, onEquip, equippedNodeIds }: Props) {
  const [nodes, setNodes] = useState<NodeConfig[]>(sourceNodes)
  const [allTasks, setAllTasks] = useState<TaskConfig[]>([])
  const [selection, setSelection] = useState<string | null>(null)
  const [positions, setPositions] = useState<Record<string, NodePosition>>({})
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT)
  const [dirty, setDirty] = useState(false)
  const [drag, setDrag] = useState<{ nodeId?: string; startX: number; startY: number; origX: number; origY: number; mode: 'move' | 'pan' } | null>(null)
  const [error, setError] = useState('')
  const canvasRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setNodes(sourceNodes)
    const next: Record<string, NodePosition> = {}
    sourceNodes.forEach((node, i) => {
      next[node.id] = positions[node.id] || {
        x: 40 + (i % 3) * 420,
        y: 40 + Math.floor(i / 3) * 300,
        width: DEFAULT_NODE_W,
        height: DEFAULT_NODE_H,
      }
    })
    setPositions(next)
  }, [sourceNodes])

  useEffect(() => {
    taskApi.list().then(res => { if (res.tasks) setAllTasks(res.tasks) }).catch(() => {})
  }, [])

  const selectedNode = selection ? nodes.find(n => n.id === selection) || null : null
  const taskMap = Object.fromEntries(allTasks.map(t => [t.id, t]))

  const updateNode = useCallback((nodeId: string, update: Partial<NodeConfig>) => {
    setNodes(cur => cur.map(n => n.id === nodeId ? { ...n, ...update } : n))
    setDirty(true)
  }, [])

  const addNode = useCallback(() => {
    const id = `node-draft-${Date.now().toString(36)}`
    const node: NodeConfig = {
      id, name: 'new_node', description: '', mode: 'pipeline',
      nodePrompt: '', llm: { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 },
      tasks: [],
      inputSchema: { type: 'object', properties: { input: { type: 'string', description: '输入文本' } }, required: ['input'] },
      outputSchema: { type: 'object', properties: { result: { type: 'string', description: '输出结果' } }, required: ['result'] },
      createdAt: new Date().toISOString(),
    }
    setNodes(cur => [...cur, node])
    setPositions(cur => ({ ...cur, [id]: { x: -viewport.x / viewport.zoom + 60, y: -viewport.y / viewport.zoom + 60, width: DEFAULT_NODE_W, height: DEFAULT_NODE_H } }))
    setSelection(id)
    setDirty(true)
  }, [viewport])

  const saveAll = useCallback(async () => {
    try {
      for (const node of nodes) {
        const ok = await onSave(node)
        if (!ok) return
      }
      setDirty(false)
      setError('')
    } catch (e: any) {
      setError(e.message || '保存失败')
    }
  }, [nodes, onSave])

  const onPointerDown = useCallback((e: React.PointerEvent, nodeId?: string) => {
    if ((e.target as HTMLElement).closest('button, input, textarea, select')) return
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    if (nodeId) {
      const pos = positions[nodeId] || { x: 0, y: 0 }
      setDrag({ nodeId, startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y, mode: 'move' })
      setSelection(nodeId)
    } else {
      setDrag({ startX: e.clientX, startY: e.clientY, origX: viewport.x, origY: viewport.y, mode: 'pan' })
      setSelection(null)
    }
  }, [positions, viewport])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag) return
    const dx = e.clientX - drag.startX
    const dy = e.clientY - drag.startY
    if (drag.mode === 'pan') {
      setViewport(cur => ({ ...cur, x: drag.origX + dx, y: drag.origY + dy }))
    } else if (drag.nodeId) {
      setPositions(cur => ({ ...cur, [drag.nodeId!]: { ...cur[drag.nodeId!], x: drag.origX + dx / viewport.zoom, y: drag.origY + dy / viewport.zoom } }))
    }
  }, [drag, viewport.zoom])

  const onPointerUp = useCallback(() => setDrag(null), [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return
    e.preventDefault()
    setViewport(cur => ({ ...cur, zoom: clamp(cur.zoom - e.deltaY * 0.001, MIN_ZOOM, MAX_ZOOM) }))
  }, [])

  return (
    <div className="th-workspace">
      <div className="th-workspace-toolbar">
        <div className="th-workspace-heading">
          <span className="th-workspace-mark">&#9744;</span>
          <div><strong>Node 编排画板</strong><span>{nodes.length} 个 Node{dirty ? ' · 未保存' : ''}</span></div>
        </div>
        <div className="th-workspace-actions">
          <button className="th-canvas-btn th-canvas-btn-create" onClick={addNode}>+ 创建 Node</button>
          <button className="th-canvas-btn" onClick={() => setViewport(cur => ({ ...cur, zoom: clamp(cur.zoom + 0.1, MIN_ZOOM, MAX_ZOOM) }))}>+</button>
          <button className="th-canvas-btn" onClick={() => setViewport(cur => ({ ...cur, zoom: clamp(cur.zoom - 0.1, MIN_ZOOM, MAX_ZOOM) }))}>&minus;</button>
          <button className="th-canvas-btn th-canvas-zoom" onClick={() => setViewport(DEFAULT_VIEWPORT)}>{Math.round(viewport.zoom * 100)}%</button>
          <button className="th-canvas-btn th-canvas-save" onClick={saveAll} disabled={!dirty}>保存</button>
        </div>
      </div>
      {error && <div className="th-workspace-error">{error}</div>}
      <div className="th-workspace-main">
        <div className={`th-canvas-shell${drag?.mode === 'pan' ? ' panning' : ''}`} ref={canvasRef}
          onWheel={handleWheel}
          onPointerDown={e => {
            const target = e.target as HTMLElement
            if (target === canvasRef.current || target.classList.contains('th-canvas-viewport')) onPointerDown(e)
          }}
          onPointerMove={onPointerMove} onPointerUp={onPointerUp}>
          {loading ? <div className="th-canvas-empty">加载中...</div> : nodes.length === 0 ? (
            <div className="th-canvas-empty">
              <strong>还没有 Node</strong>
              <span>点击"创建 Node"开始编排</span>
              <button className="th-canvas-btn th-canvas-btn-create" onClick={addNode}>+ 创建 Node</button>
            </div>
          ) : (
            <div className="th-canvas-viewport" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}>
              {nodes.map(node => {
                const pos = positions[node.id] || { x: 0, y: 0, width: DEFAULT_NODE_W, height: DEFAULT_NODE_H }
                const resolvedTasks = node.tasks.map(tid => taskMap[tid]).filter(Boolean)
                return (
                  <div key={node.id}
                    className={`th-canvas-node th-canvas-node-${node.mode} ${selection === node.id ? 'selected' : ''}`}
                    style={{ left: pos.x, top: pos.y, width: pos.width, minHeight: pos.height }}
                    onPointerDown={e => onPointerDown(e, node.id)}>
                    <div className="th-canvas-node-header">
                      <span className="th-canvas-node-icon">{node.mode === 'loop' ? '\u27F3' : '\u2261'}</span>
                      <div className="th-canvas-node-title">
                        <strong>{node.name || '未命名'}</strong>
                        <span>{node.mode.toUpperCase()} &middot; {node.tasks.length} Task &middot; {node.llm.model}</span>
                      </div>
                    </div>
                    <div className="th-canvas-node-body" style={{ padding: '8px 12px', fontSize: '12px' }}>
                      {resolvedTasks.length === 0 ? (
                        <div style={{ color: '#9ca3af', textAlign: 'center', padding: '12px 0' }}>未关联 Task</div>
                      ) : resolvedTasks.map((task, i) => (
                        <div key={task.id} style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          padding: '6px 8px', marginBottom: '4px', borderRadius: '6px',
                          background: '#f9fafb', border: '1px solid #e5e7eb',
                        }}>
                          <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, minWidth: '18px' }}>
                            {node.mode === 'loop' ? '\u00B7' : i + 1}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 500, fontSize: '12px' }}>{task.name}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>{task.llm.model} &middot; {task.tools.length} Tools</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="th-canvas-node-base">
                      <span>{node.description || '未填写描述'}</span>
                      <span className="th-canvas-mode-pill">{node.mode}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        <NodeInspector
          node={selectedNode}
          allTasks={allTasks}
          availableLLMs={availableLLMs}
          equipped={selectedNode ? equippedNodeIds.includes(selectedNode.id) : false}
          onUpdate={updateNode}
          onDelete={onDelete}
          onEquip={onEquip}
        />
      </div>
    </div>
  )
}

interface NodeInspectorProps {
  node: NodeConfig | null
  allTasks: TaskConfig[]
  availableLLMs: LLMOption[]
  equipped: boolean
  onUpdate: (id: string, update: Partial<NodeConfig>) => void
  onDelete: (id: string) => Promise<void>
  onEquip: (id: string, equipped: boolean) => Promise<void>
}

function NodeInspector({ node, allTasks, availableLLMs, equipped, onUpdate, onDelete, onEquip }: NodeInspectorProps) {
  if (!node) {
    return (
      <aside className="th-inspector th-inspector-empty">
        <div className="th-inspector-empty-icon">&#9744;</div>
        <strong>选择一个 Node</strong>
        <span>在左侧画板中点击 Node 查看配置</span>
      </aside>
    )
  }

  const llm = node.llm
  const llmOptions = availableLLMs.length ? availableLLMs : [
    { provider: 'deepseek-official', model: 'deepseek-chat', displayName: 'deepseek-official/deepseek-chat' },
    { provider: 'deepseek-official', model: 'deepseek-reasoner', displayName: 'deepseek-official/deepseek-reasoner' },
  ]

  const update = (partial: Partial<NodeConfig>) => onUpdate(node.id, partial)

  const toggleTask = (taskId: string) => {
    const current = node.tasks
    if (current.includes(taskId)) {
      update({ tasks: current.filter(id => id !== taskId) })
    } else {
      update({ tasks: [...current, taskId] })
    }
  }

  const moveTask = (taskId: string, dir: -1 | 1) => {
    const idx = node.tasks.indexOf(taskId)
    if (idx < 0) return
    const next = [...node.tasks]
    const target = idx + dir
    if (target < 0 || target >= next.length) return
    ;[next[idx], next[target]] = [next[target], next[idx]]
    update({ tasks: next })
  }

  return (
    <aside className="th-inspector">
      <div className="th-inspector-title">
        <span>NODE</span>
        <h2>{node.name || '未命名'}</h2>
        <small>{node.mode.toUpperCase()} &middot; {node.tasks.length} TASKS</small>
      </div>
      <section className="th-inspector-group">
        <button className="th-inspector-group-title"><span>&#x2304;</span><strong>基本信息</strong></button>
        <div className="th-inspector-group-body">
          <label>名称<input value={node.name} onChange={e => update({ name: e.target.value })} /></label>
          <label>描述<input value={node.description} onChange={e => update({ description: e.target.value })} /></label>
        </div>
      </section>
      <section className="th-inspector-group">
        <button className="th-inspector-group-title"><span>&#x2304;</span><strong>Node Prompt</strong></button>
        <div className="th-inspector-group-body">
          <textarea rows={4} value={node.nodePrompt} onChange={e => update({ nodePrompt: e.target.value })} />
        </div>
      </section>
      <section className="th-inspector-group">
        <button className="th-inspector-group-title"><span>&#x2304;</span><strong>运行配置</strong></button>
        <div className="th-inspector-group-body">
          <div className="th-inspector-row">
            <label className="th-inspector-row-item th-inspector-row-flex2">LLM
              <select value={`${llm.provider}/${llm.model}`} onChange={e => { const [provider, model] = e.target.value.split('/'); update({ llm: { ...llm, provider, model } }) }}>
                {llmOptions.map(item => <option key={item.displayName} value={`${item.provider}/${item.model}`}>{item.displayName}</option>)}
              </select>
            </label>
            <label className="th-inspector-row-item">T
              <input type="number" min="0" max="2" step="0.1" value={llm.temperature ?? 0.7} onChange={e => update({ llm: { ...llm, temperature: Number(e.target.value) } })} />
            </label>
          </div>
          <span className="th-inspector-label">执行模式</span>
          <div className="th-inspector-mode-buttons">
            {(['pipeline', 'loop'] as NodeMode[]).map(m => (
              <button key={m} className={node.mode === m ? 'active' : ''} onClick={() => update({ mode: m })}>{m}</button>
            ))}
          </div>
          <span className="th-inspector-hint">{node.mode === 'pipeline' ? 'Task 按顺序链式执行' : 'LLM 动态选择 Task'}</span>
        </div>
      </section>
      <section className="th-inspector-group">
        <button className="th-inspector-group-title"><span>&#x2304;</span><strong>Tasks</strong><em>{node.tasks.length}</em></button>
        <div className="th-inspector-group-body">
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>从 Task 库中选择要编排的 Task</div>
          {/* Selected tasks with ordering */}
          {node.tasks.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
              {node.tasks.map((tid, i) => {
                const task = allTasks.find(t => t.id === tid)
                return (
                  <div key={tid} style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 8px', borderRadius: '6px', background: '#eef2ff', border: '1px solid #c7d2fe', fontSize: '12px',
                  }}>
                    <span style={{ fontWeight: 600, color: '#4f46e5', minWidth: '16px' }}>{i + 1}</span>
                    <span style={{ flex: 1 }}>{task?.name || tid}</span>
                    {node.mode === 'pipeline' && <>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }} onClick={() => moveTask(tid, -1)} disabled={i === 0}>&uarr;</button>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }} onClick={() => moveTask(tid, 1)} disabled={i === node.tasks.length - 1}>&darr;</button>
                    </>}
                    <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: '#ef4444', padding: '0 2px' }} onClick={() => toggleTask(tid)}>&times;</button>
                  </div>
                )
              })}
            </div>
          )}
          {/* Available tasks to add */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {allTasks.filter(t => !node.tasks.includes(t.id)).map(task => (
              <button key={task.id} onClick={() => toggleTask(task.id)} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '6px 8px', borderRadius: '6px', background: '#f9fafb', border: '1px solid #e5e7eb',
                cursor: 'pointer', fontSize: '12px', textAlign: 'left', width: '100%',
              }}>
                <span style={{ color: '#10b981', fontWeight: 600 }}>+</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500 }}>{task.name}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>{task.description}</div>
                </div>
              </button>
            ))}
            {allTasks.length === 0 && <div style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', padding: '8px 0' }}>暂无 Task，请先在 Task 面板创建</div>}
          </div>
        </div>
      </section>
      <div className="th-inspector-footer">
        <button onClick={() => onEquip(node.id, equipped)} className={equipped ? 'equipped' : ''}>{equipped ? '&#10003; 已装配' : '装配 Node'}</button>
        <button className="danger" onClick={() => { if (confirm(`确定删除 "${node.name}"？`)) onDelete(node.id) }}>删除</button>
      </div>
    </aside>
  )
}
