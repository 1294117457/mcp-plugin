import { useState } from 'react'
import type { ToolItem } from '../api'

interface Props {
  tool: ToolItem
  displayName: string
  expanded: boolean
  onToggleExpand: () => void
  tag?: { label: string; className: string }
  action?: React.ReactNode
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

function renderMarkdown(text: string): string {
  let html = escapeHtml(text)
  // Code blocks (```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="th-md-code-block"><code>$2</code></pre>')
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="th-md-code">$1</code>')
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  // Unordered list items
  html = html.replace(/^[-*]\s+(.+)$/gm, '<li>$1</li>')
  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul class="th-md-list">$1</ul>')
  // Line breaks (double newline = paragraph, single = br)
  html = html.replace(/\n\n/g, '</p><p>')
  html = html.replace(/\n/g, '<br/>')
  // Wrap in paragraph
  html = `<p>${html}</p>`
  // Clean empty paragraphs
  html = html.replace(/<p><\/p>/g, '')
  return html
}

function MarkdownDesc({ text }: { text: string }) {
  return (
    <div
      className="th-md-desc"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(text) }}
    />
  )
}

function SchemaView({ schema, label }: { schema: Record<string, unknown> | null | undefined; label: string }) {
  const [open, setOpen] = useState(true)
  if (!schema) return null

  return (
    <div className="th-detail-section">
      <div className="th-detail-section-header" onClick={() => setOpen(!open)}>
        <span className={`arrow-sm${open ? '' : ' collapsed'}`}>&#9660;</span>
        <span>{label}</span>
      </div>
      {open && (
        <pre className="th-schema-pre">{JSON.stringify(schema, null, 2)}</pre>
      )}
    </div>
  )
}

export function ToolDetailView({ tool, displayName, expanded, onToggleExpand, tag, action }: Props) {
  const [descOpen, setDescOpen] = useState(true)
  const desc = tool.description || '暂无描述'

  return (
    <div className={`th-i-wrap${expanded ? ' expanded' : ''}`}>
      <div className="th-i clickable" onClick={onToggleExpand}>
        {tag && <span className={`th-tg ${tag.className}`}>{tag.label}</span>}
        <span className="nm">{displayName}</span>
        <span className="ds">{desc.length > 30 ? desc.slice(0, 30) + '...' : desc}</span>
        {action && <span className="th-action-slot" onClick={e => e.stopPropagation()}>{action}</span>}
      </div>
      {expanded && (
        <div className="th-i-detail">
          <div className="th-detail-section">
            <div className="th-detail-section-header" onClick={() => setDescOpen(!descOpen)}>
              <span className={`arrow-sm${descOpen ? '' : ' collapsed'}`}>&#9660;</span>
              <span>描述</span>
            </div>
            {descOpen && (
              <div className="th-detail-section-body">
                <MarkdownDesc text={desc} />
                <div className="detail-name-row">
                  <span className="detail-label-inline">名称:</span>
                  <code className="detail-name">{tool.name}</code>
                </div>
              </div>
            )}
          </div>
          <SchemaView schema={tool.inputSchema} label="Input Schema" />
          <SchemaView schema={tool.outputSchema} label="Output Schema" />
          {!tool.inputSchema && !tool.outputSchema && (
            <div style={{ fontSize: '10px', color: '#9ca3af', fontStyle: 'italic', marginTop: '4px' }}>
              无 Schema 信息
            </div>
          )}
        </div>
      )}
    </div>
  )
}
