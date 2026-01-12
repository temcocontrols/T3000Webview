/**
 * Application Configuration Service
 *
 * Centralized API for storing and retrieving application configuration.
 * Replaces localStorage with database-backed storage for better reliability,
 * cross-device sync, and large data handling (especially graphics data).
 *
 * @example
 * // Save graphics state for a device
 * await AppConfigService.setConfig({
 *   key: 'deviceAppState',
 *   value: { version: '0.8.1', items: [...] },
 *   deviceSerial: 237219
 * });
 *
 * // Load graphics state
 * const state = await AppConfigService.getConfig('deviceAppState', { deviceSerial: 237219 });
 *
 * // Save user preference
 * await AppConfigService.setUserConfig(userId, 'ui.theme', 'dark');
 */

export interface ConfigOptions {
  userId?: number;
  deviceSerial?: number;
  panelId?: number;
}

export interface SetConfigRequest {
  key: string;
  value: any;
  userId?: number;
  deviceSerial?: number;
  panelId?: number;
  version?: string;
  description?: string;
}

export interface ConfigModel {
  id: number;
  config_key: string;
  config_value: string;
  config_type: 'string' | 'number' | 'boolean' | 'json';
  description?: string;
  user_id?: number;
  device_serial?: number;
  panel_id?: number;
  is_system: boolean;
  version?: string;
  size_bytes?: number;
  created_at: string;
  updated_at: string;
}

export interface ConfigResponse {
  success: boolean;
  message: string;
  data?: ConfigModel;
}

export interface ConfigListResponse {
  success: boolean;
  message: string;
  count: number;
  data: ConfigModel[];
}

export interface ConfigStatsResponse {
  success: boolean;
  stats: {
    total_configs: number;
    system_configs: number;
    user_configs: number;
    large_configs_count: number;
    total_size_bytes: number;
    total_size_mb: number;
  };
}

export class AppConfigService {
  private static baseUrl = '/api/config';

  /**
   * Build query string from options
   */
  private static buildQueryString(options?: ConfigOptions): string {
    if (!options) return '';

    const params = new URLSearchParams();
    if (options.userId !== undefined) params.append('user_id', String(options.userId));
    if (options.deviceSerial !== undefined) params.append('device_serial', String(options.deviceSerial));
    if (options.panelId !== undefined) params.append('panel_id', String(options.panelId));

    const query = params.toString();
    return query ? `?${query}` : '';
  }

  /**
   * Get configuration by key
   */
  static async getConfig(key: string, options?: ConfigOptions): Promise<ConfigModel | null> {
    try {
      const query = this.buildQueryString(options);
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}${query}`);

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Failed to get config: ${response.statusText}`);
      }

      const result: ConfigResponse = await response.json();
      return result.data || null;
    } catch (error) {
      console.error(`Error getting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration value (parsed from JSON if needed)
   */
  static async getConfigValue<T = any>(key: string, options?: ConfigOptions): Promise<T | null> {
    const config = await this.getConfig(key, options);
    if (!config) return null;

    try {
      // Try to parse as JSON
      return JSON.parse(config.config_value) as T;
    } catch {
      // Return as-is if not valid JSON
      return config.config_value as any;
    }
  }

  /**
   * Set or update configuration
   */
  static async setConfig(request: SetConfigRequest): Promise<ConfigModel> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: request.key,
          value: request.value,
          user_id: request.userId,
          device_serial: request.deviceSerial,
          panel_id: request.panelId,
          version: request.version,
          description: request.description,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to set config: ${response.statusText}`);
      }

      const result: ConfigResponse = await response.json();
      if (!result.data) {
        throw new Error('No data returned from set config');
      }

      return result.data;
    } catch (error) {
      console.error(`Error setting config ${request.key}:`, error);
      throw error;
    }
  }

  /**
   * Delete configuration
   */
  static async deleteConfig(key: string, options?: ConfigOptions): Promise<boolean> {
    try {
      const query = this.buildQueryString(options);
      const response = await fetch(`${this.baseUrl}/${encodeURIComponent(key)}${query}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 404) return false;
        throw new Error(`Failed to delete config: ${response.statusText}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error(`Error deleting config ${key}:`, error);
      throw error;
    }
  }

  /**
   * Get all configurations with matching key prefix
   * @example getConfigsByPrefix('t3.', { userId: 1 }) // Gets all t3.* configs for user
   */
  static async getConfigsByPrefix(prefix: string, options?: ConfigOptions): Promise<ConfigModel[]> {
    try {
      const query = this.buildQueryString(options);
      const response = await fetch(`${this.baseUrl}/prefix/${encodeURIComponent(prefix)}${query}`);

      if (!response.ok) {
        throw new Error(`Failed to get configs by prefix: ${response.statusText}`);
      }

      const result: ConfigListResponse = await response.json();
      return result.data || [];
    } catch (error) {
      console.error(`Error getting configs by prefix ${prefix}:`, error);
      throw error;
    }
  }

  /**
   * Get all configurations for a specific device
   */
  static async getDeviceConfigs(deviceSerial: number): Promise<ConfigModel[]> {
    try {
      const response = await fetch(`${this.baseUrl}/device/${deviceSerial}`);

      if (!response.ok) {
        throw new Error(`Failed to get device configs: ${response.statusText}`);
      }

      const result: ConfigListResponse = await response.json();
      return result.data || [];
    } catch (error) {
      console.error(`Error getting device configs for ${deviceSerial}:`, error);
      throw error;
    }
  }

  /**
   * Get configuration storage statistics
   */
  static async getStats(): Promise<ConfigStatsResponse['stats']> {
    try {
      const response = await fetch(`${this.baseUrl}/stats`);

      if (!response.ok) {
        throw new Error(`Failed to get config stats: ${response.statusText}`);
      }

      const result: ConfigStatsResponse = await response.json();
      return result.stats;
    } catch (error) {
      console.error('Error getting config stats:', error);
      throw error;
    }
  }

  /**
   * Migrate data from localStorage to database
   */
  static async migrateFromLocalStorage(
    userId?: number,
    deviceSerial?: number
  ): Promise<{ migrated: number; errors: string[] }> {
    try {
      // Collect all localStorage data
      const data: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          try {
            data[key] = JSON.parse(localStorage.getItem(key) || 'null');
          } catch {
            data[key] = localStorage.getItem(key);
          }
        }
      }

      const response = await fetch(`${this.baseUrl}/migrate-localstorage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data,
          user_id: userId,
          device_serial: deviceSerial,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to migrate localStorage: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        migrated: result.migrated_count,
        errors: result.errors || [],
      };
    } catch (error) {
      console.error('Error migrating localStorage:', error);
      throw error;
    }
  }

  // ========== Convenience Methods ==========

  /**
   * Save graphics state for a device
   */
  static async saveGraphicsState(deviceSerial: number, appState: any, version = '0.8.1'): Promise<void> {
    await this.setConfig({
      key: 'deviceAppState',
      value: appState,
      deviceSerial,
      version,
      description: `Graphics canvas state for device ${deviceSerial}`,
    });
  }

  /**
   * Load graphics state for a device
   */
  static async loadGraphicsState(deviceSerial: number): Promise<any | null> {
    return await this.getConfigValue('deviceAppState', { deviceSerial });
  }

  /**
   * Save user-specific configuration
   */
  static async setUserConfig(userId: number, key: string, value: any): Promise<void> {
    await this.setConfig({
      key,
      value,
      userId,
      description: `User setting: ${key}`,
    });
  }

  /**
   * Get user-specific configuration
   */
  static async getUserConfig<T = any>(userId: number, key: string): Promise<T | null> {
    return await this.getConfigValue<T>(key, { userId });
  }

  /**
   * Save device-specific configuration
   */
  static async setDeviceConfig(deviceSerial: number, key: string, value: any): Promise<void> {
    await this.setConfig({
      key,
      value,
      deviceSerial,
      description: `Device setting: ${key}`,
    });
  }

  /**
   * Get device-specific configuration
   */
  static async getDeviceConfig<T = any>(deviceSerial: number, key: string): Promise<T | null> {
    return await this.getConfigValue<T>(key, { deviceSerial });
  }

  /**
   * Save global configuration
   */
  static async setGlobalConfig(key: string, value: any): Promise<void> {
    await this.setConfig({
      key,
      value,
      description: `Global setting: ${key}`,
    });
  }

  /**
   * Get global configuration
   */
  static async getGlobalConfig<T = any>(key: string): Promise<T | null> {
    return await this.getConfigValue<T>(key);
  }

  /**
   * Save all T3 configs (t3.library, t3.draw, t3.state, etc.)
   */
  static async saveT3Configs(userId: number, configs: Record<string, any>): Promise<void> {
    const promises = Object.entries(configs).map(([key, value]) =>
      this.setUserConfig(userId, key, value)
    );
    await Promise.all(promises);
  }

  /**
   * Load all T3 configs for a user
   */
  static async loadT3Configs(userId: number): Promise<Record<string, any>> {
    const configs = await this.getConfigsByPrefix('t3.', { userId });
    const result: Record<string, any> = {};

    for (const config of configs) {
      try {
        result[config.config_key] = JSON.parse(config.config_value);
      } catch {
        result[config.config_key] = config.config_value;
      }
    }

    return result;
  }

  /**
   * Clear all localStorage and migrate to database
   * @returns Number of items migrated
   */
  static async migrateAndClearLocalStorage(
    userId?: number,
    deviceSerial?: number
  ): Promise<number> {
    const result = await this.migrateFromLocalStorage(userId, deviceSerial);

    if (result.errors.length === 0) {
      // Only clear if migration was successful
      localStorage.clear();
      console.log(`�?Migrated ${result.migrated} items from localStorage to database`);
    } else {
      console.warn(`⚠️ Migration completed with errors:`, result.errors);
    }

    return result.migrated;
  }
}

// Export default instance
export default AppConfigService;
