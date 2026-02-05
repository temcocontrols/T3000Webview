/**
 * RemotePointEntity - REMOTE_POINTS table operations
 * Device-scoped entity (SerialNumber + Point_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { RemotePoint } from '../../types/user.types';

export class RemotePointEntity extends BaseEntity<RemotePoint> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/remote_points`;
  }

  async get(serialNumber: number, pointId: number): Promise<RemotePoint | null> {
    const url = this.buildUrl(`${serialNumber}/${pointId}`);
    try {
      return await this.getData<RemotePoint>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<RemotePoint[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<RemotePoint[]>(url);
  }

  async update(serialNumber: number, pointId: number, data: Partial<RemotePoint>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${pointId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<RemotePoint, 'SerialNumber' | 'Point_ID'>): Promise<RemotePoint> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<RemotePoint>(url, data);
  }

  async delete(serialNumber: number, pointId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${pointId}`);
    await this.deleteData<void>(url);
  }
}
