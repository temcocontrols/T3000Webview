# T3000 BACnet Integration - Implementation Plan Phase 1

**Date:** July 30, 2025
**Phase:** 1 - BACnet Tool Validation & WebView Integration Planning
**Status:** ✅ BACnet Tool Fixed - Ready for Testing

## 🎯 **Immediate Next Steps (This Week)**

### **Step 1: Validate BACnet Tool Functionality**
**Priority:** HIGH - Must complete before WebView integration

#### **1.1 Test YABE Launch**
```bash
# Test sequence:
1. Launch T3000 application
2. Click Tools > BACnet menu
3. Verify YABE launches without errors
4. Document any issues or missing dependencies
```

#### **1.2 Network Device Discovery**
```bash
# Device discovery test:
1. In YABE, perform WHO-IS broadcast
2. Look for T3-TB devices (Vendor ID 644)
3. Document device types found (84, 203)
4. Test ReadProperty and ReadPropertyMultiple
```

#### **1.3 Trend Log Analysis**
```bash
# Existing trend log functionality:
1. Look for OBJECT_TRENDLOG objects
2. Test ReadRange functionality
3. Examine TrendLogDisplay.cs in action
4. Document data structures and workflows
```

### **Step 2: Plan WebView Integration Architecture**

#### **2.1 Message Protocol Design**
Based on existing `HandleWebViewMsg()` pattern, design new BACnet message types:

```cpp
// Extend existing WEBVIEW_MESSAGE_TYPE enum
enum WEBVIEW_MESSAGE_TYPE
{
    // ... existing types ...
    BACNET_DISCOVER_DEVICES = 15,        // WHO-IS broadcast
    BACNET_START_TREND_POLLING = 16,     // Begin polling T3-TB
    BACNET_STOP_TREND_POLLING = 17,      // Stop polling
    BACNET_GET_TREND_DATA = 18,          // Query stored data
    BACNET_CONFIG_DEVICE = 19,           // Configure polling settings
    BACNET_DEVICE_STATUS = 20            // Real-time device status
};
```

#### **2.2 Database Schema Extensions**
Plan extensions to existing T3000 database using CppSQLite3 patterns:

```sql
-- Phase 1: Minimal extensions to existing schema
ALTER TABLE Building ADD COLUMN bacnet_device_instance INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_vendor_id INTEGER;
ALTER TABLE Building ADD COLUMN bacnet_model_name TEXT;
ALTER TABLE Building ADD COLUMN supports_block_read INTEGER DEFAULT 0;

-- Phase 2: New BACnet-specific tables
CREATE TABLE IF NOT EXISTS bacnet_objects (
    object_id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_id INTEGER REFERENCES Building(Unique_ID),
    object_type TEXT NOT NULL,    -- 'AI', 'DI', 'DO'
    object_instance INTEGER NOT NULL,
    object_name TEXT,
    units TEXT,
    poll_interval INTEGER DEFAULT 30,
    enabled INTEGER DEFAULT 1,
    UNIQUE(building_id, object_type, object_instance)
);
```

### **Step 3: Create WebView Integration Prototype**

#### **3.1 Extend BacnetWebView.cpp**
Add new message handlers to existing framework:

```cpp
// In HandleWebViewMsg function, add new cases:
void HandleWebViewMsg(CString msg, CString &outmsg, int msg_source)
{
    // ... existing switch cases ...

    case WEBVIEW_MESSAGE_TYPE::BACNET_DISCOVER_DEVICES:
        DiscoverBACnetDevices(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_START_TREND_POLLING:
        StartBACnetTrendPolling(json, tempjson);
        break;

    case WEBVIEW_MESSAGE_TYPE::BACNET_GET_TREND_DATA:
        GetBACnetTrendData(json, tempjson);
        break;
}
```

#### **3.2 Vue.js Frontend Components**
Design BACnet device management interface:

```typescript
// BACnet device discovery component
interface BACnetDevice {
    deviceId: number;
    deviceType: number;  // 84 = T3-TB, 203 = T3-TB-11I
    ipAddress: string;
    vendorId: number;
    modelName: string;
    objects: BACnetObject[];
    pollingEnabled: boolean;
}

interface BACnetObject {
    objectType: 'AI' | 'DI' | 'DO';
    objectInstance: number;
    objectName: string;
    presentValue?: any;
    lastUpdated?: Date;
}
```

## 📋 **Implementation Checklist**

### **Week 1: Validation & Planning**
- [ ] **Test BACnet Menu**: Verify YABE launches successfully
- [ ] **Device Discovery**: Find and test T3-TB devices on network
- [ ] **Read Properties**: Test ReadProperty and ReadPropertyMultiple
- [ ] **Trend Log Test**: Examine existing trend log functionality
- [ ] **Document Findings**: Record all test results and capabilities

### **Week 2: Core Integration**
- [ ] **WebView Messages**: Implement new BACnet message types
- [ ] **Handler Functions**: Add BACnet cases to HandleWebViewMsg
- [ ] **Database Schema**: Extend SQLite with BACnet tables
- [ ] **Basic UI**: Create simple BACnet device list in Vue.js
- [ ] **Integration Test**: Verify WebView ↔ BACnet communication

### **Week 3: T3-TB Specific Implementation**
- [ ] **Device Mapping**: Create T3-TB specific object configurations
- [ ] **Polling Engine**: Implement efficient ReadPropertyMultiple polling
- [ ] **Data Storage**: Store trend data in SQLite using T3000 patterns
- [ ] **Real-time UI**: Display live T3-TB data in WebView
- [ ] **Error Handling**: Implement robust error recovery

### **Week 4: Production Integration**
- [ ] **Performance Testing**: Validate polling performance and efficiency
- [ ] **UI Polish**: Complete BACnet device management interface
- [ ] **Documentation**: Update user guides and technical documentation
- [ ] **Deployment**: Package for production testing

## 🔍 **Critical Success Factors**

### **Technical Requirements**
1. **Leverage Existing Infrastructure**: Use T3000's proven BACnet stack
2. **Minimal Code Changes**: Extend existing patterns, don't replace them
3. **Performance**: Efficient polling without impacting T3000 operation
4. **Reliability**: Robust error handling and device failover

### **Integration Requirements**
1. **WebView Compatibility**: Seamless integration with existing WebView framework
2. **Database Consistency**: Follow T3000 CppSQLite3 patterns
3. **UI Consistency**: Match existing T3000 interface design
4. **Backward Compatibility**: Don't break existing T3000 functionality

### **Business Requirements**
1. **Replace Proprietary Trends**: Standard BACnet polling replaces custom trend logs
2. **T3-TB Focus**: Optimize specifically for T3-TB device types
3. **Real-time Data**: Live sensor data display and trending
4. **Easy Configuration**: Simple device discovery and setup

## 📊 **Expected Outcomes**

### **Phase 1 Deliverables**
- **Working BACnet Tool**: YABE integration functional
- **Device Discovery**: Successful T3-TB device identification
- **Communication Test**: ReadProperty/ReadPropertyMultiple working
- **Integration Plan**: Detailed WebView extension design

### **Success Metrics**
- **Device Discovery Time**: < 30 seconds for WHO-IS broadcast
- **Read Property Response**: < 5 seconds per device
- **Block Read Efficiency**: > 10 objects per ReadPropertyMultiple
- **UI Responsiveness**: < 1 second for WebView updates

### **Risk Mitigation**
- **Network Issues**: Test with direct IP addressing if broadcast fails
- **Device Compatibility**: Validate with multiple T3-TB firmware versions
- **Performance Impact**: Monitor T3000 system performance during testing
- **Integration Conflicts**: Test alongside existing T3000 functionality

---

**Current Status:** ✅ BACnet tool executable fixed - Ready for Phase 1 testing
**Next Action:** Execute YABE launch test and device discovery
**Timeline:** Phase 1 completion target - 1 week
**Success Criteria:** Successful T3-TB device discovery and property reading via YABE
