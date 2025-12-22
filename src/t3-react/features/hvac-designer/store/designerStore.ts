/**
 * HVAC Designer Store
 * Central state management using Zustand
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { Shape } from '../types/shape.types';
import { CanvasState } from '../types/canvas.types';
import { ToolType, ToolOptions } from '../types/tool.types';
import { Layer, Symbol } from '../types/drawing.types';

interface HvacDesignerState {
  // Canvas state
  canvas: CanvasState;

  // Shapes
  shapes: Shape[];

  // Selection
  selectedShapeIds: string[];
  clipboard: Shape[];

  // History (undo/redo)
  history: {
    past: Shape[][];
    future: Shape[][];
  };

  // Tools
  activeTool: ToolType;
  toolOptions: ToolOptions;
  isDrawing: boolean;

  // Layers
  layers: Layer[];
  activeLayerId: string;

  // Symbol library
  symbolLibrary: Symbol[];

  // Drawing metadata
  drawingId?: string;
  drawingName: string;
  isDirty: boolean;
  lastSaved?: string;
}

interface HvacDesignerActions {
  // Canvas actions
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setGridSize: (size: number) => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnapToGrid: () => void;
  resetView: () => void;

  // Shape actions
  addShape: (shape: Shape) => void;
  updateShape: (id: string, updates: Partial<Shape>) => void;
  deleteShape: (id: string) => void;
  deleteShapes: (ids: string[]) => void;
  duplicateShapes: (ids: string[]) => void;
  groupShapes: (ids: string[]) => void;
  ungroupShape: (id: string) => void;

  // Selection actions
  selectShape: (id: string, addToSelection?: boolean) => void;
  selectShapes: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Clipboard actions
  copyToClipboard: () => void;
  cutToClipboard: () => void;
  pasteFromClipboard: () => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;
  clearHistory: () => void;

  // Tool actions
  setActiveTool: (tool: ToolType) => void;
  setToolOptions: (options: Partial<ToolOptions>) => void;
  setIsDrawing: (isDrawing: boolean) => void;

  // Layer actions
  addLayer: (layer: Layer) => void;
  updateLayer: (id: string, updates: Partial<Layer>) => void;
  deleteLayer: (id: string) => void;
  setActiveLayer: (id: string) => void;
  reorderLayers: (layerIds: string[]) => void;

  // Symbol library actions
  addSymbol: (symbol: Symbol) => void;
  deleteSymbol: (id: string) => void;

  // Drawing actions
  loadDrawing: (drawingId: string, shapes: Shape[], layers: Layer[]) => void;
  clearDrawing: () => void;
  setDrawingName: (name: string) => void;
  markDirty: () => void;
  markClean: () => void;
}

const initialCanvasState: CanvasState = {
  width: 3000,
  height: 2000,
  zoom: 1,
  pan: { x: 0, y: 0 },
  gridSize: 20,
  snapToGrid: true,
  showRulers: true,
  showGrid: true,
  backgroundColor: '#ffffff',
};

const initialState: HvacDesignerState = {
  canvas: initialCanvasState,
  shapes: [],
  selectedShapeIds: [],
  clipboard: [],
  history: {
    past: [],
    future: [],
  },
  activeTool: 'select',
  toolOptions: {
    strokeColor: '#000000',
    fillColor: '#cccccc',
    strokeWidth: 2,
    opacity: 1,
  },
  isDrawing: false,
  layers: [
    {
      id: 'layer-1',
      name: 'Layer 1',
      visible: true,
      locked: false,
      opacity: 1,
      order: 0,
    },
  ],
  activeLayerId: 'layer-1',
  symbolLibrary: [],
  drawingName: 'Untitled Drawing',
  isDirty: false,
};

export const useHvacDesignerStore = create<HvacDesignerState & HvacDesignerActions>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Canvas actions
      setZoom: (zoom) =>
        set((state) => {
          state.canvas.zoom = Math.max(0.1, Math.min(5, zoom));
        }),

      setPan: (x, y) =>
        set((state) => {
          state.canvas.pan = { x, y };
        }),

      setGridSize: (size) =>
        set((state) => {
          state.canvas.gridSize = size;
        }),

      toggleGrid: () =>
        set((state) => {
          state.canvas.showGrid = !state.canvas.showGrid;
        }),

      toggleRulers: () =>
        set((state) => {
          state.canvas.showRulers = !state.canvas.showRulers;
        }),

      toggleSnapToGrid: () =>
        set((state) => {
          state.canvas.snapToGrid = !state.canvas.snapToGrid;
        }),

      resetView: () =>
        set((state) => {
          state.canvas.zoom = 1;
          state.canvas.pan = { x: 0, y: 0 };
        }),

      // Shape actions
      addShape: (shape) =>
        set((state) => {
          state.shapes.push(shape);
          state.isDirty = true;
          // Save to history before adding
          state.history.past.push([...get().shapes]);
          state.history.future = [];
        }),

      updateShape: (id, updates) =>
        set((state) => {
          const shape = state.shapes.find((s) => s.id === id);
          if (shape) {
            Object.assign(shape, updates);
            state.isDirty = true;
          }
        }),

      deleteShape: (id) =>
        set((state) => {
          state.history.past.push([...state.shapes]);
          state.shapes = state.shapes.filter((s) => s.id !== id);
          state.selectedShapeIds = state.selectedShapeIds.filter((sid) => sid !== id);
          state.isDirty = true;
          state.history.future = [];
        }),

      deleteShapes: (ids) =>
        set((state) => {
          state.history.past.push([...state.shapes]);
          state.shapes = state.shapes.filter((s) => !ids.includes(s.id));
          state.selectedShapeIds = state.selectedShapeIds.filter((sid) => !ids.includes(sid));
          state.isDirty = true;
          state.history.future = [];
        }),

      duplicateShapes: (ids) =>
        set((state) => {
          const shapesToDuplicate = state.shapes.filter((s) => ids.includes(s.id));
          const newShapes = shapesToDuplicate.map((shape) => ({
            ...shape,
            id: `${shape.type}-${Date.now()}-${Math.random()}`,
            transform: {
              ...shape.transform,
              x: shape.transform.x + 20,
              y: shape.transform.y + 20,
            },
          }));
          state.shapes.push(...newShapes);
          state.isDirty = true;
        }),

groupShapes: (_ids) =>
        set((state) => {
          // TODO: Implement grouping logic
          state.isDirty = true;
        }),

      ungroupShape: (_id) =>
        set((state) => {
          // TODO: Implement ungrouping logic
          state.isDirty = true;
        }),

      // Selection actions
      selectShape: (id, addToSelection = false) =>
        set((state) => {
          if (addToSelection) {
            if (!state.selectedShapeIds.includes(id)) {
              state.selectedShapeIds.push(id);
            }
          } else {
            state.selectedShapeIds = [id];
          }
        }),

      selectShapes: (ids) =>
        set((state) => {
          state.selectedShapeIds = ids;
        }),

      clearSelection: () =>
        set((state) => {
          state.selectedShapeIds = [];
        }),

      selectAll: () =>
        set((state) => {
          state.selectedShapeIds = state.shapes.map((s) => s.id);
        }),

      // Clipboard actions
      copyToClipboard: () =>
        set((state) => {
          const selectedShapes = state.shapes.filter((s) =>
            state.selectedShapeIds.includes(s.id)
          );
          state.clipboard = selectedShapes;
        }),

      cutToClipboard: () =>
        set((state) => {
          const selectedShapes = state.shapes.filter((s) =>
            state.selectedShapeIds.includes(s.id)
          );
          state.clipboard = selectedShapes;
          state.shapes = state.shapes.filter(
            (s) => !state.selectedShapeIds.includes(s.id)
          );
          state.selectedShapeIds = [];
          state.isDirty = true;
        }),

      pasteFromClipboard: () =>
        set((state) => {
          const newShapes = state.clipboard.map((shape) => ({
            ...shape,
            id: `${shape.type}-${Date.now()}-${Math.random()}`,
            transform: {
              ...shape.transform,
              x: shape.transform.x + 20,
              y: shape.transform.y + 20,
            },
          }));
          state.shapes.push(...newShapes);
          state.selectedShapeIds = newShapes.map((s) => s.id);
          state.isDirty = true;
        }),

      // History actions
      undo: () =>
        set((state) => {
          if (state.history.past.length > 0) {
            const previous = state.history.past.pop()!;
            state.history.future.unshift([...state.shapes]);
            state.shapes = previous;
            state.isDirty = true;
          }
        }),

      redo: () =>
        set((state) => {
          if (state.history.future.length > 0) {
            const next = state.history.future.shift()!;
            state.history.past.push([...state.shapes]);
            state.shapes = next;
            state.isDirty = true;
          }
        }),

      saveHistory: () =>
        set((state) => {
          state.history.past.push([...state.shapes]);
          state.history.future = [];
        }),

      clearHistory: () =>
        set((state) => {
          state.history.past = [];
          state.history.future = [];
        }),

      // Tool actions
      setActiveTool: (tool) =>
        set((state) => {
          state.activeTool = tool;
          state.isDrawing = false;
        }),

      setToolOptions: (options) =>
        set((state) => {
          state.toolOptions = { ...state.toolOptions, ...options };
        }),

      setIsDrawing: (isDrawing) =>
        set((state) => {
          state.isDrawing = isDrawing;
        }),

      // Layer actions
      addLayer: (layer) =>
        set((state) => {
          state.layers.push(layer);
          state.isDirty = true;
        }),

      updateLayer: (id, updates) =>
        set((state) => {
          const layer = state.layers.find((l) => l.id === id);
          if (layer) {
            Object.assign(layer, updates);
            state.isDirty = true;
          }
        }),

      deleteLayer: (id) =>
        set((state) => {
          state.layers = state.layers.filter((l) => l.id !== id);
          if (state.activeLayerId === id) {
            state.activeLayerId = state.layers[0]?.id || '';
          }
          state.isDirty = true;
        }),

      setActiveLayer: (id) =>
        set((state) => {
          state.activeLayerId = id;
        }),

      reorderLayers: (layerIds) =>
        set((state) => {
          state.layers = layerIds
            .map((id) => state.layers.find((l) => l.id === id))
            .filter(Boolean) as Layer[];
          state.isDirty = true;
        }),

      // Symbol library actions
      addSymbol: (symbol) =>
        set((state) => {
          state.symbolLibrary.push(symbol);
        }),

      deleteSymbol: (id) =>
        set((state) => {
          state.symbolLibrary = state.symbolLibrary.filter((s) => s.id !== id);
        }),

      // Drawing actions
      loadDrawing: (drawingId, shapes, layers) =>
        set((state) => {
          state.drawingId = drawingId;
          state.shapes = shapes;
          state.layers = layers.length > 0 ? layers : initialState.layers;
          state.activeLayerId = layers[0]?.id || 'layer-1';
          state.selectedShapeIds = [];
          state.history = { past: [], future: [] };
          state.isDirty = false;
        }),

      clearDrawing: () =>
        set((state) => {
          state.shapes = [];
          state.selectedShapeIds = [];
          state.layers = initialState.layers;
          state.activeLayerId = 'layer-1';
          state.history = { past: [], future: [] };
          state.drawingName = 'Untitled Drawing';
          state.isDirty = false;
        }),

      setDrawingName: (name) =>
        set((state) => {
          state.drawingName = name;
          state.isDirty = true;
        }),

      markDirty: () =>
        set((state) => {
          state.isDirty = true;
        }),

      markClean: () =>
        set((state) => {
          state.isDirty = false;
          state.lastSaved = new Date().toISOString();
        }),
    })),
    { name: 'hvac-designer-store' }
  )
);
