/**
 * MonitorDataEntity - MONITORDATA table operations
 * Device-scoped entity (SerialNumber + Monitor_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { MonitorData } from '../../types/alarms.types';

export class MonitorDataEntity extends BaseEntity<MonitorData> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/monitor_data`;
  }

  async get(serialNumber: number, monitorId: number): Promise<MonitorData | null> {
    const url = this.buildUrl(`${serialNumber}/${monitorId}`);
    try {
      return await this.getData<MonitorData>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<MonitorData[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<MonitorData[]>(url);
  }

  async update(serialNumber: number, monitorId: number, data: Partial<MonitorData>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${monitorId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<MonitorData, 'SerialNumber' | 'Monitor_ID'>): Promise<MonitorData> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<MonitorData>(url, data);
  }

  async delete(serialNumber: number, monitorId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${monitorId}`);
    await this.deleteData<void>(url);
  }
}
