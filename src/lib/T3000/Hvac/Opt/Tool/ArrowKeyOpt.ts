import T3Gv from "../../Data/T3Gv";
import T3Util from "../../Util/T3Util";


class ArrowKeyOpt {
  /**
   * Navigates selection to the right
   * @returns Result from the business manager if available
   */
  NavRight() {
    T3Util.Log("= O.ArrowKeyOpt: NavRight called");
    try {
      this.NudgeRight();
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NavRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection to the left
   * @returns Result from the business manager if available
   */
  NavLeft() {
    T3Util.Log("= O.ArrowKeyOpt: NavLeft called");
    try {
      this.NudgeLeft();
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NavLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection upward
   * @returns Result from the business manager if available
   */
  NavUp() {
    T3Util.Log("= O.ArrowKeyOpt: NavUp called");
    try {
      this.NudgeUp();
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NavUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Navigates selection downward
   * @returns Result from the business manager if available
   */
  NavDown() {
    T3Util.Log("= O.ArrowKeyOpt: NavDown called");
    try {
      this.NudgeDown();
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NavDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection to the right
   * @returns Result of the nudge operation if available
   */
  NudgeRight() {
    T3Util.Log("= O.ArrowKeyOpt: NudgeRight called");
    try {
      this.Nudge(1, 0);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NudgeRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection to the left
   * @returns Result of the nudge operation if available
   */
  NudgeLeft() {
    T3Util.Log("= O.ArrowKeyOpt: NudgeLeft called");
    try {
      this.Nudge(-1, 0);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NudgeLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection upward
   * @returns Result of the nudge operation if available
   */
  NudgeUp() {
    T3Util.Log("= O.ArrowKeyOpt: NudgeUp called");
    try {
      this.Nudge(0, -1);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NudgeUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Nudges selection downward
   * @returns Result of the nudge operation if available
   */
  NudgeDown() {
    T3Util.Log("= O.ArrowKeyOpt: NudgeDown called");
    try {
      this.Nudge(0, 1);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: NudgeDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection to the right
   * @returns Result of the grow operation if available
   */
  GrowRight() {
    T3Util.Log("= O.ArrowKeyOpt: GrowRight called");
    try {
      this.NudgeGrow(1, 0);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: GrowRight error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection to the left
   * @returns Result of the grow operation if available
   */
  GrowLeft() {
    T3Util.Log("= O.ArrowKeyOpt: GrowLeft called");
    try {
      this.NudgeGrow(-1, 0);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: GrowLeft error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection downward
   * @returns Result of the grow operation if available
   */
  GrowDown() {
    T3Util.Log("= O.ArrowKeyOpt: GrowDown called");
    try {
      this.NudgeGrow(0, 1);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: GrowDown error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Grows selection upward
   * @returns Result of the grow operation if available
   */
  GrowUp() {
    T3Util.Log("= O.ArrowKeyOpt: GrowUp called");
    try {
      this.NudgeGrow(0, -1);
    } catch (error) {
      T3Util.Log("= O.ArrowKeyOpt: GrowUp error:", error);
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  Nudge = function (e, t) {
    T3Gv.opt.NudgeSelectedObjects(e, t, !1);
  }

  NudgeGrow = function (e, t) {
    T3Gv.opt.NudgeSelectedObjects(e, t, !0);
  }
}

export default ArrowKeyOpt
