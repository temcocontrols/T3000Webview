/**
 * TrendlogDataDetailEntity - TRENDLOG_DATA_DETAIL table operations
 * Child records of TRENDLOG_DATA (SerialNumber + Trendlog_ID + Timestamp + Input_Index)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TrendlogDataDetail } from '../../types/trendlog.types';

export class TrendlogDataDetailEntity extends BaseEntity<TrendlogDataDetail> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlog_data_detail`;
  }

  async get(serialNumber: number, trendlogId: number, timestamp: string, inputIndex: number): Promise<TrendlogDataDetail | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}/${inputIndex}`);
    try {
      return await this.getData<TrendlogDataDetail>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number, trendlogId: number, timestamp: string): Promise<TrendlogDataDetail[]> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}`);
    return await this.getData<TrendlogDataDetail[]>(url);
  }

  async create(serialNumber: number, trendlogId: number, timestamp: string, data: Omit<TrendlogDataDetail, 'SerialNumber' | 'Trendlog_ID' | 'Timestamp' | 'Input_Index'>): Promise<TrendlogDataDetail> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}`);
    return await this.postData<TrendlogDataDetail>(url, data);
  }

  async delete(serialNumber: number, trendlogId: number, timestamp: string, inputIndex: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${timestamp}/${inputIndex}`);
    await this.deleteData<void>(url);
  }
}
