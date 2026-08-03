## Claude Desktop MCP Setup

> ⬅️ [Back to MCP Server tab](/#/t3000/auto-tagging#mcp)

Connect Claude Desktop to the T3000 MCP server to let Claude query devices, read/write points, manage Haystack tags, and run analytics.

Covers: **Claude Desktop**, **Cursor**, **Cline**, **Continue.dev** — all use the same `mcp-remote` approach.

---

## Prerequisites

- T3000 API running on port `9103`
- <a href="https://nodejs.org/" target="_blank">Node.js</a> installed (provides `npx`)
- Claude Desktop installed

---

## Step 1: Open Claude Settings

Open Claude Desktop → **Settings** → **Developer** → **Edit Config**

| | |
|---|---|
| ![Settings](images/claude1.png) | ![Config](images/claude2.png) |

---

## Step 2: Paste the Config

Replace `<host>` with `localhost` (local) or the machine's LAN IP (remote):

```json
{
  "mcpServers": {
    "T3000": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://<host>:9103/api/mcp",
        "--allow-http"
      ]
    }
  }
}
```

Example for local:
```json
{
  "mcpServers": {
    "T3000": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "http://localhost:9103/api/mcp",
        "--allow-http"
      ]
    }
  }
}
```

| | |
|---|---|
| ![Settings](images/claude3.png) | ![Config](images/claude4.png) |

---

## Step 3: Restart Claude Desktop

Close and reopen Claude Desktop. On first run, `npx` will automatically download `mcp-remote`.

---

## Step 4: Verify Connection

Look for the 🔌 **plug icon** in Claude's interface — it confirms the MCP server is connected.

---

## Step 5: Try a Query

Ask Claude any of these:

| Query | Expected Tool |
|---|---|
| *List the Haystack auto-tagging rules* | `t3000_haystack_list_rules` |
| *Show me the input points for device T3-NB-ESP* | `t3000_device_get_points` |

See the full [MCP API examples](/#/t3000/documentation/t3000/haystack/mcp-api-examples) for all 44 tools with prompt text.

---

## Other Clients

| Client | Config Location | Config Format |
|---|---|---|
| **Cursor** | `.cursor/mcp.json` | Same as Claude Desktop |
| **Cline** | MCP Servers view in VS Code | Same as Claude Desktop |
| **Continue.dev** | `config.json` | Same as Claude Desktop |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `npx` not found | Install Node.js from <a href="https://nodejs.org/" target="_blank">nodejs.org</a> |
| Connection refused | Ensure T3000 API is running on port 9103 |
| Tools not appearing | Check Claude logs: `Help` → `View Logs` |
| 44 tools expected | Verify you see all 11 categories: Haystack, Core, Data, Operational, Analytics, Rules, Alarms, Device Ops, Settings, Control Logic, Documentation |

---

## Available Tools (44)

| Category | Tools |
|---|---|
| **Haystack** | `t3000_haystack_list_tags`, `t3000_haystack_get_point_tags`, `t3000_haystack_search_points`, `t3000_haystack_auto_tag`, `t3000_haystack_preview_tags`, `t3000_haystack_list_rules`, `t3000_haystack_get_brick_class` |
| **Core** | `t3000_ping`, `t3000_get_version`, `t3000_describe_tool` |
| **Data & Metadata** | `t3000_device_list`, `t3000_device_get_points`, `t3000_point_get_metadata`, `t3000_metadata_search`, `t3000_point_search` |
| **Operational** | `t3000_point_read`, `t3000_point_write`, `t3000_point_read_batch`, `t3000_point_write_batch`, `t3000_point_batch_metadata` |
| **Analytics** | `t3000_haystack_validate`, `t3000_haystack_export` |
| **Rules** | `t3000_rule_toggle`, `t3000_rule_create` |
| **Alarms & Trends** | `t3000_alarm_list`, `t3000_alarm_acknowledge`, `t3000_trendlog_query` |
| **Device Operations** | `t3000_trendlog_list`, `t3000_trendlog_export`, `t3000_device_refresh`, `t3000_schedule_list` |
| **Settings** | `t3000_settings_read`, `t3000_settings_write`, `t3000_device_control` |
| **Control Logic** | `t3000_program_list`, `t3000_program_read`, `t3000_alarm_settings_read`, `t3000_users_list`, `t3000_graphics_list` |
| **Documentation** | `t3000_doc_list`, `t3000_doc_read`, `t3000_pid_list`, `t3000_holiday_list`, `t3000_building_summary` |


| | |
|---|---|
| ![Settings](images/claude5.png) | ![Config](images/claude6.png) |
