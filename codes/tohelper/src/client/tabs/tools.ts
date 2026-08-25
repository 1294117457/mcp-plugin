import { api, type ToolsResponse } from '../api'
import { esc } from '../utils'

interface ToolItem { name: string; description: string; denied?: boolean }

let data: ToolsResponse = { ok: false, builtin: [], mcp: [] }
let activeFilter: 'all' | 'builtin' | 'mcp' = 'all'
let collapsedServers = new Set<string>()
let expandedTool: string | null = null

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

function renderToolItem(t: ToolItem, displayName: string, isExpanded: boolean): string {
  const desc = t.description || '暂无描述'
  return `<div class="th-i-wrap${isExpanded ? ' expanded' : ''}" data-tool-id="${esc(t.name)}">
    <div class="th-i clickable" title="${esc(desc)}">
      ${t.denied !== undefined
        ? `<span class="th-tg mcp">MCP</span>`
        : `<span style="color:#d1d5db;font-size:10px;flex-shrink:0">&#128274;</span>`
      }
      <span class="nm">${esc(displayName)}</span>
      <span class="ds">${esc(desc.slice(0, 40))}${desc.length > 40 ? '...' : ''}</span>
    </div>
    <div class="th-i-detail">
      <div class="detail-label">描述</div>
      <div class="detail-desc">${esc(desc)}</div>
      <div class="detail-label">完整名称</div>
      <div><span class="detail-name">${esc(t.name)}</span></div>
    </div>
  </div>`
}

function render(container: HTMLElement): void {
  // Only show active (non-denied) tools
  const activeBuiltin = data.builtin
  const activeMcp = data.mcp.filter(t => !t.denied)

  const builtinCount = activeBuiltin.length
  const mcpCount = activeMcp.length
  const totalActive = builtinCount + mcpCount
  const showBuiltin = activeFilter === 'all' || activeFilter === 'builtin'
  const showMcp = activeFilter === 'all' || activeFilter === 'mcp'

  let html = `<div class="th-tools-body">`

  // Filter bar — show only active counts
  html += `<div class="th-tools-filter">
    <button class="${activeFilter === 'all' ? 'active' : ''}" data-filter="all">
      使用中 <span class="n">${totalActive}</span>
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
        <span class="srv-name">内置工具</span>
        <span class="th-cnt">${builtinCount}</span>
      </div>
      <div class="th-collapse-body${collapsed ? ' collapsed' : ''}">`
    for (const t of activeBuiltin) {
      html += renderToolItem(t, t.name, expandedTool === t.name)
    }
    html += `</div></div>`
  }

  // MCP section — only active tools, group by server
  if (showMcp && mcpCount > 0) {
    const groups = groupByServer(activeMcp)
    const sorted = [...groups.entries()].sort((a, b) => b[1].length - a[1].length)
    for (const [srv, srvTools] of sorted) {
      const collapsed = collapsedServers.has(srv)
      html += `<div class="th-collapse-group">
        <div class="th-collapse-header${collapsed ? ' collapsed' : ''}" data-srv="${esc(srv)}">
          <span class="arrow">&#9660;</span>
          <span class="srv-name">${esc(srv)}</span>
          <span class="th-cnt">${srvTools.length}</span>
        </div>
        <div class="th-collapse-body${collapsed ? ' collapsed' : ''}">`
      for (const t of srvTools) {
        const shortName = t.name.replace(/^mcp__[^_]+__/, '')
        html += renderToolItem(t, shortName, expandedTool === t.name)
      }
      html += `</div></div>`
    }
  }

  // Empty state
  if (!totalActive) {
    html += `<div class="th-empty">暂无工具（等待 Agent 创建）</div>`
  }

  html += `</div></div>`

  container.innerHTML = html
  bindEvents(container)
}

function bindEvents(container: HTMLElement): void {
  // Filter buttons
  container.querySelectorAll<HTMLButtonElement>('.th-tools-filter button').forEach(btn => {
    btn.addEventListener('click', () => {
      activeFilter = btn.dataset.filter as 'all' | 'builtin' | 'mcp'
      render(container)
    })
  })

  // Collapse/expand server groups
  container.querySelectorAll<HTMLElement>('.th-collapse-header[data-srv]').forEach(header => {
    header.addEventListener('click', () => {
      const srv = header.dataset.srv!
      if (collapsedServers.has(srv)) collapsedServers.delete(srv)
      else collapsedServers.add(srv)
      render(container)
    })
  })

  // Click tool item to expand/collapse detail
  container.querySelectorAll<HTMLElement>('.th-i-wrap[data-tool-id]').forEach(wrap => {
    const clickArea = wrap.querySelector('.th-i') as HTMLElement
    clickArea?.addEventListener('click', () => {
      const toolId = wrap.dataset.toolId!
      if (expandedTool === toolId) {
        expandedTool = null
        wrap.classList.remove('expanded')
      } else {
        container.querySelector('.th-i-wrap.expanded')?.classList.remove('expanded')
        expandedTool = toolId
        wrap.classList.add('expanded')
      }
    })
  })
}
