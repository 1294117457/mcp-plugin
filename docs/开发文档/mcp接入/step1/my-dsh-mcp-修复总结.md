# my-dsh-mcp-settings 修复总结

> 这次修复的核心 bug：**bundle 安装成功、host 端 API 200，但浏览器设置弹窗里看不到 "MCP 服务" tab**。
> 根因——`package.json` 里把 `dsh.client` 字段错写成了 `dsh.bundle.client`，导致 client 半边整个被 client-modules 跳过。

---

## 1. 现象

```
已确认 ✅：
- dsh plugin --profile web add 'file:/...' 安装成功
- ~/.dsh/profiles/web/package.json 里 dsh.profile.bundles 列表包含 my-dsh-mcp-settings
- ~/.dsh/profiles/web/node_modules/my-dsh-mcp-settings/ 安装好
- dsh web 启动成功，监听随机端口
- /api/mcp/list 端点返回 200 { ok: true, value: [] }
- 浏览器 Console 看不到任何错误

不通过 ❌：
- 浏览器打开 dsh → 设置弹窗 → 看不到 "MCP 服务" tab
- 整个 client bundle 没有任何 JS 代码被加载
- ctx.slots.register('settings.section', McpSection) 那行代码从不执行
```

---

## 2. 根因

### 2.1 翻代码

`my-dsh-plugin/mcp/package.json` 第 57-62 行：

```jsonc
"dsh": {
  "bundle": {
    "patch": "./cordis.patch.yml",
    "client": "./lib/client/index.js"   // ← 这个字段 dsh 客户端代码不读
  }
}
```

### 2.2 真相

dsh 扫 client bundle 时只读 `dsh.client` 字段，不读 `dsh.bundle.client`：

```ts
// deepseek-harness/packages/client/modules/src/index.ts
function parseDshClient(pkgName: string, value: unknown): DshClientDeclaration | undefined {
  // value = pkg.dsh.client   ← 注意是 .client，不是 .bundle.client
  if (value === undefined) return undefined
  if (typeof value !== 'object' || value === null) {
    throw new Error(`client-modules: ${pkgName} has a non-object dsh.client declaration`)
  }
  const decl = value as Record<string, unknown>
  if (typeof decl.platform !== 'string') {
    throw new Error(`client-modules: ${pkgName} dsh.client.platform must be a string`)
  }
  ...
}
```

跳过的逻辑（line 350-353）：

```ts
if (decl === undefined || decl.platform !== 'web') {
  this.pkgMeta.set(pkgName, null)   //  ← 静默负向缓存
  return null
}
```

**注意**：负向缓存**永不失效**——重启 dsh 之前它都认为这个包不是 client 包。

`dsh.bundle` 字段在 app-boot 里只有 `.patch` 一个子键被读：

```ts
// deepseek-harness/packages/boot/app-boot/src/profile.ts
const declared = bundleManifest.dsh?.bundle?.patch   // ← 只读 .patch
if (declared === undefined) {
  throw new Error(`profile bundle ${packageName} declares no dsh.bundle ...`)
}
```

### 2.3 整条扫描链

```
dsh web 启动
  │
  ▼
loadProfile("web", INSTALL_ANCHOR, ~/.dsh)
  │  读 ~/.dsh/profiles/web/package.json dsh.profile.bundles
  │  = ["@deepseek-ai/dsh-base", "@deepseek-ai/dsh-web-app", "my-dsh-mcp-settings"]
  │
  ▼
对 "my-dsh-mcp-settings"：
  resolveBundleDir → 找到 ~/.dsh/profiles/web/node_modules/my-dsh-mcp-settings
  读它的 package.json → dsh.bundle.patch = "./cordis.patch.yml" → ✅
  │
  ▼
applyEntryPatches 合成 entry 列表
  my-dsh-mcp-settings 这一行：
  { id: "my-dsh-mcp-settings", name: "my-dsh-mcp-settings", apply: "./lib/index.js" }
  │
  ▼
cordis-loader 创建 host 端 fiber → 调 apply(ctx) → /api/mcp/* 端点注册成功 ✅
  │
  ▼
@deepseek-ai/dsh-client-modules 启动
  ClientModuleRegistry 构造时扫 ctx.loader.entries()
  对 "my-dsh-mcp-settings"：
    resolve "my-dsh-mcp-settings" → package.json
    parseDshClient(pkg.dsh.client)   ← undefined，因为没有 dsh.client
    decl === undefined → 包 null，return
  │
  ▼
window.__DSH_BOOT__.entries 里没有 "my-dsh-mcp-settings"
  │
  ▼
浏览器从不 fetch /plugins/my-dsh-mcp-settings/client.js
  │
  ▼
McpSection 的 apply(ctx) 从不跑 → ctx.slots.register 那行从不执行
  │
  ▼
设置弹窗没有 "MCP 服务" tab
```

---

## 3. 修复

### 3.1 改 `package.json`

```jsonc
{
  "dsh": {
    "bundle": {
      "patch": "./cordis.patch.yml"
      // 删掉 "client": "./lib/client/index.js" 这一行
    },
    "client": {
      "platform": "web",
      "inject": [
        "@deepseek-ai/dsh-client-runtime",
        "@deepseek-ai/dsh-client-ui-slots",
        "@deepseek-ai/dsh-client-ui-settings",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-api-remotes"
      ],
      "immediately": false
    }
  }
}
```

**`exports["./client"]` 必须指向 `lib/client.js`（tsdown 产物）而不是 `lib/client/index.js`**：

```jsonc
{
  "exports": {
    "./client": {
      "types": "./lib/client/index.d.ts",
      "default": "./lib/client.js"   // ← flat file produced by tsdown
    }
  }
}
```

`clientExportOf` 在 `client-modules` 里读取 `pkg.exports["./client"]`，把它拼成绝对路径作为 `clientPath`——这个路径就是浏览器加载的 bundle 文件位置。

### 3.2 client bundle 必须是 tsdown 编译出的 CJS factory

**关键**：client 端不是用 `tsc` 编 ESM——浏览器通过 `<script src="/plugins/<id>/client.js">` 加载的是**经典 CJS**，且必须用 `window.__ModuleLoader__.load({ id, factory })` 注册 factory。

错误的产出（`tsc -p .` 直接产出）：

```js
// 浏览器 syntax error
import { McpSection } from './McpSection.js';
export const name = 'my-dsh-mcp-settings:client';
export function apply(ctx) { ... }
```

正确的产出（tsdown + 镜像 `packages/client/tsdown.client.ts`）：

```js
window.__ModuleLoader__.load({
  id: "my-dsh-mcp-settings",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    // ... require('react'), require('@deepseek-ai/dsh-client-runtime/client') ...
    exports.apply = apply;
    return module.exports;
  }
});
```

**最小 tsdown.config.ts**（复制到 bundle 根目录）：

```ts
import { readFile } from 'node:fs/promises'
import { basename } from 'node:path'
import { transform } from 'lightningcss'
import { defineConfig } from 'tsdown'

const PLUGIN_ID = 'my-dsh-mcp-settings'
const CSS_VIRTUAL_PREFIX = '\0dsh-css:'
const CSS_VIRTUAL_SUFFIX = '.mjs'

// Platform module table — these IDs come from the loader module table at runtime,
// so the bundle must externalize (not inline) them.
const CLIENT_EXTERNALS = [
  'react', 'react/jsx-runtime',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-web-react',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-schema-form',
  '@deepseek-ai/dsh-client-runtime/client',
]

export default defineConfig({
  name: `${PLUGIN_ID}/client`,
  entry: { client: 'src/client/index.ts' },
  outDir: 'lib',
  format: 'cjs',
  platform: 'browser',
  dts: false,
  sourcemap: true,
  clean: false,
  external: [...CLIENT_EXTERNALS],
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env.MODE': JSON.stringify(process.env.NODE_ENV ?? 'production'),
    'import.meta.env': JSON.stringify({ MODE: process.env.NODE_ENV ?? 'production' }),
  },
  noExternal: (id: string) => (CLIENT_EXTERNALS.includes(id) ? undefined : true),
  plugins: [{
    name: 'dsh-css-modules-inline',
    resolveId(source, importer) {
      if (!source.endsWith('.module.css')) return null
      const abs = importer !== undefined
        ? new URL(source, new URL(importer, 'file://')).pathname
        : source
      return CSS_VIRTUAL_PREFIX + abs + CSS_VIRTUAL_SUFFIX
    },
    async load(virtualId) {
      if (!virtualId.startsWith(CSS_VIRTUAL_PREFIX)) return null
      const fileId = virtualId.slice(CSS_VIRTUAL_PREFIX.length, -CSS_VIRTUAL_SUFFIX.length)
      this.addWatchFile(fileId)
      const source = await readFile(fileId)
      const { code, exports: cssExports } = transform({
        filename: fileId,
        code: source,
        cssModules: { pattern: '[hash]_[local]' },
        minify: true,
      })
      const classMap = {}
      for (const [local, exp] of Object.entries(cssExports ?? {})) classMap[local] = exp.name
      return [
        `const css = ${JSON.stringify(code.toString())};`,
        `const tagId = ${JSON.stringify(`${PLUGIN_ID}/${basename(fileId)}`)};`,
        'if (typeof document !== \'undefined\' && document.querySelector(\'style[data-plugin-css=\' + JSON.stringify(tagId) + \']\') === null) {',
        '  const tag = document.createElement(\'style\');',
        `  tag.dataset.plugin = ${JSON.stringify(PLUGIN_ID)};`,
        '  tag.dataset.pluginCss = tagId;',
        '  tag.textContent = css;',
        '  document.head.appendChild(tag);',
        '}',
        `export default ${JSON.stringify(classMap)};`,
      ].join('\n')
    },
  }],
  outputOptions: {
    entryFileNames: 'client.js',
    banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {`,
    footer: 'return module.exports; } });',
    intro: 'var module = { exports: {} }; var exports = module.exports;',
  },
})
```

`build` 脚本同时跑两套：

```jsonc
"scripts": {
  "build": "tsc -p . && tsdown",  // host 端 ESM + client 端 CJS factory
  "build:client": "tsdown",
  "build:host": "tsc -p .",
  ...
}
```

devDependencies 加 `tsdown` 和 `lightningcss`。

### 3.3 重新构建 + 重新安装

```bash
cd my-dsh-plugin/mcp
pnpm build                  # → lib/index.js (host ESM) + lib/client.js (browser CJS factory)

# � 沙箱里 pnpm 11 install 会被 "no TTY" 拒。用：
npm pack --ignore-scripts

# 装到 dsh web profile
dsh plugin --profile web add 'file:/path/to/my-dsh-plugin/mcp/my-dsh-mcp-settings-0.1.0.tgz'
#   ↳ 如果报 "Already up to date" 且装出来的还是旧版，先：
rm -rf ~/.dsh/profiles/web/node_modules/my-dsh-mcp-settings
dsh plugin --profile web add 'file:...'
```

### 3.3 验证

```bash
dsh web
# 启动后另开终端：

# 1. Host 端 OK
curl http://localhost:3000/api/mcp/list
#   期望: {"ok":true,"value":[]}

# 2. Client bundle 路由 OK
curl -I http://localhost:3000/plugins/my-dsh-mcp-settings/client.js
#   期望: 200 OK

# 3. 浏览器 Console
JSON.parse(document.querySelector('script:not([src])').textContent.replace('window.__DSH_BOOT__ = ', ''))
  .entries.map(e => e.id)
#   期望包含: "my-dsh-mcp-settings"

# 4. 设置弹窗
#    浏览器 → 设置 → 左侧列表出现 "MCP 服务" tab
```

---

## 4. 教训

### 4.1 `dsh.bundle` vs `dsh.client` 字段对比

| 字段 | 用途 | 读它的代码 | 触发条件 |
|---|---|---|---|
| `dsh.bundle.patch` | Host 端 patch 文件路径 | `app-boot/loadProfile` | profile 启动时 |
| `dsh.client.platform` | "我是 browser 包" | `client-modules/parseDshClient` | host 端 loadProfile 之后注入 `__DSH_BOOT__` 时 |
| `dsh.client.inject` | 信息性 peer 列表 | `client-modules` | 同上 |
| `dsh.client.immediately` | 阶段一 prefetch | `client-modules` | 同上 |

**`dsh.bundle` 没有 `client` 子键**——是无效字段。**`dsh.client` 没有 `patch` 子键**——也是无效字段。

### 4.2 校验方法

在改 `package.json` 之前，**永远**先 grep 仓库里别人怎么写的：

```bash
# 找 dsh.bundle 真实写法
grep -rA4 '"dsh":' packages/bundle/*/package.json

# 找 dsh.client 真实写法
grep -rA4 '"dsh":' packages/client/ui-*/package.json
```

### 4.3 拆分 manifest 的设计原因

为什么不直接把 `dsh.client` 合到 `dsh.bundle` 下面？

- Host 端不需要知道 client 端的细节（`platform` 只是 browser 概念）
- Client 端不需要知道 host 端的 patch 路径
- 两边读的代码是不同 runtime（`app-boot` 是 Node 端 bootscript，`client-modules` 是 host 端服务的 service）——分两个字段让它们的契约清晰

**写文档、上 ide 配置自动 lint**：把 `dsh.bundle.client` 这种字段在编辑器里划红——更早暴露。

---

## 5. 配套修复

### 5.1 文档

- `dsh-架构与插件机制.md` — 大图，含三层插件声明
- `dsh-bundle-接入指南.md` — 完整接入 reference，专门把这两块的字段表格单独列出来

### 5.2 校验脚本（建议）

可以在 `my-dsh-plugin/mcp/package.json` 加个 `scripts.check`：

```jsonc
"scripts": {
  "check": "node -e 'const p=require(\"./package.json\"); const dsh=p.dsh||{}; if (dsh.bundle&&dsh.bundle.client!==undefined) {console.error(\"dsh.bundle.client is invalid; use dsh.client\"); process.exit(1)} if (dsh.client&&dsh.client.platform!==\"web\") {console.error(\"dsh.client.platform must be web\"); process.exit(1)} console.log(\"OK\")'"
}
```

跑 `pnpm run check` 可在改 package.json 时立即发现这类错误。

---

## 6. 时间线

| 时间 | 发生了什么 |
|---|---|
| Aug 14 22:22 | my-dsh-plugin monorepo 创建，含 mcp bundle |
| Aug 14 23:00 | 一版 bundle 写完，host 端 /api/mcp/* 端点成功 200 |
| Aug 15 00:14 | package.json 写错：`dsh.bundle.client` 而非 `dsh.client` |
| Aug 15 00:15 | `dsh plugin add` 成功，但浏览器看不到 UI |
| Aug 15 02:02 | 抓住问题根因，client-modules 不读 `dsh.bundle.client` |
| Aug 15 14:00 | 修复完成，文档齐全，`dsh web` 启动 + UI tab 出现 |
