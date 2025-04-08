

import $ from 'jquery';
import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import ShapeConstant from "../../Data/Constant/ShapeConstant";
import T3Constant from "../../Data/Constant/T3Constant";
import TextConstant from "../../Data/Constant/TextConstant";
import Instance from "../../Data/Instance/Instance";
import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import HitResult from "../../Model/HitResult";
import Point from '../../Model/Point';
import SelectionAttr from "../../Model/SelectionAttr";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import Utils1 from "../../Util/Utils1";
import Utils2 from "../../Util/Utils2";
import Utils3 from "../../Util/Utils3";
import DataUtil from "../Data/DataUtil";
import DSConstant from "../DS/DSConstant";
import UIUtil from "../UI/UIUtil";
import DrawUtil from "./DrawUtil";
import LayerUtil from "./LayerUtil";
import OptAhUtil from './OptAhUtil';
import OptCMUtil from "./OptCMUtil";
import SvgUtil from "./SvgUtil";
import HookUtil from './HookUtil';
import ToolActUtil from './ToolActUtil';
import TextUtil from './TextUtil';

class SelectUtil {

  /**
   * Handles selection of an object when clicked
   * @param event - The click event
   * @param svgElement - The SVG element that was clicked
   * @param preserveSelection - Whether to preserve existing selection state
   * @returns Boolean indicating whether object was selected successfully
   */
  static SelectObjectFromClick(event, svgElement, preserveSelection) {
    T3Util.Log('O.Opt SelectObjectFromClick - Input:', { event, svgElement, preserveSelection });

    const visibleObjectCount = LayerUtil.ActiveVisibleZList().length;
    const shapeContainerType = NvConstant.FNObjectTypes.ShapeContainer;

    // Exit if no visible objects or no SVG element provided
    if (visibleObjectCount === 0) {
      T3Util.Log('O.Opt SelectObjectFromClick - Output: false (no visible objects)');
      return false;
    }

    if (svgElement === null) {
      T3Util.Log('O.Opt SelectObjectFromClick - Output: false (no SVG element)');
      return false;
    }

    // Get the object ID and corresponding data object
    const objectId = svgElement.GetID();
    const object = DataUtil.GetObjectPtr(objectId, false);

    // Verify the object is a valid drawing object
    if (!(object && object instanceof Instance.Shape.BaseDrawObject)) {
      T3Util.Log('O.Opt SelectObjectFromClick - Output: false (not a drawing object)');
      return false;
    }

    // // Exclude shape container objects in cells
    // if (object && object.objecttype === shapeContainerType && this.ContainerIsInCell(object)) {
    //   T3Util.Log('O.Opt SelectObjectFromClick - Output: false (container in cell)');
    //   return false;
    // }

    // Determine if this is a multiple selection operation
    let isMultipleSelection = event.gesture.srcEvent.shiftKey ||
      event.gesture.srcEvent.ctrlKey ||
      T3Constant.DocContext.SelectionToolMultiple;

    // Special case: Ctrl+Meta keys together cancel multiple selection
    if (event.gesture.srcEvent.ctrlKey && event.gesture.srcEvent.metaKey) {
      isMultipleSelection = false;
    }

    // Get the selected list and check if object is already selected
    const selectedList = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID).Data;
    var indexInSelectedList = $.inArray(objectId, selectedList);

    // Prepare array with object to select
    let objectsToSelect = [];
    objectsToSelect.push(objectId);

    // Handle object selection depending on whether it's already selected
    if (indexInSelectedList == -1) {
      // Object is not already selected - select it
      this.SelectObjects(objectsToSelect, isMultipleSelection, false);
      T3Util.Log('O.Opt SelectObjectFromClick - Output: true (object selected)');
      return true;
    }
    else {
      if (!isMultipleSelection) {
        // Object is already selected and this isn't a multiple selection
        return true;
      }
      else {
        // Object is already selected and this is a multiple selection
        this.SelectObjects(objectsToSelect, isMultipleSelection, false);
        return !!preserveSelection;
      }

      // return !isMultipleSelection || (this.SelectObjects(objectsToSelect, isMultipleSelection, !1), !!preserveSelection);
    }
  }

  /**
   * Selects one or more objects in the drawing
   * @param objectsToSelect - Array of object IDs to select
   * @param isMultipleSelection - Whether to allow multiple objects to be selected
   * @param preserveSelectionState - Whether to preserve the existing selection state
   * @returns The selected object ID or -1 if none selected
   */
  static SelectObjects(objectsToSelect, isMultipleSelection?, preserveSelectionState?) {
    T3Util.Log("O.Opt SelectObjects - Input:", { objectsToSelect, isMultipleSelection, preserveSelectionState });

    let selectedIndex = -1;

    if (objectsToSelect && objectsToSelect.length > 0) {
      // Get the text edit data object
      const textEditData = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);

      // Close text editing if active
      if (textEditData.theActiveTextEditObjectID !== -1) {
        TextUtil.DeactivateTextEdit(false, true);
      }

      // Get the current selection list
      const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, preserveSelectionState);

      // Get the currently targeted object
      selectedIndex = SelectUtil.GetTargetSelect();

      // If not in multiple selection mode, clear existing selection
      if (!isMultipleSelection) {
        T3Gv.opt.SetDimensionVisibility(selectedList, false);
        selectedList.length = 0;
      }

      // Handle existing target selection state
      if (selectedIndex >= 0) {
        const indexInSelectedList = $.inArray(selectedIndex, selectedList);
        if (isMultipleSelection) {
          if (indexInSelectedList >= 0) {
            selectedIndex = -1;
          }
        } else {
          if (indexInSelectedList < 0) {
            selectedIndex = -1;
          }
        }
      }

      // Process each object to select
      for (let i = 0; i < objectsToSelect.length; i++) {
        let objectId = objectsToSelect[i];
        const object = DataUtil.GetObjectPtr(objectId, false);

        if (object) {
          const indexInSelectedList = $.inArray(objectId, selectedList);

          // If object not in selection list, add it
          if (indexInSelectedList === -1) {
            if (selectedIndex < 0) {
              selectedIndex = objectId;
            }
            selectedList.push(objectId);
          }
          // If in multiple selection mode and object already selected, remove it (toggle behavior)
          else if (isMultipleSelection) {
            const objectInList = DataUtil.GetObjectPtr(objectId, false);
            if (objectInList) {
              objectInList.ShowOrHideDimensions(false);
            }
            selectedList.splice(indexInSelectedList, 1);
          }
        }
      }

      // Ensure selectedIndex is valid
      if (selectedIndex >= 0) {
        const indexInSelectedList = $.inArray(selectedIndex, selectedList);
        if (indexInSelectedList < 0) {
          selectedIndex = -1;
        }
      }

      // If no selection index but we have objects selected, use the first one
      if (selectedIndex < 0 && selectedList.length > 0) {
        selectedIndex = selectedList[0];
      }

      // Update the target selection and refresh the UI
      SelectUtil.SetTargetSelect(selectedIndex, preserveSelectionState);
      T3Gv.opt.lastOpDuplicate = false;
      this.UpdateSelectionAttributes(selectedList);
      SvgUtil.HideAllSVGSelectionStates();
      SvgUtil.RenderAllSVGSelectionStates();
    }

    T3Util.Log("O.Opt SelectObjects - Output:", { selectedIndex, selectedCount: objectsToSelect?.length || 0 });
    return selectedIndex;
  }

  /**
   * Gets the currently targeted/selected object ID
   * @returns The ID of the currently targeted object or -1 if none selected
   */
  static GetTargetSelect() {
    T3Util.Log('O.Opt GetTargetSelect - Input: No parameters');

    // Get session data
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Default to no selection
    let targetSelectId = -1;

    // Verify the selected object is valid
    if (sessionData.tselect >= 0) {
      const selectedObject = DataUtil.GetObjectPtr(sessionData.tselect, false);
      if (selectedObject && selectedObject instanceof Instance.Shape.BaseDrawObject) {
        targetSelectId = sessionData.tselect;
      }
    }

    T3Util.Log('O.Opt GetTargetSelect - Output:', targetSelectId);
    return targetSelectId;
  }

  /**
   * Sets an object as the current target selection
   * @param targetId - The object ID to set as the target selection
   * @param preserveSession - Whether to preserve the current session data
   */
  static SetTargetSelect(targetId: number, preserveSession?: boolean) {
    T3Util.Log("O.Opt SetTargetSelect - Input:", { targetId, preserveSession });

    // Get session data
    let sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, preserveSession);
    sessionData.tselect = targetId;

    let dimensions = null;

    // If we have a valid target ID, get its dimensions
    if (targetId > 0) {
      const drawingObject = DataUtil.GetObjectPtr(targetId, false);
      if (drawingObject && drawingObject instanceof Instance.Shape.BaseDrawObject) {
        dimensions = drawingObject.GetDimensionsForDisplay();
      } else {
        // Reset target if object is invalid
        targetId = -1;
        sessionData.tselect = targetId;
      }
    }

    // Update UI with dimensions if available
    if (dimensions) {
      UIUtil.ShowFrame(true);
      UIUtil.UpdateDisplayCoordinates(dimensions, null, null, null);
    } else {
      UIUtil.ShowFrame(false);
    }

    T3Util.Log("O.Opt SetTargetSelect - Output:", { targetId: sessionData.tselect, dimensions });
  }

  /**
   * Updates the selection state attributes based on currently selected objects
   * @param selectedObjects - Array of currently selected object IDs
   */
  static UpdateSelectionAttributes(selectedObjects) {
    T3Util.Log('O.Opt UpdateSelectionAttributes - Input:', selectedObjects);

    if (!selectedObjects) {
      T3Util.Log('O.Opt UpdateSelectionAttributes - Output: No selection objects provided, exiting early');
      return;
    }

    // Constants for better readability
    const DRAWING_OBJECT_CLASS = OptConstant.DrawObjectBaseClass;
    const TEXT_FACE = TextConstant.TextFace;
    const OBJECT_TYPES = NvConstant.FNObjectTypes;
    const SHAPE_TYPE = OptConstant.ShapeType;
    const DIMENSION_FLAGS = NvConstant.DimensionFlags;
    const TEXT_FLAGS = NvConstant.TextFlags;

    // Local variables with descriptive names
    let targetObjectId;
    let objectIndex;
    let currentObject;
    let targetObject;
    let moveList;
    let objectCount = 0;

    // Tree tracking
    const treeTopInfo = {
      topconnector: -1,
      topshape: -1,
      foundtree: false
    };

    // Get session data
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Get selection count if we have selected objects
    if (selectedObjects && (objectCount = selectedObjects.length)) {
      // First selected object is available here if needed
      const firstSelectedObject = selectedObjects[0];
    }

    // Reset selection state properties
    this.ResetSelectionState();

    // Handle undo/redo state
    const undoState = T3Gv.state.GetUndoState();

    let selectState = T3Gv.opt.selectionState;
    selectState.undo = undoState.undo;
    selectState.redo = undoState.redo;

    // Special case: dimension editing mode
    if (T3Gv.opt.bInDimensionEdit) {
      T3Gv.opt.HandleDimensionEditMode(sessionData);
      T3Util.Log('O.Opt UpdateSelectionAttributes - Output: Dimension edit mode handled');
      return;
    }

    // No selection or note editing mode
    if (objectCount === 0 || T3Gv.opt.bInNoteEdit) {
      T3Gv.opt.HandleEmptySelectionOrNoteEditMode(sessionData);
      T3Util.Log('O.Opt UpdateSelectionAttributes - Output: Empty selection or note edit mode handled');
      return;
    }

    // Get target selection object
    targetObjectId = SelectUtil.GetTargetSelect();
    selectState.nselect = objectCount;

    // Validate target object
    if (targetObjectId >= 0) {
      targetObject = DataUtil.GetObjectPtr(targetObjectId, false);
      if (!(targetObject && targetObject instanceof Instance.Shape.BaseDrawObject)) {
        targetObjectId = -1;
        sessionData.tselect = -1;
      }
    }

    // Process target object if valid
    if (targetObjectId >= 0) {
      T3Gv.opt.ProcessTargetObject(targetObjectId, targetObject);
    }

    // Process each selected object
    for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
      const objectId = selectedObjects[objectIndex];

      // Check if selection allows alignment
      if (moveList) {
        if (moveList.indexOf(objectId) === -1) {
          selectState.allowalign = true;
        }
      } else if (objectId !== targetObjectId) {
        selectState.allowalign = true;
      }

      // Get and process the current object
      currentObject = DataUtil.GetObjectPtr(objectId, false);
      if (!(currentObject instanceof Instance.Shape.BaseDrawObject)) continue;

      const objectToProcess = currentObject;
      // Process the object based on its type and properties
      T3Gv.opt.ProcessSelectedObject(currentObject, objectToProcess, objectIndex);
    }

    // Clean up and finalize
    T3Gv.opt.moveList = null;
    selectState.allowcopy = selectState.nselect > 0;

    // Create copy of selection attributes for UI
    const selectionAttributes = new SelectionAttr();
    $.extend(true, selectionAttributes, selectState);

    // Handle pixel to point conversion for font size if needed
    if (T3Gv.docUtil.rulerConfig.showpixels && selectionAttributes.fontsize >= 0) {
      selectionAttributes.fontsize = OptCMUtil.PixelstoPoints(selectionAttributes.fontsize);
    }

    T3Util.Log('O.Opt UpdateSelectionAttributes - Output:', {
      nselect: selectState.nselect,
      nshapeselected: selectState.nshapeselected,
      nlineselected: selectState.nlineselected,
      nconnectorselected: selectState.nconnectorselected,
      hastext: selectState.selectionhastext
    });
  }

  /**
   * Resets the selection state to default values
   * This method clears all properties in the selection state object when:
   * - New selection is being made
   * - Selection is being cleared
   * - Before calculating new selection attributes
   * @returns void
   */
  static ResetSelectionState() {
    T3Util.Log('O.Opt ResetSelectionState - Input: No parameters');

    const selectionState = T3Gv.opt.selectionState;

    // Selection counts
    selectionState.nselect = 0;
    selectionState.nlineselected = 0;
    selectionState.nshapeselected = 0;
    selectionState.nconnectorselected = 0;
    selectionState.ngroupsselected = 0;
    selectionState.nimageselected = 0;
    selectionState.ntablesselected = 0;
    selectionState.npolylinecontainerselected = 0;
    selectionState.ncells_selected = 0;
    selectionState.nsegs = 0;

    // Selection flags
    selectionState.IsTargetTable = false;
    selectionState.allowalign = 0;
    selectionState.allowcopy = false;
    selectionState.selectionhastext = false;
    selectionState.cell_notext = false;
    selectionState.cellselected = false;
    selectionState.projectTableSelected = false;
    selectionState.lockedTableSelected = false;
    selectionState.polyclosed = false;
    selectionState.iswallselected = false;
    selectionState.bInNoteEdit = T3Gv.opt.bInNoteEdit;
    selectionState.connectorCanHaveCurve = false;
    selectionState.isJiraCard = false;

    // Dimension properties
    selectionState.width = 0;
    selectionState.widthstr = '';
    selectionState.height = 0;
    selectionState.heightstr = '';
    selectionState.left = 0;
    selectionState.leftstr = '';
    selectionState.top = 0;
    selectionState.topstr = '';
    selectionState.WallThickness = 0;
    selectionState.fixedCornerRadius = -2;
    selectionState.lineCornerRadius = -2;

    // Type and state indicators
    selectionState.TextDirection = 0;
    selectionState.dimensions = 0;
    selectionState.celltype = 0;
    selectionState.cellflags = 0;
    selectionState.subtype = 0;
    selectionState.objecttype = 0;

    // References and IDs
    selectionState.datasetElemID = -1;
    selectionState.tselect = -1;
    selectionState.paste = OptCMUtil.GetClipboardType();
    selectionState.csOptMng = T3Gv.wallOpt;

    T3Util.Log('O.Opt ResetSelectionState - Output: Selection state reset');
  }

  /**
   * Removes an object from the selected objects list
   * @param objectId - ID of the object to remove from selection
   */
  static RemoveFromSelectedList(objectId) {
    T3Util.Log("O.Opt RemoveFromSelectedList - Input:", objectId);

    // Get the current selected list (without preserving state)
    const selectedList = DataUtil.GetObjectPtr(
      T3Gv.opt.theSelectedListBlockID,
      false
    );

    // Find the index of the object in the selection list
    const objectIndex = selectedList.indexOf(objectId);

    // Only proceed if the object is actually in the list
    if (objectIndex !== -1) {
      // Get a preserved copy of the selected list for modification
      const preservedList = DataUtil.GetObjectPtr(
        T3Gv.opt.theSelectedListBlockID,
        true
      );

      // Remove the object from the selection list
      preservedList.splice(objectIndex, 1);

      // If this object was the target selection, clear the target selection
      const sessionData = DataUtil.GetObjectPtr(
        T3Gv.opt.sdDataBlockId,
        false
      );

      if (objectId === sessionData.tselect) {
        // Get preserved session data and clear the target selection
        const preservedSessionData = DataUtil.GetObjectPtr(
          T3Gv.opt.sdDataBlockId,
          true
        );
        preservedSessionData.tselect = -1;
      }
    }

    T3Util.Log("O.Opt RemoveFromSelectedList - Output: Object removed from selection");
  }

  static StartRubberBandSelect(event: any) {
    T3Util.Log('O.Opt StartRubberBandSelect - Input event:', event);
    try {
      if (T3Gv.docUtil.IsReadOnly()) {
        T3Util.Log('O.Opt StartRubberBandSelect - Document is read-only; aborting.');
        return;
      }

      // if (this.cachedWidth) {
      //   try {
      //     T3Gv.opt.CloseEdit();
      //     T3Gv.opt.ChangeWidth(this.cachedWidth);
      //   } catch (error) {
      //     T3Gv.opt.ExceptionCleanup(error);
      //     throw error;
      //   }
      // }
      // if (this.cachedHeight) {
      //   try {
      //     T3Gv.opt.CloseEdit();
      //     T3Gv.opt.ChangeHeight(this.cachedHeight);
      //   } catch (error) {
      //     T3Gv.opt.ExceptionCleanup(error);
      //     throw error;
      //   }
      // }
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.FormatPainter) {
        if (T3Gv.opt.formatPainterSticky) {
          T3Util.Log('O.Opt StartRubberBandSelect - formatPainterSticky active; aborting.');
          return;
        }
        UIUtil.SetFormatPainter(true, false);
      }

      // Ensure any active edit is closed
      DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
      T3Gv.opt.CloseEdit();

      // Create the rubber band shape as a rectangle
      const rubberBandShape = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Rect);
      rubberBandShape.SetStrokeColor('black');
      // if (T3Gv.opt.isAndroid) {
      //   rubberBandShape.SetFillColor('none');
      //   rubberBandShape.SetFillOpacity(0);
      // } else

      {
        rubberBandShape.SetFillColor('black');
        rubberBandShape.SetFillOpacity(0.03);
      }

      const zoomFactorInverse = 1 / T3Gv.docUtil.GetZoomFactor();
      rubberBandShape.SetStrokeWidth(1 * zoomFactorInverse);

      if (/*!T3Gv.opt.isAndroid*/ true) {
        const strokePattern = 2 * zoomFactorInverse + ',' + zoomFactorInverse;
        rubberBandShape.SetStrokePattern(strokePattern);
      }

      // Convert window coordinates to document coordinates
      const startCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      T3Gv.opt.rubberBandStartX = startCoordinates.x;
      T3Gv.opt.rubberBandStartY = startCoordinates.y;
      rubberBandShape.SetSize(1, 1);
      rubberBandShape.SetPos(startCoordinates.x, startCoordinates.y);
      T3Gv.opt.svgOverlayLayer.AddElement(rubberBandShape);

      T3Util.Log('O.Opt StartRubberBandSelect - Rubber band shape created:', rubberBandShape);
      T3Gv.opt.rubberBand = rubberBandShape;
      T3Gv.opt.EndStampSession();

      // Bind hammer events for the rubber band dragging
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_RubberBandDrag);
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_RubberBandDragEnd);

      T3Util.Log('O.Opt StartRubberBandSelect - Output rubber band set successfully:', T3Gv.opt.rubberBand);
    } catch (error) {
      T3Util.Log('O.Opt StartRubberBandSelect - Error:', error);
      this.RubberBandSelectExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  static SelectAllInRect(selectionRect, allowMultipleSelection) {
    T3Util.Log("O.Opt SelectAllInRect - Input:", { selectionRect, allowMultipleSelection });

    // Get all visible objects and filter out objects flagged as not visible
    const visibleObjects = LayerUtil.ActiveVisibleZList();
    const filteredObjects = T3Gv.opt.RemoveNotVisible(visibleObjects);
    const objectCount = filteredObjects.length;
    const shapeContainerType = NvConstant.FNObjectTypes.ShapeContainer;

    if (objectCount !== 0) {
      // Create a clean copy of the selection rectangle
      const searchRect = {
        x: selectionRect.x,
        y: selectionRect.y,
        width: selectionRect.width,
        height: selectionRect.height
      };
      const selectedObjects = [];

      // Check each object against the selection rectangle
      for (let i = 0; i < objectCount; ++i) {
        const object = T3Gv.stdObj.GetObject(filteredObjects[i]);
        if (object != null) {
          const objectData = object.Data;

          // Skip shape containers that are in cells
          if (objectData.objecttype !== shapeContainerType /*|| !this.ContainerIsInCell(objectData)*/) {
            let objectFrame = objectData.Frame;

            // If the object is rotated, calculate its actual bounding box
            if (objectData.RotationAngle) {
              const center = {
                x: objectFrame.x + objectFrame.width / 2,
                y: objectFrame.y + objectFrame.height / 2
              };
              objectFrame = ToolActUtil.RotateRectAboutCenter(
                objectFrame,
                center,
                objectData.RotationAngle
              );
            }

            // Add to selection if fully enclosed by the selection rectangle
            if (Utils2.IsRectangleFullyEnclosed(searchRect, objectFrame)) {
              selectedObjects.push(filteredObjects[i]);
            }
          }
        }
      }

      // Handle the selection results
      if (selectedObjects.length === 0) {
        T3Util.Log("O.Opt SelectAllInRect - No objects found in selection rectangle");
        this.ClearSelectionClick();
      } else {
        T3Util.Log("O.Opt SelectAllInRect - Found objects:", selectedObjects.length);
        SelectUtil.SelectObjects(selectedObjects, allowMultipleSelection, false);
      }
    } else {
      T3Util.Log("O.Opt SelectAllInRect - No visible objects to select");
    }

    T3Util.Log("O.Opt SelectAllInRect - Output: Selection processing completed");
  }

  static RubberBandSelectMoveCommon(mouseX: number, mouseY: number) {
    T3Util.Log('O.Opt RubberBandSelectMoveCommon - Input:', { mouseX, mouseY });

    if (T3Gv.opt.rubberBand === null) {
      return;
    }

    const currentX = mouseX;
    const currentY = mouseY;
    const startX = T3Gv.opt.rubberBandStartX;
    const startY = T3Gv.opt.rubberBandStartY;

    if (currentX >= startX && currentY >= startY) {
      T3Gv.opt.rubberBand.SetSize(currentX - startX, currentY - startY);
      T3Gv.opt.rubberBandFrame = {
        x: startX,
        y: startY,
        width: currentX - startX,
        height: currentY - startY
      };
    } else if (currentY < startY) {
      if (currentX >= startX) {
        T3Gv.opt.rubberBand.SetSize(currentX - startX, startY - currentY);
        T3Gv.opt.rubberBand.SetPos(startX, currentY);
        T3Gv.opt.rubberBandFrame = {
          x: startX,
          y: currentY,
          width: currentX - startX,
          height: startY - currentY
        };
      } else {
        T3Gv.opt.rubberBand.SetSize(startX - currentX, startY - currentY);
        T3Gv.opt.rubberBand.SetPos(currentX, currentY);
        T3Gv.opt.rubberBandFrame = {
          x: currentX,
          y: currentY,
          width: startX - currentX,
          height: startY - currentY
        };
      }
    } else if (currentX < startX) {
      T3Gv.opt.rubberBand.SetSize(startX - currentX, currentY - startY);
      T3Gv.opt.rubberBand.SetPos(currentX, startY);
      T3Gv.opt.rubberBandFrame = {
        x: currentX,
        y: startY,
        width: startX - currentX,
        height: currentY - startY
      };
    }

    T3Util.Log('O.Opt RubberBandSelectMoveCommon - Output:', { rubberBandFrame: T3Gv.opt.rubberBandFrame });
  }

  static UnbindRubberBandHammerEvents() {
    T3Util.Log('O.Opt UnbindRubberBandHammerEvents - Input');

    if (T3Gv.opt.WorkAreaHammer) {
      T3Gv.opt.WorkAreaHammer.off('drag');
      T3Gv.opt.WorkAreaHammer.off('dragend');
    }

    T3Util.Log('O.Opt UnbindRubberBandHammerEvents - Output: done');
  }

  static RubberBandSelectExceptionCleanup(exception: any): never {
    T3Util.Log("O.Opt RubberBandSelectExceptionCleanup - Input:", exception);

    try {
      // Unbind rubber band related hammer events and reset auto-scroll timer.
      this.UnbindRubberBandHammerEvents();
      DrawUtil.ResetAutoScrollTimer();

      // Remove the rubber band element from the overlay layer if it exists.
      if (T3Gv.opt.rubberBand) {
        T3Gv.opt.svgOverlayLayer.RemoveElement(T3Gv.opt.rubberBand);
      }

      // Reset rubber band properties.
      T3Gv.opt.rubberBand = null;
      T3Gv.opt.rubberBandStartX = 0;
      T3Gv.opt.rubberBandStartY = 0;
      T3Gv.opt.rubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };

      // Unlock and unblock collaboration messages, and reset undo state.
      // Collab.UnLockMessages();
      // Collab.UnBlockMessages();
      T3Gv.opt.noUndo = false;
    } catch (cleanupError) {
      console.error("O.Opt RubberBandSelectExceptionCleanup - Cleanup Error:", cleanupError);
      throw cleanupError;
    }

    T3Util.Log("O.Opt RubberBandSelectExceptionCleanup - Output: Cleanup completed");
    throw exception;
  }

  static ClearAnySelection(preserveBlock: boolean) {
    T3Util.Log("O.Opt ClearAnySelection - Input:", { preserveBlock });
    const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, preserveBlock);
    if (selectedList.length !== 0) {
      SelectUtil.SetTargetSelect(-1, preserveBlock);
      SvgUtil.HideAllSVGSelectionStates();
      selectedList.length = 0;
    }
    T3Util.Log("O.Opt ClearAnySelection - Output: selection cleared");
  }

  static ClearSelectionClick() {
    T3Util.Log('O.Opt ClearSelectionClick: input');

    T3Gv.opt.CloseEdit();
    this.ClearAnySelection(false);
    SelectUtil.UpdateSelectionAttributes(null);

    T3Util.Log('O.Opt ClearSelectionClick: output');
  }

  static RubberBandSelectCancel(event?) {
    T3Util.Log("O.Opt RubberBandSelectCancel - Input:", event);

    if (T3Gv.opt.rubberBand) {
      // Unbind related event handlers
      T3Gv.opt.WorkAreaHammer.off('drag');
      T3Gv.opt.WorkAreaHammer.off('dragend');

      // Restore default drag start handler
      T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);

      // Clean up resources
      DrawUtil.ResetAutoScrollTimer();
      T3Gv.opt.svgOverlayLayer.RemoveElement(T3Gv.opt.rubberBand);

      // Reset rubber band properties
      T3Gv.opt.rubberBand = null;
      T3Gv.opt.rubberBandStartX = 0;
      T3Gv.opt.rubberBandStartY = 0;
      T3Gv.opt.rubberBandFrame = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    T3Util.Log("O.Opt RubberBandSelectCancel - Output: Rubber band selection canceled");
  }

  /**
   * Selects all objects in the document based on the current editing context.
   * If in text edit mode, selects all text in the editor.
   * If in table edit mode, selects all cells in the table.
   * Otherwise, selects all visible objects that match any filter criteria.
   *
   * @param typeFilter - Optional array of object types to filter by
   */
  static SelectAllObjects(typeFilter?) {
    T3Util.Log("U.Util1 SelectAllObjects - Input:", { typeFilter });

    let svgElement;
    let currentObject;
    const textEditSession = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    let textLength = 0;
    let shapeContainerType = ShapeConstant.ObjectTypes.ShapeContainer;

    // Handle active text edit mode
    if (textEditSession.theActiveTextEditObjectID >= 0) {
      svgElement = T3Gv.opt.svgObjectLayer.GetElementById(textEditSession.theActiveTextEditObjectID);
      const textElement = svgElement.textElem;

      if (textElement) {
        textLength = textElement.GetText().length;
        textElement.SetSelectedRange(0, textLength);
      }

      // If there's text or no active table, we're done after selecting text
      if (!(textLength === 0 && textEditSession.theActiveTableObjectID >= 0)) {
        T3Util.Log("U.Util1 SelectAllObjects - Output: All text selected");
        return;
      }

      T3Gv.opt.CloseEdit(true);
    }

    // // Handle active table edit mode
    // if (textEditSession.theActiveTableObjectID >= 0) {
    //   currentObject = DataUtil.GetObjectPtr(textEditSession.theActiveTableObjectID, true);

    //   if (currentObject) {
    //     // const tableData = currentObject.GetTable(false);

    //     // if (tableData) {
    //     //   svgElement = T3Gv.opt.svgObjectLayer.GetElementById(textEditSession.theActiveTableObjectID);
    //     //   tableData.select = 0;

    //     //   const changedCellList = [];
    //     //   const oldSelectionList = [];
    //     //   const columnCount = tableData.cols.length;
    //     //   const rowCount = tableData.rows.length;

    //     //   this.Table_SelectCells(
    //     //     tableData,
    //     //     0,
    //     //     rowCount - 1,
    //     //     -1,
    //     //     columnCount - 1,
    //     //     true,
    //     //     changedCellList,
    //     //     false,
    //     //     oldSelectionList
    //     //   );

    //     //   this.LM_SelectSVGTableObject(currentObject, T3Gv.opt.svgDoc, svgElement, changedCellList, oldSelectionList);
    //     //   DrawUtil.CompleteOperation();
    //     //   T3Util.Log("U.Util1 SelectAllObjects - Output: All cells selected");
    //     // }
    //   }
    // }
    // Handle regular object selection
    // else {
    let objectIndex;
    const objectsToSelect = [];
    let visibleObjects = LayerUtil.ActiveVisibleZList();
    visibleObjects = T3Gv.opt.RemoveNotVisible(visibleObjects);
    const objectCount = visibleObjects.length;
    let filterCount = 0;
    let isClosedPolyline = false;

    if (typeFilter) {
      filterCount = typeFilter.length;
    }

    for (objectIndex = 0; objectIndex < objectCount; ++objectIndex) {
      currentObject = DataUtil.GetObjectPtr(visibleObjects[objectIndex], false);

      // Skip objects that don't match filter criteria
      if (filterCount > 0) {
        isClosedPolyline = !!(
          typeFilter.indexOf(OptConstant.DrawObjectBaseClass.Shape) !== -1 &&
          currentObject instanceof Instance.Shape.PolyLineContainer &&
          currentObject.polylist &&
          currentObject.polylist.closed
        );

        if (
          typeFilter.indexOf(currentObject.DrawingObjectBaseClass) === -1 &&
          !isClosedPolyline
        ) {
          continue;
        }
      }

      objectsToSelect.push(visibleObjects[objectIndex]);
      // }

      SelectUtil.SelectObjects(objectsToSelect, false, false);
      T3Util.Log("U.Util1 SelectAllObjects - Output: Selected", objectsToSelect.length, "objects");
    }
  }

  /**
     * Gets the selection context.
     * @returns The context(s) indicating the current selection state.
     */
  static GetSelectionContext(): any {
    T3Util.Log("O.Opt GetSelectionContext - Input:", {});

    let optMng: any;
    let selectionContexts: any[] = [];

    // Check if there is an active text edit object in the TED session.
    const teData = DataUtil.GetObjectPtr(T3Gv.opt.teDataBlockId, false);
    if (teData.theActiveTextEditObjectID !== -1) {
      optMng = OptAhUtil.GetGvSviOpt();
      if (optMng) {
        selectionContexts.push(DSConstant.Contexts.Text);
        selectionContexts.push(T3Gv.opt.GetAutomationContext(optMng));
        T3Util.Log("O.Opt GetSelectionContext - Output:", selectionContexts);
        return selectionContexts;
      } else {
        T3Util.Log("O.Opt GetSelectionContext - Output:", DSConstant.Contexts.Text);
        return DSConstant.Contexts.Text;
      }
    }

    // Check if the active edit element corresponds to dimension or note text.
    const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
    if (activeEditElement !== null && activeEditElement.ID === OptConstant.SVGElementClass.DimText) {
      T3Util.Log("O.Opt GetSelectionContext - Output:", DSConstant.Contexts.DimensionText);
      return DSConstant.Contexts.DimensionText;
    }
    if (activeEditElement !== null && activeEditElement.ID === OptConstant.SVGElementClass.NoteText) {
      T3Util.Log("O.Opt GetSelectionContext - Output:", DSConstant.Contexts.NoteText);
      return DSConstant.Contexts.NoteText;
    }

    // // Check if a table is active.
    // if (this.Table_GetActiveID() !== -1) {
    //   selectionContexts.push(DSConstant.Contexts.Table);
    //   selectionContexts.push(DSConstant.Contexts.Text);
    //   optMng = OptAhUtil.GetGvSviOpt();
    //   if (optMng) {
    //     selectionContexts.push(DSConstant.Contexts.Automation);
    //   }
    //   T3Util.Log("O.Opt GetSelectionContext - Output:", selectionContexts);
    //   return selectionContexts;
    // }

    // Handle default target selection.
    let targetObjectId = SelectUtil.GetTargetSelect();
    if (targetObjectId === 0) {
      targetObjectId = -1;
    }
    if (targetObjectId !== -1) {
      optMng = OptAhUtil.GetGvSviOpt();
      const targetObject = T3Gv.stdObj.GetObject(targetObjectId);
      const objectData = targetObject.Data;
      if (optMng && /*!T3Gv.opt.Comment_IsTarget(targetObjectId)*/ true) {
        selectionContexts.push(DSConstant.Contexts.Automation);
      }
      if (objectData.AllowTextEdit()) {
        if (selectionContexts.length) {
          selectionContexts.push(DSConstant.Contexts.Text);
          T3Util.Log("O.Opt GetSelectionContext - Output:", selectionContexts);
          return selectionContexts;
        } else {
          T3Util.Log("O.Opt GetSelectionContext - Output:", DSConstant.Contexts.Text);
          return DSConstant.Contexts.Text;
        }
      }
    }

    T3Util.Log("O.Opt GetSelectionContext - Output:", DSConstant.Contexts.None);
    return DSConstant.Contexts.None;
  }

  static FindAllChildObjects(targetObjectId: number, filterDrawingBaseClass?: number, filterObjectType?: number): number[] {
    T3Util.Log("O.Opt FindAllChildObjects - Input:", {
      targetObjectId,
      filterDrawingBaseClass,
      filterObjectType
    });

    const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);
    const startIndex = OptCMUtil.FindLink(links, targetObjectId, true);
    const childObjectIds: number[] = [];
    const totalLinks = links.length;

    if (startIndex >= 0) {
      for (let index = startIndex; index < totalLinks && links[index].targetid === targetObjectId; index++) {
        const hookObjectId = links[index].hookid;
        const hookObject = DataUtil.GetObjectPtr(hookObjectId, false);
        if (hookObject) {
          if ((filterDrawingBaseClass != null && hookObject.DrawingObjectBaseClass !== filterDrawingBaseClass) ||
            (filterObjectType != null && hookObject.objecttype !== filterObjectType)) {
            // Skip this hookObject as it doesn't satisfy the filter criteria.
          } else {
            childObjectIds.push(hookObjectId);
          }
        }
      }
    }

    T3Util.Log("O.Opt FindAllChildObjects - Output:", { childObjectIds });
    return childObjectIds;
  }

  static AreSelectedObjects(): boolean {
    T3Util.Log("O.Opt AreSelectedObjects - Input: No parameters");
    const selectedObjects = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID);
    const hasSelection = selectedObjects !== null && selectedObjects.Data.length !== 0;
    T3Util.Log("O.Opt AreSelectedObjects - Output:", hasSelection);
    return hasSelection;
  }

  static FindConnect(targetObjectId, drawingObject, hookPoints, showVisuals, isAttachMode, allowJoin, eventPosition) {
    T3Util.Log("O.Opt FindConnect - Input:", {
      targetObjectId,
      drawingObject: drawingObject ? drawingObject.BlockID : null,
      hookPointsCount: hookPoints ? hookPoints.length : 0,
      showVisuals,
      isAttachMode,
      allowJoin,
      eventPosition
    });

    // Variables for tracking state during connection finding
    let hitCode = 0;
    let deltaX, deltaY, distance;
    let hookIndex;
    let bestIndex = -1;
    let bestDistance;
    let foundConnection = false;
    let hitResult = {};
    let connectionPoints = [];
    let targetPoints = [];
    let minDistance = 1e+30;
    let hookFlags = 0;
    let previousPoint = { x: 0, y: 0 };
    let currentPoint = { x: 0, y: 0 };
    let classFilters = [];
    let lineClassFilters = [];
    let objectClassesToFind = null;
    let sessionFlags = 0;
    let connectHookFlag = NvConstant.HookFlags.LcHookNoExtra;
    let hookPointTypes = OptConstant.HookPts;
    let isContainerHit = false;
    let targetObject;
    let containerPoint;

    // Helper function to check if a hook point is a center type
    const isCenterHookPoint = (hookType) => {
      switch (hookType) {
        case hookPointTypes.KTC:
        case hookPointTypes.KBC:
        case hookPointTypes.KRC:
        case hookPointTypes.KLC:
          return true;
        default:
          if (hookType >= hookPointTypes.CustomBase &&
            hookType < hookPointTypes.CustomBase + 100) {
            return true;
          }
      }
      return false;
    };

    const isLineObject = drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line;

    // Input validation
    if (hookPoints == null) {
      T3Util.Log("O.Opt FindConnect - Output: false (No hook points)");
      return false;
    }

    // Get list of objects to check for connections
    const circularList = T3Gv.opt.linkParams.lpCircList;
    if (circularList == null) {
      T3Util.Log("O.Opt FindConnect - Output: false (No circular list)");
      return false;
    }

    // Store the previous connection point
    previousPoint.x = T3Gv.opt.linkParams.ConnectPt.x;
    previousPoint.y = T3Gv.opt.linkParams.ConnectPt.y;

    // Get hook flags and clear attachment flag
    hookFlags = drawingObject.hookflags;
    hookFlags = Utils2.SetFlag(hookFlags, NvConstant.HookFlags.LcAttachToLine, false);

    // Get session data and flags
    const sessionData = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    if (sessionData) {
      sessionFlags = sessionData.flags;
    }

    // Set up class filters based on mode
    if (isAttachMode) {
      // In attach mode, only consider line objects
      classFilters.push(OptConstant.DrawObjectBaseClass.Line);
      objectClassesToFind = classFilters;
    } else if (T3Gv.opt.linkParams.ArraysOnly) {
      // In arrays-only mode, filter based on object type
      if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
        classFilters.push(OptConstant.DrawObjectBaseClass.Shape);
        objectClassesToFind = classFilters;
      } else if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        classFilters.push(OptConstant.DrawObjectBaseClass.Connector);

        if (sessionFlags & OptConstant.SessionFlags.LLink) {
          classFilters.push(OptConstant.DrawObjectBaseClass.Line);
        }

        objectClassesToFind = classFilters;
      } else {
        objectClassesToFind = classFilters;
      }
    }

    // In join mode, include line objects in the filter
    if (allowJoin) {
      lineClassFilters.push(OptConstant.DrawObjectBaseClass.Line);
    }

    // When drawing from overlay layer, include shapes in the filter
    if (T3Gv.opt.fromOverlayLayer) {
      classFilters.push(OptConstant.DrawObjectBaseClass.Shape);
      objectClassesToFind = classFilters;
    }

    // Reset join index for new search
    T3Gv.opt.linkParams.JoinIndex = -1;

    // For each hook point, look for potential connections
    for (let pointIndex = 0; pointIndex < hookPoints.length; pointIndex++) {
      hitCode = 0;

      // Check for polygon closing if join is allowed
      if (allowJoin ||
        (hitResult = new HitResult(-1, 0, null),
          drawingObject.ClosePolygon(targetObjectId, hookPoints, hitResult) &&
          (allowJoin = true))) {

        // Try to find a polygon join point
        if (allowJoin &&
          (hitResult = new HitResult(-1, 0, null),
            drawingObject.ClosePolygon(targetObjectId, hookPoints, hitResult) ||
            (hitResult = this.FindObject(hookPoints[pointIndex], circularList, lineClassFilters, false, true, null)),
            hitResult && hitResult.hitcode === NvConstant.HitCodes.PLApp)) {

          // Found a valid polygon join point
          T3Gv.opt.linkParams.JoinIndex = hitResult.objectid;
          T3Gv.opt.linkParams.JoinData = hitResult.segment;
          T3Gv.opt.linkParams.JoinSourceData = hookPoints[pointIndex].id;

          // Calculate position offset
          deltaX = hitResult.pt.x - hookPoints[pointIndex].x;
          deltaY = hitResult.pt.y - hookPoints[pointIndex].y;
          T3Gv.opt.dragDeltaX = deltaX;
          T3Gv.opt.dragDeltaY = deltaY;

          // Set connection point based on join data
          if (T3Gv.opt.linkParams.JoinData === OptConstant.HookPts.KTL) {
            T3Gv.opt.linkParams.ConnectPt.x = 0;
            T3Gv.opt.linkParams.ConnectPt.y = 0;
          } else {
            T3Gv.opt.linkParams.ConnectPt.x = OptConstant.Common.DimMax;
            T3Gv.opt.linkParams.ConnectPt.y = OptConstant.Common.DimMax;
          }

          break;
        }
      }

      // Check for previous connection if available
      if (T3Gv.opt.linkParams.PrevConnect >= 0) {
        const prevConnectObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.PrevConnect, false);
        if (prevConnectObject) {
          // Check if object is a container
          const containerPoint = Utils1.DeepCopy(T3Gv.opt.linkParams.ContainerPt[0]);
          if (prevConnectObject.IsShapeContainer(drawingObject, containerPoint)) {
            const hitTestFrame = prevConnectObject.GetHitTestFrame(drawingObject);
            if (Utils2.pointInRect(hitTestFrame, containerPoint)) {
              hitResult.objectid = T3Gv.opt.linkParams.PrevConnect;
              hitResult.hitcode = NvConstant.HitCodes.InContainer;
              hitResult.cellid = null;
            }
          }
          // Check if point is inside object
          else if (Utils2.pointInRect(prevConnectObject.r, hookPoints[pointIndex])) {
            hitCode = prevConnectObject.Hit(hookPoints[pointIndex], isLineObject, false, null);
            if (hitCode) {
              if (hitResult == null) {
                hitResult = { cellid: null };
              }
              hitResult.objectid = T3Gv.opt.linkParams.PrevConnect;
              hitResult.hitcode = hitCode;
              hitResult.cellid = null;
            }
          }
        }
      }

      // If no hit yet, find an object at this point
      if (hitCode === 0) {
        hitResult = this.FindObject(
          hookPoints[pointIndex],
          circularList,
          objectClassesToFind,
          isLineObject,
          false,
          drawingObject
        );
      }

      // Process the hit if found
      if (hitResult && hitResult.hitcode) {
        targetObject = DataUtil.GetObjectPtr(hitResult.objectid, false);
        if (targetObject == null) {
          T3Util.Log("O.Opt FindConnect - Output: false (Target object not found)");
          return false;
        }

        // Handle container hit
        if (hitResult.hitcode === NvConstant.HitCodes.InContainer) {
          isContainerHit = true;
          containerPoint = hitResult.theContainerPt;
        }

        // Process non-container hits
        if (!isContainerHit) {
          // In attach mode, check if auto-insert is allowed
          if (isAttachMode) {
            if (T3Gv.opt.linkParams.AutoInsert) {
              // Only shapes can be auto-inserted
              if (drawingObject.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Shape) {
                continue;
              }

              // Skip if already hooked
              let alreadyHooked = false;
              for (let h = 0; h < targetObject.hooks.length; h++) {
                if (targetObject.hooks[h].objid == drawingObject.BlockID) {
                  alreadyHooked = true;
                  break;
                }
              }
              if (alreadyHooked) {
                continue;
              }

              // Only segmented lines can have objects auto-inserted
              if (targetObject.LineType !== OptConstant.LineType.SEGLINE) {
                continue;
              }
            }

            // Only allow attaching to lines with the proper flag
            if ((targetObject.targflags & NvConstant.HookFlags.LcAttachToLine) === 0) {
              continue;
            }
          }
          // Not in attach mode, check compatibility
          else {
            let targetFlags = targetObject.targflags;

            // Adjust flags based on mode
            if (T3Gv.opt.linkParams.ArraysOnly ||
              (sessionFlags & OptConstant.SessionFlags.SLink) !== 0) {
              // In arrays-only mode, allow attaching shapes to lines
              if (T3Gv.opt.linkParams.ArraysOnly &&
                targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
                targetFlags = Utils2.SetFlag(targetFlags, NvConstant.HookFlags.LcShape, true);
              }
            } else {
              // In normal mode, don't allow attaching shapes to other objects
              targetFlags = Utils2.SetFlag(targetFlags, NvConstant.HookFlags.LcShape, false);
            }

            // Check if hook flags are compatible
            if ((hookFlags & targetFlags) === 0) {
              continue;
            }
          }
        }

        // Set up the appropriate flags for target points calculation
        hookFlags = Utils2.SetFlag(hookFlags, NvConstant.HookFlags.LcShapeOnLine, isAttachMode);

        // Special handling for wall opt walls
        if (drawingObject.objecttype === NvConstant.FNObjectTypes.FlWall) {
          hookFlags = Utils2.SetFlag(hookFlags, NvConstant.HookFlags.LcNoSnaps, true);
        }

        // Get target connection points
        targetPoints = targetObject.GetTargetPoints(
          hookPoints[pointIndex],
          hookFlags | connectHookFlag,
          targetObjectId
        );

        if (!targetPoints || targetPoints.length === 0) {
          T3Util.Log("O.Opt FindConnect - Output: false (No target points)");
          return false;
        }

        // Get perimeter points
        connectionPoints = targetObject.GetPerimPts(
          hitResult.objectid,
          targetPoints,
          null,
          false,
          targetPoints[0].cellid,
          targetObjectId
        );

        // Determine which point to use
        let currentPt = hookPoints[pointIndex];

        // Use container point if applicable
        if (isContainerHit) {
          currentPoint = currentPt = containerPoint;
          hookIndex = containerPoint.id;
        }

        // Find closest connection point
        for (let j = 0; j < connectionPoints.length; j++) {
          const dx = connectionPoints[j].x - currentPt.x;
          const dy = connectionPoints[j].y - currentPt.y;
          distance = dx * dx + dy * dy;

          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = j;
          }
        }

        // For polygons, ensure segment consistency
        if (targetObject.polylist && hitResult.segment >= 0) {
          const segmentCheck = this.FindObject(
            connectionPoints[bestIndex],
            circularList,
            objectClassesToFind,
            false,
            false,
            drawingObject
          );

          if (!segmentCheck) {
            T3Util.Log("O.Opt FindConnect - Output: false (Segment check failed)");
            return false;
          }

          if (segmentCheck.segment != hitResult.segment) {
            T3Util.Log("O.Opt FindConnect - Output: false (Segment mismatch)");
            return false;
          }
        }

        // Get best hook point
        if (!isContainerHit) {
          hookIndex = hookPoints[pointIndex].id;
          hookIndex = targetObject.GetBestHook(targetObjectId, hookPoints[pointIndex].id, targetPoints[bestIndex]);

          if (hookIndex != hookPoints[pointIndex].id) {
            currentPoint = drawingObject.HookToPoint(hookIndex, null);
            currentPoint.x += eventPosition.x - T3Gv.opt.dragStartX;
            currentPoint.y += eventPosition.y - T3Gv.opt.dragStartY;
          } else {
            currentPoint = hookPoints[pointIndex];
          }
        }

        if (bestIndex === -1) {
          return;
        }

        // Check hook permission
        const hookDistanceSq = (deltaX = connectionPoints[bestIndex].x - currentPoint.x) * deltaX +
          (deltaY = connectionPoints[bestIndex].y - currentPoint.y) * deltaY;

        if (!targetObject.AllowHook(hookPoints[pointIndex], targetObjectId, hookDistanceSq)) {
          continue;
        }

        // Set position offsets
        T3Gv.opt.dragDeltaX = deltaX;
        T3Gv.opt.dragDeltaY = deltaY;

        // Handle auto-insert for lines
        if (isAttachMode && T3Gv.opt.linkParams.AutoInsert) {
          T3Gv.opt.linkParams.AutoPoints = [];
          let frameRect = $.extend(true, {}, drawingObject.Frame);

          // Adjust frame for rotation
          const rotationQuadrant = Math.floor((drawingObject.RotationAngle + 45) / 90);
          if (rotationQuadrant) {
            const radians = 90 / (180 / NvConstant.Geometry.PI);
            const corners = [];

            corners.push(new Point(frameRect.x, frameRect.y));
            corners.push(new Point(frameRect.x + frameRect.width, frameRect.y + frameRect.height));
            Utils3.RotatePointsAboutCenter(frameRect, radians, corners);
            frameRect = Utils2.Pt2Rect(corners[0], corners[1]);
          }

          // Apply position offset
          frameRect.x += deltaX;
          frameRect.y += deltaY;

          // Check for intersections
          if (!targetObject.GetFrameIntersects(
            frameRect,
            drawingObject,
            T3Gv.opt.linkParams.AutoPoints,
            T3Gv.opt.linkParams)) {
            continue;
          }
        }

        // Connection found
        foundConnection = true;
        T3Gv.opt.linkParams.ConnectIndex = hitResult.objectid;

        // Track connection history
        if (T3Gv.opt.linkParams.ConnectIndex >= 0 &&
          T3Gv.opt.linkParams.ConnectIndexHistory.indexOf(T3Gv.opt.linkParams.ConnectIndex) < 0) {
          T3Gv.opt.linkParams.ConnectIndexHistory.push(T3Gv.opt.linkParams.ConnectIndex);
        }

        // Store connection details
        T3Gv.opt.linkParams.ConnectPt.x = targetPoints[bestIndex].x;
        T3Gv.opt.linkParams.ConnectPt.y = targetPoints[bestIndex].y;
        T3Gv.opt.linkParams.ConnectInside = targetPoints[bestIndex].cellid;
        T3Gv.opt.linkParams.HookIndex = hookIndex;

        // Set appropriate hook flag
        if (T3Gv.opt.linkParams.AutoInsert && isAttachMode && !T3Gv.opt.linkParams.AutoSinglePoint) {
          T3Gv.opt.linkParams.ConnectHookFlag = NvConstant.HookFlags.LcAutoInsert;
        } else if (T3Gv.opt.linkParams.ArraysOnly &&
          targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
          drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
          isCenterHookPoint(hookIndex)) {
          T3Gv.opt.linkParams.ConnectHookFlag = NvConstant.HookFlags.LcHookReverse;
        } else {
          T3Gv.opt.linkParams.ConnectHookFlag = 0;
        }

        break;
      }
    }

    // Update connection state if no connection found
    if (!foundConnection) {
      // Add current connect index to history if not already there
      if (T3Gv.opt.linkParams.ConnectIndex >= 0 &&
        T3Gv.opt.linkParams.ConnectIndexHistory.indexOf(T3Gv.opt.linkParams.ConnectIndex) < 0) {
        T3Gv.opt.linkParams.ConnectIndexHistory.push(T3Gv.opt.linkParams.ConnectIndex);
      }

      // Reset current connection
      T3Gv.opt.linkParams.ConnectIndex = -1;
    }

    // Update visuals for join mode
    if (T3Gv.opt.linkParams.JoinIndex != T3Gv.opt.linkParams.HiliteJoin && showVisuals) {
      // Hide any current connection highlight
      if (T3Gv.opt.linkParams.HiliteConnect >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteConnect,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          false,
          targetObjectId,
          T3Gv.opt.linkParams.HiliteInside
        );
        T3Gv.opt.linkParams.HiliteConnect = -1;
        T3Gv.opt.linkParams.HiliteInside = null;
        T3Gv.opt.UndoEditMode();
      }

      // Update join highlights
      if (T3Gv.opt.linkParams.JoinIndex >= 0 && T3Gv.opt.linkParams.HiliteJoin < 0) {
        // Show join mode if not already active
        if (OptCMUtil.GetEditMode() != NvConstant.EditState.LinkJoin) {
          OptCMUtil.SetEditMode(NvConstant.EditState.LinkJoin, null, true);
        }
      } else if (T3Gv.opt.linkParams.JoinIndex < 0 && T3Gv.opt.linkParams.HiliteJoin >= 0) {
        T3Gv.opt.UndoEditMode();
      }

      // Hide old join highlight if any
      if (T3Gv.opt.linkParams.HiliteJoin >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteJoin,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          true,
          targetObjectId,
          null
        );
        T3Gv.opt.linkParams.HiliteJoin = -1;
        T3Gv.opt.UndoEditMode();
      }

      // Show new join highlight if available
      if (T3Gv.opt.linkParams.JoinIndex >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.JoinIndex,
          T3Gv.opt.linkParams.ConnectPt,
          true,
          true,
          targetObjectId,
          null
        );
        T3Gv.opt.linkParams.HiliteJoin = T3Gv.opt.linkParams.JoinIndex;

        // Set edit mode to join if not already
        if (OptCMUtil.GetEditMode() != NvConstant.EditState.LinkJoin) {
          OptCMUtil.SetEditMode(NvConstant.EditState.LinkJoin, null, true);
        }
      }
    }

    // Update visuals for connect mode
    if (T3Gv.opt.linkParams.HiliteConnect == T3Gv.opt.linkParams.ConnectIndex &&
      T3Gv.opt.linkParams.HiliteInside == T3Gv.opt.linkParams.ConnectInside ||
      !showVisuals) {
      // If connection already highlighted, just update position if needed
      if (foundConnection &&
        showVisuals &&
        T3Gv.opt.linkParams.HiliteConnect === T3Gv.opt.linkParams.ConnectIndex &&
        T3Gv.opt.linkParams.HiliteInside === T3Gv.opt.linkParams.ConnectInside &&
        connectionPoints.length === 1) {

        if (previousPoint.x != T3Gv.opt.linkParams.ConnectPt.x ||
          previousPoint.y != T3Gv.opt.linkParams.ConnectPt.y) {
          HookUtil.MoveConnectHilite(
            T3Gv.opt.linkParams.ConnectIndex,
            T3Gv.opt.linkParams.ConnectPt,
            T3Gv.opt.linkParams.ConnectInside
          );
        }
      }
    } else {
      // Hide join highlight if any
      if (T3Gv.opt.linkParams.HiliteJoin >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteJoin,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          true,
          targetObjectId,
          null
        );
        T3Gv.opt.linkParams.HiliteJoin = -1;
        T3Gv.opt.UndoEditMode();
      }

      // Update connection mode based on current state
      if (T3Gv.opt.linkParams.ConnectIndex >= 0 && T3Gv.opt.linkParams.HiliteConnect < 0) {
        // Show connect mode if not already active
        if (OptCMUtil.GetEditMode() != NvConstant.EditState.LinkConnect) {
          OptCMUtil.SetEditMode(NvConstant.EditState.LinkConnect, null, true);
        }
      } else if (T3Gv.opt.linkParams.ConnectIndex < 0 && T3Gv.opt.linkParams.HiliteConnect >= 0) {
        // Handle disconnection if needed
        const prevConnect = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.HiliteConnect, false);
        drawingObject.OnDisconnect(
          targetObjectId,
          prevConnect,
          T3Gv.opt.linkParams.HookIndex,
          connectionPoints[bestIndex]
        );
        T3Gv.opt.UndoEditMode();
      }

      // Hide old connection highlight if any
      if (T3Gv.opt.linkParams.HiliteConnect >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteConnect,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          false,
          targetObjectId,
          T3Gv.opt.linkParams.HiliteInside
        );
        T3Gv.opt.linkParams.HiliteConnect = -1;
        T3Gv.opt.linkParams.HiliteInside = null;
        T3Gv.opt.UndoEditMode();
      }

      // Show new connection highlight if available
      if (T3Gv.opt.linkParams.ConnectIndex >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.ConnectIndex,
          T3Gv.opt.linkParams.ConnectPt,
          true,
          false,
          targetObjectId,
          T3Gv.opt.linkParams.ConnectInside
        );
        T3Gv.opt.linkParams.HiliteConnect = T3Gv.opt.linkParams.ConnectIndex;
        T3Gv.opt.linkParams.HiliteInside = T3Gv.opt.linkParams.ConnectInside;

        // Notify object of connection
        drawingObject.OnConnect(
          targetObjectId,
          targetObject,
          T3Gv.opt.linkParams.HookIndex,
          connectionPoints[bestIndex],
          eventPosition
        );

        // Set edit mode to connect if not already
        if (OptCMUtil.GetEditMode() != NvConstant.EditState.LinkConnect) {
          OptCMUtil.SetEditMode(NvConstant.EditState.LinkConnect, null, true);
        }
      }
    }

    T3Util.Log("O.Opt FindConnect - Output:", foundConnection);
    return foundConnection;
  }

  static FindObject(
    point: { x: number; y: number },
    objectIdFilter?: number[],
    classFilter?: any[],
    hitTestOptions?: any,
    usePreciseHitTest?: boolean,
    containerObject?: any
  ) {
    T3Util.Log("O.Opt FindObject - Input:", {
      point,
      objectIdFilter,
      classFilter,
      hitTestOptions,
      usePreciseHitTest,
      containerObject,
    });

    let currentObject: any;
    let isFiltered: boolean;
    let hitFrame: any;
    let result: any = {};
    const hitResult = new HitResult(-1, 0, null);
    const visibleObjects = LayerUtil.ActiveVisibleZList();

    if (visibleObjects == null) {
      T3Util.Log("O.Opt FindObject - Output: no visible objects");
      return -1;
    }

    // Loop through the visible objects from topmost (end) to bottom
    for (let idx = visibleObjects.length - 1; idx >= 0; idx--) {
      // Check if an object filter is provided and if the current object's ID is in the filter.
      if (!(isFiltered = objectIdFilter && objectIdFilter.indexOf(visibleObjects[idx]) !== -1)) {
        currentObject = DataUtil.GetObjectPtr(visibleObjects[idx], false);
        if (currentObject != null) {
          // If containerObject is provided and is a ShapeContainer type, skip connectors.
          if (
            containerObject &&
            (containerObject instanceof Instance.Shape.ShapeContainer /*||
                containerObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER*/) &&
            currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector
          ) {
            continue;
          }
          if (
            currentObject.flags & NvConstant.ObjFlags.Lock ||
            currentObject.flags & NvConstant.ObjFlags.NoLinking
          ) {
            currentObject = null;
          }
        }

        if (currentObject != null) {
          // Skip if the object is not visible or is not meant for connection‐to‐connection linking.
          if (currentObject.flags & NvConstant.ObjFlags.NotVisible) continue;
          if (currentObject.extraflags & OptConstant.ExtraFlags.ConnToConn) continue;
          if (
            containerObject &&
            containerObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
            T3Gv.opt.FindChildArray(visibleObjects[idx], -1) >= 0
          ) {
            continue;
          }

          // If a class filter array is provided, check if the object's class is excluded.
          if (classFilter) {
            isFiltered = classFilter.indexOf(currentObject.DrawingObjectBaseClass) === -1;
          }

          // Get and adjust the hit-test frame for the object.
          const hitTestFrame = currentObject.GetHitTestFrame(containerObject);
          if (hitTestFrame.width < OptConstant.Common.FindObjectMinHitSpot) {
            hitTestFrame.width = OptConstant.Common.FindObjectMinHitSpot;
            hitTestFrame.x -= OptConstant.Common.FindObjectMinHitSpot / 2;
          }
          if (hitTestFrame.height < OptConstant.Common.FindObjectMinHitSpot) {
            hitTestFrame.height = OptConstant.Common.FindObjectMinHitSpot;
            hitTestFrame.y -= OptConstant.Common.FindObjectMinHitSpot / 2;
          }

          // If the object is a ShapeContainer, check if the point is inside its container point.
          if (currentObject instanceof Instance.Shape.ShapeContainer) {
            const containerPoint = Utils1.DeepCopy(T3Gv.opt.linkParams.ContainerPt[0]);
            if (currentObject.IsShapeContainer(containerObject, containerPoint) && Utils2.pointInRect(hitTestFrame, containerPoint)) {
              hitResult.objectid = visibleObjects[idx];
              hitResult.hitcode = NvConstant.HitCodes.InContainer;
              hitResult.theContainerPt = containerPoint;
              T3Util.Log("O.Opt FindObject - Output:", hitResult);
              return hitResult;
            }
            continue;
          }

          // For swimlanes, if the point is inside the hit frame, return null.
          if (false/*currentObject.IsSwimlane()*/ && Utils2.pointInRect(hitTestFrame, point)) {
            T3Util.Log("O.Opt FindObject - Output: found swimlane containment is null");
            return null;
          }

          // If the point is within the hit frame and passes the filter, perform precise hit testing.
          if (!isFiltered && Utils2.pointInRect(hitTestFrame, point)) {
            hitResult.objectid = visibleObjects[idx];
            hitResult.hitcode = currentObject.Hit(point, hitTestOptions, usePreciseHitTest, hitResult);
            if (hitResult.hitcode) {
              T3Util.Log("O.Opt FindObject - Output:", hitResult);
              return hitResult;
            }
          }
        }
      }
    }

    T3Util.Log("O.Opt FindObject - Output: result null");
    return null;
  }


  /**
   * Gets a list of objects to move based on specified criteria.
   *
   * @param objectId - ID of the object to move
   * @param useSelectedList - Whether to use the selected list
   * @param includeEnclosedObjects - Whether to include enclosed objects
   * @param useVisibleList - Whether to use visible objects list
   * @param boundsRect - Optional rectangle to accumulate bounds
   * @param targetOnlyMode - Whether to use target-only mode
   * @returns Array of object IDs that should move together
   */
  static GetMoveList(objectId, useSelectedList, includeEnclosedObjects, useVisibleList, boundsRect, targetOnlyMode) {
    T3Util.Log("O.Opt GetMoveList - Input:", {
      objectId,
      useSelectedList,
      includeEnclosedObjects,
      useVisibleList,
      boundsRect,
      targetOnlyMode
    });

    let index, currentObject;
    T3Gv.opt.moveList = [];

    let objectsList, hookFlags, listCode, objectCount, enclosedObjects, enclosedCount, enclosedIndex;
    const links = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

    if (links == null) {
      T3Util.Log("O.Opt GetMoveList - Output: No links found, returning empty list");
      return T3Gv.opt.moveList;
    }

    // Determine the list code to use based on mode
    listCode = targetOnlyMode
      ? NvConstant.ListCodes.TargOnly
      : NvConstant.ListCodes.MoveTarg;

    // Check for special move target handling
    if (objectId >= 0) {
      currentObject = DataUtil.GetObjectPtr(objectId, false);

      if (currentObject) {
        hookFlags = currentObject.GetHookFlags();

        // If object has MoveTarget flag and hooks, get the target node
        if (hookFlags & NvConstant.HookFlags.LcMoveTarget &&
          useSelectedList &&
          currentObject.hooks.length) {
          objectId = this.GetTargetNode(currentObject.hooks[0].objid);
        }
      }
    }

    // Process lists of objects
    if (useSelectedList || useVisibleList) {
      // Get either visible objects or selected objects based on flag
      objectsList = useVisibleList
        ? LayerUtil.ActiveVisibleZList().slice(0)
        : DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false).slice(0);

      // Process each object in the list
      for (index = 0; index < objectsList.length; index++) {
        currentObject = DataUtil.GetObjectPtr(objectsList[index], false);

        if (currentObject) {
          // Handle special case for event labels
          if (currentObject.objecttype === NvConstant.FNObjectTypes.NgEventLabel) {
            if (objectsList.indexOf(currentObject.associd) === -1) {
              objectsList.push(currentObject.associd);
            }
            continue;
          }

          // Add to move list if object has no hooks or we're including enclosed objects
          if (currentObject.hooks.length === 0 || includeEnclosedObjects) {
            T3Gv.opt.moveList = HookUtil.GetHookList(
              links,
              T3Gv.opt.moveList,
              objectsList[index],
              currentObject,
              listCode,
              boundsRect
            );
          }
        }
      }
    }

    // Process the target object if provided
    if (objectId >= 0) {
      currentObject = DataUtil.GetObjectPtr(objectId, false);

      if (currentObject && (currentObject.hooks.length === 0 || includeEnclosedObjects)) {
        T3Gv.opt.moveList = HookUtil.GetHookList(
          links,
          T3Gv.opt.moveList,
          objectId,
          currentObject,
          listCode,
          boundsRect
        );
      }
    }

    // Include enclosed objects if requested
    if (includeEnclosedObjects) {
      objectCount = T3Gv.opt.moveList.length;

      for (index = 0; index < objectCount; index++) {
        currentObject = DataUtil.GetObjectPtr(T3Gv.opt.moveList[index], false);

        // Get objects enclosed by this object
        enclosedObjects = currentObject.GetListOfEnclosedObjects(true);
        enclosedCount = enclosedObjects.length;

        // Add any enclosed objects that aren't already in the move list
        for (enclosedIndex = 0; enclosedIndex < enclosedCount; enclosedIndex++) {
          const enclosedId = enclosedObjects[enclosedIndex];

          if (T3Gv.opt.moveList.indexOf(enclosedId) < 0) {
            T3Gv.opt.moveList.push(enclosedId);
          }
        }
      }
    }

    T3Util.Log("O.Opt GetMoveList - Output:", {
      objectCount: T3Gv.opt.moveList.length,
      moveList: T3Gv.opt.moveList
    });

    return T3Gv.opt.moveList;
  }
}

export default SelectUtil
