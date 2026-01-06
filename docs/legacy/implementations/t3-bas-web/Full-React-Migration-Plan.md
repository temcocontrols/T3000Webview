# Full React + FluentUI Migration Plan

**Status:** 📋 TODO - Future Migration Strategy
**Current State:** ✅ Hybrid Vue + React Architecture (Phase 1 Complete)
**Target State:** 🎯 Pure React + FluentUI Application
**Created:** November 9, 2025

---

## 🚀 Quick Start (Read This First!)

**If you're coming back to this project after time away:**

1. **Read the [Overview](#overview)** to understand why we're migrating
2. **Complete the [Resuming Work Checklist](#resuming-work-checklist)** below
3. **Jump directly to [Phase 2 Implementation Guide](#phase-2-implementation-guide-start-here-next-time)** to continue work
4. **Follow the step-by-step instructions** - they're complete and self-contained
5. **Use the [Troubleshooting](#troubleshooting-common-issues)** section if you hit issues

**Current Status:** Phase 1 complete ✅
**Next Action:** Start Phase 2 (Settings Page Migration) when ready---

## 📋 Resuming Work Checklist

**Use this checklist every time you return to work on the migration:**

### Before Starting Coding (5-10 minutes)

```bash
# 1. Update your local repository
git checkout feature/t3-was-web
git pull origin feature/t3-was-web

# 2. Check what's been completed
echo "=== Checking React pages ==="
ls -la src/t3-react/pages/

echo "=== Checking React routes ==="
grep -n "<Route" src/t3-react/App.tsx

echo "=== Checking Vue redirects ==="
grep -n "redirect.*t3000" src/t3-vue/router/routes.js

# 3. Install any new dependencies
npm install

# 4. Start development server
npm run client-dev
```

### Determine Where You Are

**Check off what's already done:**

- [ ] ✅ Phase 1: Hybrid architecture (should be done)
- [ ] Settings page migrated to React
- [ ] Inputs page with DataGrid working
- [ ] Outputs page with DataGrid working
- [ ] Variables page with DataGrid working
- [ ] Programs page with DataGrid working
- [ ] Device tree component working
- [ ] State management (Zustand) implemented
- [ ] API layer with React Query working

**Next Task Based on Progress:**

Based on what's checked above, go to:

- **If nothing in Phase 2 done:** Start at [Phase 2.1 (Settings)](#phase-21-settings-page-migration-week-1-2)
- **If Settings done:** Start at [Phase 2.2 (Inputs)](#phase-22-inputs-table-week-3-4)
- **If Settings + Inputs done:** Start at [Phase 2.3 (Other Tables)](#phase-23-repeat-for-outputs-variables-programs-week-5-8)
- **If all tables done:** Start at [Phase 2.4 (Common Components)](#phase-24-common-components-week-9-10)
- **If everything done:** Review [Phase 2 Completion Checklist](#phase-2-completion-checklist)

### Quick Context Refresh

1. **Review the pattern:**
   - Every page follows the same structure (see [Phase 2.2](#phase-22-inputs-table-week-3-4))
   - Copy-paste and adapt - don't reinvent

2. **Remember the architecture:**
   - Vue is still the main app
   - React runs inside `/t3000/*` routes
   - Vue redirects to React for migrated pages

3. **Key files to know:**
   - `src/t3-react/App.tsx` - React routes
   - `src/t3-vue/router/routes.js` - Vue redirects
   - `src/t3-react/store/useAppStore.ts` - Global state
   - `src/t3-react/services/api.ts` - API calls

---

## Table of Contents1. [Overview](#overview)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Migration Phases](#migration-phases)
5. [Detailed Steps](#detailed-steps)
6. [Risk Assessment](#risk-assessment)
7. [Rollback Strategy](#rollback-strategy)
8. [Success Criteria](#success-criteria)

---

## Overview

This document outlines the complete migration path from the current hybrid Vue/Quasar + React architecture to a pure React + FluentUI application.

### Why Migrate?

**Benefits:**
- ✅ Single framework reduces complexity
- ✅ Consistent UI with FluentUI design system
- ✅ Better TypeScript support
- ✅ Smaller bundle size (no dual framework overhead)
- ✅ Easier maintenance and onboarding
- ✅ Modern React 18 features (concurrent rendering, suspense)
- ✅ Better performance with Vite

**Current Challenges with Hybrid:**
- ⚠️ Two routing systems (Vue Router + React Router)
- ⚠️ Two state management approaches
- ⚠️ Larger bundle (Vue + React both loaded)
- ⚠️ Complex debugging across frameworks
- ⚠️ Duplicate dependencies

---

## Current Architecture

```
┌─────────────────────────────────────────────────┐
│ Quasar Framework (Vue 3)                        │
│                                                 │
│  ├─ Vue Router (Main Router)                   │
│  │   ├─ / → Vue Pages                          │
│  │   ├─ /settings → Vue Pages                  │
│  │   └─ /t3000/* → ReactContainer.vue          │
│  │                    └─ React + FluentUI      │
│  │                                              │
│  ├─ Quasar Components (q-btn, q-input, etc.)   │
│  ├─ Quasar Dev Server                          │
│  └─ Quasar Build System                        │
└─────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Frontend:** Vue 3 + Quasar 2.18.2
- **New UI:** React 18 + FluentUI v9
- **Build Tool:** Quasar CLI (Vite under the hood)
- **Backend:** Rust (Actix-web)
- **Routing:** Vue Router (primary) + React Router (nested)

---

## Target Architecture

```
┌─────────────────────────────────────────────────┐
│ React 18 Application                            │
│                                                 │
│  ├─ React Router (Single Router)               │
│  │   ├─ / → React Pages                        │
│  │   ├─ /settings → React Pages                │
│  │   ├─ /t3000/* → React Pages                 │
│  │   └─ /* → All Routes in React               │
│  │                                              │
│  ├─ FluentUI v9 Components                     │
│  ├─ Vite Dev Server                            │
│  └─ Vite Build System                          │
└─────────────────────────────────────────────────┘
```

**Tech Stack:**
- **Frontend:** React 18 + TypeScript
- **UI Library:** FluentUI v9
- **Build Tool:** Vite
- **Backend:** Rust (Actix-web) - unchanged
- **Routing:** React Router v6

---

## Migration Phases

### Phase 1: ✅ COMPLETE - Hybrid Architecture (Current)

**Goal:** Establish React + FluentUI foundation

**Completed:**
- ✅ React app running on `/t3000/*` routes
- ✅ FluentUI components integrated
- ✅ Icon system working (iconMapper utility)
- ✅ Three-panel layout (TreePanel, Content, PropertiesPanel)
- ✅ Header with menu bar and toolbar
- ✅ HomePage with dashboard
- ✅ Routing between Vue and React working
- ✅ Both frameworks coexisting peacefully

**Duration:** Complete (November 2025)

---

### Phase 2: 📋 TODO - Expand React Coverage

**Goal:** Migrate 50% of features to React

**Tasks:**

#### 2.1 Migrate Core Pages
- [ ] Settings page → React
- [ ] User management → React
- [ ] Device discovery → React
- [ ] Building management → React

#### 2.2 Implement Data Grids
- [ ] Inputs table with FluentUI DataGrid
- [ ] Outputs table with FluentUI DataGrid
- [ ] Variables table with FluentUI DataGrid
- [ ] Programs table with FluentUI DataGrid

#### 2.3 Build Common Components
- [ ] Device tree component (React)
- [ ] Properties panel (React)
- [ ] Notification system (FluentUI Toast)
- [ ] Dialog system (FluentUI Dialog)
- [ ] Loading states (FluentUI Spinner)

#### 2.4 State Management
- [ ] Set up React Context for global state
- [ ] Or integrate Zustand/Redux if needed
- [ ] Migrate Vue stores to React state

**Estimated Duration:** See individual phase sections for details

---

### Phase 3: 📋 TODO - Complete Feature Parity

**Goal:** All features working in React

**Tasks:**

#### 3.1 Complex Features
- [ ] Graphics editor → React + Canvas API
- [ ] Trend log viewer → React + D3.js
- [ ] Scheduler UI → React + FluentUI Calendar
- [ ] Alarm management → React
- [ ] PID controller UI → React

#### 3.2 Forms and Validation
- [ ] Migrate all Vue forms to React
- [ ] Implement form validation (React Hook Form)
- [ ] Build reusable form components

#### 3.3 Testing
- [ ] Write unit tests for React components (Vitest)
- [ ] Integration tests for critical flows
- [ ] E2E tests (Playwright/Cypress)

---

### Phase 4: 📋 TODO - Infrastructure Migration

**Goal:** Replace build system and remove Vue

**Tasks:**

#### 4.1 Build System Migration
- [ ] Create standalone Vite config
- [ ] Remove Quasar CLI dependencies
- [ ] Update `package.json` scripts
- [ ] Configure Vite plugins for React

#### 4.2 Entry Point Changes
- [ ] Create new `src/main.tsx`
- [ ] Update `index.html` for React
- [ ] Remove Quasar boot system
- [ ] Configure FluentUI provider at root

#### 4.3 Routing Migration
- [ ] Consolidate all routes in React Router
- [ ] Remove Vue Router
- [ ] Update route configuration
- [ ] Test all navigation flows

---

### Phase 5: 📋 TODO - Cleanup and Optimization

**Goal:** Remove Vue completely, optimize bundle

**Tasks:**

#### 5.1 Remove Vue Code
- [ ] Delete `src/t3-vue/` directory
- [ ] Delete `src/boot/` directory
- [ ] Remove `quasar.config.js`
- [ ] Remove Vue dependencies from `package.json`

#### 5.2 Optimize Bundle
- [ ] Code splitting with React.lazy()
- [ ] Tree shaking verification
- [ ] Bundle analysis and optimization
- [ ] Lazy load FluentUI components

#### 5.3 Final Testing
- [ ] Full regression testing
- [ ] Performance benchmarks
- [ ] Browser compatibility testing
- [ ] Accessibility audit

**Estimated Duration:** 2-3 weeks

---

## Detailed Steps

### Step 1: Prepare New React Entry Point

**File: `src/main.tsx` (NEW)**

```tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { BrowserRouter } from 'react-router-dom';
import App from './t3-react/App';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <FluentProvider theme={webLightTheme}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FluentProvider>
  </React.StrictMode>
);
```

---

### Step 2: Create Vite Configuration

**File: `vite.config.ts` (REPLACE)**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@t3-react': path.resolve(__dirname, './src/t3-react'),
      '@shared': path.resolve(__dirname, './src/shared'),
    }
  },
  server: {
    port: 3003,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'fluentui': ['@fluentui/react-components', '@fluentui/react-icons'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  }
});
```

---

### Step 3: Update index.html

**File: `index.html` (REPLACE)**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>T3000 Web Interface</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

---

### Step 4: Update package.json Scripts

**File: `package.json` (UPDATE)**

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "api-dev": "cd api && cargo watch -x \"run --example run_server\"",
    "full-dev": "concurrently \"npm run api-dev\" \"npm run dev\""
  }
}
```

---

### Step 5: Migrate Vue Components to React

**Example: Settings Page**

**Before (Vue):**
```vue
<template>
  <div class="settings-page">
    <h1>Settings</h1>
    <q-form @submit="handleSubmit">
      <q-input v-model="formData.name" label="Name" />
      <q-btn type="submit" label="Save" />
    </q-form>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const formData = ref({ name: '' });

const handleSubmit = () => {
  console.log('Saved:', formData.value);
};
</script>
```

**After (React):**
```tsx
import React, { useState } from 'react';
import { Input, Button } from '@fluentui/react-components';

export default function SettingsPage() {
  const [formData, setFormData] = useState({ name: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saved:', formData);
  };

  return (
    <div className="settings-page">
      <h1>Settings</h1>
      <form onSubmit={handleSubmit}>
        <Input
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="Name"
        />
        <Button type="submit">Save</Button>
      </form>
    </div>
  );
}
```

---

### Step 6: Component Mapping

| Quasar Component | FluentUI Equivalent | Notes |
|------------------|---------------------|-------|
| `q-btn` | `Button` | Direct replacement |
| `q-input` | `Input` | Similar API |
| `q-select` | `Dropdown` | Different props structure |
| `q-checkbox` | `Checkbox` | Direct replacement |
| `q-radio` | `Radio` | Use `RadioGroup` wrapper |
| `q-dialog` | `Dialog` | Different open/close pattern |
| `q-notify` | `Toast` / `MessageBar` | Use Toast for notifications |
| `q-table` | `DataGrid` | More powerful but complex |
| `q-tabs` | `TabList` | Different component structure |
| `q-card` | `Card` | Similar concept |
| `q-expansion-item` | `Accordion` | Similar functionality |
| `q-menu` | `Menu` | Different trigger pattern |
| `q-tooltip` | `Tooltip` | Direct replacement |
| `q-icon` | FluentUI Icons | Import specific icons |
| `q-spinner` | `Spinner` | Direct replacement |

---

### Step 7: Dependencies Cleanup

**Remove from package.json:**
```json
{
  "dependencies": {
    // REMOVE:
    "quasar": "^2.18.2",
    "@quasar/extras": "^1.15.11",
    "vue": "^3.4.0",
    "vue-router": "^4.0.0"
  },
  "devDependencies": {
    // REMOVE:
    "@quasar/app-vite": "^1.4.3",
    "@vue/compiler-sfc": "^3.4.0"
  }
}
```

**Ensure these remain:**
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@fluentui/react-components": "^9.47.0",
    "@fluentui/react-icons": "^2.0.239"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0"
  }
}
```

---

### Step 8: State Management Setup

**Option A: React Context (Simpler)**

**File: `src/t3-react/context/AppContext.tsx` (NEW)**

```tsx
import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Device {
  id: number;
  name: string;
  status: 'online' | 'offline';
}

interface AppState {
  selectedDevice: Device | null;
  devices: Device[];
  user: { name: string; role: string } | null;
}

interface AppContextType extends AppState {
  setSelectedDevice: (device: Device | null) => void;
  setDevices: (devices: Device[]) => void;
  setUser: (user: { name: string; role: string } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  return (
    <AppContext.Provider
      value={{
        selectedDevice,
        devices,
        user,
        setSelectedDevice,
        setDevices,
        setUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
}
```

**Usage in components:**

```tsx
import { useAppContext } from '@t3-react/context/AppContext';

function DeviceList() {
  const { devices, selectedDevice, setSelectedDevice } = useAppContext();

  return (
    <div>
      {devices.map(device => (
        <Button
          key={device.id}
          onClick={() => setSelectedDevice(device)}
          appearance={selectedDevice?.id === device.id ? 'primary' : 'secondary'}
        >
          {device.name}
        </Button>
      ))}
    </div>
  );
}
```

**Option B: Zustand (More Scalable)**

```bash
npm install zustand
```

**File: `src/t3-react/store/useAppStore.ts` (NEW)**

```tsx
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface Device {
  id: number;
  name: string;
  status: 'online' | 'offline';
}

interface AppStore {
  // State
  selectedDevice: Device | null;
  devices: Device[];
  user: { name: string; role: string } | null;
  isLoading: boolean;

  // Actions
  setSelectedDevice: (device: Device | null) => void;
  setDevices: (devices: Device[]) => void;
  setUser: (user: { name: string; role: string } | null) => void;
  setLoading: (loading: boolean) => void;

  // Async actions
  fetchDevices: () => Promise<void>;
  connectDevice: (deviceId: number) => Promise<void>;
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        selectedDevice: null,
        devices: [],
        user: null,
        isLoading: false,

        // Sync actions
        setSelectedDevice: (device) => set({ selectedDevice: device }),
        setDevices: (devices) => set({ devices }),
        setUser: (user) => set({ user }),
        setLoading: (loading) => set({ isLoading: loading }),

        // Async actions
        fetchDevices: async () => {
          set({ isLoading: true });
          try {
            const response = await fetch('/api/devices');
            const devices = await response.json();
            set({ devices, isLoading: false });
          } catch (error) {
            console.error('Failed to fetch devices:', error);
            set({ isLoading: false });
          }
        },

        connectDevice: async (deviceId) => {
          set({ isLoading: true });
          try {
            await fetch(`/api/devices/${deviceId}/connect`, { method: 'POST' });
            const device = get().devices.find(d => d.id === deviceId);
            if (device) {
              set({ selectedDevice: device, isLoading: false });
            }
          } catch (error) {
            console.error('Failed to connect device:', error);
            set({ isLoading: false });
          }
        },
      }),
      {
        name: 't3000-storage', // LocalStorage key
        partialize: (state) => ({ user: state.user }), // Only persist user
      }
    )
  )
);
```

**Usage in components:**

```tsx
import { useAppStore } from '@t3-react/store/useAppStore';

function DeviceList() {
  const { devices, selectedDevice, setSelectedDevice, fetchDevices } = useAppStore();

  useEffect(() => {
    fetchDevices();
  }, []);

  return (
    <div>
      {devices.map(device => (
        <Button
          key={device.id}
          onClick={() => setSelectedDevice(device)}
          appearance={selectedDevice?.id === device.id ? 'primary' : 'secondary'}
        >
          {device.name}
        </Button>
      ))}
    </div>
  );
}
```

---

### Step 9: API Integration Layer

**File: `src/t3-react/services/api.ts` (NEW)**

```tsx
const API_BASE = '/api';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new ApiError(response.status, `API Error: ${response.statusText}`);
  }

  return response.json();
}

export const api = {
  // Devices
  getDevices: () => fetchApi<Device[]>('/devices'),
  getDevice: (id: number) => fetchApi<Device>(`/devices/${id}`),
  updateDevice: (id: number, data: Partial<Device>) =>
    fetchApi<Device>(`/devices/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // Inputs
  getInputs: (deviceId: number) => fetchApi<Input[]>(`/devices/${deviceId}/inputs`),
  updateInput: (deviceId: number, inputId: number, value: number) =>
    fetchApi(`/devices/${deviceId}/inputs/${inputId}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),

  // Outputs
  getOutputs: (deviceId: number) => fetchApi<Output[]>(`/devices/${deviceId}/outputs`),
  updateOutput: (deviceId: number, outputId: number, value: number) =>
    fetchApi(`/devices/${deviceId}/outputs/${outputId}`, {
      method: 'PUT',
      body: JSON.stringify({ value }),
    }),
};
```

**Usage with React Query (Recommended):**

```bash
npm install @tanstack/react-query
```

**File: `src/t3-react/hooks/useDevices.ts` (NEW)**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@t3-react/services/api';

export function useDevices() {
  return useQuery({
    queryKey: ['devices'],
    queryFn: api.getDevices,
    staleTime: 30000, // 30 seconds
  });
}

export function useDevice(id: number) {
  return useQuery({
    queryKey: ['device', id],
    queryFn: () => api.getDevice(id),
    enabled: !!id,
  });
}

export function useUpdateDevice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Device> }) =>
      api.updateDevice(id, data),
    onSuccess: (updatedDevice) => {
      // Update cache
      queryClient.setQueryData(['device', updatedDevice.id], updatedDevice);
      queryClient.invalidateQueries({ queryKey: ['devices'] });
    },
  });
}
```

**Setup in App.tsx:**

```tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      {/* Rest of app */}
    </QueryClientProvider>
  );
}
```

---

### Step 10: FluentUI DataGrid Implementation

**File: `src/t3-react/components/InputsTable.tsx` (NEW)**

```tsx
import React from 'react';
import {
  DataGrid,
  DataGridHeader,
  DataGridRow,
  DataGridHeaderCell,
  DataGridBody,
  DataGridCell,
  TableColumnDefinition,
  createTableColumn,
  Input,
  Button,
} from '@fluentui/react-components';
import { Edit24Regular, Save24Regular } from '@fluentui/react-icons';

interface InputPoint {
  id: number;
  label: string;
  value: number;
  units: string;
  autoManual: 'auto' | 'manual';
  status: 'normal' | 'alarm' | 'offline';
}

export function InputsTable() {
  const [items, setItems] = React.useState<InputPoint[]>([
    { id: 1, label: 'Temperature', value: 72.5, units: '°F', autoManual: 'auto', status: 'normal' },
    { id: 2, label: 'Humidity', value: 45, units: '%', autoManual: 'auto', status: 'normal' },
    { id: 3, label: 'Pressure', value: 14.7, units: 'PSI', autoManual: 'manual', status: 'alarm' },
  ]);

  const [editingId, setEditingId] = React.useState<number | null>(null);

  const columns: TableColumnDefinition<InputPoint>[] = [
    createTableColumn<InputPoint>({
      columnId: 'label',
      renderHeaderCell: () => 'Label',
      renderCell: (item) => item.label,
    }),
    createTableColumn<InputPoint>({
      columnId: 'value',
      renderHeaderCell: () => 'Value',
      renderCell: (item) =>
        editingId === item.id ? (
          <Input
            type="number"
            defaultValue={item.value.toString()}
            size="small"
          />
        ) : (
          <span>{item.value}</span>
        ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'units',
      renderHeaderCell: () => 'Units',
      renderCell: (item) => item.units,
    }),
    createTableColumn<InputPoint>({
      columnId: 'autoManual',
      renderHeaderCell: () => 'Mode',
      renderCell: (item) => (
        <span style={{
          color: item.autoManual === 'auto' ? 'green' : 'orange',
          fontWeight: 'bold'
        }}>
          {item.autoManual.toUpperCase()}
        </span>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'status',
      renderHeaderCell: () => 'Status',
      renderCell: (item) => (
        <span style={{
          color: item.status === 'alarm' ? 'red' : 'green'
        }}>
          {item.status}
        </span>
      ),
    }),
    createTableColumn<InputPoint>({
      columnId: 'actions',
      renderHeaderCell: () => 'Actions',
      renderCell: (item) => (
        <Button
          icon={editingId === item.id ? <Save24Regular /> : <Edit24Regular />}
          size="small"
          onClick={() => setEditingId(editingId === item.id ? null : item.id)}
        >
          {editingId === item.id ? 'Save' : 'Edit'}
        </Button>
      ),
    }),
  ];

  return (
    <DataGrid
      items={items}
      columns={columns}
      sortable
      selectionMode="single"
      getRowId={(item) => item.id.toString()}
      style={{ minWidth: '600px' }}
    >
      <DataGridHeader>
        <DataGridRow>
          {({ renderHeaderCell }) => (
            <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
          )}
        </DataGridRow>
      </DataGridHeader>
      <DataGridBody<InputPoint>>
        {({ item, rowId }) => (
          <DataGridRow<InputPoint> key={rowId}>
            {({ renderCell }) => (
              <DataGridCell>{renderCell(item)}</DataGridCell>
            )}
          </DataGridRow>
        )}
      </DataGridBody>
    </DataGrid>
  );
}
```

---

### Step 11: Form Handling with React Hook Form

```bash
npm install react-hook-form @hookform/resolvers zod
```

**File: `src/t3-react/components/DeviceSettingsForm.tsx` (NEW)**

```tsx
import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Input,
  Button,
  Label,
  Field,
  Dropdown,
  Option,
} from '@fluentui/react-components';

const schema = z.object({
  deviceName: z.string().min(1, 'Device name is required').max(50),
  ipAddress: z.string().ip('Invalid IP address'),
  port: z.number().min(1).max(65535),
  baudRate: z.enum(['9600', '19200', '38400', '57600', '115200']),
  description: z.string().max(200).optional(),
});

type FormData = z.infer<typeof schema>;

export function DeviceSettingsForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      deviceName: '',
      ipAddress: '',
      port: 502,
      baudRate: '19200',
      description: '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} style={{ maxWidth: '500px' }}>
      <Field
        label="Device Name"
        required
        validationMessage={errors.deviceName?.message}
        validationState={errors.deviceName ? 'error' : 'none'}
      >
        <Controller
          name="deviceName"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="Enter device name" />
          )}
        />
      </Field>

      <Field
        label="IP Address"
        required
        validationMessage={errors.ipAddress?.message}
        validationState={errors.ipAddress ? 'error' : 'none'}
      >
        <Controller
          name="ipAddress"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="192.168.1.100" />
          )}
        />
      </Field>

      <Field
        label="Port"
        required
        validationMessage={errors.port?.message}
        validationState={errors.port ? 'error' : 'none'}
      >
        <Controller
          name="port"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type="number"
              onChange={(e) => field.onChange(Number(e.target.value))}
            />
          )}
        />
      </Field>

      <Field
        label="Baud Rate"
        required
        validationMessage={errors.baudRate?.message}
        validationState={errors.baudRate ? 'error' : 'none'}
      >
        <Controller
          name="baudRate"
          control={control}
          render={({ field }) => (
            <Dropdown {...field} placeholder="Select baud rate">
              <Option value="9600">9600</Option>
              <Option value="19200">19200</Option>
              <Option value="38400">38400</Option>
              <Option value="57600">57600</Option>
              <Option value="115200">115200</Option>
            </Dropdown>
          )}
        />
      </Field>

      <Field label="Description">
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input {...field} placeholder="Optional description" />
          )}
        />
      </Field>

      <Button
        type="submit"
        appearance="primary"
        disabled={isSubmitting}
        style={{ marginTop: '16px' }}
      >
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </Button>
    </form>
  );
}
```

---

### Step 12: Notification System

**File: `src/t3-react/hooks/useToast.ts` (NEW)**

```tsx
import { useToastController, Toast, ToastTitle, ToastBody } from '@fluentui/react-components';
import { useId } from '@fluentui/react-hooks';

export function useToast() {
  const toasterId = useId('toaster');
  const { dispatchToast } = useToastController(toasterId);

  const showToast = (
    message: string,
    intent: 'success' | 'error' | 'warning' | 'info' = 'info',
    title?: string
  ) => {
    dispatchToast(
      <Toast>
        {title && <ToastTitle>{title}</ToastTitle>}
        <ToastBody>{message}</ToastBody>
      </Toast>,
      { intent }
    );
  };

  return {
    success: (message: string, title?: string) => showToast(message, 'success', title),
    error: (message: string, title?: string) => showToast(message, 'error', title),
    warning: (message: string, title?: string) => showToast(message, 'warning', title),
    info: (message: string, title?: string) => showToast(message, 'info', title),
  };
}
```

**Usage:**

```tsx
import { useToast } from '@t3-react/hooks/useToast';

function MyComponent() {
  const toast = useToast();

  const handleSave = async () => {
    try {
      await api.saveData();
      toast.success('Data saved successfully!');
    } catch (error) {
      toast.error('Failed to save data', 'Error');
    }
  };

  return <Button onClick={handleSave}>Save</Button>;
}
```

---

### Step 13: Dialog System

**File: `src/t3-react/components/ConfirmDialog.tsx` (NEW)**

```tsx
import React from 'react';
import {
  Dialog,
  DialogTrigger,
  DialogSurface,
  DialogTitle,
  DialogBody,
  DialogActions,
  DialogContent,
  Button,
} from '@fluentui/react-components';

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  trigger: React.ReactElement;
}

export function ConfirmDialog({
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  trigger,
}: ConfirmDialogProps) {
  const [open, setOpen] = React.useState(false);

  const handleConfirm = () => {
    onConfirm();
    setOpen(false);
  };

  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(_, data) => setOpen(data.open)}>
      <DialogTrigger disableButtonEnhancement>
        {trigger}
      </DialogTrigger>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>{message}</DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={handleCancel}>
              {cancelText}
            </Button>
            <Button appearance="primary" onClick={handleConfirm}>
              {confirmText}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
```

**Usage:**

```tsx
<ConfirmDialog
  title="Delete Device"
  message="Are you sure you want to delete this device? This action cannot be undone."
  confirmText="Delete"
  onConfirm={handleDelete}
  trigger={<Button appearance="primary">Delete Device</Button>}
/>
```

---

## Phase 2 Implementation Guide (Start Here Next Time!)

This section provides a complete, self-contained guide for implementing Phase 2. Follow these steps in order when you're ready to begin.

### Prerequisites Checklist

Before starting Phase 2, ensure:
- ✅ Phase 1 complete (React running on `/t3000/*` routes)
- ✅ Git branch created: `feature/phase2-react-migration`
- ✅ Staging environment available for testing
- ✅ Backup of current production version

---

### Phase 2.1: Settings Page Migration

**Goal:** Convert Vue settings page to React as proof of concept

#### Step 1: Analyze Current Vue Settings Page

```bash
# Find the current Vue settings page
cd src/t3-vue/pages
ls -la | grep -i settings
# Example: SettingsPage.vue
```

**Document what it does:**
1. What forms does it have?
2. What API calls does it make?
3. What validations are in place?
4. What notifications does it show?

#### Step 2: Create React Settings Page Structure

**File: `src/t3-react/pages/SettingsPage.tsx` (CREATE NEW)**

```tsx
import React, { useState } from 'react';
import {
  makeStyles,
  Button,
  Input,
  Label,
  Field,
  Card,
  CardHeader,
  Text,
} from '@fluentui/react-components';
import { Save24Regular } from '@fluentui/react-icons';

const useStyles = makeStyles({
  container: {
    padding: '24px',
    maxWidth: '800px',
  },
  card: {
    marginBottom: '16px',
  },
  formField: {
    marginBottom: '16px',
  },
  buttonGroup: {
    display: 'flex',
    gap: '8px',
    marginTop: '24px',
  },
});

export default function SettingsPage() {
  const styles = useStyles();
  const [settings, setSettings] = useState({
    serverUrl: 'http://localhost:8080',
    timeout: 30,
    autoRefresh: true,
  });

  const handleSave = () => {
    console.log('Saving settings:', settings);
    // TODO: Add API call
  };

  return (
    <div className={styles.container}>
      <h1>Settings</h1>

      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold">Server Configuration</Text>}
          description={<Text>Configure connection to T3000 backend server</Text>}
        />

        <div style={{ padding: '16px' }}>
          <Field label="Server URL" required className={styles.formField}>
            <Input
              value={settings.serverUrl}
              onChange={(e) => setSettings({ ...settings, serverUrl: e.target.value })}
              placeholder="http://localhost:8080"
            />
          </Field>

          <Field label="Timeout (seconds)" className={styles.formField}>
            <Input
              type="number"
              value={settings.timeout.toString()}
              onChange={(e) => setSettings({ ...settings, timeout: Number(e.target.value) })}
            />
          </Field>

          <div className={styles.buttonGroup}>
            <Button
              appearance="primary"
              icon={<Save24Regular />}
              onClick={handleSave}
            >
              Save Settings
            </Button>
            <Button appearance="secondary">Cancel</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
```

#### Step 3: Add Route for Settings Page

**File: `src/t3-react/App.tsx` (UPDATE)**

Find the `<Routes>` section and add:

```tsx
import SettingsPage from './pages/SettingsPage';

// In the Routes component:
<Routes>
  <Route path="/" element={<MainLayout />}>
    <Route index element={<HomePage />} />
    {/* ADD THIS: */}
    <Route path="settings" element={<SettingsPage />} />
    {/* ... other routes */}
  </Route>
</Routes>
```

#### Step 4: Update Vue Router to Redirect

**File: `src/t3-vue/router/routes.js` (UPDATE)**

Find the settings route and change it:

```javascript
// OLD:
{
  path: '/settings',
  component: () => import('pages/SettingsPage.vue')
}

// NEW: Redirect to React
{
  path: '/settings',
  redirect: '/t3000/settings'
}
```

#### Step 5: Test the Migration

```bash
# Start dev server
npm run client-dev

# Open browser
# Navigate to http://localhost:3003/#/settings
# Should redirect to React settings page
# Verify all functionality works
```

**Test Checklist:**
- [ ] Page loads without errors
- [ ] All form fields render correctly
- [ ] Input validation works
- [ ] Save button functions
- [ ] Navigation to/from page works
- [ ] No console errors

#### Step 6: Add API Integration

**File: `src/t3-react/services/settingsApi.ts` (CREATE NEW)**

```tsx
import { fetchApi } from './api';

export interface Settings {
  serverUrl: string;
  timeout: number;
  autoRefresh: boolean;
  theme: 'light' | 'dark';
  language: string;
}

export const settingsApi = {
  getSettings: () => fetchApi<Settings>('/settings'),

  updateSettings: (settings: Partial<Settings>) =>
    fetchApi<Settings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
};
```

**File: `src/t3-react/hooks/useSettings.ts` (CREATE NEW)**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi, Settings } from '../services/settingsApi';
import { useToast } from './useToast';

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: settingsApi.updateSettings,
    onSuccess: (updatedSettings) => {
      queryClient.setQueryData(['settings'], updatedSettings);
      toast.success('Settings saved successfully!');
    },
    onError: (error) => {
      toast.error('Failed to save settings', 'Error');
      console.error('Settings update error:', error);
    },
  });
}
```

**Update SettingsPage.tsx to use hooks:**

```tsx
import { useSettings, useUpdateSettings } from '../hooks/useSettings';

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();

  const handleSave = () => {
    updateSettings.mutate(settings);
  };

  if (isLoading) {
    return <Spinner label="Loading settings..." />;
  }

  // ... rest of component
}
```

---

### Phase 2.2: Inputs Table

**Goal:** Create fully functional Inputs data grid

#### Step 1: Create Inputs Page Component

**File: `src/t3-react/pages/InputsPage.tsx` (CREATE NEW)**

```tsx
import React from 'react';
import { makeStyles } from '@fluentui/react-components';
import { InputsTable } from '../components/InputsTable';
import { useDevice } from '../hooks/useDevices';
import { useAppStore } from '../store/useAppStore';

const useStyles = makeStyles({
  container: {
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    marginBottom: '16px',
  },
  tableContainer: {
    flex: 1,
    overflow: 'auto',
  },
});

export default function InputsPage() {
  const styles = useStyles();
  const selectedDevice = useAppStore((state) => state.selectedDevice);
  const { data: device } = useDevice(selectedDevice?.id || 0);

  if (!selectedDevice) {
    return (
      <div className={styles.container}>
        <h2>Inputs</h2>
        <p>Please select a device from the tree</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Inputs - {device?.name || 'Loading...'}</h2>
      </div>
      <div className={styles.tableContainer}>
        <InputsTable deviceId={selectedDevice.id} />
      </div>
    </div>
  );
}
```

#### Step 2: Create API Service for Inputs

**File: `src/t3-react/services/inputsApi.ts` (CREATE NEW)**

```tsx
import { fetchApi } from './api';

export interface InputPoint {
  id: number;
  label: string;
  description: string;
  value: number;
  units: string;
  autoManual: 'auto' | 'manual';
  status: 'normal' | 'alarm' | 'offline';
  highLimit: number;
  lowLimit: number;
  decom: number;
  filter: number;
  range: string;
}

export const inputsApi = {
  getInputs: (deviceId: number) =>
    fetchApi<InputPoint[]>(`/devices/${deviceId}/inputs`),

  updateInput: (deviceId: number, inputId: number, data: Partial<InputPoint>) =>
    fetchApi<InputPoint>(`/devices/${deviceId}/inputs/${inputId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};
```

#### Step 3: Create React Query Hooks

**File: `src/t3-react/hooks/useInputs.ts` (CREATE NEW)**

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inputsApi, InputPoint } from '../services/inputsApi';
import { useToast } from './useToast';

export function useInputs(deviceId: number) {
  return useQuery({
    queryKey: ['inputs', deviceId],
    queryFn: () => inputsApi.getInputs(deviceId),
    enabled: !!deviceId,
    refetchInterval: 5000, // Auto-refresh every 5 seconds
  });
}

export function useUpdateInput(deviceId: number) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ inputId, data }: { inputId: number; data: Partial<InputPoint> }) =>
      inputsApi.updateInput(deviceId, inputId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inputs', deviceId] });
      toast.success('Input updated successfully');
    },
    onError: () => {
      toast.error('Failed to update input');
    },
  });
}
```

#### Step 4: Implement Full InputsTable Component

**File: `src/t3-react/components/InputsTable.tsx` (UPDATE - full version)**

See Step 10 in the main document for the complete DataGrid implementation.

Add these features:
- [ ] Real-time data updates (5-second polling)
- [ ] Inline editing for all editable fields
- [ ] Status color indicators (green=normal, red=alarm)
- [ ] Auto/Manual mode toggle
- [ ] Sorting by any column
- [ ] Search/filter functionality
- [ ] Export to CSV button

#### Step 5: Add Route

**File: `src/t3-react/App.tsx` (UPDATE)**

```tsx
import InputsPage from './pages/InputsPage';

<Route path="inputs" element={<InputsPage />} />
```

#### Step 6: Update Toolbar Button

**File: `src/t3-react/config/toolbarConfig.ts` (UPDATE)**

Find the Inputs button and add route:

```tsx
{
  id: 'inputs',
  label: 'Inputs',
  icon: ArrowCircleDownRegular,
  route: '/t3000/inputs', // ADD THIS
  hotkey: 'Alt+I',
},
```

#### Step 7: Testing Checklist

- [ ] Navigate to Inputs page via toolbar
- [ ] Table loads with real data
- [ ] Sorting works on all columns
- [ ] Inline editing saves successfully
- [ ] Auto-refresh updates data every 5 seconds
- [ ] Status colors display correctly
- [ ] No memory leaks (check DevTools)
- [ ] No console errors

---

### Phase 2.3: Repeat for Outputs, Variables, Programs

Follow the exact same pattern as Inputs:

1. Create `OutputsPage.tsx`, `VariablesPage.tsx`, `ProgramsPage.tsx`
2. Create API services: `outputsApi.ts`, `variablesApi.ts`, `programsApi.ts`
3. Create hooks: `useOutputs.ts`, `useVariables.ts`, `usePrograms.ts`
4. Create table components: `OutputsTable.tsx`, `VariablesTable.tsx`, `ProgramsTable.tsx`
5. Add routes in App.tsx
6. Update toolbar buttons with routes
7. Test each page thoroughly

**Copy-paste template for each:**

```tsx
// Template: XxxPage.tsx
export default function XxxPage() {
  const selectedDevice = useAppStore((state) => state.selectedDevice);

  if (!selectedDevice) {
    return <div>Please select a device</div>;
  }

  return (
    <div>
      <h2>Xxx - {selectedDevice.name}</h2>
      <XxxTable deviceId={selectedDevice.id} />
    </div>
  );
}
```

---

### Phase 2.4: Common Components

#### Device Tree Component

**File: `src/t3-react/components/DeviceTree.tsx` (CREATE NEW)**

```tsx
import React from 'react';
import {
  Tree,
  TreeItem,
  TreeItemLayout,
} from '@fluentui/react-components';
import { useDevices } from '../hooks/useDevices';
import { useAppStore } from '../store/useAppStore';

export function DeviceTree() {
  const { data: devices } = useDevices();
  const { selectedDevice, setSelectedDevice } = useAppStore();

  return (
    <Tree aria-label="Device Tree">
      {devices?.map((device) => (
        <TreeItem
          key={device.id}
          itemType="leaf"
          value={device.id.toString()}
        >
          <TreeItemLayout
            onClick={() => setSelectedDevice(device)}
            style={{
              fontWeight: selectedDevice?.id === device.id ? 'bold' : 'normal',
            }}
          >
            {device.name}
          </TreeItemLayout>
        </TreeItem>
      ))}
    </Tree>
  );
}
```

Replace the placeholder in `MainLayout.tsx`:

```tsx
// OLD:
<div>Building Tree</div>

// NEW:
<DeviceTree />
```

---

### Phase 2.5: State Management Setup

#### Install Zustand

```bash
npm install zustand
```

#### Create App Store

**File: `src/t3-react/store/useAppStore.ts` (CREATE - see Step 8 above for full code)**

Key features to implement:
- [ ] Selected device state
- [ ] User state
- [ ] Loading states
- [ ] Error states
- [ ] Async actions (fetchDevices, connectDevice)
- [ ] LocalStorage persistence for user

#### Integrate Store in App.tsx

```tsx
import { useAppStore } from './store/useAppStore';

function App() {
  const fetchDevices = useAppStore((state) => state.fetchDevices);

  useEffect(() => {
    fetchDevices(); // Load devices on app start
  }, []);

  // ... rest of app
}
```

---

### Phase 2 Completion Checklist

Before marking Phase 2 as complete, verify:

#### Pages Migrated
- [ ] Settings page fully functional in React
- [ ] Inputs page with DataGrid working
- [ ] Outputs page with DataGrid working
- [ ] Variables page with DataGrid working
- [ ] Programs page with DataGrid working

#### Infrastructure
- [ ] State management (Zustand) implemented
- [ ] API layer with React Query working
- [ ] Device tree component working
- [ ] Notification system (Toast) working
- [ ] Dialog system working

#### Quality
- [ ] No console errors anywhere
- [ ] All API calls working
- [ ] Real-time data updates working
- [ ] Inline editing working
- [ ] Navigation between pages smooth
- [ ] Performance acceptable (no lag)

#### Vue Cleanup
- [ ] Old Vue pages redirecting to React
- [ ] No duplicate routes
- [ ] Vue routes documented for removal in Phase 4

#### Documentation
- [ ] Code documented with comments
- [ ] README updated with new structure
- [ ] API endpoints documented
- [ ] Known issues documented

---

### Troubleshooting Common Issues

#### Issue: "Cannot find module '@t3-react/...'"

**Solution:**
Check `tsconfig.json` has correct path aliases:

```json
{
  "compilerOptions": {
    "paths": {
      "@t3-react/*": ["./src/t3-react/*"],
      "@shared/*": ["./src/shared/*"]
    }
  }
}
```

#### Issue: "React Query not working"

**Solution:**
Ensure QueryClientProvider wraps your app:

```tsx
// In App.tsx or main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

#### Issue: "FluentUI styles not applying"

**Solution:**
Ensure FluentProvider wraps your app:

```tsx
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

<FluentProvider theme={webLightTheme}>
  <App />
</FluentProvider>
```

#### Issue: "Routes not working"

**Solution:**
1. Check both Vue and React routers
2. Ensure HashRouter (not BrowserRouter) in React
3. Check route paths match exactly
4. Verify redirect in Vue router

---

## Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | 🔴 Critical | Comprehensive backups, staging environment testing |
| Breaking existing functionality | 🔴 Critical | Incremental migration, feature flags, parallel testing |
| Performance regression | 🟡 Medium | Benchmark before/after, optimize bundle size |
| Browser compatibility issues | 🟡 Medium | Cross-browser testing in Phase 5 |
| User training required | 🟢 Low | UI remains similar with FluentUI |
| Extended downtime | 🟡 Medium | Deploy during maintenance window |

### Mitigation Strategies

1. **Feature Flags:** Enable/disable React routes dynamically
2. **Parallel Deployment:** Run both versions side-by-side temporarily
3. **Rollback Plan:** Keep Vue version tagged for quick revert
4. **Staged Rollout:** Deploy to subset of users first
5. **Comprehensive Testing:** Unit, integration, E2E tests before launch

---

## Rollback Strategy

### Emergency Rollback (< 1 hour)

If critical issues found after Phase 4-5 deployment:

```bash
# 1. Revert to previous Git tag
git checkout tags/v0.8.1-vue-stable

# 2. Reinstall dependencies
npm install

# 3. Rebuild
npm run build

# 4. Deploy previous version
npm run deploy
```

### Partial Rollback

If specific features broken but overall stable:

1. Re-enable Vue routes in router config
2. Point problematic routes back to Vue components
3. Fix React version in development
4. Redeploy when ready

---

## Success Criteria

### Phase 2 Complete When:
- [ ] 50% of routes migrated to React
- [ ] All data grids working with FluentUI
- [ ] No Vue dependencies for migrated pages
- [ ] Performance equal or better than Vue version

### Phase 3 Complete When:
- [ ] 100% feature parity achieved
- [ ] All forms working in React
- [ ] Complex features (graphics, trends) functional
- [ ] Test coverage > 80%

### Phase 4 Complete When:
- [ ] Vue Router removed completely
- [ ] Build system fully migrated to Vite
- [ ] No Quasar dependencies remain
- [ ] All routes accessible via React Router

### Phase 5 Complete When:
- [ ] All Vue code removed from codebase
- [ ] Bundle size < 500KB (gzipped)
- [ ] Lighthouse score > 90
- [ ] No console errors/warnings
- [ ] Full regression test passing
- [ ] Production deployment successful

---

## How to Use This Document

### For Developers

1. **First Time Reading:**
   - Skim the [Overview](#overview) to understand the "why"
   - Read [Current Architecture](#current-architecture) vs [Target Architecture](#target-architecture)
   - Review [Component Mapping](#step-6-component-mapping) (Quasar → FluentUI)

2. **Starting Implementation:**
   - **Go directly to [Phase 2 Implementation Guide](#phase-2-implementation-guide-start-here-next-time)**
   - Follow steps sequentially (don't skip ahead)
   - Copy code examples directly - they're production-ready
   - Use [Troubleshooting](#troubleshooting-common-issues) when stuck

3. **Daily Work:**
   - Keep this document open in a browser tab
   - Reference [Detailed Steps](#detailed-steps) for code patterns
   - Check [Testing Checklists](#step-7-testing-checklist) before marking tasks complete
   - Update [Changelog](#changelog) when making significant progress

### For Future You (Coming Back After Months)

**Don't panic! Here's what to do:**

1. **Refresh Your Memory (10 minutes):**
   - Read [Quick Start](#-quick-start-read-this-first) section
   - Skim [Phase 2 Implementation Guide](#phase-2-implementation-guide-start-here-next-time)
   - Check what's already done in the codebase

2. **Find Your Place:**
   ```bash
   # Check current React pages
   ls src/t3-react/pages/

   # Check what routes exist
   cat src/t3-react/App.tsx | grep "<Route"

   # Check Vue redirects
   cat src/t3-vue/router/routes.js | grep "redirect"
   ```

3. **Pick Up Where You Left Off:**
   - If Settings page done → Start Inputs (Phase 2.2)
   - If Inputs done → Start Outputs/Variables/Programs (Phase 2.3)
   - If all tables done → Start Common Components (Phase 2.4)
   - If confused → Start from [Phase 2.1](#phase-21-settings-page-migration-week-1-2) again

4. **Don't Re-invent:**
   - All code patterns are already in this doc
   - Copy-paste and adapt - don't write from scratch
   - The patterns are proven and tested

---

## Document Maintenance

### When to Update This Document

- ✅ After completing each Phase (update status)
- ✅ When discovering better approaches (add to guide)
- ✅ When hitting roadblocks (add to Troubleshooting)
- ✅ When dependencies change (update package versions)
- ✅ After major architectural decisions (document reasoning)

### Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-11-09 | Initial comprehensive plan | AI Assistant |
| 1.1 | 2025-11-09 | Added Phase 2 implementation guide | AI Assistant |
| 1.2 | 2025-11-09 | Added Quick Start and How to Use sections | AI Assistant |

---

## Next Steps

1. **Review this document** thoroughly
2. **Set up feature flags** for gradual rollout
3. **Begin Phase 2** implementation when ready

---

## Related Documents

- [Hybrid Vue-React Architecture](./Hybrid-Vue-React-Architecture.md) - Current implementation
- [FluentUI vs Ant Design Analysis](./Fluent-UI-vs-Ant-Design-Analysis.md) - UI library decision
- [Technical Design](./Technical-Design-Hybrid-Architecture.md) - Detailed architecture
- [T3000 Feature Inventory](./T3000-Feature-Inventory.md) - Complete feature list

---

## Changelog

| Date | Author | Changes |
|------|--------|---------|
| 2025-11-09 | AI Assistant | Initial document creation |

---

**Document Status:** 📋 Planning Phase
**Last Updated:** November 9, 2025

