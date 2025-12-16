/**
 * UserEntity - USER table operations
 * Standard CRUD entity with User_ID as primary key
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { User } from '../../types/user.types';

export class UserEntity extends BaseEntity<User> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/users`;
  }

  async get(userId: number): Promise<User | null> {
    const url = this.buildUrl(String(userId));
    try {
      return await this.getData<User>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(): Promise<User[]> {
    const url = this.buildUrl('');
    return await this.getData<User[]>(url);
  }

  async update(userId: number, data: Partial<User>): Promise<void> {
    const url = this.buildUrl(String(userId));
    await this.putData<void>(url, data);
  }

  async create(data: Omit<User, 'User_ID'>): Promise<User> {
    const url = this.buildUrl('');
    return await this.postData<User>(url, data);
  }

  async delete(userId: number): Promise<void> {
    const url = this.buildUrl(String(userId));
    await this.deleteData<void>(url);
  }
}
