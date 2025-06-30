/**
 * Dynamic loader for heavy T3000 components
 * Implements lazy loading to reduce initial bundle size
 */

// Lazy load heavy components
export const lazyLoadT3000 = () => import('../../lib/T3000/T3000');
export const lazyLoadHvac = () => import('../../lib/T3000/Hvac/Hvac');
export const lazyLoadData = () => import('../../lib/T3000/Hvac/Data/Data');

// Lazy load heavy third-party libraries
export const lazyLoadMoveable = () => import('vue3-moveable');
export const lazyLoadSelecto = () => import('vue3-selecto');
export const lazyLoadKeyController = () => import('keycon');
export const lazyLoadEcharts = () => import('echarts');

// Lazy load heavy components
export const lazyLoadGaugeSettings = () => import('../../components/GaugeSettingsDialog.vue');
export const lazyLoadFileUpload = () => import('../../components/FileUpload.vue');
export const lazyLoadObjectConfig = () => import('../../components/ObjectConfig.vue');
export const lazyLoadCanvasType = () => import('../../components/CanvasType.vue');
export const lazyLoadCanvasShape = () => import('../../components/CanvasShape.vue');

// Dynamic loading state management
export const dynamicLoaders = {
  isLoading: false,
  loadedModules: new Set(),
  loadingPromises: new Map(),

  async loadModule(moduleName, loader) {
    if (this.loadedModules.has(moduleName)) {
      return;
    }

    if (this.loadingPromises.has(moduleName)) {
      return this.loadingPromises.get(moduleName);
    }

    this.isLoading = true;
    const promise = loader().then(module => {
      this.loadedModules.add(moduleName);
      return module;
    }).finally(() => {
      this.loadingPromises.delete(moduleName);
      this.isLoading = false;
    });

    this.loadingPromises.set(moduleName, promise);
    return promise;
  },

  async loadT3000Core() {
    return Promise.all([
      this.loadModule('T3000', lazyLoadT3000),
      this.loadModule('Hvac', lazyLoadHvac),
      this.loadModule('Data', lazyLoadData),
    ]);
  },

  async loadDrawingTools() {
    return Promise.all([
      this.loadModule('Moveable', lazyLoadMoveable),
      this.loadModule('Selecto', lazyLoadSelecto),
      this.loadModule('KeyController', lazyLoadKeyController),
    ]);
  },

  async loadCanvasComponents() {
    return Promise.all([
      this.loadModule('CanvasType', lazyLoadCanvasType),
      this.loadModule('CanvasShape', lazyLoadCanvasShape),
      this.loadModule('Echarts', lazyLoadEcharts),
    ]);
  }
};

export default dynamicLoaders;
