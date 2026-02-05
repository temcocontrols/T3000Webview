/**
 * DeviceWifiEntity - WIFI_SETTINGS table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { WifiSettings } from '../../types/device.types';

export class DeviceWifiEntity extends BaseEntity<WifiSettings> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/wifi`;
  }

  async get(serialNumber: number): Promise<WifiSettings | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<WifiSettings>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(serialNumber: number, data: Partial<WifiSettings>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
