/**
 * Async Component Timeout Manager
 * Provides specialized handling for Vue async component timeout errors
 */

import { ErrorHandler } from '../T3000/Hvac/Util/ErrorHandler';
import { componentLazyLoader } from './ComponentLazyLoader.js';

export class AsyncComponentTimeoutManager {
  constructor() {
    this.errorHandler = ErrorHandler.getInstance();
    this.timeoutThresholds = {
      fast: 5000,      // Fast components (simple ones)
      normal: 15000,   // Normal components
      slow: 30000,     // Slow components (heavy/complex)
      critical: 60000  // Critical components (essential for app)
    };
    this.retryStrategies = new Map();

    // Known heavy components with specific timeouts
    this.componentTimeouts = {
      'IndexPage2': 30000,        // Contains pathseg.js and other heavy dependencies
      'HvacIndexPage2': 30000,
      'SVGEditor': 25000,
      'MainLayout': 20000,
      'HvacIndexPage': 20000,
      'ObjectConfig': 20000,
      'ObjectConfigNew': 20000
    };

    this.monitorChunkLoading();
  }

  /**
   * Create enhanced async component with timeout handling
   * @param {Function} importFn - Dynamic import function
   * @param {Object} options - Component options
   * @returns {Object} Enhanced async component
   */
  createTimeoutAwareComponent(importFn, options = {}) {
    const {
      name = 'UnknownComponent',
      category = 'normal',
      maxRetries = 3,
      fallbackComponent = null,
      onTimeout = null,
      onSuccess = null,
      onError = null
    } = options;

    const timeout = this.getTimeoutForComponent(name, category);

    return componentLazyLoader.createLazyComponent(importFn, {
      ...options,
      componentName: name,
      timeout,
      maxRetries,
      onError: (error, retry, fail, attempts) => {
        this.handleTimeout(error, {
          name,
          category,
          timeout,
          attempts,
          retry,
          fail,
          onTimeout,
          onError
        });
      },
      onSuccess: (component) => {
        this.handleSuccess(component, { name, category });
        if (onSuccess) onSuccess(component);
      },
      errorComponent: this.createTimeoutErrorComponent(name, category, fallbackComponent)
    });
  }

  /**
   * Handle component timeout
   * @param {Error} error - Timeout error
   * @param {Object} context - Timeout context
   */
  handleTimeout(error, context) {
    const isTimeout = error.message.includes('timed out');

    if (isTimeout) {
      console.warn(`[AsyncTimeout] Component '${context.name}' timed out after ${context.timeout}ms`);

      // Register retry strategy
      this.registerRetryStrategy(context.name, {
        lastAttempt: Date.now(),
        failures: (this.retryStrategies.get(context.name)?.failures || 0) + 1,
        category: context.category
      });

      // Determine retry strategy
      const shouldRetry = this.shouldRetryComponent(context.name, context.attempts);

      if (shouldRetry && context.retry) {
        console.log(`[AsyncTimeout] Retrying component '${context.name}' (attempt ${context.attempts})`);
        setTimeout(() => {
          context.retry();
        }, this.calculateRetryDelay(context.name));
      } else {
        console.error(`[AsyncTimeout] Giving up on component '${context.name}' after ${context.attempts} attempts`);

        // Handle custom timeout callback
        if (context.onTimeout) {
          context.onTimeout(error, context);
        }

        // Log the timeout error
        this.errorHandler.handleAsyncComponentError(
          error,
          {
            name: context.name,
            category: context.category,
            timeout: context.timeout,
            attempts: context.attempts,
            finalFailure: true
          },
          {
            component: 'AsyncComponentTimeoutManager',
            function: 'handleTimeout',
            userAction: `Loading component: ${context.name}`,
            asyncComponentError: true
          }
        );

        context.fail();
      }
    } else {
      // Handle non-timeout errors
      if (context.onError) {
        context.onError(error, context.retry, context.fail, context.attempts);
      } else {
        context.fail();
      }
    }
  }

  /**
   * Handle successful component load
   * @param {Object} component - Loaded component
   * @param {Object} context - Load context
   */
  handleSuccess(component, context) {
    // Clear retry strategy on success
    this.retryStrategies.delete(context.name);
    console.log(`[AsyncTimeout] Component '${context.name}' loaded successfully`);
  }

  /**
   * Determine if component should be retried
   * @param {string} componentName - Component name
   * @param {number} currentAttempts - Current attempt count
   * @returns {boolean} Whether to retry
   */
  shouldRetryComponent(componentName, currentAttempts) {
    const strategy = this.retryStrategies.get(componentName);
    if (!strategy) return true;

    // Don't retry if too many recent failures
    if (strategy.failures > 5) {
      return false;
    }

    // Don't retry if last attempt was very recent (< 30 seconds)
    const timeSinceLastAttempt = Date.now() - strategy.lastAttempt;
    if (timeSinceLastAttempt < 30000) {
      return false;
    }

    return currentAttempts < 3;
  }

  /**
   * Calculate retry delay based on failure history
   * @param {string} componentName - Component name
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(componentName) {
    const strategy = this.retryStrategies.get(componentName);
    if (!strategy) return 1000;

    // Exponential backoff based on failure count
    return Math.min(1000 * Math.pow(2, strategy.failures), 10000);
  }

  /**
   * Register retry strategy for component
   * @param {string} componentName - Component name
   * @param {Object} strategy - Retry strategy
   */
  registerRetryStrategy(componentName, strategy) {
    this.retryStrategies.set(componentName, strategy);
  }

  /**
   * Create timeout-specific error component
   * @param {string} componentName - Component name
   * @param {string} category - Component category
   * @param {Object} fallbackComponent - Fallback component
   * @returns {Object} Error component
   */
  createTimeoutErrorComponent(componentName, category, fallbackComponent) {
    if (fallbackComponent) {
      return fallbackComponent;
    }

    return {
      template: `
        <div class="async-timeout-error">
          <div class="timeout-icon">⏱️</div>
          <div class="timeout-content">
            <h4>Component Loading Timeout</h4>
            <p><strong>Component:</strong> {{ componentName }}</p>
            <p><strong>Category:</strong> {{ category }}</p>
            <p><strong>Timeout:</strong> {{ timeoutDuration }}ms</p>
            <div class="timeout-actions">
              <button @click="retry" class="retry-btn" :disabled="retryDisabled">
                {{ retryText }}
              </button>
              <button @click="dismiss" class="dismiss-btn">
                Continue without this component
              </button>
            </div>
            <div class="timeout-suggestions">
              <p><em>Suggestions:</em></p>
              <ul>
                <li>Check your internet connection</li>
                <li>Try refreshing the page</li>
                <li v-if="category === 'slow'">This is a large component - please be patient</li>
              </ul>
            </div>
          </div>
        </div>
      `,
      props: {
        error: Object,
        retry: Function
      },
      data() {
        return {
          componentName,
          category,
          timeoutDuration: this.getTimeoutForCategory(category),
          retryDisabled: false,
          retryText: 'Retry Loading'
        };
      },
      methods: {
        retry() {
          this.retryDisabled = true;
          this.retryText = 'Retrying...';

          if (this.retry) {
            this.retry();
          }

          // Re-enable retry button after delay
          setTimeout(() => {
            this.retryDisabled = false;
            this.retryText = 'Retry Loading';
          }, 3000);
        },
        dismiss() {
          this.$emit('dismiss');
          // Could hide the error component or show a placeholder
        },
        getTimeoutForCategory(cat) {
          const timeouts = {
            fast: 5000,
            normal: 15000,
            slow: 30000,
            critical: 60000
          };
          return timeouts[cat] || 15000;
        }
      },
      style: `
        .async-timeout-error {
          display: flex;
          align-items: flex-start;
          padding: 20px;
          border: 2px solid #ff9800;
          border-radius: 8px;
          background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
          margin: 16px 0;
          box-shadow: 0 2px 8px rgba(255, 152, 0, 0.2);
        }
        .timeout-icon {
          font-size: 32px;
          margin-right: 16px;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .timeout-content h4 {
          margin: 0 0 12px 0;
          color: #e65100;
          font-size: 18px;
        }
        .timeout-content p {
          margin: 6px 0;
          color: #5d4037;
        }
        .timeout-actions {
          margin: 16px 0;
          display: flex;
          gap: 12px;
        }
        .retry-btn, .dismiss-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .retry-btn {
          background: #ff9800;
          color: white;
        }
        .retry-btn:hover:not(:disabled) {
          background: #f57c00;
        }
        .retry-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }
        .dismiss-btn {
          background: #e0e0e0;
          color: #424242;
        }
        .dismiss-btn:hover {
          background: #d0d0d0;
        }
        .timeout-suggestions {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 4px;
        }
        .timeout-suggestions p {
          margin: 0 0 8px 0;
          font-weight: 500;
        }
        .timeout-suggestions ul {
          margin: 8px 0 0 0;
          padding-left: 20px;
        }
        .timeout-suggestions li {
          margin: 4px 0;
          color: #5d4037;
        }
      `
    };
  }

  /**
   * Enhanced component loader with performance monitoring
   */
  monitorChunkLoading() {
    // Monitor performance of chunk loading
    const originalFetch = window.fetch;
    window.fetch = async function(...args) {
      const [resource] = args;
      const isChunk = typeof resource === 'string' &&
                     (resource.includes('.js') || resource.includes('.css'));

      if (isChunk) {
        const startTime = performance.now();
        const chunkName = resource.split('/').pop() || 'unknown';

        console.log(`[Performance Monitor] Loading chunk: ${chunkName}`);

        try {
          const response = await originalFetch.apply(this, args);
          const loadTime = performance.now() - startTime;

          console.log(`[Performance Monitor] Chunk Load: ${JSON.stringify({
            name: chunkName,
            size: response.headers.get('content-length') || 'unknown',
            time: Math.round(loadTime)
          })}`);

          return response;
        } catch (error) {
          const loadTime = performance.now() - startTime;
          console.error(`[Performance Monitor] Chunk Load Failed: ${chunkName} after ${Math.round(loadTime)}ms`, error);
          throw error;
        }
      }

      return originalFetch.apply(this, args);
    };
  }

  /**
   * Get timeout statistics
   * @returns {Object} Timeout statistics
   */
  getTimeoutStats() {
    const stats = {
      totalComponents: this.retryStrategies.size,
      failedComponents: 0,
      retryingComponents: 0,
      avgFailures: 0
    };

    let totalFailures = 0;
    this.retryStrategies.forEach((strategy) => {
      totalFailures += strategy.failures;
      if (strategy.failures > 3) {
        stats.failedComponents++;
      } else {
        stats.retryingComponents++;
      }
    });

    if (stats.totalComponents > 0) {
      stats.avgFailures = totalFailures / stats.totalComponents;
    }

    return stats;
  }

  /**
   * Clear timeout history for component
   * @param {string} componentName - Component name
   */
  clearTimeoutHistory(componentName) {
    this.retryStrategies.delete(componentName);
  }

  /**
   * Clear all timeout history
   */
  clearAllTimeoutHistory() {
    this.retryStrategies.clear();
  }

  /**
   * Get appropriate timeout for a specific component
   * @param {string} name - Component name
   * @param {string} category - Component category
   * @returns {number} Timeout in milliseconds
   */
  getTimeoutForComponent(name, category = 'normal') {
    // Check for specific component timeouts first
    if (this.componentTimeouts[name]) {
      return this.componentTimeouts[name];
    }

    // Check if component name contains known heavy patterns
    const heavyPatterns = ['SVG', 'Editor', 'Canvas', 'Chart', 'Graph', 'Index'];
    if (heavyPatterns.some(pattern => name.includes(pattern))) {
      return this.timeoutThresholds.slow;
    }

    // Fall back to category-based timeout
    return this.timeoutThresholds[category] || this.timeoutThresholds.normal;
  }
}

// Global instance
export const asyncTimeoutManager = new AsyncComponentTimeoutManager();

// Vue composable for timeout-aware components
export function useTimeoutAwareComponent(importFn, options = {}) {
  const component = asyncTimeoutManager.createTimeoutAwareComponent(importFn, options);

  return {
    component,
    clearHistory: () => asyncTimeoutManager.clearTimeoutHistory(options.name),
    getStats: () => asyncTimeoutManager.getTimeoutStats()
  };
}

export default AsyncComponentTimeoutManager;
