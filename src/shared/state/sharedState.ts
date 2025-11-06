/**
 * Shared state management for cross-framework communication
 * Allows Vue and React apps to share state via localStorage + events
 */

/**
 * SharedState - localStorage-based state sharing between Vue and React
 */
export class SharedState {
  /**
   * Set a shared state value
   * Triggers storage event for other contexts to listen
   */
  static set<T = any>(key: string, value: T): void {
    localStorage.setItem(key, JSON.stringify(value));

    // Manually trigger storage event for same-window listeners
    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: JSON.stringify(value),
        oldValue: localStorage.getItem(key),
        url: window.location.href,
        storageArea: localStorage,
      })
    );
  }

  /**
   * Get a shared state value
   */
  static get<T = any>(key: string): T | null {
    const value = localStorage.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`Failed to parse shared state for key "${key}":`, error);
      return null;
    }
  }

  /**
   * Remove a shared state value
   */
  static remove(key: string): void {
    localStorage.removeItem(key);

    window.dispatchEvent(
      new StorageEvent('storage', {
        key,
        newValue: null,
        oldValue: localStorage.getItem(key),
        url: window.location.href,
        storageArea: localStorage,
      })
    );
  }

  /**
   * Subscribe to changes on a specific key
   * Returns unsubscribe function
   */
  static subscribe<T = any>(
    key: string,
    callback: (value: T | null) => void
  ): () => void {
    const handler = (e: StorageEvent) => {
      if (e.key === key) {
        try {
          const value = e.newValue ? (JSON.parse(e.newValue) as T) : null;
          callback(value);
        } catch (error) {
          console.error(`Failed to parse storage event for key "${key}":`, error);
        }
      }
    };

    window.addEventListener('storage', handler);

    // Return unsubscribe function
    return () => window.removeEventListener('storage', handler);
  }

  /**
   * Clear all shared state
   */
  static clear(): void {
    localStorage.clear();
  }
}

/**
 * EventBus - Real-time cross-framework event communication
 */
export class EventBus {
  /**
   * Emit an event with data
   */
  static emit<T = any>(event: string, data: T): void {
    const customEvent = new CustomEvent(event, { detail: data });
    window.dispatchEvent(customEvent);
  }

  /**
   * Listen to an event
   * Returns unsubscribe function
   */
  static on<T = any>(
    event: string,
    handler: (data: T) => void
  ): () => void {
    const listener = (e: Event) => {
      handler((e as CustomEvent<T>).detail);
    };

    window.addEventListener(event, listener);

    return () => window.removeEventListener(event, listener);
  }

  /**
   * Listen to an event once (auto-unsubscribe after first call)
   */
  static once<T = any>(
    event: string,
    handler: (data: T) => void
  ): void {
    const listener = (e: Event) => {
      handler((e as CustomEvent<T>).detail);
      window.removeEventListener(event, listener);
    };

    window.addEventListener(event, listener);
  }

  /**
   * Remove all listeners for an event
   */
  static off(event: string): void {
    // Note: This is a limitation of CustomEvent - we can't remove all listeners
    // Individual listeners must be removed using the unsubscribe function
    console.warn(
      `EventBus.off() cannot remove all listeners for "${event}". ` +
      `Use the unsubscribe function returned by EventBus.on() instead.`
    );
  }
}

/**
 * Common event names for cross-framework communication
 */
export const SHARED_EVENTS = {
  DEVICE_SELECTED: 'device:selected',
  DEVICE_UPDATED: 'device:updated',
  DEVICE_DELETED: 'device:deleted',
  USER_LOGGED_IN: 'user:logged-in',
  USER_LOGGED_OUT: 'user:logged-out',
  THEME_CHANGED: 'theme:changed',
  NAVIGATION: 'app:navigation',
} as const;

/**
 * Common state keys for localStorage-based sharing
 */
export const SHARED_STATE_KEYS = {
  SELECTED_DEVICE_ID: 'selectedDeviceId',
  SELECTED_POINT_ID: 'selectedPointId',
  UI_THEME: 'uiTheme',
  SIDEBAR_COLLAPSED: 'sidebarCollapsed',
  LAST_ROUTE: 'lastRoute',
} as const;
