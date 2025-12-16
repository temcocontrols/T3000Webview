/**
 * TrendlogDataEntity - TRENDLOG_DATA table operations
 * Device-scoped entity (SerialNumber + Trendlog_ID + Timestamp)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TrendlogData } from '../../types/trendlog.types';

export class TrendlogDataEntity extends BaseEntity<TrendlogData> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlog_data`;
  }

  async get(serialNumber: number, trendlogId: number, timestamp: string): Promise<TrendlogData | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}`);
    try {
      return await this.getData<TrendlogData>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getRange(serialNumber: number, trendlogId: number, startTime: string, endTime: string): Promise<TrendlogData[]> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/range?start=${startTime}&end=${endTime}`);
    return await this.getData<TrendlogData[]>(url);
  }

  async getAll(serialNumber: number, trendlogId: number): Promise<TrendlogData[]> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.getData<TrendlogData[]>(url);
  }

  async create(serialNumber: number, trendlogId: number, data: Omit<TrendlogData, 'SerialNumber' | 'Trendlog_ID'>): Promise<TrendlogData> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.postData<TrendlogData>(url, data);
  }

  async delete(serialNumber: number, trendlogId: number, timestamp: string): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}`);
    await this.deleteData<void>(url);
  }
}
