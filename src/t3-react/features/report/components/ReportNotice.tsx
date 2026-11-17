/**
 * A message block for the report page.
 *
 * Deliberately not Fluent's `MessageBar`: that root is a CSS grid (`grid-template-rows: 1fr`,
 * `align-items: center`, `white-space: nowrap`) whose height is driven by its own sizing rules, so
 * padding overrides end up pushing the body text outside the border. This is a plain flex block
 * whose height is simply its content — predictable at any font size or line count.
 */

import React from 'react';
import {
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  InfoRegular,
  LightbulbRegular,
  WarningRegular,
} from '@fluentui/react-icons';
import styles from './ReportNotice.module.css';

export type ReportNoticeIntent = 'info' | 'warning' | 'error' | 'success' | 'brand';

export interface ReportNoticeProps {
  intent?: ReportNoticeIntent;
  title?: React.ReactNode;
  children?: React.ReactNode;
  /** Trailing control, e.g. a button that fixes whatever the notice reports. */
  action?: React.ReactNode;
  className?: string;
}

const ICONS = {
  info: InfoRegular,
  warning: WarningRegular,
  error: ErrorCircleRegular,
  success: CheckmarkCircleRegular,
  brand: LightbulbRegular,
} as const;

export const ReportNotice: React.FC<ReportNoticeProps> = ({
  intent = 'info',
  title,
  children,
  action,
  className,
}) => {
  const Icon = ICONS[intent];

  return (
    <div
      className={[styles.notice, styles[intent], className].filter(Boolean).join(' ')}
      role={intent === 'error' ? 'alert' : undefined}
    >
      <Icon className={styles.icon} />
      <div className={styles.content}>
        {title ? <div className={styles.title}>{title}</div> : null}
        {children ? <div className={styles.text}>{children}</div> : null}
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
};

export default ReportNotice;
