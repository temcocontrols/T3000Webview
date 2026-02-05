

/**
 * Represents window display settings for the HVAC interface.
 *
 * This class stores configuration parameters for window positioning,
 * scaling, and panel display modes within the T3000 HVAC application.
 *
 * @example
 * ```typescript
 * // Create new window settings
 * const settings = new WinSetting();
 *
 * // Update origin position
 * settings.worigin = { x: 100, y: 50 };
 *
 * // Set scaling factor
 * settings.wscale = 1.25;
 *
 * // Set scale mode (e.g., 0: normal, 1: fit to screen)
 * settings.wscalemode = 1;
 *
 * // Set left panel mode (e.g., 0: collapsed, 1: expanded)
 * settings.leftpanelmode = 1;
 *
 * // Mark as updated
 * settings.updated = Date.now();
 * ```
 */
class WinSetting {

  public updated: number;
  public worigin: { x: number, y: number };
  public wscale: number;
  public wscalemode: number;
  public leftpanelmode: number;

  constructor() {
    this.updated = 0;
    this.worigin = { x: 0, y: 0 };
    this.wscale = 0;
    this.wscalemode = 0;
    this.leftpanelmode = 0;
  }
}

export default WinSetting
