# T3000 Haystack & Brick Auto-Tagging + MCP — Design Document

---

## 1. Overview

### 1.1 Why

T3000 devices expose raw BACnet points: `Device 1001, AI-5, name="OAT", value=72.3`. Humans and LLMs cannot understand what this point represents without additional context. Vendor platforms (JCI OpenBlue, Honeywell Forge, Siemens Building X) each provide their own proprietary semantic layers, locked inside their ecosystems. Independent MSIs running mixed-vendor portfolios have no standard way to make their building data AI-readable.

### 1.2 Purpose

Add a semantic tagging layer on top of T3000's existing point data that:

- Automatically assigns Haystack tags (`[outside, air, temp]`) and Brick classes (`Outside_Air_Temperature_Sensor`) to every device point
- Exposes tagged data to LLM agents via MCP, enabling natural language queries like "Why is AHU-3 not cooling?"
- Keeps all logic local (no cloud dependency, no credentials egress)

### 1.3 Concepts Used

| Concept | Source | Role |
|---|---|---|
| **Haystack** | [Project Haystack](https://project-haystack.org/) (2011) | Flat tag vocabulary — `point`, `sensor`, `outside`, `air`, `temp` |
| **Brick** | [Brick Schema](https://brickschema.org/) (2016, UC Berkeley) | Formal class hierarchy — `Outside_Air_Temperature_Sensor isA Sensor isA Point` |
| **YAML Rules** | [brick-bacnet-mcp](https://github.com/Yveshby27/brick-bacnet-mcp) (Yves Habchy, 2026) | Regex patterns mapping point names → tags + classes |
| **MCP** | [Model Context Protocol](https://modelcontextprotocol.io/) (Anthropic, 2024) | JSON-RPC/stdio protocol for LLM agent tool access |

### 1.4 How It Integrates With T3000

T3000 v2 already has Haystack tagging (manual assignment, basic auto-tagging). V3 adds:

```
v2 (current)                          v3 (planned)
───────────                           ───────────
Hardcoded auto_tag_point()      →     Rules table + regex engine
Haystack tags only              →     + Brick class per point
POST /api/haystack/rebuild      →     /api/haystack/auto-tagging/run
No MCP                          →     MCP server (4 tools over stdio)
No rules management UI          →     Auto-Tagging & MCP page (4 tabs)
```

### 1.5 End-to-End Flow

```
1. DEVICE SYNC
   C++ FFI → INPUTS/OUTPUTS/VARIABLES tables updated

2. AUTO-TAGGING (on FFI sync or manual trigger)
   For each point: read name + units + type
   → Match against AUTO_TAGGING_RULES (priority order)
   → Assign: haystack_tags[] + brick_class + haystack_kind + haystack_unit
   → Write to HAYSTACK_POINT_TAGS

3. WEB UI
   Auto-Tagging & MCP page → manage rules, run tagging, view MCP status
   Inputs/Outputs/Variables pages → Tags column shows tags + Brick badge

4. MCP SERVER
   Tools query HAYSTACK_POINT_TAGS + point tables
   Returns semantic-tagged data via JSON-RPC/stdio

5. LLM AGENT
   User: "What's the outside air temperature?"
   Agent → get_tagged_topology(filter_brick="Outside_Air_Temperature_Sensor")
        → Returns: 72.3°F
```

---

## 2. Architecture Diagram

```
BACnet/Modbus ──→ C++ FFI ──→ SQLite DB
                                 │
                   ┌─────────────┼─────────────┐
                   │             │             │
              INPUTS table  OUTPUTS table  VARIABLES table
                   │             │             │
                   └─────────────┼─────────────┘
                                 │
                         ┌───────▼────────┐
                         │  Auto-Tagging  │   Regex engine
                         │    Engine      │   (AUTO_TAGGING_RULES)
                         └───────┬────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                                     │
    HAYSTACK_POINT_TAGS                    AUTO_TAGGING_RULES
    (tags + brick_class column)            (68 default rules seeded)
              │                                     │
    ┌─────────┴──────────┐              ┌──────────┴──────────┐
    │   React Frontend    │              │    MCP Server       │
    │  • Auto-Tagging &   │              │  • list_devices     │
    │    MCP page         │              │  • list_objects     │
    │  • Tags column on   │              │  • get_object_value │
    │    point pages      │              │  • get_tagged       │
    │                     │              │    _topology        │
    └────────────────────┘              └─────────────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │  LLM Agent   │
                                        │  (Claude)    │
                                        └─────────────┘
```

---

## 3. Database Schema

### 3.1 Changes to Existing

`HAYSTACK_POINT_TAGS` gets one new column:

```sql
ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN brick_class TEXT;
```

All v2 tables unchanged (`HAYSTACK_TAGS`, `HAYSTACK_TAG_RELATIONS`).

### 3.2 New Table — AUTO_TAGGING_RULES

```sql
CREATE TABLE AUTO_TAGGING_RULES (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    rule_name     TEXT NOT NULL UNIQUE,
    category      TEXT NOT NULL CHECK(category IN ('haystack','brick')),
    pattern       TEXT NOT NULL,
    units         TEXT,
    object_types  TEXT,
    haystack_tags TEXT,
    brick_class   TEXT,
    haystack_kind TEXT,
    haystack_unit TEXT,
    enabled       INTEGER NOT NULL DEFAULT 1,
    priority      INTEGER NOT NULL DEFAULT 0,
    created_at    TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at    TEXT DEFAULT CURRENT_TIMESTAMP
);
```

### 3.3 Seed Data (68 Rules)

Migration inserts 68 default rules. Source: `brick-bacnet-mcp` YAML files.

| Category | Count | Pattern Coverage |
|---|---|---|
| `brick` | 37 | Outside/Supply/Return/Zone/Mixed Air Temp, Humidity, CO2, Fan, Damper, VAV, Valve, Setpoint, Occupancy |
| `haystack` | 31 | Same coverage, outputting tag sets + kind + unit |

**Rule examples:**

```
rule_name:    brick:oat
category:     brick
pattern:      (?i)(oat|outside[_ ]?air[_ ]?temp)
units:        degF,degC
brick_class:  Outside_Air_Temperature_Sensor

rule_name:    hs:oat
category:     haystack
pattern:      (?i)(oat|outside[_ ]?air[_ ]?temp)
units:        degF,degC
haystack_tags: point,sensor,outside,air,temp
haystack_kind: Number
haystack_unit: °F
```

---

## 4. Rule Engine

**File:** `api/src/haystack/auto_tagging_service.rs`

### 4.1 Matching Algorithm

```
tag_point(point_name, point_units, point_type) → (brick_class, haystack_tags, kind, unit)

  1. Fetch all rules WHERE enabled=1 ORDER BY priority ASC
  2. Initialize: brick_class = None, haystack_tags = [], kind = None, unit = None

  3. For each rule:
     a. If rule.object_types is set AND point_type not in it → skip
     b. If regex does not match point_name → skip
     c. If rule.units is set AND point_units not in it → skip
     d. If rule.category = 'brick' AND brick_class is None: set brick_class = rule.brick_class
     e. If rule.category = 'haystack' AND haystack_tags is empty: set haystack_tags, kind, unit
     f. If both brick_class AND haystack_tags are set → break (both categories matched)

  4. Return (brick_class, haystack_tags, kind, unit)
  5. Caller writes to HAYSTACK_POINT_TAGS
```

### 4.2 Triggers

| Trigger | Code Path |
|---|---|
| FFI sync (per row) | `t3_ffi_sync_service.rs` → `auto_tagging_service::tag_point()` |
| Manual "Run Auto-Tagging" | `POST /api/haystack/auto-tagging/run` → clears existing tags → re-tags all points |
| Toggle state | `POST /api/haystack/auto-tagging/toggle` sets global flag; FFI sync checks flag before calling tag engine |

### 4.3 Test Rule

`POST /api/haystack/auto-tagging/test` accepts a sample point + rule and returns the match result without writing to DB. Used by the frontend "Test Rule" button.

---

## 5. API Routes

### 5.1 Existing (Unchanged from v2)

All v2 routes remain under `/api/haystack/` — tags CRUD, point-tags read/write, tag-tree, replace-tag, sync. See [v2-haystack-current-implementation.md](./v2-haystack-current-implementation.md) §3.

### 5.2 Auto-Tagging Routes

**File:** `api/src/haystack/auto_tagging_routes.rs`

| Route | Method | Input | Output |
|---|---|---|---|
| `/api/haystack/auto-tagging/rules` | GET | Query: `?category=haystack\|brick` | `{ rules: TaggingRule[], total: N }` |
| `/api/haystack/auto-tagging/rules` | POST | `{ rule_name, category, pattern, units?, object_types?, haystack_tags?, brick_class?, haystack_kind?, haystack_unit?, priority? }` | `{ id, message }` |
| `/api/haystack/auto-tagging/rules/:id` | PUT | Partial rule fields | `{ message }` |
| `/api/haystack/auto-tagging/rules/:id` | DELETE | — | `{ message }` |
| `/api/haystack/auto-tagging/test` | POST | `{ rule: partial rule, sample: { point_name, point_units, point_type } }` | `{ matched: bool, output: { brick_class?, haystack_tags?, kind?, unit? } }` |
| `/api/haystack/auto-tagging/run` | POST | `{ serial_numbers: [i32] }` | `{ success, message, points_tagged: N }` |
| `/api/haystack/auto-tagging/coverage` | POST | `{ serial_numbers: [i32] }` | `{ total_points, tagged_points, coverage_pct, brick_tagged, haystack_tagged, unmatched: [{ label, count }] }` |
| `/api/haystack/auto-tagging/toggle` | POST | `{ enabled: bool }` | `{ enabled, message }` |

---

## 6. MCP Server

**Files:** `api/src/haystack/mcp/server.rs`, `api/src/haystack/mcp/tools.rs`

### 6.1 Transport

- Protocol: JSON-RPC 2.0 over stdio (MCP specification)
- Startup: Embedded in Rust binary, launched with `--mcp` flag
- Auto-discovery: Registered as `t3000` MCP server

### 6.2 Tools

| Tool | Input Schema | SQL / Data Source |
|---|---|---|
| `list_devices` | `{}` | `SELECT serial_number, product_name, panel_number, is_online FROM DEVICES WHERE is_online = 1` |
| `list_objects` | `{ serial_number: i32 }` | UNION of INPUTS, OUTPUTS, VARIABLES for serial + LEFT JOIN HAYSTACK_POINT_TAGS |
| `get_object_value` | `{ serial_number: i32, point_type: string, point_index: string }` | Single row from point table + tags join |
| `get_tagged_topology` | `{ filter_tags?: string[], filter_brick?: string }` | Points table + HAYSTACK_POINT_TAGS WHERE tag_name IN (filter) OR brick_class = filter |

### 6.3 Tool Output Format

```json
// list_objects response
{
  "device": { "serial_number": 237219, "name": "T3-XX-ESP111" },
  "points": [
    {
      "point_id": "dev237219.in5",
      "point_type": "INPUT",
      "point_index": "5",
      "label": "OAT Sensor",
      "value": 72.3,
      "units": "degF",
      "haystack_tags": ["point", "sensor", "outside", "air", "temp"],
      "brick_class": "Outside_Air_Temperature_Sensor",
      "haystack_kind": "Number",
      "haystack_unit": "°F"
    }
  ]
}
```

### 6.4 Agent Configuration

```json
// Claude Desktop: claude_desktop_config.json
{
  "mcpServers": {
    "t3000": {
      "command": "t3000-webview",
      "args": ["--mcp"]
    }
  }
}
```

---

## 7. Frontend

### 7.1 New Page — Auto-Tagging & MCP

| Property | Value |
|---|---|
| URL | `/t3000/auto-tagging-mcp` |
| Component | `src/t3-react/features/haystack/pages/AutoTaggingMcpPage.tsx` |
| Store | Extends `haystackStore.ts` with `autoTaggingRules`, `mcpStatus` state |
| Menu | Haystack → Auto-Tagging & MCP |

**Tabs:**

| Tab | Content | Data Source |
|---|---|---|
| Brick Classes | Searchable reference table | `GET /api/haystack/brick-classes` |
| Haystack Rules | CRUD table — `category=haystack` rules | `GET/POST/PUT/DELETE /api/haystack/auto-tagging/rules` |
| Brick Rules | CRUD table — `category=brick` rules | Same endpoints, filtered by category |
| MCP Server | Status, tool list, restart, log viewer | `GET /api/mcp/status` |

**Persistent status bar across all tabs:**

```
Auto-Tagging [ON ●───]  Device: T3-XX-ESP111  Tagged: 156/192 (81%)
[Run Auto-Tagging]  [View Coverage Report]
```

### 7.2 Existing Pages — Additions

| Page | Change | Component |
|---|---|---|
| Inputs page | Tags column: add `brick_class` badge | `TagsColumnCell.tsx` |
| Outputs page | Same | Same |
| Variables page | Same | Same |
| Tags Drawer | Add Brick class dropdown | Tag drawer component |

### 7.3 Menu & Routes

**Menu config:** `src/t3-react/config/menuConfig.ts`
```
Haystack ▼
  ├── Standard Tags       (/t3000/haystack-tags)
  ├── Custom Tags         (/t3000/custom-tags)
  └── Auto-Tagging & MCP  (/t3000/auto-tagging-mcp)
```

**Routes:** `src/t3-react/app/router/routes.ts`
```
/t3000/auto-tagging-mcp  →  AutoTaggingMcpPage
```

---

## 8. Rust Code Structure

```
api/src/haystack/                          ← new dedicated module
  ├── mod.rs
  ├── tags_service.rs                      ← moved from t3_device/
  ├── tags_routes.rs                       ← moved from t3_device/
  ├── auto_tagging_service.rs              ← rule engine + rules CRUD
  ├── auto_tagging_routes.rs               ← 8 API handlers
  ├── brick_class_service.rs               ← brick reference queries
  ├── mcp/
  │   ├── mod.rs
  │   ├── server.rs                        ← MCP stdio transport
  │   └── tools.rs                         ← 4 tool implementations
  └── tests/
      └── auto_tagging_tests.rs

Files to move:
  api/src/t3_device/haystack_tags_service.rs  →  api/src/haystack/tags_service.rs
  api/src/t3_device/haystack_tags_routes.rs   →  api/src/haystack/tags_routes.rs

Files to update (import paths):
  api/src/server.rs                   ← route registration
  api/src/t3_device/mod.rs            ← remove mod declarations
  api/src/t3_device/t3_ffi_sync_service.rs  ← auto_tag_point import

Migration:
  api/migration/src/m20260715_add_auto_tagging_rules.rs
  Registers in T3DeviceMigrator (webview_t3_device.db)
```

---

## 9. Migration

**Migration file:** `m20260715_add_auto_tagging_rules`

Operations executed on `webview_t3_device.db`:

```sql
-- 1. New table
CREATE TABLE IF NOT EXISTS AUTO_TAGGING_RULES ( ... );

-- 2. Alter existing
ALTER TABLE HAYSTACK_POINT_TAGS ADD COLUMN brick_class TEXT;

-- 3. Seed rules (68 INSERT statements)
INSERT INTO AUTO_TAGGING_RULES (rule_name, category, pattern, units, ...) VALUES
  ('brick:oat', 'brick', '(?i)(oat|outside[_ ]?air[_ ]?temp)', 'degF,degC', ...),
  ('hs:oat', 'haystack', '(?i)(oat|outside[_ ]?air[_ ]?temp)', 'degF,degC', ...),
  -- ... 66 more
```

---

## 10. Related Documents

| Document | Link |
|---|---|
| Haystack v2 Implementation Guide | [v2-haystack-current-implementation.md](./v2-haystack-current-implementation.md) |
| Haystack v1 (deprecated) | [v1-haystack-legacy-single-table.md](./v1-haystack-legacy-single-table.md) |
| Brick Schema | [https://brickschema.org/](https://brickschema.org/) |
| brick-bacnet-mcp (upstream) | [https://github.com/Yveshby27/brick-bacnet-mcp](https://github.com/Yveshby27/brick-bacnet-mcp) |
