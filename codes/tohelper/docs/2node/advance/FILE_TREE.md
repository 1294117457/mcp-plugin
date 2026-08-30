# Node-Task 系统文件树

## 源代码文件树

```
tohelper/
├── src/
│   ├── types.ts ✨                           # 扩展类型定义（+100 行）
│   │
│   ├── host/
│   │   ├── index.ts ✅                       # 插件入口（+12 行）
│   │   │
│   │   ├── task/ ✨                          # Task 系统（新增模块）
│   │   │   ├── types.ts                     # Task 类型定义（49 行）
│   │   │   ├── registry.ts                  # Task 注册表（78 行）
│   │   │   ├── builtin/                     # 内置 Task 类型
│   │   │   │   ├── llm-call.ts             # LLM 调用（112 行）
│   │   │   │   ├── tool-call.ts            # Tool 调用（112 行）
│   │   │   │   ├── transform.ts            # 数据转换（32 行）
│   │   │   │   └── index.ts                # 导出（4 行）
│   │   │   └── index.ts                     # Task 模块入口（17 行）
│   │   │
│   │   └── node/
│   │       ├── config.ts ✅                 # Node 配置管理（+40 行）
│   │       ├── executor.ts ✅               # Node 执行器（+90 行重构）
│   │       ├── routes.ts ✅                 # API 路由（+10 行）
│   │       └── index.ts ✅                  # Node 模块（+1 行）
│   │
│   └── client/
│       ├── api/
│       │   ├── node.ts ✅                   # Node API（+30 行）
│       │   └── index.ts ✅                  # API 导出（+2 行）
│       │
│       ├── node/
│       │   ├── NodePanel.tsx ✅             # 节点面板（+80 行）
│       │   ├── NodeList.tsx ✅              # 节点列表（+60 行）
│       │   └── NodeEditor.tsx ✨            # 节点编辑器（421 行，新文件）
│       │
│       └── shared/
│           └── styles.ts ✅                 # 样式（+317 行）
│
├── docs/2node/advance/ ✨                   # 文档目录（新增）
│   ├── 0设计.md                             # 原始设计（43 行）
│   ├── 1.host端设计.md                      # Host 端设计（1,146 行）
│   ├── 2.client端设计.md                    # Client 端设计（1,921 行）
│   ├── 3.实现完成报告.md                    # 实现报告（353 行）
│   ├── 4.快速测试指南.md                    # 测试指南（202 行）
│   ├── 5.实现清单.md                        # 实现清单（341 行）
│   ├── node.md                              # 用户文档（703 行）
│   ├── README.md                            # 项目总览（315 行）
│   ├── 验收清单.md                          # 测试清单（299 行）
│   ├── IMPLEMENTATION_COMPLETE.md           # 完成报告（340 行）
│   └── FILE_TREE.md                         # 本文件
│
├── scripts/
│   └── start.sh ✨                          # 启动脚本（新增）
│
├── dist/
│   └── client.js                            # 编译产物（50.07 kB）
│
├── package.json
├── cordis.patch.yml
└── README.md

✨ 新增文件/目录
✅ 修改/扩展的文件
```

## 代码统计

### Host 端
```
新增：
  src/host/task/                             ~404 行

修改：
  src/types.ts                               ~100 行
  src/host/index.ts                          ~12 行
  src/host/node/config.ts                    ~40 行
  src/host/node/executor.ts                  ~90 行
  src/host/node/routes.ts                    ~10 行
  src/host/node/index.ts                     ~1 行
                                    小计：    ~657 行
```

### Client 端
```
修改：
  src/client/api/node.ts                     ~30 行
  src/client/api/index.ts                    ~2 行
  src/client/node/NodePanel.tsx              ~80 行
  src/client/node/NodeList.tsx               ~60 行
  src/client/shared/styles.ts                ~317 行

新增：
  src/client/node/NodeEditor.tsx             ~421 行
                                    小计：    ~910 行
```

### 文档
```
docs/2node/advance/                          ~5,663 行
  - 0设计.md                                 43 行
  - 1.host端设计.md                          1,146 行
  - 2.client端设计.md                        1,921 行
  - 3.实现完成报告.md                        353 行
  - 4.快速测试指南.md                        202 行
  - 5.实现清单.md                            341 行
  - node.md                                  703 行
  - README.md                                315 行
  - 验收清单.md                              299 行
  - IMPLEMENTATION_COMPLETE.md               340 行
```

### 总计
```
代码：      ~1,567 行
文档：      ~5,663 行
脚本：      ~51 行
总计：      ~7,281 行
```

## 关键文件说明

### 核心实现文件

| 文件 | 作用 | 行数 | 状态 |
|-----|------|------|------|
| `src/host/task/registry.ts` | Task 注册和执行 | 78 | ✨ 新增 |
| `src/host/task/builtin/llm-call.ts` | LLM 调用 Task | 112 | ✨ 新增 |
| `src/host/task/builtin/tool-call.ts` | Tool 调用 Task | 112 | ✨ 新增 |
| `src/host/node/executor.ts` | Pipeline 执行器 | 153 | ✅ 重构 |
| `src/client/node/NodeEditor.tsx` | Node 编辑器 UI | 421 | ✨ 新增 |

### 重要文档

| 文档 | 作用 | 行数 |
|-----|------|------|
| `node.md` | 完整用户文档 | 703 |
| `1.host端设计.md` | Host 端技术设计 | 1,146 |
| `2.client端设计.md` | Client 端 UI 设计 | 1,921 |
| `4.快速测试指南.md` | 测试步骤 | 202 |
| `验收清单.md` | 测试检查清单 | 299 |

## 编译产物

```
dist/
└── client.js                                50.07 kB (gzip: 13.10 kB)
```

## 配置文件

### Node 配置
```
位置: {dsh_data_dir}/node-config.json

格式:
{
  "version": 1,
  "nodes": {
    "node-xxx": { /* NodeConfig */ }
  },
  "equipped": ["node-xxx"]
}
```

### 插件配置
```
位置: cordis.patch.yml

内容:
- insert:
    - id: tohelper
      name: tohelper
```

## 依赖关系

```
src/host/index.ts
  ├─> task/index.ts (注册 Task)
  │   ├─> task/registry.ts
  │   └─> task/builtin/*.ts
  │
  ├─> node/index.ts
  │   ├─> node/executor.ts
  │   │   └─> task/registry.ts (使用 Task)
  │   ├─> node/config.ts
  │   └─> node/routes.ts
  │
  └─> tool/index.ts

src/client/entry.tsx
  └─> home/index.tsx
      └─> node/NodePanel.tsx
          ├─> node/NodeList.tsx
          └─> node/NodeEditor.tsx
              └─> TaskItem (内嵌)
```

## 数据流

```
用户 UI (NodeEditor)
  ↓ HTTP POST
API Routes (/api/tohelper/node/create)
  ↓
Node Config (node-config.json)
  ↓ equip
Tool Registry (ctx.tools)
  ↓ 用户对话调用
Node Executor
  ├─ Direct Mode → LLM
  └─ Pipeline Mode → Task Registry
      ├─ LLM Call Task → ctx.llm
      ├─ Tool Call Task → ctx.tools
      └─ Transform Task → JavaScript
```

## 版本信息

```
项目版本：     v1.0
实现日期：     2026-08-30
编译器：       Vite 6.4.3
运行时：       dsh (Cordis 插件)
浏览器：       Modern browsers (ES2020+)
```

---

**生成时间**: 2026-08-30  
**文档版本**: v1.0
