# T3000 Settings - Basic Information Tab Structure (CORRECT)

## VISUAL LAYOUT

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Device Settings - Basic Information                                                   │
├─────────────────────────────────────────┬──────────────────────────────────────────────┤
│  Device Information                     │  Panel Information                           │
│  (Read-Only)                            │  (Editable)                                  │
├─────────────────────────────────────────┼──────────────────────────────────────────────┤
│  Module Number:       12345             │  Bacnet Instance:      [ 237219  ]           │
│  Hardware Version:    26                │  Serial Number:        237219 (read-only)    │
│  MCU Version:         65.6              │  MAC Address:          00:1A:2B:3C:4D:5E     │
│  PIC Version:         1.2               │  MSTP Network:         [    0    ]           │
│  Top Version:         3.4               │                                              │
│  Bootloader Version:  5.6               │  Modbus RTU ID         [    1    ]           │
│  MCU Type:            0x74              │  Bacnet MSTP MAC                             │
│  SD Card Status:      Normal            │                                              │
│                                         │  BIP Network:          [ 65535   ]           │
│                                         │  Max Master:           [   127   ]           │
│                                         │  Panel Number:         [    1    ]           │
│                                         │  Panel Name:           [T3-BB-ESP]           │
└─────────────────────────────────────────┴──────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  LCD Options                                                                            │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  ○ LCD Always On       ● LCD Always Off       ○ LCD Delay Off [ 30 ] (s)              │
│                                                                                         │
│  [Parameter]    [Advanced Settings]                                                    │
└────────────────────────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────────────────────────┐
│  Actions                                                                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│  [Identify Device         ]  [Clear Device]  [Clear Subnet Database]                  │
│   Flash LEDs/LCD for 5s                                                                │
│                                                                                         │
│  [Reboot Device]  [Done]                                                               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## FIELD DEFINITIONS

### 1. Device Information Panel (Left - Read Only)

| Field               | Description                           | Data Source                                      |
|---------------------|---------------------------------------|--------------------------------------------------|
| Module Number       | Hardware module identifier            | `Device_Basic_Setting.reg.module_number`         |
| Hardware Version    | Hardware revision number              | `Device_Basic_Setting.reg.pro_info.harware_rev`  |
| MCU Version         | Main CPU firmware version             | `Device_Basic_Setting.reg.pro_info.mcu_version`  |
| PIC Version         | PIC microcontroller firmware          | `Device_Basic_Setting.reg.pro_info.pic_version`  |
| Top Version         | Top board firmware version            | `Device_Basic_Setting.reg.pro_info.top_version`  |
| Bootloader Version  | Bootloader firmware version           | `Device_Basic_Setting.reg.pro_info.bootloader_version` |
| MCU Type            | Microcontroller type (hex)            | `T3_chip_type` (format: 0xXX)                    |
| SD Card Status      | SD card presence/status               | `Device_Basic_Setting.reg.sd_exist`              |

**SD Card Status Values:**
- `0` = "No SD Card"
- `1` = "Normal"
- `2` = "File System Error"

---

### 2. Panel Information Panel (Right - Editable)

| Field                 | Description                              | Data Source                                      |
|-----------------------|------------------------------------------|--------------------------------------------------|
| Bacnet Instance       | BACnet Object Instance ID                | `Device_Basic_Setting.reg.Object_Instance`       |
| Serial Number         | Device serial number (read-only)         | `Device_Basic_Setting.reg.n_serial_number`       |
| MAC Address           | Network MAC address (read-only)          | `Device_Basic_Setting.reg.mac_addr` (6 bytes)    |
| MSTP Network          | BACnet MSTP network number               | `Device_Basic_Setting.reg.MSTP_Network_Number`   |
| Modbus RTU ID         | Modbus RTU device ID (1-247)             | `Device_Basic_Setting.reg.Modbus_ID`             |
| Bacnet MSTP MAC       | BACnet MSTP MAC address (0-127)          | `Device_Basic_Setting.reg.MSTP_ID`               |
| BIP Network           | BACnet/IP network number                 | `Device_Basic_Setting.reg.Network_Number`        |
| Max Master            | MSTP Max Master (default 127)            | `Device_Basic_Setting.reg.Max_Master`            |
| Panel Number          | Local panel identifier                   | `Device_Basic_Setting.reg.panel_number`          |
| Panel Name            | Custom panel name (max 20 chars)         | `Device_Basic_Setting.reg.panel_name`            |

**Note:** "Modbus RTU ID / Bacnet MSTP MAC" appears as a single field with label breakdown showing both purposes.

---

### 3. LCD Options Section (Bottom)

| Option              | Description                              | Data Value                                       |
|---------------------|------------------------------------------|--------------------------------------------------|
| LCD Always On       | Display always powered                   | `Device_Basic_Setting.reg.LCD_Display = 255`     |
| LCD Always Off      | Display always off                       | `Device_Basic_Setting.reg.LCD_Display = 0`       |
| LCD Delay Off       | Display off after delay (seconds)        | `Device_Basic_Setting.reg.LCD_Display = 1-254`   |

**Additional Buttons:**
- **Parameter** - Opens parameter configuration dialog
- **Advanced Settings** - Opens advanced LCD settings

---

### 4. Action Buttons (Bottom)

| Button                  | Action                                              |
|-------------------------|-----------------------------------------------------|
| Identify Device         | Flash LEDs/LCD for 5 seconds to locate device       |
| Clear Device            | Clear device configuration data                      |
| Clear Subnet Database   | Clear subnet routing/discovery database              |
| Reboot Device           | Restart the controller                               |
| Done                    | Save changes and close dialog                        |

---

## IMPLEMENTATION NOTES

### Layout Structure
1. **Two-column grid** for Device Info (left) and Panel Info (right)
2. **Full-width section** for LCD Options
3. **Full-width section** for Action Buttons

### Read-Only vs Editable
- **Device Information**: All fields read-only (gray background)
- **Panel Information**: Most fields editable, Serial Number and MAC Address read-only
- **LCD Options**: Radio buttons (mutually exclusive)

### Field Formatting
- **MAC Address**: Format as `XX:XX:XX:XX:XX:XX`
- **MCU Type**: Format as `0xXX` (hexadecimal)
- **Versions**: Format as `XX.X` (e.g., 65.6)
- **LCD Delay**: Integer seconds (1-254)

### Validation Rules
- **Modbus RTU ID**: Range 1-247
- **Bacnet MSTP MAC**: Range 0-127
- **Max Master**: Default 127, range 0-127
- **Panel Name**: Max 20 characters
- **BIP Network**: 16-bit unsigned integer (0-65535)
- **LCD Delay**: 1-254 seconds

---

## DATA SOURCE MAPPING

### API Endpoints Required

1. **GET** `/api/t3_device/devices/{serialNumber}/basic_settings`
   - Returns all `Device_Basic_Setting.reg` fields

2. **PUT** `/api/t3_device/devices/{serialNumber}/basic_settings`
   - Updates editable fields in Panel Information
   - Updates LCD Display settings

3. **POST** `/api/t3_device/devices/{serialNumber}/identify`
   - Triggers LED/LCD flash

4. **POST** `/api/t3_device/devices/{serialNumber}/clear`
   - Clears device configuration

5. **POST** `/api/t3_device/devices/{serialNumber}/reboot`
   - Reboots the device

---

## CURRENT vs CORRECT COMPARISON

### ❌ Current Implementation Issues
1. Missing Module Number field
2. Missing PIC Version, Top Version, Bootloader Version
3. Serial Number in wrong panel (should be in Panel Info)
4. MAC Address not shown
5. "Modbus RTU ID / Bacnet MSTP MAC" label breakdown not implemented
6. LCD options not using radio buttons (using switches instead)
7. Missing Parameter and Advanced Settings buttons
8. Missing all action buttons (Identify, Clear Device, etc.)
9. Wrong button labels (OK/Cancel instead of Done)

### ✅ What Needs to be Added
1. Complete Device Information panel (8 fields)
2. Complete Panel Information panel (10 fields)
3. LCD radio button group with delay input
4. Parameter and Advanced Settings buttons
5. Five action buttons with proper labels

---

**This is the CORRECT structure from C++ T3000. Ready to implement?**
