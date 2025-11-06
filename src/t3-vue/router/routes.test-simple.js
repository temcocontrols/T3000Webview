// Simple test routes for debugging empty page issue
import { defineAsyncComponent } from 'vue';

// Simple async component factory
const createSimpleComponent = (importFn, name) => {
  console.log(`Creating simple component: ${name}`);

  return defineAsyncComponent({
    loader: async () => {
      console.log(`Loading component: ${name}`);
      try {
        const module = await importFn();
        console.log(`Successfully loaded component: ${name}`, module);
        return module;
      } catch (error) {
        console.error(`Failed to load component: ${name}`, error);
        throw error;
      }
    },
    loadingComponent: {
      template: `
        <div style="display: flex; align-items: center; justify-content: center; height: 200px;">
          <div style="text-align: center;">
            <div style="font-size: 24px;">â?/div>
            <p>Loading ${name}...</p>
          </div>
        </div>
      `
    },
    errorComponent: {
      template: `
        <div style="display: flex; align-items: center; justify-content: center; height: 200px; border: 2px solid red; margin: 20px;">
          <div style="text-align: center;">
            <div style="font-size: 24px; color: red;">â?/div>
            <h3>Failed to load ${name}</h3>
            <p>{{ error?.message || 'Unknown error' }}</p>
            <button onclick="window.location.reload()">Reload Page</button>
          </div>
        </div>
      `,
      props: ['error']
    },
    delay: 200,
    timeout: 10000
  });
};

const testRoutes = [
  {
    path: "/",
    component: createSimpleComponent(() => import("layouts/MainLayout.vue"), "MainLayout"),
    children: [
      {
        path: "",
        name: "home",
        component: createSimpleComponent(() => import("pages/HvacDrawer/IndexPage.vue"), "HvacIndexPage"),
      }
    ],
  },
  {
    path: "/:catchAll(.*)*",
    component: {
      template: `
        <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
          <div style="text-align: center;">
            <h2>Page Not Found</h2>
            <p>The requested page could not be found.</p>
            <button onclick="window.location.href='/'">Go Home</button>
          </div>
        </div>
      `
    }
  },
];

export default testRoutes;
