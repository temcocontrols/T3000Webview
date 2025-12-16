/**
 * CustomUnitEntity - CUSTOM_UNITS table operations
 * Device-scoped entity (SerialNumber + Unit_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { CustomUnit } from '../../types/control.types';

export class CustomUnitEntity extends BaseEntity<CustomUnit> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/custom_units`;
  }

  async get(serialNumber: number, unitId: number): Promise<CustomUnit | null> {
    const url = this.buildUrl(`${serialNumber}/${unitId}`);
    try {
      return await this.getData<CustomUnit>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<CustomUnit[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<CustomUnit[]>(url);
  }

  async update(serialNumber: number, unitId: number, data: Partial<CustomUnit>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${unitId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<CustomUnit, 'SerialNumber' | 'Unit_ID'>): Promise<CustomUnit> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<CustomUnit>(url, data);
  }

  async delete(serialNumber: number, unitId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${unitId}`);
    await this.deleteData<void>(url);
  }
}
