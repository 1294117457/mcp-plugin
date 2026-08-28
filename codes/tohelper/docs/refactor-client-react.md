# 客户端重构方案：迁移至 React + DSH Slots

## 背景

当前 tohelper 客户端采用原生 DOM + Vite IIFE 注入方式，通过 `webserver/index-inject` 向页面插入 `<script>` 标签。
该方式虽能工作，但属于非官方 hack，不利于与 DSH 生态（主题、设置、locale、其他插件）集成。

本文档描述将客户端迁移为 **React + `ctx.slots.inject('shell.overlay')`** 的官方插件架构。

---

## 目标

1. 使用 DSH 官方 slot 机制注入 UI（`shell.overlay`）
2. 使用 React（由 DSH 运行时提供，不自行打包）
3. 为后续嵌入 dsh-pet 视频桌宠奠定基础
4. 保留所有现有功能（工具列表、MCP 管理、技能浏览、Spine 角色）

---

## 架构对比

| 维度 | 现在 | 重构后 |
|------|------|--------|
| 框架 | 原生 DOM（innerHTML + addEventListener） | React 组件（createElement） |
| 注入方式 | `webserver/index-inject` + `<script>` | `ctx.slots.inject('shell.overlay')` |
| 构建工具 | Vite IIFE → `dist/widget.js` | tsdown → `lib/client.js` |
| 样式 | JS 字符串拼接 CSS | `styles.insert(css)` 或内联 |
| 主题 | 硬编码颜色 | DSH CSS 变量 (`var(--dsw-alias-*)`) |
| React 来源 | 无 | DSH 运行时注入 `require('react')` |
| 生命周期 | 手动 DOM 操作 | Cordis 自动管理 |

---

## 新目录结构

```
src/
├── host/
│   ├── index.ts          ← Host 插件入口（API 路由、MCP 管理，基本不变）
│   └── config.ts         ← 持久化配置（不变）
├── client/
│   ├── index.ts          ← Client 插件工厂（makeFactory）
│   ├── app.tsx           ← 根组件 TohelperApp
│   ├── components/
│   │   ├── FloatingButton.tsx   ← 可拖拽悬浮按钮 + 角色动画
│   │   ├── Panel.tsx            ← 面板容器（定位、开关）
│   │   ├── ToolsTab.tsx         ← 工具列表
│   │   ├── McpTab.tsx           ← MCP 管理
│   │   ├── SkillsTab.tsx        ← 技能浏览
│   │   └── Mascot.tsx           ← 角色渲染（Spine 或视频）
│   ├── hooks/
│   │   ├── useDrag.ts           ← 拖拽逻辑
│   │   ├── useApi.ts            ← API 请求封装
│   │   └── usePanelPosition.ts  ← 面板定位计算
│   ├── api.ts            ← API 接口定义（基本不变）
│   └── styles.ts         ← CSS 字符串（迁移为 DSH 主题变量）
├── assets/
│   └── spine/naiwa1/     ← Spine 资源（不变）
└── vendor/
    └── spine-webgl.js    ← Spine 运行时（不变）
```

---

## Client 插件入口

```typescript
// src/client/index.ts
import { TohelperApp } from './app'

export function makeFactory() {
  return (require: (mod: string) => any) => {
    const React = require('react')
    const { jsx: h } = require('react/jsx-runtime')
    const { useState, useEffect, useRef, useCallback } = React

    const rt = { h, useState, useEffect, useRef, useCallback, React }
    const App = TohelperApp(rt)

    return {
      name: 'tohelper-ui',
      inject: ['slots'],
      apply(ctx: any) {
        ctx.slots.inject('shell.overlay', function* () {
          yield ctx.slots.register(
            { name: 'shell.overlay', id: 'tohelper', order: 900, label: 'Tohelper' },
            () => h(App, {})
          )
        })
      },
    }
  }
}
```

---

## Host 入口变更

Host 的 `src/host/index.ts` 需要同时注册：
1. API 路由（`/api/tohelper/*`）— 与现在相同
2. Client 插件（通过 `webserver/index-inject` 或 `ctx.client`）

dsh-pet 的做法是将 client 代码构建为 `lib/client.js`，Host 在启动时通过 DSH 的 client entry 机制注册。

```typescript
// src/host/index.ts
export const name = 'tohelper'
export const inject = ['webServer', 'tools'] as const

export function apply(ctx: Context): void {
  // ... API 路由注册（不变）...

  // 注册 client 半侧
  ctx.webServer.registerClientEntry({
    id: 'tohelper-client',
    factory: resolve(PKG_ROOT, 'lib/client.js'),
  })
}
```

---

## 组件设计

### TohelperApp（根组件）

```typescript
// src/client/app.tsx (伪代码)
export function TohelperApp(rt) {
  return function App() {
    const [isOpen, setIsOpen] = rt.useState(false)
    const [tab, setTab] = rt.useState('tools')
    const [btnPos, setBtnPos] = rt.useState({ x: window.innerWidth - 100, y: window.innerHeight - 100 })

    return rt.h('div', { className: 'tohelper-root', style: { position: 'fixed', zIndex: 40 } },
      rt.h(FloatingButton, { pos: btnPos, onPosChange: setBtnPos, isOpen, onToggle: () => setIsOpen(!isOpen) }),
      isOpen && rt.h(Panel, { btnPos, tab, onTabChange: setTab })
    )
  }
}
```

### FloatingButton

- 可拖拽（Pointer Events）
- 包含角色 canvas（Spine）或 `<video>`（dsh-pet 视频方案）
- 点击切换面板开关
- 拖拽时面板跟随重定位

### Panel

- 绝对定位，相对于按钮位置
- Tab 切换（工具 / MCP / 技能）
- 子组件各自独立管理状态和 API 调用

---

## 构建方式

**当前（Vite IIFE）：**
```json
"build:widget": "vite build"
// 输出: dist/widget.js (IIFE, 自执行)
```

**重构后（tsdown CJS factory）：**
```json
"build:client": "tsdown src/client/index.ts --format cjs --out-dir lib --out-extension .js"
// 输出: lib/client.js (CJS module, require 注入)
```

Host 仍为 `.ts` 源码（tsx 直接运行）。

---

## 迁移步骤

### 阶段 1：基础框架

1. 创建 `src/client/index.ts`（新的 factory 入口）
2. 创建 `TohelperApp` 根组件
3. Host 注册 client entry
4. 验证空壳能渲染到 `shell.overlay`

### 阶段 2：面板 + Tab

1. 迁移 FloatingButton（拖拽逻辑 → `useDrag` hook）
2. 迁移 Panel 容器和 Tab 切换
3. 验证面板能正常开关和定位

### 阶段 3：功能 Tab

1. 迁移 ToolsTab（工具列表 + 折叠分组 + 筛选）
2. 迁移 McpTab（服务器管理 + 工具开关 + JSON 添加）
3. 迁移 SkillsTab（技能列表）

### 阶段 4：角色动画

1. 迁移 Spine 角色渲染（canvas ref）
2. 或替换为 dsh-pet 视频方案（`<video>` 透明播放）

### 阶段 5：清理

1. 删除旧的 Vite 构建、`dist/widget.js`、`webserver/index-inject` 相关代码
2. 删除旧的 `src/client/styles/`（内联 CSS 字符串）
3. 更新 `package.json` 构建脚本

---

## DSH 主题变量（替代硬编码颜色）

```css
/* 背景 */
var(--dsw-alias-bg-layer-1)    /* 面板底色 */
var(--dsw-alias-bg-layer-2)    /* 卡片底色 */

/* 文字 */
var(--dsw-alias-label-primary)    /* 主文字 */
var(--dsw-alias-label-secondary)  /* 次要文字 */

/* 边框 */
var(--dsw-alias-border-default)   /* 默认边框 */

/* 按钮 */
var(--dsw-alias-bg-interactive)   /* 可点击背景 */
```

---

## 注意事项

1. **不能 import React**：client 代码中不能顶层 `import React`（DSH 运行时通过 `require` 注入）
2. **不能 import DSH 内部包**：client 半侧通过 `require('react')` 获取 React，无法 import 其他 DSH 包
3. **CSS 不能用 module/scss**：只能用字符串注入或 `<style>` 标签
4. **组件需要 factory 模式**：所有组件通过工厂函数创建，接收 `rt`（runtime）对象传递 React hooks
5. **Spine 资源路由不变**：Host 侧仍通过 `/api/tohelper/spine/*` 提供 Spine 资源
6. **API 路由不变**：Host 侧 HTTP API（`/api/tohelper/*`）完全保留，客户端 `fetch` 调用方式相同

---

## 与 dsh-pet 桌宠的集成路径

重构为 React + slots 后，可以选择：

**选项 A：内嵌视频播放**
- 直接在 `FloatingButton` 组件中使用 `<video>` 元素
- 从 dsh-pet 提取动画状态机逻辑（`pickers.ts` 中的 `rollKind`/`pick`）
- 准备"推面板"、"待机"等透明视频素材

**选项 B：保留 Spine**
- 在 `Mascot` 组件中保持 Spine WebGL 渲染
- 需要用 `useRef` 管理 canvas + 动画循环

**选项 C：两者并存**
- 默认使用视频（更丰富的预录动画）
- 特定交互用 Spine（实时骨骼操控，如"推面板"）

---

## 预计工作量

| 阶段 | 预计复杂度 |
|------|-----------|
| 阶段 1 基础框架 | 低 |
| 阶段 2 面板 + Tab | 中 |
| 阶段 3 功能 Tab | 中（逻辑迁移，innerHTML → createElement） |
| 阶段 4 角色动画 | 中-高（取决于方案选择） |
| 阶段 5 清理 | 低 |

总计约需重写 ~400 行客户端代码（现有 `src/client/` 约 700 行）。
