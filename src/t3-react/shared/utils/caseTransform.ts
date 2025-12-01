/**
 * Case Transformation Utilities
 *
 * Converts between snake_case (backend) and camelCase (frontend)
 */

/**
 * Convert snake_case keys to camelCase recursively
 */
export function toCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toCamelCase(item));
  }

  const camelCased: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      camelCased[camelKey] = toCamelCase(obj[key]);
    }
  }
  return camelCased;
}

/**
 * Convert camelCase keys to snake_case recursively
 */
export function toSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => toSnakeCase(item));
  }

  const snakeCased: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
      snakeCased[snakeKey] = toSnakeCase(obj[key]);
    }
  }
  return snakeCased;
}
