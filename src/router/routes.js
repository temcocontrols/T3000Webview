import { defineAsyncComponent } from 'vue';

// Create optimized lazy components with simple error handling
const createOptimizedComponent = (importFn, name, options = {}) => {
  const {
    category = 'normal',
    timeout = 15000
  } = options;

  console.log(`Creating component: ${name}`);

  return defineAsyncComponent({
    loader: async () => {
      console.log(`Loading component: ${name}`);
      try {
        const module = await importFn();
        console.log(`Successfully loaded component: ${name}`);
        return module;
      } catch (error) {
        console.error(`Failed to load component: ${name}`, error);
        throw error;
      }
    },
    loadingComponent: {
      template: `<SimpleLoadingComponent :message="'Loading component...'" :component-name="'${name}'" />`,
      components: {
        SimpleLoadingComponent: () => import('../components/SimpleLoadingComponent.vue')
      }
    },
    errorComponent: {
      template: `<SimpleErrorFallback :error="error" :component-name="'${name}'" />`,
      components: {
        SimpleErrorFallback: () => import('../components/SimpleErrorFallback.vue')
      },
      props: ['error']
    },
    delay: 200,
    timeout,
    onError: (error, retry, fail, attempts) => {
      console.error(`Error loading component ${name} (attempt ${attempts}):`, error);
      fail(); // Always fail to show error component
    }
  });
};

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
  // Diagnostic page for testing
  {
    path: "/diagnostic",
    component: () => import("../pages/DiagnosticPage.vue")
  },
  // Error fallback page for severe failures
  {
    path: "/error-fallback",
    component: createOptimizedComponent(() => import("pages/PageFallback.vue"), "PageFallback", { category: 'fast' }),
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: createOptimizedComponent(() => import("pages/ErrorNotFound.vue"), "ErrorNotFound", { category: 'fast' }),
  },
];

export default routes;
