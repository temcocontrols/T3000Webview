/**
 * GraphicLabelEntity - GRAPHIC_LABELS table operations
 * Device-scoped entity (SerialNumber + Label_ID)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { GraphicLabel } from '../../types/graphics.types';

export class GraphicLabelEntity extends BaseEntity<GraphicLabel> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/graphic_labels`;
  }

  async get(serialNumber: number, labelId: number): Promise<GraphicLabel | null> {
    const url = this.buildUrl(`${serialNumber}/${labelId}`);
    try {
      return await this.getData<GraphicLabel>(url);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async getAll(serialNumber: number): Promise<GraphicLabel[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<GraphicLabel[]>(url);
  }

  async update(serialNumber: number, labelId: number, data: Partial<GraphicLabel>): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${labelId}`);
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Omit<GraphicLabel, 'SerialNumber' | 'Label_ID'>): Promise<GraphicLabel> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<GraphicLabel>(url, data);
  }

  async delete(serialNumber: number, labelId: number): Promise<void> {
    const url = this.buildUrl(`${serialNumber}/${labelId}`);
    await this.deleteData<void>(url);
  }
}
