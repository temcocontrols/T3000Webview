/**
 * HolidayEntity - HOLIDAYS table operations
 * Device-scoped entity (SerialNumber + Holiday_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Holiday } from '../../types/control.types';

export class HolidayEntity extends BaseEntity<Holiday> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/holidays`;
  }

  async get(serialNumber: number, holidayId: number): Promise<Holiday | null> {
    const url = this.buildUrl(`${serialNumber}/${holidayId}`);
    try {
      return await this.getData<Holiday>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Holiday[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Holiday[]>(url);
  }

  async update(serialNumber: number, holidayId: number, data: Partial<Holiday>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${holidayId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Holiday, 'SerialNumber' | 'Holiday_ID'>): Promise<Holiday> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Holiday>(url, data);
  }

  async delete(serialNumber: number, holidayId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${holidayId}`);
    await this.deleteData<void>(url);
  }
}
