import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from "../../Data/T3Gv";
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import DSConstant from "../DS/DSConstant";
import LayerUtil from "../Opt/LayerUtil";
import OptCMUtil from "../Opt/OptCMUtil";
import SelectUtil from "../Opt/SelectUtil";
import ShapeUtil from "../Shape/ShapeUtil";
import UIUtil from "../UI/UIUtil";


class ObjectUtil {

  /**
   * Retrieves an object pointer based on the object ID
   * @param objectId - The ID of the object to retrieve
   * @param preserveObjectBlock - Whether to preserve the block during retrieval
   * @returns The data of the retrieved object, or null if the object is not found
   */
  static GetObjectPtr(objectId, preserveObjectBlock?) {
    // T3Util.Log('O.Opt GetObjectPtr - Input:', { objectId, preserveObjectBlock });

    const targetObject = T3Gv.stdObj.GetObject(objectId);

    // Return null if object not found or ID is invalid
    if (targetObject == null || objectId < 0) {
      // T3Util.Log('O.Opt GetObjectPtr - Output: null (invalid object ID or not found)');
      return null;
    }

    // Determine whether to use preserved block data or direct object data
    const objectData = preserveObjectBlock
      ? T3Gv.stdObj.PreserveBlock(objectId).Data
      : targetObject.Data;

    // T3Util.Log('O.Opt GetObjectPtr - Output:', objectData);
    return objectData;
  }

  static AddToDirtyList(objectId: number, isMoveOnly?: boolean) {
    T3Util.Log('O.Opt AddToDirtyList - Input:', { objectId, isMoveOnly });

    if (T3Gv.opt.dirtyList.indexOf(objectId) < 0) {
      T3Gv.opt.dirtyList.push(objectId);
      T3Gv.opt.dirtyListMoveOnly[objectId] = !!isMoveOnly;
    } else if (!isMoveOnly) {
      T3Gv.opt.dirtyListMoveOnly[objectId] = false;
    }

    T3Util.Log('O.Opt AddToDirtyList - Output: Dirty list updated');
  }

  /**
  * Deletes objects from the document
  * @param objectIds - Array of object IDs to delete
  * @param forceDelete - Whether to force deletion of objects with the NoDelete flag
  */
  static DeleteObjects(objectIds, forceDelete) {
    T3Util.Log("O.Opt DeleteObjects - Input:", { objectIds, forceDelete });

    let objectIndex, objectCount, objectId, svgElement, overlayId;
    let overlayElement, objectData, hookCount, hookId, hookObject;
    let parentObjects = [];
    let layersManager = this.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);

    if (objectIds != null) {
      // Process each object ID in the array
      objectCount = objectIds.length ? objectIds.length : 0;

      for (objectIndex = objectCount - 1; objectIndex >= 0; objectIndex--) {
        objectId = objectIds[objectIndex];

        // Get the object from storage
        const objectBlock = T3Gv.stdObj.GetObject(objectId);

        if (objectBlock) {
          objectData = objectBlock.Data;

          // Skip objects with NoDelete flag if not forced
          if (
            objectData.extraflags & OptConstant.ExtraFlags.NoDelete && !forceDelete
          ) {
            continue;
          }

          // Remove from Z-lists and selection
          LayerUtil.RemoveFromAllZLists(objectId);
          SelectUtil.RemoveFromSelectedList(objectId);

          // Mark for deletion in links
          OptCMUtil.SetLinkFlag(objectId, DSConstant.LinkFlags.DeleteTarget);

          // Process hooks
          hookCount = objectData.hooks.length;
          for (let hookIndex = 0; hookIndex < hookCount; hookIndex++) {
            hookId = objectData.hooks[hookIndex].objid;

            if (hookId > 0) {
              hookObject = this.GetObjectPtr(hookId, true);

              if (hookObject) {
                hookObject.ChangeTarget(
                  hookId,
                  objectId,
                  objectData.hooks[hookIndex].cellid,
                  objectData.hooks[hookIndex].updhook,
                  objectData.hooks[hookIndex].connect,
                  false
                );
              }
            }
          }

          // Delete the object and collect parent objects
          const parentObjectId = objectData.DeleteObject();
          if (parentObjectId && parentObjects.indexOf(parentObjectId) < 0) {
            parentObjects.push(parentObjectId);
          }

          objectBlock.Delete();
        }

        // Remove SVG element
        svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
        if (svgElement) {
          T3Gv.opt.svgObjectLayer.RemoveElement(svgElement);
        }

        // Remove overlay elements
        overlayId = OptConstant.Common.Action + objectId;
        overlayElement = T3Gv.opt.svgOverlayLayer.GetElementById(overlayId);

        if (overlayElement != null) {
          T3Gv.opt.svgOverlayLayer.RemoveElement(overlayElement);
        }
      }

      // Process parent objects
      objectCount = parentObjects.length;
      for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        switch (parentObjects[objectIndex].objecttype) {
          // case NvConstant.FNObjectTypes.SD_OBJT_NG_TIMELINE:
          //   if (DataUtil.GetObjectPtr(parentObjects[objectIndex].BlockID) != null) {
          //     T3Gv.opt.Timeline_Format(parentObjects[objectIndex]);
          //   }
          //   break;
        }
      }
    }

    T3Util.Log("O.Opt DeleteObjects - Output: Objects deleted:", objectCount);
  }


  /**
   * Preserves the current state for undo functionality
   * This function handles saving the current document state to allow for undo operations.
   * It manages the state history stack and handles saving of changed blocks when appropriate.
   *
   * @param shouldKeepStateOpen - If true, keeps the current state open without finalizing it
   *                              for future changes. If false, finalizes the state for undo history.
   */
  static PreserveUndoState(shouldKeepStateOpen) {
    T3Util.Log('O.Opt PreserveUndoState - Input:', { shouldKeepStateOpen });

    // Skip if undo functionality is disabled
    if (!T3Gv.opt.noUndo) {
      // Verify state exists
      if (T3Gv.state === null) {
        throw new Error('state is null');
      }

      // Only proceed if we have a valid state ID
      if (T3Gv.state.currentStateId >= 0) {
        // Check if state is currently open (being modified)
        const isStateOpen = Utils1.IsStateOpen();

        // Preserve the current application state
        T3Gv.state.PreserveState();

        // Add state to history if it was open
        if (isStateOpen) {
          T3Gv.state.AddToHistoryState();
        }

        // Save blocks and update dirty state if needed
        if (!shouldKeepStateOpen && isStateOpen) {
          if (UIUtil.GetDocDirtyState()) {
            // Save only blocks that have changed
            // ShapeUtil.SaveChangedBlocks(T3Gv.state.currentStateId, 1);
          } else {
            // Save all blocks if doc isn't already marked dirty
            ShapeUtil.SaveAllBlocks();
          }
          // Mark document as having unsaved changes
          UIUtil.SetDocDirtyState(true);
        }
      }
    }

    T3Util.Log('O.Opt PreserveUndoState - Output: State preserved');
  }


  static ClearDirtyList() {
    T3Util.Log('O.Opt ClearDirtyList - Input: No parameters');

    T3Gv.opt.dirtyList = [];
    T3Gv.opt.dirtyListMoveOnly = [];
    T3Gv.opt.dirtyListReOrder = false;

    T3Util.Log('O.Opt ClearDirtyList - Output: Dirty list cleared');
  }

  static ClearFutureUndoStates() {
    T3Gv.state.ClearFutureUndoStates();
  }

}

export default ObjectUtil
