import { useState } from 'react'
import type { AppData } from './App'
import type { ToolItem } from '../api'

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

export function ToolsTab({ data }: { data: AppData }) {
  const [filter, setFilter] = useState<'all' | 'builtin' | 'mcp'>('all')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [expanded, setExpanded] = useState<string | null>(null)

  if (data.error) return <div className="th-empty">加载失败: {data.error}</div>
  if (data.loading || !data.tools) return <div className="th-empty">加载中...</div>

  const activeBuiltin = data.tools.builtin
  const activeMcp = data.tools.mcp.filter(t => !t.denied)
  const builtinCount = activeBuiltin.length
  const mcpCount = activeMcp.length
  const totalActive = builtinCount + mcpCount

  const showBuiltin = filter === 'all' || filter === 'builtin'
  const showMcp = filter === 'all' || filter === 'mcp'

  function toggleCollapse(key: string) {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key); else next.add(key)
      return next
    })
  }

  function ToolItemRow({ t, displayName }: { t: ToolItem; displayName: string }) {
    const isExpanded = expanded === t.name
    const desc = t.description || '暂无描述'
    return (
      <div className={`th-i-wrap${isExpanded ? ' expanded' : ''}`}>
        <div
          className="th-i clickable"
          title={desc}
          onClick={() => setExpanded(isExpanded ? null : t.name)}
        >
          {t.denied !== undefined
            ? <span className="th-tg mcp">MCP</span>
            : <span style={{ color: '#d1d5db', fontSize: '10px', flexShrink: 0 }}>🔒</span>}
          <span className="nm">{displayName}</span>
          <span className="ds">{desc.length > 40 ? desc.slice(0, 40) + '...' : desc}</span>
        </div>
        {isExpanded && (
          <div className="th-i-detail">
            <div className="detail-label">描述</div>
            <div className="detail-desc">{desc}</div>
            <div className="detail-label">完整名称</div>
            <div><span className="detail-name">{t.name}</span></div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="th-tools-body">
      <div className="th-tools-filter">
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          使用中 <span className="n">{totalActive}</span>
        </button>
        <button className={filter === 'builtin' ? 'active' : ''} onClick={() => setFilter('builtin')}>
          内置 <span className="n">{builtinCount}</span>
        </button>
        <button className={filter === 'mcp' ? 'active' : ''} onClick={() => setFilter('mcp')}>
          MCP <span className="n">{mcpCount}</span>
        </button>
      </div>
      <div className="th-tools-scroll">
        {showBuiltin && builtinCount > 0 && (
          <div className="th-collapse-group">
            <div
              className={`th-collapse-header${collapsed.has('builtin') ? ' collapsed' : ''}`}
              onClick={() => toggleCollapse('builtin')}
            >
              <span className="arrow">▼</span>
              <span className="srv-name">内置工具</span>
              <span className="th-cnt">{builtinCount}</span>
            </div>
            {!collapsed.has('builtin') && (
              <div className="th-collapse-body">
                {activeBuiltin.map(t => <ToolItemRow key={t.name} t={t} displayName={t.name} />)}
              </div>
            )}
          </div>
        )}
        {showMcp && mcpCount > 0 && (() => {
          const serverGroups = groupByServer(activeMcp)
          const sorted = [...serverGroups.entries()].sort((a, b) => b[1].length - a[1].length)
          return sorted.map(([srv, srvTools]) => (
            <div key={srv} className="th-collapse-group">
              <div
                className={`th-collapse-header${collapsed.has(srv) ? ' collapsed' : ''}`}
                onClick={() => toggleCollapse(srv)}
              >
                <span className="arrow">▼</span>
                <span className="srv-name">{srv}</span>
                <span className="th-cnt">{srvTools.length}</span>
              </div>
              {!collapsed.has(srv) && (
                <div className="th-collapse-body">
                  {srvTools.map(t => (
                    <ToolItemRow key={t.name} t={t} displayName={t.name.replace(/^mcp__[^_]+__/, '')} />
                  ))}
                </div>
              )}
            </div>
          ))
        })()}
        {!totalActive && <div className="th-empty">暂无工具（等待 Agent 创建）</div>}
      </div>
    </div>
  )
}
