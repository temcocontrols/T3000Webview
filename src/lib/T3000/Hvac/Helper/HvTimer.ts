
class HvTimer {

  private static set: any[] = [];

  private obj: any;

  constructor(obj?: any) {
    this.obj = obj || window;
  }

  public setInterval(callback: Function, interval: number): number {
    const id = HvTimer.getNew();
    const callString = HvTimer.buildCall(this.obj, id, arguments);
    HvTimer.set[id].timer = window.setInterval(callString, interval);
    return id;
  }

  public setTimeout(callback: Function, delay: number): number {
    const id = HvTimer.getNew();
    HvTimer.buildCall(this.obj, id, arguments);
    HvTimer.set[id].timer = window.setTimeout(() => HvTimer.callOnce(id), delay);
    return id;
  }

  public clearInterval(timerId: number): void {
    if (HvTimer.set[timerId]) {
      window.clearInterval(HvTimer.set[timerId].timer);
      HvTimer.set[timerId] = null;
    }
  }

  public clearTimeout(timerId: number): void {
    if (HvTimer.set[timerId]) {
      window.clearTimeout(HvTimer.set[timerId].timer);
      HvTimer.set[timerId] = null;
    }
  }

  private static buildCall(context: any, timerId: number, args: IArguments): string {
    let callString = '';
    HvTimer.set[timerId] = [];
    if (context !== window) {
      HvTimer.set[timerId].obj = context;
      callString = `HvTimer.set[${timerId}].obj.`;
    }
    callString += `${args[0]}(`;
    if (args.length > 2) {
      HvTimer.set[timerId][0] = args[2];
      callString += `HvTimer.set[${timerId}][0]`;
      for (let i = 1; i + 2 < args.length; i++) {
        HvTimer.set[timerId][i] = args[i + 2];
        callString += `, HvTimer.set[${timerId}][${i}]`;
      }
    }
    callString += ');';
    HvTimer.set[timerId].call = callString;
    return callString;
  }

  private static callOnce(timerId: number): void {
    if (HvTimer.set[timerId]) {
      const callString = HvTimer.set[timerId].call;
      eval(callString);
      HvTimer.set[timerId] = null;
    }
  }

  private static getNew(): number {
    let id = 0;
    while (HvTimer.set[id]) id++;
    return id;
  }
}

export default HvTimer
