import { useState, useRef } from 'react'
import type { ToolPanelData } from './ToolPanel'
import { toolApi } from '../api'
import type { ToolItem } from '../api'
import { ToolDetailView } from './ToolDetailView'

interface Props {
  data: ToolPanelData
  reload: () => void
}

interface ConnectResult {
  serverName: string
  ok: boolean
  toolCount?: number
  error?: string
}

function getServerTools(tools: ToolItem[], serverName: string): ToolItem[] {
  return tools.filter(t => t.name.startsWith(`mcp__${serverName}__`))
}

export function McpTab({ data, reload }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [expandedTool, setExpandedTool] = useState<string | null>(null)
  const [showJson, setShowJson] = useState(false)
  const [jsonError, setJsonError] = useState('')
  const [opLoading, setOpLoading] = useState(false)
  const [connectResult, setConnectResult] = useState<ConnectResult | null>(null)

  const jsonRef = useRef<HTMLTextAreaElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const urlRef = useRef<HTMLInputElement>(null)
  const headersRef = useRef<HTMLInputElement>(null)
  const transportRef = useRef<HTMLSelectElement>(null)

  if (data.loading) return <div className="th-empty">加载中...</div>

  const mcpTools = data.tools?.mcp || []

  function toggleServerExpand(name: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name); else next.add(name)
      return next
    })
  }

  async function removeServer(name: string) {
    setOpLoading(true)
    try {
      await toolApi.removeMcpServer(name)
      reload()
    } finally { setOpLoading(false) }
  }

  async function testConnect() {
    const serverName = nameRef.current?.value.trim()
    const url = urlRef.current?.value.trim()
    const transport = transportRef.current?.value || 'streamable-http'
    if (!serverName || !url) { setJsonError('请填写服务名称和地址'); return }

    let headers: Record<string, string> | undefined
    const raw = headersRef.current?.value.trim()
    if (raw) {
      try { headers = JSON.parse(raw) } catch { setJsonError('Headers JSON 格式错误'); return }
    }

    const config = transport === 'stdio'
      ? { serverName, transport, command: url }
      : { serverName, transport, url, headers }

    setOpLoading(true)
    setJsonError('')
    setConnectResult(null)
    try {
      const res = await toolApi.addMcpServer(config) as { ok: boolean; serverName?: string; toolCount?: number; error?: string }
      if (!res.ok) {
        setConnectResult({ serverName, ok: false, error: res.error || '连接失败' })
      } else {
        setConnectResult({ serverName, ok: true, toolCount: res.toolCount ?? 0 })
      }
    } catch (e: any) {
      setConnectResult({ serverName, ok: false, error: String(e?.message ?? e) })
    } finally { setOpLoading(false) }
  }

  function saveConnection() {
    if (nameRef.current) nameRef.current.value = ''
    if (urlRef.current) urlRef.current.value = ''
    if (headersRef.current) headersRef.current.value = ''
    setConnectResult(null)
    setJsonError('')
    reload()
  }

  function discardConnection() {
    if (connectResult?.ok && connectResult.serverName) {
      toolApi.removeMcpServer(connectResult.serverName).then(reload)
    }
    setConnectResult(null)
    setJsonError('')
  }

  async function testConnectJson() {
    const raw = jsonRef.current?.value.trim()
    if (!raw) return
    setJsonError('')
    setConnectResult(null)
    setOpLoading(true)
    try {
      const parsed = JSON.parse(raw)
      const config = parsed.mcpServers ? parsed : { mcpServers: parsed }
      const result = await toolApi.addMcpBatch(config) as { ok: boolean; results: Array<{ serverName: string; ok: boolean; toolCount?: number; error?: string }> }
      if (!result.ok) { setJsonError('连接失败'); return }
      const failures = result.results.filter(r => !r.ok)
      const successes = result.results.filter(r => r.ok)
      if (failures.length && !successes.length) {
        setJsonError(failures.map(f => `${f.serverName}: ${f.error}`).join('; '))
        return
      }
      const totalTools = successes.reduce((sum, s) => sum + (s.toolCount ?? 0), 0)
      const msg = successes.map(s => s.serverName).join(', ')
      setConnectResult({
        serverName: msg,
        ok: true,
        toolCount: totalTools,
        error: failures.length ? `部分失败: ${failures.map(f => f.serverName).join(', ')}` : undefined,
      })
    } catch (e: unknown) {
      setJsonError(`JSON 格式错误: ${e instanceof Error ? e.message : String(e)}`)
    } finally { setOpLoading(false) }
  }

  function saveJsonConnection() {
    if (jsonRef.current) jsonRef.current.value = ''
    setConnectResult(null)
    setJsonError('')
    reload()
  }

  function discardJsonConnection() {
    setConnectResult(null)
    setJsonError('')
    reload()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Scrollable: server list with tool preview */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <div className="th-sec">
          <div className="th-sec-t">
            已连接服务 <span className="th-cnt">{data.servers.length}</span>
            <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#9ca3af' }}>
              工具 {mcpTools.length}
            </span>
          </div>
        </div>

        {data.servers.length === 0 && <div className="th-empty">暂无 MCP 连接</div>}

        {data.servers.map(s => {
          const isExpanded = expanded.has(s.serverName)
          const serverTools = getServerTools(mcpTools, s.serverName)

          return (
            <div key={s.serverName} className="th-collapse-group">
              <div
                className={`th-collapse-header${!isExpanded ? ' collapsed' : ''}`}
                onClick={() => toggleServerExpand(s.serverName)}
              >
                <span className="arrow">&#9660;</span>
                <span className="srv-name">{s.serverName}</span>
                <span className="th-cnt">{serverTools.length}</span>
                <button
                  className="th-rm-srv"
                  disabled={opLoading}
                  onClick={e => { e.stopPropagation(); removeServer(s.serverName) }}
                >&times;</button>
              </div>
              {isExpanded && (
                <div className="th-collapse-body">
                  {serverTools.map(t => {
                    const shortName = t.name.replace(/^mcp__[^_]+__/, '')
                    return (
                      <ToolDetailView
                        key={t.name}
                        tool={t}
                        displayName={shortName}
                        expanded={expandedTool === t.name}
                        onToggleExpand={() => setExpandedTool(expandedTool === t.name ? null : t.name)}
                      />
                    )
                  })}
                  {serverTools.length === 0 && (
                    <div className="th-empty" style={{ padding: '12px 14px' }}>该服务暂无工具</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Add server form - fixed at bottom */}
      <div style={{ flexShrink: 0, borderTop: '1px solid #e5e7eb', background: '#fafbfc' }}>
        <div className="th-sec" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="th-sec-t" style={{ margin: 0 }}>添加服务</div>
          {!connectResult && (
            <button className="th-toggle-mode" onClick={() => setShowJson(!showJson)}>
              {showJson ? '简单模式' : 'JSON 配置'}
            </button>
          )}
        </div>

        {connectResult && (
          <div style={{ padding: '8px 14px' }}>
            {connectResult.ok ? (
              <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#16a34a', marginBottom: '4px' }}>
                  连接成功
                </div>
                <div style={{ color: '#166534' }}>
                  服务: {connectResult.serverName}<br />
                  获取到 <strong>{connectResult.toolCount}</strong> 个工具
                </div>
                {connectResult.error && (
                  <div style={{ color: '#ca8a04', marginTop: '4px', fontSize: '11px' }}>{connectResult.error}</div>
                )}
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={showJson ? saveJsonConnection : saveConnection}
                    style={{ padding: '5px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}
                  >保存</button>
                  <button
                    onClick={showJson ? discardJsonConnection : discardConnection}
                    style={{ padding: '5px 14px', background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '12px', cursor: 'pointer' }}
                  >丢弃</button>
                </div>
              </div>
            ) : (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                <div style={{ fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                  连接失败
                </div>
                <div style={{ color: '#991b1b' }}>{connectResult.error}</div>
                <button
                  onClick={() => setConnectResult(null)}
                  style={{ marginTop: '8px', padding: '4px 12px', background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '5px', fontSize: '11px', cursor: 'pointer' }}
                >关闭</button>
              </div>
            )}
          </div>
        )}

        {!connectResult && (
          showJson ? (
            <div className="th-add-form">
              <textarea ref={jsonRef} placeholder="粘贴 MCP JSON 配置..." rows={4} style={{ width: '100%', resize: 'vertical', fontFamily: 'monospace', fontSize: '11px' }} />
              {jsonError && <div className="th-error">{jsonError}</div>}
              <button onClick={testConnectJson} disabled={opLoading}>{opLoading ? '连接中...' : '测试连接'}</button>
            </div>
          ) : (
            <div className="th-add-form">
              <div className="th-row">
                <input ref={nameRef} placeholder="服务名称" style={{ flex: 1 }} />
                <select ref={transportRef} style={{ width: '80px' }}>
                  <option value="streamable-http">HTTP</option>
                  <option value="stdio">Stdio</option>
                </select>
              </div>
              <input ref={urlRef} placeholder="URL 或 Command" />
              <input ref={headersRef} placeholder="Headers (JSON, 可选)" />
              {jsonError && <div className="th-error">{jsonError}</div>}
              <button onClick={testConnect} disabled={opLoading}>{opLoading ? '连接中...' : '测试连接'}</button>
            </div>
          )
        )}
      </div>
    </div>
  )
}
