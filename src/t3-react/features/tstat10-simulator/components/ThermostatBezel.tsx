/**
 * ThermostatBezel — Physical device frame with compass logo and directional buttons.
 * Wraps the LCD container to create the full hardware simulation view.
 */

import React from 'react';
import styles from '../styles/simulator.module.css';

interface ThermostatBezelProps {
  onButtonPress: (direction: 'left' | 'right' | 'up' | 'down') => void;
  children: React.ReactNode;
}

const CompassSvg: React.FC = () => (
  <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" stroke="#888" strokeWidth="2" fill="none" />
    <polygon points="50,10 54,30 50,26 46,30" fill="#888" />
    <polygon points="90,50 70,54 74,50 70,46" fill="#888" />
    <polygon points="50,90 54,70 50,74 46,70" fill="#888" />
    <polygon points="10,50 30,54 26,50 30,46" fill="#888" />
    <g stroke="#bbb" strokeWidth="1.2">
      <line x1="50" y1="18" x2="50" y2="26" />
      <line x1="50" y1="82" x2="50" y2="74" />
      <line x1="18" y1="50" x2="26" y2="50" />
      <line x1="82" y1="50" x2="74" y2="50" />
      <line x1="32" y1="32" x2="38" y2="38" />
      <line x1="68" y1="32" x2="62" y2="38" />
      <line x1="32" y1="68" x2="38" y2="62" />
      <line x1="68" y1="68" x2="62" y2="62" />
      <line x1="50" y1="10" x2="50" y2="18" />
      <line x1="50" y1="90" x2="50" y2="82" />
      <line x1="10" y1="50" x2="18" y2="50" />
      <line x1="90" y1="50" x2="82" y2="50" />
    </g>
  </svg>
);

export const ThermostatBezel: React.FC<ThermostatBezelProps> = ({ onButtonPress, children }) => (
  <div className={styles.deviceBezel}>
    {children}

    <div className={styles.physicalButtons}>
      <button className={styles.hwBtn} onClick={() => onButtonPress('left')} aria-label="Left">
        ◀
      </button>
      <button className={styles.hwBtn} onClick={() => onButtonPress('down')} aria-label="Down">
        ▼
      </button>
      <button className={styles.hwBtn} onClick={() => onButtonPress('up')} aria-label="Up">
        ▲
      </button>
      <button className={styles.hwBtn} onClick={() => onButtonPress('right')} aria-label="Right">
        ▶
      </button>
    </div>
  </div>
);
