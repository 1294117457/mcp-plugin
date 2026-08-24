import { api, type ToolsResponse, type McpServer } from '../api'
import { esc } from '../utils'

let tools: ToolsResponse = { ok: false, builtin: [], mcp: [] }
let servers: McpServer[] = []
let denied = new Set<string>()
let pending = new Set<string>()
let showJsonInput = false

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

  // Section 1: Connected servers (fixed height, scrollable)
  html += `<div class="th-mcp-section">
    <div class="th-sec-t">已连接 <span class="th-cnt">${servers.length}</span></div>
    <div class="th-mcp-scroll">`
  if (!servers.length) {
    html += `<div class="th-mcp-hint">暂无已连接的 MCP 服务</div>`
  }
  for (const s of servers) {
    html += `<div class="th-i">
      <span style="width:8px;height:8px;border-radius:50%;background:#22c55e;flex-shrink:0"></span>
      <span class="nm">${esc(s.serverName)}</span>
      <span class="ds">${s.toolCount} 个工具 | ${esc(s.transport)}</span>
      <button class="th-btn-s th-rst th-rm-srv" data-srv="${esc(s.serverName)}" style="padding:2px 6px;font-size:10px">断开</button>
    </div>`
  }
  html += `</div></div>`

  // Section 2: MCP Tools list (fixed height, scrollable)
  const mcpTools = tools.mcp || []
  html += `<div class="th-mcp-section">
    <div class="th-sec-t">MCP 工具 <span class="th-cnt">${mcpTools.length}</span></div>
    <div class="th-mcp-scroll">`
  if (!mcpTools.length) {
    html += `<div class="th-mcp-hint">连接 MCP 服务后，工具将显示在此处</div>`
  }
  for (const t of mcpTools) {
    const checked = !pending.has(t.name)
    const shortName = t.name.replace(/^mcp__[^_]+__/, '')
    html += `<label class="th-i" style="cursor:pointer">
      <input type="checkbox" ${checked ? 'checked' : ''} data-tool="${esc(t.name)}" style="width:14px;height:14px;accent-color:#4f46e5">
      <span class="nm" title="${esc(t.name)}">${esc(shortName)}</span>
      <span class="ds">${esc((t.description || '').slice(0, 40))}</span>
    </label>`
  }
  html += `</div>`
  if (mcpTools.length) {
    html += `<div class="th-ftr" style="border-top:none;padding:6px 14px">
      <button class="th-btn-s th-rst" id="th-mcp-reset">全部启用</button>
      <button class="th-btn-s th-apl" id="th-mcp-apply">应用选择</button>
    </div>`
  }
  html += `</div>`

  // Section 3: Add server (fixed height, scrollable)
  html += `<div class="th-mcp-section">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${showJsonInput ? '简单模式' : 'JSON 配置'}</button>
    </div>
    <div class="th-mcp-scroll">`

  if (showJsonInput) {
    html += `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px">
      <textarea id="th-json-input" rows="6" placeholder='粘贴 JSON 配置，例如：
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
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;height:100%;min-height:80px;line-height:1.4"></textarea>
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

  html += `</div></div>`

  container.innerHTML = html
  bindEvents(container)
}

function bindEvents(container: HTMLElement): void {
  // Toggle JSON/Simple mode
  container.querySelector('#th-toggle-mode')?.addEventListener('click', () => {
    showJsonInput = !showJsonInput
    render(container)
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
