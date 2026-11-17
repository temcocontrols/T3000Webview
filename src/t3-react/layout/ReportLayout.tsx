/**
 * ReportLayout — the shell for Help → Report an Issue.
 *
 * It carries the application menu bar (so the page belongs to T3000 and Help / Report are where the
 * user expects them) plus a Report menu with the capture commands, and no device tree: there is no
 * device to select while filing a bug, and the form needs the width. The status bar stays, because
 * the device and connection state it shows is exactly the context a report needs.
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { makeStyles } from '@fluentui/react-components';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { ReportCommandBar } from '../features/report/components/ReportCommandBar';
import { ReportCommandsProvider } from '../features/report/services/reportCommands';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    width: '100%',
    overflow: 'hidden',
    backgroundColor: '#f5f5f5',
    fontFamily: 'var(--t3-font-family)',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    overflow: 'hidden',
    minWidth: 0,
    backgroundColor: '#ffffff',
    borderBottom: '1px solid #d1d1d1',
  },
});

export const ReportLayout: React.FC = () => {
  const styles = useStyles();
  const { pathname } = useLocation();
  // History has its own toolbar; the capture commands do not apply there.
  const showCommandBar = !pathname.includes('/t3000/report/history');

  return (
    <ReportCommandsProvider>
      <div className={styles.container}>
        <Header showToolbar={false} />
        {showCommandBar ? <ReportCommandBar /> : null}
        <div className={styles.content}>
          <Outlet />
        </div>
        <StatusBar />
      </div>
    </ReportCommandsProvider>
  );
};

export default ReportLayout;
