/**
 * T3000 Component Lazy Loading System
 * Provides intelligent async component loading with caching and retry mechanisms
 */

import { defineAsyncComponent, Component, AsyncComponentLoader } from 'vue';

export interface LazyLoadOptions {
  retryAttempts?: number;
  retryDelay?: number;
  timeout?: number;
  loadingComponent?: Component;
  errorComponent?: Component;
  preload?: boolean;
  cacheKey?: string;
}

export interface ComponentCache {
  component: Component;
  loadedAt: number;
  accessCount: number;
  lastAccessed: number;
}

export interface LoadingStats {
  totalLoads: number;
  successfulLoads: number;
  failedLoads: number;
  cacheHits: number;
  averageLoadTime: number;
}

/**
 * Component Lazy Loader with advanced features
 */
export class ComponentLazyLoader {
  private static instance: ComponentLazyLoader;
  private componentCache: Map<string, ComponentCache> = new Map();
  private loadingPromises: Map<string, Promise<Component>> = new Map();
  private stats: LoadingStats = {
    totalLoads: 0,
    successfulLoads: 0,
    failedLoads: 0,
    cacheHits: 0,
    averageLoadTime: 0
  };
  private loadTimes: number[] = [];

  private constructor() {}

  public static getInstance(): ComponentLazyLoader {
    if (!ComponentLazyLoader.instance) {
      ComponentLazyLoader.instance = new ComponentLazyLoader();
    }
    return ComponentLazyLoader.instance;
  }

  /**
   * Create lazy loaded component with advanced options
   */
  public createLazyComponent(
    loader: AsyncComponentLoader,
    options: LazyLoadOptions = {}
  ): Component {
    const {
      retryAttempts = 3,
      retryDelay = 1000,
      timeout = 30000,
      loadingComponent,
      errorComponent,
      preload = false,
      cacheKey
    } = options;

    const componentLoader = async (): Promise<Component> => {
      const key = cacheKey || this.generateCacheKey(loader);

      // Check cache first
      if (this.componentCache.has(key)) {
        const cached = this.componentCache.get(key)!;
        cached.accessCount++;
        cached.lastAccessed = Date.now();
        this.stats.cacheHits++;
        return cached.component;
      }

      // Check if already loading
      if (this.loadingPromises.has(key)) {
        return this.loadingPromises.get(key)!;
      }

      // Start loading
      const loadPromise = this.loadComponentWithRetry(loader, retryAttempts, retryDelay, key);
      this.loadingPromises.set(key, loadPromise);

      try {
        const component = await loadPromise;
        this.loadingPromises.delete(key);
        return component;
      } catch (error) {
        this.loadingPromises.delete(key);
        throw error;
      }
    };

    const asyncComponent = defineAsyncComponent({
      loader: componentLoader,
      loadingComponent,
      errorComponent,
      delay: 200,
      timeout,
      suspensible: false
    });

    // Preload if requested
    if (preload) {
      this.preloadComponent(componentLoader);
    }

    return asyncComponent;
  }

  /**
   * Load component with retry logic
   */
  private async loadComponentWithRetry(
    loader: AsyncComponentLoader,
    retryAttempts: number,
    retryDelay: number,
    cacheKey: string
  ): Promise<Component> {
    const startTime = performance.now();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        this.stats.totalLoads++;

        const componentModule = await loader();
        const component = componentModule.default || componentModule;

        // Cache the component
        this.componentCache.set(cacheKey, {
          component,
          loadedAt: Date.now(),
          accessCount: 1,
          lastAccessed: Date.now()
        });

        // Update stats
        const loadTime = performance.now() - startTime;
        this.loadTimes.push(loadTime);
        this.stats.successfulLoads++;
        this.updateAverageLoadTime();

        console.log(`T3000: Component loaded successfully in ${loadTime}ms (attempt ${attempt + 1})`);
        return component;

      } catch (error) {
        lastError = error as Error;
        console.warn(`T3000: Component load attempt ${attempt + 1} failed:`, error);

        // If not the last attempt, wait before retrying
        if (attempt < retryAttempts) {
          await this.delay(retryDelay * Math.pow(2, attempt)); // Exponential backoff
        }
      }
    }

    // All attempts failed
    this.stats.failedLoads++;
    throw new Error(`Component loading failed after ${retryAttempts + 1} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Preload component in background
   */
  private async preloadComponent(loader: () => Promise<Component>): void {
    try {
      await loader();
      console.log('T3000: Component preloaded successfully');
    } catch (error) {
      console.warn('T3000: Component preload failed:', error);
    }
  }

  /**
   * Generate cache key for component
   */
  private generateCacheKey(loader: AsyncComponentLoader): string {
    // Try to extract meaningful identifier from loader function
    const loaderString = loader.toString();
    const match = loaderString.match(/import\(['"`](.+?)['"`]\)/);
    if (match) {
      return match[1];
    }

    // Fallback to hash of function string
    return this.simpleHash(loaderString);
  }

  /**
   * Simple hash function for cache keys
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Delay utility for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(): void {
    if (this.loadTimes.length > 0) {
      const sum = this.loadTimes.reduce((a, b) => a + b, 0);
      this.stats.averageLoadTime = sum / this.loadTimes.length;

      // Keep only last 100 load times to prevent memory bloat
      if (this.loadTimes.length > 100) {
        this.loadTimes = this.loadTimes.slice(-100);
      }
    }
  }

  /**
   * Batch preload multiple components
   */
  public async batchPreload(loaders: AsyncComponentLoader[]): Promise<void> {
    const preloadPromises = loaders.map(loader =>
      this.preloadComponent(async () => {
        const module = await loader();
        return module.default || module;
      })
    );

    try {
      await Promise.allSettled(preloadPromises);
      console.log(`T3000: Batch preloaded ${loaders.length} components`);
    } catch (error) {
      console.warn('T3000: Batch preload failed:', error);
    }
  }

  /**
   * Clear component cache
   */
  public clearCache(): void {
    this.componentCache.clear();
    this.loadingPromises.clear();
    console.log('T3000: Component cache cleared');
  }

  /**
   * Remove expired components from cache
   */
  public cleanupCache(maxAge: number = 1800000): void { // 30 minutes default
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [key, cache] of this.componentCache.entries()) {
      if (now - cache.lastAccessed > maxAge) {
        toRemove.push(key);
      }
    }

    toRemove.forEach(key => this.componentCache.delete(key));

    if (toRemove.length > 0) {
      console.log(`T3000: Cleaned up ${toRemove.length} expired components from cache`);
    }
  }

  /**
   * Get cache statistics
   */
  public getCacheStats() {
    const cacheEntries = Array.from(this.componentCache.values());
    const totalAccess = cacheEntries.reduce((sum, cache) => sum + cache.accessCount, 0);

    return {
      ...this.stats,
      cacheSize: this.componentCache.size,
      totalCacheAccess: totalAccess,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage of cache
   */
  private estimateMemoryUsage(): number {
    // Rough estimate: each cached component uses ~10KB
    return this.componentCache.size * 10240; // bytes
  }

  /**
   * Get loading statistics
   */
  public getLoadingStats(): LoadingStats {
    return { ...this.stats };
  }
}

/**
 * T3000-specific lazy loading utilities
 */
export class T3000LazyLoad {
  private static instance: T3000LazyLoad;
  private loader: ComponentLazyLoader;

  private constructor() {
    this.loader = ComponentLazyLoader.getInstance();
  }

  public static getInstance(): T3000LazyLoad {
    if (!T3000LazyLoad.instance) {
      T3000LazyLoad.instance = new T3000LazyLoad();
    }
    return T3000LazyLoad.instance;
  }

  /**
   * Lazy load T3000 drawing components
   */
  public loadDrawingComponent(componentName: string) {
    return this.loader.createLazyComponent(
      () => import(`../Hvac/Basic/B.${componentName}.ts`),
      {
        retryAttempts: 3,
        retryDelay: 1000,
        timeout: 15000,
        cacheKey: `drawing_${componentName}`,
        preload: false
      }
    );
  }

  /**
   * Lazy load T3000 UI components
   */
  public loadUIComponent(componentName: string) {
    return this.loader.createLazyComponent(
      () => import(`../Hvac/Opt/UI/${componentName}.ts`),
      {
        retryAttempts: 2,
        retryDelay: 500,
        timeout: 10000,
        cacheKey: `ui_${componentName}`,
        preload: false
      }
    );
  }

  /**
   * Lazy load T3000 shape components
   */
  public loadShapeComponent(shapeName: string) {
    return this.loader.createLazyComponent(
      () => import(`../Hvac/Shape/${shapeName}.ts`),
      {
        retryAttempts: 2,
        retryDelay: 800,
        timeout: 12000,
        cacheKey: `shape_${shapeName}`,
        preload: true // Preload shapes for better UX
      }
    );
  }

  /**
   * Lazy load Vue page components
   */
  public loadPageComponent(pageName: string) {
    return this.loader.createLazyComponent(
      () => import(`../../pages/${pageName}.vue`),
      {
        retryAttempts: 3,
        retryDelay: 1500,
        timeout: 20000,
        cacheKey: `page_${pageName}`,
        preload: false,
        loadingComponent: this.createLoadingComponent(),
        errorComponent: this.createErrorComponent()
      }
    );
  }

  /**
   * Preload critical T3000 components
   */
  public async preloadCriticalComponents(): Promise<void> {
    const criticalComponents = [
      () => import('../Hvac/Basic/B.Element.ts'),
      () => import('../Hvac/Basic/B.Container.ts'),
      () => import('../Hvac/Basic/B.Group.ts'),
      () => import('../Hvac/Util/T3Util.ts'),
      () => import('../Hvac/Util/T3Svg.ts')
    ];

    await this.loader.batchPreload(criticalComponents);
  }

  /**
   * Preload shape library components
   */
  public async preloadShapeLibrary(): Promise<void> {
    const shapeComponents = [
      () => import('../Hvac/Shape/AirConditioning.ts'),
      () => import('../Hvac/Shape/Fan.ts'),
      () => import('../Hvac/Shape/Damper.ts'),
      () => import('../Hvac/Shape/Sensor.ts'),
      () => import('../Hvac/Shape/Valve.ts')
    ];

    await this.loader.batchPreload(shapeComponents);
  }

  /**
   * Create loading component
   */
  private createLoadingComponent() {
    return {
      template: `
        <div class="t3000-loading">
          <div class="loading-spinner"></div>
          <div class="loading-text">Loading T3000 Component...</div>
        </div>
      `,
      style: `
        .t3000-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #666;
        }
        .loading-spinner {
          width: 24px;
          height: 24px;
          border: 2px solid #f3f3f3;
          border-top: 2px solid #007bff;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        .loading-text {
          margin-top: 10px;
          font-size: 14px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `
    };
  }

  /**
   * Create error component
   */
  private createErrorComponent() {
    return {
      template: `
        <div class="t3000-error">
          <div class="error-icon">⚠️</div>
          <div class="error-text">Failed to load T3000 component</div>
          <button @click="retry" class="retry-button">Retry</button>
        </div>
      `,
      methods: {
        retry() {
          window.location.reload();
        }
      },
      style: `
        .t3000-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
          color: #dc3545;
        }
        .error-icon {
          font-size: 24px;
          margin-bottom: 10px;
        }
        .error-text {
          margin-bottom: 15px;
          font-size: 14px;
        }
        .retry-button {
          padding: 8px 16px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        .retry-button:hover {
          background: #0056b3;
        }
      `
    };
  }

  /**
   * Get component loading statistics
   */
  public getStats() {
    return this.loader.getCacheStats();
  }

  /**
   * Clear all component caches
   */
  public clearCache(): void {
    this.loader.clearCache();
  }

  /**
   * Cleanup expired components
   */
  public cleanup(): void {
    this.loader.cleanupCache();
  }
}

// Export singleton instance
export const T3LazyLoad = T3000LazyLoad.getInstance();

// Export utility functions for easy use
export const lazyLoadT3Component = (type: 'drawing' | 'ui' | 'shape' | 'page', name: string) => {
  switch (type) {
    case 'drawing':
      return T3LazyLoad.loadDrawingComponent(name);
    case 'ui':
      return T3LazyLoad.loadUIComponent(name);
    case 'shape':
      return T3LazyLoad.loadShapeComponent(name);
    case 'page':
      return T3LazyLoad.loadPageComponent(name);
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
};

export default T3LazyLoad;
