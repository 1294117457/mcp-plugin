import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

const PLUGIN_DIR = resolve(import.meta.dirname, '..')
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const PROFILE_DIR = join(DSH_HOME, 'profiles', 'web')
const PKG_PATH = join(PROFILE_DIR, 'package.json')

if (!existsSync(PKG_PATH)) {
  console.error('[tohelper] profile not found, run setup first')
  process.exit(1)
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'))

delete pkg.dependencies?.tohelper

if (pkg.dsh?.profile?.bundles) {
  pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter(b => b !== 'tohelper')
}

writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')
execSync('pnpm install', { cwd: PROFILE_DIR, stdio: 'inherit' })

console.log('[tohelper] removed from DSH web profile')
