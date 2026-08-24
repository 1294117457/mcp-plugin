import { api, type ToolsResponse } from '../api'
import { esc } from '../utils'

let data: ToolsResponse = { ok: false, builtin: [], mcp: [] }

export async function loadTools(container: HTMLElement): Promise<void> {
  container.innerHTML = '<div class="th-empty">加载中...</div>'
  try {
    data = await api.getTools()
    render(container)
  } catch (e: any) {
    container.innerHTML = `<div class="th-empty">加载失败: ${esc(e.message)}</div>`
  }
}

function render(container: HTMLElement): void {
  let html = ''

  if (data.builtin.length) {
    html += `<div class="th-sec"><div class="th-sec-t">内置工具 <span class="th-cnt">${data.builtin.length}</span></div></div>`
    for (const t of data.builtin) {
      html += `<div class="th-i">
        <span style="color:#d1d5db;font-size:10px">\u{1f512}</span>
        <span class="nm">${esc(t.name)}</span>
        <span class="ds">${esc(t.description.slice(0, 60))}</span>
      </div>`
    }
  }

  if (data.mcp.length) {
    html += `<div class="th-sec"><div class="th-sec-t">MCP 工具 <span class="th-cnt">${data.mcp.length}</span></div></div>`
    for (const t of data.mcp) {
      html += `<div class="th-i">
        <span class="nm">${esc(t.name)}</span>
        <span class="th-tg ${t.denied ? 'denied' : 'mcp'}">${t.denied ? '已禁用' : 'MCP'}</span>
      </div>`
    }
  }

  if (!html) {
    html = '<div class="th-empty">暂无工具（等待 Agent 创建）</div>'
  }

  container.innerHTML = html
}
