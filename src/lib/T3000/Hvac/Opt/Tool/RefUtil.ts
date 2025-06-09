
import { showGrid, showRulers } from "../../Data/Constant/RefConstant";

/**
 * Utility class for managing reactive reference values in Vue components.
 *
 * This class serves as a middleware utility for modifying ref values that are
 * commonly used across Vue components or classes. It provides a centralized
 * approach to manipulate visualization settings like rulers and grid display.
 *
 * @class
 * @example
 * // Toggle ruler visibility
 * RefUtil.SetShowRulers(true);
 *
 * // Hide the grid
 * RefUtil.SetShowGrid(false);
 */
class RefUtil {

  static SetShowRulers(show: boolean): void {
    showRulers.value = show;
  }

  static SetShowGrid(show: boolean): void {
    showGrid.value = show;
  }

}

export default RefUtil
