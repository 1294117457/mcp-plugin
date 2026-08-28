import { useState, useEffect, useCallback } from 'react'
import { FloatingButton } from './FloatingButton'
import { SatelliteMenu } from './SatelliteMenu'
import { ToolPanel } from '../tool/ToolPanel'
import { NodePanel } from '../node/NodePanel'
import { CSS } from '../shared/styles'

type ActivePanel = 'tool' | 'node' | null

export function TohelperApp() {
  const [btnPos, setBtnPos] = useState({ x: -1, y: -1 })
  const [menuOpen, setMenuOpen] = useState(false)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

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

  const handleSatelliteSelect = useCallback((id: string) => {
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
            { id: 'node', label: '节点' },
          ]}
          onSelect={handleSatelliteSelect}
        />
      )}
      {activePanel === 'tool' && (
        <ToolPanel btnPos={btnPos} onClose={handleClosePanel} />
      )}
      {activePanel === 'node' && (
        <NodePanel btnPos={btnPos} onClose={handleClosePanel} />
      )}
    </div>
  )
}
