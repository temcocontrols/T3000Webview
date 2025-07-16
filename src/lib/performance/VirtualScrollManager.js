/**
 * Virtual Scrolling Manager for Large Lists
 * Optimizes rendering of large datasets by only rendering visible items
 */

export class VirtualScrollManager {
  constructor(options = {}) {
    this.itemHeight = options.itemHeight || 50;
    this.containerHeight = options.containerHeight || 400;
    this.overscan = options.overscan || 5;
    this.scrollTop = 0;
    this.visibleStartIndex = 0;
    this.visibleEndIndex = 0;
    this.totalItems = 0;
    this.visibleItems = [];
    this.onUpdate = options.onUpdate || (() => {});
  }

  /**
   * Update scroll position and recalculate visible items
   * @param {number} scrollTop - Current scroll position
   * @param {number} totalItems - Total number of items
   * @param {Array} items - Full items array
   */
  updateScroll(scrollTop, totalItems, items = []) {
    this.scrollTop = scrollTop;
    this.totalItems = totalItems;

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(this.containerHeight / this.itemHeight),
      totalItems - 1
    );

    // Add overscan for smoother scrolling
    this.visibleStartIndex = Math.max(0, startIndex - this.overscan);
    this.visibleEndIndex = Math.min(totalItems - 1, endIndex + this.overscan);

    // Extract visible items
    this.visibleItems = items.slice(this.visibleStartIndex, this.visibleEndIndex + 1);

    // Notify component of updates
    this.onUpdate({
      visibleStartIndex: this.visibleStartIndex,
      visibleEndIndex: this.visibleEndIndex,
      visibleItems: this.visibleItems,
      totalHeight: totalItems * this.itemHeight,
      offsetY: this.visibleStartIndex * this.itemHeight
    });

    return {
      visibleStartIndex: this.visibleStartIndex,
      visibleEndIndex: this.visibleEndIndex,
      visibleItems: this.visibleItems,
      totalHeight: totalItems * this.itemHeight,
      offsetY: this.visibleStartIndex * this.itemHeight
    };
  }

  /**
   * Get item position by index
   * @param {number} index - Item index
   * @returns {Object} Position information
   */
  getItemPosition(index) {
    return {
      top: index * this.itemHeight,
      height: this.itemHeight
    };
  }

  /**
   * Scroll to specific item
   * @param {number} index - Target item index
   * @returns {number} Required scroll position
   */
  scrollToItem(index) {
    const targetScrollTop = index * this.itemHeight;
    return Math.max(0, Math.min(targetScrollTop, this.getTotalHeight() - this.containerHeight));
  }

  /**
   * Get total scrollable height
   * @returns {number} Total height
   */
  getTotalHeight() {
    return this.totalItems * this.itemHeight;
  }

  /**
   * Update configuration
   * @param {Object} options - New options
   */
  updateConfig(options) {
    Object.assign(this, options);
  }
}

/**
 * Vue composable for virtual scrolling
 * @param {Object} options - Configuration options
 * @returns {Object} Virtual scroll utilities
 */
export function useVirtualScroll(options = {}) {
  const manager = new VirtualScrollManager(options);

  return {
    manager,
    updateScroll: manager.updateScroll.bind(manager),
    getItemPosition: manager.getItemPosition.bind(manager),
    scrollToItem: manager.scrollToItem.bind(manager),
    getTotalHeight: manager.getTotalHeight.bind(manager),
    updateConfig: manager.updateConfig.bind(manager)
  };
}

export default VirtualScrollManager;
