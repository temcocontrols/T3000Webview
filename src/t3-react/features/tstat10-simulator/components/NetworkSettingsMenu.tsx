/**
 * NetworkSettingsMenu — Renders the communication settings menu screen on the LCD.
 * Migrated from network-settings-renderer.js.
 *
 * Note: Menu rows use dynamic inline styles driven by JSON config values
 * (fontSize, fontFamily, fontWeight, column widths). This is intentional
 * as these values come from the Tstat10 menu configuration and vary per widget.
 */

import React from 'react';
import type { MenuRowWidget } from '../hooks/useSimulatorState';
import styles from '../styles/lcd.module.css';

interface NetworkSettingsMenuProps {
  menuRows: MenuRowWidget[];
  focusedIndex: number;
  menuStyles: {
    bg?: string;
    highlight?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
    textWidthChars?: number;
    valueBoxWidthChars?: number;
  };
  showGrid?: boolean;
  showCoords?: boolean;
  showRedbox?: boolean;
  redboxCoords?: { x: number; y: number };
}

const NUM_ROWS = 10;
const NUM_COLS = 17;

export const NetworkSettingsMenu: React.FC<NetworkSettingsMenuProps> = ({
  menuRows,
  focusedIndex,
  menuStyles,
  showGrid = false,
  showCoords = false,
  showRedbox = false,
  redboxCoords,
}) => {
  const bg = menuStyles.bg || '#003366';
  const highlight = menuStyles.highlight || '#008080';
  const fontFamily = menuStyles.fontFamily || 'monospace';
  const baseFontSize = Math.round((parseInt((menuStyles.fontSize || '24px').replace('px', ''), 10) + 3) * 0.67);
  const fontWeight = menuStyles.fontWeight || '700';
  const textWidthChars = menuStyles.textWidthChars || 6;
  const valueBoxWidthChars = menuStyles.valueBoxWidthChars || 8;

  return (
    <div className={styles.settingsScreen} style={{ background: bg, fontFamily }}>
      {/* Header */}
      <div className={styles.settingsHeader}>
        Communication
        <br />
        Settings
      </div>

      {/* Menu Rows */}
      {menuRows.map((row, idx) => {
        const isFocused = idx === focusedIndex;
        return (
          <div
            key={row.id}
            className={`${styles.menuRow} ${isFocused ? styles.menuRowFocused : ''}`}
            style={{
              background: isFocused ? highlight : 'rgba(0,0,0,0.08)',
              fontSize: `${baseFontSize}px`,
              fontFamily,
              fontWeight,
            }}
          >
            <span
              className={styles.menuLabel}
              style={{
                width: `${textWidthChars}ch`,
                minWidth: `${textWidthChars}ch`,
                maxWidth: `${textWidthChars}ch`,
                fontSize: `${baseFontSize}px`,
                fontFamily,
                fontWeight,
              }}
            >
              {(row.label + ' '.repeat(textWidthChars)).slice(0, textWidthChars)}
            </span>
            <span
              className={`${styles.menuValue} ${isFocused ? styles.menuValueFocused : ''}`}
              style={{
                width: `${valueBoxWidthChars}ch`,
                minWidth: `${valueBoxWidthChars}ch`,
                maxWidth: `${valueBoxWidthChars}ch`,
                fontSize: `${baseFontSize}px`,
                fontFamily,
                fontWeight,
              }}
            >
              {String(row.value ?? '').padEnd(valueBoxWidthChars, ' ')}
            </span>
          </div>
        );
      })}

      {/* Footer hint text */}
      <div className={styles.footerHint}>  +  Edit  -  </div>

      {/* Footer nav text */}
      <div className={styles.footerNav}>&lt; Back    Next &gt;</div>


      {/* Debug Grid Overlay */}
      {showGrid && (
        <div className={styles.gridOverlay}>
          <svg width="100%" height="100%" className={styles.gridSvg}>
            {Array.from({ length: NUM_COLS + 1 }).map((_, c) => (
              <line
                key={`v${c}`}
                x1={`${(c / NUM_COLS) * 100}%`}
                y1="0"
                x2={`${(c / NUM_COLS) * 100}%`}
                y2="100%"
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}
            {Array.from({ length: NUM_ROWS + 1 }).map((_, r) => (
              <line
                key={`h${r}`}
                x1="0"
                y1={`${(r / NUM_ROWS) * 100}%`}
                x2="100%"
                y2={`${(r / NUM_ROWS) * 100}%`}
                stroke="#e5e5e5"
                strokeWidth="1"
              />
            ))}
            {/* Lens outline indicator cell (light gray) */}
            <rect
              className={styles.gridRedCell}
              x={`${(2 / NUM_COLS) * 100}%`}
              y={`${((NUM_ROWS - 1) / NUM_ROWS) * 100}%`}
              width={`${(1 / NUM_COLS) * 100}%`}
              height={`${(1 / NUM_ROWS) * 100}%`}
            />
          </svg>
        </div>
      )}

      {/* Debug Coordinate Overlay */}
      {showCoords && (
        <div className={styles.coordsOverlay}>
          {Array.from({ length: NUM_ROWS }).map((_, r) =>
            Array.from({ length: NUM_COLS }).map((_, c) => (
              <div
                key={`coord-${r}-${c}`}
                className={styles.coordCell}
                style={{
                  left: `${(c * 100) / NUM_COLS}%`,
                  top: `${(r * 100) / NUM_ROWS}%`,
                  width: `${100 / NUM_COLS}%`,
                  height: `${100 / NUM_ROWS}%`,
                }}
              >
                {((c % 10) + 1)}
              </div>
            )),
          )}
        </div>
      )}

      {/* Redbox Overlay */}
      {showRedbox && redboxCoords && (
        <div className={styles.gridOverlay}>
          <svg width="100%" height="100%" className={styles.gridSvg}>
            <rect
              className={styles.gridRedCell}
              x={`${(redboxCoords.x / NUM_COLS) * 100}%`}
              y={`${(redboxCoords.y / NUM_ROWS) * 100}%`}
              width={`${(1 / NUM_COLS) * 100}%`}
              height={`${(1 / NUM_ROWS) * 100}%`}
            />
          </svg>
        </div>
      )}
    </div>
  );
};
