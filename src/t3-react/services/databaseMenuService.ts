/**
 * Database Menu Service
 * Handles database-related operations matching C++ T3000 Database menu
 */

import { API_BASE_URL } from '../config/constants';

/**
 * Open Building Config Database
 */
export const openBuildingConfigDatabase = async (): Promise<void> => {
  try {
    // Navigate to building config database view
    window.location.hash = '#/t3000/database/building-config';
  } catch (error) {
    console.error('Failed to open building config database:', error);
    throw error;
  }
};

/**
 * Open All Nodes Database (Ctrl+N)
 */
export const openAllNodesDatabase = async (): Promise<void> => {
  try {
    // Navigate to all nodes database view
    window.location.hash = '#/t3000/database/all-nodes';
  } catch (error) {
    console.error('Failed to open all nodes database:', error);
    throw error;
  }
};

/**
 * Open IOName Configuration
 */
export const openIONameConfig = async (): Promise<void> => {
  try {
    // Navigate to IOName config view
    window.location.hash = '#/t3000/database/ioname-config';
  } catch (error) {
    console.error('Failed to open IOName config:', error);
    throw error;
  }
};

/**
 * Open Log Detail
 */
export const openLogDetail = async (): Promise<void> => {
  try {
    // Navigate to log detail view
    window.location.hash = '#/t3000/database/log-detail';
  } catch (error) {
    console.error('Failed to open log detail:', error);
    throw error;
  }
};

export const DatabaseMenuService = {
  openBuildingConfigDatabase,
  openAllNodesDatabase,
  openIONameConfig,
  openLogDetail,
};
