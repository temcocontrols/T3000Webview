# Left Panel — C++ Design (mapped to React guide)

Purpose: technical-only reference documenting how the original T3000 C++ left-panel / device tree is designed and implemented, and how each C++ concept maps to the React + Zustand implementation in `LEFT_PANEL_STEP_BY_STEP_GUIDE.md`.

Files referenced (examples):
- `T3000-Source/T3000/MainFrm.h` (tree_product struct, m_product, main frame members)
- `T3000-Source/T3000/MainFrm.cpp` (load/populate tree, handlers)
- `T3000-Source/T3000/ImageTreeCtrl.h` / `ImageTreeCtrl.cpp` (tree control subclass)
- `T3000-Source/T3000/CBacnetBuildingManagement.cpp` (building info + mapping)
- Other: `BacnetView.cpp`, `global_function.cpp`, `Flash_Multy.cpp` (usage examples)

---

## 1. Core data structure: `tree_product`

Location: `MainFrm.h` (typedef struct _tree_product)

Summary (fields extracted and explained):
- Building_info BuildingInfo;              // grouping (building/subnet meta)
- HTREEITEM product_item;                  // HTREEITEM in CTreeCtrl for this node
- unsigned int serial_number;              // device id (Serial_Number)
- int product_class_id;                    // device type (maps to productClassId)
- int baudrate, product_id;                // comm and model
- float software_version, hardware_version;
- int nhardware_info;                      // flags (zigbee/wifi)
- CString strImgPathName;                  // icon path
- int protocol;                            // protocol enum (BACnet/Modbus/...)
- unsigned int ncomport;                   // port (COM/IP)
- bool status;                             // online/offline
- bool status_last_time[5];                // status history (5 samples)
- CString NetworkCard_Address;             // device IP or MAC
- CString NameShowOnTree;                  // display name
- CString Custom;                          // custom label
- unsigned int note_parent_serial_number;  // parent serial (hierarchy)
- unsigned char panel_number;
- unsigned int object_instance;            // BACnet instance
- UCHAR subnet_port;                       // which port (main/zigbee/sub)
- UCHAR subnet_baudrate;                   // bus baudrate
- UCHAR expand;                            // expansion state (1 expanded, 2 collapsed)
- ext_info m_ext_info;                     // extension metadata
- tree_sub_io sub_io_info[TREE_MAX_TYPE];  // per-type IO info

Notes:
- `tree_product` contains both UI information (HTREEITEM, image path, NameShowOnTree) and device runtime state (status, status_history) and hardware/network metadata. This tight coupling reflects a Win32/MFC pattern where model & view state are stored together.

Mapping to React `DeviceInfo` (src/t3-react/types/device.ts):
- `serial_number` -> `serialNumber`
- `product_class_id` -> `productClassId`
- `protocol` -> `protocol`
- `NameShowOnTree`/`Custom` -> `nameShowOnTree`, `custom`
- `strImgPathName` -> `imgPathName`/icon mapping
- `status` + `status_last_time` -> `status`, `statusHistory`
- `note_parent_serial_number` -> `noteParentSerialNumber`
- `expand` -> `expand` / `expandedNodes` in store

Relevance to React steps: Phase 1 (types) and Phase 2 (tree builder) mirror this structure. See `LEFT_PANEL_STEP_BY_STEP_GUIDE.md` Phase 1 (Step 1.1) and Phase 2 (treeBuilder).

---

## 2. Tree control class: `CImageTreeCtrl` (subclass of `CTreeCtrl`)

Location: `ImageTreeCtrl.h` and `ImageTreeCtrl.cpp`

Responsibilities and features:
- Custom drawing and icon management (CImageList `m_ImageList`)
- Context menu display: `DisplayContextMenu`, `DisplayContextOtherMenu` — creates context menus depending on node type (building/device/input/output)
- Node insertion helpers: `InsertSubnetItem`, `InsertFloorItem`, `InsertRoomItem`, `InsertDeviceItem`
- Label editing controls: `OnBeginlabeledit`, `OnEndlabeledit`, `CanSetLabelText`
- Item style controls: font/color settings, bold/italic, `SetItemFont`, `SetItemBold`, `SetItemColor`
- Drag & drop support: `OnBegindrag`, `OnMouseMove`, `DragBranch`, `CopyBranch`, `CopyItem`
- Node operations: `BM_Add_Nodes`, `BM_Delete`, `BM_Property` — used by toolbar/context menu actions
- Device-specific operations: `PingDevice`, `BM_Communicate`, `SyncToController`, `BM_IO_Mapping`
- Flashing selection and offline mode: `FlashSelectItem`, `StopFlashItem`, `SetTreeOfflineMode`
- Virtual nodes: `SetVirtualTreeItem`, `m_virtual_tree_item` for placeholder items
- Event handlers: `OnNMCustomdraw` for custom drawing (status indicator colors/icons)

Mapping to React:
- `CImageTreeCtrl` → `DeviceTree` component + utility functions
  - `m_ImageList` corresponds to `getDeviceIcon()` / iconMap in `treeBuilder.ts`
  - Insert functions map to tree builder's node creation
  - Context menu methods → `TreeContextMenu` component
  - Custom draw / status icons → `getStatusColor()` and status indicators in `DeviceNode` component
  - Drag & drop support can map to future React DnD or left for later (Phase 5+)

See React Phase 2 (DeviceTree) and Phase 4 (Context menu / actions).

---

## 3. Main application frame: `CMainFrame` responsibilities

Location: `MainFrm.h`, `MainFrm.cpp`

Key members & behavior:
- `vector<tree_product> m_product;` — main product/device list stored in memory
- `CImageTreeCtrl* m_pTreeViewCrl;` — pointer to tree control instance
- `vector<Building_info> m_subNetLst;` — building/subnet list
- Background threads and timers:
  - `m_pScanner`, `m_pThreadScan` — scanning devices (Tstat scanner)
  - `m_pFreshTree` — thread for refreshing tree contents
  - `m_pCheck_net_device_online` — thread for checking online status
  - `OnTimer` handler for periodic tasks
- Message handlers (window messages / custom):
  - `OnAddTreeNode`, `OnHTreeItemSeletedChanged`, `OnHTreeItemClick`, `OnHTreeItemEndlabeledit`, `OnHTreeItemBeginlabeledit`
  - `HandleWriteNewDevice`, `Refresh_RX_TX_Count`, `Retry_Connect_Message` etc.
- DB interaction: `LoadProductFromDB()` to populate `m_product` and build the tree items
- Scan & sync: `Scan_Product()`, `ScanTstatInDB()`, `Sync` helpers

Mapping to React:
- `m_product` -> Zustand store `devices[]`
- `m_pTreeViewCrl` -> DeviceTree React component instance
- Background threads -> `syncService` and `useDeviceStatusMonitor` (Phase 3)
- Message handlers -> store actions and events (e.g., `loadDevices`, `updateDevice`)
- `LoadProductFromDB()` -> API `deviceApi.getAllDevices()` + state hydration

See React Phase 3 (data integration, syncService) and Phase 1 (API service/store).

---

## 4. Status checking, threads and timers

C++ implementation:
- Dedicated threads poll devices and refresh tree. Examples:
  - `m_pCheck_net_device_online` checks device connectivity
  - `m_pFreshTree` refreshes tree on background
- `OnTimer(UINT_PTR nIDEvent)` handles periodic UI updates and flashing items
- Status history (`status_last_time[5]`) used to determine online/offline/unknown presentation

React equivalents:
- `useDeviceStatusMonitor` hook (polls every 30s) – Phase 3.1
- `syncService` (background sync every 60s) – Phase 3.2
- `updateDeviceStatus` in store – updates status and statusHistory

Notes:
- C++ threads are long-lived OS threads. React uses timer-based polling and async fetches; careful mapping ensures UI thread safety.

---

## 5. Context menu / toolbar actions

C++ operations exposed in UI:
- Connect / Disconnect device
- Ping device
- Refresh status
- Add / Delete / Rename device
- Properties / IO mapping
- Sync to controller / Communicate

C++ APIs invoked from menu handlers often call low-level communication modules (BACnet/Modbus), update DB, then post messages back to main frame to refresh the tree.

React mapping (Phase 4):
- `TreeToolbar` (refresh, scan, add) -> calls `refreshDevices`/`scanForDevices`
- `TreeContextMenu` -> calls `connectToDevice`, `disconnectFromDevice`, `updateDevice`, `deleteDevice` in store (these call backend endpoints which in turn trigger C++ operations via Rust API / FFI)

---

## 6. Icons and image list

C++:
- `CImageList m_ImageList` with constants like `TREE_IMAGE_INPUT_ONLINE`, `TREE_IMAGE_INPUT_OFFLINE`, etc.
- Custom draw uses different indexes for online/offline/unknown versions of icons

React:
- `getDeviceIcon(productClassId)` maps product class to icon name
- `getStatusColor(status)` provides color; UI composes status color + icon similar to CImageTreeCtrl

---

## 7. DB schema and mapping

The C++ app stores devices in a `devices` table (SQLite/Access previously). Fields in the DB correspond to fields in `tree_product`.

Mapping notes:
- DB column `Serial_Number` -> `serial_number` in `tree_product` -> `serialNumber` in React types
- Various columns map directly to fields documented in `LEFT_PANEL_STEP_BY_STEP_GUIDE.md` (see "Database Schema" section)

React step references: Phase 1.2 (deviceApi) and Phase 3 (load devices) describe exact mapping and payload formats.

---

## 8. Events & messages (C++ → React mapping guidance)

Common C++ message handlers you will find in `MainFrm.cpp` / `ImageTreeCtrl.cpp`:
- `OnAddTreeNode(WPARAM, LPARAM)` — item added; in React call `addDevice` and update store
- `OnHTreeItemSeletedChanged` — selection change; in React call `selectDevice`
- `OnHTreeItemEndlabeledit` / `OnHTreeItemBeginlabeledit` — label edit; in React map to rename action `updateDevice`
- `OnHTreeItemClick` — clicks used for selection/navigation
- `OnRclick` / `DisplayContextMenu` — show context menu; React shows `TreeContextMenu` at click coords

Design note: C++ uses window messages (synchronous). In React design we use async actions with optimistic UI where helpful.

---

## 9. Differences and constraints to keep in mind

- C++ stores UI state (HTREEITEM, fonts, colors) alongside model data. React separates model (store) and view (components). When porting behavior, ensure model contains enough metadata (status, expanded) but keep view state in components or store as appropriate (expandedNodes stored centrally to persist across views).

- Drag-and-drop and immediate UI-level operations are easier in MFC because of tight coupling; in React, implement incrementally (Phase 5+).

- C++ uses OS threads for scanning and status; React must avoid blocking and use async fetches and web worker patterns if necessary.

---

## 10. Reference mapping table (C++ → React)

- `tree_product` → `DeviceInfo` (types file)
- `vector<tree_product> m_product` → `useDeviceTreeStore().devices`
- `CImageTreeCtrl::InsertDeviceItem` → `buildTreeStructure` + `DeviceTree` render
- `DisplayContextMenu` → `TreeContextMenu` (Phase 4)
- `OnTimer` / `m_pCheck_net_device_online` → `useDeviceStatusMonitor` hook
- `m_ImageList` + custom draw → `getDeviceIcon` + `getStatusColor`
- `LoadProductFromDB()` → `deviceApi.getAllDevices()` + `loadDevices()` in store
- `OnAddTreeNode` message → store `addDevice` (Phase 1/3)

---

## 11. Where to look in the C++ source for details (quick pointers)
- `T3000-Source/T3000/MainFrm.h` — `tree_product` typedef + members
- `T3000-Source/T3000/MainFrm.cpp` — Load/scan/refresh handlers, thread starters, message handlers
- `T3000-Source/T3000/ImageTreeCtrl.h` / `.cpp` — tree control methods (insert, context menu, painting)
- `T3000-Source/T3000/CBacnetBuildingManagement.cpp` — building info and mapping
- `T3000-Source/T3000/BacnetView.cpp` — examples of using `selected_product_Node` and network connect sequences
- `T3000-Source/T3000/global_function.cpp` — utility functions (ping, connect helpers)

---

## 12. Recommended additions to the React guide (explicit cross-walk)
Add these short cross-reference notes into `LEFT_PANEL_STEP_BY_STEP_GUIDE.md` near the matching phases:
- Phase 1 (types): include a short excerpt of `tree_product` fields and note exact mapping to `DeviceInfo` fields.
- Phase 2 (tree builder): document how `InsertDeviceItem` semantics (HTREEITEM creation, item data) correspond to `buildTreeStructure` node creation.
- Phase 3 (status monitor): reference C++ threads `m_pCheck_net_device_online` and `OnTimer`; mention polling interval parity (30s vs current C++ periodicity).
- Phase 4 (actions): map `DisplayContextMenu` items to the React `TreeContextMenu` items and map the C++ handlers called by the menu to REST endpoints invoked by React.

---

## 13. Next actions (if you want me to continue)
- Add exact code excerpts from `MainFrm.cpp` showing `LoadProductFromDB()` and tree population (I can paste selected lines).
- Add a short diff-style mapping snippet into `LEFT_PANEL_STEP_BY_STEP_GUIDE.md` (Phase comments).
- Implement a small migration checklist for porting behavior: (1) ensure DB-to-API field parity, (2) confirm FFI endpoints for scan/connect, (3) implement status polling, (4) replicate context menu actions.

If you'd like, I can now:
1) Insert the cross-reference snippets into `LEFT_PANEL_STEP_BY_STEP_GUIDE.md` at the specified phase headings, or
2) Add more verbatim C++ excerpts into this C++ design doc to make it even more concrete.

---

References:
- See `T3000-Source/T3000/MainFrm.h` and `ImageTreeCtrl.h` for primary definitions used above.


