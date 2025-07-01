/**
 * Selecto Component Error Handler
 * Provides utilities to safely handle selecto component lifecycle and prevent
 * "this.$_selecto is undefined" errors during component cleanup
 */

export class SelectoErrorHandler {
  /**
   * Safely destroy a selecto component instance
   * @param {Object} selectoRef - Vue ref to the selecto component
   * @returns {boolean} - True if cleanup was successful, false if there were issues
   */
  static safeDestroy(selectoRef) {
    try {
      if (!selectoRef || !selectoRef.value) {
        console.warn('[SelectoErrorHandler] Selecto ref is null or undefined');
        return false;
      }

      const selectoInstance = selectoRef.value;

      // Check if the selecto instance has a destroy method
      if (typeof selectoInstance.destroy === 'function') {
        selectoInstance.destroy();
        console.log('[SelectoErrorHandler] Selecto instance destroyed successfully');
        return true;
      }

      // Check if it has an internal $_selecto property that needs cleanup
      if (selectoInstance.$_selecto) {
        if (typeof selectoInstance.$_selecto.destroy === 'function') {
          selectoInstance.$_selecto.destroy();
          console.log('[SelectoErrorHandler] Internal $_selecto destroyed successfully');
          return true;
        }
      }

      // If no destroy method found, log a warning but don't throw
      console.warn('[SelectoErrorHandler] No destroy method found on selecto instance');
      return false;

    } catch (error) {
      console.warn('[SelectoErrorHandler] Error during selecto cleanup (non-critical):', error.message);
      return false;
    }
  }

  /**
   * Check if a selecto component is properly initialized
   * @param {Object} selectoRef - Vue ref to the selecto component
   * @returns {boolean} - True if properly initialized
   */
  static isInitialized(selectoRef) {
    try {
      return !!(
        selectoRef &&
        selectoRef.value &&
        (selectoRef.value.$_selecto || typeof selectoRef.value.destroy === 'function')
      );
    } catch (error) {
      console.warn('[SelectoErrorHandler] Error checking selecto initialization:', error.message);
      return false;
    }
  }

  /**
   * Safe wrapper for selecto method calls
   * @param {Object} selectoRef - Vue ref to the selecto component
   * @param {string} methodName - Name of the method to call
   * @param {Array} args - Arguments to pass to the method
   * @returns {any} - Method result or null if failed
   */
  static safeCall(selectoRef, methodName, ...args) {
    try {
      if (!this.isInitialized(selectoRef)) {
        console.warn(`[SelectoErrorHandler] Cannot call ${methodName}: selecto not initialized`);
        return null;
      }

      const selectoInstance = selectoRef.value;

      if (typeof selectoInstance[methodName] === 'function') {
        return selectoInstance[methodName](...args);
      }

      console.warn(`[SelectoErrorHandler] Method ${methodName} not found on selecto instance`);
      return null;

    } catch (error) {
      console.warn(`[SelectoErrorHandler] Error calling ${methodName}:`, error.message);
      return null;
    }
  }

  /**
   * Add error handling to selecto component events
   * @param {Object} selectoRef - Vue ref to the selecto component
   */
  static addErrorHandling(selectoRef) {
    try {
      if (!this.isInitialized(selectoRef)) {
        console.warn('[SelectoErrorHandler] Cannot add error handling: selecto not initialized');
        return;
      }

      const selectoInstance = selectoRef.value;

      // Wrap critical methods with error handling
      const originalMethods = ['clickTarget', 'setSelectedTargets'];

      originalMethods.forEach(methodName => {
        if (typeof selectoInstance[methodName] === 'function') {
          const originalMethod = selectoInstance[methodName];
          selectoInstance[methodName] = (...args) => {
            try {
              return originalMethod.apply(selectoInstance, args);
            } catch (error) {
              console.warn(`[SelectoErrorHandler] Error in ${methodName}:`, error.message);
              return null;
            }
          };
        }
      });

    } catch (error) {
      console.warn('[SelectoErrorHandler] Error adding error handling:', error.message);
    }
  }
}

export default SelectoErrorHandler;
