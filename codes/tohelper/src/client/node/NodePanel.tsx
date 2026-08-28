import { useState, useEffect, useCallback } from 'react'
import { nodeApi } from '../api'
import { NodeList } from './NodeList'
import { NodeEditor } from './NodeEditor'
import type { NodeConfig } from '../../types'
import type { CreateNodePayload, UpdateNodePayload } from '../api'

interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
}

const PANEL_W = 480
const PANEL_H = 600

export function NodePanel({ btnPos, onClose }: Props) {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingNode, setEditingNode] = useState<NodeConfig | null>(null)
  const [nodes, setNodes] = useState<NodeConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    setLoading(true)
    nodeApi.list()
      .then(r => { setNodes(r.nodes); setLoading(false) })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  useEffect(() => { reload() }, [])

  let top = btnPos.y - PANEL_H - 12
  let left = btnPos.x + 80 - PANEL_W
  if (top < 8) top = btnPos.y + 80 + 12
  if (left < 8) left = 8
  if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
  if (top + PANEL_H > window.innerHeight - 8) top = window.innerHeight - PANEL_H - 8

  async function handleSave(data: CreateNodePayload | UpdateNodePayload) {
    if ('id' in data && data.id) {
      const res = await nodeApi.update(data as UpdateNodePayload)
      if (!res.ok) { setError(res.error || 'Update failed'); return }
    } else {
      const res = await nodeApi.create(data)
      if (!res.ok) { setError(res.error || 'Create failed'); return }
    }
    setView('list')
    setEditingNode(null)
    reload()
  }

  async function handleDelete(id: string) {
    await nodeApi.delete(id)
    reload()
  }

  return (
    <div className="th-panel" style={{
      position: 'fixed', left: `${left}px`, top: `${top}px`,
      width: `${PANEL_W}px`, height: `${PANEL_H}px`, pointerEvents: 'auto',
    }}>
      <div className="th-hdr">
        <h2>节点定义</h2>
        <button className="th-cls" onClick={onClose}>&times;</button>
      </div>
      <p className="th-hint">在此创建节点，创建后可在 Tool 面板中装配使用</p>
      {error && <div className="th-error" style={{ padding: '0 14px' }}>{error}</div>}
      <div className="th-body">
        {view === 'list' ? (
          <NodeList
            nodes={nodes}
            loading={loading}
            onEdit={(node) => { setEditingNode(node); setView('editor'); setError('') }}
            onCreate={() => { setEditingNode(null); setView('editor'); setError('') }}
            onDelete={handleDelete}
          />
        ) : (
          <NodeEditor
            initial={editingNode}
            onSave={handleSave}
            onCancel={() => { setView('list'); setError('') }}
          />
        )}
      </div>
    </div>
  )
}
