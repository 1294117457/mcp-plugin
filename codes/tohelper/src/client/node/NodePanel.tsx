import { useState, useEffect, useCallback } from 'react'
import { nodeApi, toolApi } from '../api'
import { NodeWorkspace } from './NodeWorkspace'
import type { NodeConfig } from '../../types'
import type { LLMOption } from '../api'

interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
}

const PANEL_W = 1180
const PANEL_H = 820

export function NodePanel({ btnPos, onClose }: Props) {
  const [nodes, setNodes] = useState<NodeConfig[]>([])
  const [equippedNodeIds, setEquippedNodeIds] = useState<string[]>([])
  const [availableTools, setAvailableTools] = useState<string[]>([])
  const [availableLLMs, setAvailableLLMs] = useState<LLMOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [nodeRes, toolRes, llmRes] = await Promise.all([
        nodeApi.list(),
        toolApi.getTools(),
        toolApi.getLLMs(),
      ])
      setNodes(nodeRes.nodes)
      setEquippedNodeIds(nodeRes.equipped)
      setAvailableTools([
        ...toolRes.builtin.map(tool => tool.name),
        ...toolRes.mcp.filter(tool => !tool.denied).map(tool => tool.name),
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

  async function handleSave(payload: NodeConfig): Promise<boolean> {
    try {
      const isDraft = payload.id.startsWith('node-draft-')
      const res = isDraft
        ? await nodeApi.create(payload as any)
        : await nodeApi.update({ ...payload } as any)
      if (!res.ok) {
        setError(res.error || '保存失败')
        return false
      }
      await reload()
      return true
    } catch (e: any) {
      setError(e.message || '保存失败')
      return false
    }
  }

  async function handleDelete(id: string) {
    try {
      if (!id.startsWith('node-draft-')) {
        const res = await nodeApi.delete(id)
        if (!res.ok) throw new Error(res.error || '删除失败')
      }
      await reload()
    } catch (e: any) {
      setError(e.message || '删除失败')
    }
  }

  async function handleEquip(id: string, equipped: boolean) {
    try {
      const res = equipped ? await nodeApi.unequip(id) : await nodeApi.equip(id)
      if (!res.ok) throw new Error(res.error || '操作失败')
      await reload()
    } catch (e: any) {
      setError(e.message || '操作失败')
    }
  }

  return (
    <div className="th-panel th-node-workspace-panel" style={{
      position: 'fixed',
      left: `${left}px`, top: `${top}px`,
      width: `${panelWidth}px`, height: `${panelHeight}px`,
      pointerEvents: 'auto',
    }}>
      <div className="th-hdr">
        <h2>Node 编排</h2>
        <button className="th-cls" onClick={onClose} aria-label="关闭">&times;</button>
      </div>
      {error && <div className="th-error" style={{ padding: '8px 14px', fontSize: '12px' }}>{error}</div>}
      <div className="th-body th-workspace-body">
        <NodeWorkspace
          nodes={nodes}
          availableTools={availableTools}
          availableLLMs={availableLLMs}
          loading={loading}
          onSave={handleSave}
          onDelete={handleDelete}
          onEquip={handleEquip}
          equippedNodeIds={equippedNodeIds}
          onClose={onClose}
        />
      </div>
    </div>
  )
}
