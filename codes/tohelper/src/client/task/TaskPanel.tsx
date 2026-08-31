import { useState, useEffect, useCallback } from 'react'
import { taskApi, toolApi } from '../api'
import type { TaskConfig } from '../../types'
import type { LLMOption } from '../api'

interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
}

const PANEL_W = 820
const PANEL_H = 720

export function TaskPanel({ btnPos, onClose }: Props) {
  const [tasks, setTasks] = useState<TaskConfig[]>([])
  const [equippedIds, setEquippedIds] = useState<string[]>([])
  const [availableTools, setAvailableTools] = useState<string[]>([])
  const [availableLLMs, setAvailableLLMs] = useState<LLMOption[]>([])
  const [editing, setEditing] = useState<TaskConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [taskRes, toolRes, llmRes] = await Promise.all([
        taskApi.list(),
        toolApi.getTools(),
        toolApi.getLLMs(),
      ])
      setTasks(taskRes.tasks)
      setEquippedIds(taskRes.equipped)
      setAvailableTools([
        ...toolRes.builtin.map(t => t.name),
        ...toolRes.mcp.filter(t => !t.denied).map(t => t.name),
      ])
      if (llmRes.ok) setAvailableLLMs(llmRes.llms)
      setError('')
    } catch (e: any) {
      setError(e.message || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  const panelWidth = Math.min(PANEL_W, window.innerWidth - 16)
  const panelHeight = Math.min(PANEL_H, window.innerHeight - 16)
  let top = btnPos.y - panelHeight - 12
  let left = btnPos.x + 80 - panelWidth
  if (top < 8) top = btnPos.y + 80 + 12
  if (left < 8) left = 8
  if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8
  if (top + panelHeight > window.innerHeight - 8) top = window.innerHeight - panelHeight - 8

  async function handleSave(task: TaskConfig): Promise<boolean> {
    try {
      const isDraft = task.id.startsWith('task-draft-')
      const res = isDraft
        ? await taskApi.create(task as any)
        : await taskApi.update({ ...task } as any)
      if (!res.ok) { setError(res.error || '保存失败'); return false }
      setEditing(null)
      await reload()
      return true
    } catch (e: any) {
      setError(e.message || '保存失败')
      return false
    }
  }

  async function handleDelete(id: string) {
    if (id.startsWith('task-draft-')) { setEditing(null); return }
    try {
      const res = await taskApi.delete(id)
      if (!res.ok) throw new Error(res.error || '删除失败')
      setEditing(null)
      await reload()
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }

  async function handleEquip(id: string, equipped: boolean) {
    try {
      const res = equipped ? await taskApi.unequip(id) : await taskApi.equip(id)
      if (!res.ok) throw new Error(res.error || '操作失败')
      await reload()
    } catch (e: any) {
      setError(e.message || '操作失败')
    }
  }

  function handleCreate() {
    setEditing({
      id: `task-draft-${Date.now().toString(36)}`,
      name: '',
      description: '',
      taskPrompt: '',
      llm: { provider: 'deepseek-official', model: 'deepseek-chat', temperature: 0.7, maxTokens: 2000 },
      tools: [],
      inputSchema: { type: 'object', properties: { input: { type: 'string', description: '输入文本' } }, required: ['input'] },
      outputSchema: { type: 'object', properties: { result: { type: 'string', description: '输出结果' } }, required: ['result'] },
      createdAt: new Date().toISOString(),
    })
  }

  return (
    <div className="th-panel" style={{
      position: 'fixed', left: `${left}px`, top: `${top}px`,
      width: `${panelWidth}px`, height: `${panelHeight}px`, pointerEvents: 'auto',
    }}>
      <div className="th-hdr">
        <h2>Task 管理</h2>
        <button className="th-cls" onClick={onClose} aria-label="关闭">&times;</button>
      </div>
      {error && <div className="th-error" style={{ padding: '8px 14px', fontSize: '12px' }}>{error}</div>}
      <div className="th-body" style={{ display: 'flex', gap: '0', height: 'calc(100% - 44px)' }}>
        {/* Task list */}
        <div style={{ width: editing ? '240px' : '100%', borderRight: editing ? '1px solid #e5e7eb' : 'none', overflow: 'auto', padding: '12px', transition: 'width 0.2s' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6b7280' }}>{tasks.length} 个 Task</span>
            <button className="th-btn th-btn-primary" style={{ fontSize: '12px', padding: '4px 12px' }} onClick={handleCreate}>+ 创建</button>
          </div>
          {loading ? <div className="th-empty">加载中...</div> : tasks.length === 0 ? <div className="th-empty">暂无 Task</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tasks.map(task => {
                const equipped = equippedIds.includes(task.id)
                const isSelected = editing?.id === task.id
                return (
                  <div key={task.id} onClick={() => setEditing(task)} style={{
                    padding: '10px 12px', borderRadius: '8px', cursor: 'pointer',
                    border: `1px solid ${isSelected ? '#4f46e5' : '#e5e7eb'}`,
                    background: isSelected ? '#eef2ff' : '#fff',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong style={{ fontSize: '13px' }}>{task.name || '未命名'}</strong>
                      {equipped && <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: '#dcfce7', color: '#166534' }}>已装配</span>}
                    </div>
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>{task.description || '无描述'}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>
                      {task.llm.model} &middot; {task.tools.length} Tools
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        {/* Task editor */}
        {editing && (
          <TaskEditor
            task={editing}
            equipped={equippedIds.includes(editing.id)}
            availableTools={availableTools}
            availableLLMs={availableLLMs}
            onChange={setEditing}
            onSave={() => handleSave(editing)}
            onDelete={() => handleDelete(editing.id)}
            onEquip={() => handleEquip(editing.id, equippedIds.includes(editing.id))}
            onClose={() => setEditing(null)}
          />
        )}
      </div>
    </div>
  )
}

interface TaskEditorProps {
  task: TaskConfig
  equipped: boolean
  availableTools: string[]
  availableLLMs: LLMOption[]
  onChange: (task: TaskConfig) => void
  onSave: () => void
  onDelete: () => void
  onEquip: () => void
  onClose: () => void
}

function TaskEditor({ task, equipped, availableTools, availableLLMs, onChange, onSave, onDelete, onEquip, onClose }: TaskEditorProps) {
  const update = (partial: Partial<TaskConfig>) => onChange({ ...task, ...partial })
  const llmOptions = availableLLMs.length ? availableLLMs : [
    { provider: 'deepseek-official', model: 'deepseek-chat', displayName: 'deepseek-official/deepseek-chat' },
    { provider: 'deepseek-official', model: 'deepseek-reasoner', displayName: 'deepseek-official/deepseek-reasoner' },
  ]

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong style={{ fontSize: '14px' }}>{task.id.startsWith('task-draft-') ? '创建 Task' : '编辑 Task'}</strong>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}>&times;</button>
      </div>
      <label style={{ fontSize: '12px', color: '#374151' }}>
        名称 (工具名)
        <input value={task.name} onChange={e => update({ name: e.target.value })} placeholder="my_task" style={{ width: '100%', marginTop: '4px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
      </label>
      <label style={{ fontSize: '12px', color: '#374151' }}>
        描述
        <input value={task.description} onChange={e => update({ description: e.target.value })} placeholder="这个 Task 做什么" style={{ width: '100%', marginTop: '4px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
      </label>
      <label style={{ fontSize: '12px', color: '#374151' }}>
        Task Prompt (系统提示词)
        <textarea value={task.taskPrompt} onChange={e => update({ taskPrompt: e.target.value })} rows={5} placeholder="告诉 LLM 如何处理输入..." style={{ width: '100%', marginTop: '4px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', gap: '12px' }}>
        <label style={{ flex: 2, fontSize: '12px', color: '#374151' }}>
          LLM
          <select value={`${task.llm.provider}/${task.llm.model}`} onChange={e => {
            const [provider, model] = e.target.value.split('/')
            update({ llm: { ...task.llm, provider, model } })
          }} style={{ width: '100%', marginTop: '4px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px' }}>
            {llmOptions.map(item => <option key={item.displayName} value={`${item.provider}/${item.model}`}>{item.displayName}</option>)}
          </select>
        </label>
        <label style={{ flex: 1, fontSize: '12px', color: '#374151' }}>
          Temperature
          <input type="number" min="0" max="2" step="0.1" value={task.llm.temperature ?? 0.7} onChange={e => update({ llm: { ...task.llm, temperature: Number(e.target.value) } })} style={{ width: '100%', marginTop: '4px', padding: '6px 8px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px' }} />
        </label>
      </div>
      <label style={{ fontSize: '12px', color: '#374151' }}>
        工具 (多选)
        <select multiple size={Math.min(5, Math.max(availableTools.length, 2))} value={task.tools} onChange={e => update({ tools: Array.from(e.target.selectedOptions).map(o => o.value) })} style={{ width: '100%', marginTop: '4px', padding: '4px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px' }}>
          {availableTools.length ? availableTools.map(tool => <option key={tool} value={tool}>{tool}</option>) : <option disabled>暂无可用工具</option>}
        </select>
      </label>
      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
        <button className="th-btn th-btn-primary" onClick={onSave} style={{ flex: 1 }}>保存</button>
        {!task.id.startsWith('task-draft-') && (
          <button className={`th-btn ${equipped ? 'th-btn-success' : 'th-btn-secondary'}`} onClick={onEquip} style={{ flex: 1 }}>
            {equipped ? '卸载' : '装配为工具'}
          </button>
        )}
        <button className="th-btn th-btn-danger" onClick={() => { if (confirm(`确定删除 "${task.name}"？`)) onDelete() }}>删除</button>
      </div>
    </div>
  )
}
