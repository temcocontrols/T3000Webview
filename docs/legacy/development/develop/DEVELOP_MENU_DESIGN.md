# Develop Menu - Design Specification

## Overview
Developer tools suite for debugging T3000 application, database inspection, and transport testing.

---

## 1. Menu Structure

### Top Menu Addition
```
File | Edit | View | T3000 | Tools | Help | [Develop] ← NEW
```

### Develop Dropdown Menu
```
Develop
├── File Browser         (Navigate runtime files/folders)
├── Database Viewer      (Inspect SQLite databases)
├── Transport Tester     (Test t3-transport messages)
└── System Logs          (View application logs)
```

---

## 2. Layout Design

### Develop Section Layout
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Developer Tools"                          [×]       │
├─────────────────────────────────────────────────────────────┤
│ ┌───────────┬─────────────────────────────────────────────┐ │
│ │ Left Nav  │ Content Area                                │ │
│ │ (200px)   │ (Flex: 1)                                   │ │
│ │           │                                             │ │
│ │ [📁] File │ ┌─────────────────────────────────────────┐ │ │
│ │  Browser  │ │                                         │ │ │
│ │           │ │      Dynamic Content Based on           │ │ │
│ │ [🗄️] DB   │ │      Selected Left Menu Item            │ │ │
│ │  Viewer   │ │                                         │ │ │
│ │           │ │                                         │ │ │
│ │ [📡] Msg  │ └─────────────────────────────────────────┘ │ │
│ │  Tester   │                                             │ │
│ │           │                                             │ │
│ │ [📝] Logs │                                             │ │
│ │           │                                             │ │
│ └───────────┴─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Key Layout Features
- **Left Navigation**: Fixed 200px width, collapsible
- **Content Area**: Flex layout, scrollable
- **Fluent UI Components**: Nav, Tree, DataGrid, CodeEditor
- **Azure Portal Style**: Clean, professional, consistent with main app

---

## 3. Feature Designs

### 3.1 File Browser Tab

**Purpose**: Browse runtime folder (D:\1025\github\temcocontrols\T3000_Building_Automation_System\T3000 Output\Debug)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📁 Runtime Folder Browser                                   │
├─────────────────────────────────────────────────────────────┤
│ Path: D:\...\T3000 Output\Debug              [🔄 Refresh]  │
├──────────────────────┬──────────────────────────────────────┤
│ ┌──────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Folder Tree      │ │ │ File Preview / Properties        │ │
│ │                  │ │ │                                  │ │
│ │ ▼ 📁 Debug       │ │ │ File: T3000.exe                  │ │
│ │   ▼ 📁 Database  │ │ │ Size: 15.2 MB                    │ │
│ │     📄 db1.db3   │ │ │ Modified: 2025-12-17 10:30 AM    │ │
│ │     📄 db2.db3   │ │ │ Type: Application                │ │
│ │   ▼ 📁 Images    │ │ │                                  │ │
│ │     🖼️ bg.png    │ │ │ [Open in Explorer] [Copy Path]   │ │
│ │   📄 config.ini  │ │ │                                  │ │
│ │   📄 T3000.exe   │ │ │ --- Text File Preview ---        │ │
│ │   📝 log.txt     │ │ │ (For .txt, .ini, .log, .json)    │ │
│ │                  │ │ │                                  │ │
│ └──────────────────┘ │ └──────────────────────────────────┘ │
│  40%                 │  60%                                 │
└──────────────────────┴──────────────────────────────────────┘
```

**Features**:
- **Folder Tree**: Fluent UI Tree component
- **File Icons**: Different icons for file types (.db3, .exe, .txt, .ini, .png, .json)
- **File Preview**:
  - Text files: Show content in code editor
  - Binary files: Show properties only
  - Images: Show thumbnail
- **Actions**:
  - Open in Explorer
  - Copy path to clipboard
  - Refresh folder tree
  - Search files

**Implementation**:
- Use Node.js `fs` module via Electron/Tauri APIs
- Fluent UI `Tree` component for folder structure
- Monaco Editor for text file preview
- Resizable split panel (react-resizable-panels)

---

### 3.2 Database Viewer Tab

**Purpose**: Inspect SQLite database files (.db3) with SQL query capability

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 🗄️ Database Viewer                                          │
├─────────────────────────────────────────────────────────────┤
│ Database: [webview_t3_device.db ▼]          [🔄 Refresh]   │
├──────────────────────┬──────────────────────────────────────┤
│ ┌──────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Tables           │ │ │ Query Editor                     │ │
│ │                  │ │ │ ┌──────────────────────────────┐ │ │
│ │ 📋 DEVICES (45)  │ │ │ │ SELECT * FROM DEVICES       │ │ │
│ │ 📋 INPUTS (320)  │ │ │ │ WHERE SerialNumber = 237219 │ │ │
│ │ 📋 OUTPUTS (160) │ │ │ │ LIMIT 100;                  │ │ │
│ │ 📋 VARIABLES     │ │ │ └──────────────────────────────┘ │ │
│ │ 📋 TRENDLOG_...  │ │ │ [▶ Execute] [Clear] [Format]    │ │
│ │ 📋 USERS         │ │ │                                  │ │
│ │                  │ │ ├──────────────────────────────────┤ │
│ │ [+ New Query]    │ │ │ Results (45 rows, 120ms)         │ │
│ │                  │ │ │ ┌─────────┬──────────┬─────────┐ │ │
│ │ --- Schema ---   │ │ │ │Serial   │Product   │IP Addr  │ │ │
│ │ Table: DEVICES   │ │ │ ├─────────┼──────────┼─────────┤ │ │
│ │ ├─ SerialNumber  │ │ │ │237219   │T3-XX-ESP │192.168. │ │ │
│ │ ├─ Product_Name  │ │ │ │237451   │T3-TB     │192.168. │ │ │
│ │ ├─ IP_Address    │ │ │ └─────────┴──────────┴─────────┘ │ │
│ │ └─ Status        │ │ │ [Export CSV] [Copy] [Refresh]    │ │
│ └──────────────────┘ │ └──────────────────────────────────┘ │
│  25%                 │  75%                                 │
└──────────────────────┴──────────────────────────────────────┘
```

**Features**:

**Database List**:
- Dropdown showing all .db3 files in runtime folder
- Show file size and last modified
- Quick switch between databases

**Table List Panel**:
- All tables with row count
- Click table to run `SELECT * FROM table LIMIT 100`
- Right-click menu: View Schema, Export Table, Truncate
- Search/filter tables

**Query Editor**:
- SQL syntax highlighting (Monaco Editor)
- Execute button (F5 shortcut)
- Query history (last 20 queries)
- Common query templates:
  - View all devices
  - View device inputs
  - Check sync status
  - Find errors

**Results Grid**:
- Fluent UI DataGrid
- Column sorting
- Column filtering
- Row selection
- Export to CSV
- Copy to clipboard
- Pagination (100 rows per page)
- Cell editing (UPDATE support)

**Schema Viewer**:
- Show CREATE TABLE statement
- Column names, types, constraints
- Foreign key relationships
- Indexes

**Implementation**:
- Use `better-sqlite3` for Node.js
- Monaco Editor for SQL editor
- Fluent UI DataGrid for results
- SQL.js as browser-based alternative

---

### 3.3 Transport Tester Tab

**Purpose**: Test t3-transport library messages with all three transports

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📡 Transport Message Tester                                 │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Connection Settings                                     │ │
│ │ Transport: [WebSocket ▼] [FFI] [WebView2]              │ │
│ │ Status: ● Connected (ws://localhost:9104)               │ │
│ │ [Connect] [Disconnect] [Auto-Reconnect ☑]               │ │
│ └─────────────────────────────────────────────────────────┘ │
├──────────────────────┬──────────────────────────────────────┤
│ ┌──────────────────┐ │ ┌──────────────────────────────────┐ │
│ │ Message Builder  │ │ │ Request / Response Viewer        │ │
│ │                  │ │ │                                  │ │
│ │ Action:          │ │ │ Tabs: [Request] [Response] [Log] │ │
│ │ [GET_PANEL_DATA▼]│ │ │                                  │ │
│ │                  │ │ │ --- Request Payload ---          │ │
│ │ Panel ID:        │ │ │ {                                │ │
│ │ [1          ]    │ │ │   "header": {                    │ │
│ │                  │ │ │     "from": "Chrome"             │ │
│ │ Serial Number:   │ │ │   },                             │ │
│ │ [237219     ]    │ │ │   "message": {                   │ │
│ │                  │ │ │     "action": 0,                 │ │
│ │ Custom Data:     │ │ │     "msgId": "uuid-123",         │ │
│ │ {                │ │ │     "panelId": 1,                │ │
│ │   "key": "val"   │ │ │     "serialNumber": 237219       │ │
│ │ }                │ │ │   }                              │ │
│ │                  │ │ │ }                                │ │
│ │ [▶ Send Message] │ │ │                                  │ │
│ │ [Clear]          │ │ │ --- Response (120ms) ---         │ │
│ │                  │ │ │ {                                │ │
│ │ --- Templates -- │ │ │   "status": "success",           │ │
│ │ • Get Device     │ │ │   "data": { ... }                │ │
│ │ • Get Inputs     │ │ │ }                                │ │
│ │ • Save Data      │ │ │                                  │ │
│ │ • Bind Device    │ │ │ [Copy] [Format] [Clear]          │ │
│ └──────────────────┘ │ └──────────────────────────────────┘ │
│  35%                 │  65%                                 │
├──────────────────────┴──────────────────────────────────────┤
│ Message History (Last 20)                                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 10:30:45 → GET_PANEL_DATA (Panel 1) ✓ 120ms            │ │
│ │ 10:29:12 → GET_INITIAL_DATA (Panel 1) ✓ 85ms           │ │
│ │ 10:28:33 → BIND_DEVICE (SN: 237219) ✗ Timeout          │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Features**:

**Connection Panel**:
- Transport selector: WebSocket / FFI / WebView2
- Connection status indicator with color:
  - 🟢 Green: Connected
  - 🔴 Red: Disconnected
  - 🟡 Yellow: Connecting
- Connection info: URL/endpoint
- Auto-reconnect toggle
- Connect/Disconnect buttons

**Message Builder**:
- **Action Dropdown**: All 18 WebViewMessageType actions:
  - GET_PANEL_DATA (0)
  - GET_INITIAL_DATA (1)
  - SAVE_GRAPHIC_DATA (2)
  - UPDATE_ENTRY (3)
  - GET_PANELS_LIST (4)
  - GET_PANEL_RANGE_INFO (5)
  - GET_ENTRIES (6)
  - LOAD_GRAPHIC_ENTRY (7)
  - OPEN_ENTRY_EDIT_WINDOW (8)
  - SAVE_IMAGE (9)
  - SAVE_LIBRAY_DATA (10)
  - DELETE_IMAGE (11)
  - GET_SELECTED_DEVICE_INFO (12)
  - BIND_DEVICE (13)
  - SAVE_NEW_LIBRARY_DATA (14)
  - LOGGING_DATA (15)
  - UPDATE_WEBVIEW_LIST (16)
  - GET_WEBVIEW_LIST (17)

- **Quick Fields**: Panel ID, Serial Number, View Item
- **Custom Data**: JSON editor for additional payload
- **Message Templates**: Pre-filled messages for common actions
- **Send Button**: Sends message and shows loading state
- **Clear Button**: Reset form

**Request/Response Viewer**:
- **Tabs**:
  - Request: Show sent message (formatted JSON)
  - Response: Show received response (formatted JSON)
  - Raw: Show raw message (debugging)

- **Features**:
  - Syntax highlighting
  - Copy to clipboard
  - Format/prettify JSON
  - Show timestamps
  - Show duration
  - Error highlighting

**Message History**:
- Last 20 sent messages
- Show timestamp, action, parameters
- Status indicator (✓ success, ✗ error)
- Response time
- Click to reload message in builder
- Clear history button
- Export to JSON

**Implementation**:
- Use t3-transport library directly
- Monaco Editor for JSON editing
- Fluent UI components for controls
- Real-time updates via transport events

---

### 3.4 System Logs Tab

**Purpose**: View application logs (Rust backend, FFI calls, sync service)

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ 📝 System Logs Viewer                                       │
├─────────────────────────────────────────────────────────────┤
│ Log Level: [All ▼] [INFO] [WARN] [ERROR]   [🔄 Auto-refresh]│
│ Search: [________________] [🔍]             [Clear Logs]    │
├─────────────────────────────────────────────────────────────┤
│ Timestamp         │ Level │ Source          │ Message       │
├───────────────────┼───────┼─────────────────┼───────────────┤
│ 10:30:45.123      │ INFO  │ FFI Sync        │ Loaded 45...  │
│ 10:30:44.890      │ DEBUG │ WebSocket       │ Connected...  │
│ 10:30:43.567      │ WARN  │ Device API      │ Timeout on... │
│ 10:30:42.234      │ ERROR │ Database        │ Failed to...  │
├─────────────────────────────────────────────────────────────┤
│ 1,234 logs | Showing 1-100 | [Prev] [Next] [Export]        │
└─────────────────────────────────────────────────────────────┘
```

**Features**:
- Filter by log level
- Search logs
- Color-coded levels (red=error, yellow=warn, blue=info)
- Auto-refresh toggle
- Export to file
- Clear logs
- Pagination

---

## 4. Navigation Flow

### Menu Route Structure
```
/develop
├── /develop/files          (File Browser)
├── /develop/database       (Database Viewer)
├── /develop/transport      (Transport Tester)
└── /develop/logs           (System Logs)
```

### URL Examples
```
http://localhost:3003/#/develop/files
http://localhost:3003/#/develop/database?db=webview_t3_device.db
http://localhost:3003/#/develop/transport?transport=websocket
http://localhost:3003/#/develop/logs?level=error
```

---

## 5. Technical Implementation

### File Structure
```
src/t3-react/features/develop/
├── layout/
│   ├── DevelopLayout.tsx           (Left nav + content area)
│   ├── DevelopLayout.module.css
│   └── DevelopNav.tsx              (Left navigation menu)
├── pages/
│   ├── FileBrowserPage.tsx         (File/folder browser)
│   ├── DatabaseViewerPage.tsx      (SQL query tool)
│   ├── TransportTesterPage.tsx     (Message tester)
│   └── SystemLogsPage.tsx          (Log viewer)
├── components/
│   ├── FileTree/                   (Folder tree component)
│   ├── SqlEditor/                  (SQL query editor)
│   ├── MessageBuilder/             (Transport message builder)
│   └── LogsViewer/                 (Logs display component)
└── services/
    ├── fileSystemService.ts        (File operations)
    ├── databaseService.ts          (SQLite operations)
    └── logsService.ts              (Log fetching)
```

### Key Dependencies
```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",      // Code/SQL editor
    "better-sqlite3": "^9.2.2",            // SQLite access
    "react-resizable-panels": "^1.0.0",    // Split panels
    "@fluentui/react-tree": "^9.0.0",      // Tree component
    "sql-formatter": "^15.0.0"             // SQL formatting
  }
}
```

### Fluent UI Components Used
- `Nav` - Left navigation menu
- `Tree` / `TreeItem` - File/folder tree
- `DataGrid` - Database results
- `TextField` - Input fields
- `Dropdown` - Selectors
- `Button` - Actions
- `Tabs` - Content switching
- `Badge` - Status indicators
- `Spinner` - Loading states

---

## 6. Security Considerations

### File Access
- ✅ Restrict to runtime folder only
- ✅ No parent directory traversal (../)
- ✅ Read-only by default
- ✅ Whitelist file extensions for preview

### Database Access
- ✅ Read-only queries by default
- ✅ Confirm before DELETE/UPDATE
- ✅ Query timeout (10 seconds)
- ✅ Row limit (1000 rows max)

### Transport Testing
- ✅ Local connections only (localhost)
- ✅ Timeout for all requests
- ✅ Validate message format
- ✅ Error boundary for crashes

---

## 7. User Experience

### Keyboard Shortcuts
- `Ctrl+R` - Refresh current view
- `Ctrl+F` - Search/Filter
- `F5` - Execute SQL query
- `Ctrl+K` - Clear console/logs
- `Ctrl+S` - Save (where applicable)
- `Esc` - Close dialogs

### Loading States
- Skeleton screens for grids
- Spinner for file operations
- Progress bar for large queries
- Timeout indicators

### Error Handling
- Friendly error messages
- Retry buttons
- Copy error to clipboard
- Error boundary fallback UI

---

## 8. Future Enhancements

### Phase 2 Features
- File editor (edit .ini, .json files)
- Database schema migration tools
- Performance profiler
- Network traffic monitor
- FFI call tracer
- Memory usage monitor
- Export database to SQL script
- Import data from CSV
- Query history persistence
- Custom query templates

---

## 9. Implementation Priority

### Phase 1 (MVP)
1. ✅ Develop layout with left nav
2. ✅ File browser (basic tree view)
3. ✅ Database viewer (table list + SELECT queries)
4. ✅ Transport tester (basic send/receive)

### Phase 2 (Enhanced)
5. SQL editor with syntax highlighting
6. Query history and templates
7. Message history and templates
8. System logs integration

### Phase 3 (Advanced)
9. File content editor
10. Database schema tools
11. Performance monitoring
12. Advanced debugging tools

---

## 10. Design Mockup References

### Color Scheme (Azure Portal)
```css
--bg-primary: #ffffff;
--bg-secondary: #fafafa;
--border-primary: #edebe9;
--text-primary: #292827;
--text-secondary: #605e5c;
--accent-blue: #0078d4;
--success-green: #107c10;
--warning-yellow: #faa500;
--error-red: #d13438;
```

### Typography
- Font: Segoe UI, 13px
- Headings: 500 weight, 20px
- Body: 400 weight, 13px
- Code: Consolas, 12px

---

## Summary

This design provides a comprehensive developer toolset for debugging T3000 WebView application with:

1. **File Browser**: Windows Explorer-like interface for runtime folder
2. **Database Viewer**: SQL Server Management Studio-like tool for SQLite databases
3. **Transport Tester**: Postman-like tool for testing t3-transport messages
4. **System Logs**: Centralized log viewer with filtering

All using Fluent UI components, Azure Portal styling, and consistent with the main application design.
