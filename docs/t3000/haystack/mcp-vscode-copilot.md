# VS Code Copilot MCP Setup

Connect VS Code Copilot directly to the T3000 MCP server — native HTTP support, no bridge needed.

---

## Prerequisites

- T3000 API running on port `9103`
- VS Code with GitHub Copilot extension installed

---

## Step 1: Create MCP Config

In your project root, create `.vscode/mcp.json`:

```json
{
  "servers": {
    "T3000": {
      "type": "http",
      "url": "http://localhost:9103/api/mcp"
    }
  }
}
```

For remote access, replace `localhost` with the machine's LAN IP.

> **Note:** VS Code uses `"servers"` (not `"mcpServers"` like Claude Desktop).

---

## Step 2: Reload VS Code

Press `Ctrl+Shift+P` → type **Reload Window** → press Enter.

---

## Step 3: Verify Connection

Open Copilot Chat and ask: *"List T3000 devices"*

Copilot should call the `device_list` tool and show your connected devices.

---

## Step 4: Try More Queries

| Ask Copilot | Expected Tool |
|---|---|
| *"What Haystack tags are available?"* | `haystack_list_tags` |
| *"Show me outside air temperature sensors"* | `haystack_search_points` |
| *"Auto-tag device 233626"* | `haystack_auto_tag` |
| *"Read input point 0 on device 233626"* | `point_read` |
| *"List active alarms"* | `alarm_list` |
| *"Get trend data for the last hour"* | `trendlog_query` |

---

## Troubleshooting

| Issue | Fix |
|---|---|
| 25 tools not appearing | Reload VS Code window (`Ctrl+Shift+P` → Reload Window) |
| Connection refused | Ensure T3000 API is running on port 9103 |
| Config not picked up | Verify file is at `.vscode/mcp.json` (not `mcpServers`) |
| Tools list but calls fail | Check T3000 API logs for errors |

---

## Available Tools (25)

| Category | Tools |
|---|---|
| **Haystack** | `haystack_list_tags`, `haystack_get_point_tags`, `haystack_search_points`, `haystack_auto_tag`, `haystack_preview_tags`, `haystack_list_rules`, `haystack_get_brick_class` |
| **Core** | `ping`, `get_version`, `describe_tool` |
| **Data** | `device_list`, `device_get_points`, `point_get_metadata`, `metadata_search` |
| **Operational** | `point_read`, `point_write`, `point_read_batch`, `point_write_batch` |
| **Analytics** | `haystack_validate`, `haystack_export` |
| **Rules** | `rule_toggle`, `rule_create` |
| **Alarms** | `alarm_list`, `alarm_acknowledge`, `trendlog_query` |
