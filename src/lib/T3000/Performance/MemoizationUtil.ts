/**
 * T3000 Memoization Utilities
 * Provides intelligent caching for expensive function calls
 */

export interface MemoOptions {
  maxSize?: number;
  ttl?: number; // Time to live in milliseconds
  keyGenerator?: (...args: any[]) => string;
  onEvict?: (key: string, value: any) => void;
}

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRatio: number;
  memoryUsage: number;
}

/**
 * LRU Cache with TTL support
 */
class LRUCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    size: 0,
    hitRatio: 0,
    memoryUsage: 0
  };

  constructor(maxSize: number = 100, ttl: number = 300000) { // 5 minutes default TTL
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.stats.misses++;
      this.updateStats();
      return undefined;
    }

    // Update access information
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    this.stats.hits++;
    this.updateStats();
    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    // Remove existing entry if present
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict least recently used if at capacity
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
    this.updateStats();
  }

  /**
   * Check if key exists and is valid
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      size: 0,
      hitRatio: 0,
      memoryUsage: 0
    };
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.size = this.cache.size;
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRatio = total > 0 ? (this.stats.hits / total) * 100 : 0;
    this.stats.memoryUsage = this.estimateMemoryUsage();
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    // Rough estimate of memory usage
    return this.cache.size * 1024; // Assume 1KB per entry on average
  }

  /**
   * Force cleanup of expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
      }
    }
    this.updateStats();
  }
}

/**
 * Memoization decorator for functions
 */
export function memoize<TFunc extends (...args: any[]) => any>(
  fn: TFunc,
  options: MemoOptions = {}
): TFunc {
  const {
    maxSize = 100,
    ttl = 300000, // 5 minutes
    keyGenerator = (...args) => JSON.stringify(args),
    onEvict
  } = options;

  const cache = new LRUCache<ReturnType<TFunc>>(maxSize, ttl);

  const memoizedFunction = ((...args: Parameters<TFunc>): ReturnType<TFunc> => {
    const key = keyGenerator(...args);

    // Try to get from cache
    const cachedResult = cache.get(key);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Calculate result and cache it
    const result = fn(...args);
    cache.set(key, result);

    return result;
  }) as TFunc;

  // Add utility methods
  (memoizedFunction as any).cache = cache;
  (memoizedFunction as any).clear = () => cache.clear();
  (memoizedFunction as any).stats = () => cache.getStats();
  (memoizedFunction as any).cleanup = () => cache.cleanup();

  return memoizedFunction;
}

/**
 * Debounced memoization for frequently called functions
 */
export function debouncedMemo<TFunc extends (...args: any[]) => any>(
  fn: TFunc,
  delay: number = 100,
  options: MemoOptions = {}
): TFunc {
  const memoizedFn = memoize(fn, options);
  let timeoutId: NodeJS.Timeout | null = null;

  const debouncedFunction = ((...args: Parameters<TFunc>): ReturnType<TFunc> => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    timeoutId = setTimeout(() => {
      timeoutId = null;
    }, delay);

    return memoizedFn(...args);
  }) as TFunc;

  // Copy utility methods
  (debouncedFunction as any).cache = (memoizedFn as any).cache;
  (debouncedFunction as any).clear = (memoizedFn as any).clear;
  (debouncedFunction as any).stats = (memoizedFn as any).stats;
  (debouncedFunction as any).cleanup = (memoizedFn as any).cleanup;

  return debouncedFunction;
}

/**
 * Async function memoization
 */
export function memoizeAsync<TFunc extends (...args: any[]) => Promise<any>>(
  fn: TFunc,
  options: MemoOptions = {}
): TFunc {
  const {
    maxSize = 100,
    ttl = 300000,
    keyGenerator = (...args) => JSON.stringify(args)
  } = options;

  const cache = new LRUCache<Promise<Awaited<ReturnType<TFunc>>>>(maxSize, ttl);
  const pendingPromises = new Map<string, Promise<Awaited<ReturnType<TFunc>>>>();

  const memoizedFunction = (async (...args: Parameters<TFunc>): Promise<Awaited<ReturnType<TFunc>>> => {
    const key = keyGenerator(...args);

    // Check if result is cached
    const cachedResult = cache.get(key);
    if (cachedResult !== undefined) {
      return cachedResult;
    }

    // Check if promise is already pending
    const pendingPromise = pendingPromises.get(key);
    if (pendingPromise) {
      return pendingPromise;
    }

    // Create new promise and cache it
    const promise = fn(...args).then(
      (result) => {
        pendingPromises.delete(key);
        return result;
      },
      (error) => {
        pendingPromises.delete(key);
        cache.cache.delete(key); // Remove failed promise from cache
        throw error;
      }
    );

    pendingPromises.set(key, promise);
    cache.set(key, promise);

    return promise;
  }) as TFunc;

  // Add utility methods
  (memoizedFunction as any).cache = cache;
  (memoizedFunction as any).clear = () => {
    cache.clear();
    pendingPromises.clear();
  };
  (memoizedFunction as any).stats = () => cache.getStats();
  (memoizedFunction as any).cleanup = () => cache.cleanup();

  return memoizedFunction;
}

/**
 * T3000-specific memoization utilities
 */
export class T3000MemoUtil {
  private static instance: T3000MemoUtil;
  private caches: Map<string, LRUCache<any>> = new Map();

  private constructor() {}

  public static getInstance(): T3000MemoUtil {
    if (!T3000MemoUtil.instance) {
      T3000MemoUtil.instance = new T3000MemoUtil();
    }
    return T3000MemoUtil.instance;
  }

  /**
   * Memoize T3000 panel data calculations
   */
  public memoizePanelCalculations = memoize(
    (panelData: any, calculationType: string) => {
      // Expensive panel calculations go here
      console.log(`Calculating ${calculationType} for panel:`, panelData.id);

      // Simulate heavy calculation
      const start = performance.now();

      switch (calculationType) {
        case 'statistics':
          return this.calculatePanelStatistics(panelData);
        case 'optimization':
          return this.calculatePanelOptimization(panelData);
        case 'validation':
          return this.validatePanelData(panelData);
        default:
          return { error: 'Unknown calculation type' };
      }
    },
    {
      maxSize: 50,
      ttl: 600000, // 10 minutes for panel calculations
      keyGenerator: (panelData, calculationType) => `${panelData.id}_${calculationType}_${panelData.lastModified || 0}`
    }
  );

  /**
   * Memoize T3000 shape rendering calculations
   */
  public memoizeShapeRendering = memoize(
    (shapeData: any, renderOptions: any) => {
      console.log('Rendering shape:', shapeData.type);

      // Expensive shape rendering calculations
      return {
        path: this.calculateShapePath(shapeData),
        bounds: this.calculateShapeBounds(shapeData),
        styles: this.calculateShapeStyles(shapeData, renderOptions),
        cached: true
      };
    },
    {
      maxSize: 200,
      ttl: 1800000, // 30 minutes for shape rendering
      keyGenerator: (shapeData, renderOptions) =>
        `${shapeData.type}_${JSON.stringify(shapeData.properties)}_${JSON.stringify(renderOptions)}`
    }
  );

  /**
   * Memoize T3000 WebSocket message processing
   */
  public memoizeMessageProcessing = memoize(
    (messageData: any, processingType: string) => {
      console.log(`Processing ${processingType} message:`, messageData.type);

      switch (processingType) {
        case 'validation':
          return this.validateMessage(messageData);
        case 'transformation':
          return this.transformMessage(messageData);
        case 'filtering':
          return this.filterMessage(messageData);
        default:
          return messageData;
      }
    },
    {
      maxSize: 100,
      ttl: 60000, // 1 minute for message processing
      keyGenerator: (messageData, processingType) =>
        `${processingType}_${messageData.type}_${messageData.timestamp || Date.now()}`
    }
  );

  /**
   * Calculate panel statistics
   */
  private calculatePanelStatistics(panelData: any) {
    // Simulate expensive calculation
    let total = 0;
    for (let i = 0; i < 10000; i++) {
      total += Math.random();
    }

    return {
      totalEntries: panelData.entries?.length || 0,
      averageValue: total / 10000,
      calculatedAt: Date.now()
    };
  }

  /**
   * Calculate panel optimization
   */
  private calculatePanelOptimization(panelData: any) {
    // Simulate optimization calculations
    return {
      optimizationScore: Math.random() * 100,
      recommendations: ['Use more efficient filters', 'Reduce update frequency'],
      calculatedAt: Date.now()
    };
  }

  /**
   * Validate panel data
   */
  private validatePanelData(panelData: any) {
    return {
      isValid: !!panelData.id,
      errors: panelData.id ? [] : ['Missing panel ID'],
      warnings: [],
      validatedAt: Date.now()
    };
  }

  /**
   * Calculate shape path
   */
  private calculateShapePath(shapeData: any): string {
    // Simulate path calculation
    return `M 0 0 L ${shapeData.width || 100} ${shapeData.height || 100} Z`;
  }

  /**
   * Calculate shape bounds
   */
  private calculateShapeBounds(shapeData: any) {
    return {
      x: 0,
      y: 0,
      width: shapeData.width || 100,
      height: shapeData.height || 100
    };
  }

  /**
   * Calculate shape styles
   */
  private calculateShapeStyles(shapeData: any, renderOptions: any) {
    return {
      fill: shapeData.fill || '#ffffff',
      stroke: shapeData.stroke || '#000000',
      strokeWidth: renderOptions.strokeWidth || 1,
      opacity: renderOptions.opacity || 1
    };
  }

  /**
   * Validate message
   */
  private validateMessage(messageData: any) {
    return {
      isValid: !!messageData.type,
      sanitized: messageData,
      validatedAt: Date.now()
    };
  }

  /**
   * Transform message
   */
  private transformMessage(messageData: any) {
    return {
      ...messageData,
      transformed: true,
      transformedAt: Date.now()
    };
  }

  /**
   * Filter message
   */
  private filterMessage(messageData: any) {
    // Remove sensitive data
    const { password, token, ...filtered } = messageData;
    return {
      ...filtered,
      filtered: true,
      filteredAt: Date.now()
    };
  }

  /**
   * Get all cache statistics
   */
  public getAllCacheStats() {
    return {
      panelCalculations: (this.memoizePanelCalculations as any).stats(),
      shapeRendering: (this.memoizeShapeRendering as any).stats(),
      messageProcessing: (this.memoizeMessageProcessing as any).stats()
    };
  }

  /**
   * Clear all caches
   */
  public clearAllCaches(): void {
    (this.memoizePanelCalculations as any).clear();
    (this.memoizeShapeRendering as any).clear();
    (this.memoizeMessageProcessing as any).clear();

    console.log('T3000: All memoization caches cleared');
  }

  /**
   * Cleanup expired entries in all caches
   */
  public cleanupAllCaches(): void {
    (this.memoizePanelCalculations as any).cleanup();
    (this.memoizeShapeRendering as any).cleanup();
    (this.memoizeMessageProcessing as any).cleanup();

    console.log('T3000: All memoization caches cleaned up');
  }

  /**
   * Get memory usage estimation
   */
  public getMemoryUsage(): number {
    const stats = this.getAllCacheStats();
    return Object.values(stats).reduce((total, stat) => total + stat.memoryUsage, 0);
  }
}

// Export singleton instance
export const T3Memo = T3000MemoUtil.getInstance();

export default T3Memo;
