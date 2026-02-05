/**
 * DatabaseFileEntity - database_files table operations
 * Standard CRUD entity with File_ID as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { DatabaseFile } from '../../types/system.types';

export class DatabaseFileEntity extends BaseEntity<DatabaseFile> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/database_files`;
  }

  async get(fileId: number): Promise<DatabaseFile | null> {
    const url = this.buildUrl(String(fileId));
    try {
      return await this.getData<DatabaseFile>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<DatabaseFile[]> {
    const url = this.buildUrl('');
    return await this.getData<DatabaseFile[]>(url);
  }

  async update(fileId: number, data: Partial<DatabaseFile>): Promise<void> {
    const url = this.buildUrl(String(fileId));
    await this.putData<void>(url, data);
  }

  async create(data: Omit<DatabaseFile, 'File_ID'>): Promise<DatabaseFile> {
    const url = this.buildUrl('');
    return await this.postData<DatabaseFile>(url, data);
  }

  async delete(fileId: number): Promise<void> {
    const url = this.buildUrl(String(fileId));
    await this.deleteData<void>(url);
  }
}
