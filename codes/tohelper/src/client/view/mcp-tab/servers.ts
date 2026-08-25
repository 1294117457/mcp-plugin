import { type McpServer } from '../../api'
import { esc } from '../../utils'

export function renderServers(servers: McpServer[], activeServer: string | null): string {
  let html = `<div class="th-mcp-section" id="th-mcp-servers">
    <div class="th-sec-t">已连接 <span class="th-cnt">${servers.length}</span></div>
    <div class="th-mcp-scroll">`

  if (!servers.length) {
    html += `<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>`
  }
  for (const s of servers) {
    const isActive = activeServer === s.serverName
    html += `<div class="th-i server-item clickable${isActive ? ' selected' : ''}" data-srv="${esc(s.serverName)}">
      <span class="dot"></span>
      <span class="nm">${esc(s.serverName)}</span>
      <span class="ds">${s.toolCount} 个工具 | ${esc(s.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${esc(s.serverName)}" style="padding:2px 6px;font-size:10px;flex-shrink:0">断开</button>
    </div>`
  }

  html += `</div></div>`
  return html
}
