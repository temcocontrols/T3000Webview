/**
 * RemoteTstatDbEntity - REMOTE_TSTAT_DB table operations
 * 1:1 relationship with DEVICES table
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { RemoteTstatDb } from '../../types/expansion.types';

export class RemoteTstatDbEntity extends BaseEntity<RemoteTstatDb> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/device/remote_tstat`;
  }

  async get(serialNumber: number): Promise<RemoteTstatDb | null> {
    const url = this.buildUrl(String(serialNumber));
    try {
      return await this.getData<RemoteTstatDb>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async upsert(serialNumber: number, data: Partial<RemoteTstatDb>): Promise<void> {
    const url = this.buildUrl(String(serialNumber));
    await this.putData<void>(url, { ...data, SerialNumber: serialNumber });
  }
}
