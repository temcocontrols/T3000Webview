/**
 * Debug Utilities for T3000 Node Issues
 * Helps identify and debug "node is undefined" errors
 */

import { ErrorHandler } from '../T3000/Hvac/Util/ErrorHandler';

export class NodeDebugger {
  static logContext = [];
  static isEnabled = process.env.NODE_ENV === 'development';

  /**
   * Safe DOM query with debugging
   */
  static safeQuery(selector, context = document) {
    if (!NodeDebugger.isEnabled) {
      return context.querySelector(selector);
    }

    try {
      const element = context.querySelector(selector);

      if (!element) {
        console.warn(`[Node Debugger] Element not found: ${selector}`, {
          context: context.nodeName || 'Document',
          contextConnected: context.isConnected,
          selector,
          timestamp: new Date().toISOString()
        });
      }

      return element;
    } catch (error) {
      ErrorHandler.getInstance().handleError(
        error,
        {
          component: 'NodeDebugger',
          function: 'safeQuery',
          userAction: `Querying selector: ${selector}`
        }
      );
      return null;
    }
  }

  /**
   * Safe DOM query all with debugging
   */
  static safeQueryAll(selector, context = document) {
    if (!NodeDebugger.isEnabled) {
      return context.querySelectorAll(selector);
    }

    try {
      const elements = context.querySelectorAll(selector);

      if (elements.length === 0) {
        console.warn(`[Node Debugger] No elements found: ${selector}`, {
          context: context.nodeName || 'Document',
          contextConnected: context.isConnected,
          selector,
          timestamp: new Date().toISOString()
        });
      }

      return elements;
    } catch (error) {
      ErrorHandler.getInstance().handleError(
        error,
        {
          component: 'NodeDebugger',
          function: 'safeQueryAll',
          userAction: `Querying selector: ${selector}`
        }
      );
      return [];
    }
  }

  /**
   * Safe element property access
   */
  static safeAccess(element, property, fallback = null) {
    if (!element) {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Element is ${element}, cannot access property: ${property}`);
      }
      return fallback;
    }

    try {
      return element[property];
    } catch (error) {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Error accessing property ${property}:`, error);
      }
      return fallback;
    }
  }

  /**
   * Safe event listener addition
   */
  static safeAddEventListener(element, event, handler, options) {
    if (!element || typeof element.addEventListener !== 'function') {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Cannot add event listener to invalid element:`, element);
      }
      return false;
    }

    try {
      element.addEventListener(event, handler, options);
      return true;
    } catch (error) {
      ErrorHandler.getInstance().handleError(
        error,
        {
          component: 'NodeDebugger',
          function: 'safeAddEventListener',
          userAction: `Adding ${event} listener`
        }
      );
      return false;
    }
  }

  /**
   * Safe element style modification
   */
  static safeSetStyle(element, property, value) {
    if (!element || !element.style) {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Cannot set style on invalid element:`, element);
      }
      return false;
    }

    try {
      element.style[property] = value;
      return true;
    } catch (error) {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Error setting style ${property}:`, error);
      }
      return false;
    }
  }

  /**
   * Validate Vue ref
   */
  static validateRef(ref, refName = 'ref') {
    if (!ref || !ref.value) {
      if (NodeDebugger.isEnabled) {
        console.warn(`[Node Debugger] Vue ref '${refName}' is not available:`, ref);
      }
      return false;
    }
    return true;
  }

  /**
   * Wait for element to be available
   */
  static async waitForElement(selector, timeout = 5000, context = document) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const checkElement = () => {
        const element = NodeDebugger.safeQuery(selector, context);

        if (element) {
          resolve(element);
          return;
        }

        if (Date.now() - startTime > timeout) {
          const error = new Error(`Element not found within timeout: ${selector}`);
          ErrorHandler.getInstance().handleError(
            error,
            {
              component: 'NodeDebugger',
              function: 'waitForElement',
              userAction: `Waiting for: ${selector}`
            }
          );
          reject(error);
          return;
        }

        setTimeout(checkElement, 100);
      };

      checkElement();
    });
  }

  /**
   * Log call stack for debugging
   */
  static logCallStack(label = 'Call Stack') {
    if (!NodeDebugger.isEnabled) return;

    const stack = new Error().stack;
    console.log(`[Node Debugger] ${label}:`, stack);
  }

  /**
   * Monitor DOM mutations
   */
  static startDOMMutationMonitoring() {
    if (!NodeDebugger.isEnabled || typeof MutationObserver === 'undefined') {
      return null;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              console.log('[Node Debugger] Element added:', node);
            }
          });

          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              console.log('[Node Debugger] Element removed:', node);
            }
          });
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    console.log('[Node Debugger] DOM mutation monitoring started');
    return observer;
  }
}

// Create Vue composable
export function useNodeDebugger() {
  return {
    safeQuery: NodeDebugger.safeQuery,
    safeQueryAll: NodeDebugger.safeQueryAll,
    safeAccess: NodeDebugger.safeAccess,
    safeAddEventListener: NodeDebugger.safeAddEventListener,
    safeSetStyle: NodeDebugger.safeSetStyle,
    validateRef: NodeDebugger.validateRef,
    waitForElement: NodeDebugger.waitForElement,
    logCallStack: NodeDebugger.logCallStack
  };
}

export default NodeDebugger;
