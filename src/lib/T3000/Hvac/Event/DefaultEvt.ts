

import GlobalData from '../Data/GlobalData';
import Utils2 from '../Helper/Utils2';
import $ from 'jquery';
import BaseDrawingObject from '../Shape/Shape.BaseDrawingObject'
import Instance from '../Data/Instance/Instance'
import ConstantData from '../Data/ConstantData'
import RightClickData from '../Model/RightClickData'

const DefaultEvt = {
  Evt_MouseMove: null,
  Evt_WorkAreaHammerTap: null,
  Evt_WorkAreaMouseWheel: null,
  Evt_WorkAreaHammerDragStart: null,
  Evt_RubberBandDrag: null,
  Evt_RubberBandDragEnd: null,
  Evt_WorkAreaHammerDrawStart: null,
  Evt_DrawTrackHandlerFactory: null,
  Evt_DrawReleaseHandlerFactory: null,
  Evt_ShapeTapFactory: null,
  Evt_ShapeDragStartFactory: null,
  Evt_ShapeHoldFactory: null,
  Evt_ShapeDoubleTapFactory: null,
  Evt_PolyLineDrawDragStart: null,
  Evt_ShapeDrag: null,
  Evt_ShapeDragEnd: null,
  Evt_ActionTrackHandlerFactory: null,
  Evt_ActionReleaseHandlerFactory: null,
  Evt_StampObjectDragEndFactory: null,
  Evt_StampObjectDrag: null,
  Evt_ActionTriggerTap: null,
  Evt_WorkAreaHammerPinchIn: null,
  Evt_WorkAreaHammerPinchOut: null,
  Evt_WorkAreaHammerPinchEnd: null,
  Evt_MouseStampObjectMove: null,
  Evt_MouseStampObjectDoneFactory: null,
  Evt_DimensionTextKeyboardLifter: null,
  Evt_DimensionTextDoubleTapFactory: null,
  Evt_DimensionTextTapFactory: null
}

DefaultEvt.Evt_MouseMove = function (event) {
  console.log("= E.DefaultEvt - Evt_MouseMove: Input event:", event);

  const { clientX, clientY } = event;
  const { dispX, dispY, dispWidth, dispHeight } = GlobalData.optManager.svgDoc.docInfo;

  if (
    clientX >= dispX &&
    clientY >= dispY &&
    clientX < dispX + dispWidth &&
    clientY < dispY + dispHeight
  ) {
    const convertedCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
    console.log("= E.DefaultEvt - Evt_MouseMove: Converted coords:", convertedCoords);

    GlobalData.optManager.ShowXY(true);
    GlobalData.optManager.UpdateDisplayCoordinates(null, convertedCoords, null, null);
    console.log("= E.DefaultEvt - Evt_MouseMove: Updated display coordinates with:", convertedCoords);
  } else {
    GlobalData.optManager.ShowXY(false);
    console.log("= E.DefaultEvt - Evt_MouseMove: Coordinates out of bounds.");
  }
}

DefaultEvt.Evt_WorkAreaHammerTap = function (event) {
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: Input event:", event);

  // Stop event propagation and set UI adaptation
  Utils2.StopPropagationAndDefaults(event);
  GlobalData.optManager.SetUIAdaptation(event);

  // Determine if the event is a right-click
  const isRightClick = GlobalData.optManager.IsRightClick(event);
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: isRightClick =", isRightClick);

  // If not a right-click, clear selection click and log the output
  if (!isRightClick) {
    GlobalData.optManager.ClearSelectionClick();
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: Cleared selection click");
  }

  // Allow typing in the work area
  ConstantData.DocumentContext.CanTypeInWorkArea = true;
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: Set CanTypeInWorkArea to true");

  // Handle right-click specific actions
  if (isRightClick) {
    GlobalData.optManager.RightClickParams = new RightClickData();
    GlobalData.optManager.RightClickParams.HitPt = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: RightClickParams set with HitPt:", GlobalData.optManager.RightClickParams.HitPt);

    // Commands.MainController.ShowContextualMenu(
    //   Resources.Controls.ContextMenus.WorkArea.Id.toLowerCase(),
    //   event.gesture.center.clientX,
    //   event.gesture.center.clientY
    // );
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: Contextual menu shown at:",
      event.gesture.center.clientX, event.gesture.center.clientY);
  }

  console.log("= E.DefaultEvt - Evt_WorkAreaHammerTap: Returning false");
  return false;
}

DefaultEvt.Evt_WorkAreaMouseWheel = function (event: WheelEvent): void {
  console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Received event:", event);

  if (event.ctrlKey) {
    const clientX = event.clientX;
    const clientY = event.clientY;
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: clientX:", clientX, "clientY:", clientY);

    const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Converted window coords to docCoords:", docCoords);

    if (event.deltaY > 0) {
      console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Zooming Out");
      Commands.MainController.Document.ZoomInandOut(false, true);
    } else if (event.deltaY < 0) {
      console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Zooming In");
      Commands.MainController.Document.ZoomInandOut(true, true);
    }

    Utils2.StopPropagationAndDefaults(event);

    const windowCoordsAfterZoom = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Converted docCoords back to windowCoords:", windowCoordsAfterZoom);

    const diffX = clientX - windowCoordsAfterZoom.x;
    const diffY = clientY - windowCoordsAfterZoom.y;
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Scroll difference calculated diffX:", diffX, "diffY:", diffY);

    const $svgArea = $('#svg-area');
    const scrollLeft = $svgArea.scrollLeft();
    const scrollTop = $svgArea.scrollTop();
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Current scroll position scrollLeft:", scrollLeft, "scrollTop:", scrollTop);

    GlobalData.docHandler.SetScroll(scrollLeft - diffX, scrollTop - diffY);
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: Updated scroll position to:", { scrollLeft: scrollLeft - diffX, scrollTop: scrollTop - diffY });
  } else {
    console.log("= E.DefaultEvt - Evt_WorkAreaMouseWheel: ctrlKey is not pressed, no zoom action is taken.");
  }
}

DefaultEvt.Evt_WorkAreaHammerDragStart = function (event) {
  console.log("= S.BaseShape - Evt_WorkAreaHammerDragStart Input event:", event);

  const svgArea = $('#svg-area');
  const offset = svgArea.offset();
  const relativeX = event.gesture.center.clientX - offset.left;
  const relativeY = event.gesture.center.clientY - offset.top;
  const areaWidth = svgArea[0].clientWidth;
  const areaHeight = svgArea[0].clientHeight;

  console.log("= S.BaseShape - Calculated coordinates:", { relativeX, relativeY, areaWidth, areaHeight });

  if (relativeX < areaWidth && relativeY < areaHeight) {
    if (
      GlobalData.optManager.isMobilePlatform ||
      GlobalData.optManager.IsWheelClick(event) ||
      ConstantData.DocumentContext.SpacebarDown
    ) {
      if (!GlobalData.optManager.bTouchPanStarted) {
        GlobalData.optManager.bTouchPanStarted = true;
        GlobalData.optManager.touchPanX = event.gesture.center.clientX;
        GlobalData.optManager.touchPanY = event.gesture.center.clientY;

        // GlobalData.optManager.WorkAreaHammer.on('drag', HV_LM_WorkAreaHammerPan);
        GlobalData.optManager.WorkAreaHammer.on('mousemove', HV_LM_WorkAreaHammerPan);
        GlobalData.optManager.WorkAreaHammer.on('dragend', HV_LM_WorkAreaHammerPanEnd);

        Utils2.StopPropagationAndDefaults(event);
        console.log("= S.BaseShape - Touch pan started with coordinates:", {
          x: event.gesture.center.clientX,
          y: event.gesture.center.clientY
        });
      }
      console.log("= S.BaseShape - Returning early due to mobile/spacebar/wheel click condition.");
      return false;
    } else {
      if (GlobalData.optManager.bTouchPanStarted) {
        HV_LM_WorkAreaHammerPanEnd();
        console.log("= S.BaseShape - Ending touch pan.");
      }
      Utils2.StopPropagationAndDefaults(event);
      GlobalData.optManager.SetUIAdaptation(event);

      if (GlobalData.optManager.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();
        console.log("= S.BaseShape - Right click detected, event suppressed.");
        return false;
      } else {
        GlobalData.optManager.StartRubberBandSelect(event);
        console.log("= S.BaseShape - Rubber band selection started.");
        return false;
      }
    }
  } else {
    console.log("= S.BaseShape - Event occurred outside SVG area. No action taken.");
  }
}

DefaultEvt.Evt_RubberBandDrag = function (event) {
  console.log("= E.DefaultEvt - Evt_RubberBandDrag: Input event:", event);
  Utils2.StopPropagationAndDefaults(event);

  const modalOperations = ConstantData.ModalOperations;

  try {
    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Current modal operation:", GlobalData.optManager.currentModalOperation);

    switch (GlobalData.optManager.currentModalOperation) {
      case modalOperations.ADDCORNER:
      case modalOperations.SPLITWALL:
        console.log("= E.DefaultEvt - Evt_RubberBandDrag: Cancelling add corner/split wall operation");
        GlobalData.gFloorplanManager.AddCornerCancel();
        break;
    }

    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Checking AutoScrollCommon");
    if (!GlobalData.optManager.AutoScrollCommon(event, false, "RubberBandSelectDoAutoScroll")) {
      console.log("= E.DefaultEvt - Evt_RubberBandDrag: AutoScrollCommon returned false, aborting further processing");
      return;
    }

    const convertedCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );
    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Converted coordinates:", convertedCoords);
    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Current rubber band:", GlobalData.optManager.theRubberBand);

    GlobalData.optManager.RubberBandSelectMoveCommon(convertedCoords.x, convertedCoords.y);
    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Updated rubber band selection with coordinates:", convertedCoords);
  } catch (error) {
    console.log("= E.DefaultEvt - Evt_RubberBandDrag: Exception occurred:", error);
    GlobalData.optManager.RubberBandSelect_ExceptionCleanup(error);
    GlobalData.optManager.ExceptionCleanup(error);
    throw error;
  }
}

DefaultEvt.Evt_RubberBandDragEnd = function (event: any) {
  console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Input event:", event);

  Utils2.StopPropagationAndDefaults(event);

  try {
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Unbinding rubber band hammer events");
    GlobalData.optManager.unbindRubberBandHammerEvents();

    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Resetting auto-scroll timer");
    GlobalData.optManager.ResetAutoScrollTimer();

    const rubberBandFrame = GlobalData.optManager.theRubberBandFrame;
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: RubberBandFrame before selection:", rubberBandFrame);

    const shiftKey = event.gesture.srcEvent.shiftKey;
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Shift key pressed:", shiftKey);

    GlobalData.optManager.SelectAllInRect(rubberBandFrame, shiftKey);
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Selected all elements in rectangle");

    GlobalData.optManager.svgOverlayLayer.RemoveElement(GlobalData.optManager.theRubberBand);
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Removed rubber band from overlay");

    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Setting rubber band to null");
    GlobalData.optManager.theRubberBand = null;

    GlobalData.optManager.theRubberBandStartX = 0;
    GlobalData.optManager.theRubberBandStartY = 0;
    GlobalData.optManager.theRubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Reset rubber band parameters to:", GlobalData.optManager.theRubberBandFrame);

    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Output: Rubber band drag operation completed successfully");
  } catch (error) {
    console.log("= E.DefaultEvt - Evt_RubberBandDragEnd: Error occurred:", error);
    GlobalData.optManager.RubberBandSelect_ExceptionCleanup(error);
    GlobalData.optManager.ExceptionCleanup(error);
    throw error;
  }
}

DefaultEvt.Evt_WorkAreaHammerDrawStart = function (event) {
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: Input event:", event);

  // Stop propagation and prevent default behaviours
  event.stopPropagation();
  event.preventDefault();
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: Event propagation stopped and default prevented");

  // Check for right-click
  const isRightClick = GlobalData.optManager.IsRightClick(event);
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: isRightClick =", isRightClick);

  // If not a right-click, set UI adaptation and start drawing a new object
  if (!isRightClick) {
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: Setting UI adaptation and starting new object draw");
    GlobalData.optManager.SetUIAdaptation(event);
    GlobalData.optManager.StartNewObjectDraw(event);
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: New object draw started");
  } else {
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: Right click detected, aborting draw start");
  }

  console.log("= E.DefaultEvt - Evt_WorkAreaHammerDrawStart: Returning false");
  return false;
}

DefaultEvt.Evt_DrawTrackHandlerFactory = function (handler: any) {
  return function (event: any) {
    console.log("= E.DefaultEvt - Evt_DrawTrackHandlerFactory: Received input event:", event);
    try {
      const result = handler.LM_DrawTrack(event);
      console.log("= E.DefaultEvt - Evt_DrawTrackHandlerFactory: LM_DrawTrack output:", result);
      return result;
    } catch (error) {
      console.error("= E.DefaultEvt - Evt_DrawTrackHandlerFactory: Caught error:", error);
      handler.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }
}

DefaultEvt.Evt_DrawReleaseHandlerFactory = function (handler: any) {
  return function (event: any) {
    console.log("= E.DefaultEvt - Evt_DrawReleaseHandlerFactory: Received input event:", event);
    try {
      const result = handler.LM_DrawRelease(event);
      console.log("= E.DefaultEvt - Evt_DrawReleaseHandlerFactory: Output result:", result);
      return result;
    } catch (error) {
      console.error("= E.DefaultEvt - Evt_DrawReleaseHandlerFactory: Error occurred:", error);
      GlobalData.optManager.CancelModalOperation();
      handler.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }
}

DefaultEvt.Evt_ShapeTapFactory = function (elementRef) {
  return function (event) {
    console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Input event:", event);

    Utils2.StopPropagationAndDefaults(event);
    GlobalData.optManager.SetUIAdaptation(event);

    const isRightClick = GlobalData.optManager.IsRightClick(event);

    if (GlobalData.docHandler.IsReadOnly()) {
      if (isRightClick) {
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Read-only mode - right click detected. Calling RightClick.");
        elementRef.RightClick(event);
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Output: false");
        return false;
      }
    } else if (isRightClick) {
      console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Right click detected. Calling RightClick.");
      elementRef.RightClick(event);
      console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Output: false");
      return false;
    }

    switch (GlobalData.optManager.currentModalOperation) {
      case ConstantData.ModalOperations.NONE: {
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Modal operation NONE.");
        const hyperlinkHit = GlobalData.optManager.CheckTextHyperlinkHit(elementRef, event);
        if (!hyperlinkHit) {
          GlobalData.optManager.LM_TestIconClick(event);
          if (GlobalData.optManager.GetUIAdaptation(event)) {
            if (!GlobalData.docHandler.IsReadOnly()) {
              const targetElement = GlobalData.optManager.svgObjectLayer.GetElementByID(elementRef.tag);
              elementRef.SetRolloverActions(GlobalData.optManager.svgDoc, targetElement);
              console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Set rollover actions with target element:", targetElement);
            }
          }
        }
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Output: false");
        return false;
      }
      case ConstantData.ModalOperations.DRAW:
      case ConstantData.ModalOperations.POLYLINEDRAW:
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Modal operation DRAW/POLYLINEDRAW. Returning false.");
        return false;
      case ConstantData.ModalOperations.STAMPTEXTONTAP: {
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Modal operation STAMPTEXTONTAP.");
        const cancelResult = GlobalData.optManager.stampSticky || GlobalData.optManager.CancelObjectStampTextOnTap(true);
        if (cancelResult && elementRef.AllowTextEdit()) {
          const targetElement = GlobalData.optManager.svgObjectLayer.GetElementByID(elementRef.tag);
          GlobalData.optManager.ActivateTextEdit(targetElement.svgObj.SDGObj, event, false);
          console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Activated text edit on element:", targetElement);
        }
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Output: false");
        return false;
      }
      default:
        console.log("= E.DefaultEvt - Evt_ShapeTapFactory: Unhandled modal operation. Returning false.");
        return false;
    }
  }
}

DefaultEvt.Evt_ShapeDragStartFactory = function (handlerEvent: any) {
  console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Received handlerEvent:", handlerEvent);
  return function (evt: any) {
    console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory inner function: Received evt:", evt);

    // Check if the current modal operation is DRAW
    if (GlobalData.optManager.currentModalOperation === ConstantData.ModalOperations.DRAW) {
      console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Modal operation DRAW detected. Returning false.");
      return false;
    }

    // Check if the current modal operation is STAMP
    if (GlobalData.optManager.currentModalOperation === ConstantData.ModalOperations.STAMP) {
      console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Modal operation STAMP detected. Stopping propagation and returning false.");
      evt.stopPropagation();
      if (evt.gesture) {
        evt.gesture.stopPropagation();
      }
      return false;
    }

    // Set UI adaptation and check for right-click
    GlobalData.optManager.SetUIAdaptation(evt);
    if (GlobalData.optManager.IsRightClick(evt)) {
      console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Right click detected. Preventing default and stopping propagation.");
      evt.preventDefault();
      evt.stopPropagation();
      if (evt.gesture) {
        evt.gesture.preventDefault();
        evt.gesture.stopPropagation();
      }
      return false;
    }

    // Switch based on the current modal operation
    console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Current modal operation:", GlobalData.optManager.currentModalOperation);
    let outputResult;
    switch (GlobalData.optManager.currentModalOperation) {
      case ConstantData.ModalOperations.NONE:
      case ConstantData.ModalOperations.FORMATPAINTER:
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Modal operation NONE/FORMATPAINTER detected. Executing LM_MoveClick.");
        Utils2.StopPropagationAndDefaults(evt);
        outputResult = GlobalData.optManager.LM_MoveClick(evt);
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: LM_MoveClick output:", outputResult);
        return false;

      case ConstantData.ModalOperations.DRAW:
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Modal operation DRAW detected in switch. Delegating to Evt_WorkAreaHammerDrawStart.");
        outputResult = DefaultEvt.Evt_WorkAreaHammerDrawStart(evt);
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Evt_WorkAreaHammerDrawStart output:", outputResult);
        return outputResult;

      case ConstantData.ModalOperations.POLYLINEDRAW:
      case ConstantData.ModalOperations.STAMPTEXTONTAP:
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Modal operation POLYLINEDRAW or STAMPTEXTONTAP detected. Returning false.");
        return false;

      default:
        console.log("= E.DefaultEvt - Evt_ShapeDragStartFactory: Unhandled modal operation. Returning false.");
        return false;
    }
  }
}

DefaultEvt.Evt_ShapeHoldFactory = function (element: any) {
  return function (event: any) {
    console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Input event:", event);

    let result: boolean;

    switch (GlobalData.optManager.currentModalOperation) {
      case ConstantData.ModalOperations.NONE:
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Current modal operation NONE");
        event.gesture.stopDetect();
        Utils2.StopPropagationAndDefaults(event);
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Calling RightClick on element:", element);
        element.RightClick(event);

        try {
          console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Calling LM_MoveRelease with event:", event);
          GlobalData.optManager.LM_MoveRelease(event);
          console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: LM_MoveRelease executed successfully");
        } catch (err) {
          console.error("= E.DefaultEvt - Evt_ShapeHoldFactory: Error in LM_MoveRelease:", err);
          GlobalData.optManager.LM_Move_ExceptionCleanup(err);
          GlobalData.optManager.ExceptionCleanup(err);
          throw err;
        }

        result = false;
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Output result:", result);
        return result;

      case ConstantData.ModalOperations.DRAW:
      case ConstantData.ModalOperations.POLYLINEDRAW:
      case ConstantData.ModalOperations.STAMPTEXTONTAP:
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Current modal operation DRAW/POLYLINEDRAW/STAMPTEXTONTAP");
        result = false;
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Output result:", result);
        return result;

      default:
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Unhandled modal operation, returning false");
        result = false;
        console.log("= E.DefaultEvt - Evt_ShapeHoldFactory: Output result:", result);
        return result;
    }
  }
}

DefaultEvt.Evt_ShapeDoubleTapFactory = function (elementRef: any) {
  console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Factory called with elementRef:", elementRef);
  return function (event: any) {
    console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Inner function called with event:", event);

    const blockId = elementRef.BlockID;
    const objectPtr = GlobalData.optManager.GetObjectPtr(blockId, false);
    console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Retrieved objectPtr:", objectPtr);

    if (!objectPtr || !(objectPtr instanceof BaseDrawingObject)) {
      console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: objectPtr is invalid, returning false");
      return false;
    }

    const uiAdaptationResult = GlobalData.optManager.SetUIAdaptation(event);
    console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: UI adaptation set, result:", uiAdaptationResult);

    const currentModal = GlobalData.optManager.currentModalOperation;
    console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Current modal operation:", currentModal);

    switch (currentModal) {
      case ConstantData.ModalOperations.NONE: {
        if (GlobalData.optManager.bInNoteEdit) {
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Already in note edit mode, returning false");
          return false;
        }

        const table = elementRef.GetTable(false);
        const graph = elementRef.GetGraph(false);
        console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Retrieved table:", table, "; graph:", graph);

        if (elementRef.objecttype === ConstantData.ObjectTypes.SD_OBJT_D3SYMBOL) {
          switch (elementRef.codeLibID) {
            case 'RadialGauge':
            case 'LinearGauge': {
              console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Detected gauge for codeLibID:", elementRef.codeLibID);
              const editGaugeResult = GlobalData.optManager.EditGauge();
              console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: EditGauge result:", editGaugeResult);
              return false;
            }
            case 'BarChart':
            case 'PieChart':
            case 'LineChart':
            case 'SankeyChart': {
              console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Detected graph for codeLibID:", elementRef.codeLibID);
              const editGraphResult = GlobalData.optManager.EditGraph();
              console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: EditGraph result:", editGraphResult);
              return false;
            }
            default: {
              console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Unhandled codeLibID:", elementRef.codeLibID);
              break;
            }
          }
        } else if (elementRef instanceof Instance.Shape.ShapeContainer) {
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Instance of ShapeContainer detected, invoking DoubleClick");
          const doubleClickResult = elementRef.DoubleClick(event);
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: DoubleClick result:", doubleClickResult);
          return false;
        }

        if (table) {
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Table detected, setting up table action");
          const tableActionResult = GlobalData.optManager.Table_SetupAction(
            event,
            elementRef.BlockID,
            ConstantData.Defines.TableCellHit,
            -1
          );
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Table_SetupAction result:", tableActionResult);
          return false;
        }

        if (graph) {
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Graph detected, setting up graph action");
          const graphActionResult = GlobalData.optManager.Graph_SetupAction(
            event,
            elementRef.BlockID,
            ConstantData.Defines.GraphTextHit,
            -1
          );
          console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Graph_SetupAction result:", graphActionResult);
          return false;
        }

        const targetElement = GlobalData.optManager.svgObjectLayer.GetElementByID(elementRef.tag);
        console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Target element for text edit:", targetElement);
        const activateResult = GlobalData.optManager.ActivateTextEdit(targetElement.svgObj.SDGObj, event);
        console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: ActivateTextEdit result:", activateResult);
        return false;
      }
      case ConstantData.ModalOperations.DRAW:
      case ConstantData.ModalOperations.POLYLINEDRAW:
      case ConstantData.ModalOperations.STAMPTEXTONTAP: {
        console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Modal operation DRAW/POLYLINEDRAW/STAMPTEXTONTAP detected, returning false");
        return false;
      }
      default: {
        console.log("= E.DefaultEvt - Evt_ShapeDoubleTapFactory: Unhandled modal operation, returning false");
        return false;
      }
    }
  }
}

DefaultEvt.Evt_PolyLineDrawDragStart = function (event: any): boolean {
  console.log("= E.DefaultEvt - Evt_PolyLineDrawDragStart: Input event:", event);

  const result = false;

  console.log("= E.DefaultEvt - Evt_PolyLineDrawDragStart: Output result:", result);
  return result;
}

DefaultEvt.Evt_ShapeDrag = function (event: any) {
  console.log("= E.DefaultEvt - Evt_ShapeDrag: Received input event:", event);

  Utils2.StopPropagationAndDefaults(event);

  try {
    const isOverCustomLibrary = GlobalData.optManager.CheckDragIsOverCustomLibrary(event);
    console.log("= E.DefaultEvt - Evt_ShapeDrag: isOverCustomLibrary =", isOverCustomLibrary);

    GlobalData.optManager.LM_MoveTrack(event, isOverCustomLibrary);
    console.log("= E.DefaultEvt - Evt_ShapeDrag: LM_MoveTrack executed with isOverCustomLibrary =", isOverCustomLibrary);
  } catch (error) {
    console.error("= E.DefaultEvt - Evt_ShapeDrag: Error occurred:", error);
    GlobalData.optManager.LM_Move_ExceptionCleanup(error);
    GlobalData.optManager.ExceptionCleanup(error);
    throw error;
  }

  console.log("= E.DefaultEvt - Evt_ShapeDrag: Completed processing event");
}


DefaultEvt.Evt_ShapeDragEnd = function (event: any): void {
  console.log("= E.DefaultEvt - Evt_ShapeDragEnd: Received input event:", event);

  // Stop event propagation and prevent default behavior
  Utils2.StopPropagationAndDefaults(event);

  try {
    console.log("= E.DefaultEvt - Evt_ShapeDragEnd: Calling LM_MoveRelease with event:", event);
    GlobalData.optManager.LM_MoveRelease(event);
    console.log("= E.DefaultEvt - Evt_ShapeDragEnd: LM_MoveRelease executed successfully");
  } catch (error) {
    console.error("= E.DefaultEvt - Evt_ShapeDragEnd: Error occurred:", error);
    GlobalData.optManager.LM_Move_ExceptionCleanup(error);
    GlobalData.optManager.ExceptionCleanup(error);
    throw error;
  }

  console.log("= E.DefaultEvt - Evt_ShapeDragEnd: Completed processing event");
}

DefaultEvt.Evt_ActionTrackHandlerFactory = function (handler: any) {
  return function (event: any) {
    console.log("= E.DefaultEvt - Evt_ActionTrackHandlerFactory: Input event:", event);
    const result = handler.LM_ActionTrack(event);
    console.log("= E.DefaultEvt - Evt_ActionTrackHandlerFactory: Output result:", result);
    return false;
  }
}

DefaultEvt.Evt_ActionReleaseHandlerFactory = function (e) {
  return function (t) {
    return e.LM_ActionRelease(t),
      !1
  }
}

DefaultEvt.Evt_StampObjectDragEndFactory = function (e) {
  // debugger

  console.log('Evt_StampObjectDragEndFactory ============= 1', e);


  return function (t) {
    return GlobalData.optManager.DragDropObjectDone(t, e),
      !0
  }

  /*
  return function (event) {
    GlobalData.optManager.DragDropObjectDone(event, e);
    return true;
  }
  */

  /*
  const fun = function (t) {
    debugger
    GlobalData.optManager.DragDropObjectDone(t, e);
    return true;
  }
  */

  // GlobalData.optManager.DragDropObjectDone(event, e);
  // return true;

  // return fun;

}

DefaultEvt.Evt_StampObjectDrag = function (e) {
  return GlobalData.optManager.StampObjectMove(e),
    !0
}

DefaultEvt.Evt_MouseStampObjectMove = function (e) {

  // debugger;
  console.log('Evt_MouseStampObjectMove', e);

  GlobalData.optManager.MouseStampObjectMove(e);
}

DefaultEvt.Evt_MouseStampObjectDoneFactory = function (e) {
  return function (t) {
    return GlobalData.optManager.MouseStampObjectDone(t, e), !0;
  }
}

DefaultEvt.Evt_ActionTriggerTap = function (e) {
  return e.preventDefault(),
    e.gesture.stopPropagation(),
    e.stopPropagation(),
    !1
}

DefaultEvt.Evt_WorkAreaHammerPinchIn = function (e) {
  if (e.gesture.scale > 0.666) return GlobalData.optManager.bTouchPanStarted ? HV_LM_WorkAreaHammerPan(e) : (
    GlobalData.optManager.bTouchPanStarted = !0,
    GlobalData.optManager.touchPanX = e.gesture.center.clientX,
    GlobalData.optManager.touchPanY = e.gesture.center.clientY
  ),
    !1;
  GlobalData.optManager.bTouchPanStarted = !1,
    GlobalData.optManager.touchPanX = e.gesture.center.clientX,
    GlobalData.optManager.touchPanY = e.gesture.center.clientY,
    Utils2.StopPropagationAndDefaults(e),
    e.gesture.stopDetect(),
    GlobalData.optManager.RubberBandSelect_Cancel(),
    GlobalData.optManager.theMoveList &&
    GlobalData.optManager.theMoveList.length &&
    GlobalData.optManager.LM_MoveRelease(e);
  GlobalData.docHandler.svgDoc.GetWorkArea();
  var t = e.gesture.center.clientX,
    a = e.gesture.center.clientY,
    r = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(t, a),
    i = Math.round(100 * GlobalData.docHandler.GetZoomFactor());
  if (i > 50) {
    i = Math.max(50, i - 50),
      GlobalData.docHandler.SetZoomFactor(i / 100);
    var n = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(r.x, r.y),
      o = t - n.x,
      s = a - n.y,
      l = $('#svgarea'),
      S = l.scrollLeft(),
      c = l.scrollTop();
    GlobalData.docHandler.SetScroll(S - o, c - s)
  }
  return !1
}

DefaultEvt.Evt_WorkAreaHammerPinchOut = function (event: any) {
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Input event:", event);

  // Check the scale of the gesture to decide the behavior
  if (event.gesture.scale < 1.333) {
    // Handle case when scale is less than 1.333
    if (GlobalData.optManager.bTouchPanStarted) {
      const result = HV_LM_WorkAreaHammerPan(event);
      console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Scale < 1.333 with active touch pan, Output:", result);
      return result;
    } else {
      GlobalData.optManager.bTouchPanStarted = true;
      GlobalData.optManager.touchPanX = event.gesture.center.clientX;
      GlobalData.optManager.touchPanY = event.gesture.center.clientY;
      console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Scale < 1.333 without active touch pan; updated touch pan coordinates to:",
        { x: event.gesture.center.clientX, y: event.gesture.center.clientY });
      console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Output: false");
      return false;
    }
  }

  // For scale greater than or equal to 1.333, reset touch pan and adjust zoom/scroll
  GlobalData.optManager.bTouchPanStarted = false;
  GlobalData.optManager.touchPanX = event.gesture.center.clientX;
  GlobalData.optManager.touchPanY = event.gesture.center.clientY;
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Scale >= 1.333; reset touch pan coordinates to:",
    { x: event.gesture.center.clientX, y: event.gesture.center.clientY });

  // Stop event propagation and defaults
  Utils2.StopPropagationAndDefaults(event);
  event.gesture.stopDetect();
  GlobalData.optManager.RubberBandSelect_Cancel();
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Stopped propagation and cancelled rubber band selection.");

  // Release move list if exists
  if (GlobalData.optManager.theMoveList && GlobalData.optManager.theMoveList.length) {
    GlobalData.optManager.LM_MoveRelease(event);
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Released move list actions.");
  }

  GlobalData.docHandler.svgDoc.GetWorkArea();
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Fetched work area.");

  const clientX = event.gesture.center.clientX;
  const clientY = event.gesture.center.clientY;
  const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Converted window coordinates to docCoords:", docCoords);

  let zoomFactorCurrent = Math.round(100 * GlobalData.docHandler.GetZoomFactor());
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Current zoom factor (percentage):", zoomFactorCurrent);

  if (zoomFactorCurrent < 400) {
    zoomFactorCurrent = Math.min(400, zoomFactorCurrent + 50);
    GlobalData.docHandler.SetZoomFactor(zoomFactorCurrent / 100);
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Increased zoom factor, new value (percentage):", zoomFactorCurrent);

    const windowCoords = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(docCoords.x, docCoords.y);
    const diffX = clientX - windowCoords.x;
    const diffY = clientY - windowCoords.y;
    const $svgArea = $('#svgarea');
    const scrollLeft = $svgArea.scrollLeft();
    const scrollTop = $svgArea.scrollTop();

    GlobalData.docHandler.SetScroll(scrollLeft - diffX, scrollTop - diffY);
    console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Updated scroll values:",
      { newScrollLeft: scrollLeft - diffX, newScrollTop: scrollTop - diffY });
  }

  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchOut: Output: false");
  return false;
}

DefaultEvt.Evt_WorkAreaHammerPinchEnd = function (event: any): void {
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchEnd: Received input event:", event);

  GlobalData.optManager.bTouchPanStarted = false;
  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchEnd: Updated bTouchPanStarted to false");

  console.log("= E.DefaultEvt - Evt_WorkAreaHammerPinchEnd: Completed processing event");
}

DefaultEvt.Evt_DimensionTextKeyboardLifter = function (event: any, params: any) {
  console.log("= E.DefaultEvt - Evt_DimensionTextKeyboardLifter: Received input event:", event, "and parameters:", params);

  const result = GlobalData.optManager.VirtualKeyboardLifter(event, params);

  console.log("= E.DefaultEvt - Evt_DimensionTextKeyboardLifter: Output result:", result);
  return result;
}

DefaultEvt.Evt_DimensionTextDoubleTapFactory = function (
  dimensionElementRef, // reference to the dimension text element (object with BlockID)
  expectedUserData     // user data to match
) {
  return function (event) {
    console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Received event:", event);

    // Log input parameters
    console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Current modal operation:", GlobalData.optManager.currentModalOperation);

    if (GlobalData.optManager.currentModalOperation === ConstantData.ModalOperations.NONE) {
      const elementGroup = GlobalData.optManager.svgObjectLayer.GetElementByID(dimensionElementRef.BlockID);
      if (elementGroup != null) {
        const elementCount = elementGroup.ElementCount();
        console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Found element group with count:", elementCount);
        for (let index = 0; index < elementCount; index++) {
          const currentElement = elementGroup.GetElementByIndex(index);
          if (
            currentElement.GetID() === ConstantData.SVGElementClass.DIMENSIONTEXT &&
            currentElement.GetUserData() === expectedUserData
          ) {
            console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Matching element found:", currentElement);
            GlobalData.optManager.bInDimensionEdit = true;
            GlobalData.optManager.UpdateSelectionAttributes(null);

            if (event.gesture) {
              GlobalData.optManager.TERegisterEvents(currentElement.svgObj.SDGObj, event.gesture.srcEvent);
              console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: TERegisterEvents called with gesture.srcEvent");
            } else {
              GlobalData.optManager.TERegisterEvents(currentElement.svgObj.SDGObj, event);
              console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: TERegisterEvents called with event");
            }
            event.stopPropagation();
            console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Event propagation stopped");
            console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Output result: false");
            return false;
          }
        }
        console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: No matching element found. Output result: false");
        return false;
      }
      console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Element group not found. Output result: false");
      return false;
    }
    console.log("= E.DefaultEvt - Evt_DimensionTextDoubleTapFactory: Current modal operation is not NONE. Output result: false");
    return false;
  }
}

DefaultEvt.Evt_DimensionTextTapFactory = function (objectRef, userData, stopPropagationFlag) {
  console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: called with", { objectRef, userData, stopPropagationFlag });
  return function (event) {
    console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: event received", event);

    if (GlobalData.optManager.currentModalOperation === ConstantData.ModalOperations.NONE) {
      const elementGroup = GlobalData.optManager.svgObjectLayer.GetElementByID(objectRef.BlockID);

      if (elementGroup !== null) {
        for (let i = 0; i < elementGroup.ElementCount(); i++) {
          const currentElement = elementGroup.GetElementByIndex(i);
          if (
            currentElement.GetID() === ConstantData.SVGElementClass.DIMENSIONTEXT &&
            currentElement.GetUserData() === userData
          ) {
            let result;
            if (
              GlobalData.optManager.bInDimensionEdit &&
              GlobalData.optManager.svgDoc.GetActiveEdit() === currentElement
            ) {
              if (stopPropagationFlag) {
                event.stopPropagation();
                console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: stopPropagation called due to flag");
              }
              result = false;
              console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: returning", result, "because already in edit mode with active element");
              return result;
            } else {
              GlobalData.optManager.CloseEdit(false, true);
              GlobalData.optManager.bInDimensionEdit = true;
              GlobalData.optManager.UpdateSelectionAttributes(null);

              if (event.gesture) {
                GlobalData.optManager.TERegisterEvents(currentElement, event.gesture.srcEvent);
                console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: TERegisterEvents called with gesture.srcEvent");
              } else {
                GlobalData.optManager.TERegisterEvents(currentElement, event);
                console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: TERegisterEvents called with event");
              }

              event.stopPropagation();
              console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: stopPropagation called on event");
              result = false;
              console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: returning", result, "after initiating edit on element");
              return result;
            }
          }
        }
        console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: no matching element found in group, returning false");
        return false;
      }
      console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: element group not found, returning false");
      return false;
    }

    console.log("= E.DefaultEvt - Evt_DimensionTextTapFactory: currentModalOperation is not NONE, returning false");
    return false;
  }
}

export default DefaultEvt;
