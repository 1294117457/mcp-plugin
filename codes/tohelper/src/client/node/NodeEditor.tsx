import { useState, useEffect } from 'react'
import type { NodeConfig, TaskConfig } from '../../types'
import type { LLMOption } from '../api'

interface Props {
  initial: NodeConfig | null
  availableTools: string[]
  availableLLMs: LLMOption[]
  onSave: (payload: any) => void
  onCancel: () => void
}

export function NodeEditor({ initial, availableTools, availableLLMs, onSave, onCancel }: Props) {
  // 基础配置
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [executionMode, setExecutionMode] = useState<'direct' | 'pipeline'>('direct')
  
  // Direct 模式配置
  const [systemPrompt, setSystemPrompt] = useState('')
  const [llmProvider, setLlmProvider] = useState('deepseek-official')
  const [llmModel, setLlmModel] = useState('deepseek-chat')
  const [temperature, setTemperature] = useState(0.7)
  
  // Pipeline 模式配置
  const [tasks, setTasks] = useState<TaskConfig[]>([])
  
  // 通用配置
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  // 初始化（编辑模式）
  useEffect(() => {
    if (initial) {
      setName(initial.name)
      setDescription(initial.description)
      setExecutionMode(initial.executionMode === 'pipeline' ? 'pipeline' : 'direct')
      
      if (initial.executionMode === 'direct' || !initial.executionMode) {
        setSystemPrompt(initial.systemPrompt || '')
        if (initial.llm) {
          setLlmProvider(initial.llm.provider)
          setLlmModel(initial.llm.model)
          setTemperature(initial.llm.temperature ?? 0.7)
        }
      } else if (initial.executionMode === 'pipeline') {
        setTasks(initial.tasks || [])
        // Pipeline 模式下也需要 LLM 配置
        if (initial.llm) {
          setLlmProvider(initial.llm.provider)
          setLlmModel(initial.llm.model)
          setTemperature(initial.llm.temperature ?? 0.7)
        }
      }
      
      setSelectedTools(initial.tools || [])
    }
  }, [initial])

  function validate(): boolean {
    const newErrors: Record<string, string> = {}
    
    if (!name.trim()) newErrors.name = '节点名称不能为空'
    else if (name.length < 3 || name.length > 50) newErrors.name = '节点名称长度应在 3-50 之间'
    else if (!/^[a-z][a-z0-9_]*$/.test(name)) newErrors.name = '节点名称只能包含小写字母、数字和下划线，且以字母开头'
    
    if (!description.trim()) newErrors.description = '节点描述不能为空'
    else if (description.length > 200) newErrors.description = '节点描述不能超过 200 字符'
    
    if (executionMode === 'direct' && !systemPrompt.trim()) {
      newErrors.systemPrompt = 'System Prompt 不能为空'
    }
    
    if (executionMode === 'pipeline' && tasks.length === 0) {
      newErrors.tasks = '至少需要一个 Task'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  function handleSave() {
    if (!validate()) return
    
    const payload: any = {
      name,
      description,
      executionMode,
      tools: selectedTools,
      inputSchema: {
        type: 'object',
        properties: { input: { type: 'string' } }
      },
      outputSchema: {
        type: 'object',
        properties: { result: { type: 'string' } }
      },
      // 为所有模式添加 LLM 配置
      llm: {
        provider: llmProvider,
        model: llmModel,
        temperature,
        maxTokens: 2000
      }
    }
    
    if (initial) {
      payload.id = initial.id
    }
    
    if (executionMode === 'direct') {
      payload.systemPrompt = systemPrompt
    } else if (executionMode === 'pipeline') {
      payload.tasks = tasks
    }
    
    onSave(payload)
  }

  function handleAddTask() {
    const newTask: TaskConfig = {
      id: `task-${Date.now()}`,
      name: `Task ${tasks.length + 1}`,
      type: 'llm-call',
      config: {
        systemPrompt: '',
        outputFormat: 'text'
      }
    }
    setTasks([...tasks, newTask])
  }

  function handleUpdateTask(index: number, updatedTask: TaskConfig) {
    const newTasks = [...tasks]
    newTasks[index] = updatedTask
    setTasks(newTasks)
  }

  function handleDeleteTask(index: number) {
    setTasks(tasks.filter((_, i) => i !== index))
  }

  return (
    <div className="th-node-editor">
      <div className="th-editor-content">
        {/* 基础配置 */}
        <div className="th-form-section">
          <h3>基础信息</h3>
          
          <div className="th-form-group">
            <label className="th-label">节点名称 *</label>
            <input
              type="text"
              className="th-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如: code_analyzer"
            />
            {errors.name && <div className="th-error-msg">{errors.name}</div>}
          </div>
          
          <div className="th-form-group">
            <label className="th-label">节点描述 *</label>
            <textarea
              className="th-textarea"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述节点的功能"
            />
            {errors.description && <div className="th-error-msg">{errors.description}</div>}
          </div>
          
          <div className="th-form-group">
            <label className="th-label">执行模式</label>
            <div className="th-radio-group">
              <label className="th-radio">
                <input
                  type="radio"
                  checked={executionMode === 'direct'}
                  onChange={() => setExecutionMode('direct')}
                />
                <span>Direct（单次 LLM 调用）</span>
              </label>
              <label className="th-radio">
                <input
                  type="radio"
                  checked={executionMode === 'pipeline'}
                  onChange={() => setExecutionMode('pipeline')}
                />
                <span>Pipeline（多 Task 编排）</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* LLM 配置 - 所有模式共享 */}
        <div className="th-form-section">
          <h3>LLM 配置</h3>
          
          <div className="th-form-group">
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
          
          <div className="th-form-group">
            <label className="th-label">Temperature</label>
            <input
              type="number"
              className="th-input"
              min="0"
              max="2"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
            />
          </div>
        </div>
        
        {/* Direct 模式配置 */}
        {executionMode === 'direct' && (
          <div className="th-form-section">
            <h3>Direct 模式配置</h3>
            
            <div className="th-form-group">
              <label className="th-label">System Prompt *</label>
              <textarea
                className="th-textarea"
                rows={6}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="例如: You are a helpful assistant..."
              />
              {errors.systemPrompt && <div className="th-error-msg">{errors.systemPrompt}</div>}
            </div>
          </div>
        )}
        
        {/* Pipeline 模式配置 */}
        {executionMode === 'pipeline' && (
          <div className="th-form-section">
            <h3>Pipeline 配置</h3>
            {errors.tasks && <div className="th-error-msg">{errors.tasks}</div>}
            
            {tasks.length === 0 ? (
              <div className="th-empty">暂无 Task，点击下方按钮添加</div>
            ) : (
              <div className="th-task-list">
                {tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    availableTools={selectedTools}
                    availableLLMs={availableLLMs}
                    nodeLlmConfig={{ provider: llmProvider, model: llmModel }}
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
        
        {/* 工具选择 */}
        <div className="th-form-section">
          <h3>允许的工具（可选）</h3>
          <div className="th-tool-selector">
            {availableTools.length === 0 ? (
              <div className="th-hint">暂无可用工具</div>
            ) : (
              availableTools.map(tool => (
                <label key={tool} className="th-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTools.includes(tool)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTools([...selectedTools, tool])
                      } else {
                        setSelectedTools(selectedTools.filter(t => t !== tool))
                      }
                    }}
                  />
                  <span>{tool}</span>
                </label>
              ))
            )}
          </div>
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

// Task Item 组件
// Task Item 组件
interface TaskItemProps {
  task: TaskConfig
  index: number
  availableTools: string[]
  availableLLMs: LLMOption[]
  nodeLlmConfig?: { provider: string; model: string }
  onUpdate: (task: TaskConfig) => void
  onDelete: () => void
}

function TaskItem({ task, index, availableTools, availableLLMs, nodeLlmConfig, onUpdate, onDelete }: TaskItemProps) {
  const [expanded, setExpanded] = useState(false)
  const [useCustomLlm, setUseCustomLlm] = useState(!!task.llm)
  
  // 获取当前 LLM 配置
  const currentLlm = task.llm || nodeLlmConfig || { provider: 'deepseek-official', model: 'deepseek-chat' }
  
  return (
    <div className="th-task-item">
      <div className="th-task-header" onClick={() => setExpanded(!expanded)}>
        <span className="th-task-order">{index + 1}</span>
        <span className="th-task-name">{task.name}</span>
        <span className={`th-task-badge ${task.type}`}>{task.type}</span>
        {task.llm && <span className="th-task-badge custom-llm">自定义</span>}
        <button 
          className="th-btn-icon th-btn-danger" 
          onClick={(e) => { e.stopPropagation(); onDelete() }}
        >
          ×
        </button>
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
            <label className="th-label-sm">Task 类型</label>
            <select
              className="th-select"
              value={task.type}
              onChange={(e) => {
                const newType = e.target.value as any
                let newConfig: any = {}
                
                if (newType === 'llm-call') {
                  newConfig = { systemPrompt: '', outputFormat: 'text' }
                } else if (newType === 'tool-call') {
                  newConfig = { toolName: '', inputMapping: { type: 'direct' }, outputMapping: { type: 'direct' } }
                } else if (newType === 'transform') {
                  newConfig = { script: '' }
                }
                
                onUpdate({ ...task, type: newType, config: newConfig })
              }}
            >
              <option value="llm-call">LLM Call</option>
              <option value="tool-call">Tool Call</option>
              <option value="transform">Transform</option>
            </select>
          </div>
          
          {/* LLM Call 配置 */}
          {task.type === 'llm-call' && (
            <>
              {/* LLM 模型选择 */}
              <div className="th-form-group">
                <div className="th-llm-config-header">
                  <label className="th-label-sm">LLM 模型</label>
                  <label className="th-checkbox-inline">
                    <input
                      type="checkbox"
                      checked={useCustomLlm}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // 使用自定义 LLM 配置（从当前值开始）
                          const llmValue = task.llm || nodeLlmConfig || { provider: 'deepseek-official', model: 'deepseek-chat' }
                          onUpdate({ ...task, llm: { ...llmValue } })
                          setUseCustomLlm(true)
                        } else {
                          // 使用 Node 级别的 LLM 配置
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
                  className="th-select"
                  value={task.llm ? `${task.llm.provider}/${task.llm.model}` : (nodeLlmConfig ? `${nodeLlmConfig.provider}/${nodeLlmConfig.model}` : 'deepseek-official/deepseek-chat')}
                  onChange={(e) => {
                    const [provider, model] = e.target.value.split('/')
                    if (useCustomLlm) {
                      onUpdate({ ...task, llm: { provider, model } })
                    } else {
                      // 自动切换到自定义模式
                      onUpdate({ ...task, llm: { provider, model } })
                      setUseCustomLlm(true)
                    }
                  }}
                >
                  {!useCustomLlm && nodeLlmConfig && (
                    <option value={`${nodeLlmConfig.provider}/${nodeLlmConfig.model}`}>
                      继承 Node 配置: {nodeLlmConfig.provider}/{nodeLlmConfig.model}
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
                  {useCustomLlm ? '此 Task 使用独立的 LLM 配置' : '使用 Node 级别的 LLM 配置'}
                </div>
              </div>
              
              {/* System Prompt */}
              <div className="th-form-group">
                <label className="th-label-sm">System Prompt</label>
                <textarea
                  className="th-textarea"
                  rows={4}
                  value={(task.config as any).systemPrompt || ''}
                  onChange={(e) => onUpdate({ 
                    ...task, 
                    config: { ...task.config, systemPrompt: e.target.value } 
                  })}
                  placeholder="例如: You are a code analyzer..."
                />
              </div>
            </>
          )}
          
          {/* Tool Call 配置 */}
          {task.type === 'tool-call' && (
            <div className="th-form-group">
              <label className="th-label-sm">选择 Tool</label>
              <select
                className="th-select"
                value={(task.config as any).toolName || ''}
                onChange={(e) => onUpdate({ 
                  ...task, 
                  config: { ...task.config, toolName: e.target.value } 
                })}
              >
                <option value="">-- 请选择 --</option>
                {availableTools.map(tool => (
                  <option key={tool} value={tool}>{tool}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Transform 配置 */}
          {task.type === 'transform' && (
            <div className="th-form-group">
              <label className="th-label-sm">转换脚本</label>
              <textarea
                className="th-textarea"
                rows={3}
                value={(task.config as any).script || ''}
                onChange={(e) => onUpdate({ 
                  ...task, 
                  config: { ...task.config, script: e.target.value } 
                })}
                placeholder="例如: input.toUpperCase()"
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
