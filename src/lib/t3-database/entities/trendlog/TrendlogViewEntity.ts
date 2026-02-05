/**
 * TrendlogViewEntity - TRENDLOG_VIEWS table operations
 * Device-scoped entity (SerialNumber + Trendlog_ID + View_Index)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TrendlogView } from '../../types/trendlog.types';

export class TrendlogViewEntity extends BaseEntity<TrendlogView> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlog_views`;
  }

  async get(serialNumber: number, trendlogId: number, viewIndex: number): Promise<TrendlogView | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${viewIndex}`);
    try {
      return await this.getData<TrendlogView>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number, trendlogId: number): Promise<TrendlogView[]> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.getData<TrendlogView[]>(url);
  }

  async update(serialNumber: number, trendlogId: number, viewIndex: number, data: Partial<TrendlogView>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${viewIndex}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, trendlogId: number, data: Omit<TrendlogView, 'SerialNumber' | 'Trendlog_ID' | 'View_Index'>): Promise<TrendlogView> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.postData<TrendlogView>(url, data);
  }

  async delete(serialNumber: number, trendlogId: number, viewIndex: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${viewIndex}`);
    await this.deleteData<void>(url);
  }
}
