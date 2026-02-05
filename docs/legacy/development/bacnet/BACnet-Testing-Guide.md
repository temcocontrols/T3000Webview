# BACnet Tool Testing Guide

**Date:** July 30, 2025
**Purpose:** Validate BACnet tool functionality after fixing the missing executable issue

## Test Results Summary

### ✅ **Fixed Issues**
- **BacnetExplore.exe Missing**: Copied from debug folder to main T3000 directory
- **File Size**: 1,702,912 bytes (1.7MB)
- **Last Modified**: October 21, 2024

### 🧪 **Test Procedures**

#### Test 1: BACnet Menu Launch
```
1. Launch T3000 application
2. Go to Tools > BACnet menu
3. Verify YABE (Yet Another BACnet Explorer) launches
4. Check for any error dialogs or failures
```

**Expected Result**: YABE application should open showing BACnet device discovery interface

#### Test 2: T3-TB Device Discovery
```
1. In YABE, click "Add Device" or "Discover"
2. Perform WHO-IS broadcast on network
3. Look for devices with Vendor ID 644 (Temco Controls)
4. Identify T3-TB devices (types 84, 203)
```

**Expected Device Types:**
- **T3-TB (Device Type 84)**: 8 Digital Inputs + 8 Digital Outputs
- **T3-TB-11I (Device Type 203)**: 11 Analog Inputs

#### Test 3: Object Enumeration
```
1. Select discovered T3-TB device
2. Expand device tree to show objects
3. Verify object types match expected configuration:
   - T3-TB: DI 0-7, DO 0-7
   - T3-TB-11I: AI 0-10
```

#### Test 4: Property Reading
```
1. Select an object (e.g., AI0, DI0)
2. Read Present_Value property
3. Verify successful BACnet communication
4. Check ReadPropertyMultiple support
```

#### Test 5: Trend Log Functionality
```
1. Look for OBJECT_TRENDLOG objects on devices
2. Test ReadRange functionality for trend logs
3. Verify TrendLogDisplay.cs visualization works
```

## Network Configuration

### BACnet/IP Settings
- **Default Port**: 47808
- **Broadcast Address**: 255.255.255.255 (or network-specific)
- **Device Instance Range**: 0-4194303

### T3-TB Network Requirements
- **IP Address**: Static or DHCP assigned
- **Subnet**: Same as T3000 workstation
- **Firewall**: UDP port 47808 must be open

## Troubleshooting Common Issues

### Issue 1: No Devices Discovered
**Possible Causes:**
- Network connectivity issues
- Firewall blocking UDP 47808
- T3-TB devices not configured for BACnet/IP
- Wrong network broadcast address

**Solution Steps:**
1. Verify ping connectivity to T3-TB devices
2. Check Windows Firewall settings
3. Confirm T3-TB BACnet configuration
4. Try direct device IP instead of broadcast

### Issue 2: Communication Timeouts
**Possible Causes:**
- Device busy with other BACnet clients
- Network congestion
- Device configuration issues

**Solution Steps:**
1. Increase timeout values in YABE
2. Reduce concurrent requests
3. Check device documentation

### Issue 3: ReadPropertyMultiple Not Supported
**Possible Causes:**
- Older firmware on T3-TB devices
- Device configuration limitations

**Solution Steps:**
1. Fall back to individual ReadProperty calls
2. Update device firmware if available
3. Test with smaller property lists

## Integration Planning

### WebView Integration Points
Based on existing T3000 infrastructure, plan integration of BACnet functionality:

1. **WebView Message Types**: Extend `WEBVIEW_MESSAGE_TYPE` enum
2. **Handler Functions**: Add BACnet cases to `HandleWebViewMsg()`
3. **Database Integration**: Use existing CppSQLite3 patterns
4. **UI Components**: Leverage existing trend log visualization

### Data Flow Architecture
```
T3-TB Devices (BACnet/IP)
    ↓ (WHO-IS/I-AM)
YABE Discovery
    ↓ (Device List)
T3000 WebView Handler
    ↓ (JSON Messages)
Vue.js Frontend
    ↓ (User Configuration)
Polling Engine
    ↓ (ReadPropertyMultiple)
SQLite Database
    ↓ (Trend Data)
Chart.js Visualization
```

### Database Schema Extensions
```sql
-- Extend existing T3000 Building table
ALTER TABLE Building ADD COLUMN bacnet_device_instance INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_vendor_id INTEGER;
ALTER TABLE Building ADD COLUMN supports_block_read INTEGER DEFAULT 0;

-- New BACnet-specific tables
CREATE TABLE bacnet_objects (
    object_id INTEGER PRIMARY KEY,
    building_id INTEGER REFERENCES Building(Unique_ID),
    object_type TEXT NOT NULL, -- 'AI', 'DI', 'DO'
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    poll_enabled INTEGER DEFAULT 1
);

CREATE TABLE bacnet_sensor_data (
    id INTEGER PRIMARY KEY,
    timestamp INTEGER DEFAULT (strftime('%s', 'now')),
    object_id INTEGER REFERENCES bacnet_objects(object_id),
    value REAL,
    quality TEXT DEFAULT 'good'
);
```

## Next Action Items

### Immediate (This Week)
1. **✅ Execute Test Procedures**: Run all 5 test procedures above
2. **Document Results**: Record actual device discovery and communication results
3. **Identify Limitations**: Note any issues with existing YABE functionality

### Short-term (Next 2 Weeks)
1. **Plan WebView Integration**: Design message protocol extensions
2. **Database Schema**: Implement BACnet table extensions
3. **Proof of Concept**: Create simple BACnet device polling demo

### Medium-term (Next Month)
1. **Full Integration**: Replace external YABE with integrated WebView solution
2. **T3-TB Optimization**: Device-specific polling and configuration
3. **Production Testing**: Validate with actual building systems

---

**Status**: Ready for testing - BACnet tool executable issue resolved
**Next Step**: Execute Test Procedure 1 (BACnet Menu Launch)
**Success Criteria**: YABE launches successfully and can discover T3-TB devices
