import { ref, reactive } from 'vue'
import { DataFrame, FieldType, dateTime, TimeRange, PanelData, LoadingState } from '@grafana/data'
import type {
  T3000Config,
  T3000ApiResponse,
  T3000DataPoint
} from './types'
import { t3000Api } from './api'

export function useT3000Chart(config: T3000Config) {
  // Reactive state
  const isLoading = ref(false)
  const error = ref<string>('')

  // Grafana-compatible data structure
  const data = ref<PanelData>({
    state: LoadingState.NotStarted,
    series: [],
    timeRange: {
      from: dateTime().subtract(30, 'minutes'),
      to: dateTime(),
      raw: { from: 'now-30m', to: 'now' }
    }
  })

  const timeRange = ref<TimeRange>({
    from: dateTime().subtract(30, 'minutes'),
    to: dateTime(),
    raw: { from: 'now-30m', to: 'now' }
  })

  // Convert T3000 data to Grafana DataFrame format
  const convertToDataFrames = (apiResponse: T3000ApiResponse): DataFrame[] => {
    const dataFrames: DataFrame[] = []

    Object.entries(apiResponse.channels).forEach(([channelId, channelData]) => {
      if (channelData.values.length === 0) return

      const timeField = {
        name: 'Time',
        type: FieldType.time,
        values: channelData.values.map(point => point.time),
        config: {}
      }

      const valueField = {
        name: channelData.name,
        type: FieldType.number,
        values: channelData.values.map(point => point.value),
        config: {
          unit: channelData.unit,
          displayName: channelData.name,
          color: { mode: 'palette-classic' }
        }
      }

      const dataFrame: DataFrame = {
        name: channelData.name,
        refId: `channel_${channelId}`,
        fields: [timeField, valueField],
        length: channelData.values.length
      }

      dataFrames.push(dataFrame)
    })

    return dataFrames
  }

  // Load data from T3000 API
  const loadData = async (): Promise<void> => {
    try {
      isLoading.value = true
      error.value = ''

      data.value.state = LoadingState.Loading

      // Map field names to channel IDs for the mock API
      const channelIds = config.fields.analog.concat(config.fields.digital).map((name, index) => index + 1);

      console.log('[useT3000Chart] Loading data with config:', {
        deviceId: config.deviceId,
        channelIds,
        timeRange: {
          from: timeRange.value.from.valueOf(),
          to: timeRange.value.to.valueOf(),
          raw: timeRange.value.raw
        }
      });

      const response = await t3000Api.getData({
        deviceId: parseInt(config.deviceId) || 123,
        timeRange: timeRange.value,
        channels: channelIds // Pass channel IDs instead of field names
      })

      console.log('[useT3000Chart] API response:', response);

      const dataFrames = convertToDataFrames(response)

      console.log('[useT3000Chart] Converted DataFrames:', dataFrames);

      data.value = {
        ...data.value,
        state: LoadingState.Done,
        series: dataFrames,
        timeRange: timeRange.value
      }

      console.log('[useT3000Chart] Final data state:', data.value);

    } catch (err) {
      console.error('Failed to load T3000 data:', err)
      error.value = err instanceof Error ? err.message : 'Failed to load data'
      data.value.state = LoadingState.Error
    } finally {
      isLoading.value = false
    }
  }

  // Update time range
  const updateTimeRange = (newTimeRange: TimeRange): void => {
    timeRange.value = newTimeRange
    data.value.timeRange = newTimeRange
    loadData()
  }

  return {
    // Grafana-compatible state
    data,
    timeRange,
    isLoading,
    error,

    // Methods
    updateTimeRange,
    loadData
  }
}
