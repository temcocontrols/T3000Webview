# MCP API Examples

> ⬅️ [Back to MCP Server tab](/#/t3000/auto-tagging#mcp)

Natural-language prompt examples for all 25 MCP tools. Copy any prompt below and paste into Copilot Chat or Claude.

---

## Haystack Tagging (7 tools)

**What Haystack tags are available?**
*`haystack_list_tags`* — List all tag definitions with categories and docs

**Show me all Haystack tags in the brick category**
*`haystack_list_tags`* — Filter tags by category

**What tags are assigned to device 233626?**
*`haystack_get_point_tags`* — Get all tags assigned to a device's points

**Get tags for the INPUT points on device 237219**
*`haystack_get_point_tags`* — Filter by point type

**Search for all temperature sensors**
*`haystack_search_points`* — Find points that have specific tags

**Find outside air temperature sensors**
*`haystack_search_points`* — Search by outside, air, temp, sensor tags

**Auto-tag device 233626**
*`haystack_auto_tag`* — Run auto-tagging on devices

**Auto-tag all my devices: 233626, 237219, 240488**
*`haystack_auto_tag`* — Batch auto-tag multiple devices

**Preview what tags would be assigned to device 240488**
*`haystack_preview_tags`* — Dry-run without writing to DB

**List the Haystack auto-tagging rules**
*`haystack_list_rules`* — Show all auto-tagging regex rules

**What Brick class does input 8 on device 237219 have?**
*`haystack_get_brick_class`* — Get Brick ontology class for points

---

## Core (3 tools)

**Is the T3000 MCP server running?**
*`ping`* — Health check

**What version is the MCP server?**
*`get_version`* — Server name, version, protocol version

**Describe the device_list tool**
*`describe_tool`* — Get full input schema for any tool

---

## Data & Metadata (4 tools)

**List all T3000 devices**
*`device_list`* — Enumerate all devices

**Find devices named T3-NB-ESP**
*`device_list`* — Filter devices by name substring

**Show me the input points for device T3-NB-ESP**
*`device_get_points`* — Get all points for a device

**Show all VARIABLE points on device 233626**
*`device_get_points`* — Filter by point type

**Get full metadata for input 0 on device 240488**
*`point_get_metadata`* — Full metadata for one point

**Search for points labeled temperature**
*`metadata_search`* — Search points by label across devices

**Search for flow across all output points**
*`metadata_search`* — Search with type filter

---

## Operational — Read/Write (4 tools)

**Read input point 0 on device 233626**
*`point_read`* — Read a single point value

**What's the current value of output 3 on device 237219?**
*`point_read`* — Read an output point

**Set output 5 on device 233626 to 72.5**
*`point_write`* — Write a value (requires confirm)

**Read inputs 0, 1, and 2 on device 240488 all at once**
*`point_read_batch`* — Read multiple points at once

**Set outputs 0 through 3 on device 237219 to 100**
*`point_write_batch`* — Write multiple points (requires confirm)

---

## Analytics (2 tools)

**Validate the Haystack tags on device 237219**
*`haystack_validate`* — Check tagging for errors and conflicts

**Validate tagging across all devices**
*`haystack_validate`* — Omit serial_numbers for all-device check

**Export device 233626 as Brick Turtle RDF**
*`haystack_export`* — Export to brick-ttl format

**Export all three devices as Haystack JSON**
*`haystack_export`* — Export to haystack-json format

**Export device 240488 as Brick JSON-LD**
*`haystack_export`* — Export to brick-jsonld format

---

## Rules Management (2 tools)

**Disable auto-tagging rule 5**
*`rule_toggle`* — Enable or disable a tagging rule

**Enable rule 3**
*`rule_toggle`* — Re-enable a rule

**Create a rule that tags any point with CO2 in the label as air, co2, sensor**
*`rule_create`* — Create a new auto-tagging rule

**Add a Brick rule to classify ZoneTemp labels as Zone_Air_Temperature_Sensor**
*`rule_create`* — Create a Brick classification rule

---

## Alarms & Trends (3 tools)

**List all active alarms**
*`alarm_list`* — List alarms, optionally filtered to active-only

**Show me alarms for device 233626**
*`alarm_list`* — Filter alarms by device

**Acknowledge alarm abc123 on device 233626**
*`alarm_acknowledge`* — Acknowledge an alarm

**Get trend data for input 8 on device 237219 for the last hour**
*`trendlog_query`* — Query historical trend data

**Show me trend data for variable 0 on device 240488 from yesterday to now**
*`trendlog_query`* — Custom date range

**Get the last 100 readings for output 2 on device 233626**
*`trendlog_query`* — Limit data points

---

## Quick Test

After setup, try these two to confirm everything works:

**List the Haystack auto-tagging rules**
*`haystack_list_rules`*

**Show me the input points for device T3-NB-ESP**
*`device_get_points`*
