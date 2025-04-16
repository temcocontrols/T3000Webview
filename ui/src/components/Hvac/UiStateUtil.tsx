type Listener = (isOpen: boolean) => void;

class UiStateUtil {
  private static instance: UiStateUtil;
  private isOpen = false;
  private listeners: Listener[] = [];

  private constructor() {}

  public static getInstance(): UiStateUtil {
    if (!UiStateUtil.instance) {
      UiStateUtil.instance = new UiStateUtil();
    }
    return UiStateUtil.instance;
  }

  public setDrawerOpen(value: boolean) {
    this.isOpen = value;
    this.notifyListeners();
  }

  public getDrawerOpen(): boolean {
    return this.isOpen;
  }

  public addListener(listener: Listener) {
    this.listeners.push(listener);
  }

  public removeListener(listener: Listener) {
    this.listeners = this.listeners.filter((l) => l !== listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this.isOpen));
  }
}

export default UiStateUtil.getInstance();
