// Simple type definitions to replace Grafana types
interface DataFrame {
  name: string
  fields: Field[]
}

interface Field {
  name: string
  type: string
  values: any[]
  config?: any
}

enum FieldType {
  time = 'time',
  number = 'number',
  string = 'string'
}

interface TimeRange {
  from: Date
  to: Date
  raw: {
    from: Date
    to: Date
  }
}

// T3000 specific data structures
export interface T3000DataPoint {
  time: number        // Unix timestamp in milliseconds
  value: number       // Sensor reading value
  quality?: string    // Data quality indicator ('good', 'bad', 'uncertain')
}

export interface T3000Channel {
  id: number          // T3000 register ID
  name: string        // Display name
  unit: string        // Measurement unit (°F, %RH, PPM, etc.)
  type: 'analog' | 'digital'  // Signal type
  refId: string       // Grafana query reference ID
  color?: string      // Optional color override
  enabled: boolean    // Whether channel is visible
}

export interface T3000PanelOptions {
  title: string
  deviceId: number
  channels: T3000Channel[]
  refreshInterval: number
  showLegend: boolean
  legendPlacement: 'bottom' | 'right' | 'top'
  autoScale: boolean
  yAxisMin?: number
  yAxisMax?: number
}

// Grafana DataFrame structure for T3000 data
export interface T3000DataFrame {
  name: string
  fields: Field[]     // Time field + value fields for each channel
  length: number      // Number of data points
  refId?: string      // Query reference
}

export interface T3000Query {
  refId: string
  deviceId: number
  channelIds: number[]
  queryType: 'timeseries' | 'current'
  intervalMs?: number
  maxDataPoints?: number
}

export interface T3000ApiResponse {
  deviceId: number
  timestamp: number
  channels: {
    [channelId: number]: {
      name: string
      unit: string
      type: 'analog' | 'digital'
      values: T3000DataPoint[]
    }
  }
}

// Vue component props
export interface GrafanaChartProps {
  title?: string
  deviceId?: number
  initialChannels?: T3000Channel[]
  refreshInterval?: number
  timeRange?: TimeRange
  panelOptions?: T3000PanelOptions
  height?: number
  width?: number
}

// Time range presets
export const TIME_RANGES = [
  { value: '5m', label: 'Last 5 minutes', duration: 5 * 60 * 1000 },
  { value: '10m', label: 'Last 10 minutes', duration: 10 * 60 * 1000 },
  { value: '30m', label: 'Last 30 minutes', duration: 30 * 60 * 1000 },
  { value: '1h', label: 'Last 1 hour', duration: 60 * 60 * 1000 },
  { value: '4h', label: 'Last 4 hours', duration: 4 * 60 * 60 * 1000 },
  { value: '12h', label: 'Last 12 hours', duration: 12 * 60 * 60 * 1000 },
  { value: '24h', label: 'Last 24 hours', duration: 24 * 60 * 60 * 1000 },
  { value: '7d', label: 'Last 7 days', duration: 7 * 24 * 60 * 60 * 1000 }
] as const

// Default color palette
export const DEFAULT_COLORS = [
  '#73BF69', // Green
  '#F2CC8F', // Yellow
  '#FF9770', // Orange
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Mint
  '#FECA57', // Gold
  '#FF9FF3', // Pink
  '#54A0FF', // Light Blue
  '#5F27CD', // Purple
  '#00D2D3', // Cyan
] as const

export type TimeRangeValue = typeof TIME_RANGES[number]['value']

// T3000 Chart Configuration
export interface T3000Config {
  deviceId: string;
  refreshInterval: number; // milliseconds
  maxDataPoints: number;
  enableRealTime: boolean;
  fields: {
    analog: string[];
    digital: string[];
    calculated: string[];
  };
  yAxisConfig: {
    left: {
      label: string;
      unit: string;
      min: number | 'auto';
      max: number | 'auto';
    };
    right: {
      label: string;
      unit: string;
      min: number | 'auto';
      max: number | 'auto';
    };
  };
}
