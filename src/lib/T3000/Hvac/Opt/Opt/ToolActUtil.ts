

import $ from 'jquery';
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import Instance from "../../Data/Instance/Instance";
import StateConstant from "../../Data/State/StateConstant";
import T3Gv from '../../Data/T3Gv';
import Point from '../../Model/Point';
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import Utils3 from "../../Util/Utils3";
import ObjectUtil from "../Data/ObjectUtil";
import DSConstant from "../DS/DSConstant";
import ShapeUtil from '../Shape/ShapeUtil';
import UIUtil from "../UI/UIUtil";
import DrawUtil from "./DrawUtil";
import HookUtil from "./HookUtil";
import LayerUtil from "./LayerUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";
import SelectUtil from "./SelectUtil";
import SvgUtil from "./SvgUtil";
import TextUtil from "./TextUtil";
import ToolAct2Util from './ToolAct2Util';
import T3Clipboard from '../Clipboard/T3Clipboard';
import LogUtil from '../../Util/LogUtil';

class ToolActUtil {

  public static rflags;

  static Undo(restoreSequence?: boolean, cancelModalOperation?: boolean): boolean {
    LogUtil.Debug("O.Opt Undo - Input:", { restoreSequence, cancelModalOperation });

    // Cancel modal operation if required
    if (cancelModalOperation) {
      OptCMUtil.CancelOperation();
    } else if (T3Gv.opt.crtOpt !== OptConstant.OptTypes.None) {
      LogUtil.Debug("O.Opt Undo - Output:", false);
      return false;
    }

    // Make sure state manager exists
    if (T3Gv.state === null) {
      throw new Error('state is null');
    }

    // Close nudge if open and check state ID
    if (T3Gv.opt.nudgeOpen) {
      T3Gv.opt.CloseOpenNudge();
    }
    if (T3Gv.state.currentStateId <= 0) {
      LogUtil.Debug("O.Opt Undo - Output:", false);
      return false;
    }

    // Get session and layer data
    const sessionObject = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const spellCheckEnabled = sessionObject.EnableSpellCheck;
    const layersManager = ObjectUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    const activeLayerType = layersManager.layers[layersManager.activelayer].layertype;
    const teData = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // Check if text editing is active; flush text and preserve undo state if necessary
    const isTextEditingActive = teData.theActiveTextEditObjectID !== -1 &&
      teData.theTELastOp !== NvConstant.TextElemLastOpt.Init &&
      teData.theTELastOp !== NvConstant.TextElemLastOpt.Timeout &&
      teData.theTELastOp !== NvConstant.TextElemLastOpt.Select;
    if (isTextEditingActive) {
      this.FlushTextToLMBlock();
      ObjectUtil.PreserveUndoState(false);
    }

    // Determine if the state was open before undo
    const isStateOpen = Utils1.IsStateOpen();

    // Update sequence ID if required
    if (restoreSequence) {
      T3Gv.currentObjSeqId = T3Gv.state.states[T3Gv.state.currentStateId].currentObjSeqId;
    }

    // Restore previous state and update history if necessary
    T3Gv.state.RestorePrevState();
    if (!restoreSequence) {
      T3Gv.state.AddToHistoryState();
    }

    const currentStateId = T3Gv.state.currentStateId;
    OptCMUtil.RebuildURLs(currentStateId + 1, false);
    UIUtil.ResizeSVGDocument();
    HookUtil.UpdateLineHops(true);

    // Update spell check settings if changed
    const sessionBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (spellCheckEnabled !== sessionBlock.EnableSpellCheck) {
    }

    // Update ruler settings if necessary
    const rulerSettings = T3Gv.docUtil.rulerConfig;
    if (T3Gv.docUtil.RulersNotEqual(sessionObject.rulerConfig, rulerSettings)) {
      T3Gv.docUtil.SetRulers(sessionObject.rulerConfig, true);
    }

    // Update page settings if changed
    if (T3Gv.docUtil.PagesNotEqual(sessionObject.Page, T3Gv.opt.header.Page)) {
      T3Gv.opt.header.Page = Utils1.DeepCopy(sessionObject.Page);
    }

    // Ensure an active outline is selected if no selection exists
    const selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
    const tDataAfter = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    if (tDataAfter.theActiveOutlineObjectID !== -1 && selectedList.length === 0) {
      const activeOutlineObjects: number[] = [];
      activeOutlineObjects.push(tDataAfter.theActiveOutlineObjectID);
      SelectUtil.SelectObjects(activeOutlineObjects, false, false);
    }

    // Unregister text editor events, render objects and restore active text edit if necessary
    TextUtil.TEUnregisterEvents(true);
    T3Gv.opt.noUndo = true;
    SvgUtil.RenderAllSVGObjects();
    T3Gv.opt.noUndo = false;

    if (tDataAfter.theActiveTextEditObjectID !== -1) {
      this.ResetActiveTextEditAfterUndo();
    }

    // Update display coordinates based on target selection if available
    const targetSelect = SelectUtil.GetTargetSelect();
    if (targetSelect >= 0) {
      const selectedObject = ObjectUtil.GetObjectPtr(targetSelect, false);
      let dimensions = null;
      if (selectedObject) {
        dimensions = selectedObject.GetDimensionsForDisplay();
        UIUtil.ShowFrame(true);
      }
      UIUtil.UpdateDisplayCoordinates(dimensions, null, null, selectedObject);
    } else {
      UIUtil.ShowFrame(false);
    }

    // Update selection attributes and comments panels
    SelectUtil.UpdateSelectionAttributes(selectedList);

    // Save changed blocks if state was not open before undo
    if (!isStateOpen) {
      // ShapeUtil.SaveChangedBlocks(currentStateId, -1);
    }

    LogUtil.Debug("O.Opt Undo - Output:", true);
    return true;
  }

  /**
   * Restores the next state in the undo/redo history stack
   * @param shouldCancelModalOperation - Whether to cancel any active modal operations
   * @returns True if the redo operation was successful, false otherwise
   */
  static Redo(shouldCancelModalOperation?) {
    LogUtil.Debug("O.Opt Redo - Input:", { shouldCancelModalOperation });

    // Validate state exists
    if (null === T3Gv.state) {
      throw new Error('state is null');
    }

    // Handle modal operations
    if (shouldCancelModalOperation) {
      OptCMUtil.CancelOperation();
    }
    // Check if we're already at the last state
    else if (T3Gv.state.currentStateId + 1 >= T3Gv.state.states.length) {
      LogUtil.Debug("O.Opt Redo - Output: false (already at last state)");
      return false;
    }

    // Get the session data
    const sessionData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    const wasSpellCheckEnabled = sessionData.EnableSpellCheck;
    const hadNoRecentSymbols = false;// sessionData.RecentSymbols.length === 0;

    // Get text editing session
    const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

    // If active text editing is in progress, save it first
    if (textEditSession.theActiveTextEditObjectID !== -1 &&
      textEditSession.theTELastOp !== NvConstant.TextElemLastOpt.Init &&
      textEditSession.theTELastOp !== NvConstant.TextElemLastOpt.Timeout &&
      textEditSession.theTELastOp !== NvConstant.TextElemLastOpt.Select) {
      this.FlushTextToLMBlock();
      ObjectUtil.PreserveUndoState(false);
    }

    // Get layers manager and remember current layer type
    const layersManager = ObjectUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    const previousLayerType = layersManager.layers[layersManager.activelayer].layertype;

    // Clean up URLs before state change
    this.RedoDeleteURLs();

    // Check if a state is currently open
    const isStateOpen = Utils1.IsStateOpen();

    // Restore the next state and add to history
    T3Gv.state.RestoreNextState();
    T3Gv.state.AddToHistoryState();

    const currentStateId = T3Gv.state.currentStateId;

    // Rebuild URLs for the new state
    OptCMUtil.RebuildURLs(T3Gv.state.currentStateId - 1, true);

    // Resize and update the SVG document
    UIUtil.ResizeSVGDocument();
    HookUtil.UpdateLineHops(true);

    // Get updated session data after state restoration
    const updatDataData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Update rulers if changed
    const currentRulerSettings = T3Gv.docUtil.rulerConfig;
    if (T3Gv.docUtil.RulersNotEqual(updatDataData.rulerConfig, currentRulerSettings)) {
      T3Gv.docUtil.SetRulers(updatDataData.rulerConfig, true);
    }

    // Update page settings if changed
    if (T3Gv.docUtil.PagesNotEqual(updatDataData.Page, T3Gv.opt.header.Page)) {
      T3Gv.opt.header.Page = Utils1.DeepCopy(updatDataData.Page);
    }

    // Get the current selection list
    const selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);

    // Handle outline objects if needed
    const updatedTextEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    if (updatedTextEditSession.theActiveOutlineObjectID !== -1 && selectedList.length === 0) {
      const objectsToSelect = [];
      objectsToSelect.push(updatedTextEditSession.theActiveOutlineObjectID);
      SelectUtil.SelectObjects(objectsToSelect, false, false);
    }

    // Clean up text editor events and render all SVG objects
    TextUtil.TEUnregisterEvents(true);
    T3Gv.opt.InUndo = true;
    SvgUtil.RenderAllSVGObjects();
    T3Gv.opt.InUndo = false;

    // Get the updated session data
    const newSessionData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Reset active text edit after undo if needed
    if (updatedTextEditSession.theActiveTextEditObjectID !== -1) {
      this.ResetActiveTextEditAfterUndo();
    }

    // Update target selection display
    const targetSelectionId = SelectUtil.GetTargetSelect();
    if (targetSelectionId >= 0) {
      const targetObject = ObjectUtil.GetObjectPtr(targetSelectionId, false);
      let dimensionsForDisplay = null;

      if (targetObject) {
        dimensionsForDisplay = targetObject.GetDimensionsForDisplay();
        UIUtil.ShowFrame(true);
      }

      UIUtil.UpdateDisplayCoordinates(dimensionsForDisplay, null, null, targetObject);
    } else {
      UIUtil.ShowFrame(false);
    }

    // Handle layer type changes
    const updatedLayersManager = ObjectUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    const newLayerType = updatedLayersManager.layers[updatedLayersManager.activelayer].layertype;

    // Update selection attributes
    SelectUtil.UpdateSelectionAttributes(selectedList);

    LogUtil.Debug("O.Opt Redo - Output: true");
    return true;
  }

  /**
   * Deletes URLs associated with objects when redoing operations
   * This function prevents memory leaks by cleaning up blob URLs
   * when objects are deleted or their image URLs change during redo operations
   */
  static RedoDeleteURLs() {
    const currentStateId = T3Gv.state.currentStateId;

    // Skip if there are no future states to process
    if (currentStateId + 1 >= T3Gv.state.states.length) {
      return;
    }

    // Get the next state (the one we're redoing to)
    const nextState = T3Gv.state.states[currentStateId + 1];
    const storedObjectsCount = nextState.storedObjects.length;

    // Process each stored object in the next state
    for (let i = 0; i < storedObjectsCount; i++) {
      const storedObject = nextState.storedObjects[i];

      // Handle drawing objects
      if (storedObject.Type === StateConstant.StoredObjectType.BaseDrawObject) {
        // If the object is being deleted in this state
        if (storedObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
          const objectBlock = T3Gv.stdObj.GetObject(storedObject.ID);

          if (objectBlock) {
            const drawingObject = objectBlock.Data;

            // Delete the image URL if it's a blob URL
            if (OptCMUtil.IsBlobURL(drawingObject.ImageURL)) {
              OptCMUtil.DeleteURL(drawingObject.ImageURL);
            }
          }
        }
        // If the object is being modified
        else {
          const objectBlock = T3Gv.stdObj.GetObject(storedObject.ID);

          if (objectBlock) {
            const drawingObject = objectBlock.Data;

            // Delete the current image URL if it's a blob URL and different from the next state
            if (OptCMUtil.IsBlobURL(drawingObject.ImageURL) &&
              storedObject.Data.ImageURL !== drawingObject.ImageURL) {
              OptCMUtil.DeleteURL(drawingObject.ImageURL);
            }
          }
        }
      }
    }
  }

  /**
   * Adjusts the size of selected objects to match the target object's dimensions.
   * @param sizeOption - Option for resizing:
   *                     1: Match height only
   *                     2: Match width only
   *                     3: Match both width and height
   * @returns void
   */
  static MakeSameSize(sizeOption) {
    LogUtil.Debug("O.Opt MakeSameSize - Input:", { sizeOption });
    const selectedList = T3Gv.stdObj.GetObject(T3Gv.opt.selectObjsBlockId).Data;
    const selectedCount = selectedList.length;
    if (selectedCount <= 1) {
      LogUtil.Debug("O.Opt MakeSameSize - Output:", "Not enough objects selected");
      return;
    }
    const targetObjectId = SelectUtil.GetTargetSelect();
    if (targetObjectId === -1) {
      LogUtil.Debug("O.Opt MakeSameSize - Output:", "No target object selected");
      return;
    }
    // Get target object's frame (deep-copy using jQuery.extend)
    const targetObject = ObjectUtil.GetObjectPtr(targetObjectId, false);
    const targetFrame = $.extend(true, {}, targetObject.Frame);
    const targetHeight = targetFrame.height;
    const targetWidth = targetFrame.width;

    // Resize each selected object (skipping the target object)
    for (let index = 0; index < selectedCount; ++index) {
      const objectId = selectedList[index];
      if (objectId === targetObjectId) continue;
      const currentObject = ObjectUtil.GetObjectPtr(objectId, true);
      const originalFrame = Utils1.DeepCopy(currentObject.Frame);
      switch (sizeOption) {
        case 1:
          // Match height only
          currentObject.SetSize(null, targetHeight, 0);
          break;
        case 2:
          // Match width only
          currentObject.SetSize(targetWidth, null, 0);
          break;
        case 3:
          // Match both width and height
          currentObject.SetSize(targetWidth, targetHeight, 0);
          break;
        default:
          break;
      }
      if ((T3Gv.docUtil.docConfig.centerSnap && T3Gv.docUtil.docConfig.enableSnap) ||
        T3Gv.docUtil.docConfig.enableSnap === false) {
        const deltaX = (currentObject.Frame.width - originalFrame.width) / 2;
        const deltaY = (currentObject.Frame.height - originalFrame.height) / 2;
        if (deltaX || deltaY) {
          this.OffsetShape(objectId, -deltaX, -deltaY, 0);
        }
      }
      if (currentObject.rflags) {
        currentObject.rflags = Utils2.SetFlag(currentObject.rflags, NvConstant.FloatingPointDim.Width, false);
        currentObject.rflags = Utils2.SetFlag(currentObject.rflags, NvConstant.FloatingPointDim.Height, false);
      }
      OptCMUtil.SetLinkFlag(objectId, DSConstant.LinkFlags.Move);
      ObjectUtil.AddToDirtyList(objectId);
    }

    DrawUtil.CompleteOperation(null);
    LogUtil.Debug("O.Opt MakeSameSize - Output:", "Completed");
  }

  /**
   * Flips selected shapes based on the specified flip type.
   * @param flipType - The type of flip to apply. Should be one of the constant flags, e.g., SEDE_FlipVert or SEDE_FlipHoriz.
   * @returns void
   */
  static FlipShapes(flipType: number): void {
    LogUtil.Debug("O.Opt FlipShapes - Input:", { flipType });

    const isRotationQualified = (shape: any): boolean => {
      return !(Math.abs(shape.RotationAngle % 180) < 20) &&
        Math.abs(shape.RotationAngle % 90) < 20;
    };

    const selectedObjects = T3Gv.stdObj.GetObject(T3Gv.opt.selectObjsBlockId).Data;
    const count = selectedObjects.length;

    if (count !== 0) {
      let alternativeFlipType: number;
      let index = 0;
      let currentObject: any = null;
      let cannotFlipFound: boolean = false;

      alternativeFlipType = flipType === OptConstant.ExtraFlags.FlipVert
        ? OptConstant.ExtraFlags.FlipHoriz
        : OptConstant.ExtraFlags.FlipVert;

      for (index = 0; index < count; index++) {
        currentObject = ObjectUtil.GetObjectPtr(selectedObjects[index], false);
        if (currentObject.NoFlip()) {
          cannotFlipFound = true;
          break;
        }
      }

      if (cannotFlipFound) {
      } else {
        for (index = 0; index < count; index++) {
          currentObject = ObjectUtil.GetObjectPtr(selectedObjects[index], true);
          OptCMUtil.SetLinkFlag(selectedObjects[index], DSConstant.LinkFlags.Move);
          if (currentObject.hooks.length) {
            OptCMUtil.SetLinkFlag(currentObject.hooks[0].objid, DSConstant.LinkFlags.Move);
          }
          ObjectUtil.AddToDirtyList(selectedObjects[index]);
          if (isRotationQualified(currentObject)) {
            currentObject.Flip(alternativeFlipType);
          } else {
            currentObject.Flip(flipType);
          }
        }
        DrawUtil.CompleteOperation(null);
      }
    }

    LogUtil.Debug("O.Opt FlipShapes - Output: completed");
  }

  /**
   * Flips an array of vertex coordinates horizontally, vertically, or both.
   * @param vertices - Array of vertex objects with 'x' and 'y' properties, normalized between 0 and 1.
   * @param flipFlags - Bitmask flag that indicates the flip type. Use OptConstant.ExtraFlags.FlipHoriz for horizontal flip and OptConstant.ExtraFlags.FlipVert for vertical flip.
   * @returns The modified array of vertices after flipping.
   */
  static FlipVertexArray(vertices: { x: number, y: number }[], flipFlags: number): { x: number, y: number }[] {
    LogUtil.Debug("O.Opt FlipVertexArray - Input:", { vertices, flipFlags });

    const count = vertices.length;
    for (let i = 0; i < count; i++) {
      if (flipFlags & OptConstant.ExtraFlags.FlipHoriz) {
        vertices[i].x = 1 - vertices[i].x;
      }
      if (flipFlags & OptConstant.ExtraFlags.FlipVert) {
        vertices[i].y = 1 - vertices[i].y;
      }
    }

    LogUtil.Debug("O.Opt FlipVertexArray - Output:", vertices);
    return vertices;
  }

  /**
   * Sends the currently selected objects to the back layer.
   * Logs input and output with prefix O.Opt.
   */
  static SendToBackOf(): void {
    LogUtil.Debug("O.Opt SendToBackOf - Input: no parameters");
    const frontBackLayers = LayerUtil.GetFrontBackLayersForSelected();
    if (frontBackLayers.result) {
      // Send objects to the back of the lowest layer index
      this.SendToBackOfSpecificLayer(frontBackLayers.backmostindex);
    }
    LogUtil.Debug("O.Opt SendToBackOf - Output: completed");
  }

  /**
   * Sends the currently selected objects to a specific layer (back position).
   *
   * @param targetLayerIndex - The index of the target layer to send objects to.
   * @param updateSelectedBlock - (Optional) If provided, skip updating the selected list block.
   *
   * Logs input and output with prefix O.Opt.
   */
  static SendToBackOfSpecificLayer(targetLayerIndex: number, updateSelectedBlock?: any): void {
    LogUtil.Debug("O.Opt SendToBackOfSpecificLayer - Input:", { targetLayerIndex, updateSelectedBlock });

    // Get the selected object block from the global object store.
    const selectedObjectBlock = T3Gv.stdObj.GetObject(T3Gv.opt.selectObjsBlockId);
    let selectedList = selectedObjectBlock.Data;
    const selectedCount = selectedList.length;

    if (selectedCount !== 0) {
      // Get associated list ids from the selected list.
      const associatedList = T3Gv.opt.AddAssoctoList(selectedList, true);
      let associatedCount = associatedList.length;

      if (associatedCount !== 0) {
        const visibleZList = LayerUtil.VisibleZList();
        if (visibleZList.length >= 1) {

          // Create an array of indices of associated objects according to visible Z list order.
          const indexArray: number[] = [];
          for (let i = 0; i < associatedCount; i++) {
            const objectId = associatedList[i];
            const indexInVisible = $.inArray(objectId, visibleZList);
            indexArray.push(indexInVisible);
          }
          // Sort the indices in ascending order.
          indexArray.sort((a, b) => a - b);

          // Get the current Z-list for the target layer.
          const targetZList = LayerUtil.ZListPreserveForLayer(targetLayerIndex);
          const orderedObjectIds: number[] = [];
          // Build ordered list from visibleZList based on sorted indices.
          for (let i = 0; i < associatedCount; i++) {
            const objectId = visibleZList[indexArray[i]];
            orderedObjectIds.push(objectId);
          }
          // Remove from all Z-lists and add to the beginning of the target Z list.
          for (let i = orderedObjectIds.length - 1; i >= 0; i--) {
            const objectId = orderedObjectIds[i];
            LayerUtil.RemoveFromAllZLists(objectId);
            targetZList.unshift(objectId);
          }

          // Update line hops if necessary.
          HookUtil.UpdateLineHops(true);

          // If updateSelectedBlock parameter is not specified, update the selected list block.
          if (updateSelectedBlock == null) {
            const preservedBlock = T3Gv.stdObj.PreserveBlock(T3Gv.opt.selectObjsBlockId);
            preservedBlock.Data = associatedList;
          }
          // Re-render all SVG objects and complete the operation.
          SvgUtil.RenderAllSVGObjects();
          DrawUtil.CompleteOperation();
        }
      }
    }
    LogUtil.Debug("O.Opt SendToBackOfSpecificLayer - Output: completed");
  }

  /**
  * Pastes objects from clipboard based on the current context (text edit, table, etc.)
  * Handles different clipboard types and dispatches to appropriate paste handlers.
  *
  * @param event - The event that triggered the paste operation
  * @returns void
  */
  static PasteObjects(event?) {
    LogUtil.Debug("O.Opt PasteObjects - Input:", event);

    try {
      let activeEditor;
      let tableObject;
      const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

      if ((textEditSession.theActiveTextEditObjectID !== -1 || T3Gv.opt.bInNoteEdit)) {

        // Case 1.2: Paste text if the clipboard has text content
        if (T3Gv.opt.textClipboard && T3Gv.opt.textClipboard.text) {
          // Handle IE-specific line ending issues
          if (T3Clipboard.isInternetExplorer) {
            const textLength = T3Gv.opt.textClipboard.text.length;
            if (textLength >= 2 &&
              T3Gv.opt.textClipboard.text[textLength - 2] === '\r' &&
              T3Gv.opt.textClipboard.text[textLength - 1] === '\n') {
              T3Gv.opt.textClipboard.text = T3Gv.opt.textClipboard.text.slice(0, -2);
            }
          }

          // Paste text into active editor
          activeEditor = T3Gv.opt.svgDoc.GetActiveEdit();
          if (activeEditor) {
            TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Paste);
            activeEditor.Paste(T3Gv.opt.textClipboard, true);
            TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);
          }
        }
        LogUtil.Debug("O.Opt PasteObjects - Output: Text pasted in text editor");
        return;
      }

      // Case 2: We're in dimension editing mode
      if (T3Gv.opt.bInDimensionEdit) {
        if (T3Gv.opt.textClipboard && T3Gv.opt.textClipboard.text) {
          activeEditor = T3Gv.opt.svgDoc.GetActiveEdit();
          if (activeEditor) {
            activeEditor.Paste(T3Gv.opt.textClipboard, true);
          }
        }
        LogUtil.Debug("O.Opt PasteObjects - Output: Text pasted in dimension editor");
        return;
      }

      // Case 3: We have text and a target is selected
      if (T3Gv.opt.textClipboard &&
        T3Gv.opt.textClipboard.text &&
        T3Gv.opt.textClipboard.text !== '\r\n') {
        if (SelectUtil.GetTargetSelect() !== -1) {
          TextUtil.TargetPasteText();
          LogUtil.Debug("O.Opt PasteObjects - Output: Text pasted to target");
          return;
        }
      }

      // Case 4: Handle image clipboard content
      if (T3Gv.opt.imageClipboard &&
        T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.Image) {
        T3Gv.opt.SetBackgroundImage(T3Gv.opt.imageClipboard, 0);
        LogUtil.Debug("O.Opt PasteObjects - Output: Image pasted as background");
        return;
      }

      // Default case: Close any active edit and paste LM content
      T3Gv.opt.CloseEdit(false);

      if (T3Gv.opt.header.ClipboardBuffer &&
        T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.LM) {
        this.PasteLM(T3Gv.opt.header.ClipboardBuffer, T3Gv.opt.header.clipboardJson);
        LogUtil.Debug("O.Opt PasteObjects - Output: LM content pasted");
      } else {
        LogUtil.Debug("O.Opt PasteObjects - Output: No pasteable content found");
      }
    } catch (error) {
      LogUtil.Debug("O.Opt PasteObjects - Error:", error);
      throw error;
    }
  }

  static DeleteSelectedObjects() {
    this.DeleteSelectedObjectsCommon()
  }

  static DeleteSelectedObjectsCommon(objectIds, suppressCompleteOperation, preserveSelection, suppressCollabMessage) {
    LogUtil.Debug("O.Opt DeleteSelectedObjectsCommon - Input:", {
      objectIds,
      suppressCompleteOperation,
      preserveSelection,
      suppressCollabMessage
    });

    let idsCount = 0;
    if (objectIds) {
      idsCount = objectIds.length;
    }
    if (SelectUtil.AreSelectedObjects() || idsCount !== 0) {
      if (!preserveSelection) {
        T3Gv.opt.CloseEdit();
      }
      let deleteResult, nextSelect = OptAhUtil.GetNextSelect(), deleteList = [];
      const selectedObjects = T3Gv.stdObj.PreserveBlock(T3Gv.opt.selectObjsBlockId).Data;
      const objectsToDelete = objectIds || selectedObjects;

      deleteResult = T3Gv.opt.AddtoDelete(objectsToDelete, false, null);
      if (deleteResult >= 0) {
        nextSelect = deleteResult;
      }

      const objectsCount = objectsToDelete.length;
      ObjectUtil.DeleteObjects(objectsToDelete, false);

      if (!preserveSelection) {
        selectedObjects.splice(0);
        if (nextSelect >= 0) {
          deleteList.push(nextSelect);
        } else {
          SelectUtil.SetTargetSelect(-1, true);
        }
      }

      if (!suppressCompleteOperation) {
        DrawUtil.CompleteOperation(deleteList);
      }

      LogUtil.Debug("O.Opt DeleteSelectedObjectsCommon - Output:", true);
      return true;
    }
  }

  static AlignShapes(alignmentType) {
    LogUtil.Debug("O.Opt AlignShapes - Input:", { alignmentType });
    let offsetX, offsetY;
    let alignmentPerformed = false;
    const selectedObjects = T3Gv.stdObj.GetObject(T3Gv.opt.selectObjsBlockId).Data;
    const numSelected = selectedObjects.length;

    if (numSelected !== 0) {
      const targetSelected = SelectUtil.GetTargetSelect();
      let targetAlignRect = null;
      let lineThickness = 0;

      if (targetSelected !== -1) {
        const targetObject = ObjectUtil.GetObjectPtr(targetSelected, false);
        targetAlignRect = targetObject.GetAlignRect();
        lineThickness = targetObject.StyleRecord.Line.Thickness;
        let currentAlignRect, currentDirtyFrame;
        let currentObject = null;

        for (let i = 0; i < numSelected; ++i) {
          if (selectedObjects[i] === targetSelected) {
            continue;
          }
          currentDirtyFrame = null;
          currentObject = ObjectUtil.GetObjectPtr(selectedObjects[i], false);

          // Skip if object has hooks
          if (currentObject.hooks.length) {
            continue;
          }

          alignmentPerformed = true;
          currentObject = ObjectUtil.GetObjectPtr(selectedObjects[i], true);

          if (currentObject.FramezList && currentObject.FramezList.length) {
            currentDirtyFrame = currentObject.FramezList;
          }

          OptCMUtil.SetLinkFlag(selectedObjects[i], DSConstant.LinkFlags.Move);
          ObjectUtil.AddToDirtyList(selectedObjects[i], true);
          currentAlignRect = currentObject.GetAlignRect();

          switch (alignmentType) {
            case "lefts":
              offsetX = targetAlignRect.x - lineThickness / 2 - (currentAlignRect.x - currentObject.StyleRecord.Line.Thickness / 2);
              offsetY = 0;
              break;
            case "centers":
              offsetX = targetAlignRect.x + targetAlignRect.width / 2 - currentAlignRect.width / 2 - currentAlignRect.x;
              offsetY = 0;
              break;
            case "rights":
              offsetX = targetAlignRect.x + targetAlignRect.width + lineThickness / 2 -
                (currentAlignRect.x + currentAlignRect.width + currentObject.StyleRecord.Line.Thickness / 2);
              offsetY = 0;
              break;
            case "tops":
              offsetY = targetAlignRect.y - lineThickness / 2 - (currentAlignRect.y - currentObject.StyleRecord.Line.Thickness / 2);
              offsetX = 0;
              break;
            case "middles":
              offsetY = targetAlignRect.y + targetAlignRect.height / 2 - currentAlignRect.height / 2 - currentAlignRect.y;
              offsetX = 0;
              break;
            case "bottoms":
              offsetY = targetAlignRect.y + targetAlignRect.height + lineThickness / 2 -
                (currentAlignRect.y + currentAlignRect.height + currentObject.StyleRecord.Line.Thickness / 2);
              offsetX = 0;
              break;
            default:
              offsetX = 0;
              offsetY = 0;
          }

          currentObject.OffsetShape(offsetX, offsetY, currentDirtyFrame);

          // Reset offsets and then adjust if the shape goes out of bounds
          offsetX = 0;
          offsetY = 0;
          if (currentObject.r.x < 0) {
            offsetX = -currentObject.r.x;
          }
          if (currentObject.r.y < 0) {
            offsetY = -currentObject.r.y;
          }
          if (offsetX || offsetY) {
            currentObject.OffsetShape(offsetX, offsetY);
          }
        }

        if (alignmentPerformed) {
          DrawUtil.CompleteOperation(null);
        } else {
          LogUtil.Debug("O.Opt AlignShapes - Output: AlignHooked & UnBlockMessages");
        }
      }
    }

    LogUtil.Debug("O.Opt AlignShapes - Output:", { alignmentPerformed });
  }

  static RotateShapes(angleDegrees: number, selectionOverride?: any[]) {
    LogUtil.Debug("O.Opt RotateShapes - Input:", { angleDegrees, selectionOverride });
    let selectedList = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
    let sdData = ObjectUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (selectionOverride) {
      selectedList = selectionOverride;
    }
    let shape, textChild;
    let totalSelected = selectedList.length;
    if (totalSelected !== 0) {
      let centerPoint, rotationRadians, rotatedSubList, obj;
      let tempCounter = 0, removeIndex = 0, debugVal = null, deltaX = 0, deltaY = 0;
      // Check if any shape disallows rotation and log if found
      for (tempCounter = 0; tempCounter < totalSelected; tempCounter++) {
        shape = ObjectUtil.GetObjectPtr(selectedList[tempCounter], false);
        if (shape.NoRotate()) {
          break;
        }
      }
      if (shape && shape.NoRotate()) {
        LogUtil.Debug("O.Opt RotateShapes - NoRotate");
      } else {
        // Process PolyLineContainer groups
        for (tempCounter = 0; tempCounter < selectedList.length; tempCounter++) {
          shape = ObjectUtil.GetObjectPtr(selectedList[tempCounter], false);
          if (shape instanceof Instance.Shape.PolyLineContainer) {
            let enclosedObjects = shape.GetListOfEnclosedObjects(false);
            if (enclosedObjects.length > 0) {
              if (!DrawUtil.AllowGroup(enclosedObjects))
                LogUtil.Debug("O.Opt RotateShapes - GroupNotAllowed");
              if (T3Gv.opt.IsLinkedOutside(enclosedObjects))
                LogUtil.Debug("O.Opt RotateShapes - LinkedOutside");
              if (T3Gv.opt.IsGroupNonDelete())
                LogUtil.Debug("O.Opt RotateShapes - GroupNonDelete");
            }
          }
        }
        // Rotate objects inside containers and other objects
        for (tempCounter = 0; tempCounter < selectedList.length; tempCounter++) {
          // Process for PolyLine and PolyLineContainer objects
          shape = ObjectUtil.GetObjectPtr(selectedList[tempCounter], true);
          if (shape instanceof Instance.Shape.PolyLine && shape.rflags) {
            this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
            this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
          }
          if (shape instanceof Instance.Shape.PolyLineContainer) {
            OptCMUtil.SetLinkFlag(selectedList[tempCounter], DSConstant.LinkFlags.Move);
            ObjectUtil.AddToDirtyList(selectedList[tempCounter]);
            rotatedSubList = shape.RotateAllInContainer(shape.BlockID, angleDegrees);
            if (rotatedSubList && rotatedSubList.length) {
              for (removeIndex = selectedList.length - 1; removeIndex >= 0; removeIndex--) {
                if (rotatedSubList.indexOf(selectedList[removeIndex]) >= 0 && selectedList[removeIndex] !== shape.BlockID) {
                  selectedList.splice(removeIndex, 1);
                }
              }
            }
            // For PolyLineContainer or specific wall opt walls
            if (shape instanceof Instance.Shape.PolyLineContainer || shape.objecttype === NvConstant.FNObjectTypes.FlWall) {
              // Remove hooked objects related to container rotation
              for (removeIndex = selectedList.length - 1; removeIndex >= 0; removeIndex--) {
                obj = ObjectUtil.GetObjectPtr(selectedList[removeIndex], false);
                if (obj && obj.hooks.length && obj.hooks[0].objid === shape.BlockID) {
                  selectedList.splice(removeIndex, 1);
                }
              }
            }
          }
        }
        // Rotate remaining objects individually
        totalSelected = selectedList.length;
        for (tempCounter = 0; tempCounter < totalSelected; tempCounter++) {
          shape = ObjectUtil.GetObjectPtr(selectedList[tempCounter], true);
          if (!(shape instanceof Instance.Shape.PolyLineContainer)) {
            OptCMUtil.SetLinkFlag(selectedList[tempCounter], DSConstant.LinkFlags.Move);
            ObjectUtil.AddToDirtyList(selectedList[tempCounter]);
            if (shape instanceof Instance.Shape.BaseLine) {
              if (shape instanceof Instance.Shape.PolyLine) {
                // Rotate PolyLine via its poly points
                let center = {
                  x: shape.Frame.x + shape.Frame.width / 2,
                  y: shape.Frame.y + shape.Frame.height / 2
                };
                rotationRadians = 2 * Math.PI * ((360 - angleDegrees) / 360);
                let polyPoints = shape.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
                Utils3.RotatePointsAboutPoint(center, rotationRadians, polyPoints);
                let totalPoints = polyPoints.length;
                shape.StartPoint.x = polyPoints[0].x;
                shape.StartPoint.y = polyPoints[0].y;
                for (removeIndex = 0; removeIndex < totalPoints; removeIndex++) {
                  shape.polylist.segs[removeIndex].pt.x = polyPoints[removeIndex].x - shape.StartPoint.x;
                  shape.polylist.segs[removeIndex].pt.y = polyPoints[removeIndex].y - shape.StartPoint.y;
                }
                shape.EndPoint.x = polyPoints[totalPoints - 1].x;
                shape.EndPoint.y = polyPoints[totalPoints - 1].y;
                shape.CalcFrame();
              } else {
                // Rotate BaseLine using midpoint and radius rotation
                T3Gv.opt.ob = Utils1.DeepCopy(shape);
                let midX = (shape.StartPoint.x + shape.EndPoint.x) / 2;
                let midY = (shape.StartPoint.y + shape.EndPoint.y) / 2;
                let distance = Math.sqrt(
                  Math.pow(shape.EndPoint.x - shape.StartPoint.x, 2) +
                  Math.pow(shape.EndPoint.y - shape.StartPoint.y, 2)
                );
                rotationRadians = 2 * Math.PI * (angleDegrees / 360);
                distance /= 2;
                shape.StartPoint.x = midX - Math.cos(rotationRadians) * distance;
                shape.StartPoint.y = midY - Math.sin(rotationRadians) * distance;
                shape.EndPoint.x = midX + Math.cos(rotationRadians) * distance;
                shape.EndPoint.y = midY + Math.sin(rotationRadians) * distance;
                shape.AfterRotateShape(shape.BlockID);
                T3Gv.opt.ob = {};
              }
            } else {
              shape.RotationAngle = angleDegrees;
              shape.UpdateFrame(shape.Frame);

              if (T3Gv.opt.header.flags & OptConstant.HeaderFlags.NoAuto) {
                let rightBoundary = shape.r.x + shape.r.width;
                let bottomBoundary = shape.r.y + shape.r.height;
                let offsetX = 0, offsetY = 0;
                if (rightBoundary > sdData.dim.x) {
                  offsetX = sdData.dim.x - rightBoundary;
                }
                if (bottomBoundary > sdData.dim.y) {
                  offsetY = sdData.dim.y - bottomBoundary;
                }
                if (shape.r.x < 0) {
                  offsetX = -shape.r.x;
                }
                if (shape.r.y < 0) {
                  offsetY = -shape.r.y;
                }
                if (offsetX || offsetY) {
                  shape.OffsetShape(offsetX, offsetY);
                }
              }
            }
          }
        }
        if (selectionOverride == null) {
          DrawUtil.CompleteOperation(null);
        }
      }
    }
    LogUtil.Debug("O.Opt RotateShapes - Output: Rotation applied on selection, remaining count:", selectedList.length);
  }

  /**
   * Duplicates the currently selected objects with an optional displacement
   * @param fromMove - If true, duplicates objects without displacement
   * @param editOverride - Optional secondary edit object for override parameters
   * @returns Array of duplicated object IDs
   */
  static DuplicateObjects(fromMove, editOverride) {
    LogUtil.Debug("O.Opt DuplicateObjects - Input:", { fromMove, editOverride });

    const result = {
      selectedList: []
    };

    T3Gv.opt.CloseEdit();

    // Only proceed if there are selected objects
    if (SelectUtil.AreSelectedObjects()) {
      // Get session object with preservation based on whether this is a repeat operation
      const sessionObject = ObjectUtil.GetObjectPtr(
        T3Gv.opt.sdDataBlockId,
        !T3Gv.opt.lastOpDuplicate && !editOverride
      );

      // Determine displacement for duplicated objects
      if (fromMove) {
        // No displacement when duplicating from move
        sessionObject.dupdisp.x = 0;
        sessionObject.dupdisp.y = 0;
      } else if (editOverride) {
        // Use displacement from override if provided
        sessionObject.dupdisp.x = editOverride.Data.dupdisp.x;
        sessionObject.dupdisp.y = editOverride.Data.dupdisp.y;
      } else if (!T3Gv.opt.lastOpDuplicate) {
        // Default displacement for first duplication
        sessionObject.dupdisp.x = 50;
        sessionObject.dupdisp.y = 50;
      }

      // Get the current selection list
      const selectedList = ObjectUtil.GetObjectPtr(
        T3Gv.opt.selectObjsBlockId,
        false
      );

      // Prepare collaboration message if needed
      if (!editOverride) {
        const messageData = {
          fromMove: fromMove,
          dupdisp: Utils1.DeepCopy(sessionObject.dupdisp),
          selectedList: Utils1.DeepCopy(selectedList),
          tselect: Utils1.DeepCopy(sessionObject.tselect)
        };
      }

      // Copy selected objects
      const copyResult = this.CopyObjectsCommon(true);

      if (copyResult && copyResult.buffer) {
        // Get the frame of the first copied object
        const firstObjectFrame = ObjectUtil.GetObjectPtr(copyResult.zList[0], false).Frame;

        // Read and create duplicated objects from the buffer with displacement
        ShapeUtil.ReadSymbolFromBuffer(
          copyResult.buffer,
          firstObjectFrame.x + sessionObject.dupdisp.x,
          firstObjectFrame.y + sessionObject.dupdisp.y,
          0,
          false,
          true,
          result,
          !fromMove,
          false,
          false,
          false,
          false
        );

        // Complete the operation if not from move
        if (!fromMove) {
          DrawUtil.CompleteOperation(result.selectedList);

          // Mark as a duplicate operation for subsequent calls
          if (!editOverride) {
            T3Gv.opt.lastOpDuplicate = true;
          }
        }
      }
    }

    LogUtil.Debug("O.Opt DuplicateObjects - Output:", result.selectedList);
    return result.selectedList;
  }

  /**
   * Copies selected objects or text based on the current editing mode.
   * @returns The clipboard content after the copy operation.
   */
  static CopyObjects(): any {
    LogUtil.Debug("O.Opt CopyObjects - Input:");

    const activeTextEditorSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    let clipboardContent: any;

    if (
      activeTextEditorSession.theActiveTextEditObjectID !== -1 ||
      T3Gv.opt.bInNoteEdit ||
      T3Gv.opt.bInDimensionEdit
    ) {
      const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
      if (activeEditElement) {
        const copiedText = activeEditElement.Copy(true);
        if (copiedText) {
          T3Gv.opt.textClipboard = copiedText;
        }
        T3Gv.opt.header.ClipboardBuffer = null;
        T3Gv.opt.header.clipboardJson = null;
        T3Gv.opt.header.ClipboardType = T3Constant.ClipboardType.Text;
      }
      clipboardContent = T3Gv.opt.textClipboard;
      LogUtil.Debug("O.Opt CopyObjects - Output:", clipboardContent);
      return clipboardContent;
    }

    if (!SelectUtil.AreSelectedObjects()) {
      LogUtil.Debug("O.Opt CopyObjects - Output: No selected objects");
      return;
    }
    T3Gv.opt.CloseEdit();
    this.CopyObjectsCommon(false);
    T3Gv.opt.textClipboard = null;

    const selectedObjectBlock = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
    SelectUtil.UpdateSelectionAttributes(selectedObjectBlock);

    clipboardContent = T3Gv.opt.header.ClipboardBuffer;

    clipboardContent = T3Gv.opt.header.clipboardJson;

    LogUtil.Debug("O.Opt CopyObjects - Output:", clipboardContent);
    return clipboardContent;
  }

  /**
   * Pastes objects from the provided buffer at the computed paste position.
   * @param buffer - The buffer containing the object data.
   * @returns An array of selected object IDs that were pasted.
   */
  static PasteLM(buffer: string, jsonData: any): number[] {
    LogUtil.Debug("O.Opt PasteLM - Input:", buffer);

    const resultWrapper = { selectedList: [] as number[] };
    // Determine the paste position: use global paste point if set, otherwise get paste position.
    const pastePosition = T3Gv.opt.PastePoint || this.GetPastePosition();
    let messagePayload: any = {};

    // Read symbol from buffer and update resultWrapper.selectedList accordingly.
    ShapeUtil.ReadSymbolFromBuffer(
      buffer,
      pastePosition.x,
      pastePosition.y,
      0,
      false,
      true,
      resultWrapper,
      true,
      false,
      false,
      false,
      false
    );

    T3Gv.opt.PastePoint = null;
    DrawUtil.CompleteOperation(resultWrapper.selectedList);

    LogUtil.Debug("O.Opt PasteLM - Output:", resultWrapper.selectedList);
    return resultWrapper.selectedList;
  }

  /**
   * Gets the paste position for new objects.
   * This function calculates the paste position based on the current work area scroll offsets and
   * the document's scaling factor. A fixed offset is applied to the scroll position. If the current
   * scroll position matches the previous one, the paste position is further adjusted by incremental
   * offsets to avoid overlapping paste operations.
   * @returns An object containing the computed x and y coordinates for the paste position.
   */
  static GetPastePosition(): { x: number; y: number } {
    LogUtil.Debug("= u.ToolActUtil: GetPastePosition/ - Input: no parameters");

    const offset = 100;
    const workArea = T3Gv.docUtil.svgDoc.GetWorkArea();
    let scale = T3Gv.docUtil.svgDoc.docInfo.docToScreenScale;
    if (scale == null || scale === 0) {
      scale = 1;
    }

    let pastePosition = {
      x: (workArea.scrollX + offset) / scale,
      y: (workArea.scrollY + offset) / scale
    };

    if (
      workArea.scrollX === T3Gv.opt.topLeftPasteScrollPos.x &&
      workArea.scrollY === T3Gv.opt.topLeftPasteScrollPos.y
    ) {
      pastePosition = T3Gv.opt.topLeftPastePos;
      pastePosition.x += 50;
      pastePosition.y += 50;
      T3Gv.opt.pasteCount++;
      if (T3Gv.opt.pasteCount > 5) {
        T3Gv.opt.pasteCount = 0;
        pastePosition = {
          x: (workArea.scrollX + offset) / scale,
          y: (workArea.scrollY + offset) / scale
        };
      }
    } else {
      T3Gv.opt.pasteCount = 0;
    }

    T3Gv.opt.topLeftPastePos = {
      x: pastePosition.x,
      y: pastePosition.y
    };
    T3Gv.opt.topLeftPasteScrollPos = {
      x: workArea.scrollX,
      y: workArea.scrollY
    };

    LogUtil.Debug("O.Opt GetPastePosition - Output:", pastePosition);
    return pastePosition;
  }

  /**
   * Cuts the selected objects from the document.
   * Depending on the editing mode, it will either cut text from an active text editor
   * or cut graphic/table objects.
   *
   * @param isFromCutButton - Boolean flag that indicates whether the cut was triggered by a button click.
   * @returns void
   */
  static CutObjects(isFromCutButton?: boolean): void {

    LogUtil.Debug("O.Opt CutObjects - Input:", { isFromCutButton });
    try {
      // If a cut is already in progress from a button and this call is from a button, cancel further processing.
      if (T3Gv.opt.cutFromButton && isFromCutButton) {
        T3Gv.opt.cutFromButton = false;
        LogUtil.Debug("O.Opt CutObjects - Output:", "Cut cancelled due to active cut button state.");
        return;
      }

      // Set the cut button flag based on the trigger.
      T3Gv.opt.cutFromButton = !isFromCutButton;

      // Check if we are in a text editing mode or note/dimension edit mode.
      const textEditSession = ObjectUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      if (
        textEditSession.theActiveTextEditObjectID !== -1 ||
        T3Gv.opt.bInNoteEdit ||
        T3Gv.opt.bInDimensionEdit
      ) {
        const activeTextEditor = T3Gv.opt.svgDoc.GetActiveEdit();
        if (activeTextEditor) {
          T3Gv.opt.textClipboard = activeTextEditor.Copy(true);
          // Collab.BeginSecondaryEdit();
          TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Cut);
          activeTextEditor.Delete();
          T3Gv.opt.header.ClipboardBuffer = null;
          T3Gv.opt.header.clipboardJson = null;
          T3Gv.opt.header.ClipboardType = T3Constant.ClipboardType.Text;
          TextUtil.RegisterLastTEOp(NvConstant.TextElemLastOpt.Timeout);
        }
        LogUtil.Debug("O.Opt CutObjects - Output:", "Text cut completed.");
        return;
      }

      // If there are no selected objects, exit.
      if (!SelectUtil.AreSelectedObjects()) {
        LogUtil.Debug("O.Opt CutObjects - Output:", "No selected objects to cut.");
        return;
      }

      // For graphic objects: close any active edit, copy objects to clipboard, and delete selected objects.
      T3Gv.opt.CloseEdit();
      this.CopyObjectsCommon(false);
      this.DeleteSelectedObjectsCommon();

      // localStorage.setItem('after-cut-stdObj', JSON.stringify(T3Gv.stdObj));
      // localStorage.setItem('after-cut-state', JSON.stringify(T3Gv.state));


      LogUtil.Debug("O.Opt CutObjects - Output:", "Graphic objects cut completed.");
    } catch (error) {
      T3Gv.opt.RestorePrimaryStateManager();
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("O.Opt CutObjects - Output:", "Error occurred during cut operation.");
      throw error;
    }
  }

  /**
   * Copies the selected objects to clipboard.
   * @param returnBuffer - If true, returns an object with zList and buffer; otherwise, updates the clipboard buffer.
   * @returns An object with zList and buffer if returnBuffer is true; otherwise, no explicit return.
   */
  static CopyObjectsCommon(returnBuffer: boolean): { zList: any[]; buffer: string } | void {
    LogUtil.Debug("= u.ToolActUtil: CopyObjectsCommon/ - Input:", { returnBuffer });

    // Retrieve the currently selected objects.
    const selectedObjects = T3Gv.stdObj.GetObject(T3Gv.opt.selectObjsBlockId).Data;

    // Prepare deletion options with connectors flag set to false.
    const options = { connectors: false };
    T3Gv.opt.AddtoDelete(selectedObjects, true, options);

    // Retrieve the global z-order list and prepare an index array.
    const zOrderList = LayerUtil.ZList();

    const selectedCount = selectedObjects.length;
    if (selectedCount !== 0) {

      const indexArray: number[] = [];
      for (let i = 0; i < selectedCount; i++) {
        const objectId = selectedObjects[i];
        // Find the index of the selected object in the z-order list.
        const indexInZList = $.inArray(objectId, zOrderList);
        indexArray.push(indexInZList);
      }

      // Sort the indices in ascending order.
      indexArray.sort((a, b) => a - b);

      // Build a sorted list of objects based on their index in the z-order.
      const sortedObjects: any[] = [];
      for (let i = 0; i < selectedCount; i++) {
        const sortedObjId = zOrderList[indexArray[i]];
        sortedObjects.push(sortedObjId);
      }

      // Otherwise update the clipboard buffer and clipboard type.
      T3Gv.opt.header.ClipboardBuffer = ShapeUtil.WriteSelect(sortedObjects, false, true, false);
      T3Gv.opt.header.ClipboardType = T3Constant.ClipboardType.LM;

      // Refresh the selected objects list by removing any objects that are not visible.
      const updatedSelectedObjects = ObjectUtil.GetObjectPtr(T3Gv.opt.selectObjsBlockId, false);
      for (let i = updatedSelectedObjects.length - 1; i >= 0; i--) {
        const currentObject = ObjectUtil.GetObjectPtr(updatedSelectedObjects[i], false);
        if (currentObject && (currentObject.flags & NvConstant.ObjFlags.NotVisible)) {
          updatedSelectedObjects.splice(i, 1);
        }
      }
      LogUtil.Debug("= u.ToolActUtil: CopyObjectsCommon/ - Output: Clipboard updated");
    } else {
      LogUtil.Debug("= u.ToolActUtil: CopyObjectsCommon/ - Output: No objects selected");
    }

    return { buffer: T3Gv.opt.header.ClipboardBuffer, zList: zOrderList };
  }

  /**
   * Ungroups a shape by extracting its constituent shapes and applying any transformations
   * @param groupId - ID of the group to ungroup
   * @param maintainLinksFlag - Flag to determine how to maintain links (true for value 2, false for normal behavior)
   * @returns void
   */
  static UngroupShape(groupId, maintainLinksFlag?) {
    LogUtil.Debug("O.Opt UngroupShape - Input:", { groupId, maintainLinksFlag });

    // Arrays to track different object types
    let commentIds = [];
    let containerIds = [];
    let objectsForLinkMaintenance = [];
    let index, hookIndex, widthOffset, styleIndex;

    // References to objects and structures we'll need
    let newObject = null;
    let existingObject = null;
    let linksList = ObjectUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);

    // Constants for flip operations
    const FLIP_VERTICAL = OptConstant.ExtraFlags.FlipVert;
    const FLIP_HORIZONTAL = OptConstant.ExtraFlags.FlipHoriz;

    // Get the group object
    const groupObject = ObjectUtil.GetObjectPtr(groupId, true);

    // Get the frame of the group and its center point
    const groupFrame = groupObject.Frame;
    const groupCenter = {
      x: groupFrame.x + groupFrame.width / 2,
      y: groupFrame.y + groupFrame.height / 2
    };

    // Get the shapes in the group and count them
    const shapesInGroup = groupObject.ShapesInGroup;
    const shapeCount = shapesInGroup.length;

    // If there are no shapes in the group, nothing to do
    if (shapeCount === 0) {
      LogUtil.Debug("O.Opt UngroupShape - Output: No shapes in group");
      return;
    }

    // Get the position and calculate scale factors
    const groupX = groupFrame.x;
    const groupY = groupFrame.y;
    let scaleX = groupFrame.width / groupObject.InitialGroupBounds.width;

    if (isNaN(scaleX)) {
      scaleX = 1;
    }

    let scaleY = groupFrame.height / groupObject.InitialGroupBounds.height;
    if (isNaN(scaleY)) {
      scaleY = 1;
    }

    // Get the z-list with preserved state
    LayerUtil.ZListPreserve();

    // Process each shape in the group
    for (index = 0; index < shapeCount; ++index) {
      // Get the current shape from the group
      const currentShape = ObjectUtil.GetObjectPtr(shapesInGroup[index], true);

      // Track comment IDs
      if (currentShape.commentId >= 0) {
        commentIds.push(currentShape.commentId);
      }

      // Track container objects
      if (currentShape instanceof Instance.Shape.ShapeContainer) {
        containerIds.push(currentShape.BlockID);
      }

      // Create a deep copy for maintaining links
      newObject = new Instance.Shape.BaseDrawObject(null);
      newObject = Utils1.DeepCopy(currentShape);
      newObject.Frame.x += groupX;
      newObject.Frame.y += groupY;

      // Adjust start and end points if they exist
      if (currentShape.StartPoint) {
        newObject.StartPoint.x += groupX;
        newObject.StartPoint.y += groupY;
      }

      if (currentShape.EndPoint) {
        newObject.EndPoint.x += groupX;
        newObject.EndPoint.y += groupY;
      }

      // Save the copy for later use
      objectsForLinkMaintenance.push(newObject);

      // Convert GroupSymbol to native format if needed
      if (currentShape instanceof Instance.Shape.GroupSymbol &&
        currentShape.NativeID < 0) {
        currentShape.ConvertToNative(T3Gv.opt.richGradients, false);
      }

      // Scale the object based on group parameters
      currentShape.ScaleObject(
        groupX,
        groupY,
        groupCenter,
        groupObject.RotationAngle,
        scaleX,
        scaleY,
        true
      );

      widthOffset = 0;

      // Apply vertical flip if needed
      if (groupObject.extraflags & FLIP_VERTICAL) {
        currentShape.Flip(FLIP_VERTICAL);
      }

      // Apply horizontal flip if needed
      if (groupObject.extraflags & FLIP_HORIZONTAL) {
        widthOffset = groupFrame.width -
          (currentShape.Frame.x + currentShape.Frame.width - groupFrame.x) -
          currentShape.Frame.x + groupFrame.x;
        currentShape.Flip(FLIP_HORIZONTAL);
      }

      // Apply width offset if needed
      if (widthOffset) {
        currentShape.OffsetShape(widthOffset, 0);
      }

      // Scale text if needed
      if (currentShape.DataID !== -1 && scaleY !== 1) {
        const textStyles = ObjectUtil.GetObjectPtr(currentShape.DataID, true).runtimeText.styles;
        const styleCount = textStyles.length;

        for (styleIndex = 0; styleIndex < styleCount; ++styleIndex) {
          textStyles[styleIndex].size *= scaleY;
        }
      }

      // Mark as no longer in a group
      currentShape.bInGroup = false;

      // Add to dirty list and rebuild links
      ObjectUtil.AddToDirtyList(shapesInGroup[index]);
      T3Gv.opt.RebuildLinks(linksList, shapesInGroup[index]);
    }

    // Insert the shapes into the layer at the group's position
    LayerUtil.InsertObjectsIntoLayerAt(groupId, shapesInGroup);

    // Maintain links for each shape
    for (index = 0; index < objectsForLinkMaintenance.length; index++) {
      T3Gv.opt.ob = objectsForLinkMaintenance[index];
      existingObject = ObjectUtil.GetObjectPtr(objectsForLinkMaintenance[index].BlockID, false);

      const linkMode = maintainLinksFlag ? 2 : false;

      HookUtil.MaintainLink(
        objectsForLinkMaintenance[index].BlockID,
        existingObject,
        T3Gv.opt.ob,
        OptConstant.ActionTriggerType.Flip,
        linkMode
      );
    }

    // Clear the temporary object reference
    T3Gv.opt.ob = {};

    // Update link flags for containers
    const containerCount = containerIds.length;
    for (index = 0; index < containerCount; index++) {
      OptCMUtil.SetLinkFlag(containerIds[index], DSConstant.LinkFlags.Move);
    }

    // Update all links
    T3Gv.opt.UpdateLinks();

    // Clear the shapes list from the group
    groupObject.ShapesInGroup = [];

    // Delete the group object
    ObjectUtil.DeleteObjects([groupId], false);

    // Handle comment ungrouping if needed
    if (commentIds.length) {
      T3Gv.opt.CommentUngroup(commentIds);
    }

    // Render all dirty SVG objects
    SvgUtil.RenderDirtySVGObjects();

    LogUtil.Debug("O.Opt UngroupShape - Output: Successfully ungrouped", shapeCount, "shapes");
  }

  /**
   * Groups selected objects into a single group shape
   * @param returnValueFlag - Flag to determine if function should return the group ID
   * @param customSelectionList - Optional custom selection list to use instead of current selection
   * @param skipValidation - If true, skips validation checks for grouping
   * @param preventRedraw - If true, prevents automatic redrawing of SVG objects
   * @param enableCollaboration - If true, enables collaboration messaging
   * @returns The ID of the new group or false if grouping failed
   */
  static GroupSelected(returnValueFlag, customSelectionList, skipValidation, preventRedraw, enableCollaboration) {
    new ToolAct2Util().GroupSelectedShapes(returnValueFlag, customSelectionList, skipValidation, preventRedraw, enableCollaboration);
  }

  /**
  * Ungroups selected shapes.
  * @returns {boolean} True if the ungroup operation was performed, false otherwise.
  */
  static UnGroupSelected() {
    new ToolAct2Util().UngroupSelectedShapes();
  }

  /**
   * Rotates a rectangle by a specified angle around a center point
   * @param rectangle - The rectangle to rotate
   * @param centerPoint - The point to rotate around
   * @param angleDegrees - Rotation angle in degrees
   * @returns A new rectangle that bounds the rotated points
   */
  static RotateRect(rectangle, centerPoint, angleDegrees) {
    LogUtil.Debug("O.Opt RotateRect - Input:", { rectangle, centerPoint, angleDegrees });

    const points = [];
    const result = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // Create points for each corner of the rectangle
    points.push(new Point(rectangle.x, rectangle.y));
    points.push(new Point(rectangle.x + rectangle.width, rectangle.y));
    points.push(new Point(rectangle.x + rectangle.width, rectangle.y + rectangle.height));
    points.push(new Point(rectangle.x, rectangle.y + rectangle.height));
    points.push(new Point(rectangle.x, rectangle.y)); // Close the polygon

    if (points && points.length) {
      // If rotation angle is provided, rotate the points
      if (angleDegrees) {
        const angleRadians = -2 * Math.PI * (angleDegrees / 360);

        // Calculate center of rectangle if not explicitly provided
        centerPoint.x = (rectangle.x + rectangle.x + rectangle.width) / 2;
        centerPoint.y = (rectangle.y + rectangle.y + rectangle.height) / 2;

        // Rotate points around center
        Utils3.RotatePointsAboutPoint(centerPoint, angleRadians, points);
      }

      // Calculate bounding rectangle of rotated points
      Utils2.GetPolyRect(result, points);
    }

    LogUtil.Debug("O.Opt RotateRect - Output:", result);
    return result;
  }

  /**
  * Rotates a rectangle around an explicit center point
  * @param rectangle - The rectangle to rotate
  * @param centerPoint - The point to rotate around
  * @param angleDegrees - Rotation angle in degrees
  * @returns A new rectangle that bounds the rotated points
  */
  static RotateRectAboutCenter(rectangle, centerPoint, angleDegrees) {
    LogUtil.Debug("O.Opt RotateRectAboutCenter - Input:", { rectangle, centerPoint, angleDegrees });

    const points = [];
    const result = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    // Create points for each corner of the rectangle
    points.push(new Point(rectangle.x, rectangle.y));
    points.push(new Point(rectangle.x + rectangle.width, rectangle.y));
    points.push(new Point(rectangle.x + rectangle.width, rectangle.y + rectangle.height));
    points.push(new Point(rectangle.x, rectangle.y + rectangle.height));
    points.push(new Point(rectangle.x, rectangle.y)); // Close the polygon

    if (points && points.length) {
      // If rotation angle is provided, rotate the points
      if (angleDegrees) {
        const angleRadians = -2 * Math.PI * (angleDegrees / 360);

        // Rotate points around provided center
        Utils3.RotatePointsAboutPoint(centerPoint, angleRadians, points);
      }

      // Calculate bounding rectangle of rotated points
      Utils2.GetPolyRect(result, points);
    }

    LogUtil.Debug("O.Opt RotateRectAboutCenter - Output:", result);
    return result;
  }

  /**
   * Offsets a shape's position by the specified amounts
   * @param shapeId - ID of the shape to offset
   * @param offsetX - Amount to offset in X direction
   * @param offsetY - Amount to offset in Y direction
   * @param autoGrowSettings - Optional auto-grow settings
   */
  static OffsetShape(shapeId: number, offsetX: number, offsetY: number, autoGrowSettings?: any) {
    LogUtil.Debug("O.Opt OffsetShape - Input:", {
      shapeId,
      offsetX,
      offsetY,
      hasAutoGrowSettings: !!autoGrowSettings
    });

    // Track the shape bounds
    let shapeBounds = { x: 0, y: 0 };

    // Get a preserved copy of the shape object for modification
    let shapeObject = T3Gv.stdObj.PreserveBlock(shapeId);

    // Initialize auto-grow if settings provided
    DrawUtil.InitializeAutoGrowDrag(autoGrowSettings);

    // Get the actual shape data
    let shapeData = shapeObject.Data;

    // Apply the offset to the shape
    shapeData.OffsetShape(offsetX, offsetY);

    // Calculate new bounds after offset
    shapeBounds.x = shapeData.r.x + shapeData.r.width;
    shapeBounds.y = shapeData.r.y + shapeData.r.height;

    // Handle auto-grow with new bounds
    DrawUtil.DoAutoGrowDrag(shapeBounds);

    // If there was any actual offset, update links and mark as dirty
    if (offsetX || offsetY) {
      OptCMUtil.SetLinkFlag(shapeId, DSConstant.LinkFlags.Move);
      ObjectUtil.AddToDirtyList(shapeId, true);
    }

    LogUtil.Debug("O.Opt OffsetShape - Output: Shape offset applied", shapeBounds);
  }

}

export default ToolActUtil
