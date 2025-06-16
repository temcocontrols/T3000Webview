const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("pages/HvacDrawer/IndexPage.vue"),
      },
      { path: "login", component: () => import("pages/LoginPage.vue") },
    ],
  },
  {
    path: '/new',
    component: () => import('layouts/MainLayout2.vue'),
    children: [
      { path: '', component: () => import('src/pages/V2/Dashboard.vue') },
      { path: 'dashboard', component: () => import('src/pages/V2/Dashboard.vue') },
      { path: 'new-ui', component: () => import('src/components/NewUI/IndexPage2.vue') },
      { path: 'app-library', component: () => import('src/pages/V2/AppLibrary.vue') },
      { path: 'modbus-register', component: () => import('src/pages/V2/ModbusRegister.vue') },
      { path: 'schedules', component: () => import('src/pages/V2/Schedules.vue') },
      { path: 'holidays', component: () => import('src/pages/V2/Schedules.vue') }
    ]
  },
  {
    path: "/hvac",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "t2",
        name: "hvac2",
        component: () => import("src/components/NewUI/IndexPage2.vue"),
      },
      {
        path: "schedules",
        name: "schedules",
        component: () => import("src/pages/V2/Schedules.vue"),
      },
      {
        path: "library",
        name: "library",
        component: () => import("src/components/NewUI/NewLibrary.vue"),
      }
    ],
  },
  {
    path: "/apps-library",
    component: () => import("layouts/AppsLibLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/AppsLibrary/IndexPage.vue"),
      },
      {
        path: "create",
        component: () => import("pages/AppsLibrary/CreateApp.vue"),
      },
      {
        path: ":id/edit",
        component: () => import("pages/AppsLibrary/EditApp.vue"),
      },
      {
        path: "user/apps",
        component: () => import("pages/AppsLibrary/UserApps.vue"),
      },
    ],
  },
  {
    path: "/modbus-register",
    component: () => import("layouts/ModbusRegLayout.vue"),
    children: [
      {
        path: "",
        component: () => import("pages/ModbusRegister/IndexPage.vue"),
      },
    ],
  },
  // Always leave this as last one,
  // but you can also remove it
  {
    path: "/:catchAll(.*)*",
    component: () => import("pages/ErrorNotFound.vue"),
  },
];

export default routes;
