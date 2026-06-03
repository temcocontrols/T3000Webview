/**
 * PageSyncStatus — compact "Status" link + drawer for each data page's toolbar.
 *
 * Renders an underlined "Status" link button at the far-right of the toolbar.
 * Click opens the SyncSettingsDrawer with full sync info and settings.
 */

import React, { useState } from 'react';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { SyncSettingsDrawer } from './SyncSettingsDrawer';

interface PageSyncStatusProps {
  dataType: string;
  serialNumber: string;
  onRefresh: () => Promise<void>;
}

export const PageSyncStatus: React.FC<PageSyncStatusProps> = ({
  dataType,
  serialNumber,
  onRefresh,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { syncStatus, timeAgo, refresh: refreshStatus } = useSyncStatus({
    serialNumber,
    dataType,
    autoRefresh: true,
    refreshIntervalMs: 30000,
  });

  return (
    <>
      <button
        onClick={() => setIsDrawerOpen(true)}
        title={`Sync status: ${syncStatus ? timeAgo || 'Unknown' : 'Loading...'}`}
        style={{
          padding: '4px 8px',
          border: 'none',
          background: 'transparent',
          color: '#0078d4',
          fontSize: 12,
          fontWeight: 500,
          fontFamily: 'Segoe UI, sans-serif',
          cursor: 'pointer',
          textDecoration: 'underline',
          whiteSpace: 'nowrap',
          marginLeft: 'auto',
        }}
      >
        Status{syncStatus?.success === false ? ' ⚠' : ''}
      </button>
      <SyncSettingsDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        dataType={dataType}
        serialNumber={serialNumber}
        syncStatus={syncStatus}
        timeAgo={timeAgo}
        onRefresh={async () => {
          await onRefresh();
          await refreshStatus();
        }}
      />
    </>
  );
};
