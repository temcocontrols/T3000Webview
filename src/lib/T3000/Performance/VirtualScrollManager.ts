/**
 * Virtual Scrolling Manager for T3000
 * Handles large datasets efficiently by rendering only visible items
 */

import { ref, computed, onMounted, onUnmounted, Ref } from 'vue';

export interface VirtualScrollItem {
  id: string | number;
  data: any;
  height?: number;
}

export interface VirtualScrollOptions {
  itemHeight: number;
  containerHeight: number;
  overscan?: number; // Number of items to render outside viewport
  scrollThreshold?: number; // Scroll threshold for updates
}

export interface UseVirtualScrollReturn {
  visibleItems: Ref<VirtualScrollItem[]>;
  totalHeight: Ref<number>;
  scrollTop: Ref<number>;
  containerRef: Ref<HTMLElement | null>;
  onScroll: (event: Event) => void;
  scrollToIndex: (index: number) => void;
  scrollToItem: (id: string | number) => void;
}

/**
 * Vue composable for virtual scrolling
 */
export function useVirtualScroll(
  items: Ref<VirtualScrollItem[]>,
  options: VirtualScrollOptions
): UseVirtualScrollReturn {
  const containerRef = ref<HTMLElement | null>(null);
  const scrollTop = ref(0);
  const { itemHeight, containerHeight, overscan = 5, scrollThreshold = 10 } = options;

  // Calculate visible range
  const visibleRange = computed(() => {
    const start = Math.floor(scrollTop.value / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.value.length
    );

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.value.length, end + overscan)
    };
  });

  // Get visible items
  const visibleItems = computed(() => {
    const { start, end } = visibleRange.value;
    return items.value.slice(start, end).map((item, index) => ({
      ...item,
      index: start + index
    }));
  });

  // Calculate total height
  const totalHeight = computed(() => {
    return items.value.length * itemHeight;
  });

  // Handle scroll events
  const onScroll = (event: Event) => {
    const target = event.target as HTMLElement;
    const newScrollTop = target.scrollTop;

    // Only update if scroll exceeds threshold
    if (Math.abs(newScrollTop - scrollTop.value) > scrollThreshold) {
      scrollTop.value = newScrollTop;
    }
  };

  // Scroll to specific index
  const scrollToIndex = (index: number) => {
    if (containerRef.value && index >= 0 && index < items.value.length) {
      const targetScrollTop = index * itemHeight;
      containerRef.value.scrollTop = targetScrollTop;
      scrollTop.value = targetScrollTop;
    }
  };

  // Scroll to specific item by ID
  const scrollToItem = (id: string | number) => {
    const index = items.value.findIndex(item => item.id === id);
    if (index !== -1) {
      scrollToIndex(index);
    }
  };

  return {
    visibleItems,
    totalHeight,
    scrollTop,
    containerRef,
    onScroll,
    scrollToIndex,
    scrollToItem
  };
}

/**
 * Virtual Scrolling Manager Class
 */
export class VirtualScrollManager {
  private container: HTMLElement;
  private items: VirtualScrollItem[];
  private itemHeight: number;
  private containerHeight: number;
  private overscan: number;
  private scrollTop: number = 0;
  private visibleItems: VirtualScrollItem[] = [];
  private onUpdateCallback?: (items: VirtualScrollItem[]) => void;

  constructor(
    container: HTMLElement,
    items: VirtualScrollItem[],
    options: VirtualScrollOptions
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = options.itemHeight;
    this.containerHeight = options.containerHeight;
    this.overscan = options.overscan || 5;

    this.setupScrollListener();
    this.updateVisibleItems();
  }

  /**
   * Setup scroll event listener
   */
  private setupScrollListener(): void {
    this.container.addEventListener('scroll', this.handleScroll.bind(this), {
      passive: true
    });
  }

  /**
   * Handle scroll events
   */
  private handleScroll(event: Event): void {
    const target = event.target as HTMLElement;
    this.scrollTop = target.scrollTop;
    this.updateVisibleItems();
  }

  /**
   * Update visible items based on scroll position
   */
  private updateVisibleItems(): void {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight),
      this.items.length
    );

    const visibleStart = Math.max(0, startIndex - this.overscan);
    const visibleEnd = Math.min(this.items.length, endIndex + this.overscan);

    this.visibleItems = this.items.slice(visibleStart, visibleEnd);

    // Notify about updates
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this.visibleItems);
    }
  }

  /**
   * Set callback for visible items updates
   */
  public onUpdate(callback: (items: VirtualScrollItem[]) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * Update items data
   */
  public setItems(items: VirtualScrollItem[]): void {
    this.items = items;
    this.updateVisibleItems();
  }

  /**
   * Get visible items
   */
  public getVisibleItems(): VirtualScrollItem[] {
    return this.visibleItems;
  }

  /**
   * Scroll to specific index
   */
  public scrollToIndex(index: number): void {
    if (index >= 0 && index < this.items.length) {
      const targetScrollTop = index * this.itemHeight;
      this.container.scrollTop = targetScrollTop;
      this.scrollTop = targetScrollTop;
      this.updateVisibleItems();
    }
  }

  /**
   * Scroll to specific item
   */
  public scrollToItem(id: string | number): void {
    const index = this.items.findIndex(item => item.id === id);
    if (index !== -1) {
      this.scrollToIndex(index);
    }
  }

  /**
   * Get total content height
   */
  public getTotalHeight(): number {
    return this.items.length * this.itemHeight;
  }

  /**
   * Destroy the virtual scroll manager
   */
  public destroy(): void {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
    this.onUpdateCallback = undefined;
  }
}

/**
 * T3000-specific virtual scrolling for panels and entries
 */
export class T3000VirtualScroll {
  private static instance: T3000VirtualScroll;
  private managers: Map<string, VirtualScrollManager> = new Map();

  private constructor() {}

  public static getInstance(): T3000VirtualScroll {
    if (!T3000VirtualScroll.instance) {
      T3000VirtualScroll.instance = new T3000VirtualScroll();
    }
    return T3000VirtualScroll.instance;
  }

  /**
   * Create virtual scroll for T3000 panels list
   */
  public createPanelsVirtualScroll(
    container: HTMLElement,
    panels: any[],
    onUpdate: (visiblePanels: any[]) => void
  ): string {
    const items: VirtualScrollItem[] = panels.map((panel, index) => ({
      id: panel.id || index,
      data: panel,
      height: 60 // Standard panel height
    }));

    const manager = new VirtualScrollManager(container, items, {
      itemHeight: 60,
      containerHeight: container.clientHeight,
      overscan: 3
    });

    manager.onUpdate((visibleItems) => {
      onUpdate(visibleItems.map(item => item.data));
    });

    const managerId = `panels_${Date.now()}`;
    this.managers.set(managerId, manager);
    return managerId;
  }

  /**
   * Create virtual scroll for T3000 entries list
   */
  public createEntriesVirtualScroll(
    container: HTMLElement,
    entries: any[],
    onUpdate: (visibleEntries: any[]) => void
  ): string {
    const items: VirtualScrollItem[] = entries.map((entry, index) => ({
      id: entry.id || index,
      data: entry,
      height: 40 // Standard entry height
    }));

    const manager = new VirtualScrollManager(container, items, {
      itemHeight: 40,
      containerHeight: container.clientHeight,
      overscan: 5
    });

    manager.onUpdate((visibleItems) => {
      onUpdate(visibleItems.map(item => item.data));
    });

    const managerId = `entries_${Date.now()}`;
    this.managers.set(managerId, manager);
    return managerId;
  }

  /**
   * Create virtual scroll for T3000 shapes library
   */
  public createShapesVirtualScroll(
    container: HTMLElement,
    shapes: any[],
    onUpdate: (visibleShapes: any[]) => void
  ): string {
    const items: VirtualScrollItem[] = shapes.map((shape, index) => ({
      id: shape.id || index,
      data: shape,
      height: 80 // Larger height for shape previews
    }));

    const manager = new VirtualScrollManager(container, items, {
      itemHeight: 80,
      containerHeight: container.clientHeight,
      overscan: 2
    });

    manager.onUpdate((visibleItems) => {
      onUpdate(visibleItems.map(item => item.data));
    });

    const managerId = `shapes_${Date.now()}`;
    this.managers.set(managerId, manager);
    return managerId;
  }

  /**
   * Update items for a specific manager
   */
  public updateItems(managerId: string, items: any[]): void {
    const manager = this.managers.get(managerId);
    if (manager) {
      const virtualItems: VirtualScrollItem[] = items.map((item, index) => ({
        id: item.id || index,
        data: item
      }));
      manager.setItems(virtualItems);
    }
  }

  /**
   * Scroll to item in specific manager
   */
  public scrollToItem(managerId: string, itemId: string | number): void {
    const manager = this.managers.get(managerId);
    if (manager) {
      manager.scrollToItem(itemId);
    }
  }

  /**
   * Destroy a specific manager
   */
  public destroyManager(managerId: string): void {
    const manager = this.managers.get(managerId);
    if (manager) {
      manager.destroy();
      this.managers.delete(managerId);
    }
  }

  /**
   * Destroy all managers
   */
  public destroyAll(): void {
    this.managers.forEach((manager) => {
      manager.destroy();
    });
    this.managers.clear();
  }

  /**
   * Get performance stats
   */
  public getPerformanceStats() {
    const stats = Array.from(this.managers.entries()).map(([id, manager]) => ({
      id,
      totalItems: manager['items'].length,
      visibleItems: manager.getVisibleItems().length,
      totalHeight: manager.getTotalHeight()
    }));

    return {
      managersCount: this.managers.size,
      managers: stats,
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Estimate memory usage
   */
  private estimateMemoryUsage(): number {
    let totalVisibleItems = 0;
    this.managers.forEach((manager) => {
      totalVisibleItems += manager.getVisibleItems().length;
    });

    // Rough estimate: each visible item uses ~1KB
    return totalVisibleItems * 1024; // bytes
  }
}

// Export singleton instance
export const T3VirtualScroll = T3000VirtualScroll.getInstance();

export default T3VirtualScroll;
