/**
 * useCanvas Hook
 * React hook for canvas operations and utilities
 */

import { useCallback } from 'react';
import { useHvacDesignerStore } from '../store/designerStore';
import { Point, Rectangle } from '../types/canvas.types';

interface UseCanvasResult {
  zoom: number;
  pan: Point;
  gridSize: number;
  showGrid: boolean;
  showRulers: boolean;
  snapToGrid: boolean;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  setPan: (x: number, y: number) => void;
  resetView: () => void;
  toggleGrid: () => void;
  toggleRulers: () => void;
  toggleSnapToGrid: () => void;
  screenToCanvas: (screenX: number, screenY: number) => Point;
  canvasToScreen: (canvasX: number, canvasY: number) => Point;
  snapPoint: (point: Point) => Point;
  getBounds: () => Rectangle;
}

export function useCanvas(): UseCanvasResult {
  const store = useHvacDesignerStore();
  const { canvas } = store;

  /**
   * Zoom in by 20%
   */
  const zoomIn = useCallback(() => {
    store.setZoom(canvas.zoom * 1.2);
  }, [canvas.zoom, store]);

  /**
   * Zoom out by 20%
   */
  const zoomOut = useCallback(() => {
    store.setZoom(canvas.zoom / 1.2);
  }, [canvas.zoom, store]);

  /**
   * Zoom to fit all shapes in viewport
   */
  const zoomToFit = useCallback(() => {
    const { shapes } = store;
    if (shapes.length === 0) {
      store.resetView();
      return;
    }

    // Calculate bounding box of all shapes
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    shapes.forEach((shape) => {
      const { x, y } = shape.transform;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + 100); // Approximate width
      maxY = Math.max(maxY, y + 100); // Approximate height
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const padding = 50;

    // Calculate zoom to fit
    const zoomX = (canvas.width - padding * 2) / width;
    const zoomY = (canvas.height - padding * 2) / height;
    const zoom = Math.min(zoomX, zoomY, 2); // Max zoom 2x

    // Center the view
    const panX = (canvas.width / 2 - (minX + width / 2) * zoom);
    const panY = (canvas.height / 2 - (minY + height / 2) * zoom);

    store.setZoom(zoom);
    store.setPan(panX, panY);
  }, [canvas, store]);

  /**
   * Convert screen coordinates to canvas coordinates
   */
  const screenToCanvas = useCallback(
    (screenX: number, screenY: number): Point => {
      const x = (screenX - canvas.pan.x) / canvas.zoom;
      const y = (screenY - canvas.pan.y) / canvas.zoom;
      return { x, y };
    },
    [canvas.pan, canvas.zoom]
  );

  /**
   * Convert canvas coordinates to screen coordinates
   */
  const canvasToScreen = useCallback(
    (canvasX: number, canvasY: number): Point => {
      const x = canvasX * canvas.zoom + canvas.pan.x;
      const y = canvasY * canvas.zoom + canvas.pan.y;
      return { x, y };
    },
    [canvas.pan, canvas.zoom]
  );

  /**
   * Snap point to grid if snap is enabled
   */
  const snapPoint = useCallback(
    (point: Point): Point => {
      if (!canvas.snapToGrid) return point;

      return {
        x: Math.round(point.x / canvas.gridSize) * canvas.gridSize,
        y: Math.round(point.y / canvas.gridSize) * canvas.gridSize,
      };
    },
    [canvas.snapToGrid, canvas.gridSize]
  );

  /**
   * Get canvas bounds
   */
  const getBounds = useCallback((): Rectangle => {
    return {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height,
    };
  }, [canvas.width, canvas.height]);

  return {
    zoom: canvas.zoom,
    pan: canvas.pan,
    gridSize: canvas.gridSize,
    showGrid: canvas.showGrid,
    showRulers: canvas.showRulers,
    snapToGrid: canvas.snapToGrid,
    setZoom: store.setZoom,
    zoomIn,
    zoomOut,
    zoomToFit,
    setPan: store.setPan,
    resetView: store.resetView,
    toggleGrid: store.toggleGrid,
    toggleRulers: store.toggleRulers,
    toggleSnapToGrid: store.toggleSnapToGrid,
    screenToCanvas,
    canvasToScreen,
    snapPoint,
    getBounds,
  };
}
