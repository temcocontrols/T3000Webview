/**
 * Buildings API
 * Manages building configuration and hierarchy
 */

import { api } from './client';
import type { ApiResponse, PaginatedResponse } from '../types';

export interface Building {
  id: string;
  name: string;
  description?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  floors?: number;
  area?: number; // Square footage
  createdAt: Date;
  updatedAt: Date;
}

export interface BuildingCreateRequest {
  name: string;
  description?: string;
  location?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  floors?: number;
  area?: number;
}

export interface BuildingUpdateRequest extends Partial<BuildingCreateRequest> {
  id: string;
}

/**
 * Get all buildings
 */
export async function getBuildings(
  page: number = 1,
  pageSize: number = 50
): Promise<ApiResponse<PaginatedResponse<Building>>> {
  return api.get<PaginatedResponse<Building>>('/buildings', {
    params: { page, pageSize },
  });
}

/**
 * Get building by ID
 */
export async function getBuildingById(id: string): Promise<ApiResponse<Building>> {
  return api.get<Building>(`/buildings/${id}`);
}

/**
 * Create new building
 */
export async function createBuilding(data: BuildingCreateRequest): Promise<ApiResponse<Building>> {
  return api.post<Building>('/buildings', data);
}

/**
 * Update building
 */
export async function updateBuilding(data: BuildingUpdateRequest): Promise<ApiResponse<Building>> {
  const { id, ...updateData } = data;
  return api.put<Building>(`/buildings/${id}`, updateData);
}

/**
 * Delete building
 */
export async function deleteBuilding(id: string): Promise<ApiResponse<void>> {
  return api.delete<void>(`/buildings/${id}`);
}

/**
 * Search buildings by name or location
 */
export async function searchBuildings(query: string): Promise<ApiResponse<Building[]>> {
  return api.get<Building[]>('/buildings/search', {
    params: { q: query },
  });
}
