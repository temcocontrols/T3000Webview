
/**
 * A utility class that wraps window's timer functions with enhanced functionality
 */
class T3Timer {

  private static timerRegistry: any[] = [];

  private context: any;

  /**
   * Creates a new timer instance
   * @param context - The context in which callbacks will be executed
   */
  constructor(context?: any) {
    this.context = context || window;
  }

  /**
   * Sets an interval to repeatedly execute a callback
   * @param callback - The function to be called on interval or method name as string
   * @param intervalMs - Time in milliseconds between executions
   * @returns A unique timer identifier
   */
  public setInterval(callback: Function | string, intervalMs: number): number {
    const timerId = T3Timer.getNewTimerId();
    T3Timer.timerRegistry[timerId] = {};

    if (typeof callback === 'string') {
      // Method name string - call on context
      const methodName = callback;
      T3Timer.timerRegistry[timerId].timer = window.setInterval(() => {
        if (this.context && this.context[methodName]) {
          this.context[methodName]();
        }
      }, intervalMs);
    } else {
      // Function reference - call directly
      T3Timer.timerRegistry[timerId].timer = window.setInterval(() => {
        callback.call(this.context);
      }, intervalMs);
    }

    return timerId;
  }

  /**
   * Sets a timeout to execute a callback once after a delay
   * @param callback - The function to be called after delay or method name as string
   * @param delayMs - Time in milliseconds to wait before execution
   * @param ...args - Additional arguments to pass to the callback
   * @returns A unique timer identifier
   */
  public setTimeout(callback: Function | string, delayMs: number, ...args: any[]): number {
    const timerId = T3Timer.getNewTimerId();
    T3Timer.timerRegistry[timerId] = {};

    if (typeof callback === 'string') {
      // Method name string - call on context
      const methodName = callback;
      T3Timer.timerRegistry[timerId].timer = window.setTimeout(() => {
        if (this.context && this.context[methodName]) {
          this.context[methodName](...args);
        }
        T3Timer.timerRegistry[timerId] = null;
      }, delayMs);
    } else {
      // Function reference - call directly
      T3Timer.timerRegistry[timerId].timer = window.setTimeout(() => {
        callback.call(this.context, ...args);
        T3Timer.timerRegistry[timerId] = null;
      }, delayMs);
    }

    return timerId;
  }

  /**
   * Cancels a previously set interval
   * @param timerId - The identifier returned by setInterval
   */
  public clearInterval(timerId: number): void {
    if (T3Timer.timerRegistry[timerId]) {
      window.clearInterval(T3Timer.timerRegistry[timerId].timer);
      T3Timer.timerRegistry[timerId] = null;
    }
  }

  /**
   * Cancels a previously set timeout
   * @param timerId - The identifier returned by setTimeout
   */
  public clearTimeout(timerId: number): void {
    if (T3Timer.timerRegistry[timerId]) {
      window.clearTimeout(T3Timer.timerRegistry[timerId].timer);
      T3Timer.timerRegistry[timerId] = null;
    }
  }

  /**
   * Finds an available slot in the timer registry
   * @returns A new unique timer identifier
   */
  private static getNewTimerId(): number {
    let timerId = 0;
    while (T3Timer.timerRegistry[timerId]) timerId++;
    return timerId;
  }
}

export default T3Timer
