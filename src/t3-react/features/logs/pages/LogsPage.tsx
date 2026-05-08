/**
 * Logs Page — user-centric design
 *
 * The log viewer is the primary surface. Settings and file logs are
 * secondary actions accessible from a slim toolbar, not equal tabs.
 *
 * Header bar:  title + subtitle  |  [File Logs]  [Configure Logging]
 * Settings:    collapsible panel that opens inline below the header
 * Main area:   ActivityLogTab by default; FileLogsTab when files mode active
 */

import React, { useState } from 'react';
import {
  makeStyles,
  Button,
  Text,
  Drawer,
  DrawerHeader,
  DrawerHeaderTitle,
  DrawerBody,
} from '@fluentui/react-components';
import {
  DocumentTextRegular,
  SettingsRegular,
  ArrowLeftRegular,
  Dismiss24Regular,
} from '@fluentui/react-icons';
import { ActivityLogTab } from '../components/ActivityLogTab';
import { FileLogsTab } from '../components/FileLogsTab';
import { LogSettingsTab } from '../components/LogSettingsTab';

const useStyles = makeStyles({
  page: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },

  /* ---- header bar ---- */
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 16px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#ffffff',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#201f1e',
    display: 'block',
  },
  subtitle: {
    fontSize: '11.5px',
    color: '#605e5c',
    marginTop: '1px',
    display: 'block',
  },
  headerActions: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexShrink: 0,
  },

  /* ---- drawer body ---- */
  drawerBody: {
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },

  /* ---- main content ---- */
  content: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },

  /* files mode back bar */
  backBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    borderBottomWidth: '1px',
    borderBottomStyle: 'solid',
    borderBottomColor: '#edebe9',
    backgroundColor: '#f0f6ff',
    flexShrink: 0,
    fontSize: '12px',
    color: '#323130',
  },
});

export const LogsPage: React.FC = () => {
  const s = useStyles();
  const [showSettings, setShowSettings] = useState(false);
  const [showFiles, setShowFiles] = useState(false);

  const handleFilesClick = () => {
    setShowFiles(true);
  };

  const handleBackToActivity = () => {
    setShowFiles(false);
  };

  return (
    <div className={s.page}>
      {/* Header */}
      <div className={s.header}>
        <div className={s.headerText}>
          <span className={s.title}>T3000 Logs</span>
          <span className={s.subtitle}>
            View and search what the T3000 service has been doing — errors, sync activity, device
            changes. Use <strong>Configure</strong> to control which categories get recorded.
          </span>
        </div>
        <div className={s.headerActions}>
          {!showFiles && (
            <Button
              size="small"
              appearance="subtle"
              icon={<DocumentTextRegular />}
              onClick={handleFilesClick}
            >
              Raw File Logs
            </Button>
          )}
          <Button
            size="small"
            appearance={showSettings ? 'primary' : 'subtle'}
            icon={<SettingsRegular />}
            onClick={() => setShowSettings(true)}
          >
            Configure Logging
          </Button>
        </div>
      </div>

      {/* Settings drawer */}
      <Drawer
        type="overlay"
        position="end"
        size="medium"
        open={showSettings}
        onOpenChange={(_, { open }) => setShowSettings(open)}
      >
        <DrawerHeader>
          <DrawerHeaderTitle
            action={
              <Button
                appearance="subtle"
                aria-label="Close"
                icon={<Dismiss24Regular />}
                onClick={() => setShowSettings(false)}
              />
            }
          >
            Configure Logging
          </DrawerHeaderTitle>
        </DrawerHeader>
        <DrawerBody className={s.drawerBody}>
          <LogSettingsTab />
        </DrawerBody>
      </Drawer>

      {/* Main content */}
      <div className={s.content}>
        {showFiles ? (
          <>
            <div className={s.backBar}>
              <Button
                size="small"
                appearance="subtle"
                icon={<ArrowLeftRegular />}
                onClick={handleBackToActivity}
              >
                Back to Activity Log
              </Button>
              <Text style={{ fontSize: '12px', color: '#605e5c' }}>
                — Raw text files written by the T3000 service process (T3WebLog)
              </Text>
            </div>
            <FileLogsTab />
          </>
        ) : (
          <ActivityLogTab />
        )}
      </div>
    </div>
  );
};

export default LogsPage;
