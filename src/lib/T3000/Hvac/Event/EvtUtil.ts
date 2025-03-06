

import GlobalData from '../Data/GlobalData';
import Utils2 from '../Helper/Utils2';
import $ from 'jquery';
import BaseDrawingObject from '../Shape/Shape.BaseDrawingObject'
import Instance from '../Data/Instance/Instance'
import ConstantData from '../Data/ConstantData'
import ConstantData2 from '../Data/ConstantData2'
import RightClickData from '../Model/RightClickData'
import DocOpt from '../Opt/Business/DocOpt'

class EvtUtil {

  /**
   * Handles mouse movement events over the SVG document
   * Tracks cursor position and updates coordinate display when mouse is within document bounds
   * @param mouseEvent - The mouse movement event
   */
  static Evt_MouseMove = function (mouseEvent) {
    console.log("E.Evt MouseMove input:", mouseEvent);

    const svgDoc = GlobalData.optManager.svgDoc;
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
      GlobalData.optManager.ShowXY(true);
      GlobalData.optManager.UpdateDisplayCoordinates(
        null,
        documentCoordinates,
        null,
        null
      );

      console.log("E.Evt MouseMove output: coordinates shown", documentCoordinates);
    } else {
      // Hide coordinates display when outside document bounds
      GlobalData.optManager.ShowXY(false);
      console.log("E.Evt MouseMove output: coordinates hidden");
    }
  }

  /**
   * Handles hammer tap events on the SVG work area
   * Processes tap gestures and triggers appropriate actions based on tap type (right-click vs normal)
   * @param event - The hammer tap event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerClick = function (event) {
    console.log("E.Evt WorkAreaHammerClick input:", event);

    // Stop propagation of the event to parent elements
    Utils2.StopPropagationAndDefaults(event);

    // Set UI adaptation based on event
    GlobalData.optManager.SetUIAdaptation(event);

    // Check if this is a right-click
    const isRightClick = GlobalData.optManager.IsRightClick(event);

    // For left-clicks, clear selection
    if (!isRightClick) {
      GlobalData.optManager.ClearSelectionClick();
    }

    // Allow typing in work area
    // ConstantData.DocumentContext.CanTypeInWorkArea = true;

    // Handle right-click contextual menu
    if (isRightClick) {
      GlobalData.optManager.RightClickParams = new RightClickData();

      // Convert window coordinates to document coordinates
      GlobalData.optManager.RightClickParams.HitPt = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
    }

    console.log("E.Evt WorkAreaHammerClick output:", isRightClick ? "right-click menu shown" : "selection cleared");
    return false;
  }

  /**
   * Handles mouse wheel events on the work area
   * Controls zooming when Ctrl key is pressed during scrolling
   * Maintains focus on the mouse cursor point when zooming
   * @param event - The mouse wheel event
   */
  static Evt_WorkAreaMouseWheel = function (event) {
    console.log("E.Evt WorkAreaMouseWheel input:", event);

    if (event.ctrlKey) {
      // Get current cursor position
      const clientX = event.clientX;
      const clientY = event.clientY;

      // Convert window coordinates to document coordinates
      const docCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

      // Determine zoom direction based on wheel direction
      if (event.deltaY > 0) {
        // Zoom out
        DocOpt.ZoomInAndOut(false, true);
      } else if (event.deltaY < 0) {
        // Zoom in
        DocOpt.ZoomInAndOut(true, true);
      }

      // Prevent default scrolling behavior
      Utils2.StopPropagationAndDefaults(event);

      // Calculate new position to maintain focus point
      const windowCoordinates = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(docCoordinates.x, docCoordinates.y);
      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svg-area');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      GlobalData.docHandler.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);

      console.log("E.Evt WorkAreaMouseWheel output: zoom adjusted, focus maintained");
    }
  }

  /**
   * Handles the end of a pan gesture in the work area
   * Resets touch pan state, removes event handlers, and restores default edit mode
   * @param event - The hammer pan end event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPanEnd = function (event?) {
    console.log("E.Evt WorkAreaHammerPanEnd input:", event);

    // Reset touch pan state
    GlobalData.optManager.bTouchPanStarted = false;

    // Remove pan-related event handlers
    GlobalData.optManager.WorkAreaHammer.off("drag");
    GlobalData.optManager.WorkAreaHammer.off("dragend");

    // Restore default edit mode
    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    console.log("E.Evt WorkAreaHammerPanEnd output: pan state reset, edit mode restored to default");
    return false;
  };

  /**
   * Handles the start of drag gestures in the SVG work area
   * Initiates either panning or rubber band selection based on input conditions
   * @param event - The hammer drag start event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerDragStart = function (event) {
    console.log("E.Evt WorkAreaHammerDragStart input:", event);

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
    const shouldPan = GlobalData.optManager.isMobilePlatform ||
      GlobalData.optManager.IsWheelClick(event) ||
      ConstantData.DocumentContext.SpacebarDown;

    if (shouldPan) {
      // Initialize or continue panning
      if (!GlobalData.optManager.bTouchPanStarted) {
        GlobalData.optManager.bTouchPanStarted = true;
        GlobalData.optManager.touchPanX = event.gesture.center.clientX;
        GlobalData.optManager.touchPanY = event.gesture.center.clientY;

        // Bind pan-related event handlers
        GlobalData.optManager.WorkAreaHammer.on('mousemove', EvtUtil.Evt_WorkAreaHammerPan);
        GlobalData.optManager.WorkAreaHammer.on('dragend', EvtUtil.Evt_WorkAreaHammerPanEnd);

        Utils2.StopPropagationAndDefaults(event);
      }

      console.log("E.Evt WorkAreaHammerDragStart output: pan mode started");
      return false;
    } else {
      // End any existing pan operation
      if (GlobalData.optManager.bTouchPanStarted) {
        EvtUtil.Evt_WorkAreaHammerPanEnd();
      }

      Utils2.StopPropagationAndDefaults(event);
      GlobalData.optManager.SetUIAdaptation(event);

      // Handle right clicks separately
      if (GlobalData.optManager.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();

        console.log("E.Evt WorkAreaHammerDragStart output: right-click handled");
        return false;
      }

      // Start rubber band selection
      GlobalData.optManager.StartRubberBandSelect(event);

      console.log("E.Evt WorkAreaHammerDragStart output: rubber band selection started");
      return false;
    }
  }

  /**
   * Handles rubber band drag events to update selection area
   * Updates the rubber band selection frame as the user drags the mouse
   * Includes auto-scrolling when dragging near document edges
   * @param event - The drag event from the hammer.js gesture system
   */
  static Evt_RubberBandDrag = function (event) {
    console.log("E.Evt RubberBandDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);
    const modalOperations = ConstantData2.ModalOperations;

    try {
      // Cancel any special mode operations if active
      switch (GlobalData.optManager.currentModalOperation) {
        case modalOperations.ADDCORNER:
        case modalOperations.SPLITWALL:
          GlobalData.gFloorplanManager.AddCornerCancel();
          break;
      }

      // If auto-scrolling is in progress and returns false, exit early
      if (!GlobalData.optManager.AutoScrollCommon(
        event,
        false,
        'RubberBandSelectDoAutoScroll'
      )) {
        return;
      }

      // Convert screen coordinates to document coordinates
      const documentCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );

      console.log("E.Evt RubberBandDrag processing: coordinates", documentCoordinates);

      // Update the rubber band selection shape
      GlobalData.optManager.RubberBandSelectMoveCommon(
        documentCoordinates.x,
        documentCoordinates.y
      );

      console.log("E.Evt RubberBandDrag output: rubber band updated");
    } catch (error) {
      // Handle exceptions during rubber band selection
      GlobalData.optManager.RubberBandSelectExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("E.Evt RubberBandDrag error:", error);
      throw error;
    }
  }

  /**
   * Handles the completion of a rubber band selection drag operation
   * Finalizes selection of objects within the rubber band area and cleans up selection state
   * @param event - The drag end event from the hammer.js gesture system
   */
  static Evt_RubberBandDragEnd = function (event) {
    console.log("E.Evt RubberBandDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Clean up event handlers used for rubber band selection
      GlobalData.optManager.UnbindRubberBandHammerEvents();
      GlobalData.optManager.ResetAutoScrollTimer();

      // Get the final rubber band selection area
      const rubberBandFrame = GlobalData.optManager.theRubberBandFrame;

      // Select all objects within the selection rectangle
      // If shift key is pressed, add to existing selection instead of replacing
      GlobalData.optManager.SelectAllInRect(
        rubberBandFrame,
        event.gesture.srcEvent.shiftKey
      );

      // Remove the visual rubber band selection indicator
      GlobalData.optManager.svgOverlayLayer.RemoveElement(GlobalData.optManager.theRubberBand);

      // Reset rubber band selection state
      console.log("E.Evt RubberBandDragEnd processing: resetting rubber band state");
      GlobalData.optManager.theRubberBand = null;
      GlobalData.optManager.theRubberBandStartX = 0;
      GlobalData.optManager.theRubberBandStartY = 0;
      GlobalData.optManager.theRubberBandFrame = { x: 0, y: 0, width: 0, height: 0 };

      console.log("E.Evt RubberBandDragEnd output: selection completed");

    } catch (error) {
      // Clean up if an error occurs during selection
      GlobalData.optManager.RubberBandSelectExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      console.log("E.Evt RubberBandDragEnd error:", error);
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
  static Evt_WorkAreaHammerDrawStart = function (hammerEvent) {
    console.log("E.Evt WorkAreaHammerDrawStart input:", hammerEvent);

    // Prevent event propagation and default behavior
    hammerEvent.stopPropagation();
    hammerEvent.preventDefault();

    // Check if this is a right-click event
    const isRightClick = GlobalData.optManager.IsRightClick(hammerEvent);

    if (!isRightClick) {
      // Set UI adaptation based on event
      GlobalData.optManager.SetUIAdaptation(hammerEvent);

      // Start the drawing operation
      GlobalData.optManager.StartNewObjectDraw(hammerEvent);

      console.log("E.Evt WorkAreaHammerDrawStart output: drawing started");
    } else {
      console.log("E.Evt WorkAreaHammerDrawStart output: right-click ignored");
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
  static Evt_DrawTrackHandlerFactory = function (drawableObject) {
    console.log("E.Evt DrawTrackHandlerFactory input:", drawableObject);

    return function (event) {
      console.log("E.Evt DrawTrack input:", event);

      try {
        // Track the drawing movement for the current object
        drawableObject.LM_DrawTrack(event);

        console.log("E.Evt DrawTrack output: drawing tracked");
      } catch (error) {
        // Clean up in case of errors during draw tracking
        drawableObject.LM_DrawClick_ExceptionCleanup(error);
        GlobalData.optManager.ExceptionCleanup(error);

        console.log("E.Evt DrawTrack error:", error);
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
  static Evt_DrawReleaseHandlerFactory = function (drawableObject) {
    console.log("E.Evt DrawReleaseHandlerFactory input:", drawableObject);

    return function (event) {
      console.log("E.Evt DrawRelease input:", event);

      try {
        // Complete the drawing operation when the user releases
        drawableObject.LM_DrawRelease(event);

        console.log("E.Evt DrawRelease output: drawing completed");
      } catch (error) {
        // Clean up in case of errors during draw completion
        GlobalData.optManager.CancelModalOperation();
        drawableObject.LM_DrawClick_ExceptionCleanup(error);
        GlobalData.optManager.ExceptionCleanup(error);

        console.log("E.Evt DrawRelease error:", error);
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
  static Evt_ShapeTapFactory = function (shape) {
    console.log("E.Evt ShapeTapFactory input:", shape);

    let shapeElement;

    return function (tapEvent) {
      console.log("E.Evt ShapeTap input:", tapEvent);

      // Prevent default browser behavior
      Utils2.StopPropagationAndDefaults(tapEvent);
      GlobalData.optManager.SetUIAdaptation(tapEvent);

      // Check if this is a right-click
      const isRightClick = GlobalData.optManager.IsRightClick(tapEvent);

      // Handle read-only document case
      if (GlobalData.docHandler.IsReadOnly()) {
        if (isRightClick) {
          shape.RightClick(tapEvent);
          console.log("E.Evt ShapeTap output: right-click menu in read-only mode");
          return false;
        }
      } else if (isRightClick) {
        shape.RightClick(tapEvent);
        console.log("E.Evt ShapeTap output: right-click menu shown");
        return false;
      }

      // Handle tap based on current modal operation
      switch (GlobalData.optManager.currentModalOperation) {
        case ConstantData2.ModalOperations.NONE:
          // Check for hyperlink hits or process normal tap
          if (!GlobalData.optManager.CheckTextHyperlinkHit(shape, tapEvent)) {
            GlobalData.optManager.LM_TestIconClick(tapEvent);

            // Handle rollover actions if not in read-only mode
            if (GlobalData.optManager.GetUIAdaptation(tapEvent) && !GlobalData.docHandler.IsReadOnly()) {
              shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(shape.tag);
              shape.SetRolloverActions(GlobalData.optManager.svgDoc, shapeElement);
            }
          }

          console.log("E.Evt ShapeTap output: normal tap processed");
          return false;

        case ConstantData2.ModalOperations.DRAW:
        case ConstantData2.ModalOperations.DRAWPOLYLINE:
          console.log("E.Evt ShapeTap output: ignored in draw mode");
          return false;

        case ConstantData2.ModalOperations.STAMPTEXTONTAP:
          // Handle text editing in stamp text mode
          if (!GlobalData.optManager.stampSticky) {
            GlobalData.optManager.CancelObjectStampTextOnTap(true);
          }

          if (shape.AllowTextEdit()) {
            shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(shape.tag);
            GlobalData.optManager.ActivateTextEdit(shapeElement.svgObj.SDGObj, tapEvent, false);
          }

          console.log("E.Evt ShapeTap output: text edit activated in stamp mode");
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
  static Evt_ShapeDragStartFactory = function (shape) {
    console.log("E.Evt ShapeDragStartFactory input:", shape);

    return function (event) {
      console.log("E.Evt ShapeDragStart input:", event);

      // Check if we're in drawing mode - prevent drag start
      if (GlobalData.optManager.currentModalOperation === ConstantData2.ModalOperations.DRAW) {
        console.log("E.Evt ShapeDragStart output: prevented in draw mode");
        return false;
      }

      // Check if we're in stamp mode - prevent drag start and stop propagation
      if (GlobalData.optManager.currentModalOperation === ConstantData2.ModalOperations.STAMP) {
        event.stopPropagation();
        event.gesture.stopPropagation();
        console.log("E.Evt ShapeDragStart output: prevented in stamp mode");
        return false;
      }

      // Set UI adaptation for current platform/device
      GlobalData.optManager.SetUIAdaptation(event);

      // Handle right-click differently
      if (GlobalData.optManager.IsRightClick(event)) {
        event.preventDefault();
        event.stopPropagation();
        event.gesture.preventDefault();
        event.gesture.stopPropagation();
        console.log("E.Evt ShapeDragStart output: right-click prevented");
        return false;
      }

      // Process based on current modal operation state
      switch (GlobalData.optManager.currentModalOperation) {
        case ConstantData2.ModalOperations.NONE:
        case ConstantData2.ModalOperations.FORMATPAINTER:
          // Normal drag operation - start movement
          Utils2.StopPropagationAndDefaults(event);
          GlobalData.optManager.LM_MoveClick(event);
          console.log("E.Evt ShapeDragStart output: move operation started");
          return false;

        case ConstantData2.ModalOperations.DRAW:
          // Forward to draw handler if in draw mode
          console.log("E.Evt ShapeDragStart output: forwarded to draw handler");
          return EvtUtil.Evt_WorkAreaHammerDrawStart(event);

        case ConstantData2.ModalOperations.DRAWPOLYLINE:
        case ConstantData2.ModalOperations.STAMPTEXTONTAP:
          // Prevent drag in these modes
          console.log("E.Evt ShapeDragStart output: prevented in special mode");
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
  static Evt_ShapeHoldFactory = function (shape) {
    console.log("E.Evt ShapeHoldFactory input:", shape);

    return function (event) {
      console.log("E.Evt ShapeHold input:", event);

      switch (GlobalData.optManager.currentModalOperation) {
        case ConstantData2.ModalOperations.NONE:
          // Stop the gesture detection and prevent default behavior
          event.gesture.stopDetect();
          Utils2.StopPropagationAndDefaults(event);

          // Trigger right-click menu (context menu)
          shape.RightClick(event);

          try {
            // Clean up any active move operation
            GlobalData.optManager.LM_MoveRelease(event);
          } catch (error) {
            // Handle exceptions during move release
            GlobalData.optManager.LM_Move_ExceptionCleanup(error);
            GlobalData.optManager.ExceptionCleanup(error);
            console.log("E.Evt ShapeHold error:", error);
            throw error;
          }

          console.log("E.Evt ShapeHold output: context menu displayed");
          return false;

        case ConstantData2.ModalOperations.DRAW:
        case ConstantData2.ModalOperations.DRAWPOLYLINE:
        case ConstantData2.ModalOperations.STAMPTEXTONTAP:
          // Prevent hold actions in these modes
          console.log("E.Evt ShapeHold output: prevented in special mode");
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
  static Evt_ShapeDoubleTapFactory = function (shape) {
    console.log("E.Evt ShapeDoubleTapFactory input:", shape);

    return function (event) {
      console.log("E.Evt ShapeDoubleTap input:", event);

      // Get the object using its ID
      const shapeBlockId = shape.BlockID;
      const objectPtr = GlobalData.optManager.GetObjectPtr(shapeBlockId, false);

      // Validate that we have a valid drawing object
      if (!(objectPtr && objectPtr instanceof BaseDrawingObject)) {
        console.log("E.Evt ShapeDoubleTap output: invalid object");
        return false;
      }

      // Set UI adaptation for current device/platform
      GlobalData.optManager.SetUIAdaptation(event);

      // Process based on current modal operation state
      switch (GlobalData.optManager.currentModalOperation) {
        case ConstantData2.ModalOperations.NONE:
          // Don't process if already editing a note
          if (GlobalData.optManager.bInNoteEdit) {
            console.log("E.Evt ShapeDoubleTap output: prevented during note edit");
            return false;
          }

          // Check if this is a table or graph object
          const isTable = shape.GetTable(false);
          const isGraph = shape.GetGraph(false);

          // Handle special D3 symbol types (gauges and charts)
          if (shape.objecttype === ConstantData.ObjectTypes.SD_OBJT_D3SYMBOL) {
            switch (shape.codeLibID) {
              case 'RadialGauge':
              case 'LinearGauge':
                GlobalData.optManager.EditGauge();
                console.log("E.Evt ShapeDoubleTap output: gauge editor opened");
                return false;

              case 'BarChart':
              case 'PieChart':
              case 'LineChart':
              case 'SankeyChart':
                GlobalData.optManager.EditGraph();
                console.log("E.Evt ShapeDoubleTap output: graph editor opened");
                return false;
            }
          }
          // Handle container shapes
          else if (shape instanceof Instance.Shape.ShapeContainer) {
            shape.DoubleClick(event);
            console.log("E.Evt ShapeDoubleTap output: container double-click handled");
            return false;
          }

          // Handle tables
          if (isTable) {
            GlobalData.optManager.Table_SetupAction(
              event,
              shape.BlockID,
              ConstantData.Defines.TableCellHit,
              -1
            );
            console.log("E.Evt ShapeDoubleTap output: table action setup");
            return false;
          }

          // Handle graphs
          if (isGraph) {
            GlobalData.optManager.Graph_SetupAction(
              event,
              shape.BlockID,
              ConstantData.Defines.GraphTextHit,
              -1
            );
            console.log("E.Evt ShapeDoubleTap output: graph action setup");
            return false;
          }

          // Default behavior: activate text editing
          const shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(shape.tag);
          GlobalData.optManager.ActivateTextEdit(shapeElement.svgObj.SDGObj, event);
          console.log("E.Evt ShapeDoubleTap output: text editor activated");
          return false;

        case ConstantData2.ModalOperations.DRAW:
        case ConstantData2.ModalOperations.DRAWPOLYLINE:
        case ConstantData2.ModalOperations.STAMPTEXTONTAP:
          // Prevent double-tap actions in these modes
          console.log("E.Evt ShapeDoubleTap output: prevented in special mode");
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
  static Evt_ShapeDrag = function (event) {
    console.log("E.Evt ShapeDrag input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Check if dragging over custom library
      let isOverCustomLibrary = GlobalData.optManager.CheckDragIsOverCustomLibrary(event);

      // Track the movement of the shape
      GlobalData.optManager.LM_MoveTrack(event, isOverCustomLibrary);

      console.log("E.Evt ShapeDrag output: shape position updated");
    } catch (error) {
      // Clean up in case of errors during movement
      GlobalData.optManager.LM_Move_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);

      console.log("E.Evt ShapeDrag error:", error);
      throw error;
    }
  }

  /**
   * Handles the end of shape drag operations
   * Finalizes shape movement and position when user releases the dragged shape
   * Includes error handling to clean up resources when exceptions occur
   * @param event - The drag end event from the hammer.js gesture system
   */
  static Evt_ShapeDragEnd = function (event) {
    console.log("E.Evt ShapeDragEnd input:", event);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    try {
      // Complete the movement operation
      GlobalData.optManager.LM_MoveRelease(event);

      console.log("E.Evt ShapeDragEnd output: shape movement completed");
    } catch (error) {
      // Clean up in case of errors during move completion
      GlobalData.optManager.LM_Move_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);

      console.log("E.Evt ShapeDragEnd error:", error);
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
  static Evt_ActionTrackHandlerFactory = function (actionObject) {
    console.log("E.Evt ActionTrackHandlerFactory input:", actionObject);

    return function (event) {
      console.log("E.Evt ActionTrack input:", event);

      // Track the action movement through the action object
      actionObject.LM_ActionTrack(event);

      console.log("E.Evt ActionTrack output: action tracked");
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
  static Evt_ActionReleaseHandlerFactory = function (actionObject) {
    console.log("E.Evt ActionReleaseHandlerFactory input:", actionObject);

    return function (event) {
      console.log("E.Evt ActionRelease input:", event);

      // Complete the action through the action object
      actionObject.LM_ActionRelease(event);

      console.log("E.Evt ActionRelease output: action completed");
      return false;
    }
  }

  /**
   * Creates a handler for completing stamp object drag operations
   * Returns a function that processes the end of a stamp object drag and finalizes placement
   * @param stampObject - The object being stamped/placed in the document
   * @returns A function that handles drag end events for the stamp object
   */
  static Evt_StampObjectDragEndFactory = function (stampObject) {
    console.log("E.Evt StampObjectDragEndFactory input:", stampObject);

    return function (event) {
      console.log("E.Evt StampObjectDragEnd input:", event);

      // Process the drag completion and place the stamp object
      GlobalData.optManager.DragDropObjectDone(event, stampObject);

      console.log("E.Evt StampObjectDragEnd output: object placement completed");
      return true;
    };
  };

  /**
   * Handles drag movements for stamp objects
   * Updates the position of a stamp object being dragged across the document
   * @param event - The drag event from the gesture system
   * @returns true to indicate event was handled
   */
  static Evt_StampObjectDrag = function (event) {
    console.log("E.Evt StampObjectDrag input:", event);

    // Move the stamp object to follow the drag position
    GlobalData.optManager.StampObjectMove(event);

    console.log("E.Evt StampObjectDrag output: stamp object position updated");
    return true;
  };

  /**
   * Handles mouse movement events for stamp objects
   * Updates the position of a stamp object to follow mouse cursor movement
   * @param mouseEvent - The mouse move event
   */
  static Evt_MouseStampObjectMove = function (mouseEvent) {
    console.log("E.Evt MouseStampObjectMove input:", mouseEvent);

    // Move the stamp object to follow the mouse position
    GlobalData.optManager.MouseStampObjectMove(mouseEvent);

    console.log("E.Evt MouseStampObjectMove output: stamp object position updated");
  };

  /**
   * Creates a handler for completing mouse-based stamp operations
   * Returns a function that processes the completion of placing a stamp object with mouse input
   * @param stampObject - The object being stamped/placed in the document
   * @returns A function that handles stamp completion events
   */
  static Evt_MouseStampObjectDoneFactory = function (stampObject) {
    console.log("E.Evt MouseStampObjectDoneFactory input:", stampObject);

    return function (mouseEvent) {
      console.log("E.Evt MouseStampObjectDone input:", mouseEvent);

      // Process the stamp completion and place the object
      GlobalData.optManager.MouseStampObjectDone(mouseEvent, stampObject);

      console.log("E.Evt MouseStampObjectDone output: object placement completed");
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
  static Evt_ActionTriggerTap = function (event) {
    console.log("E.Evt ActionTriggerTap input:", event);

    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.gesture.stopPropagation();
    event.stopPropagation();

    console.log("E.Evt ActionTriggerTap output: propagation stopped");
    return false;
  };

  /**
   * Handles pinch-in gesture events on the work area
   * Controls zooming out when users pinch inward on touch devices
   * Maintains focus on the gesture center point when zooming
   * @param event - The hammer pinch-in event
   * @returns false to prevent default browser behavior
   */
  static Evt_WorkAreaHammerPinchIn = function (event) {
    console.log("E.Evt WorkAreaHammerPinchIn input:", event);

    // If scale is greater than threshold, handle as pan instead of pinch
    if (event.gesture.scale > 0.666) {
      if (GlobalData.optManager.bTouchPanStarted) {
        return EvtUtil.Evt_WorkAreaHammerPan(event);
      } else {
        GlobalData.optManager.bTouchPanStarted = true;
        GlobalData.optManager.touchPanX = event.gesture.center.clientX;
        GlobalData.optManager.touchPanY = event.gesture.center.clientY;
      }
      return false;
    }

    // Reset touch state for pinch gesture
    GlobalData.optManager.bTouchPanStarted = false;
    GlobalData.optManager.touchPanX = event.gesture.center.clientX;
    GlobalData.optManager.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    GlobalData.optManager.RubberBandSelect_Cancel();
    if (GlobalData.optManager.theMoveList && GlobalData.optManager.theMoveList.length) {
      GlobalData.optManager.LM_MoveRelease(event);
    }

    // Get work area and cursor position
    GlobalData.docHandler.svgDoc.GetWorkArea();
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Convert screen coordinates to document coordinates
    const documentCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(clientX, clientY);

    // Calculate new zoom factor (zoom out)
    let zoomFactorPercent = Math.round(100 * GlobalData.docHandler.GetZoomFactor());

    if (zoomFactorPercent > 50) {
      // Decrease zoom factor but don't go below 50%
      zoomFactorPercent = Math.max(50, zoomFactorPercent - 50);
      GlobalData.docHandler.SetZoomFactor(zoomFactorPercent / 100);

      // Calculate new position to maintain focus point
      const windowCoordinates = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(
        documentCoordinates.x,
        documentCoordinates.y
      );

      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svgarea');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      GlobalData.docHandler.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);
    }

    console.log("E.Evt WorkAreaHammerPinchIn output: zoom out completed", {
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
  static Evt_WorkAreaHammerPan = function (event) {
    console.log("E.Evt WorkAreaHammerPan input:", event);

    // Cancel any active rubber band selection
    GlobalData.optManager.RubberBandSelect_Cancel();

    // Release any active move operation
    if (GlobalData.optManager.theMoveList && GlobalData.optManager.theMoveList.length) {
      GlobalData.optManager.LM_MoveRelease(event);
    }

    // Set edit mode to indicate grabbing/panning
    GlobalData.optManager.SetEditMode(ConstantData.EditState.GRAB);

    // Prevent default browser behavior
    Utils2.StopPropagationAndDefaults(event);

    // Get work area information
    GlobalData.docHandler.svgDoc.GetWorkArea();

    // Get current touch position
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Calculate distance moved since last event
    const deltaX = clientX - GlobalData.optManager.touchPanX;
    const deltaY = clientY - GlobalData.optManager.touchPanY;

    // Get current scroll position
    const svgArea = $("#svgarea");
    const scrollLeft = svgArea.scrollLeft();
    const scrollTop = svgArea.scrollTop();

    // Update scroll position based on pan movement
    GlobalData.docHandler.SetScroll(scrollLeft - deltaX, scrollTop - deltaY);

    // Save current touch position for next event
    GlobalData.optManager.touchPanX = event.gesture.center.clientX;
    GlobalData.optManager.touchPanY = event.gesture.center.clientY;

    console.log("E.Evt WorkAreaHammerPan output: scroll updated", {
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
  static Evt_WorkAreaHammerPinchOut = function (event) {
    console.log("E.Evt WorkAreaHammerPinchOut input:", event);

    // If scale is less than threshold, handle as pan instead of pinch
    if (event.gesture.scale < 1.333) {
      if (GlobalData.optManager.bTouchPanStarted) {
        return EvtUtil.Evt_WorkAreaHammerPan(event);
      } else {
        GlobalData.optManager.bTouchPanStarted = true;
        GlobalData.optManager.touchPanX = event.gesture.center.clientX;
        GlobalData.optManager.touchPanY = event.gesture.center.clientY;
      }
      return false;
    }

    // Reset touch state for pinch gesture
    GlobalData.optManager.bTouchPanStarted = false;
    GlobalData.optManager.touchPanX = event.gesture.center.clientX;
    GlobalData.optManager.touchPanY = event.gesture.center.clientY;

    // Prevent default behavior and stop gesture detection
    Utils2.StopPropagationAndDefaults(event);
    event.gesture.stopDetect();

    // Cancel any active selections or moves
    GlobalData.optManager.RubberBandSelect_Cancel();
    if (GlobalData.optManager.theMoveList &&
      GlobalData.optManager.theMoveList.length) {
      GlobalData.optManager.LM_MoveRelease(event);
    }

    // Get work area and cursor position
    GlobalData.docHandler.svgDoc.GetWorkArea();
    const clientX = event.gesture.center.clientX;
    const clientY = event.gesture.center.clientY;

    // Convert screen coordinates to document coordinates
    const documentCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      clientX,
      clientY
    );

    // Calculate new zoom factor (zoom in)
    let zoomFactorPercent = Math.round(100 * GlobalData.docHandler.GetZoomFactor());

    if (zoomFactorPercent < 400) {
      // Increase zoom factor but don't go above 400%
      zoomFactorPercent = Math.min(400, zoomFactorPercent + 50);
      GlobalData.docHandler.SetZoomFactor(zoomFactorPercent / 100);

      // Calculate new position to maintain focus point
      const windowCoordinates = GlobalData.optManager.svgDoc.ConvertDocToWindowCoords(
        documentCoordinates.x,
        documentCoordinates.y
      );

      const xOffset = clientX - windowCoordinates.x;
      const yOffset = clientY - windowCoordinates.y;

      // Adjust scroll position
      const svgArea = $('#svgarea');
      const scrollLeft = svgArea.scrollLeft();
      const scrollTop = svgArea.scrollTop();

      GlobalData.docHandler.SetScroll(scrollLeft - xOffset, scrollTop - yOffset);
    }

    console.log("E.Evt WorkAreaHammerPinchOut output: zoom in completed", {
      newZoomFactor: zoomFactorPercent / 100
    });
    return false;
  }

  /**
   * Handles the end of pinch gestures on the work area
   * Resets the touch pan state after pinch gesture completes
   * @param event - The hammer pinch end event
   */
  static Evt_WorkAreaHammerPinchEnd = function (event) {
    console.log("E.Evt WorkAreaHammerPinchEnd input:", event);

    // Reset touch pan state
    GlobalData.optManager.bTouchPanStarted = false;

    console.log("E.Evt WorkAreaHammerPinchEnd output: touch pan state reset");
  }

  /**
   * Adjusts UI when virtual keyboard appears during dimension text editing
   * Lifts content to ensure text being edited remains visible above the keyboard
   * @param element - The element being edited
   * @param keyboardEvent - The keyboard event that triggered the adjustment
   */
  static Evt_DimensionTextKeyboardLifter = function (element, keyboardEvent) {
    console.log("E.Evt DimensionTextKeyboardLifter input:", { element, keyboardEvent });

    // Adjust UI for virtual keyboard
    GlobalData.optManager.VirtualKeyboardLifter(element, keyboardEvent);

    console.log("E.Evt DimensionTextKeyboardLifter output: UI adjusted for virtual keyboard");
  }

  /**
   * Creates a handler for double-tap events on dimension text
   * Returns a function that processes double-tap events to edit dimension text
   * Searches for the specific dimension text element and activates text editing
   * @param shape - The shape object containing the dimension text
   * @param textId - The identifier of the specific dimension text to edit
   * @returns A function that handles double-tap events on the dimension text
   */
  static Evt_DimensionTextDoubleTapFactory = function (shape, textId) {
    console.log("E.Evt DimensionTextDoubleTapFactory input:", { shape, textId });

    return function (event) {
      console.log("E.Evt DimensionTextDoubleTap input:", event);

      let textElement, elementCount;

      if (GlobalData.optManager.currentModalOperation == ConstantData.ModalOperations.NONE) {
        const shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(shape.BlockID);

        if (shapeElement != null) {
          elementCount = shapeElement.ElementCount();

          for (let i = 0; i < elementCount; ++i) {
            textElement = shapeElement.GetElementByIndex(i);

            if (textElement.GetID() == ConstantData.SVGElementClass.DIMENSIONTEXT &&
              textElement.GetUserData() == textId) {

              GlobalData.optManager.bInDimensionEdit = true;
              GlobalData.optManager.UpdateSelectionAttributes(null);

              if (event.gesture) {
                GlobalData.optManager.TERegisterEvents(textElement.svgObj.SDGObj, event.gesture.srcEvent);
              } else {
                GlobalData.optManager.TERegisterEvents(textElement.svgObj.SDGObj, event);
              }

              event.stopPropagation();

              console.log("E.Evt DimensionTextDoubleTap output: dimension text editing activated");
              return false;
            }
          }
        }

        console.log("E.Evt DimensionTextDoubleTap output: dimension text element not found");
        return false;
      }

      console.log("E.Evt DimensionTextDoubleTap output: prevented in modal operation");
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
  static Evt_DimensionTextTapFactory = function (shape, textId, preventPropagation) {
    console.log("E.Evt DimensionTextTapFactory input:", { shape, textId, preventPropagation });

    return function (event) {
      console.log("E.Evt DimensionTextTap input:", event);

      // Only process in default mode (no modal operations active)
      if (GlobalData.optManager.currentModalOperation == ConstantData.ModalOperations.NONE) {
        // Find the shape element
        const shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(shape.BlockID);

        if (shapeElement != null) {
          // Look through all child elements to find the specific dimension text
          for (let i = 0; i < shapeElement.ElementCount(); ++i) {
            const textElement = shapeElement.GetElementByIndex(i);

            // Check if this is the dimension text we're looking for
            if (textElement.GetID() == ConstantData.SVGElementClass.DIMENSIONTEXT &&
              textElement.GetUserData() == textId) {

              // If already editing this dimension text, just stop propagation
              if (GlobalData.optManager.bInDimensionEdit &&
                GlobalData.optManager.svgDoc.GetActiveEdit() == textElement) {
                if (preventPropagation) {
                  event.stopPropagation();
                }
                console.log("E.Evt DimensionTextTap output: already editing this dimension");
                return false;
              }

              // Close any existing edit session
              GlobalData.optManager.CloseEdit(false, true);

              // Enable dimension edit mode
              GlobalData.optManager.bInDimensionEdit = true;
              GlobalData.optManager.UpdateSelectionAttributes(null);

              // Register text editing event handlers
              if (event.gesture) {
                GlobalData.optManager.TERegisterEvents(textElement, event.gesture.srcEvent);
              } else {
                GlobalData.optManager.TERegisterEvents(textElement, event);
              }

              event.stopPropagation();
              console.log("E.Evt DimensionTextTap output: dimension text editing activated");
              return false;
            }
          }
        }

        console.log("E.Evt DimensionTextTap output: dimension text element not found");
        return false;
      }

      console.log("E.Evt DimensionTextTap output: prevented in modal operation");
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
  static Evt_PolyLineDrawExtendHandlerFactory = function (polyLineObject) {
    console.log("E.Evt PolyLineDrawExtendHandlerFactory input:", polyLineObject);

    return function (event) {
      console.log("E.Evt PolyLineDrawExtend input:", event);

      try {
        // Extend the polyline drawing
        polyLineObject.LM_DrawExtend(event);

        console.log("E.Evt PolyLineDrawExtend output: polyline extended");
      } catch (error) {
        // Clean up in case of errors
        GlobalData.optManager.CancelModalOperation();
        polyLineObject.LM_DrawClick_ExceptionCleanup(error);
        GlobalData.optManager.ExceptionCleanup(error);

        console.log("E.Evt PolyLineDrawExtend error:", error);
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
  static Evt_PolyLineDrawDragStart = function (event) {
    console.log("E.Evt PolyLineDrawDragStart input:", event);
    console.log("E.Evt PolyLineDrawDragStart output: drag prevented during polyline drawing");
    return false;
  }
}

export default EvtUtil
