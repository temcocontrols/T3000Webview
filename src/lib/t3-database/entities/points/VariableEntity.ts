/**
 * VariableEntity - VARIABLES table operations
 * 128 variables per device (index 0-127)
 */

import { BaseEntity } from '../base/BaseEntity';
import { HttpClient } from '../../utils/T3ApiClient';
import { Variable, BatchSaveRequest, BatchSaveResponse } from '../../types/points.types';

export class VariableEntity extends BaseEntity<Variable> {
  constructor(httpClient: HttpClient, baseUrl: string) {
    super(httpClient, baseUrl);
  }

  protected getEndpoint(): string {
    return `${this.baseUrl}/t3_device/variables`;
  }

  /**
   * Get single variable by serial number and variable index
   */
  async get(serialNumber: number, variableIndex: number): Promise<Variable | null> {
    const variables = await this.getAll(serialNumber);
    return variables.find(variable => variable.Variable_Index === variableIndex) || null;
  }

  /**
   * Get all variables for a device (0-127)
   */
  async getAll(serialNumber: number): Promise<Variable[]> {
    const url = this.buildUrl(String(serialNumber));
    return await this.getData<Variable[]>(url);
  }

  /**
   * Get range of variables (e.g., variables 0-15)
   */
  async getRange(serialNumber: number, start: number, count: number): Promise<Variable[]> {
    const variables = await this.getAll(serialNumber);
    return variables.filter(variable =>
      variable.Variable_Index >= start && variable.Variable_Index < start + count
    );
  }

  /**
   * Get specific variables by indices
   */
  async getByIndices(serialNumber: number, indices: number[]): Promise<Variable[]> {
    const variables = await this.getAll(serialNumber);
    const indexSet = new Set(indices);
    return variables.filter(variable => indexSet.has(variable.Variable_Index));
  }

  /**
   * Update single variable
   */
  async update(serialNumber: number, variableIndex: number, data: Partial<Variable>): Promise<void> {
    const url = `${this.buildUrl(String(serialNumber))}/${variableIndex}`;
    await this.putData<void>(url, data);
  }

  /**
   * Batch save variables (NEW ENDPOINT - uses batch_save route)
   */
  async batchSave(serialNumber: number, variables: Variable[]): Promise<BatchSaveResponse> {
    const url = `${this.buildUrl(String(serialNumber))}/batch_save`;
    const request = { variables }; // Backend expects {variables: [...]}
    return await this.postData<BatchSaveResponse>(url, request);
  }
}
