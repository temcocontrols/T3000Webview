# Settings Page Implementation Summary

## Overview
Implemented full data binding and update flow for the Settings page with byte-level parsing of C++ structure and FFI-based device communication.

## Files Modified

### 1. settingsRefreshApi.ts
**Location:** `src/t3-react/features/settings/services/settingsRefreshApi.ts`

**Changes:**
- Replaced `parseSettingsData()` function with byte-offset based parsing
- Added byte-level parsing using documented offsets from SETTINGS_FIELD_MAPPING.md
- Parses 400-byte `All` array from response.data.device_data[0].All
- Added `serializeSettingsData()` function to convert DeviceSettings back to 400-byte array
- Implemented helper functions:
  - `bytesToIP()` - Convert 4 bytes to IP string
  - `bytesToMAC()` - Convert 6 bytes to MAC string
  - `bytesToString()` - Convert byte array to string
  - `bytesToUint16()` - Convert 2 bytes to unsigned 16-bit integer
  - `bytesToUint32()` - Convert 4 bytes to unsigned 32-bit integer
  - `bytesToInt16()` - Convert 2 bytes to signed 16-bit integer
  - `ipToBytes()` - Convert IP string to 4 bytes
  - `macToBytes()` - Convert MAC string to 6 bytes
  - `stringToBytes()` - Convert string to byte array
  - `uint16ToBytes()` - Convert unsigned 16-bit integer to 2 bytes
  - `uint32ToBytes()` - Convert unsigned 32-bit integer to 4 bytes
  - `int16ToBytes()` - Convert signed 16-bit integer to 2 bytes

**Byte Offset Mapping (examples):**
- `0-3`: IP Address (4 bytes)
- `4-7`: Subnet Mask (4 bytes)
- `8-11`: Gateway Address (4 bytes)
- `12-17`: MAC Address (6 bytes)
- `18`: TCP Type (1 byte, 0=DHCP, 1=Static)
- `52-71`: Panel Name (20 bytes string)
- `149-150`: Time Zone (2 bytes signed)
- `190-193`: Time Update Since 1970 (4 bytes)
- `195-224`: SNTP Server (30 bytes string)
- ...and 390+ more bytes documented in SETTINGS_FIELD_MAPPING.md

### 2. settingsUpdateApi.ts (NEW FILE)
**Location:** `src/t3-react/features/settings/services/settingsUpdateApi.ts`

**Features:**
- `updateDeviceSettings()` - Main update function that:
  1. Serializes DeviceSettings to 400-byte array
  2. Sends FFI request with action=16 (UPDATE_WEBVIEW_LIST)
  3. Posts to http://localhost:9103/api/t3000/ffi/call
  4. Handles response and errors

- `updateSettingsFields()` - Convenience method for partial updates

- `validateSettings()` - Validates settings before sending:
  - IP address format validation
  - MAC address format validation
  - String length validation (panel_name, sntp_server, dyndns fields)
  - Numeric range validation (panel_number, network_number, mstp_id, etc.)
  - Time zone range validation (-12:00 to +14:00)

**FFI Request Structure:**
```typescript
{
  serial_number: number,
  entry_type: 98,        // READ_SETTING_COMMAND
  action: 16,            // UPDATE_WEBVIEW_LIST
  entry_index: 0,        // Always 0 for settings
  data: {
    All: number[]        // 400-byte array
  }
}
```

### 3. SettingsPage.tsx
**Location:** `src/t3-react/features/settings/pages/SettingsPage.tsx`

**Changes:**
- Added import: `SettingsUpdateApi`
- Added state: `settings` (unified DeviceSettings object for save operations)
- Modified `fetchSettings()` to populate unified `settings` state
- Added `updateSettings()` helper function to keep settings in sync
- Updated `handleSaveNetwork()` to use FFI-based update:
  - Validates settings using `SettingsUpdateApi.validateSettings()`
  - Calls `SettingsUpdateApi.updateDeviceSettings()`
  - Refreshes settings after successful update
  - Displays success/error messages
- Updated `handleSaveCommunication()` with same pattern
- Updated `handleSaveTime()` with same pattern
- Updated `handleSaveDyndns()` with same pattern
- Updated network input onChange handlers to call `updateSettings()`:
  - IP Address → updates `ip_addr`
  - Subnet → updates `subnet`
  - Gateway → updates `gate_addr`
  - TCP Type → updates `tcp_type`

### 4. SETTINGS_FIELD_MAPPING.md (NEW FILE)
**Location:** `src/t3-react/features/settings/SETTINGS_FIELD_MAPPING.md`

**Content:**
- Complete 400-byte structure documentation
- Byte offset mapping for all fields
- Data type specifications
- UI location cross-reference
- Conversion function examples
- Dropdown value mappings
- Tab-by-tab field breakdown:
  - Basic Information (Network, Panel Info, LCD Options)
  - Communication (COM ports, UART settings)
  - Time (Time zone, SNTP, DST)
  - DynDNS (Provider, credentials, update interval)
  - User Login (documented structure)

## Data Flow

### Read Flow (Device → UI)
1. User opens Settings page or clicks Refresh
2. `SettingsRefreshApi.refreshFromDevice(serial)` called
3. FFI request with action=17 (GET_WEBVIEW_LIST), entry_type=98
4. Device responds with 400-byte array in `response.data.device_data[0].All`
5. `parseSettingsData()` extracts fields using byte offsets
6. Parsed `DeviceSettings` object stored in state
7. UI displays parsed values in form fields

### Write Flow (UI → Device)
1. User modifies field values in Settings page
2. `onChange` handlers update both separate state AND unified `settings` object
3. User clicks "Save" button
4. `validateSettings()` checks all field values
5. `serializeSettingsData()` converts DeviceSettings to 400-byte array
6. FFI POST to `/api/t3000/ffi/call` with action=16, 400-byte payload
7. Device receives and applies settings
8. UI refreshes to confirm changes

## Field Mapping Examples

### Network Settings
- **IP_Address** (UI) ↔ `ip_addr` (DeviceSettings) ↔ bytes 0-3 (C++)
- **Subnet** (UI) ↔ `subnet` (DeviceSettings) ↔ bytes 4-7 (C++)
- **Gateway** (UI) ↔ `gate_addr` (DeviceSettings) ↔ bytes 8-11 (C++)
- **MAC_Address** (UI) ↔ `mac_addr` (DeviceSettings) ↔ bytes 12-17 (C++)
- **TCP_Type** (UI) ↔ `tcp_type` (DeviceSettings) ↔ byte 18 (C++)

### Panel Information
- **Panel Name** (UI) ↔ `panel_name` (DeviceSettings) ↔ bytes 52-71 (C++)
- **Panel Number** (UI) ↔ `panel_number` (DeviceSettings) ↔ byte 73 (C++)
- **Bacnet Instance** (UI) ↔ `object_instance` (DeviceSettings) ↔ bytes 186-189 (C++)
- **Serial Number** (UI) ↔ `n_serial_number` (DeviceSettings) ↔ bytes 151-154 (C++)

### Communication Settings
- **Modbus ID** (UI) ↔ `modbus_id` (DeviceSettings) ↔ byte 185 (C++)
- **MSTP ID** (UI) ↔ `mstp_id` (DeviceSettings) ↔ byte 230 (C++)
- **COM0 Baudrate** (UI) ↔ `com_baudrate0` (DeviceSettings) ↔ byte 44 (C++)

### Time Settings
- **Time Zone** (UI) ↔ `time_zone` (DeviceSettings) ↔ bytes 149-150 (C++ signed int16)
- **SNTP Server** (UI) ↔ `sntp_server` (DeviceSettings) ↔ bytes 195-224 (C++)
- **Enable SNTP** (UI) ↔ `en_sntp` (DeviceSettings) ↔ byte 148 (C++)

### DynDNS Settings
- **Enable DynDNS** (UI) ↔ `en_dyndns` (DeviceSettings) ↔ byte 144 (C++)
- **Provider** (UI) ↔ `dyndns_provider` (DeviceSettings) ↔ byte 145 (C++)
- **Username** (UI) ↔ `dyndns_user` (DeviceSettings) ↔ bytes 74-93 (C++)
- **Password** (UI) ↔ `dyndns_pass` (DeviceSettings) ↔ bytes 94-113 (C++)
- **Domain** (UI) ↔ `dyndns_domain` (DeviceSettings) ↔ bytes 114-143 (C++)

## Validation Rules

1. **IP Addresses:** Must match format `\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}`
2. **MAC Address:** Must match format `([0-9A-F]{2}:){5}[0-9A-F]{2}`
3. **Panel Name:** Max 20 characters
4. **SNTP Server:** Max 30 characters
5. **DynDNS Username:** Max 20 characters
6. **DynDNS Password:** Max 20 characters
7. **DynDNS Domain:** Max 30 characters
8. **Panel Number:** 0-255
9. **Network Number:** 0-255
10. **MSTP ID:** 0-127
11. **Max Master:** 0-127
12. **Modbus ID:** 1-247
13. **Time Zone:** -720 to +840 minutes (-12:00 to +14:00)

## Testing Checklist

- [ ] Load settings from device successfully
- [ ] Display all fields correctly in UI
- [ ] Edit network settings (IP, subnet, gateway)
- [ ] Edit panel information (name, number, instance)
- [ ] Edit communication settings (COM ports, baudrates)
- [ ] Edit time settings (timezone, SNTP server)
- [ ] Edit DynDNS settings (provider, credentials)
- [ ] Save changes to device via FFI
- [ ] Validate input formats (IP, MAC)
- [ ] Validate numeric ranges
- [ ] Validate string lengths
- [ ] Confirm settings refresh after save
- [ ] Handle validation errors gracefully
- [ ] Handle network/FFI errors gracefully
- [ ] Test with multiple devices

## API Endpoints Used

### FFI Endpoint
- **URL:** `http://localhost:9103/api/t3000/ffi/call`
- **Method:** POST
- **Purpose:** Direct communication with C++ T3000.exe via FFI bridge

### Request Types

#### Read Settings (Action 17)
```json
{
  "serial_number": 12345,
  "entry_type": 98,
  "action": 17,
  "entry_index": 0
}
```

**Response:**
```json
{
  "data": {
    "device_data": [{
      "All": [192, 168, 0, 144, /* ...396 more bytes */ ]
    }]
  }
}
```

#### Write Settings (Action 16)
```json
{
  "serial_number": 12345,
  "entry_type": 98,
  "action": 16,
  "entry_index": 0,
  "data": {
    "All": [192, 168, 0, 144, /* ...396 more bytes */ ]
  }
}
```

## C++ Structure Reference

**File:** `T3000-Source/T3000/CM5/ud_str.h`
**Structure:** `Str_Setting_Info`
**Size:** 400 bytes

Key fields from C++ structure:
- `unsigned char ip_addr[4]` - offset 0-3
- `unsigned char subnet[4]` - offset 4-7
- `unsigned char gate_addr[4]` - offset 8-11
- `unsigned char mac_addr[6]` - offset 12-17
- `char panel_name[20]` - offset 52-71
- `short time_zone` - offset 149-150 (signed!)
- `unsigned long object_instance` - offset 186-189
- `char sntp_server[30]` - offset 195-224
- ...and many more (see SETTINGS_FIELD_MAPPING.md)

## Future Enhancements

1. **Email Tab:** Implement email notification settings
2. **User Login Tab:** Implement user authentication settings
3. **Expansion IO Tab:** Implement external I/O module configuration
4. **Real-time Validation:** Add live field validation as user types
5. **Undo/Redo:** Add support for reverting changes before save
6. **Batch Update:** Allow updating multiple tabs in single save operation
7. **Database Sync:** Optionally save to database after device update
8. **Change Detection:** Show modified indicator on unsaved fields
9. **Import/Export:** Allow exporting/importing settings as JSON file
10. **Settings Comparison:** Show diff between current and saved settings

## Known Limitations

1. MAC address field is read-only (device-specific hardware)
2. Some fields require device reboot to take effect
3. DynDNS update time is in minutes (mapped to UI hours)
4. Time zone stored in minutes offset from UTC
5. No database persistence layer (device is source of truth)
6. Settings validation is client-side only (no server validation)
7. No conflict resolution if device settings change during edit

## Architecture Decision Record

### Why FFI Direct Update?
- **Pro:** Immediate device response, no database lag
- **Pro:** Matches InputsPage pattern for consistency
- **Pro:** Simpler flow (no database sync complexity)
- **Con:** No database backup if device power loss during update

### Why Byte-Level Parsing?
- **Pro:** Exact match with C++ structure layout
- **Pro:** Future-proof for structure changes
- **Pro:** Complete documentation of data format
- **Con:** More complex than JSON parsing
- **Con:** Requires careful offset management

### Why Separate + Unified State?
- **Pro:** Maintains existing UI binding structure
- **Pro:** Allows gradual migration to unified model
- **Pro:** Type-safe form bindings per tab
- **Con:** Requires sync between two state representations
- **Con:** Potential for state inconsistency

## Related Documentation
- [SETTINGS_FIELD_MAPPING.md](./SETTINGS_FIELD_MAPPING.md) - Complete field mapping reference
- [InputsPage.tsx](../inputs/pages/InputsPage.tsx) - Similar FFI update pattern
- [T3000 ud_str.h](../../../../T3000-Source/T3000/CM5/ud_str.h) - C++ structure definition
