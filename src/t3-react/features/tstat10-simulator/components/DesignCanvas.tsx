/**
 * DesignCanvas — The 320×480 interactive design surface.
 * Renders widgets via LcdPageRenderer with drag-drop, click-to-select,
 * and grid-snap overlays.
 */

import React, { useCallback, useRef, useState } from 'react';
import { LcdPageRenderer } from './LcdPageRenderer';
import type { PageDefinition, LcdWidget } from './LcdPageRenderer';

const CANVAS_W = 320;
const CANVAS_H = 480;
const NUM_COLS = 17;
const NUM_ROWS = 10;
const CELL_W = CANVAS_W / NUM_COLS;
const CELL_H = CANVAS_H / NUM_ROWS;

interface DesignCanvasProps {
  page: PageDefinition;
  data?: Record<string, any>;
  selectedWidgetId: string | null;
  onSelectWidget: (id: string | null) => void;
  onMoveWidget: (id: string, row: number, col: number) => void;
  onAddWidget: (type: string, row: number, col: number) => void;
  onDragEnd: () => void;
  showGrid?: boolean;
  showCoords?: boolean;
}

export const DesignCanvas: React.FC<DesignCanvasProps> = ({
  page,
  data,
  selectedWidgetId,
  onSelectWidget,
  onMoveWidget,
  onAddWidget,
  onDragEnd,
  showGrid = true,
  showCoords = false,
}) => {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dropPreview, setDropPreview] = useState<{ row: number; col: number } | null>(null);

  /** Convert mouse/drag event to grid cell coordinates */
  const eventToCell = useCallback((e: React.MouseEvent | React.DragEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { col: 0, row: 0 };
    // Account for potential CSS scaling
    const scaleX = CANVAS_W / rect.width;
    const scaleY = CANVAS_H / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.max(0, Math.min(NUM_COLS - 1, Math.floor(x / CELL_W)));
    const row = Math.max(0, Math.min(NUM_ROWS - 1, Math.floor(y / CELL_H)));
    return { col, row };
  }, []);

  /** Handle drop from toolbox or canvas reposition */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropPreview(null);
    const { col, row } = eventToCell(e);

    // Dropping from toolbox
    const widgetType = e.dataTransfer.getData('widgetType');
    if (widgetType) {
      onAddWidget(widgetType, row, col);
      onDragEnd();
      return;
    }

    // Repositioning existing widget
    const widgetId = e.dataTransfer.getData('widgetId');
    if (widgetId) {
      onMoveWidget(widgetId, row, col);
      onDragEnd();
    }
  }, [eventToCell, onAddWidget, onMoveWidget, onDragEnd]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const { col, row } = eventToCell(e);
    setDropPreview({ col, row });
  }, [eventToCell]);

  const handleDragLeave = useCallback(() => {
    setDropPreview(null);
  }, []);

  /** Click on canvas background → deselect */
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    // Only deselect if clicking the canvas background itself
    if ((e.target as HTMLElement).dataset?.canvasBg === 'true') {
      onSelectWidget(null);
    }
  }, [onSelectWidget]);

  return (
    <div
      ref={canvasRef}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={handleCanvasClick}
      data-canvas-bg="true"
      style={{
        position: 'relative',
        width: CANVAS_W,
        height: CANVAS_H,
        flexShrink: 0,
        cursor: 'default',
      }}
    >
      {/* Actual rendered widgets */}
      <LcdPageRenderer
        page={page}
        data={data}
        focusedWidgetId={selectedWidgetId}
        showGrid={showGrid}
        showCoords={showCoords}
      />

      {/* Clickable/draggable overlay for each widget */}
      {page.widgets.map(w => (
        <WidgetOverlay
          key={w.id}
          widget={w}
          isSelected={w.id === selectedWidgetId}
          onSelect={() => onSelectWidget(w.id)}
        />
      ))}

      {/* Drop preview indicator */}
      {dropPreview && (
        <div style={{
          position: 'absolute',
          left: dropPreview.col * CELL_W,
          top: dropPreview.row * CELL_H,
          width: CELL_W * 2,
          height: CELL_H,
          background: 'rgba(0,120,212,0.25)',
          border: '2px dashed #0078d4',
          borderRadius: 3,
          pointerEvents: 'none',
          zIndex: 60,
        }} />
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  WidgetOverlay — Clickable/draggable wrapper around each widget     */
/* ------------------------------------------------------------------ */

interface WidgetOverlayProps {
  widget: LcdWidget;
  isSelected: boolean;
  onSelect: () => void;
}

const WidgetOverlay: React.FC<WidgetOverlayProps> = ({
  widget,
  isSelected,
  onSelect,
}) => {
  const w = widget;
  const left = (w.col ?? 0) * CELL_W;
  const top = w.row * CELL_H;
  const width = (w.colSpan ?? 1) * CELL_W;
  const height = (w.rowSpan ?? 1) * CELL_H;

  const handleDragStart = useCallback((e: React.DragEvent) => {
    e.dataTransfer.setData('widgetId', w.id);
    e.dataTransfer.effectAllowed = 'move';
  }, [w.id]);

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        position: 'absolute',
        left, top, width, height,
        cursor: 'grab',
        zIndex: isSelected ? 40 : 30,
        outline: isSelected ? '2px solid #0078d4' : 'none',
        outlineOffset: -1,
        borderRadius: isSelected ? 2 : 0,
        background: isSelected ? 'rgba(0,120,212,0.12)' : 'transparent',
      }}
      title={`${w.type} — ${w.id}\nRow ${w.row}, Col ${w.col ?? 0}`}
    />
  );
};

export default DesignCanvas;
