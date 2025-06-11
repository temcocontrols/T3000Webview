
import T3Gv from '../../Data/T3Gv';
import LogUtil from '../../Util/LogUtil';
import '../../Util/T3Hammer';
import ObjectUtil from "../Data/ObjectUtil";
import LayerUtil from "./LayerUtil";
import SvgUtil from "./SvgUtil";

class ActionUtil {

  /**
   * Clears all action arrow timers for visible objects in the system.
   * This function iterates through all visible objects and removes any active
   * hide timers associated with action arrows, preventing scheduled hiding
   * actions from executing.
   * @returns {void}
   */
  static ClearAllActionArrowTimers() {
    LogUtil.Debug('O.Opt ClearAllActionArrowTimers: input');

    const visibleObjects = LayerUtil.VisibleZList();

    for (let objectIndex = 0; objectIndex < visibleObjects.length; objectIndex++) {
      const visibleObject = ObjectUtil.GetObjectPtr(visibleObjects[objectIndex], false);

      if (visibleObject && visibleObject.actionArrowHideTimerID !== -1) {
        // Clear the existing timeout and reset the timer ID
        T3Gv.opt.actionArrowHideTimer.clearTimeout(visibleObject.actionArrowHideTimerID);
        visibleObject.actionArrowHideTimerID = -1;
      }
    }

    LogUtil.Debug('O.Opt ClearAllActionArrowTimers: output');
  }

  /**
  * Removes all action arrows from visible objects in the document
  * This function iterates through all visible objects and removes any action arrows
  * associated with them, clearing timers as well.
  */
  static RemoveAllActionArrows() {
    LogUtil.Debug("O.Opt RemoveAllActionArrows - Input: no parameters");

    const visibleObjects = LayerUtil.VisibleZList();

    for (let i = 0; i < visibleObjects.length; i++) {
      this.RemoveActionArrows(visibleObjects[i], true);
    }

    LogUtil.Debug("O.Opt RemoveAllActionArrows - Output: Removed arrows from", visibleObjects.length, "objects");
  }

  static ClearActionArrowTimer(objectId: number) {
    LogUtil.Debug("O.Opt ClearActionArrowTimer - Input:", objectId);
    if (objectId >= 0) {
      const targetObject = ObjectUtil.GetObjectPtr(objectId, false);
      if (targetObject) {
        if (targetObject.actionArrowHideTimerID >= 0) {
          T3Gv.opt.actionArrowHideTimer.clearTimeout(targetObject.actionArrowHideTimerID);
          targetObject.actionArrowHideTimerID = -1;
          LogUtil.Debug("O.Opt ClearActionArrowTimer - Timer cleared for object", objectId);
        } else {
          LogUtil.Debug("O.Opt ClearActionArrowTimer - No active timer for object", objectId);
        }
      } else {
        LogUtil.Debug("O.Opt ClearActionArrowTimer - No target object found for id", objectId);
      }
    } else {
      LogUtil.Debug("O.Opt ClearActionArrowTimer - Invalid objectId:", objectId);
    }
    LogUtil.Debug("O.Opt ClearActionArrowTimer - Output: Completed");
  }

  static RemoveActionArrows(objectId, clearTimer) {
    LogUtil.Debug("O.Opt RemoveActionArrows - Input:", { objectId, clearTimer });
    const actionArrowId = 'actionArrow' + objectId;

    if (clearTimer) {
      this.ClearActionArrowTimer(objectId);
    } else {
      const targetObject = ObjectUtil.GetObjectPtr(objectId, false);
      if (targetObject) {
        targetObject.actionArrowHideTimerID = -1;
      }
    }

    if (T3Gv.opt.fromOverlayLayer) {
      setTimeout(() => {
        this.SetActionArrowTimer(objectId);
      }, 0);
    } else {
      SvgUtil.ClearOverlayElementsByID(actionArrowId);
    }

    LogUtil.Debug("O.Opt RemoveActionArrows - Output: Completed");
  }

  /**
   * Sets a timer to automatically hide action arrows for a specific object
   * This function creates a timeout that will remove action arrows after a specified delay,
   * but only if the object ID is valid and the object exists.
   * @param objectId - The ID of the object whose action arrows should be hidden
   * @returns {void}
   */
  static SetActionArrowTimer(objectId: number): void {
    LogUtil.Debug("O.Opt SetActionArrowTimer - Input:", objectId);

    if (objectId >= 0) {
      const targetObject = ObjectUtil.GetObjectPtr(objectId, false);

      if (targetObject) {
        // Clear any existing timer before setting a new one
        this.ClearActionArrowTimer(objectId);

        // Set a new timer to remove action arrows after 500ms
        targetObject.actionArrowHideTimerID = T3Gv.opt.actionArrowHideTimer.setTimeout(
          "RemoveActionArrows",
          500,
          objectId
        );

        LogUtil.Debug("O.Opt SetActionArrowTimer - Timer set for object", objectId);
      } else {
        LogUtil.Debug("O.Opt SetActionArrowTimer - No target object found for id", objectId);
      }
    } else {
      LogUtil.Debug("O.Opt SetActionArrowTimer - Invalid objectId:", objectId);
    }

    LogUtil.Debug("O.Opt SetActionArrowTimer - Output: Completed");
  }
}

export default ActionUtil
