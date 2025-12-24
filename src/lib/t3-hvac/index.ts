/**
 * T3-HVAC Library - Main Entry Point
 *
 * Conservative migration approach: Keep all Vue/Quasar/jQuery dependencies intact.
 * This is a working system - preserve functionality!
 *
 * This barrel export provides easy access to the main Hvac singleton and commonly used utilities.
 *
 * Usage:
 *   import Hvac from '@/lib/t3-hvac'
 *   import { LogUtil, T3Util } from '@/lib/t3-hvac'
 */

// Main HVAC singleton - primary export
export { default } from './Hvac';
export { default as Hvac } from './Hvac';

// Commonly used utilities
export { default as LogUtil } from './Util/LogUtil';
export { default as T3Util } from './Util/T3Util';
export { default as T3DeviceApi } from './Util/T3DeviceApi';
export { t3DeviceApi } from './Util/T3DeviceApi';

// Data and state management
export { default as T3Gv } from './Data/T3Gv';
export { default as T3Data } from './Data/T3Data';
export * from './Data/T3Data'; // Export all named exports (appStateV2, etc.)

// Commonly used utilities from Opt
export { default as IdxUtils } from './Opt/Common/IdxUtils';
export { default as IdxPage } from './Opt/Common/IdxPage';
export { default as IdxPage2 } from './Opt/Common/IdxPage2';

// FFI APIs
export { useT3000FfiApi } from './Opt/FFI/T3000FfiApi';
export { useTrendlogDataAPI } from './Opt/FFI/TrendlogDataAPI';
export { useDatabaseApi } from './Opt/FFI/DatabaseApi';

// Constants
export * from './Data/Constant/RefConstant';

// Re-export types if needed
export type { default as GlobalMsgModel } from './Model/GlobalMsgModel';
