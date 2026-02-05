/**
 * VariableUnitEntity - VARIABLE_UNITS table operations
 * Device-scoped entity (SerialNumber + VarUnit_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { VariableUnit } from '../../types/control.types';

export class VariableUnitEntity extends BaseEntity<VariableUnit> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/variable_units`;
  }

  async get(serialNumber: number, varUnitId: number): Promise<VariableUnit | null> {
    const url = this.buildUrl(`${serialNumber}/${varUnitId}`);
    try {
      return await this.getData<VariableUnit>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<VariableUnit[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<VariableUnit[]>(url);
  }

  async update(serialNumber: number, varUnitId: number, data: Partial<VariableUnit>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${varUnitId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<VariableUnit, 'SerialNumber' | 'VarUnit_ID'>): Promise<VariableUnit> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<VariableUnit>(url, data);
  }

  async delete(serialNumber: number, varUnitId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${varUnitId}`);
    await this.deleteData<void>(url);
  }
}
