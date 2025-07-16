/**
 * Progressive Loading Manager
 * Implements progressive loading strategies for images, data, and components
 */

export class ProgressiveLoader {
  constructor() {
    this.imageObserver = null;
    this.dataLoaders = new Map();
    this.loadQueue = [];
    this.isProcessing = false;
    this.retryAttempts = new Map();
    this.maxRetries = 3;

    this.setupIntersectionObserver();
  }

  /**
   * Setup intersection observer for lazy loading
   */
  setupIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      this.imageObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              this.loadImage(entry.target);
              this.imageObserver.unobserve(entry.target);
            }
          });
        },
        {
          rootMargin: '50px 0px',
          threshold: 0.01
        }
      );
    }
  }

  /**
   * Register image for progressive loading
   * @param {HTMLImageElement} img - Image element
   * @param {Object} options - Loading options
   */
  registerImage(img, options = {}) {
    // Validate image element
    if (!img || !(img instanceof HTMLElement)) {
      console.warn('[Progressive Loader] Invalid image element provided:', img);
      return;
    }

    const {
      placeholder = '/assets/placeholder.png',
      errorFallback = '/assets/img/error.png',
      onLoad = null,
      onError = null,
      priority = 'normal'
    } = options;

    try {
      // Set placeholder
      if (!img.src || img.src.includes('placeholder')) {
        img.src = placeholder;
      }

      // Store original src and options
      img.dataset.originalSrc = img.dataset.originalSrc || img.getAttribute('data-src');
      img.dataset.errorFallback = errorFallback;
      img.dataset.priority = priority;

      if (onLoad) {
        img.addEventListener('load', onLoad, { once: true });
      }

      if (onError) {
        img.addEventListener('error', onError, { once: true });
      }

      // Add to intersection observer
      if (this.imageObserver) {
        this.imageObserver.observe(img);
      } else {
        // Fallback for browsers without IntersectionObserver
        this.loadImage(img);
      }
    } catch (error) {
      console.error('[Progressive Loader] Error registering image:', error, img);
    }
  }

  /**
   * Load image progressively
   * @param {HTMLImageElement} img - Image element
   */
  async loadImage(img) {
    // Validate image element
    if (!img || !(img instanceof HTMLElement)) {
      console.warn('[Progressive Loader] Invalid image element in loadImage:', img);
      return Promise.reject(new Error('Invalid image element'));
    }

    const originalSrc = img.dataset.originalSrc;
    const errorFallback = img.dataset.errorFallback;
    const priority = img.dataset.priority || 'normal';

    if (!originalSrc) return;

    try {
      // Create new image to preload
      const newImg = new Image();

      // Set loading priority
      if (priority === 'high') {
        newImg.fetchPriority = 'high';
      } else if (priority === 'low') {
        newImg.fetchPriority = 'low';
      }

      // Add to retry tracking
      const retryKey = `img-${originalSrc}`;
      const retryCount = this.retryAttempts.get(retryKey) || 0;

      return new Promise((resolve, reject) => {
        newImg.onload = () => {
          // Check if img element is still valid and connected to DOM
          if (!img || !img.isConnected) {
            console.warn('[Progressive Loader] Image element no longer in DOM:', originalSrc);
            resolve();
            return;
          }

          // Progressive reveal effect
          img.style.opacity = '0';
          img.src = originalSrc;

          // Fade in animation
          requestAnimationFrame(() => {
            if (img && img.style) {
              img.style.transition = 'opacity 0.3s ease-in-out';
              img.style.opacity = '1';
            }
          });

          this.retryAttempts.delete(retryKey);
          resolve();
        };

        newImg.onerror = () => {
          if (retryCount < this.maxRetries) {
            // Retry with exponential backoff
            this.retryAttempts.set(retryKey, retryCount + 1);
            setTimeout(() => {
              this.loadImage(img);
            }, Math.pow(2, retryCount) * 1000);
          } else {
            // Use error fallback
            if (errorFallback) {
              img.src = errorFallback;
            }
            this.retryAttempts.delete(retryKey);
            reject(new Error(`Failed to load image: ${originalSrc}`));
          }
        };

        newImg.src = originalSrc;
      });
    } catch (error) {
      console.error('[Progressive Loader] Image loading failed:', error);
      if (errorFallback) {
        img.src = errorFallback;
      }
    }
  }

  /**
   * Create progressive data loader
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Loading options
   * @returns {Object} Data loader
   */
  createDataLoader(endpoint, options = {}) {
    const {
      pageSize = 50,
      preloadThreshold = 10,
      cacheKey = endpoint,
      onProgress = null,
      onError = null,
      maxRetries = 3
    } = options;

    const loader = {
      endpoint,
      pageSize,
      preloadThreshold,
      cacheKey,
      currentPage: 0,
      totalPages: 0,
      data: [],
      isLoading: false,
      hasMore: true,
      error: null,
      onProgress,
      onError,
      maxRetries,
      retryCount: 0
    };

    this.dataLoaders.set(cacheKey, loader);
    return loader;
  }

  /**
   * Load next page of data
   * @param {string} cacheKey - Data loader cache key
   * @returns {Promise} Load promise
   */
  async loadNextPage(cacheKey) {
    const loader = this.dataLoaders.get(cacheKey);

    if (!loader || loader.isLoading || !loader.hasMore) {
      return { data: [], hasMore: false };
    }

    loader.isLoading = true;
    loader.error = null;

    try {
      const response = await fetch(`${loader.endpoint}?page=${loader.currentPage}&size=${loader.pageSize}`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      const newData = Array.isArray(result) ? result : result.data || [];

      loader.data.push(...newData);
      loader.currentPage++;
      loader.totalPages = result.totalPages || Math.ceil(result.total / loader.pageSize) || 0;
      loader.hasMore = loader.currentPage < loader.totalPages || newData.length === loader.pageSize;
      loader.retryCount = 0;

      if (loader.onProgress) {
        loader.onProgress({
          currentPage: loader.currentPage,
          totalPages: loader.totalPages,
          loadedItems: loader.data.length,
          newItems: newData.length
        });
      }

      return {
        data: newData,
        hasMore: loader.hasMore,
        total: loader.data.length
      };
    } catch (error) {
      console.error('[Progressive Loader] Data loading failed:', error);

      loader.error = error;

      if (loader.retryCount < loader.maxRetries) {
        loader.retryCount++;
        // Retry with exponential backoff
        setTimeout(() => {
          loader.isLoading = false;
          this.loadNextPage(cacheKey);
        }, Math.pow(2, loader.retryCount) * 1000);
      } else {
        if (loader.onError) {
          loader.onError(error);
        }
      }

      throw error;
    } finally {
      loader.isLoading = false;
    }
  }

  /**
   * Preload next page when threshold is reached
   * @param {string} cacheKey - Data loader cache key
   * @param {number} currentIndex - Current viewing index
   */
  async preloadIfNeeded(cacheKey, currentIndex) {
    const loader = this.dataLoaders.get(cacheKey);

    if (!loader) return;

    const remainingItems = loader.data.length - currentIndex;

    if (remainingItems <= loader.preloadThreshold && loader.hasMore && !loader.isLoading) {
      try {
        await this.loadNextPage(cacheKey);
      } catch (error) {
        console.warn('[Progressive Loader] Preload failed:', error);
      }
    }
  }

  /**
   * Create skeleton screen component
   * @param {Object} config - Skeleton configuration
   * @returns {string} HTML string for skeleton
   */
  createSkeleton(config = {}) {
    const {
      rows = 3,
      width = '100%',
      height = '20px',
      borderRadius = '4px',
      animation = 'pulse'
    } = config;

    const skeletonItems = Array.from({ length: rows }, (_, index) => {
      const itemWidth = Array.isArray(width) ? width[index] || '100%' : width;
      return `
        <div class="skeleton-item" style="
          width: ${itemWidth};
          height: ${height};
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          border-radius: ${borderRadius};
          margin-bottom: 10px;
          animation: ${animation} 1.5s ease-in-out infinite;
        "></div>
      `;
    }).join('');

    return `
      <div class="skeleton-container">
        <style>
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
          @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: calc(200px + 100%) 0; }
          }
        </style>
        ${skeletonItems}
      </div>
    `;
  }

  /**
   * Load resources based on priority
   * @param {Array} resources - Resources to load
   * @param {Object} options - Loading options
   */
  async loadResourcesByPriority(resources, options = {}) {
    const {
      highPriorityFirst = true,
      maxConcurrent = 3,
      onProgress = null
    } = options;

    // Sort by priority
    const sortedResources = resources.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    let loaded = 0;
    const total = resources.length;

    // Process in batches
    for (let i = 0; i < sortedResources.length; i += maxConcurrent) {
      const batch = sortedResources.slice(i, i + maxConcurrent);

      const batchPromises = batch.map(async (resource) => {
        try {
          await this.loadResource(resource);
          loaded++;
          if (onProgress) {
            onProgress({ loaded, total, current: resource });
          }
        } catch (error) {
          console.error('[Progressive Loader] Resource loading failed:', resource, error);
        }
      });

      await Promise.allSettled(batchPromises);
    }
  }

  /**
   * Load individual resource
   * @param {Object} resource - Resource to load
   */
  async loadResource(resource) {
    const { type, url, element } = resource;

    switch (type) {
      case 'image':
        return element ? this.loadImage(element) : this.preloadImage(url);
      case 'script':
        return this.loadScript(url);
      case 'stylesheet':
        return this.loadStylesheet(url);
      case 'data':
        return this.loadData(url);
      default:
        throw new Error(`Unknown resource type: ${type}`);
    }
  }

  /**
   * Preload image without displaying
   * @param {string} url - Image URL
   */
  async preloadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
  }

  /**
   * Load script dynamically
   * @param {string} url - Script URL
   */
  async loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Load stylesheet dynamically
   * @param {string} url - Stylesheet URL
   */
  async loadStylesheet(url) {
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.onload = resolve;
      link.onerror = reject;
      document.head.appendChild(link);
    });
  }

  /**
   * Load data from URL
   * @param {string} url - Data URL
   */
  async loadData(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Clear all loaders and observers
   */
  destroy() {
    if (this.imageObserver) {
      this.imageObserver.disconnect();
      this.imageObserver = null;
    }

    this.dataLoaders.clear();
    this.loadQueue = [];
    this.retryAttempts.clear();
  }
}

// Create global instance
export const progressiveLoader = new ProgressiveLoader();

// Vue composition API hook
export function useProgressiveLoader() {
  return {
    registerImage: progressiveLoader.registerImage.bind(progressiveLoader),
    createDataLoader: progressiveLoader.createDataLoader.bind(progressiveLoader),
    loadNextPage: progressiveLoader.loadNextPage.bind(progressiveLoader),
    preloadIfNeeded: progressiveLoader.preloadIfNeeded.bind(progressiveLoader),
    createSkeleton: progressiveLoader.createSkeleton.bind(progressiveLoader),
    loadResourcesByPriority: progressiveLoader.loadResourcesByPriority.bind(progressiveLoader)
  };
}

export default ProgressiveLoader;
