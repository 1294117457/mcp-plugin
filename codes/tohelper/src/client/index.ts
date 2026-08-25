import { styles } from './styles/index'
import { loadTools } from './view/tools-tab/index'
import { loadMcp } from './view/mcp-tab/index'
import { loadSkills } from './view/skills-tab/index'

;(function init() {
  if (document.getElementById('th-root')) return

  // Inject styles
  const styleEl = document.createElement('style')
  styleEl.textContent = styles
  document.head.appendChild(styleEl)

  // Create DOM
  const root = document.createElement('div')
  root.id = 'th-root'
  root.innerHTML = `
    <button id="th-btn">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    </button>
    <div id="th-panel">
      <div class="th-hdr">
        <h2>tohelper</h2>
        <button class="th-cls" id="th-cls">\u00d7</button>
      </div>
      <div class="th-tabs">
        <button class="active" data-tab="tools">工具</button>
        <button data-tab="mcp">MCP</button>
        <button data-tab="skills">技能</button>
      </div>
      <div class="th-body" id="th-body"></div>
    </div>
  `
  document.body.appendChild(root)

  // State
  let isOpen = false
  let currentTab = 'tools'
  let panelHeight = 700

  const btn = document.getElementById('th-btn')!
  const panel = document.getElementById('th-panel')!
  const body = document.getElementById('th-body')!

  // --- Draggable button ---
  let isDragging = false
  let hasMoved = false
  let dragStartX = 0
  let dragStartY = 0
  let btnStartX = 0
  let btnStartY = 0

  function getBtnPos() {
    const rect = btn.getBoundingClientRect()
    return { x: rect.left, y: rect.top }
  }

  btn.addEventListener('pointerdown', (e: PointerEvent) => {
    isDragging = true
    hasMoved = false
    dragStartX = e.clientX
    dragStartY = e.clientY
    const pos = getBtnPos()
    btnStartX = pos.x
    btnStartY = pos.y
    btn.classList.add('dragging')
    btn.setPointerCapture(e.pointerId)
    e.preventDefault()
  })

  document.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return
    const dx = e.clientX - dragStartX
    const dy = e.clientY - dragStartY

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      hasMoved = true
    }

    const newX = btnStartX + dx
    const newY = btnStartY + dy

    // Clamp within viewport
    const maxX = window.innerWidth - 44
    const maxY = window.innerHeight - 44
    const clampedX = Math.max(0, Math.min(maxX, newX))
    const clampedY = Math.max(0, Math.min(maxY, newY))

    btn.style.left = `${clampedX}px`
    btn.style.top = `${clampedY}px`
    btn.style.right = 'auto'
    btn.style.bottom = 'auto'
  })

  document.addEventListener('pointerup', (e: PointerEvent) => {
    if (!isDragging) return
    isDragging = false
    btn.classList.remove('dragging')

    if (!hasMoved) {
      // Click: toggle panel
      isOpen = !isOpen
      panel.classList.toggle('open', isOpen)
      if (isOpen) {
        positionPanel()
        loadCurrentTab()
      }
    } else {
      // After drag: reposition panel if open
      if (isOpen) positionPanel()
    }
  })

  // Position panel relative to button
  function positionPanel(): void {
    const btnRect = btn.getBoundingClientRect()
    const panelWidth = 420
    panelHeight = 700

    // Prefer placing panel above the button
    let top = btnRect.top - panelHeight - 12
    let left = btnRect.right - panelWidth

    // If not enough room above, place below
    if (top < 8) {
      top = btnRect.bottom + 12
    }

    // Clamp horizontal
    if (left < 8) left = 8
    if (left + panelWidth > window.innerWidth - 8) {
      left = window.innerWidth - panelWidth - 8
    }

    // Clamp vertical
    if (top + panelHeight > window.innerHeight - 8) {
      top = window.innerHeight - panelHeight - 8
    }

    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.right = 'auto'
    panel.style.bottom = 'auto'
  }

  // Close button
  document.getElementById('th-cls')!.addEventListener('click', () => {
    isOpen = false
    panel.classList.remove('open')
  })

  // Tab switching
  root.querySelectorAll<HTMLButtonElement>('.th-tabs button').forEach(tabBtn => {
    tabBtn.addEventListener('click', () => {
      currentTab = tabBtn.dataset.tab!
      root.querySelectorAll('.th-tabs button').forEach(b => b.classList.remove('active'))
      tabBtn.classList.add('active')
      loadCurrentTab()
    })
  })

  function loadCurrentTab(): void {
    switch (currentTab) {
      case 'tools': loadTools(body); break
      case 'mcp': loadMcp(body); break
      case 'skills': loadSkills(body); break
    }
  }
})()
