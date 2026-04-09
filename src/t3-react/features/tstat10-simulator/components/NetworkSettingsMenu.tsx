/**
 * NetworkSettingsMenu — Generic menu screen renderer for the LCD simulator.
 * Renders any menu-style screen (RS485, WiFi, Clock, OAT, TBD, Setup Menu)
 * from JSON config. Supports both value rows and navigation rows.
 */

import React from 'react';
import type { MenuRowWidget } from '../hooks/useSimulatorState';
import styles from '../styles/lcd.module.css';

interface NetworkSettingsMenuProps {
  title: string;
  menuRows: MenuRowWidget[];
  focusedIndex: number;
  menuStyles: {
    bg?: string;
    highlight?: string;
    fontFamily?: string;
    fontSize?: string;
    fontWeight?: string;
  };
  isSetupMenu?: boolean;
  showGrid?: boolean;
  showCoords?: boolean;
  showRedbox?: boolean;
  redboxCoords?: { x: number; y: number };
}

const NUM_ROWS = 10;
const NUM_COLS = 17;

export const NetworkSettingsMenu: React.FC<NetworkSettingsMenuProps> = ({
  title,
  menuRows,
  focusedIndex,
  menuStyles,
  isSetupMenu = false,
  showGrid = false,
  showCoords = false,
  showRedbox = false,
  redboxCoords,
}) => {
  const bg = menuStyles.bg || '#2c7cc4';
  const highlight = menuStyles.highlight || '#008080';
  const fontFamily = menuStyles.fontFamily || 'monospace';
  const fontWeight = menuStyles.fontWeight || '700';

  return (
    <div className={styles.settingsScreen} style={{ background: bg, fontFamily }}>
      {/* Header */}
      <div className={styles.settingsHeader}>{title}</div>

      {/* Menu Rows */}
      {menuRows.map((row, idx) => {
        const isFocused = idx === focusedIndex;
        const isNavItem = !!row.navigateTo;
        return (
          <div
            key={row.id}
            className={`${styles.menuRow} ${isFocused ? styles.menuRowFocused : ''}`}
            style={{
              background: isFocused ? highlight : 'rgba(0,0,0,0.08)',
              fontFamily,
              fontWeight,
            }}
          >
            <span
              className={styles.menuLabel}
              style={{ fontFamily, fontWeight }}
            >
              {row.label}
            </span>
            {isNavItem ? (
              <span className={styles.menuNavArrow} style={{ fontFamily, fontWeight }}>›</span>
            ) : (
              <span
                className={`${styles.menuValue} ${isFocused ? styles.menuValueFocused : ''}`}
                style={{ fontFamily, fontWeight }}
              >
                {String(row.value ?? '')}
              </span>
            )}
          </div>
        );
      })}

      {/* Footer — on-screen button labels */}
      <div className={styles.footerButtons}>
        <span className={styles.footerBtn}>BACK</span>
        <span className={styles.footerBtn}>▼</span>
        <span className={styles.footerBtn}>▲</span>
        <span className={styles.footerBtn}>NEXT</span>
      </div>


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
