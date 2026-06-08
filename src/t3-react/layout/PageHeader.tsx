/**
 * PageHeader Component
 *
 * Top bar for the main content area showing:
 * - Breadcrumb navigation
 * - Current page title
 *
 * Matches the height of the tree toolbar (44px)
 * Azure Portal style with light gray background
 */

import React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import {
  makeStyles,
  Button,
} from '@fluentui/react-components';
import {
  ChevronLeftRegular,
} from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../features/devices/store/deviceTreeStore';

const useStyles = makeStyles({
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: '44px',
    padding: '0 16px',
    backgroundColor: '#fafafa',
    borderBottom: '1px solid #edebe9',
  },
  breadcrumbSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  pageHeaderBar: {
    width: '4px',
    height: '16px',
    background: 'linear-gradient(to bottom, #0078d4, #106ebe)',
    borderRadius: '2px',
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#323130',
    margin: 0,
    letterSpacing: '0.3px',
    lineHeight: '16px',
  },
  deviceInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    paddingLeft: '12px',
    marginLeft: '12px',
    borderLeft: '1px solid #d1d1d1',
  },
  deviceLabel: {
    fontSize: '12px',
    color: '#605e5c',
  },
  deviceName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#323130',
  },
  syncSection: {
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
  },
  statusButton: {
    fontSize: '12px',
    fontWeight: 500,
    color: '#0078d4',
    padding: '4px 8px',
    borderRadius: '2px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    border: 'none',
    background: 'transparent',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    flexShrink: 0,
  },
});

interface PageHeaderProps {
  title?: string;
  syncConfig?: {
    dataType: string;
    serialNumber: string;
    onRefresh: () => void;
  };
}

/**
 * Route to breadcrumb mapping
 */
const routeToBreadcrumb: Record<string, { label: string; segments?: string[] }> = {
  '/t3000/dashboard': { label: 'Dashboard', segments: ['Dashboard'] },
  '/t3000/inputs': { label: 'Inputs', segments: ['Inputs'] },
  '/t3000/outputs': { label: 'Outputs', segments: ['Outputs'] },
  '/t3000/variables': { label: 'Variables', segments: ['Variables'] },
  '/t3000/programs': { label: 'Programs', segments: ['Programs'] },
  '/t3000/pidloops': { label: 'PID Loops', segments: ['PID Loops'] },
  '/t3000/graphics': { label: 'Graphics', segments: ['Graphics'] },
  '/t3000/schedules': { label: 'Schedules', segments: ['Schedules'] },
  '/t3000/holidays': { label: 'Holidays', segments: ['Holidays'] },
  '/t3000/trendlogs': { label: 'Trend Logs', segments: ['Trend Logs'] },
  '/t3000/trend-policy': { label: 'Unified Trend Logging', segments: ['Trend Logs', 'Unified Trend Logging'] },
  '/t3000/trends/chart': { label: 'Trend Chart', segments: ['Trend Logs', 'Chart'] },
  '/t3000/alarms': { label: 'Alarms', segments: ['Alarms'] },
  '/t3000/array': { label: 'Array', segments: ['Array'] },
  '/t3000/network': { label: 'Network', segments: ['Network'] },
  '/t3000/settings': { label: 'Settings', segments: ['Settings'] },
  '/t3000/discover': { label: 'Discover', segments: ['Discover'] },
  '/t3000/buildings': { label: 'Buildings', segments: ['Buildings'] },
  '/t3000/tables': { label: 'Tables', segments: ['Tables'] },
  '/t3000/users': { label: 'Users', segments: ['Users'] },
  '/t3000/custom-units': { label: 'Custom Units', segments: ['Custom Units'] },
  '/t3000/tstat10-simulator': { label: 'Tstat10 Simulator', segments: ['Simulator'] },
  '/t3000/haystack-tags': { label: 'Standard Tags', segments: ['Haystack'] },
  '/t3000/hvac-designer': { label: 'HVAC Designer', segments: ['HVAC Designer'] },
  '/t3000/documentation': { label: 'Documentation', segments: ['Documentation'] },
  '/t3000/database/config': { label: 'Database Configuration', segments: ['Database', 'Configuration'] },
  '/t3000/developer/sync': { label: 'Sync Configuration', segments: ['Developer', 'Sync Configuration'] },
  '/t3000/develop/files': { label: 'File Browser', segments: ['Developer', 'File Browser'] },
  '/t3000/develop/database': { label: 'Database Viewer', segments: ['Developer', 'Database Viewer'] },
  '/t3000/develop/transport': { label: 'Transport Tester', segments: ['Developer', 'Transport Tester'] },
  '/t3000/develop/logs': { label: 'T3000 Logs', segments: ['Developer', 'T3000 Logs'] },
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, syncConfig }) => {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { selectedDevice } = useDeviceTreeStore();

  // Back navigation
  const backTo = searchParams.get('backTo');

  // Get breadcrumb info from route
  const breadcrumbInfo = routeToBreadcrumb[location.pathname];
  const pageTitle = title || breadcrumbInfo?.label || 'T3000';
  const segments = breadcrumbInfo?.segments || ['T3000'];

  // Determine page data type (for breadcrumb / title only)
  const dataTypeByRoute: Record<string, string> = {
    '/t3000/inputs': 'INPUTS',
    '/t3000/outputs': 'OUTPUTS',
    '/t3000/variables': 'VARIABLES',
    '/t3000/programs': 'PROGRAMS',
  };
  const dataType = dataTypeByRoute[location.pathname];

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      // Home - go to dashboard
      navigate('/t3000/dashboard');
    }
    // Could add more navigation logic for intermediate segments if needed
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbSection}>
        <div className={styles.pageHeaderBar}></div>
        <h1 className={styles.pageTitle}>{pageTitle.toUpperCase()}</h1>

      </div>
      {/* Slot for page-specific actions (filled via React portal) */}
      <div id="page-header-actions" style={{ display: 'flex', alignItems: 'center', gap: 12, marginLeft: 'auto' }} />
      {backTo && (
        <Button
          appearance="subtle"
          size="small"
          icon={<ChevronLeftRegular />}
          onClick={() => navigate(decodeURIComponent(backTo))}
          style={{ marginRight: 8 }}
        >
          Back
        </Button>
      )}
      {/* Status moved to per-page toolbars via PageSyncStatus */}
    </div>
  );
};

export default PageHeader;
