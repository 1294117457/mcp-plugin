import { useState, useEffect } from 'react'
import type { NodeConfig, TaskConfig, ExecutionMode } from '../../types'
import type { LLMOption } from '../api'

interface Props {
  initial: NodeConfig | null
  availableTools: string[]
  availableLLMs: LLMOption[]
  onSave: (payload: any) => void
  onCancel: () => void
}

export function NodeEditorV2({ initial, availableTools, availableLLMs, onSave, onCancel }: Props) {
  // Node 级别配置
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nodePrompt, setNodePrompt] = useState('')
  const [mode, setMode] = useState<ExecutionMode>('pipeline')

  // Node 级 LLM
  const [llmProvider, setLlmProvider] = useState('deepseek-official')
  const [llmModel, setLlmModel] = useState('deepseek-chat')
  const [temperature, setTemperature] = useState(0.7)

  // Tasks
  const [tasks, setTasks] = useState<TaskConfig[]>([])

  // Node 级工具
  const [selectedTools, setSelectedTools] = useState<string[]>([])

  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 展开的 Task 索引集合（默认全部展开以便一目了然）
  const [expandedTaskIndexes, setExpandedTaskIndexes] = useState<Set<number>>(new Set([0]))

  // 折叠状态
  const [nodeSectionCollapsed, setNodeSectionCollapsed] = useState(false)
  const [tasksSectionCollapsed, setTasksSectionCollapsed] = useState(false)

  // 工具下拉显示
  const [toolsDropdownOpen, setToolsDropdownOpen] = useState(false)

  // 初始化（编辑模式）
  useEffect(() => {
    if (initial) {
      setName(initial.name)
      setDescription(initial.description || '')
      setNodePrompt(initial.nodePrompt)
      setMode(initial.mode)

      if (initial.llm) {
        setLlmProvider(initial.llm.provider)
        setLlmModel(initial.llm.model)
        setTemperature(initial.llm.temperature ?? 0.7)
      }

      setTasks(initial.tasks || [])
      setSelectedTools(initial.tools || [])

      // 默认展开所有 Task，便于一眼看清整体结构
      const toExpand = new Set<number>()
      initial.tasks?.forEach((_, index) => toExpand.add(index))
      setExpandedTaskIndexes(toExpand)
    }
  }, [initial])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = '节点名称不能为空'
    } else if (name.length < 3 || name.length > 50) {
      newErrors.name = '节点名称长度应在 3-50 之间'
    } else if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      newErrors.name = '节点 名称只能包含小写字母、数字和下划线，且以字母开头'
    }

    if (!nodePrompt.trim()) {
      newErrors.nodePrompt = 'Node Prompt 不能为空'
    }

    if (tasks.length === 0) {
      newErrors.tasks = '至少需要一个 Task'
    }

    tasks.forEach((task, index) => {
      if (!task.taskPrompt.trim()) {
        newErrors[`task_${index}_prompt`] = `Task ${index + 1} 的 Prompt 不能为空`
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return

    const payload: any = {
      name,
      description,
      nodePrompt,
      mode,
      llm: {
        provider: llmProvider,
        model: llmModel,
        temperature,
        maxTokens: 2000,
      },
      tasks,
      tools: selectedTools,
      inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { result: { type: 'string' } } },
    }

    if (initial) {
      payload.id = initial.id
    }

    onSave(payload)
  }

  function handleAddTask() {
    const newTask: TaskConfig = {
      id: `task-${Date.now()}`,
      name: `Task ${tasks.length + 1}`,
      taskPrompt: '',
      tools: [],
      outputFormat: 'text',
    }
    const newIndex = tasks.length
    setTasks([...tasks, newTask])
    // 自动展开新添加的 Task
    setExpandedTaskIndexes(new Set([...expandedTaskIndexes, newIndex]))
  }

  function handleUpdateTask(index: number, updatedTask: TaskConfig) {
    const newTasks = [...tasks]
    newTasks[index] = updatedTask
    setTasks(newTasks)
  }

  function handleDeleteTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
    const newExpanded = new Set<number>()
    expandedTaskIndexes.forEach((i) => {
      if (i < index) newExpanded.add(i)
      else if (i > index) newExpanded.add(i - 1)
    })
    setExpandedTaskIndexes(newExpanded)
  }

  function toggleTaskExpanded(index: number) {
    const newExpanded = new Set(expandedTaskIndexes)
    if (newExpanded.has(index)) newExpanded.delete(index)
    else newExpanded.add(index)
    setExpandedTaskIndexes(newExpanded)
  }

  function expandAllTasks() {
    setExpandedTaskIndexes(new Set(tasks.map((_, i) => i)))
  }

  function collapseAllTasks() {
    setExpandedTaskIndexes(new Set())
  }

  function toggleToolSelection(tool: string) {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter((t) => t !== tool))
    } else {
      setSelectedTools([...selectedTools, tool])
    }
  }

  return (
    <div className="th-node-editor">
      <div className="th-editor-content">
        {/* ============================================ */}
        {/* Node 配置区 - 蓝色主题 */}
        {/* ============================================ */}
        <section className="th-zone th-zone-node">
          <header
            className={`th-zone-header ${nodeSectionCollapsed ? 'collapsed' : ''}`}
            onClick={() => setNodeSectionCollapsed(!nodeSectionCollapsed)}
          >
            <div className="th-zone-icon">⚙️</div>
            <div className="th-zone-title">
              <h3>Node 配置</h3>
              <span className="th-zone-sub">控制整个节点的名称、目标、LLM、工具与执行模式</span>
            </div>
            <div className="th-zone-tags">
              <span className="th-zone-tag">{name || '未命名'}</span>
              <span className="th-zone-tag th-zone-tag-mode">{mode}</span>
            </div>
            <button type="button" className="th-zone-toggle" aria-label="折叠">
              <span className="th-chevron">{nodeSectionCollapsed ? '▶' : '▼'}</span>
            </button>
          </header>

          {!nodeSectionCollapsed && (
            <div className="th-zone-body">
              {/* 基本信息 */}
              <div className="th-form-row">
                <div className="th-form-group th-form-equal">
                  <label className="th-label">节点名称</label>
                  <input
                    type="text"
                    className="th-input"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如: query_nearby_deals"
                  />
                  {errors.name && <div className="th-error-msg">{errors.name}</div>}
                </div>

                <div className="th-form-group th-form-equal">
                  <label className="th-label">节点描述</label>
                  <input
                    type="text"
                    className="th-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="例如: 查询附近商家优惠信息"
                  />
                  {errors.description && <div className="th-error-msg">{errors.description}</div>}
                </div>
              </div>

              {/* Node Prompt */}
              <div className="th-form-group">
                <label className="th-label">🎯 Node Prompt <span className="th-required">*</span></label>
                <textarea
                  className="th-textarea"
                  rows={3}
                  value={nodePrompt}
                  onChange={(e) => setNodePrompt(e.target.value)}
                  placeholder="描述这个 Node 要完成的任务目标，例如：查询附近的瑞幸咖啡门店和麦当劳优惠券，并整合展示"
                />
                {errors.nodePrompt && <div className="th-error-msg">{errors.nodePrompt}</div>}
                <div className="th-hint">📌 Node Prompt 描述整个 Node 要完成的目标，是 Agent 调度时的整体指令</div>
              </div>

              {/* LLM 与 Temperature */}
              <div className="th-form-row">
                <div className="th-form-group th-form-equal">
                  <label className="th-label">🤖 Node 默认 LLM</label>
                  <select
                    className="th-select"
                    value={`${llmProvider}/${llmModel}`}
                    onChange={(e) => {
                      const [provider, model] = e.target.value.split('/')
                      setLlmProvider(provider)
                      setLlmModel(model)
                    }}
                  >
                    {availableLLMs.length > 0 ? (
                      availableLLMs.map((llm) => (
                        <option key={llm.displayName} value={`${llm.provider}/${llm.model}`}>
                          {llm.displayName}
                        </option>
                      ))
                    ) : (
                      <>
                        <option value="deepseek-official/deepseek-chat">deepseek-official/deepseek-chat</option>
                        <option value="deepseek-official/deepseek-coder">deepseek-official/deepseek-coder</option>
                        <option value="deepseek-official/deepseek-reasoner">deepseek-official/deepseek-reasoner</option>
                      </>
                    )}
                  </select>
                  <div className="th-hint">Task 可继承此配置，也可单独指定</div>
                </div>

                <div className="th-form-group th-form-equal">
                  <label className="th-label">🌡️ Temperature: {temperature.toFixed(1)}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="th-slider"
                  />
                  <div className="th-hint">数值越高，输出越发散</div>
                </div>
              </div>

              {/* Node 级工具 + Mode */}
              <div className="th-form-row">
                <div className="th-form-group th-form-equal">
                  <label className="th-label">🛠️ Node 级工具</label>
                  <div className="th-dropdown">
                    <button
                      type="button"
                      className="th-dropdown-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        setToolsDropdownOpen(!toolsDropdownOpen)
                      }}
                    >
                      {selectedTools.length > 0 ? `已选择 ${selectedTools.length} 个工具` : '选择工具（可选）...'}
                      <span className="th-dropdown-arrow">{toolsDropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    {toolsDropdownOpen && (
                      <div className="th-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                        {availableTools.length === 0 ? (
                          <div className="th-dropdown-empty">暂无可用工具</div>
                        ) : (
                          availableTools.map((tool) => (
                            <label key={tool} className="th-dropdown-item">
                              <input
                                type="checkbox"
                                checked={selectedTools.includes(tool)}
                                onChange={() => toggleToolSelection(tool)}
                              />
                              <span>{tool}</span>
                            </label>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  <div className="th-hint">Node 级工具会被所有 Task 默认继承</div>
                </div>

                <div className="th-form-group th-form-equal">
                  <label className="th-label">⚡ 执行模式</label>
                  <div className="th-mode-buttons">
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'direct' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode('direct')
                      }}
                    >
                      Direct
                    </button>
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'pipeline' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode('pipeline')
                      }}
                    >
                      Pipeline
                    </button>
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'loop' ? 'active' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setMode('loop')
                      }}
                    >
                      Loop
                    </button>
                  </div>
                  <div className="th-hint">
                    {mode === 'direct' && '▶ 单任务执行'}
                    {mode === 'pipeline' && '▶ 顺序执行多个 Task'}
                    {mode === 'loop' && '▶ LLM 动态调度 Task'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ============================================ */}
        {/* Tasks 配置区 - 绿色主题 */}
        {/* ============================================ */}
        <section className="th-zone th-zone-tasks">
          <header
            className={`th-zone-header ${tasksSectionCollapsed ? 'collapsed' : ''}`}
            onClick={() => setTasksSectionCollapsed(!tasksSectionCollapsed)}
          >
            <div className="th-zone-icon">📋</div>
            <div className="th-zone-title">
              <h3>
                Tasks 配置
                <span className="th-zone-count">{tasks.length}</span>
              </h3>
              <span className="th-zone-sub">
                {tasks.length === 0
                  ? '尚未添加任何 Task'
                  : mode === 'pipeline'
                    ? '按顺序执行的 Task 链'
                    : mode === 'loop'
                      ? 'LLM 自由调度的 Task 池'
                      : '单个 Task'}
              </span>
            </div>
            <div className="th-zone-tags">
              <span className="th-zone-tag th-zone-tag-mode">{mode}</span>
            </div>
            <button type="button" className="th-zone-toggle" aria-label="折叠">
              <span className="th-chevron">{tasksSectionCollapsed ? '▶' : '▼'}</span>
            </button>
          </header>

          {!tasksSectionCollapsed && (
            <div className="th-zone-body">
              {errors.tasks && <div className="th-error-msg">{errors.tasks}</div>}

              {tasks.length > 0 && (
                <div className="th-task-toolbar">
                  <button className="th-link-btn" onClick={expandAllTasks}>
                    全部展开
                  </button>
                  <span className="th-divider-dot">·</span>
                  <button className="th-link-btn" onClick={collapseAllTasks}>
                    全部折叠
                  </button>
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="th-empty">⚠️ 暂无 Task，请点击下方按钮添加</div>
              ) : (
                <div className={`th-task-list th-task-list-${mode}`}>
                  {tasks.map((task, index) => (
                    <TaskItemV2
                      key={task.id}
                      task={task}
                      index={index}
                      isLast={index === tasks.length - 1}
                      availableTools={availableTools}
                      availableLLMs={availableLLMs}
                      nodeLlmConfig={{ provider: llmProvider, model: llmModel }}
                      errors={errors}
                      mode={mode}
                      expanded={expandedTaskIndexes.has(index)}
                      onToggleExpand={() => toggleTaskExpanded(index)}
                      onUpdate={(updatedTask) => handleUpdateTask(index, updatedTask)}
                      onDelete={() => handleDeleteTask(index)}
                    />
                  ))}
                </div>
              )}

              <button className="th-btn th-btn-add-task" onClick={handleAddTask}>
                ＋ 添加 Task
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 操作按钮 */}
      <div className="th-editor-footer">
        <button className="th-btn th-btn-secondary" onClick={onCancel}>
          取消
        </button>
        <button className="th-btn th-btn-primary" onClick={handleSave}>
          保存
        </button>
      </div>
    </div>
  )
}

// ============================================
// TaskItemV2 - 独立卡片
// ============================================
interface TaskItemV2Props {
  task: TaskConfig
  index: number
  isLast: boolean
  availableTools: string[]
  availableLLMs: LLMOption[]
  nodeLlmConfig: { provider: string; model: string }
  errors: Record<string, string>
  mode: ExecutionMode
  expanded: boolean
  onToggleExpand: () => void
  onUpdate: (task: TaskConfig) => void
  onDelete: () => void
}

function TaskItemV2({
  task,
  index,
  isLast,
  availableTools,
  availableLLMs,
  nodeLlmConfig,
  errors,
  mode,
  expanded,
  onToggleExpand,
  onUpdate,
  onDelete,
}: TaskItemV2Props) {
  const [useCustomLlm, setUseCustomLlm] = useState(!!task.llm)

  useEffect(() => {
    setUseCustomLlm(!!task.llm)
  }, [task.llm])

  const currentLlm = task.llm || nodeLlmConfig
  const currentLlmDisplay = `${currentLlm.provider}/${currentLlm.model}`
  const usingCustomLlm = !!task.llm

  return (
    <div className={`th-task-item th-task-item-${mode} ${expanded ? 'expanded' : 'collapsed'}`}>
      <div className="th-task-header" onClick={onToggleExpand}>
        <div className="th-task-order">{index + 1}</div>
        <div className="th-task-title">
          <div className="th-task-name">{task.name || `Task ${index + 1}`}</div>
          <div className="th-task-summary">
            <span className="th-task-llm">🤖 {currentLlmDisplay}</span>
            {task.tools.length > 0 && (
              <span className="th-task-badge tools">🛠 {task.tools.length}</span>
            )}
            <span className="th-task-badge fmt">{task.outputFormat || 'text'}</span>
            {usingCustomLlm && <span className="th-task-badge custom">独立 LLM</span>}
          </div>
        </div>
        <div className="th-task-actions">
          <span className="th-chevron">{expanded ? '▼' : '▶'}</span>
          <button
            className="th-btn-icon th-btn-danger"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="删除"
          >
            ×
          </button>
        </div>
      </div>

      {expanded && (
        <div className="th-task-body">
          <div className="th-form-group">
            <label className="th-label-sm">Task 名称</label>
            <input
              type="text"
              className="th-input"
              value={task.name}
              onChange={(e) => onUpdate({ ...task, name: e.target.value })}
            />
          </div>

          <div className="th-form-group">
            <label className="th-label-sm">
              Task Prompt <span className="th-required">*</span>
            </label>
            <textarea
              className="th-textarea"
              rows={3}
              value={task.taskPrompt}
              onChange={(e) => onUpdate({ ...task, taskPrompt: e.target.value })}
              placeholder="描述这个 Task 要完成的具体任务"
            />
            {errors[`task_${index}_prompt`] && (
              <div className="th-error-msg">{errors[`task_${index}_prompt`]}</div>
            )}
          </div>

          {/* LLM 配置 */}
          <div className="th-task-block">
            <div className="th-task-block-header">
              <span className="th-task-block-icon">🤖</span>
              <span className="th-task-block-title">LLM 模型</span>
              <label className="th-toggle">
                <input
                  type="checkbox"
                  checked={useCustomLlm}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate({
                        ...task,
                        llm: { provider: nodeLlmConfig.provider, model: nodeLlmConfig.model },
                      })
                      setUseCustomLlm(true)
                    } else {
                      const { llm: _, ...taskWithoutLlm } = task
                      onUpdate(taskWithoutLlm as TaskConfig)
                      setUseCustomLlm(false)
                    }
                  }}
                />
                <span>{useCustomLlm ? '自定义' : '继承 Node'}</span>
              </label>
            </div>
            <select
              className="th-select"
              value={
                task.llm
                  ? `${task.llm.provider}/${task.llm.model}`
                  : `${nodeLlmConfig.provider}/${nodeLlmConfig.model}`
              }
              onChange={(e) => {
                const [provider, model] = e.target.value.split('/')
                onUpdate({ ...task, llm: { provider, model } })
                setUseCustomLlm(true)
              }}
            >
              {!useCustomLlm && (
                <option value={`${nodeLlmConfig.provider}/${nodeLlmConfig.model}`}>
                  继承 Node: {currentLlmDisplay}
                </option>
              )}
              {availableLLMs.length > 0 ? (
                availableLLMs.map((llm) => (
                  <option key={llm.displayName} value={`${llm.provider}/${llm.model}`}>
                    {llm.displayName}
                  </option>
                ))
              ) : (
                <>
                  <option value="deepseek-official/deepseek-chat">deepseek-official/deepseek-chat</option>
                  <option value="deepseek-official/deepseek-coder">deepseek-official/deepseek-coder</option>
                  <option value="deepseek-official/deepseek-reasoner">deepseek-official/deepseek-reasoner</option>
                </>
              )}
            </select>
          </div>

          {/* Tools */}
          <div className="th-task-block">
            <div className="th-task-block-header">
              <span className="th-task-block-icon">🛠</span>
              <span className="th-task-block-title">Tools</span>
              <span className="th-task-block-meta">
                {task.tools.length > 0 ? `已选 ${task.tools.length}` : '未选'}
              </span>
            </div>
            <select
              className="th-select"
              multiple={true}
              value={task.tools}
              onChange={(e) => {
                const options = e.target.selectedOptions
                const values = Array.from(options).map((opt) => opt.value)
                onUpdate({ ...task, tools: values })
              }}
              size={Math.min(4, Math.max(availableTools.length, 1))}
            >
              {availableTools.length === 0 ? (
                <option value="" disabled>
                  暂无可用工具
                </option>
              ) : (
                availableTools.map((tool) => (
                  <option key={tool} value={tool}>
                    {tool}
                  </option>
                ))
              )}
            </select>
            <div className="th-hint-text">
              {task.tools.length > 0
                ? `✅ 已为此 Task 单独配置 ${task.tools.length} 个工具`
                : 'ℹ️ 未指定时使用 Node 级工具'}
            </div>
          </div>

          {/* Output Format */}
          <div className="th-task-block th-task-block-inline">
            <div className="th-task-block-header">
              <span className="th-task-block-icon">📤</span>
              <span className="th-task-block-title">输出格式</span>
            </div>
            <div className="th-mode-buttons">
              <button
                type="button"
                className={`th-mode-btn ${task.outputFormat !== 'json' ? 'active' : ''}`}
                onClick={() => onUpdate({ ...task, outputFormat: 'text' })}
              >
                Text
              </button>
              <button
                type="button"
                className={`th-mode-btn ${task.outputFormat === 'json' ? 'active' : ''}`}
                onClick={() => onUpdate({ ...task, outputFormat: 'json' })}
              >
                JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pipeline 模式下显示连接箭头（仅在非最后一项时） */}
      {mode === 'pipeline' && !isLast && (
        <div className="th-task-connector">
          <span className="th-task-connector-arrow">↓</span>
        </div>
      )}
    </div>
  )
}
