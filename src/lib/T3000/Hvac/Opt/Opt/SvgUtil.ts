

import NvConstant from '../../Data/Constant/NvConstant';
import OptConstant from "../../Data/Constant/OptConstant";
import T3Gv from '../../Data/T3Gv';
import EvtUtil from "../../Event/EvtUtil";
import '../../Util/T3Hammer';
import T3Util from "../../Util/T3Util";
import DataUtil from "../Data/DataUtil";
import UIUtil from "../UI/UIUtil";
import ActionUtil from "./ActionUtil";
import LayerUtil from "./LayerUtil";
import SelectUtil from "./SelectUtil";

class SvgUtil {

  /**
   * Renders selection states for all visible SVG elements in the document
   * Shows dimension lines and handles for selected objects and sets up action triggers
   *
   * @returns {void}
   */
  static RenderAllSVGSelectionStates() {
    T3Util.Log('O.Opt RenderAllSVGSelectionStates - Input: No parameters');

    // Get the visible objects list and the currently selected objects
    const visibleObjectIds = LayerUtil.ActiveVisibleZList();
    const visibleObjectCount = visibleObjectIds.length;
    const selectedObjectsList = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID).Data;
    const targetSelectedId = SelectUtil.GetTargetSelect();

    // List of dimension element types to check for visibility
    const dimensionElementTypes = [
      OptConstant.SVGElementClass.DimLine,
      OptConstant.SVGElementClass.DimText,
      OptConstant.SVGElementClass.AreaDimLine,
      OptConstant.SVGElementClass.DimTextNoEdit
    ];

    /**
     * Creates an event handler for action clicks on drawing objects
     *
     * @param {Object} drawingObject - The object receiving the action
     * @returns {Function} Event handler function
     */
    const createActionClickHandler = function (drawingObject) {
      return function (event) {
        drawingObject.LMActionClick(event);
        return false;
      };
    };

    // Process each visible object
    for (let objectIndex = 0; objectIndex < visibleObjectCount; ++objectIndex) {
      const objectId = visibleObjectIds[objectIndex];
      const indexInSelectedList = selectedObjectsList.indexOf(objectId);

      // Skip if object is not in selection list or has issues
      if (indexInSelectedList < 0) {
        continue;
      }

      const drawingObject = DataUtil.GetObjectPtr(objectId, false);
      if (drawingObject === null || (drawingObject.flags & NvConstant.ObjFlags.NotVisible)) {
        continue;
      }

      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
      if (svgElement === null || svgElement.GetElementById(OptConstant.SVGElementClass.Shape) === null) {
        continue;
      }

      // Handle action triggers
      const actionTriggerId = OptConstant.Common.Action + objectId;
      let actionTriggerElement = T3Gv.opt.svgOverlayLayer.GetElementById(actionTriggerId);

      if (actionTriggerElement === null &&
        (actionTriggerElement = drawingObject.CreateActionTriggers(
          T3Gv.opt.svgDoc,
          objectId,
          svgElement,
          targetSelectedId
        )) !== null) {

        T3Gv.opt.svgOverlayLayer.AddElement(actionTriggerElement);

        try {
          actionTriggerElement.SetRotation(drawingObject.RotationAngle);
        } catch (error) {
          throw error;
        }

        // Add interaction events if object is not locked
        const isObjectUnlocked = (drawingObject.flags & NvConstant.ObjFlags.Lock) === 0;
        const isDocumentEditable = !T3Gv.docUtil.IsReadOnly();
        const canGrow = !drawingObject.NoGrow();

        if (isObjectUnlocked && isDocumentEditable && canGrow) {
          const domElement = actionTriggerElement.DOMElement();
          const hammerInstance = new Hammer(domElement);

          hammerInstance.on('tap', EvtUtil.Evt_ActionTriggerTap);
          hammerInstance.on('dragstart', createActionClickHandler(drawingObject));

          if (T3Gv.opt.isGestureCapable) {
            hammerInstance.on('pinchin', EvtUtil.Evt_WorkAreaHammerPinchIn);
            hammerInstance.on('pinchout', EvtUtil.Evt_WorkAreaHammerPinchOut);
            hammerInstance.on('transformend', EvtUtil.Evt_WorkAreaHammerPinchEnd);
          }

          actionTriggerElement.SetEventProxy(hammerInstance);
        }
      }

      // Handle dimension visibility
      if (drawingObject.Dimensions & NvConstant.DimensionFlags.Select) {
        // Set opacity for dimension elements based on selection state
        for (let elementIndex = svgElement.ElementCount() - 1; elementIndex >= 1; elementIndex--) {
          const currentElement = svgElement.GetElementByIndex(elementIndex);
          const elementId = currentElement.GetID();

          if (dimensionElementTypes.indexOf(elementId) >= 0) {
            currentElement.SetOpacity(indexInSelectedList >= 0 ? 1 : 0);
          }
        }
      }
    }

    T3Util.Log('O.Opt RenderAllSVGSelectionStates - Output: Selection states rendered');
  }

  /**
   * Hides all SVG selection states by clearing the overlay layer
   * Disables dimension visibility for selected objects and clears action arrow timers
   *
   * @returns {void}
   */
  static HideAllSVGSelectionStates() {
    T3Util.Log('O.Opt HideAllSVGSelectionStates: input');

    const selectedList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
    T3Gv.opt.SetDimensionVisibility(selectedList, false);

    if (!T3Gv.opt.fromOverlayLayer) {
      T3Gv.opt.svgOverlayLayer.RemoveAll();
    }

    ActionUtil.ClearAllActionArrowTimers();
    LayerUtil.ShowOverlayLayer();

    T3Util.Log('O.Opt HideAllSVGSelectionStates: output');
  }

  static RenderDirtySVGObjects() {
    this.RenderDirtySVGObjectsCommon(true);
  }

  static RenderDirtySVGObjectsCommon(renderSelectionStates: boolean) {
    T3Util.Log("O.Opt RenderDirtySVGObjectsCommon - Input:", { renderSelectionStates });

    // If no redraw is set from the same editor, clear dirty list and reset flag.
    // if (Collab.NoRedrawFromSameEditor) {
    //   this.dirtyList.length = 0;
    //   Collab.NoRedrawFromSameEditor = false;
    // }

    // if (this.collaboration.NoRedrawFromSameEditor) {
    //   this.dirtyList.length = 0;
    //   // this.collaboration.NoRedrawFromSameEditor = false;
    // }

    // Process if there are dirty objects.
    if (T3Gv.opt.dirtyList.length !== 0) {
      // Get all visible object IDs and active visible object IDs.
      const visibleObjectIds = LayerUtil.VisibleZList();
      const activeVisibleObjectIds = LayerUtil.ActiveVisibleZList();

      // Filter visible objects that are not flagged as "not visible".
      const filteredVisibleObjectIds = (function (objectIds: number[]): number[] {
        const result: number[] = [];
        const notVisibleFlag = NvConstant.ObjFlags.NotVisible;
        for (let index = 0; index < objectIds.length; index++) {
          const objectRef = DataUtil.GetObjectPtr(objectIds[index], false);
          if (objectRef && (objectRef.flags & notVisibleFlag) === 0) {
            result.push(objectIds[index]);
          }
        }
        return result;
      })(visibleObjectIds);

      // Sort the dirty list based on the ordering in the visible list.
      T3Gv.opt.dirtyList.sort((objectId1, objectId2) => {
        return visibleObjectIds.indexOf(objectId1) < visibleObjectIds.indexOf(objectId2) ? -1 : 1;
      });

      // Loop through each dirty object.
      const dirtyCount = T3Gv.opt.dirtyList.length;
      for (let index = 0; index < dirtyCount; index++) {
        let hasSelectionState = false;
        const objectId = T3Gv.opt.dirtyList[index];
        const isMoveOnly = T3Gv.opt.dirtyListMoveOnly[objectId];

        // Find the position of the object in the filtered visible list; if not found, search in the full visible list.
        let positionIndex = filteredVisibleObjectIds.indexOf(objectId);
        if (positionIndex < 0) {
          positionIndex = visibleObjectIds.indexOf(objectId);
        }

        // If the object is found in the visible list.
        if (positionIndex >= 0) {
          if (renderSelectionStates) {
            hasSelectionState = activeVisibleObjectIds.indexOf(objectId) !== -1;
          }
          // If "move-only", call MoveSVG; otherwise add the SVG object.
          if (isMoveOnly) {
            const drawingObject = DataUtil.GetObjectPtr(objectId, false);
            if (drawingObject) {
              drawingObject.MoveSVG();
            }
          } else {
            this.AddSVGObject(positionIndex, objectId, true, hasSelectionState);
          }
        }
      }

      // If a reordering of the dirty list is needed, reassign each SVG element to its new position.
      if (T3Gv.opt.dirtyListReOrder) {
        const count = filteredVisibleObjectIds.length;
        for (let idx = 0; idx < count; idx++) {
          const id = filteredVisibleObjectIds[idx];
          const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(id);
          if (svgElement) {
            T3Gv.opt.svgObjectLayer.RemoveElement(svgElement);
            T3Gv.opt.svgObjectLayer.AddElement(svgElement, idx);
          }
        }
      }
      // Finally, clear the dirty list.
      DataUtil.ClearDirtyList();
    }
    T3Util.Log("O.Opt RenderDirtySVGObjectsCommon - Output: Completed rendering dirty SVG objects");
  }

  static AddSVGObject(containerElement, objectId, removeExisting, renderCallback) {
    T3Util.Log("O.Opt: AddSVGObject - Input:", { containerElement, objectId, removeExisting, renderCallback });

    let svgDocument = T3Gv.opt.svgDoc;
    let drawingObject = T3Gv.stdObj.GetObject(objectId);

    T3Util.Log("O.Opt: AddSVGObject - Drawing object:", drawingObject);

    if (!drawingObject) {
      T3Util.Log("O.Opt: AddSVGObject - Output: No drawing object found.");
      return;
    }

    let drawingData = drawingObject.Data;
    drawingData.tag = objectId;
    let existingSvgElement;
    let shapeContainer = drawingData.CreateShape(svgDocument, renderCallback);

    if (shapeContainer) {
      shapeContainer.SetID(objectId);

      if (removeExisting) {
        existingSvgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
        if (shapeContainer) {
          T3Gv.opt.svgObjectLayer.AddElement(shapeContainer, containerElement);
        }
        if (existingSvgElement) {
          T3Gv.opt.svgObjectLayer.RemoveElement(existingSvgElement);
        }
      } else if (shapeContainer) {
        T3Gv.opt.svgObjectLayer.AddElement(shapeContainer);
      }

      if (shapeContainer) {
        drawingData.PostCreateShapeCallback(svgDocument, shapeContainer, renderCallback);
      }

      try {
        shapeContainer.SetRotation(
          drawingData.RotationAngle,
          drawingData.Frame.x + drawingData.Frame.width / 2,
          drawingData.Frame.y + drawingData.Frame.height / 2
        );
      } catch (error) {
        T3Util.Log("O.Opt: AddSVGObject - SetRotation error:", error);
        throw error;
      }

      if (shapeContainer !== null) {
        if (renderCallback) {
          let domElement = shapeContainer.DOMElement();
          let hammerInstance = new Hammer(domElement);

          let shapeTapHandler = EvtUtil.Evt_ShapeTapFactory(drawingData);
          hammerInstance.on('tap', shapeTapHandler);

          if (!T3Gv.docUtil.IsReadOnly()) {
            T3Gv.Evt_ShapeDragStart = EvtUtil.Evt_ShapeDragStartFactory(drawingData);
            hammerInstance.on('dragstart', T3Gv.Evt_ShapeDragStart);

            // if (this.isMobilePlatform) {
            //   T3Gv.Evt_LM_ShapeHold = EvtUtil.Evt_ShapeHoldFactory(drawingData);
            //   hammerInstance.on('hold', T3Gv.Evt_LM_ShapeHold);
            // }

            if (drawingData.AllowTextEdit() || drawingData.AllowDoubleClick()) {
              T3Gv.Evt_LM_ShapeDoubleTap = EvtUtil.Evt_ShapeDoubleTapFactory(drawingData);
              hammerInstance.on('doubletap', T3Gv.Evt_LM_ShapeDoubleTap);
            }

            shapeContainer.SetEventProxy(hammerInstance);
          }

          if (/*!this.isMobilePlatform &&*/ !T3Gv.docUtil.IsReadOnly()) {
            shapeContainer.svgObj.mouseover(function (event) {
              let elementId = this.SDGObj.GetID();
              let drawingObj = DataUtil.GetObjectPtr(elementId, false);
              if (drawingObj) {
                drawingObj.SetRolloverActions(svgDocument, shapeContainer, event);
              }
            });
          }

          drawingData.RegisterForDataDrop(shapeContainer);
        } else {
          shapeContainer.SetEventBehavior(OptConstant.EventBehavior.None);
        }
      }
    }

    T3Util.Log("O.Opt: AddSVGObject - Output: Completed adding SVG object for objectId", objectId);
  }

  /**
   * Renders all SVG objects in the document.
   *
   * This function performs the following steps:
   * 1. Clears the SVG highlight, overlay, and object layers.
   * 2. Sets the background color.
   * 3. Iterates through the visible SVG objects and adds each one to the display.
   * 4. Renders selection states for SVG objects.
   * 5. Clears the list of objects marked for redrawing.
   *
   * All inputs (if any) and outputs are logged with the prefix "O.Opt".
   */
  static RenderAllSVGObjects(): void {
    T3Util.Log("O.Opt RenderAllSVGObjects - Input: no parameters");

    // Allow full redraw from the editor
    // Collab.NoRedrawFromSameEditor = false;
    // this.collaboration.NoRedrawFromSameEditor = false;

    // Retrieve the lists of objects to be rendered
    const visibleObjectList = LayerUtil.VisibleZList();
    const activeObjectList = LayerUtil.ActiveVisibleZList();
    const totalObjects = visibleObjectList.length;

    // Clear SVG layers and set the current background color
    LayerUtil.ClearSVGHighlightLayer();
    LayerUtil.ClearSVGOverlayLayer();
    LayerUtil.ClearSVGObjectLayer();
    UIUtil.SetBackgroundColor();

    // Iterate through all visible objects and add them to the SVG canvas.
    for (let index = 0; index < totalObjects; ++index) {
      const currentObjectID = visibleObjectList[index];
      // Check if the current object is selected (present in activeObjectList)
      const isSelected = activeObjectList.indexOf(currentObjectID) !== -1;
      SvgUtil.AddSVGObject(index, currentObjectID, false, isSelected);
    }

    // Render selection states and clear the dirty list
    SvgUtil.RenderAllSVGSelectionStates();
    DataUtil.ClearDirtyList();

    T3Util.Log("O.Opt RenderAllSVGObjects - Output: rendering complete");
  }

  /**
   * Gets an SVG element from the drag element list
   * @param index - Index of the element to retrieve
   * @returns The SVG element or null if index is invalid
   */
  static GetSVGDragElement(index) {
    T3Util.Log("O.Opt GetSVGDragElement - Input:", index);

    if (!T3Gv.opt.dragElementList ||
      index < 0 ||
      index >= T3Gv.opt.dragElementList.length) {
      T3Util.Log("O.Opt GetSVGDragElement - Output: null (invalid index)");
      return null;
    }

    const element = T3Gv.opt.svgObjectLayer.GetElementById(T3Gv.opt.dragElementList[index]);
    T3Util.Log("O.Opt GetSVGDragElement - Output:", element ? "Element found" : "null");
    return element;
  }

  /**
     * Shows or hides the SVG selection state for a given object.
     * Logs the input parameters and the final state change.
     * @param objectId - The identifier of the object.
     * @param isSelected - A boolean flag indicating whether the object is selected.
     */
  static ShowSVGSelectionState(objectId: number, isSelected: boolean): void {
    T3Util.Log("O.Opt ShowSVGSelectionState - Input:", { objectId, isSelected });

    // Build an action element id using the constant prefix and object id.
    const actionElementId = OptConstant.Common.Action + objectId;
    // Retrieve the currently target selected object id.
    const targetSelection = SelectUtil.GetTargetSelect();
    // Attempt to retrieve the overlay SVG element for the action.
    let overlayElement = T3Gv.opt.svgOverlayLayer.GetElementById(actionElementId);
    // Retrieve the main SVG object element.
    const objectElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);
    // Get the object data pointer.
    const objectData = DataUtil.GetObjectPtr(objectId, false);

    if (objectData !== null) {
      let eventProxy: any;

      // If there is no overlay element and the selection should be shown.
      if (overlayElement === null && isSelected) {
        // Create action triggers for the object.
        overlayElement = objectData.CreateActionTriggers(T3Gv.opt.svgDoc, objectId, objectElement, targetSelection);
        if (overlayElement !== null) {
          // Add the created trigger element to the overlay layer.
          T3Gv.opt.svgOverlayLayer.AddElement(overlayElement);
          try {
            // Set rotation on the overlay element.
            overlayElement.SetRotation(objectData.RotationAngle);
          } catch (error) {
            throw error;
          }
          // If the object is allowed to grow, then set up gesture event bindings.
          if (!objectData.NoGrow()) {
            const domElement = overlayElement.DOMElement();
            const hammerInstance = Hammer(domElement);
            hammerInstance.on('tap', Evt_ActionTriggerTap);
            hammerInstance.on('dragstart', ((currentObject) => {
              return (event: any) => {
                currentObject.LMActionClick(event);
                return false;
              };
            })(objectData));
            overlayElement.SetEventProxy(hammerInstance);
          }
        }
      } else if (overlayElement !== null && !isSelected) {
        // If the overlay element exists and selection is removed, then remove it.
        T3Gv.opt.svgOverlayLayer.RemoveElement(overlayElement);
      }

      // Update the opacity of dimension elements if the object's dimensions include selection flag.
      if (objectData.Dimensions & NvConstant.DimensionFlags.Select) {
        for (let index = objectElement.ElementCount() - 1; index >= 1; index--) {
          const childElement = objectElement.GetElementByIndex(index);
          // If the element is a dimension line or dimension text, update its opacity.
          if (
            childElement.GetID() === OptConstant.SVGElementClass.DimLine ||
            childElement.GetID() === OptConstant.SVGElementClass.DimText
          ) {
            childElement.SetOpacity(isSelected ? 1 : 0);
          }
        }
      }
    }

    T3Util.Log("O.Opt ShowSVGSelectionState - Output:", { objectId, isSelected });
  }

  static ClearOverlayElementsByID(elementID: string, resetHighlight?: boolean) {
    T3Util.Log("O.Opt ClearOverlayElementsByID - Input:", { elementID, resetHighlight });

    // Get list of overlay elements matching the provided ID
    const overlayElementList = T3Gv.opt.svgOverlayLayer.GetElementListWithId(elementID);
    const elementCount = overlayElementList.length;

    // Remove each overlay element from the SVG overlay layer
    for (let index = 0; index < elementCount; ++index) {
      T3Gv.opt.svgOverlayLayer.RemoveElement(overlayElementList[index]);
    }

    // If resetHighlight flag is true and there is a currently highlighted shape, reset its effects and cursors
    if (resetHighlight && T3Gv.opt.curHiliteShape !== -1) {
      const highlightedObject = DataUtil.GetObjectPtr(T3Gv.opt.curHiliteShape, false);
      if (highlightedObject) {
        highlightedObject.SetRuntimeEffects(false);
        highlightedObject.ClearCursors();
      }
    }

    T3Util.Log("O.Opt ClearOverlayElementsByID - Output: Completed");
  }

  static RenderLastSVGObject(shouldRenderSelectionStates) {

    T3Util.Log('= Opt RenderLastSVGObject shouldRenderSelectionStates', shouldRenderSelectionStates);

    const isfromOverlayLayer = T3Gv.opt.fromOverlayLayer;
    const activeLayerZList = LayerUtil.ActiveLayerZList();
    const lastObjectId = activeLayerZList[activeLayerZList.length - 1];

    SvgUtil.AddSVGObject(undefined, lastObjectId, false, shouldRenderSelectionStates);

    if (shouldRenderSelectionStates) {
      SvgUtil.RenderAllSVGSelectionStates();
    }
  }

  /**
   * Renders dirty SVG objects without updating mouse position indicators
   * This function calls the common rendering function with a parameter indicating
   * that selection states should not be rendered. This is useful when only the
   * visual appearance of objects needs to be updated without changing interactive
   * elements like selection handles or cursors.
   */
  static RenderDirtySVGObjectsNoSetMouse() {
    this.RenderDirtySVGObjectsCommon(false);
  }

}

export default SvgUtil
