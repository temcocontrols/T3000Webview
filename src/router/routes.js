
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil';
import { defineAsyncComponent } from 'vue';

// Create optimized lazy components with robust error handling and retry logic
const createOptimizedComponent = (importFn, name, options = {}) => {
  const {
    category = 'normal',
    timeout = getTimeoutForComponent(name),
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  // LogUtil.Debug(`Creating component: ${name} with timeout: ${timeout}ms`);

  return defineAsyncComponent({
    loader: async () => {
      return loadComponentWithRetry(importFn, name, maxRetries, retryDelay, timeout);
    },
    loadingComponent: {
      template: `<SimpleLoadingComponent :message="'Loading component...'" :component-name="'${name}'" />`,
      components: {
        SimpleLoadingComponent: () => import('../components/hvac/SimpleLoadingComponent.vue')
      }
    },
    errorComponent: {
      template: `<SimpleErrorFallback :error="error" :component-name="'${name}'" />`,
      components: {
        SimpleErrorFallback: () => import('../components/hvac/SimpleErrorFallback.vue')
      },
      props: ['error']
    },
    delay: 200,
    timeout,
    onError: (error, retry, fail, attempts) => {
      LogUtil.Error(`Error loading component ${name} (attempt ${attempts}):`, error);

      // For timeout errors, try to retry with longer timeout
      if (error.message.includes('timed out') && attempts < maxRetries) {
        // LogUtil.Debug(`Retrying component ${name} with extended timeout...`);
        setTimeout(() => retry(), retryDelay * attempts);
      } else {
        LogUtil.Error(`Failed to load component ${name} after ${attempts} attempts`);
        fail();
      }
    }
  });
};

// Get appropriate timeout based on component name and known problematic files
function getTimeoutForComponent(name) {
  // Known heavy components that need longer timeouts
  const heavyComponents = {
    'IndexPage2': 30000,        // 30 seconds for IndexPage2 (contains pathseg.js)
    'HvacIndexPage2': 30000,
    'SVGEditor': 25000,
    'MainLayout': 20000,
    'HvacIndexPage': 20000,
    'TrendLogIndexPage': 25000  // 25 seconds for TrendLogIndexPage (complex dependencies)
  };

  return heavyComponents[name] || 15000; // Default 15 seconds
}

// Enhanced component loader with retry logic
async function loadComponentWithRetry(importFn, name, maxRetries, retryDelay, timeout) {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // LogUtil.Debug(`Loading component: ${name} (attempt ${attempt}/${maxRetries})`);

      // Create a promise race between the import and a timeout
      const loadPromise = importFn();
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Component ${name} timed out after ${timeout}ms (attempt ${attempt})`));
        }, timeout);
      });

      const module = await Promise.race([loadPromise, timeoutPromise]);
      // LogUtil.Debug(`Successfully loaded component: ${name} on attempt ${attempt}`);
      return module;

    } catch (error) {
      lastError = error;
      // LogUtil.Debug(`Failed to load component ${name} on attempt ${attempt}:`, error.message);

      // If this isn't the last attempt, wait before retrying
      if (attempt < maxRetries) {
        const delay = retryDelay * attempt; // Exponential backoff
        // LogUtil.Debug(`Retrying component ${name} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  LogUtil.Error(`Failed to load component ${name} after ${maxRetries} attempts`);
  throw lastError;
}

const routes = [
  {
    path: "/",
    component: createOptimizedComponent(() => import("layouts/MainLayout.vue"), "MainLayout", { category: 'critical' }),
    children: [
      {
        path: "",
        name: "home",
        component: createOptimizedComponent(() => import("pages/HvacDrawer/IndexPage.vue"), "HvacIndexPage", { category: 'normal' }),
      },
      {
        path: "login",
        component: createOptimizedComponent(() => import("pages/LoginPage.vue"), "LoginPage", { category: 'fast' })
      },
    ],
  },
  {
    path: "/trend-log",
    component: createOptimizedComponent(() => import("layouts/TrendLogLayout.vue"), "TrendLogLayout", { category: 'critical' }),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("pages/TrendLog/IndexPageSocket.vue"), "IndexPageSocket", { category: 'normal' }),
      }
    ],
  },
  {
    path: '/new',
    component: createOptimizedComponent(() => import('layouts/MainLayout2.vue'), "MainLayout2", { category: 'critical' }),
    children: [
      {
        path: '',
        component: createOptimizedComponent(() => import('src/pages/V2/Dashboard.vue'), "V2Dashboard", { category: 'normal' })
      },
      {
        path: 'dashboard',
        component: createOptimizedComponent(() => import('src/pages/V2/Dashboard.vue'), "V2Dashboard", { category: 'normal' })
      },
      {
        path: 'new-ui',
        component: createOptimizedComponent(() => import('src/components/NewUI/IndexPage2.vue'), "NewUIIndexPage2", { category: 'slow' })
      },
      {
        path: 'app-library',
        component: createOptimizedComponent(() => import('src/pages/V2/AppLibrary.vue'), "V2AppLibrary", { category: 'normal' })
      },
      {
        path: 'modbus-register',
        component: createOptimizedComponent(() => import('src/pages/V2/ModbusRegister.vue'), "V2ModbusRegister", { category: 'normal' })
      },
      {
        path: 'schedules',
        component: createOptimizedComponent(() => import('src/pages/V2/Schedules.vue'), "V2Schedules", { category: 'normal' })
      },
      {
        path: 'holidays',
        component: createOptimizedComponent(() => import('src/pages/V2/Schedules.vue'), "V2Holidays", { category: 'normal' })
      },
      {
        path: 'grafana-demo',
        component: createOptimizedComponent(() => import('src/pages/V2/GrafanaDemo.vue'), "GrafanaDemo", { category: 'normal' })
      },
      {
        path: 'navigation-test',
        component: createOptimizedComponent(() => import('src/pages/V2/NavigationTest.vue'), "NavigationTest", { category: 'normal' })
      },
      {
        path: 'chartjs-dashboard',
        component: createOptimizedComponent(() => import('src/pages/V2/ChartJsDashboard.vue'), "ChartJsDashboard", { category: 'normal' })
      },
      {
        path: 'grafana-timeseries',
        component: createOptimizedComponent(() => import('src/pages/V2/GrafanaTimeSeriesDemo.vue'), "GrafanaTimeSeriesDemo", { category: 'normal' })
      },
      {
        path: 'grafana-react',
        component: createOptimizedComponent(() => import('src/pages/V2/GrafanaReactDemo.vue'), "GrafanaReactDemo", { category: 'normal' })
      },
      {
        path: 'timeseries-dashboard',
        component: createOptimizedComponent(() => import('src/pages/V2/TrendLogDashboard.vue'), "TrendLogDashboard", { category: 'normal' })
      }
    ]
  },
  {
    path: "/hvac",
    component: createOptimizedComponent(() => import("layouts/MainLayout.vue"), "HvacMainLayout", { category: 'critical' }),
    children: [
      {
        path: "t2",
        name: "hvac2",
        component: createOptimizedComponent(() => import("src/components/NewUI/IndexPage2.vue"), "HvacIndexPage2", { category: 'slow' }),
      },
      {
        path: "schedules",
        name: "schedules",
        component: createOptimizedComponent(() => import("src/pages/V2/Schedules.vue"), "HvacSchedules", { category: 'normal' }),
      },
      {
        path: "library",
        name: "library",
        component: createOptimizedComponent(() => import("src/components/NewUI/NewLibrary.vue"), "HvacNewLibrary", { category: 'slow' }),
      }
    ],
  },
  {
    path: "/apps-library",
    component: createOptimizedComponent(() => import("layouts/AppsLibLayout.vue"), "AppsLibLayout", { category: 'normal' }),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("pages/AppsLibrary/IndexPage.vue"), "AppsLibIndexPage", { category: 'normal' }),
      },
      {
        path: "create",
        component: createOptimizedComponent(() => import("pages/AppsLibrary/CreateApp.vue"), "AppsLibCreateApp", { category: 'normal' }),
      },
      {
        path: ":id/edit",
        component: createOptimizedComponent(() => import("pages/AppsLibrary/EditApp.vue"), "AppsLibEditApp", { category: 'normal' }),
      },
      {
        path: "user/apps",
        component: createOptimizedComponent(() => import("pages/AppsLibrary/UserApps.vue"), "AppsLibUserApps", { category: 'normal' }),
      },
    ],
  },
  {
    path: "/modbus-register",
    component: createOptimizedComponent(() => import("layouts/ModbusRegLayout.vue"), "ModbusRegLayout", { category: 'normal' }),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("pages/ModbusRegister/IndexPage.vue"), "ModbusRegIndexPage", { category: 'normal' }),
      },
    ],
  },
  {
    path: "/dashboard",
    component: createOptimizedComponent(() => import("layouts/MainLayout2.vue"), "ModbusRegLayout", { category: 'normal' }),
    children: [
      {
        path: "",
        component: createOptimizedComponent(() => import("src/pages/Dashboard/T3DeviceDb.vue"), "T3DeviceDBPage", { category: 'normal' }),
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
    component: createOptimizedComponent(() => import("pages/V2/PageFallback.vue"), "PageFallback", { category: 'fast' }),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: createOptimizedComponent(() => import("pages/V2/ErrorNotFound.vue"), "ErrorNotFound", { category: 'fast' }),
  },
];

export default routes;
