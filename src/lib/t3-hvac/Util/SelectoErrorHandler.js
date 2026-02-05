/**
 * Selecto Error Handler
 * Safely handles Selecto component method calls to prevent runtime errors
 */

export class SelectoErrorHandler {
  /**
   * Safely call a method on a Selecto instance
   * @param {Object} selecto - The Selecto instance
   * @param {string} method - Method name to call
   * @param {...any} args - Arguments to pass to the method
   * @returns {any} The result of the method call, or undefined if failed
   */
  static safeCall(selecto, method, ...args) {
    if (!selecto || typeof selecto[method] !== 'function') {
      // console.warn(`[SelectoErrorHandler] Invalid selecto instance or method: ${method}`);
      return undefined;
    }

    try {
      return selecto[method](...args);
    } catch (error) {
      // Silently handle expected Selecto errors (gesto/unset issues)
      if (error.message?.includes('gesto') ||
          error.message?.includes("can't access property \"unset\"")) {
        // console.debug('[SelectoErrorHandler] Caught expected Selecto error:', error.message);
        return undefined;
      }

      // Re-throw unexpected errors
      console.error(`[SelectoErrorHandler] Unexpected error calling ${method}:`, error);
      throw error;
    }
  }

  /**
   * Safely destroy a Selecto instance
   * @param {Object} selecto - The Selecto instance to destroy
   */
  static universalDestroy(selecto) {
    if (!selecto) {
      return;
    }

    try {
      // Try calling destroy method if it exists
      if (typeof selecto.destroy === 'function') {
        selecto.destroy();
      }

      // Also try unset if available
      if (typeof selecto.unset === 'function') {
        selecto.unset();
      }
    } catch (error) {
      // Silently catch gesto errors during cleanup
      if (!error.message?.includes('gesto') &&
          !error.message?.includes("can't access property \"unset\"")) {
        console.error('[SelectoErrorHandler] Error during destroy:', error);
      }
    }
  }
}

export default SelectoErrorHandler;
