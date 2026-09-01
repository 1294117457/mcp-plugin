import type { ConfigFile } from '../../types.js'

export interface ValidationIssue {
  type: 'error' | 'warning'
  category: 'task' | 'node' | 'reference' | 'equipped'
  id?: string
  message: string
}

export interface ValidationResult {
  ok: boolean
  issues: ValidationIssue[]
}

/**
 * Validate config integrity
 */
export function validateConfig(config: ConfigFile): ValidationResult {
  const issues: ValidationIssue[] = []

  // Check for duplicate task IDs
  const taskIds = Object.keys(config.tasks)
  const taskIdSet = new Set(taskIds)
  if (taskIds.length !== taskIdSet.size) {
    issues.push({
      type: 'error',
      category: 'task',
      message: 'Duplicate task IDs detected',
    })
  }

  // Check for duplicate node IDs
  const nodeIds = Object.keys(config.nodes)
  const nodeIdSet = new Set(nodeIds)
  if (nodeIds.length !== nodeIdSet.size) {
    issues.push({
      type: 'error',
      category: 'node',
      message: 'Duplicate node IDs detected',
    })
  }

  // Check for duplicate task names
  const taskNames = Object.values(config.tasks).map(t => t.name)
  const taskNameSet = new Set(taskNames)
  if (taskNames.length !== taskNameSet.size) {
    issues.push({
      type: 'warning',
      category: 'task',
      message: 'Duplicate task names detected',
    })
  }

  // Check for duplicate node names
  const nodeNames = Object.values(config.nodes).map(n => n.name)
  const nodeNameSet = new Set(nodeNames)
  if (nodeNames.length !== nodeNameSet.size) {
    issues.push({
      type: 'warning',
      category: 'node',
      message: 'Duplicate node names detected',
    })
  }

  // Check node task references
  for (const [nodeId, node] of Object.entries(config.nodes)) {
    if (!node.tasks || node.tasks.length === 0) {
      issues.push({
        type: 'error',
        category: 'node',
        id: nodeId,
        message: `Node "${node.name}" has no tasks`,
      })
    }

    for (const taskId of node.tasks || []) {
      if (!config.tasks[taskId]) {
        issues.push({
          type: 'error',
          category: 'reference',
          id: nodeId,
          message: `Node "${node.name}" references missing task "${taskId}"`,
        })
      }
    }
  }

  // Check equipped references
  for (const id of config.equipped) {
    if (id.startsWith('task-') && !config.tasks[id]) {
      issues.push({
        type: 'warning',
        category: 'equipped',
        id,
        message: `Equipped task "${id}" does not exist`,
      })
    } else if (id.startsWith('node-') && !config.nodes[id]) {
      issues.push({
        type: 'warning',
        category: 'equipped',
        id,
        message: `Equipped node "${id}" does not exist`,
      })
    }
  }

  const hasError = issues.some(i => i.type === 'error')

  return {
    ok: !hasError,
    issues,
  }
}
