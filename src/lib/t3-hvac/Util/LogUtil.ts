
import HvConstant from "../Data/Constant/HvConstant"

/**
 * Utility class for conditional logging with different severity levels.
 * Automatically enables debug/info logs in development and disables in production builds.
 *
 * Uses Vite's import.meta.env.DEV for automatic environment detection:
 * - Development (npm run dev): Debug and Info enabled by default
 * - Production (npm run build): Only Error enabled by default
 *
 * File logging is always enabled - all logs sent to backend files
 * Can be overridden via localStorage config: { log: { debug: true, info: true, error: true } }
 */
class LogUtil {

  // Static properties to control log levels
  // In dev mode: defaults to true for debug/info, in prod: defaults to false
  private static _enableDebug: boolean | null = null;
  private static _enableInfo: boolean | null = null;
  private static _enableError: boolean | null = null;
  private static _fileLoggingOverride: boolean | null = null;
  private static configLoaded: boolean = false;

  /**
   * Get debug log status
   * Priority: localStorage > HvConstant.LogConfig.Debug > import.meta.env.DEV
   */
  static get enableDebug(): boolean {
    if (!this.configLoaded) this.LoadConfig();
    if (this._enableDebug !== null) return this._enableDebug; // localStorage override

    const configValue = HvConstant.LogConfig.Debug;
    if (typeof configValue === 'boolean') return configValue; // HvConstant override

    return import.meta.env.DEV; // Auto-enable in dev, disable in prod
  }

  /**
   * Get info log status
   * Priority: localStorage > HvConstant.LogConfig.Info > import.meta.env.DEV
   */
  static get enableInfo(): boolean {
    if (!this.configLoaded) this.LoadConfig();
    if (this._enableInfo !== null) return this._enableInfo; // localStorage override

    const configValue = HvConstant.LogConfig.Info;
    if (typeof configValue === 'boolean') return configValue; // HvConstant override

    return import.meta.env.DEV; // Auto-enable in dev, disable in prod
  }

  /**
   * Get error log status
   * Priority: localStorage > HvConstant.LogConfig.Error > true (always enabled)
   */
  static get enableError(): boolean {
    if (!this.configLoaded) this.LoadConfig();
    if (this._enableError !== null) return this._enableError; // localStorage override

    const configValue = HvConstant.LogConfig.Error;
    if (typeof configValue === 'boolean') return configValue; // HvConstant override

    return true; // Always enabled by default
  }

  /**
   * Get file logging status
   * Priority: localStorage > HvConstant.LogConfig.FileLogging > true (always enabled)
   */
  static get enableFileLogging(): boolean {
    if (!this.configLoaded) this.LoadConfig();
    if (this._fileLoggingOverride !== null) return this._fileLoggingOverride; // localStorage override

    const configValue = HvConstant.LogConfig.FileLogging;
    if (typeof configValue === 'boolean') return configValue; // HvConstant override

    return true; // Always enabled by default
  }

  constructor() {
    LogUtil.LoadConfig();
  }

  /**
   * Loads log configuration from localStorage if available
   * Overrides default environment-based settings
   *
   * Config format in localStorage 't3.config':
   * { log: { debug: boolean, info: boolean, error: boolean } }
   */
  static LoadConfig(): void {
    if (this.configLoaded) return;

    try {
      const data = localStorage.getItem("t3.config");
      const config = data ? JSON.parse(data) : null;

      if (config && config.log) {
        // Only override if explicitly set in config (not undefined)
        if (typeof config.log.debug === 'boolean') {
          this._enableDebug = config.log.debug;
        }
        if (typeof config.log.info === 'boolean') {
          this._enableInfo = config.log.info;
        }
        if (typeof config.log.error === 'boolean') {
          this._enableError = config.log.error;
        }
        if (typeof config.log.fileLogging === 'boolean') {
          this._fileLoggingOverride = config.log.fileLogging;
        }
      }

      this.configLoaded = true;
    } catch (error) {
      console.error('= u.LogUtil: LoadConfig/ Failed to load log configuration from storage:', error);
      this.configLoaded = true;
    }
  }

  /**
   * Reset log configuration to environment defaults
   */
  static ResetConfig(): void {
    this._enableDebug = null;
    this._enableInfo = null;
    this._enableError = null;
    this.configLoaded = false;
    try {
      localStorage.removeItem('t3.config');
    } catch (error) {
      // Silent fail
    }
  }

  /**
   * Send log to backend file logging system
   * Always sends since fileLogging is hardcoded to true
   */
  private static async LogToBackend(level: 'debug' | 'info' | 'error', message: string, ...params: any[]): Promise<void> {
    if (!this.enableFileLogging) return;

    try {
      await fetch('http://localhost:9103/api/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          level,
          category: 'Frontend_HVAC',
          message: typeof message === 'string' ? message : JSON.stringify(message),
          params: params.length > 0 ? params : undefined,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      // Silent fail - don't break app if logging fails
      // Only log to console in dev mode
      if (import.meta.env.DEV) {
        console.warn('Failed to send log to backend:', error);
      }
    }
  }

  /**
   * Logs debug messages to console (dev mode) and to backend files
   * @param message - The main message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Debug(message: any, ...additionalParams: any[]): void {
    // Console logging
    if (this.enableDebug) {
      if (additionalParams == null || additionalParams.length === 0) {
        console.log.apply(console, [message]);
      } else {
        console.log.apply(console, [message].concat(additionalParams));
      }
    }

    // File logging (async, non-blocking)
    this.LogToBackend('debug', message, ...additionalParams);
  }

  /**
   * Logs info messages to console (dev mode) and to backend files
   * @param message - The information message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Info(message: any, ...additionalParams: any[]): void {
    // Console logging
    if (this.enableInfo) {
      if (additionalParams == null || additionalParams.length === 0) {
        console.log.apply(console, [message]);
      } else {
        console.log.apply(console, [message].concat(additionalParams));
      }
    }

    // File logging (async, non-blocking)
    this.LogToBackend('info', message, ...additionalParams);
  }

  /**
   * Logs warning messages to console (dev mode) and to backend files
   * @param message - The warning message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Warn(message: any, ...additionalParams: any[]): void {
    // Console logging (use same flag as Info for warnings)
    if (this.enableInfo) {
      if (additionalParams == null || additionalParams.length === 0) {
        console.warn.apply(console, [message]);
      } else {
        console.warn.apply(console, [message].concat(additionalParams));
      }
    }

    // File logging (async, non-blocking)
    this.LogToBackend('info', message, ...additionalParams);
  }

  /**
   * Logs error messages to console and to backend files
   * @param message - The error message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Error(message: any, ...additionalParams: any[]): void {
    // Console logging
    if (this.enableError) {
      if (additionalParams == null || additionalParams.length === 0) {
        console.error.apply(console, [message]);
      } else {
        console.error.apply(console, [message].concat(additionalParams));
      }
    }

    // File logging (async, non-blocking)
    this.LogToBackend('error', message, ...additionalParams);
  }
}

export default LogUtil
