import { type ToolItem, type McpServer } from '../../api'
import { esc } from '../../utils'

export function renderToolList(
  mcpTools: ToolItem[],
  servers: McpServer[],
  pending: Set<string>,
  activeServer: string | null,
  expandedMcpTool: string | null,
  collapsedServers: Set<string>,
): string {
  const grouped = new Map<string, ToolItem[]>()
  for (const t of mcpTools) {
    const m = t.name.match(/^mcp__([^_]+)__/)
    const srv = m ? m[1] : 'unknown'
    if (!grouped.has(srv)) grouped.set(srv, [])
    grouped.get(srv)!.push(t)
  }
  const sortedGroups = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)

  const totalTools = mcpTools.length
  const totalEnabled = mcpTools.filter(t => !pending.has(t.name)).length

  let html = `<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${totalEnabled}/${totalTools}</span>
      ${activeServer
        ? `<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${esc(activeServer)}</span>`
        : `<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>`
      }
    </div>`

  // Filter bar
  const showAll = !activeServer
  html += `<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${showAll ? ' active' : ''}" data-filter="">全部 <span class="cnt">${totalEnabled}/${totalTools}</span></span>`
  for (const s of servers) {
    const srvTools = grouped.get(s.serverName) ?? []
    const srvTotal = srvTools.length
    if (srvTotal === 0) continue
    const srvEnabled = srvTools.filter(t => !pending.has(t.name)).length
    html += `<span class="th-mcp-filter-tag${activeServer === s.serverName ? ' active' : ''}" data-filter="${esc(s.serverName)}">${esc(s.serverName)} <span class="cnt">${srvEnabled}/${srvTotal}</span></span>`
  }
  html += `</div>`

  // Tool groups
  html += `<div class="th-mcp-scroll">`
  if (!sortedGroups.length) {
    html += `<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>`
  }
  for (const [srv, srvTools] of sortedGroups) {
    const collapsed = collapsedServers.has(srv)
    const filtered = activeServer && activeServer !== srv
    if (filtered) continue
    const srvEnabled = srvTools.filter(t => !pending.has(t.name)).length
    html += `<div class="th-collapse-group">
      <div class="th-collapse-header${collapsed ? ' collapsed' : ''}" data-srv="${esc(srv)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${esc(srv)}</span>
        <span class="th-cnt">${srvEnabled}/${srvTools.length}</span>
      </div>
      <div class="th-collapse-body${collapsed ? ' collapsed' : ''}" style="max-height:${collapsed ? 0 : srvTools.length * 56 + 8}px">`
    for (const t of srvTools) {
      const checked = !pending.has(t.name)
      const disabled = !checked
      const shortName = t.name.replace(/^mcp__[^_]+__/, '')
      const desc = t.description || '暂无描述'
      const isExpanded = expandedMcpTool === t.name
      html += `<div class="th-i-wrap${isExpanded ? ' expanded' : ''}" data-tool-id="${esc(t.name)}">
        <label class="th-i${disabled ? ' disabled' : ''}" style="cursor:pointer" title="${esc(desc)}">
          <input type="checkbox" ${checked ? 'checked' : ''} data-tool="${esc(t.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
          <span class="nm" title="${esc(t.name)}">${esc(shortName)}</span>
          <span class="ds">${esc(desc.slice(0, 28))}${desc.length > 28 ? '...' : ''}</span>
        </label>
        <div class="th-i-detail">
          <div class="detail-label">描述</div>
          <div class="detail-desc">${esc(desc)}</div>
          <div class="detail-label">完整名称</div>
          <div><span class="detail-name">${esc(t.name)}</span></div>
        </div>
      </div>`
    }
    html += `</div></div>`
  }
  html += `</div>`

  if (mcpTools.length) {
    html += `<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`
  }
  html += `</div>`
  return html
}
