// T3000 Native Data Source (without Grafana dependencies)
import { T3000ChartData, T3000TimeRange, T3000ApiResponse } from './useT3000Chart';

export interface T3000Query {
  deviceId: string;
  channels: number[];
  timeRange: T3000TimeRange;
}

export interface T3000QueryRequest {
  range: T3000TimeRange;
  targets: T3000Query[];
}

export interface T3000QueryResponse {
  data: T3000ChartData[][];
  error?: string;
}

/**
 * T3000 Data Source API
 */
export class T3000DataSource {
  private baseUrl: string;

  constructor(baseUrl: string = 'ws://localhost:9104') {
    this.baseUrl = baseUrl;
  }

  /**
   * Query T3000 data
   */
  async query(request: T3000QueryRequest): Promise<T3000QueryResponse> {
    try {
      const { range, targets } = request;
      const results: T3000ChartData[][] = [];

      for (const target of targets) {
        const response = await this.fetchDeviceData(target);
        if (response.success && response.data) {
          results.push(response.data);
        }
      }

      return {
        data: results
      };

    } catch (error: any) {
      return {
        data: [],
        error: error.message || 'Failed to query T3000 data'
      };
    }
  }

  /**
   * Fetch data for a specific device
   */
  private async fetchDeviceData(query: T3000Query): Promise<T3000ApiResponse> {
    // Mock implementation - replace with actual T3000 API calls
    return new Promise((resolve) => {
      setTimeout(() => {
        const now = Date.now();
        const data: T3000ChartData[] = [];

        // Generate mock data for each channel
        for (let i = 0; i < 100; i++) {
          data.push({
            time: now - (i * 60000), // 1 minute intervals
            value: Math.random() * 100 + query.channels.length * 10,
            label: `Device ${query.deviceId} - Channel ${query.channels[0] || 1}`
          });
        }

        resolve({
          success: true,
          data: data.reverse() // Chronological order
        });
      }, 200);
    });
  }

  /**
   * Test connection to T3000 system
   */
  async testConnection(): Promise<boolean> {
    try {
      const testQuery: T3000Query = {
        deviceId: 'test',
        channels: [1],
        timeRange: {
          from: new Date(Date.now() - 60000),
          to: new Date()
        }
      };

      const response = await this.fetchDeviceData(testQuery);
      return response.success;

    } catch (error) {
      console.error('T3000 connection test failed:', error);
      return false;
    }
  }

  /**
   * Get available devices
   */
  async getDevices(): Promise<string[]> {
    // Mock implementation
    return ['Device_001', 'Device_002', 'Device_003'];
  }

  /**
   * Get available channels for a device
   */
  async getChannels(deviceId: string): Promise<number[]> {
    // Mock implementation
    return [1, 2, 3, 4, 5, 6, 7, 8];
  }
}

// Singleton instance
export const t3000DataSource = new T3000DataSource();

export default t3000DataSource;
