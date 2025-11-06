/**
 * Router Error Boundary
 * Handles navigation errors and component loading failures at the router level
 */

import LogUtil from '@common/T3000/Hvac/Util/LogUtil';
import { ErrorHandler } from '../lib/T3000/Hvac/Util/ErrorHandler';

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
        // LogUtil.Debug(`[Router] Navigating from ${from.path} to ${to.path}`);

        // Special handling when leaving pages that might have Selecto components
        if (from.path && (from.path.includes('hvac') || from.path.includes('drawer'))) {
          // LogUtil.Debug('[Router] Leaving page with potential Selecto components, allowing cleanup time');
          // Give a small delay to allow proper cleanup
          setTimeout(() => {
            next();
          }, 100);
        } else {
          next();
        }
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
    LogUtil.Error('[Router] Router error:', error);

    // Handle specific Selecto/Gesto errors (including stack trace matches)
    const errorMessage = error.message || '';
    const errorStack = error.stack || '';

    if (errorMessage.includes('gesto') ||
        errorMessage.includes('selecto') ||
        errorMessage.includes('can\'t access property "unset"') ||
        errorStack.includes('SelectoManager') ||
        errorStack.includes('Selecto.vue') ||
        errorStack.includes('gesto')) {
      // LogUtil.Debug('[Router] Selecto/Gesto related error detected during navigation (safely ignored):', errorMessage);
      // Don't treat this as a critical error - just log and continue
      return;
    }

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
    LogUtil.Error(`[Router] Navigation error from ${from.path} to ${to.path}:`, error);

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
    LogUtil.Error(`[Router] Navigation failed from ${from.path} to ${to.path}:`, failure);

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
    // LogUtil.Debug(`[Router] Handling component loading failure for route: ${to.path}`);

    // Try to navigate to the same route again with a delay
    setTimeout(() => {
      // LogUtil.Debug(`[Router] Retrying navigation to ${to.path}`);
      this.router.push(to.path).catch((retryError) => {
        LogUtil.Error('[Router] Retry navigation failed:', retryError);
        this.navigateToFallback();
      });
    }, 2000);
  }

  navigateToFallback() {
    // Try to navigate to a safe fallback page
    const fallbackRoutes = ['/', '/new', '/error-fallback'];

    for (const route of fallbackRoutes) {
      try {
        this.router.push(route);
        // LogUtil.Debug(`[Router] Navigated to fallback route: ${route}`);
        return;
      } catch (error) {
        LogUtil.Error(`[Router] Failed to navigate to fallback ${route}:`, error);
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
      LogUtil.Error('[Router] Failed to navigate to global fallback:', error);
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
    // Component cache cleared (performance monitoring removed)
    // LogUtil.Debug('[Router] Cleared component timeout history');
  }

  getErrorStats() {
    return {
      errorHistory: this.errorHandler.getErrorHistory()
    };
  }
}

// Factory function to create router error boundary
export const createRouterErrorBoundary = (router) => {
  return new RouterErrorBoundary(router);
};

export default RouterErrorBoundary;
