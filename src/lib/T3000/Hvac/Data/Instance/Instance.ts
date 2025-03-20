


/**
 * Represents a comprehensive HVAC instance holding both fundamental operating parameters and graphical representation settings.
 *
 * @remarks
 * The Instance object splits its data into two main sections:
 * - Basic: Contains core parameters required for HVAC operation and management.
 * - Shape: Involves parameters defining the graphical layout or representation of an HVAC unit.
 *
 * This design facilitates clear separation between the functional configuration and visual representation,
 * enabling developers to manage the system's data more effectively.
 *
 * @example
 * // Example of assigning basic HVAC parameters
 * Instance.Basic = {
 *   temperatureSetPoint: 72, // desired temperature in degrees Fahrenheit
 *   operatingMode: 'cooling'  // operational mode, e.g., 'cooling', 'heating'
 * };
 *
 * // Example of assigning shape or graphic related parameters
 * Instance.Shape = {
 *   width: 120,             // width of the HVAC unit representation (in pixels)
 *   height: 240,            // height of the HVAC unit representation (in pixels)
 *   colorScheme: 'lightblue' // color scheme for the display or UI element
 * };
 *
 * // Accessing and using the HVAC instance data
 * console.log("Basic Parameters:", Instance.Basic);
 * console.log("Shape Parameters:", Instance.Shape);
 */
const Instance = {
  /**
   * Basic instance data - holds fundamental HVAC parameters
   */
  Basic: null,

  /**
   * Shape instance data - contains graphical representation parameters
   */
  Shape: null
}

export default Instance

