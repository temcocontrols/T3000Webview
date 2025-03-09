
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
    console.log('T.T3Timer: Creating new timer instance', { context });
    this.context = context || window;
  }

  /**
   * Sets an interval to repeatedly execute a callback
   * @param callback - The function to be called on interval
   * @param intervalMs - Time in milliseconds between executions
   * @returns A unique timer identifier
   */
  public setInterval(callback: Function, intervalMs: number): number {
    console.log('T.T3Timer: Setting interval', { callback: callback.name || 'anonymous', intervalMs });
    const timerId = T3Timer.getNewTimerId();
    const callExpression = T3Timer.buildCallExpression(this.context, timerId, arguments);
    T3Timer.timerRegistry[timerId].timer = window.setInterval(callExpression, intervalMs);
    console.log('T.T3Timer: Interval set with ID', timerId);
    return timerId;
  }

  /**
   * Sets a timeout to execute a callback once after a delay
   * @param callback - The function to be called after delay
   * @param delayMs - Time in milliseconds to wait before execution
   * @returns A unique timer identifier
   */
  public setTimeout(callback: Function, delayMs: number): number {
    console.log('T.T3Timer: Setting timeout', { callback: callback.name || 'anonymous', delayMs });
    const timerId = T3Timer.getNewTimerId();
    T3Timer.buildCallExpression(this.context, timerId, arguments);
    T3Timer.timerRegistry[timerId].timer = window.setTimeout(() => T3Timer.executeOnce(timerId), delayMs);
    console.log('T.T3Timer: Timeout set with ID', timerId);
    return timerId;
  }

  /**
   * Cancels a previously set interval
   * @param timerId - The identifier returned by setInterval
   */
  public clearInterval(timerId: number): void {
    console.log('T.T3Timer: Clearing interval', { timerId });
    if (T3Timer.timerRegistry[timerId]) {
      window.clearInterval(T3Timer.timerRegistry[timerId].timer);
      T3Timer.timerRegistry[timerId] = null;
      console.log('T.T3Timer: Interval cleared', { timerId });
    } else {
      console.log('T.T3Timer: No interval found with ID', timerId);
    }
  }

  /**
   * Cancels a previously set timeout
   * @param timerId - The identifier returned by setTimeout
   */
  public clearTimeout(timerId: number): void {
    console.log('T.T3Timer: Clearing timeout', { timerId });
    if (T3Timer.timerRegistry[timerId]) {
      window.clearTimeout(T3Timer.timerRegistry[timerId].timer);
      T3Timer.timerRegistry[timerId] = null;
      console.log('T.T3Timer: Timeout cleared', { timerId });
    } else {
      console.log('T.T3Timer: No timeout found with ID', timerId);
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
    console.log('T.T3Timer: Building call expression', { timerId });
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

    console.log('T.T3Timer: Call expression built', { callExpression });
    return callExpression;
  }

  /**
   * Executes a call expression once and cleans up the registry entry
   * @param timerId - The timer identifier to execute and clean up
   */
  private static executeOnce(timerId: number): void {
    console.log('T.T3Timer: Executing one-time call', { timerId });
    if (T3Timer.timerRegistry[timerId]) {
      const callExpression = T3Timer.timerRegistry[timerId].call;
      console.log('T.T3Timer: Evaluating expression', { callExpression });
      eval(callExpression);
      T3Timer.timerRegistry[timerId] = null;
      console.log('T.T3Timer: One-time call executed and cleaned up', { timerId });
    } else {
      console.log('T.T3Timer: No timer found with ID', timerId);
    }
  }

  /**
   * Finds an available slot in the timer registry
   * @returns A new unique timer identifier
   */
  private static getNewTimerId(): number {
    let timerId = 0;
    while (T3Timer.timerRegistry[timerId]) timerId++;
    console.log('T.T3Timer: Generated new timer ID', { timerId });
    return timerId;
  }
}

export default T3Timer
