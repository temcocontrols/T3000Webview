/**
 * IndexPage Performance Optimizations
 * Runtime optimizations for the main HVAC page
 */

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useLazyComponent } from './ComponentLazyLoader.js';
import { memoize, memoizeDebounced, vueMemoUtils } from './MemoizationUtils.js';
import { useVirtualScroll } from './VirtualScrollManager.js';
import { PerformanceMonitor } from './PerformanceMonitor.js';

/**
 * Composable for optimized IndexPage logic
 */
export function useIndexPageOptimizations() {
  const performanceMonitor = new PerformanceMonitor();

  // Lazy load heavy components
  const lazyComponents = {
    ToolsSidebar: useLazyComponent(() => import('../../components/hvac/ToolsSidebar.vue')),
    ObjectConfig: useLazyComponent(() => import('../../components/hvac/ObjectConfig.vue')),
    DeviceInfo: useLazyComponent(() => import('../../components/hvac/DeviceInfo.vue')),
    ScheduleModal: useLazyComponent(() => import('../../components/NewUI/ScheduleModal.vue')),
    ScheduleCalendar: useLazyComponent(() => import('../../components/NewUI/ScheduleCalendar.vue')),
    ScheduleAnnual: useLazyComponent(() => import('../../components/NewUI/ScheduleAnnual.vue'))
  };

  // Memoized computations
  const memoizedComputations = {
    // Memoize expensive viewport calculations
    viewportCalculations: memoize((width, height, zoom, margins) => {
      return {
        scaledWidth: width * zoom,
        scaledHeight: height * zoom,
        offsetX: margins.left,
        offsetY: margins.top,
        visibleArea: {
          left: -margins.left / zoom,
          top: -margins.top / zoom,
          right: (-margins.left + width) / zoom,
          bottom: (-margins.top + height) / zoom
        }
      };
    }),

    // Memoize object filtering
    visibleObjects: memoize((objects, visibleArea, zoom) => {
      if (!objects || !visibleArea) return [];

      return objects.filter(obj => {
        if (!obj.position) return true;

        const objBounds = {
          left: obj.position.x,
          top: obj.position.y,
          right: obj.position.x + (obj.position.width || 0),
          bottom: obj.position.y + (obj.position.height || 0)
        };

        return !(objBounds.right < visibleArea.left ||
                objBounds.left > visibleArea.right ||
                objBounds.bottom < visibleArea.top ||
                objBounds.top > visibleArea.bottom);
      });
    }),

    // Memoize selection calculations
    selectionBounds: memoize((selectedTargets) => {
      if (!selectedTargets || selectedTargets.length === 0) return null;

      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      selectedTargets.forEach(target => {
        const rect = target.getBoundingClientRect();
        minX = Math.min(minX, rect.left);
        minY = Math.min(minY, rect.top);
        maxX = Math.max(maxX, rect.right);
        maxY = Math.max(maxY, rect.bottom);
      });

      return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      };
    })
  };

  // Debounced operations
  const debouncedOperations = {
    updateViewport: memoizeDebounced((scrollLeft, scrollTop, zoom) => {
      // Expensive viewport update logic
      performanceMonitor.mark('viewport-update-start');

      // Update viewport transformations
      const transform = `translate(${scrollLeft}px, ${scrollTop}px) scale(${zoom})`;

      performanceMonitor.mark('viewport-update-end');
      performanceMonitor.measure('viewport-update', 'viewport-update-start', 'viewport-update-end');

      return transform;
    }, 16), // ~60fps

    saveState: memoizeDebounced((state) => {
      // Debounced state saving
      localStorage.setItem('hvacDrawerState', JSON.stringify(state));
    }, 1000),

    updateSelection: memoizeDebounced((targets) => {
      // Expensive selection update logic
      return memoizedComputations.selectionBounds(targets);
    }, 50)
  };

  // Virtual scrolling for large lists
  const virtualScrollConfig = {
    itemHeight: 50,
    containerHeight: 400,
    overscan: 5
  };

  const { manager: virtualScrollManager } = useVirtualScroll({
    ...virtualScrollConfig,
    onUpdate: (data) => {
      // Handle virtual scroll updates
      performanceMonitor.trackVirtualScroll(data.visibleItems.length, data.totalHeight);
    }
  });

  // Optimized event handlers
  const optimizedHandlers = {
    handleMouseMove: memoizeDebounced((event) => {
      // Optimized mouse move handling
      const rect = event.currentTarget.getBoundingClientRect();
      return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        timestamp: performance.now()
      };
    }, 16),

    handleResize: memoizeDebounced((width, height) => {
      // Optimized resize handling
      virtualScrollManager.updateConfig({ containerHeight: height });
      return { width, height };
    }, 100),

    handleScroll: memoizeDebounced((scrollLeft, scrollTop) => {
      // Optimized scroll handling with virtual scrolling
      return debouncedOperations.updateViewport(scrollLeft, scrollTop, 1);
    }, 16)
  };

  // Performance monitoring helpers
  const performanceHelpers = {
    trackRender: (componentName) => {
      performanceMonitor.mark(`${componentName}-render-start`);
      return () => {
        performanceMonitor.mark(`${componentName}-render-end`);
        performanceMonitor.measure(`${componentName}-render`,
          `${componentName}-render-start`,
          `${componentName}-render-end`);
      };
    },

    trackInteraction: (interactionName) => {
      performanceMonitor.trackInteraction(interactionName);
    },

    getMetrics: () => {
      return performanceMonitor.getMetrics();
    }
  };

  // Preload critical components
  const preloadCriticalComponents = async () => {
    const criticalComponents = [
      lazyComponents.ToolsSidebar,
      lazyComponents.ObjectConfig
    ];

    await Promise.allSettled(
      criticalComponents.map(comp => comp.preload())
    );
  };

  // Cleanup function
  const cleanup = () => {
    performanceMonitor.disconnect();
    // Clear any remaining timeouts/intervals
  };

  return {
    // Lazy components
    lazyComponents,

    // Memoized computations
    memoizedComputations,

    // Debounced operations
    debouncedOperations,

    // Optimized handlers
    optimizedHandlers,

    // Virtual scrolling
    virtualScrollManager,

    // Performance helpers
    performanceHelpers,

    // Utilities
    preloadCriticalComponents,
    cleanup
  };
}

/**
 * Optimized viewport manager
 */
export class OptimizedViewportManager {
  constructor(options = {}) {
    this.viewportElement = null;
    this.observers = [];
    this.rafId = null;
    this.scrollTimeout = null;
    this.isScrolling = false;

    this.options = {
      throttleDelay: 16,
      debounceDelay: 100,
      intersectionThreshold: 0.1,
      ...options
    };

    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * Initialize viewport manager
   * @param {HTMLElement} viewportElement - Viewport element
   */
  init(viewportElement) {
    this.viewportElement = viewportElement;
    this.setupIntersectionObserver();
    this.setupScrollOptimization();
  }

  /**
   * Setup intersection observer for visibility optimization
   */
  setupIntersectionObserver() {
    if (!this.viewportElement) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const element = entry.target;

        if (entry.isIntersecting) {
          element.classList.add('in-viewport');
          element.classList.remove('out-of-viewport');
        } else {
          element.classList.remove('in-viewport');
          element.classList.add('out-of-viewport');
        }
      });
    }, {
      root: this.viewportElement,
      threshold: this.options.intersectionThreshold
    });

    this.observers.push(observer);
    return observer;
  }

  /**
   * Setup optimized scrolling
   */
  setupScrollOptimization() {
    if (!this.viewportElement) return;

    let ticking = false;

    const optimizedScrollHandler = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          this.handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    this.viewportElement.addEventListener('scroll', optimizedScrollHandler, { passive: true });
  }

  /**
   * Handle scroll events with optimization
   */
  handleScroll() {
    if (!this.viewportElement) return;

    this.isScrolling = true;

    // Clear existing timeout
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set scrolling end timeout
    this.scrollTimeout = setTimeout(() => {
      this.isScrolling = false;
      this.onScrollEnd();
    }, this.options.debounceDelay);

    // Track scroll performance
    this.performanceMonitor.trackScroll(
      this.viewportElement.scrollLeft,
      this.viewportElement.scrollTop
    );
  }

  /**
   * Handle scroll end
   */
  onScrollEnd() {
    // Trigger any deferred operations after scroll ends
    this.performanceMonitor.mark('scroll-end');
  }

  /**
   * Observe element for intersection
   * @param {HTMLElement} element - Element to observe
   */
  observeElement(element) {
    if (this.observers.length > 0) {
      this.observers[0].observe(element);
    }
  }

  /**
   * Unobserve element
   * @param {HTMLElement} element - Element to unobserve
   */
  unobserveElement(element) {
    this.observers.forEach(observer => {
      observer.unobserve(element);
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }

    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    this.performanceMonitor.disconnect();
  }
}

export default {
  useIndexPageOptimizations,
  OptimizedViewportManager
};
