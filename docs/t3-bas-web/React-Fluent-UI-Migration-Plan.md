# Complete Migration Plan: Vue → React + Fluent UI

**Date**: November 4, 2025
**Purpose**: Full analysis of migrating T3000 from Vue 3 to React 18 + Fluent UI
**Scope**: Complete frontend rewrite

---

## Executive Summary

### Migration Scope

**FROM:**
- Vue 3 + Quasar + Ant Design Vue (mixed)
- JavaScript + TypeScript (partial)
- Pinia (if used) / Vuex
- Vue Router
- Composition API

**TO:**
- React 18+
- Fluent UI React (v9)
- TypeScript 100%
- Redux Toolkit / Zustand / Context API
- React Router
- Hooks + Functional Components

### Effort Estimation

| Phase | Duration | Effort |
|-------|----------|--------|
| **Setup & Infrastructure** | Low | Low |
| **Core Layout Migration** | Medium | Medium |
| **Component Migration** | High | High |
| **State Management** | Complex | Medium |
| **Testing & QA** | Complex | High |
| **Bug Fixes & Polish** | Complex | Medium |
| **TOTAL** | **Very Complex** | **Very High** |

---

## 1. What Needs to Be Migrated

### 1.1 File-by-File Migration Breakdown

#### **Current Vue Project Structure**
```
src/
├── App.vue                          → App.tsx
├── main.ts                          → main.tsx (React entry)
├── assets/                          → assets/ (reuse CSS, images)
├── boot/                            → ❌ DELETE (Quasar-specific)
├── components/                      → components/ (all .vue → .tsx)
│   ├── Basic/                       → Basic/
│   ├── Database/                    → Database/
│   ├── Grid/                        → Grid/
│   ├── Hvac/                        → Hvac/
│   ├── Navigation/                  → Navigation/
│   ├── NewUI/                       → NewUI/
│   └── ObjectTypes/                 → ObjectTypes/
├── css/                             → ❌ DELETE (Quasar styles)
├── layouts/                         → layouts/ (all .vue → .tsx)
│   ├── MainLayout.vue               → MainLayout.tsx
│   ├── MainLayout2.vue              → MainLayout2.tsx
│   ├── AppsLibLayout.vue            → AppsLibLayout.tsx
│   ├── ModbusRegLayout.vue          → ModbusRegLayout.tsx
│   └── TrendLogLayout.vue           → TrendLogLayout.tsx
├── lib/                             → lib/ (rewrite logic)
│   ├── api.js                       → api.ts (TypeScript)
│   ├── common.js                    → common.ts
│   ├── demo-data.js                 → demo-data.ts
│   ├── gridColumns.js               → gridColumns.tsx (React components)
│   └── T3000/                       → T3000/
│       ├── Hvac/                    → Hvac/ (rewrite)
│       ├── Security/                → Security/
│       └── T3000.ts                 → T3000.ts (may reuse some)
├── pages/                           → pages/ (all .vue → .tsx)
│   ├── V2/                          → V2/
│   │   ├── Dashboard.vue            → Dashboard.tsx
│   │   ├── TrendLogDashboard.vue    → TrendLogDashboard.tsx
│   │   ├── Schedules.vue            → Schedules.tsx
│   │   ├── ModbusRegister.vue       → ModbusRegister.tsx
│   │   ├── DiagnosticPage.vue       → DiagnosticPage.tsx
│   │   └── AppLibrary.vue           → AppLibrary.tsx
│   ├── AppsLibrary/                 → AppsLibrary/
│   ├── Dashboard/                   → Dashboard/
│   ├── HvacDrawer/                  → HvacDrawer/
│   ├── ModbusRegister/              → ModbusRegister/
│   ├── TrendLog/                    → TrendLog/
│   └── LoginPage.vue                → LoginPage.tsx
├── router/                          → router/
│   ├── index.js                     → index.tsx (React Router setup)
│   ├── routes.js                    → routes.tsx (JSX route definitions)
│   └── RouterErrorBoundary.js       → ErrorBoundary.tsx
└── types/                           → types/ (enhance TypeScript)
```

#### **Configuration Files to Change**

| File | Action | New Version |
|------|--------|-------------|
| `package.json` | Replace dependencies | React + Fluent UI |
| `tsconfig.json` | Update compiler options | React JSX support |
| `vite.config.ts` | Update plugins | @vitejs/plugin-react |
| `index.html` | Update root div | `<div id="root">` |
| `quasar.config.js` | ❌ DELETE | Not needed |
| `tailwind.config.js` | Keep or remove | Optional with Fluent |
| `.eslintrc.js` | Update rules | React rules |

---

## 2. Detailed Migration Tasks

### 2.1 Phase 1: Project Setup

#### Task 1.1: Remove Vue Dependencies
```bash
npm uninstall vue vue-router quasar @quasar/extras
npm uninstall ant-design-vue @ant-design/icons-vue
npm uninstall @quasar/app-vite
```

#### Task 1.2: Install React Dependencies
```bash
# Core React
npm install react@18 react-dom@18
npm install react-router-dom@6

# Fluent UI
npm install @fluentui/react-components
npm install @fluentui/react-icons

# State Management (choose one)
npm install @reduxjs/toolkit react-redux  # Option A
npm install zustand                        # Option B (simpler)

# TypeScript
npm install --save-dev @types/react @types/react-dom

# Build Tools
npm install --save-dev @vitejs/plugin-react
npm install --save-dev vite-tsconfig-paths

# Testing
npm install --save-dev vitest @testing-library/react
npm install --save-dev @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
```

#### Task 1.3: Update vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
  },
});
```

#### Task 1.4: Update tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,

    /* Paths */
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

#### Task 1.5: Create React Entry Point
**File**: `src/main.tsx`
```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import App from './App';
import './assets/styles/main.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FluentProvider theme={webLightTheme}>
      <App />
    </FluentProvider>
  </React.StrictMode>,
);
```

#### Task 1.6: Update index.html
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T3000 Portal</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### 2.2 Phase 2: Component Migration

#### Migration Effort by Component Count

**Current Components**: ~262 Vue files (from workspace search)

**Estimated Breakdown**:
- **Pages**: ~40 files × 4 hours = 160 hours (4 weeks)
- **Components**: ~180 files × 3 hours = 540 hours (13.5 weeks)
- **Layouts**: ~5 files × 8 hours = 40 hours (1 week)
- **Utilities**: ~37 files × 2 hours = 74 hours (2 weeks)

**TOTAL**: ~814 hours ≈ **20 weeks** (single developer)

#### Component Migration Patterns

##### Pattern 1: Simple Component (Vue → React)

**BEFORE** (Vue):
```vue
<!-- components/Basic/StatusIndicator.vue -->
<template>
  <div :class="['status', status]">
    <span class="dot"></span>
    <span>{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  status: 'online' | 'offline' | 'warning';
  label?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: '',
});

const statusClass = computed(() => `status-${props.status}`);
</script>

<style scoped>
.status {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}
.status.online .dot {
  background: green;
}
</style>
```

**AFTER** (React + Fluent UI):
```tsx
// components/Basic/StatusIndicator.tsx
import React from 'react';
import { Badge, Text } from '@fluentui/react-components';
import { makeStyles, tokens } from '@fluentui/react-components';

interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'warning';
  label?: string;
}

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalS,
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  online: {
    backgroundColor: tokens.colorPaletteGreenBackground3,
  },
  offline: {
    backgroundColor: tokens.colorPaletteRedBackground3,
  },
  warning: {
    backgroundColor: tokens.colorPaletteYellowBackground3,
  },
});

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  label,
}) => {
  const styles = useStyles();

  return (
    <div className={styles.container}>
      <span className={`${styles.dot} ${styles[status]}`} />
      {label && <Text>{label}</Text>}
    </div>
  );
};
```

##### Pattern 2: Form Component (v-model → useState)

**BEFORE** (Vue):
```vue
<template>
  <a-form :model="formData" @submit="onSubmit">
    <a-form-item label="Device Name">
      <a-input v-model:value="formData.name" />
    </a-form-item>
    <a-form-item label="IP Address">
      <a-input v-model:value="formData.ip" />
    </a-form-item>
    <a-button type="primary" html-type="submit">Save</a-button>
  </a-form>
</template>

<script setup lang="ts">
import { reactive } from 'vue';

const formData = reactive({
  name: '',
  ip: '',
});

const onSubmit = () => {
  console.log(formData);
};
</script>
```

**AFTER** (React + Fluent UI):
```tsx
import React, { useState } from 'react';
import {
  Field,
  Input,
  Button,
  makeStyles,
} from '@fluentui/react-components';

interface FormData {
  name: string;
  ip: string;
}

const useStyles = makeStyles({
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    maxWidth: '400px',
  },
});

export const DeviceForm: React.FC = () => {
  const styles = useStyles();
  const [formData, setFormData] = useState<FormData>({
    name: '',
    ip: '',
  });

  const handleChange = (field: keyof FormData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log(formData);
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <Field label="Device Name" required>
        <Input
          value={formData.name}
          onChange={handleChange('name')}
        />
      </Field>

      <Field label="IP Address" required>
        <Input
          value={formData.ip}
          onChange={handleChange('ip')}
        />
      </Field>

      <Button appearance="primary" type="submit">
        Save
      </Button>
    </form>
  );
};
```

##### Pattern 3: Layout Component (router-view → Outlet)

**BEFORE** (Vue):
```vue
<!-- layouts/MainLayout.vue -->
<template>
  <a-layout class="main-layout">
    <a-layout-header>
      <TopMenu />
    </a-layout-header>

    <a-layout>
      <a-layout-sider>
        <SideNav />
      </a-layout-sider>

      <a-layout-content>
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import TopMenu from '@/components/Navigation/TopMenu.vue';
import SideNav from '@/components/Navigation/SideNav.vue';
</script>
```

**AFTER** (React + Fluent UI):
```tsx
// layouts/MainLayout.tsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import { makeStyles, tokens } from '@fluentui/react-components';
import { TopMenu } from '@/components/Navigation/TopMenu';
import { SideNav } from '@/components/Navigation/SideNav';

const useStyles = makeStyles({
  layout: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  header: {
    height: '48px',
    backgroundColor: tokens.colorNeutralBackground1,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  sider: {
    width: '250px',
    backgroundColor: tokens.colorNeutralBackground2,
    borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  content: {
    flex: 1,
    padding: tokens.spacingVerticalL,
    overflow: 'auto',
  },
});

export const MainLayout: React.FC = () => {
  const styles = useStyles();

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <TopMenu />
      </header>

      <div className={styles.body}>
        <aside className={styles.sider}>
          <SideNav />
        </aside>

        <main className={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
```

---

### 2.3 Phase 3: Routing Migration

#### Vue Router → React Router

**BEFORE** (Vue Router):
```javascript
// router/routes.js
export default [
  {
    path: '/',
    component: () => import('layouts/MainLayout.vue'),
    children: [
      {
        path: '',
        name: 'home',
        component: () => import('pages/V2/Dashboard.vue'),
      },
      {
        path: 'devices',
        name: 'devices',
        component: () => import('pages/V2/DeviceList.vue'),
      },
    ],
  },
];
```

**AFTER** (React Router):
```tsx
// router/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '@/layouts/MainLayout';
import { Dashboard } from '@/pages/V2/Dashboard';
import { DeviceList } from '@/pages/V2/DeviceList';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'devices',
        element: <DeviceList />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
```

**App.tsx**:
```tsx
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes';

function App() {
  return <RouterProvider router={router} />;
}

export default App;
```

---

### 2.4 Phase 4: State Management Migration

#### Option A: Redux Toolkit (Recommended for large apps)

**BEFORE** (Vue - Pinia):
```typescript
// stores/device.store.ts (Pinia)
import { defineStore } from 'pinia';

export const useDeviceStore = defineStore('device', {
  state: () => ({
    selectedDevice: null as Device | null,
    devices: [] as Device[],
    isLoading: false,
  }),

  actions: {
    async fetchDevices() {
      this.isLoading = true;
      try {
        const response = await api.get('/devices');
        this.devices = response.data;
      } finally {
        this.isLoading = false;
      }
    },

    selectDevice(device: Device) {
      this.selectedDevice = device;
    },
  },

  getters: {
    deviceCount: (state) => state.devices.length,
    hasSelection: (state) => state.selectedDevice !== null,
  },
});
```

**AFTER** (React - Redux Toolkit):
```typescript
// store/slices/deviceSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { api } from '@/lib/api';

interface DeviceState {
  selectedDevice: Device | null;
  devices: Device[];
  isLoading: boolean;
}

const initialState: DeviceState = {
  selectedDevice: null,
  devices: [],
  isLoading: false,
};

export const fetchDevices = createAsyncThunk(
  'device/fetchDevices',
  async () => {
    const response = await api.get('/devices');
    return response.data;
  }
);

const deviceSlice = createSlice({
  name: 'device',
  initialState,
  reducers: {
    selectDevice: (state, action: PayloadAction<Device>) => {
      state.selectedDevice = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDevices.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchDevices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.devices = action.payload;
      })
      .addCase(fetchDevices.rejected, (state) => {
        state.isLoading = false;
      });
  },
});

export const { selectDevice } = deviceSlice.actions;
export default deviceSlice.reducer;

// Selectors
export const selectDeviceCount = (state: RootState) => state.device.devices.length;
export const selectHasSelection = (state: RootState) => state.device.selectedDevice !== null;
```

**Usage in Component**:
```tsx
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchDevices, selectDevice } from '@/store/slices/deviceSlice';

export const DeviceList: React.FC = () => {
  const dispatch = useAppDispatch();
  const devices = useAppSelector(state => state.device.devices);
  const isLoading = useAppSelector(state => state.device.isLoading);

  useEffect(() => {
    dispatch(fetchDevices());
  }, [dispatch]);

  const handleSelectDevice = (device: Device) => {
    dispatch(selectDevice(device));
  };

  // ...
};
```

#### Option B: Zustand (Simpler alternative)

```typescript
// store/deviceStore.ts
import { create } from 'zustand';
import { api } from '@/lib/api';

interface DeviceStore {
  selectedDevice: Device | null;
  devices: Device[];
  isLoading: boolean;

  fetchDevices: () => Promise<void>;
  selectDevice: (device: Device) => void;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  selectedDevice: null,
  devices: [],
  isLoading: false,

  fetchDevices: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/devices');
      set({ devices: response.data });
    } finally {
      set({ isLoading: false });
    }
  },

  selectDevice: (device) => set({ selectedDevice: device }),
}));
```

**Usage**:
```tsx
import { useDeviceStore } from '@/store/deviceStore';

export const DeviceList: React.FC = () => {
  const { devices, isLoading, fetchDevices, selectDevice } = useDeviceStore();

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  // ...
};
```

---

### 2.5 Phase 5: UI Component Library Migration

#### Component Mapping: Ant Design Vue → Fluent UI React

| Ant Design Vue | Fluent UI React | Migration Notes |
|----------------|-----------------|-----------------|
| `<a-button>` | `<Button>` | ✅ Direct mapping |
| `<a-input>` | `<Input>` | ✅ Direct mapping |
| `<a-select>` | `<Dropdown>` | ⚠️ Different API |
| `<a-table>` | `<DataGrid>` | ⚠️ Complete rewrite |
| `<a-modal>` | `<Dialog>` | ⚠️ Different API |
| `<a-form>` | `<Field>` + validation | ⚠️ Manual validation |
| `<a-menu>` | `<Menu>` | ✅ Similar API |
| `<a-tabs>` | `<TabList>` | ✅ Similar API |
| `<a-card>` | `<Card>` | ✅ Direct mapping |
| `<a-layout>` | Custom flexbox | ❌ Build custom |
| `<a-tree>` | `<Tree>` | ✅ Direct mapping |
| `<a-date-picker>` | `<DatePicker>` | ✅ Direct mapping |
| `<a-upload>` | Custom implementation | ❌ No built-in |
| `<a-breadcrumb>` | `<Breadcrumb>` | ✅ Direct mapping |
| `<a-drawer>` | `<Drawer>` | ✅ Direct mapping |
| `<a-tooltip>` | `<Tooltip>` | ✅ Direct mapping |
| `<a-popover>` | `<Popover>` | ✅ Direct mapping |
| `<a-checkbox>` | `<Checkbox>` | ✅ Direct mapping |
| `<a-radio>` | `<Radio>` | ✅ Direct mapping |
| `<a-switch>` | `<Switch>` | ✅ Direct mapping |
| `<a-slider>` | `<Slider>` | ✅ Direct mapping |
| `<a-progress>` | `<ProgressBar>` | ✅ Direct mapping |
| `<a-badge>` | `<Badge>` | ✅ Direct mapping |
| `<a-avatar>` | `<Avatar>` | ✅ Direct mapping |
| `<a-spin>` | `<Spinner>` | ✅ Direct mapping |

**Key Challenges**:
- ⚠️ **DataGrid**: Most complex migration (custom cell editors, sorting, filtering)
- ⚠️ **Form Validation**: Need to implement custom validation or use library (React Hook Form)
- ⚠️ **Upload**: No built-in Fluent UI Upload component

---

### 2.6 Phase 6: Special Cases

#### Migration Task: AG-Grid (if used)

**Current** (package.json shows):
```json
"ag-grid-community": "^31.0.1",
"ag-grid-enterprise": "^31.0.1",
"ag-grid-vue3": "^31.0.1"
```

**Migrate to**:
```bash
npm uninstall ag-grid-vue3
npm install ag-grid-react
```

**Component update**:
```tsx
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';

export const DataTable: React.FC = () => {
  const [rowData] = useState([...]);
  const [columnDefs] = useState([...]);

  return (
    <div className="ag-theme-alpine" style={{ height: 400 }}>
      <AgGridReact
        rowData={rowData}
        columnDefs={columnDefs}
      />
    </div>
  );
};
```

#### Migration Task: ECharts (Chart library)

**Current**:
```json
"echarts": "^5.4.1",
"vue-echarts": "^6.5.2"
```

**Migrate to**:
```bash
npm uninstall vue-echarts
npm install echarts-for-react
```

**Component update**:
```tsx
import ReactECharts from 'echarts-for-react';

export const TrendChart: React.FC = () => {
  const option = {
    title: { text: 'Trend Log' },
    xAxis: { type: 'time' },
    yAxis: {},
    series: [{
      type: 'line',
      data: [...],
    }],
  };

  return <ReactECharts option={option} />;
};
```

#### Migration Task: Canvas/SVG Graphics (Hvac drawings)

**Current**: Uses `fabric`, `svg.js`, `paper`

**Options**:
1. ✅ **Keep fabric.js** - Works with React (framework-agnostic)
2. ✅ **Use React-Konva** - React wrapper for Canvas API
3. ✅ **Use react-svg-canvas** - SVG manipulation in React

**No major changes needed** - these libraries work with React.

---

## 3. Complete File Migration Checklist

### 3.1 Components (180+ files)

- [ ] `components/Basic/` (5 files)
- [ ] `components/Database/` (10 files)
- [ ] `components/Grid/` (8 files)
- [ ] `components/Hvac/` (25 files)
- [ ] `components/Navigation/` (6 files)
- [ ] `components/NewUI/` (15 files)
- [ ] `components/ObjectTypes/` (30 files)

### 3.2 Pages (40+ files)

- [ ] `pages/V2/Dashboard.vue` → `Dashboard.tsx`
- [ ] `pages/V2/TrendLogDashboard.vue` → `TrendLogDashboard.tsx`
- [ ] `pages/V2/Schedules.vue` → `Schedules.tsx`
- [ ] `pages/V2/ModbusRegister.vue` → `ModbusRegister.tsx`
- [ ] `pages/V2/DiagnosticPage.vue` → `DiagnosticPage.tsx`
- [ ] `pages/V2/AppLibrary.vue` → `AppLibrary.tsx`
- [ ] `pages/AppsLibrary/` (4 files)
- [ ] `pages/Dashboard/` (3 files)
- [ ] `pages/HvacDrawer/` (2 files)
- [ ] `pages/ModbusRegister/` (1 file)
- [ ] `pages/TrendLog/` (2 files)
- [ ] `pages/LoginPage.vue` → `LoginPage.tsx`

### 3.3 Layouts (5 files)

- [ ] `layouts/MainLayout.vue` → `MainLayout.tsx`
- [ ] `layouts/MainLayout2.vue` → `MainLayout2.tsx`
- [ ] `layouts/AppsLibLayout.vue` → `AppsLibLayout.tsx`
- [ ] `layouts/ModbusRegLayout.vue` → `ModbusRegLayout.tsx`
- [ ] `layouts/TrendLogLayout.vue` → `TrendLogLayout.tsx`

### 3.4 Library Code (37+ files)

- [ ] `lib/api.js` → `lib/api.ts`
- [ ] `lib/common.js` → `lib/common.ts`
- [ ] `lib/demo-data.js` → `lib/demo-data.ts`
- [ ] `lib/gridColumns.js` → `lib/gridColumns.tsx`
- [ ] `lib/T3000/T3000.ts` (review, may reuse)
- [ ] `lib/T3000/Hvac/` (rewrite for React)
- [ ] `lib/T3000/Security/` (rewrite for React)

### 3.5 Router

- [ ] `router/index.js` → `router/index.tsx`
- [ ] `router/routes.js` → `router/routes.tsx`
- [ ] `router/RouterErrorBoundary.js` → `ErrorBoundary.tsx`

### 3.6 State Management (NEW)

- [ ] Create `store/store.ts` (Redux Toolkit config)
- [ ] Create `store/slices/deviceSlice.ts`
- [ ] Create `store/slices/authSlice.ts`
- [ ] Create `store/slices/dataSlice.ts`
- [ ] Create `store/hooks.ts` (typed hooks)

### 3.7 Configuration Files

- [ ] Update `package.json`
- [ ] Update `vite.config.ts`
- [ ] Update `tsconfig.json`
- [ ] Update `.eslintrc.js`
- [ ] Delete `quasar.config.js`
- [ ] Delete `quasar.extensions.json`
- [ ] Update `index.html`

---

## 4. Testing Strategy

### 4.1 Unit Tests Migration

**BEFORE** (Vue Test Utils):
```typescript
import { mount } from '@vue/test-utils';
import StatusIndicator from './StatusIndicator.vue';

describe('StatusIndicator', () => {
  it('renders online status', () => {
    const wrapper = mount(StatusIndicator, {
      props: { status: 'online', label: 'Online' },
    });
    expect(wrapper.text()).toContain('Online');
  });
});
```

**AFTER** (React Testing Library):
```typescript
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from './StatusIndicator';

describe('StatusIndicator', () => {
  it('renders online status', () => {
    render(<StatusIndicator status="online" label="Online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
```

### 4.2 Test Files to Migrate

- [ ] All `.spec.ts` / `.test.ts` files
- [ ] Update test utilities
- [ ] Migrate mock data
- [ ] Update test configuration

---

## 5. Risk Assessment

### 5.1 High-Risk Areas

| Area | Risk Level | Mitigation |
|------|------------|------------|
| **DataGrid/Tables** | 🔴 HIGH | Start early, allocate extra time |
| **Form Validation** | 🔴 HIGH | Use React Hook Form library |
| **State Management** | 🟡 MEDIUM | Good documentation available |
| **Canvas/Graphics** | 🟡 MEDIUM | Libraries are framework-agnostic |
| **Routing** | 🟢 LOW | React Router well-documented |
| **API Integration** | 🟢 LOW | Axios works with React |

### 5.2 Breaking Changes

1. **No reactivity system** - Must use `useState`, `useReducer`
2. **No template syntax** - JSX has different syntax rules
3. **No v-model** - Manual two-way binding with onChange
4. **No scoped styles** - Use CSS Modules or styled-components
5. **Different lifecycle** - `useEffect` vs `onMounted`/`onUpdated`

---

## 6. Migration Phases & Dependencies

### 6.1 Implementation Sequence

| Phase | Tasks | Complexity |
|------|-------|------|
| Setup | Dependencies, config, entry points | Low |
| Core Layout | MainLayout, routing, navigation | Medium |
| Pages (Phase 1) | Dashboard, DeviceList, TrendLog | Medium |
| Pages (Phase 2) | Remaining 30+ pages | High |
| Components (Phase 1) | Basic, Navigation, NewUI | Medium |
| Components (Phase 2) | Hvac, Grid, ObjectTypes | High |
| State Management | Redux slices, integration | High |
| Testing | Unit tests, integration tests | High |
| QA & Bug Fixes | Testing, fixes, polish | High |
| Performance & Deploy | Optimization, deployment | Medium |

---

## 7. Alternative: Gradual Migration

### 7.1 Micro-Frontend Approach

**Keep both Vue and React** side-by-side:

1. **Run Vue app** on `localhost:3000`
2. **Run React app** on `localhost:3001`
3. **Use iframe or Module Federation** to embed React components in Vue

**Pros:**
- ✅ Gradual migration
- ✅ Lower risk
- ✅ Can deliver features during migration

**Cons:**
- ❌ Complex build setup
- ❌ Larger bundle size
- ❌ Communication overhead between apps

### 7.2 Hybrid Timeline (Gradual)

- **Month 1-2**: Set up React app separately
- **Month 3-6**: Build new features in React only
- **Month 7-12**: Migrate Vue pages incrementally
- **Month 13-18**: Complete migration, remove Vue

**Total: 18 months** (slower but safer)

---

## 8. Recommendation

### 8.1 Should You Migrate?

**✅ Migrate to React + Fluent UI IF:**
- You want 100% Microsoft Fluent design
- You have significant time available
- Long-term product (5+ years)
- Learning React is acceptable

**❌ DON'T Migrate IF:**
- Need to deliver features quickly (next 6 months)
- Vue expertise is strong
- Ant Design + Azure theme is "good enough"

### 8.2 My Recommendation

**Stay with Vue + Ant Design + Azure Theme** because:
1. ✅ Already built and working
2. ✅ 95% visual similarity to Azure Portal
3. ✅ Quick implementation vs full rewrite
4. ✅ Minimal effort required
5. ✅ Team already knows Vue
6. ✅ Can focus on features, not rewrites

**Only migrate if**:
- Microsoft mandates Fluent UI for partnership
- You're building a new app from scratch
- You have 9+ months without feature pressure

---

## 9. Final Deliverables After Migration

### 9.1 New Project Structure

```
src/
├── main.tsx                      # React entry point
├── App.tsx                       # Root component
├── router/
│   ├── index.tsx                 # Router setup
│   └── routes.tsx                # Route definitions
├── store/
│   ├── store.ts                  # Redux store
│   ├── hooks.ts                  # Typed hooks
│   └── slices/
│       ├── deviceSlice.ts
│       ├── authSlice.ts
│       └── dataSlice.ts
├── components/                   # React components (.tsx)
├── pages/                        # Page components (.tsx)
├── layouts/                      # Layout components (.tsx)
├── lib/
│   ├── api.ts                    # API client
│   ├── types/                    # TypeScript types
│   └── utils/                    # Utilities
├── assets/                       # Static assets
└── tests/                        # Test files

package.json                      # React dependencies
vite.config.ts                    # Vite config for React
tsconfig.json                     # TypeScript config
```

### 9.2 Migration Completion Criteria

- [ ] All 262+ Vue files converted to React
- [ ] All tests passing (unit + integration)
- [ ] Performance benchmarks met
- [ ] Accessibility compliance (WCAG 2.1 AA)
- [ ] Documentation updated
- [ ] Team trained on React + Fluent UI
- [ ] Production deployment successful

---

## 10. Summary

**Migration Scope**: Complete rewrite of frontend
**Effort**: Very High - Complex migration
**Risk**: High
**Benefit**: 100% Fluent UI design

**Alternative**: Stay with Vue + Ant Design + Azure theme (much faster)

**Decision**: Up to you! 🎯

