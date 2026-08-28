import { useState } from 'react'
import type { ToolPanelData } from './ToolPanel'
import type { ToolItem } from '../api'
import { toolApi, nodeApi } from '../api'
import { ToolDetailView } from './ToolDetailView'

function getServerName(toolName: string): string {
  const m = toolName.match(/^mcp__([^_]+)__/)
  return m ? m[1] : 'unknown'
}

function groupByServer(tools: ToolItem[]): Map<string, ToolItem[]> {
  const map = new Map<string, ToolItem[]>()
  for (const t of tools) {
    const srv = getServerName(t.name)
    if (!map.has(srv)) map.set(srv, [])
    map.get(srv)!.push(t)
  }
  return map
}

interface Props {
  data: ToolPanelData
  reload: () => void
}

export function ToolsTab({ data, reload }: Props) {
  const [filter, setFilter] = useState<'all' | 'builtin' | 'mcp' | 'node'>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)
  const [opLoading, setOpLoading] = useState(false)
  const [opError, setOpError] = useState('')

  if (data.error) return <div className="th-empty">加载失败: {data.error}</div>
  if (data.loading || !data.tools) return <div className="th-empty">加载中...</div>

  const activeBuiltin = data.tools.builtin
  const allMcp = data.tools.mcp
  const nodeTools = data.nodes
  const builtinCount = activeBuiltin.length
  const mcpCount = allMcp.length
  const nodeCount = nodeTools.length

  const showBuiltin = filter === 'all' || filter === 'builtin'
  const showMcp = filter === 'all' || filter === 'mcp'
  const showNode = filter === 'all' || filter === 'node'

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  async function toggleNodeEquip(nodeId: string, equipped: boolean) {
    setOpLoading(true)
    setOpError('')
    try {
      const res = equipped
        ? await nodeApi.unequip(nodeId)
        : await nodeApi.equip(nodeId)
      if (!res.ok) {
        setOpError(res.error || '操作失败')
        return
      }
      reload()
    } catch (e: any) {
      setOpError(String(e?.message ?? e))
    } finally { setOpLoading(false) }
  }

  async function toggleMcpDeny(toolName: string, isDenied: boolean) {
    setOpLoading(true)
    setOpError('')
    try {
      const currentDenied = [...data.denied]
      const newDenied = isDenied
        ? currentDenied.filter(n => n !== toolName)
        : [...currentDenied, toolName]
      await toolApi.denyTools(newDenied)
      reload()
    } catch (e: any) {
      setOpError(String(e?.message ?? e))
    } finally { setOpLoading(false) }
  }

  return (
    <div className="th-tools-body">
      {opError && (
        <div className="th-error" style={{ margin: '8px 12px', cursor: 'pointer' }} onClick={() => setOpError('')}>
          {opError}
        </div>
      )}
      <div className="th-tools-filter">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          全部 <span className="n">{builtinCount + mcpCount + nodeCount}</span>
        </button>
        <button className={filter === 'builtin' ? 'active' : ''} onClick={() => setFilter('builtin')}>
          内置 <span className="n">{builtinCount}</span>
        </button>
        <button className={filter === 'mcp' ? 'active' : ''} onClick={() => setFilter('mcp')}>
          MCP <span className="n">{mcpCount}</span>
        </button>
        <button className={filter === 'node' ? 'active' : ''} onClick={() => setFilter('node')}>
          节点 <span className="n">{nodeCount}</span>
        </button>
      </div>
      <div className="th-tools-scroll">
        {showBuiltin && builtinCount > 0 && (
          <div className="th-collapse-group">
            <div
              className={`th-collapse-header${collapsed.has('builtin') ? ' collapsed' : ''}`}
              onClick={() => toggleCollapse('builtin')}
            >
              <span className="arrow">&#9660;</span>
              <span className="srv-name">内置工具</span>
              <span className="th-cnt">{builtinCount}</span>
            </div>
            {!collapsed.has('builtin') && (
              <div className="th-collapse-body">
                {activeBuiltin.map(t => (
                  <ToolDetailView
                    key={t.name}
                    tool={t}
                    displayName={t.name}
                    expanded={expanded === t.name}
                    onToggleExpand={() => setExpanded(expanded === t.name ? null : t.name)}
                    tag={{ label: 'SYS', className: 'skl' }}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        {showMcp && mcpCount > 0 && (() => {
          const serverGroups = groupByServer(allMcp)
          const sorted = [...serverGroups.entries()].sort((a, b) => b[1].length - a[1].length)
          return sorted.map(([srv, srvTools]) => (
            <div key={srv} className="th-collapse-group">
              <div
                className={`th-collapse-header${collapsed.has(srv) ? ' collapsed' : ''}`}
                onClick={() => toggleCollapse(srv)}
              >
                <span className="arrow">&#9660;</span>
                <span className="srv-name">{srv}</span>
                <span className="th-cnt">{srvTools.length}</span>
              </div>
              {!collapsed.has(srv) && (
                <div className="th-collapse-body">
                  {srvTools.map(t => {
                    const isDenied = !!t.denied
                    return (
                      <ToolDetailView
                        key={t.name}
                        tool={t}
                        displayName={t.name.replace(/^mcp__[^_]+__/, '')}
                        expanded={expanded === t.name}
                        onToggleExpand={() => setExpanded(expanded === t.name ? null : t.name)}
                        tag={{ label: 'MCP', className: 'mcp' }}
                        action={
                          <button
                            className={`th-equip-toggle${!isDenied ? ' equipped' : ''}`}
                            disabled={opLoading}
                            onClick={() => toggleMcpDeny(t.name, isDenied)}
                          >
                            {isDenied ? '装配' : '已装配'}
                          </button>
                        }
                      />
                    )
                  })}
                </div>
              )}
            </div>
          ))
        })()}
        {showNode && nodeCount > 0 && (
          <div className="th-collapse-group">
            <div
              className={`th-collapse-header${collapsed.has('node') ? ' collapsed' : ''}`}
              onClick={() => toggleCollapse('node')}
            >
              <span className="arrow">&#9660;</span>
              <span className="srv-name">节点工具</span>
              <span className="th-cnt">{nodeCount}</span>
            </div>
            {!collapsed.has('node') && (
              <div className="th-collapse-body">
                {nodeTools.map(n => (
                  <div key={n.nodeId} className="th-i-wrap">
                    <div className="th-i clickable" onClick={() => setExpanded(expanded === `node:${n.nodeId}` ? null : `node:${n.nodeId}`)}>
                      <span className="th-tg node">Node</span>
                      <span className="nm">{n.name}</span>
                      <span className="ds">{n.description ? (n.description.length > 30 ? n.description.slice(0, 30) + '...' : n.description) : ''}</span>
                      <span className="th-action-slot" onClick={e => e.stopPropagation()}>
                        <button
                          className={`th-equip-toggle${n.equipped ? ' equipped' : ''}`}
                          disabled={opLoading}
                          onClick={() => toggleNodeEquip(n.nodeId, n.equipped)}
                        >
                          {n.equipped ? '已装配' : '装配'}
                        </button>
                      </span>
                    </div>
                    {expanded === `node:${n.nodeId}` && (
                      <div className="th-i-detail" style={{ display: 'block' }}>
                        <div className="th-detail-section">
                          <div className="detail-desc">{n.description || '暂无描述'}</div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {!builtinCount && !mcpCount && !nodeCount && (
          <div className="th-empty">暂无工具（等待 Agent 创建）</div>
        )}
      </div>
    </div>
  )
}
