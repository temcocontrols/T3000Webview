# Left Panel Device Tree Analysis

## Issue Summary
The device list is displaying but with incorrect data because:
1. **API Response Format Mismatch**: Backend returns camelCase but frontend expects different field names
2. **Missing Display Fields**: `nameShowOnTree` not populated from `showLabelName`
3. **Protocol Field Missing**: No protocol field in response (needed for grouping)
4. **Product Class ID null**: `productClassId` is null, preventing proper icon display

## C++ Tree Building Logic (MainFrm.cpp:1755-2255)

### Key Steps:
1. **LoadProductFromDB()**: Main function that builds entire tree
2. **Database Query**: `SELECT * FROM ALL_NODE where Building_Name = '%s'`
3. **Tree Structure**:
   ```
   Root (TVI_ROOT)
   └── Building/Subnet (hTreeSubbuilding)
       └── Local View (hlocalnetwork)
           └── Devices (hProductItem)
   ```

### Critical Fields from C++:
```cpp
// Tree Product Structure
tree_product {
    HTREEITEM product_item;              // Tree handle
    unsigned int serial_number;          // Serial_ID
    CString NameShowOnTree;              // Product_name OR Show_Label_Name
    int product_class_id;                // Product_class_ID (determines icon)
    int product_id;                      // Product_ID
    int protocol;                        // Protocol (0=COM, 1=TCP)
    int status;                          // Online_Status
    Building_info BuildingInfo;          // Building/subnet info
    int expand;                          // 1=expanded, 2=collapsed
}
```

### Device Display Logic (MainFrm.cpp:2180):
```cpp
CString strProduct = q.getValuebyName(L"Product_name");
tvInsert.item.pszText = (LPTSTR)(LPCTSTR)strProduct;
```

### Icon Assignment (MainFrm.cpp:2048-2150):
- Based on `product_class_id`:
  - PM_CM5 (5) → TVINSERV_CMFIVE
  - PM_TSTAT10 (26) → TVINSERV_TSTAT8
  - PM_MINIPANEL (34) → TVINSERV_MINIPANEL
  - PM_T322AI (20) → TVINSERV_NET_WORK
  - etc.

### Building/Subnet Logic (MainFrm.cpp:1965-1980):
```cpp
// Creates "Local View" node for TCP devices
if (b_remote_connection == false) {
    if ((current_building_protocol == P_MODBUS_TCP) ||
        (current_building_protocol == P_AUTO)) {
        strNetWrokName = _T("Local View");
        hlocalnetwork = m_pTreeViewCrl->InsertItem(&tvInsert);
    }
}
```

## Current Issues

### 1. API Response Mapping
Backend returns:
```json
{
  "serialNumber": 237219,
  "productName": "T3000 Panel",
  "showLabelName": "T3-XX-ESP",
  "productClassId": null,
  "buildingName": "T3-XX-ESP",
  "status": "Online"
}
```

Frontend expects (device.ts):
```typescript
{
  serialNumber: number,
  nameShowOnTree: string,    // ← Not mapped!
  productClassId: number,    // ← null!
  protocol: DeviceProtocol,  // ← Missing!
}
```

### 2. Display Name Priority
C++ uses this logic:
1. First check `Show_Label_Name` (if not empty)
2. Fall back to `Product_Name`

Current React code doesn't implement this fallback.

### 3. Product Class ID
- Backend returns `null` for `productClassId`
- Should be set during device creation
- Determines device icon in tree
- Maps to PM_* constants (see Section 8)

### 4. Protocol Field
- Not returned by API
- Needed for:
  - Building grouping ("BACnet Devices", "Modbus Devices")
  - Connection logic
  - Icon selection

## Required Fixes

### 1. Update DeviceAPI Response Handling
```typescript
// deviceApi.ts
static async getAllDevices(): Promise<DevicesResponse> {
  const response = await fetch(`${this.baseUrl}/devices`);
  const data = await response.json();

  // Transform API response to match frontend interface
  const devices = data.devices.map((device: any) => ({
    ...device,
    // Map display name: showLabelName → nameShowOnTree
    nameShowOnTree: device.showLabelName?.trim() || device.productName || 'Unknown Device',
    // Set default protocol if missing
    protocol: inferProtocol(device),
    // Ensure productClassId has default
    productClassId: device.productClassId || 0,
    // Map status
    status: mapStatus(device.status),
    statusHistory: [device.status === 'Online'],
  }));

  return {
    devices,
    total: data.total,
    message: data.message
  };
}
```

### 2. Update Tree Builder
```typescript
// treeBuilder.ts - Enhanced grouping
export function groupByBuilding(devices: DeviceInfo[]): Map<string, DeviceInfo[]> {
  const buildingMap = new Map<string, DeviceInfo[]>();

  devices.forEach((device) => {
    // Use buildingName as group key (matches C++ ALL_NODE.Building_Name)
    let buildingKey = device.buildingName || 'Local View';

    if (!buildingMap.has(buildingKey)) {
      buildingMap.set(buildingKey, []);
    }
    buildingMap.get(buildingKey)!.push(device);
  });

  return buildingMap;
}
```

### 3. Fix Device Icon Mapping
```typescript
// treeBuilder.ts - Match C++ product_class_id
export function getDeviceIcon(productClassId: number): string {
  const iconMap: Record<number, string> = {
    0: 'CircleSmall',       // Unknown/Default
    5: 'Box',               // PM_CM5
    19: 'Plug',             // PM_T38AI8AO6DO
    20: 'Plug',             // PM_T322AI
    21: 'Plug',             // PM_T38I13O
    22: 'Box',              // PM_T332AI
    26: 'Thermostat',       // PM_TSTAT10
    34: 'Box',              // PM_MINIPANEL
    // Add more mappings...
  };

  return iconMap[productClassId] || 'CircleSmall';
}
```

### 4. Backend - Set Product Class ID
```rust
// services.rs - create_device
let new_device = devices::ActiveModel {
    serial_number: NotSet,
    product_class_id: Set(device_data.product_class_id.or(Some(0))), // Default to 0
    // ... rest of fields
};
```

## Implementation Plan

1. **Phase 1: Data Mapping** (Immediate)
   - Fix `getAllDevices()` to map `showLabelName` → `nameShowOnTree`
   - Add protocol inference logic
   - Set default `productClassId` to 0 if null

2. **Phase 2: Tree Builder** (Immediate)
   - Update `groupByBuilding()` to use `buildingName` directly
   - Enhance icon mapping with all PM_* constants
   - Add "Local View" default group name

3. **Phase 3: Backend** (Later)
   - Update CreateDeviceRequest to require `product_class_id`
   - Add protocol field to devices table
   - Update existing devices to have proper class IDs

4. **Phase 4: Display** (Later)
   - Add tooltips showing device details
   - Show connection status indicators
   - Add device count badges on building nodes

## Reference: Product Class IDs (PM_* Constants)

From C++ T3000.h:
```cpp
#define PM_TSTAT                1   // Thermostat
#define PM_CM5                  5   // CM5
#define PM_T38AI8AO6DO         19   // T3-8AI-8AO-6DO
#define PM_T322AI              20   // T3-22AI
#define PM_T38I13O             21   // T3-8I-13O
#define PM_T332AI              22   // T3-32AI
#define PM_T3PT12              23   // T3-PT12
#define PM_T3IOA               25   // T3-IOA
#define PM_TSTAT10             26   // TSTAT10
#define PM_MINIPANEL           34   // Mini Panel
#define PM_MINIPANEL_ARM       35   // Mini Panel ARM
```

## Testing Checklist

- [ ] Devices display with correct names (showLabelName or productName)
- [ ] Devices grouped by buildingName
- [ ] Icons display based on productClassId
- [ ] Status indicators show online/offline correctly
- [ ] Expand/collapse works for building nodes
- [ ] Device selection triggers proper events
- [ ] Empty state shows when no devices
- [ ] Error handling for API failures
