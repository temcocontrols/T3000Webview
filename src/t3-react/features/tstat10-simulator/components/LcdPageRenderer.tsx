/**
 * LcdPageRenderer — Generic renderer that takes a page JSON definition
 * and renders positioned widgets on a 320×480 LCD canvas.
 * Used by both DesignCanvas (edit mode) and View Mode.
 */

import React from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface LcdWidget {
  type: string;
  id: string;
  row: number;
  col: number;
  colSpan?: number;
  rowSpan?: number;
  // Common
  fontSize?: string;
  align?: string;
  color?: string;
  opacity?: number;
  // Text / Label
  text?: string;
  field?: string;
  suffix?: string;
  // Label-value / Input
  label?: string;
  register?: number;
  editable?: boolean;
  options?: (string | number)[];
  maxValue?: number;
  minValue?: number;
  step?: number;
  navigateTo?: string;
  // Icon
  icon?: string;
  size?: string;
  // Icon bar
  icons?: { icon: string; pageId?: string }[];
}

export interface PageStyles {
  bg?: string;
  highlight?: string;
  fontFamily?: string;
  fontSize?: string;
  fontWeight?: string;
}

export interface PageDefinition {
  id: string;
  label: string;
  styles: PageStyles;
  widgets: LcdWidget[];
}

export interface LcdPageRendererProps {
  page: PageDefinition;
  /** Live data values keyed by field name */
  data?: Record<string, any>;
  /** ID of widget currently focused (for highlight) */
  focusedWidgetId?: string | null;
  /** Called when a widget with navigateTo is clicked */
  onNavigate?: (pageId: string) => void;
  /** Show 17×10 debug grid overlay */
  showGrid?: boolean;
  /** Show col/row coordinate numbers */
  showCoords?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CANVAS_W = 320;
const CANVAS_H = 480;
const NUM_COLS = 17;
const NUM_ROWS = 10;
const CELL_W = CANVAS_W / NUM_COLS;
const CELL_H = CANVAS_H / NUM_ROWS;

/* ------------------------------------------------------------------ */
/*  Icon map (simple SVG paths for common icons)                       */
/* ------------------------------------------------------------------ */

const ICON_MAP: Record<string, string> = {
  house: '⌂',
  moon: '☾',
  snowflake: '❄',
  fan: '⚙',
  wifi: '≋',
  sun: '☀',
  leaf: '🌿',
  thermometer: '🌡',
};

/* ------------------------------------------------------------------ */
/*  Widget Renderers                                                   */
/* ------------------------------------------------------------------ */

const baseStyle = (w: LcdWidget, pageStyles: PageStyles): React.CSSProperties => ({
  position: 'absolute',
  left: (w.col ?? 0) * CELL_W,
  top: w.row * CELL_H,
  width: (w.colSpan ?? 1) * CELL_W,
  height: (w.rowSpan ?? 1) * CELL_H,
  fontFamily: pageStyles.fontFamily || 'monospace',
  fontWeight: (pageStyles.fontWeight as any) || '700',
  color: w.color || '#fff',
  display: 'flex',
  alignItems: 'center',
  boxSizing: 'border-box' as const,
});

function renderLargeText(w: LcdWidget, ps: PageStyles, data?: Record<string, any>) {
  const val = data && w.field ? data[w.field] : '—';
  const display = typeof val === 'number' ? val.toFixed(1) : String(val ?? '—');
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      fontSize: w.fontSize || '72px',
      justifyContent: w.align === 'left' ? 'flex-start' : w.align === 'right' ? 'flex-end' : 'center',
      height: (w.rowSpan ?? 3) * CELL_H,
    }}>
      {display}
      {w.suffix && <span style={{ fontSize: '0.35em', verticalAlign: 'super', opacity: 0.8, marginLeft: 2 }}>{w.suffix}</span>}
    </div>
  );
}

function renderLabelValue(
  w: LcdWidget,
  ps: PageStyles,
  data?: Record<string, any>,
  focused?: boolean,
  onNavigate?: (pageId: string) => void,
) {
  const val = data && w.field ? data[w.field] : w.options?.[0] ?? '—';
  const display = typeof val === 'number' ? (Number.isInteger(val) ? String(val) : val.toFixed(1)) : String(val ?? '—');
  const highlight = ps.highlight || '#008080';

  return (
    <div
      key={w.id}
      style={{
        ...baseStyle(w, ps),
        justifyContent: 'space-between',
        padding: '0 8px',
        background: focused ? highlight : 'transparent',
        borderRadius: focused ? 6 : 0,
        cursor: w.navigateTo ? 'pointer' : 'default',
        fontSize: w.fontSize || '16px',
      }}
      onClick={w.navigateTo && onNavigate ? () => onNavigate(w.navigateTo!) : undefined}
    >
      <span>{w.label}</span>
      <span style={{
        background: '#fff',
        color: ps.bg || '#003366',
        borderRadius: 6,
        padding: '2px 8px',
        fontWeight: 700,
        fontSize: w.fontSize || '16px',
        border: '1.5px solid rgba(255,255,255,0.5)',
      }}>
        {display}{w.suffix || ''}
      </span>
    </div>
  );
}

function renderEditValue(w: LcdWidget, ps: PageStyles, data?: Record<string, any>) {
  const val = data && w.field ? data[w.field] : '—';
  const display = typeof val === 'number' ? val.toFixed(1) : String(val ?? '—');
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'center',
      fontSize: w.fontSize || '36px',
    }}>
      <span style={{
        background: '#fff',
        color: ps.bg || '#003366',
        borderRadius: 8,
        padding: '4px 16px',
        fontWeight: 700,
      }}>
        {display}{w.suffix || ''}
      </span>
    </div>
  );
}

function renderHeader(w: LcdWidget, ps: PageStyles) {
  const lines = (w.text || '').split('\n');
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      flexDirection: 'column',
      justifyContent: 'center',
      textAlign: 'center',
      fontSize: w.fontSize || '24px',
      lineHeight: 1.3,
      width: (w.colSpan ?? NUM_COLS) * CELL_W,
    }}>
      {lines.map((line, i) => <div key={i}>{line}</div>)}
    </div>
  );
}

function renderText(w: LcdWidget, ps: PageStyles, data?: Record<string, any>) {
  const val = w.text ?? (data && w.field ? data[w.field] : '');
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      fontSize: w.fontSize || ps.fontSize || '18px',
      justifyContent: w.align === 'center' ? 'center' : w.align === 'right' ? 'flex-end' : 'flex-start',
    }}>
      {String(val ?? '')}{w.suffix || ''}
    </div>
  );
}

function renderIcon(w: LcdWidget, ps: PageStyles) {
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'center',
      fontSize: w.size || '32px',
      opacity: w.opacity ?? 1,
    }}>
      {ICON_MAP[w.icon || ''] || '?'}
    </div>
  );
}

function renderIconBar(w: LcdWidget, ps: PageStyles) {
  const icons = w.icons || [];
  const width = (w.colSpan ?? NUM_COLS) * CELL_W;

  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'space-around',
      width,
      fontSize: '28px',
    }}>
      {icons.map((ic, i) => (
        <span key={i} style={{ opacity: 0.7, cursor: 'default' }}>
          {ICON_MAP[ic.icon] || '?'}
        </span>
      ))}
    </div>
  );
}

function renderWifiIcon(w: LcdWidget, ps: PageStyles) {
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'center',
      fontSize: '18px',
      opacity: 0.7,
    }}>
      ≋
    </div>
  );
}

function renderDivider(w: LcdWidget, ps: PageStyles) {
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: '100%',
        height: 1,
        background: w.color || '#fff',
        opacity: w.opacity ?? 0.3,
      }} />
    </div>
  );
}

function renderFooterHint(w: LcdWidget, ps: PageStyles) {
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'center',
      fontSize: '16px',
      opacity: 0.8,
      letterSpacing: '0.08em',
    }}>
      {w.text}
    </div>
  );
}

function renderFooterNav(w: LcdWidget, ps: PageStyles) {
  return (
    <div key={w.id} style={{
      ...baseStyle(w, ps),
      justifyContent: 'center',
      fontSize: '16px',
      opacity: 0.8,
      letterSpacing: '0.08em',
    }}>
      {w.text}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Debug Overlays                                                     */
/* ------------------------------------------------------------------ */

function GridOverlay() {
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 50 }}
    >
      {Array.from({ length: NUM_COLS + 1 }).map((_, c) => (
        <line key={`v${c}`} x1={c * CELL_W} y1={0} x2={c * CELL_W} y2={CANVAS_H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      ))}
      {Array.from({ length: NUM_ROWS + 1 }).map((_, r) => (
        <line key={`h${r}`} x1={0} y1={r * CELL_H} x2={CANVAS_W} y2={r * CELL_H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
      ))}
    </svg>
  );
}

function CoordsOverlay() {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 51 }}>
      {Array.from({ length: NUM_ROWS }).map((_, r) =>
        Array.from({ length: NUM_COLS }).map((_, c) => (
          <div
            key={`${r}-${c}`}
            style={{
              position: 'absolute',
              left: c * CELL_W,
              top: r * CELL_H,
              width: CELL_W,
              height: CELL_H,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,100,100,0.6)',
              fontSize: 9,
              fontFamily: 'monospace',
              fontWeight: 700,
            }}
          >
            {c},{r}
          </div>
        )),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export const LcdPageRenderer: React.FC<LcdPageRendererProps> = ({
  page,
  data,
  focusedWidgetId,
  onNavigate,
  showGrid = false,
  showCoords = false,
}) => {
  const ps = page.styles;

  const renderWidget = (w: LcdWidget) => {
    const focused = w.id === focusedWidgetId;
    switch (w.type) {
      case 'large_text':
        return renderLargeText(w, ps, data);
      case 'label_value':
        return renderLabelValue(w, ps, data, focused, onNavigate);
      case 'edit_value':
        return renderEditValue(w, ps, data);
      case 'header':
        return renderHeader(w, ps);
      case 'text':
        return renderText(w, ps, data);
      case 'icon':
        return renderIcon(w, ps);
      case 'icon_bar':
        return renderIconBar(w, ps);
      case 'wifi_icon':
        return renderWifiIcon(w, ps);
      case 'divider':
        return renderDivider(w, ps);
      case 'footer_hint':
        return renderFooterHint(w, ps);
      case 'footer_nav':
        return renderFooterNav(w, ps);
      default:
        return (
          <div key={w.id} style={{
            ...baseStyle(w, ps),
            border: '1px dashed rgba(255,0,0,0.5)',
            fontSize: 10,
            color: 'red',
          }}>
            Unknown: {w.type}
          </div>
        );
    }
  };

  return (
    <div
      style={{
        position: 'relative',
        width: CANVAS_W,
        height: CANVAS_H,
        background: ps.bg || '#003366',
        overflow: 'hidden',
        fontFamily: ps.fontFamily || 'monospace',
        flexShrink: 0,
      }}
    >
      {page.widgets.map(renderWidget)}
      {showGrid && <GridOverlay />}
      {showCoords && <CoordsOverlay />}
    </div>
  );
};

export default LcdPageRenderer;
