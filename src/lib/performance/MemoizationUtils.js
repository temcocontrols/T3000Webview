/**
 * Memoization Utilities for Performance Optimization
 * Provides caching mechanisms for expensive computations
 */

/**
 * Simple memoization function with LRU cache
 * @param {Function} fn - Function to memoize
 * @param {number} maxSize - Maximum cache size (default: 100)
 * @returns {Function} Memoized function
 */
export function memoize(fn, maxSize = 100) {
  const cache = new Map();
  const keyOrder = [];

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      // Move to end (most recently used)
      const index = keyOrder.indexOf(key);
      if (index > -1) {
        keyOrder.splice(index, 1);
        keyOrder.push(key);
      }
      return cache.get(key);
    }

    const result = fn.apply(this, args);

    // Add to cache
    cache.set(key, result);
    keyOrder.push(key);

    // Remove oldest if cache is full
    if (cache.size > maxSize) {
      const oldestKey = keyOrder.shift();
      cache.delete(oldestKey);
    }

    return result;
  };
}

/**
 * Debounced memoization for frequently called functions
 * @param {Function} fn - Function to memoize
 * @param {number} delay - Debounce delay in ms
 * @param {number} maxSize - Maximum cache size
 * @returns {Function} Debounced memoized function
 */
export function memoizeDebounced(fn, delay = 300, maxSize = 50) {
  const cache = new Map();
  const timers = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    // Clear existing timer for this key
    if (timers.has(key)) {
      clearTimeout(timers.get(key));
    }

    // Set new timer
    const timer = setTimeout(() => {
      const result = fn.apply(this, args);
      cache.set(key, result);

      // Remove oldest if cache is full
      if (cache.size > maxSize) {
        const oldestKey = cache.keys().next().value;
        cache.delete(oldestKey);
      }

      timers.delete(key);
    }, delay);

    timers.set(key, timer);

    // Return cached result or undefined for first call
    return cache.get(key);
  };
}

/**
 * Memoization for async functions
 * @param {Function} fn - Async function to memoize
 * @param {number} maxSize - Maximum cache size
 * @param {number} ttl - Time to live in ms (optional)
 * @returns {Function} Memoized async function
 */
export function memoizeAsync(fn, maxSize = 50, ttl = null) {
  const cache = new Map();
  const keyOrder = [];
  const timestamps = ttl ? new Map() : null;

  return async function(...args) {
    const key = JSON.stringify(args);
    const now = Date.now();

    // Check TTL if enabled
    if (ttl && timestamps && timestamps.has(key)) {
      if (now - timestamps.get(key) > ttl) {
        cache.delete(key);
        timestamps.delete(key);
        const index = keyOrder.indexOf(key);
        if (index > -1) keyOrder.splice(index, 1);
      }
    }

    if (cache.has(key)) {
      // Move to end (most recently used)
      const index = keyOrder.indexOf(key);
      if (index > -1) {
        keyOrder.splice(index, 1);
        keyOrder.push(key);
      }
      return cache.get(key);
    }

    try {
      const result = await fn.apply(this, args);

      // Add to cache
      cache.set(key, result);
      keyOrder.push(key);
      if (timestamps) timestamps.set(key, now);

      // Remove oldest if cache is full
      if (cache.size > maxSize) {
        const oldestKey = keyOrder.shift();
        cache.delete(oldestKey);
        if (timestamps) timestamps.delete(oldestKey);
      }

      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  };
}

/**
 * Create a memoized selector for computed properties
 * @param {Function} selector - Selector function
 * @param {Function} equalityFn - Equality comparison function
 * @returns {Function} Memoized selector
 */
export function createMemoizedSelector(selector, equalityFn = (a, b) => a === b) {
  let lastArgs = [];
  let lastResult;
  let hasResult = false;

  return function(...args) {
    if (!hasResult || !argsEqual(args, lastArgs, equalityFn)) {
      lastArgs = args;
      lastResult = selector(...args);
      hasResult = true;
    }
    return lastResult;
  };
}

/**
 * Check if arrays are equal using provided equality function
 * @param {Array} a - First array
 * @param {Array} b - Second array
 * @param {Function} equalityFn - Equality function
 * @returns {boolean} Whether arrays are equal
 */
function argsEqual(a, b, equalityFn) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (!equalityFn(a[i], b[i])) return false;
  }
  return true;
}

/**
 * Weak memoization using WeakMap for object keys
 * @param {Function} fn - Function to memoize
 * @returns {Function} Weakly memoized function
 */
export function weakMemoize(fn) {
  const cache = new WeakMap();

  return function(obj, ...args) {
    if (typeof obj !== 'object' || obj === null) {
      // Fallback to regular memoization for primitives
      return memoize(fn).call(this, obj, ...args);
    }

    if (!cache.has(obj)) {
      cache.set(obj, new Map());
    }

    const objCache = cache.get(obj);
    const key = JSON.stringify(args);

    if (objCache.has(key)) {
      return objCache.get(key);
    }

    const result = fn.call(this, obj, ...args);
    objCache.set(key, result);

    return result;
  };
}

/**
 * Memoization utilities for Vue composables
 */
export const vueMemoUtils = {
  /**
   * Memoize a computed property
   * @param {Function} computeFn - Compute function
   * @param {Array} dependencies - Reactive dependencies
   * @returns {Object} Memoized computed
   */
  memoizedComputed(computeFn, dependencies = []) {
    const cache = new Map();

    return computed(() => {
      const key = dependencies.map(dep => unref(dep)).join('|');

      if (cache.has(key)) {
        return cache.get(key);
      }

      const result = computeFn();
      cache.set(key, result);

      // Clean cache if it gets too large
      if (cache.size > 100) {
        const firstKey = cache.keys().next().value;
        cache.delete(firstKey);
      }

      return result;
    });
  },

  /**
   * Memoize a watcher callback
   * @param {Function} callback - Watch callback
   * @param {number} maxSize - Maximum cache size
   * @returns {Function} Memoized callback
   */
  memoizedWatch(callback, maxSize = 50) {
    return memoize(callback, maxSize);
  }
};

export default {
  memoize,
  memoizeDebounced,
  memoizeAsync,
  createMemoizedSelector,
  weakMemoize,
  vueMemoUtils
};
