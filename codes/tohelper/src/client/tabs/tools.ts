import { api, type ToolsResponse } from '../api'
import { esc } from '../utils'

interface ToolItem { name: string; description: string; denied?: boolean }

let data: ToolsResponse = { ok: false, builtin: [], mcp: [] }
let activeFilter: 'all' | 'builtin' | 'mcp' = 'all'
let collapsedServers = new Set<string>()

export async function loadTools(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="th-empty">加载中...</div>'
  try {
    data = await api.getTools()
    render(container)
  } catch (e: any) {
    container.innerHTML = `<div class="th-empty">加载失败: ${esc(e.message)}</div>`
  }
}

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

function render(container: HTMLElement): void {
  const builtinCount = data.builtin.length
  const mcpCount = data.mcp.length
  const showBuiltin = activeFilter === 'all' || activeFilter === 'builtin'
  const showMcp = activeFilter === 'all' || activeFilter === 'mcp'

  let html = `<div class="th-tools-body">`

  // Filter bar
  html += `<div class="th-tools-filter">
    <button class="${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
      全部 <span class="n">${builtinCount + mcpCount}</span>
    </button>
    <button class="${activeFilter === 'builtin' ? 'active' : ''}" data-filter="builtin">
      内置 <span class="n">${builtinCount}</span>
    </button>
    <button class="${activeFilter === 'mcp' ? 'active' : ''}" data-filter="mcp">
      MCP <span class="n">${mcpCount}</span>
    </button>
  </div>`

  // Scrollable area
  html += `<div class="th-tools-scroll">`

  // Builtin section
  if (showBuiltin && builtinCount > 0) {
    const collapsed = collapsedServers.has('builtin')
    html += `<div class="th-collapse-group">
      <div class="th-collapse-header${collapsed ? ' collapsed' : ''}" data-srv="builtin">
        <span class="arrow">&#9660;</span>
        <span>内置工具</span>
        <span class="th-cnt">${builtinCount}</span>
      </div>
      <div class="th-collapse-body${collapsed ? ' collapsed' : ''}" style="max-height:${collapsed ? 0 : data.builtin.length * 40 + 8}px">`
    for (const t of data.builtin) {
      html += `<div class="th-i">
        <span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>
        <span class="nm">${esc(t.name)}</span>
        <span class="ds">${esc(t.description.slice(0, 60))}</span>
      </div>`
    }
    html += `</div></div>`
  }

  // MCP section — group by server
  if (showMcp && mcpCount > 0) {
    const groups = groupByServer(data.mcp)
    // Sort: servers with more tools first
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
    for (const [srv, srvTools] of sorted) {
      const collapsed = collapsedServers.has(srv)
      html += `<div class="th-collapse-group">
        <div class="th-collapse-header${collapsed ? ' collapsed' : ''}" data-srv="${esc(srv)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${esc(srv)}</span>
          <span class="th-cnt">${srvTools.length}</span>
        </div>
        <div class="th-collapse-body${collapsed ? ' collapsed' : ''}" style="max-height:${collapsed ? 0 : srvTools.length * 40 + 8}px">`
      for (const t of srvTools) {
        const shortName = t.name.replace(/^mcp__[^_]+__/, '')
        html += `<div class="th-i${t.denied ? ' disabled' : ''}">
          <span class="nm">${esc(shortName)}</span>
          <span class="th-tg ${t.denied ? 'denied' : 'mcp'}">${t.denied ? '已禁用' : 'MCP'}</span>
        </div>`
      }
      html += `</div></div>`
    }
  }

  // Empty state
  if (!builtinCount && !mcpCount) {
    html += `<div class="th-empty">暂无工具（等待 Agent 创建）</div>`
  }

  html += `</div></div>`

  container.innerHTML = html
  bindEvents(container)
}

function bindEvents(container: HTMLElement): void {
  container.querySelectorAll<HTMLButtonElement>('.th-tools-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter as 'all' | 'builtin' | 'mcp'
      render(container)
    })
  })

  container.querySelectorAll<HTMLElement>('.th-collapse-header[data-srv]').forEach(header => {
    header.addEventListener('click', () => {
      const srv = header.dataset.srv!
      if (collapsedServers.has(srv)) collapsedServers.delete(srv)
      else collapsedServers.add(srv)
      const body = header.nextElementSibling as HTMLElement
      const collapsed = collapsedServers.has(srv)
      header.classList.toggle('collapsed', collapsed)
      body.classList.toggle('collapsed', collapsed)
      body.style.maxHeight = collapsed ? '0px' : `${body.querySelectorAll('.th-i').length * 40 + 8}px`
    })
  })
}
