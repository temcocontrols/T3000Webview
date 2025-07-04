import type { T3000ApiResponse, T3000DataPoint, T3000Channel } from './types'

export class T3000Api {
  private baseUrl: string

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Fetch real-time data from T3000 device
   */
  async fetchCurrentData(deviceId: number, channelIds: number[]): Promise<T3000ApiResponse> {
    const response = await fetch(`${this.baseUrl}/t3000/current`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_id: deviceId,
        channel_ids: channelIds
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch current data: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Fetch historical time-series data from T3000 device
   */
  async fetchTimeSeriesData(
    deviceId: number,
    channelIds: number[],
    startTime: number,
    endTime: number,
    interval?: number
  ): Promise<T3000ApiResponse> {
    const response = await fetch(`${this.baseUrl}/t3000/timeseries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        device_id: deviceId,
        channel_ids: channelIds,
        start_time: startTime,
        end_time: endTime,
        interval: interval || 5000 // Default 5 second interval
      })
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch time series data: ${response.statusText}`)
    }

    return response.json()
  }

  /**
   * Get available channels for a T3000 device
   */
  async fetchAvailableChannels(deviceId: number): Promise<T3000Channel[]> {
    const response = await fetch(`${this.baseUrl}/t3000/channels/${deviceId}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch channels: ${response.statusText}`)
    }

    const data = await response.json()
    return data.channels
  }

  /**
   * Test connection to T3000 device
   */
  async testConnection(deviceId: number): Promise<{ status: 'ok' | 'error', message: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/t3000/health/${deviceId}`)

      if (!response.ok) {
        throw new Error(`Connection test failed: ${response.statusText}`)
      }

      const data = await response.json()
      return { status: 'ok', message: data.message || 'Connection successful' }
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generic data fetcher that handles both current and historical data
   */
  async getData(params: {
    deviceId: number;
    timeRange: { from: any; to: any };
    channels: string[];
  }): Promise<T3000ApiResponse> {
    const now = Date.now();
    const timeSpan = params.timeRange.to.valueOf() - params.timeRange.from.valueOf();

    // Map channel names to IDs (simplified mapping)
    const channelIds = params.channels.map((name, index) => index + 1);

    // If time range is recent (less than 1 hour), fetch current data
    if (timeSpan < 3600000 && params.timeRange.to.valueOf() > now - 300000) {
      return this.fetchCurrentData(params.deviceId, channelIds);
    } else {
      // Fetch historical data
      return this.fetchTimeSeriesData(
        params.deviceId,
        channelIds,
        params.timeRange.from.valueOf(),
        params.timeRange.to.valueOf(),
        Math.max(1000, timeSpan / 1000) // Dynamic interval based on time span
      );
    }
  }

  /**
   * Mock data generator for development/testing
   */
  generateMockData(
    channelIds: number[],
    startTime: number,
    endTime: number,
    interval: number = 5000
  ): T3000ApiResponse {
    const channels: T3000ApiResponse['channels'] = {}

    // Mock channel definitions
    const mockChannels = [
      { id: 1, name: 'Temperature 1', unit: '°F', type: 'analog' as const },
      { id: 2, name: 'Temperature 2', unit: '°F', type: 'analog' as const },
      { id: 3, name: 'Humidity', unit: '%RH', type: 'analog' as const },
      { id: 4, name: 'CO2', unit: 'PPM', type: 'analog' as const },
      { id: 5, name: 'Pressure', unit: 'PSI', type: 'analog' as const },
      { id: 6, name: 'Light Level', unit: 'Lux', type: 'analog' as const },
      { id: 7, name: 'Flow Rate', unit: 'CFM', type: 'analog' as const },
      { id: 8, name: 'Power', unit: 'W', type: 'analog' as const },
      { id: 9, name: 'Relay 1', unit: '', type: 'digital' as const },
      { id: 10, name: 'Relay 2', unit: '', type: 'digital' as const },
      { id: 11, name: 'Fan Status', unit: '', type: 'digital' as const },
      { id: 12, name: 'Alarm', unit: '', type: 'digital' as const },
      { id: 13, name: 'Valve', unit: '', type: 'digital' as const },
      { id: 14, name: 'Pump', unit: '', type: 'digital' as const }
    ]

    channelIds.forEach(channelId => {
      const mockChannel = mockChannels.find(ch => ch.id === channelId)
      if (!mockChannel) return

      const values: T3000DataPoint[] = []

      for (let time = startTime; time <= endTime; time += interval) {
        let value: number

        if (mockChannel.type === 'analog') {
          // Generate realistic analog data with trends and noise
          const baseValue = this.getBaseValue(mockChannel.id)
          const trend = Math.sin(time / 100000) * 5
          const noise = (Math.random() - 0.5) * 2
          value = baseValue + trend + noise
        } else {
          // Generate digital data with realistic switching patterns
          const switchPeriod = 30000 + Math.random() * 60000 // 30-90 seconds
          value = Math.sin(time / switchPeriod) > 0 ? 1 : 0
        }

        values.push({
          time,
          value,
          quality: Math.random() > 0.95 ? 'uncertain' : 'good' // 5% uncertain data
        })
      }

      channels[channelId] = {
        name: mockChannel.name,
        unit: mockChannel.unit,
        type: mockChannel.type,
        values
      }
    })

    return {
      deviceId: 123, // Mock device ID
      timestamp: Date.now(),
      channels
    }
  }

  private getBaseValue(channelId: number): number {
    const baseValues: { [key: number]: number } = {
      1: 72,    // Temperature 1 (°F)
      2: 68,    // Temperature 2 (°F)
      3: 45,    // Humidity (%RH)
      4: 400,   // CO2 (PPM)
      5: 14.7,  // Pressure (PSI)
      6: 300,   // Light Level (Lux)
      7: 1200,  // Flow Rate (CFM)
      8: 2400   // Power (W)
    }
    return baseValues[channelId] || 50
  }
}

// Singleton instance
export const t3000Api = new T3000Api()
