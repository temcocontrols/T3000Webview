/**
 * Performance monitoring utilities for T3000 application
 * Tracks bundle size, memory usage, and runtime performance
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      bundleSize: {
        total: 0,
        chunks: new Map(),
        loadTimes: new Map()
      },
      memory: {
        peak: 0,
        current: 0,
        leaks: []
      },
      rendering: {
        fcp: 0, // First Contentful Paint
        lcp: 0, // Largest Contentful Paint
        fid: 0, // First Input Delay
        cls: 0  // Cumulative Layout Shift
      },
      t3000: {
        moduleLoadTimes: new Map(),
        stateUpdateTimes: new Map(),
        componentRenderTimes: new Map()
      }
    };

    this.startTime = performance.now();
    this.observers = new Map();
    this.isEnabled = process.env.NODE_ENV === 'development' || window.location.search.includes('perf=true');

    if (this.isEnabled) {
      this.initializeMonitoring();
    }
  }

  initializeMonitoring() {
    // Performance Observer for Web Vitals
    if ('PerformanceObserver' in window) {
      this.observeWebVitals();
      this.observeResourceLoading();
    }

    // Memory monitoring
    this.startMemoryMonitoring();

    // Bundle size tracking
    this.trackBundleSize();
  }

  observeWebVitals() {
    // First Contentful Paint
    const fcpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.metrics.rendering.fcp = entry.startTime;
          this.log('FCP', entry.startTime);
        }
      }
    });
    fcpObserver.observe({ entryTypes: ['paint'] });

    // Largest Contentful Paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.metrics.rendering.lcp = lastEntry.startTime;
      this.log('LCP', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    const fidObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.metrics.rendering.fid = entry.processingStart - entry.startTime;
        this.log('FID', this.metrics.rendering.fid);
      }
    });
    fidObserver.observe({ entryTypes: ['first-input'] });

    // Cumulative Layout Shift
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          this.metrics.rendering.cls += entry.value;
          this.log('CLS', this.metrics.rendering.cls);
        }
      }
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });
  }

  observeResourceLoading() {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('.js') || entry.name.includes('.css')) {
          const chunkName = this.extractChunkName(entry.name);
          const loadTime = entry.responseEnd - entry.startTime;

          this.metrics.bundleSize.loadTimes.set(chunkName, loadTime);
          this.metrics.bundleSize.chunks.set(chunkName, entry.transferSize || 0);

          this.log('Chunk Load', { name: chunkName, size: entry.transferSize, time: loadTime });
        }
      }
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
  }

  startMemoryMonitoring() {
    if ('memory' in performance) {
      setInterval(() => {
        const memInfo = performance.memory;
        this.metrics.memory.current = memInfo.usedJSHeapSize;
        this.metrics.memory.peak = Math.max(this.metrics.memory.peak, memInfo.usedJSHeapSize);

        // Detect potential memory leaks (simple heuristic)
        if (memInfo.usedJSHeapSize > memInfo.totalJSHeapSize * 0.9) {
          this.metrics.memory.leaks.push({
            timestamp: Date.now(),
            usage: memInfo.usedJSHeapSize,
            total: memInfo.totalJSHeapSize
          });
        }
      }, 5000); // Check every 5 seconds
    }
  }

  trackBundleSize() {
    // Estimate total bundle size from loaded resources
    window.addEventListener('load', () => {
      const resources = performance.getEntriesByType('resource');
      let totalSize = 0;

      resources.forEach(resource => {
        if (resource.name.includes('.js') || resource.name.includes('.css')) {
          totalSize += resource.transferSize || 0;
        }
      });

      this.metrics.bundleSize.total = totalSize;
      this.log('Total Bundle Size', { size: totalSize, human: this.formatBytes(totalSize) });
    });
  }

  // T3000 specific monitoring
  trackModuleLoad(moduleName, startTime = performance.now()) {
    return () => {
      const endTime = performance.now();
      const loadTime = endTime - startTime;
      this.metrics.t3000.moduleLoadTimes.set(moduleName, loadTime);
      this.log('T3000 Module Load', { module: moduleName, time: loadTime });
    };
  }

  // Direct tracking methods for simpler usage
  trackModuleLoadTime(moduleName, loadTime) {
    this.metrics.t3000.moduleLoadTimes.set(moduleName, loadTime);
    this.log('T3000 Module Load', { module: moduleName, time: loadTime });
  }

  trackComponentLoadTime(componentName, loadTime) {
    this.metrics.t3000.componentRenderTimes.set(componentName, loadTime);
    this.log('T3000 Component Load', { component: componentName, time: loadTime });
  }

  trackStateUpdate(stateName, startTime = performance.now()) {
    return () => {
      const endTime = performance.now();
      const updateTime = endTime - startTime;
      this.metrics.t3000.stateUpdateTimes.set(stateName, updateTime);
      this.log('T3000 State Update', { state: stateName, time: updateTime });
    };
  }

  trackComponentRender(componentName, startTime = performance.now()) {
    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;
      this.metrics.t3000.componentRenderTimes.set(componentName, renderTime);
      this.log('T3000 Component Render', { component: componentName, time: renderTime });
    };
  }

  // Manual performance marks and measures
  mark(markName) {
    if (this.isEnabled && performance.mark) {
      performance.mark(markName);
    }
  }

  measure(measureName, startMark, endMark) {
    if (this.isEnabled && performance.measure) {
      try {
        performance.measure(measureName, startMark, endMark);
      } catch (error) {
        console.warn(`Performance measure failed: ${measureName}`, error);
      }
    }
  }

  // Track user interactions
  trackInteraction(interactionName) {
    if (!this.isEnabled) return;

    const now = performance.now();
    this.metrics.t3000.componentRenderTimes.set(`interaction-${interactionName}`, now);
    this.log('interaction', { name: interactionName, timestamp: now });
  }

  // Track virtual scrolling performance
  trackVirtualScroll(visibleItems, totalHeight) {
    if (!this.isEnabled) return;

    this.log('virtual-scroll', {
      visibleItems,
      totalHeight,
      timestamp: performance.now()
    });
  }

  // Track scroll performance
  trackScroll(scrollLeft, scrollTop) {
    if (!this.isEnabled) return;

    this.log('scroll', {
      scrollLeft,
      scrollTop,
      timestamp: performance.now()
    });
  }

  // Get performance metrics
  getMetrics() {
    return {
      ...this.metrics,
      runtime: performance.now() - this.startTime
    };
  }

  // Disconnect all observers
  disconnect() {
    this.observers.forEach((observer, name) => {
      try {
        observer.disconnect();
      } catch (error) {
        console.warn(`Failed to disconnect observer ${name}:`, error);
      }
    });
    this.observers.clear();
  }

  // Memory monitoring methods
  updateMemoryMetrics(used, total, limit) {
    this.metrics.memory.current = used;
    this.metrics.memory.peak = Math.max(this.metrics.memory.peak, used);

    // Check for potential memory leaks
    if (used > total * 0.9) {
      this.metrics.memory.leaks.push({
        timestamp: Date.now(),
        used,
        total,
        limit
      });
    }

    this.log('Memory Update', { used, total, limit, utilization: (used / total * 100).toFixed(2) + '%' });
  }

  // Utility methods
  extractChunkName(url) {
    const match = url.match(/\/([^\/]+\.(?:js|css))(?:\?|$)/);
    return match ? match[1] : url;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  log(type, data) {
    if (this.isEnabled) {
      console.log(`[Performance Monitor] ${type}:`, data);
    }
  }

  // Generate performance report
  generateReport() {
    const report = {
      overview: {
        totalRuntime: performance.now() - this.startTime,
        bundleSize: this.formatBytes(this.metrics.bundleSize.total),
        memoryPeak: this.formatBytes(this.metrics.memory.peak),
        memoryCurrent: this.formatBytes(this.metrics.memory.current)
      },
      webVitals: {
        fcp: `${this.metrics.rendering.fcp.toFixed(2)}ms`,
        lcp: `${this.metrics.rendering.lcp.toFixed(2)}ms`,
        fid: `${this.metrics.rendering.fid.toFixed(2)}ms`,
        cls: this.metrics.rendering.cls.toFixed(4)
      },
      t3000: {
        moduleLoads: Object.fromEntries(
          Array.from(this.metrics.t3000.moduleLoadTimes.entries())
            .map(([name, time]) => [name, `${time.toFixed(2)}ms`])
        ),
        slowestComponents: Array.from(this.metrics.t3000.componentRenderTimes.entries())
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, time]) => ({ name, time: `${time.toFixed(2)}ms` }))
      },
      warnings: [],
      recommendations: []
    };

    // Add warnings and recommendations
    if (this.metrics.rendering.fcp > 2000) {
      report.warnings.push('First Contentful Paint is slow (>2s)');
      report.recommendations.push('Consider code splitting and lazy loading');
    }

    if (this.metrics.bundleSize.total > 3 * 1024 * 1024) {
      report.warnings.push('Bundle size is large (>3MB)');
      report.recommendations.push('Implement dynamic imports and tree shaking');
    }

    if (this.metrics.memory.leaks.length > 0) {
      report.warnings.push(`Potential memory leaks detected (${this.metrics.memory.leaks.length} incidents)`);
      report.recommendations.push('Review component cleanup and event listener removal');
    }

    return report;
  }

  // Export metrics for analysis
  exportMetrics() {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Create global instance
export const performanceMonitor = new PerformanceMonitor();

// Vue composition API hook
export function usePerformanceMonitor() {
  return {
    trackModuleLoad: performanceMonitor.trackModuleLoad.bind(performanceMonitor),
    trackStateUpdate: performanceMonitor.trackStateUpdate.bind(performanceMonitor),
    trackComponentRender: performanceMonitor.trackComponentRender.bind(performanceMonitor),
    generateReport: performanceMonitor.generateReport.bind(performanceMonitor),
    exportMetrics: performanceMonitor.exportMetrics.bind(performanceMonitor)
  };
}

export default PerformanceMonitor;
