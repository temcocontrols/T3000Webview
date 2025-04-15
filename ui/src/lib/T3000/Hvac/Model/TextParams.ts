

/**
 * Represents configuration parameters for text dimensions in the HVAC text model.
 *
 * This object defines optional constraints that can be applied to text elements or components
 * regarding their widths and heights. When a constraint is set to null, it implies that no limit is enforced.
 *
 * @remarks
 * This configuration is typically used in systems where dynamic text sizing is needed,
 * allowing for flexible layout management while ensuring some level of control.
 *
 * @example
 * ```typescript
 * // Example usage:
 * const textSettings = {
 *   ...TextParams,
 *   minWidth: 100,    // Minimum width of 100 units
 *   maxWidth: 300,    // Maximum width of 300 units
 *   minHeight: 50,    // Minimum height of 50 units
 * };
 *
 * console.log(`Text minimum width: ${textSettings.minWidth}`);
 * console.log(`Text maximum width: ${textSettings.maxWidth}`);
 * console.log(`Text minimum height: ${textSettings.minHeight}`);
 * ```
 *
 * @property {number | null} minWidth - The minimum width for text. Use null to indicate no minimum constraint.
 * @property {number | null} maxWidth - The maximum width for text. Use null to indicate no maximum constraint.
 * @property {number | null} minHeight - The minimum height for text. Use null to indicate no minimum constraint.
 */
const TextParams = {
  minWidth: null,
  maxWidth: null,
  minHeight: null,
}

export default TextParams
