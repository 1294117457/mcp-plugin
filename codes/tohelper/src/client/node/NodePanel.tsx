import { useState, useEffect, useCallback } from 'react'
import { nodeApi, toolApi } from '../api'
import { NodeList } from './NodeList'
import { NodeEditor } from './NodeEditor'
import { NodeEditorV2 } from './NodeEditorV2'
import type { NodeConfig } from '../../types'
import type { CreateNodePayload, UpdateNodePayload, LLMOption } from '../api'

interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
  useV2?: boolean  // 是否使用新架构的编辑器
}

const PANEL_W = 650  // 扩大宽度以容纳 Task 编辑器
const PANEL_H = 720  // 增加高度避免挤压

export function NodePanel({ btnPos, onClose, useV2 = true }: Props) {
  const [view, setView] = useState<'list' | 'editor'>('list')
  const [editingNode, setEditingNode] = useState<NodeConfig | null>(null)
  const [nodes, setNodes] = useState<NodeConfig[]>([])
  const [equippedNodeIds, setEquippedNodeIds] = useState<string[]>([])
  const [availableTools, setAvailableTools] = useState<string[]>([])
  const [availableLLMs, setAvailableLLMs] = useState<LLMOption[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      // 并行加载 Node 列表、Tool 列表和 LLM 列表
      const [nodeRes, toolRes, llmRes] = await Promise.all([
        nodeApi.list(),
        toolApi.getTools(),
        toolApi.getLLMs()
      ])
      
      setNodes(nodeRes.nodes)
      setEquippedNodeIds(nodeRes.equipped)
      
      // 提取所有可用的 Tool 名称
      const toolNames = [
        ...toolRes.builtin.map(t => t.name),
        ...toolRes.mcp.map(t => t.name).filter(name => !toolRes.denied?.includes(name))
      ]
      setAvailableTools(toolNames)
      
      // 设置 LLM 列表
      if (llmRes.ok) {
        setAvailableLLMs(llmRes.llms)
      }
      
      setLoading(false)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  // 计算面板位置（避免超出屏幕）
  let top = btnPos.y - PANEL_H - 12
  let left = btnPos.x + 80 - PANEL_W
  if (top < 8) top = btnPos.y + 80 + 12
  if (left < 8) left = 8
  if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
  if (top + PANEL_H > window.innerHeight - 8) top = window.innerHeight - PANEL_H - 8

  async function handleSave(payload: any) {
    try {
      const res = editingNode
        ? await nodeApi.update({ id: editingNode.id, ...payload })
        : await nodeApi.create(payload)
      
      if (!res.ok) {
        setError(res.error || 'Save failed')
        return
      }
      
      setView('list')
      setEditingNode(null)
      reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleDelete(id: string) {
    try {
      await nodeApi.delete(id)
      reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  async function handleEquip(nodeId: string, equipped: boolean) {
    try {
      const res = equipped
        ? await nodeApi.unequip(nodeId)
        : await nodeApi.equip(nodeId)
      
      if (!res.ok) {
        setError(res.error || 'Equip/Unequip failed')
        return
      }
      
      reload()
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div className="th-panel" style={{
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      width: `${PANEL_W}px`,
      height: `${PANEL_H}px`,
      pointerEvents: 'auto',
    }}>
      <div className="th-hdr">
        <h2>节点定义</h2>
        <button className="th-cls" onClick={onClose}>&times;</button>
      </div>
      
      {error && (
        <div className="th-error" style={{ padding: '8px 14px', fontSize: '13px' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
        </div>
      )}
      
      <div className="th-body">
        {view === 'list' ? (
          <NodeList
            nodes={nodes}
            equippedNodeIds={equippedNodeIds}
            loading={loading}
            onEdit={(node) => {
              setEditingNode(node)
              setView('editor')
              setError('')
            }}
            onCreate={() => {
              setEditingNode(null)
              setView('editor')
              setError('')
            }}
            onDelete={handleDelete}
            onEquip={handleEquip}
          />
        ) : (
          useV2 ? (
            <NodeEditorV2
              initial={editingNode}
              availableTools={availableTools}
              availableLLMs={availableLLMs}
              onSave={handleSave}
              onCancel={() => {
                setView('list')
                setError('')
              }}
            />
          ) : (
            <NodeEditor
              initial={editingNode}
              availableTools={availableTools}
              availableLLMs={availableLLMs}
              onSave={handleSave}
              onCancel={() => {
                setView('list')
                setError('')
              }}
            />
          )
        )}
      </div>
    </div>
  )
}
