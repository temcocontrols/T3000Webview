/**
 * useDesignerState — State management for the LCD Screen Designer.
 * Manages pages, widgets, selection, drag state, and undo/redo.
 */

import { useState, useCallback, useRef } from 'react';
import type { PageDefinition, LcdWidget } from '../components/LcdPageRenderer';
import screenDef from '../data/screenDefinition.json';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type DesignerMode = 'design' | 'view';

export interface DragItem {
  /** 'toolbox' when dragging from toolbox, 'canvas' when repositioning */
  source: 'toolbox' | 'canvas';
  widgetType?: string;
  widgetId?: string;
}

interface HistoryEntry {
  pages: PageDefinition[];
  selectedPageId: string;
  selectedWidgetId: string | null;
}

/* ------------------------------------------------------------------ */
/*  Defaults                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_PAGE_STYLES = {
  bg: '#2c7cc4',
  highlight: '#008080',
  fontFamily: "'Fira Mono', 'Consolas', monospace",
  fontSize: '24px',
  fontWeight: '700',
};

let _nextId = 1;
function genId() {
  return `w_${Date.now()}_${_nextId++}`;
}

/** Default properties for each widget type when dropped from toolbox */
export const WIDGET_DEFAULTS: Record<string, Partial<LcdWidget>> = {
  large_text:   { colSpan: 17, rowSpan: 3, fontSize: '72px', field: 'temp', suffix: '°C', align: 'center' },
  label_value:  { colSpan: 17, rowSpan: 1, fontSize: '16px', label: 'Label', field: '', editable: false },
  edit_value:   { colSpan: 8, rowSpan: 1, fontSize: '36px', field: '', editable: true },
  header:       { colSpan: 17, rowSpan: 2, fontSize: '24px', text: 'Title', align: 'center' },
  text:         { colSpan: 6, rowSpan: 1, fontSize: '18px', text: 'Text' },
  icon:         { colSpan: 2, rowSpan: 1, icon: 'house', size: '32px' },
  icon_bar:     { colSpan: 17, rowSpan: 1, icons: [{ icon: 'house' }, { icon: 'moon' }, { icon: 'snowflake' }, { icon: 'fan' }] },
  wifi_icon:    { colSpan: 1, rowSpan: 1, col: 16 },
  divider:      { colSpan: 17, rowSpan: 1, color: '#ffffff', opacity: 0.3 },
  footer_hint:  { colSpan: 17, rowSpan: 1, text: '+  Edit  -' },
  footer_nav:   { colSpan: 17, rowSpan: 1, text: '< Back   Next >' },
};

/* ------------------------------------------------------------------ */
/*  Hook                                                               */
/* ------------------------------------------------------------------ */

export function useDesignerState() {
  const [pages, setPages] = useState<PageDefinition[]>(screenDef.pages as PageDefinition[]);
  const [selectedPageId, setSelectedPageId] = useState(screenDef.pages[0]?.id || 'main');
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [mode, setMode] = useState<DesignerMode>('design');
  const [dragItem, setDragItem] = useState<DragItem | null>(null);

  // Undo / Redo
  const historyRef = useRef<HistoryEntry[]>([]);
  const futureRef = useRef<HistoryEntry[]>([]);
  const MAX_HISTORY = 50;

  const pushHistory = useCallback(() => {
    setPages(currentPages => {
      // We need the current state for the snapshot; reading via functional update
      historyRef.current = [
        ...historyRef.current.slice(-MAX_HISTORY),
        { pages: JSON.parse(JSON.stringify(currentPages)), selectedPageId, selectedWidgetId },
      ];
      futureRef.current = [];
      return currentPages;
    });
  }, [selectedPageId, selectedWidgetId]);

  /* ---------- Derived ---------- */

  const currentPage = pages.find(p => p.id === selectedPageId) || pages[0];
  const selectedWidget = currentPage?.widgets.find(w => w.id === selectedWidgetId) || null;

  /* ---------- Page Operations ---------- */

  const addPage = useCallback(() => {
    pushHistory();
    const id = `page_${Date.now()}`;
    const newPage: PageDefinition = {
      id,
      label: `Page ${pages.length + 1}`,
      styles: { ...DEFAULT_PAGE_STYLES },
      widgets: [],
    };
    setPages(prev => [...prev, newPage]);
    setSelectedPageId(id);
    setSelectedWidgetId(null);
  }, [pages.length, pushHistory]);

  const removePage = useCallback((pageId: string) => {
    if (pages.length <= 1) return; // keep at least one page
    pushHistory();
    setPages(prev => prev.filter(p => p.id !== pageId));
    if (selectedPageId === pageId) {
      setSelectedPageId(pages[0]?.id === pageId ? pages[1]?.id : pages[0]?.id);
      setSelectedWidgetId(null);
    }
  }, [pages, selectedPageId, pushHistory]);

  const renamePage = useCallback((pageId: string, label: string) => {
    pushHistory();
    setPages(prev => prev.map(p => p.id === pageId ? { ...p, label } : p));
  }, [pushHistory]);

  const updatePageStyles = useCallback((updates: Record<string, any>) => {
    pushHistory();
    setPages(prev => prev.map(p =>
      p.id === selectedPageId ? { ...p, styles: { ...p.styles, ...updates } } : p,
    ));
  }, [selectedPageId, pushHistory]);

  /* ---------- Widget Operations ---------- */

  const addWidget = useCallback((type: string, row: number, col: number) => {
    pushHistory();
    const id = genId();
    const defaults = WIDGET_DEFAULTS[type] || {};
    const widget: LcdWidget = {
      type,
      id,
      row,
      col: defaults.col ?? col,
      ...defaults,
    } as LcdWidget;

    setPages(prev => prev.map(p =>
      p.id === selectedPageId
        ? { ...p, widgets: [...p.widgets, widget] }
        : p,
    ));
    setSelectedWidgetId(id);
    return id;
  }, [selectedPageId, pushHistory]);

  const updateWidget = useCallback((widgetId: string, updates: Partial<LcdWidget>) => {
    pushHistory();
    setPages(prev => prev.map(p =>
      p.id === selectedPageId
        ? { ...p, widgets: p.widgets.map(w => w.id === widgetId ? { ...w, ...updates } : w) }
        : p,
    ));
  }, [selectedPageId, pushHistory]);

  const removeWidget = useCallback((widgetId: string) => {
    pushHistory();
    setPages(prev => prev.map(p =>
      p.id === selectedPageId
        ? { ...p, widgets: p.widgets.filter(w => w.id !== widgetId) }
        : p,
    ));
    if (selectedWidgetId === widgetId) setSelectedWidgetId(null);
  }, [selectedPageId, selectedWidgetId, pushHistory]);

  const moveWidget = useCallback((widgetId: string, row: number, col: number) => {
    pushHistory();
    setPages(prev => prev.map(p =>
      p.id === selectedPageId
        ? { ...p, widgets: p.widgets.map(w => w.id === widgetId ? { ...w, row, col } : w) }
        : p,
    ));
  }, [selectedPageId, pushHistory]);

  /* ---------- Undo / Redo ---------- */

  const undo = useCallback(() => {
    const prev = historyRef.current.pop();
    if (!prev) return;
    // Save current to future
    futureRef.current.push({
      pages: JSON.parse(JSON.stringify(pages)),
      selectedPageId,
      selectedWidgetId,
    });
    setPages(prev.pages);
    setSelectedPageId(prev.selectedPageId);
    setSelectedWidgetId(prev.selectedWidgetId);
  }, [pages, selectedPageId, selectedWidgetId]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    historyRef.current.push({
      pages: JSON.parse(JSON.stringify(pages)),
      selectedPageId,
      selectedWidgetId,
    });
    setPages(next.pages);
    setSelectedPageId(next.selectedPageId);
    setSelectedWidgetId(next.selectedWidgetId);
  }, [pages, selectedPageId, selectedWidgetId]);

  /* ---------- Export / Import ---------- */

  const exportJSON = useCallback(() => {
    const data = { pages, navigation: { defaultPage: pages[0]?.id } };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'screenDefinition.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [pages]);

  const importJSON = useCallback((json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.pages && Array.isArray(parsed.pages)) {
        pushHistory();
        setPages(parsed.pages);
        setSelectedPageId(parsed.pages[0]?.id || 'main');
        setSelectedWidgetId(null);
      }
    } catch {
      // invalid JSON — ignore
    }
  }, [pushHistory]);

  return {
    // Mode
    mode,
    setMode,
    // Pages
    pages,
    currentPage,
    selectedPageId,
    setSelectedPageId: useCallback((id: string) => {
      setSelectedPageId(id);
      setSelectedWidgetId(null);
    }, []),
    addPage,
    removePage,
    renamePage,
    updatePageStyles,
    // Widgets
    selectedWidgetId,
    selectedWidget,
    setSelectedWidgetId,
    addWidget,
    updateWidget,
    removeWidget,
    moveWidget,
    // Drag
    dragItem,
    setDragItem,
    // History
    undo,
    redo,
    canUndo: historyRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    // I/O
    exportJSON,
    importJSON,
  };
}
