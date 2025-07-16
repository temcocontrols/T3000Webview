# T3000 Library Refactoring Plan

## Overview
This document provides a comprehensive refactoring plan for the T3000 library, including specific code improvements, architectural changes, and implementation strategies.

## Phase 1: Critical Bug Fixes (Weeks 1-2)

### 1.1 Memory Leak Fixes

#### WebSocketClient.ts Refactoring
**Current Issues:**
- Event listeners never removed
- Multiple onopen handlers without cleanup
- Intervals not cleared

**Refactored Implementation:**
```typescript
// src/lib/T3000/Hvac/Opt/Socket/WebSocketClient.ts
interface WebSocketClientConfig {
  maxRetries: number;
  pingInterval: number;
  reconnectDelay: number;
  maxReconnectDelay: number;
}

class WebSocketClient {
  private socket: WebSocket | null = null;
  private retries: number = 0;
  private pingIntervalId: number | null = null;
  private reconnectTimeoutId: number | null = null;
  private isDestroyed: boolean = false;
  private messageQueue: string[] = [];
  private readonly config: WebSocketClientConfig;

  constructor(config: Partial<WebSocketClientConfig> = {}) {
    this.config = {
      maxRetries: 10,
      pingInterval: 10000,
      reconnectDelay: 1000,
      maxReconnectDelay: 30000,
      ...config
    };
  }

  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.isDestroyed) {
        reject(new Error('WebSocketClient has been destroyed'));
        return;
      }

      this.cleanup();

      const uri = this.getUri();
      const wsUri = `ws://${uri}:9104`;

      try {
        this.socket = new WebSocket(wsUri);
        this.setupEventHandlers(resolve, reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  private setupEventHandlers(resolve: () => void, reject: (error: Error) => void): void {
    if (!this.socket) return;

    const onOpen = (event: Event) => {
      LogUtil.Info('WebSocket connection opened:', event);
      this.retries = 0;
      this.startPing();
      this.bindCurrentClient();
      this.processPendingMessages();
      this.GetPanelsList();
      resolve();
    };

    const onMessage = (event: MessageEvent) => {
      try {
        this.processMessage(event.data);
      } catch (error) {
        LogUtil.Error('Error processing WebSocket message:', error);
      }
    };

    const onClose = (event: CloseEvent) => {
      LogUtil.Info('WebSocket connection closed:', event);
      this.cleanup();
      if (!this.isDestroyed) {
        this.attemptReconnect();
      }
    };

    const onError = (event: Event) => {
      LogUtil.Error('WebSocket error:', event);
      this.cleanup();

      if (this.retries === 0) {
        // First error, show user notification
        const errorMsg = 'Load device data failed, please check whether the T3000 application is running or not.';
        T3UIUtil.ShowWebSocketError(errorMsg);
      }

      if (!this.isDestroyed) {
        this.attemptReconnect();
      }

      reject(new Error('WebSocket connection failed'));
    };

    this.socket.addEventListener('open', onOpen);
    this.socket.addEventListener('message', onMessage);
    this.socket.addEventListener('close', onClose);
    this.socket.addEventListener('error', onError);
  }

  private cleanup(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }

    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId);
      this.reconnectTimeoutId = null;
    }

    if (this.socket) {
      // Remove all event listeners
      this.socket.removeEventListener('open', this.onOpen);
      this.socket.removeEventListener('message', this.onMessage);
      this.socket.removeEventListener('close', this.onClose);
      this.socket.removeEventListener('error', this.onError);

      if (this.socket.readyState === WebSocket.OPEN) {
        this.socket.close();
      }
      this.socket = null;
    }
  }

  private attemptReconnect(): void {
    if (this.retries >= this.config.maxRetries || this.isDestroyed) {
      LogUtil.Info('Max retries reached or client destroyed. Giving up.');
      return;
    }

    const delay = Math.min(
      this.config.reconnectDelay * Math.pow(2, this.retries),
      this.config.maxReconnectDelay
    );

    LogUtil.Info(`Attempting to reconnect (${this.retries + 1}/${this.config.maxRetries}) in ${delay}ms`);

    this.reconnectTimeoutId = setTimeout(() => {
      this.retries++;
      this.connect().catch(error => {
        LogUtil.Error('Reconnection failed:', error);
      });
    }, delay);
  }

  public sendMessage(message: string): void {
    if (this.isDestroyed) {
      LogUtil.Error('Cannot send message: WebSocketClient has been destroyed');
      return;
    }

    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(message);
        LogUtil.Info('Message sent:', message);
      } catch (error) {
        LogUtil.Error('Failed to send message:', error);
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);

      // If not connected, attempt to connect
      if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
        this.connect().catch(error => {
          LogUtil.Error('Failed to connect for sending message:', error);
        });
      }
    }
  }

  private processPendingMessages(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      if (message) {
        this.sendMessage(message);
      }
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    this.cleanup();
    this.messageQueue = [];
  }
}
```

#### EvtUtil.ts Event Cleanup
**Current Issues:**
- jQuery events not removed
- Hammer.js events not cleaned up
- Global event state not managed

**Refactored Implementation:**
```typescript
// src/lib/T3000/Hvac/Event/EvtUtil.ts
class EvtUtil {
  private static eventHandlers: Map<string, EventListener> = new Map();
  private static hammerInstances: Map<string, HammerManager> = new Map();

  static initializeEventHandlers(): void {
    // Clean up existing handlers first
    this.cleanup();

    // Mouse events
    const mouseMoveHandler = this.Evt_MouseMove.bind(this);
    const mouseWheelHandler = this.Evt_WorkAreaMouseWheel.bind(this);

    // Store handlers for later cleanup
    this.eventHandlers.set('mousemove', mouseMoveHandler);
    this.eventHandlers.set('wheel', mouseWheelHandler);

    // Add event listeners
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('wheel', mouseWheelHandler, { passive: false });

    // Initialize Hammer.js instances
    this.initializeHammerHandlers();
  }

  private static initializeHammerHandlers(): void {
    const workArea = document.getElementById('svg-area');
    if (!workArea) return;

    const hammer = new Hammer.Manager(workArea);

    // Configure recognizers
    const tap = new Hammer.Tap();
    const pan = new Hammer.Pan();
    const pinch = new Hammer.Pinch();

    hammer.add([tap, pan, pinch]);

    // Bind handlers
    const tapHandler = this.Evt_WorkAreaHammerClick.bind(this);
    const panStartHandler = this.Evt_WorkAreaHammerDragStart.bind(this);
    const panMoveHandler = this.Evt_WorkAreaHammerDrag.bind(this);
    const panEndHandler = this.Evt_WorkAreaHammerDragEnd.bind(this);

    hammer.on('tap', tapHandler);
    hammer.on('panstart', panStartHandler);
    hammer.on('panmove', panMoveHandler);
    hammer.on('panend', panEndHandler);

    // Store for cleanup
    this.hammerInstances.set('workArea', hammer);
  }

  static cleanup(): void {
    // Remove DOM event listeners
    this.eventHandlers.forEach((handler, event) => {
      document.removeEventListener(event, handler);
    });
    this.eventHandlers.clear();

    // Destroy Hammer instances
    this.hammerInstances.forEach((hammer, key) => {
      hammer.destroy();
    });
    this.hammerInstances.clear();

    // Clean up jQuery events
    $(document).off('.t3000');
    $('#svg-area').off('.t3000');
  }

  // Enhanced event handlers with proper error handling
  static Evt_MouseMove(mouseEvent: MouseEvent): void {
    try {
      const svgDoc = T3Gv.opt?.svgDoc;
      if (!svgDoc) return;

      const docInfo = svgDoc.docInfo;
      if (!docInfo) return;

      const isWithinBounds =
        mouseEvent.clientX >= docInfo.dispX &&
        mouseEvent.clientY >= docInfo.dispY &&
        mouseEvent.clientX < docInfo.dispX + docInfo.dispWidth &&
        mouseEvent.clientY < docInfo.dispY + docInfo.dispHeight;

      if (isWithinBounds) {
        const documentCoordinates = svgDoc.ConvertWindowToDocCoords(
          mouseEvent.clientX,
          mouseEvent.clientY
        );

        UIUtil.ShowXY(true);
        UIUtil.UpdateDisplayCoordinates(null, documentCoordinates, null, null);
      } else {
        UIUtil.ShowXY(false);
      }
    } catch (error) {
      LogUtil.Error('Error in Evt_MouseMove:', error);
    }
  }

  static Evt_WorkAreaHammerClick(event: HammerInput): boolean {
    try {
      LogUtil.Debug("WorkAreaHammerClick input:", event);

      Utils2.StopPropagationAndDefaults(event);

      const isRightClick = MouseUtil.IsRightClick(event);

      if (!isRightClick) {
        SelectUtil.ClearSelectionClick();
        UIUtil.ShowContextMenu(false, "WorkArea", "Default");
        UIUtil.ShowObjectConfig(false);
      }

      T3Constant.DocContext.CanTypeInWorkArea = true;

      if (isRightClick) {
        T3Gv.opt.rClickParam = new RightClickMd();
        T3Gv.opt.rClickParam.hitPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
          event.center.x,
          event.center.y
        );

        SelectUtil.ClearSelectionClick();
        UIUtil.ShowContextMenu(true, "WorkArea", "Default");
      }

      LogUtil.Debug("WorkAreaHammerClick output:", isRightClick ? "right-click menu shown" : "selection cleared");
      return false;
    } catch (error) {
      LogUtil.Error('Error in Evt_WorkAreaHammerClick:', error);
      return false;
    }
  }
}
```

### 1.2 Type Safety Improvements

#### Utils1.ts Type Annotations
```typescript
// src/lib/T3000/Hvac/Util/Utils1.ts
interface AlertOptions {
  message?: string;
  additionalText?: string;
  okCallback?: () => void;
  title?: string;
}

class Utils1 {
  static Alert(options: AlertOptions): void {
    const { message, additionalText, okCallback, title = 'Alert' } = options;

    let displayMessage = message || "Error: ";

    if (additionalText) {
      displayMessage += additionalText;
    }

    Dialog.create({
      title,
      message: displayMessage,
      ok: {
        label: 'OK',
        color: 'primary',
        handler: () => {
          if (okCallback && typeof okCallback === 'function') {
            try {
              okCallback();
            } catch (error) {
              LogUtil.Error('Alert callback failed:', error);
            }
          }
        }
      },
      persistent: true
    });
  }

  static IsObject(value: unknown): value is object {
    return value !== null && typeof value === 'object';
  }

  static CloneBlock<T extends object>(sourceObject: T): T {
    if (!this.IsObject(sourceObject)) {
      throw new Error("Parameter is not an object");
    }

    try {
      const objectInstance = this.GetObjectInstance(sourceObject);
      const clonedObject = this.DeepCopy({ ...objectInstance, ...sourceObject });

      if (sourceObject.Data && this.IsObject(sourceObject.Data)) {
        clonedObject.Data = this.DeepCopy(sourceObject.Data);
      }

      return clonedObject;
    } catch (error) {
      LogUtil.Error('Error cloning object:', error);
      throw error;
    }
  }

  static DeepCopy<T>(source: T): T {
    if (source === null || source === undefined) {
      return source;
    }

    // Handle primitive types
    if (typeof source !== 'object') {
      return source;
    }

    // Handle arrays
    if (Array.isArray(source)) {
      return source.map(item => this.DeepCopy(item)) as unknown as T;
    }

    // Handle dates
    if (source instanceof Date) {
      return new Date(source.getTime()) as unknown as T;
    }

    // Handle regular expressions
    if (source instanceof RegExp) {
      return new RegExp(source.source, source.flags) as unknown as T;
    }

    // Handle objects
    if (source.constructor === Object || source.constructor === undefined) {
      const copy = {} as T;

      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          (copy as any)[key] = this.DeepCopy((source as any)[key]);
        }
      }

      return copy;
    }

    // For other object types, try to use constructor
    try {
      const copy = new (source as any).constructor();

      for (const key in source) {
        if (source.hasOwnProperty(key)) {
          (copy as any)[key] = this.DeepCopy((source as any)[key]);
        }
      }

      return copy;
    } catch (error) {
      LogUtil.Error('Error in DeepCopy:', error);
      return source; // Return original if copying fails
    }
  }

  static CalcAngleFromPoints(startPoint: Point, endPoint: Point): number {
    if (!startPoint || !endPoint ||
        typeof startPoint.x !== 'number' || typeof startPoint.y !== 'number' ||
        typeof endPoint.x !== 'number' || typeof endPoint.y !== 'number') {
      throw new Error('Invalid point coordinates');
    }

    const deltaX = endPoint.x - startPoint.x;
    const deltaY = endPoint.y - startPoint.y;

    if (deltaY === 0) {
      return deltaX >= 0 ? 0 : 180;
    }

    if (deltaX === 0) {
      return deltaY > 0 ? 90 : 270;
    }

    let angle = Math.atan(deltaY / deltaX) * (180 / Math.PI);

    if (deltaX < 0) {
      angle += 180;
    } else if (deltaY < 0) {
      angle += 360;
    }

    return angle;
  }

  static RoundCoord(value: number | string): number {
    const numValue = Number(value);

    if (isNaN(numValue)) {
      throw new Error(`Invalid coordinate value: ${value}`);
    }

    return Math.round(1000 * numValue) / 1000;
  }
}
```

## Phase 2: Architectural Improvements (Weeks 3-8)

### 2.1 State Management Refactoring

#### Replace Global State with Proper State Management
```typescript
// src/lib/T3000/Hvac/Data/StateManager.ts
interface AppState {
  project: ProjectState;
  ui: UIState;
  device: DeviceState;
  library: LibraryState;
}

interface StateChangeEvent<T = any> {
  type: string;
  payload: T;
  timestamp: number;
}

class StateManager {
  private state: AppState;
  private listeners: Map<string, Set<(event: StateChangeEvent) => void>> = new Map();
  private history: StateChangeEvent[] = [];
  private maxHistorySize: number = 100;

  constructor(initialState: AppState) {
    this.state = this.deepFreeze(initialState);
  }

  getState(): Readonly<AppState> {
    return this.state;
  }

  dispatch<T>(type: string, payload: T): void {
    const event: StateChangeEvent<T> = {
      type,
      payload,
      timestamp: Date.now()
    };

    // Update state
    this.state = this.reducer(this.state, event);

    // Add to history
    this.history.push(event);
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Notify listeners
    this.notifyListeners(event);
  }

  subscribe(eventType: string, listener: (event: StateChangeEvent) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
      }
    };
  }

  private reducer(state: AppState, event: StateChangeEvent): AppState {
    switch (event.type) {
      case 'SET_PROJECT':
        return {
          ...state,
          project: { ...state.project, ...event.payload }
        };

      case 'SET_UI_STATE':
        return {
          ...state,
          ui: { ...state.ui, ...event.payload }
        };

      case 'SET_DEVICE_STATE':
        return {
          ...state,
          device: { ...state.device, ...event.payload }
        };

      default:
        return state;
    }
  }

  private notifyListeners(event: StateChangeEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          LogUtil.Error('Error in state listener:', error);
        }
      });
    }
  }

  private deepFreeze<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    Object.freeze(obj);

    Object.getOwnPropertyNames(obj).forEach(property => {
      if ((obj as any)[property] !== null && typeof (obj as any)[property] === 'object') {
        this.deepFreeze((obj as any)[property]);
      }
    });

    return obj;
  }
}

// Usage
const stateManager = new StateManager(initialState);

// Subscribe to changes
const unsubscribe = stateManager.subscribe('SET_PROJECT', (event) => {
  console.log('Project state changed:', event.payload);
});

// Dispatch changes
stateManager.dispatch('SET_PROJECT', { name: 'New Project' });
```

### 2.2 Error Handling Standardization

#### Global Error Handler
```typescript
// src/lib/T3000/Hvac/Util/ErrorHandler.ts
interface ErrorContext {
  component: string;
  function: string;
  parameters?: any[];
  userAction?: string;
}

enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

interface ErrorReport {
  error: Error;
  context: ErrorContext;
  severity: ErrorSeverity;
  timestamp: number;
  stackTrace?: string;
  userAgent?: string;
}

class ErrorHandler {
  private static instance: ErrorHandler;
  private errorQueue: ErrorReport[] = [];
  private maxQueueSize: number = 50;
  private listeners: Set<(report: ErrorReport) => void> = new Set();

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handleError(error: Error, context: ErrorContext, severity: ErrorSeverity = ErrorSeverity.MEDIUM): void {
    const report: ErrorReport = {
      error,
      context,
      severity,
      timestamp: Date.now(),
      stackTrace: error.stack,
      userAgent: navigator.userAgent
    };

    this.addToQueue(report);
    this.notifyListeners(report);
    this.logError(report);

    if (severity === ErrorSeverity.CRITICAL) {
      this.handleCriticalError(report);
    }
  }

  private addToQueue(report: ErrorReport): void {
    this.errorQueue.push(report);
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift();
    }
  }

  private notifyListeners(report: ErrorReport): void {
    this.listeners.forEach(listener => {
      try {
        listener(report);
      } catch (error) {
        console.error('Error in error handler listener:', error);
      }
    });
  }

  private logError(report: ErrorReport): void {
    const logMessage = `[${report.severity.toUpperCase()}] ${report.context.component}.${report.context.function}: ${report.error.message}`;

    switch (report.severity) {
      case ErrorSeverity.LOW:
        LogUtil.Info(logMessage);
        break;
      case ErrorSeverity.MEDIUM:
        LogUtil.Warn(logMessage);
        break;
      case ErrorSeverity.HIGH:
      case ErrorSeverity.CRITICAL:
        LogUtil.Error(logMessage, report.error);
        break;
    }
  }

  private handleCriticalError(report: ErrorReport): void {
    // Show user notification
    T3UIUtil.ShowError({
      title: 'Critical Error',
      message: 'A critical error has occurred. Please save your work and restart the application.',
      actions: [
        {
          label: 'Save and Restart',
          handler: () => this.saveAndRestart()
        },
        {
          label: 'Continue',
          handler: () => this.continueWithWarning()
        }
      ]
    });
  }

  subscribe(listener: (report: ErrorReport) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  getErrorHistory(): ErrorReport[] {
    return [...this.errorQueue];
  }
}

// Error boundary decorator
function withErrorBoundary<T extends any[], R>(
  target: (...args: T) => R,
  context: Partial<ErrorContext>,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): (...args: T) => R | null {
  return (...args: T): R | null => {
    try {
      return target(...args);
    } catch (error) {
      ErrorHandler.getInstance().handleError(
        error as Error,
        {
          component: context.component || 'Unknown',
          function: context.function || target.name || 'Unknown',
          parameters: args,
          ...context
        },
        severity
      );
      return null;
    }
  };
}

// Usage example
class Utils1 {
  static Alert = withErrorBoundary(
    (options: AlertOptions): void => {
      // Implementation
    },
    { component: 'Utils1', function: 'Alert' },
    ErrorSeverity.LOW
  );

  static DeepCopy = withErrorBoundary(
    <T>(source: T): T => {
      // Implementation
    },
    { component: 'Utils1', function: 'DeepCopy' },
    ErrorSeverity.MEDIUM
  );
}
```

### 2.3 Performance Optimization

#### Lazy Loading and Code Splitting
```typescript
// src/lib/T3000/Hvac/Util/LazyLoader.ts
interface LazyModule<T> {
  loaded: boolean;
  module: T | null;
  loader: () => Promise<T>;
  loading: boolean;
}

class LazyLoader {
  private static modules: Map<string, LazyModule<any>> = new Map();

  static register<T>(name: string, loader: () => Promise<T>): void {
    this.modules.set(name, {
      loaded: false,
      module: null,
      loader,
      loading: false
    });
  }

  static async load<T>(name: string): Promise<T> {
    const moduleInfo = this.modules.get(name);

    if (!moduleInfo) {
      throw new Error(`Module ${name} not registered`);
    }

    if (moduleInfo.loaded) {
      return moduleInfo.module as T;
    }

    if (moduleInfo.loading) {
      // Wait for current loading to complete
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const updatedInfo = this.modules.get(name);
          if (updatedInfo?.loaded) {
            clearInterval(checkInterval);
            resolve(updatedInfo.module as T);
          } else if (!updatedInfo?.loading) {
            clearInterval(checkInterval);
            reject(new Error(`Module ${name} failed to load`));
          }
        }, 100);
      });
    }

    moduleInfo.loading = true;

    try {
      const module = await moduleInfo.loader();
      moduleInfo.module = module;
      moduleInfo.loaded = true;
      moduleInfo.loading = false;

      return module;
    } catch (error) {
      moduleInfo.loading = false;
      throw error;
    }
  }

  static isLoaded(name: string): boolean {
    return this.modules.get(name)?.loaded || false;
  }

  static preload(name: string): Promise<void> {
    return this.load(name).then(() => {});
  }
}

// Register modules
LazyLoader.register('AdvancedShapes', () => import('../Shape/AdvancedShapes'));
LazyLoader.register('3DRenderer', () => import('../Renderer/3DRenderer'));
LazyLoader.register('ExportUtils', () => import('../Util/ExportUtils'));

// Usage
const advancedShapes = await LazyLoader.load('AdvancedShapes');
```

## Phase 3: Testing and Quality Assurance (Weeks 9-12)

### 3.1 Unit Testing Framework
```typescript
// src/lib/T3000/Hvac/Test/TestFramework.ts
interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
  timeout?: number;
}

interface TestSuite {
  name: string;
  beforeEach?: () => void | Promise<void>;
  afterEach?: () => void | Promise<void>;
  cases: TestCase[];
}

class TestFramework {
  private suites: TestSuite[] = [];
  private results: Map<string, { passed: number; failed: number; errors: Error[] }> = new Map();

  describe(name: string, fn: () => void): void {
    const suite: TestSuite = { name, cases: [] };

    // Mock global functions for test definition
    global.beforeEach = (fn: () => void | Promise<void>) => { suite.beforeEach = fn; };
    global.afterEach = (fn: () => void | Promise<void>) => { suite.afterEach = fn; };
    global.it = (name: string, fn: () => void | Promise<void>, timeout = 5000) => {
      suite.cases.push({ name, fn, timeout });
    };

    fn();

    this.suites.push(suite);
  }

  async run(): Promise<void> {
    for (const suite of this.suites) {
      console.log(`\n🧪 Running test suite: ${suite.name}`);

      const result = { passed: 0, failed: 0, errors: [] as Error[] };

      for (const testCase of suite.cases) {
        try {
          if (suite.beforeEach) {
            await suite.beforeEach();
          }

          const startTime = Date.now();
          await Promise.race([
            testCase.fn(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Test timeout')), testCase.timeout)
            )
          ]);

          const duration = Date.now() - startTime;
          console.log(`  ✅ ${testCase.name} (${duration}ms)`);
          result.passed++;

        } catch (error) {
          console.log(`  ❌ ${testCase.name}: ${error.message}`);
          result.failed++;
          result.errors.push(error as Error);
        } finally {
          if (suite.afterEach) {
            try {
              await suite.afterEach();
            } catch (error) {
              console.log(`  ⚠️  afterEach failed: ${error.message}`);
            }
          }
        }
      }

      this.results.set(suite.name, result);
      console.log(`  📊 ${result.passed} passed, ${result.failed} failed`);
    }

    this.printSummary();
  }

  private printSummary(): void {
    let totalPassed = 0;
    let totalFailed = 0;

    this.results.forEach((result) => {
      totalPassed += result.passed;
      totalFailed += result.failed;
    });

    console.log(`\n📈 Test Summary: ${totalPassed} passed, ${totalFailed} failed`);

    if (totalFailed > 0) {
      console.log('\n❌ Failed tests:');
      this.results.forEach((result, suiteName) => {
        if (result.failed > 0) {
          console.log(`  ${suiteName}: ${result.failed} failures`);
          result.errors.forEach(error => console.log(`    - ${error.message}`));
        }
      });
    }
  }
}

// Test utilities
class TestUtils {
  static expect(actual: any) {
    return {
      toBe: (expected: any) => {
        if (actual !== expected) {
          throw new Error(`Expected ${expected}, got ${actual}`);
        }
      },
      toEqual: (expected: any) => {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
          throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
      },
      toThrow: (fn: () => void) => {
        let threw = false;
        try {
          fn();
        } catch {
          threw = true;
        }
        if (!threw) {
          throw new Error('Expected function to throw');
        }
      }
    };
  }

  static async waitFor(condition: () => boolean, timeout = 1000): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
      if (Date.now() - startTime > timeout) {
        throw new Error('Timeout waiting for condition');
      }
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
```

### 3.2 Sample Tests
```typescript
// src/lib/T3000/Hvac/Test/Utils1.test.ts
import { TestFramework, TestUtils } from './TestFramework';
import Utils1 from '../Util/Utils1';

const testFramework = new TestFramework();

testFramework.describe('Utils1', () => {
  it('should handle null values in DeepCopy', () => {
    const result = Utils1.DeepCopy(null);
    TestUtils.expect(result).toBe(null);
  });

  it('should clone objects correctly', () => {
    const original = { a: 1, b: { c: 2 } };
    const cloned = Utils1.DeepCopy(original);

    TestUtils.expect(cloned).toEqual(original);
    TestUtils.expect(cloned === original).toBe(false);
    TestUtils.expect(cloned.b === original.b).toBe(false);
  });

  it('should validate coordinates in CalcAngleFromPoints', () => {
    TestUtils.expect(() => {
      Utils1.CalcAngleFromPoints(null, { x: 1, y: 1 });
    }).toThrow();
  });

  it('should calculate angles correctly', () => {
    const angle = Utils1.CalcAngleFromPoints({ x: 0, y: 0 }, { x: 1, y: 0 });
    TestUtils.expect(angle).toBe(0);
  });

  it('should round coordinates properly', () => {
    const result = Utils1.RoundCoord(1.23456);
    TestUtils.expect(result).toBe(1.235);
  });
});

// Run tests
testFramework.run();
```

## Implementation Timeline

### Week 1-2: Critical Fixes
- [ ] Fix WebSocketClient memory leaks
- [ ] Fix EvtUtil event cleanup
- [ ] Add null checks to utility functions
- [ ] Implement basic error boundaries

### Week 3-4: Type Safety
- [ ] Add TypeScript strict mode
- [ ] Add proper type annotations
- [ ] Remove all `any` types
- [ ] Add interface definitions

### Week 5-6: Architecture
- [ ] Implement state management
- [ ] Create error handling system
- [ ] Add lazy loading framework
- [ ] Split large files

### Week 7-8: Performance
- [ ] Optimize deep copy operations
- [ ] Implement caching strategies
- [ ] Add performance monitoring
- [ ] Optimize reactive state

### Week 9-10: Testing
- [ ] Set up test framework
- [ ] Write unit tests for utilities
- [ ] Add integration tests
- [ ] Create mock data systems

### Week 11-12: Documentation
- [ ] Update API documentation
- [ ] Create migration guides
- [ ] Add code examples
- [ ] Create troubleshooting guides

This refactoring plan provides a systematic approach to improving the T3000 library while maintaining backward compatibility and ensuring minimal disruption to existing functionality.
