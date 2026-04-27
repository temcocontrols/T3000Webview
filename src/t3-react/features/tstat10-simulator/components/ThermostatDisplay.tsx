/**
 * ThermostatDisplay — Main LCD home screen matching Tstat10 hardware.
 * Shows temperature, SET/FAN/SYS rows, and bottom SVG icon bar.
 */

import React from 'react';
import type { Tstat10Data } from '../hooks/useSimulatorState';
import styles from '../styles/lcd.module.css';

interface ThermostatDisplayProps {
  data: Tstat10Data;
  focusedIndex: number;
}

/* ---------- SVG Icons (matching Tstat10_Simulator) ---------- */

const WifiIcon: React.FC = () => (
  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="12" cy="20" r="1.2" fill="#fff" />
  </svg>
);

const DayNightIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
    <circle cx="13" cy="24" r="5" fill="#fff" />
    <path d="M13 15v2M13 31v2M7 24h2M17 24h2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="33" cy="24" r="7" fill="#fff" />
    <circle cx="37" cy="24" r="6.5" fill="#2c7cc4" />
  </svg>
);

const HomeIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
    <path d="M10 28 L24 16 L38 28" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" />
    <rect x="12" y="28" width="24" height="12" stroke="#fff" strokeWidth="1.5" fill="none" />
    <path d="M20 40v-7h8v7" stroke="#fff" strokeWidth="1.2" fill="none" />
    <circle cx="24" cy="33" r="2.5" fill="#fff" />
    <path d="M24 35.5v3.5" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
    <path d="M21 38h6" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const HeatCoolIcon: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
    <path d="M10 30c-4-8 6-12 6-20 0 8 8 8 4 10-4-2-2-12-2-10z" fill="#fff" />
    <line x1="23" y1="10" x2="23" y2="38" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <g transform="translate(36,24)" stroke="#fff" strokeWidth="1.2" strokeLinecap="round">
      <line x1="0" y1="-9" x2="0" y2="9" />
      <line x1="-7.8" y1="-4.5" x2="7.8" y2="4.5" />
      <line x1="-7.8" y1="4.5" x2="7.8" y2="-4.5" />
    </g>
  </svg>
);

const FanIconSvg: React.FC = () => (
  <svg width="40" height="40" viewBox="0 0 52 48" fill="none">
    <g transform="translate(14,24)">
      <ellipse cx="0" cy="-8" rx="4.2" ry="11" fill="#fff" />
      <ellipse cx="0" cy="-8" rx="4.2" ry="11" fill="#fff" transform="rotate(120)" />
      <ellipse cx="0" cy="-8" rx="4.2" ry="11" fill="#fff" transform="rotate(240)" />
    </g>
    <circle cx="14" cy="24" r="2.5" fill="#fff" />
    <line x1="28" y1="8" x2="28" y2="40" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <rect x="31" y="10" width="11" height="8" rx="0.5" fill="none" stroke="#fff" strokeWidth="1.2" />
    <rect x="31" y="19" width="11" height="8" rx="0.5" fill="none" stroke="#fff" strokeWidth="1.2" />
    <rect x="31" y="28" width="11" height="8" rx="0.5" fill="#e8f4ff" stroke="#fff" strokeWidth="1.2" />
  </svg>
);

/* ---------- Main row definitions ---------- */

const DISPLAY_ROWS: { label: string; field: keyof Tstat10Data }[] = [
  { label: 'SET', field: 'stp' },
  { label: 'FAN', field: 'fan' },
  { label: 'SYS', field: 'sys' },
];

function formatValue(field: keyof Tstat10Data, value: any): string {
  if (field === 'stp') return Number(value).toFixed(2);
  return String(value);
}

/* ---------- Component ---------- */

export const ThermostatDisplay: React.FC<ThermostatDisplayProps> = ({ data, focusedIndex }) => (
  <div className={styles.mainDisplay}>
    {/* WiFi icon — top right */}
    <div className={styles.wifiIcon}>
      <WifiIcon />
    </div>

    {/* Large temperature readout */}
    <div className={styles.tempValue}>
      {data.temp.toFixed(1)}
      <span className={styles.tempUnit}>°C</span>
    </div>

    {/* SET / FAN / SYS rows */}
    {DISPLAY_ROWS.map((row, idx) => (
      <div
        key={row.field}
        className={`${styles.mainRow} ${idx === focusedIndex ? styles.mainRowFocused : ''}`}
      >
        <span className={styles.mainLabel}>{row.label}</span>
        <span className={styles.mainValueBox}>
          {formatValue(row.field, data[row.field])}
        </span>
      </div>
    ))}

    {/* Bottom icon bar — 4 SVG icon boxes */}
    <div className={styles.iconBar}>
      <div className={styles.iconBox}><DayNightIcon /></div>
      <div className={styles.iconBox}><HomeIcon /></div>
      <div className={styles.iconBox}><HeatCoolIcon /></div>
      <div className={styles.iconBox}><FanIconSvg /></div>
    </div>
  </div>
);
