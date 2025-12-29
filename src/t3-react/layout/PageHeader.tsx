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
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbButton,
  BreadcrumbDivider,
  makeStyles,
  Divider,
  Text,
} from '@fluentui/react-components';
import { ChevronRight20Regular } from '@fluentui/react-icons';
import { useDeviceTreeStore } from '../features/devices/store/deviceTreeStore';
import { SyncStatusBar } from '../shared/components/SyncStatusBar';
import { InputRefreshApiService } from '../features/inputs/services/inputRefreshApi';
import { OutputRefreshApiService } from '../features/outputs/services/outputRefreshApi';
import { VariableRefreshApiService } from '../features/variables/services/variableRefreshApi';
import { ProgramRefreshApiService } from '../features/programs/services/programRefreshApi';

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
    paddingLeft: '16px',
    marginLeft: '16px',
    borderLeft: '1px solid #d1d1d1',
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
  '/t3000/trend-logs': { label: 'Trend Logs', segments: ['Trend Logs'] },
  '/t3000/alarms': { label: 'Alarms', segments: ['Alarms'] },
  '/t3000/array': { label: 'Array', segments: ['Array'] },
  '/t3000/network': { label: 'Network', segments: ['Network'] },
  '/t3000/settings': { label: 'Settings', segments: ['Settings'] },
  '/t3000/discover': { label: 'Discover', segments: ['Discover'] },
  '/t3000/buildings': { label: 'Buildings', segments: ['Buildings'] },
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title, syncConfig }) => {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedDevice } = useDeviceTreeStore();

  // Get breadcrumb info from route
  const breadcrumbInfo = routeToBreadcrumb[location.pathname];
  const pageTitle = title || breadcrumbInfo?.label || 'T3000';
  const segments = breadcrumbInfo?.segments || ['T3000'];

  // Determine if current page should show sync status
  const dataTypeByRoute: Record<string, string> = {
    '/t3000/inputs': 'INPUTS',
    '/t3000/outputs': 'OUTPUTS',
    '/t3000/variables': 'VARIABLES',
    '/t3000/programs': 'PROGRAMS',
  };
  const dataType = dataTypeByRoute[location.pathname];
  const shouldShowSync = !!dataType && !!selectedDevice;

  const handleBreadcrumbClick = (index: number) => {
    if (index === 0) {
      // Home - go to dashboard
      navigate('/t3000/dashboard');
    }
    // Could add more navigation logic for intermediate segments if needed
  };

  const handleRefreshFromDevice = async () => {
    if (!selectedDevice || !dataType) return;

    try {
      console.log(`[PageHeader] Refreshing ${dataType} from device ${selectedDevice.serialNumber}...`);

      let refreshResponse;

      // Call the appropriate refresh API based on data type
      switch (dataType) {
        case 'INPUTS':
          refreshResponse = await InputRefreshApiService.refreshAllInputs(selectedDevice.serialNumber);
          if (refreshResponse.items && refreshResponse.items.length > 0) {
            await InputRefreshApiService.saveRefreshedInputs(selectedDevice.serialNumber, refreshResponse.items);
          }
          break;
        case 'OUTPUTS':
          refreshResponse = await OutputRefreshApiService.refreshAllOutputs(selectedDevice.serialNumber);
          if (refreshResponse.items && refreshResponse.items.length > 0) {
            await OutputRefreshApiService.saveRefreshedOutputs(selectedDevice.serialNumber, refreshResponse.items);
          }
          break;
        case 'VARIABLES':
          refreshResponse = await VariableRefreshApiService.refreshAllVariables(selectedDevice.serialNumber);
          if (refreshResponse.items && refreshResponse.items.length > 0) {
            await VariableRefreshApiService.saveRefreshedVariables(selectedDevice.serialNumber, refreshResponse.items);
          }
          break;
        case 'PROGRAMS':
          refreshResponse = await ProgramRefreshApiService.refreshAllPrograms(selectedDevice.serialNumber);
          if (refreshResponse.items && refreshResponse.items.length > 0) {
            await ProgramRefreshApiService.saveRefreshedPrograms(selectedDevice.serialNumber, refreshResponse.items);
          }
          break;
        default:
          console.warn(`[PageHeader] No refresh handler for data type: ${dataType}`);
          return;
      }

      console.log(`[PageHeader] Refresh completed - ${refreshResponse.count} records`);

      // Trigger page reload via custom event
      window.dispatchEvent(new CustomEvent('data-refreshed', { detail: { dataType } }));
    } catch (error) {
      console.error('[PageHeader] Refresh failed:', error);
      throw error;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.breadcrumbSection}>
        <div className={styles.pageHeaderBar}></div>
        <h1 className={styles.pageTitle}>{pageTitle.toUpperCase()}</h1>
        {selectedDevice && (
          <div className={styles.deviceInfo}>
            <Text className={styles.deviceLabel}>Device:</Text>
            <Text className={styles.deviceName}>
              {selectedDevice.nameShowOnTree || selectedDevice.panelName || `SN: ${selectedDevice.serialNumber}`}
            </Text>
          </div>
        )}
      </div>
      {shouldShowSync && (
        <div className={styles.syncSection}>
          <SyncStatusBar
            dataType={dataType}
            serialNumber={selectedDevice.serialNumber.toString()}
            onRefresh={handleRefreshFromDevice}
          />
        </div>
      )}
    </div>
  );
};

export default PageHeader;
