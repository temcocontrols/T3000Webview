
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
    Environment: "prod",
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
   * Log configuration settings - Override defaults for local development
   *
   * Console logging behavior (automatic via import.meta.env.DEV):
   * - undefined (default): Auto-detect based on environment
   *   - Development mode (npm run dev): Debug=true, Info=true, Error=true
   *   - Production build (npm run build): Debug=false, Info=false, Error=true
   * - true: Force enable
   * - false: Force disable
   *
   * File logging control:
   * - undefined (default): File logging enabled
   * - false: Disable file logging during local development
   * - true: Explicitly enable file logging
   *
   * To override at runtime, set localStorage 't3.config':
   * localStorage.setItem('t3.config', JSON.stringify({
   *   log: { debug: true, info: true, error: true }
   * }));
   */
  static LogConfig = {
    Debug: undefined,          // Console - undefined = auto-detect, false = force disable, true = force enable
    Info: undefined,           // Console - undefined = auto-detect, false = force disable, true = force enable
    Error: undefined,          // Console - undefined = auto-detect (always true), false = force disable
    FileLogging: undefined,    // File logging - undefined = enabled, false = disabled locally
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
