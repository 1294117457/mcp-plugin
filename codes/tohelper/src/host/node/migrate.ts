import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { ConfigFile, ConfigFileV1, NodeConfigV1, TaskConfigV1, MigrationResult, TaskConfig, NodeConfig } from '../../types.js'
import { DATA_DIR } from '../tool/config.js'
import { generateId } from './config.js'

const NODE_CONFIG_V1_PATH = resolve(DATA_DIR, 'node-config.json')
const CONFIG_V2_PATH = resolve(DATA_DIR, 'config.json')

const DEFAULT_INPUT_SCHEMA = {
  type: 'object' as const,
  properties: { input: { type: 'string', description: '输入文本' } },
  required: ['input'],
}

const DEFAULT_OUTPUT_SCHEMA = {
  type: 'object' as const,
  properties: { result: { type: 'string', description: '输出结果' } },
  required: ['result'],
}

/**
 * Migrate version 1 config to version 2.
 * Version 1: Tasks embedded in nodes
 * Version 2: Tasks are top-level, nodes reference task IDs
 */
export function migrateV1ToV2(): { config?: ConfigFile; result?: MigrationResult; error?: string } {
  // Check if v2 already exists
  if (existsSync(CONFIG_V2_PATH)) {
    try {
      const raw = readFileSync(CONFIG_V2_PATH, 'utf8')
      const parsed = JSON.parse(raw)
      if (parsed.version === 2) {
        return { config: parsed }
      }
    } catch {
      // v2 exists but corrupted, continue with migration
    }
  }

  // Check if v1 exists
  if (!existsSync(NODE_CONFIG_V1_PATH)) {
    // No v1 config, return default v2
    const defaultConfig: ConfigFile = {
      version: 2,
      tasks: {},
      nodes: {},
      equipped: [],
    }
    return { config: defaultConfig }
  }

  try {
    const raw = readFileSync(NODE_CONFIG_V1_PATH, 'utf8')
    const v1: ConfigFileV1 = JSON.parse(raw)

    if (v1.version !== 1) {
      return { error: `Expected version 1, got ${v1.version}` }
    }

    // Create backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const backupPath = `${NODE_CONFIG_V1_PATH}.backup-${timestamp}`
    writeFileSync(backupPath, raw, 'utf8')
    console.log(`[tohelper:migrate] Created backup: ${backupPath}`)

    const warnings: string[] = []
    const migratedTasks: Record<string, TaskConfig> = {}
    const migratedNodes: Record<string, NodeConfig> = {}
    let taskCount = 0
    let nodeCount = 0

    // Migrate each node
    for (const [nodeId, v1Node] of Object.entries(v1.nodes)) {
      try {
        const { node, tasks, nodeWarnings } = migrateNode(v1Node, nodeId)
        
        // Add tasks to top-level
        for (const task of tasks) {
          if (migratedTasks[task.id]) {
            warnings.push(`Duplicate task ID ${task.id} in node ${node.name}, regenerating`)
            task.id = generateId('task')
          }
          migratedTasks[task.id] = task
          taskCount++
        }

        // Add node
        migratedNodes[node.id] = node
        nodeCount++
        warnings.push(...nodeWarnings)
      } catch (e: any) {
        warnings.push(`Failed to migrate node ${nodeId}: ${e?.message ?? String(e)}`)
      }
    }

    const config: ConfigFile = {
      version: 2,
      tasks: migratedTasks,
      nodes: migratedNodes,
      equipped: v1.equipped || [],
    }

    // Write v2 config
    const tmpPath = CONFIG_V2_PATH + '.tmp'
    writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf8')
    writeFileSync(CONFIG_V2_PATH, JSON.stringify(config, null, 2), 'utf8')

    const result: MigrationResult = {
      sourceVersion: 1,
      targetVersion: 2,
      nodesMigrated: nodeCount,
      tasksMigrated: taskCount,
      warnings,
    }

    console.log(`[tohelper:migrate] Migration complete:`, result)
    return { config, result }
  } catch (e: any) {
    return { error: `Migration failed: ${e?.message ?? String(e)}` }
  }
}

function migrateNode(
  v1Node: NodeConfigV1,
  fallbackId: string,
): { node: NodeConfig; tasks: TaskConfig[]; nodeWarnings: string[] } {
  const warnings: string[] = []
  const nodeId = v1Node.id || fallbackId
  const tasks: TaskConfig[] = []
  const taskIds: string[] = []

  // Migrate embedded tasks
  for (const v1Task of v1Node.tasks || []) {
    const taskId = v1Task.id || generateId('task')
    const task: TaskConfig = {
      id: taskId,
      name: v1Task.name || `Task from ${v1Node.name}`,
      description: `Task: ${v1Task.taskPrompt?.slice(0, 100) || 'No description'}`,
      taskPrompt: v1Task.taskPrompt || '',
      llm: v1Node.llm,
      tools: v1Task.tools || [],
      inputSchema: DEFAULT_INPUT_SCHEMA,
      outputSchema: DEFAULT_OUTPUT_SCHEMA,
      createdAt: v1Node.createdAt || new Date().toISOString(),
    }
    tasks.push(task)
    taskIds.push(taskId)
  }

  // Node tools: add warning if present
  if (v1Node.tools && v1Node.tools.length > 0) {
    warnings.push(
      `Node "${v1Node.name}" had tools: [${v1Node.tools.join(', ')}]. ` +
      `These were not automatically assigned to tasks. Please review task tool configurations.`
    )
  }

  const node: NodeConfig = {
    id: nodeId,
    name: v1Node.name,
    description: v1Node.description,
    mode: v1Node.mode,
    nodePrompt: v1Node.nodePrompt,
    llm: v1Node.llm,
    tasks: taskIds,
    inputSchema: v1Node.inputSchema || DEFAULT_INPUT_SCHEMA,
    outputSchema: v1Node.outputSchema || DEFAULT_OUTPUT_SCHEMA,
    triggerMode: 'both',
    failurePolicy: 'fail_fast',
    createdAt: v1Node.createdAt || new Date().toISOString(),
    updatedAt: v1Node.updatedAt,
  }

  return { node, tasks, nodeWarnings: warnings }
}

/**
 * Load config with automatic migration if needed
 */
export function loadConfigWithMigration(): ConfigFile {
  const { config, result, error } = migrateV1ToV2()
  
  if (error) {
    console.error(`[tohelper:migrate] ${error}`)
    // Return empty v2 config on error
    return {
      version: 2,
      tasks: {},
      nodes: {},
      equipped: [],
    }
  }

  if (result) {
    console.log(`[tohelper:migrate] Migrated ${result.nodesMigrated} nodes, ${result.tasksMigrated} tasks`)
    if (result.warnings.length > 0) {
      console.warn(`[tohelper:migrate] Warnings:`)
      for (const w of result.warnings) {
        console.warn(`  - ${w}`)
      }
    }
  }

  return config!
}
