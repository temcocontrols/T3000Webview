
import LogUtil from '@/lib/vue/T3000/Hvac/Util/LogUtil';
import { defineAsyncComponent, h } from 'vue';

// Shared top-center loading indicator for lazy routes (used for both the
// loading and error states). The spinner keyframe is injected once.
if (typeof document !== 'undefined' && !document.getElementById('__route-loading-spin')) {
  const style = document.createElement('style');
  style.id = '__route-loading-spin';
  style.textContent = '@keyframes __routeSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

const LoadingText = {
  render: () => h('div', {
    style: 'position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;justify-content:center;gap:8px;padding:20px 12px;font-size:14px;color:#555;'
  }, [
    h('span', {
      style: 'display:inline-block;width:16px;height:16px;border:2px solid #e5e7eb;border-top-color:#3b82f6;border-radius:50%;animation:__routeSpin 0.8s linear infinite;flex-shrink:0;'
    }),
    'Loading, please wait…'
  ])
};

// Create optimized lazy components with robust error handling and retry logic
const createOptimizedComponent = (importFn, name, options = {}) => {
  const {
    timeout = getTimeoutForComponent(name),
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  return defineAsyncComponent({
    loader: importFn,
    loadingComponent: LoadingText,
    errorComponent: LoadingText,
    delay: 200,
    timeout,
    onError: (error, retry, fail, attempts) => {
      const msg = error?.message || '';

      // Stale chunk URL after a Vite restart — only a full page reload recovers.
      if (msg.includes('Failed to fetch dynamically imported module') ||
          msg.includes('error loading dynamically imported module')) {
        LogUtil.Warn(`Stale module for "${name}" — reloading page.`);
        if (!sessionStorage.getItem('__t3_stale_module_reloaded')) {
          sessionStorage.setItem('__t3_stale_module_reloaded', '1');
          setTimeout(() => window.location.reload(), 500);
        }
        return;
      }

      // Timeout: keep retrying — cold Vite compile eventually finishes.
      if (msg.includes('timed out')) {
        LogUtil.Warn(`"${name}" timed out (attempt ${attempts}) — retrying...`);
        setTimeout(() => retry(), retryDelay);
        return;
      }

      // Genuine error: retry a few times, then give up silently (loading text stays).
      if (attempts < maxRetries) {
        setTimeout(() => retry(), retryDelay * attempts);
      } else {
        LogUtil.Error(`Failed to load component ${name} after ${attempts} attempts`);
        fail();
      }
    }
  });
};

// Per-route lazy-load timeout; heavy pages get longer budgets.
function getTimeoutForComponent(name) {
  const heavyComponents = {
    'IndexPage2': 30000,        // 30 seconds for IndexPage2 (contains pathseg.js)
    'HvacIndexPage2': 30000,
    'SVGEditor': 25000,
    'MainLayout': 20000,
    'HvacIndexPage': 20000,
    'TrendLogIndexPage': 25000, // 25 seconds for TrendLogIndexPage (complex dependencies)
    'IndexPageSocket': 30000,   // Trend Log Beta page (loads TrendLogChart.vue + Chart.js + Ant icons)
    'TrendLogLayout': 20000     // Trend Log Beta layout wrapper
  };

  const baseTimeout = heavyComponents[name] || 15000; // Default 15 seconds

  // Dev builds compile lazy routes on demand, so a cold load can be slow.
  if (import.meta.env.DEV) {
    return Math.max(baseTimeout, 120000);
  }

  return baseTimeout;
}

const routes = [
  {
    path: "/",
    component: createOptimizedComponent(() => import("../layouts/MainLayout.vue"), "MainLayout"),
    children: [
      {
        path: "",
        name: "home",
        component: createOptimizedComponent(() => import("../pages/HvacDrawer/IndexPage.vue"), "HvacIndexPage"),
      },
      {
        path: "login",
        component: createOptimizedComponent(() => import("../pages/LoginPage.vue"), "LoginPage")
      },
    ],
  },
  {
    path: "/trend-log",
    component: createOptimizedComponent(() => import("../layouts/TrendLogLayout.vue"), "TrendLogLayout"),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("../pages/TrendLog/IndexPageSocket.vue"), "IndexPageSocket"),
      }
    ],
  },
  {
    path: '/new',
    component: createOptimizedComponent(() => import('../layouts/MainLayout2.vue'), "MainLayout2"),
    children: [
      {
        path: '',
        component: createOptimizedComponent(() => import('../pages/V2/Dashboard.vue'), "V2Dashboard")
      },
      {
        path: 'dashboard',
        component: createOptimizedComponent(() => import('../pages/V2/Dashboard.vue'), "V2Dashboard")
      },
      {
        path: 'new-ui',
        component: createOptimizedComponent(() => import('../components/NewUI/IndexPage2.vue'), "NewUIIndexPage2")
      },
      {
        path: 'app-library',
        component: createOptimizedComponent(() => import('../pages/V2/AppLibrary.vue'), "V2AppLibrary")
      },
      {
        path: 'modbus-register',
        component: createOptimizedComponent(() => import('../pages/V2/ModbusRegister.vue'), "V2ModbusRegister")
      },
      {
        path: 'schedules',
        component: createOptimizedComponent(() => import('../pages/V2/Schedules.vue'), "V2Schedules")
      },
      {
        path: 'holidays',
        component: createOptimizedComponent(() => import('../pages/V2/Schedules.vue'), "V2Holidays")
      },
      {
        path: 'timeseries-dashboard',
        component: createOptimizedComponent(() => import('../pages/V2/TrendLogDashboard.vue'), "TrendLogDashboard")
      }
    ]
  },
  {
    path: "/hvac",
    component: createOptimizedComponent(() => import("../layouts/MainLayout.vue"), "HvacMainLayout"),
    children: [
      {
        path: "t2",
        name: "hvac2",
        component: createOptimizedComponent(() => import("../components/NewUI/IndexPage2.vue"), "HvacIndexPage2"),
      },
      {
        path: "schedules",
        name: "schedules",
        component: createOptimizedComponent(() => import("../pages/V2/Schedules.vue"), "HvacSchedules"),
      },
      {
        path: "library",
        name: "library",
        component: createOptimizedComponent(() => import("../components/NewUI/NewLibrary.vue"), "HvacNewLibrary"),
      }
    ],
  },
  {
    path: "/apps-library",
    component: createOptimizedComponent(() => import("../layouts/AppsLibLayout.vue"), "AppsLibLayout"),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("../pages/AppsLibrary/IndexPage.vue"), "AppsLibIndexPage"),
      },
      {
        path: "create",
        component: createOptimizedComponent(() => import("../pages/AppsLibrary/CreateApp.vue"), "AppsLibCreateApp"),
      },
      {
        path: ":id/edit",
        component: createOptimizedComponent(() => import("../pages/AppsLibrary/EditApp.vue"), "AppsLibEditApp"),
      },
      {
        path: "user/apps",
        component: createOptimizedComponent(() => import("../pages/AppsLibrary/UserApps.vue"), "AppsLibUserApps"),
      },
    ],
  },
  {
    path: "/modbus-register",
    component: createOptimizedComponent(() => import("../layouts/ModbusRegLayout.vue"), "ModbusRegLayout"),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("../pages/ModbusRegister/IndexPage.vue"), "ModbusRegIndexPage"),
      },
    ],
  },
  {
    path: "/dashboard",
    component: createOptimizedComponent(() => import("../layouts/MainLayout2.vue"), "ModbusRegLayout"),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("../pages/Dashboard/T3DeviceDb.vue"), "T3DeviceDBPage"),
      },
    ],
  },
  {
    path: "/database",
    component: createOptimizedComponent(() => import("../layouts/MainLayout2.vue"), "DatabaseLayout"),
    children: [
      {
        path: "",
        name: "database",
        component: createOptimizedComponent(() => import("../components/Database/DatabaseManagementPage.vue"), "DatabaseManagementPage"),
      },
      {
        path: "settings",
        name: "database-settings",
        component: createOptimizedComponent(() => import("../components/Database/ApplicationSettingsPanel.vue"), "ApplicationSettingsPanel"),
      },
      {
        path: "partitions",
        name: "database-partitions",
        component: createOptimizedComponent(() => import("../components/Database/DatabasePartitionsPanel.vue"), "DatabasePartitionsPanel"),
      },
      {
        path: "monitoring",
        name: "database-monitoring",
        component: createOptimizedComponent(() => import("../components/Database/MonitoringStatsPanel.vue"), "MonitoringStatsPanel"),
      },
      {
        path: "tools",
        name: "database-tools",
        component: createOptimizedComponent(() => import("../components/Database/ManagementToolsPanel.vue"), "ManagementToolsPanel"),
      },
    ],
  },
  // Diagnostic page for testing
  {
    path: "/diagnostic",
    component: () => import("../pages/V2/DiagnosticPage.vue")
  },
  // Error fallback page for severe failures
  {
    path: "/error-fallback",
    component: createOptimizedComponent(() => import("../pages/V2/PageFallback.vue"), "PageFallback"),
  },
  // React app container for /t3000/* routes (must be before catch-all)
  {
    path: "/t3000/:pathMatch(.*)*",
    component: () => import("../pages/ReactContainer.vue"),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: createOptimizedComponent(() => import("../pages/V2/ErrorNotFound.vue"), "ErrorNotFound"),
  },
];

export default routes;
