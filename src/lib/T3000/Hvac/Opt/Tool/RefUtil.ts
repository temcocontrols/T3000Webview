import { showGrid, showRulers } from "../../Data/Constant/RefConstant";


class RefUtil {
  static SetShowRulers(show: boolean): void {
    showRulers.value = show;
  }

  static SetShowGrid(show: boolean): void {
    showGrid.value = show;
  }
}

export default RefUtil
