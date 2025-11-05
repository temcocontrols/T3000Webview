/**
 * Product type enums from C++ product type constants in global_define.h
 */

// Product type enum (from C++ PM_* constants)
export enum ProductType {
  PM_UNKNOWN = 0,
  PM_MINIPANEL = 1,
  PM_MINIPANEL_ARM = 2,
  PM_CM5 = 5,
  PM_T3_CONTROLLER = 16,
  PM_T3_8I_13O = 17,
  PM_T3_NANO = 18,
  PM_T3_WIFI = 19,
  PM_T3_LB = 20,
  PM_TSTAT5A = 21,
  PM_TSTAT5B = 22,
  PM_TSTAT5C = 23,
  PM_TSTAT5D = 24,
  PM_TSTAT5E = 25,
  PM_TSTAT6 = 26,
  PM_TSTAT7 = 27,
  PM_TSTAT8 = 28,
  PM_TSTAT9 = 29,
  PM_TSTAT10 = 9,
  PM_T322AI = 43,
  PM_T3PT = 44,
  PM_T3_32I = 46,
  PM_T3_OEM = 47,
}

// Product type display names
export const PRODUCT_TYPE_NAMES: Record<ProductType, string> = {
  [ProductType.PM_UNKNOWN]: 'Unknown',
  [ProductType.PM_MINIPANEL]: 'Mini Panel',
  [ProductType.PM_MINIPANEL_ARM]: 'Mini Panel ARM',
  [ProductType.PM_CM5]: 'CM5',
  [ProductType.PM_T3_CONTROLLER]: 'T3 Controller',
  [ProductType.PM_T3_8I_13O]: 'T3-8I13O',
  [ProductType.PM_T3_NANO]: 'T3 Nano',
  [ProductType.PM_T3_WIFI]: 'T3 WiFi',
  [ProductType.PM_T3_LB]: 'T3-LB',
  [ProductType.PM_TSTAT5A]: 'TSTAT5A',
  [ProductType.PM_TSTAT5B]: 'TSTAT5B',
  [ProductType.PM_TSTAT5C]: 'TSTAT5C',
  [ProductType.PM_TSTAT5D]: 'TSTAT5D',
  [ProductType.PM_TSTAT5E]: 'TSTAT5E',
  [ProductType.PM_TSTAT6]: 'TSTAT6',
  [ProductType.PM_TSTAT7]: 'TSTAT7',
  [ProductType.PM_TSTAT8]: 'TSTAT8',
  [ProductType.PM_TSTAT9]: 'TSTAT9',
  [ProductType.PM_TSTAT10]: 'TSTAT10',
  [ProductType.PM_T322AI]: 'T3-22AI',
  [ProductType.PM_T3PT]: 'T3-PT',
  [ProductType.PM_T3_32I]: 'T3-32I',
  [ProductType.PM_T3_OEM]: 'T3 OEM',
};

// Product category
export enum ProductCategory {
  Controller = 'controller',
  Thermostat = 'thermostat',
  Panel = 'panel',
  IO = 'io',
  Unknown = 'unknown',
}

// Product type to category mapping
export const PRODUCT_TYPE_CATEGORY: Record<ProductType, ProductCategory> = {
  [ProductType.PM_UNKNOWN]: ProductCategory.Unknown,
  [ProductType.PM_MINIPANEL]: ProductCategory.Panel,
  [ProductType.PM_MINIPANEL_ARM]: ProductCategory.Panel,
  [ProductType.PM_CM5]: ProductCategory.Controller,
  [ProductType.PM_T3_CONTROLLER]: ProductCategory.Controller,
  [ProductType.PM_T3_8I_13O]: ProductCategory.IO,
  [ProductType.PM_T3_NANO]: ProductCategory.Controller,
  [ProductType.PM_T3_WIFI]: ProductCategory.Controller,
  [ProductType.PM_T3_LB]: ProductCategory.Controller,
  [ProductType.PM_TSTAT5A]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT5B]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT5C]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT5D]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT5E]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT6]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT7]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT8]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT9]: ProductCategory.Thermostat,
  [ProductType.PM_TSTAT10]: ProductCategory.Thermostat,
  [ProductType.PM_T322AI]: ProductCategory.IO,
  [ProductType.PM_T3PT]: ProductCategory.IO,
  [ProductType.PM_T3_32I]: ProductCategory.IO,
  [ProductType.PM_T3_OEM]: ProductCategory.Controller,
};
