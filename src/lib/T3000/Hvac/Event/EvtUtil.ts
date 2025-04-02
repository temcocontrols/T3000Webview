

import T3Gv from '../Data/T3Gv';
import Utils2 from '../Util/Utils2';
import $ from 'jquery';
import Instance from '../Data/Instance/Instance'
import NvConstant from '../Data/Constant/NvConstant'
import RightClickMd from '../Model/RightClickMd'
import T3Constant from '../Data/Constant/T3Constant';
import DocUtil from '../Doc/DocUtil';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import MouseUtil from './MouseUtil';
import DataUtil from '../Opt/Data/DataUtil';
import SelectUtil from '../Opt/Opt/SelectUtil';
import UIUtil from '../Opt/UI/UIUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import TextUtil from '../Opt/Opt/TextUtil';
import LMEvtUtil from '../Opt/Opt/LMEvtUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import QuasarUtil from '../Opt/Quasar/QuasarUtil';

/**
 * Utility class for handling various user interaction events on an SVG document.
 *
 * The EvtUtil class provides a collection of static methods to process and manage events such as:
 *
 * - Mouse movement: Tracks the cursor, converts window to document coordinates, and updates UI displays.
 * - Hammer tap, drag, pan, and pinch gestures: Supports rubber band selection, panning, zooming,
 *   shape tapping, drawing operations, and long-press actions.
 * - Shape interactions: Handles tap, double-tap, drag start, drag, and hold events for interacting with individual SVG shapes.
 * - Drawing and stamping operations: Provides factory functions for tracking drawing progress,
 *   releasing drawn objects, and finalizing stamp placements.
 * - Dimension text editing: Facilitates editing of dimension text with double-tap actions and lifts UI on virtual keyboard appearance.
 * - Action tracking: Provides generic action tracking and release mechanism for specialized event-driven interactions.
 *
 * @remarks
 * The methods in this class ensure that the UI remains responsive and consistent across different interaction modes.
 * They integrate with various other components, such as document utilities for coordinate conversion, zoom and scroll management,
 * and error handling systems to ensure smooth cleanup of resources during exceptions.
 *
 * @example
 * Usage example to handle mouse move events on an SVG element:
 *
 *   import { EvtUtil } from './EvtUtil';
 *
 *   const svgElement = document.getElementById('svg-element');
 *   svgElement.addEventListener('mousemove', (mouseEvent: MouseEvent) => {
 *     EvtUtil.Evt_MouseMove(mouseEvent);
 *   });
 *
 * Additional examples include using factory functions for shape events:
 *
 *   // For handling double-tap on a shape:
 *   const shape = getSomeShape();
 *   const handleDoubleTap = EvtUtil.Evt_ShapeDoubleTapFactory(shape);
 *   shape.element.addEventListener('dblclick', handleDoubleTap);
 *
 * @public
 */
class EvtUtil {

  /**
   * Handles mouse movement events over the SVG document
   * Tracks cursor position and updates coordinate display when mouse is within document bounds
   * @param mouseEvent - The mouse movement event
   */
  static Evt_MouseMove(mouseEvent) {

    const svgDoc = T3Gv.opt.svgDoc;
    const docInfo = svgDoc.docInfo;

    // Check if mouse is within the document bounds
    const isWithinBounds =
      mouseEvent.clientX >= docInfo.dispX &&
      mouseEvent.clientY >= docInfo.dispY &&
      mouseEvent.clientX < docInfo.dispX + docInfo.dispWidth &&
      mouseEvent.clientY < docInfo.dispY + docInfo.dispHeight;

    if (isWithinBounds) {
      // Convert window coordinates to document coordinates
      const documentCoordinates = svgDoc.ConvertWindowToDocCoords(
        mouseEvent.clientX,
        mouseEvent.clientY
      );

      // Show and update coordinates display
      UIUtil.ShowXY(true);
      UIUtil.UpdateDisplayCoordinates(
        null,
        documentCoordinates,
        null,
        null
      );

    } else {
      // Hide coordinates display when outside document bounds
      UIUtil.ShowXY(false);
    }
  }

  /**
   * Handles hammer tap events on the SVG work area
   * Processes tap gestures and triggers appropriate actions based on tap type (right-click vs normal)
   * @param event - The hammer tap event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerClick(event) {
    T3Util.Log("E.Evt WorkAreaHammerClick input:", event);

    // Stop propagation of the event to parent elements
    Utils2.StopPropagationAndDefaults(event);

    // Set UI adaptation based on event
    // T3Gv.opt.SetUIAdaptation(event);

    // Check if this is a right-click
    const isRightClick = MouseUtil.IsRightClick(event);

    // For left-clicks, clear selection
    if (!isRightClick) {
      SelectUtil.ClearSelectionClick();

      //Clear the context menu
      // contextMenuShow.value = false;
      UIUtil.ShowContextMenu(false, "", event.gesture.center.clientX, event.gesture.center.clientY);
    }

    // Allow typing in work area
    T3Constant.DocContext.CanTypeInWorkArea = true;

    // Handle right-click contextual menu
    if (isRightClick) {
      T3Gv.opt.rClickParam = new RightClickMd();

      // Convert window coordinates to document coordinates
      T3Gv.opt.rClickParam.hitPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
    }

    T3Util.Log("E.Evt WorkAreaHammerClick output:", isRightClick ? "right-click menu shown" : "selection cleared");
    return false;
  }

  /**
   * Handles mouse wheel events on the work area
   * Controls zooming when Ctrl key is pressed during scrolling
   * Maintains focus on the mouse cursor point when zooming
   * @param event - The mouse wheel event
   */
  static Evt_WorkAreaMouseWheel(event) {
    T3Util.Log("E.Evt WorkAreaMouseWheel input:", event);

    let docUtil = new DocUtil();

    if (event.ctrlKey) {
      // Get current cursor position
      const clientX = event.clientX;
      const clientY = event.clientY;

      // Convert window coordinates to document coordinates
      const docCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      // Determine zoom direction based on wheel direction
      if (event.deltaY > 0) {
        // Zoom out
        docUtil.ZoomInAndOut(false, true);
      } else if (event.deltaY < 0) {
        // Zoom in
        docUtil.ZoomInAndOut(true, true);
      }

      // Prevent default scrolling behavior
      Utils2.StopPropagationAndDefaults(event);

      // Calculate new position to maintain focus point
      const windowCoordinates = T3Gv.opt.svgDoc.ConvertDocToWindowCoords(docCoordinates.x, docCoordinates.y);
      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svg-area');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      T3Gv.docUtil.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);

      T3Util.Log("E.Evt WorkAreaMouseWheel output: zoom adjusted, focus maintained");
    }
  }

  /**
   * Handles the end of a pan gesture in the work area
   * Resets touch pan state, removes event handlers, and restores default edit mode
   * @param event - The hammer pan end event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPanEnd(event?) {
    T3Util.Log("E.Evt WorkAreaHammerPanEnd input:", event);

    // Reset touch pan state
    T3Gv.opt.touchPanStarted = false;

    // Remove pan-related event handlers
    T3Gv.opt.WorkAreaHammer.off("drag");
    T3Gv.opt.WorkAreaHammer.off("dragend");

    // Restore default edit mode
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    T3Util.Log("E.Evt WorkAreaHammerPanEnd output: pan state reset, edit mode restored to default");
    return false;
  };

  /**
   * Handles the start of drag gestures in the SVG work area
   * Initiates either panning or rubber band selection based on input conditions
   * @param event - The hammer drag start event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerDragStart(event) {
    T3Util.Log("E.Evt WorkAreaHammerDragStart input:", event);

    const svgArea = $('#svg-area');
    const svgOffset = svgArea.offset();
    const cursorX = event.gesture.center.clientX - svgOffset.left;
    const cursorY = event.gesture.center.clientY - svgOffset.top;
    const areaWidth = svgArea[0].clientWidth;
    const areaHeight = svgArea[0].clientHeight;

    // Check if cursor is outside the SVG area bounds
    if (cursorX >= areaWidth || cursorY >= areaHeight) {
      return;
    }

    // Check if we should start panning instead of selection
    const shouldPan = /*T3Gv.opt.isMobilePlatform ||*/
      LMEvtUtil.IsWheelClick(event) ||
      T3Constant.DocContext.SpacebarDown;

    if (shouldPan) {
      // Initialize or continue panning
      if (!T3Gv.opt.touchPanStarted) {
        T3Gv.opt.touchPanStarted = true;
        T3Gv.opt.touchPanX = event.gesture.center.clientX;
        T3Gv.opt.touchPanY = event.gesture.center.clientY;

        // Bind pan-related event handlers
        T3Gv.opt.WorkAreaHammer.on('mousemove', EvtUtil.Evt_WorkAreaHammerPan);
        T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_WorkAreaHammerPanEnd);

        Utils2.StopPropagationAndDefaults(event);
      }

      T3Util.Log("E.Evt WorkAreaHammerDragStart output: pan mode started");
      return false;
    } else {
      // End any existing pan operation
      if (T3Gv.opt.touchPanStarted) {
        EvtUtil.Evt_WorkAreaHammerPanEnd();
      }

      Utils2.StopPropagationAndDefaults(event);
      // T3Gv.opt.SetUIAdaptation(event);

      // Handle right clicks separately
      if (MouseUtil.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();

        // contextMenuShow.value = false;
        UIUtil.ShowContextMenu(false, "", event.gesture.center.clientX, event.gesture.center.clientY);

        T3Util.Log("E.Evt WorkAreaHammerDragStart output: right-click handled");
        return false;
      }

      // Start rubber band selection
      SelectUtil.StartRubberBandSelect(event);

      T3Util.Log("E.Evt WorkAreaHammerDragStart output: rubber band selection started");
      return false;
    }
  }

  /**
   * Handles rubber band drag events to update selection area
   * Updates the rubber band selection frame as the user drags the mouse
   * Includes auto-scrolling when dragging near document edges
   * @param event - The drag event from the hammer.js gesture system
   */
  static Evt_RubberBandDrag(event) {
    T3Util.Log("E.Evt RubberBandDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);
    const optTypes = OptConstant.OptTypes;

    try {
      // // Cancel any special mode operations if active
      // switch (T3Gv.opt.crtOpt) {
      //   case modalOperations.ADDCORNER:
      //   case modalOperations.SPLITWALL:
      //     T3Gv.gFloorplanManager.AddCornerCancel();
      //     break;
      // }

      // If auto-scrolling is in progress and returns false, exit early
      if (!DrawUtil.AutoScrollCommon(
        event,
        false,
        'RubberBandSelectDoAutoScroll'
      )) {
        return;
      }

      // Convert screen coordinates to document coordinates
      const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );

      T3Util.Log("E.Evt RubberBandDrag processing: coordinates", documentCoordinates);

      // Update the rubber band selection shape
      SelectUtil.RubberBandSelectMoveCommon(
        documentCoordinates.x,
        documentCoordinates.y
      );

      T3Util.Log("E.Evt RubberBandDrag output: rubber band updated");
    } catch (error) {
      // Handle exceptions during rubber band selection
      SelectUtil.RubberBandSelectExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("E.Evt RubberBandDrag error:", error);
      throw error;
    }
  }

  /**
   * Handles the completion of a rubber band selection drag operation
   * Finalizes selection of objects within the rubber band area and cleans up selection state
   * @param event - The drag end event from the hammer.js gesture system
   */
  static Evt_RubberBandDragEnd(event) {
    T3Util.Log("E.Evt RubberBandDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Clean up event handlers used for rubber band selection
      SelectUtil.UnbindRubberBandHammerEvents();
      DrawUtil.ResetAutoScrollTimer();

      // Get the final rubber band selection area
      const rubberBandFrame = T3Gv.opt.rubberBandFrame;

      // Select all objects within the selection rectangle
      // If shift key is pressed, add to existing selection instead of replacing
      SelectUtil.SelectAllInRect(
        rubberBandFrame,
        event.gesture.srcEvent.shiftKey
      );

      // Remove the visual rubber band selection indicator
      T3Gv.opt.svgOverlayLayer.RemoveElement(T3Gv.opt.rubberBand);

      // Reset rubber band selection state
      T3Util.Log("E.Evt RubberBandDragEnd processing: resetting rubber band state");
      T3Gv.opt.rubberBand = null;
      T3Gv.opt.rubberBandStartX = 0;
      T3Gv.opt.rubberBandStartY = 0;
      T3Gv.opt.rubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };

      T3Util.Log("E.Evt RubberBandDragEnd output: selection completed");

    } catch (error) {
      // Clean up if an error occurs during selection
      SelectUtil.RubberBandSelectExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      T3Util.Log("E.Evt RubberBandDragEnd error:", error);
      throw error;
    }
  }

  /**
   * Handles the start of a drawing operation in the work area
   * Initiates object drawing when user starts a draw gesture in the SVG document
   * Prevents right-click drawing operations and sets up the drawing environment
   * @param hammerEvent - The hammer.js event that triggered the drawing start
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerDrawStart(hammerEvent) {
    T3Util.Log("E.Evt WorkAreaHammerDrawStart input:", hammerEvent);

    // Prevent event propagation and default behavior
    hammerEvent.stopPropagation();
    hammerEvent.preventDefault();

    // Check if this is a right-click event
    const isRightClick = MouseUtil.IsRightClick(hammerEvent);

    if (!isRightClick) {
      // Set UI adaptation based on event
      // T3Gv.opt.SetUIAdaptation(hammerEvent);

      // Start the drawing operation
      DrawUtil.StartNewObjectDraw(hammerEvent);

      T3Util.Log("E.Evt WorkAreaHammerDrawStart output: drawing started");
    } else {
      T3Util.Log("E.Evt WorkAreaHammerDrawStart output: right-click ignored");
    }

    return false;
  }

  /**
   * Creates a handler for tracking drawing movements on the canvas
   * Returns a function that processes drawing motion events and updates the object being drawn
   * Includes error handling to clean up resources when exceptions occur
   * @param drawableObject - The object being drawn that will process the draw tracking
   * @returns A function that handles draw tracking events
   */
  static Evt_DrawTrackHandlerFactory(drawableObject) {
    T3Util.Log("E.Evt DrawTrackHandlerFactory input:", drawableObject);

    return function (event) {
      T3Util.Log("E.Evt DrawTrack input:", event);

      try {
        // Track the drawing movement for the current object
        drawableObject.LMDrawTrack(event);

        T3Util.Log("E.Evt DrawTrack output: drawing tracked");
      } catch (error) {
        // Clean up in case of errors during draw tracking
        drawableObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        T3Util.Log("E.Evt DrawTrack error:", error);
        throw error;
      }
    };
  }

  /**
   * Creates a handler for finalizing drawing operations when user releases the input
   * Returns a function that processes the release event and completes the drawing action
   * Includes error handling to clean up resources when exceptions occur
   * @param drawableObject - The object being drawn that will process the draw release event
   * @returns A function that handles draw release events
   */
  static Evt_DrawReleaseHandlerFactory(drawableObject) {
    T3Util.Log("E.Evt DrawReleaseHandlerFactory input:", drawableObject);

    return function (event) {
      T3Util.Log("E.Evt DrawRelease input:", event);

      try {
        // Complete the drawing operation when the user releases
        drawableObject.LMDrawRelease(event);

        T3Util.Log("E.Evt DrawRelease output: drawing completed");
      } catch (error) {
        // Clean up in case of errors during draw completion
        OptCMUtil.CancelOperation();
        drawableObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        T3Util.Log("E.Evt DrawRelease error:", error);
        throw error;
      }
    };
  }

  /**
   * Creates a handler for tap/click events on shapes in the document
   * Returns a function that processes tap gestures on shapes and determines appropriate actions
   * Handles different behaviors based on current modal operation state, right-clicks, and shape properties
   * @param shape - The shape object that received the tap event
   * @returns A function that handles tap/click events on the shape
   */
  static Evt_ShapeTapFactory(shape) {
    T3Util.Log("E.Evt ShapeTapFactory input:", shape);

    let shapeElement;

    return function (tapEvent) {
      T3Util.Log("E.Evt ShapeTap input:", tapEvent);

      // Prevent default browser behavior
      Utils2.StopPropagationAndDefaults(tapEvent);
      // T3Gv.opt.SetUIAdaptation(tapEvent);

      // Check if this is a right-click
      const isRightClick = MouseUtil.IsRightClick(tapEvent);

      // Handle read-only document case
      if (T3Gv.docUtil.IsReadOnly()) {
        if (isRightClick) {
          shape.RightClick(tapEvent);
          T3Util.Log("E.Evt ShapeTap output: right-click menu in read-only mode");
          return false;
        }
      } else if (isRightClick) {
        shape.RightClick(tapEvent);
        T3Util.Log("E.Evt ShapeTap output: right-click menu shown");
        return false;
      }

      // Handle tap based on current modal operation
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
          // Check for hyperlink hits or process normal tap
          if (!TextUtil.CheckTextHyperlinkHit(shape, tapEvent)) {
            LMEvtUtil.LMTestIconClick(tapEvent);

            // Handle rollover actions if not in read-only mode
            if (UIUtil.GetUIAdaptation(tapEvent) && !T3Gv.docUtil.IsReadOnly()) {
              shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.tag);
              shape.SetRolloverActions(T3Gv.opt.svgDoc, shapeElement);
            }
          }

          UIUtil.ShowObjectConfig(true);

          T3Util.Log("E.Evt ShapeTap output: normal tap processed");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
          T3Util.Log("E.Evt ShapeTap output: ignored in draw mode");
          return false;

        case OptConstant.OptTypes.StampTextOnTap:
          // Handle text editing in stamp text mode
          if (!T3Gv.opt.stampSticky) {
            DrawUtil.CancelObjectStampTextOnTap(true);
          }

          if (shape.AllowTextEdit()) {
            shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.tag);
            TextUtil.ActivateTextEdit(shapeElement.svgObj.SDGObj, tapEvent, false);
          }

          T3Util.Log("E.Evt ShapeTap output: text edit activated in stamp mode");
          return false;
      }
    };
  }

  /**
   * Creates a handler for when a shape drag operation begins
   * Returns a function that processes drag start events on shapes based on current operation mode
   * Handles different behaviors for draw mode, stamp mode, and normal selection/move operations
   * @param shape - The shape object that received the drag start event
   * @returns A function that handles drag start events on the shape
   */
  static Evt_ShapeDragStartFactory(shape) {
    T3Util.Log("E.Evt ShapeDragStartFactory input:", shape);

    return function (event) {
      T3Util.Log("E.Evt ShapeDragStart input:", event);

      // Check if we're in drawing mode - prevent drag start
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.Draw) {
        T3Util.Log("E.Evt ShapeDragStart output: prevented in draw mode");
        return false;
      }

      // Check if we're in stamp mode - prevent drag start and stop propagation
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.Stamp) {
        event.stopPropagation();
        event.gesture.stopPropagation();
        T3Util.Log("E.Evt ShapeDragStart output: prevented in stamp mode");
        return false;
      }

      // Set UI adaptation for current platform/device
      // T3Gv.opt.SetUIAdaptation(event);

      // Handle right-click differently
      if (MouseUtil.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.gesture.preventDefault();
        event.gesture.stopPropagation();
        T3Util.Log("E.Evt ShapeDragStart output: right-click prevented");
        return false;
      }

      // Process based on current modal operation state
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
        case OptConstant.OptTypes.FormatPainter:
          // Normal drag operation - start movement
          Utils2.StopPropagationAndDefaults(event);
          LMEvtUtil.LMMoveClick(event);
          T3Util.Log("E.Evt ShapeDragStart output: move operation started");
          return false;

        case OptConstant.OptTypes.Draw:
          // Forward to draw handler if in draw mode
          T3Util.Log("E.Evt ShapeDragStart output: forwarded to draw handler");
          return EvtUtil.Evt_WorkAreaHammerDrawStart(event);

        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent drag in these modes
          T3Util.Log("E.Evt ShapeDragStart output: prevented in special mode");
          return false;
      }
    };
  };

  /**
   * Creates a handler for when a shape is held/long-pressed
   * Returns a function that processes hold events on shapes based on current operation mode
   * Primarily used to trigger context menus (right-click equivalent) on touch devices
   * @param shape - The shape object that received the hold event
   * @returns A function that handles hold events on the shape
   */
  static Evt_ShapeHoldFactory(shape) {
    T3Util.Log("E.Evt ShapeHoldFactory input:", shape);

    return function (event) {
      T3Util.Log("E.Evt ShapeHold input:", event);

      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
          // Stop the gesture detection and prevent default behavior
          event.gesture.stopDetect();
          Utils2.StopPropagationAndDefaults(event);

          // Trigger right-click menu (context menu)
          shape.RightClick(event);

          try {
            // Clean up any active move operation
            LMEvtUtil.LMMoveRelease(event);
          } catch (error) {
            // Handle exceptions during move release
            LMEvtUtil.LMMoveExceptionCleanup(error);
            T3Gv.opt.ExceptionCleanup(error);
            T3Util.Log("E.Evt ShapeHold error:", error);
            throw error;
          }

          T3Util.Log("E.Evt ShapeHold output: context menu displayed");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent hold actions in these modes
          T3Util.Log("E.Evt ShapeHold output: prevented in special mode");
          return false;
      }
    };
  };

  /**
   * Creates a handler for double-tap/double-click events on shapes
   * Returns a function that processes double-tap gestures based on shape type and current state
   * Handles various shape types differently including gauges, charts, containers, tables, and graphs
   * @param shape - The shape object that received the double-tap event
   * @returns A function that handles double-tap/double-click events on the shape
   */
  static Evt_ShapeDoubleTapFactory(shape) {
    T3Util.Log("E.Evt ShapeDoubleTapFactory input:", shape);

    return function (event) {
      T3Util.Log("E.Evt ShapeDoubleTap input:", event);

      // Get the object using its ID
      const shapeBlockId = shape.BlockID;
      const objectPtr = DataUtil.GetObjectPtr(shapeBlockId, false);

      // Validate that we have a valid drawing object
      if (!(objectPtr && objectPtr instanceof Instance.Shape.BaseDrawObject)) {
        T3Util.Log("E.Evt ShapeDoubleTap output: invalid object");
        return false;
      }

      // Set UI adaptation for current device/platform
      // T3Gv.opt.SetUIAdaptation(event);

      // Process based on current modal operation state
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
          // Don't process if already editing a note
          if (T3Gv.opt.bInNoteEdit) {
            T3Util.Log("E.Evt ShapeDoubleTap output: prevented during note edit");
            return false;
          }

          // Check if this is a table or graph object
          // const isTable = shape.GetTable(false);
          const isGraph = shape.GetGraph(false);

          // // Handle special D3 symbol types (gauges and charts)
          // if (shape.objecttype === NvConstant.FNObjectTypes.D3Symbol) {
          //   switch (shape.codeLibID) {
          //     case 'RadialGauge':
          //     case 'LinearGauge':
          //       T3Gv.opt.EditGauge();
          //       T3Util.Log("E.Evt ShapeDoubleTap output: gauge editor opened");
          //       return false;

          //     case 'BarChart':
          //     case 'PieChart':
          //     case 'LineChart':
          //     case 'SankeyChart':
          //       T3Gv.opt.EditGraph();
          //       T3Util.Log("E.Evt ShapeDoubleTap output: graph editor opened");
          //       return false;
          //   }
          // }
          // Handle container shapes
          // else
          if (shape instanceof Instance.Shape.ShapeContainer) {
            shape.DoubleClick(event);
            T3Util.Log("E.Evt ShapeDoubleTap output: container double-click handled");
            return false;
          }

          // // Handle tables
          // if (isTable) {
          //   T3Gv.opt.Table_SetupAction(
          //     event,
          //     shape.BlockID,
          //     OptConstant.Common.TableCellHit,
          //     -1
          //   );
          //   T3Util.Log("E.Evt ShapeDoubleTap output: table action setup");
          //   return false;
          // }

          // // Handle graphs
          // if (isGraph) {
          //   T3Gv.opt.Graph_SetupAction(
          //     event,
          //     shape.BlockID,
          //     OptConstant.Common.GraphTextHit,
          //     -1
          //   );
          //   T3Util.Log("E.Evt ShapeDoubleTap output: graph action setup");
          //   return false;
          // }

          // Default behavior: activate text editing
          const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.tag);
          TextUtil.ActivateTextEdit(shapeElement.svgObj.SDGObj, event);
          T3Util.Log("E.Evt ShapeDoubleTap output: text editor activated");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent double-tap actions in these modes
          T3Util.Log("E.Evt ShapeDoubleTap output: prevented in special mode");
          return false;
      }
    };
  }

  /**
   * Handles drag events for shapes
   * Tracks shape movement during drag operations and handles special cases like dragging over custom libraries
   * Includes error handling to clean up resources when exceptions occur
   * @param event - The drag event from the hammer.js gesture system
   */
  static Evt_ShapeDrag(event) {
    T3Util.Log("E.Evt ShapeDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Check if dragging over custom library
      let isOverCustomLibrary = DrawUtil.CheckDragIsOverCustomLibrary(event);

      // Track the movement of the shape
      LMEvtUtil.LMMoveTrack(event, isOverCustomLibrary);

      T3Util.Log("E.Evt ShapeDrag output: shape position updated");
    } catch (error) {
      // Clean up in case of errors during movement
      LMEvtUtil.LMMoveExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);

      T3Util.Log("E.Evt ShapeDrag error:", error);
      throw error;
    }
  }

  /**
   * Handles the end of shape drag operations
   * Finalizes shape movement and position when user releases the dragged shape
   * Includes error handling to clean up resources when exceptions occur
   * @param event - The drag end event from the hammer.js gesture system
   */
  static Evt_ShapeDragEnd(event) {
    T3Util.Log("E.Evt ShapeDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Complete the movement operation
      LMEvtUtil.LMMoveRelease(event);

      T3Util.Log("E.Evt ShapeDragEnd output: shape movement completed");
    } catch (error) {
      // Clean up in case of errors during move completion
      LMEvtUtil.LMMoveExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);

      T3Util.Log("E.Evt ShapeDragEnd error:", error);
      throw error;
    }
  }

  /**
   * Creates a handler for tracking action movements
   * Returns a function that processes action tracking events for a specific object
   * Used for specialized interaction tracking beyond normal dragging
   * @param actionObject - The object that will process the action tracking
   * @returns A function that handles action tracking events
   */
  static Evt_ActionTrackHandlerFactory(actionObject) {
    T3Util.Log("E.Evt ActionTrackHandlerFactory input:", actionObject);

    return function (event) {
      T3Util.Log("E.Evt ActionTrack input:", event);

      // Track the action movement through the action object
      actionObject.LMActionTrack(event);

      T3Util.Log("E.Evt ActionTrack output: action tracked");
      return false;
    }
  }

  /**
   * Creates a handler for completing action operations
   * Returns a function that processes action release events for a specific object
   * Used to finalize specialized interactions when input is released
   * @param actionObject - The object that will process the action release
   * @returns A function that handles action release events
   */
  static Evt_ActionReleaseHandlerFactory(actionObject) {
    T3Util.Log("E.Evt ActionReleaseHandlerFactory input:", actionObject);

    return function (event) {
      T3Util.Log("E.Evt ActionRelease input:", event);

      // Complete the action through the action object
      actionObject.LMActionRelease(event);

      T3Util.Log("E.Evt ActionRelease output: action completed");
      return false;
    }
  }

  /**
   * Handles drag movements for stamp objects
   * Updates the position of a stamp object being dragged across the document
   * @param event - The drag event from the gesture system
   * @returns true to indicate event was handled
   */
  static Evt_StampObjectDrag(event) {
    T3Util.Log("E.Evt StampObjectDrag input:", event);

    // Move the stamp object to follow the drag position
    DrawUtil.StampObjectMove(event);

    T3Util.Log("E.Evt StampObjectDrag output: stamp object position updated");
    return true;
  };

  /**
   * Handles mouse movement events for stamp objects
   * Updates the position of a stamp object to follow mouse cursor movement
   * @param mouseEvent - The mouse move event
   */
  static Evt_MouseStampObjectMove(mouseEvent) {
    T3Util.Log("E.Evt MouseStampObjectMove input:", mouseEvent);

    // Move the stamp object to follow the mouse position
    DrawUtil.MouseStampObjectMove(mouseEvent);

    T3Util.Log("E.Evt MouseStampObjectMove output: stamp object position updated");
  };

  /**
   * Creates a handler for completing mouse-based stamp operations
   * Returns a function that processes the completion of placing a stamp object with mouse input
   * @param stampObject - The object being stamped/placed in the document
   * @returns A function that handles stamp completion events
   */
  static Evt_MouseStampObjectDoneFactory(stampObject) {
    T3Util.Log("E.Evt MouseStampObjectDoneFactory input:", stampObject);

    return function (mouseEvent) {
      T3Util.Log("E.Evt MouseStampObjectDone input:", mouseEvent);

      // Process the stamp completion and place the object
      DrawUtil.MouseStampObjectDone(mouseEvent, stampObject);

      T3Util.Log("E.Evt MouseStampObjectDone output: object placement completed");
      return true;
    };
  };

  /**
   * Creates a handler for completing stamp object drag operations
   * Returns a function that processes the end of a stamp object drag and finalizes placement
   * @param stampObject - The object being stamped/placed in the document
   * @returns A function that handles drag end events for the stamp object
   */
  static Evt_StampObjectDragEndFactory(stampObject) {
    T3Util.Log("E.Evt StampObjectDragEndFactory input:", stampObject);

    return function (event) {
      T3Util.Log("E.Evt StampObjectDragEnd input:", event);

      // Process the drag completion and place the stamp object
      DrawUtil.DragDropObjectDone(event, stampObject);
      // T3Gv.opt.MouseStampObjectDone(event, stampObject);

      T3Util.Log("E.Evt StampObjectDragEnd output: object placement completed");
      return true;
    };
  };

  /**
   * Handles tap events that trigger actions
   * Prevents default browser behavior and stops event propagation
   * Used to handle special tap gestures that activate document actions
   * @param event - The tap event from the gesture system
   * @returns false to prevent default browser behavior
   */
  static Evt_ActionTriggerTap(event) {
    T3Util.Log("E.Evt ActionTriggerTap input:", event);

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.gesture.stopPropagation();
    event.stopPropagation();

    T3Util.Log("E.Evt ActionTriggerTap output: propagation stopped");
    return false;
  };

  /**
   * Handles pinch-in gesture events on the work area
   * Controls zooming out when users pinch inward on touch devices
   * Maintains focus on the gesture center point when zooming
   * @param event - The hammer pinch-in event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPinchIn(event) {
    T3Util.Log("E.Evt WorkAreaHammerPinchIn input:", event);

    // If scale is greater than threshold, handle as pan instead of pinch
    if (event.gesture.scale > 0.666) {
      if (T3Gv.opt.touchPanStarted) {
        return EvtUtil.Evt_WorkAreaHammerPan(event);
      } else {
        T3Gv.opt.touchPanStarted = true;
        T3Gv.opt.touchPanX = event.gesture.center.clientX;
        T3Gv.opt.touchPanY = event.gesture.center.clientY;
      }
      return false;
    }

    // Reset touch state for pinch gesture
    T3Gv.opt.touchPanStarted = false;
    T3Gv.opt.touchPanX = event.gesture.center.clientX;
    T3Gv.opt.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    SelectUtil.RubberBandSelectCancel();
    if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
      LMEvtUtil.LMMoveRelease(event);
    }

    // Get work area and cursor position
    T3Gv.docUtil.svgDoc.GetWorkArea();
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Convert screen coordinates to document coordinates
    const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

    // Calculate new zoom factor (zoom out)
    let zoomFactorPercent = Math.round(100 * T3Gv.docUtil.GetZoomFactor());

    if (zoomFactorPercent > 50) {
      // Decrease zoom factor but don't go below 50%
      zoomFactorPercent = Math.max(50, zoomFactorPercent - 50);
      T3Gv.docUtil.SetZoomFactor(zoomFactorPercent / 100);

      // Calculate new position to maintain focus point
      const windowCoordinates = T3Gv.opt.svgDoc.ConvertDocToWindowCoords(
        documentCoordinates.x,
        documentCoordinates.y
      );

      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svgarea');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      T3Gv.docUtil.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);
    }

    T3Util.Log("E.Evt WorkAreaHammerPinchIn output: zoom out completed", {
      newZoomFactor: zoomFactorPercent / 100
    });
    return false;
  }

  /**
   * Handles pan gestures in the work area
   * Manages document scrolling during touch or pointer pan operations
   * Cancels active selections and sets edit mode to grab during panning
   * @param event - The hammer pan event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPan(event) {
    T3Util.Log("E.Evt WorkAreaHammerPan input:", event);

    // Cancel any active rubber band selection
    SelectUtil.RubberBandSelectCancel();

    // Release any active move operation
    if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
      LMEvtUtil.LMMoveRelease(event);
    }

    // Set edit mode to indicate grabbing/panning
    OptCMUtil.SetEditMode(NvConstant.EditState.Grab);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    // Get work area information
    T3Gv.docUtil.svgDoc.GetWorkArea();

    // Get current touch position
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Calculate distance moved since last event
    const deltaX = clientX - T3Gv.opt.touchPanX;
    const deltaY = clientY - T3Gv.opt.touchPanY;

    // Get current scroll position
    const svgArea = $("#svgarea");
    const scrollLeft = svgArea.scrollLeft();
    const scrollTop = svgArea.scrollTop();

    // Update scroll position based on pan movement
    T3Gv.docUtil.SetScroll(scrollLeft - deltaX, scrollTop - deltaY);

    // Save current touch position for next event
    T3Gv.opt.touchPanX = event.gesture.center.clientX;
    T3Gv.opt.touchPanY = event.gesture.center.clientY;

    T3Util.Log("E.Evt WorkAreaHammerPan output: scroll updated", {
      deltaX: deltaX,
      deltaY: deltaY,
      newScrollLeft: scrollLeft - deltaX,
      newScrollTop: scrollTop - deltaY
    });

    return false;
  };

  /**
   * Handles pinch-out gesture events on the work area
   * Controls zooming in when users pinch outward on touch devices
   * Maintains focus on the gesture center point when zooming
   * @param event - The hammer pinch-out event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPinchOut(event) {
    T3Util.Log("E.Evt WorkAreaHammerPinchOut input:", event);

    // If scale is less than threshold, handle as pan instead of pinch
    if (event.gesture.scale < 1.333) {
      if (T3Gv.opt.touchPanStarted) {
        return EvtUtil.Evt_WorkAreaHammerPan(event);
      } else {
        T3Gv.opt.touchPanStarted = true;
        T3Gv.opt.touchPanX = event.gesture.center.clientX;
        T3Gv.opt.touchPanY = event.gesture.center.clientY;
      }
      return false;
    }

    // Reset touch state for pinch gesture
    T3Gv.opt.touchPanStarted = false;
    T3Gv.opt.touchPanX = event.gesture.center.clientX;
    T3Gv.opt.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    T3Gv.opt.RubberBandSelectCancel();
    if (T3Gv.opt.moveList &&
      T3Gv.opt.moveList.length) {
      LMEvtUtil.LMMoveRelease(event);
    }

    // Get work area and cursor position
    T3Gv.docUtil.svgDoc.GetWorkArea();
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Convert screen coordinates to document coordinates
    const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      clientX,
      clientY
    );

    // Calculate new zoom factor (zoom in)
    let zoomFactorPercent = Math.round(100 * T3Gv.docUtil.GetZoomFactor());

    if (zoomFactorPercent < 400) {
      // Increase zoom factor but don't go above 400%
      zoomFactorPercent = Math.min(400, zoomFactorPercent + 50);
      T3Gv.docUtil.SetZoomFactor(zoomFactorPercent / 100);

      // Calculate new position to maintain focus point
      const windowCoordinates = T3Gv.opt.svgDoc.ConvertDocToWindowCoords(
        documentCoordinates.x,
        documentCoordinates.y
      );

      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svgarea');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      T3Gv.docUtil.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);
    }

    T3Util.Log("E.Evt WorkAreaHammerPinchOut output: zoom in completed", {
      newZoomFactor: zoomFactorPercent / 100
    });
    return false;
  }

  /**
   * Handles the end of pinch gestures on the work area
   * Resets the touch pan state after pinch gesture completes
   * @param event - The hammer pinch end event
   */
  static Evt_WorkAreaHammerPinchEnd(event) {
    T3Util.Log("E.Evt WorkAreaHammerPinchEnd input:", event);

    // Reset touch pan state
    T3Gv.opt.touchPanStarted = false;

    T3Util.Log("E.Evt WorkAreaHammerPinchEnd output: touch pan state reset");
  }

  /**
   * Adjusts UI when virtual keyboard appears during dimension text editing
   * Lifts content to ensure text being edited remains visible above the keyboard
   * @param element - The element being edited
   * @param keyboardEvent - The keyboard event that triggered the adjustment
   */
  static Evt_DimensionTextKeyboardLifter(element, keyboardEvent) {
    T3Util.Log("E.Evt DimensionTextKeyboardLifter input:", { element, keyboardEvent });

    // Adjust UI for virtual keyboard
    T3Gv.opt.VirtualKeyboardLifter(element, keyboardEvent);

    T3Util.Log("E.Evt DimensionTextKeyboardLifter output: UI adjusted for virtual keyboard");
  }

  /**
   * Creates a handler for double-tap events on dimension text
   * Returns a function that processes double-tap events to edit dimension text
   * Searches for the specific dimension text element and activates text editing
   * @param shape - The shape object containing the dimension text
   * @param textId - The identifier of the specific dimension text to edit
   * @returns A function that handles double-tap events on the dimension text
   */
  static Evt_DimensionTextDoubleTapFactory(shape, textId) {
    T3Util.Log("E.Evt DimensionTextDoubleTapFactory input:", { shape, textId });

    return function (event) {
      T3Util.Log("E.Evt DimensionTextDoubleTap input:", event);

      let textElement, elementCount;

      if (T3Gv.opt.crtOpt == OptConstant.OptTypes.None) {
        const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.BlockID);

        if (shapeElement != null) {
          elementCount = shapeElement.ElementCount();

          for (let i = 0; i < elementCount; ++i) {
            textElement = shapeElement.GetElementByIndex(i);

            if (textElement.GetID() == OptConstant.SVGElementClass.DimText &&
              textElement.GetUserData() == textId) {

              T3Gv.opt.bInDimensionEdit = true;
              SelectUtil.UpdateSelectionAttributes(null);

              if (event.gesture) {
                TextUtil.TERegisterEvents(textElement.svgObj.SDGObj, event.gesture.srcEvent);
              } else {
                TextUtil.TERegisterEvents(textElement.svgObj.SDGObj, event);
              }

              event.stopPropagation();

              T3Util.Log("E.Evt DimensionTextDoubleTap output: dimension text editing activated");
              return false;
            }
          }
        }

        T3Util.Log("E.Evt DimensionTextDoubleTap output: dimension text element not found");
        return false;
      }

      T3Util.Log("E.Evt DimensionTextDoubleTap output: prevented in modal operation");
      return false;
    };
  }

  /**
   * Creates a handler for tap events on dimension text
   * Returns a function that processes tap events to edit dimension text
   * Checks if the dimension is already being edited and enables text editing if needed
   * @param shape - The shape object containing the dimension text
   * @param textId - The identifier of the specific dimension text to edit
   * @param preventPropagation - Whether to stop event propagation
   * @returns A function that handles tap events on the dimension text
   */
  static Evt_DimensionTextTapFactory(shape, textId, preventPropagation) {
    T3Util.Log("E.Evt DimensionTextTapFactory input:", { shape, textId, preventPropagation });

    return function (event) {
      T3Util.Log("E.Evt DimensionTextTap input:", event);

      // Only process in default mode (no modal operations active)
      if (T3Gv.opt.crtOpt == OptConstant.OptTypes.None) {
        // Find the shape element
        const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.BlockID);

        if (shapeElement != null) {
          // Look through all child elements to find the specific dimension text
          for (let i = 0; i < shapeElement.ElementCount(); ++i) {
            const textElement = shapeElement.GetElementByIndex(i);

            // Check if this is the dimension text we're looking for
            if (textElement.GetID() == OptConstant.SVGElementClass.DimText &&
              textElement.GetUserData() == textId) {

              // If already editing this dimension text, just stop propagation
              if (T3Gv.opt.bInDimensionEdit &&
                T3Gv.opt.svgDoc.GetActiveEdit() == textElement) {
                if (preventPropagation) {
                  event.stopPropagation();
                }
                T3Util.Log("E.Evt DimensionTextTap output: already editing this dimension");
                return false;
              }

              // Close any existing edit session
              T3Gv.opt.CloseEdit(false, true);

              // Enable dimension edit mode
              T3Gv.opt.bInDimensionEdit = true;
              SelectUtil.UpdateSelectionAttributes(null);

              // Register text editing event handlers
              if (event.gesture) {
                TextUtil.TERegisterEvents(textElement, event.gesture.srcEvent);
              } else {
                TextUtil.TERegisterEvents(textElement, event);
              }

              event.stopPropagation();
              T3Util.Log("E.Evt DimensionTextTap output: dimension text editing activated");
              return false;
            }
          }
        }

        T3Util.Log("E.Evt DimensionTextTap output: dimension text element not found");
        return false;
      }

      T3Util.Log("E.Evt DimensionTextTap output: prevented in modal operation");
      return false;
    };
  }

  /**
   * Creates a handler for extending polyline drawing operations
   * Returns a function that processes polyline extension events
   * Includes error handling to clean up resources when exceptions occur
   * @param polyLineObject - The polyline object being drawn
   * @returns A function that handles polyline extension events
   */
  static Evt_PolyLineDrawExtendHandlerFactory(polyLineObject) {
    T3Util.Log("E.Evt PolyLineDrawExtendHandlerFactory input:", polyLineObject);

    return function (event) {
      T3Util.Log("E.Evt PolyLineDrawExtend input:", event);

      try {
        // Extend the polyline drawing
        polyLineObject.LMDrawExtend(event);

        T3Util.Log("E.Evt PolyLineDrawExtend output: polyline extended");
      } catch (error) {
        // Clean up in case of errors
        OptCMUtil.CancelOperation();
        polyLineObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        T3Util.Log("E.Evt PolyLineDrawExtend error:", error);
      }
    };
  }

  /**
   * Placeholder for draw extension handler function
   * This will be initialized elsewhere in the code
   */
  static Evt_DrawExtendHandler = null;

  /**
   * Handles the start of a drag operation during polyline drawing
   * Prevents default behavior during polyline drawing operations
   * @param event - The drag start event
   * @returns false to prevent default browser behavior
   */
  static Evt_PolyLineDrawDragStart(event) {
    T3Util.Log("E.Evt PolyLineDrawDragStart input:", event);
    T3Util.Log("E.Evt PolyLineDrawDragStart output: drag prevented during polyline drawing");
    return false;
  }
}

export default EvtUtil
