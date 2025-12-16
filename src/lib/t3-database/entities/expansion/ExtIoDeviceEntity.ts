/**
 * ExtIoDeviceEntity - EXTIO_DEVICES table operations
 * Device-scoped entity (SerialNumber + ExtIo_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { ExtIoDevice } from '../../types/expansion.types';

export class ExtIoDeviceEntity extends BaseEntity<ExtIoDevice> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/extio_devices`;
  }

  async get(serialNumber: number, extIoId: number): Promise<ExtIoDevice | null> {
    const url = this.buildUrl(`${serialNumber}/${extIoId}`);
    try {
      return await this.getData<ExtIoDevice>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<ExtIoDevice[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<ExtIoDevice[]>(url);
  }

  async update(serialNumber: number, extIoId: number, data: Partial<ExtIoDevice>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${extIoId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<ExtIoDevice, 'SerialNumber' | 'ExtIo_ID'>): Promise<ExtIoDevice> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<ExtIoDevice>(url, data);
  }

  async delete(serialNumber: number, extIoId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${extIoId}`);
    await this.deleteData<void>(url);
  }
}
