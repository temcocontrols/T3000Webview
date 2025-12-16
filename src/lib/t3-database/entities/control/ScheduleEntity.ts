/**
 * ScheduleEntity - SCHEDULES table operations
 * Device-scoped entity (SerialNumber + Schedule_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Schedule } from '../../types/control.types';

export class ScheduleEntity extends BaseEntity<Schedule> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/schedules`;
  }

  async get(serialNumber: number, scheduleId: number): Promise<Schedule | null> {
    const url = this.buildUrl(`${serialNumber}/${scheduleId}`);
    try {
      return await this.getData<Schedule>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Schedule[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Schedule[]>(url);
  }

  async update(serialNumber: number, scheduleId: number, data: Partial<Schedule>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${scheduleId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Schedule, 'SerialNumber' | 'Schedule_ID'>): Promise<Schedule> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Schedule>(url, data);
  }

  async delete(serialNumber: number, scheduleId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${scheduleId}`);
    await this.deleteData<void>(url);
  }
}
