

/**
 * Represents the configuration settings for a document editor or canvas.
 *
 * This class encapsulates various display and behavior options such as:
 *
 * - Visual Aids:
 *   - showRulers: Determines if rulers should be visible.
 *   - showGrid: Toggles the display of a background grid.
 *   - showPageDivider: Enables the rendering of page dividers.
 *
 * - Interaction Helpers:
 *   - enableSnap: Enables snapping functionality to aid in alignment.
 *   - centerSnap: When enabled, snapping will center the element.
 *   - snapToShapes: Configures snapping behavior relative to other shapes.
 *
 * - Zoom and Scale Settings:
 *   - zoom: Activates zoom capabilities in the UI.
 *   - zoomLevels: Stores zoom level configurations.
 *   - scale: Toggles the scaling of elements within the document.
 *
 * - Spell-Checking Options:
 *   - spellCheck: Activates spell checking for text elements.
 *   - spellDict: Uses a dictionary-based approach for spell checking.
 *   - spellFlags: Additional flags to customize spell-check behavior.
 *
 * @remarks
 * This configuration class allows developers to fine-tune the appearance and interactivity of their document interfaces.
 * Custom modifications can be made to accommodate different user experiences and application needs.
 *
 * @example
 * Here's how you might instantiate and configure a new DocConfig:
 *
 * ```typescript
 * import { DocConfig } from './DocConfig';
 *
 * const config = new DocConfig();
 * config.showRulers = true;
 * config.showGrid = true;
 * config.enableSnap = true;
 * config.centerSnap = false;
 * config.zoom = true;
 * config.zoomLevels = [0.5, 1, 1.5, 2];
 * config.scale = true;
 * config.showPageDivider = true;
 * config.spellCheck = true;
 * config.spellDict = true;
 * config.spellFlags = true;
 * config.snapToShapes = false;
 *
 * console.log('Document configuration:', config);
 * ```
 */
class DocConfig {
  public showRulers: boolean = true;
  public showGrid: boolean = true;
  public enableSnap: boolean = true;
  public centerSnap: boolean = true;
  public zoom: boolean = true;
  public zoomLevels: any;
  public scale: boolean = true;
  public showPageDivider: boolean = true;
  public spellCheck: boolean = true;
  public spellDict: boolean = true;
  public spellFlags: boolean = true;
  public snapToShapes: boolean = true
}

export default DocConfig
