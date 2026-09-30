/**
 * useDrawing Hook
 * React hook for managing drawing state and operations
 */

import { useCallback, useState } from 'react';
import { useHvacDesignerStore } from '../store/designerStore';
import {
  saveDrawing as saveToDB,
  updateDrawing as updateInDB,
  loadDrawing as loadFromDB,
  recordFailureReason,
  exportDrawing,
  importDrawing,
} from '../services/drawingService';
import { Drawing, ExportOptions, ImportOptions } from '../types/drawing.types';

/**
 * How a record lookup ended.
 *
 * `missing` (the store holds no such drawing) and `unavailable` (the store could not answer) are outcomes a
 * caller acts on, not failures — see `EngineDocumentSource` in the service.
 */
export type DrawingLoadResult = 'loaded' | 'missing' | 'unavailable';

interface UseDrawingResult {
  isSaving: boolean;
  isLoading: boolean;
  error: string | null;
  saveDrawing: () => Promise<void>;
  loadDrawing: (id: string, options?: { allowMissing?: boolean }) => Promise<DrawingLoadResult>;
  exportAs: (options: ExportOptions) => Promise<void>;
  importFrom: (file: File, options: ImportOptions) => Promise<void>;
  createNew: () => void;
}

export function useDrawing(): UseDrawingResult {
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const store = useHvacDesignerStore();

  /**
   * Save current drawing to database
   */
  const saveDrawing = useCallback(async () => {
    setIsSaving(true);
    setError(null);

    try {
      const drawing: Drawing = {
        id: store.drawingId || '',
        name: store.drawingName,
        description: '',
        width: store.viewport.width,
        height: store.viewport.height,
        backgroundColor: store.viewport.backgroundColor,
        shapes: store.shapes,
        layers: store.layers,
        symbols: store.symbolLibrary,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1,
        gridSize: store.viewport.gridSize,
        snapToGrid: store.viewport.snapToGrid,
        showRulers: store.viewport.showRulers,
        showGrid: store.viewport.showGrid,
      };

      if (store.drawingId) {
        // Update existing drawing
        await updateInDB(store.drawingId, drawing);
      } else {
        // Create new drawing
        const result = await saveToDB(drawing);
        // Update store with new ID
        store.loadDrawing(result.id, store.shapes, store.layers);
      }

      store.markClean();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save drawing';
      setError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [store]);

  /**
   * Load drawing from database
   *
   * @param options.allowMissing
   *   When true, "this browser has no record of the drawing yet" is an **outcome**, not an error: it returns
   *   `missing`/`unavailable` instead of setting `error` and rejecting, because a drawing created from the Hub
   *   legitimately does not exist until its first save. Default `false`, which is what the legacy page wants:
   *   any failure sets `error` and rejects.
   */
  const loadDrawing = useCallback(
    async (id: string, options?: { allowMissing?: boolean }): Promise<DrawingLoadResult> => {
      setIsLoading(true);
      setError(null);

      try {
        const drawing = await loadFromDB(id);
        /*
         * The engine's storage is prepared by `drawingService.prepareEngineDocument` (synchronously, from
         * the local index) — that is what the designer sequences before initialising the engine. Nothing to
         * seed here: this call feeds the React store, and `loadFromDB` has cached a disk-only record for the
         * next open.
         */
        store.loadDrawing(drawing.id, drawing.shapes, drawing.layers);
        store.setDrawingName(drawing.name);
        return 'loaded';
      } catch (err) {
        const reason = recordFailureReason(err);
        if (options?.allowMissing && reason) {
          return reason;
        }

        const message = err instanceof Error ? err.message : 'Failed to load drawing';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  /**
   * Export drawing to file
   */
  const exportAs = useCallback(
    async (options: ExportOptions) => {
      setError(null);

      try {
        const drawing: Drawing = {
          id: store.drawingId || '',
          name: store.drawingName,
          description: '',
          width: store.viewport.width,
          height: store.viewport.height,
          backgroundColor: store.viewport.backgroundColor,
          shapes: store.shapes,
          layers: store.layers,
          symbols: store.symbolLibrary,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          gridSize: store.viewport.gridSize,
          snapToGrid: store.viewport.snapToGrid,
          showRulers: store.viewport.showRulers,
          showGrid: store.viewport.showGrid,
        };

        const result = await exportDrawing(drawing, options);

        // Download the file
        const blob =
          typeof result === 'string'
            ? new Blob([result], { type: 'application/json' })
            : result;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${store.drawingName}.${options.format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to export drawing';
        setError(message);
        throw err;
      }
    },
    [store]
  );

  /**
   * Import drawing from file
   */
  const importFrom = useCallback(
    async (file: File, options: ImportOptions) => {
      setIsLoading(true);
      setError(null);

      try {
        const { shapes, layers } = await importDrawing(file, options);

        if (options.replaceExisting) {
          store.clearDrawing();
        }

        // Add imported shapes and layers
        shapes.forEach((shape) => store.addShape(shape));
        if (layers.length > 0) {
          layers.forEach((layer) => store.addLayer(layer));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to import drawing';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [store]
  );

  /**
   * Create a new drawing
   */
  const createNew = useCallback(() => {
    if (store.isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them and create a new drawing?'
      );
      if (!confirmed) return;
    }

    store.clearDrawing();
  }, [store]);

  return {
    isSaving,
    isLoading,
    error,
    saveDrawing,
    loadDrawing,
    exportAs,
    importFrom,
    createNew,
  };
}
