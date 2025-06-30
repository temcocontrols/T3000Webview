import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AsyncComponentTimeoutManager, asyncTimeoutManager } from '../../src/lib/performance/AsyncComponentTimeoutManager.js';
import { ErrorHandler } from '../../src/lib/T3000/Hvac/Util/ErrorHandler';

// Mock dependencies
vi.mock('../../src/lib/T3000/Hvac/Util/ErrorHandler', () => ({
  ErrorHandler: {
    getInstance: vi.fn(() => ({
      handleAsyncComponentError: vi.fn(),
      handleError: vi.fn()
    }))
  }
}));

vi.mock('../../src/lib/performance/ComponentLazyLoader.js', () => ({
  componentLazyLoader: {
    createLazyComponent: vi.fn((importFn, options) => ({
      loader: importFn,
      ...options
    }))
  }
}));

describe('AsyncComponentTimeoutManager', () => {
  let manager;
  let mockErrorHandler;

  beforeEach(() => {
    manager = new AsyncComponentTimeoutManager();
    mockErrorHandler = ErrorHandler.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    manager.clearAllTimeoutHistory();
  });

  describe('createTimeoutAwareComponent', () => {
    it('should create component with default timeout settings', () => {
      const mockImportFn = vi.fn();
      const component = manager.createTimeoutAwareComponent(mockImportFn, {
        name: 'TestComponent'
      });

      expect(component).toBeDefined();
      expect(component.componentName).toBe('TestComponent');
      expect(component.timeout).toBe(15000); // normal category default
    });

    it('should apply correct timeout for different categories', () => {
      const testCases = [
        { category: 'fast', expectedTimeout: 5000 },
        { category: 'normal', expectedTimeout: 15000 },
        { category: 'slow', expectedTimeout: 30000 },
        { category: 'critical', expectedTimeout: 60000 }
      ];

      testCases.forEach(({ category, expectedTimeout }) => {
        const mockImportFn = vi.fn();
        const component = manager.createTimeoutAwareComponent(mockImportFn, {
          name: `TestComponent_${category}`,
          category
        });

        expect(component.timeout).toBe(expectedTimeout);
      });
    });
  });

  describe('handleTimeout', () => {
    it('should handle timeout errors correctly', () => {
      const timeoutError = new Error('Async component timed out after 15000ms: TestComponent');
      const context = {
        name: 'TestComponent',
        category: 'normal',
        timeout: 15000,
        attempts: 1,
        retry: vi.fn(),
        fail: vi.fn(),
        onTimeout: vi.fn()
      };

      manager.handleTimeout(timeoutError, context);

      expect(context.onTimeout).toHaveBeenCalledWith(timeoutError, context);
      expect(mockErrorHandler.handleAsyncComponentError).toHaveBeenCalled();
    });

    it('should retry component within attempt limits', () => {
      const timeoutError = new Error('Async component timed out after 15000ms: TestComponent');
      const context = {
        name: 'TestComponent',
        category: 'normal',
        timeout: 15000,
        attempts: 1,
        retry: vi.fn(),
        fail: vi.fn()
      };

      manager.handleTimeout(timeoutError, context);

      // Should attempt retry for first attempt
      expect(context.retry).toHaveBeenCalled();
      expect(context.fail).not.toHaveBeenCalled();
    });

    it('should fail component after max attempts', () => {
      const timeoutError = new Error('Async component timed out after 15000ms: TestComponent');
      const context = {
        name: 'TestComponent',
        category: 'normal',
        timeout: 15000,
        attempts: 5, // Exceeds max retries
        retry: vi.fn(),
        fail: vi.fn()
      };

      manager.handleTimeout(timeoutError, context);

      expect(context.fail).toHaveBeenCalled();
      expect(context.retry).not.toHaveBeenCalled();
    });

    it('should handle non-timeout errors differently', () => {
      const regularError = new Error('Network error');
      const context = {
        name: 'TestComponent',
        category: 'normal',
        timeout: 15000,
        attempts: 1,
        retry: vi.fn(),
        fail: vi.fn(),
        onError: vi.fn()
      };

      manager.handleTimeout(regularError, context);

      expect(context.onError).toHaveBeenCalledWith(
        regularError,
        context.retry,
        context.fail,
        context.attempts
      );
    });
  });

  describe('shouldRetryComponent', () => {
    it('should allow retry for new components', () => {
      const shouldRetry = manager.shouldRetryComponent('NewComponent', 1);
      expect(shouldRetry).toBe(true);
    });

    it('should prevent retry for components with too many failures', () => {
      manager.registerRetryStrategy('FailingComponent', {
        lastAttempt: Date.now() - 60000, // 1 minute ago
        failures: 6, // Exceeds limit
        category: 'normal'
      });

      const shouldRetry = manager.shouldRetryComponent('FailingComponent', 1);
      expect(shouldRetry).toBe(false);
    });

    it('should prevent retry for recent attempts', () => {
      manager.registerRetryStrategy('RecentComponent', {
        lastAttempt: Date.now() - 10000, // 10 seconds ago (< 30 seconds)
        failures: 2,
        category: 'normal'
      });

      const shouldRetry = manager.shouldRetryComponent('RecentComponent', 1);
      expect(shouldRetry).toBe(false);
    });

    it('should allow retry after sufficient time has passed', () => {
      manager.registerRetryStrategy('DelayedComponent', {
        lastAttempt: Date.now() - 40000, // 40 seconds ago (> 30 seconds)
        failures: 2,
        category: 'normal'
      });

      const shouldRetry = manager.shouldRetryComponent('DelayedComponent', 1);
      expect(shouldRetry).toBe(true);
    });
  });

  describe('calculateRetryDelay', () => {
    it('should return default delay for new components', () => {
      const delay = manager.calculateRetryDelay('NewComponent');
      expect(delay).toBe(1000);
    });

    it('should calculate exponential backoff', () => {
      manager.registerRetryStrategy('BackoffComponent', {
        lastAttempt: Date.now(),
        failures: 3,
        category: 'normal'
      });

      const delay = manager.calculateRetryDelay('BackoffComponent');
      expect(delay).toBe(8000); // 1000 * 2^3
    });

    it('should cap maximum delay', () => {
      manager.registerRetryStrategy('MaxDelayComponent', {
        lastAttempt: Date.now(),
        failures: 10, // Would result in very large delay
        category: 'normal'
      });

      const delay = manager.calculateRetryDelay('MaxDelayComponent');
      expect(delay).toBe(10000); // Capped at 10 seconds
    });
  });

  describe('handleSuccess', () => {
    it('should clear retry strategy on success', () => {
      manager.registerRetryStrategy('SuccessComponent', {
        lastAttempt: Date.now(),
        failures: 2,
        category: 'normal'
      });

      manager.handleSuccess({}, { name: 'SuccessComponent', category: 'normal' });

      expect(manager.retryStrategies.has('SuccessComponent')).toBe(false);
    });
  });

  describe('getTimeoutStats', () => {
    it('should return correct statistics', () => {
      manager.registerRetryStrategy('Component1', {
        lastAttempt: Date.now(),
        failures: 2,
        category: 'normal'
      });

      manager.registerRetryStrategy('Component2', {
        lastAttempt: Date.now(),
        failures: 5, // Failed component
        category: 'normal'
      });

      const stats = manager.getTimeoutStats();

      expect(stats.totalComponents).toBe(2);
      expect(stats.failedComponents).toBe(1);
      expect(stats.retryingComponents).toBe(1);
      expect(stats.avgFailures).toBe(3.5);
    });

    it('should handle empty statistics', () => {
      const stats = manager.getTimeoutStats();

      expect(stats.totalComponents).toBe(0);
      expect(stats.failedComponents).toBe(0);
      expect(stats.retryingComponents).toBe(0);
      expect(stats.avgFailures).toBe(0);
    });
  });

  describe('timeout error component', () => {
    it('should create enhanced error component', () => {
      const errorComponent = manager.createTimeoutErrorComponent(
        'TestComponent',
        'normal',
        null
      );

      expect(errorComponent).toBeDefined();
      expect(errorComponent.template).toContain('Component Loading Timeout');
      expect(errorComponent.data().componentName).toBe('TestComponent');
      expect(errorComponent.data().category).toBe('normal');
    });

    it('should use provided fallback component', () => {
      const fallbackComponent = { template: '<div>Fallback</div>' };
      const errorComponent = manager.createTimeoutErrorComponent(
        'TestComponent',
        'normal',
        fallbackComponent
      );

      expect(errorComponent).toBe(fallbackComponent);
    });
  });

  describe('history management', () => {
    it('should clear specific component history', () => {
      manager.registerRetryStrategy('Component1', {
        lastAttempt: Date.now(),
        failures: 2,
        category: 'normal'
      });

      manager.registerRetryStrategy('Component2', {
        lastAttempt: Date.now(),
        failures: 1,
        category: 'normal'
      });

      manager.clearTimeoutHistory('Component1');

      expect(manager.retryStrategies.has('Component1')).toBe(false);
      expect(manager.retryStrategies.has('Component2')).toBe(true);
    });

    it('should clear all history', () => {
      manager.registerRetryStrategy('Component1', {
        lastAttempt: Date.now(),
        failures: 2,
        category: 'normal'
      });

      manager.registerRetryStrategy('Component2', {
        lastAttempt: Date.now(),
        failures: 1,
        category: 'normal'
      });

      manager.clearAllTimeoutHistory();

      expect(manager.retryStrategies.size).toBe(0);
    });
  });
});

describe('Global asyncTimeoutManager', () => {
  it('should provide global instance', () => {
    expect(asyncTimeoutManager).toBeInstanceOf(AsyncComponentTimeoutManager);
  });

  it('should maintain singleton behavior', () => {
    const instance1 = asyncTimeoutManager;
    const instance2 = asyncTimeoutManager;
    expect(instance1).toBe(instance2);
  });
});
