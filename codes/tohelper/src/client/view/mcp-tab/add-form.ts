import { esc } from '../../utils'

export function renderAddForm(showJsonInput: boolean): string {
  let html = `<div class="th-mcp-section add-section" id="th-mcp-add">
    <div class="th-sec-t" style="justify-content:space-between">
      添加服务
      <button class="th-btn-s" id="th-toggle-mode" style="font-size:10px;padding:2px 8px;background:#f3f4f6;color:#374151">${showJsonInput ? '简单模式' : 'JSON 配置'}</button>
    </div>
    <div class="th-mcp-scroll">`

  if (showJsonInput) {
    html += `<div style="display:flex;flex-direction:column;gap:6px;padding:4px 10px 8px">
      <textarea id="th-json-input" rows="6" placeholder='粘贴 JSON 配置，例如：
{
  "mcpServers": {
    "my-server": {
      "type": "streamablehttp",
      "url": "https://..."
    }
  }
}' style="padding:8px;border:1px solid #e5e7eb;border-radius:6px;font-size:11px;font-family:monospace;resize:none;line-height:1.4;height:120px"></textarea>
      <div id="th-json-error" style="color:#dc2626;font-size:10px;display:none"></div>
      <button class="th-btn-s th-apl" id="th-json-add" style="align-self:flex-end">连接</button>
    </div>`
  } else {
    html += `<div style="display:flex;flex-direction:column;gap:5px;padding:4px 10px 8px">
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
  return html
}
