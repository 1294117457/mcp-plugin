export const mcpStyles = `
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
  max-height: 130px;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-section.flexible {
  flex: 1;
  min-height: 120px;
  max-height: none;
  overflow: hidden;
}
.th-mcp-section.add-section {
  max-height: 220px;
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
  flex: 1;
  min-height: 0;
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
`
