# T3000 to T3BASWeb Migration Documentation

**Project**: Migrate T3000 C++ MFC Application to T3BASWeb (Vue 3 + Ant Design Vue)
**Last Updated**: November 4, 2025
**Status**: Analysis Complete - Ready for Development

---

## 📚 Documentation Index

### Core Analysis Documents

1. **[T3000-Layout-Architecture-Analysis.md](./T3000-Layout-Architecture-Analysis.md)** ⭐ START HERE
   - Complete C++ MFC UI structure analysis
   - 37 view types documented
   - Menu, toolbar, tree, status bar breakdown
   - Navigation flow and data flow architecture
   - **READ THIS FIRST** to understand the existing C++ application

2. **[T3000-Ant-Design-Migration-Plan.md](./T3000-Ant-Design-Migration-Plan.md)** ⭐ IMPLEMENTATION GUIDE
   - Complete migration strategy using Ant Design Vue
   - MFC → Ant Design component mapping
   - Layout implementation with code examples
   - Routing strategy
   - State management (Pinia stores)
   - Reusable component specifications
   - Project structure
   - **USE THIS** for implementing T3BASWeb

3. **[T3000-Feature-Inventory.md](./T3000-Feature-Inventory.md)** 📋 REFERENCE
   - Complete catalog of all 229 dialogs
   - Organized by 14 subsystems
   - Complexity ratings and migration estimates
   - Reusable component patterns
   - Phase-by-phase migration recommendations

### Reference Data

4. **[T3000-Complete-Dialog-List.csv](./T3000-Complete-Dialog-List.csv)** 📊 SPREADSHEET
   - Sortable/filterable spreadsheet
   - All 229 dialogs with IDs, names, subsystems
   - Use for planning and prioritization

5. **[dialog-ids.txt](./dialog-ids.txt)** 📝 RAW DATA
   - Raw extraction of all dialog IDs from resource.h
   - Developer reference

---

## 🎯 Quick Start Guide

### For Developers

**Step 1**: Read the analysis
```
1. Read T3000-Layout-Architecture-Analysis.md
   - Understand the existing C++ structure
   - Learn the 37 view types
   - Understand navigation patterns

2. Read T3000-Ant-Design-Migration-Plan.md
   - Learn the Ant Design component mapping
   - Review the layout implementation
   - Study the routing strategy
```

**Step 2**: Set up development environment
```bash
# Clone repository
git clone https://github.com/temcocontrols/T3000Webview.git
cd T3000Webview
git checkout feature/new-ui

# Install dependencies
npm install

# Install Ant Design Vue
npm install ant-design-vue@4.x
npm install @ant-design/icons-vue
npm install pinia@2.x

# Start development server
npm run dev
```

**Step 3**: Create T3BASWeb structure
```bash
# Create folder structure in src/
mkdir -p src/T3BASWeb/{api,components,composables,config,layouts,router,stores,types,utils,views,assets/styles}

# Follow the detailed structure in T3000-Ant-Design-Migration-Plan.md
```

### For Project Managers

**Review Priority**:
1. T3000-Feature-Inventory.md - Understand scope (229 dialogs)
2. T3000-Ant-Design-Migration-Plan.md - Review implementation plan
3. T3000-Complete-Dialog-List.csv - Prioritize features

**Key Numbers**:
- **Total Dialogs**: 229
- **Recommend Migrating**: 40-50 core dialogs (80-90% coverage)
- **37 View Types**: Device-specific views
- **14 Subsystems**: BACnet, Tstat, I/O, Sensors, etc.

---

## 🏗️ T3BASWeb Architecture Overview

### Technology Stack

```
Frontend:
  - Vue 3.3+ (Composition API)
  - Ant Design Vue 4.x
  - TypeScript 5.x
  - Pinia 2.x (state management)
  - Vue Router 4.x
  - Apache ECharts 5.x (charts)
  - Vite 5.x (build tool)

Backend (Existing):
  - Rust (Actix-web/Axum)
  - SQLite
  - WebSocket
  - C++ FFI (BACnet/Modbus)
```

### Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Header (Menu + Toolbar)                            │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│  Left Sider  │  Central Content (Router View)       │
│  (Tree)      │                                      │
│  300px       │  Dynamic based on selection          │
│              │                                      │
├──────────────┴──────────────────────────────────────┤
│  Footer (Status Bar - 4 panes)                      │
└─────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
MainLayout.vue
├── Header
│   ├── Logo
│   ├── Menu (horizontal)
│   └── Toolbar (buttons)
├── Layout
│   ├── Sider (left panel)
│   │   ├── Search
│   │   └── Tree (building/device)
│   └── Content (central view)
│       └── RouterView
│           ├── TstatView
│           ├── BacnetInputsView
│           ├── BacnetOutputsView
│           ├── GraphicsView
│           └── ... (more views)
└── Footer (status bar)
```

---

## 📋 Migration Phases

### Phase 1: Core Layout (Week 1-2) ✅ CURRENT
- [ ] Set up project structure
- [ ] Install Ant Design Vue
- [ ] Implement MainLayout component
- [ ] Implement DeviceTree component
- [ ] Set up routing
- [ ] Set up Pinia stores
- [ ] Create API clients

### Phase 2: Essential Views (Week 3-8)
- [ ] Tstat View
- [ ] BACnet Inputs View (with DataPointGrid)
- [ ] BACnet Outputs View
- [ ] BACnet Variables View
- [ ] Trend Log View
- [ ] Network View

### Phase 3: Configuration Dialogs (Week 9-12)
- [ ] BACnet Settings (tabbed)
- [ ] Schedule Editors
- [ ] User Management
- [ ] Device Configuration

### Phase 4: Advanced Features (Week 13-16)
- [ ] Graphics Editor (simplified)
- [ ] Program Editor
- [ ] Custom views

---

## 🔑 Key Decisions

### 1. UI Framework: Ant Design Vue ✅
**Why**: Enterprise-grade, comprehensive component library, excellent TypeScript support

### 2. Not Migrating All 229 Dialogs ✅
**Why**: 40-50 core dialogs cover 80-90% of usage. Keep legacy T3000.exe for specialized features.

### 3. Folder Name: T3BASWeb ✅
**Why**: T3 Building Automation System Web - Clear, concise, descriptive

### 4. Lazy Loading Views ✅
**Why**: Better performance, faster initial load. Use Vue Router for code splitting.

---

## 📊 Current Status

| Task | Status | Notes |
|------|--------|-------|
| C++ Layout Analysis | ✅ Complete | See T3000-Layout-Architecture-Analysis.md |
| Ant Design Migration Plan | ✅ Complete | See T3000-Ant-Design-Migration-Plan.md |
| Feature Inventory | ✅ Complete | 229 dialogs cataloged |
| Documentation Cleanup | ✅ Complete | Removed outdated Quasar-based docs |
| Project Setup | ⏸️ Ready | Awaiting implementation |
| Component Development | ⏸️ Pending | Waiting for setup |
| View Implementation | ⏸️ Pending | Waiting for components |

---

## 🚀 Next Steps

### Immediate (This Week)
1. **Set up T3BASWeb folder structure**
   - Create folder hierarchy in src/T3BASWeb/
   - Install Ant Design Vue dependencies
   - Configure TypeScript and Vite

2. **Implement MainLayout.vue**
   - Header with menu and toolbar
   - Left sider with device tree
   - Central content area with router-view
   - Status bar footer
   - Full code example in Migration Plan document

3. **Set up routing**
   - Configure Vue Router
   - Create route structure
   - Implement lazy loading

### Short Term (Next 2 Weeks)
1. **Build DeviceTree component**
2. **Implement first view (Tstat or BACnet Inputs)**
3. **Set up WebSocket real-time updates**
4. **Connect to Rust API**

### Medium Term (Next 1-2 Months)
1. **Implement 10-12 core views**
2. **Build reusable components**
3. **Set up testing framework**
4. **Performance optimization**

---

## 📞 Support & Resources

### Documentation
- [Vue 3 Docs](https://vuejs.org/)
- [Ant Design Vue Docs](https://antdv.com/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Pinia Docs](https://pinia.vuejs.org/)
- [Vue Router Docs](https://router.vuejs.org/)

### Repository
- **GitHub**: [temcocontrols/T3000Webview](https://github.com/temcocontrols/T3000Webview)
- **Branch**: `feature/new-ui`

### Getting Help
- Check existing documentation first
- Review code examples in Migration Plan
- Refer to T3000 C++ source code for business logic

---

## 📝 Document Changelog

| Date | Version | Changes |
|------|---------|---------|
| Nov 4, 2025 | 1.1 | **Cleanup**<br/>- Removed outdated Quasar-focused documents<br/>- Removed backend-only FFI documents<br/>- Kept only essential T3BASWeb migration docs |
| Nov 4, 2025 | 1.0 | Initial documentation<br/>- Created Layout Architecture Analysis<br/>- Created Ant Design Migration Plan<br/>- Created Feature Inventory |

---

**Status**: ✅ Documentation Complete & Cleaned - Ready for T3BASWeb Development

**Next Action**: Create T3BASWeb folder structure and implement MainLayout

