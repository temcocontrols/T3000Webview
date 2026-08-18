/**
 * NotSupportedBanner — shown on the Inputs / Outputs / Variables pages when
 * the selected device doesn't support that point type (old or sub-device).
 */
import React from 'react';
import { WarningRegular } from '@fluentui/react-icons';

export interface NotSupportedBannerProps {
  /** Display name of the point type, e.g. "Inputs". */
  pointType: string;
  deviceName?: string;
  reason?: string;
}

export const NotSupportedBanner: React.FC<NotSupportedBannerProps> = ({
  pointType,
  deviceName,
  reason,
}) => (
  <div
    role="status"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 12,
      margin: '24px 16px',
      padding: '14px 16px',
      borderLeft: '3px solid #d83b01',
      background: 'var(--colorNeutralBackground2, #faf9f8)',
      borderRadius: 4,
      fontSize: 13,
      color: 'var(--colorNeutralForeground1)',
    }}
  >
    <WarningRegular style={{ color: '#d83b01', fontSize: 18, flexShrink: 0, marginTop: 1 }} />
    <div style={{ lineHeight: 1.5 }}>
      <strong>This device does not support {pointType}.</strong>
      {(deviceName || reason) && (
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginTop: 2 }}>
          {deviceName && <span>{deviceName} — </span>}
          {reason ||
            'This is likely an older device or a sub-device whose points are managed through its parent controller.'}
        </div>
      )}
    </div>
  </div>
);
