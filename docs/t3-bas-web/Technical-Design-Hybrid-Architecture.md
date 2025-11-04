# Technical Design Document: Hybrid Vue + React Architecture
# T3000 Webview - Dual Framework Implementation

**Version**: 1.1
**Date**: November 5, 2025
**Status**: AWAITING FINAL APPROVAL
**Author**: Development Team
**Project**: T3000 Webview Hybrid Architecture

---

## Document Control

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-05 | Dev Team | Initial technical design |
| 1.1 | 2025-11-05 | Dev Team | **Updated with user decisions: `t3-vue`, `t3-react`, `common` folders + Option B aliases** |

---

## ✅ USER DECISIONS CONFIRMED

### Folder Naming (Final):
- ✅ **Vue folder**: `src/t3-vue/` (clearer than `vue-app`)
- ✅ **React folder**: `src/t3-react/` (clearer than `react-app`)
- ✅ **Shared folder**: `src/common/` (clearer than `shared`)

### Import Alias Strategy (Final):
- ✅ **Option B Selected**: Explicit aliases (`@t3-vue/`, `@t3-react/`, `@common/`)
- ✅ **Update ~262 Vue files**: Change `@/` → `@t3-vue/` (automated)
- ✅ **Router guarantee**: Paths stay identical, only import strings change

### Key Benefits of User's Choices:
1. **Clear naming**: `t3-vue` and `t3-react` show framework ownership
2. **Explicit imports**: Code is self-documenting
3. **Better tooling**: IDE autocomplete works perfectly
4. **Future-proof**: Easy to add more apps later

---

## Approval Required From:
- [ ] Technical Lead
- [ ] Product Owner
- [ ] Development Team Lead

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Detailed Technical Design](#3-detailed-technical-design)
4. [Implementation Plan](#4-implementation-plan)
5. [Code Examples](#5-code-examples)
6. [Testing Strategy](#6-testing-strategy)
7. [Deployment Plan](#7-deployment-plan)
8. [Risk Assessment](#8-risk-assessment)
9. [Success Criteria](#9-success-criteria)
10. [Appendices](#10-appendices)

---

## 1. Executive Summary

### 1.1 Objective

Implement a **hybrid architecture** that allows Vue 3 (existing) and React 18 + Fluent UI (new) to coexist in the same T3000 Webview application.

### 1.2 Business Goals

- ✅ Preserve existing Vue/Quasar functionality (zero regression risk)
- ✅ Enable new T3BASWeb features using React + Fluent UI
- ✅ Provide gradual migration path (no "big bang" rewrite)
- ✅ Maintain developer productivity during transition
- ✅ Achieve Microsoft Fluent design for new features

### 1.3 Key Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| **Bundle Size (gzipped)** | 150 KB | 350 KB | Acceptable |
| **Initial Load Time** | 1.2s | 1.5s | Acceptable |
| **Route Transition** | Instant (SPA) | 1s (reload) | Acceptable |
| **Code Duplication** | 0% | 5% (shared code) | Minimal |
| **Development Velocity** | Baseline | +20% (parallel work) | Month 3+ |

### 1.4 Timeline & Budget

| Phase | Duration | Team Size | Cost |
|-------|----------|-----------|------|
| **Phase 0: Planning & Design** | 1 week | 2 devs | $8k |
| **Phase 1: Infrastructure Setup** | 2 weeks | 2 devs | $16k |
| **Phase 2: First React Page** | 2 weeks | 3 devs | $24k |
| **Phase 3: Production Release** | 1 week | 2 devs | $8k |
| **TOTAL (Initial Delivery)** | **6 weeks** | **2-3 devs** | **$56k** |

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    T3000 Webview Application                  │
│                     (Single Page Load)                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Entry Point (main.ts)                  │     │
│  │        Route-Based App Loader/Dispatcher            │     │
│  └─────────────────┬──────────────────────────────────┘     │
│                    │                                          │
│         ┌──────────┴──────────┐                              │
│         ▼                     ▼                              │
│  ┌─────────────┐       ┌─────────────┐                      │
│  │  Vue App    │       │  React App  │                      │
│  │  (Legacy)   │       │  (T3BASWeb) │                      │
│  ├─────────────┤       ├─────────────┤                      │
│  │ Routes:     │       │ Routes:     │                      │
│  │ /           │       │ /t3000/*    │                      │
│  │ /v2/*       │       │             │                      │
│  │ /login      │       │             │                      │
│  ├─────────────┤       ├─────────────┤                      │
│  │ Framework:  │       │ Framework:  │                      │
│  │ • Vue 3     │       │ • React 18  │                      │
│  │ • Quasar    │       │ • Fluent UI │                      │
│  │ • Ant Design│       │             │                      │
│  └─────────────┘       └─────────────┘                      │
│         │                     │                              │
│         └──────────┬──────────┘                              │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │            Shared Infrastructure                    │     │
│  ├────────────────────────────────────────────────────┤     │
│  │ • API Client (Axios)                               │     │
│  │ • Authentication (JWT, localStorage)               │     │
│  │ • State Management (SharedState, EventBus)         │     │
│  │ • TypeScript Types                                 │     │
│  │ • Utility Functions                                │     │
│  │ • Constants & Configuration                        │     │
│  └────────────────────────────────────────────────────┘     │
│                    │                                          │
│                    ▼                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │              Backend API                            │     │
│  │  Rust (Actix-web) - Port 8080                      │     │
│  └────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Route Mapping

| Route Pattern | Framework | UI Library | Status |
|---------------|-----------|------------|--------|
| `/` | Vue | Quasar | Redirect to /v2/dashboard |
| `/login` | Vue | Quasar | Existing |
| `/v2/*` | Vue | Quasar + Ant Design | Existing (no changes) |
| `/v2/dashboard` | Vue | Quasar | Existing |
| `/v2/trendlog` | Vue | Quasar | Existing |
| `/v2/modbus` | Vue | Quasar | Existing |
| `/v2/apps` | Vue | Quasar | Existing |
| `/t3000/*` | React | Fluent UI | 🆕 NEW |
| `/t3000/tstat` | React | Fluent UI | 🆕 NEW |
| `/t3000/bacnet/input` | React | Fluent UI | 🆕 NEW |
| `/t3000/bacnet/output` | React | Fluent UI | 🆕 NEW |
| `/t3000/network` | React | Fluent UI | 🆕 NEW |

### 2.3 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interaction                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┴──────────────┐
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│   Vue Component│              │ React Component│
└───────┬───────┘              └───────┬───────┘
        │                              │
        ▼                              ▼
┌───────────────┐              ┌───────────────┐
│  Vue Composable│              │  React Hook   │
│  (useDevice)  │              │  (useDevice)  │
└───────┬───────┘              └───────┬───────┘
        │                              │
        └───────────────┬──────────────┘
                        ▼
              ┌──────────────────┐
              │   Shared API      │
              │   Client (Axios)  │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │  Rust Backend     │
              │  (Port 8080)      │
              └─────────┬─────────┘
                        │
                        ▼
              ┌──────────────────┐
              │   SQLite DB       │
              └───────────────────┘
```

### 2.4 Build Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Vite Build Process                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  Source Code (src/)                                       │
│  ├── main.ts (entry point)                               │
│  ├── vue-app/         → @vitejs/plugin-vue               │
│  ├── react-app/       → @vitejs/plugin-react             │
│  └── shared/          → TypeScript compilation           │
│                                                           │
│  ↓ Build Process ↓                                        │
│                                                           │
│  Code Splitting:                                          │
│  ├── main.[hash].js           (Route dispatcher)         │
│  ├── vue-vendor.[hash].js     (Vue, Quasar, Ant Design) │
│  ├── react-vendor.[hash].js   (React, Fluent UI)        │
│  ├── shared.[hash].js         (API, Auth, Utils)        │
│  ├── vue-app.[hash].js        (Vue pages/components)    │
│  └── react-app.[hash].js      (React pages/components)  │
│                                                           │
│  Output (dist/)                                           │
│  ├── index.html                                           │
│  ├── assets/                                              │
│  │   ├── main.[hash].js        (~50 KB)                  │
│  │   ├── vue-vendor.[hash].js  (~500 KB → 150 KB gz)    │
│  │   ├── react-vendor.[hash].js (~600 KB → 170 KB gz)   │
│  │   ├── shared.[hash].js      (~100 KB → 30 KB gz)     │
│  │   └── [app-chunks].[hash].js                          │
│  └── ...                                                  │
└──────────────────────────────────────────────────────────┘

Loading Strategy (Lazy Loading):
1. User visits /v2/dashboard
   → Load: main.js + vue-vendor.js + shared.js + vue-app.js
   → Total: ~330 KB gzipped

2. User navigates to /t3000/tstat (page reload)
   → Load: main.js + react-vendor.js + shared.js + react-app.js
   → Total: ~370 KB gzipped

Only the required framework is loaded per session!
```

---

## 3. Detailed Technical Design

### 3.1 Project Structure (Final - With User's Naming)

```
T3000Webview5/
│
├── public/
│   ├── index.html                        # Single HTML entry point
│   └── assets/                           # Static assets (images, fonts)
│
├── src/
│   │
│   ├── main.ts                           # 🎯 CRITICAL: Route dispatcher
│   │
│   ├── t3-vue/                           # 🔵 Vue 3 Application (EXISTING - moved here)
│   │   ├── main.ts                       # Vue entry point
│   │   ├── App.vue                       # Vue root component
│   │   │
│   │   ├── router/
│   │   │   ├── index.ts                  # Vue Router instance
│   │   │   └── routes.ts                 # Vue routes (/v2/*)
│   │   │
│   │   ├── pages/
│   │   │   ├── V2/                       # Existing pages
│   │   │   │   ├── Dashboard.vue
│   │   │   │   ├── TrendLogDashboard.vue
│   │   │   │   ├── Schedules.vue
│   │   │   │   ├── ModbusRegister.vue
│   │   │   │   └── ...
│   │   │   ├── AppsLibrary/
│   │   │   ├── Dashboard/
│   │   │   ├── HvacDrawer/
│   │   │   ├── ModbusRegister/
│   │   │   ├── TrendLog/
│   │   │   └── LoginPage.vue
│   │   │
│   │   ├── components/                   # Vue components
│   │   │   ├── Basic/
│   │   │   ├── Database/
│   │   │   ├── Grid/
│   │   │   ├── Hvac/
│   │   │   ├── Navigation/
│   │   │   ├── NewUI/
│   │   │   └── ObjectTypes/
│   │   │
│   │   ├── layouts/                      # Vue layouts
│   │   │   ├── MainLayout.vue
│   │   │   ├── MainLayout2.vue
│   │   │   ├── AppsLibLayout.vue
│   │   │   ├── ModbusRegLayout.vue
│   │   │   └── TrendLogLayout.vue
│   │   │
│   │   ├── composables/                  # Vue composables
│   │   │   ├── useDeviceConnection.ts
│   │   │   └── useDataRefresh.ts
│   │   │
│   │   └── styles/                       # Vue-specific styles
│   │       └── quasar-overrides.scss
│   │
│   ├── t3-react/                         # 🟢 React 18 Application (NEW)
│   │   ├── main.tsx                      # React entry point
│   │   ├── App.tsx                       # React root component
│   │   │
│   │   ├── router/
│   │   │   ├── index.tsx                 # React Router instance
│   │   │   └── routes.tsx                # React routes (/t3000/*)
│   │   │
│   │   ├── pages/
│   │   │   └── T3000/                    # T3BASWeb pages
│   │   │       ├── Tstat/
│   │   │       │   ├── TstatView.tsx
│   │   │       │   └── TstatSettings.tsx
│   │   │       ├── BACnet/
│   │   │       │   ├── BACnetInput.tsx
│   │   │       │   ├── BACnetOutput.tsx
│   │   │       │   ├── BACnetVariable.tsx
│   │   │       │   └── BACnetSchedule.tsx
│   │   │       ├── Network/
│   │   │       │   └── NetworkView.tsx
│   │   │       ├── Graphics/
│   │   │       │   └── GraphicView.tsx
│   │   │       └── TrendLog/
│   │   │           └── TrendLogView.tsx
│   │   │
│   │   ├── components/                   # React components
│   │   │   └── T3000/
│   │   │       ├── DeviceTree/
│   │   │       │   ├── DeviceTree.tsx
│   │   │       │   ├── TreeNode.tsx
│   │   │       │   └── tree.types.ts
│   │   │       ├── DataPointGrid/
│   │   │       │   └── DataPointGrid.tsx
│   │   │       ├── RegisterEditor/
│   │   │       │   └── RegisterEditor.tsx
│   │   │       └── ScheduleGrid/
│   │   │           └── ScheduleGrid.tsx
│   │   │
│   │   ├── layouts/                      # React layouts
│   │   │   ├── MainLayout.tsx            # Fluent UI main layout
│   │   │   └── EmptyLayout.tsx
│   │   │
│   │   ├── hooks/                        # React hooks
│   │   │   ├── useDeviceConnection.ts
│   │   │   ├── useDataRefresh.ts
│   │   │   └── useFluentTheme.ts
│   │   │
│   │   ├── store/                        # React state (Zustand)
│   │   │   ├── deviceStore.ts
│   │   │   └── dataStore.ts
│   │   │
│   │   ├── styles/                       # React-specific styles
│   │   │   ├── fluent-theme.ts
│   │   │   └── main.css
│   │   │
│   │   └── config/                       # React config
│   │       ├── menu.config.tsx
│   │       └── routes.config.tsx
│   │
│   ├── common/                           # 🟡 Shared Infrastructure
│   │   │
│   │   ├── api/                          # API client (framework-agnostic)
│   │   │   ├── client.ts                 # Axios instance + interceptors
│   │   │   ├── device.api.ts             # Device endpoints
│   │   │   ├── trendlog.api.ts           # Trend log endpoints
│   │   │   ├── bacnet.api.ts             # BACnet endpoints
│   │   │   └── user.api.ts               # User/auth endpoints
│   │   │
│   │   ├── auth/                         # Authentication
│   │   │   └── authService.ts            # Auth state management
│   │   │
│   │   ├── state/                        # Cross-framework state
│   │   │   ├── sharedState.ts            # localStorage wrapper
│   │   │   └── eventBus.ts               # Custom events
│   │   │
│   │   ├── types/                        # TypeScript types
│   │   │   ├── device.types.ts
│   │   │   ├── bacnet.types.ts
│   │   │   ├── trendlog.types.ts
│   │   │   ├── user.types.ts
│   │   │   └── index.ts
│   │   │
│   │   ├── utils/                        # Utility functions
│   │   │   ├── format.ts                 # Data formatting
│   │   │   ├── validation.ts             # Input validation
│   │   │   ├── constants.ts              # Constants
│   │   │   └── helpers.ts                # Helper functions
│   │   │
│   │   └── components/                   # Framework-agnostic logic
│   │       └── AppSwitcher.ts            # Navigation helper
│   │
│   └── assets/                           # Shared assets
│       ├── images/
│       ├── icons/
│       └── fonts/
│
├── api/                                  # Rust backend (existing)
│   └── ...
│
├── docs/                                 # Documentation
│   └── t3-bas-web/
│       ├── Technical-Design.md           # This document
│       ├── Hybrid-Vue-React-Architecture.md
│       ├── Fluent-UI-vs-Ant-Design-Analysis.md
│       └── ...
│
├── tests/                                # Tests
│   ├── t3-vue/                           # Vue tests
│   ├── t3-react/                         # React tests
│   └── common/                           # Shared code tests
│
├── package.json                          # Dependencies (Vue + React)
├── vite.config.ts                        # Vite config (dual plugins)
├── tsconfig.json                         # TypeScript config
├── tsconfig.node.json                    # Node TypeScript config
├── .eslintrc.js                          # ESLint config
├── .prettierrc                           # Prettier config
├── vitest.config.mjs                     # Vitest config
└── README.md
```

### 3.2 Critical Files Implementation

#### File 1: `src/main.ts` (Route Dispatcher) 🎯

**Purpose**: Detect route and load appropriate framework
**Priority**: CRITICAL - This is the entry point

```typescript
/**
 * Main Entry Point - Route-Based App Loader
 *
 * This file determines which framework to load based on the current URL:
 * - /t3000/* → Load React + Fluent UI
 * - Everything else → Load Vue + Quasar
 */

const currentPath = window.location.pathname;

console.log(`[Main] Current path: ${currentPath}`);

if (currentPath.startsWith('/t3000')) {
  console.log('[Main] Loading React app...');

  // Lazy load React app
  import('./react-app/main')
    .then((module) => {
      module.initReactApp();
    })
    .catch((error) => {
      console.error('[Main] Failed to load React app:', error);
      // Fallback to Vue app
      window.location.href = '/v2/dashboard';
    });
} else {
  console.log('[Main] Loading Vue app...');

  // Lazy load Vue app
  import('./vue-app/main')
    .then((module) => {
      module.initVueApp();
    })
    .catch((error) => {
      console.error('[Main] Failed to load Vue app:', error);
      document.body.innerHTML = '<h1>Failed to load application</h1>';
    });
}
```

**Testing Strategy**:
- ✅ Manual: Visit `/v2/dashboard` → Should load Vue
- ✅ Manual: Visit `/t3000/tstat` → Should load React
- ✅ Unit: Mock window.location, verify correct import called

---

#### File 2: `src/t3-vue/main.ts` (Vue Entry)

```typescript
/**
 * Vue App Entry Point
 * Initializes Vue 3 + Quasar + Vue Router
 */

import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { Quasar } from 'quasar';
import App from './App.vue';
import routes from './router/routes';

// Quasar styles
import 'quasar/dist/quasar.css';
import '@quasar/extras/material-icons/material-icons.css';

export function initVueApp() {
  console.log('[Vue] Initializing Vue application...');

  // Create router
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  // Create Vue app
  const app = createApp(App);

  // Install plugins
  app.use(Quasar, {
    config: {
      brand: {
        primary: '#1976D2',
        secondary: '#26A69A',
      },
    },
  });
  app.use(router);

  // Mount app
  app.mount('#app');

  console.log('[Vue] ✅ Vue application mounted');
}
```

---

#### File 3: `src/t3-vue/router/routes.ts` (Vue Routes)

```typescript
/**
 * Vue Router Configuration
 * Handles all /v2/* routes and legacy routes
 */

import { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/v2/dashboard',
  },
  {
    path: '/login',
    component: () => import('../pages/LoginPage.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/v2',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/v2/dashboard',
      },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('../pages/V2/Dashboard.vue'),
      },
      {
        path: 'trendlog',
        name: 'trendlog',
        component: () => import('../pages/V2/TrendLogDashboard.vue'),
      },
      {
        path: 'schedules',
        name: 'schedules',
        component: () => import('../pages/V2/Schedules.vue'),
      },
      {
        path: 'modbus',
        name: 'modbus',
        component: () => import('../pages/V2/ModbusRegister.vue'),
      },
      {
        path: 'apps',
        name: 'apps',
        component: () => import('../pages/V2/AppLibrary.vue'),
      },
      // Add all other existing Vue routes...
    ],
  },
  {
    // Catch-all: If user tries to access /t3000/* in Vue app,
    // trigger page reload to load React app
    path: '/t3000/:pathMatch(.*)*',
    beforeEnter: (to) => {
      console.log('[Vue Router] Redirecting to React app:', to.fullPath);
      window.location.href = to.fullPath;
      return false;
    },
  },
  {
    // 404 - Not Found
    path: '/:pathMatch(.*)*',
    component: () => import('../pages/V2/ErrorNotFound.vue'),
  },
];

export default routes;
```

---

#### File 4: `src/t3-react/main.tsx` (React Entry)

```typescript
/**
 * React App Entry Point
 * Initializes React 18 + Fluent UI + React Router
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { router } from './router/routes';
import './styles/main.css';

export function initReactApp() {
  console.log('[React] Initializing React application...');

  const rootElement = document.getElementById('app');

  if (!rootElement) {
    console.error('[React] Root element #app not found!');
    return;
  }

  // Clear any existing content
  rootElement.innerHTML = '';

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <RouterProvider router={router} />
      </FluentProvider>
    </React.StrictMode>
  );

  console.log('[React] ✅ React application mounted');
}
```

---

#### File 5: `src/t3-react/router/routes.tsx` (React Routes)

```typescript
/**
 * React Router Configuration
 * Handles all /t3000/* routes (T3BASWeb)
 */

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';

// Lazy load pages for better code splitting
const TstatView = React.lazy(() => import('../pages/T3000/Tstat/TstatView'));
const BACnetInput = React.lazy(() => import('../pages/T3000/BACnet/BACnetInput'));
const BACnetOutput = React.lazy(() => import('../pages/T3000/BACnet/BACnetOutput'));
const BACnetVariable = React.lazy(() => import('../pages/T3000/BACnet/BACnetVariable'));
const NetworkView = React.lazy(() => import('../pages/T3000/Network/NetworkView'));

export const router = createBrowserRouter([
  {
    path: '/t3000',
    element: <MainLayout />,
    children: [
      {
        index: true,
        element: <Navigate to="/t3000/tstat" replace />,
      },
      {
        path: 'tstat',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <TstatView />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/input',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetInput />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/output',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetOutput />
          </React.Suspense>
        ),
      },
      {
        path: 'bacnet/variable',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <BACnetVariable />
          </React.Suspense>
        ),
      },
      {
        path: 'network',
        element: (
          <React.Suspense fallback={<div>Loading...</div>}>
            <NetworkView />
          </React.Suspense>
        ),
      },
    ],
  },
  {
    // Catch-all: If user tries to access non-t3000 routes in React app,
    // redirect to Vue app
    path: '*',
    element: <Navigate to="/v2/dashboard" replace />,
    loader: () => {
      window.location.href = '/v2/dashboard';
      return null;
    },
  },
]);
```

---

#### File 6: `src/common/api/client.ts` (Shared API Client)

```typescript
/**
 * Shared API Client
 * Used by both Vue and React applications
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { AuthService } from '../auth/authService';

class ApiClient {
  private static instance: AxiosInstance | null = null;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080/api',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Request interceptor - Add auth token
      ApiClient.instance.interceptors.request.use(
        (config) => {
          const token = AuthService.getToken();
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }

          console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
          return config;
        },
        (error) => {
          console.error('[API] Request error:', error);
          return Promise.reject(error);
        }
      );

      // Response interceptor - Handle errors
      ApiClient.instance.interceptors.response.use(
        (response) => {
          console.log(`[API] Response: ${response.config.url} - ${response.status}`);
          return response;
        },
        (error: AxiosError) => {
          console.error('[API] Response error:', error);

          if (error.response?.status === 401) {
            // Unauthorized - redirect to login
            console.warn('[API] Unauthorized - redirecting to login');
            AuthService.logout();
          }

          return Promise.reject(error);
        }
      );
    }

    return ApiClient.instance;
  }
}

export const api = ApiClient.getInstance();

// Convenience methods
export const apiGet = <T>(url: string) => api.get<T>(url).then(res => res.data);
export const apiPost = <T>(url: string, data?: any) => api.post<T>(url, data).then(res => res.data);
export const apiPut = <T>(url: string, data?: any) => api.put<T>(url, data).then(res => res.data);
export const apiDelete = <T>(url: string) => api.delete<T>(url).then(res => res.data);
```

---

#### File 7: `src/common/auth/authService.ts` (Shared Auth)

```typescript
/**
 * Authentication Service
 * Shared between Vue and React applications
 */

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export class AuthService {
  private static readonly TOKEN_KEY = 'auth_token';
  private static readonly USER_KEY = 'current_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
    console.log('[Auth] Token stored');
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    console.log('[Auth] Token removed');
  }

  static getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    console.log('[Auth] User stored:', user.username);
  }

  static removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
    console.log('[Auth] User removed');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static logout(): void {
    this.removeToken();
    this.removeUser();
    console.log('[Auth] Logged out');

    // Redirect to login (works for both Vue and React)
    window.location.href = '/login';
  }
}
```

---

#### File 8: `vite.config.ts` (Build Configuration)

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(), // Support Vue 3 SFC
    react(), // Support React JSX/TSX
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),                    // Root src/
      '@t3-vue': resolve(__dirname, 'src/t3-vue'),       // Vue app (explicit)
      '@t3-react': resolve(__dirname, 'src/t3-react'),   // React app (explicit)
      '@common': resolve(__dirname, 'src/common'),       // Shared code
    },
  },

  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vue vendor bundle
          'vue-vendor': ['vue', 'vue-router', 'quasar'],

          // React vendor bundle
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // Fluent UI bundle
          'fluent-ui': ['@fluentui/react-components', '@fluentui/react-icons'],

          // Shared utilities
          'shared': ['axios'],
        },
      },
    },

    // Source maps for debugging
    sourcemap: true,

    // Code splitting
    chunkSizeWarningLimit: 1000, // 1MB warning threshold
  },

  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'quasar',
      'react',
      'react-dom',
      'react-router-dom',
      '@fluentui/react-components',
      'axios',
    ],
  },
});
```

---

#### File 9: `package.json` (Dependencies)

```json
{
  "name": "t3-webview",
  "version": "0.9.0",
  "description": "T3 Webview - Hybrid Vue + React Architecture",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "lint": "eslint src --ext .ts,.tsx,.vue",
    "format": "prettier --write \"src/**/*.{ts,tsx,vue,css}\""
  },
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "quasar": "^2.14.0",
    "@quasar/extras": "^1.16.0",
    "ant-design-vue": "^4.2.6",
    "@ant-design/icons-vue": "^7.0.0",

    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.22.0",
    "@fluentui/react-components": "^9.47.0",
    "@fluentui/react-icons": "^2.0.239",

    "axios": "^1.11.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2",
    "zustand": "^4.5.0"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.1.0",

    "typescript": "^5.3.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",

    "vitest": "^1.3.0",
    "@vitest/ui": "^1.3.0",
    "@testing-library/vue": "^8.0.0",
    "@testing-library/react": "^14.2.0",
    "@vue/test-utils": "^2.4.0",

    "eslint": "^8.57.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint-plugin-vue": "^9.21.0",
    "eslint-plugin-react": "^7.33.0",
    "eslint-plugin-react-hooks": "^4.6.0",

    "prettier": "^3.2.0"
  }
}
```

---

## 4. Implementation Plan

### 4.1 Sprint Breakdown (6 weeks total)

#### **Sprint 0: Planning & Design (Week 0)**

**Goal**: Finalize technical design and get approval

**Tasks**:
- [ ] Review this technical design document
- [ ] Get approval from stakeholders
- [ ] Set up project tracking (Jira/GitHub Issues)
- [ ] Prepare development environment

**Deliverable**: Approved technical design

---

#### **Sprint 1: Infrastructure Setup (Week 1-2)**

**Goal**: Set up hybrid architecture foundation

**Week 1 Tasks**:
- [ ] **Day 1**: Install React dependencies
  ```bash
  npm install react react-dom react-router-dom @fluentui/react-components @fluentui/react-icons zustand
  npm install --save-dev @vitejs/plugin-react @types/react @types/react-dom
  ```

- [ ] **Day 2**: Update Vite configuration
  - Add React plugin
  - Configure aliases
  - Set up code splitting

- [ ] **Day 3**: Create folder structure
  ```bash
  mkdir -p src/t3-vue src/t3-react src/common
  mkdir -p src/t3-react/{pages,components,layouts,hooks,store,styles,config}
  mkdir -p src/common/{api,auth,state,types,utils,components}
  ```

- [ ] **Day 4-5**: Move existing Vue code
  ```bash
  # Move existing files to t3-vue/
  mv src/App.vue src/t3-vue/
  mv src/pages src/t3-vue/
  mv src/components src/t3-vue/
  mv src/layouts src/t3-vue/
  mv src/router src/t3-vue/

  # Create shared API layer
  mv src/lib/api.js src/common/api/client.ts

  # Update all imports: @/ → @t3-vue/ (automated)
  # This will be done with find & replace
  ```**Week 2 Tasks**:
- [ ] **Day 1**: Update all Vue imports (automated find & replace)
  ```bash
  # Find & Replace across all Vue files
  # Replace: from '@/ → from '@t3-vue/
  # Replace: import('@/ → import('@t3-vue/
  ```
- [ ] **Day 2**: Create `src/main.ts` (route dispatcher)
- [ ] **Day 3**: Create `src/t3-vue/main.ts` (Vue entry)
- [ ] **Day 4**: Create `src/t3-react/main.tsx` (React entry)
- [ ] **Day 5**: Create shared infrastructure
  - `src/common/api/client.ts`
  - `src/common/auth/authService.ts`
  - `src/common/state/sharedState.ts`
  - `src/common/types/device.types.ts`

**Testing**:
- [ ] Verify Vue app loads on `/v2/dashboard`
- [ ] Verify route dispatcher works
- [ ] Verify shared API client works in Vue

**Deliverables**:
- ✅ Project structure migrated
- ✅ Vite configured for dual build
- ✅ Vue app working (no regressions)
- ✅ Shared infrastructure created

---

#### **Sprint 2: First React Page (Week 3-4)**

**Goal**: Build and deploy first T3BASWeb page (Tstat view)

**Week 3 Tasks**:
- [ ] **Day 1-2**: Create MainLayout (React + Fluent UI)
  - Top header with logo, search, profile
  - Icon-only left sidebar (50px)
  - Content area with router outlet
  - Navigation menu

- [ ] **Day 3-4**: Create React Router configuration
  - Routes for `/t3000/*`
  - Navigation guards
  - Error boundaries

- [ ] **Day 5**: Create first page placeholder
  - `src/t3-react/pages/T3000/Tstat/TstatView.tsx`
  - Basic layout with Fluent UI components

**Week 4 Tasks**:
- [ ] **Day 1-2**: Implement TstatView UI
  - Data point grid
  - Device info panel
  - Control buttons

- [ ] **Day 3**: Connect to API
  - Use shared API client
  - Fetch device data
  - Display in UI

- [ ] **Day 4**: Add navigation between apps
  - Vue → React navigation links
  - React → Vue fallback

- [ ] **Day 5**: Testing and bug fixes

**Testing**:
- [ ] Manual: Navigate from `/v2/dashboard` to `/t3000/tstat`
- [ ] Manual: Verify Tstat view displays correctly
- [ ] Manual: Verify API calls work
- [ ] Manual: Navigate back to Vue app

**Deliverables**:
- ✅ MainLayout (Fluent UI)
- ✅ React Router configured
- ✅ TstatView page working
- ✅ Navigation between apps working

---

#### **Sprint 3: Production Release (Week 5-6)**

**Goal**: Test, optimize, and deploy to production

**Week 5 Tasks**:
- [ ] **Day 1-2**: End-to-end testing
  - Test all navigation paths
  - Test authentication flow
  - Test API integration
  - Test error handling

- [ ] **Day 3**: Performance optimization
  - Measure bundle sizes
  - Optimize code splitting
  - Verify lazy loading works

- [ ] **Day 4**: Documentation
  - Update README
  - Document navigation patterns
  - Document shared code usage

- [ ] **Day 5**: Bug fixes

**Week 6 Tasks**:
- [ ] **Day 1**: Staging deployment
- [ ] **Day 2**: Staging testing
- [ ] **Day 3**: Production deployment
- [ ] **Day 4**: Production verification
- [ ] **Day 5**: Knowledge transfer & retrospective

**Deliverables**:
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Deployed to production
- ✅ Team trained

---

### 4.2 Team Assignments

| Role | Responsibility | Time Commitment |
|------|----------------|----------------|
| **Lead Developer** | Architecture, code reviews, critical files | 100% (6 weeks) |
| **React Developer** | React components, Fluent UI, TstatView | 100% (Weeks 3-6) |
| **Vue Developer** | Vue app maintenance, shared code | 50% (Weeks 1-2) |
| **QA Engineer** | Testing, bug tracking | 50% (Weeks 5-6) |

---

## 5. Code Examples

### 5.1 Complete Example: React Page with Fluent UI

**File**: `src/t3-react/pages/T3000/Tstat/TstatView.tsx`

```tsx
import React, { useEffect, useState } from 'react';
import {
  makeStyles,
  tokens,
  Card,
  CardHeader,
  Button,
  Spinner,
  Text,
  Title3,
  DataGrid,
  DataGridBody,
  DataGridRow,
  DataGridHeader,
  DataGridHeaderCell,
  DataGridCell,
  createTableColumn,
  TableCellLayout,
  TableColumnDefinition,
} from '@fluentui/react-components';
import { apiGet } from '@common/api/client';
import { Device, DataPoint } from '@common/types/device.types';

const useStyles = makeStyles({
  container: {
    padding: tokens.spacingVerticalXXL,
  },
  header: {
    marginBottom: tokens.spacingVerticalL,
  },
  card: {
    marginBottom: tokens.spacingVerticalL,
  },
  grid: {
    width: '100%',
  },
  loading: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '400px',
  },
});

export const TstatView: React.FC = () => {
  const styles = useStyles();
  const [device, setDevice] = useState<Device | null>(null);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Fetch device and data points
      const [deviceData, pointsData] = await Promise.all([
        apiGet<Device>('/devices/current'),
        apiGet<DataPoint[]>('/devices/current/datapoints'),
      ]);

      setDevice(deviceData);
      setDataPoints(pointsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const columns: TableColumnDefinition<DataPoint>[] = [
    createTableColumn<DataPoint>({
      columnId: 'name',
      compare: (a, b) => a.name.localeCompare(b.name),
      renderHeaderCell: () => 'Name',
      renderCell: (item) => (
        <TableCellLayout>{item.name}</TableCellLayout>
      ),
    }),
    createTableColumn<DataPoint>({
      columnId: 'value',
      renderHeaderCell: () => 'Value',
      renderCell: (item) => (
        <TableCellLayout>{item.value}</TableCellLayout>
      ),
    }),
    createTableColumn<DataPoint>({
      columnId: 'unit',
      renderHeaderCell: () => 'Unit',
      renderCell: (item) => (
        <TableCellLayout>{item.unit}</TableCellLayout>
      ),
    }),
  ];

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner size="huge" label="Loading device data..." />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Title3>{device?.name || 'Tstat Controller'}</Title3>
        <Text>Device ID: {device?.id}</Text>
      </div>

      {/* Device Info Card */}
      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold">Device Information</Text>}
        />
        <div style={{ padding: '16px' }}>
          <Text>Model: {device?.model}</Text><br />
          <Text>IP Address: {device?.ipAddress}</Text><br />
          <Text>Status: {device?.status}</Text>
        </div>
      </Card>

      {/* Data Points Grid */}
      <Card className={styles.card}>
        <CardHeader
          header={<Text weight="semibold">Data Points</Text>}
          action={
            <Button appearance="primary" onClick={loadData}>
              Refresh
            </Button>
          }
        />
        <DataGrid
          items={dataPoints}
          columns={columns}
          sortable
          className={styles.grid}
        >
          <DataGridHeader>
            <DataGridRow>
              {({ renderHeaderCell }) => (
                <DataGridHeaderCell>{renderHeaderCell()}</DataGridHeaderCell>
              )}
            </DataGridRow>
          </DataGridHeader>
          <DataGridBody<DataPoint>>
            {({ item, rowId }) => (
              <DataGridRow<DataPoint> key={rowId}>
                {({ renderCell }) => (
                  <DataGridCell>{renderCell(item)}</DataGridCell>
                )}
              </DataGridRow>
            )}
          </DataGridBody>
        </DataGrid>
      </Card>
    </div>
  );
};

export default TstatView;
```

### 5.2 Navigation Example: Vue → React

**In Vue Component** (`src/t3-vue/layouts/MainLayout.vue`):

```vue
<template>
  <q-layout view="hHh lpR fFf">
    <!-- Header -->
    <q-header elevated>
      <q-toolbar>
        <q-toolbar-title>T3000 Portal</q-toolbar-title>

        <q-btn flat label="Legacy Views" />

        <!-- Navigation to React app -->
        <q-btn
          flat
          label="T3BASWeb (New)"
          @click="goToT3BASWeb"
          color="primary"
        />
      </q-toolbar>
    </q-header>

    <!-- Content -->
    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
const goToT3BASWeb = () => {
  // Navigate to React app (will trigger page reload)
  window.location.href = '/t3000/tstat';
};
</script>
```

### 5.3 Navigation Example: React → Vue

**In React Component** (`src/t3-react/layouts/MainLayout.tsx`):

```tsx
import { Menu, MenuItem, MenuTrigger, MenuPopover, MenuList, Button } from '@fluentui/react-components';
import { ChevronDown20Regular } from '@fluentui/react-icons';

export const MainLayout: React.FC = () => {
  const goToLegacyApp = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="main-layout">
      <header>
        <Menu>
          <MenuTrigger disableButtonEnhancement>
            <Button appearance="subtle" icon={<ChevronDown20Regular />}>
              Switch to Legacy
            </Button>
          </MenuTrigger>

          <MenuPopover>
            <MenuList>
              <MenuItem onClick={() => goToLegacyApp('/v2/dashboard')}>
                Dashboard (Legacy)
              </MenuItem>
              <MenuItem onClick={() => goToLegacyApp('/v2/trendlog')}>
                Trend Log (Legacy)
              </MenuItem>
              <MenuItem onClick={() => goToLegacyApp('/v2/modbus')}>
                Modbus Register (Legacy)
              </MenuItem>
            </MenuList>
          </MenuPopover>
        </Menu>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};
```

---

## 6. Testing Strategy

### 6.1 Unit Testing

**Vue Tests** (using @vue/test-utils):
```typescript
// tests/t3-vue/components/StatusIndicator.spec.ts
import { mount } from '@vue/test-utils';
import StatusIndicator from '@t3-vue/components/Basic/StatusIndicator.vue';

describe('StatusIndicator (Vue)', () => {
  it('renders online status', () => {
    const wrapper = mount(StatusIndicator, {
      props: { status: 'online', label: 'Online' },
    });
    expect(wrapper.text()).toContain('Online');
  });
});
```

**React Tests** (using @testing-library/react):
```typescript
// tests/t3-react/components/StatusIndicator.spec.tsx
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@t3-react/components/T3000/StatusIndicator';

describe('StatusIndicator (React)', () => {
  it('renders online status', () => {
    render(<StatusIndicator status="online" label="Online" />);
    expect(screen.getByText('Online')).toBeInTheDocument();
  });
});
```

**Shared Code Tests**:
```typescript
// tests/common/api/client.spec.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { api } from '@common/api/client';

describe('API Client', () => {
  it('should add auth token to requests', async () => {
    // Test implementation
  });
});
```

### 6.2 Integration Testing

**Cross-Framework Navigation**:
```typescript
// tests/integration/navigation.spec.ts
import { test, expect } from '@playwright/test';

test('navigate from Vue to React app', async ({ page }) => {
  // Start on Vue app
  await page.goto('http://localhost:3000/v2/dashboard');
  await expect(page.locator('text=Dashboard')).toBeVisible();

  // Navigate to React app
  await page.click('text=T3BASWeb');
  await page.waitForURL('**/t3000/tstat');

  // Verify React app loaded
  await expect(page.locator('text=Tstat Controller')).toBeVisible();
});
```

### 6.3 E2E Testing Checklist

- [ ] User can log in
- [ ] Vue app loads on `/v2/dashboard`
- [ ] React app loads on `/t3000/tstat`
- [ ] Navigation from Vue → React works
- [ ] Navigation from React → Vue works
- [ ] API calls work in both apps
- [ ] Authentication persists across apps
- [ ] Logout works from both apps
- [ ] Error pages display correctly
- [ ] 404 handling works
- [ ] Browser back/forward buttons work

---

## 7. Deployment Plan

### 7.1 Build Process

```bash
# Development
npm run dev
# → Starts Vite dev server on http://localhost:3000
# → Both Vue and React apps available

# Production Build
npm run build
# → Creates optimized bundles in dist/
# → Code splitting applied
# → Source maps generated

# Preview Production Build
npm run preview
# → Serves production build locally
```

### 7.2 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing
- [ ] Code review completed
- [ ] Performance benchmarks met
- [ ] Security audit completed
- [ ] Documentation updated

**Staging Deployment**:
- [ ] Deploy to staging server
- [ ] Run smoke tests
- [ ] Verify both Vue and React apps work
- [ ] Test navigation between apps
- [ ] Verify API integration
- [ ] Get stakeholder approval

**Production Deployment**:
- [ ] Create deployment backup
- [ ] Deploy to production
- [ ] Run smoke tests
- [ ] Monitor error logs
- [ ] Verify performance metrics
- [ ] Send release notes

### 7.3 Rollback Plan

If issues are detected:

1. **Immediate**: Rollback to previous deployment
   ```bash
   # Restore previous build
   cp -r dist.backup dist
   ```

2. **Investigation**: Review logs and identify issue

3. **Fix**: Address issue in development

4. **Re-deploy**: After thorough testing

---

## 8. Risk Assessment

### 8.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Bundle size too large** | Medium | Medium | Code splitting, lazy loading |
| **Route conflicts** | Low | High | Clear route namespacing (/v2 vs /t3000) |
| **State sync issues** | Medium | Medium | Use SharedState and EventBus |
| **Build errors** | Low | High | Comprehensive testing, CI/CD |
| **Performance degradation** | Low | Medium | Performance monitoring, optimization |
| **Breaking existing Vue app** | Low | Critical | Comprehensive testing, no changes to Vue code |

### 8.2 Team Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Team unfamiliar with React** | High | Medium | Training, pair programming |
| **Confusion about which app to use** | Medium | Low | Clear documentation, team communication |
| **Increased complexity** | High | Medium | Good documentation, code reviews |

### 8.3 Mitigation Strategies

1. **Comprehensive Testing**: Unit, integration, E2E tests
2. **Code Reviews**: All changes reviewed by 2+ developers
3. **Documentation**: Keep technical docs up to date
4. **Monitoring**: Set up error tracking and performance monitoring
5. **Training**: Provide React training for team
6. **Gradual Rollout**: Start with one page, expand gradually

---

## 9. Success Criteria

### 9.1 Technical Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Bundle Size (gzipped)** | < 400 KB | Vite build output |
| **Initial Load Time** | < 2s | Lighthouse |
| **Route Transition** | < 1.5s | Manual testing |
| **Test Coverage** | > 80% | Vitest coverage report |
| **Build Time** | < 2 min | CI/CD pipeline |
| **No Regressions** | 0 bugs | QA testing |

### 9.2 User Experience Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Navigation Clarity** | 100% users understand | User testing |
| **Feature Parity** | 100% existing features work | QA testing |
| **Visual Consistency** | Professional appearance | Design review |

### 9.3 Business Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Development Velocity** | +20% | Sprint velocity |
| **Time to New Feature** | Reduced by 30% | Feature delivery time |
| **Team Satisfaction** | > 4/5 | Team survey |

---

## 10. Appendices

### 10.1 Glossary

| Term | Definition |
|------|------------|
| **Hybrid Architecture** | System where Vue and React coexist |
| **Route Dispatcher** | Entry point that determines which framework to load |
| **Shared Infrastructure** | Code used by both Vue and React (API, auth, etc.) |
| **Code Splitting** | Technique to split code into separate bundles |
| **Lazy Loading** | Loading code only when needed |
| **SPA** | Single Page Application |

### 10.2 References

- [Vue 3 Documentation](https://vuejs.org/)
- [React Documentation](https://react.dev/)
- [Fluent UI React](https://react.fluentui.dev/)
- [Vite Documentation](https://vitejs.dev/)
- [React Router](https://reactrouter.com/)

### 10.3 Approvals

**This technical design requires approval from**:

- [ ] **Technical Lead**: _________________ Date: _______
- [ ] **Product Owner**: _________________ Date: _______
- [ ] **Development Team**: _________________ Date: _______

**Notes/Comments**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

---

## Document End

**Status**: PENDING APPROVAL
**Next Steps**: Review, approve, and begin Sprint 1

**Questions or concerns?** Contact the development team.
