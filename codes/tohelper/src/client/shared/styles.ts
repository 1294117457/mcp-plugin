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

.th-node-list {
  padding: 8px 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.th-node-list-hdr {
  padding: 10px 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-shrink: 0;
  border-bottom: 1px solid #f3f4f6;
}

.th-node-items {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px 0;
}

.th-node-card {
  padding: 12px 14px;
  margin: 6px 10px;
  border-radius: 8px;
  background: #fafbfc;
  border: 1px solid #e5e7eb;
  transition: all 0.15s;
}

.th-node-card:hover {
  border-color: #c7d2fe;
  background: #f5f3ff;
}

.th-node-card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.th-node-name {
  font-size: 12px;
  font-weight: 600;
  color: #1f2937;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.th-node-desc {
  font-size: 11px;
  color: #6b7280;
  margin: 0 0 8px;
  line-height: 1.5;
}

.th-node-meta {
  display: flex;
  gap: 12px;
  font-size: 10px;
  color: #9ca3af;
  margin-bottom: 10px;
  flex-wrap: wrap;
}

.th-node-meta-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.th-node-actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.th-node-actions button {
  padding: 5px 12px;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: white;
  color: #374151;
  transition: all 0.15s;
}

.th-node-actions button:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #f5f3ff;
}

.th-node-badge {
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
}

.th-node-badge.direct {
  background: #e0e7ff;
  color: #4338ca;
}

.th-node-badge.pipeline {
  background: #fce7f3;
  color: #9f1239;
}

.th-node-badge.subagent {
  background: #dbeafe;
  color: #1e40af;
}

.th-btn-danger {
  color: #dc2626 !important;
}

.th-btn-danger:hover {
  border-color: #dc2626 !important;
  background: #fef2f2 !important;
}

.th-btn-create {
  display: block;
  width: calc(100% - 20px);
  margin: 0 10px 8px;
  padding: 10px;
  border: 1px dashed #c7d2fe;
  border-radius: 8px;
  background: #fafbff;
  color: #4f46e5;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  text-align: center;
  transition: all 0.15s;
  flex-shrink: 0;
}

.th-btn-create:hover {
  background: #eef2ff;
  border-color: #4f46e5;
  border-style: solid;
}

.th-btn-success {
  background: #10b981 !important;
  color: white !important;
  border-color: #10b981 !important;
}

.th-btn-success:hover {
  background: #059669 !important;
  border-color: #059669 !important;
}

.th-node-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.th-editor-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

.th-editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #f3f4f6;
  flex-shrink: 0;
  background: white;
}

.th-form-section {
  padding: 14px 16px;
  border-bottom: 1px solid #f3f4f6;
}

.th-form-section:last-child {
  border-bottom: none;
}

.th-form-section h3 {
  font-size: 13px;
  font-weight: 600;
  color: #374151;
  margin: 0 0 14px 0;
}

.th-form-group {
  margin-bottom: 14px;
}

.th-form-group:last-child {
  margin-bottom: 0;
}

.th-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 6px;
}

.th-label-sm {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 4px;
}

.th-input, .th-textarea, .th-select {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: white;
}

.th-input:focus, .th-textarea:focus, .th-select:focus {
  border-color: #a5b4fc;
  box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
}

.th-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.th-error-msg {
  font-size: 10px;
  color: #dc2626;
  margin-top: 4px;
}

.th-radio-group {
  display: flex;
  gap: 14px;
  flex-wrap: wrap;
}

.th-radio {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
}

.th-radio input[type="radio"] {
  width: auto;
  cursor: pointer;
  margin: 0;
}

.th-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 11px;
  color: #374151;
  padding: 5px 0;
}

.th-checkbox input[type="checkbox"] {
  width: auto;
  cursor: pointer;
  margin: 0;
  flex-shrink: 0;
}

.th-tool-selector {
  display: flex;
  flex-direction: column;
  max-height: 220px;
  overflow-y: auto;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px 10px;
  background: #fafbfc;
}

/* ===== Task List Styles ===== */
.th-task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
  max-height: 400px;
  overflow-y: auto;
  padding-right: 4px;
}

.th-task-item {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.th-task-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  background: #fafbfc;
  transition: background 0.15s;
}

.th-task-header:hover {
  background: #f3f4f6;
}

.th-task-order {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #4f46e5;
  color: white;
  border-radius: 50%;
  font-weight: 600;
  font-size: 11px;
}

.th-task-name {
  flex: 1;
  font-size: 12px;
  font-weight: 500;
  color: #374151;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-task-badge {
  font-size: 9px;
  padding: 3px 8px;
  border-radius: 4px;
  font-weight: 600;
  text-transform: uppercase;
  flex-shrink: 0;
}

.th-task-badge.llm-call {
  background: #e0e7ff;
  color: #4338ca;
}

.th-task-badge.tool-call {
  background: #fce7f3;
  color: #9f1239;
}

.th-task-badge.transform {
  background: #d1fae5;
  color: #065f46;
}

.th-task-badge.custom-llm {
  background: #fef3c7;
  color: #92400e;
  font-size: 8px;
  padding: 2px 6px;
}

.th-llm-config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.th-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 10px;
  color: #6b7280;
}

.th-checkbox-inline input[type="checkbox"] {
  width: auto;
  margin: 0;
  cursor: pointer;
}

.th-hint-text {
  font-size: 9px;
  color: #9ca3af;
  margin-top: 4px;
  font-style: italic;
}

/* Mode Selector */
.th-mode-selector {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.th-mode-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.th-mode-option:hover {
  border-color: #3b82f6;
  background-color: #eff6ff;
}

.th-mode-option input[type="radio"] {
  margin: 0;
  cursor: pointer;
}

.th-mode-option input[type="radio"]:checked + .th-mode-content {
  color: #3b82f6;
}

.th-mode-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.th-mode-content strong {
  font-size: 11px;
  font-weight: 600;
}

.th-mode-content span {
  font-size: 9px;
  color: #6b7280;
}

.th-mode-description {
  padding: 8px 12px;
  background-color: #f9fafb;
  border-left: 3px solid #3b82f6;
  border-radius: 4px;
  font-size: 10px;
  color: #4b5563;
}

/* Tool Multiselect */
.th-tool-multiselect {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
  border: 1px solid #e5e7eb;
  border-radius: 4px;
  background-color: #f9fafb;
}

.th-checkbox-sm {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 9px;
  color: #374151;
  padding: 4px 6px;
  border-radius: 3px;
  transition: background-color 0.15s;
}

.th-checkbox-sm:hover {
  background-color: #e5e7eb;
}

.th-checkbox-sm input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.th-task-badge.tools {
  background: #dbeafe;
  color: #1e40af;
  font-size: 8px;
  padding: 2px 6px;
}

/* Slider */
.th-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.th-slider:hover {
  opacity: 1;
}

.th-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.th-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
}

.th-task-body {
  padding: 14px 12px;
  border-top: 1px solid #e5e7eb;
  background: white;
}

.th-btn-icon {
  width: 28px;
  height: 28px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.15s;
  flex-shrink: 0;
}

.th-btn-icon:hover:not(:disabled) {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #f5f3ff;
}

.th-btn-icon:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.th-btn-icon.th-btn-danger {
  color: #6b7280;
}

.th-btn-icon.th-btn-danger:hover {
  border-color: #dc2626;
  color: #dc2626;
  background: #fef2f2;
}

.th-btn {
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: white;
  color: #374151;
  transition: all 0.15s;
}

.th-btn:hover {
  border-color: #4f46e5;
  color: #4f46e5;
  background: #f5f3ff;
}

.th-btn-primary {
  background: #4f46e5 !important;
  color: white !important;
  border-color: #4f46e5 !important;
}

.th-btn-primary:hover {
  background: #4338ca !important;
  border-color: #4338ca !important;
}

.th-btn-secondary {
  background: white !important;
  color: #6b7280 !important;
  border-color: #d1d5db !important;
}

.th-btn-secondary:hover {
  background: #f9fafb !important;
  border-color: #9ca3af !important;
  color: #374151 !important;
}

.th-empty {
  padding: 32px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* === 新架构样式 === */

/* Task List 根据 Mode 的不同样式 */
.th-task-list-pipeline {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.th-task-list-pipeline .th-task-item {
  position: relative;
}

.th-task-list-pipeline .th-task-arrow {
  margin-left: auto;
  font-size: 16px;
  color: #3b82f6;
  font-weight: bold;
  pointer-events: none;
}

/* Loop 模式：网格布局，不强调顺序 */
.th-task-list-loop {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}

.th-task-list-loop .th-task-item {
  min-height: 60px;
}

.th-task-list-loop .th-task-arrow {
  display: none;
}

/* Direct 模式：全宽单个 Task */
.th-task-list-direct .th-task-item {
  width: 100%;
}

/* Node Settings 区域 */
.th-node-settings {
  background-color: #f9fafb;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

/* Mode Section 区域 */
.th-mode-section {
  background-color: #fef3c7;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #f59e0b;
}

/* Task Section 区域 */
.th-task-section {
  background-color: #f0fdf4;
  padding: 16px;
  border-radius: 8px;
  border-left: 4px solid #10b981;
}

/* LLM Config Header */
.th-llm-config-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.th-checkbox-inline {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 10px;
  color: #6b7280;
}

.th-checkbox-inline input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

/* Task Item 根据 Mode 的样式 */
.th-task-item-pipeline {
  border-left: 3px solid #3b82f6;
}

.th-task-item-loop {
  border: 2px solid #e5e7eb;
  border-radius: 8px;
}

.th-task-item-direct {
  border: 2px solid #3b82f6;
  border-radius: 8px;
}

.th-task-badge.custom-llm {
  background: #dbeafe;
  color: #1e40af;
  font-size: 8px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 500;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 18px;
  padding: 4px 8px;
  color: #9ca3af;
  transition: color 0.15s;
  margin-left: auto;
}

.th-btn-icon:hover {
  color: #ef4444;
}

.th-btn-danger {
  color: #ef4444;
}

.th-btn-danger:hover {
  color: #dc2626;
}

/* === 新的布局样式 === */

/* 表单行布局 */
.th-form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.th-form-row .th-form-group {
  margin-bottom: 0;
}

.th-flex-1 {
  flex: 1;
}

.th-flex-2 {
  flex: 2;
}

.th-flex-3 {
  flex: 3;
}

/* 等宽布局 */
.th-form-equal {
  flex: 1;
  min-width: 0;
}

/* 区域折叠 */
.th-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  padding: 8px 12px;
  margin: -12px -12px 12px -12px;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 6px 6px 0 0;
  user-select: none;
}

.th-section-header:hover {
  background: rgba(0, 0, 0, 0.04);
}

.th-section-header h3 {
  margin: 0;
  font-size: 14px;
}

.th-collapse-btn {
  background: none;
  border: none;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s;
}

.th-collapse-btn:hover {
  color: #3b82f6;
}

.th-section-body {
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Task 区域滚动 */
.th-task-section-body {
  max-height: 500px;
  overflow-y: auto;
  overflow-x: hidden;
}

.th-task-section-body::-webkit-scrollbar {
  width: 6px;
}

.th-task-section-body::-webkit-scrollbar-track {
  background: #f3f4f6;
  border-radius: 3px;
}

.th-task-section-body::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.th-task-section-body::-webkit-scrollbar-thumb:hover {
  background: #94a3b8;
}

/* 工具下拉框 */
.th-dropdown {
  position: relative;
}

.th-dropdown-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.th-dropdown-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.th-dropdown-arrow {
  margin-left: 8px;
  font-size: 10px;
  color: #9ca3af;
}

.th-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.th-dropdown-menu::-webkit-scrollbar {
  width: 6px;
}

.th-dropdown-menu::-webkit-scrollbar-track {
  background: #f3f4f6;
}

.th-dropdown-menu::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

.th-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: background 0.15s;
}

.th-dropdown-item:hover {
  background: #f3f4f6;
}

.th-dropdown-item input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.th-dropdown-empty {
  padding: 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* Mode 按钮样式 */
.th-mode-buttons {
  display: flex;
  gap: 6px;
}

.th-mode-btn {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.th-mode-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

.th-mode-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.th-mode-hint {
  font-size: 11px;
  color: #9ca3af;
  margin-top: 6px;
}

/* Task 头部布局 */
.th-task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.th-task-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
  flex-shrink: 0;
}

.th-task-llm {
  font-size: 11px;
  color: #6b7280;
  background: #f3f4f6;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 200px;
}

/* LLM 配置区域样式 */
.th-llm-section {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px;
  margin: 12px 0;
}

.th-llm-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.th-llm-select {
  width: 100%;
}

.th-toggle {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  color: #3b82f6;
}

.th-toggle input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
}

/* Task 头部信息 */
.th-task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  border-bottom: 1px solid #f3f4f6;
  min-height: 48px;
}

.th-task-header:hover {
  background: #f9fafb;
}

.th-task-order {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: #3b82f6;
  color: white;
  font-size: 12px;
  font-weight: 600;
  border-radius: 50%;
  flex-shrink: 0;
}

.th-task-name {
  font-size: 13px;
  font-weight: 500;
  color: #111827;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Task 内容区域 */
.th-task-body {
  padding: 16px;
}

/* 多选下拉框样式 */
select[multiple] {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 8px;
  font-size: 12px;
  background: white;
  cursor: pointer;
}

select[multiple]:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

select[multiple] option {
  padding: 4px 8px;
}

select[multiple] option:checked {
  background: #3b82f6;
  color: white;
}

/* ====================================================== */
/* === 新版 NodeEditorV2 Zone-based Layout === */
/* ====================================================== */

.th-node-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: #f5f7fb;
}

.th-editor-content {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.th-editor-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 14px;
  border-top: 1px solid #e5e7eb;
  flex-shrink: 0;
  background: white;
}

/* ---- Zone 基础 ---- */
.th-zone {
  border-radius: 10px;
  border: 1px solid #e5e7eb;
  background: white;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.th-zone-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  transition: filter 0.15s;
}

.th-zone-header:hover {
  filter: brightness(0.97);
}

.th-zone-icon {
  font-size: 18px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  flex-shrink: 0;
}

.th-zone-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.th-zone-title h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  color: #1f2937;
}

.th-zone-sub {
  font-size: 11px;
  color: #6b7280;
}

.th-zone-count {
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
}

.th-zone-tags {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-shrink: 0;
}

.th-zone-tag {
  font-size: 10px;
  padding: 3px 8px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.7);
  color: #374151;
  font-weight: 500;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-zone-tag-mode {
  text-transform: uppercase;
  letter-spacing: 0.5px;
  font-weight: 600;
}

.th-zone-toggle {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid rgba(0, 0, 0, 0.08);
  background: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s;
}

.th-zone-toggle:hover {
  background: rgba(255, 255, 255, 0.9);
}

.th-chevron {
  font-size: 11px;
  color: #4b5563;
  display: inline-block;
  transition: transform 0.2s;
}

.th-zone-header.collapsed .th-chevron {
  transform: rotate(-90deg);
}

.th-zone-body {
  padding: 14px 14px 16px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
}

/* ---- Node Zone (蓝色) ---- */
.th-zone-node {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.th-zone-node .th-zone-header {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-bottom: 1px solid #93c5fd;
}

.th-zone-node .th-zone-icon {
  background: #3b82f6;
  color: white;
}

.th-zone-node .th-zone-title h3 {
  color: #1e3a8a;
}

.th-zone-node .th-zone-sub {
  color: #1e40af;
}

.th-zone-node .th-zone-tag {
  background: white;
  color: #1e40af;
  border: 1px solid #93c5fd;
}

.th-zone-node .th-zone-tag-mode {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.th-zone-node .th-zone-toggle {
  border-color: #93c5fd;
  background: white;
}

.th-zone-node .th-zone-body {
  background: #f5f9ff;
  border-top-color: #bfdbfe;
}

/* ---- Tasks Zone (绿色) ---- */
.th-zone-tasks {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.th-zone-tasks .th-zone-header {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-bottom: 1px solid #86efac;
}

.th-zone-tasks .th-zone-icon {
  background: #10b981;
  color: white;
}

.th-zone-tasks .th-zone-title h3 {
  color: #14532d;
}

.th-zone-tasks .th-zone-sub {
  color: #166534;
}

.th-zone-tasks .th-zone-tag {
  background: white;
  color: #166534;
  border: 1px solid #86efac;
}

.th-zone-tasks .th-zone-tag-mode {
  background: #10b981;
  color: white;
  border-color: #059669;
}

.th-zone-tasks .th-zone-toggle {
  border-color: #86efac;
  background: white;
}

.th-zone-tasks .th-zone-body {
  background: #f7fef9;
  border-top-color: #bbf7d0;
}

/* ---- 表单元素（Node zone 内） ---- */
.th-zone-node .th-input,
.th-zone-node .th-textarea,
.th-zone-node .th-select {
  background: white;
  border-color: #c7d2fe;
}

.th-zone-node .th-input:focus,
.th-zone-node .th-textarea:focus,
.th-zone-node .th-select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.th-zone-node .th-mode-btn {
  border-color: #c7d2fe;
  background: white;
  color: #4f46e5;
}

.th-zone-node .th-mode-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.th-zone-node .th-mode-btn.active {
  background: #3b82f6;
  color: white;
  border-color: #2563eb;
}

.th-zone-node .th-dropdown-btn {
  border-color: #c7d2fe;
  background: white;
}

.th-zone-node .th-dropdown-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.th-zone-node .th-dropdown-menu {
  border-color: #c7d2fe;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.th-zone-node .th-dropdown-item:hover {
  background: #eff6ff;
}

.th-zone-node .th-slider::-webkit-slider-thumb {
  background: #3b82f6;
}
.th-zone-node .th-slider::-moz-range-thumb {
  background: #3b82f6;
}

/* ---- 表单基础样式 ---- */
.th-form-row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.th-form-row:last-child {
  margin-bottom: 0;
}

.th-form-row .th-form-group {
  margin-bottom: 0;
}

.th-form-group {
  margin-bottom: 12px;
}

.th-form-group:last-child {
  margin-bottom: 0;
}

.th-form-equal {
  flex: 1;
  min-width: 0;
}

.th-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.th-label-sm {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 6px;
}

.th-required {
  color: #ef4444;
  margin-left: 2px;
}

.th-input,
.th-textarea,
.th-select {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 12px;
  outline: none;
  font-family: inherit;
  box-sizing: border-box;
  background: white;
  color: #1f2937;
}

.th-input:focus,
.th-textarea:focus,
.th-select:focus {
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

.th-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
  font-family: inherit;
}

.th-hint {
  font-size: 10px;
  color: #6b7280;
  margin-top: 4px;
  line-height: 1.4;
}

.th-error-msg {
  font-size: 10px;
  color: #dc2626;
  margin-top: 4px;
}

/* ---- Mode 按钮 ---- */
.th-mode-buttons {
  display: flex;
  gap: 6px;
}

.th-mode-btn {
  flex: 1;
  padding: 7px 12px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s;
}

.th-mode-btn:hover {
  border-color: #10b981;
  color: #059669;
  background: #f0fdf4;
}

.th-mode-btn.active {
  background: #10b981;
  color: white;
  border-color: #059669;
}

/* ---- Dropdown ---- */
.th-dropdown {
  position: relative;
}

.th-dropdown-btn {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 7px 10px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: white;
  font-size: 12px;
  color: #374151;
  cursor: pointer;
  transition: all 0.15s;
}

.th-dropdown-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.th-dropdown-arrow {
  margin-left: 8px;
  font-size: 10px;
  color: #9ca3af;
}

.th-dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.th-dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 12px;
  cursor: pointer;
  font-size: 12px;
  color: #374151;
  transition: background 0.15s;
}

.th-dropdown-item:hover {
  background: #f3f4f6;
}

.th-dropdown-item input[type='checkbox'] {
  margin: 0;
  cursor: pointer;
}

.th-dropdown-empty {
  padding: 12px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
}

/* ---- Slider ---- */
.th-slider {
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: #e5e7eb;
  outline: none;
  opacity: 0.8;
  transition: opacity 0.2s;
  margin-top: 8px;
}

.th-slider:hover {
  opacity: 1;
}

.th-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.th-slider::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #10b981;
  cursor: pointer;
  border: 2px solid white;
}

/* ---- Tasks 区 ---- */
.th-task-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 11px;
  color: #166534;
}

.th-link-btn {
  background: none;
  border: none;
  color: #059669;
  font-size: 11px;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
}

.th-link-btn:hover {
  background: #dcfce7;
  text-decoration: underline;
}

.th-divider-dot {
  color: #86efac;
}

/* ---- Task List ---- */
.th-task-list {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-bottom: 12px;
}

.th-task-list-pipeline .th-task-item {
  margin-bottom: 0;
}

.th-task-list-loop {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 10px;
}

/* ---- Task Item ---- */
.th-task-item {
  background: white;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  overflow: hidden;
  transition: border-color 0.15s, box-shadow 0.15s;
}

.th-task-item:hover {
  border-color: #10b981;
}

.th-task-item.expanded {
  border-color: #10b981;
  box-shadow: 0 0 0 1px #10b981;
}

.th-task-item.collapsed {
  border-style: dashed;
}

.th-task-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  cursor: pointer;
  user-select: none;
  background: #fafafa;
  transition: background 0.15s;
  min-height: 48px;
}

.th-task-header:hover {
  background: #f3f4f6;
}

.th-task-order {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #10b981;
  color: white;
  border-radius: 50%;
  font-weight: 700;
  font-size: 12px;
}

.th-task-title {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.th-task-name {
  font-size: 13px;
  font-weight: 600;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-task-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.th-task-llm {
  font-size: 10px;
  color: #4b5563;
  background: #f3f4f6;
  padding: 2px 6px;
  border-radius: 3px;
  white-space: nowrap;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.th-task-badge {
  font-size: 9px;
  padding: 2px 6px;
  border-radius: 3px;
  font-weight: 600;
  text-transform: uppercase;
  white-space: nowrap;
}

.th-task-badge.tools {
  background: #dbeafe;
  color: #1e40af;
}

.th-task-badge.fmt {
  background: #f3f4f6;
  color: #6b7280;
}

.th-task-badge.custom {
  background: #fef3c7;
  color: #92400e;
}

.th-task-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.th-task-actions .th-chevron {
  font-size: 10px;
  color: #6b7280;
}

.th-task-actions .th-btn-icon {
  margin-left: 0;
}

/* ---- Pipeline 连接箭头（位于卡片外部下方） ---- */
.th-task-connector {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 28px;
  position: relative;
}

.th-task-connector::before {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  left: 50%;
  width: 2px;
  background: linear-gradient(to bottom, #10b981 0%, #6ee7b7 100%);
  transform: translateX(-50%);
  z-index: 0;
}

.th-task-connector-arrow {
  position: relative;
  z-index: 1;
  background: #10b981;
  color: white;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 0 0 3px #f7fef9, 0 1px 3px rgba(16, 185, 129, 0.4);
}

/* ---- Task Body ---- */
.th-task-body {
  padding: 14px;
  border-top: 1px solid #e5e7eb;
  background: #fafdfb;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.th-task-block {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px 12px;
}

.th-task-block-inline {
  background: transparent;
  border: none;
  padding: 0;
}

.th-task-block-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.th-task-block-icon {
  font-size: 13px;
}

.th-task-block-title {
  font-size: 11px;
  font-weight: 700;
  color: #374151;
  flex: 1;
}

.th-task-block-meta {
  font-size: 10px;
  color: #6b7280;
}

.th-toggle {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  font-size: 10px;
  color: #059669;
  font-weight: 500;
}

.th-toggle input[type='checkbox'] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  margin: 0;
  accent-color: #10b981;
}

.th-hint-text {
  font-size: 10px;
  color: #6b7280;
  margin-top: 4px;
  font-style: italic;
}

/* ---- 添加 Task 按钮 ---- */
.th-btn-add-task {
  width: 100%;
  padding: 10px;
  border: 1.5px dashed #86efac;
  border-radius: 8px;
  background: #f0fdf4;
  color: #059669;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;
}

.th-btn-add-task:hover {
  background: #dcfce7;
  border-color: #10b981;
  border-style: solid;
}

/* ---- 底部按钮 ---- */
.th-btn {
  padding: 7px 16px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid #e5e7eb;
  background: white;
  color: #374151;
  transition: all 0.15s;
}

.th-btn-primary {
  background: #4f46e5 !important;
  color: white !important;
  border-color: #4f46e5 !important;
}

.th-btn-primary:hover {
  background: #4338ca !important;
  border-color: #4338ca !important;
}

.th-btn-secondary {
  background: white !important;
  color: #6b7280 !important;
  border-color: #d1d5db !important;
}

.th-btn-secondary:hover {
  background: #f9fafb !important;
  border-color: #9ca3af !important;
  color: #374151 !important;
}

/* ---- 删除按钮 ---- */
.th-btn-icon {
  width: 26px;
  height: 26px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #e5e7eb;
  background: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
  color: #6b7280;
  transition: all 0.15s;
  flex-shrink: 0;
}

.th-btn-icon:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

.th-btn-danger {
  color: #6b7280;
}

.th-btn-danger:hover {
  border-color: #ef4444;
  color: #ef4444;
  background: #fef2f2;
}

/* ---- Empty ---- */
.th-empty {
  padding: 28px 16px;
  text-align: center;
  color: #9ca3af;
  font-size: 12px;
  background: #fafafa;
  border: 1px dashed #d1d5db;
  border-radius: 6px;
  margin-bottom: 12px;
}

/* ---- 多选 select 样式 ---- */
select[multiple] {
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 6px;
  font-size: 12px;
  background: white;
  cursor: pointer;
}

select[multiple]:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.12);
}

select[multiple] option {
  padding: 3px 8px;
  border-radius: 3px;
}

select[multiple] option:checked {
  background: #10b981;
  color: white;
}

/* ====================================================== */
/* === Node 工作画板 === */
/* ====================================================== */
.th-workspace-body {
  overflow: hidden;
  padding: 0;
}

.th-workspace {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  background: #f5f7fb;
}

.th-workspace-toolbar {
  min-height: 52px;
  padding: 8px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid #e5e7eb;
  background: #ffffff;
  flex-shrink: 0;
}

.th-workspace-heading {
  display: flex;
  align-items: center;
  gap: 9px;
  min-width: 0;
}

.th-workspace-mark {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: #1d4ed8;
  color: white;
  font-size: 17px;
  font-weight: 700;
}

.th-workspace-heading div {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.th-workspace-heading strong {
  font-size: 13px;
  color: #1f2937;
}

.th-workspace-heading span:last-child {
  font-size: 10px;
  color: #6b7280;
}

.th-workspace-actions {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}

.th-canvas-btn {
  min-width: 30px;
  height: 28px;
  padding: 0 9px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: white;
  color: #4b5563;
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}

.th-canvas-btn:hover:not(:disabled) {
  border-color: #3b82f6;
  color: #1d4ed8;
  background: #eff6ff;
}

.th-canvas-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.th-canvas-btn-create,
.th-canvas-save {
  background: #2563eb;
  border-color: #2563eb;
  color: white;
  font-weight: 600;
}

.th-canvas-btn-create:hover:not(:disabled),
.th-canvas-save:hover:not(:disabled) {
  background: #1d4ed8;
  border-color: #1d4ed8;
  color: white;
}

.th-canvas-zoom {
  min-width: 46px;
  font-family: monospace;
}

.th-workspace-error {
  flex-shrink: 0;
  padding: 6px 12px;
  background: #fef2f2;
  color: #b91c1c;
  border-bottom: 1px solid #fecaca;
  font-size: 11px;
}

.th-workspace-main {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  flex: 1;
  min-height: 0;
}

.th-canvas-shell {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background-color: #f8fafc;
  background-image: radial-gradient(#cbd5e1 0.7px, transparent 0.7px);
  background-size: 18px 18px;
  touch-action: none;
}

.th-canvas-viewport {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: 0 0;
  width: 1px;
  height: 1px;
}

.th-canvas-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 8px;
  color: #6b7280;
  font-size: 12px;
}

.th-canvas-empty strong {
  color: #374151;
  font-size: 14px;
}

.th-canvas-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  border: 1px solid #93c5fd;
  border-radius: 28px 28px 12px 12px;
  background: rgba(239, 246, 255, 0.9);
  box-shadow: 0 8px 18px rgba(30, 64, 175, 0.12);
  overflow: visible;
  user-select: none;
}

.th-canvas-node::before {
  content: '';
  position: absolute;
  inset: 8px 8px 42px;
  border: 1px solid rgba(147, 197, 253, 0.55);
  border-radius: 24px 24px 8px 8px;
  pointer-events: none;
}

.th-canvas-node.selected {
  border: 2px solid #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.16), 0 10px 24px rgba(30, 64, 175, 0.18);
}

.th-canvas-node-header {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 9px 13px 7px;
  cursor: grab;
}

.th-canvas-node-header:active,
.th-canvas-node:active {
  cursor: grabbing;
}

.th-canvas-node-icon {
  width: 27px;
  height: 27px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #2563eb;
  color: white;
  font-size: 16px;
  font-weight: 700;
}

.th-canvas-node-title {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.th-canvas-node-title strong {
  overflow: hidden;
  color: #1e3a8a;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-canvas-node-title span {
  color: #2563eb;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.3px;
}

.th-canvas-collapse,
.th-canvas-task-toggle,
.th-canvas-task-delete {
  border: 0;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  font-size: 14px;
  padding: 3px 5px;
}

.th-canvas-collapse:hover,
.th-canvas-task-toggle:hover {
  color: #1d4ed8;
  background: #dbeafe;
  border-radius: 4px;
}

.th-canvas-node-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.th-canvas-edges {
  position: absolute;
  inset: 0;
  overflow: visible;
  pointer-events: none;
}

.th-canvas-edges path {
  fill: none;
  stroke: #10b981;
  stroke-width: 2;
  stroke-dasharray: 4 3;
}

.th-canvas-task {
  position: absolute;
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  padding: 7px 7px 7px 8px;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  background: white;
  box-shadow: 0 2px 7px rgba(5, 150, 105, 0.12);
  cursor: grab;
  overflow: hidden;
}

.th-canvas-task:hover,
.th-canvas-task.selected {
  border-color: #10b981;
}

.th-canvas-task.selected {
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2), 0 3px 8px rgba(5, 150, 105, 0.16);
}

.th-canvas-task-number {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 50%;
  background: #10b981;
  color: white;
  font-size: 10px;
  font-weight: 700;
}

.th-canvas-task-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.th-canvas-task-content strong {
  overflow: hidden;
  color: #064e3b;
  font-size: 11px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-canvas-task-content span {
  overflow: hidden;
  color: #6b7280;
  font-size: 9px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-canvas-task-delete {
  display: none;
  flex-shrink: 0;
  color: #9ca3af;
}

.th-canvas-task:hover .th-canvas-task-delete,
.th-canvas-task.selected .th-canvas-task-delete {
  display: block;
}

.th-canvas-task-delete:hover {
  color: #dc2626;
}

.th-canvas-task-toggle {
  flex-shrink: 0;
}

.th-canvas-resize {
  position: absolute;
  right: -5px;
  bottom: -5px;
  z-index: 5;
  width: 16px;
  height: 16px;
  padding: 0;
  border: 0;
  border-radius: 3px;
  background: #2563eb;
  color: white;
  cursor: nwse-resize;
  font-size: 9px;
  line-height: 16px;
  text-align: center;
  opacity: 0;
}

.th-canvas-node.selected > .th-canvas-resize,
.th-canvas-task.selected > .th-canvas-resize,
.th-canvas-node:hover > .th-canvas-resize,
.th-canvas-task:hover > .th-canvas-resize {
  opacity: 1;
}

.th-canvas-node-base {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 34px;
  padding: 7px 13px;
  border-top: 1px solid #93c5fd;
  border-radius: 0 0 11px 11px;
  background: #dbeafe;
  color: #1e40af;
  font-size: 9px;
}

.th-canvas-node-base > span:first-child {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-canvas-mode-pill {
  flex-shrink: 0;
  padding: 2px 5px;
  border-radius: 3px;
  background: #2563eb;
  color: white;
  font-size: 8px;
  font-weight: 700;
  text-transform: uppercase;
}

.th-canvas-add-task {
  position: absolute;
  right: 12px;
  bottom: 9px;
  z-index: 4;
  padding: 4px 7px;
  border: 1px dashed #6ee7b7;
  border-radius: 4px;
  background: rgba(236, 253, 245, 0.92);
  color: #047857;
  cursor: pointer;
  font-size: 9px;
}

.th-canvas-add-task:hover:not(:disabled) {
  border-style: solid;
  background: #d1fae5;
}

.th-canvas-add-task:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

/* ---- 属性检查器 ---- */
.th-inspector {
  min-width: 0;
  overflow-y: auto;
  border-left: 1px solid #e5e7eb;
  background: #ffffff;
}

.th-inspector-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  flex-direction: column;
  color: #6b7280;
  text-align: center;
  font-size: 11px;
}

.th-inspector-empty strong {
  color: #374151;
  font-size: 13px;
}

.th-inspector-empty-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 22px;
}

.th-inspector-title {
  padding: 16px 16px 13px;
  border-bottom: 1px solid #e5e7eb;
  background: #f8fafc;
}

.th-inspector-title > span {
  color: #2563eb;
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.8px;
}

.th-inspector-title h2 {
  margin: 4px 0;
  overflow: hidden;
  color: #1f2937;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-inspector-title small {
  color: #6b7280;
  font-size: 10px;
}

.th-inspector-breadcrumb {
  padding: 8px 16px;
  color: #6b7280;
  border-bottom: 1px solid #f1f5f9;
  font-size: 10px;
}

.th-inspector-group {
  border-bottom: 1px solid #e5e7eb;
}

.th-inspector-group-title {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 10px 16px;
  border: 0;
  background: white;
  color: #374151;
  cursor: pointer;
  text-align: left;
}

.th-inspector-group-title:hover {
  background: #f8fafc;
}

.th-inspector-group-title > span {
  width: 12px;
  color: #64748b;
  font-size: 13px;
}

.th-inspector-group-title strong {
  flex: 1;
  font-size: 11px;
}

.th-inspector-group-title em {
  min-width: 18px;
  padding: 2px 5px;
  border-radius: 8px;
  background: #dbeafe;
  color: #1d4ed8;
  font-size: 9px;
  font-style: normal;
  text-align: center;
}

.th-inspector-group-body {
  display: flex;
  gap: 10px;
  padding: 0 16px 12px;
  flex-direction: column;
}

.th-inspector-group-body label,
.th-inspector-label {
  display: flex;
  gap: 5px;
  flex-direction: column;
  color: #4b5563;
  font-size: 10px;
  font-weight: 600;
}

.th-inspector-group-body input,
.th-inspector-group-body textarea,
.th-inspector-group-body select {
  box-sizing: border-box;
  width: 100%;
  padding: 7px 8px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  outline: none;
  background: white;
  color: #1f2937;
  font-family: inherit;
  font-size: 11px;
  font-weight: 400;
}

.th-inspector-group-body input:focus,
.th-inspector-group-body textarea:focus,
.th-inspector-group-body select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.th-inspector-group-body textarea {
  resize: vertical;
  line-height: 1.45;
}

.th-inspector-group-body select[multiple] {
  min-height: 80px;
}

.th-inspector-mode-buttons {
  display: flex;
  gap: 5px;
}

.th-inspector-mode-buttons button {
  flex: 1;
  padding: 7px 4px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: white;
  color: #6b7280;
  cursor: pointer;
  font-size: 10px;
  text-transform: uppercase;
}

.th-inspector-mode-buttons button.active {
  border-color: #2563eb;
  background: #2563eb;
  color: white;
}

.th-inspector-hint {
  color: #6b7280;
  font-size: 10px;
}

.th-inspector-checkbox {
  display: flex !important;
  align-items: center;
  gap: 6px !important;
  flex-direction: row !important;
}

.th-inspector-checkbox input {
  width: auto;
}

.th-inspector-task-list {
  display: flex;
  gap: 4px;
  flex-direction: column;
}

.th-inspector-task-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 7px;
  border: 1px solid #e5e7eb;
  border-radius: 5px;
  background: #fafafa;
  color: #374151;
  cursor: pointer;
  text-align: left;
}

.th-inspector-task-row:hover {
  border-color: #86efac;
  background: #f0fdf4;
}

.th-inspector-task-row span {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #10b981;
  color: white;
  font-size: 9px;
}

.th-inspector-task-row strong {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.th-inspector-task-row small {
  color: #9ca3af;
  font-size: 9px;
}

.th-inspector-add {
  padding: 7px;
  border: 1px dashed #86efac;
  border-radius: 5px;
  background: #f0fdf4;
  color: #047857;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
}

.th-inspector-add:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.th-inspector-footer {
  display: flex;
  gap: 6px;
  padding: 14px 16px;
}

.th-inspector-footer button {
  padding: 7px 10px;
  border: 1px solid #d1d5db;
  border-radius: 5px;
  background: white;
  color: #4b5563;
  cursor: pointer;
  font-size: 10px;
}

.th-inspector-footer button.equipped {
  border-color: #10b981;
  background: #10b981;
  color: white;
}

.th-inspector-footer button.danger {
  border-color: #fecaca;
  color: #dc2626;
}

.th-inspector-footer button:hover {
  background: #f3f4f6;
}

.th-inspector-footer button.equipped:hover {
  background: #059669;
}

@media (max-width: 900px) {
  .th-workspace-main {
    grid-template-columns: minmax(0, 1fr) 320px;
  }
  .th-workspace-actions .th-canvas-btn:not(.th-canvas-btn-create):not(.th-canvas-save) {
    padding-left: 6px;
    padding-right: 6px;
  }
}

@media (max-width: 680px) {
  .th-workspace-main {
    display: flex;
    flex-direction: column;
  }
  .th-canvas-shell {
    min-height: 360px;
  }
  .th-inspector {
    min-height: 300px;
    border-top: 1px solid #e5e7eb;
    border-left: 0;
  }
  .th-workspace-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }
  .th-workspace-actions {
    width: 100%;
    overflow-x: auto;
  }
}
`
