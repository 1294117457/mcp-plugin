
┌─────────────────────────────────────────────────────────────────┐
│                         你的 dsh                                 │
│                                                                  │
│  ┌──────────────────┐           ┌──────────────────────────┐   │
│  │   mcp-client     │           │      mcp-client           │   │
│  │  (stdio 模式)    │           │   (streamable-http 模式)  │   │
│  └────────┬─────────┘           └────────────┬─────────────┘   │
│           │                                  │                  │
│           │ spawn child process              │ HTTP POST/GET    │
│           │ stdin/stdout JSON-RPC            │ JSON-RPC + SSE   │
│           ▼                                  ▼                  │
└───────────┼──────────────────────────────────┼──────────────────┘
            │                                  │
     ┌──────┴────────┐                  ┌──────┴──────────┐
     │ 本地进程      │                  │ 远程 HTTP server │
     │ (npx/python/ │                  │ mcp.mcd.cn      │
     │  node)       │                  │                 │
     │              │                  │                 │
     │ 这个进程可能  │                  │ 这是托管在云上   │
     │ 真的本地计算，│                  │ 的 MCP server   │
     │ 也可能转发到  │                  │                 │
     │ 远程 HTTP    │                  │                 │
     └──────────────┘                  └─────────────────┘




问：服务商给了什么？
  │
  ├─ 给了一个 URL + 鉴权（如麦当劳）
  │   → streamable-http
  │   → URL + headers
  │
  ├─ 给了一个 npm 包（@xxx/mcp-server）
  │   → stdio
  │   → npx -y @xxx/mcp-server
  │
  ├─ 给了一个 docker 镜像 / python 包
  │   → stdio
  │   → docker run / python -m
  │
  └─ 没明确给，问"我能不能自己写"
      → stdio（自己写个 Python/Node 脚本当 server）
      → 或 streamable-http（自己起个 HTTP server）