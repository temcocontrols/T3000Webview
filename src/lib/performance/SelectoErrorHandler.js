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
   * Enhanced safe destroy that handles the specific "$_selecto is undefined" error
   * @param {Object} selectoRef - Vue ref to the selecto component
   * @returns {boolean} - True if cleanup was successful
   */
  static safeDestroyWithSelectoFix(selectoRef) {
    try {
      if (!selectoRef || !selectoRef.value) {
        console.warn('[SelectoErrorHandler] Selecto ref is null or undefined');
        return false;
      }

      const selectoInstance = selectoRef.value;

      // Specific check for $_selecto property being undefined
      if (selectoInstance.$_selecto === undefined || selectoInstance.$_selecto === null) {
        console.warn('[SelectoErrorHandler] $_selecto is undefined/null, component may not be initialized or already destroyed');
        return false;
      }

      // Check for gesto property specifically to avoid "gesto is null" error
      if (selectoInstance.$_selecto.gesto === null || selectoInstance.$_selecto.gesto === undefined) {
        console.warn('[SelectoErrorHandler] Gesto is null/undefined, skipping destroy');
        return false;
      }

      // Try to destroy using the $_selecto property first
      if (typeof selectoInstance.$_selecto.destroy === 'function') {
        selectoInstance.$_selecto.destroy();
        console.log('[SelectoErrorHandler] $_selecto destroyed successfully');
        return true;
      }

      // Fallback to direct destroy method
      if (typeof selectoInstance.destroy === 'function') {
        selectoInstance.destroy();
        console.log('[SelectoErrorHandler] Selecto instance destroyed successfully');
        return true;
      }

      console.warn('[SelectoErrorHandler] No destroy method found on selecto instance');
      return false;

    } catch (error) {
      // Specifically handle the "$_selecto is undefined" error
      if (error.message && error.message.includes('$_selecto')) {
        console.warn('[SelectoErrorHandler] $_selecto undefined error during cleanup (safely ignored):', error.message);
        return false;
      }

      // Specifically handle the "gesto is null" error
      if (error.message && error.message.includes('gesto')) {
        console.warn('[SelectoErrorHandler] Gesto-related error during cleanup (safely ignored):', error.message);
        return false;
      }

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
      if (!selectoRef || !selectoRef.value) {
        return false;
      }

      const selectoInstance = selectoRef.value;

      // Check if $_selecto exists and is properly initialized
      if (selectoInstance.$_selecto !== undefined && selectoInstance.$_selecto !== null) {
        return true;
      }

      // Fallback check for direct destroy method
      if (typeof selectoInstance.destroy === 'function') {
        return true;
      }

      return false;
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
      if (!selectoRef || !selectoRef.value) {
        console.warn(`[SelectoErrorHandler] Cannot call ${methodName}: selecto ref is null/undefined`);
        return null;
      }

      const selectoInstance = selectoRef.value;

      // Check if $_selecto is undefined before accessing it
      if (selectoInstance.$_selecto === undefined || selectoInstance.$_selecto === null) {
        console.warn(`[SelectoErrorHandler] Cannot call ${methodName}: $_selecto is undefined/null`);
        return null;
      }

      // Try to call method on $_selecto first
      if (selectoInstance.$_selecto && typeof selectoInstance.$_selecto[methodName] === 'function') {
        return selectoInstance.$_selecto[methodName](...args);
      }

      // Fallback to direct method call
      if (typeof selectoInstance[methodName] === 'function') {
        return selectoInstance[methodName](...args);
      }

      console.warn(`[SelectoErrorHandler] Method ${methodName} not found on selecto instance`);
      return null;

    } catch (error) {
      // Handle specific $_selecto undefined errors
      if (error.message && error.message.includes('$_selecto')) {
        console.warn(`[SelectoErrorHandler] $_selecto undefined error calling ${methodName} (safely ignored):`, error.message);
        return null;
      }

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

  /**
   * Universal destroy method that handles all known selecto destruction issues
   * This is the recommended method to use for component cleanup
   * @param {Object} selectoRef - Vue ref to the selecto component
   * @returns {boolean} - True if cleanup was successful
   */
  static universalDestroy(selectoRef) {
    console.log('[SelectoErrorHandler] Attempting universal selecto cleanup...');

    // Try multiple destruction strategies
    const strategies = [
      () => this.safeDestroyWithSelectoFix(selectoRef),
      () => this.safeDestroyWithGestoFix(selectoRef),
      () => this.safeDestroy(selectoRef)
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        const success = strategies[i]();
        if (success) {
          console.log(`[SelectoErrorHandler] Universal cleanup successful with strategy ${i + 1}`);
          return true;
        }
      } catch (error) {
        console.warn(`[SelectoErrorHandler] Strategy ${i + 1} failed:`, error.message);
      }
    }

    // If all strategies fail, at least clear the ref
    try {
      if (selectoRef && selectoRef.value) {
        selectoRef.value = null;
        console.log('[SelectoErrorHandler] Cleared selecto ref as fallback');
      }
    } catch (error) {
      console.warn('[SelectoErrorHandler] Failed to clear selecto ref:', error.message);
    }

    console.warn('[SelectoErrorHandler] All cleanup strategies failed, but errors are suppressed');
    return false;
  }
}

export default SelectoErrorHandler;
