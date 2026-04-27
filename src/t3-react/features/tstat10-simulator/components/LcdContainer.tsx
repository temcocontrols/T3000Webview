/**
 * LcdContainer — 320×480 LCD screen wrapper with bezel and lens effects.
 * Renders either the main thermostat display or the settings menu.
 */

import React from 'react';
import styles from '../styles/lcd.module.css';

const NUM_ROWS = 10;
const NUM_COLS = 17;

interface LcdContainerProps {
  mobile?: boolean;
  children: React.ReactNode;
  showGrid?: boolean;
  showCoords?: boolean;
  showRedbox?: boolean;
  redboxCoords?: { x: number; y: number };
}

export const LcdContainer: React.FC<LcdContainerProps> = ({
  mobile,
  children,
  showGrid = false,
  showCoords = false,
  showRedbox = false,
  redboxCoords,
}) => (
  <div className={`${styles.lcdContainer} ${mobile ? styles.lcdContainerMobile : ''}`}>
    {children}

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
