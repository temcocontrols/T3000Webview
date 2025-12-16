/**
 * MsvEntity - MSV_DATA table operations
 * Device-scoped entity (SerialNumber + Msv_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Msv } from '../../types/graphics.types';

export class MsvEntity extends BaseEntity<Msv> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/msv_data`;
  }

  async get(serialNumber: number, msvId: number): Promise<Msv | null> {
    const url = this.buildUrl(`${serialNumber}/${msvId}`);
    try {
      return await this.getData<Msv>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<Msv[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Msv[]>(url);
  }

  async update(serialNumber: number, msvId: number, data: Partial<Msv>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${msvId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<Msv, 'SerialNumber' | 'Msv_ID'>): Promise<Msv> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Msv>(url, data);
  }

  async delete(serialNumber: number, msvId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${msvId}`);
    await this.deleteData<void>(url);
  }
}
