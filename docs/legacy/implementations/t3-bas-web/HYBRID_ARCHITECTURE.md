# T3000 WebView - Hybrid Vue + React Architecture

**Version**: 0.9.0
**Last Updated**: November 6, 2025
**Architecture**: Hybrid (Vue 3 + Quasar / React 18 + Fluent UI)

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [Getting Started](#getting-started)
5. [Development Guide](#development-guide)
6. [Routing & Navigation](#routing--navigation)
7. [Shared Code](#shared-code)
8. [Adding New Features](#adding-new-features)
9. [Testing](#testing)
10. [Deployment](#deployment)

---

## Overview

T3000 WebView is a **hybrid application** that runs two frameworks side-by-side:

- **Vue 3 + Quasar** (Existing application) → Routes: `/v2/*`
- **React 18 + Fluent UI** (New T3BASWeb) → Routes: `/t3000/*`

Both applications coexist in the same project using **route-based splitting**. The correct framework loads based on the URL path.

### Why Hybrid?

✅ **Zero migration cost** - Existing Vue features keep working
✅ **New features in React + Fluent UI** - Microsoft design system
✅ **Gradual transition** - Can take years if needed
✅ **Lower risk** - No big-bang rewrite
✅ **Team learning** - Learn React while building new features

---

## Architecture

### Route-Based Framework Selection

```
User navigates to URL
        ↓
    Route Dispatcher (src/boot/react.tsx)
        ↓
   Check route prefix
        ↓
    /v2/*  OR /t3000/*?
        ↓              ↓
    Vue App         React App
    (Quasar)        (Fluent UI)
```

### Technology Stack

| Aspect | Vue App (`/v2/*`) | React App (`/t3000/*`) |
|--------|-------------------|------------------------|
| **Framework** | Vue 3.0 | React 18.3 |
| **UI Library** | Quasar 2.6 / Ant Design Vue 4.2 | Fluent UI v9 |
| **State** | Pinia / Vuex | Zustand 4.5 |
| **Router** | Vue Router 4.0 | React Router 6.22 |
| **Build** | Vite 5.0 (via Quasar CLI) | Vite 5.0 (via Quasar CLI) |
| **Language** | JavaScript + TypeScript | TypeScript 100% |

### Shared Infrastructure

Both apps share:
- **API Client** (`src/shared/api/client.ts`) - Axios instance with auth interceptors
- **Authentication** (`src/shared/auth/authService.ts`) - Token & user management
- **State Sharing** (`src/shared/state/sharedState.ts`) - Cross-framework communication
- **Route Utilities** (`src/shared/routes.ts`) - Navigation helpers

---

## Project Structure

### Current Structure (Before Reorganization)

```
T3000Webview5/
├── src/
│   ├── t3-vue/              # Vue 3 + Quasar UI layer
│   │   ├── App.vue
│   │   ├── pages/           # Vue pages
│   │   ├── components/      # Vue components
│   │   ├── layouts/         # Vue layouts
│   │   └── router/          # Vue Router config
│   │
│   ├── t3-react/            # React 18 + Fluent UI layer
│   │   ├── App.tsx
│   │   ├── config/          # Configuration files (6 files)
│   │   ├── store/           # Zustand stores (9 files)
│   │   ├── hooks/           # Custom React hooks (9 files)
│   │   ├── layout/          # Layout components (4 files)
│   │   ├── components/      # UI components (11 files)
│   │   ├── pages/           # React pages (14 files)
│   │   └── router/          # React Router config
│   │
│   ├── lib/                 # Legacy Vue code (JavaScript)
│   │   ├── T3000/           # Old T3000 business logic
│   │   ├── Database/        # Old database code
│   │   ├── Store/           # Old Vue stores
│   │   ├── common.js        # Vue utilities (user, globalNav, etc.)
│   │   └── api.js           # Vue API client
│   │
│   ├── common/              # Shared TypeScript foundation
│   │   ├── types/           # TypeScript interfaces (12 files)
│   │   ├── api/             # Modern API modules (17 files)
│   │   ├── auth/            # Authentication utilities
│   │   ├── state/           # Cross-framework state bridge
│   │   └── utils/           # Common utilities
│   │
│   ├── shared/              # Route utilities & navigation
│   │   └── routes.ts        # Route constants & navigation helpers
│   │
│   └── boot/
│       └── react.tsx        # Route-based React initialization
│
├── package.json             # Both Vue & React dependencies
├── quasar.config.js         # Quasar CLI configuration
└── tsconfig.json            # TypeScript configuration
```

### Planned Structure (After Reorganization)

**Goal**: Consolidate `lib/` and `common/` into a unified `lib/` with clear separation by framework.

```
T3000Webview5/
├── src/
│   ├── t3-vue/              # Vue UI layer ONLY
│   │   ├── App.vue
│   │   ├── pages/           # Vue pages
│   │   ├── components/      # Vue components
│   │   ├── layouts/         # Vue layouts
│   │   └── router/          # Vue Router config
│   │
│   ├── t3-react/            # React UI layer ONLY
│   │   ├── App.tsx
│   │   ├── config/          # Configuration files
│   │   ├── store/           # Zustand stores
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layout/          # Layout components
│   │   ├── components/      # UI components
│   │   ├── pages/           # React pages
│   │   └── router/          # React Router config
│   │
│   ├── lib/                 # Unified library code
│   │   ├── vue/             # Vue-specific legacy code
│   │   │   ├── T3000/       # Old T3000 business logic
│   │   │   ├── Database/    # Old database code
│   │   │   ├── Store/       # Old Vue stores
│   │   │   ├── common.js    # Vue utilities
│   │   │   └── api.js       # Vue API client
│   │   │
│   │   ├── react/           # React-specific modern code
│   │   │   ├── types/       # TypeScript interfaces (12 files)
│   │   │   ├── api/         # Modern API modules (17 files)
│   │   │   ├── constants.ts # React constants
│   │   │   └── utils/       # React utilities
│   │   │
│   │   └── shared/          # Truly shared between both
│   │       ├── auth/        # Authentication (both use)
│   │       ├── state/       # Cross-framework state bridge
│   │       ├── routes.ts    # Route constants & navigation
│   │       └── utils/       # Common utilities
│   │
│   └── boot/
│       └── react.tsx        # Route-based React initialization
│
├── package.json
├── quasar.config.js
└── tsconfig.json
```

### Structure Benefits

✅ **Clear Separation**: Each framework's library code is isolated (`vue/`, `react/`, `shared/`)
✅ **No Duplication**: Distinct purpose for each subfolder
✅ **Logical Grouping**: All library code unified under `lib/`
✅ **Easy Navigation**: Know exactly where to find code
✅ **Migration Path**: Move files from `vue/` to `shared/` as Vue components modernize

### Import Patterns

**Before Reorganization**:
```typescript
// Confusing - two "common" locations
import { user } from '@/lib/common.js'           // Vue legacy
import { Device } from '@/common/types/device'   // React new
import { AuthService } from '@/common/auth'      // Shared
```

**After Reorganization**:
```typescript
// Clear - framework explicit
import { user } from '@/lib/vue/common.js'       // Vue legacy
import { Device } from '@/lib/react/types/device' // React new
import { AuthService } from '@/lib/shared/auth'   // Both use
```

---

## Getting Started

### Prerequisites

- **Node.js**: v16+ (recommended: v20)
- **npm**: v8+
- **Rust**: Latest stable (for backend API)

### Installation

```bash
# Clone repository
git clone https://github.com/temcocontrols/T3000Webview.git
cd T3000Webview5

# Install dependencies
npm install

# Start development servers (API + Frontend)
npm run dev

# Or start individually:
npm run api-dev    # Rust backend
npm run client-dev # Quasar + React frontend
```

### Access Points

- **Vue App**: http://localhost:9000/#/v2/dashboard
- **React App**: http://localhost:9000/#/t3000
- **API**: http://localhost:8080/api

---

## Development Guide

### Adding a New React Page

**Example**: Add a new "Reports" page to React app

**Step 1**: Create page component

```bash
# Create page file
touch src/t3-react/pages/ReportsView.tsx
```

**Step 2**: Implement component

```tsx
// src/t3-react/pages/ReportsView.tsx
import React from 'react';
import { Card, Text, Button } from '@fluentui/react-components';

export const ReportsView: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Text size={600} weight="semibold">Reports</Text>
      <Card style={{ marginTop: '16px' }}>
        <Text>Reports content goes here...</Text>
      </Card>
    </div>
  );
};
```

**Step 3**: Add route

```typescript
// src/t3-react/router/routes.ts
import { lazy } from 'react';

const ReportsPage = lazy(() => import('../pages').then(m => ({ default: m.ReportsView })));

export const t3000Routes: T3000Route[] = [
  // ... existing routes
  {
    path: '/t3000/reports',
    element: ReportsPage,
    title: 'Reports',
    requiresDevice: false,
  },
];
```

**Step 4**: Export from index

```typescript
// src/t3-react/pages/index.ts
export { ReportsView } from './ReportsView';
```

**Step 5**: Add to menu (optional)

```typescript
// src/t3-react/config/menu.config.tsx
export const menuItems: MenuItem[] = [
  // ... existing items
  {
    key: 'reports',
    label: 'Reports',
    icon: <DocumentRegular />,
    path: '/t3000/reports',
  },
];
```

### Adding a New Vue Page

**Example**: Add "Logs" page to Vue app

```bash
# Create page
touch src/t3-vue/pages/V2/LogsPage.vue
```

```vue
<!-- src/t3-vue/pages/V2/LogsPage.vue -->
<template>
  <q-page padding>
    <h5>Logs</h5>
    <q-card>
      <q-card-section>
        Logs content...
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
// Component logic
</script>
```

Add route to Vue router:

```javascript
// src/t3-vue/router/routes.js
export default [
  {
    path: '/v2',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      // ... existing routes
      {
        path: 'logs',
        component: () => import('../pages/V2/LogsPage.vue'),
      },
    ],
  },
];
```

---

## Routing & Navigation

### Route Prefixes

| Prefix | Framework | Example |
|--------|-----------|---------|
| `/v2/*` | Vue (Quasar) | `/v2/dashboard`, `/v2/trendlog` |
| `/t3000/*` | React (Fluent UI) | `/t3000/tstat`, `/t3000/bacnet/input` |

### Navigation Between Apps

**From Vue → React**:

```vue
<template>
  <q-btn @click="openReactPage">
    Open T3BASWeb (React)
  </q-btn>
</template>

<script setup lang="ts">
import { navigateToApp, APP_ROUTES } from '@/shared/routes';

const openReactPage = () => {
  navigateToApp(APP_ROUTES.REACT_TSTAT); // '/t3000/tstat'
};
</script>
```

**From React → Vue**:

```tsx
import { Button } from '@fluentui/react-components';
import { navigateToApp, APP_ROUTES } from '@/shared/routes';

export const SomeComponent = () => {
  return (
    <Button onClick={() => navigateToApp(APP_ROUTES.VUE_DASHBOARD)}>
      Open Legacy Dashboard (Vue)
    </Button>
  );
};
```

### Available Route Constants

```typescript
// src/shared/routes.ts
export const APP_ROUTES = {
  // Vue routes
  VUE_HOME: '/v2',
  VUE_DASHBOARD: '/v2/dashboard',
  VUE_TRENDLOG: '/v2/trendlog',
  VUE_MODBUS: '/v2/modbus',
  VUE_GRAPHICS: '/v2/graphics',
  VUE_NETWORK: '/v2/network',

  // React routes
  REACT_HOME: '/t3000',
  REACT_TSTAT: '/t3000/tstat',
  REACT_BACNET_INPUT: '/t3000/bacnet/input',
  REACT_BACNET_OUTPUT: '/t3000/bacnet/output',
  REACT_NETWORK: '/t3000/network',
  REACT_PROGRAM: '/t3000/program',
  REACT_SCHEDULE: '/t3000/schedule',
  REACT_TRENDLOG: '/t3000/trendlog',
  // ... more routes
};
```

---

## Shared Code

### API Client

Both Vue and React use the same API client:

```typescript
// In any Vue or React component
import { api } from '@/shared/api/client';

// GET request
const response = await api.get('/devices');

// POST request
const response = await api.post('/devices', deviceData);

// Authentication is handled automatically
// Tokens are added to headers via interceptor
```

### Authentication

```typescript
import { AuthService } from '@/shared/auth/authService';

// Check if user is logged in
if (AuthService.isAuthenticated()) {
  const user = AuthService.getUser();
  console.log('Current user:', user);
}

// Login
AuthService.login(token, refreshToken, user);

// Logout (redirects to /v2/login)
AuthService.logout();

// Check permissions
if (AuthService.hasRole('admin')) {
  // Admin-only feature
}
```

### Cross-Framework State Sharing

Share data between Vue and React:

```typescript
import { SharedState, EventBus, SHARED_EVENTS } from '@/shared/state/sharedState';

// Set shared state (persisted in localStorage)
SharedState.set('selectedDeviceId', '12345');

// Get shared state
const deviceId = SharedState.get<string>('selectedDeviceId');

// Subscribe to changes
const unsubscribe = SharedState.subscribe('selectedDeviceId', (deviceId) => {
  console.log('Device changed:', deviceId);
});

// Emit event (real-time)
EventBus.emit(SHARED_EVENTS.DEVICE_SELECTED, device);

// Listen to event
const unsubscribe = EventBus.on(SHARED_EVENTS.DEVICE_SELECTED, (device) => {
  console.log('Device selected:', device);
});
```

---

## Adding New Features

### Decision Tree: Vue or React?

```
┌─ New Feature ─┐
       │
   Is it a new
   screen/page?
       │
    ┌──┴──┐
   YES    NO
    │      │
    │   Is it used
    │   in Vue only?
    │      │
    │   ┌──┴──┐
    │  YES   NO
    │   │     │
    │ Add to Add to
    │ Vue  shared/
    │ app  common/
    │
   Build in
 React + Fluent UI
 (/t3000/*)
```

**Guidelines**:
- ✅ **New pages**: Always use React + Fluent UI
- ✅ **New features for existing Vue pages**: Keep in Vue
- ✅ **Shared utilities**: Put in `src/lib/shared/`
- ✅ **New components for both**: Create in both frameworks or use web components

---

## Testing

### Manual Testing Checklist

- [ ] Navigate from Vue to React: `/v2/dashboard` → click link → `/t3000/tstat`
- [ ] Navigate from React to Vue: `/t3000` → click link → `/v2/dashboard`
- [ ] Authentication persists across apps
- [ ] API calls work in both apps
- [ ] Shared state works (e.g., selected device)
- [ ] Page refreshes load correct app

### Running Tests

```bash
# Vue unit tests
npm run test:unit

# React unit tests (if configured)
# npm run test:react

# E2E tests (if configured)
# npm run test:e2e
```

---

## Deployment

### Build for Production

```bash
# Build both Vue and React apps
npm run build

# Output: dist/spa/
# Contains bundled Vue + React code
```

### Bundle Size

Expected bundle sizes (gzipped):
- **Vue app**: ~150 KB
- **React app**: ~170 KB
- **Shared code**: ~30 KB
- **Total initial load**: ~300-350 KB

Only the active app loads based on route (lazy loading).

### Environment Variables

```bash
# .env
VITE_API_BASE_URL=http://127.0.0.1:8080/api
VITE_WS_URL=ws://127.0.0.1:8080/ws
```

---

## Common Issues & Solutions

### Issue: React app not loading

**Solution**: Check console for errors. Verify you're on a `/t3000/*` route. React only loads on these routes.

### Issue: "Module not found" errors

**Solution**: Check import paths. Use aliases:
- `@/` → `src/`
- `@t3-vue/` → `src/t3-vue/`
- `@t3-react/` → `src/t3-react/`
- `@shared/` → `src/shared/`
- `@common/` → `src/lib/`

### Issue: Authentication not working

**Solution**: Ensure `AuthService` is used for login/logout. Tokens are stored in localStorage and shared between apps.

### Issue: Shared state not updating

**Solution**: Use `SharedState.set()` to trigger storage events. Subscribe with `SharedState.subscribe()`.

---

## Contributing

### Code Style

- **Vue**: Use Composition API, `<script setup lang="ts">`
- **React**: Functional components, TypeScript, hooks
- **Shared**: Pure TypeScript, no framework dependencies

### Commit Messages

```
feat(react): add Reports page
fix(vue): correct trendlog date filter
docs: update hybrid architecture guide
refactor(shared): improve API error handling
```

---

## Resources

### Documentation

- [Vue 3 Docs](https://vuejs.org/)
- [Quasar Docs](https://quasar.dev/)
- [React Docs](https://react.dev/)
- [Fluent UI Docs](https://react.fluentui.dev/)
- [Zustand Docs](https://zustand-demo.pmnd.rs/)

### Internal Docs

- [Technical Design: Hybrid Architecture](./docs/t3-bas-web/Technical-Design-Hybrid-Architecture.md)
- [React-Fluent-UI Migration Plan](./docs/t3-bas-web/React-Fluent-UI-Migration-Plan.md)
- [Hybrid Vue-React Architecture](./docs/t3-bas-web/Hybrid-Vue-React-Architecture.md)

---

## Status

**Current Implementation Status**: ~85% Complete

- ✅ Phase 0-16: Core infrastructure complete (121 tasks)
- ⏳ Phase 17: Testing & debugging (in progress)
- ⏳ Phase 18: Documentation (this file!)
- ⏳ Phase 19: Production build & deployment

**Next Steps**:
1. Fix remaining TypeScript errors in alarmStore/trendStore (~390 errors, non-critical)
2. Add unit tests for stores and hooks
3. Performance optimization and bundle analysis
4. Staging deployment

---

## License

Proprietary - Temco Controls Ltd.

## Support

For issues or questions, contact the development team.
