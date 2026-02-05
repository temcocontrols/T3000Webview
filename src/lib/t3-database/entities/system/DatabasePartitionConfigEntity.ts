/**
 * DatabasePartitionConfigEntity - database_partition_config table operations
 * Standard CRUD entity with Config_ID as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { DatabasePartitionConfig } from '../../types/system.types';

export class DatabasePartitionConfigEntity extends BaseEntity<DatabasePartitionConfig> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/database_partition_config`;
  }

  async get(configId: number): Promise<DatabasePartitionConfig | null> {
    const url = this.buildUrl(String(configId));
    try {
      return await this.getData<DatabasePartitionConfig>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<DatabasePartitionConfig[]> {
    const url = this.buildUrl('');
    return await this.getData<DatabasePartitionConfig[]>(url);
  }

  async update(configId: number, data: Partial<DatabasePartitionConfig>): Promise<void> {
    const url = this.buildUrl(String(configId));
    await this.putData<void>(url, data);
  }

  async create(data: Omit<DatabasePartitionConfig, 'Config_ID'>): Promise<DatabasePartitionConfig> {
    const url = this.buildUrl('');
    return await this.postData<DatabasePartitionConfig>(url, data);
  }

  async delete(configId: number): Promise<void> {
    const url = this.buildUrl(String(configId));
    await this.deleteData<void>(url);
  }
}
