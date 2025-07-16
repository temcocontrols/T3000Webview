/**
 * Chunk Loading Test Utility
 * Provides functions to manually test chunk loading performance and error handling
 */

import { chunkLoadingManager } from './ChunkLoadingManager.js';
import { asyncTimeoutManager } from './AsyncComponentTimeoutManager.js';

export class ChunkLoadingTester {
  /**
   * Test chunk loading with artificial delays
   */
  static async testChunkLoading() {
    console.log('Starting chunk loading test...');

    // Get current stats
    const initialStats = chunkLoadingManager.getStats();
    console.log('Initial chunk loading stats:', initialStats);

    // Test component loading times
    const testComponents = [
      { name: 'TestComponent1', delay: 1000 },
      { name: 'TestComponent2', delay: 5000 },
      { name: 'TestComponent3', delay: 10000 },
      { name: 'HeavyComponent', delay: 20000 }
    ];

    for (const component of testComponents) {
      try {
        console.log(`Testing component: ${component.name} with ${component.delay}ms delay`);

        const timeout = asyncTimeoutManager.getTimeoutForComponent(component.name, 'normal');
        console.log(`Component ${component.name} timeout: ${timeout}ms`);

        const startTime = performance.now();

        // Simulate component loading with artificial delay
        await this.simulateComponentLoad(component.name, component.delay);

        const loadTime = performance.now() - startTime;
        console.log(`Component ${component.name} loaded in ${Math.round(loadTime)}ms`);

      } catch (error) {
        console.error(`Component ${component.name} failed to load:`, error);
      }
    }

    // Get final stats
    const finalStats = chunkLoadingManager.getStats();
    console.log('Final chunk loading stats:', finalStats);
  }

  /**
   * Simulate component loading with delay
   */
  static simulateComponentLoad(name, delay) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate random failures for testing
        if (Math.random() < 0.2) { // 20% failure rate
          reject(new Error(`Simulated failure for component ${name}`));
        } else {
          resolve({ name, loadTime: delay });
        }
      }, delay);
    });
  }

  /**
   * Test retry mechanism
   */
  static async testRetryMechanism() {
    console.log('Testing retry mechanism...');

    let attempts = 0;
    const maxRetries = 3;

    const testRetry = async () => {
      attempts++;
      console.log(`Attempt ${attempts}/${maxRetries}`);

      if (attempts < 3) {
        throw new Error(`Simulated failure on attempt ${attempts}`);
      }

      return 'Success!';
    };

    try {
      const result = await this.retryWithBackoff(testRetry, maxRetries, 1000);
      console.log('Retry test result:', result);
    } catch (error) {
      console.error('Retry test failed:', error);
    }
  }

  /**
   * Retry function with exponential backoff
   */
  static async retryWithBackoff(fn, maxRetries, initialDelay) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          const delay = initialDelay * attempt;
          console.log(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * Monitor network performance
   */
  static startNetworkMonitoring() {
    console.log('Starting network performance monitoring...');

    // Monitor Resource Timing API
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        list.getEntries().forEach((entry) => {
          if (entry.initiatorType === 'script' || entry.initiatorType === 'link') {
            console.log(`[Network Monitor] ${entry.name}:`, {
              duration: Math.round(entry.duration),
              transferSize: entry.transferSize,
              encodedBodySize: entry.encodedBodySize,
              decodedBodySize: entry.decodedBodySize
            });
          }
        });
      });

      observer.observe({ entryTypes: ['resource'] });

      return observer;
    } else {
      console.warn('PerformanceObserver not supported');
      return null;
    }
  }

  /**
   * Get performance summary
   */
  static getPerformanceSummary() {
    const summary = {
      chunkStats: chunkLoadingManager.getStats(),
      navigation: performance.getEntriesByType('navigation')[0],
      resources: performance.getEntriesByType('resource').filter(
        entry => entry.initiatorType === 'script' || entry.initiatorType === 'link'
      ),
      memory: performance.memory ? {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
      } : null
    };

    console.log('Performance Summary:', summary);
    return summary;
  }
}

// Expose to global scope for manual testing
if (typeof window !== 'undefined') {
  window.ChunkLoadingTester = ChunkLoadingTester;
  console.log('ChunkLoadingTester available globally. Try: ChunkLoadingTester.testChunkLoading()');
}
