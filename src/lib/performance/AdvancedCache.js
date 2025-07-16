/**
 * Advanced Caching System
 * Implements LRU cache, cache invalidation, and smart prefetching
 */

export class AdvancedCache {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 30 * 60 * 1000; // 30 minutes default
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU tracking
    this.accessCount = new Map(); // For frequency tracking
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.lastCleanup = Date.now();
    this.cleanupInterval = options.cleanupInterval || 5 * 60 * 1000; // 5 minutes
    this.prefetchEnabled = options.prefetchEnabled !== false;
    this.prefetchThreshold = options.prefetchThreshold || 0.8; // 80% cache usage

    // Start periodic cleanup
    this.startCleanupTimer();
  }

  /**
   * Get item from cache
   * @param {string} key - Cache key
   * @returns {any} Cached value or undefined
   */
  get(key) {
    const now = Date.now();
    const item = this.cache.get(key);

    if (!item) {
      this.cacheMisses++;
      return undefined;
    }

    // Check if expired
    if (item.expiry && now > item.expiry) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.accessCount.delete(key);
      this.cacheMisses++;
      return undefined;
    }

    // Update access tracking
    this.accessOrder.set(key, now);
    this.accessCount.set(key, (this.accessCount.get(key) || 0) + 1);
    this.cacheHits++;

    return item.value;
  }

  /**
   * Set item in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache
   * @param {Object} options - Caching options
   */
  set(key, value, options = {}) {
    const now = Date.now();
    const ttl = options.ttl || this.ttl;
    const priority = options.priority || 'normal';

    // Check if we need to make space
    if (this.cache.size >= this.maxSize && !this.cache.has(key)) {
      this.evictLRU();
    }

    // Create cache item
    const item = {
      value,
      created: now,
      expiry: ttl > 0 ? now + ttl : null,
      priority,
      size: this.calculateSize(value),
      hits: 0
    };

    this.cache.set(key, item);
    this.accessOrder.set(key, now);
    this.accessCount.set(key, 0);

    // Trigger prefetch if needed
    if (this.prefetchEnabled && this.shouldPrefetch()) {
      this.triggerPrefetch(key, value);
    }
  }

  /**
   * Check if key exists in cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether key exists
   */
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;

    // Check if expired
    if (item.expiry && Date.now() > item.expiry) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete item from cache
   * @param {string} key - Cache key
   * @returns {boolean} Whether item was deleted
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    this.accessOrder.delete(key);
    this.accessCount.delete(key);
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.cache.clear();
    this.accessOrder.clear();
    this.accessCount.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Evict least recently used item
   */
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    // Find the least recently used item
    for (const [key, time] of this.accessOrder) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  /**
   * Evict by priority (low priority first)
   */
  evictByPriority() {
    const priorities = { low: 0, normal: 1, high: 2, critical: 3 };
    let lowestPriority = Infinity;
    let evictKey = null;

    for (const [key, item] of this.cache) {
      const priority = priorities[item.priority] || 1;
      if (priority < lowestPriority) {
        lowestPriority = priority;
        evictKey = key;
      }
    }

    if (evictKey) {
      this.delete(evictKey);
    }
  }

  /**
   * Calculate approximate size of value
   * @param {any} value - Value to measure
   * @returns {number} Approximate size in bytes
   */
  calculateSize(value) {
    if (typeof value === 'string') {
      return value.length * 2; // Assuming UTF-16
    } else if (typeof value === 'object') {
      return JSON.stringify(value).length * 2;
    } else {
      return 8; // Approximate for primitives
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getStats() {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    let totalSize = 0;
    let expiredCount = 0;
    const now = Date.now();

    for (const [key, item] of this.cache) {
      totalSize += item.size || 0;
      if (item.expiry && now > item.expiry) {
        expiredCount++;
      }
    }

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      totalSize,
      expiredCount,
      memoryUsage: Math.round((totalSize / 1024 / 1024) * 100) / 100 // MB
    };
  }

  /**
   * Get most accessed items
   * @param {number} limit - Number of items to return
   * @returns {Array} Most accessed items
   */
  getMostAccessed(limit = 10) {
    return Array.from(this.accessCount.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, limit)
      .map(([key, count]) => ({ key, accessCount: count }));
  }

  /**
   * Get cache keys by pattern
   * @param {RegExp|string} pattern - Pattern to match
   * @returns {Array} Matching keys
   */
  getKeysByPattern(pattern) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    return Array.from(this.cache.keys()).filter(key => regex.test(key));
  }

  /**
   * Invalidate cache entries by pattern
   * @param {RegExp|string} pattern - Pattern to match
   * @returns {number} Number of invalidated entries
   */
  invalidateByPattern(pattern) {
    const keys = this.getKeysByPattern(pattern);
    keys.forEach(key => this.delete(key));
    return keys.length;
  }

  /**
   * Preload cache with data
   * @param {Object} data - Key-value pairs to preload
   * @param {Object} options - Preload options
   */
  preload(data, options = {}) {
    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value, options);
    });
  }

  /**
   * Start periodic cleanup of expired entries
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache) {
      if (item.expiry && now > item.expiry) {
        this.delete(key);
        cleanedCount++;
      }
    }

    this.lastCleanup = now;

    if (cleanedCount > 0) {
      console.log(`[Advanced Cache] Cleaned ${cleanedCount} expired entries`);
    }
  }

  /**
   * Check if prefetching should be triggered
   * @returns {boolean} Whether to prefetch
   */
  shouldPrefetch() {
    const usage = this.cache.size / this.maxSize;
    return usage >= this.prefetchThreshold;
  }

  /**
   * Trigger prefetch for related data
   * @param {string} key - Current key
   * @param {any} value - Current value
   */
  triggerPrefetch(key, value) {
    // This is a placeholder for smart prefetching logic
    // In a real implementation, this would analyze patterns and prefetch related data
    console.log(`[Advanced Cache] Triggering prefetch for related data to: ${key}`);
  }

  /**
   * Export cache for persistence
   * @returns {Object} Serializable cache data
   */
  export() {
    const exported = {};
    const now = Date.now();

    for (const [key, item] of this.cache) {
      // Only export non-expired items
      if (!item.expiry || now < item.expiry) {
        exported[key] = {
          value: item.value,
          created: item.created,
          expiry: item.expiry,
          priority: item.priority
        };
      }
    }

    return {
      data: exported,
      stats: this.getStats(),
      exportTime: now
    };
  }

  /**
   * Import cache from exported data
   * @param {Object} exportedData - Previously exported cache data
   */
  import(exportedData) {
    if (!exportedData || !exportedData.data) return;

    const now = Date.now();
    let importedCount = 0;

    Object.entries(exportedData.data).forEach(([key, item]) => {
      // Check if item is still valid
      if (!item.expiry || now < item.expiry) {
        this.set(key, item.value, {
          ttl: item.expiry ? item.expiry - now : this.ttl,
          priority: item.priority
        });
        importedCount++;
      }
    });

    console.log(`[Advanced Cache] Imported ${importedCount} cache entries`);
  }
}

/**
 * Specialized cache for T3000 data
 */
export class T3000Cache extends AdvancedCache {
  constructor(options = {}) {
    super({
      maxSize: 200,
      ttl: 60 * 60 * 1000, // 1 hour for T3000 data
      ...options
    });

    this.deviceDataCache = new Map();
    this.projectCache = new Map();
    this.imageCache = new Map();
  }

  /**
   * Cache device data with special handling
   * @param {string} deviceId - Device identifier
   * @param {Object} data - Device data
   * @param {Object} options - Cache options
   */
  cacheDeviceData(deviceId, data, options = {}) {
    const key = `device:${deviceId}`;
    this.set(key, data, { ...options, priority: 'high' });
    this.deviceDataCache.set(deviceId, Date.now());
  }

  /**
   * Get device data from cache
   * @param {string} deviceId - Device identifier
   * @returns {Object|undefined} Cached device data
   */
  getDeviceData(deviceId) {
    const key = `device:${deviceId}`;
    return this.get(key);
  }

  /**
   * Cache project data
   * @param {string} projectId - Project identifier
   * @param {Object} project - Project data
   * @param {Object} options - Cache options
   */
  cacheProject(projectId, project, options = {}) {
    const key = `project:${projectId}`;
    this.set(key, project, { ...options, priority: 'high' });
    this.projectCache.set(projectId, Date.now());
  }

  /**
   * Get project from cache
   * @param {string} projectId - Project identifier
   * @returns {Object|undefined} Cached project data
   */
  getProject(projectId) {
    const key = `project:${projectId}`;
    return this.get(key);
  }

  /**
   * Cache image data
   * @param {string} imageId - Image identifier
   * @param {string|Blob} imageData - Image data
   * @param {Object} options - Cache options
   */
  cacheImage(imageId, imageData, options = {}) {
    const key = `image:${imageId}`;
    this.set(key, imageData, { ...options, priority: 'normal' });
    this.imageCache.set(imageId, Date.now());
  }

  /**
   * Get image from cache
   * @param {string} imageId - Image identifier
   * @returns {string|Blob|undefined} Cached image data
   */
  getImage(imageId) {
    const key = `image:${imageId}`;
    return this.get(key);
  }

  /**
   * Invalidate device-related cache
   * @param {string} deviceId - Device identifier
   */
  invalidateDevice(deviceId) {
    const pattern = new RegExp(`^device:${deviceId}`);
    return this.invalidateByPattern(pattern);
  }

  /**
   * Invalidate project-related cache
   * @param {string} projectId - Project identifier
   */
  invalidateProject(projectId) {
    const pattern = new RegExp(`^project:${projectId}`);
    return this.invalidateByPattern(pattern);
  }

  /**
   * Get T3000-specific statistics
   * @returns {Object} T3000 cache statistics
   */
  getT3000Stats() {
    const baseStats = this.getStats();

    return {
      ...baseStats,
      devicesCached: this.deviceDataCache.size,
      projectsCached: this.projectCache.size,
      imagesCached: this.imageCache.size,
      deviceKeys: this.getKeysByPattern(/^device:/).length,
      projectKeys: this.getKeysByPattern(/^project:/).length,
      imageKeys: this.getKeysByPattern(/^image:/).length
    };
  }
}

// Create global instances
export const advancedCache = new AdvancedCache();
export const t3000Cache = new T3000Cache();

// Vue composition API hooks
export function useAdvancedCache() {
  return {
    get: advancedCache.get.bind(advancedCache),
    set: advancedCache.set.bind(advancedCache),
    has: advancedCache.has.bind(advancedCache),
    delete: advancedCache.delete.bind(advancedCache),
    clear: advancedCache.clear.bind(advancedCache),
    getStats: advancedCache.getStats.bind(advancedCache),
    invalidateByPattern: advancedCache.invalidateByPattern.bind(advancedCache)
  };
}

export function useT3000Cache() {
  return {
    cacheDeviceData: t3000Cache.cacheDeviceData.bind(t3000Cache),
    getDeviceData: t3000Cache.getDeviceData.bind(t3000Cache),
    cacheProject: t3000Cache.cacheProject.bind(t3000Cache),
    getProject: t3000Cache.getProject.bind(t3000Cache),
    cacheImage: t3000Cache.cacheImage.bind(t3000Cache),
    getImage: t3000Cache.getImage.bind(t3000Cache),
    invalidateDevice: t3000Cache.invalidateDevice.bind(t3000Cache),
    invalidateProject: t3000Cache.invalidateProject.bind(t3000Cache),
    getT3000Stats: t3000Cache.getT3000Stats.bind(t3000Cache)
  };
}

export default AdvancedCache;
