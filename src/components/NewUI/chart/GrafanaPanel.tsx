import React, { useEffect, useState } from 'react';
import {
  DataFrame,
  Field,
  FieldType,
  PanelPlugin,
  TimeRange,
  dateTime,
  LoadingState,
  PanelData,
  FieldConfig,
  FieldDisplay
} from '@grafana/data';
import {
  PanelContainer,
  useTheme2,
  Button,
  ButtonGroup,
  Spinner
} from '@grafana/ui';
import { T3000DataPoint, T3000Config } from './types';

interface T3000PanelProps {
  data?: PanelData;
  timeRange: TimeRange;
  onTimeRangeChange: (timeRange: TimeRange) => void;
  config: T3000Config;
  onDataRefresh: () => void;
  width: number;
  height: number;
}

/**
 * Grafana Panel Component for T3000 Data Visualization
 * Uses official Grafana components with T3000 data integration
 */
export const T3000Panel: React.FC<T3000PanelProps> = ({
  data,
  timeRange,
  onTimeRangeChange,
  config,
  onDataRefresh,
  width,
  height
}) => {
  const theme = useTheme2();
  const [isLoading, setIsLoading] = useState(false);

  const quickTimeRanges = [
    { label: '5m', value: { from: 'now-5m', to: 'now' } },
    { label: '15m', value: { from: 'now-15m', to: 'now' } },
    { label: '30m', value: { from: 'now-30m', to: 'now' } },
    { label: '1h', value: { from: 'now-1h', to: 'now' } },
    { label: '4h', value: { from: 'now-4h', to: 'now' } },
    { label: '12h', value: { from: 'now-12h', to: 'now' } },
    { label: '24h', value: { from: 'now-24h', to: 'now' } },
    { label: '7d', value: { from: 'now-7d', to: 'now' } }
  ];

  const handleTimeRangeSelect = (range: any) => {
    const newTimeRange: TimeRange = {
      from: dateTime(range.from),
      to: dateTime(range.to),
      raw: range
    };
    onTimeRangeChange(newTimeRange);
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    await onDataRefresh();
    setIsLoading(false);
  };

  return (
    <PanelContainer>
      <div style={{
        width,
        height,
        background: theme.colors.background.primary,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header with controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          borderBottom: `1px solid ${theme.colors.border.weak}`,
          background: theme.colors.background.secondary
        }}>
          <h3 style={{ margin: 0, color: theme.colors.text.primary }}>
            T3000 Real-Time Data - {config.deviceId}
          </h3>

          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {/* Quick time range buttons */}
            <ButtonGroup>
              {quickTimeRanges.map((range) => (
                <Button
                  key={range.label}
                  variant="secondary"
                  size="sm"
                  onClick={() => handleTimeRangeSelect(range.value)}
                >
                  {range.label}
                </Button>
              ))}
            </ButtonGroup>

            <Button
              variant="primary"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              {isLoading ? <Spinner /> : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Chart area */}
        <div style={{
          flex: 1,
          padding: '16px',
          background: theme.colors.background.primary,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {data && data.series && data.series.length > 0 ? (
            <div style={{
              flex: 1,
              border: `1px solid ${theme.colors.border.weak}`,
              borderRadius: '4px',
              padding: '16px',
              background: theme.colors.background.canvas
            }}>
              <h4 style={{ margin: '0 0 16px 0', color: theme.colors.text.primary }}>
                Data Series ({data.series.length} channels)
              </h4>

              {/* Display data series information */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '16px'
              }}>
                {data.series.map((series, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '12px',
                      border: `1px solid ${theme.colors.border.weak}`,
                      borderRadius: '4px',
                      background: theme.colors.background.secondary
                    }}
                  >
                    <div style={{
                      fontWeight: 'bold',
                      color: theme.colors.text.primary,
                      marginBottom: '8px'
                    }}>
                      {series.name || `Series ${index + 1}`}
                    </div>
                    <div style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>
                      Fields: {series.fields.length}<br/>
                      Length: {series.length}<br/>
                      RefId: {series.refId || 'N/A'}
                    </div>

                    {/* Show latest values */}
                    {series.fields.length > 1 && series.length > 0 && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px',
                        background: theme.colors.background.primary,
                        borderRadius: '4px'
                      }}>
                        <div style={{ color: theme.colors.text.secondary, fontSize: '12px' }}>
                          Latest Value:
                        </div>
                        <div style={{
                          color: theme.colors.text.primary,
                          fontWeight: 'bold',
                          fontSize: '16px'
                        }}>
                          {series.fields[1]?.values?.[series.length - 1]?.toFixed(2) || 'N/A'}
                          {series.fields[1]?.config?.unit && ` ${series.fields[1].config.unit}`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Note about visualization */}
              <div style={{
                marginTop: '16px',
                padding: '12px',
                background: theme.colors.info.transparent,
                border: `1px solid ${theme.colors.info.border}`,
                borderRadius: '4px',
                color: theme.colors.info.text
              }}>
                <strong>Note:</strong> This is a simplified Grafana integration demo.
                In a full implementation, this would render as a proper TimeSeries chart
                using Grafana's visualization components.
              </div>
            </div>
          ) : (
            <div style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              color: theme.colors.text.secondary
            }}>
              {isLoading ? (
                <>
                  <Spinner size={32} />
                  <div style={{ marginTop: '16px' }}>Loading T3000 data...</div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '18px', marginBottom: '8px' }}>No data available</div>
                  <div>Try refreshing or selecting a different time range</div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </PanelContainer>
  );
};

export default T3000Panel;
