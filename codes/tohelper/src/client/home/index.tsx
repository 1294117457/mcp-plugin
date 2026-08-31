import { useState, useEffect, useCallback } from 'react'
import { FloatingButton } from './FloatingButton'
import { SatelliteMenu } from './SatelliteMenu'
import { ToolPanel } from '../tool/ToolPanel'
import { TaskPanel } from '../task/TaskPanel'
import { NodePanel } from '../node/NodePanel'
import { configApi } from '../api/node'
import { CSS } from '../shared/styles'

type ActivePanel = 'tool' | 'task' | 'node' | null

export function TohelperApp() {
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [reloadMsg, setReloadMsg] = useState<string | null>(null)

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
    return () => {
      const el = document.querySelector('style[data-plugin-css="tohelper"]')
      if (el) el.remove()
    }
  }, [])

  const handleToggle = useCallback(() => {
    if (activePanel) {
      setActivePanel(null)
    } else {
      setMenuOpen(v => !v)
    }
  }, [activePanel])

  const handleSatelliteSelect = useCallback(async (id: string) => {
    if (id === 'reload') {
      setMenuOpen(false)
      try {
        const res = await configApi.reload()
        if (res.ok) {
          setReloadMsg(`Reloaded: ${res.tasks} tasks, ${res.nodes} nodes`)
        } else {
          setReloadMsg(`Reload failed: ${res.error}`)
        }
      } catch (e: any) {
        setReloadMsg(`Reload error: ${e.message}`)
      }
      setTimeout(() => setReloadMsg(null), 3000)
      return
    }
    setMenuOpen(false)
    setActivePanel(id as ActivePanel)
  }, [])

  const handleClosePanel = useCallback(() => {
    setActivePanel(null)
  }, [])

  return (
    <div className="th-root" style={{ position: 'fixed', zIndex: 900, pointerEvents: 'none' }}>
      <FloatingButton
        pos={btnPos}
        onPosChange={setBtnPos}
        isOpen={menuOpen || !!activePanel}
        onToggle={handleToggle}
      />
      {menuOpen && !activePanel && (
        <SatelliteMenu
          center={btnPos}
          items={[
            { id: 'tool', label: '工具' },
            { id: 'task', label: '任务' },
            { id: 'node', label: '编排' },
            { id: 'reload', label: '刷新' },
          ]}
          onSelect={handleSatelliteSelect}
        />
      )}
      {activePanel === 'tool' && <ToolPanel btnPos={btnPos} onClose={handleClosePanel} />}
      {activePanel === 'task' && <TaskPanel btnPos={btnPos} onClose={handleClosePanel} />}
      {activePanel === 'node' && <NodePanel btnPos={btnPos} onClose={handleClosePanel} />}
      {reloadMsg && (
        <div style={{
          position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', color: '#e2e8f0', padding: '8px 16px', borderRadius: 8,
          fontSize: 13, zIndex: 999, pointerEvents: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        }}>
          {reloadMsg}
        </div>
      )}
    </div>
  )
}
