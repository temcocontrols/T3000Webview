/**
 * Component Lazy Loading Manager
 * Handles dynamic imports and component registration for better performance
 */

import { defineAsyncComponent, markRaw } from 'vue';
import { PerformanceMonitor } from './PerformanceMonitor.js';
import { ErrorHandler } from '../T3000/Hvac/Util/ErrorHandler';

export class ComponentLazyLoader {
  constructor() {
    this.componentCache = new Map();
    this.loadingComponents = new Map();
    this.failedComponents = new Set();
    this.monitor = new PerformanceMonitor();
    this.errorHandler = ErrorHandler.getInstance();
  }

  /**
   * Create a lazy-loaded component with caching
   * @param {Function} importFn - Dynamic import function
   * @param {Object} options - Loading options
   * @returns {Object} Async component definition
   */
  createLazyComponent(importFn, options = {}) {
    const {
      loadingComponent = null,
      errorComponent = null,
      delay = 200,
      timeout = 15000, // Increased from 3000 to 15000ms for better reliability
      retryDelay = 1000,
      maxRetries = 3,
      onError = null,
      onSuccess = null,
      componentName = 'Unknown'
    } = options;

    return defineAsyncComponent({
      loader: () => this.loadComponentWithRetry(
        importFn,
        maxRetries,
        retryDelay,
        onError,
        onSuccess,
        componentName,
        timeout
      ),
      loadingComponent,
      errorComponent: this.createEnhancedErrorComponent(errorComponent, componentName),
      delay,
      timeout,
      onError: (error, retry, fail, attempts) => {
        this.handleComponentError(error, {
          name: componentName,
          attempts,
          timeout,
          isTimeout: error.message.includes('timed out')
        });

        if (onError) {
          onError(error, retry, fail, attempts);
        } else {
          fail(); // Default behavior is to fail
        }
      }
    });
  }

  /**
   * Load component with retry mechanism
   * @param {Function} importFn - Import function
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} retryDelay - Delay between retries
   * @param {Function} onError - Error callback
   * @param {Function} onSuccess - Success callback
   * @param {string} componentName - Component name for debugging
   * @param {number} timeout - Component timeout
   * @returns {Promise} Component promise
   */
  async loadComponentWithRetry(importFn, maxRetries, retryDelay, onError, onSuccess, componentName, timeout) {
    const cacheKey = componentName || importFn.toString();

    // Return cached component if available
    if (this.componentCache.has(cacheKey)) {
      return this.componentCache.get(cacheKey);
    }

    // Return existing loading promise if component is already being loaded
    if (this.loadingComponents.has(cacheKey)) {
      return this.loadingComponents.get(cacheKey);
    }

    const loadPromise = this.attemptLoad(
      importFn,
      maxRetries,
      retryDelay,
      onError,
      onSuccess,
      cacheKey,
      componentName,
      timeout
    );
    this.loadingComponents.set(cacheKey, loadPromise);

    try {
      const component = await loadPromise;
      this.componentCache.set(cacheKey, component);
      this.loadingComponents.delete(cacheKey);
      if (onSuccess) onSuccess(component);
      return component;
    } catch (error) {
      this.loadingComponents.delete(cacheKey);
      this.failedComponents.add(cacheKey);

      // Enhanced error handling
      this.handleComponentError(error, {
        name: componentName,
        path: cacheKey,
        timeout,
        maxRetries,
        isTimeout: error.message.includes('timed out')
      });

      if (onError) onError(error);
      throw error;
    }
  }

  /**
   * Attempt to load component with retries
   * @param {Function} importFn - Import function
   * @param {number} maxRetries - Maximum retries
   * @param {number} retryDelay - Retry delay
   * @param {Function} onError - Error callback
   * @param {Function} onSuccess - Success callback
   * @param {string} cacheKey - Cache key
   * @param {string} componentName - Component name
   * @param {number} timeout - Component timeout
   * @returns {Promise} Component
   */
  async attemptLoad(importFn, maxRetries, retryDelay, onError, onSuccess, cacheKey, componentName, timeout) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = performance.now();

        // Create timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`Async component timed out after ${timeout}ms: ${componentName}`));
          }, timeout);
        });

        // Race between import and timeout
        const module = await Promise.race([
          importFn(),
          timeoutPromise
        ]);

        const loadTime = performance.now() - startTime;

        this.monitor.trackComponentLoadTime(cacheKey, loadTime);

        return markRaw(module.default || module);
      } catch (error) {
        lastError = error;

        // Log retry attempt
        this.errorHandler.handleError(
          error,
          {
            component: 'ComponentLazyLoader',
            function: 'attemptLoad',
            userAction: `Loading component attempt ${attempt + 1}/${maxRetries + 1}: ${componentName}`,
            asyncComponentError: true,
            componentInfo: {
              name: componentName,
              attempt: attempt + 1,
              maxRetries: maxRetries + 1,
              timeout
            }
          },
          attempt < maxRetries ? 'LOW' : 'HIGH'
        );

        if (attempt < maxRetries) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    throw lastError;
  }

  /**
   * Preload components for better UX
   * @param {Array} importFunctions - Array of import functions
   * @param {Object} options - Preload options
   * @returns {Promise} Preload results
   */
  async preloadComponents(importFunctions, options = {}) {
    const {
      priority = 'normal',
      maxConcurrent = 3,
      onProgress = null
    } = options;

    const results = [];
    let completed = 0;

    // Process in batches for better performance
    for (let i = 0; i < importFunctions.length; i += maxConcurrent) {
      const batch = importFunctions.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (importFn, index) => {
        try {
          const component = await this.createLazyComponent(importFn).loader();
          completed++;
          if (onProgress) onProgress(completed, importFunctions.length);
          return { success: true, component, index: i + index };
        } catch (error) {
          completed++;
          if (onProgress) onProgress(completed, importFunctions.length);
          return { success: false, error, index: i + index };
        }
      });

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults.map(result => result.value));
    }

    return results;
  }

  /**
   * Create route-based lazy components
   * @param {Object} routes - Route configuration
   * @returns {Object} Processed routes with lazy components
   */
  createLazyRoutes(routes) {
    const processRoute = (route) => {
      if (route.component && typeof route.component === 'function') {
        route.component = this.createLazyComponent(route.component, {
          loadingComponent: () => import('../../components/LoadingComponent.vue').catch(() => null),
          errorComponent: () => import('../../components/ErrorComponent.vue').catch(() => null)
        });
      }

      if (route.children) {
        route.children = route.children.map(processRoute);
      }

      return route;
    };

    return Array.isArray(routes) ? routes.map(processRoute) : processRoute(routes);
  }

  /**
   * Utility delay function
   * @param {number} ms - Delay in milliseconds
   * @returns {Promise} Delay promise
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear component cache
   * @param {string} pattern - Optional pattern to match cache keys
   */
  clearCache(pattern = null) {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.componentCache) {
        if (regex.test(key)) {
          this.componentCache.delete(key);
        }
      }
    } else {
      this.componentCache.clear();
    }
    this.failedComponents.clear();
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getCacheStats() {
    return {
      cached: this.componentCache.size,
      loading: this.loadingComponents.size,
      failed: this.failedComponents.size,
      total: this.componentCache.size + this.loadingComponents.size + this.failedComponents.size
    };
  }

  /**
   * Check if component is cached
   * @param {Function} importFn - Import function
   * @returns {boolean} Whether component is cached
   */
  isCached(importFn) {
    const cacheKey = importFn.toString();
    return this.componentCache.has(cacheKey);
  }

  /**
   * Check if component is currently loading
   * @param {Function} importFn - Import function
   * @returns {boolean} Whether component is loading
   */
  isLoading(importFn) {
    const cacheKey = importFn.toString();
    return this.loadingComponents.has(cacheKey);
  }

  /**
   * Handle component loading errors
   * @param {Error} error - Loading error
   * @param {Object} componentInfo - Component information
   */
  handleComponentError(error, componentInfo) {
    this.errorHandler.handleAsyncComponentError(
      error,
      componentInfo,
      {
        component: 'ComponentLazyLoader',
        function: 'loadComponent',
        userAction: `Loading component: ${componentInfo.name}`,
        asyncComponentError: true
      }
    );
  }

  /**
   * Create enhanced error component with retry functionality
   * @param {Object} fallbackComponent - Original error component
   * @param {string} componentName - Component name
   * @returns {Object} Enhanced error component
   */
  createEnhancedErrorComponent(fallbackComponent, componentName) {
    if (fallbackComponent) {
      return fallbackComponent;
    }

    // Create a simple error component with retry functionality
    return {
      template: `
        <div class="component-load-error">
          <div class="error-icon">⚠️</div>
          <div class="error-message">
            <h4>Failed to load component</h4>
            <p>Component: {{ componentName }}</p>
            <p class="error-details">{{ errorMessage }}</p>
            <button @click="retry" class="retry-button">Retry</button>
          </div>
        </div>
      `,
      props: {
        error: Object,
        retry: Function
      },
      data() {
        return {
          componentName: componentName || 'Unknown',
          errorMessage: this.error?.message || 'Unknown error'
        };
      },
      style: `
        .component-load-error {
          display: flex;
          align-items: center;
          padding: 16px;
          border: 1px solid #ff6b6b;
          border-radius: 4px;
          background-color: #ffe0e0;
          margin: 8px 0;
        }
        .error-icon {
          font-size: 24px;
          margin-right: 12px;
        }
        .error-message h4 {
          margin: 0 0 8px 0;
          color: #d32f2f;
        }
        .error-message p {
          margin: 4px 0;
          color: #666;
          font-size: 14px;
        }
        .error-details {
          font-family: monospace;
          background: #f5f5f5;
          padding: 4px 8px;
          border-radius: 2px;
          word-break: break-word;
        }
        .retry-button {
          margin-top: 8px;
          padding: 6px 12px;
          background: #2196f3;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .retry-button:hover {
          background: #1976d2;
        }
      `
    };
  }
}

// Global instance
export const componentLazyLoader = new ComponentLazyLoader();

// Vue composable for lazy loading
export function useLazyComponent(importFn, options = {}) {
  const component = componentLazyLoader.createLazyComponent(importFn, options);

  return {
    component,
    isCached: () => componentLazyLoader.isCached(importFn),
    isLoading: () => componentLazyLoader.isLoading(importFn),
    preload: () => componentLazyLoader.preloadComponents([importFn])
  };
}

export default ComponentLazyLoader;
