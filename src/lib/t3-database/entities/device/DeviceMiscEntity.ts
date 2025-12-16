/**
 * DeviceMiscEntity - MISC_SETTINGS table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { MiscSettings } from '../../types/device.types';

export class DeviceMiscEntity extends BaseEntity<MiscSettings> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/misc`;
  }

  async get(serialNumber: number): Promise<MiscSettings | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<MiscSettings>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(serialNumber: number, data: Partial<MiscSettings>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
