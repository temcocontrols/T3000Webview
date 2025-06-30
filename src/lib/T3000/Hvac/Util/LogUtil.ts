
import HvConstant from "../Data/Constant/HvConstant"
// import DataOpt from "../Opt/Data/DataOpt";

/**
 * Utility class for conditional logging with different severity levels.
 * Provides methods to log debug, info, and error messages based on configuration
 * settings in HvConstant.LogConfig, allowing for environment-specific logging behavior.
 */
class LogUtil {

  // Static properties to control log levels, initialized from HvConstant defaults
  static enableDebug: boolean = HvConstant.LogConfig.Debug;
  static enableInfo: boolean = HvConstant.LogConfig.Info;
  static enableError: boolean = HvConstant.LogConfig.Error;

  constructor() {
    LogUtil.LoadConfig();
  }

  /**
   * Loads log configuration from localStorage if available
   * Updates the log level properties based on stored configuration
   */
  static LoadConfig(): void {
    try {
      // const config = DataOpt.LoadT3Config();
      const data = localStorage.getItem("t3.config");
      const config = data ? JSON.parse(data) : null;
      if (config && config.log) {
        this.enableDebug = config.log.debug ?? this.enableDebug;
        this.enableInfo = config.log.info ?? this.enableInfo;
        this.enableError = config.log.error ?? this.enableError;
      }
    } catch (error) {
      console.error('= u.T3LogUtils: LoadConfig/ Failed to load log configuration from storage:', error);
    }
  }

  /**
   * Logs messages to console if not in production environment
   * Provides conditional logging functionality for development and testing
   * @param message - The main message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Debug(message, ...additionalParams) {
    if (!this.enableDebug) { return; }

    if (additionalParams == null || additionalParams.length === 0) {
      console.log.apply(console, [message]);
    } else {
      console.log.apply(console, [message].concat(additionalParams));
    }
  }

  /**
   * Logs information messages to the console
   * Only logs if EnableInfo is set to true in HvConstant.LogLevel
   * @param message - The information message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Info(message: any, ...additionalParams: any[]): void {
    if (!this.enableInfo) { return; }

    if (additionalParams == null || additionalParams.length === 0) {
      console.log.apply(console, [message]);
    } else {
      console.log.apply(console, [message].concat(additionalParams));
    }
  }

  /**
   * Logs warning messages to the console
   * Uses console.warn for better visibility in browser dev tools
   * @param message - The warning message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Warn(message: any, ...additionalParams: any[]): void {
    if (!this.enableInfo) { return; } // Use same flag as Info for warnings

    if (additionalParams == null || additionalParams.length === 0) {
      console.warn.apply(console, [message]);
    } else {
      console.warn.apply(console, [message].concat(additionalParams));
    }
  }

  /**
   * Logs an error message to the console
   * @param message - The error message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Error(message: any, ...additionalParams: any[]): void {
    if (!this.enableError) { return; }

    if (additionalParams == null || additionalParams.length === 0) {
      console.error.apply(console, [message]);
    } else {
      console.error.apply(console, [message].concat(additionalParams));
    }
  }
}

export default LogUtil
