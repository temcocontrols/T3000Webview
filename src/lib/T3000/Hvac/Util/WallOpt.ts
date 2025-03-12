

import T3Gv from '../../Data/T3Gv'
import PolyLineContainer from '../../Shape/S.PolyLineContainer'
import Utils1 from "../../Helper/Utils1"
import Utils2 from '../../Helper/Utils2'
import Resources from '../../Data/Resources'
import Line from "../../Shape/S.Line"
import BaseLine from '../../Shape/S.BaseLine'
import ConstantData from '../../Data/ConstantData'
import HitResult from '../../Model/HitResult'
import ConstantData2 from '../../Data/ConstantData2'
import Instance from "../../Data/Instance/Instance"
import T3Constant from "../../Data/T3Constant"
import KeyboardConstant from "./KeyboardConstant"
import PolygonConstant from './PolygonConstant'

class WallOpt {

  /**
   * Gets the right-click menu ID for a line
   * @param lineObject - The line object
   * @returns Menu ID or null
   */
  GetLineRightClickMenuID(lineObject) {
    console.log('U.WallUtil GetLineRightClickMenuID input:', lineObject);
    const result = null;
    console.log('U.WallUtil GetLineRightClickMenuID output:', result);
    return result;
  }

  /**
   * Determines if action buttons are allowed for the specified object
   * @param object - The object to check
   * @returns Boolean indicating if action buttons are allowed or null
   */
  AllowActionButtons(object) {
    console.log('U.WallUtil AllowActionButtons input:', object);
    const result = null;
    console.log('U.WallUtil AllowActionButtons output:', result);
    return result;
  }

  /**
   * Saves shape data
   * @param shapeObject - The shape object
   * @param targetData - The target data
   */
  ShapeSaveData(shapeObject, targetData) {
    console.log('U.WallUtil ShapeSaveData input:', { shapeObject, targetData });
    console.log('U.WallUtil ShapeSaveData completed');
  }

  /**
   * Creates and adds a new wall to the floor plan
   * @param event - The event that triggered the wall addition (optional)
   * @param additionalData - Additional data for wall creation (optional)
   */
  AddWall(event, additionalData) {
    console.log('U.WallUtil AddWall input:', { event, additionalData });

    let scaleFactor;

    // Get session data from object store
    const sessionData = T3Gv.objectStore.GetObject(T3Gv.optManager.theSEDSessionBlockID).Data;

    // Set default wall thickness
    sessionData.def.wallThickness = 8.33325;

    // Create a deep copy of the style
    const wallStyle = Utils1.DeepCopy(sessionData.def.style);
    const drawingScale = T3Gv.optManager.GetDrawingScale(T3Gv.docUtil.rulerConfig);

    // Calculate wall thickness based on measurement system (inches or metric)
    if (T3Gv.docUtil.rulerConfig.useInches) {
      if (sessionData.def.wallThickness > 0) {
        wallStyle.Line.Thickness = sessionData.def.wallThickness;
      } else {
        scaleFactor = 48;
        wallStyle.Line.Thickness = 8.33333 * scaleFactor / drawingScale;
      }
    } else {
      if (sessionData.def.wallThickness > 0) {
        wallStyle.Line.Thickness = sessionData.def.wallThickness;
      } else {
        scaleFactor = 50;
        wallStyle.Line.Thickness = 11.811023622047243 * scaleFactor / drawingScale;
      }
    }

    // Set additional line properties
    wallStyle.Line.BThick = wallStyle.Line.Thickness / 2;
    wallStyle.Line.LinePattern = 0;

    console.log('= WallOpt AddWall o', wallStyle);

    // Configure wall dimensions
    const dimensions = sessionData.dimensions;
    const wallDimensions = Utils2.SetFlag(dimensions, ConstantData.DimensionFlags.SED_DF_Area, false);

    // Define wall parameters
    const wallParameters = {
      Frame: { x: 0, y: 0, width: 1, height: 1 },
      StartPoint: { x: 0, y: 0 },
      EndPoint: { x: 0, y: 0 },
      StyleRecord: wallStyle,
      bOverrideDefaultStyleOnDraw: true,
      TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: false,
      Dimensions: wallDimensions,
      TextFlags: ConstantData.TextFlags.SED_TF_HorizText | ConstantData.TextFlags.SED_TF_None,
      objecttype: ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL
    };

    // Get current selection and create a copy to restore after adding the wall
    const selectionList = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);
    const currentSelection = Utils1.DeepCopy(selectionList);

    // Create a new wall line
    const wallLine = new Line(wallParameters);

    // Draw the new wall and update UI state
    T3Gv.optManager.DrawNewObject(wallLine, true);
    T3Gv.optManager.SetEditMode(ConstantData.EditState.EDIT);
    T3Gv.optManager.SelectObjects(currentSelection, false, false);

    console.log('U.WallUtil AddWall output:', { wallLine });
  }

  /**
   * Starts the wall creation process
   * Checks if walls are already being added, and if not, starts the wall addition workflow
   */
  StartAddingWalls() {
    console.log('U.WallUtil StartAddingWalls input: none');

    if (!this.IsAddingWalls()) {
      T3Gv.optManager.CloseEdit();
      this.ToggleAddingWalls();
      this.AddWall();
    }

    console.log('U.WallUtil StartAddingWalls output: completed');
  }

  /**
   * Stops the wall creation process and performs necessary cleanup
   * @param event - Optional event that triggered the stopping of wall creation
   */
  StopAddingWalls(event) {
    console.log('U.WallUtil StopAddingWalls input:', event);

    const modalOperations = ConstantData2.ModalOperations;

    if (this.IsAddingWalls()) {
      // Turn off adding walls mode
      this.ToggleAddingWalls();

      // Get currently selected objects
      let selectedObjects = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);

      if (selectedObjects && selectedObjects.length > 0) {
        // Reset object draw state and selection properties
        T3Gv.optManager.ResetObjectDraw();
        T3Constant.DocContext.SelectionToolSticky = false;
        T3Gv.gBusinessManager.PostObjectDrawHook();
      } else {
        // Cancel current modal operation
        T3Gv.optManager.CancelModalOperation();
      }

      // Set edit mode to default
      T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

      // Re-select any previously selected objects
      let objectsToSelect = [];
      selectedObjects = T3Gv.optManager.GetObjectPtr(T3Gv.optManager.theSelectedListBlockID, false);

      if (selectedObjects && selectedObjects.length > 0) {
        objectsToSelect = Utils1.DeepCopy(selectedObjects);
        T3Gv.optManager.SelectObjects(objectsToSelect);
      }
    } else {
      // Handle different modal operations if not adding walls
      switch (T3Gv.optManager.currentModalOperation) {
        case modalOperations.ADDCORNER:
        case modalOperations.SPLITWALL:
          T3Gv.gFloorplanManager.AddCornerCancel();
          break;
        default:
          T3Gv.optManager.CancelModalOperation();
      }
    }

    console.log('U.WallUtil StopAddingWalls output: completed');
  }

  /**
   * Cancels the current object drawing operation
   * Delegates to StopAddingWalls to handle necessary cleanup
   */
  CancelObjectDraw() {
    console.log('U.WallUtil CancelObjectDraw input: none');
    this.StopAddingWalls();
    console.log('U.WallUtil CancelObjectDraw output: completed');
  }

  /**
   * Toggles the wall adding mode state
   * @param forceState - Optional boolean to explicitly set the adding walls state
   */
  ToggleAddingWalls(forceState) {
    console.log('U.WallUtil ToggleAddingWalls input:', forceState);
    this.addingWalls = forceState !== undefined ? forceState : !this.addingWalls;
    console.log('U.WallUtil ToggleAddingWalls output:', this.addingWalls);
  }

  /**
   * Checks if the system is currently in wall adding mode
   * @returns Boolean indicating if walls are being added
   */
  IsAddingWalls() {
    console.log('U.WallUtil IsAddingWalls input: none');
    const result = this.addingWalls;
    console.log('U.WallUtil IsAddingWalls output:', result);
    return result;
  }

  /**
   * Creates a new polyline object based on object type
   * @param objectType - The type of object to create
   * @param parameters - Configuration parameters for the new polyline
   * @returns New PolyLineContainer instance or null if type doesn't match
   */
  AddNewPolyLine(objectType, parameters) {
    console.log('U.WallUtil AddNewPolyLine input:', { objectType, parameters });

    if (objectType !== ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      console.log('U.WallUtil AddNewPolyLine output: null');
      return null;
    }

    const newPolyLine = new PolyLineContainer(parameters);
    console.log('U.WallUtil AddNewPolyLine output:', newPolyLine);
    return newPolyLine;
  }

  /**
   * Cancels the corner adding operation and resets UI state
   * Resets edit mode, cancels modal operation, and resets object drawing
   */
  AddCornerCancel() {
    console.log('U.WallUtil AddCornerCancel input: none');

    T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
    T3Gv.optManager.CancelModalOperation();
    T3Gv.optManager.ResetObjectDraw();
    T3Gv.gFloorplanManager.PostObjectDrawHook();
    T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    console.log('U.WallUtil AddCornerCancel output: completed');
  }

  /**
   * Adds a corner to a wall or polyline at the specified hit point
   * @param event - The event that triggered the corner addition
   * @returns Boolean indicating if the default event was prevented
   */
  AddCorner(event) {
    console.log('U.WallUtil AddCorner input:', event);

    try {
      let hitPoint;
      let targetId;
      let targetElement;

      // Handle event propagation
      event.stopPropagation();
      event.preventDefault();

      // Extract coordinates and target element based on event type
      if (event.gesture) {
        // For gesture events like touch/drag
        hitPoint = T3Gv.optManager.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
        targetElement = T3Gv.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
        targetId = targetElement.GetID();
      } else {
        // For right-click events
        hitPoint = Utils1.DeepCopy(T3Gv.optManager.RightClickParams.HitPt);
        targetId = T3Gv.optManager.RightClickParams.TargetID;
        targetElement = T3Gv.optManager.svgObjectLayer.GetElementByID(targetId);
      }

      // Get the target object and add corner if it's valid
      const targetObject = T3Gv.optManager.GetObjectPtr(targetId, true);

      if (targetObject && typeof targetObject.AddCorner === 'function') {
        targetObject.AddCorner(targetElement, hitPoint);
      }

      // Reset application state
      T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
      T3Gv.optManager.CancelModalOperation();
      T3Gv.optManager.ResetObjectDraw();
      T3Gv.gBusinessManager.PostObjectDrawHook();
      T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

      console.log('U.WallUtil AddCorner output: false');
      return false;
    } catch (error) {
      T3Gv.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Enables outline movement mode for floor plan objects
   * Stops adding walls, resets the edit mode, and sets up container move mode
   * @param event - The event that triggered the outline movement
   */
  MoveOutline(event) {
    console.log('U.WallUtil MoveOutline input:', event);

    // Stop wall creation process
    this.StopAddingWalls();

    // Reset editor state
    T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
    T3Gv.optManager.CancelModalOperation();

    // Enable polyline container movement mode
    T3Constant.DocContext.PolyLineContainerMoveMode = true;

    // Clear any active modal operations
    T3Gv.optManager.SetModalOperation(ConstantData2.ModalOperations.NONE);

    console.log('U.WallUtil MoveOutline output: completed');
  }

  /**
   * Starts the process of adding a corner to a wall
   * @param event - The event that triggered corner addition
   */
  AddCornerStart(event) {
    console.log('U.WallUtil AddCornerStart input:', event);

    this.StopAddingWalls();
    T3Gv.optManager.CloseEdit();
    T3Gv.optManager.CancelModalOperation();
    T3Gv.optManager.SetEditMode(ConstantData.EditState.EDIT);

    const visibleObjectIds = T3Gv.optManager.ActiveVisibleZList();

    for (let i = 0; i < visibleObjectIds.length; i++) {
      const objectId = visibleObjectIds[i];
      const object = T3Gv.optManager.GetObjectPtr(objectId, false);

      if (!(object.flags & ConstantData.ObjFlags.SEDO_Lock)) {
        if (object.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
          T3Gv.optManager.svgObjectLayer.GetElementByID(objectId).svgObj.SDGObj.GetEventProxy().on('dragstart', this.AddCorner);
        }
      }
    }

    T3Gv.optManager.SetModalOperation(ConstantData2.ModalOperations.ADDCORNER);

    console.log('U.WallUtil AddCornerStart output: completed');
  }

  /**
   * Hook called after an object is drawn
   * @param drawEvent - The draw event type
   */
  PostObjectDrawHook(drawEvent) {
    console.log('U.WallUtil PostObjectDrawHook input:', drawEvent);

    if (this.addingWalls) {
      if (drawEvent === BaseLine.prototype.LM_DrawRelease) {
        this.AddWall();
      } else {
        this.StopAddingWalls();
      }
    }

    console.log('U.WallUtil PostObjectDrawHook output: completed');
  }

  /**
   * Notification handler for edit mode changes
   * @param editMode - The new edit mode
   * @returns Boolean indicating if default behavior should be prevented
   */
  NotifySetEditMode(editMode) {
    console.log('U.WallUtil NotifySetEditMode input:', editMode);

    if (
      editMode === ConstantData.EditState.EDIT ||
      editMode === ConstantData.EditState.DEFAULT ||
      editMode === ConstantData.EditState.LINKCONNECT ||
      editMode === ConstantData.EditState.LINKJOIN
    ) {
      console.log('U.WallUtil NotifySetEditMode output:', false);
      return false;
    }

    if (this.addingWalls) {
      this.StopAddingWalls();
    }

    console.log('U.WallUtil NotifySetEditMode output: completed');
  }

  /**
   * Creates and adds a new measurement line to the document
   */
  AddMeasureLine() {
    console.log('U.WallUtil AddMeasureLine input: none');

    const sessionData = T3Gv.objectStore.GetObject(T3Gv.optManager.theSEDSessionBlockID).Data;
    const isTextVertical = (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText) === 0;
    let dimensions = ConstantData.DimensionFlags.SED_DF_Always | sessionData.dimensions;
    dimensions = Utils2.SetFlag(dimensions, ConstantData.DimensionFlags.SED_DF_Standoff, false);

    this.StopAddingWalls();

    const lineStyle = Utils1.DeepCopy(sessionData.def.style);
    lineStyle.Line.Thickness = 1;
    lineStyle.Line.Paint.Color = '#000000';
    lineStyle.Line.Paint.EndColor = '#000000';

    const measureLineParams = {
      Frame: { x: 0, y: 0, width: 1, height: 1 },
      StartPoint: { x: 0, y: 0 },
      EndPoint: { x: 0, y: 0 },
      StartArrowID: 32,
      EndArrowID: 32,
      StartArrowDisp: false,
      EndArrowDisp: false,
      ArrowSizeIndex: 1,
      StyleRecord: lineStyle,
      TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: isTextVertical,
      Dimensions: dimensions,
      TextFlags: ConstantData.TextFlags.SED_TF_HorizText,
      ShortRef: ConstantData2.LineTypes.SED_LS_MeasuringTape,
      targflags: 0,
      hookflags: 0,
      bOverrideDefaultStyleOnDraw: true
    };

    const measureLine = new Line(measureLineParams);
    T3Gv.optManager.DrawNewObject(measureLine, false);

    console.log('U.WallUtil AddMeasureLine output: completed');
  }

  /**
   * Creates and adds a new measurement area to the document
   * Configures a rectangular shape with appropriate styling for area measurement
   */
  AddMeasureArea() {
    console.log('U.WallUtil AddMeasureArea input: none');

    // Get session data
    const sessionData = T3Gv.objectStore.GetObject(T3Gv.optManager.theSEDSessionBlockID).Data;

    // Determine text orientation
    const isTextVertical = (sessionData.def.textflags & ConstantData.TextFlags.SED_TF_HorizText) === 0;

    // Create a copy of the style
    const areaStyle = Utils1.DeepCopy(sessionData.def.style);

    // Stop any ongoing wall creation
    this.StopAddingWalls();

    // Configure measurement area parameters
    const measureAreaParams = {
      Frame: {
        x: 0,
        y: 0,
        width: 1,
        height: 1
      },
      StartPoint: {
        x: 0,
        y: 0
      },
      EndPoint: {
        x: 0,
        y: 0
      },
      StartArrowID: sessionData.d_sarrow,
      StartArrowDisp: sessionData.d_sarrowdisp,
      EndArrowID: sessionData.d_earrow,
      EndArrowDisp: sessionData.d_earrowdisp,
      ArrowSizeIndex: sessionData.d_arrowsize,
      targflags: 0,
      TextGrow: ConstantData.TextGrowBehavior.HORIZONTAL,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: isTextVertical,
      Dimensions: ConstantData.DimensionFlags.SED_DF_Always | ConstantData.DimensionFlags.SED_DF_Area,
      TextFlags: ConstantData.TextFlags.SED_TF_HorizText,
      StyleRecord: areaStyle,
      bOverrideDefaultStyleOnDraw: true,
      dataclass: PolygonConstant.ShapeTypes.MEASURE_AREA
    };

    // Set style properties for area measurement visualization
    measureAreaParams.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
    measureAreaParams.StyleRecord.Fill.Paint.Color = '#FF0000';
    measureAreaParams.StyleRecord.Fill.Paint.EndColor = '#FF0000';
    measureAreaParams.StyleRecord.Fill.FillEffect = 0;
    measureAreaParams.StyleRecord.OutsideEffect.OutsideType = 0;
    measureAreaParams.StyleRecord.Border.Thickness = 1;
    measureAreaParams.StyleRecord.Border.LinePattern = Resources.LinePatternData[Resources.Windows_LinePatterns.SEP_Dotted];
    measureAreaParams.StyleRecord.Fill.Paint.Opacity = 0.4;
    measureAreaParams.StyleRecord.Fill.Paint.EndOpacity = 0.4;

    // Create a new rectangle for area measurement
    const measureAreaRect = new Instance.Shape.Rect(measureAreaParams);

    // Add the area measurement to the document
    T3Gv.optManager.DrawNewObject(measureAreaRect, false);

    console.log('U.WallUtil AddMeasureArea output: completed');
  }

  /**
   * Determines if layers should always be shown in the floor plan
   * @returns Boolean indicating layers should always be visible
   */
  AlwaysShowLayers() {
    console.log('U.WallUtil AlwaysShowLayers input: none');
    const result = true;
    console.log('U.WallUtil AlwaysShowLayers output:', result);
    return result;
  }

  /**
   * Adds a wall opening to the floor plan when clicked
   * @param event - The click event that triggered the wall opening addition
   */
  AddWallOpening(event) {
    console.log('U.WallUtil AddWallOpening input:', event);

    if (event.type === 'click') {
      // Stop any active wall creation process
      this.StopAddingWalls();
      T3Gv.optManager.CloseEdit();

      // Prevent default event behavior
      if (event.preventDefault) {
        event.preventDefault();
      }

      // Load the wall opening symbol
      SDUI.Commands.MainController.Shapes.SD_PreLoad_Symbol(
        ConstantData.Defines.Floorplan_WallOpeningID,
        true,
        SDUI.Commands.MainController.Shapes.ForceStampSymbol,
        true
      );
    }

    console.log('U.WallUtil AddWallOpening output: completed');
  }

  /**
   * Splits a wall at the point where the user clicked
   * @param event - The event that triggered the wall splitting
   * @returns Boolean indicating if the default event was prevented
   */
  SplitWall(event) {
    console.log('U.WallUtil SplitWall input:', event);

    try {
      const hitInfo = {};

      // Handle event propagation
      event.stopPropagation();
      event.preventDefault();

      // Get coordinates and target element
      const hitPoint = T3Gv.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      const targetElement = T3Gv.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
      const targetObject = T3Gv.optManager.GetObjectPtr(targetElement.GetID(), false);

      // Perform hit testing
      if (targetObject) {
        targetObject.Hit(hitPoint, false, false, hitInfo);
      }

      // Split the wall if it's a polyline
      if (targetObject instanceof PolyLine) {
        // If the polyline is closed, prepare it for splitting
        if (targetObject.polylist.closed) {
          Collab.BeginSecondaryEdit();
          T3Gv.optManager.GetObjectPtr(targetObject.BlockID, true);
          targetObject.MaintainDimensionThroughPolygonOpennessChange(false);
        }

        // Split the polyline at the hit segment
        T3Gv.optManager.PolyLSplit(targetObject.BlockID, hitInfo.segment);
        T3Gv.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
      }

      // Clean up and reset state
      T3Gv.optManager.CancelModalOperation();
      T3Gv.optManager.PostObjectDraw();

      console.log('U.WallUtil SplitWall output: false');
      return false;
    } catch (error) {
      T3Gv.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Initiates the wall splitting process
   * Sets up event handlers on wall objects to allow them to be split
   * @param event - The event that triggered the wall splitting start
   */
  SplitWallStart(event) {
    console.log('U.WallUtil SplitWallStart input:', event);

    this.StopAddingWalls();
    T3Gv.optManager.CloseEdit();
    T3Gv.optManager.CancelModalOperation();
    T3Gv.optManager.SetEditMode(
      ConstantData.EditState.EDIT,
      ConstantData.CursorType.ALIAS
    );

    const visibleObjectIds = T3Gv.optManager.ActiveVisibleZList();

    for (let i = 0; i < visibleObjectIds.length; i++) {
      const objectId = visibleObjectIds[i];
      const object = T3Gv.optManager.GetObjectPtr(objectId, false);

      if (!(object.flags & ConstantData.ObjFlags.SEDO_Lock)) {
        if (object.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
          T3Gv.optManager.svgObjectLayer.GetElementByID(objectId).svgObj.SDGObj.GetEventProxy().on('dragstart', this.SplitWall);
        }
      }
    }

    T3Gv.optManager.SetModalOperation(ConstantData2.ModalOperations.SPLITWALL);

    console.log('U.WallUtil SplitWallStart output: completed');
  }

  /**
   * Ensures a cubicle is positioned behind its outline
   * Checks for intersections between polyline containers and adjusts z-order
   * @param objectId - The ID of the object to check
   */
  EnsureCubicleBehindOutline(objectId) {
    console.log('U.WallUtil EnsureCubicleBehindOutline input:', objectId);

    const visibleObjectIds = T3Gv.optManager.ActiveVisibleZList();
    let compareObject = null;
    const targetObject = T3Gv.optManager.GetObjectPtr(objectId, false);

    // Helper function to check if one object is contained within another
    function isObjectContained(containerObject, contentObject) {
      const contentPoints = contentObject.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
      let hasIntersection = false;

      // Check if any points of the content object are inside the container
      for (let i = 0; i < contentPoints.length; i++) {
        const hitResult = new HitResult(-1, 0, null);
        hitResult.hitcode = containerObject.Hit(contentPoints[i], false, true, hitResult);

        if (hitResult && hitResult.hitcode === ConstantData.HitCodes.SED_Border) {
          hasIntersection = true;
          break;
        }
      }

      if (!hasIntersection) {
        return false;
      }

      // Check if the frames overlap completely
      const intersection = Utils2.IntersectRect(containerObject.Frame, contentObject.Frame);
      if (!intersection) {
        return false;
      }

      // Check if the intersection is approximately equal to the content object's frame
      const contentFrame = contentObject.Frame;
      return !(
        Math.abs(intersection.x - contentFrame.x) > 0.0001 ||
        Math.abs(intersection.y - contentFrame.y) > 0.0001 ||
        Math.abs(intersection.width - contentFrame.width) > 0.0001 ||
        Math.abs(intersection.height - contentFrame.height) > 0.0001
      );
    }

    // If the target object is a polyline container, check against other visible objects
    if (targetObject instanceof PolyLineContainer) {
      for (let i = 0; i < visibleObjectIds.length; i++) {
        const currentObjectId = visibleObjectIds[i];

        if (objectId !== currentObjectId) {
          compareObject = T3Gv.optManager.GetObjectPtr(currentObjectId, false);

          if (compareObject instanceof PolyLineContainer && isObjectContained(compareObject, targetObject)) {
            const targetIndex = visibleObjectIds.indexOf(targetObject.BlockID);

            if (targetIndex < 0) {
              return;
            }

            if (targetIndex < i) {
              return;
            }

            T3Gv.optManager.PutBehindObject(compareObject.BlockID, targetObject.BlockID);
            return;
          }
        }
      }
    }

    console.log('U.WallUtil EnsureCubicleBehindOutline output: completed');
  }

  /**
   * Determines if objects should be automatically inserted
   * @returns Boolean indicating if auto-insert is allowed
   */
  AllowAutoInsert() {
    console.log('U.WallUtil AllowAutoInsert input: none');
    const result = false;
    console.log('U.WallUtil AllowAutoInsert output:', result);
    return result;
  }

  /**
   * Gets the automation context for floor plan operations
   * @returns The floor plan context identifier
   */
  GetAutomationContext() {
    console.log('U.WallUtil GetAutomationContext input: none');
    const result = KeyboardConstant.Contexts.WallOpt;
    console.log('U.WallUtil GetAutomationContext output:', result);
    return result;
  }

}

export default WallOpt


