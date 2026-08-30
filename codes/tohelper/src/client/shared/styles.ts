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

`
