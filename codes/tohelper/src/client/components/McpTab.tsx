import { useState, useEffect, useRef } from 'react'
import type { AppData } from './App'
import { api } from '../api'

interface Props {
  data: AppData
  reload: () => void
}

export function McpTab({ data, reload }: Props) {
  const [pending, setPending] = useState<Set<string>>(new Set())
  const [activeServer, setActiveServer] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [opLoading, setOpLoading] = useState(false)

  const jsonRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const headersRef = useRef<HTMLInputElement>(null)
  const transportRef = useRef<HTMLSelectElement>(null)

  useEffect(() => {
    setPending(new Set(data.denied))
  }, [data.denied])

  if (data.loading) return <div className="th-empty">加载中...</div>

  const mcpTools = data.tools?.mcp || []
  const filteredTools = activeServer
    ? mcpTools.filter(t => t.name.startsWith(`mcp__${activeServer}__`))
    : mcpTools

  function toggleTool(name: string) {
    setPending(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  async function applyDeny() {
    setOpLoading(true)
    try {
      await api.denyTools([...pending])
      reload()
    } finally { setOpLoading(false) }
  }

  async function resetDeny() {
    setOpLoading(true)
    try {
      await api.resetDeny()
      reload()
    } finally { setOpLoading(false) }
  }

  async function removeServer(name: string) {
    setOpLoading(true)
    try {
      await api.removeMcpServer(name)
      if (activeServer === name) setActiveServer(null)
      reload()
    } finally { setOpLoading(false) }
  }

  async function addSimple() {
    const serverName = nameRef.current?.value.trim()
    const url = urlRef.current?.value.trim()
    const transport = transportRef.current?.value || 'streamable-http'
    if (!serverName || !url) return

    let headers: Record<string, string> | undefined
    const raw = headersRef.current?.value.trim()
    if (raw) {
      try { headers = JSON.parse(raw) } catch { setJsonError('Headers JSON 格式错误'); return }
    }

    const config = transport === 'stdio'
      ? { serverName, transport, command: url }
      : { serverName, transport, url, headers }

    setOpLoading(true)
    try {
      const res = await api.addMcpServer(config)
      if (!res.ok) { setJsonError(res.error || '连接失败'); return }
      if (nameRef.current) nameRef.current.value = ''
      if (urlRef.current) urlRef.current.value = ''
      if (headersRef.current) headersRef.current.value = ''
      setTimeout(reload, 1500)
    } finally { setOpLoading(false) }
  }

  async function addJson() {
    const raw = jsonRef.current?.value.trim()
    if (!raw) return
    setJsonError('')
    setOpLoading(true)
    try {
      const parsed = JSON.parse(raw)
      const config = parsed.mcpServers ? parsed : { mcpServers: parsed }
      const result = await api.addMcpBatch(config)
      if (!result.ok) { setJsonError('连接失败'); return }
      const failures = result.results.filter(r => !r.ok)
      if (failures.length) setJsonError(failures.map(f => `${f.serverName}: ${f.error}`).join('; '))
      else if (jsonRef.current) jsonRef.current.value = ''
      setTimeout(reload, 1500)
    } catch (e: unknown) {
      setJsonError(`JSON 格式错误: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setOpLoading(false) }
  }

  const enabledCount = filteredTools.filter(t => !pending.has(t.name)).length

  return (
    <div className="th-mcp-body">
      {/* Servers */}
      <div className="th-mcp-section">
        <div className="th-sec">
          <div className="th-sec-t">已连接 MCP <span className="th-cnt">{data.servers.length}</span></div>
        </div>
        <div className="th-mcp-servers-scroll">
          {data.servers.map(s => (
            <div
              key={s.serverName}
              className={`th-i server-item${activeServer === s.serverName ? ' active' : ''}`}
              onClick={() => setActiveServer(activeServer === s.serverName ? null : s.serverName)}
            >
              <span className="nm">{s.serverName}</span>
              <span className="ds">{s.transport} · {s.toolCount} 工具</span>
              <button
                className="th-rm-srv"
                disabled={opLoading}
                onClick={e => { e.stopPropagation(); removeServer(s.serverName) }}
              >&times;</button>
            </div>
          ))}
          {data.servers.length === 0 && <div className="th-empty">暂无连接</div>}
        </div>
      </div>

      {/* Tools */}
      <div className="th-mcp-section th-mcp-tools-section">
        <div className="th-sec">
          <div className="th-sec-t">MCP 工具 <span className="th-cnt">{enabledCount}/{filteredTools.length}</span></div>
        </div>
        <div className="th-mcp-tools-scroll">
          {filteredTools.map(t => (
            <div key={t.name} className="th-i">
              <input
                type="checkbox"
                checked={!pending.has(t.name)}
                onChange={() => toggleTool(t.name)}
              />
              <span className="nm">{t.name.replace(/^mcp__[^_]+__/, '')}</span>
              <span className="ds">{(t.description || '').slice(0, 30)}</span>
            </div>
          ))}
          {filteredTools.length === 0 && <div className="th-empty">暂无 MCP 工具</div>}
        </div>
        <div className="th-mcp-actions">
          <button onClick={applyDeny} disabled={opLoading}>{opLoading ? '处理中...' : '应用'}</button>
          <button onClick={resetDeny} disabled={opLoading}>重置</button>
        </div>
      </div>

      {/* Add */}
      <div className="th-mcp-section">
        <div className="th-sec">
          <div className="th-sec-t">添加服务</div>
          <button className="th-toggle-mode" onClick={() => setShowJson(!showJson)}>
            {showJson ? '简单模式' : 'JSON 配置'}
          </button>
        </div>
        {showJson ? (
          <div className="th-add-form">
            <textarea
              ref={jsonRef}
              placeholder="粘贴 MCP JSON 配置..."
              rows={5}
              style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
            />
            {jsonError && <div className="th-error">{jsonError}</div>}
            <button onClick={addJson} disabled={opLoading}>{opLoading ? '连接中...' : '添加'}</button>
          </div>
        ) : (
          <div className="th-add-form">
            <input ref={nameRef} placeholder="服务名称" />
            <select ref={transportRef}>
              <option value="streamable-http">HTTP</option>
              <option value="stdio">Stdio</option>
            </select>
            <input ref={urlRef} placeholder="URL 或 Command" />
            <input ref={headersRef} placeholder="Headers (JSON, 可选)" />
            {jsonError && <div className="th-error">{jsonError}</div>}
            <button onClick={addSimple} disabled={opLoading}>{opLoading ? '连接中...' : '连接'}</button>
          </div>
        )}
      </div>
    </div>
  )
}
