/**
 * TrendlogInputEntity - TRENDLOG_INPUTS table operations
 * Device-scoped entity (SerialNumber + Trendlog_ID + Input_Index)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TrendlogInput } from '../../types/trendlog.types';

export class TrendlogInputEntity extends BaseEntity<TrendlogInput> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlog_inputs`;
  }

  async get(serialNumber: number, trendlogId: number, inputIndex: number): Promise<TrendlogInput | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${inputIndex}`);
    try {
      return await this.getData<TrendlogInput>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number, trendlogId: number): Promise<TrendlogInput[]> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.getData<TrendlogInput[]>(url);
  }

  async update(serialNumber: number, trendlogId: number, inputIndex: number, data: Partial<TrendlogInput>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${inputIndex}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, trendlogId: number, data: Omit<TrendlogInput, 'SerialNumber' | 'Trendlog_ID' | 'Input_Index'>): Promise<TrendlogInput> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    return await this.postData<TrendlogInput>(url, data);
  }

  async delete(serialNumber: number, trendlogId: number, inputIndex: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}/${inputIndex}`);
    await this.deleteData<void>(url);
  }
}
