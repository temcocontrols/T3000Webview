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
      { path: '', component: () => import('src/pages/Test/HvacIndex.vue') },
      { path: 'hvac', component: () => import('src/pages/Test/HvacT2.vue') },
      { path: 'test1', component: () => import('src/pages/Test/Test1.vue') },
      { path: 'datasets', component: () => import('src/pages/Test/Test2.vue') },
      { path: 'studios', component: () => import('src/pages/Test/Test2.vue') },
      { path: 'docs', component: () => import('src/pages/Test/Test2.vue') }
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
