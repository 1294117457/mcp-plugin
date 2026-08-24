# tohelper

A DSH plugin for visualizing and managing tools, MCP servers, and skills.

## Features

- **Tool Viewer**: Display all built-in tools available to the current agent (read-only)
- **MCP Manager**: Add/remove MCP servers dynamically, enable/disable individual MCP tools
- **Skill Browser**: View available skills in the current agent's scope

## Architecture

```
src/
├── index.ts            # Entry: plugin declaration, agent tracking, widget injection
├── modules/
│   ├── tool.ts         # Tool module: built-in tool discovery and display
│   ├── mcp.ts          # MCP module: server management and tool deny/allow
│   └── skill.ts        # Skill module: skill catalog browsing
├── api.ts              # HTTP route registration (aggregates all module endpoints)
├── widget.ts           # Frontend JS/CSS string (floating panel)
├── types.ts            # Shared type definitions
└── ambient.d.ts        # TypeScript declaration merging for Cordis Context
```

## Usage

### Development (via --patch)

```bash
pnpm dsh web --patch "E:/codes/claude/ID/mcp-plugin/codes/tohelper/cordis.patch.yml"
```

The plugin loads on the host plane and accesses agent-scoped tools via the `agents` service events. No DSH source modifications required.

### How it works

1. Listens for `agent/created` events to track the active agent
2. Uses `ctx.tools.schemas(agent)` to read scoped tool lists
3. Uses `agent.ctx.tools.restrict({ deny })` to control MCP tool visibility
4. Uses `ctx.skills.list({ scope: agent })` to browse available skills
5. Dynamically loads MCP servers via `ctx.plugin(mcpClient, config)`
6. Injects a floating panel UI via `webserver/index-inject`

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tohelper/tools` | List all tools (builtin + MCP, classified) |
| GET | `/api/tohelper/skills` | List available skills |
| GET | `/api/tohelper/mcp/servers` | List dynamically added MCP servers |
| POST | `/api/tohelper/mcp/add` | Add an MCP server |
| POST | `/api/tohelper/mcp/remove` | Remove an MCP server |
| POST | `/api/tohelper/mcp/deny` | Deny specific MCP tools |
| POST | `/api/tohelper/mcp/reset` | Reset all MCP tool denials |
| GET | `/api/tohelper/status` | Plugin status overview |
