

import HvConstant from "../Data/Constant/HvConstant"

class T3Util {
  // Helper for console logging

  /**
   * Logs messages to console if not in production environment
   * Provides conditional logging functionality for development and testing
   * @param message - The main message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static Log(message, ...additionalParams) {
    if (HvConstant.Default.Environment.toLowerCase() !== "dev") {
      if (additionalParams == null || additionalParams.length === 0) {
        console.log.apply(console, [message]);
      } else {
        console.log.apply(console, [message].concat(additionalParams));
      }
    }
  }

  //@param forcePrint - If true, forces the message to be logged regardless of environment
  static LogDev(message: any, forcePrint: boolean, ...additionalParams: any[]): void {
    if (forcePrint || HvConstant.Default.Environment.toLowerCase() !== "dev") {
      if (additionalParams == null || additionalParams.length === 0) {
        console.log.apply(console, [message]);
      } else {
        console.log.apply(console, [message].concat(additionalParams));
      }
    }
  }

  /**
   * Logs an error message to the console
   * @param message - The error message to log
   * @param additionalParams - Optional additional parameters to log
   */
  static LogError(message: any, ...additionalParams: any[]): void {
    if (HvConstant.Default.Environment.toLowerCase() !== "dev") {
      if (additionalParams == null || additionalParams.length === 0) {
        console.error.apply(console, [message]);
      } else {
        console.error.apply(console, [message].concat(additionalParams));
      }
    }
  }
}

export default T3Util
