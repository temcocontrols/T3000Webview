/**
 * LcdContainer — 320×480 LCD screen wrapper with bezel and lens effects.
 * Renders either the main thermostat display or the settings menu.
 */

import React from 'react';
import styles from '../styles/lcd.module.css';

interface LcdContainerProps {
  mobile?: boolean;
  children: React.ReactNode;
}

export const LcdContainer: React.FC<LcdContainerProps> = ({ mobile, children }) => (
  <div className={`${styles.lcdContainer} ${mobile ? styles.lcdContainerMobile : ''}`}>
    {children}
  </div>
);
