import { boot } from 'quasar/wrappers';
import { serviceWorkerManager } from 'src/lib/performance/ServiceWorkerManager.js';
import { progressiveLoader } from 'src/lib/performance/ProgressiveLoader.js';
import { webWorkerManager } from 'src/lib/performance/WebWorkerManager.js';
import { t3000Cache } from 'src/lib/performance/AdvancedCache.js';
import { performanceMonitor } from 'src/lib/performance/PerformanceMonitor.js';
import { asyncTimeoutManager } from 'src/lib/performance/AsyncComponentTimeoutManager.js';
import { ErrorHandler } from 'src/lib/T3000/Hvac/Util/ErrorHandler';
import { NodeDebugger } from 'src/lib/debug/NodeDebugger.js';

export default boot(async ({ app, router }) => {
  console.log('[Boot] Initializing T3000 Performance Optimizations...');

  try {
    // Initialize global error handling first
    ErrorHandler.initializeGlobalHandling();
    console.log('[Boot] Global error handling initialized');

    // Start DOM mutation monitoring in development
    if (process.env.NODE_ENV === 'development') {
      NodeDebugger.startDOMMutationMonitoring();
    }

    // Initialize Service Worker for offline functionality and caching
    if (process.env.NODE_ENV === 'production' || window.location.search.includes('sw=true')) {
      const swRegistered = await serviceWorkerManager.register();
      if (swRegistered) {
        console.log('[Boot] Service Worker registered successfully');

        // Setup update notifications
        serviceWorkerManager.on('updateAvailable', () => {
          console.log('[Boot] Service Worker update available');
          // You could show a notification to the user here
        });

        serviceWorkerManager.on('offline', () => {
          console.log('[Boot] Application is offline');
          // You could show offline indicator here
        });

        serviceWorkerManager.on('online', () => {
          console.log('[Boot] Application is back online');
          // You could hide offline indicator here
        });
      }
    }

    // Initialize Web Worker for background processing
    if (webWorkerManager.isSupported) {
      console.log('[Boot] Web Worker Manager initialized');
    } else {
      console.warn('[Boot] Web Workers not supported, falling back to main thread processing');
    }

    // Initialize Progressive Loader for images and data
    console.log('[Boot] Progressive Loader initialized');

    // Initialize Async Component Timeout Manager
    console.log('[Boot] Async Component Timeout Manager initialized');
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
      console.error('[Performance] Unhandled promise rejection:', event.reason);
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
    console.log('[Boot] T3000 Advanced Cache initialized');

    // Preload critical T3000 data if available
    try {
      const cachedData = await t3000Cache.export();
      if (cachedData && Object.keys(cachedData.data).length > 0) {
        console.log('[Boot] Restored cached T3000 data:', Object.keys(cachedData.data).length, 'entries');
      }
    } catch (error) {
      console.warn('[Boot] Failed to restore cached data:', error);
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

    console.log('[Boot] T3000 Performance Optimizations initialized successfully');

  } catch (error) {
    console.error('[Boot] Failed to initialize performance optimizations:', error);
    // Don't fail the application startup if performance optimizations fail
  }
});
