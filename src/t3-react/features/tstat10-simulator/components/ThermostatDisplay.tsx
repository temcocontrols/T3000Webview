/**
 * ThermostatDisplay — Main LCD screen showing temperature, setpoint, humidity,
 * modbus ID and baud rate.
 */

import React from 'react';
import type { Tstat10Data } from '../hooks/useSimulatorState';
import styles from '../styles/lcd.module.css';

interface ThermostatDisplayProps {
  data: Tstat10Data;
  onNavigateToSettings?: () => void;
}

export const ThermostatDisplay: React.FC<ThermostatDisplayProps> = ({ data, onNavigateToSettings }) => (
  <div className={styles.mainDisplay}>
    <div className={styles.tempValue}>
      {data.temp.toFixed(1)}
      <span className={styles.tempUnit}>°C</span>
    </div>

    <div className={styles.divider} />

    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>STP</span>
      <span className={styles.infoValue}>{data.stp.toFixed(1)}°C</span>
    </div>

    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>HUM</span>
      <span className={styles.infoValue}>{data.hum}%</span>
    </div>

    <div className={styles.divider} />

    <div
      className={`${styles.infoRow} ${styles.clickableInfoRow}`}
      onClick={onNavigateToSettings}
      title="Click to open Network Settings"
    >
      <span className={styles.infoLabel}>ID</span>
      <span className={styles.infoValue}>{data.modbus}</span>
      <span className={styles.atSeparator}>@</span>
      <span className={styles.infoValue}>{data.baud}</span>
    </div>
  </div>
);
