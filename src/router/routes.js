const routes = [
  {
    path: "/",
    component: () => import("layouts/MainLayout.vue"),
    children: [
      {
        path: "",
        name: "home",
        component: () => import("pages/IndexPage.vue"),
      },
      { path: "login", component: () => import("pages/LoginPage.vue") },
    ],
  },
  {
    path: "/",
    component: () => import("layouts/UserLayout.vue"),
    children: [
      {
        path: "apps-library",
        component: () => import("pages/AppsLibrary.vue"),
      },
      {
        path: "save-to-library",
        component: () => import("pages/SaveToLibrary.vue"),
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
