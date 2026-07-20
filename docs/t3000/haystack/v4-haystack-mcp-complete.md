# T3000 MCP Server — v4 Design

---

## 1. Scope

v4 extends the MCP server from 7 Haystack-only tools to 25 tools across 7 categories. One file changes: `api/src/haystack/mcp.rs`. New handlers call existing public service functions — no other files touched.

| | v3 | v4 |
|---|---|---|
| Tools | 7 | 25 |
| Categories | 1 (haystack) | 7 |
| File changes | — | `mcp.rs` only |

---

## 2. Architecture

```
BACnet/Modbus ──→ C++ FFI ──→ SQLite DB
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
         INPUTS             OUTPUTS           VARIABLES
              │                  │                  │
              └──────────────────┼──────────────────┘
                                 │
                     ┌───────────▼───────────┐
                     │   Auto-Tagging Engine  │
                     │   range → haystack →   │
                     │   brick (3-step)       │
                     └───────────┬───────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                     │
   HAYSTACK_POINT_TAGS                HAYSTACK_POINT_BRICK_CLASS
              │                                     │
              └──────────────────┬──────────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │   MCP Server (v4)    │
                      │   POST /api/mcp      │
                      │   JSON-RPC 2.0        │
                      │   25 tools            │
                      └──────────────────────┘
```

---

## 3. Tool Manifest

### 3.1 Haystack Tagging — 7 tools (existing, unchanged)

| # | Tool | Input | Output |
|---|---|---|---|
| 1 | `haystack_list_tags` | `filter?: "haystack"\|"brick"\|"custom"` | `{ tags: [{ tag_name, category, doc, parents, source, usage_count }], total }` |
| 2 | `haystack_get_point_tags` | `serial_numbers: int[]`, `point_type?: "INPUT"\|"OUTPUT"\|"VARIABLE"` | `[{ serial_number, point_type, point_index, point_id, tag_name }]` |
| 3 | `haystack_search_points` | `tags: string[]`, `serial_numbers?: int[]`, `point_types?: string[]` | `{ entries: [{ point_id, serial_number, point_type, point_index, tag_name }] }` |
| 4 | `haystack_auto_tag` | `serial_numbers: int[]` | `{ tagged_count: int }` |
| 5 | `haystack_preview_tags` | `serial_numbers: int[]` | `{ preview: [{ point_id, tags: [], brick_class }] }` |
| 6 | `haystack_list_rules` | — | `{ rules: [{ id, rule_name, category, pattern, haystack_tags, enabled }] }` |
| 7 | `haystack_get_brick_class` | `serial_numbers: int[]` | `[{ serial_number, point_type, point_index, brick_class }]` |

### 3.2 Core — 3 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 8 | `ping` | — | `{ status, timestamp, server }` |
| 9 | `get_version` | — | `{ name, version, protocolVersion, toolCount }` |
| 10 | `describe_tool` | `tool_name: string` | `{ name, description, inputSchema }` |

### 3.3 Data & Metadata — 4 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 11 | `device_list` | `filter_name?: string` | `[{ serial, name, device_type, input_count, output_count, variable_count, online }]` |
| 12 | `device_get_points` | `serial_number: int`, `point_type?: "INPUT"\|"OUTPUT"\|"VARIABLE"` | `[{ point_type, point_index, label, engineering_units, haystack_tags, brick_class }]` |
| 13 | `point_get_metadata` | `serial_number: int`, `point_type: string`, `point_index: int` | `{ serial_number, point_type, point_index, label, engineering_units, range_low, range_high, description, haystack_tags, brick_class, digital_analog }` |
| 14 | `metadata_search` | `query: string`, `serial_numbers?: int[]`, `point_types?: string[]`, `limit?: int` | `[{ serial_number, point_type, point_index, label, haystack_tags, brick_class }]` |

### 3.4 Operational — 4 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 15 | `point_read` | `serial_number: int`, `point_type: string`, `point_index: int` | `{ serial_number, point_type, point_index, label, value, engineering_units, timestamp }` |
| 16 | `point_write` | `serial_number: int`, `point_type: string`, `point_index: int`, `value: number\|boolean`, `confirm: boolean` | `{ success, written_value, timestamp }` |
| 17 | `point_read_batch` | `points: [{ serial_number, point_type, point_index }]` | `[{ serial_number, point_type, point_index, label, value, engineering_units, timestamp }]` |
| 18 | `point_write_batch` | `points: [{ serial_number, point_type, point_index, value }]`, `confirm: boolean` | `{ success, count }` |

### 3.5 Analytics — 2 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 19 | `haystack_validate` | `serial_numbers?: int[]` | `{ passed, warnings: [{ point_id, issue }], errors: [{ point_id, issue }] }` |
| 20 | `haystack_export` | `serial_numbers: int[]`, `format: "haystack-json"\|"brick-ttl"\|"brick-jsonld"` | Format-specific model dump |

### 3.6 Rules Management — 2 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 21 | `rule_toggle` | `rule_id: int`, `enabled: boolean` | `{ rule_id, rule_name, enabled }` |
| 22 | `rule_create` | `pattern: string`, `haystack_tags: string[]`, `category: "haystack"\|"brick"`, `priority?: int`, `brick_class?: string`, `units?: string`, `object_types?: string` | `{ rule_id, rule_name, pattern, category, haystack_tags, enabled }` |

### 3.7 Alarms & Trends — 3 tools (new)

| # | Tool | Input | Output |
|---|---|---|---|
| 23 | `alarm_list` | `serial_numbers?: int[]`, `active_only?: boolean` | `[{ alarm_id, serial_number, name, severity, message, timestamp, acknowledged, acknowledged_at }]` |
| 24 | `alarm_acknowledge` | `serial_number: int`, `alarm_id: int` | `{ success, acknowledged_at }` |
| 25 | `trendlog_query` | `serial_number: int`, `point_type: string`, `point_index: int`, `start: ISO8601`, `end?: ISO8601`, `limit?: int` | `{ serial_number, point_type, point_index, label, engineering_units, data: [{ timestamp, value }] }` |

---

## 4. Naming Convention

| Prefix | Scope | Count |
|---|---|---|
| (none) | Server-level | 3 |
| `haystack_` | Ontology: tags, Brick, auto-tagging, validation, export | 9 |
| `device_` | Device inventory + points | 3 |
| `point_` | Live values: read, write, batch, metadata | 5 |
| `rule_` | Auto-tagging rule CRUD | 2 |
| `metadata_` | Cross-point search | 1 |
| `alarm_` | Alarm query + acknowledge | 2 |
| `trendlog_` | Historical data | 1 |

---

## 5. Protocol

JSON-RPC 2.0 over `POST /api/mcp`. Unchanged from v3.

```
Request:
{ "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "<tool>", "arguments": { ... } } }

Response (success):
{ "jsonrpc": "2.0", "id": 1,
  "result": { "content": [{ "type": "text", "text": "<json>" }] } }

Response (error):
{ "jsonrpc": "2.0", "id": 1,
  "error": { "code": -32602, "message": "..." } }
```

Standard JSON-RPC methods: `initialize`, `tools/list`, `tools/call`.

---

## 6. Safety: Write Confirmation

`point_write` and `point_write_batch` reject writes to OUTPUT/VARIABLE points unless `confirm: true` is set. INPUT points are exempt.

| `confirm` | OUTPUT/VARIABLE | INPUT |
|---|---|---|
| `false` | ❌ Error | ✅ Accepted |
| `true` | ✅ Accepted | ✅ Accepted |

---

## 7. Validation Rules (`haystack_validate`)

| Rule | Condition | Severity |
|---|---|---|
| `sensor` → INPUT | Point tagged `sensor` must be INPUT type | error |
| `cmd` → OUTPUT | Point tagged `cmd` must be OUTPUT type | error |
| `air` disambiguation | Tag `air` present without `temp`/`humidity`/`pressure`/`flow`/`quality` | warning |
| Brick type consistency | Brick class implies sensor → must be INPUT; implies actuator → must be OUTPUT | error |
| Orphaned tags | Tag in `HAYSTACK_POINT_TAGS` not in `HAYSTACK_TAGS` | warning |

---

## 8. Export Formats (`haystack_export`)

| Format | MIME | Structure |
|---|---|---|
| `haystack-json` | `application/json` | `[{ id, dis, tags: { ... } }]` — Project Haystack v4 |
| `brick-ttl` | `text/turtle` | `@prefix brick: <https://brickschema.org/schema/Brick#> .` — OWL/RDF |
| `brick-jsonld` | `application/ld+json` | `{ "@context": {...}, "@graph": [...] }` — JSON-LD |

---

## 9. Implementation

### 9.1 Module: `api/src/haystack/mcp.rs`

| Section | Change |
|---|---|
| `TOOLS` lazy_static | Append 18 new `ToolDef` entries |
| `handle_request` match | Add 18 arms to `"tools/call"` branch |
| New `async fn handle_*` | 18 handler functions |

### 9.2 Service Dependencies

| Tool | Calls |
|---|---|
| `ping`, `get_version`, `describe_tool` | Static / `TOOLS` array |
| `device_list` | `T3DeviceService` |
| `device_get_points`, `point_get_metadata` | Point tables + `tags_service` + Brick class query |
| `metadata_search` | `tags_service::search_points` |
| `point_read`, `point_read_batch` | FFI action=17 |
| `point_write`, `point_write_batch` | FFI action=16 |
| `haystack_validate` | `HAYSTACK_POINT_TAGS` + `HAYSTACK_POINT_BRICK_CLASS` + point tables |
| `haystack_export` | All tagged points → serialize |
| `rule_toggle`, `rule_create` | `auto_tagging_service` |
| `alarm_list`, `alarm_acknowledge` | Alarm tables |
| `trendlog_query` | `T3TrendlogDataService` |

### 9.3 Files Not Touched

- `api/src/server.rs` — no route changes (MCP already registered)
- `api/src/t3_device/` — no changes (existing services used as-is)
- `api/src/haystack/tags_routes.rs` — no changes
- `api/src/haystack/auto_tagging_routes.rs` — no changes
- `api/src/haystack/tags_service.rs` — no changes
- `api/src/haystack/auto_tagging_service.rs` — no changes
- All frontend files — no changes
- All database migrations — no changes
- `tools/t3000-mcp-bridge.js` — no changes

---

## 10. Database Tables (unchanged)

| Table | Rows (approx) |
|---|---|
| `HAYSTACK_TAGS` | 719 |
| `HAYSTACK_TAG_RELATIONS` | ~800 |
| `HAYSTACK_POINT_TAGS` | 533 |
| `HAYSTACK_POINT_BRICK_CLASS` | ~533 |
| `HAYSTACK_AUTO_TAGGING_RULES` | 228 |
| `INPUTS` / `OUTPUTS` / `VARIABLES` | ~192 per device |
| `ALARMS` | device-dependent |
| `TRENDLOG_DATA` | device-dependent |

---

*Version 4.0 — 2026-07-20*
