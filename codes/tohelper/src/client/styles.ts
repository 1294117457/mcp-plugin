export const styles = `
#th-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1f2937;
}

#th-btn {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 99999;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #4f46e5;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
  border: none;
  transition: transform 0.15s, box-shadow 0.15s;
  user-select: none;
  touch-action: none;
}
#th-btn:hover { transform: scale(1.1); }
#th-btn:active { cursor: grabbing; }
#th-btn.dragging {
  cursor: grabbing;
  transform: scale(1.15);
  box-shadow: 0 8px 24px rgba(79, 70, 229, 0.5);
}

#th-btn .badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
}

#th-panel {
  position: fixed;
  z-index: 99998;
  width: 420px;
  height: 700px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
  display: none;
  flex-direction: column;
  overflow: hidden;
}
#th-panel.open { display: flex; }

.th-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #f3f4f6;
  flex-shrink: 0;
}
.th-hdr h2 { font-size: 14px; font-weight: 600; margin: 0; }

.th-cls {
  border: none;
  background: none;
  font-size: 18px;
  cursor: pointer;
  color: #6b7280;
  padding: 2px 6px;
  border-radius: 4px;
}
.th-cls:hover { background: #f3f4f6; }

.th-tabs {
  display: flex;
  border-bottom: 1px solid #f3f4f6;
  padding: 0 8px;
  flex-shrink: 0;
}
.th-tabs button {
  flex: 1;
  padding: 8px 4px;
  border: none;
  background: none;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.15s, border-color 0.15s;
}
.th-tabs button.active {
  color: #4f46e5;
  border-bottom-color: #4f46e5;
}
.th-tabs button:hover:not(.active) { color: #374151; }

.th-body {
  flex: 1;
  overflow-y: auto;
  padding: 0;
}

.th-empty {
  padding: 30px 14px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* --- MCP Tab --- */
.th-mcp-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}
.th-mcp-section {
  flex-shrink: 0;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  flex-direction: column;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-section.flexible {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.th-mcp-section > .th-sec-t {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 14px 4px;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  cursor: pointer;
  user-select: none;
}
.th-mcp-section > .th-sec-t:hover { color: #374151; }
.th-mcp-section > .th-sec-t.selected { color: #4f46e5; }
.th-mcp-scroll {
  overflow-y: auto;
  max-height: 200px;
}
.th-mcp-section.flexible .th-mcp-scroll {
  flex: 1;
  max-height: none;
  min-height: 0;
  overflow-y: auto;
}
.th-mcp-hint {
  padding: 12px 14px;
  color: #9ca3af;
  font-size: 11px;
  text-align: center;
}
.th-mcp-filter-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px 6px;
  flex-shrink: 0;
}
.th-mcp-filter-tag {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
  border: 1px solid transparent;
  transition: all 0.15s;
}
.th-mcp-filter-tag:hover { background: #e5e7eb; }
.th-mcp-filter-tag.active {
  background: #eef2ff;
  color: #4f46e5;
  border-color: #c7d2fe;
}
.th-mcp-filter-tag .cnt {
  display: inline-block;
  background: rgba(79,70,229,0.12);
  border-radius: 6px;
  padding: 0 4px;
  margin-left: 3px;
  font-size: 9px;
}

/* --- Tools Tab --- */
.th-tools-body {
  display: flex;
  flex-direction: column;
  height: 100%;
}
.th-tools-filter {
  display: flex;
  gap: 6px;
  padding: 10px 14px 6px;
  flex-shrink: 0;
}
.th-tools-filter button {
  flex: 1;
  padding: 6px 4px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.th-tools-filter button:hover { border-color: #c7d2fe; color: #4f46e5; }
.th-tools-filter button.active {
  background: #eef2ff;
  border-color: #a5b4fc;
  color: #4f46e5;
}
.th-tools-filter button .n {
  background: rgba(79,70,229,0.1);
  border-radius: 6px;
  padding: 0 5px;
  font-size: 10px;
  font-weight: 600;
}
.th-tools-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 0 8px;
}

/* --- Collapsible Group (shared by tools & mcp tabs) --- */
.th-collapse-group {
  display: flex;
  flex-direction: column;
  border-bottom: 1px solid #f3f4f6;
}
.th-collapse-group:last-child { border-bottom: none; }
.th-collapse-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  cursor: pointer;
  user-select: none;
  background: #fafbfc;
  flex-shrink: 0;
  transition: background 0.1s;
}
.th-collapse-header:hover { background: #f0f2f7; }
.th-collapse-header .arrow {
  font-size: 10px;
  color: #9ca3af;
  width: 14px;
  text-align: center;
  transition: transform 0.2s;
  flex-shrink: 0;
}
.th-collapse-header.collapsed .arrow { transform: rotate(-90deg); }
.th-collapse-header .th-cnt {
  font-size: 10px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 1px 5px;
  border-radius: 6px;
}
.th-collapse-header .srv-name {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-collapse-body {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: max-height 0.2s ease;
  max-height: 9999px;
}
.th-collapse-body.collapsed { max-height: 0; }

/* --- Common Item Styles --- */
.th-sec { padding: 4px 14px 8px; }
.th-sec-t {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 8px 0 4px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.th-cnt {
  font-size: 10px;
  background: #eef2ff;
  color: #4f46e5;
  padding: 1px 5px;
  border-radius: 6px;
}

.th-i {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 14px;
  transition: background 0.1s;
}
.th-i:hover { background: #f9fafb; }
.th-i.clickable { cursor: pointer; }
.th-i .nm {
  font-size: 12px;
  font-weight: 500;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-i .ds {
  font-size: 10px;
  color: #9ca3af;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.th-i.disabled {
  background: #fafafa;
  opacity: 0.6;
}
.th-i.disabled .nm {
  text-decoration: line-through;
  color: #9ca3af;
}
.th-i.server-item {
  padding: 6px 14px;
  gap: 10px;
}
.th-i.server-item .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  flex-shrink: 0;
}

.th-tg {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  flex-shrink: 0;
}
.th-tg.mcp { background: #dbeafe; color: #1d4ed8; }
.th-tg.denied { background: #fee2e2; color: #dc2626; }
.th-tg.skl { background: #dcfce7; color: #16a34a; }

.th-ftr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-top: 1px solid #f3f4f6;
  background: #f9fafb;
  flex-shrink: 0;
}

.th-btn-s {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: opacity 0.15s;
}
.th-btn-s:hover { opacity: 0.85; }
.th-rst { color: #6b7280; background: #fff; border: 1px solid #e5e7eb; }
.th-apl { color: #fff; background: #4f46e5; }
`
