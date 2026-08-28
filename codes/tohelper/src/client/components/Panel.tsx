import type { AppData } from './App'
import { ToolsTab } from './ToolsTab'
import { McpTab } from './McpTab'
import { SkillsTab } from './SkillsTab'

interface Props {
  btnPos: { x: number; y: number }
  tab: 'tools' | 'mcp' | 'skills'
  onTabChange: (tab: 'tools' | 'mcp' | 'skills') => void
  onClose: () => void
  data: AppData
  reload: () => void
}

const PANEL_W = 420
const PANEL_H = 700

const tabs: Array<{ key: 'tools' | 'mcp' | 'skills'; label: string }> = [
  { key: 'tools', label: '工具' },
  { key: 'mcp', label: 'MCP' },
  { key: 'skills', label: '技能' },
]

export function Panel({ btnPos, tab, onTabChange, onClose, data, reload }: Props) {
  let top = btnPos.y - PANEL_H - 12
  let left = btnPos.x + 80 - PANEL_W
  if (top < 8) top = btnPos.y + 80 + 12
  if (left < 8) left = 8
  if (left + PANEL_W > window.innerWidth - 8) left = window.innerWidth - PANEL_W - 8
  if (top + PANEL_H > window.innerHeight - 8) top = window.innerHeight - PANEL_H - 8

  const style = {
    position: 'fixed' as const,
    left: `${left}px`,
    top: `${top}px`,
    width: `${PANEL_W}px`,
    height: `${PANEL_H}px`,
    pointerEvents: 'auto' as const,
  }

  return (
    <div className="th-panel open" style={style}>
      <div className="th-hdr">
        <h2>tohelper</h2>
        <button className="th-cls" onClick={onClose}>&times;</button>
      </div>
      <div className="th-tabs">
        {tabs.map(t => (
          <button
            key={t.key}
            className={tab === t.key ? 'active' : ''}
            onClick={() => onTabChange(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="th-body">
        {tab === 'tools' && <ToolsTab data={data} />}
        {tab === 'mcp' && <McpTab data={data} reload={reload} />}
        {tab === 'skills' && <SkillsTab data={data} />}
      </div>
    </div>
  )
}
