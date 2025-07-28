/**
 * T3000 Service Worker Registration and Management
 * Handles service worker lifecycle and communication
 */

export interface ServiceWorkerStats {
  isSupported: boolean;
  isRegistered: boolean;
  isActive: boolean;
  cacheStats: any;
  offlineCapable: boolean;
}

export interface ServiceWorkerMessage {
  type: string;
  data?: any;
}

/**
 * Service Worker Manager for T3000
 */
export class T3000ServiceWorkerManager {
  private static instance: T3000ServiceWorkerManager;
  private registration: ServiceWorkerRegistration | null = null;
  private isOnline: boolean = navigator.onLine;
  private messageChannel: MessageChannel | null = null;

  private constructor() {
    this.setupNetworkListeners();
  }

  public static getInstance(): T3000ServiceWorkerManager {
    if (!T3000ServiceWorkerManager.instance) {
      T3000ServiceWorkerManager.instance = new T3000ServiceWorkerManager();
    }
    return T3000ServiceWorkerManager.instance;
  }

  /**
   * Register service worker
   */
  public async register(): Promise<boolean> {
    if (!this.isServiceWorkerSupported()) {
      console.warn('T3000: Service Worker not supported');
      return false;
    }

    try {
      console.log('T3000: Registering Service Worker...');

      this.registration = await navigator.serviceWorker.register('/t3000-service-worker.js', {
        scope: '/',
        updateViaCache: 'none'
      });

      console.log('T3000: Service Worker registered successfully');

      // Setup message channel for communication
      this.setupMessageChannel();

      // Setup event listeners
      this.setupServiceWorkerListeners();

      // Handle updates
      this.handleUpdates();

      return true;

    } catch (error) {
      console.error('T3000: Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Check if service worker is supported
   */
  private isServiceWorkerSupported(): boolean {
    return 'serviceWorker' in navigator;
  }

  /**
   * Setup message channel for communication
   */
  private setupMessageChannel(): void {
    this.messageChannel = new MessageChannel();

    // Listen for messages from service worker
    this.messageChannel.port1.onmessage = (event) => {
      this.handleServiceWorkerMessage(event.data);
    };
  }

  /**
   * Setup service worker event listeners
   */
  private setupServiceWorkerListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('T3000: Service Worker update found');
      const newWorker = this.registration!.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is available
            this.notifyUpdateAvailable();
          }
        });
      }
    });

    // Listen for controlling service worker changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('T3000: Service Worker controller changed');
      window.location.reload();
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      this.handleServiceWorkerMessage(event.data);
    });
  }

  /**
   * Handle service worker updates
   */
  private handleUpdates(): void {
    if (!this.registration) return;

    if (this.registration.waiting) {
      // Service worker is waiting to activate
      this.notifyUpdateAvailable();
    }

    if (this.registration.installing) {
      // Service worker is installing
      console.log('T3000: Service Worker installing...');
    }
  }

  /**
   * Notify user about available update
   */
  private notifyUpdateAvailable(): void {
    console.log('T3000: Service Worker update available');

    // Dispatch custom event for update notification
    window.dispatchEvent(new CustomEvent('t3000-sw-update-available', {
      detail: { registration: this.registration }
    }));
  }

  /**
   * Handle messages from service worker
   */
  private handleServiceWorkerMessage(message: ServiceWorkerMessage): void {
    console.log('T3000: Message from Service Worker:', message);

    switch (message.type) {
      case 'CACHE_UPDATED':
        this.handleCacheUpdate(message.data);
        break;
      case 'OFFLINE_READY':
        this.handleOfflineReady();
        break;
      case 'ERROR':
        this.handleServiceWorkerError(message.data);
        break;
      default:
        console.log('T3000: Unknown Service Worker message:', message);
    }
  }

  /**
   * Handle cache update notification
   */
  private handleCacheUpdate(data: any): void {
    console.log('T3000: Cache updated:', data);

    window.dispatchEvent(new CustomEvent('t3000-cache-updated', {
      detail: data
    }));
  }

  /**
   * Handle offline ready notification
   */
  private handleOfflineReady(): void {
    console.log('T3000: Offline functionality ready');

    window.dispatchEvent(new CustomEvent('t3000-offline-ready'));
  }

  /**
   * Handle service worker errors
   */
  private handleServiceWorkerError(error: any): void {
    console.error('T3000: Service Worker error:', error);

    window.dispatchEvent(new CustomEvent('t3000-sw-error', {
      detail: error
    }));
  }

  /**
   * Setup network status listeners
   */
  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      console.log('T3000: Network online');
      this.handleNetworkChange(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      console.log('T3000: Network offline');
      this.handleNetworkChange(false);
    });
  }

  /**
   * Handle network status changes
   */
  private handleNetworkChange(isOnline: boolean): void {
    window.dispatchEvent(new CustomEvent('t3000-network-change', {
      detail: { isOnline }
    }));

    if (isOnline && this.registration?.active) {
      // Trigger background sync when coming back online
      this.sendMessage({
        type: 'TRIGGER_SYNC'
      });
    }
  }

  /**
   * Send message to service worker
   */
  public async sendMessage(message: ServiceWorkerMessage): Promise<any> {
    if (!this.registration?.active) {
      throw new Error('Service Worker not active');
    }

    return new Promise((resolve, reject) => {
      if (!this.messageChannel) {
        reject(new Error('Message channel not available'));
        return;
      }

      const messageId = Math.random().toString(36).substr(2, 9);
      const timeoutId = setTimeout(() => {
        reject(new Error('Message timeout'));
      }, 10000); // 10 second timeout

      // Setup one-time message listener
      const handleResponse = (event: MessageEvent) => {
        if (event.data.messageId === messageId) {
          clearTimeout(timeoutId);
          this.messageChannel!.port1.removeEventListener('message', handleResponse);
          resolve(event.data.response);
        }
      };

      this.messageChannel.port1.addEventListener('message', handleResponse);

      // Send message
      this.registration.active.postMessage({
        ...message,
        messageId
      }, [this.messageChannel.port2]);
    });
  }

  /**
   * Cache T3000 data
   */
  public async cacheT3000Data(data: any): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CACHE_T3000_DATA',
        data
      });
      console.log('T3000: Data cached successfully');
    } catch (error) {
      console.error('T3000: Failed to cache data:', error);
    }
  }

  /**
   * Clear cache
   */
  public async clearCache(strategy?: string): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CLEAR_CACHE',
        data: { strategy }
      });
      console.log('T3000: Cache cleared successfully');
    } catch (error) {
      console.error('T3000: Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  public async getCacheStats(): Promise<any> {
    try {
      const stats = await this.sendMessage({
        type: 'GET_CACHE_STATS'
      });
      return stats;
    } catch (error) {
      console.error('T3000: Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Force service worker update
   */
  public async forceUpdate(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered');
    }

    try {
      await this.registration.update();

      if (this.registration.waiting) {
        // Tell waiting service worker to skip waiting
        await this.sendMessage({
          type: 'FORCE_UPDATE'
        });
      }

      console.log('T3000: Service Worker update forced');
    } catch (error) {
      console.error('T3000: Failed to force update:', error);
      throw error;
    }
  }

  /**
   * Get service worker status
   */
  public async getStatus(): Promise<ServiceWorkerStats> {
    const stats: ServiceWorkerStats = {
      isSupported: this.isServiceWorkerSupported(),
      isRegistered: !!this.registration,
      isActive: !!this.registration?.active,
      cacheStats: null,
      offlineCapable: this.isOnline || !!this.registration?.active
    };

    if (stats.isActive) {
      try {
        stats.cacheStats = await this.getCacheStats();
      } catch (error) {
        console.warn('T3000: Failed to get cache stats for status');
      }
    }

    return stats;
  }

  /**
   * Check if T3000 is offline capable
   */
  public isOfflineCapable(): boolean {
    return !!this.registration?.active;
  }

  /**
   * Get network status
   */
  public isNetworkOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Unregister service worker
   */
  public async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();
      if (success) {
        this.registration = null;
        console.log('T3000: Service Worker unregistered successfully');
      }
      return success;
    } catch (error) {
      console.error('T3000: Failed to unregister Service Worker:', error);
      return false;
    }
  }
}

/**
 * T3000 Service Worker Utilities
 */
export class T3000ServiceWorkerUtils {
  /**
   * Initialize service worker with optimal settings
   */
  public static async initialize(): Promise<T3000ServiceWorkerManager> {
    const manager = T3000ServiceWorkerManager.getInstance();

    // Register service worker
    await manager.register();

    // Setup update handlers
    this.setupUpdateHandlers(manager);

    // Setup offline handlers
    this.setupOfflineHandlers(manager);

    return manager;
  }

  /**
   * Setup update notification handlers
   */
  private static setupUpdateHandlers(manager: T3000ServiceWorkerManager): void {
    window.addEventListener('t3000-sw-update-available', () => {
      // Show update notification to user
      if (confirm('T3000: A new version is available. Update now?')) {
        manager.forceUpdate().catch(error => {
          console.error('T3000: Update failed:', error);
        });
      }
    });
  }

  /**
   * Setup offline notification handlers
   */
  private static setupOfflineHandlers(manager: T3000ServiceWorkerManager): void {
    window.addEventListener('t3000-network-change', (event: any) => {
      const { isOnline } = event.detail;

      if (isOnline) {
        this.showNotification('T3000: Back online', 'success');
      } else {
        this.showNotification('T3000: Working offline', 'info');
      }
    });

    window.addEventListener('t3000-offline-ready', () => {
      this.showNotification('T3000: Offline functionality ready', 'success');
    });
  }

  /**
   * Show user notification
   */
  private static showNotification(message: string, type: 'success' | 'info' | 'warning' | 'error'): void {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `t3000-notification t3000-notification-${type}`;
    notification.textContent = message;

    // Style notification
    Object.assign(notification.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '12px 16px',
      borderRadius: '4px',
      color: 'white',
      zIndex: '10000',
      fontFamily: 'Arial, sans-serif',
      fontSize: '14px',
      backgroundColor: this.getNotificationColor(type)
    });

    // Add to page
    document.body.appendChild(notification);

    // Remove after delay
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 5000);
  }

  /**
   * Get notification color based on type
   */
  private static getNotificationColor(type: string): string {
    switch (type) {
      case 'success': return '#28a745';
      case 'info': return '#17a2b8';
      case 'warning': return '#ffc107';
      case 'error': return '#dc3545';
      default: return '#6c757d';
    }
  }

  /**
   * Cache critical T3000 resources
   */
  public static async cacheCriticalResources(manager: T3000ServiceWorkerManager): Promise<void> {
    const criticalData = {
      timestamp: Date.now(),
      version: '1.2.0',
      resources: [
        '/src/lib/T3000/Hvac/Basic/B.Element.ts',
        '/src/lib/T3000/Hvac/Basic/B.Container.ts',
        '/src/lib/T3000/Security/T3SecurityUtil.ts'
      ]
    };

    await manager.cacheT3000Data(criticalData);
  }
}

// Export singleton instance
export const T3ServiceWorker = T3000ServiceWorkerManager.getInstance();

export default T3ServiceWorker;
