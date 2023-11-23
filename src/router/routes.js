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
      { path: "apps-library", component: () => import("pages/AppLibrary.vue") },
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
