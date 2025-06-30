/**
 * Router Error Boundary
 * Handles navigation errors and component loading failures at the router level
 */

import { ErrorHandler } from '../lib/T3000/Hvac/Util/ErrorHandler';
import { asyncTimeoutManager } from '../lib/performance/AsyncComponentTimeoutManager.js';

export class RouterErrorBoundary {
  constructor(router) {
    this.router = router;
    this.errorHandler = ErrorHandler.getInstance();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    // Handle router errors
    this.router.onError((error) => {
      this.handleRouterError(error);
    });

    // Handle navigation guards errors
    this.router.beforeEach((to, from, next) => {
      try {
        // Clear any previous timeout errors when navigating
        console.log(`[Router] Navigating from ${from.path} to ${to.path}`);
        next();
      } catch (error) {
        this.handleNavigationError(error, to, from);
        next(false); // Cancel navigation
      }
    });

    // Handle failed navigation
    this.router.afterEach((to, from, failure) => {
      if (failure) {
        this.handleNavigationFailure(failure, to, from);
      }
    });
  }

  handleRouterError(error) {
    console.error('[Router] Router error:', error);

    this.errorHandler.handleError(
      error,
      {
        component: 'Router',
        function: 'navigation',
        userAction: 'Page navigation failed',
        asyncComponentError: this.isAsyncComponentError(error)
      },
      'HIGH'
    );

    // Attempt to navigate to a safe fallback
    this.navigateToFallback();
  }

  handleNavigationError(error, to, from) {
    console.error(`[Router] Navigation error from ${from.path} to ${to.path}:`, error);

    this.errorHandler.handleError(
      error,
      {
        component: 'Router',
        function: 'beforeEach',
        userAction: `Navigation from ${from.path} to ${to.path}`,
        parameters: [to.path, from.path]
      },
      'MEDIUM'
    );
  }

  handleNavigationFailure(failure, to, from) {
    console.error(`[Router] Navigation failed from ${from.path} to ${to.path}:`, failure);

    this.errorHandler.handleError(
      new Error(`Navigation failure: ${failure.type || 'Unknown'}`),
      {
        component: 'Router',
        function: 'afterEach',
        userAction: `Failed navigation from ${from.path} to ${to.path}`,
        parameters: [failure.type, failure.from, failure.to]
      },
      'MEDIUM'
    );

    // If it's a component loading failure, try to recover
    if (this.isComponentLoadingFailure(failure)) {
      this.handleComponentLoadingFailure(to);
    }
  }

  isAsyncComponentError(error) {
    return error.message.includes('Async component timed out') ||
           error.message.includes('Failed to fetch dynamically imported module') ||
           error.message.includes('Loading chunk') ||
           error.stack?.includes('defineAsyncComponent');
  }

  isComponentLoadingFailure(failure) {
    return failure.type === 'cancelled' ||
           failure.type === 'duplicated' ||
           this.isAsyncComponentError(failure);
  }

  async handleComponentLoadingFailure(to) {
    console.log(`[Router] Handling component loading failure for route: ${to.path}`);

    // Get timeout statistics to determine if there's a pattern
    const stats = asyncTimeoutManager.getTimeoutStats();

    if (stats.failedComponents > 3) {
      console.warn('[Router] Multiple component failures detected, showing global fallback');
      this.navigateToGlobalFallback();
    } else {
      // Try to navigate to the same route again with a delay
      setTimeout(() => {
        console.log(`[Router] Retrying navigation to ${to.path}`);
        this.router.push(to.path).catch((retryError) => {
          console.error('[Router] Retry navigation failed:', retryError);
          this.navigateToFallback();
        });
      }, 2000);
    }
  }

  navigateToFallback() {
    // Try to navigate to a safe fallback page
    const fallbackRoutes = ['/', '/new', '/error-fallback'];

    for (const route of fallbackRoutes) {
      try {
        this.router.push(route);
        console.log(`[Router] Navigated to fallback route: ${route}`);
        return;
      } catch (error) {
        console.error(`[Router] Failed to navigate to fallback ${route}:`, error);
        continue;
      }
    }

    // If all fallbacks fail, show a basic error page
    this.showBasicErrorPage();
  }

  navigateToGlobalFallback() {
    try {
      this.router.push('/error-fallback');
    } catch (error) {
      console.error('[Router] Failed to navigate to global fallback:', error);
      this.showBasicErrorPage();
    }
  }

  showBasicErrorPage() {
    // Last resort: replace the entire page content with a basic error message
    document.body.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #f8f9fa; font-family: Arial, sans-serif;">
        <div style="text-align: center; padding: 40px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <div style="font-size: 48px; color: #ffa726; margin-bottom: 20px;">⚠️</div>
          <h2 style="color: #424242; margin-bottom: 16px;">Application Error</h2>
          <p style="color: #666; margin-bottom: 24px;">We're experiencing technical difficulties.</p>
          <button onclick="window.location.reload()" style="background: #1976d2; color: white; border: none; padding: 12px 24px; border-radius: 4px; cursor: pointer; font-size: 16px;">
            Reload Page
          </button>
        </div>
      </div>
    `;
  }

  // Recovery methods
  clearComponentCache() {
    asyncTimeoutManager.clearAllTimeoutHistory();
    console.log('[Router] Cleared component timeout history');
  }

  getErrorStats() {
    return {
      componentTimeouts: asyncTimeoutManager.getTimeoutStats(),
      errorHistory: this.errorHandler.getErrorHistory()
    };
  }
}

// Factory function to create router error boundary
export const createRouterErrorBoundary = (router) => {
  return new RouterErrorBoundary(router);
};

export default RouterErrorBoundary;
