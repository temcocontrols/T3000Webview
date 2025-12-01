
/**
 * Represents a collection of application constants for the HVAC module.
 *
 * @remarks
 * This class provides static members that encapsulate default application settings and document layout constants.
 * - The {@link HvConstant.Default} object holds configuration values for the application environment.
 * - The {@link HvConstant.DocumentAreaModel} object defines layout properties for the UI, including panel identifiers and dimensions.
 *
 * @example
 * // Retrieve the default environment configuration
 * const environment = HvConstant.Default.Environment; // "dev"
 *
 * // Access the left panel ID and width for the document area layout
 * const leftPanelId = HvConstant.DocumentAreaModel.LEFT_PANEL_ID; // "left-panel"
 * const leftPanelWidth = HvConstant.DocumentAreaModel.LEFT_PANEL_WIDTH; // 105
 *
 * @public
 */
class HvConstant {

  /**
   * Default application settings
   * Contains environment configuration values
   */
  static Default = {
    Environment: "prd",
  }

  /**
   * Document area layout model
   * Defines constants for UI layout dimensions and element IDs
   */
  static DocumentAreaModel = {
    LEFT_PANEL_ID: "left-panel",
    LEFT_PANEL_WIDTH: 105,
    WORK_AREA_ID: "work-area",
    WORK_AREA_PADDING_LEFT: 105,
  }

  /**
   * Configuration object for controlling log output levels in the HVAC system.
   *
   * @property {boolean} Debug - When true, debug-level messages will be logged. Default: true
   * @property {boolean} Info - When true, informational messages will be logged. Default: true
   * @property {boolean} Error - When true, error messages will be logged. Default: true
   *
   * @example
   * // Disable debug logs but keep info and error logs
   * HvConstant.LogConfig.Debug = false;
   */
  static LogConfig = {
    Debug: false,
    Info: false,
    Error: true,
  }

  static T3Config = {
    log: {},
    Zoom: {
      Step: 0.25,
      Min: 0.25,
      Max: 4.0,
      Default: 1.0
    }
  }
}

export default HvConstant
