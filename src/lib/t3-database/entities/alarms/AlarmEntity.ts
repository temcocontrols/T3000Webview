/**
 * AlarmEntity - ALARMS table operations
 * Device-scoped entity (SerialNumber + Alarm_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Alarm } from '../../types/alarms.types';

export class AlarmEntity extends BaseEntity<Alarm> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/alarms`;
  }

  async get(serialNumber: number, alarmId: number): Promise<Alarm | null> {
    const url = this.buildUrl(`${serialNumber}/${alarmId}`);
    try {
      return await this.getData<Alarm>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Alarm[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Alarm[]>(url);
  }

  async update(serialNumber: number, alarmId: number, data: Partial<Alarm>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${alarmId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Alarm, 'SerialNumber' | 'Alarm_ID'>): Promise<Alarm> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Alarm>(url, data);
  }

  async delete(serialNumber: number, alarmId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${alarmId}`);
    await this.deleteData<void>(url);
  }
}
