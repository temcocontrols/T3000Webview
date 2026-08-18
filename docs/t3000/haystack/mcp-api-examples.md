# MCP API Examples

> ⬅️ [Back to MCP Server tab](/#/t3000/auto-tagging#mcp) &nbsp;|&nbsp; [Setup: VS Code Copilot](/#/t3000/documentation/t3000/haystack/mcp-vscode-copilot) &nbsp;|&nbsp; [Setup: Claude Desktop](/#/t3000/documentation/t3000/haystack/mcp-claude-desktop)

Complete reference of natural-language prompts for 50+ MCP tools across 16 categories. Copy any prompt and paste into Copilot Chat or Claude — the LLM automatically maps your question to the right tool and parameters.

---

## Haystack Tagging <span style="font-weight:400;font-size:12px;color:#888">7 tools</span>

### `t3000_haystack_list_tags` — Discover available tags

Discover the full Haystack tag vocabulary. Tags are organized by category: `haystack` (standard v4 tags like `air`, `sensor`, `temp`), `brick` (Brick ontology classes), and `custom` (user-defined). Returns tag names, descriptions, parent relationships, and how many points use each tag.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What Haystack tags are available?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all Haystack tags in the brick category**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List custom tags defined in the system**

</div>

</div>

### `t3000_haystack_get_point_tags` — Get tags assigned to points

Retrieve all Haystack tags assigned to specific device points. Filter by device serial number and optionally by point type (INPUT, OUTPUT, VARIABLE). Returns a flat list of point→tag assignments showing what semantic meaning each point carries.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What tags are assigned to device 233626?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Get tags for the INPUT points on device 237219**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all tags for OUTPUT points on devices 233626 and 240488**

</div>

</div>

### `t3000_haystack_search_points` — Find points by tags

Search across all devices for points that have specific combinations of Haystack tags. Points must match ALL specified tags. Use this to find all temperature sensors, all outside air points, all command points, etc. Optionally restrict by device serials or point types.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Search for all temperature sensors**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Find outside air temperature sensors**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all humidity sensors on device 237219**

</div>

</div>

### `t3000_haystack_auto_tag` — Run auto-tagging

Apply the auto-tagging engine to devices. First applies range-based rules (digital/analog, engineering units, value ranges), then regex rules that match point labels. Assigns Haystack tags AND Brick ontology classes to every point. Returns the count of points tagged.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Auto-tag device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Auto-tag all my devices: 233626, 237219, 240488**

</div>

</div>

### `t3000_haystack_preview_tags` — Preview tags without saving

See exactly what tags and Brick classes would be assigned by auto-tagging BEFORE writing to the database. Essential for testing new rules or verifying tag assignments. Returns full preview with tags, Brick class, and the rule that matched for each point.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Preview what tags would be assigned to device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me a preview of auto-tagging for device 233626 without applying**

</div>

</div>

### `t3000_haystack_list_rules` — Show all tagging rules

Lists every auto-tagging rule in the system with its regex pattern, target tags, Brick class (if any), category, priority, and enabled/disabled status. Currently 248 rules covering Haystack v4 tags and Brick ontology classes.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List the Haystack auto-tagging rules**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all enabled tagging rules in the brick category**

</div>

</div>

### `t3000_haystack_get_brick_class` — Get Brick ontology classes

Brick is a formal ontology for buildings (brickschema.org). After auto-tagging, each point gets a Brick class like `Supply_Air_Temperature_Sensor` or `Outside_Air_Flow_Sensor`. Use this to check what Brick classes are assigned to your device points.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What Brick class does input 8 on device 237219 have?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show all Brick classes for device 233626**

</div>

</div>

---

## Data & Discovery <span style="font-weight:400;font-size:12px;color:#888">6 tools</span>

### `t3000_device_list` — Enumerate all devices

Get every T3000 device in the system with serial number, name, device type, building/floor/room, and counts of INPUT, OUTPUT, and VARIABLE points. Optionally filter by device name substring or refresh the device list to discover new devices on the network.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all T3000 devices**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Find devices named T3-NB-ESP**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**How many devices are in this system?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Refresh device list to discover new devices**

</div>

</div>

### `t3000_scan_network` — Scan network for T3000 devices

Scan the local network for T3000 devices via UDP broadcast (0x64/0x65 protocol). Returns discovered devices with serial numbers, IP addresses, product types, firmware versions, panel names, and subnet info. Takes 5–10 seconds. Use this to discover new or replacement devices on the network.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Scan the network for T3000 devices**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Discover any new T3000 panels on the network**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Find all T3000 devices on my LAN**

</div>

</div>

### `t3000_device_get_points` — Get all points for a device

Returns every point on a device — labels, engineering units, Haystack tags, and Brick classes. Optionally filter by point type to get only INPUTs, OUTPUTs, or VARIABLEs.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the input points for device T3-NB-ESP**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show all VARIABLE points on device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all points on device 240488**

</div>

</div>

### `t3000_point_get_metadata` — Full metadata for one point

Deep-dive into a single point: label, full label, engineering units, range (low/high), description, digital vs analog, all Haystack tags, and Brick class. Useful when you need to understand exactly what a point represents.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Get full metadata for input 0 on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What are the units and range for output 3 on device 237219?**

</div>

</div>

### `t3000_metadata_search` — Cross-device label search

Search point labels across all devices by keyword. Matches against point labels, full labels, and descriptions. Optionally filter by device serials and point types. Great for finding all points related to "temperature", "flow", "pressure", etc.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Search for points labeled temperature**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Search for flow across all output points**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Find all points with fan in the name on device 233626**

</div>

</div>

### `t3000_point_search` — Semantic point search

Search points across devices using natural language. Matches against point labels, Haystack tags, Brick classes, and descriptions. Returns ranked results by relevance. Much smarter than label search — "supply air temperature" matches `Supply_Air_Temperature_Sensor` even if the label is abbreviated.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Find the temperature sensor in the lobby**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all fan speed outputs**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Search for discharge air temperature on device 233626**

</div>

</div>

---

## Operational — Read/Write <span style="font-weight:400;font-size:12px;color:#888">5 tools</span>

### `t3000_point_read` — Read a single point value

Read the current (last synced) value of any point from the database. Returns the value, engineering units, label, and timestamp of the last reading.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read input point 0 on device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What's the current value of output 3 on device 237219?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read variable 12 on device 240488**

</div>

</div>

### `t3000_point_write` — Write to any point field

Write to any writable field on a point. Defaults to `value` (fValue). Also supports: `label`, `description`, `range`, `auto_manual`, `digital_analog`. All other fields are preserved from the current device state. **Safety:** requires `confirm: true` for OUTPUT and VARIABLE points. Writes go through the C++ FFI layer to the actual device.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Set output 5 on device 233626 to 72.5**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Turn on output 7 on device 237219**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Rename input 2 on device 240488 to "ZoneTemp"**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Change description of output 3 to "Main Fan Speed"**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Set the range of variable 0 on device 233626 to 100**

</div>

</div>

### `t3000_point_read_batch` — Read multiple points at once

Read values for multiple points in a single call. Points can span different devices and point types. Much faster than calling `t3000_point_read` repeatedly for bulk operations.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read inputs 0, 1, and 2 on device 240488 all at once**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read input 0 on 233626 and output 0 on 237219 together**

</div>

</div>

### `t3000_point_write_batch` — Write multiple points at once

Write values to multiple points in a single call. Each point can specify an optional `field` (defaults to `value`). Failures are reported per-point; partial success is supported. Requires `confirm: true`. Points can span different devices.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Set outputs 0 through 3 on device 237219 to 100**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Set output 1 to 80 and rename it to "PumpSpeed"**

</div>

</div>

### `t3000_point_batch_metadata` — Get full metadata for multiple points

Get complete metadata for multiple points in a single call. Returns label, engineering units, range, digital/analog type, description, current value, Haystack tags, and Brick class for each point. Much more efficient than calling `t3000_point_get_metadata` N times — use when you need full context on several points at once.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Give me full metadata for inputs 0 through 4 on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What are the tags, units, and ranges for output 0 of device 233626 and input 1 of device 237219?**

</div>

</div>

---

## Device Operations <span style="font-weight:400;font-size:12px;color:#888">7 tools</span>

### `t3000_trendlog_list` — Discover available trendlogs

List all trendlogs configured for a device. Returns trendlog IDs, labels, logging interval, buffer size, and how many points each trendlog tracks. Use this to discover what historical data is available before querying with `t3000_trendlog_query`.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What trendlogs are available on device 240488?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all logging configurations for device 233626**

</div>

</div>

### `t3000_trendlog_export` — Export trendlog history as CSV/JSON

Export all historical data from a trendlog in one call. Queries every point in the trendlog and returns timestamped values. Use after `t3000_trendlog_list` to discover trendlog IDs. Defaults to CSV format with columns: timestamp, point_type, point_index, point_id, value, units, range, digital_analog.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export trendlog 1 from device 240488 as CSV for the last 24 hours**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export all trendlog data from device 233626 trendlog 0 as JSON since 2026-01-01**

</div>

</div>

### `t3000_device_refresh` — Force refresh from hardware

Refresh point data directly from the physical device via the C++ FFI layer (Action 17). Updates the database with the latest values from the hardware. Optionally filter by point type to refresh only inputs, outputs, or variables.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Refresh all data from device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Refresh only the inputs on device 233626**

</div>

</div>

### `t3000_schedule_list` — List device schedules

List all schedules configured on a device. Returns schedule IDs, daily time settings for each day of the week (Monday–Friday), assigned outputs/variables, holiday settings, and interval configuration.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the schedules on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What time-based automation is configured on device 233626?**

</div>

</div>

### `t3000_settings_read` — Read device settings

Read all device configuration from the database. Returns 8 categories: network (IP/subnet/gateway/DHCP), communication (COM ports/baudrates/parity/stopbits), time (timezone/NTP/DST), protocol (Modbus ID/MSTP/BACnet), DynDNS, hardware info, feature flags, and email settings. Optionally filter to a single category.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read all settings for device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the network configuration of device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What are the communication settings for device 240488?**

</div>

</div>

### `t3000_settings_write` — Update device settings

Update device configuration fields. Supports network (ip_address, subnet, gateway, tcp_type), communication (com0/1/2_config, com_baudrate0/1/2), time (time_zone, enable_sntp, sntp_server), and email (smtp_server, email_address, etc.). Requires confirm:true.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Set device 240488 to use DHCP**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Change the NTP server on device 233626 to pool.ntp.org**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Configure COM1 on device 240488 as Modbus Slave at 19200 baud**

</div>

</div>

### `t3000_device_control` — Reboot or factory reset

Send control commands to a device: reboot (restart the controller) or reset_defaults (factory reset to default settings). Requires confirm:true for safety.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Reboot device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Factory reset device 233626**

</div>

</div>

---

## Control Logic <span style="font-weight:400;font-size:12px;color:#888">5 tools</span>

### `t3000_program_list` — List PLC programs

List all control logic programs running on a device. Returns program IDs, labels, status (running/stopped), auto/manual mode, program size, and switch node. Use before `t3000_program_read` to find which programs exist.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all programs on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What control logic is running on device 233626?**

</div>

</div>

### `t3000_program_read` — Read program source code

Read a specific PLC program's full details including source code (truncated to 2000 chars), label, status, auto/manual mode, size, and switch node. The full source length is included in the response.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the source code of program 1 on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What does program 'MAIN_LOOP' on device 233626 do?**

</div>

</div>

### `t3000_pid_list` — List PID control loops

List all PID control loops on a device. Returns loop IDs, current setpoint, process variable (input value), output value, P/I/D tuning parameters (proportional, reset, rate), bias, action type, auto/manual mode, setpoint limits, and status. Essential for HVAC diagnostics.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all PID loops on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the tuning parameters for the PID loops on device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Which PID loops are in manual mode?**

</div>

</div>

### `t3000_holiday_list` — List holiday exceptions

List all holiday schedule exceptions on a device. Returns holiday IDs, dates (month/day/year), holiday output values, auto/manual mode, and status. Holidays override the normal weekly schedule on their designated dates.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List holiday schedules on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What holiday exceptions are configured on device 233626?**

</div>

</div>

### `t3000_building_summary` — System-wide overview

Get a one-shot dashboard of the entire building automation system. Returns total device count with names, active alarm count, total trendlogs, schedules, programs, and PID loops across all devices. Includes a health indicator (good/warning/critical based on alarm count). Perfect for "How's the building?" queries.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**How is the building doing right now?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Give me a system overview**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Are there any active alarms in the system?**

</div>

</div>

---

## Diagnostics <span style="font-weight:400;font-size:12px;color:#888">2 tools</span>

### `t3000_device_diagnostics` — Single device health check

Run a comprehensive diagnostic check on a single device. Returns: device name, firmware version, hardware revision, IP address, point counts (inputs/outputs/variables), active alarm count, trendlog count, program status (total/running), schedule count, PID loop status (total/in-auto), and an overall health rating (good/warning/needs_attention).

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Run diagnostics on device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Check the health of device 240488**

</div>

</div>

### `t3000_device_diagnostics_batch` — Multi-device health check

Run diagnostics on multiple devices or all devices at once. Returns per-device health reports plus an overall building health summary (good/warning/needs_attention). Pass no serial_numbers to diagnose everything. Use for system-wide health assessments.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Check the health of all devices**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Run diagnostics on devices 233626, 237219, and 240488**

</div>

</div>

---

## Config & Users <span style="font-weight:400;font-size:12px;color:#888">3 tools</span>

### `t3000_alarm_settings_read` — Read alarm thresholds

Read alarm threshold configuration for a device. Returns alarm rules: which points are monitored, the comparison condition, low/high/normal/way-low/way-high threshold values, and time delays. This is alarm configuration — use `t3000_alarm_list` for active alarms.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read alarm threshold settings for device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What alarm rules are configured on device 233626?**

</div>

</div>

### `t3000_users_list` — List device users

List all users configured on a device. Returns user IDs, names, access levels (View/Full/Graphic/Routine), rights, default panel/group assignments, and status.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all users on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Who has access to device 233626?**

</div>

</div>

### `t3000_graphics_list` — List graphic screens

List all graphic/HMI screens available on a device. Returns graphic IDs, labels, descriptions, picture files, total points per screen, and switch nodes.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List graphic screens on device 240488**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What HMI screens are available on device 233626?**

</div>

</div>

---

## Documentation <span style="font-weight:400;font-size:12px;color:#888">2 tools</span>

### `t3000_doc_list` — List documentation topics

List all T3000 documentation topics organized by section: Quick Start, Architecture, Device Management, Data Points, Features, API Reference, Guides, Building Platform, and Haystack & MCP. Use to discover what docs exist before reading a specific one.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What documentation is available?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the API reference docs**

</div>

</div>

### `t3000_doc_read` — Read a documentation page

Read the full markdown content of a T3000 documentation page. Pass the path from `t3000_doc_list` (e.g. `quick-start/overview` or `haystack/mcp-api-examples`). Fetches from local filesystem in dev mode, falls back to GitHub raw in production.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the MCP API examples documentation**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Read the quick start guide**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What does the troubleshooting guide say about connection issues?**

</div>

</div>

---

## Core <span style="font-weight:400;font-size:12px;color:#888">3 tools</span>

### `t3000_ping` — Health check

Simple connectivity test. Returns server status, current timestamp, and server name.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Is the T3000 MCP server running?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Ping the MCP server**

</div>

</div>

### `t3000_get_version` — Server metadata

Returns server name, version number, MCP protocol version (2025-03-26), and total tool count.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What version is the MCP server?**

</div>

</div>

### `t3000_describe_tool` — Tool documentation

Get the complete input schema, description, and parameter details for any tool by name. Useful for LLM agents to understand tool capabilities before calling.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Describe the device_list tool**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What parameters does trendlog_query accept?**

</div>

</div>

---

## Analytics & Export <span style="font-weight:400;font-size:12px;color:#888">2 tools</span>

### `t3000_haystack_validate` — Validate tagging quality

Run ontology validation rules against tagged points. Checks for: sensor tags on non-INPUT points, command tags on non-OUTPUT points, missing required tags, conflicting tag combinations, invalid Brick class assignments, and orphaned tag references. Returns warnings and errors.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Validate the Haystack tags on device 237219**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Validate tagging across all devices**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Are there any tagging errors in device 233626?**

</div>

</div>

### `t3000_haystack_export` — Export semantic model

Export the full semantic model for devices in standard formats. **haystack-json**: Project Haystack tagged entity format. **brick-ttl**: Brick ontology in Turtle RDF (W3C standard). **brick-jsonld**: Brick ontology in JSON-LD (linked data). **csv-flat**: Flat CSV table of all points with serial_number, point_type, point_index, label, description, current value, units, range, digital/analog, Haystack tags, and Brick class. Use for integration with other building systems or semantic analysis tools.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export device 233626 as Brick Turtle RDF**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export all three devices as Haystack JSON**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export device 240488 as Brick JSON-LD**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Export device 233626 as a flat CSV spreadsheet**

</div>

</div>

---

## Rules Management <span style="font-weight:400;font-size:12px;color:#888">2 tools</span>

### `t3000_rule_toggle` — Enable or disable rules

Toggle an auto-tagging rule on or off by its rule ID. Disabled rules are skipped during auto-tagging but remain in the database. Use `t3000_haystack_list_rules` to find rule IDs.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Disable auto-tagging rule 5**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Enable rule 3**

</div>

</div>

### `t3000_rule_create` — Create a new tagging rule

Add a custom auto-tagging rule. Specify a regex pattern to match point labels, the Haystack tags to assign, and optionally a Brick class. Rules can target specific point types, engineering units, or object types. Higher priority rules are applied first.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Create a rule that tags any point with CO2 in the label as air, co2, sensor**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Add a Brick rule to classify ZoneTemp labels as Zone_Air_Temperature_Sensor**

</div>

</div>

---

## Alarms & Trends <span style="font-weight:400;font-size:12px;color:#888">3 tools</span>

### `t3000_alarm_list` — List alarms

Get all alarms in the system with severity, message, timestamp, and acknowledgment status. Filter by device serials or show only unacknowledged (active) alarms.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all active alarms**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me alarms for device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Are there any unacknowledged alarms on device 237219?**

</div>

</div>

### `t3000_alarm_acknowledge` — Acknowledge an alarm

Acknowledge a specific alarm by device serial number and alarm ID. Acknowledged alarms are marked with a timestamp. Use `t3000_alarm_list` to find alarm IDs.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Acknowledge alarm abc123 on device 233626**

</div>

</div>

### `t3000_trendlog_query` — Query historical trend data

Retrieve time-series data for any point over a specified time range. Specify start and optional end time in ISO 8601 format, and limit the number of data points returned. Returns timestamp-value pairs with engineering units and point metadata.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Get trend data for input 8 on device 237219 for the last hour**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me trend data for variable 0 on device 240488 from yesterday to now**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Get the last 100 readings for output 2 on device 233626**

</div>

</div>

---

## Task Management <span style="font-weight:400;font-size:12px;color:#888">4 tools</span>

### `t3000_task_create` — Create a workflow task

Create a new task for tracking commissioning, maintenance, or troubleshooting workflows. Tasks have a title, description, status (pending/in_progress/completed), priority (low/normal/high/critical), and optional device reference.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Create a task: configure AHU-1 network settings**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Add a high-priority task to troubleshoot device 233626 alarms**

</div>

</div>

### `t3000_task_list` — List tasks

List all tasks with optional filters by status (pending, in_progress, completed) or device serial number. Returns tasks sorted by creation time, newest first.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me all pending tasks**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What tasks are associated with device 240488?**

</div>

</div>

### `t3000_task_update` — Update a task

Update a task's status, title, description, or priority. Use to mark tasks as in_progress or completed as you work through a workflow.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Mark task "Configure AHU-1" as completed**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Change priority of task "Calibrate sensors" to high**

</div>

</div>

### `t3000_task_delete` — Delete a task

Delete a task by ID. Use to clean up completed or obsolete tasks.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Delete the completed commissioning tasks**

</div>

</div>

---

## Site Memory <span style="font-weight:400;font-size:12px;color:#888">3 tools</span>

### `t3000_memory_save` — Save site knowledge

Save a note about the building site for future reference. Memories persist across sessions and are automatically loaded into the AI context. Use for site-specific conventions, device naming patterns, or user preferences.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Remember that AHU-3 is the main unit and AHU-2 is decommissioned**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Save a note: device naming convention is Building-Floor-Type-Number**

</div>

</div>

### `t3000_memory_list` — List site memories

List all saved site memories with optional filtering by category or text search. Returns memories sorted by last update time.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What do we know about this site?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me memories about AHU layout**

</div>

</div>

### `t3000_memory_delete` — Delete a memory

Delete a specific memory entry by key. Use to remove outdated or incorrect site information.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Forget the old AHU layout notes**

</div>

</div>

---

## Navigation <span style="font-weight:400;font-size:12px;color:#888">6 tools</span>

### `t3000_nav_list` — List all UI pages

List all pages in the T3000 web UI with paths, titles, keyboard shortcuts, and whether they require a device to be selected. Use to help users find the right page.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What pages are available in the T3000?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List all monitoring pages**

</div>

</div>

### `t3000_nav_search` — Search UI pages

Search for T3000 pages and topics by keyword. Returns matching pages ranked by relevance. Use when the user asks "How do I..." or "Where is..." questions about the T3000 interface.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Where do I configure PID loops?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**How do I set up schedules?**

</div>

</div>

### `t3000_nav_redirect` — Navigate to a page

Get the URL to navigate to a specific T3000 page, optionally with a device pre-selected. The frontend uses this URL to redirect the user.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Open the outputs page for device 233626**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Take me to the alarms page**

</div>

</div>

### `t3000_page_info` — Page details

Get detailed information about a T3000 page: what it does, what you can view/edit/configure, related MCP tools, keyboard shortcuts, and available features.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What can I do on the Alarms page?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Tell me about the PID Loops page**

</div>

</div>

### `t3000_device_current` — Current device context

Get the currently selected device in the web UI. Returns device type, name, and a note about its role. Use to discover which device the user is working with before querying points.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Which device am I currently working with?**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**What device is selected right now?**

</div>

</div>

### `t3000_set_chat_device` — Set the device to use for MCP operations

Confirm which device the AI should use for MCP operations. Call after the user confirms which device to work with (which may differ from the UI-selected device). This sets the authoritative chat device context.

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Use device 233626 for the rest of this conversation**

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Switch the current device to 240488**

</div>

</div>

---

## Quick Test

After setup, try these two to confirm everything works:

<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:10px;margin:10px 0">

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**List the Haystack auto-tagging rules**

<code style="font-size:11px;background:#eee;padding:1px 5px;border-radius:3px">haystack_list_rules</code>

</div>

<div style="border:1px solid #e0e0e0;border-radius:6px;padding:12px 14px;background:#fafafa">

**Show me the input points for device T3-NB-ESP**

<code style="font-size:11px;background:#eee;padding:1px 5px;border-radius:3px">device_get_points</code>

</div>

</div>
