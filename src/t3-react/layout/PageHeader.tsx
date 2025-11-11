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
} from '@fluentui/react-components';
import { ChevronRight20Regular } from '@fluentui/react-icons';

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
  pageTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#201f1e',
    letterSpacing: '-0.01em',
  },
});

interface PageHeaderProps {
  title?: string;
}

/**
 * Route to breadcrumb mapping
 */
const routeToBreadcrumb: Record<string, { label: string; segments?: string[] }> = {
  '/t3000/dashboard': { label: 'Dashboard', segments: ['T3000', 'Dashboard'] },
  '/t3000/inputs': { label: 'Inputs', segments: ['T3000', 'Inputs'] },
  '/t3000/outputs': { label: 'Outputs', segments: ['T3000', 'Outputs'] },
  '/t3000/variables': { label: 'Variables', segments: ['T3000', 'Variables'] },
  '/t3000/programs': { label: 'Programs', segments: ['T3000', 'Programs'] },
  '/t3000/controllers': { label: 'Controllers', segments: ['T3000', 'Controllers'] },
  '/t3000/graphics': { label: 'Graphics', segments: ['T3000', 'Graphics'] },
  '/t3000/schedules': { label: 'Schedules', segments: ['T3000', 'Schedules'] },
  '/t3000/holidays': { label: 'Holidays', segments: ['T3000', 'Holidays'] },
  '/t3000/trend-logs': { label: 'Trend Logs', segments: ['T3000', 'Trend Logs'] },
  '/t3000/alarms': { label: 'Alarms', segments: ['T3000', 'Alarms'] },
  '/t3000/array': { label: 'Array', segments: ['T3000', 'Array'] },
  '/t3000/network': { label: 'Network', segments: ['T3000', 'Network'] },
  '/t3000/settings': { label: 'Settings', segments: ['T3000', 'Settings'] },
  '/t3000/discover': { label: 'Discover', segments: ['T3000', 'Discover'] },
  '/t3000/buildings': { label: 'Buildings', segments: ['T3000', 'Buildings'] },
};

export const PageHeader: React.FC<PageHeaderProps> = ({ title }) => {
  const styles = useStyles();
  const location = useLocation();
  const navigate = useNavigate();

  // Get breadcrumb info from route
  const breadcrumbInfo = routeToBreadcrumb[location.pathname];
  const pageTitle = title || breadcrumbInfo?.label || 'T3000';
  const segments = breadcrumbInfo?.segments || ['T3000'];

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
        <Breadcrumb size="small">
          <BreadcrumbItem>
            <BreadcrumbButton onClick={() => handleBreadcrumbClick(0)}>
              Home
            </BreadcrumbButton>
          </BreadcrumbItem>
          <BreadcrumbDivider>
            <ChevronRight20Regular />
          </BreadcrumbDivider>
          {segments.map((segment, index) => (
            <React.Fragment key={segment}>
              <BreadcrumbItem>
                <BreadcrumbButton
                  current={index === segments.length - 1}
                  onClick={() => index < segments.length - 1 && handleBreadcrumbClick(index + 1)}
                >
                  {segment}
                </BreadcrumbButton>
              </BreadcrumbItem>
              {index < segments.length - 1 && (
                <BreadcrumbDivider>
                  <ChevronRight20Regular />
                </BreadcrumbDivider>
              )}
            </React.Fragment>
          ))}
        </Breadcrumb>
      </div>
      <div className={styles.pageTitle}>
        {pageTitle}
      </div>
    </div>
  );
};

export default PageHeader;
