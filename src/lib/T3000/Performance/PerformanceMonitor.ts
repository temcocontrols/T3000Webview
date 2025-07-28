/**
 * T3000 Performance Monitor
 * Real-time performance tracking and optimization
 */

export interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  bundleSize: number;
  cacheHitRatio: number;
  networkLatency: number;
  timestamp: number;
}

export interface WebVitals {
  FCP: number; // First Contentful Paint
  LCP: number; // Largest Contentful Paint
  FID: number; // First Input Delay
  CLS: number; // Cumulative Layout Shift
  TTFB: number; // Time to First Byte
}

export interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  domNodes: number;
  eventListeners: number;
}

/**
 * Performance monitoring and optimization utility
 */
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private vitals: Partial<WebVitals> = {};
  private observers: Map<string, PerformanceObserver> = new Map();
  private intervalId: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  private constructor() {
    this.initializeObservers();
  }

  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers(): void {
    if (!('PerformanceObserver' in window)) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    // Observe paint metrics (FCP, LCP)
    try {
      const paintObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            this.vitals.FCP = entry.startTime;
          }
        }
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.set('paint', paintObserver);
    } catch (error) {
      console.warn('Paint observer not supported:', error);
    }

    // Observe largest contentful paint
    try {
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          const lastEntry = entries[entries.length - 1];
          this.vitals.LCP = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.set('lcp', lcpObserver);
    } catch (error) {
      console.warn('LCP observer not supported:', error);
    }

    // Observe first input delay
    try {
      const fidObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.processingStart && entry.startTime) {
            this.vitals.FID = entry.processingStart - entry.startTime;
          }
        }
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.set('fid', fidObserver);
    } catch (error) {
      console.warn('FID observer not supported:', error);
    }

    // Observe layout shifts
    try {
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            clsValue += (entry as any).value;
          }
        }
        this.vitals.CLS = clsValue;
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.set('cls', clsObserver);
    } catch (error) {
      console.warn('CLS observer not supported:', error);
    }

    // Observe navigation timing
    try {
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const navEntry = entry as PerformanceNavigationTiming;
          this.vitals.TTFB = navEntry.responseStart - navEntry.requestStart;
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.set('navigation', navigationObserver);
    } catch (error) {
      console.warn('Navigation observer not supported:', error);
    }
  }

  /**
   * Start monitoring performance
   */
  public startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    console.log('Starting T3000 performance monitoring');

    // Collect metrics at regular intervals
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, interval);

    // Initial collection
    this.collectMetrics();
  }

  /**
   * Stop monitoring performance
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    console.log('Stopping T3000 performance monitoring');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Disconnect observers
    this.observers.forEach((observer) => {
      observer.disconnect();
    });
    this.observers.clear();
  }

  /**
   * Collect current performance metrics
   */
  private collectMetrics(): void {
    const metrics: PerformanceMetrics = {
      loadTime: this.getLoadTime(),
      renderTime: this.getRenderTime(),
      memoryUsage: this.getMemoryUsage(),
      bundleSize: this.getBundleSize(),
      cacheHitRatio: this.getCacheHitRatio(),
      networkLatency: this.getNetworkLatency(),
      timestamp: Date.now()
    };

    this.metrics.push(metrics);

    // Keep only last 100 metrics to prevent memory bloat
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }

    this.analyzePerformance(metrics);
  }

  /**
   * Get page load time
   */
  private getLoadTime(): number {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      return perfData.loadEventEnd - perfData.navigationStart;
    }
    return 0;
  }

  /**
   * Get render time
   */
  private getRenderTime(): number {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      return perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart;
    }
    return 0;
  }

  /**
   * Get memory usage information
   */
  private getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return memory.usedJSHeapSize / 1048576; // Convert to MB
    }
    return 0;
  }

  /**
   * Get detailed memory information
   */
  public getDetailedMemoryInfo(): MemoryInfo {
    const info: MemoryInfo = {
      usedJSHeapSize: 0,
      totalJSHeapSize: 0,
      jsHeapSizeLimit: 0,
      domNodes: document.querySelectorAll('*').length,
      eventListeners: this.countEventListeners()
    };

    if ('memory' in performance) {
      const memory = (performance as any).memory;
      info.usedJSHeapSize = memory.usedJSHeapSize;
      info.totalJSHeapSize = memory.totalJSHeapSize;
      info.jsHeapSizeLimit = memory.jsHeapSizeLimit;
    }

    return info;
  }

  /**
   * Count event listeners (approximation)
   */
  private countEventListeners(): number {
    const elements = document.querySelectorAll('*');
    let count = 0;

    elements.forEach(element => {
      const events = (element as any)._events;
      if (events) {
        count += Object.keys(events).length;
      }
    });

    return count;
  }

  /**
   * Estimate bundle size from loaded resources
   */
  private getBundleSize(): number {
    const resources = performance.getEntriesByType('resource');
    let totalSize = 0;

    resources.forEach(resource => {
      if (resource.name.includes('.js') || resource.name.includes('.css')) {
        totalSize += (resource as any).transferSize || 0;
      }
    });

    return totalSize / 1048576; // Convert to MB
  }

  /**
   * Calculate cache hit ratio
   */
  private getCacheHitRatio(): number {
    const resources = performance.getEntriesByType('resource');
    let cached = 0;
    let total = 0;

    resources.forEach(resource => {
      total++;
      const transferSize = (resource as any).transferSize;
      const encodedBodySize = (resource as any).encodedBodySize;

      // If transfer size is significantly smaller than encoded size, likely cached
      if (transferSize < encodedBodySize * 0.1) {
        cached++;
      }
    });

    return total > 0 ? (cached / total) * 100 : 0;
  }

  /**
   * Get network latency
   */
  private getNetworkLatency(): number {
    const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (perfData) {
      return perfData.responseStart - perfData.requestStart;
    }
    return 0;
  }

  /**
   * Analyze performance and log warnings
   */
  private analyzePerformance(metrics: PerformanceMetrics): void {
    // Check for performance issues
    if (metrics.loadTime > 3000) {
      console.warn(`T3000: Slow load time detected: ${metrics.loadTime}ms`);
    }

    if (metrics.memoryUsage > 100) {
      console.warn(`T3000: High memory usage detected: ${metrics.memoryUsage}MB`);
    }

    if (metrics.cacheHitRatio < 50) {
      console.warn(`T3000: Low cache hit ratio: ${metrics.cacheHitRatio}%`);
    }

    if (this.vitals.FCP && this.vitals.FCP > 1800) {
      console.warn(`T3000: Slow First Contentful Paint: ${this.vitals.FCP}ms`);
    }

    if (this.vitals.LCP && this.vitals.LCP > 2500) {
      console.warn(`T3000: Slow Largest Contentful Paint: ${this.vitals.LCP}ms`);
    }

    if (this.vitals.FID && this.vitals.FID > 100) {
      console.warn(`T3000: High First Input Delay: ${this.vitals.FID}ms`);
    }

    if (this.vitals.CLS && this.vitals.CLS > 0.1) {
      console.warn(`T3000: High Cumulative Layout Shift: ${this.vitals.CLS}`);
    }
  }

  /**
   * Get current Web Vitals
   */
  public getWebVitals(): Partial<WebVitals> {
    return { ...this.vitals };
  }

  /**
   * Get recent performance metrics
   */
  public getRecentMetrics(count: number = 10): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary() {
    if (this.metrics.length === 0) {
      return null;
    }

    const recent = this.metrics.slice(-10);
    const avgLoadTime = recent.reduce((sum, m) => sum + m.loadTime, 0) / recent.length;
    const avgMemoryUsage = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;
    const avgCacheHitRatio = recent.reduce((sum, m) => sum + m.cacheHitRatio, 0) / recent.length;

    return {
      averageLoadTime: Math.round(avgLoadTime),
      averageMemoryUsage: Math.round(avgMemoryUsage * 100) / 100,
      averageCacheHitRatio: Math.round(avgCacheHitRatio * 100) / 100,
      webVitals: this.vitals,
      memoryInfo: this.getDetailedMemoryInfo(),
      isHealthy: this.isPerformanceHealthy()
    };
  }

  /**
   * Check if performance is healthy
   */
  private isPerformanceHealthy(): boolean {
    const summary = this.getRecentMetrics(5);
    if (summary.length === 0) return true;

    const avgLoadTime = summary.reduce((sum, m) => sum + m.loadTime, 0) / summary.length;
    const avgMemoryUsage = summary.reduce((sum, m) => sum + m.memoryUsage, 0) / summary.length;

    return avgLoadTime < 3000 && avgMemoryUsage < 100 &&
           (!this.vitals.FCP || this.vitals.FCP < 1800) &&
           (!this.vitals.LCP || this.vitals.LCP < 2500) &&
           (!this.vitals.FID || this.vitals.FID < 100) &&
           (!this.vitals.CLS || this.vitals.CLS < 0.1);
  }

  /**
   * Force garbage collection (if available)
   */
  public forceGarbageCollection(): void {
    if ((window as any).gc) {
      (window as any).gc();
      console.log('T3000: Forced garbage collection');
    } else {
      console.warn('T3000: Garbage collection not available');
    }
  }

  /**
   * Measure function execution time
   */
  public measureFunction<T>(name: string, fn: () => T): T {
    const start = performance.now();
    const result = fn();
    const end = performance.now();

    console.log(`T3000: ${name} executed in ${end - start}ms`);
    return result;
  }

  /**
   * Measure async function execution time
   */
  public async measureAsyncFunction<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const start = performance.now();
    const result = await fn();
    const end = performance.now();

    console.log(`T3000: ${name} executed in ${end - start}ms`);
    return result;
  }

  /**
   * Get resource loading performance
   */
  public getResourcePerformance() {
    const resources = performance.getEntriesByType('resource');
    const resourceMap = new Map<string, any[]>();

    resources.forEach(resource => {
      const type = this.getResourceType(resource.name);
      if (!resourceMap.has(type)) {
        resourceMap.set(type, []);
      }
      resourceMap.get(type)!.push({
        name: resource.name,
        size: (resource as any).transferSize || 0,
        duration: resource.duration,
        cached: this.isResourceCached(resource)
      });
    });

    return Object.fromEntries(resourceMap);
  }

  /**
   * Get resource type from URL
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'JavaScript';
    if (url.includes('.css')) return 'CSS';
    if (url.includes('.jpg') || url.includes('.png') || url.includes('.svg')) return 'Images';
    if (url.includes('.woff') || url.includes('.ttf')) return 'Fonts';
    return 'Other';
  }

  /**
   * Check if resource was cached
   */
  private isResourceCached(resource: PerformanceResourceTiming): boolean {
    const transferSize = (resource as any).transferSize;
    const encodedBodySize = (resource as any).encodedBodySize;
    return transferSize < encodedBodySize * 0.1;
  }

  /**
   * Clear collected metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
    this.vitals = {};
    console.log('T3000: Performance metrics cleared');
  }
}

// Export singleton instance
export const T3PerformanceMonitor = PerformanceMonitor.getInstance();

export default T3PerformanceMonitor;
