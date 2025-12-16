/**
 * DeviceNetworkEntity - NETWORK_SETTINGS table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { NetworkSettings } from '../../types/device.types';

export class DeviceNetworkEntity extends BaseEntity<NetworkSettings> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/network`;
  }

  /**
   * Get network settings for a device
   */
  async get(serialNumber: number): Promise<NetworkSettings | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<NetworkSettings>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Upsert (insert or update) network settings
   */
  async upsert(serialNumber: number, data: Partial<NetworkSettings>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
