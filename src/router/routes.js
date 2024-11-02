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
    path: "/hvac",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "hvac-new",
        component: () => import("pages/HvacDrawer/IndexPage2.vue"),
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
