# T3000 HVAC Drawing Library - Modernization & Best Practices Guide

## Executive Summary

This guide provides a comprehensive roadmap for modernizing the T3000 HVAC Drawing Library to align with current industry best practices, improve maintainability, enhance performance, and ensure long-term scalability. The recommendations are prioritized by impact and implementation effort.

## Current State Assessment

### Strengths of Current Implementation
- ✅ **Comprehensive Functionality**: Complete CAD system with 454+ TypeScript files
- ✅ **Real-Time Integration**: Sophisticated WebSocket communication with T3000 controllers
- ✅ **Modern Tech Stack**: TypeScript, Vue.js, SVG-based architecture
- ✅ **Professional Features**: Advanced drawing tools, collaboration, data binding
- ✅ **Domain Expertise**: HVAC-specific functionality and symbol libraries

### Critical Modernization Needs
- ❌ **Architecture Debt**: God classes, global state, circular dependencies
- ❌ **Security Vulnerabilities**: XSS risks, insecure file handling, unencrypted communication
- ❌ **Testing Gaps**: Untestable code structure, no unit test coverage
- ❌ **Performance Issues**: Memory leaks, inefficient rendering, no lazy loading
- ❌ **Maintainability Problems**: Poor documentation, inconsistent patterns

## Modernization Roadmap

### Phase 1: Foundation Stabilization (6-8 weeks)

#### 1.1 Architecture Refactoring

**Goal**: Transform from monolithic to modular architecture

**Current Problematic Pattern**:
```typescript
// ❌ God class with 200+ properties and methods
class OptUtil {
  // Selection, drawing, text editing, clipboard, rotation,
  // format painter, auto-scroll, collaboration...
  // 8,119 lines of mixed responsibilities
}
```

**Target Modern Architecture**:
```typescript
// ✅ Modular service-based architecture
interface DrawingContext {
  selection: SelectionService;
  drawing: DrawingService;
  editing: EditingService;
  clipboard: ClipboardService;
  transformation: TransformationService;
  collaboration: CollaborationService;
}

// Dependency injection container
class ServiceContainer {
  private services = new Map<string, any>();

  register<T>(token: ServiceToken<T>, implementation: T): void {
    this.services.set(token.name, implementation);
  }

  resolve<T>(token: ServiceToken<T>): T {
    const service = this.services.get(token.name);
    if (!service) {
      throw new Error(`Service not found: ${token.name}`);
    }
    return service;
  }
}

// Service tokens for type safety
const SERVICE_TOKENS = {
  SELECTION: new ServiceToken<SelectionService>('SelectionService'),
  DRAWING: new ServiceToken<DrawingService>('DrawingService'),
  EDITING: new ServiceToken<EditingService>('EditingService')
} as const;
```

**Implementation Strategy**:
```typescript
// 1. Extract selection management
interface SelectionService {
  getSelected(): ReadonlyArray<DrawableObject>;
  select(objects: DrawableObject[], additive?: boolean): void;
  clear(): void;
  selectInRegion(region: Rectangle): Promise<DrawableObject[]>;
  onSelectionChanged(callback: (selection: DrawableObject[]) => void): Disposable;
}

class SelectionServiceImpl implements SelectionService {
  private selectedObjects = new Set<DrawableObject>();
  private eventEmitter = new EventEmitter<SelectionEvents>();

  select(objects: DrawableObject[], additive = false): void {
    if (!additive) {
      this.selectedObjects.clear();
    }

    objects.forEach(obj => {
      this.selectedObjects.add(obj);
      obj.setSelected(true);
    });

    this.eventEmitter.emit('selectionChanged', Array.from(this.selectedObjects));
  }

  async selectInRegion(region: Rectangle): Promise<DrawableObject[]> {
    const objectsInRegion = await this.findObjectsInRegion(region);
    this.select(objectsInRegion);
    return objectsInRegion;
  }
}

// 2. Extract drawing operations
interface DrawingService {
  createShape(type: ShapeType, bounds: Rectangle): Promise<Result<DrawableObject>>;
  deleteShapes(objects: DrawableObject[]): Promise<Result<void>>;
  transformShapes(transform: TransformMatrix, objects: DrawableObject[]): Promise<Result<void>>;
  duplicateShapes(objects: DrawableObject[]): Promise<Result<DrawableObject[]>>;
}

class DrawingServiceImpl implements DrawingService {
  constructor(
    private shapeFactory: ShapeFactory,
    private transformationEngine: TransformationEngine,
    private undoRedoManager: UndoRedoManager
  ) {}

  async createShape(type: ShapeType, bounds: Rectangle): Promise<Result<DrawableObject>> {
    try {
      const shape = await this.shapeFactory.create(type, bounds);

      // Record for undo
      const operation = new CreateShapeOperation(shape);
      this.undoRedoManager.execute(operation);

      return { success: true, data: shape };
    } catch (error) {
      return { success: false, error: new ShapeCreationError(error.message) };
    }
  }
}
```

#### 1.2 Global State Elimination

**Current Problem**:
```typescript
// ❌ Global state everywhere
class T3Gv {
  static docUtil: DocUtil;
  static opt: OptUtil;
  static state: StateOpt;
  // Everything is static and global
}
```

**Modern Solution**:
```typescript
// ✅ Application context with dependency injection
interface ApplicationContext {
  documentManager: DocumentManager;
  operationManager: OperationManager;
  stateManager: StateManager;
  configurationManager: ConfigurationManager;
}

class Application {
  private context: ApplicationContext;

  constructor() {
    this.context = this.createApplicationContext();
  }

  private createApplicationContext(): ApplicationContext {
    const container = new ServiceContainer();

    // Register services
    container.register(SERVICE_TOKENS.DOCUMENT_MANAGER, new DocumentManagerImpl());
    container.register(SERVICE_TOKENS.OPERATION_MANAGER, new OperationManagerImpl());
    container.register(SERVICE_TOKENS.STATE_MANAGER, new StateManagerImpl());

    return {
      documentManager: container.resolve(SERVICE_TOKENS.DOCUMENT_MANAGER),
      operationManager: container.resolve(SERVICE_TOKENS.OPERATION_MANAGER),
      stateManager: container.resolve(SERVICE_TOKENS.STATE_MANAGER),
      configurationManager: container.resolve(SERVICE_TOKENS.CONFIGURATION_MANAGER)
    };
  }

  getContext(): ApplicationContext {
    return this.context;
  }
}

// Usage in components
class DrawingCanvas {
  constructor(private context: ApplicationContext) {}

  handleUserAction(action: UserAction): void {
    this.context.operationManager.execute(action);
  }
}
```

#### 1.3 Type Safety Implementation

**Current Issues**:
```typescript
// ❌ Untyped properties everywhere
public actionTriggerData: any;
public dragBBoxList: any[];
public userSetting: any;
```

**Modern Type-Safe Implementation**:
```typescript
// ✅ Strict typing with interfaces
interface ActionTriggerData {
  readonly triggerId: number;
  readonly triggerType: TriggerType;
  readonly position: Point;
  readonly metadata: Record<string, unknown>;
}

interface BoundingBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface UserSettings {
  readonly theme: ThemeType;
  readonly snapToGrid: boolean;
  readonly gridSize: number;
  readonly defaultStrokeWidth: number;
  readonly defaultFillColor: Color;
  readonly keyboardShortcuts: ReadonlyMap<string, KeyboardShortcut>;
}

// Immutable data structures
class DrawingState {
  constructor(
    public readonly selectedObjects: ReadonlySet<string>,
    public readonly zoomLevel: number,
    public readonly viewportOffset: Point,
    public readonly isDirty: boolean
  ) {}

  withSelectedObjects(objects: ReadonlySet<string>): DrawingState {
    return new DrawingState(objects, this.zoomLevel, this.viewportOffset, true);
  }

  withZoomLevel(zoom: number): DrawingState {
    return new DrawingState(this.selectedObjects, zoom, this.viewportOffset, true);
  }
}
```

### Phase 2: Performance & Security (4-6 weeks)

#### 2.1 Security Hardening

**Critical XSS Prevention**:
```typescript
// ✅ Secure SVG handling
interface SVGSanitizer {
  sanitize(svgContent: string): Result<string, SecurityError>;
  validateElement(element: SVGElement): boolean;
  removeScriptContent(element: SVGElement): SVGElement;
}

class SVGSanitizerImpl implements SVGSanitizer {
  private readonly ALLOWED_ELEMENTS = new Set([
    'svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline',
    'polygon', 'path', 'text', 'tspan', 'defs', 'use', 'marker'
  ]);

  private readonly FORBIDDEN_ATTRIBUTES = new Set([
    'onload', 'onclick', 'onmouseover', 'onmouseout', 'onfocus',
    'onblur', 'onerror', 'onabort', 'oncanplay', 'oncanplaythrough'
  ]);

  sanitize(svgContent: string): Result<string, SecurityError> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(svgContent, 'image/svg+xml');

      // Check for parser errors
      const parseError = doc.querySelector('parsererror');
      if (parseError) {
        return {
          success: false,
          error: new SecurityError('Invalid SVG syntax', parseError.textContent)
        };
      }

      // Recursively sanitize
      const sanitized = this.sanitizeElement(doc.documentElement);
      const serializer = new XMLSerializer();

      return {
        success: true,
        data: serializer.serializeToString(sanitized)
      };
    } catch (error) {
      return {
        success: false,
        error: new SecurityError('SVG sanitization failed', error.message)
      };
    }
  }

  private sanitizeElement(element: SVGElement): SVGElement {
    // Remove forbidden elements
    if (!this.ALLOWED_ELEMENTS.has(element.tagName.toLowerCase())) {
      element.remove();
      return element;
    }

    // Remove dangerous attributes
    Array.from(element.attributes).forEach(attr => {
      if (this.isAttributeForbidden(attr)) {
        element.removeAttribute(attr.name);
      }
    });

    // Remove script and style elements
    element.querySelectorAll('script, style').forEach(el => el.remove());

    // Recursively sanitize children
    Array.from(element.children).forEach(child => {
      this.sanitizeElement(child as SVGElement);
    });

    return element;
  }

  private isAttributeForbidden(attr: Attr): boolean {
    const name = attr.name.toLowerCase();
    const value = attr.value.toLowerCase();

    return (
      this.FORBIDDEN_ATTRIBUTES.has(name) ||
      name.startsWith('on') ||
      value.includes('javascript:') ||
      value.includes('data:text/html') ||
      value.includes('vbscript:')
    );
  }
}
```

**Secure WebSocket Communication**:
```typescript
// ✅ Encrypted and authenticated WebSocket
interface SecureWebSocketManager {
  connect(config: SecureConnectionConfig): Promise<Result<SecureConnection>>;
  sendMessage(message: SecureMessage): Promise<Result<void>>;
  onMessage(handler: (message: SecureMessage) => void): Disposable;
}

interface SecureConnectionConfig {
  endpoint: string;
  authToken: string;
  encryptionKey: CryptoKey;
  certificateValidation: boolean;
  maxReconnectAttempts: number;
}

class SecureWebSocketManagerImpl implements SecureWebSocketManager {
  private connection: SecureConnection | null = null;
  private encryptionService: MessageEncryptionService;
  private authService: AuthenticationService;

  async connect(config: SecureConnectionConfig): Promise<Result<SecureConnection>> {
    try {
      // Establish WSS connection with authentication
      const wsUrl = new URL(config.endpoint);
      wsUrl.protocol = 'wss:';

      const socket = new WebSocket(wsUrl.toString(), [], {
        headers: {
          'Authorization': `Bearer ${config.authToken}`,
          'X-Client-Version': process.env.CLIENT_VERSION,
          'X-Security-Level': 'HIGH'
        }
      });

      const connection = new SecureConnectionImpl(socket, this.encryptionService);

      // Perform handshake
      await this.performSecurityHandshake(connection, config);

      this.connection = connection;
      return { success: true, data: connection };
    } catch (error) {
      return {
        success: false,
        error: new ConnectionError('Failed to establish secure connection', error)
      };
    }
  }

  async sendMessage(message: SecureMessage): Promise<Result<void>> {
    if (!this.connection) {
      return {
        success: false,
        error: new ConnectionError('No active connection')
      };
    }

    try {
      // Encrypt message
      const encrypted = await this.encryptionService.encrypt(message);

      // Add integrity check
      const signed = await this.encryptionService.sign(encrypted);

      // Send with timeout
      await this.connection.send(signed, { timeout: 5000 });

      return { success: true, data: undefined };
    } catch (error) {
      return {
        success: false,
        error: new MessageError('Failed to send message', error)
      };
    }
  }
}
```

#### 2.2 Performance Optimization

**Efficient Object Management**:
```typescript
// ✅ High-performance object storage with spatial indexing
interface SpatialIndex {
  insert(object: DrawableObject): void;
  remove(object: DrawableObject): void;
  query(region: Rectangle): DrawableObject[];
  update(object: DrawableObject, oldBounds: Rectangle): void;
}

class QuadTreeSpatialIndex implements SpatialIndex {
  private quadTree: QuadTree<DrawableObject>;
  private objectBounds = new Map<string, Rectangle>();

  constructor(bounds: Rectangle, maxDepth = 8, maxObjects = 10) {
    this.quadTree = new QuadTree(bounds, maxDepth, maxObjects);
  }

  insert(object: DrawableObject): void {
    const bounds = object.getBounds();
    this.quadTree.insert(object, bounds);
    this.objectBounds.set(object.id, bounds);
  }

  query(region: Rectangle): DrawableObject[] {
    return this.quadTree.query(region);
  }

  update(object: DrawableObject, oldBounds: Rectangle): void {
    this.quadTree.remove(object, oldBounds);
    this.insert(object);
  }
}

// ✅ Object pooling for performance
class ObjectPool<T> {
  private available: T[] = [];
  private factory: () => T;
  private resetFn: (obj: T) => void;

  constructor(factory: () => T, resetFn: (obj: T) => void, initialSize = 10) {
    this.factory = factory;
    this.resetFn = resetFn;

    // Pre-populate pool
    for (let i = 0; i < initialSize; i++) {
      this.available.push(factory());
    }
  }

  acquire(): T {
    if (this.available.length > 0) {
      return this.available.pop()!;
    }
    return this.factory();
  }

  release(obj: T): void {
    this.resetFn(obj);
    this.available.push(obj);
  }
}

// Usage for DOM elements
const elementPool = new ObjectPool(
  () => document.createElementNS('http://www.w3.org/2000/svg', 'g'),
  (element) => {
    element.innerHTML = '';
    element.removeAttribute('transform');
    element.removeAttribute('style');
  }
);
```

**Batched Rendering System**:
```typescript
// ✅ High-performance rendering with batching
interface RenderBatch {
  readonly operations: RenderOperation[];
  readonly priority: RenderPriority;
  readonly timestamp: number;
}

enum RenderPriority {
  IMMEDIATE = 0,    // User interactions
  HIGH = 1,         // Animation frames
  NORMAL = 2,       // Regular updates
  LOW = 3           // Background tasks
}

class BatchedRenderer {
  private renderQueue = new PriorityQueue<RenderBatch>();
  private isRendering = false;
  private frameId: number | null = null;

  scheduleRender(operations: RenderOperation[], priority = RenderPriority.NORMAL): void {
    const batch: RenderBatch = {
      operations,
      priority,
      timestamp: performance.now()
    };

    this.renderQueue.enqueue(batch, priority);
    this.scheduleFrame();
  }

  private scheduleFrame(): void {
    if (this.frameId !== null) return;

    this.frameId = requestAnimationFrame(() => {
      this.processRenderQueue();
      this.frameId = null;
    });
  }

  private processRenderQueue(): void {
    if (this.isRendering) return;

    this.isRendering = true;
    const startTime = performance.now();
    const maxFrameTime = 16; // 60 FPS budget

    try {
      while (!this.renderQueue.isEmpty() &&
             (performance.now() - startTime) < maxFrameTime) {
        const batch = this.renderQueue.dequeue();
        this.executeBatch(batch);
      }
    } finally {
      this.isRendering = false;

      // Schedule next frame if more work remains
      if (!this.renderQueue.isEmpty()) {
        this.scheduleFrame();
      }
    }
  }

  private executeBatch(batch: RenderBatch): void {
    // Group operations by type for efficiency
    const groupedOps = this.groupOperationsByType(batch.operations);

    // Execute DOM operations in batches
    groupedOps.styleUpdates.forEach(op => this.applyStyleUpdate(op));
    groupedOps.transformUpdates.forEach(op => this.applyTransformUpdate(op));
    groupedOps.visibilityUpdates.forEach(op => this.applyVisibilityUpdate(op));
  }
}
```

### Phase 3: Modern Development Practices (4-6 weeks)

#### 3.1 Testing Infrastructure

**Comprehensive Testing Strategy**:
```typescript
// ✅ Testable architecture with dependency injection
interface TestableDrawingService {
  createShape(type: ShapeType, bounds: Rectangle): Promise<Result<DrawableObject>>;
  // All methods return Results for easy testing
}

class TestableDrawingServiceImpl implements TestableDrawingService {
  constructor(
    private shapeFactory: ShapeFactory,
    private renderer: Renderer,
    private eventEmitter: EventEmitter
  ) {}

  async createShape(type: ShapeType, bounds: Rectangle): Promise<Result<DrawableObject>> {
    // Testable logic with clear dependencies
  }
}

// Unit tests
describe('DrawingService', () => {
  let service: TestableDrawingService;
  let mockShapeFactory: jest.Mocked<ShapeFactory>;
  let mockRenderer: jest.Mocked<Renderer>;
  let mockEventEmitter: jest.Mocked<EventEmitter>;

  beforeEach(() => {
    mockShapeFactory = createMockShapeFactory();
    mockRenderer = createMockRenderer();
    mockEventEmitter = createMockEventEmitter();

    service = new TestableDrawingServiceImpl(
      mockShapeFactory,
      mockRenderer,
      mockEventEmitter
    );
  });

  it('should create rectangle shape successfully', async () => {
    // Arrange
    const bounds = new Rectangle(10, 10, 100, 50);
    const expectedShape = createMockRectangle();
    mockShapeFactory.create.mockResolvedValue(expectedShape);

    // Act
    const result = await service.createShape(ShapeType.Rectangle, bounds);

    // Assert
    expect(result.success).toBe(true);
    expect(result.data).toBe(expectedShape);
    expect(mockShapeFactory.create).toHaveBeenCalledWith(ShapeType.Rectangle, bounds);
  });

  it('should handle shape creation failure gracefully', async () => {
    // Arrange
    const bounds = new Rectangle(10, 10, 100, 50);
    const error = new Error('Factory failure');
    mockShapeFactory.create.mockRejectedValue(error);

    // Act
    const result = await service.createShape(ShapeType.Rectangle, bounds);

    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(ShapeCreationError);
  });
});
```

**Integration Testing**:
```typescript
// ✅ Integration tests for real-time features
describe('Real-time Integration', () => {
  let webSocketManager: SecureWebSocketManager;
  let drawingService: DrawingService;
  let mockWebSocket: MockWebSocket;

  beforeEach(async () => {
    mockWebSocket = new MockWebSocket();
    webSocketManager = new SecureWebSocketManagerImpl(mockWebSocket);
    drawingService = new DrawingServiceImpl();

    // Connect to mock T3000 controller
    await webSocketManager.connect({
      endpoint: 'wss://localhost:9105',
      authToken: 'test-token',
      encryptionKey: await generateTestKey()
    });
  });

  it('should update shape visualization when T3000 data changes', async () => {
    // Arrange
    const temperatureSensor = await drawingService.createTemperatureSensor({
      position: { x: 100, y: 100 },
      dataPointId: 12345
    });

    // Act - Simulate T3000 temperature update
    mockWebSocket.simulateMessage({
      type: 'DATA_UPDATE',
      pointId: 12345,
      value: 72.5,
      unit: 'F',
      timestamp: Date.now()
    });

    // Wait for async update
    await waitFor(() => {
      expect(temperatureSensor.getDisplayValue()).toBe('72.5°F');
      expect(temperatureSensor.getVisualStyle().fill).toBe('#00FF00'); // Green for normal temp
    });
  });
});
```

#### 3.2 Modern State Management

**Redux-style State Management**:
```typescript
// ✅ Predictable state management with Redux pattern
interface ApplicationState {
  readonly document: DocumentState;
  readonly selection: SelectionState;
  readonly ui: UIState;
  readonly realTimeData: RealTimeDataState;
}

interface Action {
  readonly type: string;
  readonly payload?: any;
}

// Action creators
const DocumentActions = {
  createShape: (shapeType: ShapeType, bounds: Rectangle): Action => ({
    type: 'DOCUMENT/CREATE_SHAPE',
    payload: { shapeType, bounds }
  }),

  deleteShapes: (shapeIds: string[]): Action => ({
    type: 'DOCUMENT/DELETE_SHAPES',
    payload: { shapeIds }
  }),

  updateShapeProperty: (shapeId: string, property: string, value: any): Action => ({
    type: 'DOCUMENT/UPDATE_SHAPE_PROPERTY',
    payload: { shapeId, property, value }
  })
} as const;

// Reducers
function documentReducer(state: DocumentState = initialDocumentState, action: Action): DocumentState {
  switch (action.type) {
    case 'DOCUMENT/CREATE_SHAPE':
      return {
        ...state,
        shapes: new Map(state.shapes).set(
          generateId(),
          createShape(action.payload.shapeType, action.payload.bounds)
        )
      };

    case 'DOCUMENT/DELETE_SHAPES':
      const newShapes = new Map(state.shapes);
      action.payload.shapeIds.forEach(id => newShapes.delete(id));
      return { ...state, shapes: newShapes };

    default:
      return state;
  }
}

// Store
class ApplicationStore {
  private state: ApplicationState;
  private listeners = new Set<(state: ApplicationState) => void>();

  constructor(initialState: ApplicationState) {
    this.state = initialState;
  }

  getState(): ApplicationState {
    return this.state;
  }

  dispatch(action: Action): void {
    const newState = this.rootReducer(this.state, action);

    if (newState !== this.state) {
      this.state = newState;
      this.notifyListeners();
    }
  }

  subscribe(listener: (state: ApplicationState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private rootReducer(state: ApplicationState, action: Action): ApplicationState {
    return {
      document: documentReducer(state.document, action),
      selection: selectionReducer(state.selection, action),
      ui: uiReducer(state.ui, action),
      realTimeData: realTimeDataReducer(state.realTimeData, action)
    };
  }
}
```

#### 3.3 Modern Build and Development Tools

**Webpack Configuration**:
```typescript
// ✅ Modern build configuration
const config: webpack.Configuration = {
  entry: './src/index.ts',
  mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',

  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.json',
              transpileOnly: false, // Enable type checking
            }
          }
        ],
        exclude: /node_modules/
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: 'svg-sanitizer-loader', // Custom loader for SVG security
            options: {
              removeScripts: true,
              removeEventHandlers: true
            }
          }
        ]
      }
    ]
  },

  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@components': path.resolve(__dirname, 'src/components'),
      '@services': path.resolve(__dirname, 'src/services'),
      '@utils': path.resolve(__dirname, 'src/utils')
    }
  },

  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },

  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      'process.env.CLIENT_VERSION': JSON.stringify(require('./package.json').version)
    }),

    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE ? 'server' : 'disabled'
    }),

    new ESLintPlugin({
      extensions: ['js', 'jsx', 'ts', 'tsx'],
      fix: true
    })
  ]
};
```

**ESLint Configuration**:
```json
{
  "extends": [
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking",
    "plugin:security/recommended"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "plugins": ["@typescript-eslint", "security"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error",
    "@typescript-eslint/no-unsafe-call": "error",
    "@typescript-eslint/no-unsafe-member-access": "error",
    "@typescript-eslint/no-unsafe-return": "error",
    "security/detect-object-injection": "error",
    "security/detect-non-literal-fs-filename": "error",
    "security/detect-eval-with-expression": "error"
  }
}
```

### Phase 4: Documentation and Developer Experience (2-4 weeks)

#### 4.1 Comprehensive API Documentation

**TypeDoc Configuration**:
```typescript
// ✅ Comprehensive API documentation
/**
 * Service for managing shape selection and manipulation in the drawing canvas.
 *
 * The SelectionService provides a clean API for selecting, deselecting, and managing
 * groups of drawable objects. It supports both single and multi-object selection,
 * region-based selection, and maintains selection state across operations.
 *
 * @example
 * ```typescript
 * const selectionService = container.resolve(SERVICE_TOKENS.SELECTION);
 *
 * // Select objects by ID
 * await selectionService.selectById(['shape1', 'shape2']);
 *
 * // Select objects in a region
 * const region = new Rectangle(100, 100, 200, 150);
 * const selected = await selectionService.selectInRegion(region);
 *
 * // Listen for selection changes
 * const disposal = selectionService.onSelectionChanged((objects) => {
 *   console.log(`Selected ${objects.length} objects`);
 * });
 *
 * // Clean up listener
 * disposal.dispose();
 * ```
 *
 * @public
 */
export interface SelectionService {
  /**
   * Gets the currently selected objects.
   *
   * @returns A readonly array of currently selected drawable objects
   *
   * @example
   * ```typescript
   * const selected = selectionService.getSelected();
   * console.log(`${selected.length} objects selected`);
   * ```
   */
  getSelected(): ReadonlyArray<DrawableObject>;

  /**
   * Selects the specified objects.
   *
   * @param objects - The objects to select
   * @param additive - If true, adds to current selection. If false, replaces current selection.
   *
   * @throws {@link SelectionError} When objects cannot be selected
   *
   * @example
   * ```typescript
   * // Replace current selection
   * selectionService.select([shape1, shape2]);
   *
   * // Add to current selection
   * selectionService.select([shape3], true);
   * ```
   */
  select(objects: DrawableObject[], additive?: boolean): void;

  /**
   * Selects objects within the specified rectangular region.
   *
   * @param region - The rectangular region to select within
   * @param mode - Selection mode (intersect, contain, or touch)
   * @returns Promise that resolves to the newly selected objects
   *
   * @throws {@link RegionSelectionError} When region selection fails
   *
   * @example
   * ```typescript
   * const region = new Rectangle(0, 0, 500, 300);
   * const selected = await selectionService.selectInRegion(region, 'intersect');
   * console.log(`Selected ${selected.length} objects in region`);
   * ```
   */
  selectInRegion(region: Rectangle, mode?: SelectionMode): Promise<DrawableObject[]>;
}
```

#### 4.2 Interactive Examples and Playground

**Code Examples Repository**:
```typescript
// ✅ Interactive examples for developers
export const ExampleLibrary = {
  basicShapeCreation: {
    title: 'Creating Basic Shapes',
    description: 'Learn how to create and manipulate basic shapes',
    code: `
// Create a rectangle
const rectangleBounds = new Rectangle(100, 100, 200, 150);
const rectangle = await drawingService.createShape(ShapeType.Rectangle, rectangleBounds);

// Style the rectangle
await rectangle.setStyle({
  fill: '#3498db',
  stroke: '#2c3e50',
  strokeWidth: 2,
  opacity: 0.8
});

// Add to canvas
await canvas.addShape(rectangle);
    `,
    liveDemo: true
  },

  realTimeDataBinding: {
    title: 'Real-Time Data Integration',
    description: 'Connect shapes to live T3000 data',
    code: `
// Create temperature sensor with data binding
const sensor = await hvacService.createTemperatureSensor({
  position: { x: 200, y: 150 },
  dataBinding: {
    pointId: 12345,
    valueProperty: 'temperature',
    unitProperty: 'temperatureUnit',
    statusProperty: 'sensorStatus'
  }
});

// The sensor will automatically update when T3000 data changes
sensor.onDataUpdate((data) => {
  console.log(\`Temperature: \${data.temperature}\${data.unit}\`);
});
    `,
    liveDemo: true
  },

  advancedCollaboration: {
    title: 'Multi-User Collaboration',
    description: 'Enable real-time collaborative editing',
    code: `
// Set up collaboration
const collaborationService = container.resolve(SERVICE_TOKENS.COLLABORATION);

await collaborationService.joinSession({
  sessionId: 'hvac-design-session-123',
  userName: 'John Engineer',
  permissions: ['read', 'write', 'comment']
});

// See other users' cursors and selections
collaborationService.onUserAction((action) => {
  if (action.type === 'selection_changed') {
    visualizeUserSelection(action.userId, action.selectedObjects);
  }
});
    `,
    liveDemo: false
  }
};
```

## Implementation Timeline and Milestones

### Month 1: Foundation (Weeks 1-4)
- **Week 1-2**: Architecture refactoring (break up god classes)
- **Week 3**: Global state elimination (dependency injection)
- **Week 4**: Type safety implementation (replace `any` types)

**Deliverables**:
- ✅ Modular service architecture
- ✅ Dependency injection container
- ✅ Complete type safety

### Month 2: Security & Performance (Weeks 5-8)
- **Week 5**: Security hardening (XSS prevention, input validation)
- **Week 6**: WebSocket security (encryption, authentication)
- **Week 7**: Performance optimization (object pooling, batched rendering)
- **Week 8**: Memory management improvements

**Deliverables**:
- ✅ Security audit passed
- ✅ Performance benchmarks met
- ✅ Memory leak elimination

### Month 3: Modern Practices (Weeks 9-12)
- **Week 9-10**: Testing infrastructure (unit tests, integration tests)
- **Week 11**: State management modernization
- **Week 12**: Build tool optimization

**Deliverables**:
- ✅ 80%+ test coverage
- ✅ Modern state management
- ✅ Optimized build pipeline

### Month 4: Documentation & Polish (Weeks 13-16)
- **Week 13-14**: API documentation and examples
- **Week 15**: Developer experience improvements
- **Week 16**: Final integration and deployment

**Deliverables**:
- ✅ Complete API documentation
- ✅ Developer playground
- ✅ Production deployment

## Success Metrics

### Technical Metrics
- **Performance**: 60 FPS rendering with 1000+ objects
- **Memory Usage**: <100MB for typical HVAC drawings
- **Bundle Size**: <2MB for initial load
- **Test Coverage**: >80% code coverage
- **Security Score**: A+ on security audits

### Developer Experience Metrics
- **Setup Time**: <5 minutes for new developers
- **Build Time**: <30 seconds for incremental builds
- **API Discoverability**: IntelliSense for all public APIs
- **Error Messages**: Clear, actionable error messages

### Business Impact Metrics
- **Feature Velocity**: 50% faster feature development
- **Bug Reduction**: 70% fewer production bugs
- **Developer Satisfaction**: >90% satisfaction score
- **Maintenance Cost**: 60% reduction in maintenance effort

## Conclusion

The T3000 HVAC Drawing Library modernization represents a strategic investment in long-term technical excellence. While the current system demonstrates impressive functionality, the proposed modernization will transform it into a maintainable, secure, and performant platform that can evolve with changing business needs.

**Key Benefits of Modernization**:
- 🛡️ **Enterprise Security**: Production-ready security posture
- ⚡ **High Performance**: Optimized for complex real-time visualizations
- 🧪 **Quality Assurance**: Comprehensive testing infrastructure
- 🔧 **Maintainability**: Clean architecture enabling rapid development
- 📚 **Developer Experience**: Excellent documentation and tooling

The 4-month modernization timeline is aggressive but achievable with dedicated focus. The resulting system will establish T3000 as the undisputed leader in intelligent building automation visualization, with a technical foundation that supports years of future innovation.
