import { useState, useEffect, useCallback } from 'react'
import type { ToolsResponse, SkillItem, McpServer } from '../api'
import { api } from '../api'
import { FloatingButton } from './FloatingButton'
import { Panel } from './Panel'
import { CSS } from '../styles'

export interface AppData {
  tools: ToolsResponse | null
  skills: SkillItem[]
  servers: McpServer[]
  denied: Set<string>
  loading: boolean
  error: string
}

export function TohelperApp() {
  const [isOpen, setIsOpen] = useState(false)
  const [tab, setTab] = useState<'tools' | 'mcp' | 'skills'>('tools')
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 })

  const [tools, setTools] = useState<ToolsResponse | null>(null)
  const [skills, setSkills] = useState<SkillItem[]>([])
  const [servers, setServers] = useState<McpServer[]>([])
  const [denied, setDenied] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(() => {
    setLoading(true)
    setError('')
    Promise.all([api.getTools(), api.getSkills(), api.getMcpServers()])
      .then(([t, s, m]) => {
        setTools(t)
        setSkills(s.skills)
        setServers(m.servers)
        setDenied(new Set(m.denied))
        setLoading(false)
      })
      .catch(e => {
        setError(e.message || 'Failed to load data')
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    const style = document.querySelector('style[data-plugin-css="tohelper"]')
    if (!style) {
      const tag = document.createElement('style')
      tag.dataset.pluginCss = 'tohelper'
      tag.textContent = CSS
      document.head.appendChild(tag)
    }
    if (btnPos.x === -1) {
      setBtnPos({ x: window.innerWidth - 100, y: window.innerHeight - 120 })
    }
    reload()
    return () => {
      const el = document.querySelector('style[data-plugin-css="tohelper"]')
      if (el) el.remove()
    }
  }, [])

  const toggle = useCallback(() => setIsOpen(v => !v), [])
  const data: AppData = { tools, skills, servers, denied, loading, error }

  return (
    <div className="th-root" style={{ position: 'fixed', zIndex: 900, pointerEvents: 'none' }}>
      <FloatingButton pos={btnPos} onPosChange={setBtnPos} isOpen={isOpen} onToggle={toggle} />
      {isOpen && (
        <Panel
          btnPos={btnPos}
          tab={tab}
          onTabChange={setTab}
          onClose={() => setIsOpen(false)}
          data={data}
          reload={reload}
        />
      )}
    </div>
  )
}
