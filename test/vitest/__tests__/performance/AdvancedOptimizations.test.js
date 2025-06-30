/**
 * Integration tests for T3000 Advanced Performance Optimizations
 * Tests service worker, web workers, progressive loading, and advanced caching
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServiceWorkerManager } from '../../src/lib/performance/ServiceWorkerManager.js';
import { WebWorkerManager } from '../../src/lib/performance/WebWorkerManager.js';
import { ProgressiveLoader } from '../../src/lib/performance/ProgressiveLoader.js';
import { AdvancedCache, T3000Cache } from '../../src/lib/performance/AdvancedCache.js';

// Mock Service Worker API
const mockServiceWorker = {
  register: vi.fn(),
  getRegistration: vi.fn(),
  addEventListener: vi.fn(),
  postMessage: vi.fn()
};

// Mock Worker API
const mockWorker = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  onmessage: null,
  onerror: null
}));

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn().mockImplementation((callback) => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Setup global mocks
beforeEach(() => {
  global.navigator = {
    serviceWorker: mockServiceWorker,
    onLine: true
  };
  global.Worker = mockWorker;
  global.IntersectionObserver = mockIntersectionObserver;
  global.caches = {
    open: vi.fn().mockResolvedValue({
      match: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      keys: vi.fn().mockResolvedValue([])
    }),
    keys: vi.fn().mockResolvedValue([]),
    delete: vi.fn()
  };
  global.performance = {
    now: vi.fn(() => Date.now()),
    mark: vi.fn(),
    measure: vi.fn(),
    memory: {
      usedJSHeapSize: 50000000,
      totalJSHeapSize: 100000000,
      jsHeapSizeLimit: 2000000000
    }
  };
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('ServiceWorkerManager Integration', () => {
  let swManager;

  beforeEach(() => {
    swManager = new ServiceWorkerManager();
  });

  afterEach(() => {
    if (swManager) {
      swManager.unregister();
    }
  });

  it('should register service worker successfully', async () => {
    mockServiceWorker.register.mockResolvedValue({
      scope: '/',
      addEventListener: vi.fn()
    });

    const result = await swManager.register();

    expect(result).toBe(true);
    expect(mockServiceWorker.register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
  });

  it('should handle service worker registration failure', async () => {
    mockServiceWorker.register.mockRejectedValue(new Error('Registration failed'));

    const result = await swManager.register();

    expect(result).toBe(false);
  });

  it('should cache T3000 data', async () => {
    const testData = { devices: [], projects: [] };

    const result = await swManager.cacheT3000Data(testData);

    expect(result).toBe(true);
  });

  it('should retrieve cached T3000 data', async () => {
    const testData = { devices: [], projects: [] };

    global.caches.open.mockResolvedValue({
      match: vi.fn().mockResolvedValue({
        json: vi.fn().mockResolvedValue(testData)
      })
    });

    const result = await swManager.getCachedT3000Data();

    expect(result).toEqual(testData);
  });

  it('should handle online/offline events', () => {
    const onlineSpy = vi.fn();
    const offlineSpy = vi.fn();

    swManager.on('online', onlineSpy);
    swManager.on('offline', offlineSpy);

    // Simulate offline
    swManager.isOnline = false;
    swManager.emit('offline');

    expect(offlineSpy).toHaveBeenCalled();

    // Simulate online
    swManager.isOnline = true;
    swManager.emit('online');

    expect(onlineSpy).toHaveBeenCalled();
  });
});

describe('WebWorkerManager Integration', () => {
  let workerManager;
  let mockWorkerInstance;

  beforeEach(() => {
    mockWorkerInstance = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
      addEventListener: vi.fn()
    };
    mockWorker.mockImplementation(() => mockWorkerInstance);
    workerManager = new WebWorkerManager();
  });

  afterEach(() => {
    if (workerManager) {
      workerManager.terminate();
    }
  });

  it('should initialize web worker', async () => {
    await new Promise(resolve => setTimeout(resolve, 100)); // Allow async initialization

    expect(mockWorker).toHaveBeenCalledWith('/t3000-worker.js');
    expect(workerManager.isWorkerReady).toBe(true);
  });

  it('should send messages to worker', async () => {
    // Simulate worker ready
    workerManager.isWorkerReady = true;
    workerManager.worker = mockWorkerInstance;

    // Mock successful response
    setTimeout(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: { id: 1, result: { calculated: true } }
        });
      }
    }, 10);

    const promise = workerManager.sendMessage('calculateHvacData', { test: true });

    expect(mockWorkerInstance.postMessage).toHaveBeenCalled();

    const result = await promise;
    expect(result.result.calculated).toBe(true);
  });

  it('should handle worker errors', async () => {
    workerManager.isWorkerReady = true;
    workerManager.worker = mockWorkerInstance;

    // Simulate worker error
    setTimeout(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: { id: 1, error: 'Calculation failed' }
        });
      }
    }, 10);

    const promise = workerManager.sendMessage('calculateHvacData', { test: true });

    await expect(promise).rejects.toThrow('Calculation failed');
  });

  it('should calculate HVAC data', async () => {
    const hvacData = [{ baseFlow: 100, designFlow: 120 }];
    const parameters = { temperature: 25, humidity: 0.5 };

    // Mock worker response
    workerManager.isWorkerReady = true;
    workerManager.worker = mockWorkerInstance;

    setTimeout(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: {
            id: 1,
            result: [{ ...hvacData[0], calculatedFlow: 105, efficiency: 87.5 }],
            metadata: { duration: 10 }
          }
        });
      }
    }, 10);

    const result = await workerManager.calculateHvacData(hvacData, 'airflow', parameters);

    expect(result.result).toHaveLength(1);
    expect(result.result[0].calculatedFlow).toBe(105);
  });

  it('should process modbus registers', async () => {
    const registers = [
      { address: 1001, value: 25.5, dataType: 'float' },
      { address: 1002, value: 30, dataType: 'int' }
    ];

    workerManager.isWorkerReady = true;
    workerManager.worker = mockWorkerInstance;

    setTimeout(() => {
      if (mockWorkerInstance.onmessage) {
        mockWorkerInstance.onmessage({
          data: {
            id: 1,
            result: registers.map(r => ({ ...r, parsedValue: r.value, timestamp: Date.now() })),
            metadata: { duration: 5 }
          }
        });
      }
    }, 10);

    const result = await workerManager.processModbusRegisters(registers, 'parse');

    expect(result.result).toHaveLength(2);
    expect(result.result[0].parsedValue).toBe(25.5);
  });

  it('should fall back to main thread when worker unavailable', async () => {
    workerManager.isSupported = false;
    workerManager.isWorkerReady = false;

    const hvacData = [{ baseFlow: 100 }];

    const result = await workerManager.calculateHvacData(hvacData, 'airflow');

    expect(result.result).toHaveLength(1);
    expect(result.result[0].calculated).toBe(true);
  });
});

describe('ProgressiveLoader Integration', () => {
  let progressiveLoader;

  beforeEach(() => {
    progressiveLoader = new ProgressiveLoader();
  });

  afterEach(() => {
    if (progressiveLoader) {
      progressiveLoader.destroy();
    }
  });

  it('should register images for lazy loading', () => {
    const mockImg = {
      src: '/assets/placeholder.png',
      dataset: {},
      getAttribute: vi.fn().mockReturnValue('/assets/real-image.jpg'),
      addEventListener: vi.fn()
    };

    progressiveLoader.registerImage(mockImg, {
      placeholder: '/assets/placeholder.png',
      onLoad: vi.fn()
    });

    expect(mockImg.dataset.originalSrc).toBe('/assets/real-image.jpg');
    expect(mockIntersectionObserver).toHaveBeenCalled();
  });

  it('should create data loader', () => {
    const loader = progressiveLoader.createDataLoader('/api/data', {
      pageSize: 20,
      preloadThreshold: 5
    });

    expect(loader.endpoint).toBe('/api/data');
    expect(loader.pageSize).toBe(20);
    expect(loader.preloadThreshold).toBe(5);
  });

  it('should load next page of data', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [{ id: 1 }, { id: 2 }],
        totalPages: 5
      })
    });

    const loader = progressiveLoader.createDataLoader('/api/test');
    const result = await progressiveLoader.loadNextPage(loader.cacheKey);

    expect(result.data).toHaveLength(2);
    expect(result.hasMore).toBe(true);
    expect(fetch).toHaveBeenCalledWith('/api/test?page=0&size=50');
  });

  it('should handle load errors with retry', async () => {
    global.fetch = vi.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ data: [{ id: 1 }] })
      });

    const loader = progressiveLoader.createDataLoader('/api/test', { maxRetries: 1 });

    // First call should fail and retry
    const promise = progressiveLoader.loadNextPage(loader.cacheKey);

    // Wait for retry
    await new Promise(resolve => setTimeout(resolve, 1100));

    const result = await promise;
    expect(result.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should create skeleton screens', () => {
    const skeleton = progressiveLoader.createSkeleton({
      rows: 3,
      width: ['100%', '80%', '60%'],
      height: '16px'
    });

    expect(skeleton).toContain('skeleton-container');
    expect(skeleton).toContain('width: 100%');
    expect(skeleton).toContain('width: 80%');
    expect(skeleton).toContain('width: 60%');
  });

  it('should preload if needed', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [{ id: 3 }] })
    });

    const loader = progressiveLoader.createDataLoader('/api/test', {
      preloadThreshold: 2
    });

    // Add some initial data
    loader.data = [{ id: 1 }, { id: 2 }];
    loader.currentPage = 1;
    loader.hasMore = true;

    await progressiveLoader.preloadIfNeeded(loader.cacheKey, 1); // Current index 1, remaining = 1

    expect(fetch).toHaveBeenCalled(); // Should trigger preload
  });
});

describe('AdvancedCache Integration', () => {
  let cache;

  beforeEach(() => {
    cache = new AdvancedCache({ maxSize: 5, ttl: 1000 });
  });

  it('should store and retrieve cache items', () => {
    cache.set('test-key', { data: 'test' });

    const result = cache.get('test-key');

    expect(result.data).toBe('test');
    expect(cache.cacheHits).toBe(1);
  });

  it('should handle cache misses', () => {
    const result = cache.get('non-existent');

    expect(result).toBeUndefined();
    expect(cache.cacheMisses).toBe(1);
  });

  it('should evict LRU items when cache is full', () => {
    // Fill cache to capacity
    for (let i = 0; i < 6; i++) {
      cache.set(`key-${i}`, { data: i });
    }

    // First item should be evicted
    expect(cache.has('key-0')).toBe(false);
    expect(cache.has('key-5')).toBe(true);
    expect(cache.cache.size).toBe(5);
  });

  it('should expire items based on TTL', async () => {
    cache.set('temp-key', { data: 'temp' }, { ttl: 100 });

    expect(cache.has('temp-key')).toBe(true);

    // Wait for expiration
    await new Promise(resolve => setTimeout(resolve, 150));

    expect(cache.has('temp-key')).toBe(false);
  });

  it('should provide accurate statistics', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.get('key1');
    cache.get('non-existent');

    const stats = cache.getStats();

    expect(stats.size).toBe(2);
    expect(stats.hitRate).toBe(33.33); // 1 hit out of 3 requests
    expect(stats.cacheHits).toBe(1);
    expect(stats.cacheMisses).toBe(2);
  });

  it('should invalidate by pattern', () => {
    cache.set('user:1', { name: 'User 1' });
    cache.set('user:2', { name: 'User 2' });
    cache.set('config:theme', 'dark');

    const invalidated = cache.invalidateByPattern(/^user:/);

    expect(invalidated).toBe(2);
    expect(cache.has('user:1')).toBe(false);
    expect(cache.has('user:2')).toBe(false);
    expect(cache.has('config:theme')).toBe(true);
  });

  it('should export and import cache data', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');

    const exported = cache.export();

    expect(exported.data['key1'].value).toBe('value1');
    expect(exported.data['key2'].value).toBe('value2');

    // Create new cache and import
    const newCache = new AdvancedCache({ maxSize: 5 });
    newCache.import(exported);

    expect(newCache.get('key1')).toBe('value1');
    expect(newCache.get('key2')).toBe('value2');
  });
});

describe('T3000Cache Integration', () => {
  let t3000Cache;

  beforeEach(() => {
    t3000Cache = new T3000Cache();
  });

  it('should cache and retrieve device data', () => {
    const deviceData = {
      id: 'device-1',
      registers: [{ address: 1001, value: 25.5 }]
    };

    t3000Cache.cacheDeviceData('device-1', deviceData);

    const retrieved = t3000Cache.getDeviceData('device-1');

    expect(retrieved.id).toBe('device-1');
    expect(retrieved.registers).toHaveLength(1);
  });

  it('should cache and retrieve project data', () => {
    const projectData = {
      id: 'project-1',
      name: 'Test Project',
      items: []
    };

    t3000Cache.cacheProject('project-1', projectData);

    const retrieved = t3000Cache.getProject('project-1');

    expect(retrieved.id).toBe('project-1');
    expect(retrieved.name).toBe('Test Project');
  });

  it('should cache and retrieve image data', () => {
    const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==';

    t3000Cache.cacheImage('image-1', imageData);

    const retrieved = t3000Cache.getImage('image-1');

    expect(retrieved).toBe(imageData);
  });

  it('should invalidate device cache', () => {
    t3000Cache.cacheDeviceData('device-1', { data: 'test' });
    t3000Cache.set('device:device-1:config', { config: 'test' });

    const invalidated = t3000Cache.invalidateDevice('device-1');

    expect(invalidated).toBeGreaterThan(0);
    expect(t3000Cache.getDeviceData('device-1')).toBeUndefined();
  });

  it('should provide T3000-specific statistics', () => {
    t3000Cache.cacheDeviceData('device-1', { data: 'test1' });
    t3000Cache.cacheProject('project-1', { data: 'test2' });
    t3000Cache.cacheImage('image-1', 'imagedata');

    const stats = t3000Cache.getT3000Stats();

    expect(stats.devicesCached).toBe(1);
    expect(stats.projectsCached).toBe(1);
    expect(stats.imagesCached).toBe(1);
    expect(stats.deviceKeys).toBe(1);
    expect(stats.projectKeys).toBe(1);
    expect(stats.imageKeys).toBe(1);
  });
});

describe('Integration Performance Tests', () => {
  it('should handle high-volume operations efficiently', async () => {
    const cache = new AdvancedCache({ maxSize: 1000 });
    const startTime = performance.now();

    // Perform 1000 cache operations
    for (let i = 0; i < 1000; i++) {
      cache.set(`key-${i}`, { data: `value-${i}` });
      cache.get(`key-${i}`);
    }

    const duration = performance.now() - startTime;

    expect(duration).toBeLessThan(100); // Should complete in under 100ms
    expect(cache.getStats().hitRate).toBe(100); // All gets should be hits
  });

  it('should handle concurrent operations', async () => {
    const cache = new AdvancedCache({ maxSize: 100 });

    const promises = [];

    // Simulate concurrent cache operations
    for (let i = 0; i < 50; i++) {
      promises.push(
        new Promise(resolve => {
          setTimeout(() => {
            cache.set(`concurrent-${i}`, { data: i });
            const result = cache.get(`concurrent-${i}`);
            resolve(result);
          }, Math.random() * 10);
        })
      );
    }

    const results = await Promise.all(promises);

    expect(results).toHaveLength(50);
    results.forEach((result, index) => {
      expect(result.data).toBe(index);
    });
  });

  it('should maintain performance under memory pressure', () => {
    const cache = new AdvancedCache({ maxSize: 50 });

    // Create large objects to simulate memory pressure
    const largeObject = new Array(10000).fill(0).map((_, i) => ({ id: i, data: 'x'.repeat(100) }));

    const startTime = performance.now();

    // Perform operations with large objects
    for (let i = 0; i < 60; i++) {
      cache.set(`large-${i}`, largeObject);
    }

    const duration = performance.now() - startTime;

    expect(cache.cache.size).toBeLessThanOrEqual(50); // Should respect max size
    expect(duration).toBeLessThan(1000); // Should complete in reasonable time
  });
});
