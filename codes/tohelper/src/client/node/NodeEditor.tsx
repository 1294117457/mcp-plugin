import { useState } from 'react'
import type { NodeConfig } from '../../types'
import type { CreateNodePayload, UpdateNodePayload } from '../api'

interface Props {
  initial: NodeConfig | null
  onSave: (data: CreateNodePayload | UpdateNodePayload) => void
  onCancel: () => void
}

const DEFAULT_INPUT_SCHEMA = `{
  "type": "object",
  "properties": {
    "input": { "type": "string", "description": "用户输入的文本内容" }
  },
  "required": ["input"]
}`

const DEFAULT_OUTPUT_SCHEMA = `{
  "type": "object",
  "properties": {
    "result": { "type": "string", "description": "模型输出的文本结果" }
  },
  "required": ["result"]
}`

export function NodeEditor({ initial, onSave, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [systemPrompt, setSystemPrompt] = useState(initial?.systemPrompt ?? '')
  const [llmProvider, setLlmProvider] = useState(initial?.llm?.provider ?? '')
  const [llmModel, setLlmModel] = useState(initial?.llm?.model ?? '')
  const [toolsText, setToolsText] = useState(initial?.tools?.join(', ') ?? '')
  const [inputSchemaText, setInputSchemaText] = useState(
    initial?.inputSchema ? JSON.stringify(initial.inputSchema, null, 2) : DEFAULT_INPUT_SCHEMA
  )
  const [outputSchemaText, setOutputSchemaText] = useState(
    initial?.outputSchema ? JSON.stringify(initial.outputSchema, null, 2) : DEFAULT_OUTPUT_SCHEMA
  )
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState('')

  function handleSubmit() {
    setError('')

    if (!name.trim()) { setError('名称不能为空'); return }
    if (!description.trim()) { setError('描述不能为空'); return }
    if (!systemPrompt.trim()) { setError('System Prompt 不能为空'); return }

    let inputSchema: Record<string, unknown> | undefined
    if (inputSchemaText.trim()) {
      try {
        inputSchema = JSON.parse(inputSchemaText)
        if (inputSchema!.type !== 'object') { setError('inputSchema.type 必须是 "object"'); return }
      } catch (e) {
        setError(`Input Schema JSON 错误: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }

    let outputSchema: Record<string, unknown> | undefined
    if (outputSchemaText.trim()) {
      try {
        outputSchema = JSON.parse(outputSchemaText)
        if (outputSchema!.type !== 'object') { setError('outputSchema.type 必须是 "object"'); return }
      } catch (e) {
        setError(`Output Schema JSON 错误: ${e instanceof Error ? e.message : String(e)}`)
        return
      }
    }

    const tools = toolsText.trim()
      ? toolsText.split(',').map(t => t.trim()).filter(Boolean)
      : undefined

    const llm = (llmProvider.trim() && llmModel.trim())
      ? { provider: llmProvider.trim(), model: llmModel.trim() }
      : undefined

    const payload: CreateNodePayload = {
      name: name.trim(),
      description: description.trim(),
      systemPrompt: systemPrompt.trim(),
      llm,
      tools,
      inputSchema,
      outputSchema,
    }

    if (initial) {
      onSave({ ...payload, id: initial.id } as UpdateNodePayload)
    } else {
      onSave(payload)
    }
  }

  return (
    <div className="th-node-editor">
      <label>名称 (tool name)</label>
      <input
        value={name}
        onChange={e => setName(e.target.value)}
        placeholder="code_reviewer (小写+下划线, 3-50字符)"
        disabled={!!initial}
      />

      <label>描述 (agent 可见)</label>
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="代码审查专家，给出详细修改建议"
      />

      <label>System Prompt</label>
      <textarea
        rows={5}
        value={systemPrompt}
        onChange={e => setSystemPrompt(e.target.value)}
        placeholder="你是一位资深代码审查工程师..."
      />

      <label>LLM (留空使用默认)</label>
      <div className="th-row">
        <input value={llmProvider} onChange={e => setLlmProvider(e.target.value)} placeholder="provider (如 deepseek-official)" />
        <input value={llmModel} onChange={e => setLlmModel(e.target.value)} placeholder="model (如 deepseek-chat)" />
      </div>

      <label>可用工具 (逗号分隔, 可选)</label>
      <input
        value={toolsText}
        onChange={e => setToolsText(e.target.value)}
        placeholder="read_file, grep, mcp__github__search"
      />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
        <button
          type="button"
          className="th-toggle-mode"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{ fontSize: '11px' }}
        >
          {showAdvanced ? '收起 Schema' : '展开 Schema 配置'}
        </button>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>
          默认: 文本输入 → 文本输出
        </span>
      </div>

      {showAdvanced && (
        <>
          <label>Input Schema (JSON)</label>
          <textarea
            rows={5}
            value={inputSchemaText}
            onChange={e => setInputSchemaText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '11px' }}
            placeholder={DEFAULT_INPUT_SCHEMA}
          />

          <label>Output Schema (JSON)</label>
          <textarea
            rows={5}
            value={outputSchemaText}
            onChange={e => setOutputSchemaText(e.target.value)}
            style={{ fontFamily: 'monospace', fontSize: '11px' }}
            placeholder={DEFAULT_OUTPUT_SCHEMA}
          />
        </>
      )}

      {error && <div className="th-error">{error}</div>}

      <div className="th-editor-actions">
        <button onClick={onCancel}>取消</button>
        <button className="th-btn-primary" onClick={handleSubmit}>
          {initial ? '保存' : '创建'}
        </button>
      </div>
    </div>
  )
}
