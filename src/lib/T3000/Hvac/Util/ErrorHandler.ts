import LogUtil from './LogUtil';

interface ErrorContext {
  component: string;
  function: string;
  parameters?: any[];
  userAction?: string;
  nodeRelated?: boolean;
  nodeInfo?: any;
  asyncComponentError?: boolean;
  componentInfo?: any;
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  timestamp: number;
  stackTrace?: string;
  userAgent?: string;
}

/**
 * Global error handler for the T3000 application
 * Provides consistent error handling, logging, and user notification
 */
class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize: number = 50;
  private listeners: Set<(report: ErrorReport) => void> = new Set();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle an error with context and severity
   */
  handleError(error: Error, context: ErrorContext, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const report: ErrorReport = {
      error,
      context,
      severity,
      timestamp: Date.now(),
      stackTrace: error.stack,
      userAgent: navigator.userAgent
    };

    this.addToQueue(report);
    this.notifyListeners(report);
    this.logError(report);

    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(report);
    }
  }

  private addToQueue(report: ErrorReport): void {
    this.errorQueue.push(report);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private notifyListeners(report: ErrorReport): void {
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error handler listener:', error);
      }
    });
  }

  private logError(report: ErrorReport): void {
    const logMessage = `[${report.severity.toUpperCase()}] ${report.context.component}.${report.context.function}: ${report.error.message}`;

    switch (report.severity) {
      case ErrorSeverity.LOW:
        LogUtil.Info(logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        LogUtil.Warn(logMessage);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        LogUtil.Error(logMessage, report.error);
        break;
    }
  }

  private handleCriticalError(report: ErrorReport): void {
    // For now, just log critical errors. In the future, this could show user notifications
    LogUtil.Error('CRITICAL ERROR DETECTED:', report.error);
    console.error('Critical error context:', report.context);
  }

  /**
   * Subscribe to error events
   */
  subscribe(listener: (report: ErrorReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Get error history
   */
  getErrorHistory(): ErrorReport[] {
    return [...this.errorQueue];
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorQueue = [];
  }

  /**
   * Initialize global error handling
   */
  static initializeGlobalHandling(): void {
    const instance = ErrorHandler.getInstance();    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason));

      // Check if this is a Selecto/Gesto error (safe to ignore)
      const isSelectoError = error.message.includes('gesto') ||
                            error.message.includes('selecto') ||
                            error.message.includes('can\'t access property "unset"') ||
                            error.stack?.includes('SelectoManager') ||
                            error.stack?.includes('Selecto.vue') ||
                            error.stack?.includes('gesto');

      if (isSelectoError) {
        LogUtil.Debug('[ErrorHandler] Selecto/Gesto error detected and ignored:', error.message);
        event.preventDefault();
        return;
      }

      // Check if this is a node-related error
      const isNodeError = error.message.includes('node is undefined') ||
                         error.message.includes('node is null') ||
                         error.message.includes('Cannot read propert') ||
                         error.stack?.includes('.node.') ||
                         error.stack?.includes('getBBox') ||
                         error.stack?.includes('getBoundingClientRect');

      // Check if this is an async component timeout error
      const isAsyncComponentError = error.message.includes('Async component timed out') ||
                                   error.message.includes('component timed out') ||
                                   error.message.includes('timeout') ||
                                   error.stack?.includes('defineAsyncComponent') ||
                                   error.stack?.includes('ComponentLazyLoader');

      let severity = ErrorSeverity.MEDIUM;
      if (isNodeError || isAsyncComponentError) {
        severity = ErrorSeverity.HIGH;
      }

      instance.handleError(
        error,
        {
          component: 'Global',
          function: 'unhandledrejection',
          userAction: 'Promise rejection not caught',
          nodeRelated: isNodeError,
          asyncComponentError: isAsyncComponentError
        },
        severity
      );

      // Log additional details for debugging
      LogUtil.Error('Unhandled Promise Rejection Details:', {
        reason: event.reason,
        promise: event.promise,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        isNodeError,
        isAsyncComponentError,
        errorMessage: error.message
      });

      // Prevent the default browser behavior (console error)
      event.preventDefault();
    });

    // Handle global errors
    window.addEventListener('error', (event) => {
      const error = event.error || new Error(event.message);

      // Check if this is a Selecto/Gesto error (safe to ignore)
      const isSelectoError = error.message.includes('gesto') ||
                            error.message.includes('selecto') ||
                            error.message.includes('can\'t access property "unset"') ||
                            error.stack?.includes('SelectoManager') ||
                            error.stack?.includes('Selecto.vue') ||
                            error.stack?.includes('gesto');

      if (isSelectoError) {
        LogUtil.Debug('[ErrorHandler] Selecto/Gesto error detected and ignored:', error.message);
        event.preventDefault();
        return;
      }

      instance.handleError(
        error,
        {
          component: 'Global',
          function: 'globalError',
          userAction: `Error in ${event.filename}:${event.lineno}:${event.colno}`,
        },
        ErrorSeverity.HIGH
      );
    });

    LogUtil.Debug('Global error handling initialized');
  }

  /**
   * Handle DOM/node related errors with enhanced debugging
   */
  handleNodeError(error: Error, nodeInfo: any, context: ErrorContext): void {
    const enhancedContext = {
      ...context,
      nodeInfo: {
        nodeType: nodeInfo?.nodeType,
        nodeName: nodeInfo?.nodeName,
        id: nodeInfo?.id,
        className: nodeInfo?.className,
        isConnected: nodeInfo?.isConnected,
        parentNode: nodeInfo?.parentNode?.nodeName,
        exists: !!nodeInfo
      }
    };

    LogUtil.Error('Node-related error details:', enhancedContext);

    this.handleError(error, enhancedContext, ErrorSeverity.HIGH);
  }

  /**
   * Handle async component timeout errors with enhanced debugging
   */
  handleAsyncComponentError(error: Error, componentInfo: any, context: ErrorContext): void {
    const enhancedContext = {
      ...context,
      componentInfo: {
        name: componentInfo?.name || 'Unknown',
        path: componentInfo?.path || 'Unknown',
        timeout: componentInfo?.timeout || 'Unknown',
        retryCount: componentInfo?.retryCount || 0,
        loadTime: componentInfo?.loadTime || 0,
        isTimeout: error.message.includes('timed out'),
        isAsyncComponent: true
      }
    };

    LogUtil.Error('Async component error details:', enhancedContext);

    this.handleError(error, enhancedContext, ErrorSeverity.HIGH);
  }

  /**
   * Safe node access wrapper
   */
  static safeNodeAccess<T>(
    nodeGetter: () => T,
    context: Partial<ErrorContext>,
    fallback?: T
  ): T | null {
    try {
      const node = nodeGetter();
      if (node === undefined || node === null) {
        throw new Error(`Node is ${node === undefined ? 'undefined' : 'null'}`);
      }
      return node;
    } catch (error) {
      ErrorHandler.getInstance().handleNodeError(
        error as Error,
        null,
        {
          component: context.component || 'Unknown',
          function: context.function || 'safeNodeAccess',
          userAction: 'Accessing DOM node'
        }
      );
      return fallback || null;
    }
  }
}

/**
 * Error boundary decorator that wraps functions with error handling
 */
function withErrorBoundary<T extends any[], R>(
  target: (...args: T) => R,
  context: Partial<ErrorContext>,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): (...args: T) => R | null {
  return (...args: T): R | null => {
    try {
      return target(...args);
    } catch (error) {
      ErrorHandler.getInstance().handleError(
        error as Error,
        {
          component: context.component || 'Unknown',
          function: context.function || target.name || 'Unknown',
          parameters: args,
          ...context
        },
        severity
      );
      return null;
    }
  };
}

export { ErrorHandler, withErrorBoundary };
export type { ErrorContext, ErrorReport };

// Re-export safe node access for convenience
export const safeNodeAccess = ErrorHandler.safeNodeAccess;
