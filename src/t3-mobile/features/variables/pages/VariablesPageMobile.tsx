/**
 * Mobile Variables Page
 * Card-based mobile view for Variables
 * Uses shared useVariablesPage hook for business logic
 */

import React from 'react';
import {
  Spinner,
  Text,
  makeStyles,
  tokens,
  Button,
} from '@fluentui/react-components';
import {
  ErrorCircleRegular,
  ArrowSyncRegular,
} from '@fluentui/react-icons';
import { useMobilePage } from '../../../layout/MobilePageContext';
import { MobileCard } from '../../../components/MobileCard/MobileCard';
import { useVariablesPage } from '../../../../shared/features/variables/hooks/useVariablesPage';
import { getRangeLabel } from '../../../../t3-react/features/variables/data/rangeData';

const useStyles = makeStyles({
  container: {
    paddingBottom: '24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    textAlign: 'center',
    gap: '16px',
  },
  errorState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    textAlign: 'center',
    gap: '12px',
  },
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '48px',
  },
  cardList: {
    borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
  },
});

export const VariablesPageMobile: React.FC = () => {
  const styles = useStyles();
  const {
    variables,
    loading,
    error,
    refreshing,
    refreshingItems,
    selectedDevice,
    handleRefresh,
    handleRefreshFromDevice,
    handleRefreshSingleVariable,
  } = useVariablesPage();

  const title = variables.length > 0 ? `Variables (${variables.length})` : 'Variables';
  useMobilePage({ title, onRefresh: error && variables.length === 0 ? handleRefresh : handleRefreshFromDevice });

  if (loading && variables.length === 0) {
    return (
      <div className={styles.loadingContainer}>
        <Spinner label="Loading variables..." size="large" />
      </div>
    );
  }

  if (error && variables.length === 0) {
    return (
      <div className={styles.errorState}>
        <ErrorCircleRegular fontSize={48} color={tokens.colorPaletteRedForeground1} />
        <Text size={400} weight="semibold">Failed to load variables</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>{error}</Text>
        <Button appearance="primary" icon={<ArrowSyncRegular />} onClick={handleRefresh}>
          Try Again
        </Button>
      </div>
    );
  }

  if (!selectedDevice) {
    return (
      <div className={styles.emptyState}>
        <Text size={500} weight="semibold">No Device Selected</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Please select a device from the tree to view variables
        </Text>
      </div>
    );
  }

  if (variables.length === 0) {
    return (
      <div className={styles.emptyState}>
        <Text size={500} weight="semibold">No Variables Found</Text>
        <Text size={300} style={{ color: tokens.colorNeutralForeground3 }}>
          Tap refresh to load variables from device
        </Text>
        <Button
          appearance="primary"
          icon={<ArrowSyncRegular />}
          onClick={handleRefreshFromDevice}
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing...' : 'Refresh from Device'}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.cardList}>
        {variables.map((variable) => {
          const isRefreshing = refreshingItems.has(variable.variableIndex || '');
          const rangeValue = parseInt(variable.rangeField || '0', 10);
          const digitalAnalog = parseInt(variable.digitalAnalog || '0', 10);
          const rangeLabel = getRangeLabel(rangeValue, digitalAnalog);
          const displayValue = variable.fValue ? (parseFloat(variable.fValue) / 1000).toFixed(2) : 'N/A';

          return (
            <MobileCard
              key={`${variable.serialNumber}-${variable.variableIndex}`}
              index={`#${variable.variableIndex}`}
              title={variable.fullLabel || variable.label || `Variable ${variable.variableIndex}`}
              displayValue={displayValue}
              displayUnit={variable.units}
              statusColor={variable.autoManual === '1' ? 'manual' : 'auto'}
              expandedDetails={[
                { label: 'Value', value: `${displayValue}${variable.units ? ' ' + variable.units : ''}` },
                { label: 'Mode', value: variable.autoManual === '1' ? 'Manual' : 'Auto' },
                { label: 'Range', value: rangeLabel },
                { label: 'Index', value: `#${variable.variableIndex}` },
              ]}
              onRefresh={() => handleRefreshSingleVariable(variable.variableIndex || '')}
              refreshing={isRefreshing}
            />
          );
        })}
      </div>
    </div>
  );
};
