/**
 * TstatScheduleEntity - TSTAT_SCHEDULES table operations
 * Device-scoped entity (SerialNumber + Tstat_ID + Schedule_Index)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TstatSchedule } from '../../types/expansion.types';

export class TstatScheduleEntity extends BaseEntity<TstatSchedule> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/tstat_schedules`;
  }

  async get(serialNumber: number, tstatId: number, scheduleIndex: number): Promise<TstatSchedule | null> {
    const url = this.buildUrl(`${serialNumber}/${tstatId}/${scheduleIndex}`);
    try {
      return await this.getData<TstatSchedule>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number, tstatId: number): Promise<TstatSchedule[]> {
    const url = this.buildUrl(`${serialNumber}/${tstatId}`);
    return await this.getData<TstatSchedule[]>(url);
  }

  async update(serialNumber: number, tstatId: number, scheduleIndex: number, data: Partial<TstatSchedule>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${tstatId}/${scheduleIndex}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, tstatId: number, data: Omit<TstatSchedule, 'SerialNumber' | 'Tstat_ID' | 'Schedule_Index'>): Promise<TstatSchedule> {
    const url = this.buildUrl(`${serialNumber}/${tstatId}`);
    return await this.postData<TstatSchedule>(url, data);
  }

  async delete(serialNumber: number, tstatId: number, scheduleIndex: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${tstatId}/${scheduleIndex}`);
    await this.deleteData<void>(url);
  }
}
