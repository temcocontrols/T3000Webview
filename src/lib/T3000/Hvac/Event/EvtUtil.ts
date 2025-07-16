

import T3Gv from '../Data/T3Gv';
import Utils2 from '../Util/Utils2';
import $ from 'jquery';
import Instance from '../Data/Instance/Instance'
import RightClickMd from '../Model/RightClickMd'
import T3Constant from '../Data/Constant/T3Constant';
import DocUtil from '../Doc/DocUtil';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import MouseUtil from './MouseUtil';
import ObjectUtil from '../Opt/Data/ObjectUtil';
import SelectUtil from '../Opt/Opt/SelectUtil';
import UIUtil from '../Opt/UI/UIUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import TextUtil from '../Opt/Opt/TextUtil';
import LMEvtUtil from '../Opt/Opt/LMEvtUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import QuasarUtil from '../Opt/Quasar/QuasarUtil';
import LogUtil from '../Util/LogUtil';

/**
 * Utility class for handling various user interaction events on an SVG document.
 * Includes proper event management and cleanup to prevent memory leaks.
 */
class EvtUtil {
  private static eventHandlers: Map<string, EventListener> = new Map();
  private static hammerInstances: Map<string, any> = new Map();
  private static isInitialized: boolean = false;

  /**
   * Initialize event handlers with proper cleanup management
   */
  static initialize(): void {
    if (this.isInitialized) {
      LogUtil.Warn('EvtUtil already initialized');
      return;
    }

    try {
      this.cleanup(); // Clean up any existing handlers
      this.setupEventHandlers();
      this.isInitialized = true;
      LogUtil.Info('EvtUtil initialized successfully');
    } catch (error) {
      LogUtil.Error('Failed to initialize EvtUtil:', error);
    }
  }

  /**
   * Clean up all event handlers and instances
   */
  static cleanup(): void {
    try {
      // Remove DOM event listeners
      this.eventHandlers.forEach((handler, event) => {
        document.removeEventListener(event, handler);
      });
      this.eventHandlers.clear();

      // Clean up jQuery events with namespace
      $(document).off('.t3000-evt');
      $('#svg-area').off('.t3000-evt');

      // Destroy Hammer instances
      this.hammerInstances.forEach((hammer, key) => {
        if (hammer && typeof hammer.destroy === 'function') {
          hammer.destroy();
        }
      });
      this.hammerInstances.clear();

      this.isInitialized = false;
      LogUtil.Info('EvtUtil cleanup completed');
    } catch (error) {
      LogUtil.Error('Error during EvtUtil cleanup:', error);
    }
  }

  /**
   * Set up event handlers with proper registration
   */
  private static setupEventHandlers(): void {
    // Mouse events
    const mouseMoveHandler = this.Evt_MouseMove.bind(this);
    const mouseWheelHandler = this.Evt_WorkAreaMouseWheel.bind(this);

    // Store handlers for cleanup
    this.eventHandlers.set('mousemove', mouseMoveHandler);
    this.eventHandlers.set('wheel', mouseWheelHandler);

    // Add event listeners
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('wheel', mouseWheelHandler, { passive: false });

    // Set up Hammer.js instances
    this.setupHammerHandlers();
  }

  /**
   * Set up Hammer.js event handlers
   */
  private static setupHammerHandlers(): void {
    const workArea = document.getElementById('svg-area');
    if (!workArea) {
      LogUtil.Warn('svg-area element not found, skipping Hammer setup');
      return;
    }

    try {
      // Note: This assumes Hammer is available globally or should be imported
      // const hammer = new Hammer.Manager(workArea);

      // For now, we'll use a placeholder and proper Hammer setup should be done when available
      // TODO: Implement proper Hammer.js setup when library is available

      LogUtil.Info('Hammer.js setup placeholder - implement when library is available');
    } catch (error) {
      LogUtil.Error('Failed to setup Hammer handlers:', error);
    }
  }

  /**
   * Handles mouse movement events over the SVG document
   * Tracks cursor position and updates coordinate display when mouse is within document bounds
   * @param mouseEvent - The mouse movement event
   */
  static Evt_MouseMove(mouseEvent: MouseEvent): void {
    try {
      const svgDoc = T3Gv.opt?.svgDoc;

      if (!svgDoc) {
        return;
      }

      const docInfo = svgDoc.docInfo;
      if (!docInfo) {
        LogUtil.Warn('SVG document info not available');
        return;
      }

      // Validate mouse event properties
      if (typeof mouseEvent.clientX !== 'number' || typeof mouseEvent.clientY !== 'number') {
        LogUtil.Error('Invalid mouse event coordinates');
        return;
      }

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

        if (documentCoordinates) {
          // Show and update coordinates display
          UIUtil.ShowXY(true);
          UIUtil.UpdateDisplayCoordinates(
            null,
            documentCoordinates,
            null,
            null
          );
        }
      } else {
        // Hide coordinates display when outside document bounds
        UIUtil.ShowXY(false);
      }
    } catch (error) {
      LogUtil.Error('Error in Evt_MouseMove:', error);
    }
  }

  /**
   * Handles hammer tap events on the SVG work area
   * Processes tap gestures and triggers appropriate actions based on tap type (right-click vs normal)
   * @param event - The hammer tap event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerClick(event) {
    LogUtil.Debug("E.Evt WorkAreaHammerClick input:", event);

    // Stop propagation of the event to parent elements
    Utils2.StopPropagationAndDefaults(event);

    // Check if this is a right-click
    const isRightClick = MouseUtil.IsRightClick(event);

    // For left-clicks, clear selection
    if (!isRightClick) {
      SelectUtil.ClearSelectionClick();

      //Clear the context menu
      UIUtil.ShowContextMenu(false, "WorkArea", "Default");
      UIUtil.ShowObjectConfig(false);
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

      SelectUtil.ClearSelectionClick();
      UIUtil.ShowContextMenu(true, "WorkArea", "Default");
    }

    LogUtil.Debug("E.Evt WorkAreaHammerClick output:", isRightClick ? "right-click menu shown" : "selection cleared", "rClickParam:", T3Gv.opt.rClickParam);
    return false;
  }

  /**
   * Handles mouse wheel events on the work area
   * Controls zooming when Ctrl key is pressed during scrolling
   * Maintains focus on the mouse cursor point when zooming
   * @param event - The mouse wheel event
   */
  static Evt_WorkAreaMouseWheel(event) {
    LogUtil.Debug("E.Evt WorkAreaMouseWheel input:", event);

    // let docUtil = new DocUtil();
    let docUtil = T3Gv.docUtil;

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

      LogUtil.Debug("E.Evt WorkAreaMouseWheel output: zoom adjusted, focus maintained");
    }
  }

  /**
   * Handles the end of a pan gesture in the work area
   * Resets touch pan state, removes event handlers, and restores default edit mode
   * @param event - The hammer pan end event
   * @returns false to prevent default browser behavior
   */
  // static Evt_WorkAreaHammerPanEnd(event?) {
  //   LogUtil.Debug("E.Evt WorkAreaHammerPanEnd input:", event);

  //   // Reset touch pan state
  //   // T3Gv.opt.touchPanStarted = false;

  //   // Remove pan-related event handlers
  //   T3Gv.opt.WorkAreaHammer.off("drag");
  //   T3Gv.opt.WorkAreaHammer.off("dragend");

  //   // Restore default edit mode
  //   OptCMUtil.SetEditMode(NvConstant.EditState.Default);

  //   LogUtil.Debug("E.Evt WorkAreaHammerPanEnd output: pan state reset, edit mode restored to default");
  //   return false;
  // };

  /**
   * Handles the start of drag gestures in the SVG work area
   * Initiates either panning or opt slt selection based on input conditions
   * @param event - The hammer drag start event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerDragStart(event) {
    LogUtil.Debug("E.Evt WorkAreaHammerDragStart input:", event);

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
    // const shouldPan =
    //   LMEvtUtil.IsWheelClick(event) ||
    //   T3Constant.DocContext.SpacebarDown;

    // if (shouldPan) {
    //   // Initialize or continue panning
    //   if (!T3Gv.opt.touchPanStarted) {
    //     T3Gv.opt.touchPanStarted = true;
    //     T3Gv.opt.touchPanX = event.gesture.center.clientX;
    //     T3Gv.opt.touchPanY = event.gesture.center.clientY;

    //     // Bind pan-related event handlers
    //     T3Gv.opt.WorkAreaHammer.on('mousemove', EvtUtil.Evt_WorkAreaHammerPan);
    //     T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_WorkAreaHammerPanEnd);

    //     Utils2.StopPropagationAndDefaults(event);
    //   }

    //   LogUtil.Debug("E.Evt WorkAreaHammerDragStart output: pan mode started");
    //   return false;
    // } else

    {
      // End any existing pan operation
      // if (T3Gv.opt.touchPanStarted) {
      //   EvtUtil.Evt_WorkAreaHammerPanEnd();
      // }

      Utils2.StopPropagationAndDefaults(event);

      // Handle right clicks separately
      if (MouseUtil.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();

        UIUtil.ShowContextMenu(false, "WorkArea", "Default");
        // UIUtil.ShowObjectConfig(false);

        LogUtil.Debug("E.Evt WorkAreaHammerDragStart output: right-click handled");
        return false;
      }

      // Start opt slt selection
      SelectUtil.StartOptSltSelect(event);

      LogUtil.Debug("E.Evt WorkAreaHammerDragStart output: opt slt selection started");
      return false;
    }
  }

  /**
   * Handles opt slt drag events to update selection area
   * Updates the opt slt selection frame as the user drags the mouse
   * Includes auto-scrolling when dragging near document edges
   * @param event - The drag event from the hammer.js gesture system
   */
  static Evt_OptSltDrag(event) {
    LogUtil.Debug("E.Evt OptSltDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);
    const optTypes = OptConstant.OptTypes;

    try {
      // If auto-scrolling is in progress and returns false, exit early
      if (!DrawUtil.AutoScrollCommon(
        event,
        false,
        'OptSltSelectDoAutoScroll'
      )) {
        return;
      }

      // Convert screen coordinates to document coordinates
      const documentCoordinates = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );

      LogUtil.Debug("E.Evt OptSltDrag processing: coordinates", documentCoordinates);

      // Update the opt slt selection shape
      SelectUtil.OptSltSelectMoveCommon(
        documentCoordinates.x,
        documentCoordinates.y
      );

      LogUtil.Debug("E.Evt OptSltDrag output: opt slt updated");
    } catch (error) {
      // Handle exceptions during opt slt selection
      SelectUtil.OptSltSelectExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("E.Evt OptSltDrag error:", error);
      throw error;
    }
  }

  /**
   * Handles the completion of a opt slt selection drag operation
   * Finalizes selection of objects within the opt slt area and cleans up selection state
   * @param event - The drag end event from the hammer.js gesture system
   */
  static Evt_OptSltDragEnd(event) {
    LogUtil.Debug("E.Evt OptSltDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Clean up event handlers used for opt slt selection
      SelectUtil.UnbindOptSltHammerEvents();
      DrawUtil.ResetAutoScrollTimer();

      // Get the final opt slt selection area
      const optSltFrame = T3Gv.opt.optSltFrame;

      // Select all objects within the selection rectangle
      // If shift key is pressed, add to existing selection instead of replacing
      SelectUtil.SelectAllInRect(
        optSltFrame,
        event.gesture.srcEvent.shiftKey
      );

      // Remove the visual opt slt selection indicator
      T3Gv.opt.svgOverlayLayer.RemoveElement(T3Gv.opt.optSlt);

      // Reset opt slt selection state
      LogUtil.Debug("E.Evt OptSltDragEnd processing: resetting opt slt state");
      T3Gv.opt.optSlt = null;
      T3Gv.opt.optSltStartX = 0;
      T3Gv.opt.optSltStartY = 0;
      T3Gv.opt.optSltFrame = { x: 0, y: 0, width: 0, height: 0 };

      LogUtil.Debug("E.Evt OptSltDragEnd output: selection completed");

    } catch (error) {
      // Clean up if an error occurs during selection
      SelectUtil.OptSltSelectExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      LogUtil.Debug("E.Evt OptSltDragEnd error:", error);
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
    LogUtil.Debug("E.Evt WorkAreaHammerDrawStart input:", hammerEvent);

    // Prevent event propagation and default behavior
    hammerEvent.stopPropagation();
    hammerEvent.preventDefault();

    // Check if this is a right-click event
    const isRightClick = MouseUtil.IsRightClick(hammerEvent);

    if (!isRightClick) {
      // Start the drawing operation
      DrawUtil.StartNewObjectDraw(hammerEvent);

      LogUtil.Debug("E.Evt WorkAreaHammerDrawStart output: drawing started");
    } else {
      LogUtil.Debug("E.Evt WorkAreaHammerDrawStart output: right-click ignored");
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
    LogUtil.Debug("E.Evt DrawTrackHandlerFactory input:", drawableObject);

    return function (event) {
      LogUtil.Debug("E.Evt DrawTrack input:", event);

      try {
        // Track the drawing movement for the current object
        drawableObject.LMDrawTrack(event);

        LogUtil.Debug("E.Evt DrawTrack output: drawing tracked");
      } catch (error) {
        // Clean up in case of errors during draw tracking
        drawableObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        LogUtil.Debug("E.Evt DrawTrack error:", error);
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
    LogUtil.Debug("E.Evt DrawReleaseHandlerFactory input:", drawableObject);

    return function (event) {
      LogUtil.Debug("E.Evt DrawRelease input:", event);

      try {
        // Complete the drawing operation when the user releases
        drawableObject.LMDrawRelease(event);

        LogUtil.Debug("E.Evt DrawRelease output: drawing completed");
      } catch (error) {
        // Clean up in case of errors during draw completion
        OptCMUtil.CancelOperation();
        drawableObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        LogUtil.Debug("E.Evt DrawRelease error:", error);
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
    LogUtil.Debug("= U.EvtUtil: ShapeTapFactory input:", shape);

    let shapeElement;

    return function (tapEvent) {
      LogUtil.Debug("= U.EvtUtil: ShapeTap input:", tapEvent);

      // Prevent default browser behavior
      Utils2.StopPropagationAndDefaults(tapEvent);

      // Check if this is a right-click
      const isRightClick = MouseUtil.IsRightClick(tapEvent);

      // Handle read-only document case
      if (T3Gv.docUtil.IsReadOnly()) {
        if (isRightClick) {
          shape.RightClick(tapEvent);
          LogUtil.Debug("= U.EvtUtil: ShapeTap output: right-click menu in read-only mode");
          return false;
        }
      } else if (isRightClick) {
        shape.RightClick(tapEvent);
        LogUtil.Debug("= U.EvtUtil: ShapeTap output: right-click menu shown");
        return false;
      }

      // Handle tap based on current modal operation
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
          // Check for hyperlink hits or process normal tap
          if (!TextUtil.CheckTextHyperlinkHit(shape, tapEvent)) {
            // Handle rollover actions if not in read-only mode
            if (UIUtil.GetUIAdaptation(tapEvent) && !T3Gv.docUtil.IsReadOnly()) {
              shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.tag);
              shape.SetRolloverActions(T3Gv.opt.svgDoc, shapeElement);
            }
          }

          UIUtil.ShowObjectConfig(true);

          // Set the selected shape in the UI
          QuasarUtil.SetAppStateV2SelectIndex(null);

          LogUtil.Debug("= U.EvtUtil: ShapeTap output: normal tap processed");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
          LogUtil.Debug("= U.EvtUtil: ShapeTap output: ignored in draw mode");
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

          LogUtil.Debug("= U.EvtUtil: ShapeTap output: text edit activated in stamp mode");
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
    LogUtil.Debug("E.Evt ShapeDragStartFactory input:", shape);

    return function (event) {
      LogUtil.Debug("E.Evt ShapeDragStart input:", event);

      // Check if we're in drawing mode - prevent drag start
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.Draw) {
        LogUtil.Debug("E.Evt ShapeDragStart output: prevented in draw mode");
        return false;
      }

      // Check if we're in stamp mode - prevent drag start and stop propagation
      if (T3Gv.opt.crtOpt === OptConstant.OptTypes.Stamp) {
        event.stopPropagation();
        event.gesture.stopPropagation();
        LogUtil.Debug("E.Evt ShapeDragStart output: prevented in stamp mode");
        return false;
      }

      // Handle right-click differently
      if (MouseUtil.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.gesture.preventDefault();
        event.gesture.stopPropagation();
        LogUtil.Debug("E.Evt ShapeDragStart output: right-click prevented");
        return false;
      }

      // Process based on current modal operation state
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
        case OptConstant.OptTypes.FormatPainter:
          // Normal drag operation - start movement
          Utils2.StopPropagationAndDefaults(event);
          LMEvtUtil.LMMoveClick(event);
          LogUtil.Debug("E.Evt ShapeDragStart output: move operation started");
          return false;

        case OptConstant.OptTypes.Draw:
          // Forward to draw handler if in draw mode
          LogUtil.Debug("E.Evt ShapeDragStart output: forwarded to draw handler");
          return EvtUtil.Evt_WorkAreaHammerDrawStart(event);

        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent drag in these modes
          LogUtil.Debug("E.Evt ShapeDragStart output: prevented in special mode");
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
    LogUtil.Debug("E.Evt ShapeHoldFactory input:", shape);

    return function (event) {
      LogUtil.Debug("E.Evt ShapeHold input:", event);

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
            LogUtil.Debug("E.Evt ShapeHold error:", error);
            throw error;
          }

          LogUtil.Debug("E.Evt ShapeHold output: context menu displayed");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent hold actions in these modes
          LogUtil.Debug("E.Evt ShapeHold output: prevented in special mode");
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
    LogUtil.Debug("E.Evt ShapeDoubleTapFactory input:", shape);

    return function (event) {
      LogUtil.Debug("E.Evt ShapeDoubleTap input:", event);

      // Get the object using its ID
      const shapeBlockId = shape.BlockID;
      const objectPtr = ObjectUtil.GetObjectPtr(shapeBlockId, false);

      // Validate that we have a valid drawing object
      if (!(objectPtr && objectPtr instanceof Instance.Shape.BaseDrawObject)) {
        LogUtil.Debug("E.Evt ShapeDoubleTap output: invalid object");
        return false;
      }

      // Process based on current modal operation state
      switch (T3Gv.opt.crtOpt) {
        case OptConstant.OptTypes.None:
          // Don't process if already editing a note
          if (T3Gv.opt.bInNoteEdit) {
            LogUtil.Debug("E.Evt ShapeDoubleTap output: prevented during note edit");
            return false;
          }

          // Check if this is a table or graph object
          const isGraph = shape.GetGraph(false);

          // Handle container shapes
          if (shape instanceof Instance.Shape.ShapeContainer) {
            shape.DoubleClick(event);
            LogUtil.Debug("E.Evt ShapeDoubleTap output: container double-click handled");
            return false;
          }

          // Default behavior: activate text editing
          const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(shape.tag);
          TextUtil.ActivateTextEdit(shapeElement.svgObj.SDGObj, event);
          LogUtil.Debug("E.Evt ShapeDoubleTap output: text editor activated");
          return false;

        case OptConstant.OptTypes.Draw:
        case OptConstant.OptTypes.DrawPolyline:
        case OptConstant.OptTypes.StampTextOnTap:
          // Prevent double-tap actions in these modes
          LogUtil.Debug("E.Evt ShapeDoubleTap output: prevented in special mode");
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
    LogUtil.Debug("E.Evt ShapeDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Check if dragging over custom library
      let isOverCustomLibrary = DrawUtil.CheckDragIsOverCustomLibrary(event);

      // Track the movement of the shape
      LMEvtUtil.LMMoveTrack(event, isOverCustomLibrary);

      LogUtil.Debug("E.Evt ShapeDrag output: shape position updated");
    } catch (error) {
      // Clean up in case of errors during movement
      LMEvtUtil.LMMoveExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);

      LogUtil.Debug("E.Evt ShapeDrag error:", error);
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
    LogUtil.Debug("E.Evt ShapeDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Complete the movement operation
      LMEvtUtil.LMMoveRelease(event);

      LogUtil.Debug("E.Evt ShapeDragEnd output: shape movement completed");
    } catch (error) {
      // Clean up in case of errors during move completion
      LMEvtUtil.LMMoveExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);

      LogUtil.Debug("E.Evt ShapeDragEnd error:", error);
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
    LogUtil.Debug("E.Evt ActionTrackHandlerFactory input:", actionObject);

    return function (event) {
      LogUtil.Debug("E.Evt ActionTrack input:", event);

      // Track the action movement through the action object
      actionObject.LMActionTrack(event);

      LogUtil.Debug("E.Evt ActionTrack output: action tracked");
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
    LogUtil.Debug("E.Evt ActionReleaseHandlerFactory input:", actionObject);

    return function (event) {
      LogUtil.Debug("E.Evt ActionRelease input:", event);

      // Complete the action through the action object
      actionObject.LMActionRelease(event);

      LogUtil.Debug("E.Evt ActionRelease output: action completed");
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
    LogUtil.Debug("E.Evt StampObjectDrag input:", event);

    // Move the stamp object to follow the drag position
    DrawUtil.StampObjectMove(event);

    LogUtil.Debug("E.Evt StampObjectDrag output: stamp object position updated");
    return true;
  };

  /**
   * Handles mouse movement events for stamp objects
   * Updates the position of a stamp object to follow mouse cursor movement
   * @param mouseEvent - The mouse move event
   */
  static Evt_MouseStampObjectMove(mouseEvent) {
    LogUtil.Debug("E.Evt MouseStampObjectMove input:", mouseEvent);

    // Move the stamp object to follow the mouse position
    DrawUtil.MouseStampObjectMove(mouseEvent);

    LogUtil.Debug("E.Evt MouseStampObjectMove output: stamp object position updated");
  };

  /**
   * Creates a handler for completing mouse-based stamp operations
   * Returns a function that processes the completion of placing a stamp object with mouse input
   * @param stampObject - The object being stamped/placed in the document
   * @returns A function that handles stamp completion events
   */
  static Evt_MouseStampObjectDoneFactory(stampObject) {
    LogUtil.Debug("E.Evt MouseStampObjectDoneFactory input:", stampObject);

    return function (mouseEvent) {
      LogUtil.Debug("E.Evt MouseStampObjectDone input:", mouseEvent);

      // Process the stamp completion and place the object
      DrawUtil.MouseStampObjectDone(mouseEvent, stampObject);

      LogUtil.Debug("E.Evt MouseStampObjectDone output: object placement completed");
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
    LogUtil.Debug("E.Evt StampObjectDragEndFactory input:", stampObject);

    return function (event) {
      LogUtil.Debug("E.Evt StampObjectDragEnd input:", event);

      // Process the drag completion and place the stamp object
      DrawUtil.DragDropObjectDone(event, stampObject);

      LogUtil.Debug("E.Evt StampObjectDragEnd output: object placement completed");
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
    LogUtil.Debug("E.Evt ActionTriggerTap input:", event);

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.gesture.stopPropagation();
    event.stopPropagation();

    LogUtil.Debug("E.Evt ActionTriggerTap output: propagation stopped");
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
    LogUtil.Debug("E.Evt WorkAreaHammerPinchIn input:", event);

    // If scale is greater than threshold, handle as pan instead of pinch
    if (event.gesture.scale > 0.666) {
      // if (T3Gv.opt.touchPanStarted) {
      //   return EvtUtil.Evt_WorkAreaHammerPan(event);
      // } else {
      //   T3Gv.opt.touchPanStarted = true;
      //   T3Gv.opt.touchPanX = event.gesture.center.clientX;
      //   T3Gv.opt.touchPanY = event.gesture.center.clientY;
      // }
      return false;
    }

    // // Reset touch state for pinch gesture
    // T3Gv.opt.touchPanStarted = false;
    // T3Gv.opt.touchPanX = event.gesture.center.clientX;
    // T3Gv.opt.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    SelectUtil.OptSltSelectCancel();
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

    LogUtil.Debug("E.Evt WorkAreaHammerPinchIn output: zoom out completed", {
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
  // static Evt_WorkAreaHammerPan(event) {
  //   LogUtil.Debug("E.Evt WorkAreaHammerPan input:", event);

  //   // Cancel any active opt slt selection
  //   SelectUtil.OptSltSelectCancel();

  //   // Release any active move operation
  //   if (T3Gv.opt.moveList && T3Gv.opt.moveList.length) {
  //     LMEvtUtil.LMMoveRelease(event);
  //   }

  //   // Set edit mode to indicate grabbing/panning
  //   OptCMUtil.SetEditMode(NvConstant.EditState.Grab);

  //   // Prevent default browser behavior
  //   Utils2.StopPropagationAndDefaults(event);

  //   // Get work area information
  //   T3Gv.docUtil.svgDoc.GetWorkArea();

  //   // Get current touch position
  //   const clientX = event.gesture.center.clientX;
  //   const clientY = event.gesture.center.clientY;

  //   // Calculate distance moved since last event
  //   const deltaX = clientX ;//- T3Gv.opt.touchPanX;
  //   const deltaY = clientY ;//- T3Gv.opt.touchPanY;

  //   // Get current scroll position
  //   const svgArea = $("#svgarea");
  //   const scrollLeft = svgArea.scrollLeft();
  //   const scrollTop = svgArea.scrollTop();

  //   // Update scroll position based on pan movement
  //   T3Gv.docUtil.SetScroll(scrollLeft - deltaX, scrollTop - deltaY);

  //   // Save current touch position for next event
  //   // T3Gv.opt.touchPanX = event.gesture.center.clientX;
  //   // T3Gv.opt.touchPanY = event.gesture.center.clientY;

  //   LogUtil.Debug("E.Evt WorkAreaHammerPan output: scroll updated", {
  //     deltaX: deltaX,
  //     deltaY: deltaY,
  //     newScrollLeft: scrollLeft - deltaX,
  //     newScrollTop: scrollTop - deltaY
  //   });

  //   return false;
  // };

  /**
   * Handles pinch-out gesture events on the work area
   * Controls zooming in when users pinch outward on touch devices
   * Maintains focus on the gesture center point when zooming
   * @param event - The hammer pinch-out event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPinchOut(event) {
    LogUtil.Debug("E.Evt WorkAreaHammerPinchOut input:", event);

    // If scale is less than threshold, handle as pan instead of pinch
    if (event.gesture.scale < 1.333) {
      // if (T3Gv.opt.touchPanStarted) {
      //   return EvtUtil.Evt_WorkAreaHammerPan(event);
      // } else {
      //   T3Gv.opt.touchPanStarted = true;
      //   T3Gv.opt.touchPanX = event.gesture.center.clientX;
      //   T3Gv.opt.touchPanY = event.gesture.center.clientY;
      // }
      return false;
    }

    // // Reset touch state for pinch gesture
    // T3Gv.opt.touchPanStarted = false;
    // T3Gv.opt.touchPanX = event.gesture.center.clientX;
    // T3Gv.opt.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    T3Gv.opt.OptSltSelectCancel();
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

    LogUtil.Debug("E.Evt WorkAreaHammerPinchOut output: zoom in completed", {
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
    LogUtil.Debug("E.Evt WorkAreaHammerPinchEnd input:", event);

    // Reset touch pan state
    // T3Gv.opt.touchPanStarted = false;

    LogUtil.Debug("E.Evt WorkAreaHammerPinchEnd output: touch pan state reset");
  }

  /**
   * Adjusts UI when virtual keyboard appears during dimension text editing
   * Lifts content to ensure text being edited remains visible above the keyboard
   * @param element - The element being edited
   * @param keyboardEvent - The keyboard event that triggered the adjustment
   */
  static Evt_DimensionTextKeyboardLifter(element, keyboardEvent) {
    LogUtil.Debug("E.Evt DimensionTextKeyboardLifter input:", { element, keyboardEvent });

    // Adjust UI for virtual keyboard
    T3Gv.opt.VirtualKeyboardLifter(element, keyboardEvent);

    LogUtil.Debug("E.Evt DimensionTextKeyboardLifter output: UI adjusted for virtual keyboard");
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
    LogUtil.Debug("E.Evt DimensionTextDoubleTapFactory input:", { shape, textId });

    return function (event) {
      LogUtil.Debug("E.Evt DimensionTextDoubleTap input:", event);

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
                TextUtil.TextRegisterEvents(textElement.svgObj.SDGObj, event.gesture.srcEvent);
              } else {
                TextUtil.TextRegisterEvents(textElement.svgObj.SDGObj, event);
              }

              event.stopPropagation();

              LogUtil.Debug("E.Evt DimensionTextDoubleTap output: dimension text editing activated");
              return false;
            }
          }
        }

        LogUtil.Debug("E.Evt DimensionTextDoubleTap output: dimension text element not found");
        return false;
      }

      LogUtil.Debug("E.Evt DimensionTextDoubleTap output: prevented in modal operation");
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
    LogUtil.Debug("E.Evt DimensionTextTapFactory input:", { shape, textId, preventPropagation });

    return function (event) {
      LogUtil.Debug("E.Evt DimensionTextTap input:", event);

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
                LogUtil.Debug("E.Evt DimensionTextTap output: already editing this dimension");
                return false;
              }

              // Close any existing edit session
              T3Gv.opt.CloseEdit(false, true);

              // Enable dimension edit mode
              T3Gv.opt.bInDimensionEdit = true;
              SelectUtil.UpdateSelectionAttributes(null);

              // Register text editing event handlers
              if (event.gesture) {
                TextUtil.TextRegisterEvents(textElement, event.gesture.srcEvent);
              } else {
                TextUtil.TextRegisterEvents(textElement, event);
              }

              event.stopPropagation();
              LogUtil.Debug("E.Evt DimensionTextTap output: dimension text editing activated");
              return false;
            }
          }
        }

        LogUtil.Debug("E.Evt DimensionTextTap output: dimension text element not found");
        return false;
      }

      LogUtil.Debug("E.Evt DimensionTextTap output: prevented in modal operation");
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
    LogUtil.Debug("E.Evt PolyLineDrawExtendHandlerFactory input:", polyLineObject);

    return function (event) {
      LogUtil.Debug("E.Evt PolyLineDrawExtend input:", event);

      try {
        // Extend the polyline drawing
        polyLineObject.LMDrawExtend(event);

        LogUtil.Debug("E.Evt PolyLineDrawExtend output: polyline extended");
      } catch (error) {
        // Clean up in case of errors
        OptCMUtil.CancelOperation();
        polyLineObject.LMDrawClickExceptionCleanup(error);
        T3Gv.opt.ExceptionCleanup(error);

        LogUtil.Debug("E.Evt PolyLineDrawExtend error:", error);
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
    LogUtil.Debug("E.Evt PolyLineDrawDragStart input:", event);
    LogUtil.Debug("E.Evt PolyLineDrawDragStart output: drag prevented during polyline drawing");
    return false;
  }
}

export default EvtUtil
