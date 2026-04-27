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
}

export const NetworkSettingsMenu: React.FC<NetworkSettingsMenuProps> = ({
  title,
  menuRows,
  focusedIndex,
  menuStyles,
  isSetupMenu = false,
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
    </div>
  );
};
