

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
    Environment: "dev",
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
}

export default HvConstant
