

import $ from 'jquery';
import CursorConstant from "../../Data/Constant/CursorConstant";
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import Instance from "../../Data/Instance/Instance";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import DynamicGuides from "../../Model/DynamicGuides";
import SelectionAttr from "../../Model/SelectionAttr";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import DataUtil from "../Data/DataUtil";
import RulerUtil from "../UI/RulerUtil";
import UIUtil from "../UI/UIUtil";
import WallOpt from '../Wall/WallOpt';
import HookUtil from "./HookUtil";
import LayerUtil from "./LayerUtil";
import LMEvtUtil from "./LMEvtUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import ToolActUtil from "./ToolActUtil";
import TextUtil from './TextUtil';
import DynamicUtil from './DynamicUtil';

class DrawUtil {

  /**
   * Cancels the current object stamp operation
   * @param shouldUnbindEvents - Whether to unbind event handlers
   */
  static CancelObjectStamp(shouldUnbindEvents) {
    T3Util.Log("O.Opt CancelObjectStamp - Input:", { shouldUnbindEvents });

    // Clear modal operation state
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);
    T3Constant.DocContext.SelectionToolSticky = false;
    LMEvtUtil.LMStampPostRelease(false);

    // Clean up stored object if one was created
    if (T3Gv.opt.actionStoredObjectId >= 0) {
      ToolActUtil.Undo(true);
      DataUtil.ClearFutureUndoStates();
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.actionSvgObject = null;
    }

    // Reset edit mode
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Unbind event handlers if requested
    if (shouldUnbindEvents) {
      $(window).unbind('mousedown');
      $(window).unbind('click');
      $(window).unbind('mousemove', EvtUtil.Evt_MouseStampObjectMove);
      T3Gv.opt.WorkAreaHammer.enable(true);
    }

    // Reset all stamp-related properties
    T3Gv.opt.moveList = null;
    T3Gv.opt.stampCompleteCallback = null;
    T3Gv.opt.stampCompleteUserData = null;
    T3Gv.opt.stampShapeOffsetX = 0;
    T3Gv.opt.stampShapeOffsetY = 0;
    T3Gv.opt.stampHCenter = false;
    T3Gv.opt.stampVCenter = false;
    T3Gv.opt.stampSticky = false;

    T3Util.Log("O.Opt CancelObjectStamp - Output: Object stamp canceled");
  }

  /**
   * Cancels the object stamp text on tap operation.
   * @param event - The event triggering the cancellation of stamp text.
   * @returns void
   */
  static CancelObjectStampTextOnTap(event: any): void {
    T3Util.Log("O.Opt CancelObjectStampTextOnTap - Input:", event);
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);
    LMEvtUtil.LMStampPostRelease(false);
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);
    if (event) {
      T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);
    }
    T3Gv.opt.stampCompleteCallback = null;
    T3Gv.opt.stampCompleteUserData = null;
    T3Gv.opt.moveList = null;
    T3Gv.opt.stampShapeOffsetX = 0;
    T3Gv.opt.stampShapeOffsetY = 0;
    T3Gv.opt.stampHCenter = false;
    T3Gv.opt.stampVCenter = false;
    T3Gv.opt.drawShape = null;
    T3Gv.opt.moveList = null;
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;
    T3Util.Log("O.Opt CancelObjectStampTextOnTap - Output: Completed");
  }

  /**
   * Cancels the current object drag and drop operation
   * @param shouldUnbindEvents - Whether to unbind event handlers
   */
  static CancelObjectDragDrop(shouldUnbindEvents) {
    T3Util.Log("O.Opt CancelObjectDragDrop - Input:", { shouldUnbindEvents });

    // Clear modal operation state
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);
    LMEvtUtil.LMStampPostRelease(false);

    // Clean up stored object if one was created
    if (T3Gv.opt.actionStoredObjectId >= 0) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(T3Gv.opt.actionStoredObjectId);

      if (svgElement) {
        T3Gv.opt.svgObjectLayer.RemoveElement(svgElement);
      }

      ToolActUtil.Undo(true);
      DataUtil.ClearFutureUndoStates();
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.actionSvgObject = null;

      // if (Collab.AllowMessage()) {
      //   Collab.CloseSecondaryEdit();
      // }
    }

    // Reset edit mode
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Unbind events if requested
    if (shouldUnbindEvents) {
      T3Gv.opt.UnbindDragDropOrStamp();
    }

    // Reset all stamp-related properties
    T3Gv.opt.stampCompleteCallback = null;
    T3Gv.opt.stampCompleteUserData = null;
    T3Gv.opt.moveList = null;
    T3Gv.opt.stampShapeOffsetX = 0;
    T3Gv.opt.stampShapeOffsetY = 0;
    T3Gv.opt.stampHCenter = false;
    T3Gv.opt.stampVCenter = false;

    T3Util.Log("O.Opt CancelObjectDragDrop - Output: Drag and drop canceled");
  }

  static CancelObjectDraw(): void {
    T3Util.Log("O.Opt CancelObjectDraw - Input: No parameters");

    const actionObject = DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false);
    const isPolyLineOrContainer = actionObject instanceof Instance.Shape.PolyLine || actionObject instanceof Instance.Shape.PolyLineContainer;

    // Clear modal operation and release stamp if needed.
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);
    LMEvtUtil.LMStampPostRelease(false);

    if (T3Gv.opt.actionStoredObjectId >= 0 && !isPolyLineOrContainer) {
      ToolActUtil.Undo(true);
      DataUtil.ClearFutureUndoStates();
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.actionSvgObject = null;
    } else {
      // Force update when there is an object, but it is a polyline type.
      DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, true);
    }

    // Reset to default edit mode
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Unbind drag/drop or stamp events.
    T3Gv.opt.UnbindDragDropOrStamp();

    // Rebind work area events.
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);
    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);

    // Call cancel on the drawing object if present.
    if (actionObject) {
      actionObject.CancelObjectDraw();
    }

    // Invoke any operation mng cancellation routines if present.
    if (T3Gv.wallOpt.CancelObjectDraw) {
      T3Gv.wallOpt.CancelObjectDraw();
    }

    // Set the selection tool to the default select tool.
    // Commands.MainController.Selection.SetSelectionTool(Resources.Tools.Select, false);

    T3Util.Log("O.Opt CancelObjectDraw - Output: Object draw canceled.");
  }

  /**
   * Sets up a new shape for drag and drop operation
   * @param drawingShape - The shape to be dragged and dropped
   * @param horizontalCenter - Whether to center the shape horizontally
   * @param verticalCenter - Whether to center the shape vertically
   * @param useDefaultStyle - Whether to use the default style for the shape
   * @param completionCallback - Callback function to execute after completion
   * @param callbackUserData - User data to pass to the completion callback
   */
  static DragDropNewShape(drawingShape, horizontalCenter, verticalCenter, useDefaultStyle, completionCallback, callbackUserData) {
    T3Util.Log("O.Opt DragDropNewShape - Input:", {
      drawingShape: drawingShape ? drawingShape.BlockID : null,
      horizontalCenter,
      verticalCenter,
      useDefaultStyle,
      hasCallback: !!completionCallback
    });

    try {
      // Set modal operation mode
      UIUtil.SetModalOperation(OptConstant.OptTypes.DragDrop);
      DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      T3Gv.opt.CloseEdit();

      // Store parameters for later use
      T3Gv.opt.stampCompleteCallback = completionCallback || null;
      T3Gv.opt.stampCompleteUserData = callbackUserData || null;
      T3Gv.opt.stampHCenter = horizontalCenter;
      T3Gv.opt.stampVCenter = verticalCenter;
      T3Gv.opt.useDefaultStyle = useDefaultStyle;

      // Reset tracking variables
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.newObjectVisible = false;
      T3Gv.opt.drawShape = drawingShape;

      // Set appropriate edit mode based on shape type
      if (drawingShape.flags & NvConstant.ObjFlags.TextOnly) {
        OptCMUtil.SetEditMode(NvConstant.EditState.Text);
      } else {
        OptCMUtil.SetEditMode(NvConstant.EditState.Stamp);
      }

      // Set up drag end handler
      T3Gv.Evt_StampObjectDragEnd = EvtUtil.Evt_StampObjectDragEndFactory(useDefaultStyle);

      // Initialize hammer.js for gesture handling
      if (!T3Gv.opt.mainAppHammer) {
        this.PreDragDropOrStamp();
      }

      // Disable default work area hammer to prevent conflicts
      T3Gv.opt.WorkAreaHammer.enable(false);

      // Register event handlers for shape dragging
      T3Gv.opt.mainAppHammer.on('mousemove', EvtUtil.Evt_StampObjectDrag);
      // T3Gv.opt.mainAppHammer.on('dragend', T3Gv.Evt_StampObjectDragEnd);
      T3Gv.opt.mainAppHammer.on('mouseup', T3Gv.Evt_StampObjectDragEnd);
      // T3Gv.opt.mainAppHammer.on('click', T3Gv.Evt_StampObjectDragEnd);

      // Initialize tracking and prepare for movement
      LMEvtUtil.LMStampPreTrack();
      this.InitializeAutoGrowDrag();

      T3Util.Log("O.Opt DragDropNewShape - Output: Drag and drop initialized");
    } catch (error) {
      T3Util.Log("O.Opt DragDropNewShape - Error:", error);
      OptCMUtil.CancelOperation();
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  static AllowAutoInsert() {
    T3Util.Log("O.Opt AllowAutoInsert - Input: No parameters");
    const result = T3Gv.wallOpt.AllowAutoInsert();
    T3Util.Log("O.Opt AllowAutoInsert - Output:", result);
    return result;
  }

  static InitializeAutoGrowDrag(actionType?, shouldCloseEdit?) {
    T3Util.Log('O.Opt InitializeAutoGrowDrag - Input:', { actionType, shouldCloseEdit });

    T3Gv.opt.dragGotAutoResizeRight = false;
    T3Gv.opt.dragGotAutoResizeBottom = false;
    T3Gv.opt.dragGotAutoResizeOldX = [];
    T3Gv.opt.dragGotAutoResizeOldY = [];

    T3Util.Log('O.Opt InitializeAutoGrowDrag - Output: Auto grow drag initialized');
  }

  /**
  * Prepares a new shape for stamping onto the document
  * @param drawingShape - The shape to be stamped
  * @param centerHorizontally - Whether to center the shape horizontally
  * @param centerVertically - Whether to center the shape vertically
  * @param useDefaultStyle - Whether to use default styling
  * @param completionCallback - Callback function to execute after stamping
  * @param userData - User data to pass to the callback function
  */
  static MouseStampNewShape(drawingShape, centerHorizontally, centerVertically, useDefaultStyle, completionCallback, userData) {
    T3Util.Log("O.Opt MouseStampNewShape - Input:", {
      drawingShape: drawingShape ? drawingShape.BlockID : null,
      centerHorizontally,
      centerVertically,
      useDefaultStyle,
      hasCallback: !!completionCallback,
      hasUserData: !!userData
    });

    // Set modal operation to STAMP mode
    UIUtil.SetModalOperation(OptConstant.OptTypes.Stamp);
    DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Close any active text editing
    TextUtil.DeactivateTextEdit(false);

    // Store parameters for later use
    T3Gv.opt.stampCompleteCallback = completionCallback || null;
    T3Gv.opt.stampCompleteUserData = userData || null;
    T3Gv.opt.stampHCenter = centerHorizontally;
    T3Gv.opt.stampVCenter = centerVertically;
    T3Gv.opt.useDefaultStyle = useDefaultStyle;

    // Initialize tracking variables
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.dragBBoxList = [];
    T3Gv.opt.dragElementList = [];
    T3Gv.opt.newObjectVisible = false;
    T3Gv.opt.drawShape = drawingShape;

    // Set appropriate edit mode based on shape type
    if (drawingShape.flags & NvConstant.ObjFlags.TextOnly) {
      OptCMUtil.SetEditMode(NvConstant.EditState.Text);
    } else {
      OptCMUtil.SetEditMode(NvConstant.EditState.Stamp, CursorConstant.CursorType.Stamp);
    }

    // Disable WorkAreaHammer to prevent conflicts with stamp operation
    T3Gv.opt.WorkAreaHammer.enable(false);

    // Bind mouse event handlers for stamping operation
    $(window).bind('mousemove', EvtUtil.Evt_MouseStampObjectMove);
    T3Gv.Evt_LMMouseStpObjectDone = EvtUtil.Evt_MouseStampObjectDoneFactory(useDefaultStyle);
    $(window).bind('mousedown', T3Gv.Evt_LMMouseStpObjectDone);
    $(window).bind('click', T3Gv.Evt_LMMouseStpObjectDone);

    // Prepare for stamping
    LMEvtUtil.LMStampPreTrack();
    this.InitializeAutoGrowDrag();

    T3Util.Log("O.Opt MouseStampNewShape - Output: Stamp operation initialized");
  }

  /**
  * Handles the completion of a mouse stamp operation
  * @param event - The mouse event that triggered the completion
  * @param additionalData - Optional additional data for the operation
  */
  static MouseStampObjectDone(event, additionalData) {
    T3Util.Log("O.Opt MouseStampObjectDone - Input:", { event, additionalData });

    try {
      // Get document information
      const docInfo = T3Gv.opt.svgDoc.docInfo;
      let isOutsideWorkArea = false;
      const objectsToSelect = [];

      // Reset auto-scroll timer
      this.ResetAutoScrollTimer();

      // Check if cursor is outside document boundaries
      if (event.clientX >= docInfo.dispX + docInfo.dispWidth ||
        event.clientX < T3Gv.opt.svgDoc.docInfo.dispX ||
        event.clientY < T3Gv.opt.svgDoc.docInfo.dispY) {

        isOutsideWorkArea = true;
      }

      // If cursor is outside document, cancel the operation
      if (isOutsideWorkArea) {
        this.CancelObjectStamp(true);
        // Collab.UnLockMessages();
        // Collab.UnBlockMessages();
        T3Util.Log("O.Opt MouseStampObjectDone - Output: Canceled (outside work area)");
        return;
      }

      // If no object has been created yet, exit
      if (T3Gv.opt.actionStoredObjectId < 0) {
        T3Util.Log("O.Opt MouseStampObjectDone - Output: No object created yet");
        return;
      }

      // Clear any existing selection
      SelectUtil.ClearAnySelection(true);

      // Prepare data for collaboration message
      const messageData = {
        FrameList: []
      };

      // Convert window coordinates to document coordinates
      let docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.clientX, event.clientY);
      const isTextOnlyObject = T3Gv.opt.drawShape.flags & NvConstant.ObjFlags.TextOnly;

      // Apply snapping if enabled and appropriate
      if (!isTextOnlyObject) {
        const isConnectOperation = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
        const isSnappingOverridden = T3Gv.opt.OverrideSnaps(event);

        if (T3Gv.docUtil.docConfig.enableSnap &&
          !isConnectOperation &&
          !isSnappingOverridden) {
          docCoordinates = T3Gv.docUtil.SnapToGrid(docCoordinates);
        }
      }

      // Calculate position, considering center alignment if enabled
      let positionX = docCoordinates.x;
      if (T3Gv.opt.stampHCenter) {
        positionX -= T3Gv.opt.drawShape.Frame.width / 2;
      }

      let positionY = docCoordinates.y;
      if (T3Gv.opt.stampVCenter) {
        positionY -= T3Gv.opt.drawShape.Frame.height / 2;
      }

      let replacedObjectId;
      let frameData;

      // Process move list if available
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        for (let i = 0; i < T3Gv.opt.moveList.length; i++) {
          const objectId = T3Gv.opt.moveList[i];
          const drawingObject = DataUtil.GetObjectPtr(objectId, true);

          if (drawingObject) {
            drawingObject.UpdateFrame(drawingObject.Frame);
            frameData = Utils1.DeepCopy(drawingObject.Frame);
            messageData.FrameList.push(frameData);
            // Collab.AddNewBlockToSecondary(objectId);
            drawingObject.dataStyleOverride = null;
          }
        }
      } else {
        // Handle direct object manipulation
        if (T3Gv.opt.drawShape) {
          // Set size dimensions
          T3Gv.opt.drawShape.sizedim.width = T3Gv.opt.drawShape.Frame.width;
          T3Gv.opt.drawShape.sizedim.height = T3Gv.opt.drawShape.Frame.height;

          // Special handling for frame objects
          if (T3Gv.opt.drawShape.objecttype === NvConstant.FNObjectTypes.Frame) {
            const zList = LayerUtil.ZListPreserve();
            replacedObjectId = this.ReplaceSpecialObject(
              T3Gv.opt.drawShape,
              T3Gv.opt.actionStoredObjectId,
              zList,
              T3Gv.opt.drawShape.objecttype
            );
            messageData.ReplaceSpecialObjectID = replacedObjectId;
          }

          // Update frame and prepare for collaboration
          T3Gv.opt.drawShape.UpdateFrame(T3Gv.opt.drawShape.Frame);
          frameData = Utils1.DeepCopy(T3Gv.opt.drawShape.Frame);
          messageData.FrameList.push(frameData);
          // Collab.AddNewBlockToSecondary(this.drawShape.BlockID);
        }

        // Get the updated object
        DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, true);
      }

      // Include link parameters for collaboration
      messageData.linkParams = Utils1.DeepCopy(T3Gv.opt.linkParams);

      // Update link flags for closed polylines
      T3Gv.opt.SetLinkFlagsOnFilledClosedPolylines();

      // Special handling for floor plans
      if (T3Gv.wallOpt instanceof WallOpt) {
        T3Gv.wallOpt.EnsureCubicleBehindOutline(T3Gv.opt.actionStoredObjectId);
      }

      // Reset edit mode and clean up event handlers
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);
      $(window).unbind('mousedown');
      $(window).unbind('click');
      $(window).unbind('mousemove', EvtUtil.Evt_MouseStampObjectMove);
      T3Gv.opt.WorkAreaHammer.enable(true);

      // Build selection list
      if (!isTextOnlyObject) {
        objectsToSelect.push(T3Gv.opt.actionStoredObjectId);
      }

      // Handle move list if present
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        objectsToSelect.length = 0;
        objectsToSelect.push(...T3Gv.opt.moveList);
        T3Gv.opt.actionStoredObjectId = -1;
      } else {
        DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
      }

      // Delete replaced objects if needed
      if (replacedObjectId) {
        const objectsToDelete = [replacedObjectId];
        DataUtil.DeleteObjects(objectsToDelete, false);
      }

      // Update rendering
      if (!LayerUtil.IsTopMostVisibleLayer()) {
        LayerUtil.MarkAllAllVisibleHigherLayerObjectsDirty();
      }
      SvgUtil.RenderDirtySVGObjects();

      // Clean up move list
      T3Gv.opt.moveList = null;

      // Execute completion callback if provided
      if (T3Gv.opt.stampCompleteCallback && T3Gv.opt.actionStoredObjectId >= 0) {
        T3Gv.opt.stampCompleteCallback(T3Gv.opt.actionStoredObjectId, T3Gv.opt.stampCompleteUserData);
      }

      // Reset stamp-related variables
      T3Gv.opt.stampCompleteCallback = null;
      T3Gv.opt.stampCompleteUserData = null;
      T3Gv.opt.stampHCenter = false;
      T3Gv.opt.stampVCenter = false;
      T3Gv.opt.stampShapeOffsetX = 0;
      T3Gv.opt.stampShapeOffsetY = 0;

      // Finish the operation
      LMEvtUtil.LMStampPostRelease(true);
      DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
      T3Gv.opt.dynamicGuides = null;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.actionSvgObject = null;
      UIUtil.SetModalOperation(OptConstant.OptTypes.None);

      // // Send collaboration message if available
      // if (collabMessage) {
      //   if (Collab.IsSecondary() && Collab.CreateList.length) {
      //     collabMessage.Data.CreateList = [];
      //     collabMessage.Data.CreateList = collabMessage.Data.CreateList.concat(Collab.CreateList);
      //   }
      //   Collab.SendMessage(collabMessage);
      // }

      // Complete the operation
      this.CompleteOperation(objectsToSelect);

      T3Util.Log("O.Opt MouseStampObjectDone - Output: Stamp operation completed successfully");
    } catch (error) {
      T3Util.Log("O.Opt MouseStampObjectDone - Error:", error);
      OptCMUtil.CancelOperation();
      this.DragDrop_ExceptionCleanup();
      T3Gv.opt.ExceptionCleanup(error);
    }
  }

  /**
   * Adds a new shape to the document and sets up related states
   * @param useDefaultStyle - Whether to use default style for the shape
   */
  static MouseAddNewShape(useDefaultStyle) {
    T3Util.Log(`O.Opt MouseAddNewShape - Input:`, { useDefaultStyle });

    let newObjectID;
    let hasNativeData = T3Gv.opt.drawShape.nativeDataArrayBuffer !== null;
    let offset = 0;
    let isPolyLineContainer = false;

    // Add the new object
    if ((newObjectID = this.AddNewObject(T3Gv.opt.drawShape, useDefaultStyle, false)) >= 0) {
      T3Gv.opt.actionStoredObjectId = newObjectID;
      let visibleZList = LayerUtil.VisibleZList();
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];

      // Process objects in the move list if available
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        for (let i = 0; i < T3Gv.opt.moveList.length; i++) {
          let moveObjectID = T3Gv.opt.moveList[i];
          let moveObject = DataUtil.GetObjectPtr(moveObjectID, false);

          if (moveObject) {
            let svgFrame = moveObject.GetSVGFrame();

            // Handle polylines with thick borders
            if (moveObject instanceof Instance.Shape.PolyLine &&
              moveObject.polylist &&
              moveObject.polylist.closed) {
              if (moveObject.StyleRecord &&
                moveObject.StyleRecord.Line &&
                moveObject.StyleRecord.Line.BThick) {
                if (svgFrame.x < 0 && svgFrame.y < 0) {
                  offset = -2 * moveObject.StyleRecord.Line.BThick;
                  isPolyLineContainer = moveObject instanceof Instance.Shape.PolyLineContainer;
                }
              }
            }

            // Apply offset
            svgFrame.y += offset;
            svgFrame.x += offset;
            if (!isPolyLineContainer) offset = 0;

            // Add to drag tracking lists
            T3Gv.opt.dragBBoxList.push(svgFrame);
            let index = visibleZList.indexOf(moveObjectID);
            SvgUtil.AddSVGObject(index, moveObjectID, true, false);
            T3Gv.opt.dragElementList.push(moveObjectID);

            // Set up snap target if enabled
            if (T3Gv.docUtil.docConfig.enableSnap &&
              moveObjectID === T3Gv.opt.actionStoredObjectId) {
              T3Gv.opt.dragTargetBBox = $.extend(true, {}, svgFrame);
            }

            // Calculate enclosing rectangle
            T3Gv.opt.dragEnclosingRect = T3Gv.opt.GetListSRect(
              T3Gv.opt.moveList,
              false,
              true
            );
          }
        }
      }
      // Handle objects with native data
      else if (hasNativeData) {
        let newObject = DataUtil.GetObjectPtr(newObjectID, false);
        let sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
        let hasImageURL = newObject.ImageURL && newObject.ImageURL.length > 0;

        // Apply curvature if applicable
        if (newObject &&
          newObject.SymbolID !== OptConstant.Common.WallOpenId &&
          !hasImageURL) {
          newObject.ApplyCurvature(sessionBlock.def.rrectparam);
        }

        // Add to SVG layer
        let index = visibleZList.indexOf(T3Gv.opt.actionStoredObjectId);
        SvgUtil.AddSVGObject(index, newObjectID, true, false);
      }

      // Store the SVG object and update UI state
      T3Gv.opt.actionSvgObject = T3Gv.opt.svgObjectLayer.GetElementById(T3Gv.opt.actionStoredObjectId);

      if (T3Gv.opt.linkParams) {
        T3Gv.opt.linkParams.lpCircList.push(T3Gv.opt.actionStoredObjectId);
      }

      UIUtil.ShowFrame(true);
      UIUtil.ShowXY(true);
    }

    T3Util.Log(`O.Opt MouseAddNewShape - Output: New object created with ID:`, newObjectID);
  }

  /**
   * Handles mouse movement during stamp operations
   * @param event - The mouse event
   */
  static MouseStampObjectMove(event) {
    T3Util.Log("O.Opt MouseStampObjectMove - Input:", event);

    // Convert window coordinates to document coordinates
    const documentCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.clientX, event.clientY);

    // If no object has been created yet, create it when cursor is within document boundaries
    if (T3Gv.opt.actionStoredObjectId < 0) {
      if (
        !(
          event.clientX >= T3Gv.opt.svgDoc.docInfo.dispX &&
          event.clientY >= T3Gv.opt.svgDoc.docInfo.dispY
        )
      ) {
        T3Util.Log("O.Opt MouseStampObjectMove - Output: Cursor outside document boundaries");
        return;
      }

      // Begin collaborative edit session and create new shape
      // Collab.BeginSecondaryEdit();

      this.MouseAddNewShape(T3Gv.opt.useDefaultStyle);
      T3Gv.opt.newObjectVisible = true;
      T3Util.Log("O.Opt MouseStampObjectMove - Created new shape with ID:", T3Gv.opt.actionStoredObjectId);
    }

    // Handle auto-scrolling and movement
    if (this.AutoScrollCommon(event, true, 'HandleStampDragDoAutoScroll')) {
      this.StampObjectMoveCommon(documentCoords.x, documentCoords.y, event);
    }

    T3Util.Log("O.Opt MouseStampObjectMove - Output: Movement processed");
  }

  /**
   * Handles common logic for moving an object during stamping operations
   * @param mouseX - X coordinate of the mouse position
   * @param mouseY - Y coordinate of the mouse position
   * @param event - The event that triggered the movement
   */
  static StampObjectMoveCommon(mouseX, mouseY, event?) {
    T3Util.Log("O.Opt StampObjectMoveCommon - Input:", { mouseX, mouseY, event });

    let drawingObject, objectIndex, objectCount, objectId, xOffset, yOffset;
    let dragElement, visibleList, listIndex, svgElement;
    let deltaX = 0;
    let deltaY = 0;
    let objectFrame = {};
    let currentPosition = { x: mouseX, y: mouseY };
    let dragEnclosingRect = null;
    let objectRect;

    // Convert document coordinates to window coordinates
    const windowCoords = T3Gv.opt.svgDoc.ConvertDocToWindowCoords(mouseX, mouseY);
    if (!windowCoords) {
      T3Util.Log("O.Opt StampObjectMoveCommon - Output: No valid window coordinates");
      return;
    }

    // Handle visibility based on object position
    if (T3Gv.opt.actionStoredObjectId > 0) {
      const isOutsideViewport =
        windowCoords.x < T3Gv.opt.svgDoc.docInfo.dispX ||
        windowCoords.y < T3Gv.opt.svgDoc.docInfo.dispY;

      if (isOutsideViewport) {
        if (T3Gv.opt.newObjectVisible) {
          // Hide objects when moved outside viewport
          if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
            for (let i = 0; i < T3Gv.opt.moveList.length; ++i) {
              objectId = T3Gv.opt.moveList[i];
              dragElement = SvgUtil.GetSVGDragElement(i);
              if (dragElement) {
                dragElement.SetVisible(false);
              }
            }
          } else if (T3Gv.opt.actionSvgObject) {
            T3Gv.opt.actionSvgObject.SetVisible(false);
          }

          T3Gv.opt.newObjectVisible = false;
          UIUtil.ShowFrame(false);
          UIUtil.ShowXY(false);
        }
        T3Util.Log("O.Opt StampObjectMoveCommon - Output: Object outside viewport, hidden");
        return;
      }

      // Show objects when they're within viewport
      if (!T3Gv.opt.newObjectVisible) {
        if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
          for (let i = 0; i < T3Gv.opt.moveList.length; ++i) {
            objectId = T3Gv.opt.moveList[i];
            dragElement = SvgUtil.GetSVGDragElement(i);
            if (dragElement) {
              dragElement.SetVisible(true);
            }
          }
        } else if (T3Gv.opt.actionSvgObject) {
          T3Gv.opt.actionSvgObject.SetVisible(true);
        }

        T3Gv.opt.newObjectVisible = true;
        UIUtil.ShowFrame(true);
        UIUtil.ShowXY(true);
      }
    }

    // Get the drawing object
    drawingObject = DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, false);
    if (!drawingObject) {
      T3Util.Log("O.Opt StampObjectMoveCommon - Output: No valid drawing object");
      return;
    }

    // Check if this is a text-only object
    const isTextOnlyObject = T3Gv.opt.drawShape.flags & NvConstant.ObjFlags.TextOnly;

    // Determine if we should apply snapping
    const isConnectOperation = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
    const isSnapDisabled = T3Gv.opt.OverrideSnaps(event) || isConnectOperation;

    const snapOffset = { x: null, y: null };

    let snapTargetId;
    let positionedRect;

    // Handle snap-to-shapes if enabled
    if (!T3Gv.opt.moveList && !isTextOnlyObject && this.AllowSnapToShapes()) {
      const snapOptions = {};
      snapTargetId = drawingObject.CanSnapToShapes(snapOptions);

      if (snapTargetId >= 0) {
        const dynamicGuides = new DynamicGuides();
        const targetRect = DataUtil.GetObjectPtr(snapTargetId, false).GetSnapRect();

        // Create a copy of the target rectangle centered at the current position
        positionedRect = $.extend(true, {}, targetRect);
        positionedRect.x = currentPosition.x - targetRect.width / 2;
        positionedRect.y = currentPosition.y - targetRect.height / 2;

        //DynamicSnapsGetSnapObjects(selectedObject, bounds, dynamicGuides, snapDistance, includeCenters, restrictToVisible)

        // Get snap points
        const snapResult = DynamicUtil.DynamicSnapsGetSnapObjects(
          snapTargetId,
          positionedRect,
          dynamicGuides,
          T3Gv.opt.moveList,
          null,
          snapOptions
        );

        // Apply snapping if found
        if (snapResult.x !== null) {
          positionedRect.x += snapResult.x;
          currentPosition.x += snapResult.x;
        }

        if (snapResult.y !== null) {
          positionedRect.y += snapResult.y;
          currentPosition.y += snapResult.y;
        }
      }
    }

    // Handle grid snapping if enabled
    if (T3Gv.docUtil.docConfig.enableSnap && !isSnapDisabled && !isTextOnlyObject) {
      let objectRect, targetRect;

      // Get appropriate rectangles based on whether we're moving multiple objects
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        objectIndex = T3Gv.opt.moveList.indexOf(T3Gv.opt.actionStoredObjectId);
        targetRect = Utils1.DeepCopy(T3Gv.opt.dragBBoxList[objectIndex]);
        objectRect = drawingObject.GetSnapRect();
      } else {
        targetRect = Utils1.DeepCopy(T3Gv.opt.actionBBox);
        objectRect = drawingObject.GetSnapRect();
      }

      // Get the enclosing rectangle
      dragEnclosingRect = T3Gv.opt.dragEnclosingRect
        ? Utils1.DeepCopy(T3Gv.opt.dragEnclosingRect)
        : objectRect;

      if (dragEnclosingRect && targetRect) {
        // Calculate offsets
        xOffset = dragEnclosingRect.x - targetRect.x;
        yOffset = dragEnclosingRect.y - targetRect.y;

        // Update position
        dragEnclosingRect.x = currentPosition.x - dragEnclosingRect.width / 2;
        dragEnclosingRect.y = currentPosition.y - dragEnclosingRect.height / 2;

        const objectPosition = {
          x: dragEnclosingRect.x - xOffset,
          y: dragEnclosingRect.y - yOffset
        };

        // Create a rectangle for snapping
        const snapRect = $.extend(true, {}, objectRect);
        snapRect.x = currentPosition.x - objectRect.width / 2;
        snapRect.y = currentPosition.y - objectRect.height / 2;

        // Apply custom snap if available
        if (drawingObject.CustomSnap(objectPosition.x, objectPosition.y, 0, 0, false, currentPosition)) {
          // Custom snap handled by the object
        }
        // Apply center snap if enabled
        else if (T3Gv.docUtil.docConfig.centerSnap) {
          const snapResult = T3Gv.docUtil.SnapToGrid(currentPosition);
          if (snapOffset.x === null) {
            currentPosition.x = snapResult.x;
          }
          if (snapOffset.y === null) {
            currentPosition.y = snapResult.y;
          }
        }
        // Apply standard grid snapping
        else {
          const snapResult = T3Gv.docUtil.SnapRect(snapRect);
          if (snapOffset.x === null) {
            currentPosition.x += snapResult.x;
          }
          if (snapOffset.y === null) {
            currentPosition.y += snapResult.y;
          }
        }
      }
    }

    // Handle moving multiple objects
    if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
      objectCount = T3Gv.opt.moveList.length;
      objectIndex = T3Gv.opt.moveList.indexOf(T3Gv.opt.actionStoredObjectId);
      objectRect = T3Gv.opt.dragEnclosingRect;

      // Calculate center point and apply auto-growth
      let centerPoint = {
        x: currentPosition.x + objectRect.width / 2,
        y: currentPosition.y + objectRect.height / 2
      };

      centerPoint = this.DoAutoGrowDrag(centerPoint);

      // Update position based on center point
      currentPosition.x = centerPoint.x - objectRect.width / 2;
      currentPosition.y = centerPoint.y - objectRect.height / 2;

      // Calculate offsets
      xOffset = currentPosition.x - objectRect.x - objectRect.width / 2;
      yOffset = currentPosition.y - objectRect.y - objectRect.height / 2;

      // Ensure we don't position objects outside the document
      if (objectRect.x + xOffset < 0) {
        xOffset = -objectRect.x;
      }
      if (objectRect.y + yOffset < 0) {
        yOffset = -objectRect.y;
      }

      // Get the target rectangle
      objectRect = T3Gv.opt.dragBBoxList[objectIndex];

      // Update the shape origin
      drawingObject.SetShapeOrigin(objectRect.x + xOffset, objectRect.y + yOffset);

      // Apply any additional tracking logic
      currentPosition = LMEvtUtil.LMStampDuringTrack(currentPosition, drawingObject);

      // Update display coordinates
      const dimensionsData = drawingObject.GetDimensionsForDisplay();
      UIUtil.UpdateDisplayCoordinates(
        dimensionsData,
        currentPosition,
        CursorConstant.CursorTypes.Plus,
        drawingObject
      );

      // Update selection attributes
      const selectionAttrs = new SelectionAttr();
      selectionAttrs.left = dimensionsData.x;
      selectionAttrs.top = dimensionsData.y;

      const showFeetAsInches = drawingObject.Dimensions &
        NvConstant.DimensionFlags.ShowFeetAsInches;

      selectionAttrs.widthstr = T3Constant.DocContext.CurrentWidth;
      selectionAttrs.heightstr = T3Constant.DocContext.CurrentHeight;
      selectionAttrs.leftstr = RulerUtil.GetLengthInRulerUnits(
        selectionAttrs.left,
        false,
        T3Gv.docUtil.rulerConfig.originx,
        showFeetAsInches
      );
      selectionAttrs.topstr = RulerUtil.GetLengthInRulerUnits(
        selectionAttrs.top,
        false,
        T3Gv.docUtil.rulerConfig.originy,
        showFeetAsInches
      );

      // Update all objects in the move list
      for (let i = 0; i < objectCount; ++i) {
        objectId = T3Gv.opt.moveList[i];
        const object = DataUtil.GetObjectPtr(objectId);

        if (object) {
          if (objectId !== T3Gv.opt.actionStoredObjectId) {
            objectRect = T3Gv.opt.dragBBoxList[i];
            if (!objectRect) continue;

            object.SetShapeOrigin(objectRect.x + xOffset, objectRect.y + yOffset);
          }

          dragElement = SvgUtil.GetSVGDragElement(i);

          // Handle SVG fragment symbols
          if (!dragElement &&
            object.ShapeType === OptConstant.ShapeType.SVGFragmentSymbol &&
            object.SVGFragment) {

            if (!visibleList) {
              visibleList = LayerUtil.VisibleZList();
            }

            listIndex = visibleList.indexOf(objectId);
            SvgUtil.AddSVGObject(listIndex, objectId, true, false);
            dragElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
          }

          if (dragElement) {
            dragElement.SetPos(objectRect.x + xOffset, objectRect.y + yOffset);
          }
        }
      }
    }
    // Handle single object
    else {
      // Get object rectangles
      objectRect = Utils1.DeepCopy(T3Gv.opt.actionBBox);
      dragEnclosingRect = Utils1.DeepCopy(T3Gv.opt.dragEnclosingRect);

      // Calculate center point and apply auto-growth
      let centerPoint = {
        x: currentPosition.x + dragEnclosingRect.width / 2,
        y: currentPosition.y + dragEnclosingRect.height / 2
      };

      centerPoint = this.DoAutoGrowDrag(centerPoint);

      // Update position based on center point
      currentPosition.x = centerPoint.x - dragEnclosingRect.width / 2;
      currentPosition.y = centerPoint.y - dragEnclosingRect.height / 2;

      // Calculate offsets
      xOffset = currentPosition.x - dragEnclosingRect.x - dragEnclosingRect.width / 2;
      yOffset = currentPosition.y - dragEnclosingRect.y - dragEnclosingRect.height / 2;

      // Ensure we don't position objects outside the document
      if (objectRect.x + xOffset < 0) {
        xOffset = -dragEnclosingRect.x;
      } else {
        xOffset = currentPosition.x - objectRect.x - objectRect.width / 2;
      }

      if (objectRect.y + yOffset < 0) {
        yOffset = -dragEnclosingRect.y;
      } else {
        yOffset = currentPosition.y - objectRect.y - objectRect.height / 2;
      }

      // Update the shape origin
      drawingObject.SetShapeOrigin(objectRect.x + xOffset, objectRect.y + yOffset);

      // Apply any additional tracking logic
      currentPosition = LMEvtUtil.LMStampDuringTrack(currentPosition, drawingObject);

      // Update display coordinates
      const dimensionsData = drawingObject.GetDimensionsForDisplay();
      UIUtil.UpdateDisplayCoordinates(
        dimensionsData,
        currentPosition,
        CursorConstant.CursorTypes.Move,
        drawingObject
      );

      // Update selection attributes
      const selectionAttrs = new SelectionAttr();
      selectionAttrs.left = dimensionsData.x;
      selectionAttrs.top = dimensionsData.y;

      const showFeetAsInches = drawingObject.Dimensions &
        NvConstant.DimensionFlags.ShowFeetAsInches;

      selectionAttrs.widthstr = T3Constant.DocContext.CurrentWidth;
      selectionAttrs.heightstr = T3Constant.DocContext.CurrentHeight;
      selectionAttrs.leftstr = RulerUtil.GetLengthInRulerUnits(
        selectionAttrs.left,
        false,
        T3Gv.docUtil.rulerConfig.originx,
        showFeetAsInches
      );
      selectionAttrs.topstr = RulerUtil.GetLengthInRulerUnits(
        selectionAttrs.top,
        false,
        T3Gv.docUtil.rulerConfig.originy,
        showFeetAsInches
      );

      // Update offsets for final positioning
      xOffset = currentPosition.x - dragEnclosingRect.x - dragEnclosingRect.width / 2;
      yOffset = currentPosition.y - dragEnclosingRect.y - dragEnclosingRect.height / 2;

      // Ensure we don't position objects outside the document
      if (dragEnclosingRect.x + xOffset - deltaX < 0) {
        xOffset = -dragEnclosingRect.x + deltaX;
        deltaX = 0;
      } else {
        xOffset = currentPosition.x - objectRect.x - objectRect.width / 2;
      }

      if (dragEnclosingRect.y + yOffset - deltaY < 0) {
        yOffset = -dragEnclosingRect.y + deltaY;
        deltaY = 0;
      } else {
        yOffset = currentPosition.y - objectRect.y - objectRect.height / 2;
      }

      // Update the shape origin again with final values
      drawingObject.SetShapeOrigin(objectRect.x + xOffset, objectRect.y + yOffset);

      // Handle connections
      if (T3Gv.opt.linkParams &&
        (T3Gv.opt.linkParams.ConnectIndex >= 0 || T3Gv.opt.linkParams.ConnectIndexHistory.length > 0)) {

        objectFrame = Utils1.DeepCopy(objectRect);
        objectFrame.x += xOffset;
        objectFrame.y += yOffset;

        HookUtil.HandleHookedObjectMoving(drawingObject, objectFrame);
      }

      // Update SVG element position
      T3Gv.opt.actionSvgObject.SetPos(objectRect.x + xOffset - deltaX, objectRect.y + yOffset - deltaY);

      // Update dynamic guides if needed
      const isConnecting = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
      const dynamicGuides = new DynamicGuides();

      if (dynamicGuides) {
        if (isConnecting) {
          if (T3Gv.opt.dynamicGuides) {
            DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
            T3Gv.opt.dynamicGuides = null;
          }
        } else {
          // The next line is from the original code but the variable snapTargetId and
          // positionedRect aren't defined in this scope, so we won't update guides here
          DynamicUtil.DynamicSnapsUpdateGuides(dynamicGuides, snapTargetId, positionedRect);
        }
      }
    }

    T3Util.Log("O.Opt StampObjectMoveCommon - Output: Object positioned at", currentPosition);
  }

  /**
   * Handles the completion of a drag and drop operation
   * @param event - The event that triggered the completion of the drag drop
   * @param additionalData - Optional additional data for the operation
   */
  static DragDropObjectDone(event: any, additionalData?: any) {
    T3Util.Log('DragDropObjectDone - Input:', { event, additionalData });

    // Re-enable work area event handling
    T3Gv.opt.WorkAreaHammer.enable(true);

    try {
      // Prevent default browser behavior
      Utils2.StopPropagationAndDefaults(event);
      this.ResetAutoScrollTimer();

      let isTextOnlyObject = false;
      let objectIndex, objectCount, currentObject, replacedObjectId;
      const docInfo = T3Gv.opt.svgDoc.docInfo;
      let isOutsideWorkArea = false;
      const objectsToSelect = [];

      // // Check if cursor is outside the document's visible area
      // if (event.gesture.center.clientX >= docInfo.dispX + docInfo.dispWidth) {
      //   isOutsideWorkArea = true;
      // }

      // if (event.gesture.center.clientX < T3Gv.opt.svgDoc.docInfo.dispX) {
      //   isOutsideWorkArea = true;
      // }

      // if (event.gesture.center.clientY < T3Gv.opt.svgDoc.docInfo.dispY) {
      //   isOutsideWorkArea = true;
      // }

      // Check if cursor is outside the document's visible area
      if (event.clientX >= docInfo.dispX + docInfo.dispWidth) {
        isOutsideWorkArea = true;
      }

      if (event.clientX < T3Gv.opt.svgDoc.docInfo.dispX) {
        isOutsideWorkArea = true;
      }

      if (event.clientY < T3Gv.opt.svgDoc.docInfo.dispY) {
        isOutsideWorkArea = true;
      }

      // If outside work area, cancel the operation
      if (isOutsideWorkArea) {
        this.CancelObjectDragDrop(true);
        T3Util.Log("DragDropObjectDone - Output: Canceled (outside work area)");
        return;
      }

      // Verify that link parameters are initialized
      if (T3Gv.opt.linkParams == null) {
        this.CancelObjectDragDrop(true);
        T3Util.Log("DragDropObjectDone - Output: Canceled (no link parameters)");
        return;
      }

      // Get document coordinates from window coordinates
      // let docCoordinates = this.svgDoc.ConvertWindowToDocCoords(
      //   event.gesture.center.clientX,
      //   event.gesture.center.clientY
      // );

      let docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.clientX,
        event.clientY
      );

      // Check if the object is text-only
      if (T3Gv.opt.drawShape) {
        isTextOnlyObject = !!(T3Gv.opt.drawShape.flags & NvConstant.ObjFlags.TextOnly);
      }

      // Apply snapping if enabled and appropriate
      if (!isTextOnlyObject) {
        const isConnectOperation = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
        const isSnappingOverridden = T3Gv.opt.OverrideSnaps(event);

        if (T3Gv.docUtil.docConfig.enableSnap && !isConnectOperation && !isSnappingOverridden) {
          docCoordinates = T3Gv.docUtil.SnapToGrid(docCoordinates);
        }
      }

      // Calculate position, considering center alignment if enabled
      let positionX = docCoordinates.x;
      if (T3Gv.opt.stampHCenter) {
        positionX -= T3Gv.opt.drawShape.Frame.width / 2;
      }

      let positionY = docCoordinates.y;
      if (T3Gv.opt.stampVCenter) {
        positionY -= T3Gv.opt.drawShape.Frame.height / 2;
      }

      let targetObjectId;
      let frameData;
      const messageData = {
        FrameList: []
      };

      // Process objects in the move list if available
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        targetObjectId = T3Gv.opt.moveList[0];
        objectCount = T3Gv.opt.moveList.length;

        for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
          currentObject = DataUtil.GetObjectPtr(T3Gv.opt.moveList[objectIndex], true);
          if (currentObject) {
            currentObject.UpdateFrame(currentObject.Frame);
            frameData = Utils1.DeepCopy(currentObject.Frame);
            messageData.FrameList.push(frameData);
          }

          // Get a fresh copy of the object
          currentObject = DataUtil.GetObjectPtr(T3Gv.opt.moveList[objectIndex], true);
        }
      } else {
        // Handle a single object
        if (T3Gv.opt.drawShape) {
          targetObjectId = T3Gv.opt.drawShape.BlockID;

          // Update size dimensions
          T3Gv.opt.drawShape.sizedim.width = T3Gv.opt.drawShape.Frame.width;
          T3Gv.opt.drawShape.sizedim.height = T3Gv.opt.drawShape.Frame.height;

          // Special handling for frame objects
          if (T3Gv.opt.drawShape.objecttype === NvConstant.FNObjectTypes.Frame) {
            const zList = LayerUtil.ZListPreserve();
            replacedObjectId = this.ReplaceSpecialObject(
              T3Gv.opt.drawShape,
              T3Gv.opt.actionStoredObjectId,
              zList,
              T3Gv.opt.drawShape.objecttype
            );
            // messageData.ReplaceSpecialObjectID = replacedObjectId;
          }

          // Update frame and store for collaboration
          T3Gv.opt.drawShape.UpdateFrame(T3Gv.opt.drawShape.Frame);
          frameData = Utils1.DeepCopy(T3Gv.opt.drawShape.Frame);
          messageData.FrameList.push(frameData);

          // Include rotation angle for auto-insert objects
          if (T3Gv.opt.linkParams.AutoInsert) {
            // messageData.RotationAngle = this.drawShape.RotationAngle;
          }

          // Collab.AddNewBlockToSecondary(this.drawShape.BlockID);
        }

        // Get latest version of the action object
        DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, true);
      }

      // Reset edit mode and prepare selection
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);
      T3Gv.opt.UnbindDragDropOrStamp();

      if (!isTextOnlyObject) {
        objectsToSelect.push(T3Gv.opt.actionStoredObjectId);
      }

      // Get operation mng for the target object
      let optMng = OptAhUtil.GetGvSviOpt(targetObjectId);
      if (optMng == null) {
        optMng = T3Gv.wallOpt;
      }

      // Handle wall opt special case
      if (optMng instanceof WallOpt) {
        optMng.EnsureCubicleBehindOutline(T3Gv.opt.actionStoredObjectId);
      }

      // Update selection list based on move list or single object
      if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
        objectsToSelect.length = 0;
        objectsToSelect.push(...T3Gv.opt.moveList);
        T3Gv.opt.actionStoredObjectId = -1;
      } else {
        DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
      }

      // Delete replaced object if needed
      if (replacedObjectId) {
        const objectsToDelete = [replacedObjectId];
        DataUtil.DeleteObjects(objectsToDelete, false);
      }

      // Update rendering
      if (!LayerUtil.IsTopMostVisibleLayer()) {
        LayerUtil.MarkAllAllVisibleHigherLayerObjectsDirty();
      }
      SvgUtil.RenderDirtySVGObjects();

      // Update link flags for filled polylines
      T3Gv.opt.SetLinkFlagsOnFilledClosedPolylines();

      // Reset move list
      T3Gv.opt.moveList = null;

      // Execute completion callback if provided
      if (T3Gv.opt.stampCompleteCallback && T3Gv.opt.actionStoredObjectId >= 0) {
        T3Gv.opt.stampCompleteCallback(T3Gv.opt.actionStoredObjectId, T3Gv.opt.stampCompleteUserData);
      }

      // Reset stamp-related properties
      T3Gv.opt.stampCompleteCallback = null;
      T3Gv.opt.stampCompleteUserData = null;
      T3Gv.opt.stampHCenter = false;
      T3Gv.opt.stampVCenter = false;
      T3Gv.opt.stampShapeOffsetX = 0;
      T3Gv.opt.stampShapeOffsetY = 0;

      // Finish the stamp operation
      LMEvtUtil.LMStampPostRelease(true);

      // Send collaboration message if available
      // if (collabMessage) {
      //   if (Collab.IsSecondary() && Collab.CreateList.length) {
      //     collabMessage.Data.CreateList = [];
      //     collabMessage.Data.CreateList = collabMessage.Data.CreateList.concat(Collab.CreateList);
      //   }
      //   Collab.SendMessage(collabMessage);
      // }

      // Clean up dynamic guides
      DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
      T3Gv.opt.dynamicGuides = null;

      // Reset drag state
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.dragBBoxList = [];
      T3Gv.opt.dragElementList = [];
      T3Gv.opt.actionSvgObject = null;

      // Reset modal operation
      UIUtil.SetModalOperation(OptConstant.OptTypes.None);

      // Complete the operation
      this.CompleteOperation(objectsToSelect);

      T3Util.Log("DragDropObjectDone - Output: Drag-drop operation completed successfully");
    } catch (error) {
      T3Util.Log("DragDropObjectDone - Error:", error);
      OptCMUtil.CancelOperation();
      this.DragDrop_ExceptionCleanup();
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
     * Cleans up resources when an exception occurs during drag and drop operations
     */
  static DragDrop_ExceptionCleanup(): void {
    T3Util.Log('O.Opt DragDrop_ExceptionCleanup - Input: No parameters');

    // Reset empty lists
    T3Gv.opt.emptyEMFList = [];
    T3Gv.opt.emptySymbolList = [];

    // // Unlock collaboration messages
    // Collab.UnLockMessages();
    // Collab.UnBlockMessages();

    T3Util.Log('O.Opt DragDrop_ExceptionCleanup - Output: Cleanup completed');
  }

  /**
  * Handles the movement of an object being stamped on the canvas
  * @param event - The mouse or touch event that triggered the movement
  */
  static StampObjectMove(event) {
    T3Util.Log(`O.Opt StampObjectMove - Input:`, event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    let clientX = 0;
    let clientY = 0;

    // Extract client coordinates from either gesture or regular event
    if (!event.gesture) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.gesture.center.clientX;
      clientY = event.gesture.center.clientY;
    }

    // Convert window coordinates to document coordinates
    const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
    T3Util.Log(`O.Opt StampObjectMove - Converted coordinates:`, documentCoordinates);

    // If no object has been created yet, create it when cursor is within document boundaries
    if (T3Gv.opt.actionStoredObjectId < 0) {
      // Check if cursor is within document boundaries
      if (clientX < T3Gv.opt.svgDoc.docInfo.dispX ||
        clientY < T3Gv.opt.svgDoc.docInfo.dispY) {
        T3Util.Log(`O.Opt StampObjectMove - Output: Cursor outside document boundaries`);
        return;
      }

      // // Begin collaborative edit session and create new shape
      // Collab.BeginSecondaryEdit();

      this.MouseAddNewShape(T3Gv.opt.useDefaultStyle);
      T3Gv.opt.newObjectVisible = true;
      T3Util.Log(`O.Opt StampObjectMove - Created new shape with ID:`, T3Gv.opt.actionStoredObjectId);
    }

    // Handle auto-scrolling and movement
    if (this.AutoScrollCommon(event, true, 'HandleStampDragDoAutoScroll')) {
      this.StampObjectMoveCommon(documentCoordinates.x, documentCoordinates.y, event);
    }

    T3Util.Log(`O.Opt StampObjectMove - Output: Movement processed`);
  }

  /**
   * Prepares the application for drag-drop or stamp operations
   */
  static PreDragDropOrStamp() {
    T3Util.Log("O.Opt PreDragDropOrStamp - Input: No parameters");

    // Clean up existing hammer instance if it exists
    if (T3Gv.opt.mainAppHammer) {
      T3Gv.opt.UnbindDragDropOrStamp();
    }

    // Create a new hammer instance for the main application element
    T3Gv.opt.mainAppHammer = new Hammer(T3Gv.opt.mainAppElement);

    T3Util.Log("O.Opt PreDragDropOrStamp - Output: Hammer manager created for drag/drop operations");
  }

  static DrawNewObject(newShape, clearExistingSection) {
    T3Util.Log("O.Opt DrawNewObject - Input:", { newShape, clearExistingSection });

    UIUtil.SetModalOperation(OptConstant.OptTypes.Draw);
    DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    T3Gv.opt.CloseEdit();

    T3Gv.opt.lineDrawId = -1;
    T3Gv.opt.drawShape = newShape;
    SelectUtil.ClearAnySelection(!clearExistingSection);
    OptCMUtil.SetEditMode(NvConstant.EditState.Edit);
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDrawStart);

    T3Util.Log("O.Opt DrawNewObject - Output: Draw new object initialized");
  }

  static StartNewObjectDraw(inputEvent) {
    T3Util.Log("O.Opt StartNewObjectDraw - Input:", inputEvent);

    // Abort drawing if lineStamp is active
    if (T3Gv.opt.lineStamp) {
      T3Util.Log("O.Opt StartNewObjectDraw - Output: lineStamp active, aborting draw");
      return;
    }

    // Convert client coordinates to document coordinates
    let docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      inputEvent.gesture.center.clientX,
      inputEvent.gesture.center.clientY
    );
    T3Util.Log("O.Opt StartNewObjectDraw: Client coords and Doc coords", inputEvent.gesture.center.clientX, inputEvent.gesture.center.clientY, docCoords);

    // Set the starting point for drawing
    T3Gv.opt.drawStartX = docCoords.x;
    T3Gv.opt.drawStartY = docCoords.y;
    T3Util.Log("O.Opt StartNewObjectDraw: Draw start coordinates set", T3Gv.opt.drawStartX, T3Gv.opt.drawStartY);

    // Pre-track check before drawing
    const preTrackCheck = T3Gv.opt.drawShape.LMDrawPreTrack(docCoords);
    if (!preTrackCheck) {
      T3Util.Log("O.Opt StartNewObjectDraw - Output: Pre-track check failed");
      return;
    }

    // Determine if snapping should be enabled
    let hasLinkParam = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
    let needOverrideSnaps = T3Gv.opt.OverrideSnaps(inputEvent);
    hasLinkParam = hasLinkParam || needOverrideSnaps;
    const isSnapEnabled = T3Gv.docUtil.docConfig.enableSnap && !hasLinkParam;

    if (isSnapEnabled) {
      let snapRect = T3Gv.opt.drawShape.GetSnapRect();
      let dragRectCopy = T3Gv.opt.dragEnclosingRect ? Utils1.DeepCopy(T3Gv.opt.dragEnclosingRect) : snapRect;
      let actionBBoxCopy = Utils1.DeepCopy(T3Gv.opt.actionBBox);
      let offsetX = dragRectCopy.x - actionBBoxCopy.x;
      let offsetY = dragRectCopy.y - actionBBoxCopy.y;

      // Reposition the drag rectangle to center around the document coordinates
      dragRectCopy.x = docCoords.x - dragRectCopy.width / 2;
      dragRectCopy.y = docCoords.y - dragRectCopy.height / 2;

      // Calculate the adjusted offset for custom snap
      let adjustedOffset = {
        x: dragRectCopy.x - offsetX,
        y: dragRectCopy.y - offsetY
      };

      if (!T3Gv.opt.drawShape.CustomSnap(adjustedOffset.x, adjustedOffset.y, 0, 0, false, docCoords)) {
        if (T3Gv.docUtil.docConfig.centerSnap) {
          let snapPoint = T3Gv.docUtil.SnapToGrid(docCoords);
          docCoords.x = snapPoint.x;
          docCoords.y = snapPoint.y;
        } else {
          let tempSnapRect = $.extend(true, {}, snapRect);
          tempSnapRect.x = docCoords.x - snapRect.width / 2;
          tempSnapRect.y = docCoords.y - snapRect.height / 2;
          let snapAdjustment = T3Gv.docUtil.SnapRect(tempSnapRect);
          docCoords.x += snapAdjustment.x;
          docCoords.y += snapAdjustment.y;
        }
      }
    }

    // Set action coordinates based on document coordinates
    let docX = docCoords.x;
    let docY = docCoords.y;
    SelectUtil.ClearAnySelection(true);
    T3Gv.opt.actionStartX = docX;
    T3Gv.opt.actionStartY = docY;
    T3Gv.opt.actionBBox = { x: docX, y: docY, width: 1, height: 1 };
    T3Gv.opt.actionNewBBox = { x: docX, y: docY, width: 1, height: 1 };

    // Begin drawing the new shape
    let drawShape = T3Gv.opt.drawShape;
    this.InitializeAutoGrowDrag();
    UIUtil.ShowFrame(true);
    drawShape.LMDrawClick(docX, docY);
    this.AddNewObject(drawShape, !drawShape.bOverrideDefaultStyleOnDraw, false);

    // Retrieve the new object's ID from the active layer
    let layerZList = LayerUtil.ActiveLayerZList();
    let layerCount = layerZList.length;
    T3Gv.opt.actionStoredObjectId = layerZList[layerCount - 1];

    // If a circular link list exists, add the new object to it
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.lpCircList) {
      T3Gv.opt.linkParams.lpCircList.push(T3Gv.opt.actionStoredObjectId);
    }

    // Get the corresponding SVG object for the new object
    T3Gv.opt.actionSvgObject = T3Gv.opt.svgObjectLayer.GetElementById(T3Gv.opt.actionStoredObjectId);

    // Handle connection highlights if there is a connect index
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0) {
      HookUtil.HiliteConnect(T3Gv.opt.linkParams.SConnectIndex, T3Gv.opt.linkParams.SConnectPt, true, false, drawShape.BlockID, T3Gv.opt.linkParams.SConnectInside);
      T3Gv.opt.linkParams.SHiliteConnect = T3Gv.opt.linkParams.SConnectIndex;
      T3Gv.opt.linkParams.SHiliteInside = T3Gv.opt.linkParams.SConnectInside;
    }

    // Handle join highlights if there is a join index
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.SJoinIndex >= 0) {
      HookUtil.HiliteConnect(T3Gv.opt.linkParams.SJoinIndex, T3Gv.opt.linkParams.SConnectPt, true, true, drawShape.BlockID, null);
      T3Gv.opt.linkParams.SHiliteJoin = T3Gv.opt.linkParams.SJoinIndex;
    }

    T3Util.Log("O.Opt StartNewObjectDraw - Output: New object drawn with ID", T3Gv.opt.actionStoredObjectId);
  }

  /**
   * Stamp text object on tap done.
   * @param event - The tap event object.
   * @param optionalParam - An optional parameter.
   * @returns void
   */
  static StampTextObjectOnTapDone(event, optionalParam) {
    T3Util.Log("O.Opt StampTextObjectOnTapDone - Input:", { event, optionalParam });

    // T3Gv.opt.SetUIAdaptation(event);

    let objectIds = [];
    let docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );
    let isTextOnly = T3Gv.opt.drawShape.flags & NvConstant.ObjFlags.TextOnly;

    if (!isTextOnly) {
      let hasValidConnection = T3Gv.opt.linkParams && T3Gv.opt.linkParams.SConnectIndex >= 0;
      if (T3Gv.opt.OverrideSnaps(event)) {
        hasValidConnection = true;
      }
      if (T3Gv.docUtil.docConfig.enableSnap && !hasValidConnection) {
        docCoords = T3Gv.docUtil.SnapToGrid(docCoords);
      }
    }

    let adjustedX = docCoords.x - T3Gv.opt.drawShape.Frame.width / 2;
    let adjustedY = docCoords.y - T3Gv.opt.drawShape.Frame.height / 2;

    // Update the shape's frame position with stamp offsets
    T3Gv.opt.drawShape.Frame.x = adjustedX - T3Gv.opt.stampShapeOffsetX;
    T3Gv.opt.drawShape.Frame.y = adjustedY - T3Gv.opt.stampShapeOffsetY;

    // Synchronize the shape's size dimensions with its frame
    T3Gv.opt.drawShape.sizedim.width = T3Gv.opt.drawShape.Frame.width;
    T3Gv.opt.drawShape.sizedim.height = T3Gv.opt.drawShape.Frame.height;

    T3Gv.opt.drawShape.UpdateFrame(T3Gv.opt.drawShape.Frame);

    // Collab.AddNewBlockToSecondary(this.drawShape.BlockID);

    let collaborationData = {};

    DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, true);
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
      DataUtil.DeleteObjects(objectIds, false);
      objectIds = T3Gv.opt.moveList.slice(0);
      T3Gv.opt.actionStoredObjectId = -1;
    } else {
      DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
    }

    SvgUtil.RenderDirtySVGObjects();
    T3Gv.opt.moveList = null;

    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);

    this.CompleteOperation(objectIds);

    if (T3Gv.opt.stampCompleteCallback && T3Gv.opt.actionStoredObjectId >= 0) {
      T3Gv.opt.stampCompleteCallback(T3Gv.opt.actionStoredObjectId, T3Gv.opt.stampCompleteUserData);
    }
    T3Gv.opt.stampCompleteCallback = null;
    T3Gv.opt.stampCompleteUserData = null;

    T3Gv.opt.stampHCenter = false;
    T3Gv.opt.stampVCenter = false;
    T3Gv.opt.stampShapeOffsetX = 0;
    T3Gv.opt.stampShapeOffsetY = 0;

    LMEvtUtil.LMStampPostRelease(true);

    if (!isTextOnly) {
      objectIds.push(T3Gv.opt.actionStoredObjectId);
    }

    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);

    T3Util.Log("O.Opt StampTextObjectOnTapDone - Output:", { stampedShapeId: T3Gv.opt.actionStoredObjectId, objectIds });
  }

  /**
     * Stamps a new text shape upon tap event.
     * @param shape - The shape object to be stamped.
     * @param hCenter - True if the shape should be horizontally centered.
     * @param vCenter - True if the shape should be vertically centered.
     * @param operation - The operation mode for stamping.
     * @param isSticky - True if the stamp is sticky.
     * @param completeCallback - Callback function to be executed upon completion.
     * @param completeUserData - Additional user data to pass to the callback.
     */
  static StampNewTextShapeOnTap(shape, hCenter, vCenter, operation, isSticky, completeCallback, completeUserData) {
    T3Util.Log("O.Opt StampNewTextShapeOnTap - Input:", { shape, hCenter, vCenter, operation, isSticky, completeCallback, completeUserData });

    UIUtil.SetModalOperation(OptConstant.OptTypes.StampTextOnTap);
    T3Gv.opt.stampCompleteCallback = completeCallback || null;
    T3Gv.opt.stampCompleteUserData = completeUserData || null;
    T3Gv.opt.stampHCenter = hCenter;
    T3Gv.opt.stampVCenter = vCenter;
    T3Gv.opt.stampSticky = isSticky;
    T3Gv.opt.drawShape = shape;
    SelectUtil.ClearAnySelection(false);
    OptCMUtil.SetEditMode(NvConstant.EditState.Text);

    const WorkAreaHammerTap = (tapEvent) => {
      try {
        // T3Gv.opt.SetUIAdaptation(tapEvent);
        // if (Collab.AllowMessage()) {
        //   Collab.BeginSecondaryEdit();
        // }
        this.AddNewObject(shape, operation, false);
        const activeLayerZList = LayerUtil.ActiveLayerZList();
        const activeCount = activeLayerZList.length;
        T3Gv.opt.actionStoredObjectId = activeLayerZList[activeCount - 1];
        T3Gv.opt.actionSvgObject = T3Gv.opt.svgObjectLayer.GetElementById(T3Gv.opt.actionStoredObjectId);
        this.StampTextObjectOnTapDone(tapEvent, operation);
      } catch (error) {
        OptCMUtil.CancelOperation();
        T3Gv.opt.ExceptionCleanup(error);
        throw error;
      }
    };

    T3Gv.opt.WorkAreaHammer.on('tap', WorkAreaHammerTap);
    LMEvtUtil.LMStampPreTrack();

    T3Util.Log("O.Opt StampNewTextShapeOnTap - Output: Completed");
  }

  /**
     * Brings the selected objects to the front of the front-most layer.
     *
     * @returns void
     *
     * Explanation:
     * - Retrieves the front and back layer details for the current selection.
     * - If a selection exists (layerData.result is true), it calls BringToFrontOfSpecificLayer
     *   with the frontmost layer index.
     * - Logs the input and output with the prefix "O.Opt".
     */
  static BringToFrontOf(): void {
    T3Util.Log("O.Opt BringToFrontOf - Input: no parameters");

    const layerData = LayerUtil.GetFrontBackLayersForSelected();
    if (layerData.result) {
      this.BringToFrontOfSpecificLayer(layerData.frontmostindex);
    }

    T3Util.Log("O.Opt BringToFrontOf - Output: completed");
  }

  /**
   * Sends the selected objects to the front of a specific layer.
   * @param targetLayerIndex - The index of the target layer.
   * @param updateSelectedBlock - Optional flag indicating whether to update the selected block.
   */
  static BringToFrontOfSpecificLayer(targetLayerIndex: number, updateSelectedBlock?: any): void {
    T3Util.Log("O.Opt BringToFrontOfSpecificLayer - Input:", { targetLayerIndex, updateSelectedBlock });

    const selectedObjectBlock = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID);
    let selectedObjectList = Utils1.DeepCopy(selectedObjectBlock.Data);
    const selectedCount = selectedObjectList.length;

    if (selectedCount !== 0) {
      // Build a list of associated object IDs from the selected objects.
      const associatedList = T3Gv.opt.AddAssoctoList(selectedObjectList);
      const associatedCount = associatedList.length;

      if (associatedCount !== 0) {
        const visibleZList = LayerUtil.VisibleZList();
        if (visibleZList.length < 1) {
          T3Util.Log("O.Opt BringToFrontOfSpecificLayer - Output:", "No visible objects found");
          return;
        }

        // if (Collab.AllowMessage()) {
        //   Collab.BeginSecondaryEdit();
        // }

        // Map associated object IDs to their indices in the visible Z list.
        let indexArray: number[] = [];
        for (let i = 0; i < associatedCount; i++) {
          const objectId = associatedList[i];
          const indexInVisible = $.inArray(objectId, visibleZList);
          indexArray.push(indexInVisible);
        }

        // Sort the indices, then build a sorted list of object IDs.
        indexArray.sort((a, b) => a - b);
        let sortedAssociatedList: number[] = [];
        for (let i = 0; i < associatedCount; i++) {
          const sortedObjectId = visibleZList[indexArray[i]];
          sortedAssociatedList.push(sortedObjectId);
        }

        // Retrieve the preserved Z list for the target layer.
        const preservedZList = LayerUtil.ZListPreserveForLayer(targetLayerIndex);
        for (let i = 0; i < associatedCount; i++) {
          const objectId = sortedAssociatedList[i];
          LayerUtil.RemoveFromAllZLists(objectId);
          preservedZList.push(objectId);
        }

        HookUtil.UpdateLineHops(true);

        // if (Collab.AllowMessage()) {
        //   const messageData = { theTargetLayer: targetLayerIndex };
        //   Collab.BuildMessage(NvConstant.CollabMessages.BringToFrontOfSpecificLayer, messageData, true);
        // }

        if (updateSelectedBlock == null) {
          const preservedSelectedBlock = T3Gv.stdObj.PreserveBlock(T3Gv.opt.theSelectedListBlockID);
          preservedSelectedBlock.Data = associatedList;
        }

        SvgUtil.RenderAllSVGObjects();
        this.CompleteOperation();
        T3Util.Log("O.Opt BringToFrontOfSpecificLayer - Output:", "Operation completed");
      }
    }
  }

  /**
   * Checks if all objects in the group are allowed to be grouped.
   * It verifies that none of the objects are locked and that all hooks of each object
   * reference objects that are already part of the group.
   *
   * @param objectIds - Array of object IDs to be checked for grouping.
   * @returns True if grouping is allowed, false otherwise.
   */
  static AllowGroup(objectIds: number[]): boolean {
    T3Util.Log("O.Opt AllowGroup - Input:", objectIds);

    for (const objectId of objectIds) {
      const currentObject = DataUtil.GetObjectPtr(objectId, false);
      if (currentObject) {
        // If object has a lock flag, grouping is not allowed.
        if (currentObject.flags & NvConstant.ObjFlags.Lock) {
          T3Util.Log("O.Opt AllowGroup - Output: false");
          return false;
        }
        // Check each hook: if the hooked object is not in the group, grouping is not allowed.
        for (const hook of currentObject.hooks) {
          if (objectIds.indexOf(hook.objid) < 0) {
            T3Util.Log("O.Opt AllowGroup - Output: false");
            return false;
          }
        }
      }
    }

    T3Util.Log("O.Opt AllowGroup - Output: true");
    return true;
  }

  static ResetObjectDraw() {
    T3Util.Log('O.Opt ResetObjectDraw - Input: No parameters');

    // Reset object references
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;

    // Force update of object data
    DataUtil.GetObjectPtr(T3Gv.opt.actionStoredObjectId, true);

    // Reset edit mode to default
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Rebind default work area events
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);
    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);

    // Clear any modal operations
    UIUtil.SetModalOperation(OptConstant.OptTypes.None);

    T3Util.Log('O.Opt ResetObjectDraw - Output: Object draw state reset');
  }

  static PostObjectDraw(event?) {
    T3Util.Log('O.Opt PostObjectDraw - Input:', event);

    let affectedObjects = [];
    let actionObject = T3Gv.stdObj.GetObject(T3Gv.opt.actionStoredObjectId);

    if (actionObject != null) {
      if (actionObject.Data.Frame == null || (actionObject.Data.Frame.width < 10 && actionObject.Data.Frame.height < 10)) {
        ToolActUtil.Undo(true);
        DataUtil.ClearFutureUndoStates();
      } else {
        actionObject.Data.sizedim.width = actionObject.Data.Frame.width;
        actionObject.Data.sizedim.height = actionObject.Data.Frame.height;
        T3Gv.state.ReplaceInCurrentState(T3Gv.opt.actionStoredObjectId, actionObject);

        if (actionObject.Data.objecttype !== NvConstant.FNObjectTypes.FlWall) {
          affectedObjects.push(T3Gv.opt.actionStoredObjectId);
        }

        if (!LayerUtil.IsTopMostVisibleLayer()) {
          LayerUtil.MarkAllAllVisibleHigherLayerObjectsDirty();
        }

        DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
      }

      this.PostObjectDrawCommon(affectedObjects, event);
      T3Util.Log('O.Opt PostObjectDraw - Output:', affectedObjects.length);
      return affectedObjects.length;
    }

    this.PostObjectDrawCommon(null, event);
    T3Util.Log('O.Opt PostObjectDraw - Output: 0');
    return 0;
  }

  static PostObjectDrawCommon(affectedObjects, event) {
    T3Util.Log('O.Opt PostObjectDrawCommon - Input:', { affectedObjects, event });

    this.CompleteOperation(affectedObjects);
    this.ResetObjectDraw();
    // this.UpdateTools();

    if (T3Gv.wallOpt.PostObjectDrawHook) {
      T3Gv.wallOpt.PostObjectDrawHook(event);
    }

    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;

    T3Util.Log('O.Opt PostObjectDrawCommon - Output: Operation completed');
  }

  static AddNewObject(drawingObject, shouldStyleCopy, renderSelection?, textContent?) {
    T3Util.Log("O.Opt AddNewObject - Input:", { drawingObject, shouldStyleCopy, renderSelection, textContent });

    let nativeSymbolResult;
    let symbolTitle;
    let layerFlag = 16;
    let symbolData = null;
    let isStandardShape = false;

    // Ensure textContent defaults to null if not provided
    textContent = textContent || null;
    let symbolTitleForUpdate = '';

    if (drawingObject == null) {
      throw new Error('The drawing object is null');
    }

    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    if (shouldStyleCopy === undefined) {
      shouldStyleCopy = true;
    }

    // Copy default style if required.
    if (shouldStyleCopy) {
      drawingObject.StyleRecord = Utils1.DeepCopy(sessionData.def.style);
      if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        drawingObject.StyleRecord.Line = Utils1.DeepCopy(drawingObject.StyleRecord.Border);
        drawingObject.TMargins = Utils1.DeepCopy(sessionData.def.tmargins);
        drawingObject.TextFlags = Utils2.SetFlag(
          drawingObject.TextFlags,
          NvConstant.TextFlags.FormCR,
          (sessionData.def.textflags & NvConstant.TextFlags.FormCR) > 0
        );
      }
      let justification = sessionData.def.just;
      if (sessionData.def.vjust !== 'middle' && sessionData.def.vjust !== 'center') {
        justification = sessionData.def.vjust + '-' + sessionData.def.just;
      }
      drawingObject.TextAlign = justification;
    }

    // Apply forced dotted pattern if necessary.
    if (T3Gv.opt.forcedotted && drawingObject.StyleRecord) {
      drawingObject.StyleRecord.Line.LinePattern = T3Gv.opt.forcedotted;
      T3Gv.opt.forcedotted = null;
    }

    drawingObject.UpdateFrame(drawingObject.Frame);
    drawingObject.sizedim.width = drawingObject.Frame.width;
    drawingObject.sizedim.height = drawingObject.Frame.height;
    drawingObject.UniqueID = T3Gv.opt.uniqueId++;

    if (drawingObject.objecttype === NvConstant.FNObjectTypes.FlWall) {
      layerFlag = NvConstant.LayerFlags.UseEdges;
    }

    drawingObject.DataID = textContent ? TextUtil.CreateTextBlock(drawingObject, textContent) : -1;

    // Create new graphics block.
    const newBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.BaseDrawObject, drawingObject);
    if (newBlock == null) {
      throw new Error('AddNewObject got a null new graphics block allocation');
    }

    LayerUtil.ZListPreserve(layerFlag).push(newBlock.ID);

    const isBaseline = drawingObject instanceof Instance.Shape.BaseLine;
    const layersData = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);

    const isSpecialLayer = false;

    if (LayerUtil.IsTopMostVisibleLayer() || isBaseline || isSpecialLayer) {
      SvgUtil.RenderLastSVGObject(renderSelection);
    } else {
      SvgUtil.RenderLastSVGObject(renderSelection);
      LayerUtil.MarkAllAllVisibleHigherLayerObjectsDirty();
      SvgUtil.RenderDirtySVGObjectsNoSetMouse();
    }

    T3Gv.opt.actionBBox = $.extend(true, {}, drawingObject.Frame);
    T3Gv.opt.dragEnclosingRect = drawingObject.GetDragR();

    T3Util.Log("O.Opt AddNewObject - Output:", newBlock.ID);
    return newBlock.ID;
  }

  /**
   * Determines if the current drag operation should duplicate objects.
   * @param event - The event that triggered the drag
   * @returns True if duplication should occur, false otherwise
   */
  static DragDuplicate(event) {
    T3Util.Log("O.Opt DragDuplicate - Input:", event);

    if (event == null) {
      T3Util.Log("O.Opt DragDuplicate - Output: false (null event)");
      return false;
    }

    // Check for ctrl key press
    let isCtrlKeyPressed = event.ctrlKey;

    // Get ctrl key state from gesture event if available
    if (event.gesture && event.gesture.srcEvent) {
      isCtrlKeyPressed = event.gesture.srcEvent.ctrlKey;
    }

    // If ctrl key is pressed, check if the object type allows duplication
    if (isCtrlKeyPressed) {
      const targetObject = DataUtil.GetObjectPtr(T3Gv.opt.dragTargetId, false);
      const objectTypes = NvConstant.FNObjectTypes;
      const objectSubTypes = NvConstant.ObjectSubTypes;

      if (targetObject) {

        // // Tasks don't support duplication
        // if (targetObject.subtype === objectSubTypes.SD_SUBT_TASK) {
        //   isCtrlKeyPressed = false;
        // }

        // Objects with dataset elements don't support duplication
        if (targetObject.datasetElemID >= 0) {
          isCtrlKeyPressed = false;
        }
      }
    }

    T3Util.Log("O.Opt DragDuplicate - Output:", isCtrlKeyPressed);
    return isCtrlKeyPressed;
  }

  static CheckDragIsOverCustomLibrary(event) {
    T3Util.Log("O.Opt CheckDragIsOverCustomLibrary - Input:", event);

    // Always return false as the commented out code depends on SDUI which might not be available
    T3Util.Log("O.Opt CheckDragIsOverCustomLibrary - Output: false");
    return false;

    /* Original implementation:
    return event != null &&
      (SDUI.Commands.MainController.Symbols &&
       SDUI.Commands.MainController.Symbols.IsCursorOverSymbolLibraryGallery(
       event.gesture.center.clientX,
       event.gesture.center.clientY,
       true)
      );
    */
  }

  static AutoScrollCommon(event, snapEnabled, callback) {
    T3Util.Log("O.Opt AutoScrollCommon - Input:", { event, snapEnabled, callback });

    // if (callback == "HODDAS") {
    //   callback = this.HandleObjectDragDoAutoScroll;
    // }

    let clientX: number, clientY: number;
    let requiresAutoScroll = false;

    // Disable snap if override key is pressed
    if (T3Gv.opt.OverrideSnaps(event)) {
      snapEnabled = false;
    }

    // Get client coordinates from gesture or mouse event
    if (event.gesture) {
      clientX = event.gesture.center.clientX;
      clientY = event.gesture.center.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    // Initialize new positions with the current coordinates
    let newX = clientX;
    let newY = clientY;

    // Cache document display info for readability
    const docInfo = T3Gv.opt.svgDoc.docInfo;
    const dispX = docInfo.dispX;
    const dispY = docInfo.dispY;
    const dispWidth = docInfo.dispWidth;
    const dispHeight = docInfo.dispHeight;

    // Check horizontal boundaries
    if (clientX >= dispX + dispWidth - 8) {
      requiresAutoScroll = true;
      newX = dispX + dispWidth - 8 + 32;
    }
    if (clientX < dispX) {
      requiresAutoScroll = true;
      newX = dispX - 32;
    }

    // Check vertical boundaries
    if (clientY >= dispY + dispHeight - 8) {
      requiresAutoScroll = true;
      newY = dispY + dispHeight - 8 + 32;
    }
    if (clientY < dispY) {
      requiresAutoScroll = true;
      newY = dispY - 32;
    }

    if (requiresAutoScroll) {
      // Apply snapping if enabled and allowed
      if (snapEnabled && T3Gv.docUtil.docConfig.enableSnap) {
        let snapPoint = { x: newX, y: newY };
        snapPoint = T3Gv.docUtil.SnapToGrid(snapPoint);
        newX = snapPoint.x;
        newY = snapPoint.y;
      }
      T3Gv.opt.autoScrollXPos = newX;
      T3Gv.opt.autoScrollYPos = newY;
      if (T3Gv.opt.autoScrollTimerId !== -1) {
        T3Util.Log("O.Opt AutoScrollCommon - Output: Auto scroll already scheduled");
        return false;
      } else {
        T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(callback, 0);
        T3Util.Log("O.Opt AutoScrollCommon - Output: Auto scroll timer set", { newX, newY });
        return false;
      }
    } else {
      DrawUtil.ResetAutoScrollTimer();
      T3Util.Log("O.Opt AutoScrollCommon - Output: No auto scroll needed, timer reset");
      return true;
    }
  }


  static ResetAutoScrollTimer() {
    T3Util.Log('O.Opt ResetAutoScrollTimer - Input:');

    if (T3Gv.opt.autoScrollTimerId !== -1) {
      T3Gv.opt.autoScrollTimer.clearTimeout(T3Gv.opt.autoScrollTimerId);
      T3Gv.opt.autoScrollTimerId = -1;
    }

    T3Util.Log('O.Opt ResetAutoScrollTimer - Output: Timer reset');
  }

  static DoAutoGrowDrag(dragPoint: { x: number; y: number }): { x: number; y: number } {
    T3Util.Log("O.Opt DoAutoGrowDrag - Input:", dragPoint);

    // Ensure the drag point coordinates are non-negative
    if (dragPoint.x < 0) {
      dragPoint.x = 0;
    }
    if (dragPoint.y < 0) {
      dragPoint.y = 0;
    }

    let sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // If auto-grow is disabled by content header flags, constrain coordinates to session dimensions
    if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
      if (dragPoint.x > sessionData.dim.x) {
        dragPoint.x = sessionData.dim.x;
      }
      if (dragPoint.y > sessionData.dim.y) {
        dragPoint.y = sessionData.dim.y;
      }
      T3Util.Log("O.Opt DoAutoGrowDrag - Output:", dragPoint);
      return dragPoint;
    } else {
      let newDimension: { x: number; y: number };

      // Grow the document width if dragPoint.x exceeds the current dimension
      if (dragPoint.x > sessionData.dim.x) {
        T3Gv.opt.dragGotAutoResizeOldX.push(sessionData.dim.x);

        // Refresh session data from the preserved block
        sessionData = T3Gv.stdObj.PreserveBlock(T3Gv.opt.sdDataBlockId).Data;
        newDimension = {
          x: sessionData.dim.x +
            T3Gv.opt.header.Page.papersize.x -
            (T3Gv.opt.header.Page.margins.left +
              T3Gv.opt.header.Page.margins.right),
          y: sessionData.dim.y
        };

        T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDimension);
        sessionData.dim.x += T3Gv.opt.header.Page.papersize.x -
          (T3Gv.opt.header.Page.margins.left +
            T3Gv.opt.header.Page.margins.right);
        T3Gv.opt.inAutoScroll = true;
        UIUtil.ResizeSVGDocument();
        T3Gv.opt.inAutoScroll = false;
        T3Gv.opt.dragGotAutoResizeRight = true;
      }
      // Shrink the document width if auto-resizing was active and dragPoint.x is less than the last increased value
      else if (
        T3Gv.opt.dragGotAutoResizeRight &&
        dragPoint.x < T3Gv.opt.dragGotAutoResizeOldX.slice(-1).pop()
      ) {
        sessionData = T3Gv.stdObj.PreserveBlock(T3Gv.opt.sdDataBlockId).Data;
        newDimension = {
          x: T3Gv.opt.dragGotAutoResizeOldX.pop(),
          y: sessionData.dim.y
        };

        T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDimension);
        sessionData.dim.x = newDimension.x;
        T3Gv.opt.inAutoScroll = true;
        UIUtil.ResizeSVGDocument();
        T3Gv.opt.inAutoScroll = false;
        if (T3Gv.opt.dragGotAutoResizeOldX.length === 0) {
          T3Gv.opt.dragGotAutoResizeRight = false;
        }
      }

      // Grow the document height if dragPoint.y exceeds the current dimension
      if (dragPoint.y > sessionData.dim.y) {
        T3Gv.opt.dragGotAutoResizeOldY.push(sessionData.dim.y);

        sessionData = T3Gv.stdObj.PreserveBlock(T3Gv.opt.sdDataBlockId).Data;
        newDimension = {
          x: sessionData.dim.x,
          y: sessionData.dim.y +
            T3Gv.opt.header.Page.papersize.y -
            (T3Gv.opt.header.Page.margins.top +
              T3Gv.opt.header.Page.margins.bottom)
        };

        T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDimension);
        sessionData.dim.y += T3Gv.opt.header.Page.papersize.y -
          (T3Gv.opt.header.Page.margins.top +
            T3Gv.opt.header.Page.margins.bottom);
        T3Gv.opt.inAutoScroll = true;
        UIUtil.ResizeSVGDocument();
        T3Gv.opt.inAutoScroll = false;
        T3Gv.opt.dragGotAutoResizeBottom = true;
      }
      // Shrink the document height if auto-resizing was active and dragPoint.y is less than the last increased value
      else if (
        T3Gv.opt.dragGotAutoResizeBottom &&
        dragPoint.y < T3Gv.opt.dragGotAutoResizeOldY.slice(-1).pop()
      ) {
        sessionData = T3Gv.stdObj.PreserveBlock(T3Gv.opt.sdDataBlockId).Data;
        newDimension = {
          x: sessionData.dim.x,
          y: T3Gv.opt.dragGotAutoResizeOldY.pop()
        };

        T3Gv.opt.UpdateEdgeLayers([], sessionData.dim, newDimension);
        sessionData.dim.y = newDimension.y;
        T3Gv.opt.inAutoScroll = true;
        UIUtil.ResizeSVGDocument();
        T3Gv.opt.inAutoScroll = false;
        if (T3Gv.opt.dragGotAutoResizeOldY.length === 0) {
          T3Gv.opt.dragGotAutoResizeBottom = false;
        }
      }
      T3Util.Log("O.Opt DoAutoGrowDrag - Output:", dragPoint);
      return dragPoint;
    }
  }


  static CompleteOperation(
    selectionObjects?: any,
    preserveUndoState?: boolean,
    fitOption?: any,
    unusedParameter?: any
  ) {
    T3Util.Log("O.Opt CompleteOperation - Input:", { selectionObjects, preserveUndoState, fitOption, unusedParameter });

    // if (!Collab.NoRedrawFromSameEditor) {
    //   this.HideAllSVGSelectionStates();
    // }

    // if (!this.collaboration.NoRedrawFromSameEditor) {
    SvgUtil.HideAllSVGSelectionStates();
    // }

    DynamicUtil.DynamicSnapsRemoveGuides(T3Gv.opt.dynamicGuides);
    T3Gv.opt.dynamicGuides = null;
    T3Gv.opt.UpdateLinks();
    HookUtil.UpdateLineHops(true);

    // const noRedraw = Collab.NoRedrawFromSameEditor;
    // const noRedraw = this.collaboration.NoRedrawFromSameEditor;

    SvgUtil.RenderDirtySVGObjects();
    UIUtil.FitDocumentWorkArea(false, false, false, fitOption);

    // if (T3Gv.gTestException) {
    //   const error = new Error("in-complete operation");
    //   error.name = '1';
    //   throw error;
    // }

    if (selectionObjects /*&& Collab.AllowSelectionChange()*/) {
      SelectUtil.SelectObjects(selectionObjects, false, true);
    } else /*if (!noRedraw)*/ {
      SvgUtil.RenderAllSVGSelectionStates();
    }

    if (!preserveUndoState) {
      DataUtil.PreserveUndoState(false);
    }

    const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
    T3Gv.docUtil.ShowCoordinates(true);

    // if (Collab.AllowSelectionChange()) {
    //   this.UpdateSelectionAttributes(selectedList);
    // }

    T3Gv.opt.lastOpDuplicate = false;
    T3Gv.opt.ScrollObjectIntoView(-1, false);

    if (Clipboard && Clipboard.FocusOnClipboardInput) {
      Clipboard.FocusOnClipboardInput();
    }

    T3Util.Log("O.Opt CompleteOperation - Output: Operation completed.");
  }

  static AllowSnapToShapes() {
    T3Util.Log("O.Opt AllowSnapToShapes - Input: No parameters");

    // Get session data (unused in function but was in original code)
    DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    const result = T3Gv.docUtil.docConfig.snapToShapes;
    T3Util.Log("O.Opt AllowSnapToShapes - Output:", result);
    return result;
  }

}

export default DrawUtil
