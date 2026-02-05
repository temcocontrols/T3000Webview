/**
 * DeviceHardwareEntity - HARDWARE_INFO table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { HardwareInfo } from '../../types/device.types';

export class DeviceHardwareEntity extends BaseEntity<HardwareInfo> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/hardware`;
  }

  async get(serialNumber: number): Promise<HardwareInfo | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<HardwareInfo>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(serialNumber: number, data: Partial<HardwareInfo>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
