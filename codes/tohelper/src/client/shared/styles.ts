export const CSS = `
.th-root {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: 13px;
  color: #1f2937;
}

.th-btn {
  border-radius: 12px;
  background: rgba(255,255,255,0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
  touch-action: none;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.15s;
}
.th-btn:hover { transform: scale(1.05); }
.th-btn.open { background: rgba(79,70,229,0.1); }

.th-satellite-item {
  border-radius: 50%;
  background: rgba(255,255,255,0.95);
  border: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  transition: transform 0.2s ease, opacity 0.2s ease, left 0.3s ease, top 0.3s ease;
}
.th-satellite-item:hover {
  transform: scale(1.15);
  border-color: #4f46e5;
  background: #eef2ff;
}
.th-satellite-label {
  font-size: 9px;
  font-weight: 600;
  color: #4b5563;
  margin-top: 2px;
}

.th-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.12);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

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

.th-hint {
  padding: 8px 14px;
  font-size: 11px;
  color: #9ca3af;
  margin: 0;
  border-bottom: 1px solid #f3f4f6;
}

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

.th-tg {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  font-weight: 600;
  flex-shrink: 0;
}
.th-tg.mcp { background: #dbeafe; color: #1d4ed8; }
.th-tg.skl { background: #dcfce7; color: #16a34a; }
.th-tg.node { background: #fef3c7; color: #d97706; }

.th-i-wrap { border-bottom: 1px solid transparent; }
.th-i-wrap.expanded {
  background: #f9fafb;
  border-bottom-color: #f3f4f6;
  border-radius: 6px;
  margin: 2px 6px;
}
.th-i-detail {
  display: none;
  padding: 4px 14px 10px 38px;
  font-size: 11px;
  line-height: 1.5;
  color: #4b5563;
  word-break: break-word;
}
.th-i-wrap.expanded .th-i-detail { display: block; }
.th-i-detail .detail-label {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
  text-transform: uppercase;
  margin-bottom: 2px;
}
.th-i-detail .detail-desc { color: #374151; margin-bottom: 6px; }
.th-i-detail .detail-name {
  font-family: monospace;
  font-size: 10px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
}
.th-i-detail .detail-name-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}
.th-i-detail .detail-label-inline {
  font-size: 10px;
  font-weight: 600;
  color: #9ca3af;
}
.th-detail-section {
  margin-bottom: 6px;
}
.th-detail-section-header {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  padding: 3px 0;
  user-select: none;
}
.th-detail-section-header:hover { color: #374151; }
.th-detail-section-body {
  padding: 2px 0 4px 18px;
}
.arrow-sm {
  font-size: 8px;
  color: #9ca3af;
  width: 12px;
  text-align: center;
  transition: transform 0.15s;
  display: inline-block;
}
.arrow-sm.collapsed { transform: rotate(-90deg); }
.th-schema-pre {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  line-height: 1.4;
  overflow-x: auto;
  margin: 4px 0 2px 18px;
  max-height: 160px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
}
.th-action-slot {
  flex-shrink: 0;
  margin-left: auto;
}
.th-md-desc {
  font-size: 11px;
  line-height: 1.6;
  color: #374151;
  word-break: break-word;
}
.th-md-desc p { margin: 0 0 6px; }
.th-md-desc p:last-child { margin-bottom: 0; }
.th-md-desc strong { font-weight: 600; }
.th-md-desc em { font-style: italic; }
.th-md-desc code.th-md-code {
  background: #f1f5f9;
  padding: 1px 4px;
  border-radius: 3px;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}
.th-md-desc pre.th-md-code-block {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 10px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  overflow-x: auto;
  margin: 4px 0;
}
.th-md-desc ul.th-md-list {
  margin: 4px 0;
  padding-left: 16px;
  list-style: disc;
}
.th-md-desc ul.th-md-list li {
  margin: 2px 0;
}

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
  transition: background 0.1s;
}
.th-collapse-header:hover { background: #f0f2f7; }
.th-collapse-header .arrow {
  font-size: 10px;
  color: #9ca3af;
  width: 14px;
  text-align: center;
  transition: transform 0.2s;
}
.th-collapse-header.collapsed .arrow { transform: rotate(-90deg); }
.th-collapse-header .srv-name {
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-tools-body { display: flex; flex-direction: column; height: 100%; }
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

.th-equip-toggle {
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #6b7280;
  flex-shrink: 0;
}
.th-equip-toggle:hover { border-color: #4f46e5; color: #4f46e5; }
.th-equip-toggle.equipped {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}
.th-equip-toggle.equipped:hover { background: #4338ca; }

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
  max-height: 140px;
}
.th-mcp-section:last-child { border-bottom: none; }
.th-mcp-tools-section {
  flex: 1;
  min-height: 120px;
  max-height: none;
}
.th-mcp-servers-scroll, .th-mcp-tools-scroll {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 0 0 4px;
}
.th-mcp-actions {
  display: flex;
  gap: 8px;
  padding: 6px 14px;
  flex-shrink: 0;
}
.th-mcp-actions button {
  padding: 5px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
}
.th-mcp-actions button:first-child {
  background: #4f46e5;
  color: #fff;
  border-color: #4f46e5;
}

.th-i.server-item { cursor: pointer; }
.th-i.server-item.active { background: #eef2ff; }
.th-rm-srv {
  border: none;
  background: none;
  color: #9ca3af;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 4px;
  border-radius: 4px;
}
.th-rm-srv:hover { color: #ef4444; background: #fee2e2; }

.th-toggle-mode {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  background: #f3f4f6;
  color: #6b7280;
  border: none;
}
.th-toggle-mode:hover { background: #e5e7eb; }

.th-add-form {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 8px 14px;
}
.th-add-form input, .th-add-form select, .th-add-form textarea {
  padding: 6px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.th-add-form input:focus, .th-add-form select:focus, .th-add-form textarea:focus { border-color: #a5b4fc; }
.th-add-form button {
  padding: 6px 12px;
  background: #4f46e5;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.th-add-form button:hover { opacity: 0.9; }
.th-error {
  font-size: 11px;
  color: #dc2626;
  padding: 4px 0;
}

.th-node-list { padding: 8px 0; }
.th-node-card {
  padding: 10px 14px;
  margin: 6px 10px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
}
.th-node-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}
.th-node-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  font-family: monospace;
}
.th-node-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 6px;
  line-height: 1.4;
}
.th-node-meta {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 8px;
}
.th-node-actions {
  display: flex;
  gap: 6px;
}
.th-node-actions button {
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
}
.th-node-actions button:hover { border-color: #4f46e5; color: #4f46e5; }
.th-btn-danger { color: #dc2626 !important; }
.th-btn-danger:hover { border-color: #dc2626 !important; background: #fef2f2 !important; }
.th-btn-create {
  display: block;
  width: calc(100% - 20px);
  margin: 0 10px 8px;
  padding: 8px;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  background: #fafbff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
}
.th-btn-create:hover { background: #eef2ff; border-color: #4f46e5; }
.th-btn-primary {
  background: #4f46e5 !important;
  color: #fff !important;
  border-color: #4f46e5 !important;
}

.th-node-editor {
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  overflow-y: auto;
}
.th-node-editor label {
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: -6px;
}
.th-node-editor input, .th-node-editor textarea, .th-node-editor select {
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
}
.th-node-editor input:focus, .th-node-editor textarea:focus { border-color: #a5b4fc; }
.th-node-editor textarea { resize: vertical; min-height: 60px; }
.th-editor-actions {
  display: flex;
  gap: 8px;
  padding-top: 6px;
}
.th-editor-actions button {
  flex: 1;
  padding: 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: #fff;
  color: #374151;
}
.th-row {
  display: flex;
  gap: 8px;
}
.th-row input { flex: 1; }
`
