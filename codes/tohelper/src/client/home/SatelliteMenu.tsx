interface SatelliteItem {
  id: string
  label: string
}

interface Props {
  center: { x: number; y: number }
  items: SatelliteItem[]
  onSelect: (id: string) => void
}

const RADIUS = 65
const ITEM_SIZE = 44
const BTN_CENTER = 40

export function SatelliteMenu({ center, items, onSelect }: Props) {
  return (
    <>
      {items.map((item, i) => {
        const angle = (2 * Math.PI * i) / items.length - Math.PI / 2
        const cx = center.x + BTN_CENTER + RADIUS * Math.cos(angle) - ITEM_SIZE / 2
        const cy = center.y + BTN_CENTER + RADIUS * Math.sin(angle) - ITEM_SIZE / 2

        return (
          <div
            key={item.id}
            className="th-satellite-item"
            style={{
              position: 'fixed',
              left: cx,
              top: cy,
              width: ITEM_SIZE,
              height: ITEM_SIZE,
              pointerEvents: 'auto',
              zIndex: 902,
              flexDirection: 'column',
            }}
            onClick={() => onSelect(item.id)}
            title={item.label}
          >
            <SatelliteIcon type={item.id} />
            <span className="th-satellite-label">{item.label}</span>
          </div>
        )
      })}
    </>
  )
}

function SatelliteIcon({ type }: { type: string }) {
  if (type === 'tool') {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#4f46e5" strokeWidth={2}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    )
  }
  if (type === 'node') {
    return (
      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth={2}>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    )
  }
  return null
}
