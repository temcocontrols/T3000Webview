/**
 * CapacityBar Component
 *
 * Visual capacity indicator showing used/total with percentage bar
 * Azure Portal style progress indicator
 */

import React from 'react';
import styles from './CapacityBar.module.css';

interface CapacityBarProps {
  used: number;
  total: number;
  percentage: number;
}

export const CapacityBar: React.FC<CapacityBarProps> = ({ used, total, percentage }) => {
  // Determine color based on usage
  const getColor = () => {
    if (percentage >= 90) return styles.critical;  // Red - Critical
    if (percentage >= 75) return styles.warning;   // Orange - Warning
    if (percentage >= 50) return styles.moderate;  // Yellow - Moderate
    return styles.normal;  // Green - Normal
  };

  return (
    <div className={styles.container}>
      <div className={styles.barBackground}>
        <div
          className={`${styles.barFill} ${getColor()}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      <div className={styles.label}>
        {percentage.toFixed(0)}%
      </div>
    </div>
  );
};

export default CapacityBar;
