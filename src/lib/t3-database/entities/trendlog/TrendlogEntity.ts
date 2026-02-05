/**
 * TrendlogEntity - TRENDLOGS table operations
 * Device-scoped entity (SerialNumber + Trendlog_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Trendlog } from '../../types/trendlog.types';

export class TrendlogEntity extends BaseEntity<Trendlog> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlogs`;
  }

  async get(serialNumber: number, trendlogId: number): Promise<Trendlog | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    try {
      return await this.getData<Trendlog>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Trendlog[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Trendlog[]>(url);
  }

  async update(serialNumber: number, trendlogId: number, data: Partial<Trendlog>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Trendlog, 'SerialNumber' | 'Trendlog_ID'>): Promise<Trendlog> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Trendlog>(url, data);
  }

  async delete(serialNumber: number, trendlogId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    await this.deleteData<void>(url);
  }
}
