/**
 * DatabasePartitionEntity - database_partitions table operations
 * Standard CRUD entity with Partition_ID as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { DatabasePartition } from '../../types/system.types';

export class DatabasePartitionEntity extends BaseEntity<DatabasePartition> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/database_partitions`;
  }

  async get(partitionId: number): Promise<DatabasePartition | null> {
    const url = this.buildUrl(String(partitionId));
    try {
      return await this.getData<DatabasePartition>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<DatabasePartition[]> {
    const url = this.buildUrl('');
    return await this.getData<DatabasePartition[]>(url);
  }

  async update(partitionId: number, data: Partial<DatabasePartition>): Promise<void> {
    const url = this.buildUrl(String(partitionId));
    await this.putData<void>(url, data);
  }

  async create(data: Omit<DatabasePartition, 'Partition_ID'>): Promise<DatabasePartition> {
    const url = this.buildUrl('');
    return await this.postData<DatabasePartition>(url, data);
  }

  async delete(partitionId: number): Promise<void> {
    const url = this.buildUrl(String(partitionId));
    await this.deleteData<void>(url);
  }
}
