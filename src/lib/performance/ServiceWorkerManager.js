/**
 * Service Worker Registration and Management
 * Handles registration, updates, and communication with the service worker
 */

export class ServiceWorkerManager {
  constructor() {
    this.registration = null;
    this.isSupported = 'serviceWorker' in navigator;
    this.isOnline = navigator.onLine;
    this.updateAvailable = false;
    this.listeners = new Map();

    if (this.isSupported) {
      this.setupOnlineOfflineHandlers();
    }
  }

  /**
   * Register the service worker
   */
  async register() {
    if (!this.isSupported) {
      console.warn('[SW Manager] Service Workers not supported');
      return false;
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      console.log('[SW Manager] Service Worker registered:', this.registration.scope);

      // Handle updates
      this.registration.addEventListener('updatefound', () => {
        this.handleUpdateFound();
      });

      // Handle controller change
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Manager] Controller changed - reloading page');
        window.location.reload();
      });

      // Check for updates periodically
      this.startUpdateCheck();

      return true;
    } catch (error) {
      console.error('[SW Manager] Service Worker registration failed:', error);
      return false;
    }
  }

  /**
   * Handle service worker update found
   */
  handleUpdateFound() {
    const newWorker = this.registration.installing;

    newWorker.addEventListener('statechange', () => {
      if (newWorker.state === 'installed') {
        if (navigator.serviceWorker.controller) {
          // New update available
          console.log('[SW Manager] New update available');
          this.updateAvailable = true;
          this.emit('updateAvailable', newWorker);
        } else {
          // First install
          console.log('[SW Manager] Content cached for offline use');
          this.emit('firstInstall');
        }
      }
    });
  }

  /**
   * Skip waiting and activate new service worker
   */
  async skipWaiting() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdates() {
    if (this.registration) {
      try {
        await this.registration.update();
        console.log('[SW Manager] Checked for updates');
      } catch (error) {
        console.error('[SW Manager] Update check failed:', error);
      }
    }
  }

  /**
   * Start periodic update checks
   */
  startUpdateCheck() {
    // Check for updates every 30 minutes
    setInterval(() => {
      if (this.isOnline) {
        this.checkForUpdates();
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Setup online/offline event handlers
   */
  setupOnlineOfflineHandlers() {
    window.addEventListener('online', () => {
      console.log('[SW Manager] Back online');
      this.isOnline = true;
      this.emit('online');
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      console.log('[SW Manager] Gone offline');
      this.isOnline = false;
      this.emit('offline');
    });
  }

  /**
   * Request background sync
   */
  async requestBackgroundSync(tag = 't3000-data-sync') {
    if (this.registration && 'sync' in window.ServiceWorkerRegistration.prototype) {
      try {
        await this.registration.sync.register(tag);
        console.log('[SW Manager] Background sync registered:', tag);
      } catch (error) {
        console.error('[SW Manager] Background sync registration failed:', error);
      }
    }
  }

  /**
   * Sync pending data when coming back online
   */
  async syncPendingData() {
    try {
      await this.requestBackgroundSync();
    } catch (error) {
      console.error('[SW Manager] Failed to sync pending data:', error);
    }
  }

  /**
   * Cache T3000 data for offline access
   */
  async cacheT3000Data(data) {
    if (!this.isSupported) return false;

    try {
      const cache = await caches.open('t3000-data-cache-v1');
      const response = new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json' }
      });

      await cache.put('/api/t3000-data', response);
      console.log('[SW Manager] T3000 data cached');
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to cache T3000 data:', error);
      return false;
    }
  }

  /**
   * Get cached T3000 data
   */
  async getCachedT3000Data() {
    if (!this.isSupported) return null;

    try {
      const cache = await caches.open('t3000-data-cache-v1');
      const response = await cache.match('/api/t3000-data');

      if (response) {
        const data = await response.json();
        console.log('[SW Manager] Retrieved cached T3000 data');
        return data;
      }

      return null;
    } catch (error) {
      console.error('[SW Manager] Failed to get cached T3000 data:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  async clearCaches() {
    if (!this.isSupported) return false;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
      console.log('[SW Manager] All caches cleared');
      return true;
    } catch (error) {
      console.error('[SW Manager] Failed to clear caches:', error);
      return false;
    }
  }

  /**
   * Get cache storage info
   */
  async getCacheInfo() {
    if (!this.isSupported || !('storage' in navigator)) {
      return { supported: false };
    }

    try {
      const estimate = await navigator.storage.estimate();
      const cacheNames = await caches.keys();

      const cacheDetails = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return { name, entries: keys.length };
        })
      );

      return {
        supported: true,
        quota: estimate.quota,
        usage: estimate.usage,
        caches: cacheDetails
      };
    } catch (error) {
      console.error('[SW Manager] Failed to get cache info:', error);
      return { supported: false, error: error.message };
    }
  }

  /**
   * Event system for service worker events
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[SW Manager] Event callback error:', error);
        }
      });
    }
  }

  /**
   * Unregister service worker
   */
  async unregister() {
    if (this.registration) {
      try {
        const result = await this.registration.unregister();
        console.log('[SW Manager] Service Worker unregistered:', result);
        return result;
      } catch (error) {
        console.error('[SW Manager] Failed to unregister Service Worker:', error);
        return false;
      }
    }
    return false;
  }
}

// Create global instance
export const serviceWorkerManager = new ServiceWorkerManager();

// Vue composition API hook
export function useServiceWorker() {
  return {
    isSupported: serviceWorkerManager.isSupported,
    isOnline: serviceWorkerManager.isOnline,
    updateAvailable: serviceWorkerManager.updateAvailable,
    register: serviceWorkerManager.register.bind(serviceWorkerManager),
    skipWaiting: serviceWorkerManager.skipWaiting.bind(serviceWorkerManager),
    checkForUpdates: serviceWorkerManager.checkForUpdates.bind(serviceWorkerManager),
    cacheT3000Data: serviceWorkerManager.cacheT3000Data.bind(serviceWorkerManager),
    getCachedT3000Data: serviceWorkerManager.getCachedT3000Data.bind(serviceWorkerManager),
    clearCaches: serviceWorkerManager.clearCaches.bind(serviceWorkerManager),
    getCacheInfo: serviceWorkerManager.getCacheInfo.bind(serviceWorkerManager),
    on: serviceWorkerManager.on.bind(serviceWorkerManager),
    off: serviceWorkerManager.off.bind(serviceWorkerManager)
  };
}

export default ServiceWorkerManager;
