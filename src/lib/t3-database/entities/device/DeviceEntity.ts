/**
 * DeviceEntity - DEVICES table operations
 * Main device registry with SerialNumber as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Device } from '../../types/device.types';

export class DeviceEntity extends BaseEntity<Device> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/devices`;
  }

  /**
   * Get device by serial number
   */
  async get(serialNumber: number): Promise<Device | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<Device>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all devices
   */
  async getAll(): Promise<Device[]> {
    const url = this.buildUrl();
    return await this.getData<Device[]>(url);
  }

  /**
   * Create new device
   */
  async create(data: Partial<Device>): Promise<Device> {
    const url = this.buildUrl();
    return await this.postData<Device>(url, data);
  }

  /**
   * Update device
   */
  async update(serialNumber: number, data: Partial<Device>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, data);
  }

  /**
   * Delete device
   */
  async delete(serialNumber: number): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.deleteData<void>(url);
  }
}
