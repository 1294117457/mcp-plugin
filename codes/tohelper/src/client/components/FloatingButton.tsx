import { useCallback, useEffect, useRef } from 'react'

interface Props {
  pos: { x: number; y: number }
  onPosChange: (pos: { x: number; y: number }) => void
  isOpen: boolean
  onToggle: () => void
}

const SIZE = 80

export function FloatingButton({ pos, onPosChange, isOpen, onToggle }: Props) {
  const dragging = useRef(false)
  const hasMoved = useRef(false)
  const startMouse = useRef({ x: 0, y: 0 })
  const startBtn = useRef({ x: 0, y: 0 })
  const posRef = useRef(pos)
  const onPosChangeRef = useRef(onPosChange)
  const onToggleRef = useRef(onToggle)

  posRef.current = pos
  onPosChangeRef.current = onPosChange
  onToggleRef.current = onToggle

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    hasMoved.current = false
    startMouse.current = { x: e.clientX, y: e.clientY }
    startBtn.current = { x: posRef.current.x, y: posRef.current.y }
    e.currentTarget.setPointerCapture(e.pointerId)
    e.preventDefault()
  }, [])

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return
      const dx = e.clientX - startMouse.current.x
      const dy = e.clientY - startMouse.current.y
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasMoved.current = true
      const x = Math.max(0, Math.min(window.innerWidth - SIZE, startBtn.current.x + dx))
      const y = Math.max(0, Math.min(window.innerHeight - SIZE, startBtn.current.y + dy))
      onPosChangeRef.current({ x, y })
    }
    const onUp = () => {
      if (!dragging.current) return
      dragging.current = false
      if (!hasMoved.current) onToggleRef.current()
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [])

  return (
    <div
      className={`th-btn${isOpen ? ' open' : ''}`}
      style={{
        position: 'fixed',
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${SIZE}px`,
        height: `${SIZE}px`,
        pointerEvents: 'auto',
        cursor: 'grab',
        zIndex: 901,
      }}
      onPointerDown={onPointerDown}
    >
      <svg
        width={28} height={28} viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth={2}
        style={{ margin: 'auto' }}
      >
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
      </svg>
    </div>
  )
}
