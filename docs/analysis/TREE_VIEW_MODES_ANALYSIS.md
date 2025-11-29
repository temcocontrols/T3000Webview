# T3000 Tree View Modes Analysis

## Executive Summary

The C++ T3000 application supports **TWO DISTINCT TREE VIEW MODES**:

1. **Show Equipment View** (SYS_NORMAL_MODE = 0) - Equipment/Device hierarchy
2. **Project Point View** (SYS_DB_BUILDING_MODE = 1) - Point list hierarchy

Our current web implementation only supports **Show Equipment View**. We need to implement **Project Point View** for feature parity.

---

## 1. Show Equipment View (Current Implementation ✅)

### C++ Structure
```
Default_Building
  └── Local View
      ├── T3-TB (Serial: 12345)
      │   ├── Online/Offline Status
      │   └── Device Properties
      ├── T3-XX-ESP (Serial: 67890)
      └── [Other Devices...]
```

### Key Characteristics
- **Building-centric hierarchy**
- Organized by: Building → Floor → Room → Device
- Shows device names and online/offline status
- Primary navigation: by physical location
- Database: `ALL_NODE` table with Building_Name, Floor_name, Room_name
- C++ Function: `CMainFrame::ScanTstatInDB()` (line 2573)

### Current Web Implementation
✅ **Status: IMPLEMENTED**
- TreePanel component shows device tree
- Uses `deviceTreeStore` with hierarchical structure
- API endpoint: `/api/t3_device/devices`
- Database query: Fetches from `ALL_NODE` table

---

## 2. Project Point View (MISSING ❌)

### C++ Structure
```
Point List
  └── System List
      └── T3-TB (Serial: 12345)
          ├── Output (5/8)      ← Shows used/total
          ├── Input (32/64)
          ├── Variable (10/128)
          ├── Pid (0/16)
          ├── Schedule (2/8)
          ├── Holiday (0/4)
          ├── Program (1/16)
          ├── Graphic (0/16)
          └── Trendlog (5/12)
```

### Key Characteristics
- **Point-centric hierarchy**
- Organized by: Point List → System List → Device → Point Types
- Shows capacity usage (used/total) for each point type
- Primary navigation: by data points/configuration
- Database: Queries multiple tables (INPUTS, OUTPUTS, VARIABLES, etc.)
- C++ Function: `CImageTreeCtrl::ProjectPointView()` (line 783)
- Menu Item: "Project Point View" (context menu on building)

### Web Implementation Status
❌ **Status: NOT IMPLEMENTED**

---

## 3. Node Type Definitions (C++)

```cpp
// Tree Node Types
#define TYPE_BM_POINT_LIST  255    // Root: "Point List"
#define TYPE_BM_GROUP       100    // "System List"
#define TYPE_BM_NODES       101    // Device nodes
#define TYPE_BM_MODULE      102    // Module/sub-devices
#define TYPE_BM_VIRTUAL_DEVICE 103 // Virtual devices
#define TYPE_BM_IO          104    // IO modules

// Point Types
#define TYPE_BM_INPUT       2      // Input points
#define TYPE_BM_OUTPUT      3      // Output points
#define TYPE_BM_VARIABLE    4      // Variable points

// System Modes
#define SYS_NORMAL_MODE      0     // Show Equipment View
#define SYS_DB_BUILDING_MODE 1     // Project Point View
```

---

## 4. Database Schema Analysis

### Current Tables (Verified in API)
```
✅ DEVICES    - Main device table
✅ INPUTS     - Input points (64 max per device)
✅ OUTPUTS    - Output points (64 max per device)
✅ VARIABLES  - Variable points (128 max per device)
✅ PROGRAMS   - Program configuration
✅ SCHEDULES  - Schedule configuration
✅ HOLIDAYS   - Holiday configuration
✅ GRAPHICS   - Graphics configuration
✅ TRENDLOGS  - Trendlog configuration
✅ PID_TABLE  - PID controller configuration (16 max)
```

### Capacity Information
Each device has different capacities based on product type:
- **Inputs**: 0-64 points
- **Outputs**: 0-64 points
- **Variables**: 0-128 points
- **PIDs**: 0-16 controllers
- **Schedules**: 0-8 schedules
- **Holidays**: 0-4 holidays
- **Programs**: 0-16 programs
- **Graphics**: 0-16 graphics
- **Trendlogs**: 0-12 trend logs

---

## 5. Required Changes for Project Point View

### 5.1 Database Schema Updates
❌ **NONE REQUIRED** - All necessary tables exist

### 5.2 API Endpoints to Add

```rust
// New endpoints needed
GET  /api/t3_device/tree/project-view          // Get project point view tree
GET  /api/t3_device/devices/:id/capacity       // Get device capacity info
GET  /api/t3_device/devices/:id/usage-summary  // Get usage counts per type
```

**Implementation Details:**
```rust
// In api/src/t3_device/routes.rs

#[derive(Serialize)]
pub struct DeviceCapacity {
    pub inputs: CapacityInfo,
    pub outputs: CapacityInfo,
    pub variables: CapacityInfo,
    pub programs: CapacityInfo,
    pub schedules: CapacityInfo,
    pub holidays: CapacityInfo,
    pub pid_controllers: CapacityInfo,
    pub graphics: CapacityInfo,
    pub trendlogs: CapacityInfo,
}

#[derive(Serialize)]
pub struct CapacityInfo {
    pub used: i32,
    pub total: i32,
    pub percentage: f32,
}

async fn get_device_capacity(
    State(state): State<T3AppState>,
    Path(serial_number): Path<String>
) -> Result<Json<DeviceCapacity>, StatusCode> {
    // Query each table to get used counts
    // Get device product type to determine totals
    // Calculate percentages
    // Return structured capacity info
}
```

### 5.3 UI Components to Add

```typescript
// New component structure
src/t3-react/features/devices/
  ├── components/
  │   ├── DeviceTree/                    ← Existing (Equipment View)
  │   ├── ProjectPointTree/              ← NEW (Point View)
  │   │   ├── ProjectPointTree.tsx
  │   │   ├── ProjectPointTree.module.css
  │   │   ├── PointTypeNode.tsx          ← Shows "Input (32/64)"
  │   │   └── CapacityBar.tsx            ← Visual capacity indicator
  │   └── TreeViewModeSwitch.tsx         ← NEW Toggle between views
  └── store/
      └── deviceTreeStore.ts             ← Update with view mode state
```

**Component Structure:**
```tsx
// ProjectPointTree.tsx
interface PointTypeNodeProps {
  deviceId: string;
  pointType: 'inputs' | 'outputs' | 'variables' | 'programs' | ...;
  used: number;
  total: number;
}

const PointTypeNode: React.FC<PointTypeNodeProps> = ({
  pointType, used, total
}) => {
  const percentage = (used / total) * 100;

  return (
    <TreeItem>
      <TreeItemLayout>
        {getPointTypeIcon(pointType)}
        <span>{getPointTypeLabel(pointType)} ({used}/{total})</span>
        <CapacityBar percentage={percentage} />
      </TreeItemLayout>
    </TreeItem>
  );
};
```

### 5.4 Store Updates

```typescript
// deviceTreeStore.ts additions

interface DeviceTreeState {
  // ... existing state
  viewMode: 'equipment' | 'projectPoint';  // NEW
  deviceCapacities: Map<string, DeviceCapacity>;  // NEW

  // NEW actions
  setViewMode: (mode: 'equipment' | 'projectPoint') => void;
  fetchProjectPointTree: () => Promise<void>;
  fetchDeviceCapacity: (serialNumber: string) => Promise<void>;
}
```

---

## 6. Implementation Roadmap

### Phase 1: API Layer (Estimated: 2-3 hours)
1. ✅ Verify database schema (DONE - all tables exist)
2. ❌ Add `/api/t3_device/tree/project-view` endpoint
3. ❌ Add `/api/t3_device/devices/:id/capacity` endpoint
4. ❌ Add `/api/t3_device/devices/:id/usage-summary` endpoint
5. ❌ Write unit tests for new endpoints

### Phase 2: Store Layer (Estimated: 1-2 hours)
1. ❌ Add `viewMode` state to deviceTreeStore
2. ❌ Add `deviceCapacities` state
3. ❌ Implement `fetchProjectPointTree` action
4. ❌ Implement `fetchDeviceCapacity` action
5. ❌ Add view mode persistence (localStorage)

### Phase 3: UI Components (Estimated: 3-4 hours)
1. ❌ Create `ProjectPointTree` component
2. ❌ Create `PointTypeNode` component
3. ❌ Create `CapacityBar` component (visual progress indicator)
4. ❌ Create `TreeViewModeSwitch` toggle component
5. ❌ Add icons for each point type (Input, Output, Variable, etc.)
6. ❌ Style with Azure Portal theme (matching current TreePanel)

### Phase 4: Integration (Estimated: 1 hour)
1. ❌ Update `TreePanel` to conditionally render tree based on view mode
2. ❌ Add mode switch button to `TreeToolbar`
3. ❌ Update routing to support view mode in URL
4. ❌ Test switching between views
5. ❌ Update documentation

### Phase 5: Testing & Polish (Estimated: 1-2 hours)
1. ❌ Test with devices at full capacity
2. ❌ Test with devices at zero usage
3. ❌ Test switching views while device selected
4. ❌ Performance test with many devices
5. ❌ Add loading states
6. ❌ Add error handling

**Total Estimated Time: 8-12 hours**

---

## 7. Sample API Responses

### GET /api/t3_device/tree/project-view
```json
{
  "name": "Point List",
  "type": "root",
  "children": [
    {
      "name": "System List",
      "type": "system",
      "children": [
        {
          "name": "T3-TB",
          "serialNumber": "12345",
          "type": "device",
          "status": "online",
          "children": [
            {
              "name": "Output",
              "type": "outputs",
              "used": 5,
              "total": 8,
              "percentage": 62.5
            },
            {
              "name": "Input",
              "type": "inputs",
              "used": 32,
              "total": 64,
              "percentage": 50.0
            },
            {
              "name": "Variable",
              "type": "variables",
              "used": 10,
              "total": 128,
              "percentage": 7.8
            },
            {
              "name": "Pid",
              "type": "pid",
              "used": 0,
              "total": 16,
              "percentage": 0.0
            },
            {
              "name": "Schedule",
              "type": "schedules",
              "used": 2,
              "total": 8,
              "percentage": 25.0
            },
            {
              "name": "Holiday",
              "type": "holidays",
              "used": 0,
              "total": 4,
              "percentage": 0.0
            },
            {
              "name": "Program",
              "type": "programs",
              "used": 1,
              "total": 16,
              "percentage": 6.25
            },
            {
              "name": "Graphic",
              "type": "graphics",
              "used": 0,
              "total": 16,
              "percentage": 0.0
            },
            {
              "name": "Trendlog",
              "type": "trendlogs",
              "used": 5,
              "total": 12,
              "percentage": 41.7
            }
          ]
        }
      ]
    }
  ]
}
```

---

## 8. C++ Code References

### Toggle Between Views
**File**: `ImageTreeCtrl.cpp` (Line 406-426)
```cpp
bool CImageTreeCtrl::ShowEquipmentView(HTREEITEM hItem) {
    if (b_building_management_flag == SYS_DB_BUILDING_MODE) {
        b_building_management_flag = SYS_NORMAL_MODE;  // Switch to Equipment View
        pFrame->ClearBuilding();
        DeleteAllItems();
        pFrame->m_product.clear();
        pFrame->ScanTstatInDB();  // Build Equipment tree
    }
    else if (b_building_management_flag == SYS_NORMAL_MODE) {
        b_building_management_flag = SYS_DB_BUILDING_MODE;  // Switch to Point View
        pFrame->ClearBuilding();
        pFrame->m_pTreeViewCrl->DeleteAllItems();
        pFrame->m_product.clear();
        pFrame->SwitchToPruductType(DLG_DIALOG_BUILDING_MANAGEMENT);
    }
    return 0;
}
```

### Project Point View Implementation
**File**: `ImageTreeCtrl.cpp` (Line 783-786)
```cpp
bool CImageTreeCtrl::ProjectPointView(HTREEITEM hItem) {
    CMainFrame* pFrame = (CMainFrame*)(AfxGetApp()->m_pMainWnd);
    pFrame->OnDatabaseBuildingManagement();  // Build Point tree
    return 0;
}
```

---

## 9. Recommendations

### Immediate Actions
1. ✅ **Current Equipment View is Working** - No changes needed
2. ❌ **Implement Project Point View** - Follow Phase 1-5 roadmap
3. ❌ **Add View Mode Toggle** - Button in TreeToolbar

### Future Enhancements
- Add capacity warnings (e.g., >80% usage shows warning color)
- Add "Add New Point" quick action from tree
- Add filtering by point type
- Add sorting by capacity usage
- Export capacity report

### Technical Debt
- Current API returns flat device list
- Tree hierarchy is built client-side
- Consider server-side tree building for better performance

---

## 10. Conclusion

### Current Status
✅ **Show Equipment View**: Fully implemented and working
❌ **Project Point View**: Not implemented

### Required Work
- **Database**: ✅ No changes needed (all tables exist)
- **API**: ❌ 3 new endpoints (8-12 hours estimated)
- **UI**: ❌ 4 new components + 1 toggle
- **Store**: ❌ View mode state + capacity caching
- **Total**: ~8-12 hours development time

### Priority
**MEDIUM-HIGH** - This is a major feature in C++ T3000 that power users rely on for system configuration and capacity planning.
