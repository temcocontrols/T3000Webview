## VS Code Copilot MCP Setup

> ⬅️ [Back to MCP Server tab](/#/t3000/auto-tagging#mcp)

Connect VS Code Copilot to the T3000 MCP server to let Copilot query devices, read/write points, and manage Haystack tags.

---

## Prerequisites

- T3000 API running on port `9103`
- <a href="https://marketplace.visualstudio.com/items?itemName=GitHub.copilot" target="_blank">GitHub Copilot extension</a> installed in VS Code (includes built-in MCP support)

---

## Step 1: Create MCP Config

In your project root, create `.vscode/mcp.json`. For global access across all projects, place it at `C:\Users\<username>\AppData\Roaming\Code\User\mcp.json` (Windows) or `~/.config/Code/User/mcp.json` (macOS/Linux).

```json
{
  "servers": {
    "T3000": {
      "type": "http",
      "url": "http://<host>:9103/api/mcp"
    }
  }
}
```

Replace `<host>` with `localhost` (local) or the machine's LAN IP (remote).

> **Note:** VS Code uses `"servers"` (not `"mcpServers"` like Claude Desktop).

| | |
|---|---|
| ![Settings](images/vscode1.png) | ![Config](images/vscode2.png) |


---

## Step 2: Reload VS Code

Press `Ctrl+Shift+P` → type **Reload Window** → press Enter.

---

## Step 3: Verify Connection

Press `Ctrl+Shift+P` → type **MCP: List Servers** → press Enter.

Confirm the `T3000` server shows as **connected**. If it shows an error or "disconnected", check that:
- The T3000 API is running on port 9103
- The URL in `mcp.json` is reachable (ping the host)

| | |
|---|---|
| ![Settings](images/vscode3.png) | ![Config](images/vscode4.png) |

---

## Step 4: Try a Query

Open Copilot Chat and test any tool:

| Ask Copilot | Expected Tool |
|---|---|
| *List the Haystack auto-tagging rules* | `t3000_haystack_list_rules` |
| *Show me the input points for device T3-NB-ESP* | `t3000_device_get_points` |

See the full [MCP API examples](/#/t3000/documentation/t3000/haystack/mcp-api-examples) for all 44 tools with prompt text.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| 44 tools not appearing | Reload VS Code window (`Ctrl+Shift+P` → Reload Window) |
| Connection refused | Ensure T3000 API is running on port 9103 |
| Config not picked up | Verify file is at `.vscode/mcp.json` (not `mcpServers`) |
| Tools list but calls fail | Check T3000 API logs for errors |

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
