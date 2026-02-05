# Settings Basic Information - Database Field Mapping

This document maps all fields in the Settings Basic Information tab to their corresponding database table columns.

## Database Support Status: ✅ COMPLETE

All required fields exist in the database across three tables:
- **HARDWARE_INFO** - Device hardware and firmware information (read-only)
- **PROTOCOL_SETTINGS** - Protocol configuration (editable)
- **NETWORK_SETTINGS** - Network configuration (editable)
- **DEVICES** - General device information

---

## Device Information (Left Panel - Read Only)

| UI Field | Database Mapping | Data Type | Notes |
|----------|------------------|-----------|-------|
| **Module Number** | HARDWARE_INFO.Mini_Type | INTEGER | Maps to Mini_Type enum |
| **Hardware Version** | HARDWARE_INFO.Hardware_Rev | TEXT | Format: "REV X.X" |
| **MCU Version** | HARDWARE_INFO.Firmware0_Rev_Main + Firmware0_Rev_Sub | INTEGER + INTEGER | Format: "X.Y" (Main.Sub) |
| **PIC Version** | HARDWARE_INFO.Firmware1_Rev | INTEGER | Firmware slot 1 |
| **Top Version** | HARDWARE_INFO.Firmware2_Rev | INTEGER | Firmware slot 2 |
| **Bootloader Version** | HARDWARE_INFO.Bootloader_Rev | INTEGER | Bootloader revision |
| **MCU Type** | HARDWARE_INFO.Panel_Type | INTEGER | Panel type enum |
| **SD Card** | HARDWARE_INFO.SD_Exist | INTEGER | 0=Not Present, 1=Present |

**Note**: All Device Information fields are READ-ONLY and pulled from HARDWARE_INFO table.

---

## Panel Information (Right Panel - Editable)

| UI Field | Database Mapping | Data Type | Notes |
|----------|------------------|-----------|-------|
| **Bacnet Instance** | PROTOCOL_SETTINGS.Object_Instance | INTEGER | BACnet Device Object Instance |
| **Serial Number** | DEVICES.SerialNumber | INTEGER | Primary Key (read-only in UI) |
| **MAC Address** | NETWORK_SETTINGS.MAC_Address | TEXT | Format: "00:11:22:33:44:55" |
| **MSTP Network** | PROTOCOL_SETTINGS.MSTP_Network_Number | INTEGER | BACnet MSTP Network Number |
| **Modbus RTU ID** | PROTOCOL_SETTINGS.Modbus_ID | INTEGER | Modbus slave address (1-247) |
| **BACnet MSTP MAC** | PROTOCOL_SETTINGS.MSTP_ID | INTEGER | BACnet MSTP MAC address (0-127) |
| **BIP Network** | PROTOCOL_SETTINGS.Network_Number | INTEGER | BACnet/IP Network Number |
| **Max Master** | PROTOCOL_SETTINGS.Max_Master | INTEGER | Max Master (0-127) |
| **Panel Number** | DEVICES.Panel_Number | INTEGER | Panel ID in system |
| **Panel Name** | DEVICES.PanelId | TEXT | Panel name/identifier |

**Note**: Most Panel Information fields are EDITABLE and stored across PROTOCOL_SETTINGS, NETWORK_SETTINGS, and DEVICES tables.

---

## LCD Options (Radio Buttons)

**Storage**: ✅ Implemented in FEATURE_FLAGS table
- **Field**: LCD_Mode INTEGER (0=Always On, 1=Off, 2=Delay)
- **Field**: LCD_Delay_Seconds INTEGER (delay value in seconds when mode=2)
- **Default Values**: LCD_Mode=0, LCD_Delay_Seconds=30

**Database Columns**:
```sql
LCD_Mode INTEGER DEFAULT 0
LCD_Delay_Seconds INTEGER DEFAULT 30
```

---

## Actions (Buttons)

These are API commands that don't require database fields:
- ✅ **Identify Device** - API command to flash LED/identify hardware
- ✅ **Clear Device** - API command to reset device configuration
- ✅ **Clear Subnet Database** - API command to clear subnet cache
- ✅ **Reboot Device** - API command to restart device
- ✅ **Done** - UI action to save changes and close

---

## Database Table Schemas

### HARDWARE_INFO (Device Information Source)
```sql
CREATE TABLE HARDWARE_INFO (
    SerialNumber INTEGER PRIMARY KEY,
    Hardware_Rev TEXT,
    Firmware0_Rev_Main INTEGER,    -- MCU Version Main
    Firmware0_Rev_Sub INTEGER,     -- MCU Version Sub
    Firmware1_Rev INTEGER,         -- PIC Version
    Firmware2_Rev INTEGER,         -- Top Version
    Firmware3_Rev INTEGER,
    Bootloader_Rev INTEGER,
    Mini_Type INTEGER,             -- Module Number
    Panel_Type INTEGER,            -- MCU Type
    USB_Mode INTEGER,
    SD_Exist INTEGER,              -- SD Card status
    Zigbee_Exist INTEGER,
    Zigbee_PanID INTEGER,
    SN_High INTEGER,
    SN_Low INTEGER,
    created_at TEXT,
    updated_at TEXT
)
```

### PROTOCOL_SETTINGS (Panel Information Source)
```sql
CREATE TABLE PROTOCOL_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    Modbus_ID INTEGER,             -- Modbus RTU ID
    Modbus_Port INTEGER,
    MSTP_ID INTEGER,               -- BACnet MSTP MAC
    MSTP_Network_Number INTEGER,   -- MSTP Network
    Max_Master INTEGER,            -- Max Master
    Object_Instance INTEGER,       -- Bacnet Instance
    Network_Number INTEGER,        -- BIP Network
    UDP_Port INTEGER,
    created_at TEXT,
    updated_at TEXT
)
```

### NETWORK_SETTINGS (MAC Address Source)
```sql
CREATE TABLE NETWORK_SETTINGS (
    SerialNumber INTEGER PRIMARY KEY,
    IP_Address TEXT,
    Subnet TEXT,
    Gateway TEXT,
    MAC_Address TEXT,              -- MAC Address
    TCP_Type INTEGER,
    created_at TEXT,
    updated_at TEXT
)
```

### DEVICES (General Information)
```sql
CREATE TABLE DEVICES (
    SerialNumber INTEGER PRIMARY KEY,
    PanelId TEXT,                  -- Panel Name
    Panel_Number INTEGER,          -- Panel Number
    ip_address TEXT,
    port INTEGER,
    bacnet_mstp_mac_id INTEGER,
    modbus_address INTEGER,
    -- ... (26 total columns)
)
```

---

## Implementation Notes

### Data Loading Strategy
1. **Join Three Tables** on SerialNumber:
   - HARDWARE_INFO (device info - read-only)
   - PROTOCOL_SETTINGS (protocol config - editable)
   - NETWORK_SETTINGS (MAC address - editable)
   - DEVICES (panel name/number - editable)

2. **API Endpoints Needed**:
   - `GET /api/devices/:serialNumber/basic-info` - Fetch all data (JOIN query)
   - `PUT /api/devices/:serialNumber/panel-info` - Update editable fields
   - `POST /api/devices/:serialNumber/identify` - Identify device
   - `POST /api/devices/:serialNumber/clear` - Clear device
   - `POST /api/devices/:serialNumber/clear-subnet` - Clear subnet database
   - `POST /api/devices/:serialNumber/reboot` - Reboot device

3. **Form Validation**:
   - Modbus RTU ID: 1-247
   - BACnet MSTP MAC: 0-127
   - Max Master: 0-127
   - MAC Address: Valid MAC format (XX:XX:XX:XX:XX:XX)

---

## Missing Fields

✅ **LCD Options** - Successfully added to FEATURE_FLAGS table:
```sql
ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Mode INTEGER DEFAULT 0;
ALTER TABLE FEATURE_FLAGS ADD COLUMN LCD_Delay_Seconds INTEGER DEFAULT 30;
```

**Status**: Database schema complete. All fields implemented.

---

## Summary

✅ **20/20 fields** have database support
✅ Device Information (8 fields) → HARDWARE_INFO table
✅ Panel Information (10 fields) → PROTOCOL_SETTINGS + NETWORK_SETTINGS + DEVICES tables
✅ LCD Options (2 fields) → FEATURE_FLAGS table (LCD_Mode, LCD_Delay_Seconds)
✅ Actions → API commands (no database fields needed)

**Conclusion**: Database structure fully supports the Settings Basic Information tab. All fields implemented and ready for use.
