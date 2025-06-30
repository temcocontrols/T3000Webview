/**
 * Integration Tests for Performance Optimizations
 * Tests for Phase 3B runtime performance improvements
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';

// Import components and utilities
import { VirtualScrollManager, useVirtualScroll } from '../../../../src/lib/performance/VirtualScrollManager.js';
import { memoize, memoizeDebounced, memoizeAsync, createMemoizedSelector } from '../../../../src/lib/performance/MemoizationUtils.js';
import { ComponentLazyLoader, componentLazyLoader, useLazyComponent } from '../../../../src/lib/performance/ComponentLazyLoader.js';
import { useIndexPageOptimizations, OptimizedViewportManager } from '../../../../src/lib/performance/IndexPageOptimizations.js';

describe('VirtualScrollManager', () => {
  let manager;

  beforeEach(() => {
    manager = new VirtualScrollManager({
      itemHeight: 50,
      containerHeight: 400,
      overscan: 5
    });
  });

  it('should calculate visible items correctly', () => {
    const items = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }));
    const result = manager.updateScroll(200, 100, items);

    expect(result.visibleStartIndex).toBeGreaterThanOrEqual(0);
    expect(result.visibleEndIndex).toBeLessThan(100);
    expect(result.visibleItems.length).toBeGreaterThan(0);
    expect(result.totalHeight).toBe(5000); // 100 * 50
  });

  it('should handle scroll to item correctly', () => {
    const scrollTop = manager.scrollToItem(10);
    expect(scrollTop).toBe(500); // 10 * 50
  });

  it('should get item position correctly', () => {
    const position = manager.getItemPosition(5);
    expect(position.top).toBe(250); // 5 * 50
    expect(position.height).toBe(50);
  });

  it('should update configuration', () => {
    manager.updateConfig({ itemHeight: 60 });
    expect(manager.itemHeight).toBe(60);
  });
});

describe('useVirtualScroll composable', () => {
  it('should return virtual scroll utilities', () => {
    const { manager, updateScroll, getItemPosition, scrollToItem } = useVirtualScroll({
      itemHeight: 40,
      containerHeight: 300
    });

    expect(manager).toBeInstanceOf(VirtualScrollManager);
    expect(typeof updateScroll).toBe('function');
    expect(typeof getItemPosition).toBe('function');
    expect(typeof scrollToItem).toBe('function');
  });
});

describe('MemoizationUtils', () => {
  describe('memoize', () => {
    it('should cache function results', () => {
      const fn = vi.fn((x, y) => x + y);
      const memoizedFn = memoize(fn);

      const result1 = memoizedFn(1, 2);
      const result2 = memoizedFn(1, 2);

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect cache size limit', () => {
      const fn = vi.fn((x) => x * 2);
      const memoizedFn = memoize(fn, 2);

      memoizedFn(1);
      memoizedFn(2);
      memoizedFn(3); // Should evict cache for input 1

      memoizedFn(1); // Should call function again
      expect(fn).toHaveBeenCalledTimes(4);
    });
  });

  describe('memoizeDebounced', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should debounce function calls', () => {
      const fn = vi.fn((x) => x * 2);
      const debouncedFn = memoizeDebounced(fn, 100);

      debouncedFn(1);
      debouncedFn(1);
      debouncedFn(1);

      expect(fn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('memoizeAsync', () => {
    it('should cache async function results', async () => {
      const fn = vi.fn(async (x) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return x * 2;
      });
      const memoizedFn = memoizeAsync(fn);

      const result1 = await memoizedFn(5);
      const result2 = await memoizedFn(5);

      expect(result1).toBe(10);
      expect(result2).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should handle TTL correctly', async () => {
      vi.useFakeTimers();

      const fn = vi.fn(async (x) => x * 2);
      const memoizedFn = memoizeAsync(fn, 50, 100); // TTL of 100ms

      await memoizedFn(1);
      vi.advanceTimersByTime(150);
      await memoizedFn(1); // Should call function again due to TTL

      expect(fn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  describe('createMemoizedSelector', () => {
    it('should memoize selector results', () => {
      const selector = vi.fn((a, b) => a + b);
      const memoizedSelector = createMemoizedSelector(selector);

      const result1 = memoizedSelector(1, 2);
      const result2 = memoizedSelector(1, 2);

      expect(result1).toBe(3);
      expect(result2).toBe(3);
      expect(selector).toHaveBeenCalledTimes(1);
    });

    it('should recalculate when arguments change', () => {
      const selector = vi.fn((a, b) => a + b);
      const memoizedSelector = createMemoizedSelector(selector);

      memoizedSelector(1, 2);
      memoizedSelector(2, 3);

      expect(selector).toHaveBeenCalledTimes(2);
    });
  });
});

describe('ComponentLazyLoader', () => {
  let loader;

  beforeEach(() => {
    loader = new ComponentLazyLoader();
  });

  afterEach(() => {
    loader.clearCache();
  });

  it('should create lazy component', () => {
    const importFn = () => Promise.resolve({ default: { name: 'TestComponent' } });
    const lazyComponent = loader.createLazyComponent(importFn);

    expect(lazyComponent).toBeDefined();
    expect(typeof lazyComponent.loader).toBe('function');
  });

  it('should cache loaded components', async () => {
    const mockComponent = { name: 'TestComponent' };
    const importFn = vi.fn(() => Promise.resolve({ default: mockComponent }));

    await loader.loadComponentWithRetry(importFn, 3, 100);
    await loader.loadComponentWithRetry(importFn, 3, 100);

    expect(importFn).toHaveBeenCalledTimes(1);
  });

  it('should retry failed loads', async () => {
    const importFn = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ default: { name: 'TestComponent' } });

    const result = await loader.loadComponentWithRetry(importFn, 3, 10);

    expect(importFn).toHaveBeenCalledTimes(3);
    expect(result.name).toBe('TestComponent');
  });

  it('should preload components', async () => {
    const components = [
      () => Promise.resolve({ default: { name: 'Component1' } }),
      () => Promise.resolve({ default: { name: 'Component2' } }),
      () => Promise.resolve({ default: { name: 'Component3' } })
    ];

    const results = await loader.preloadComponents(components, { maxConcurrent: 2 });

    expect(results).toHaveLength(3);
    expect(results.every(r => r.success)).toBe(true);
  });

  it('should provide cache statistics', () => {
    const stats = loader.getCacheStats();

    expect(stats).toHaveProperty('cached');
    expect(stats).toHaveProperty('loading');
    expect(stats).toHaveProperty('failed');
    expect(stats).toHaveProperty('total');
  });
});

describe('useLazyComponent composable', () => {
  it('should return lazy component utilities', () => {
    const importFn = () => Promise.resolve({ default: { name: 'TestComponent' } });
    const { component, isCached, isLoading, preload } = useLazyComponent(importFn);

    expect(component).toBeDefined();
    expect(typeof isCached).toBe('function');
    expect(typeof isLoading).toBe('function');
    expect(typeof preload).toBe('function');
  });
});

describe('useIndexPageOptimizations', () => {
  it('should return optimization utilities', () => {
    const optimizations = useIndexPageOptimizations();

    expect(optimizations).toHaveProperty('lazyComponents');
    expect(optimizations).toHaveProperty('memoizedComputations');
    expect(optimizations).toHaveProperty('debouncedOperations');
    expect(optimizations).toHaveProperty('optimizedHandlers');
    expect(optimizations).toHaveProperty('virtualScrollManager');
    expect(optimizations).toHaveProperty('performanceHelpers');
  });

  it('should provide lazy components', () => {
    const { lazyComponents } = useIndexPageOptimizations();

    expect(lazyComponents).toHaveProperty('ToolsSidebar');
    expect(lazyComponents).toHaveProperty('ObjectConfig');
    expect(lazyComponents).toHaveProperty('DeviceInfo');
  });

  it('should provide memoized computations', () => {
    const { memoizedComputations } = useIndexPageOptimizations();

    expect(typeof memoizedComputations.viewportCalculations).toBe('function');
    expect(typeof memoizedComputations.visibleObjects).toBe('function');
    expect(typeof memoizedComputations.selectionBounds).toBe('function');
  });

  it('should provide performance helpers', () => {
    const { performanceHelpers } = useIndexPageOptimizations();

    expect(typeof performanceHelpers.trackRender).toBe('function');
    expect(typeof performanceHelpers.trackInteraction).toBe('function');
    expect(typeof performanceHelpers.getMetrics).toBe('function');
  });
});

describe('OptimizedViewportManager', () => {
  let manager;
  let mockElement;

  beforeEach(() => {
    mockElement = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      scrollLeft: 0,
      scrollTop: 0,
      getBoundingClientRect: () => ({ width: 800, height: 600, top: 0, left: 0 })
    };

    // Mock IntersectionObserver
    global.IntersectionObserver = vi.fn().mockImplementation((callback) => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));

    manager = new OptimizedViewportManager({
      throttleDelay: 16,
      debounceDelay: 100
    });
  });

  afterEach(() => {
    manager.destroy();
  });

  it('should initialize with viewport element', () => {
    manager.init(mockElement);
    expect(manager.viewportElement).toBe(mockElement);
  });

  it('should setup intersection observer', () => {
    manager.init(mockElement);
    expect(global.IntersectionObserver).toHaveBeenCalled();
  });

  it('should setup scroll optimization', () => {
    manager.init(mockElement);
    expect(mockElement.addEventListener).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      { passive: true }
    );
  });

  it('should observe and unobserve elements', () => {
    manager.init(mockElement);
    const testElement = document.createElement('div');

    manager.observeElement(testElement);
    manager.unobserveElement(testElement);

    // Should not throw errors
    expect(true).toBe(true);
  });

  it('should cleanup properly', () => {
    manager.init(mockElement);
    manager.destroy();

    expect(manager.observers).toHaveLength(0);
  });
});

describe('Performance Integration', () => {
  it('should work together - virtual scroll with memoization', () => {
    const virtualScroll = useVirtualScroll({
      itemHeight: 50,
      containerHeight: 400
    });

    const memoizedFilter = memoize((items, filter) => {
      return items.filter(item => item.name.includes(filter));
    });

    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`
    }));

    // First call - should compute
    const filtered1 = memoizedFilter(items, 'Item 1');
    // Second call with same args - should use cache
    const filtered2 = memoizedFilter(items, 'Item 1');

    expect(filtered1).toBe(filtered2); // Same reference due to memoization

    const virtualResult = virtualScroll.updateScroll(0, filtered1.length, filtered1);
    expect(virtualResult.visibleItems.length).toBeGreaterThan(0);
  });

  it('should work together - lazy loading with performance monitoring', async () => {
    const { lazyComponents, performanceHelpers } = useIndexPageOptimizations();

    expect(lazyComponents.ToolsSidebar).toBeDefined();
    expect(typeof performanceHelpers.trackRender).toBe('function');

    const trackEnd = performanceHelpers.trackRender('TestComponent');
    expect(typeof trackEnd).toBe('function');

    trackEnd(); // Should not throw
  });
});

// Performance benchmark tests
describe('Performance Benchmarks', () => {
  it('should memoize expensive calculations efficiently', () => {
    const expensiveFn = (n) => {
      let result = 0;
      for (let i = 0; i < n; i++) {
        result += Math.sqrt(i);
      }
      return result;
    };

    const memoizedFn = memoize(expensiveFn);

    const start1 = performance.now();
    memoizedFn(10000);
    const time1 = performance.now() - start1;

    const start2 = performance.now();
    memoizedFn(10000); // Cached result
    const time2 = performance.now() - start2;

    expect(time2).toBeLessThan(time1 * 0.1); // Should be much faster
  });

  it('should handle large virtual scroll datasets efficiently', () => {
    const manager = new VirtualScrollManager({
      itemHeight: 50,
      containerHeight: 400
    });

    const largeDataset = Array.from({ length: 100000 }, (_, i) => ({ id: i }));

    const start = performance.now();
    const result = manager.updateScroll(0, largeDataset.length, largeDataset);
    const time = performance.now() - start;

    expect(time).toBeLessThan(50); // Should complete in under 50ms
    expect(result.visibleItems.length).toBeLessThan(20); // Should only render visible items
  });
});
