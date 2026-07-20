# T3000 Haystack & Semantic Layer Documentation

## Documents

| Document | Description |
|---|---|
| [v4-haystack-mcp-complete.md](./v4-haystack-mcp-complete.md) | **Current (v4)** — Complete 25-tool MCP server: discovery, read/write, alarms, trends, validation, export |
| [mcp-api-examples.md](./mcp-api-examples.md) | **Examples** — Natural-language prompts for all 25 MCP tools, organized by category |
| [mcp-vscode-copilot.md](./mcp-vscode-copilot.md) | **Setup** — Connect VS Code Copilot to the T3000 MCP server |
| [mcp-claude-desktop.md](./mcp-claude-desktop.md) | **Setup** — Connect Claude Desktop (and Cursor, Cline, Continue.dev) to the T3000 MCP server |
| [v3-haystack-auto-tagging-mcp.md](./v3-haystack-auto-tagging-mcp.md) | **Implemented (v3)** — Auto-Tagging rules engine + 7-tool MCP server design |
| [v2-haystack-current-implementation.md](./v2-haystack-current-implementation.md) | **Legacy (v2)** — Schema, APIs, basic auto-tagging, frontend |
| [v1-haystack-legacy-single-table.md](./v1-haystack-legacy-single-table.md) | **Deprecated (v1)** — Original HAYSTACK_ENTITY table design |

## Key Concepts

- **Haystack** — Flat tag-based semantic model for building data (`point`, `sensor`, `outside`, `air`, `temp`)
- **Brick** — Formal ontology with class hierarchy and relationships (`Outside_Air_Temperature_Sensor isPartOf AHU`)
- **Auto-Tagging** — Regex rules automatically assign tags + Brick classes to device points
- **MCP (Model Context Protocol)** — JSON-RPC protocol for exposing 25 tools to LLM agents across 7 categories: Haystack tagging, Core/Discovery, Device/Points, Read/Write, Analytics, Rules Management, Alarms & Trends

## Database Tables

| Table | Purpose |
|---|---|
| `HAYSTACK_TAGS` | Tag dictionary (synced from project-haystack.org) |
| `HAYSTACK_TAG_RELATIONS` | Tag parent-child relationships |
| `HAYSTACK_POINT_TAGS` | Point ↔ Tag assignments + Brick class |
| `AUTO_TAGGING_RULES` | Regex rules for auto-tagging (68 default rules) |

## API Routes

### MCP Server (Streamable HTTP — v4.1)

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/mcp` | MCP JSON-RPC 2.0 requests (25 tools) |
| `GET` | `/api/mcp` | SSE endpoint (server → client notifications) |
| `DELETE` | `/api/mcp` | Session termination |

No bridge needed — connects directly via `"type": "http"` to `http://localhost:9103/api/mcp`.

### Haystack REST APIs
| `POST /api/haystack/auto-tagging/run` | Run auto-tagging |
| `POST /api/haystack/auto-tagging/preview` | Preview results |
| `POST /api/haystack/auto-tagging/reset` | Reset auto-tags |
| `GET/POST /api/haystack/auto-tagging/rules` | List/create rules |
| `PUT/DELETE /api/haystack/auto-tagging/rules/:id` | Update/delete rule |
| `POST /api/haystack/auto-tagging/rules/:id/toggle` | Toggle rule on/off |
| `POST /api/haystack/auto-tagging/brick-classes` | Get Brick classes |
| `GET/POST /api/haystack/tags` | List/create tags |
| `PUT/DELETE /api/haystack/tags/:name` | Update/delete tag |
| `POST /api/haystack/point-tags/read` | Read point tags |
| `POST /api/haystack/point-tags/write` | Batch write point tags |
| `POST /api/haystack/replace-tag` | Replace tag globally |
| `POST /api/haystack/rebuild` | Rebuild tags for serials |
| `POST /api/haystack/sync` | Sync from official defs.json |

See [v4-haystack-mcp-complete.md](./v4-haystack-mcp-complete.md) §5 for full MCP tool schemas.

## Frontend Pages

| URL | Component | Description |
|---|---|---|
| `/t3000/haystack-tags` | `HaystackTagsPage` | Standard tag browser + sync |
| `/t3000/custom-tags` | `CustomTagsPage` | User-defined tag management |
| `/t3000/auto-tagging-mcp` | `AutoTaggingMcpPage` | Auto-tagging rules + MCP server (PLANNED) |

## Rust Modules

```
api/src/haystack/          ← Haystack v2 + Auto-Tagging + MCP
api/migration/src/         ← Database migrations
```
