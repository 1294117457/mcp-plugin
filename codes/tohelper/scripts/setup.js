import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { execSync } from 'node:child_process'
import { homedir } from 'node:os'

const PLUGIN_DIR = resolve(import.meta.dirname, '..')
const DSH_HOME = process.env.DSH_HOME || join(homedir(), '.dsh')
const PROFILE_DIR = join(DSH_HOME, 'profiles', 'web')
const PKG_PATH = join(PROFILE_DIR, 'package.json')

if (!existsSync(PROFILE_DIR)) {
  mkdirSync(PROFILE_DIR, { recursive: true })
}

if (!existsSync(PKG_PATH)) {
  writeFileSync(PKG_PATH, JSON.stringify({
    name: 'dsh-profile-web',
    private: true,
    dependencies: {},
    dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } },
  }, null, 2) + '\n')
}

const pkg = JSON.parse(readFileSync(PKG_PATH, 'utf8'))

pkg.dependencies ??= {}
pkg.dependencies.tohelper = `link:${PLUGIN_DIR}`

pkg.dsh ??= {}
pkg.dsh.profile ??= {}
pkg.dsh.profile.bundles ??= []
if (!pkg.dsh.profile.bundles.includes('tohelper')) {
  pkg.dsh.profile.bundles.push('tohelper')
}

writeFileSync(PKG_PATH, JSON.stringify(pkg, null, 2) + '\n')
execSync('pnpm install', { cwd: PROFILE_DIR, stdio: 'inherit' })

console.log('[tohelper] registered in DSH web profile')
console.log(`[tohelper] profile: ${PROFILE_DIR}`)
