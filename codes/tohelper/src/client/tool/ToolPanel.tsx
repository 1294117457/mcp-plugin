import { useState, useEffect, useCallback, useRef } from 'react'
import type { ToolsResponse, SkillItem, McpServer } from '../api'
import { toolApi, nodeApi } from '../api'
import { ToolsTab } from './ToolsTab'
import { McpTab } from './McpTab'
import { SkillsTab } from './SkillsTab'
import type { NodeConfig } from '../../types'

interface Props {
  btnPos: { x: number; y: number }
  onClose: () => void
}

export interface ToolPanelData {
  tools: ToolsResponse | null
  skills: SkillItem[]
  servers: McpServer[]
  denied: Set<string>
  nodes: Array<{ name: string; description: string; nodeId: string; equipped: boolean }>
  loading: boolean
  error: string
}

const PANEL_W = 420
const PANEL_H = 700

const tabs: Array<{ key: 'tools' | 'mcp' | 'skills'; label: string }> = [
  { key: 'tools', label: '工具' },
  { key: 'mcp', label: 'MCP' },
  { key: 'skills', label: '技能' },
]

export function ToolPanel({ btnPos, onClose }: Props) {
  const [tab, setTab] = useState<'tools' | 'mcp' | 'skills'>('tools')
  const [tools, setTools] = useState<ToolsResponse | null>(null)
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [servers, setServers] = useState<McpServer[]>([])
  const [denied, setDenied] = useState<Set<string>>(new Set())
  const [nodes, setNodes] = useState<Array<{ name: string; description: string; nodeId: string; equipped: boolean }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isInitialLoad = useRef(true)

  const reload = useCallback(() => {
    if (isInitialLoad.current) setLoading(true)
    setError('')
    Promise.all([toolApi.getTools(), toolApi.getSkills(), toolApi.getMcpServers(), nodeApi.list()])
      .then(([t, s, m, n]) => {
        setTools(t)
        setSkills(s.skills)
        setServers(m.servers)
        setDenied(new Set(m.denied))
        setNodes(n.nodes.map((nd: NodeConfig) => ({
          name: nd.name,
          description: nd.description,
          nodeId: nd.id,
          equipped: n.equipped.includes(nd.id),
        })))
        setLoading(false)
        isInitialLoad.current = false
      })
      .catch(e => {
        setError(e.message || 'Failed to load data')
        setLoading(false)
        isInitialLoad.current = false
      })
  }, [])

  useEffect(() => { reload() }, [])

  let top = btnPos.y - PANEL_H - 12
  let left = btnPos.x + 80 - PANEL_W
  if (top < 8) top = btnPos.y + 80 + 12
  if (left < 8) left = 8
  if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
  if (top + PANEL_H > window.innerHeight - 8) top = window.innerHeight - PANEL_H - 8

  const data: ToolPanelData = { tools, skills, servers, denied, nodes, loading, error }

  return (
    <div className="th-panel" style={{
      position: 'fixed', left: `${left}px`, top: `${top}px`,
      width: `${PANEL_W}px`, height: `${PANEL_H}px`, pointerEvents: 'auto',
    }}>
      <div className="th-hdr">
        <h2>工具装配</h2>
        <button className="th-cls" onClick={onClose}>&times;</button>
      </div>
      <div className="th-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="th-body">
        {tab === 'tools' && <ToolsTab data={data} reload={reload} />}
        {tab === 'mcp' && <McpTab data={data} reload={reload} />}
        {tab === 'skills' && <SkillsTab data={data} />}
      </div>
    </div>
  )
}
