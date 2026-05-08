/**
 * Logs Page
 *
 * Three-tab view:
 *  - Activity Log   (T3_APP_LOG SQLite/MSSQL)
 *  - File Logs      (T3WebLog txt files)
 *  - Settings       (per-category log config)
 */

import React, { useState } from 'react';
import { Text, Tab, TabList } from '@fluentui/react-components';
import {
  ClipboardTextLtrRegular,
  DocumentRegular,
  SettingsRegular,
} from '@fluentui/react-icons';
import { ActivityLogTab } from '../components/ActivityLogTab';
import { FileLogsTab } from '../components/FileLogsTab';
import { LogSettingsTab } from '../components/LogSettingsTab';

type TabId = 'activity' | 'files' | 'settings';

export const LogsPage: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabId>('activity');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Page Header */}
      <div style={{
        padding: '12px 16px 0',
        borderBottom: '1px solid #edebe9',
        background: '#ffffff',
      }}>
        <Text size={500} weight="semibold" style={{ display: 'block', marginBottom: '8px' }}>
          T3000 Logs
        </Text>
        <TabList
          selectedValue={selectedTab}
          onTabSelect={(_, data) => setSelectedTab(data.value as TabId)}
          size="small"
        >
          <Tab value="activity" icon={<ClipboardTextLtrRegular />}>Activity Log</Tab>
          <Tab value="files" icon={<DocumentRegular />}>File Logs</Tab>
          <Tab value="settings" icon={<SettingsRegular />}>Settings</Tab>
        </TabList>
      </div>

      {/* Tab Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedTab === 'activity' && <ActivityLogTab />}
        {selectedTab === 'files' && <FileLogsTab />}
        {selectedTab === 'settings' && <LogSettingsTab />}
      </div>
    </div>
  );
};

export default LogsPage;
