

import $ from 'jquery';
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import StyleConstant from "../../Data/Constant/StyleConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import Instance from "../../Data/Instance/Instance";
import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import MouseUtil from "../../Event/MouseUtil";
import DynamicGuides from "../../Model/DynamicGuides";
import LinkParameters from "../../Model/LinkParameters";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import KeyboardConstant from "../Keyboard/KeyboardConstant";
import WallOpt from '../Wall/WallOpt';
import DrawUtil from "./DrawUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import HookUtil from './HookUtil';
import PolyUtil from './PolyUtil';
import DynamicUtil from './DynamicUtil';
import TextUtil from './TextUtil';
import QuasarUtil from '../Quasar/QuasarUtil';
import UIUtil from '../UI/UIUtil';

class LMEvtUtil {

  static LMStampPostRelease(completeOperation: boolean): void {
    T3Util.Log("O.Opt LMStampPostRelease - Input:", { completeOperation });

    let hookUpdateStatus: number;
    let flowHookResult: boolean = false;

    // Process HiliteConnect if available
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.HiliteConnect >= 0) {
      HookUtil.HiliteConnect(
        T3Gv.opt.linkParams.HiliteConnect,
        T3Gv.opt.linkParams.ConnectPt,
        false,
        false,
        T3Gv.opt.dragTargetId,
        T3Gv.opt.linkParams.HiliteInside
      );
      T3Gv.opt.linkParams.HiliteConnect = -1;
      // Fix potential typo: resetting HiliteInside to null
      T3Gv.opt.linkParams.HiliteInside = null;
    }

    // Process HiliteJoin if available
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.HiliteJoin >= 0) {
      HookUtil.HiliteConnect(
        T3Gv.opt.linkParams.HiliteJoin,
        T3Gv.opt.linkParams.ConnectPt,
        false,
        true,
        T3Gv.opt.dragTargetId,
        null
      );
      T3Gv.opt.linkParams.HiliteJoin = -1;
    }

    // Reset edit mode to default
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    if (completeOperation) {
      if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.JoinIndex >= 0) {
        // If a join index exists, perform PolyLJoin
        PolyUtil.PolyLJoin(
          T3Gv.opt.linkParams.JoinIndex,
          T3Gv.opt.linkParams.JoinData,
          T3Gv.opt.dragTargetId,
          T3Gv.opt.linkParams.JoinSourceData,
          false
        );
      } else if (T3Gv.opt.linkParams && (T3Gv.opt.linkParams.ConnectIndex >= 0 || T3Gv.opt.linkParams.InitialHook >= 0)) {
        // If connection indexes or an initial hook exists, handle flow chart hook logic
        // if (T3Gv.gFlowChartManager) {
        //   flowHookResult = T3Gv.gFlowChartManager.FlowChartHook(
        //     this.actionStoredObjectId,
        //     this.linkParams.InitialHook,
        //     this.linkParams.ConnectIndex,
        //     this.linkParams.HookIndex,
        //     this.linkParams.ConnectPt
        //   );
        // }
        if (!flowHookResult) {
          if (T3Gv.opt.linkParams.ConnectHookFlag === NvConstant.HookFlags.LcAutoInsert) {
            this.SD_AutoInsertShape(T3Gv.opt.actionStoredObjectId, T3Gv.opt.linkParams.ConnectIndex);
          } else if (T3Gv.opt.linkParams.ConnectHookFlag === NvConstant.HookFlags.LcHookReverse) {
            this.LM_ReverseHook(T3Gv.opt.actionStoredObjectId);
          } else {
            hookUpdateStatus = HookUtil.UpdateHook(
              T3Gv.opt.actionStoredObjectId,
              T3Gv.opt.linkParams.InitialHook,
              T3Gv.opt.linkParams.ConnectIndex,
              T3Gv.opt.linkParams.HookIndex,
              T3Gv.opt.linkParams.ConnectPt,
              T3Gv.opt.linkParams.ConnectInside
            );
            if ((hookUpdateStatus !== 0 && hookUpdateStatus !== undefined) === false) {
              OptCMUtil.SetLinkFlag(T3Gv.opt.linkParams.ConnectIndex, DSConstant.LinkFlags.Move);
            }
          }
        }
      }
    }

    // Reset linkParams
    T3Gv.opt.linkParams = null;

    T3Util.Log("O.Opt LMStampPostRelease - Output: Operation completed");
  }

  /**
   * Prepares for stamping an object onto the document
   */
  static LMStampPreTrack() {
    T3Util.Log("O.Opt LMStampPreTrack - Input: No parameters");

    // Get the session data (not directly used in this function)
    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Initialize link parameters
    T3Gv.opt.linkParams = new LinkParameters();
    T3Gv.opt.linkParams.AutoInsert = DrawUtil.AllowAutoInsert();

    // Check if the object should drop on border lines
    if (T3Gv.opt.drawShape &&
      T3Gv.opt.drawShape.flags &&
      T3Gv.opt.drawShape.flags & NvConstant.ObjFlags.DropOnBorder) {
      T3Gv.opt.linkParams.DropOnLine = true;
    }

    T3Util.Log("O.Opt LMStampPreTrack - Output: Link parameters initialized", {
      autoInsert: T3Gv.opt.linkParams.AutoInsert,
      dropOnLine: T3Gv.opt.linkParams.DropOnLine || false
    });
  }

  /**
   * Handles position tracking during stamp operations, checking for connections
   * @param position - The current cursor position
   * @param drawingObject - The drawing object being stamped
   * @returns The adjusted position based on connections
   */
  static LMStampDuringTrack(position, drawingObject) {
    T3Util.Log("O.Opt LMStampDuringTrack - Input:", { position, drawingObject: drawingObject?.BlockID });

    let hookPoints;

    // Early exit conditions
    if (T3Gv.opt.actionStoredObjectId < 0) {
      T3Util.Log("O.Opt LMStampDuringTrack - Output: No action object ID", position);
      return position;
    }

    if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
      T3Util.Log("O.Opt LMStampDuringTrack - Output: Using move list, returning original position", position);
      return position;
    }

    if (drawingObject == null) {
      T3Util.Log("O.Opt LMStampDuringTrack - Output: No drawing object", position);
      return position;
    }

    // Get hook points for the object
    hookPoints = HookUtil.MoveGetHookPoints(T3Gv.opt.actionStoredObjectId, drawingObject, 0, 0);
    if (!hookPoints) {
      T3Util.Log("O.Opt LMStampDuringTrack - Output: No hook points", position);
      return position;
    }

    // Reset delta values
    T3Gv.opt.dragDeltaX = 0;
    T3Gv.opt.dragDeltaY = 0;

    // Check for drop-on-line or auto-insert connection
    const linkParams = T3Gv.opt.linkParams;
    if ((linkParams.DropOnLine || linkParams.AutoInsert) &&
      SelectUtil.FindConnect(
        T3Gv.opt.actionStoredObjectId,
        drawingObject,
        linkParams.cpt,
        true,
        true,
        false,
        position
      )) {
      // Apply position adjustment from FindConnect
      const adjustedPosition = {
        x: position.x + T3Gv.opt.dragDeltaX,
        y: position.y + T3Gv.opt.dragDeltaY
      };

      T3Util.Log("O.Opt LMStampDuringTrack - Output: Drop-on-line adjusted position", adjustedPosition);
      return adjustedPosition;
    }

    // Reset delta values and try normal connection
    T3Gv.opt.dragDeltaX = 0;
    T3Gv.opt.dragDeltaY = 0;
    T3Gv.opt.dragStartX = position.x;
    T3Gv.opt.dragStartY = position.y;

    // Check for regular connection or join
    if (SelectUtil.FindConnect(
      T3Gv.opt.actionStoredObjectId,
      drawingObject,
      hookPoints,
      true,
      false,
      linkParams.AllowJoin,
      position
    ) || linkParams.JoinIndex >= 0) {

      // Apply position adjustment
      const adjustedPosition = {
        x: position.x + T3Gv.opt.dragDeltaX,
        y: position.y + T3Gv.opt.dragDeltaY
      };

      T3Util.Log("O.Opt LMStampDuringTrack - Output: Connection/join adjusted position", adjustedPosition);
      return adjustedPosition;
    }

    T3Util.Log("O.Opt LMStampDuringTrack - Output: No adjustments needed", position);
    return position;
  }

  /**
   * Handles clicks on shape icons in the SVG document
   * @param event - The event that triggered the icon click
   * @param objectId - ID of the object containing the icon
   * @param iconType - Type of icon that was clicked
   * @param userData - Additional data related to the icon
   * @returns True if the click was handled, false otherwise
   */
  static LMShapeIconClick(event, objectId, iconType, userData) {
    T3Util.Log("O.Opt LMShapeIconClick - Input:", { event, objectId, iconType, userData });

    // Get the object corresponding to the icon
    let drawingObject = DataUtil.GetObjectPtr(objectId, false);
    if (drawingObject == null) {
      T3Util.Log("O.Opt LMShapeIconClick - Output: false (Object not found)");
      return false;
    }

    // Check if object is inside a container cell
    if (drawingObject instanceof Instance.Shape.ShapeContainer) {
      const cellContainer = T3Gv.opt.ContainerIsInCell(drawingObject);
      if (cellContainer) {
        drawingObject = cellContainer.obj;
        objectId = drawingObject.BlockID;
      }
    }

    // Prevent clicking on locked objects
    if (drawingObject.flags & NvConstant.ObjFlags.Lock) {
      T3Util.Log("O.Opt LMShapeIconClick - Output: false (Object is locked)");
      return false;
    }

    // Only handle clicks in default edit mode
    if (OptCMUtil.GetEditMode() !== NvConstant.EditState.Default) {
      T3Util.Log("O.Opt LMShapeIconClick - Output: false (Not in default edit mode)");
      return false;
    }

    // Handle based on icon type
    switch (iconType) {
      case OptConstant.ShapeIconType.HyperLink:
        // Handle regular hyperlink
        const hyperlinkUrl = drawingObject.GetHyperlink(userData);

        if (hyperlinkUrl !== '') {
          if (event.gesture) {
            event.gesture.stopDetect();
          }
          return true;
        }
        return true;

      case OptConstant.ShapeIconType.ExpandedView:
        // Handle expanded view
        let expandedViewId;
        const cellForExpandedView = drawingObject.IsNoteCell(userData);
        expandedViewId = cellForExpandedView ? cellForExpandedView.ExpandedViewID : drawingObject.ExpandedViewID;
        T3Gv.opt.ShowExpandedView(expandedViewId, event);
        T3Util.Log("O.Opt LMShapeIconClick - Output: false (Expanded view shown)");
        break;

      case OptConstant.ShapeIconType.Comment:
        // Handle comment icon
        let commentId = null;

        // Extract comment ID from user data if available
        if (userData && userData.split) {
          const parts = userData.split('.');
          if (parts[1]) {
            commentId = parseInt(parts[1], 10);
          }
        }

        T3Gv.opt.EditComments(commentId);
        T3Util.Log("O.Opt LMShapeIconClick - Output: false (Comment edit opened)");
        break;

      case OptConstant.ShapeIconType.Notes:
        // Handle notes icon
        const cellForNote = drawingObject.IsNoteCell(userData);

        // Close any active text edit
        if (!T3Gv.opt.bInNoteEdit) {
          T3Gv.opt.DeactivateAllTextEdit(false);
        } else if (T3Gv.opt.curNoteShape == objectId && T3Gv.opt.curNoteTableCell == cellForNote) {
          // Toggle off current note if clicking the same one
          this.ToggleNote(T3Gv.opt.curNoteShape, T3Gv.opt.curNoteTableCell);
        }

        // Toggle on the new note
        this.ToggleNote(objectId, cellForNote, userData);
        T3Util.Log("O.Opt LMShapeIconClick - Output: true (Note toggled)");
        return true;

      case OptConstant.ShapeIconType.FieldData:
        // Handle field data icon
        let isShiftPressed = event.shiftKey;

        // Check for shift key in gesture events
        if (event.gesture && event.gesture.srcEvent) {
          isShiftPressed = event.gesture.srcEvent.shiftKey;
        }

        this.ToggleFieldedDataTooltip(objectId, isShiftPressed);
        T3Util.Log("O.Opt LMShapeIconClick - Output: true (Field data tooltip toggled)");
        return true;

      case OptConstant.ShapeIconType.Attachment:
        // Handle attachment icon (no action defined in original code)
        T3Util.Log("O.Opt LMShapeIconClick - Output: true (Attachment icon clicked)");
        return true;
    }

    T3Util.Log("O.Opt LMShapeIconClick - Output: false (Default return)");
    return false;
  }

  /**
   * Handles movement tracking during a drag operation
   * @param position - The current position to track
   * @returns The adjusted position based on connections and snapping
   */
  static LMMoveDuringTrack(position) {
    T3Util.Log("O.Opt LMMoveDuringTrack - Input:", position);

    let hasConnection;
    let targetObject;
    let hookPoints;
    let healedLineId;
    let horizontalDistance;
    let verticalDistance;
    let frameCopy = {};
    let objectsToDelete = [];

    // Early return if there's no valid drag target
    if (T3Gv.opt.dragTargetId < 0) {
      T3Util.Log("O.Opt LMMoveDuringTrack - Output: Invalid drag target");
      return position;
    }

    // Get the object being dragged
    targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);
    if (targetObject == null) {
      T3Util.Log("O.Opt LMMoveDuringTrack - Output: Target object not found");
      return position;
    }

    // Handle auto-healing lines if needed
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.AutoHeal) {
      horizontalDistance = Math.abs(position.x - T3Gv.opt.dragStartX);
      verticalDistance = Math.abs(position.y - T3Gv.opt.dragStartY);

      // Auto-heal if moved far enough or there's an active connection
      if (horizontalDistance > 50 ||
        verticalDistance > 50 ||
        (T3Gv.opt.linkParams.AutoInsert && T3Gv.opt.linkParams.ConnectIndex >= 0)) {

        healedLineId = this.HealLine(targetObject, false, objectsToDelete);
        T3Gv.opt.linkParams.AutoHeal = false;
        T3Gv.opt.linkParams.AutoHealID = targetObject.BlockID;

        // Delete objects that were healed
        if (healedLineId >= 0) {
          objectsToDelete.push(healedLineId);
          DataUtil.DeleteObjects(objectsToDelete, false);
        }

        // Update dirty list to redraw correctly
        let indexInDirtyList = T3Gv.opt.dirtyList.indexOf(T3Gv.opt.dragTargetId);
        if (indexInDirtyList >= 0) {
          T3Gv.opt.dirtyList.splice(indexInDirtyList, 1);
          SvgUtil.RenderDirtySVGObjects();
          DataUtil.AddToDirtyList(T3Gv.opt.dragTargetId);
        }

        // Regenerate the move list
        SelectUtil.GetMoveList(T3Gv.opt.dragTargetId, true, true, false, T3Gv.opt.moveBounds, false);
      }
    }

    // Apply pin rect constraints if present
    if (T3Gv.opt.pinRect) {
      this.PinMoveRect(position);
    }

    // Get hook points for connections
    hookPoints = HookUtil.MoveGetHookPoints(
      T3Gv.opt.dragTargetId,
      targetObject,
      position.x - T3Gv.opt.dragStartX,
      position.y - T3Gv.opt.dragStartY
    );

    if (hookPoints) {
      // Reset drag deltas
      T3Gv.opt.dragDeltaX = 0;
      T3Gv.opt.dragDeltaY = 0;

      // Handle drop-on-line or auto-insert modes
      if (T3Gv.opt.linkParams.DropOnLine ||
        T3Gv.opt.linkParams.AutoInsert) {

        // Create a copy of the frame at the new position
        frameCopy = $.extend(true, {}, targetObject.Frame);
        frameCopy.x += position.x - T3Gv.opt.dragStartX;
        frameCopy.y += position.y - T3Gv.opt.dragStartY;

        // Store original frame to restore later
        const originalFrame = targetObject.Frame;

        // Temporarily update the frame to check connection
        targetObject.Frame = frameCopy;

        // Find connection at the new position
        hasConnection = SelectUtil.FindConnect(
          T3Gv.opt.dragTargetId,
          targetObject,
          T3Gv.opt.linkParams.cpt,
          true,
          true,
          false,
          position
        );

        // Restore original frame
        targetObject.Frame = originalFrame;

        // Apply drag deltas if a connection was found
        if (hasConnection) {
          position.x += T3Gv.opt.dragDeltaX;
          position.y += T3Gv.opt.dragDeltaY;
          T3Util.Log("O.Opt LMMoveDuringTrack - Output (drop connection):", position);
          return position;
        }
      }

      // Reset drag deltas for other connection types
      T3Gv.opt.dragDeltaX = 0;
      T3Gv.opt.dragDeltaY = 0;

      // Check for standard connections or joins
      hasConnection = SelectUtil.FindConnect(
        T3Gv.opt.dragTargetId,
        targetObject,
        hookPoints,
        true,
        false,
        T3Gv.opt.linkParams.AllowJoin,
        position
      );

      // Apply drag deltas if a connection or join was found
      if (hasConnection || T3Gv.opt.linkParams.JoinIndex >= 0) {
        position.x += T3Gv.opt.dragDeltaX;
        position.y += T3Gv.opt.dragDeltaY;
      }
    }

    T3Util.Log("O.Opt LMMoveDuringTrack - Output:", position);
    return position;
  }

  /**
   * Handles object movement tracking during drag operations
   * @param event - The movement event
   * @param skipScrolling - Flag to indicate if scrolling should be skipped
   */
  static LMMoveTrack(event, skipScrolling) {
    T3Util.Log("O.Opt LMMoveTrack - Input:", { event, skipScrolling });

    // Prevent too frequent updates (throttling)
    if (Date.now() - T3Gv.opt.eventTimestamp < 250) {
      T3Util.Log("O.Opt LMMoveTrack - Output: Throttled (skipping)");
      return;
    }

    // Handle first movement - initialize drag operation
    if (!T3Gv.opt.dragGotMove) {
      let objectsToMove = T3Gv.opt.moveList;

      if (objectsToMove && objectsToMove.length) {
        // Check if we need to duplicate objects (Ctrl+drag)
        if (DrawUtil.DragDuplicate(event)) {
          // Get selection list and session data
          const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, true);
          const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);

          // Store current selection for duplication
          selectedList.length = 0;
          for (let i = 0; i < objectsToMove.length; i++) {
            selectedList.push(objectsToMove[i]);
          }

          // Get target object information
          const targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);
          let targetObjectBaseClass = -1;
          let targetObjectFrame = null;

          if (targetObject) {
            targetObjectFrame = targetObject.Frame;
            targetObjectBaseClass = targetObject.DrawingObjectBaseClass;
          }

          // Duplicate the objects
          const duplicatedObjects = this.DuplicateObjects(true);

          // Update selection list to duplicated objects
          selectedList.length = 0;
          for (let i = 0; i < duplicatedObjects.length; i++) {
            selectedList.push(duplicatedObjects[i]);
          }

          // Reset lists and prepare for moving the duplicates
          T3Gv.opt.MoveDuplicated = true;
          T3Gv.opt.moveList.length = 0;
          T3Gv.opt.dragElementList.length = 0;
          T3Gv.opt.dragBBoxList.length = 0;
          T3Gv.opt.linkParams.lpCircList = [];
          T3Gv.opt.linkParams.InitialHook = -1;

          // Rebuild lists with duplicated objects
          for (let i = duplicatedObjects.length - 1; i >= 0; i--) {
            const duplicatedObject = DataUtil.GetObjectPtr(duplicatedObjects[i], false);
            if (duplicatedObject) {
              T3Gv.opt.moveList.push(duplicatedObjects[i]);
              T3Gv.opt.linkParams.lpCircList.push(duplicatedObjects[i]);
              T3Gv.opt.dragElementList.push(duplicatedObjects[i]);

              const objectFrame = duplicatedObject.GetSVGFrame();

              // If this duplicated object matches the target, make it the new target
              if (targetObjectFrame &&
                Utils2.EqualRect(objectFrame, targetObjectFrame, 2) &&
                duplicatedObject.DrawingObjectBaseClass === targetObjectBaseClass) {
                T3Gv.opt.dragTargetId = duplicatedObjects[i];
                sessionData.tselect = duplicatedObjects[i];
              }

              T3Gv.opt.dragBBoxList.push(objectFrame);
            }
          }

          // Update reference to use duplicated objects
          objectsToMove = T3Gv.opt.moveList;
        }

        // Remove dimension lines for all objects being moved
        const objectCount = objectsToMove.length;
        for (let i = 0; i < objectCount; i++) {
          const objectId = objectsToMove[i];
          const drawingObject = DataUtil.GetObjectPtr(objectId, false);

          if (drawingObject) {
            const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
            drawingObject.RemoveDimensionLines(svgElement);
          }
        }
      }
    }

    // Mark as dragging now in progress
    T3Gv.opt.dragGotMove = true;

    // Check if we're in connection mode
    const isConnecting = T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0;

    // Handle auto-scrolling if needed
    if (skipScrolling) {
      DrawUtil.ResetAutoScrollTimer();
    } else if (!DrawUtil.AutoScrollCommon(event, !isConnecting, "HandleObjectDragDoAutoScroll")) {
      T3Util.Log("O.Opt LMMoveTrack - Output: Auto-scroll in progress");
      return;
    }

    // Convert window coordinates to document coordinates
    const docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Process any adjustments from connection finding
    const adjustedCoordinates = this.LMMoveDuringTrack(docCoordinates, event);

    // Handle the actual movement
    T3Gv.opt.HandleObjectDragMoveCommon(
      adjustedCoordinates.x,
      adjustedCoordinates.y,
      skipScrolling,
      event
    );

    T3Util.Log("O.Opt LMMoveTrack - Output: Objects moved to", adjustedCoordinates);
  }

  /**
  * Handles the end of a move operation
  * @param event - The release event
  * @param moveData - Optional data from a collaborative move
  */
  static LMMoveRelease(event, moveData?) {
    T3Util.Log("O.Opt LMMoveRelease - Input:", { event, moveData });

    let waslastOpDuplicate = false;

    // Handle early exit conditions
    if (!moveData && (
      Utils2.StopPropagationAndDefaults(event),
      T3Gv.opt.UnbindShapeMoveHammerEvents(),
      DrawUtil.ResetAutoScrollTimer(),
      OptCMUtil.SetEditMode(NvConstant.EditState.Default),
      DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides),
      T3Gv.opt.dynamicGuides = null,
      !T3Gv.opt.dragGotMove || DrawUtil.CheckDragIsOverCustomLibrary(event)
    )) {
      // Handle dropping over custom library
      if (DrawUtil.CheckDragIsOverCustomLibrary(event)) {
        const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);

        // Add moved objects to selection if not already there
        for (let i = 0; i < T3Gv.opt.moveList.length; i++) {
          const objectId = T3Gv.opt.moveList[i];
          if (selectedList.indexOf(objectId) === -1) {
            selectedList.push(objectId);
          }
        }

        // Add all moved objects to dirty list for rendering
        for (let i = 0; i < T3Gv.opt.moveList.length; i++) {
          DataUtil.AddToDirtyList(T3Gv.opt.moveList[i]);
        }

        SvgUtil.RenderDirtySVGObjects();
      }

      this.LMMovePostRelease(false);
      SvgUtil.RenderAllSVGSelectionStates();
      T3Gv.opt.moveList = null;
      // Collab.UnBlockMessages();

      T3Util.Log("O.Opt LMMoveRelease - Output: Early exit condition met");
      return;
    }

    // Process normal move completion
    const objectCount = T3Gv.opt.moveList ? T3Gv.opt.moveList.length : 0;

    if (objectCount === 0) {
      T3Util.Log("O.Opt LMMoveRelease - Output: No objects to move");
      return;
    }

    // Prepare collaboration message data
    let objectFrame = null;
    let objectPosition = {};
    const moveMessageData = {
      moveList: [],
      thePointList: [],
      dragDeltaX: T3Gv.opt.dragDeltaX,
      MoveDuplicated: T3Gv.opt.MoveDuplicated
    };

    // Update positions of all moved objects
    for (let i = 0; i < objectCount; i++) {
      const objectId = T3Gv.opt.moveList[i];
      const drawingObject = T3Gv.stdObj.GetObject(objectId).Data;

      // Get the object's new position either from collaboration data or from drag operation
      if (moveData) {
        objectPosition = moveData.Data.thePointList[i];
      } else {
        objectFrame = T3Gv.opt.dragBBoxList[i];
        if (!objectFrame) continue;

        objectPosition = {
          x: objectFrame.x + T3Gv.opt.dragDeltaX,
          y: objectFrame.y + T3Gv.opt.dragDeltaY
        };
      }

      // Apply adjustments for shapes with thick borders
      if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
        drawingObject.polylist === null &&
        drawingObject.StyleRecord.Line.BThick) {
        objectPosition.x += drawingObject.StyleRecord.Line.BThick;
        objectPosition.y += drawingObject.StyleRecord.Line.BThick;
      }

      // Handle notes (when coming from collaboration data)
      if (moveData) {
        const noteId = 'note_' + objectId;
        const noteElement = T3Gv.opt.svgHighlightLayer.GetElementById(noteId);

        if (noteElement) {
          const notePosition = noteElement.GetPos();
          const deltaX = objectPosition.x - drawingObject.Frame.x;
          const deltaY = objectPosition.y - drawingObject.Frame.y;

          notePosition.x += deltaX;
          notePosition.y += deltaY;
          noteElement.SetPos(notePosition.x, notePosition.y);
        }
      }

      // Update object position
      T3Gv.opt.SetShapeOriginNoDirty(objectId, objectPosition.x, objectPosition.y);

      // Additional updates for auto-inserted shapes
      if (T3Gv.opt.linkParams.ConnectHookFlag === NvConstant.HookFlags.LcAutoInsert) {
        drawingObject.UpdateFrame(drawingObject.Frame);
      }

      // Mark for rendering if object has dimensions or comes from collaboration
      if (drawingObject.Dimensions & NvConstant.DimensionFlags.Always ||
        drawingObject.Dimensions & NvConstant.DimensionFlags.Select ||
        moveData ||
        drawingObject.Dimensions & NvConstant.DimensionFlags.Area) {
        DataUtil.AddToDirtyList(objectId);
      }
    }

    // Finalize the move operation
    this.LMMovePostRelease(true, moveData);

    // Handle duplicate operation tracking
    if (!moveData && T3Gv.opt.lastOpDuplicate) {
      waslastOpDuplicate = true;
      const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);
      sessionData.dupdisp.x += T3Gv.opt.dragDeltaX;
      sessionData.dupdisp.y += T3Gv.opt.dragDeltaY;
    }

    // Complete the operation and clean up
    DrawUtil.CompleteOperation(null);

    if (!moveData) {
      if (waslastOpDuplicate) {
        T3Gv.opt.lastOpDuplicate = true;
      }
      T3Gv.opt.moveList = null;
    }

    T3Util.Log("O.Opt LMMoveRelease - Output: Move operation completed");
  }

  /**
   * Handles post-processing after a move operation is complete
   * @param completeOperation - Whether to complete the operation (true) or cancel (false)
   * @param moveData - Optional data from a collaborative move operation
   */
  static LMMovePostRelease(completeOperation, moveData) {
    T3Util.Log("O.Opt LMMovePostRelease - Input:", { completeOperation, moveData });

    let flowChartHookResult = false;
    const objectsToSelect = [];

    // Clean up any highlighted connections
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.HiliteConnect >= 0) {
      HookUtil.HiliteConnect(
        T3Gv.opt.linkParams.HiliteConnect,
        T3Gv.opt.linkParams.ConnectPt,
        false,
        false,
        T3Gv.opt.dragTargetId,
        T3Gv.opt.linkParams.ConnectPt,
        T3Gv.opt.linkParams.HiliteInside
      );
      T3Gv.opt.linkParams.HiliteConnect = -1;
      T3Gv.opt.linkParams.HiliteInside = null;
    }

    // Clean up any highlighted joins
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.HiliteJoin >= 0) {
      HookUtil.HiliteConnect(
        T3Gv.opt.linkParams.HiliteJoin,
        T3Gv.opt.linkParams.ConnectPt,
        false,
        true,
        T3Gv.opt.dragTargetId,
        null
      );
      T3Gv.opt.linkParams.HiliteJoin = -1;
    }

    // Reset edit mode if not a collaborative move
    if (!moveData) {
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);
    }

    // Process the completed move if requested
    if (completeOperation) {
      // Get the target object that was dragged
      let targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId);

      // Special handling for timeline events
      if (targetObject.objecttype === NvConstant.FNObjectTypes.NgEvent ||
        targetObject.objecttype === NvConstant.FNObjectTypes.NgEventLabel) {

        let dragDeltaX = T3Gv.opt.dragDeltaX;
        let objectsToMove = T3Gv.opt.moveList;

        // If this is a collaborative move, use the data from there
        if (moveData?.Data?.dragDeltaX != null) {
          dragDeltaX = moveData.Data.dragDeltaX;
        }
        if (moveData?.Data?.moveList != null) {
          objectsToMove = moveData.Data.moveList;
        }

        flowChartHookResult = this.TimelineMoveEvent(T3Gv.opt.dragTargetId, objectsToMove, dragDeltaX, true);
      }
      // Handle joining polylines
      else if (T3Gv.opt.linkParams.JoinIndex >= 0) {
        PolyUtil.PolyLJoin(
          T3Gv.opt.linkParams.JoinIndex,
          T3Gv.opt.linkParams.JoinData,
          T3Gv.opt.dragTargetId,
          T3Gv.opt.linkParams.JoinSourceData,
          false
        );
      }
      // Handle object connections
      else if (T3Gv.opt.linkParams &&
        (T3Gv.opt.linkParams.ConnectIndex >= 0 || T3Gv.opt.linkParams.InitialHook >= 0)) {

        // If flow chart handling didn't succeed, handle the connection based on hook flag
        if (!flowChartHookResult) {
          if (T3Gv.opt.linkParams.ConnectHookFlag === NvConstant.HookFlags.LcAutoInsert) {
            // Auto-insert the shape into the line
            this.SD_AutoInsertShape(T3Gv.opt.dragTargetId, T3Gv.opt.linkParams.ConnectIndex);
          } else if (T3Gv.opt.linkParams.ConnectHookFlag === NvConstant.HookFlags.LcHookReverse) {
            // Reverse the hook direction
            this.LM_ReverseHook(T3Gv.opt.dragTargetId);
          } else {
            // Handle multiple selections that need to be hooked
            flowChartHookResult = HookUtil.HandleMultipleSelectionHooks();

            // If multiple selection hook handling didn't succeed, update single hook
            if (!flowChartHookResult) {
              HookUtil.UpdateHook(
                T3Gv.opt.dragTargetId,
                T3Gv.opt.linkParams.InitialHook,
                T3Gv.opt.linkParams.ConnectIndex,
                T3Gv.opt.linkParams.HookIndex,
                T3Gv.opt.linkParams.ConnectPt,
                T3Gv.opt.linkParams.ConnectInside
              );

              OptCMUtil.SetLinkFlag(
                T3Gv.opt.linkParams.ConnectIndex,
                DSConstant.LinkFlags.Move
              );

              HookUtil.CleanupHooks(T3Gv.opt.dragTargetId, T3Gv.opt.linkParams.ConnectIndex);
            }
          }
        }
      } else {
        // Get operation mng for the object
        const optMng = OptAhUtil.GetGvSviOpt(T3Gv.opt.dragTargetId);
        const activeManager = optMng || T3Gv.wallOpt;

        // Handle floor plan specific logic
        if (activeManager instanceof WallOpt) {
          activeManager.EnsureCubicleBehindOutline(T3Gv.opt.dragTargetId);
        }
      }

      // Handle post-move selection
      if (!moveData && T3Gv.opt.postMoveSelectId != null) {
        objectsToSelect.push(T3Gv.opt.postMoveSelectId);
        SelectUtil.SelectObjects(objectsToSelect, false, false);
        T3Gv.opt.postMoveSelectId = null;
      }
    }

    // Update links if operation was completed
    if (completeOperation) {
      T3Gv.opt.UpdateLinks();
    }

    // Clean up if not a collaborative move
    if (!moveData) {
      T3Gv.opt.linkParams = null;
      T3Gv.opt.ob = {};
      T3Gv.opt.dragEnclosingRect = null;
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.dragBBoxList = [];
    }

    T3Util.Log("O.Opt LMMovePostRelease - Output: Move post-processing completed");
  }

  static LMSetupMove(event) {
    T3Util.Log("O.Opt LMSetupMove - Input:", event);

    // Variables for target tracking
    let svgElement;
    let targetElement;
    let targetId;
    let targetObject = null;
    let drawingObject = null;
    // let tableObject = null;
    let isOneClickTextObject = false;

    // Reset move state
    T3Gv.opt.MoveDuplicated = false;

    // Find the SVG element from the event target
    svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    if (!svgElement) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (No SVG element found)");
      return false;
    }

    // Get target element and prevent default event behavior
    targetElement = svgElement.GetTargetForEvent(event);
    T3Gv.opt.eventTimestamp = Date.now();
    Utils2.StopPropagationAndDefaults(event);

    // Get object ID and verify it's a valid drawing object
    const objectId = svgElement.GetID();
    const drawingObjectRef = DataUtil.GetObjectPtr(objectId, false);
    if (!(drawingObjectRef && drawingObjectRef instanceof Instance.Shape.BaseDrawObject)) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Not a valid drawing object)");
      return false;
    }

    // Handle dimension editing
    if (T3Gv.opt.bInDimensionEdit) {
      T3Gv.opt.CloseEdit(false, true);
      T3Gv.opt.bInDimensionEdit = false;
      T3Util.Log("O.Opt LMSetupMove - Output: false (Was in dimension edit)");
      return false;
    }

    // Prevent moving dimension text elements
    if (
      targetElement instanceof Text &&
      (targetElement.ID === OptConstant.SVGElementClass.DimText ||
        targetElement.ID === OptConstant.SVGElementClass.DimTextNoEdit)
    ) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Is dimension text)");
      return false;
    }

    // Prevent moving icon elements
    if (targetElement instanceof Image && this.UserDataisIcon(targetElement.GetUserData())) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Is icon element)");
      return false;
    }

    // Handle format painter mode
    if (T3Gv.opt.crtOpt === OptConstant.OptTypes.FormatPainter) {
      targetId = svgElement.GetID();
      if (this.FormatPainterClick(targetId, event)) {
        T3Util.Log("O.Opt LMSetupMove - Output: false (Format painter handled click)");
        return false;
      }
      svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
    }

    // Get document coordinates for the event
    const docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Only process if not in format painter object mode
    if (
      T3Gv.opt.crtOpt !== OptConstant.OptTypes.FormatPainter ||
      T3Gv.opt.formatPainterMode !== StyleConstant.FormatPainterModes.Object
    ) {
      const clickedElement = svgElement.GetTargetForEvent(event);
      let clickedElementId = clickedElement.GetID();
      const clickedElementUserData = clickedElement.GetUserData();

      // Determine drag target ID with special parent handling
      T3Gv.opt.dragTargetId = svgElement.GetID();
      T3Gv.opt.dragTargetId = this.GetEventShapeParent(T3Gv.opt.dragTargetId);
      T3Gv.opt.dragTargetId = OptAhUtil.SelectContainerParent(T3Gv.opt.dragTargetId);

      targetObject = T3Gv.stdObj.GetObject(T3Gv.opt.dragTargetId);
      const isRightClick = MouseUtil.IsRightClick(event);

      // Handle special cases for target object
      if (targetObject) {
        drawingObject = targetObject.Data;

        // Check for one-click text objects
        isOneClickTextObject = (drawingObject.TextFlags & NvConstant.TextFlags.OneClick) > 0;
        if (isRightClick) {
          isOneClickTextObject = false;
        } else if (drawingObject.flags & NvConstant.ObjFlags.Lock) {
          SelectUtil.SelectObjectFromClick(event, svgElement);
          T3Util.Log("O.Opt LMSetupMove - Output: false (Object is locked)");
          return false;
        }
      }

      // Handle non-active table elements
      switch (clickedElementId) {

        case OptConstant.SVGElementClass.BackgroundImage:
          clickedElementId = '';
          break;
        case OptConstant.SVGElementClass.Slop:
          T3Gv.opt.DeactivateAllTextEdit(false);
          isOneClickTextObject = false;
          break;
      }

      // Handle actions based on the clicked element type
      switch (clickedElementId) {

        case OptConstant.SVGElementClass.BackgroundImage:

          break;

        case OptConstant.Common.HitAreas:
          const hitAreaData = clickedElement.GetUserData();
          this.LM_HitAreaClick(T3Gv.opt.dragTargetId, hitAreaData);
          if (event.gesture) {
            event.gesture.stopDetect();
          }
          T3Util.Log("O.Opt LMSetupMove - Output: false (Hit area click)");
          return false;
      }

      // Handle one-click text objects
      if (isOneClickTextObject) {
        TextUtil.ActivateTextEdit(svgElement.svgObj.SDGObj, event, false);
        T3Util.Log("O.Opt LMSetupMove - Output: false (Activated text edit)");
        return false;
      }
    }

    // Handle selection
    if (!SelectUtil.SelectObjectFromClick(event, svgElement, true)) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Selection failed)");
      return false;
    }

    // Get updated target object
    targetObject = T3Gv.stdObj.GetObject(T3Gv.opt.dragTargetId);
    if (targetObject == null) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Target object is null)");
      return false;
    }

    // Get drawing object and check special cases
    drawingObject = targetObject.Data;

    // Hide selection states and prepare for drag operation
    SvgUtil.HideAllSVGSelectionStates();
    DrawUtil.InitializeAutoGrowDrag();

    // Allow object to intercept the move operation
    if (drawingObject.InterceptMoveOperation(event)) {
      T3Util.Log("O.Opt LMSetupMove - Output: false (Move intercepted by object)");
      return false;
    }

    // Check for special object types
    const connectorEndInfo = {};
    const genogramPartnerInfo = {};
    const flowchartShapeInfo = {};

    if (T3Gv.opt.IsConnectorEndShape(drawingObject, null, connectorEndInfo)) {
      T3Gv.opt.dragTargetId = connectorEndInfo.id;
    } else if (T3Gv.opt.IsGenogramPartner(drawingObject, genogramPartnerInfo)) {
      T3Gv.opt.dragTargetId = genogramPartnerInfo.id;
    }

    // Initialize move bounds
    T3Gv.opt.moveBounds = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    T3Gv.opt.pinRect = null;
    T3Gv.opt.dynamicGuides = new DynamicGuides();

    let objectsToMove = [];

    // Get list of objects to move together
    objectsToMove = SelectUtil.GetMoveList(
      T3Gv.opt.dragTargetId,
      true,
      true,
      false,
      T3Gv.opt.moveBounds,
      false
    );

    // Store start position
    T3Gv.opt.dragStartX = docCoordinates.x;
    T3Gv.opt.dragStartY = docCoordinates.y;

    // Initialize drag lists
    let objectCount = objectsToMove ? objectsToMove.length : 0;
    T3Gv.opt.dragBBoxList = [];
    T3Gv.opt.dragElementList = [];
    T3Gv.opt.dragGotMove = false;

    // Filter objects: first pass - exclude connectors and invisible objects
    let filteredObjects = [];
    for (let i = 0; i < objectCount; ++i) {
      const currentId = objectsToMove[i];
      const currentObject = DataUtil.GetObjectPtr(currentId, false);

      if (currentObject &&
        !(currentObject instanceof Instance.Shape.Connector) &&
        !(currentObject.flags & NvConstant.ObjFlags.NotVisible)) {
        filteredObjects.push(currentId);
      }
    }

    // Filter objects: second pass - handle connector objects
    for (let i = 0; i < objectCount; ++i) {
      const currentId = objectsToMove[i];
      const currentObject = DataUtil.GetObjectPtr(currentId, false);

      if (currentObject instanceof Instance.Shape.Connector) {
        // Use complex connector logic to determine if it should be included
        if (currentObject.arraylist.styleflags & OptConstant.AStyles.FlowConn) {
          filteredObjects.push(currentId);
        } else if (currentObject.hooks.length) {
          const hookId = currentObject.hooks[0].objid;
          const hookObject = DataUtil.GetObjectPtr(hookId);

          if (hookObject instanceof Instance.Shape.Connector) {
            if (!(currentObject.flags & NvConstant.ObjFlags.NotVisible)) {
              filteredObjects.push(currentId);
            }
          } else if (
            (currentObject.flags & NvConstant.ObjFlags.NotVisible) &&
            (!currentObject.hooks || filteredObjects.indexOf(hookId) === -1)
          ) {
            // Skip
          } else {
            filteredObjects.push(currentId);
          }
        } else if (!(currentObject.flags & NvConstant.ObjFlags.NotVisible)) {
          filteredObjects.push(currentId);
        }
      }
    }

    // Update the move list with filtered objects
    objectsToMove = filteredObjects;
    objectCount = objectsToMove.length;
    T3Gv.opt.moveList = objectsToMove;

    // Create bounding box list for all objects being moved
    for (let i = 0; i < objectCount; ++i) {
      const currentId = objectsToMove[i];
      const currentObject = DataUtil.GetObjectPtr(currentId, false);
      const objectFrame = currentObject.GetSVGFrame();

      T3Gv.opt.dragBBoxList.push(objectFrame);
      T3Gv.opt.dragElementList.push(currentId);

      // Store target bounding box for snapping
      if (T3Gv.docUtil.docConfig.enableSnap &&
        currentId === T3Gv.opt.dragTargetId) {
        T3Gv.opt.dragTargetBBox = $.extend(true, {}, objectFrame);
      }
    }

    // Handle auto-grow constraints
    if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
      T3Gv.opt.dragEnclosingRect = T3Gv.opt.GetListSRect(T3Gv.opt.moveList);
    }

    // Setup move tracking
    this.LMMovePreTrack(objectsToMove, event);

    T3Util.Log("O.Opt LMSetupMove - Output: true (Move setup complete)");
    return true;
  }

  static LMMoveExceptionCleanup(error) {
    T3Util.Log('O.Opt LMMoveExceptionCleanup - Input:', error);

    // Clean up resources
    T3Gv.opt.linkParams = null;
    T3Gv.opt.dragBBoxList = [];
    T3Gv.opt.dragElementList = [];
    T3Gv.opt.moveList = null;
    T3Gv.opt.dragEnclosingRect = null;
    T3Gv.opt.dragGotMove = false;
    T3Gv.opt.UnbindShapeMoveHammerEvents();
    DrawUtil.ResetAutoScrollTimer();
    // Collab.UnLockMessages();
    // Collab.UnBlockMessages();

    T3Util.Log('O.Opt LMMoveExceptionCleanup - Output: Cleanup completed');

    // Re-throw the exception after cleanup
    throw error;
  }

  static LMMoveClick(event) {
    T3Util.Log("O.Opt LMMoveClick - Input:", event);

    if (
      this.IsWheelClick(event) ||
      T3Constant.DocContext.SpacebarDown
    ) {
      EvtUtil.Evt_WorkAreaHammerDragStart(event);
      Utils2.StopPropagationAndDefaults(event);
      T3Util.Log("O.Opt LMMoveClick - Output: Wheel click or spacebar down detected, redirected to WorkAreaHammerDragStart");
      return;
    }

    Utils2.StopPropagationAndDefaults(event);

    try {
      // Blur any focused HTML control
      if (T3Constant.DocContext.HTMLFocusControl &&
        T3Constant.DocContext.HTMLFocusControl.blur) {
        T3Constant.DocContext.HTMLFocusControl.blur();
      }

      // Close nudge panel if open
      if (T3Gv.opt.nudgeOpen) {
        T3Gv.opt.CloseOpenNudge();
      }

      // Set up the move operation
      const setupResult = this.LMSetupMove(event);

      // Handle different setup results
      if (setupResult !== true) {
        if (setupResult === -1) {
          // Collab.UnLockMessages();
          T3Util.Log("O.Opt LMMoveClick - Output: Setup failed with -1, unlocked messages");
          return;
        } else {
          // Collab.UnLockMessages();
          // Collab.UnBlockMessages();
          T3Util.Log("O.Opt LMMoveClick - Output: Setup failed, unlocked and unblocked messages");
          return;
        }
      }

      // Set edit mode if not in a modal operation
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.None) {
        OptCMUtil.SetEditMode(NvConstant.EditState.DragShape);
      }

      // Register event handlers for drag operations
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_ShapeDrag);
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_ShapeDragEnd);

      //clear context menu
      const isRightClick = MouseUtil.IsRightClick(event);
      if (!isRightClick) {
        UIUtil.ShowContextMenu(false, "", event.gesture.center.clientX, event.gesture.center.clientY);
      }

      T3Util.Log("O.Opt LMMoveClick - Output: Move operation set up successfully");
    } catch (error) {
      this.LMMoveExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("O.Opt LMMoveClick - Error:", error);
      throw error;
    }
  }

  static IsCtrlClick(event) {
    T3Util.Log('O.Opt IsCtrlClick - Input:', event);

    let isCtrlClick = false;

    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    if (event instanceof MouseEvent) {
      isCtrlClick = event.ctrlKey;
    } else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isCtrlClick = event.ctrlKey;
    }

    T3Util.Log('O.Opt IsCtrlClick - Output:', isCtrlClick);
    return isCtrlClick;
  }

  static IsWheelClick(event) {
    T3Util.Log("O.Opt IsWheelClick - Input:", event);

    let isMiddleButtonClick = false;

    // Handle different event types
    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    if (event instanceof MouseEvent) {
      // Button 2 is middle button
      isMiddleButtonClick = (event.which === 2);
    } else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isMiddleButtonClick = (event.which === 2);
    }

    T3Util.Log("O.Opt IsWheelClick - Output:", isMiddleButtonClick);
    return isMiddleButtonClick;
  }

  /**
   * Handles keyboard key down events for text editing and object interactions.
   * This function processes key down events, manages text edit operations, and handles
   * special keys like arrows, backspace, delete, and spacebar.
   *
   * @param event - The keyboard event object
   * @param keyCode - The key code of the pressed key
   * @param altKey - Whether the Alt key was pressed
   * @returns True if the event was handled and should be prevented from bubbling, false otherwise
   */
  static HandleKeyDown(event, keyCode, altKey) {
    T3Util.Log("O.Opt HandleKeyDown - Input:", {
      eventType: event.type,
      keyCode: keyCode,
      altKey: altKey
    });

    let activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();

    if (activeEdit && activeEdit.IsActive()) {
      // Handle active text editor cases
      if (!T3Gv.opt.bInNoteEdit) {
        const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

        if (textEditSession.theActiveTextEditObjectID !== -1) {
          switch (keyCode) {
            case KeyboardConstant.Keys.Left_Arrow:
            case KeyboardConstant.Keys.Right_Arrow:
            case KeyboardConstant.Keys.Up_Arrow:
            case KeyboardConstant.Keys.Down_Arrow:
              if (textEditSession.theTELastOp !== NvConstant.TextElemLastOpt.Init) {
                TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Select);
              }
              break;

            case KeyboardConstant.Keys.Backspace:
            case KeyboardConstant.Keys.Delete:
              TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Char);
              break;
          }
        }
      }

      if (activeEdit.HandleKeyDownEvent(event)) {
        T3Util.Log("O.Opt HandleKeyDown - Output: true (activeEdit handled event)");
        return true;
      }
    } else if (keyCode === 32) { // Space key
      // Handle space key to activate text editing on selected objects
      const targetId = SelectUtil.GetTargetSelect();

      if (targetId !== -1) {
        const targetObject = DataUtil.GetObjectPtr(targetId, false);

        if (targetObject && targetObject.AllowTextEdit()) {
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
          TextUtil.ActivateTextEdit(svgElement);

          activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();
          const textLength = activeEdit.GetText().length;

          activeEdit.SetSelectedRange(textLength, textLength);
          TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Char);
          activeEdit.HandleKeyDownEvent(event);

          T3Util.Log("O.Opt HandleKeyDown - Output: true (space activated text edit)");
          return true;
        }
      }
    }

    T3Util.Log("O.Opt HandleKeyDown - Output: false");
    return false;
  }

  /**
   * Handles keyboard key press events for text editing and character input.
   * This function processes key press events, manages text edit operations,
   * and activates text editing on selected objects when characters are typed.
   *
   * @param event - The keyboard event object
   * @param keyCode - The key code of the pressed key
   * @returns True if the event was handled and should be prevented from bubbling, false otherwise
   */
  static HandleKeyPress(event, keyCode) {
    T3Util.Log("O.Opt HandleKeyPress - Input:", {
      eventType: event.type,
      keyCode: keyCode
    });

    let activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();

    if (activeEdit && activeEdit.IsActive()) {
      // Handle active text editor cases
      if (!T3Gv.opt.bInNoteEdit) {
        const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

        if (textEditSession.theActiveTextEditObjectID !== -1) {
          TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Char);
        }
      }

      if (activeEdit.HandleKeyPressEvent(event)) {
        event.preventDefault();
        T3Util.Log("O.Opt HandleKeyPress - Output: true (activeEdit handled event)");
        return true;
      }
    } else {
      // Handle initiating text edit on a selected object
      const targetId = SelectUtil.GetTargetSelect();

      if (targetId !== -1) {
        const targetObject = DataUtil.GetObjectPtr(targetId, false);

        if (targetObject && targetObject.AllowTextEdit()) {
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
          TextUtil.ActivateTextEdit(svgElement);

          activeEdit = T3Gv.opt.svgDoc.GetActiveEdit();

          if (activeEdit) {
            const textLength = activeEdit.GetText().length;
            activeEdit.SetSelectedRange(0, textLength);
            TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Char);
            activeEdit.HandleKeyPressEvent(event);

            T3Util.Log("O.Opt HandleKeyPress - Output: true (activated text edit)");
            return true;
          }
        }
      }
    }

    T3Util.Log("O.Opt HandleKeyPress - Output: false");
    return false;
  }

  /**
   * Handles clicks on test icons in the SVG document
   * @param event - The event that triggered the icon click
   */
  static LMTestIconClick(event) {
    T3Util.Log("O.Opt LMTestIconClick - Input:", event);

    // Find the SVG element corresponding to the clicked DOM element
    const svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);

    if (svgElement) {
      // Get target element and its metadata
      const targetElement = svgElement.GetTargetForEvent(event);
      const elementId = targetElement.GetID();
      const elementUserData = targetElement.GetUserData();
      const objectId = svgElement.GetID();
      const drawingObject = DataUtil.GetObjectPtr(objectId, false);

      // Validate that we have a drawing object
      if (!(drawingObject && drawingObject instanceof Instance.Shape.BaseDrawObject)) {
        T3Util.Log("O.Opt LMTestIconClick - Output: false (no valid drawing object)");
        return false;
      }

      // Handle different element types
      switch (elementId) {
        case OptConstant.Common.HitAreas:
          // Handle hit area click
          const hitAreaData = targetElement.GetUserData();
          this.LM_HitAreaClick(objectId, hitAreaData);
          break;

        default:
          // Handle shape icon click
          this.LMShapeIconClick(event, objectId, elementId, elementUserData);
      }
    }

    T3Util.Log("O.Opt LMTestIconClick - Output: Operation completed");
  }

  static LMMovePreTrack(objectsToMove, event) {
    T3Util.Log("O.Opt LMMovePreTrack - Input:", { objectsToMove, event });

    // Get the session data
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Check for alt key press
    const isAltKeyPressed = event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.altKey;

    // Initialize link parameters
    T3Gv.opt.linkParams = new LinkParameters();
    T3Gv.opt.linkParams.AutoInsert = DrawUtil.AllowAutoInsert();

    // Disable auto-insert if multiple objects are selected or alt key is pressed
    if (T3Gv.opt.linkParams.AutoInsert) {
      const selectedObjects = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
      if (selectedObjects.length > 1) {
        T3Gv.opt.linkParams.AutoInsert = false;
      }

      if (event.gesture && event.gesture.srcEvent && event.gesture.srcEvent.altKey) {
        // Additional condition that was empty in original code
      }
    }

    // Get the target object being dragged
    const drawingObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);
    if (drawingObject) {
      // Store original object state for reference
      T3Gv.opt.ob = Utils1.DeepCopy(drawingObject);

      // Handle case where object has a single hook that's not a move target
      if (drawingObject.hooks.length === 1 &&
        (drawingObject.GetHookFlags() & NvConstant.HookFlags.LcMoveTarget) === 0 &&
        objectsToMove.indexOf(drawingObject.hooks[0].objid) < 0) {

        // Store connection information
        T3Gv.opt.linkParams.ConnectIndex = drawingObject.hooks[0].objid;
        T3Gv.opt.linkParams.PrevConnect = drawingObject.hooks[0].objid;
        T3Gv.opt.linkParams.ConnectIndexHistory.push(drawingObject.hooks[0].objid);
        T3Gv.opt.linkParams.ConnectPt.x = drawingObject.hooks[0].connect.x;
        T3Gv.opt.linkParams.ConnectPt.y = drawingObject.hooks[0].connect.y;
        T3Gv.opt.linkParams.ConnectInside = drawingObject.hooks[0].cellid;
        T3Gv.opt.linkParams.HookIndex = drawingObject.hooks[0].hookpt;
        T3Gv.opt.linkParams.InitialHook = 0;
      }

      // Get links and build the circular list
      const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
      T3Gv.opt.linkParams.lpCircList = HookUtil.GetHookList(
        links,
        T3Gv.opt.linkParams.lpCircList,
        T3Gv.opt.dragTargetId,
        drawingObject,
        NvConstant.ListCodes.CircTarg,
        {}
      );

      // Join the lists
      HookUtil.JoinHookList(T3Gv.opt.linkParams.lpCircList, objectsToMove);

      // Handle auto-insertion for shapes with healing
      if (T3Gv.opt.linkParams.AutoInsert &&
        drawingObject instanceof Instance.Shape.BaseShape &&
        this.HealLine(drawingObject, true, null) > 0 &&
        isAltKeyPressed) {

        T3Gv.opt.linkParams.lpCircList = [];
        T3Gv.opt.linkParams.lpCircList.push(T3Gv.opt.dragTargetId);
        T3Gv.opt.moveList = [];
        T3Gv.opt.moveList.push(T3Gv.opt.dragTargetId);
        T3Gv.opt.linkParams.AutoHeal = true;
      }

      // Handle snapping to shapes if enabled
      if (DrawUtil.AllowSnapToShapes()) {
        const objectRect = drawingObject.GetSnapRect();
        const offsetRect = $.extend(true, {}, objectRect);

        // Apply current drag offsets
        offsetRect.x += T3Gv.opt.dragDeltaX;
        offsetRect.y += T3Gv.opt.dragDeltaY;

        // Check for potential snap targets
        const snapOptions = {};
        const snapTargetId = drawingObject.CanSnapToShapes(snapOptions);

        if (snapTargetId >= 0) {
          // Get snap target rectangle
          const targetRect = DataUtil.GetObjectPtr(snapTargetId, false).GetSnapRect();
          const targetRectCopy = $.extend(true, {}, targetRect);

          // Initialize dynamic guides for snapping
          const dynamicGuides = new DynamicGuides();
          const objectIds = [T3Gv.opt.dragTargetId];

          // Calculate snap points and update guides
          DynamicUtil.DynamicSnapsGetSnapObjects(snapTargetId, targetRectCopy, dynamicGuides, objectIds, null, snapOptions);

          if (dynamicGuides) {
            DynamicUtil.DynamicSnapsUpdateGuides(dynamicGuides, snapTargetId, targetRectCopy);
          }
        }
      }
    }

    T3Util.Log("O.Opt LMMovePreTrack - Output: Link parameters initialized");
  }

  static UnbindActionClickHammerEvents() {
    T3Util.Log('O.Opt UnbindActionClickHammerEvents - Input:');

    const workAreaHammer = T3Gv.opt.WorkAreaHammer;
    if (workAreaHammer) {
      workAreaHammer.off('drag');
      workAreaHammer.off('dragend');
      workAreaHammer.off('doubletap');
    }

    T3Util.Log('O.Opt UnbindActionClickHammerEvents - Output: Events unbound');
  }

  static GetEventShapeParent(objectId) {
    T3Util.Log('O.Opt GetEventShapeParent - Input:', objectId);

    const object = DataUtil.GetObjectPtr(objectId);

    if (object && object.objecttype === NvConstant.FNObjectTypes.NgEventLabel) {
      const associatedObject = DataUtil.GetObjectPtr(object.associd);

      if (associatedObject && associatedObject.objecttype === NvConstant.FNObjectTypes.NgEvent) {
        T3Util.Log('O.Opt GetEventShapeParent - Output:', object.associd);
        return object.associd;
      }
    }

    T3Util.Log('O.Opt GetEventShapeParent - Output:', objectId);
    return objectId;
  }
}

export default LMEvtUtil
