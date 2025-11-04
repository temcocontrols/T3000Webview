# Hybrid Architecture: Vue + React Coexistence Strategy

**Date**: November 5, 2025
**Purpose**: Run Vue (existing) + React + Fluent UI (T3BASWeb) side-by-side
**Approach**: Micro-Frontend Architecture

---

## Executive Summary

**Goal**: Keep existing Vue/Quasar code running while building new T3BASWeb features in React + Fluent UI.

**Strategy**: Both applications coexist in the same project, with routing that determines which framework handles each page.

**Benefits**:
- ✅ Zero migration cost for existing features
- ✅ New features in React + Fluent UI
- ✅ Gradual transition (can take years if needed)
- ✅ Lower risk - existing code keeps working
- ✅ Team can learn React gradually

---

## 1. Architecture Options

### Option 1: Route-Based Split (Recommended) ⭐

**Concept**: Vue handles `/v2/*` routes, React handles `/t3000/*` routes

```
┌─────────────────────────────────────────────┐
│  Single Application (localhost:3000)        │
├─────────────────────────────────────────────┤
│                                             │
│  /v2/*  → Vue 3 + Quasar + Ant Design      │
│  (existing pages)                           │
│                                             │
│  /t3000/* → React 18 + Fluent UI           │
│  (new T3BASWeb pages)                       │
│                                             │
└─────────────────────────────────────────────┘
```

**How it works**:
1. Main entry point checks current route
2. If `/v2/*` → mount Vue app
3. If `/t3000/*` → mount React app
4. Shared: API client, authentication, state

---

### Option 2: Module Federation (Advanced)

**Concept**: Separate Vue and React apps, share code via Webpack Module Federation

```
┌────────────────┐         ┌────────────────┐
│  Vue App       │◄────────┤  React App     │
│  :3000         │  Share  │  :3001         │
│                │  Modules│                │
└────────────────┘         └────────────────┘
       │                          │
       └──────────┬───────────────┘
                  ▼
          ┌───────────────┐
          │  Shared Libs  │
          │  - API client │
          │  - Auth       │
          │  - Types      │
          └───────────────┘
```

---

### Option 3: iframe Embedding (Simple)

**Concept**: Vue app embeds React app in iframe

```
┌─────────────────────────────────────────┐
│  Vue App (Main Shell)                   │
│  ┌───────────────────────────────────┐ │
│  │ <iframe src="react-app">          │ │
│  │   React + Fluent UI               │ │
│  │ </iframe>                         │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Pros**: Simplest to implement
**Cons**: Performance overhead, complex communication

---

## 2. Recommended Implementation: Route-Based Split

### 2.1 Project Structure

```
T3000Webview5/
├── public/
│   └── index.html                    # Single HTML entry
│
├── src/
│   ├── main.ts                       # Main entry (decides Vue or React)
│   ├── vue-app/                      # Existing Vue code
│   │   ├── App.vue
│   │   ├── router/
│   │   ├── pages/V2/
│   │   ├── components/
│   │   └── layouts/
│   │
│   ├── react-app/                    # New React + Fluent UI
│   │   ├── App.tsx
│   │   ├── router/
│   │   ├── pages/T3000/
│   │   ├── components/
│   │   └── layouts/
│   │
│   └── shared/                       # Shared between Vue & React
│       ├── api/                      # API client
│       ├── auth/                     # Authentication
│       ├── types/                    # TypeScript types
│       └── utils/                    # Utilities
│
├── package.json                      # Both Vue & React dependencies
├── vite.config.ts                    # Dual build configuration
└── tsconfig.json                     # Shared TypeScript config
```

### 2.2 Implementation Steps

#### Step 1: Update package.json

```json
{
  "name": "t3-webview",
  "version": "0.9.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    // Vue dependencies (keep existing)
    "vue": "^3.0.0",
    "vue-router": "^4.0.0",
    "quasar": "^2.6.0",
    "ant-design-vue": "^4.2.6",

    // React dependencies (add new)
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.20.0",
    "@fluentui/react-components": "^9.47.0",
    "@fluentui/react-icons": "^2.0.239",

    // Shared
    "axios": "^1.11.0",
    "echarts": "^5.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "vite": "^5.0.0",
    "typescript": "^5.8.3"
  }
}
```

#### Step 2: Main Entry Point (Route Dispatcher)

**File**: `src/main.ts`

```typescript
// src/main.ts - Route-based app loader

const currentPath = window.location.pathname;

// Determine which app to load based on route
if (currentPath.startsWith('/t3000')) {
  // Load React + Fluent UI app
  import('./react-app/main').then((module) => {
    module.initReactApp();
  });
} else {
  // Load Vue app (default for /v2/*, /, etc.)
  import('./vue-app/main').then((module) => {
    module.initVueApp();
  });
}
```

#### Step 3: Vue App Entry

**File**: `src/vue-app/main.ts`

```typescript
// src/vue-app/main.ts
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'vue-router';
import { Quasar } from 'quasar';
import App from './App.vue';
import routes from './router/routes';

export function initVueApp() {
  const router = createRouter({
    history: createWebHistory(),
    routes,
  });

  const app = createApp(App);

  app.use(Quasar);
  app.use(router);

  app.mount('#app');

  console.log('✅ Vue app loaded');
}
```

**File**: `src/vue-app/router/routes.ts`

```typescript
// src/vue-app/router/routes.ts
export default [
  {
    path: '/',
    redirect: '/v2/dashboard',
  },
  {
    path: '/v2',
    component: () => import('../layouts/MainLayout.vue'),
    children: [
      {
        path: 'dashboard',
        component: () => import('../pages/V2/Dashboard.vue'),
      },
      {
        path: 'trendlog',
        component: () => import('../pages/V2/TrendLogDashboard.vue'),
      },
      // ... all existing Vue routes
    ],
  },
  {
    // Fallback: redirect to React app
    path: '/t3000/:pathMatch(.*)*',
    beforeEnter: () => {
      window.location.href = window.location.pathname;
      return false;
    },
  },
];
```

#### Step 4: React App Entry

**File**: `src/react-app/main.tsx`

```typescript
// src/react-app/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { RouterProvider } from 'react-router-dom';
import { router } from './router/routes';
import './styles/main.css';

export function initReactApp() {
  const root = document.getElementById('app');

  if (!root) {
    console.error('Root element not found');
    return;
  }

  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <FluentProvider theme={webLightTheme}>
        <RouterProvider router={router} />
      </FluentProvider>
    </React.StrictMode>
  );

  console.log('✅ React app loaded');
}
```

**File**: `src/react-app/router/routes.tsx`

```typescript
// src/react-app/router/routes.tsx
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { TstatView } from '../pages/T3000/Tstat/TstatView';
import { BACnetInput } from '../pages/T3000/BACnet/BACnetInput';

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
        element: <TstatView />,
      },
      {
        path: 'bacnet/input',
        element: <BACnetInput />,
      },
      // ... all new T3BASWeb routes
    ],
  },
  {
    // Fallback: redirect to Vue app
    path: '*',
    element: <Navigate to="/v2/dashboard" replace />,
  },
]);
```

#### Step 5: Shared Code (API Client)

**File**: `src/shared/api/client.ts`

```typescript
// src/shared/api/client.ts
import axios, { AxiosInstance } from 'axios';

class ApiClient {
  private static instance: AxiosInstance;

  static getInstance(): AxiosInstance {
    if (!ApiClient.instance) {
      ApiClient.instance = axios.create({
        baseURL: 'http://127.0.0.1:8080/api',
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Request interceptor (add auth token)
      ApiClient.instance.interceptors.request.use(
        (config) => {
          const token = localStorage.getItem('auth_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        (error) => Promise.reject(error)
      );

      // Response interceptor (handle errors)
      ApiClient.instance.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response?.status === 401) {
            // Redirect to login (works for both Vue & React)
            window.location.href = '/v2/login';
          }
          return Promise.reject(error);
        }
      );
    }

    return ApiClient.instance;
  }
}

export const api = ApiClient.getInstance();

// Usage in Vue
// import { api } from '@/shared/api/client';
// const response = await api.get('/devices');

// Usage in React
// import { api } from '@/shared/api/client';
// const response = await api.get('/devices');
```

#### Step 6: Shared Authentication

**File**: `src/shared/auth/authService.ts`

```typescript
// src/shared/auth/authService.ts

export interface User {
  id: string;
  username: string;
  email: string;
  role: string;
}

export class AuthService {
  private static TOKEN_KEY = 'auth_token';
  private static USER_KEY = 'current_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getUser(): User | null {
    const userJson = localStorage.getItem(this.USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  static logout(): void {
    this.removeToken();
    this.removeUser();
    window.location.href = '/v2/login';
  }
}

// Usage in Vue
// import { AuthService } from '@/shared/auth/authService';
// if (!AuthService.isAuthenticated()) { ... }

// Usage in React
// import { AuthService } from '@/shared/auth/authService';
// if (!AuthService.isAuthenticated()) { ... }
```

#### Step 7: Vite Configuration (Dual Build)

**File**: `vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    vue(), // For Vue components
    react(), // For React components
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@vue-app': resolve(__dirname, 'src/vue-app'),
      '@react-app': resolve(__dirname, 'src/react-app'),
      '@shared': resolve(__dirname, 'src/shared'),
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
          'vue-vendor': ['vue', 'vue-router', 'quasar'],
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'fluent-ui': ['@fluentui/react-components', '@fluentui/react-icons'],
        },
      },
    },
  },
});
```

---

## 3. Navigation Between Apps

### 3.1 Vue → React Navigation

**In Vue Component**:
```vue
<template>
  <q-btn @click="goToReactApp">
    Open T3BASWeb (React)
  </q-btn>
</template>

<script setup lang="ts">
const goToReactApp = () => {
  // Navigate to React app route
  window.location.href = '/t3000/tstat';

  // Or use router push (will trigger reload)
  // router.push('/t3000/tstat');
};
</script>
```

### 3.2 React → Vue Navigation

**In React Component**:
```tsx
import { useNavigate } from 'react-router-dom';
import { Button } from '@fluentui/react-components';

export const SomeComponent = () => {
  const navigate = useNavigate();

  const goToVueApp = () => {
    // Navigate to Vue app route
    window.location.href = '/v2/dashboard';
  };

  return (
    <Button onClick={goToVueApp}>
      Open Legacy Dashboard (Vue)
    </Button>
  );
};
```

### 3.3 Unified Navigation Menu

**Create a shared menu component** that works in both apps:

**File**: `src/shared/components/AppSwitcher.ts`

```typescript
// src/shared/components/AppSwitcher.ts

export const navigateToApp = (path: string) => {
  window.location.href = path;
};

export const APP_ROUTES = {
  // Vue routes
  VUE_DASHBOARD: '/v2/dashboard',
  VUE_TRENDLOG: '/v2/trendlog',
  VUE_MODBUS: '/v2/modbus',

  // React routes
  REACT_TSTAT: '/t3000/tstat',
  REACT_BACNET_INPUT: '/t3000/bacnet/input',
  REACT_NETWORK: '/t3000/network',
};
```

**Usage in Vue**:
```vue
<template>
  <q-menu>
    <q-item @click="navigateToApp(APP_ROUTES.REACT_TSTAT)">
      T3BASWeb - Tstat (React)
    </q-item>
  </q-menu>
</template>

<script setup lang="ts">
import { navigateToApp, APP_ROUTES } from '@/shared/components/AppSwitcher';
</script>
```

**Usage in React**:
```tsx
import { Menu, MenuItem } from '@fluentui/react-components';
import { navigateToApp, APP_ROUTES } from '@/shared/components/AppSwitcher';

export const AppMenu = () => {
  return (
    <Menu>
      <MenuItem onClick={() => navigateToApp(APP_ROUTES.VUE_DASHBOARD)}>
        Legacy Dashboard (Vue)
      </MenuItem>
    </Menu>
  );
};
```

---

## 4. State Sharing Between Apps

### 4.1 Option 1: localStorage (Simple)

**Shared State Manager**:
```typescript
// src/shared/state/sharedState.ts

export class SharedState {
  static set(key: string, value: any): void {
    localStorage.setItem(key, JSON.stringify(value));

    // Trigger storage event for other contexts
    window.dispatchEvent(new StorageEvent('storage', {
      key,
      newValue: JSON.stringify(value),
    }));
  }

  static get<T>(key: string): T | null {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : null;
  }

  static remove(key: string): void {
    localStorage.removeItem(key);
  }

  static subscribe(key: string, callback: (value: any) => void): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === key && e.newValue) {
        callback(JSON.parse(e.newValue));
      }
    };

    window.addEventListener('storage', handler);

    // Return unsubscribe function
    return () => window.removeEventListener('storage', handler);
  }
}

// Usage in Vue
import { SharedState } from '@/shared/state/sharedState';
SharedState.set('selectedDevice', device);

// Usage in React
import { SharedState } from '@/shared/state/sharedState';
const device = SharedState.get('selectedDevice');
```

### 4.2 Option 2: Custom Events (Real-time)

```typescript
// src/shared/state/eventBus.ts

export class EventBus {
  static emit(event: string, data: any): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }

  static on(event: string, handler: (data: any) => void): () => void {
    const listener = (e: Event) => {
      handler((e as CustomEvent).detail);
    };

    window.addEventListener(event, listener);

    return () => window.removeEventListener(event, listener);
  }
}

// Emit from Vue
EventBus.emit('device:selected', device);

// Listen in React
useEffect(() => {
  const unsubscribe = EventBus.on('device:selected', (device) => {
    console.log('Device selected:', device);
  });

  return unsubscribe;
}, []);
```

---

## 5. Build & Deployment

### 5.1 Development Mode

```bash
# Start both Vue and React in dev mode
npm run dev

# Vite will handle both Vue and React files
# Navigate to:
# - http://localhost:3000/v2/dashboard (Vue)
# - http://localhost:3000/t3000/tstat (React)
```

### 5.2 Production Build

```bash
npm run build

# Output:
dist/
  ├── index.html
  ├── assets/
  │   ├── vue-vendor.[hash].js
  │   ├── react-vendor.[hash].js
  │   ├── fluent-ui.[hash].js
  │   ├── main.[hash].js
  │   └── main.[hash].css
  └── ...
```

### 5.3 Bundle Size Management

**Lazy load apps** to reduce initial bundle:

```typescript
// src/main.ts
const currentPath = window.location.pathname;

if (currentPath.startsWith('/t3000')) {
  // Lazy load React app
  import(/* webpackChunkName: "react-app" */ './react-app/main').then((module) => {
    module.initReactApp();
  });
} else {
  // Lazy load Vue app
  import(/* webpackChunkName: "vue-app" */ './vue-app/main').then((module) => {
    module.initVueApp();
  });
}
```

**Expected Bundle Sizes**:
- Vue app: ~500 KB (gzipped: ~150 KB)
- React app: ~600 KB (gzipped: ~170 KB)
- Shared: ~100 KB (gzipped: ~30 KB)
- **Total**: ~1.2 MB (gzipped: ~350 KB)

Only the active app is loaded, so initial load is ~600-700 KB.

---

## 6. Migration Timeline

### 6.1 Phased Rollout

**Phase 1: Setup (Week 1-2)**
- ✅ Install React dependencies
- ✅ Configure Vite for dual build
- ✅ Create route dispatcher
- ✅ Set up shared code structure

**Phase 2: First React Page (Week 3-4)**
- ✅ Build MainLayout in React + Fluent UI
- ✅ Implement Tstat view (first page)
- ✅ Test navigation between Vue ↔ React

**Phase 3: Gradual Migration (Months 2-12+)**
- ✅ New features → React + Fluent UI only
- ⚠️ Old features → Keep in Vue (no migration)
- ✅ Add new pages to React app as needed

**Phase 4: Optional Full Migration (Year 2+)**
- ⚠️ Migrate remaining Vue pages (if desired)
- ⚠️ Remove Vue dependencies
- ✅ 100% React + Fluent UI

---

## 7. Advantages of Hybrid Approach

### 7.1 Benefits

| Aspect | Benefit |
|--------|---------|
| **Risk** | 🟢 LOW - Existing code keeps working |
| **Cost** | 💰 Initial: $20k (setup), then incremental |
| **Timeline** | ⏱️ 2-4 weeks to first React page |
| **Flexibility** | ✅ Can take years to fully migrate |
| **Team** | 👥 Team learns React gradually |
| **Features** | 🚀 Can ship new features immediately |
| **Rollback** | ↩️ Easy to rollback individual pages |

### 7.2 Trade-offs

| Aspect | Trade-off |
|--------|-----------|
| **Bundle Size** | ⚠️ Larger (both frameworks) |
| **Complexity** | ⚠️ Two build systems to maintain |
| **Consistency** | ⚠️ Two different UI styles (Quasar vs Fluent) |
| **Navigation** | ⚠️ Full page reload when switching apps |

---

## 8. Real-World Example

### 8.1 User Journey

**Scenario**: User managing T3 devices

1. **User logs in** → `/v2/login` (Vue + Quasar)
2. **Views dashboard** → `/v2/dashboard` (Vue + Quasar)
3. **Clicks "New T3BASWeb"** → Navigates to `/t3000/tstat`
4. **Page reloads** → React + Fluent UI app loads
5. **User sees Tstat view** → Beautiful Fluent UI interface
6. **Clicks "Back to Legacy"** → Navigates to `/v2/dashboard`
7. **Page reloads** → Vue app loads

**Performance**:
- First load: 600 KB (one framework)
- Switching apps: Full page reload (~1s)
- Same-app navigation: Instant (SPA)

---

## 9. Complete File Structure

```
T3000Webview5/
├── public/
│   └── index.html                        # Single HTML entry
│
├── src/
│   ├── main.ts                           # 🆕 Route dispatcher
│   │
│   ├── vue-app/                          # 🔵 Vue 3 + Quasar (existing)
│   │   ├── main.ts                       # Vue entry point
│   │   ├── App.vue
│   │   ├── router/
│   │   │   └── routes.ts                 # Vue routes (/v2/*)
│   │   ├── pages/V2/
│   │   │   ├── Dashboard.vue
│   │   │   ├── TrendLogDashboard.vue
│   │   │   └── ...
│   │   ├── components/
│   │   └── layouts/
│   │       └── MainLayout.vue
│   │
│   ├── react-app/                        # 🟢 React 18 + Fluent UI (new)
│   │   ├── main.tsx                      # React entry point
│   │   ├── App.tsx
│   │   ├── router/
│   │   │   └── routes.tsx                # React routes (/t3000/*)
│   │   ├── pages/T3000/
│   │   │   ├── Tstat/
│   │   │   │   └── TstatView.tsx
│   │   │   ├── BACnet/
│   │   │   │   ├── BACnetInput.tsx
│   │   │   │   └── BACnetOutput.tsx
│   │   │   └── Network/
│   │   │       └── NetworkView.tsx
│   │   ├── components/
│   │   │   └── T3000/
│   │   │       ├── DeviceTree.tsx
│   │   │       └── DataPointGrid.tsx
│   │   ├── layouts/
│   │   │   └── MainLayout.tsx
│   │   └── styles/
│   │       └── main.css
│   │
│   └── shared/                           # 🟡 Shared by both apps
│       ├── api/
│       │   ├── client.ts                 # Axios instance
│       │   ├── device.api.ts
│       │   └── trendlog.api.ts
│       ├── auth/
│       │   └── authService.ts
│       ├── state/
│       │   ├── sharedState.ts
│       │   └── eventBus.ts
│       ├── types/
│       │   ├── device.types.ts
│       │   └── common.types.ts
│       ├── utils/
│       │   └── helpers.ts
│       └── components/
│           └── AppSwitcher.ts
│
├── package.json                          # Both Vue & React deps
├── vite.config.ts                        # Dual build config
├── tsconfig.json                         # Shared TS config
└── README.md
```

---

## 10. Getting Started Checklist

### Week 1: Setup

- [ ] Install React dependencies
  ```bash
  npm install react react-dom react-router-dom
  npm install @fluentui/react-components @fluentui/react-icons
  npm install --save-dev @vitejs/plugin-react @types/react @types/react-dom
  ```

- [ ] Update `vite.config.ts` with both Vue and React plugins

- [ ] Create folder structure:
  ```bash
  mkdir -p src/vue-app src/react-app src/shared
  ```

- [ ] Move existing Vue code:
  ```bash
  mv src/App.vue src/vue-app/
  mv src/pages src/vue-app/
  mv src/components src/vue-app/
  mv src/layouts src/vue-app/
  mv src/router src/vue-app/
  ```

- [ ] Create `src/main.ts` (route dispatcher)

- [ ] Create `src/vue-app/main.ts` (Vue entry)

- [ ] Create `src/react-app/main.tsx` (React entry)

### Week 2: First React Page

- [ ] Create `src/react-app/layouts/MainLayout.tsx`

- [ ] Create `src/react-app/router/routes.tsx`

- [ ] Create `src/react-app/pages/T3000/Tstat/TstatView.tsx`

- [ ] Test navigation: `/v2/dashboard` → `/t3000/tstat`

### Week 3+: Build Features

- [ ] Add new pages to React app

- [ ] Share auth state between apps

- [ ] Add navigation menu in both apps

---

## 11. Summary

**This hybrid approach allows you to**:

✅ **Keep existing Vue code** - Zero migration cost
✅ **Build new features in React + Fluent UI** - Best Microsoft experience
✅ **Gradual transition** - No rush, can take years
✅ **Lower risk** - Existing features keep working
✅ **Team learning** - Learn React while building

**Timeline**:
- Setup: 2 weeks
- First page: 2 weeks
- New features: Ongoing (React only)
- Full migration: Optional (years)

**Cost**:
- Setup: $20k (2 developers × 2 weeks)
- Ongoing: New features in React (no migration cost)

**Recommendation**: ✅ **Best of both worlds!**
