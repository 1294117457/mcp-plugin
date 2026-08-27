import { readFileSync, writeFileSync, mkdirSync, renameSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface ServerEntry {
  transport: 'stdio' | 'streamable-http'
  url?: string
  headers?: Record<string, string>
  command?: string
  args?: string[]
  env?: Record<string, string>
  addedAt: string
  autoConnect: boolean
}

export interface TohelperConfig {
  version: 1
  servers: Record<string, ServerEntry>
  denied: string[]
}

const __dirname = dirname(fileURLToPath(import.meta.url))

function findPackageRoot(dir: string): string {
  let d = dir
  for (;;) {
    if (existsSync(resolve(d, 'package.json'))) return d
    const parent = dirname(d)
    if (parent === d) return dir
    d = parent
  }
}

const PKG_ROOT = findPackageRoot(__dirname)
const DATA_DIR = resolve(PKG_ROOT, 'data')
const CONFIG_PATH = resolve(DATA_DIR, 'config.json')

const DEFAULT_CONFIG: TohelperConfig = {
  version: 1,
  servers: {},
  denied: [],
}

export function loadConfig(): TohelperConfig {
  try {
    const raw = readFileSync(CONFIG_PATH, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed.version === 1) return parsed
    console.warn('[tohelper] config version mismatch, using defaults')
    return { ...DEFAULT_CONFIG }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(config: TohelperConfig): void {
  const tmp = CONFIG_PATH + '.tmp'

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true })
  }

  writeFileSync(tmp, JSON.stringify(config, null, 2), 'utf8')
  renameSync(tmp, CONFIG_PATH)
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function saveConfigDebounced(config: TohelperConfig): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    saveConfig(config)
    debounceTimer = null
  }, 100)
}

export function configAddServer(
  config: TohelperConfig,
  serverName: string,
  entry: Omit<ServerEntry, 'addedAt' | 'autoConnect'>,
): void {
  config.servers[serverName] = {
    ...entry,
    addedAt: new Date().toISOString(),
    autoConnect: true,
  }
  saveConfigDebounced(config)
}

export function configRemoveServer(config: TohelperConfig, serverName: string): void {
  delete config.servers[serverName]
  config.denied = config.denied.filter(n => !n.startsWith(`mcp__${serverName}__`))
  saveConfigDebounced(config)
}

export function configUpdateDenied(config: TohelperConfig, denied: string[]): void {
  config.denied = denied
  saveConfigDebounced(config)
}
