/**
 * Control Menu Service
 * Handles control panel operations matching C++ T3000 Control menu
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

/**
 * Open Graphics screen (Alt + G)
 */
export const openGraphics = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/graphics';
  } catch (error) {
    console.error('Failed to open graphics:', error);
    throw error;
  }
};

/**
 * Open Programs screen (Alt + P)
 */
export const openPrograms = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/programs';
  } catch (error) {
    console.error('Failed to open programs:', error);
    throw error;
  }
};

/**
 * Open Inputs screen (Alt + I)
 */
export const openInputs = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/inputs';
  } catch (error) {
    console.error('Failed to open inputs:', error);
    throw error;
  }
};

/**
 * Open Outputs screen (Alt + O)
 */
export const openOutputs = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/outputs';
  } catch (error) {
    console.error('Failed to open outputs:', error);
    throw error;
  }
};

/**
 * Open Variables screen (Alt + V)
 */
export const openVariables = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/variables';
  } catch (error) {
    console.error('Failed to open variables:', error);
    throw error;
  }
};

/**
 * Open Loops/Controllers screen (Alt + L)
 */
export const openLoops = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/pidloops';
  } catch (error) {
    console.error('Failed to open loops:', error);
    throw error;
  }
};

/**
 * Open Schedules/Weekly screen (Alt + S)
 */
export const openSchedules = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/schedules';
  } catch (error) {
    console.error('Failed to open schedules:', error);
    throw error;
  }
};

/**
 * Open Holidays/Annual Routines screen (Alt + H)
 */
export const openHolidays = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/holidays';
  } catch (error) {
    console.error('Failed to open holidays:', error);
    throw error;
  }
};

/**
 * Open Trend Logs/Monitors screen (Alt + T)
 */
export const openTrendLogs = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/trendlogs';
  } catch (error) {
    console.error('Failed to open trend logs:', error);
    throw error;
  }
};

/**
 * Open Alarms/Alarm Log screen (Alt + A)
 */
export const openAlarms = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/alarms';
  } catch (error) {
    console.error('Failed to open alarms:', error);
    throw error;
  }
};

/**
 * Open Network and Panel screen (Alt + N)
 */
export const openNetworkPanel = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/network';
  } catch (error) {
    console.error('Failed to open network panel:', error);
    throw error;
  }
};

/**
 * Open Remote Points/TSTAT screen
 */
export const openRemotePoints = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/control/remote-points';
  } catch (error) {
    console.error('Failed to open remote points:', error);
    throw error;
  }
};

/**
 * Open Configuration/Settings screen (Alt + E)
 */
export const openConfiguration = async (): Promise<void> => {
  try {
    window.location.hash = '#/t3000/settings';
  } catch (error) {
    console.error('Failed to open configuration:', error);
    throw error;
  }
};

export const ControlMenuService = {
  openGraphics,
  openPrograms,
  openInputs,
  openOutputs,
  openVariables,
  openLoops,
  openSchedules,
  openHolidays,
  openTrendLogs,
  openAlarms,
  openNetworkPanel,
  openRemotePoints,
  openConfiguration,
};
