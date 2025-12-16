/**
 * InputEntity - INPUTS table operations
 * 64 inputs per device (index 0-63)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Input, BatchSaveRequest, BatchSaveResponse } from '../../types/points.types';

export class InputEntity extends BaseEntity<Input> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/inputs`;
  }

  /**
   * Get single input by serial number and input index
   */
  async get(serialNumber: number, inputIndex: number): Promise<Input | null> {
    const inputs = await this.getAll(serialNumber);
    return inputs.find(input => input.Input_Index === inputIndex) || null;
  }

  /**
   * Get all inputs for a device (0-63)
   */
  async getAll(serialNumber: number): Promise<Input[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Input[]>(url);
  }

  /**
   * Get range of inputs (e.g., inputs 0-15)
   */
  async getRange(serialNumber: number, start: number, count: number): Promise<Input[]> {
    const inputs = await this.getAll(serialNumber);
    return inputs.filter(input =>
      input.Input_Index >= start && input.Input_Index < start + count
    );
  }

  /**
   * Get specific inputs by indices
   */
  async getByIndices(serialNumber: number, indices: number[]): Promise<Input[]> {
    const inputs = await this.getAll(serialNumber);
    const indexSet = new Set(indices);
    return inputs.filter(input => indexSet.has(input.Input_Index));
  }

  /**
   * Update single input
   */
  async update(serialNumber: number, inputIndex: number, data: Partial<Input>): Promise<void> {
    const url = `${this.buildUrl(String(serialNumber))}/${inputIndex}`;
    await this.putData<void>(url, data);
  }

  /**
   * Batch save inputs (NEW ENDPOINT - uses batch_save route)
   * Efficient for saving multiple inputs at once (e.g., from C++ GET_PANEL_DATA)
   */
  async batchSave(serialNumber: number, inputs: Input[]): Promise<BatchSaveResponse> {
    const url = `${this.getEndpoint()}/batch_save`;
    const request: BatchSaveRequest<Input> = {
      serial_number: serialNumber,
      items: inputs
    };
    return await this.postData<BatchSaveResponse>(url, request);
  }
}
