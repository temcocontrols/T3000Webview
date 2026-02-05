/**
 * Dashboard Widget Component
 * Reusable card container for dashboard widgets
 */

import React from 'react';
import { Card } from '@fluentui/react-components';
import styles from './DashboardWidget.module.css';

interface DashboardWidgetProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'small' | 'medium' | 'large' | 'full';
  actions?: React.ReactNode;
}

export const DashboardWidget: React.FC<DashboardWidgetProps> = ({
  title,
  children,
  className = '',
  size = 'medium',
  actions,
}) => {
  return (
    <Card className={`${styles.widget} ${styles[size]} ${className}`}>
      <div className={styles.header}>
        <div className={styles.title}>{title}</div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      <div className={styles.content}>{children}</div>
    </Card>
  );
};
