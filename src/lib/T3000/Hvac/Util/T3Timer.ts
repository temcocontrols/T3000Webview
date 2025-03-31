
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
   * @param callback - The function to be called on interval
   * @param intervalMs - Time in milliseconds between executions
   * @returns A unique timer identifier
   */
  public setInterval(callback: Function, intervalMs: number): number {
    const timerId = T3Timer.getNewTimerId();
    const callExpression = T3Timer.buildCallExpression(this.context, timerId, arguments);
    T3Timer.timerRegistry[timerId].timer = window.setInterval(callExpression, intervalMs);
    return timerId;
  }

  /**
   * Sets a timeout to execute a callback once after a delay
   * @param callback - The function to be called after delay
   * @param delayMs - Time in milliseconds to wait before execution
   * @returns A unique timer identifier
   */
  public setTimeout(callback: Function, delayMs: number): number {
    const timerId = T3Timer.getNewTimerId();
    T3Timer.buildCallExpression(this.context, timerId, arguments);
    T3Timer.timerRegistry[timerId].timer = window.setTimeout(() => T3Timer.executeOnce(timerId), delayMs);
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
   * Builds a call expression string and stores necessary context and arguments
   * @param context - The object context for the callback
   * @param timerId - The timer identifier
   * @param args - The original arguments passed to timer methods
   * @returns A string representing the function call
   */
  private static buildCallExpression(context: any, timerId: number, args: IArguments): string {
    let callExpression = '';
    T3Timer.timerRegistry[timerId] = [];

    if (context !== window) {
      T3Timer.timerRegistry[timerId].obj = context;
      callExpression = `T3Timer.timerRegistry[${timerId}].obj.`;
    }

    callExpression += `${args[0]}(`;

    if (args.length > 2) {
      T3Timer.timerRegistry[timerId][0] = args[2];
      callExpression += `T3Timer.timerRegistry[${timerId}][0]`;

      for (let i = 1; i + 2 < args.length; i++) {
        T3Timer.timerRegistry[timerId][i] = args[i + 2];
        callExpression += `, T3Timer.timerRegistry[${timerId}][${i}]`;
      }
    }

    callExpression += ');';
    T3Timer.timerRegistry[timerId].call = callExpression;

    return callExpression;
  }

  /**
   * Executes a call expression once and cleans up the registry entry
   * @param timerId - The timer identifier to execute and clean up
   */
  private static executeOnce(timerId: number): void {
    if (T3Timer.timerRegistry[timerId]) {
      const callExpression = T3Timer.timerRegistry[timerId].call;
      eval(callExpression);
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
