import { api, type ToolsResponse, type McpServer } from '../../api'
import { renderServers } from './servers'
import { renderToolList } from './tool-list'
import { renderAddForm } from './add-form'

let tools: ToolsResponse = { ok: false, builtin: [], mcp: [] }
let servers: McpServer[] = []
let denied = new Set<string>()
let pending = new Set<string>()
let showJsonInput = false
let activeServer: string | null = null
let collapsedServers = new Set<string>()
let expandedMcpTool: string | null = null

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
  const mcpTools = tools.mcp || []

  let html = `<div class="th-mcp-body">`
  html += renderServers(servers, activeServer)
  html += renderToolList(mcpTools, servers, pending, activeServer, expandedMcpTool, collapsedServers)
  html += renderAddForm(showJsonInput)
  html += `</div>`

  container.innerHTML = html
  bindEvents(container)
}

function bindEvents(container: HTMLElement): void {
  // Toggle JSON/Simple mode
  container.querySelector('#th-toggle-mode')?.addEventListener('click', () => {
    showJsonInput = !showJsonInput
    render(container)
  })

  // Filter tag click
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
      body.style.maxHeight = collapsed ? '0px' : `${body.querySelectorAll('.th-i-wrap').length * 56 + 8}px`
    })
  })

  // Click tool item to expand/collapse detail
  container.querySelectorAll<HTMLElement>('.th-i-wrap[data-tool-id]').forEach(wrap => {
    const nameSpan = wrap.querySelector('.nm') as HTMLElement
    nameSpan?.addEventListener('click', (e) => {
      e.preventDefault()
      e.stopPropagation()
      const toolId = wrap.dataset.toolId!
      if (expandedMcpTool === toolId) {
        expandedMcpTool = null
        wrap.classList.remove('expanded')
      } else {
        container.querySelector('.th-i-wrap.expanded')?.classList.remove('expanded')
        expandedMcpTool = toolId
        wrap.classList.add('expanded')
      }
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
