import {
  DataSourceApi,
  DataSourceInstanceSettings,
  DataQueryRequest,
  DataQueryResponse,
  DataFrame,
  FieldType,
  dateTime
} from '@grafana/data';
import { T3000Query, T3000ApiResponse } from './types';
import { t3000Api } from './api';

export class T3000DataSource extends DataSourceApi<T3000Query> {
  constructor(instanceSettings: DataSourceInstanceSettings) {
    super(instanceSettings);
  }

  async query(options: DataQueryRequest<T3000Query>): Promise<DataQueryResponse> {
    const { range, targets } = options;
    const data: DataFrame[] = [];

    for (const target of targets) {
      if (target.hide) continue;

      try {
        const response = await t3000Api.fetchTimeSeriesData(
          target.deviceId,
          target.channelIds,
          range!.from.valueOf(),
          range!.to.valueOf()
        );

        const dataFrames = this.convertToDataFrames(response, target.refId);
        data.push(...dataFrames);
      } catch (error) {
        console.error('Failed to fetch data for target:', target, error);
      }
    }

    return { data };
  }

  async testDatasource() {
    // Test the connection to T3000 device
    try {
      const result = await t3000Api.testConnection(123); // Default device ID
      return {
        status: result.status === 'ok' ? 'success' : 'error',
        message: result.message
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private convertToDataFrames(response: T3000ApiResponse, refId: string): DataFrame[] {
    const dataFrames: DataFrame[] = [];

    Object.entries(response.channels).forEach(([channelId, channelData]) => {
      if (channelData.values.length === 0) return;

      const timeField = {
        name: 'Time',
        type: FieldType.time,
        values: channelData.values.map(point => point.time),
        config: {}
      };

      const valueField = {
        name: channelData.name,
        type: FieldType.number,
        values: channelData.values.map(point => point.value),
        config: {
          unit: channelData.unit,
          displayName: channelData.name
        }
      };

      dataFrames.push({
        name: channelData.name,
        refId: `${refId}_${channelId}`,
        fields: [timeField, valueField],
        length: channelData.values.length
      });
    });

    return dataFrames;
  }
}

export default T3000DataSource;
