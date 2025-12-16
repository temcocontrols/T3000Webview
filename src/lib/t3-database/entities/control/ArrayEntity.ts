/**
 * ArrayEntity - ARRAYS table operations
 * Device-scoped entity (SerialNumber + Array_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Array as ArrayType } from '../../types/control.types';

export class ArrayEntity extends BaseEntity<ArrayType> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/arrays`;
  }

  async get(serialNumber: number, arrayId: number): Promise<ArrayType | null> {
    const url = this.buildUrl(`${serialNumber}/${arrayId}`);
    try {
      return await this.getData<ArrayType>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<ArrayType[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<ArrayType[]>(url);
  }

  async update(serialNumber: number, arrayId: number, data: Partial<ArrayType>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${arrayId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<ArrayType, 'SerialNumber' | 'Array_ID'>): Promise<ArrayType> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<ArrayType>(url, data);
  }

  async delete(serialNumber: number, arrayId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${arrayId}`);
    await this.deleteData<void>(url);
  }
}
