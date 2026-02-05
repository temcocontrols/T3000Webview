/**
 * DeviceFeatureEntity - FEATURE_FLAGS table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { FeatureFlags } from '../../types/device.types';

export class DeviceFeatureEntity extends BaseEntity<FeatureFlags> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/features`;
  }

  async get(serialNumber: number): Promise<FeatureFlags | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<FeatureFlags>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(serialNumber: number, data: Partial<FeatureFlags>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
