/**
 * ProgramEntity - PROGRAMS table operations
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Program } from '../../types/control.types';

export class ProgramEntity extends BaseEntity<Program> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/programs`;
  }

  async get(serialNumber: number, programId: string): Promise<Program | null> {
    const programs = await this.getAll(serialNumber);
    return programs.find(p => p.Program_ID === programId) || null;
  }

  async getAll(serialNumber: number): Promise<Program[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Program[]>(url);
  }

  async update(serialNumber: number, programId: string, data: Partial<Program>): Promise<void> {
    const url = `${this.buildUrl(String(serialNumber))}/${programId}`;
    await this.putData<void>(url, data);
  }

  async create(serialNumber: number, data: Partial<Program>): Promise<Program> {
    const url = this.buildUrl(String(serialNumber));
    return await this.postData<Program>(url, { ...data, SerialNumber: serialNumber });
  }

  async delete(serialNumber: number, programId: string): Promise<void> {
    const url = `${this.buildUrl(String(serialNumber))}/${programId}`;
    await this.deleteData<void>(url);
  }
}
