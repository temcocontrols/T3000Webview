import { boot } from 'quasar/wrappers';
import { serviceWorkerManager } from 'src/lib/performance/ServiceWorkerManager.js';
import { progressiveLoader } from 'src/lib/performance/ProgressiveLoader.js';
import { webWorkerManager } from 'src/lib/performance/WebWorkerManager.js';
import { t3000Cache } from 'src/lib/performance/AdvancedCache.js';
import { performanceMonitor } from 'src/lib/performance/PerformanceMonitor.js';
import { asyncTimeoutManager } from 'src/lib/performance/AsyncComponentTimeoutManager.js';
import { chunkLoadingManager } from 'src/lib/performance/ChunkLoadingManager.js';
import { ErrorHandler, ErrorSeverity } from 'src/lib/T3000/Hvac/Util/ErrorHandler';
import { NodeDebugger } from 'src/lib/debug/NodeDebugger.js';
import LogUtil from 'src/lib/T3000/Hvac/Util/LogUtil';

export default boot(async ({ app, router }) => {
  // LogUtil.Debug('[Boot] Initializing T3000 Performance Optimizations...');

  try {
    // Initialize chunk loading manager first to handle early chunk errors
    // LogUtil.Debug('[Boot] Chunk loading manager initialized');

    // Initialize global error handling
    ErrorHandler.initializeGlobalHandling();

    // Add Vue-specific error handling
    app.config.errorHandler = (error, instance, info) => {
      const errorHandler = ErrorHandler.getInstance();

      // Convert unknown error to Error instance
      const errorInstance = error instanceof Error ? error : new Error(String(error));

      // Check if this is a Selecto/Gesto error (safe to ignore)
      const isSelectoError = errorInstance.message?.includes('gesto') ||
                            errorInstance.message?.includes('selecto') ||
                            errorInstance.message?.includes('can\'t access property "unset"') ||
                            errorInstance.stack?.includes('SelectoManager') ||
                            errorInstance.stack?.includes('Selecto.vue') ||
                            errorInstance.stack?.includes('gesto');

      if (isSelectoError) {
        // LogUtil.Debug('[Vue ErrorHandler] Selecto/Gesto error detected and ignored:', errorInstance.message);
        // LogUtil.Debug('[Vue ErrorHandler] Selecto error safely ignored:', errorInstance.message);
        return;
      }

      errorHandler.handleError(
        errorInstance,
        {
          component: instance?.$options.name || 'UnknownComponent',
          function: 'Vue lifecycle',
          userAction: info || 'Vue component error',
          componentInfo: {
            name: instance?.$options.name,
            is: instance?.$options.is,
            propsData: instance?.$props
          }
        },
        ErrorSeverity.HIGH
      );
    };

    // LogUtil.Debug('[Boot] Global error handling initialized');

    // Start DOM mutation monitoring in development
    if (process.env.NODE_ENV === 'development') {
      NodeDebugger.startDOMMutationMonitoring();
    }

    // Initialize Service Worker for offline functionality and caching
    if (process.env.NODE_ENV === 'production' || window.location.search.includes('sw=true')) {
      const swRegistered = await serviceWorkerManager.register();
      if (swRegistered) {
        // LogUtil.Debug('[Boot] Service Worker registered successfully');

        // Setup update notifications
        serviceWorkerManager.on('updateAvailable', () => {
          // LogUtil.Debug('[Boot] Service Worker update available');
          // You could show a notification to the user here
        });

        serviceWorkerManager.on('offline', () => {
          // LogUtil.Debug('[Boot] Application is offline');
          // You could show offline indicator here
        });

        serviceWorkerManager.on('online', () => {
          // LogUtil.Debug('[Boot] Application is back online');
          // You could hide offline indicator here
        });
      }
    }

    // Initialize Web Worker for background processing
    if (webWorkerManager.isSupported) {
      // LogUtil.Debug('[Boot] Web Worker Manager initialized');
    } else {
      // LogUtil.Debug('[Boot] Web Workers not supported, falling back to main thread processing');
    }

    // Initialize chunk loading performance monitoring
    asyncTimeoutManager.monitorChunkLoading();
    // LogUtil.Debug('[Boot] Chunk loading performance monitoring enabled');

    // Initialize Progressive Loader for images and data
    // LogUtil.Debug('[Boot] Progressive Loader initialized');

    // Initialize Async Component Timeout Manager
    // LogUtil.Debug('[Boot] Async Component Timeout Manager initialized');
    // The manager is automatically available through imports

    // Setup router hooks for performance monitoring
    router.beforeEach((to, from, next) => {
      performanceMonitor.mark(`route-start-${String(to.name) || 'unknown'}`);
      next();
    });

    router.afterEach((to, from) => {
      performanceMonitor.mark(`route-end-${String(to.name) || 'unknown'}`);
      performanceMonitor.measure(
        `route-${String(to.name) || 'unknown'}`,
        `route-start-${String(to.name) || 'unknown'}`,
        `route-end-${String(to.name) || 'unknown'}`
      );
    });

    // Initialize performance monitoring
    performanceMonitor.trackComponentRender('App', performance.now());

    // Setup unhandled promise rejection tracking
    window.addEventListener('unhandledrejection', (event) => {
      LogUtil.Error('[Performance] Unhandled promise rejection:', event.reason);
      performanceMonitor.log('Unhandled Promise Rejection', {
        reason: event.reason
      });
    });

    // Setup memory monitoring (if supported)
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = (performance as any).memory;
        if (memInfo) {
          performanceMonitor.updateMemoryMetrics(
            memInfo.usedJSHeapSize,
            memInfo.totalJSHeapSize,
            memInfo.jsHeapSizeLimit
          );
        }
      }, 30000); // Every 30 seconds
    }

    // Initialize T3000 cache with some default settings
    // LogUtil.Debug('[Boot] T3000 Advanced Cache initialized');

    // Preload critical T3000 data if available
    try {
      const cachedData = await t3000Cache.export();
      if (cachedData && Object.keys(cachedData.data).length > 0) {
        // LogUtil.Debug('[Boot] Restored cached T3000 data:', Object.keys(cachedData.data).length, 'entries');
      }
    } catch (error) {
      // LogUtil.Debug('[Boot] Failed to restore cached data:', error);
    }

    // Setup periodic cache cleanup
    setInterval(() => {
      t3000Cache.cleanup();
    }, 10 * 60 * 1000); // Every 10 minutes

    // Add global performance utilities to app instance
    app.config.globalProperties.$performance = {
      monitor: performanceMonitor,
      cache: t3000Cache,
      webWorker: webWorkerManager,
      serviceWorker: serviceWorkerManager,
      progressiveLoader: progressiveLoader
    };

    // LogUtil.Debug('[Boot] T3000 Performance Optimizations initialized successfully');

  } catch (error) {
    LogUtil.Error('[Boot] Failed to initialize performance optimizations:', error);
    // Don't fail the application startup if performance optimizations fail
  }
});
