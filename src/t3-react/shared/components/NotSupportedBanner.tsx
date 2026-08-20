/**
 * NotSupportedBanner — info-bar style notice shown on the Inputs / Outputs /
 * Variables pages when the selected sub-device doesn't support that point type.
 */
import React from 'react';
import { InfoRegular } from '@fluentui/react-icons';

export interface NotSupportedBannerProps {
  /** Display name of the point type, e.g. "Inputs". */
  pointType: string;
  deviceName?: string;
}

export const NotSupportedBanner: React.FC<NotSupportedBannerProps> = ({
  pointType,
  deviceName,
}) => (
  <div
    role="status"
    style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      margin: '16px 16px 16px 0',
      padding: '10px 12px 10px 8px',
      background: '#f0f6ff',
      borderRadius: 4,
      fontSize: 13,
      color: 'var(--colorNeutralForeground1)',
    }}
  >
    <InfoRegular style={{ color: '#0078d4', fontSize: 18, flexShrink: 0, marginTop: 1 }} />
    <div style={{ lineHeight: 1.5 }}>
      <strong>{pointType} are currently not supported.</strong>
      {deviceName && (
        <div style={{ fontSize: 12, color: 'var(--colorNeutralForeground2)', marginTop: 2 }}>
          {deviceName} — this device type is not currently supported.
        </div>
      )}
    </div>
  </div>
);
