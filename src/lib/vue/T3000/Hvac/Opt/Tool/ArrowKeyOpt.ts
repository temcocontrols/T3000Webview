import T3Gv from "../../Data/T3Gv";
import LogUtil from "../../Util/LogUtil";
import T3Util from "../../Util/T3Util";


class ArrowKeyOpt {
  /**
   * Navigates selection to the right
   * @returns Result from the business manager if available
   */
  NavRight() {
    LogUtil.Debug("= O.ArrowKeyOpt: NavRight called");
    try {
      this.NudgeRight();
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NavRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection to the left
   * @returns Result from the business manager if available
   */
  NavLeft() {
    LogUtil.Debug("= O.ArrowKeyOpt: NavLeft called");
    try {
      this.NudgeLeft();
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NavLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection upward
   * @returns Result from the business manager if available
   */
  NavUp() {
    LogUtil.Debug("= O.ArrowKeyOpt: NavUp called");
    try {
      this.NudgeUp();
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NavUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection downward
   * @returns Result from the business manager if available
   */
  NavDown() {
    LogUtil.Debug("= O.ArrowKeyOpt: NavDown called");
    try {
      this.NudgeDown();
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NavDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection to the right
   * @returns Result of the nudge operation if available
   */
  NudgeRight() {
    LogUtil.Debug("= O.ArrowKeyOpt: NudgeRight called");
    try {
      this.Nudge(1, 0);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NudgeRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection to the left
   * @returns Result of the nudge operation if available
   */
  NudgeLeft() {
    LogUtil.Debug("= O.ArrowKeyOpt: NudgeLeft called");
    try {
      this.Nudge(-1, 0);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NudgeLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection upward
   * @returns Result of the nudge operation if available
   */
  NudgeUp() {
    LogUtil.Debug("= O.ArrowKeyOpt: NudgeUp called");
    try {
      this.Nudge(0, -1);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NudgeUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection downward
   * @returns Result of the nudge operation if available
   */
  NudgeDown() {
    LogUtil.Debug("= O.ArrowKeyOpt: NudgeDown called");
    try {
      this.Nudge(0, 1);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: NudgeDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection to the right
   * @returns Result of the grow operation if available
   */
  GrowRight() {
    LogUtil.Debug("= O.ArrowKeyOpt: GrowRight called");
    try {
      this.NudgeGrow(1, 0);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: GrowRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection to the left
   * @returns Result of the grow operation if available
   */
  GrowLeft() {
    LogUtil.Debug("= O.ArrowKeyOpt: GrowLeft called");
    try {
      this.NudgeGrow(-1, 0);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: GrowLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection downward
   * @returns Result of the grow operation if available
   */
  GrowDown() {
    LogUtil.Debug("= O.ArrowKeyOpt: GrowDown called");
    try {
      this.NudgeGrow(0, 1);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: GrowDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection upward
   * @returns Result of the grow operation if available
   */
  GrowUp() {
    LogUtil.Debug("= O.ArrowKeyOpt: GrowUp called");
    try {
      this.NudgeGrow(0, -1);
    } catch (error) {
      LogUtil.Debug("= O.ArrowKeyOpt: GrowUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selected objects by specified X and Y offsets
   * @param xOffset - Horizontal offset to move objects
   * @param yOffset - Vertical offset to move objects
   * @returns Result of nudging operation if available
   */
  Nudge(xOffset, yOffset) {
    LogUtil.Debug(`= O.ArrowKeyOpt: Nudge input - xOffset: ${xOffset}, yOffset: ${yOffset}`);
    const result = T3Gv.opt.NudgeSelectedObjects(xOffset, yOffset, false);
    LogUtil.Debug(`= O.ArrowKeyOpt: Nudge complete`);
    return result;
  }

  /**
   * Grows selected objects by specified X and Y amounts
   * @param xAmount - Horizontal amount to grow objects
   * @param yAmount - Vertical amount to grow objects
   * @returns Result of growing operation if available
   */
  NudgeGrow(xAmount, yAmount) {
    LogUtil.Debug(`= O.ArrowKeyOpt: NudgeGrow input - xAmount: ${xAmount}, yAmount: ${yAmount}`);
    const result = T3Gv.opt.NudgeSelectedObjects(xAmount, yAmount, true);
    LogUtil.Debug(`= O.ArrowKeyOpt: NudgeGrow complete`);
    return result;
  }
}

export default ArrowKeyOpt
