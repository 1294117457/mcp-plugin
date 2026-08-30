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
  // 基础配置
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nodePrompt, setNodePrompt] = useState('')
  const [mode, setMode] = useState<ExecutionMode>('pipeline')
  
  // LLM 配置
  const [llmProvider, setLlmProvider] = useState('deepseek-official')
  const [llmModel, setLlmModel] = useState('deepseek-chat')
  const [temperature, setTemperature] = useState(0.7)
  
  // Tasks 配置
  const [tasks, setTasks] = useState<TaskConfig[]>([])
  
  // Tools 配置
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  
  // 错误状态
  const [errors, setErrors] = useState<Record<string, string>>({})
  
  // 展开的 Task（默认展开第一个）
  const [expandedTaskIndexes, setExpandedTaskIndexes] = useState<Set<number>>(new Set([0]))
  
  // 折叠状态
  const [nodeSettingsCollapsed, setNodeSettingsCollapsed] = useState(false)
  const [tasksCollapsed, setTasksCollapsed] = useState(false)
  
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
      
      // 展开所有有自定义 LLM 的 Task
      const toExpand = new Set<number>()
      initial.tasks?.forEach((task, index) => {
        if (task.llm || index === 0) {
          toExpand.add(index)
        }
      })
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
      newErrors.name = '节点名称只能包含小写字母、数字和下划线，且以字母开头'
    }
    
    if (!nodePrompt.trim()) {
      newErrors.nodePrompt = 'Node Prompt 不能为空'
    }
    
    if (tasks.length === 0) {
      newErrors.tasks = '至少需要一个 Task'
    }
    
    // 验证每个 Task
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
        maxTokens: 2000
      },
      tasks,
      tools: selectedTools,
      inputSchema: { type: 'object', properties: { input: { type: 'string' } } },
      outputSchema: { type: 'object', properties: { result: { type: 'string' } } }
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
      outputFormat: 'text'
    }
    setTasks([...tasks, newTask])
    // 展开新添加的 Task
    setExpandedTaskIndexes(new Set([...expandedTaskIndexes, tasks.length]))
  }

  function handleUpdateTask(index: number, updatedTask: TaskConfig) {
    const newTasks = [...tasks]
    newTasks[index] = updatedTask
    setTasks(newTasks)
  }

  function handleDeleteTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
    // 更新展开状态
    const newExpanded = new Set<number>()
    expandedTaskIndexes.forEach(i => {
      if (i < index) newExpanded.add(i)
      else if (i > index) newExpanded.add(i - 1)
    })
    setExpandedTaskIndexes(newExpanded)
  }
  
  function toggleTaskExpanded(index: number) {
    const newExpanded = new Set(expandedTaskIndexes)
    if (newExpanded.has(index)) {
      newExpanded.delete(index)
    } else {
      newExpanded.add(index)
    }
    setExpandedTaskIndexes(newExpanded)
  }
  
  function toggleToolSelection(tool: string) {
    if (selectedTools.includes(tool)) {
      setSelectedTools(selectedTools.filter(t => t !== tool))
    } else {
      setSelectedTools([...selectedTools, tool])
    }
  }

  return (
    <div className="th-node-editor">
      <div className="th-editor-content">
        {/* === 1. Node 设置区域 === */}
        <div className="th-form-section th-node-settings">
          <div className="th-section-header" onClick={() => setNodeSettingsCollapsed(!nodeSettingsCollapsed)}>
            <h3>Node 设置</h3>
            <button type="button" className="th-collapse-btn">
              {nodeSettingsCollapsed ? '▶' : '▼'}
            </button>
          </div>
          
          {!nodeSettingsCollapsed && (
            <div className="th-section-body">
              {/* 基础信息：名称和描述在一行 */}
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
              
              {/* LLM配置和Temperature在一行 */}
              <div className="th-form-row">
                <div className="th-form-group th-form-equal">
                  <label className="th-label">LLM 模型</label>
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
                      availableLLMs.map(llm => (
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
                
                <div className="th-form-group th-form-equal">
                  <label className="th-label">Temperature: {temperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="th-slider"
                  />
                </div>
              </div>
              
              {/* Node Prompt单独一行 */}
              <div className="th-form-group">
                <label className="th-label">Node Prompt</label>
                <textarea
                  className="th-textarea"
                  rows={3}
                  value={nodePrompt}
                  onChange={(e) => setNodePrompt(e.target.value)}
                  placeholder="描述这个 Node 要完成的任务目标，例如：查询附近的瑞幸咖啡门店和麦当劳优惠券，并整合展示"
                />
                {errors.nodePrompt && <div className="th-error-msg">{errors.nodePrompt}</div>}
                <div className="th-hint">Node Prompt 描述整个 Node 要完成的任务目标</div>
              </div>
              
              {/* 工具选择和Mode在一行 */}
              <div className="th-form-row">
                <div className="th-form-group th-form-equal">
                  <label className="th-label">Node 级别工具</label>
                  <div className="th-dropdown">
                    <button
                      type="button"
                      className="th-dropdown-btn"
                      onClick={() => setToolsDropdownOpen(!toolsDropdownOpen)}
                    >
                      {selectedTools.length > 0 
                        ? `已选择 ${selectedTools.length} 个工具` 
                        : '选择工具...'}
                      <span className="th-dropdown-arrow">{toolsDropdownOpen ? '▲' : '▼'}</span>
                    </button>
                    {toolsDropdownOpen && (
                      <div className="th-dropdown-menu">
                        {availableTools.length === 0 ? (
                          <div className="th-dropdown-empty">暂无可用工具</div>
                        ) : (
                          availableTools.map(tool => (
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
                  <div className="th-hint">留空则不指定工具</div>
                </div>
                
                <div className="th-form-group th-form-equal">
                  <label className="th-label">执行模式</label>
                  <div className="th-mode-buttons">
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'direct' ? 'active' : ''}`}
                      onClick={() => setMode('direct')}
                    >
                      Direct
                    </button>
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'pipeline' ? 'active' : ''}`}
                      onClick={() => setMode('pipeline')}
                    >
                      Pipeline
                    </button>
                    <button
                      type="button"
                      className={`th-mode-btn ${mode === 'loop' ? 'active' : ''}`}
                      onClick={() => setMode('loop')}
                    >
                      Loop
                    </button>
                  </div>
                  <div className="th-mode-hint">
                    {mode === 'direct' && '单任务执行'}
                    {mode === 'pipeline' && '顺序执行多个任务'}
                    {mode === 'loop' && 'LLM动态调度任务'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* === 2. Task 区域 === */}
        <div className="th-form-section th-task-section">
          <div className="th-section-header" onClick={() => setTasksCollapsed(!tasksCollapsed)}>
            <h3>Tasks 配置</h3>
            <button type="button" className="th-collapse-btn">
              {tasksCollapsed ? '▶' : '▼'}
            </button>
          </div>
          
          {!tasksCollapsed && (
            <div className="th-section-body th-task-section-body">
              {errors.tasks && <div className="th-error-msg">{errors.tasks}</div>}
              
              {tasks.length === 0 ? (
                <div className="th-empty">暂无 Task，点击下方按钮添加</div>
              ) : (
                <div className={`th-task-list th-task-list-${mode}`}>
                  {tasks.map((task, index) => (
                    <TaskItemV2
                      key={task.id}
                      task={task}
                      index={index}
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
              
              <button className="th-btn th-btn-secondary" onClick={handleAddTask}>
                + 添加 Task
              </button>
            </div>
          )}
        </div>
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

// TaskItemV2 组件
interface TaskItemV2Props {
  task: TaskConfig
  index: number
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

function TaskItemV2({ task, index, availableTools, availableLLMs, nodeLlmConfig, errors, mode, expanded, onToggleExpand, onUpdate, onDelete }: TaskItemV2Props) {
  const [useCustomLlm, setUseCustomLlm] = useState(!!task.llm)
  
  // 当 task.llm 变化时更新状态
  useEffect(() => {
    setUseCustomLlm(!!task.llm)
  }, [task.llm])
  
  // 获取当前显示的 LLM
  const currentLlm = task.llm || nodeLlmConfig
  const currentLlmDisplay = `${currentLlm.provider}/${currentLlm.model}`
  
  return (
    <div className={`th-task-item th-task-item-${mode}`}>
      {/* Task 头部 - 始终显示 */}
      <div className="th-task-header" onClick={onToggleExpand}>
        <div className="th-task-info">
          <span className="th-task-order">{index + 1}</span>
          <span className="th-task-name">{task.name || `Task ${index + 1}`}</span>
        </div>
        <div className="th-task-meta">
          <span className="th-task-llm" title="LLM 模型">
            🤖 {currentLlmDisplay}
          </span>
          {task.tools.length > 0 && (
            <span className="th-task-badge tools">{task.tools.length} 工具</span>
          )}
          {mode === 'pipeline' && index < 99 && (
            <span className="th-task-arrow">→</span>
          )}
        </div>
        <button 
          className="th-btn-icon th-btn-danger" 
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          title="删除"
        >
          ×
        </button>
      </div>
      
      {/* Task 展开内容 */}
      {expanded && (
        <div className="th-task-body">
          {/* Task 名称 */}
          <div className="th-form-group">
            <label className="th-label-sm">Task 名称</label>
            <input
              type="text"
              className="th-input"
              value={task.name}
              onChange={(e) => onUpdate({ ...task, name: e.target.value })}
            />
          </div>
          
          {/* Task Prompt */}
          <div className="th-form-group">
            <label className="th-label-sm">Task Prompt</label>
            <textarea
              className="th-textarea"
              rows={3}
              value={task.taskPrompt}
              onChange={(e) => onUpdate({ ...task, taskPrompt: e.target.value })}
              placeholder="描述这个 Task 要完成的任务，例如：查询用户附近的瑞幸咖啡门店"
            />
            {errors[`task_${index}_prompt`] && (
              <div className="th-error-msg">{errors[`task_${index}_prompt`]}</div>
            )}
          </div>
          
          {/* LLM 配置 - 重点突出 */}
          <div className="th-form-group th-llm-section">
            <div className="th-llm-header">
              <label className="th-label-sm">🤖 LLM 模型配置</label>
              <label className="th-toggle">
                <input
                  type="checkbox"
                  checked={useCustomLlm}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onUpdate({ ...task, llm: { provider: nodeLlmConfig.provider, model: nodeLlmConfig.model } })
                      setUseCustomLlm(true)
                    } else {
                      const { llm: _, ...taskWithoutLlm } = task
                      onUpdate(taskWithoutLlm as TaskConfig)
                      setUseCustomLlm(false)
                    }
                  }}
                />
                <span>自定义</span>
              </label>
            </div>
            
            <select
              className="th-select th-llm-select"
              value={task.llm ? `${task.llm.provider}/${task.llm.model}` : `${nodeLlmConfig.provider}/${nodeLlmConfig.model}`}
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
                availableLLMs.map(llm => (
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
            <div className="th-hint-text">
              {useCustomLlm ? '✅ 此 Task 使用独立的 LLM 配置' : 'ℹ️ 使用 Node 级别的 LLM 配置'}
            </div>
          </div>
          
          {/* Tools 选择 */}
          <div className="th-form-group">
            <label className="th-label-sm">Tools（可多选）</label>
            <select
              className="th-select"
              multiple={true}
              value={task.tools}
              onChange={(e) => {
                const options = e.target.selectedOptions
                const values = Array.from(options).map(opt => opt.value)
                onUpdate({ ...task, tools: values })
              }}
              size={Math.min(3, Math.max(availableTools.length, 1))}
            >
              {availableTools.length === 0 ? (
                <option value="" disabled>暂无可用工具</option>
              ) : (
                availableTools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))
              )}
            </select>
            <div className="th-hint-text">
              {task.tools.length > 0 
                ? `已选择 ${task.tools.length} 个工具` 
                : '未选择工具，将使用 Node 级别的工具'}
            </div>
          </div>
          
          {/* Output Format */}
          <div className="th-form-group">
            <label className="th-label-sm">输出格式</label>
            <select
              className="th-select"
              value={task.outputFormat || 'text'}
              onChange={(e) => onUpdate({ ...task, outputFormat: e.target.value as 'text' | 'json' })}
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
            </select>
          </div>
        </div>
      )}
    </div>
  )
}
