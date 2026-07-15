# T3000 Haystack & Semantic Layer Documentation

## Documents

| Document | Description |
|---|---|
| [v2-haystack-current-implementation.md](./v2-haystack-current-implementation.md) | **Current (v2)** — Implemented schema, APIs, auto-tagging, frontend |
| [v3-haystack-auto-tagging-mcp.md](./v3-haystack-auto-tagging-mcp.md) | **Planned (v3)** — Auto-Tagging rules engine + MCP server design |
| [v1-haystack-legacy-single-table.md](./v1-haystack-legacy-single-table.md) | **Deprecated (v1)** — Original HAYSTACK_ENTITY table design |

## Key Concepts

- **Haystack** — Flat tag-based semantic model for building data (`point`, `sensor`, `outside`, `air`, `temp`)
- **Brick** — Formal ontology with class hierarchy and relationships (`Outside_Air_Temperature_Sensor isPartOf AHU`)
- **Auto-Tagging** — Regex rules automatically assign tags + Brick classes to device points
- **MCP (Model Context Protocol)** — JSON-RPC protocol for exposing tools to LLM agents

## Database Tables

| Table | Purpose |
|---|---|
| `HAYSTACK_TAGS` | Tag dictionary (synced from project-haystack.org) |
| `HAYSTACK_TAG_RELATIONS` | Tag parent-child relationships |
| `HAYSTACK_POINT_TAGS` | Point ↔ Tag assignments + Brick class |
| `AUTO_TAGGING_RULES` | Regex rules for auto-tagging (68 default rules) |

## API Routes

See [v3-haystack-auto-tagging-mcp.md](./v3-haystack-auto-tagging-mcp.md) §5 for the full API reference.

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
