import { api, type ToolsResponse, type McpServer } from '../api'
import { esc } from '../utils'

let tools: ToolsResponse = { ok: false, builtin: [], mcp: [] }
let servers: McpServer[] = []
let denied = new Set<string>()
let pending = new Set<string>()
let showJsonInput = false
let activeServer: string | null = null // null = show all
let collapsedServers = new Set<string>()

export async function loadMcp(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="th-empty">加载中...</div>'
  try {
    const [toolsRes, mcpRes] = await Promise.all([
      api.getTools(),
      api.getMcpServers(),
    ])
    tools = toolsRes
    servers = mcpRes.servers
    denied = new Set(mcpRes.denied)
    pending = new Set(denied)
    render(container)
  } catch {
    container.innerHTML = '<div class="th-empty">加载 MCP 数据失败</div>'
  }
}

function render(container: HTMLElement): void {
  let html = ''

  html += `<div class="th-mcp-body">`

  // --- Section 1: Connected servers (fixed height) ---
  html += `<div class="th-mcp-section" id="th-mcp-servers">
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

  // --- Section 2: Tool list (flexible, grouped by server with collapse) ---
  const mcpTools = tools.mcp || []
  // Group tools by server
  const grouped = new Map<string, typeof mcpTools>()
  for (const t of mcpTools) {
    const m = t.name.match(/^mcp__([^_]+)__/)
    const srv = m ? m[1] : 'unknown'
    if (!grouped.has(srv)) grouped.set(srv, [])
    grouped.get(srv)!.push(t)
  }
  // Sort by tool count descending
  const sortedGroups = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length)

  const showAll = !activeServer
  const totalTools = mcpTools.length

  html += `<div class="th-mcp-section flexible" id="th-mcp-tools">
    <div class="th-sec-t">
      MCP 工具
      <span class="th-cnt">${totalTools}</span>
      ${activeServer
        ? `<span style="font-size:10px;color:#6b7280;font-weight:400;margin-left:4px">— ${esc(activeServer)}</span>`
        : `<span style="font-size:10px;color:#9ca3af;font-weight:400;margin-left:4px">全部</span>`
      }
    </div>`

  // Filter bar (quick-switch activeServer)
  html += `<div class="th-mcp-filter-bar">
    <span class="th-mcp-filter-tag${showAll ? ' active' : ''}" data-filter="">全部 <span class="cnt">${totalTools}</span></span>`
  for (const s of servers) {
    const count = grouped.get(s.serverName)?.length ?? 0
    if (count === 0) continue
    html += `<span class="th-mcp-filter-tag${activeServer === s.serverName ? ' active' : ''}" data-filter="${esc(s.serverName)}">${esc(s.serverName)} <span class="cnt">${count}</span></span>`
  }
  html += `</div>`

  // Tool groups (collapsible)
  html += `<div class="th-mcp-scroll">`
  if (!sortedGroups.length) {
    html += `<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>`
  }
  for (const [srv, srvTools] of sortedGroups) {
    const collapsed = collapsedServers.has(srv)
    const filtered = activeServer && activeServer !== srv
    if (filtered) continue // hide tools from non-active servers when filtering
    html += `<div class="th-collapse-group">
      <div class="th-collapse-header${collapsed ? ' collapsed' : ''}" data-srv="${esc(srv)}">
        <span class="arrow">&#9660;</span>
        <span class="srv-name">${esc(srv)}</span>
        <span class="th-cnt">${srvTools.length}</span>
      </div>
      <div class="th-collapse-body${collapsed ? ' collapsed' : ''}" style="max-height:${collapsed ? 0 : srvTools.length * 36 + 8}px">`
    for (const t of srvTools) {
      const checked = !pending.has(t.name)
      const disabled = !checked
      const shortName = t.name.replace(/^mcp__[^_]+__/, '')
      html += `<label class="th-i${disabled ? ' disabled' : ''}" style="cursor:pointer">
        <input type="checkbox" ${checked ? 'checked' : ''} data-tool="${esc(t.name)}" style="width:13px;height:13px;accent-color:#4f46e5;flex-shrink:0">
        <span class="nm" title="${esc(t.name)}">${esc(shortName)}</span>
        <span class="ds">${esc((t.description || '').slice(0, 28))}</span>
      </label>`
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

  // --- Section 3: Add server ---
  html += `<div class="th-mcp-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${showJsonInput ? '简单模式' : 'JSON 配置'}</button>
    </div>
    <div class="th-mcp-scroll">`

  if (showJsonInput) {
    html += `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px">
      <textarea id="th-json-input" rows="12" placeholder='粘贴 JSON 配置，例如：
{
  "mcpServers": {
    "my-server": {
      "type": "streamablehttp",
      "url": "https://...",
      "headers": {
        "Authorization": "Bearer ..."
      }
    }
  }
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;line-height:1.4;height:192px"></textarea>
      <div id="th-json-error" style="color:#dc2626;font-size:10px;display:none"></div>
      <button class="th-btn-s th-apl" id="th-json-add" style="align-self:flex-end">连接</button>
    </div>`
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px">
      <input id="th-srv-name" placeholder="服务名称" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <select id="th-srv-transport" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
        <option value="streamable-http">HTTP (streamable)</option>
        <option value="stdio">stdio (本地命令)</option>
      </select>
      <input id="th-srv-url" placeholder="URL（如 https://mcp.example.com）" style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <input id="th-srv-headers" placeholder='Headers（可选）: {"Authorization":"Bearer ..."}' style="padding:5px 8px;border:1px solid #e5e7eb;border-radius:4px;font-size:11px">
      <button class="th-btn-s th-apl" id="th-srv-add" style="align-self:flex-end">连接</button>
    </div>`
  }

  html += `</div></div></div>` // close th-mcp-body

  container.innerHTML = html
  bindEvents(container)
}

function bindEvents(container: HTMLElement): void {
  // Toggle JSON/Simple mode
  container.querySelector('#th-toggle-mode')?.addEventListener('click', () => {
    showJsonInput = !showJsonInput
    render(container)
  })

  // Filter tag click (quick-switch activeServer)
  container.querySelectorAll<HTMLElement>('.th-mcp-filter-tag[data-filter]').forEach(tag => {
    tag.addEventListener('click', () => {
      activeServer = tag.dataset.filter || null
      render(container)
    })
  })

  // Server list item click
  container.querySelectorAll<HTMLElement>('.th-i.server-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      if (target.closest('.th-rm-srv')) return
      const srv = item.dataset.srv!
      activeServer = activeServer === srv ? null : srv
      render(container)
    })
  })

  // Collapse/expand group
  container.querySelectorAll<HTMLElement>('.th-collapse-header[data-srv]').forEach(header => {
    header.addEventListener('click', () => {
      const srv = header.dataset.srv!
      if (collapsedServers.has(srv)) collapsedServers.delete(srv)
      else collapsedServers.add(srv)
      const body = header.nextElementSibling as HTMLElement
      const collapsed = collapsedServers.has(srv)
      header.classList.toggle('collapsed', collapsed)
      body.classList.toggle('collapsed', collapsed)
      body.style.maxHeight = collapsed ? '0px' : `${body.querySelectorAll('.th-i').length * 36 + 8}px`
    })
  })

  // Checkbox toggle
  container.querySelectorAll<HTMLInputElement>('input[data-tool]').forEach(cb => {
    cb.addEventListener('change', () => {
      if (cb.checked) pending.delete(cb.dataset.tool!)
      else pending.add(cb.dataset.tool!)
    })
  })

  // Reset button
  container.querySelector('#th-mcp-reset')?.addEventListener('click', async () => {
    await api.resetDeny()
    pending.clear()
    denied.clear()
    loadMcp(container)
  })

  // Apply button
  container.querySelector('#th-mcp-apply')?.addEventListener('click', async () => {
    await api.denyTools([...pending])
    denied = new Set(pending)
    loadMcp(container)
  })

  // Remove server buttons
  container.querySelectorAll<HTMLButtonElement>('.th-rm-srv').forEach(btn => {
    btn.addEventListener('click', async () => {
      await api.removeMcpServer(btn.dataset.srv!)
      loadMcp(container)
    })
  })

  // JSON config add
  container.querySelector('#th-json-add')?.addEventListener('click', async () => {
    const textarea = container.querySelector('#th-json-input') as HTMLTextAreaElement
    const errorEl = container.querySelector('#th-json-error') as HTMLElement
    if (!textarea) return

    const raw = textarea.value.trim()
    if (!raw) return

    try {
      const parsed = JSON.parse(raw)
      const config = parsed.mcpServers ? parsed : { mcpServers: parsed }
      errorEl.style.display = 'none'

      const result = await api.addMcpBatch(config)
      if (!result.ok) {
        errorEl.textContent = '连接失败'
        errorEl.style.display = 'block'
        return
      }

      const failures = result.results.filter(r => !r.ok)
      if (failures.length) {
        errorEl.textContent = failures.map(f => `${f.serverName}: ${f.error}`).join('; ')
        errorEl.style.display = 'block'
      } else {
        textarea.value = ''
      }

      setTimeout(() => loadMcp(container), 1500)
    } catch (e: any) {
      errorEl.textContent = `JSON 格式错误: ${e.message}`
      errorEl.style.display = 'block'
    }
  })

  // Simple form add
  container.querySelector('#th-srv-add')?.addEventListener('click', async () => {
    const nameEl = container.querySelector('#th-srv-name') as HTMLInputElement
    const transportEl = container.querySelector('#th-srv-transport') as HTMLSelectElement
    const urlEl = container.querySelector('#th-srv-url') as HTMLInputElement
    const headersEl = container.querySelector('#th-srv-headers') as HTMLInputElement
    if (!nameEl || !urlEl) return

    const serverName = nameEl.value.trim()
    const transport = transportEl?.value || 'streamable-http'
    const url = urlEl.value.trim()
    if (!serverName || !url) return

    let headers: Record<string, string> | undefined
    const headersRaw = headersEl?.value.trim()
    if (headersRaw) {
      try { headers = JSON.parse(headersRaw) }
      catch { alert('Headers JSON 格式错误'); return }
    }

    const config = transport === 'stdio'
      ? { serverName, transport, command: url }
      : { serverName, transport, url, headers }

    const result = await api.addMcpServer(config)
    if (!result.ok) alert(result.error || '连接失败')
    else setTimeout(() => loadMcp(container), 1500)
  })
}
