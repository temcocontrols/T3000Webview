/**
 * TrendlogSyncMetadataEntity - TRENDLOG_DATA_SYNC_METADATA table operations
 * Device-scoped entity (SerialNumber + Trendlog_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { TrendlogSyncMetadata } from '../../types/trendlog.types';

export class TrendlogSyncMetadataEntity extends BaseEntity<TrendlogSyncMetadata> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/trendlog_sync_metadata`;
  }

  async get(serialNumber: number, trendlogId: number): Promise<TrendlogSyncMetadata | null> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    try {
      return await this.getData<TrendlogSyncMetadata>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async update(serialNumber: number, trendlogId: number, data: Partial<TrendlogSyncMetadata>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    await this.putData<void>(url, data);
  }

  async upsert(serialNumber: number, trendlogId: number, data: Partial<TrendlogSyncMetadata>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${trendlogId}`);
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber, Trendlog_ID: trendlogId });
  }
}
