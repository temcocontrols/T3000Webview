

import T3Gv from '../../Data/T3Gv'
import PolyLineContainer from '../../Shape/S.PolyLineContainer'
import Utils1 from "../../Util/Utils1"
import Utils2 from '../../Util/Utils2'
import Line from "../../Shape/S.Line"
import BaseLine from '../../Shape/S.BaseLine'
import NvConstant from '../../Data/Constant/NvConstant'
import HitResult from '../../Model/HitResult'
import Instance from "../../Data/Instance/Instance"
import T3Constant from "../../Data/Constant/T3Constant"
import KeyboardConstant from "../Keyboard/KeyboardConstant"
import PolygonConstant from '../Polygon/PolygonConstant'
import DSConstant from '../DS/DSConstant'
import OptConstant from '../../Data/Constant/OptConstant'
import T3Util from '../../Util/T3Util'
import DataUtil from '../Data/DataUtil'
import LayerUtil from '../Opt/LayerUtil'
import SelectUtil from '../Opt/SelectUtil'
import OptCMUtil from '../Opt/OptCMUtil'
import DrawUtil from '../Opt/DrawUtil'
import UIUtil from '../UI/UIUtil'

class WallOpt {

  addingWalls: boolean;

  // /**
  //  * Gets the right-click menu ID for a line
  //  * @param lineObject - The line object
  //  * @returns Menu ID or null
  //  */
  // GetLineRightClickMenuID(lineObject) {
  //   T3Util.Log('U.WallUtil GetLineRightClickMenuID input:', lineObject);
  //   const result = null;
  //   T3Util.Log('U.WallUtil GetLineRightClickMenuID output:', result);
  //   return result;
  // }

  /**
   * Determines if action buttons are allowed for the specified object
   * @param object - The object to check
   * @returns Boolean indicating if action buttons are allowed or null
   */
  AllowActionButtons(object) {
    T3Util.Log('U.WallUtil AllowActionButtons input:', object);
    const result = null;
    T3Util.Log('U.WallUtil AllowActionButtons output:', result);
    return result;
  }

  /**
   * Saves shape data
   * @param shapeObject - The shape object
   * @param targetData - The target data
   */
  ShapeSaveData(shapeObject, targetData) {
    T3Util.Log('U.WallUtil ShapeSaveData input:', { shapeObject, targetData });
    T3Util.Log('U.WallUtil ShapeSaveData completed');
  }

  /**
   * Creates and adds a new wall to the floor plan
   * @param event - The event that triggered the wall addition (optional)
   * @param additionalData - Additional data for wall creation (optional)
   */
  AddWall(event?, additionalData?) {
    T3Util.Log('U.WallUtil AddWall input:', { event, additionalData });

    let scaleFactor;

    // Get session data from object store
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // Set default wall thickness
    sessionData.def.wallThickness = 8.33325;

    // Create a deep copy of the style
    const wallStyle = Utils1.DeepCopy(sessionData.def.style);
    const drawingScale = T3Gv.opt.GetDrawingScale(T3Gv.docUtil.rulerConfig);

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

    T3Util.Log('= WallOpt AddWall o', wallStyle);

    // Configure wall dimensions
    const dimensions = sessionData.dimensions;
    const wallDimensions = Utils2.SetFlag(dimensions, NvConstant.DimensionFlags.Area, false);

    // Define wall parameters
    const wallParameters = {
      Frame: { x: 0, y: 0, width: 1, height: 1 },
      StartPoint: { x: 0, y: 0 },
      EndPoint: { x: 0, y: 0 },
      StyleRecord: wallStyle,
      bOverrideDefaultStyleOnDraw: true,
      TextGrow: NvConstant.TextGrowBehavior.Horizontal,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: false,
      Dimensions: wallDimensions,
      TextFlags: NvConstant.TextFlags.HorizText | NvConstant.TextFlags.None,
      objecttype: NvConstant.FNObjectTypes.FlWall
    };

    // Get current selection and create a copy to restore after adding the wall
    const selectionList = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);
    const currentSelection = Utils1.DeepCopy(selectionList);

    // Create a new wall line
    const wallLine = new Line(wallParameters);

    // Draw the new wall and update UI state
    DrawUtil.DrawNewObject(wallLine, true);
    OptCMUtil.SetEditMode(NvConstant.EditState.Edit);
    SelectUtil.SelectObjects(currentSelection, false, false);

    T3Util.Log('U.WallUtil AddWall output:', { wallLine });
  }

  // /**
  //  * Starts the wall creation process
  //  * Checks if walls are already being added, and if not, starts the wall addition workflow
  //  */
  // StartAddingWalls() {
  //   T3Util.Log('U.WallUtil StartAddingWalls input: none');

  //   if (!this.IsAddingWalls()) {
  //     T3Gv.opt.CloseEdit();
  //     this.ToggleAddingWalls();
  //     this.AddWall();
  //   }

  //   T3Util.Log('U.WallUtil StartAddingWalls output: completed');
  // }

  /**
   * Stops the wall creation process and performs necessary cleanup
   * @param event - Optional event that triggered the stopping of wall creation
   */
  StopAddingWalls(event?) {
    T3Util.Log('U.WallUtil StopAddingWalls input:', event);

    const optTypes = OptConstant.OptTypes;

    if (this.IsAddingWalls()) {
      // Turn off adding walls mode
      this.ToggleAddingWalls();

      // Get currently selected objects
      let selectedObjects = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);

      if (selectedObjects && selectedObjects.length > 0) {
        // Reset object draw state and selection properties
        DrawUtil.ResetObjectDraw();
        // T3Constant.DocContext.SelectionToolSticky = false;
        T3Gv.wallOpt.PostObjectDrawHook();
      } else {
        // Cancel current modal operation
        OptCMUtil.CancelOperation();
      }

      // Set edit mode to default
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);

      // Re-select any previously selected objects
      let objectsToSelect = [];
      selectedObjects = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);

      if (selectedObjects && selectedObjects.length > 0) {
        objectsToSelect = Utils1.DeepCopy(selectedObjects);
        SelectUtil.SelectObjects(objectsToSelect);
      }
    } else {
      // Handle different modal operations if not adding walls
      switch (T3Gv.opt.crtOpt) {
        case optTypes.AddCorner:
          T3Gv.wallOpt.AddCornerCancel();
          break;
        default:
          OptCMUtil.CancelOperation();
      }
    }

    T3Util.Log('U.WallUtil StopAddingWalls output: completed');
  }

  /**
   * Cancels the current object drawing operation
   * Delegates to StopAddingWalls to handle necessary cleanup
   */
  CancelObjectDraw() {
    T3Util.Log('U.WallUtil CancelObjectDraw input: none');
    this.StopAddingWalls();
    T3Util.Log('U.WallUtil CancelObjectDraw output: completed');
  }

  /**
   * Toggles the wall adding mode state
   * @param forceState - Optional boolean to explicitly set the adding walls state
   */
  ToggleAddingWalls(forceState?) {
    T3Util.Log('U.WallUtil ToggleAddingWalls input:', forceState);
    this.addingWalls = forceState !== undefined ? forceState : !this.addingWalls;
    T3Util.Log('U.WallUtil ToggleAddingWalls output:', this.addingWalls);
  }

  /**
   * Checks if the system is currently in wall adding mode
   * @returns Boolean indicating if walls are being added
   */
  IsAddingWalls() {
    T3Util.Log('U.WallUtil IsAddingWalls input: none');
    const result = this.addingWalls;
    T3Util.Log('U.WallUtil IsAddingWalls output:', result);
    return result;
  }

  /**
   * Creates a new polyline object based on object type
   * @param objectType - The type of object to create
   * @param parameters - Configuration parameters for the new polyline
   * @returns New PolyLineContainer instance or null if type doesn't match
   */
  AddNewPolyLine(objectType, parameters) {
    T3Util.Log('U.WallUtil AddNewPolyLine input:', { objectType, parameters });

    if (objectType !== NvConstant.FNObjectTypes.FlWall) {
      T3Util.Log('U.WallUtil AddNewPolyLine output: null');
      return null;
    }

    const newPolyLine = new PolyLineContainer(parameters);
    T3Util.Log('U.WallUtil AddNewPolyLine output:', newPolyLine);
    return newPolyLine;
  }

  /**
   * Cancels the corner adding operation and resets UI state
   * Resets edit mode, cancels modal operation, and resets object drawing
   */
  AddCornerCancel() {
    T3Util.Log('U.WallUtil AddCornerCancel input: none');

    OptCMUtil.SetEditMode(NvConstant.EditState.Default);
    OptCMUtil.CancelOperation();
    DrawUtil.ResetObjectDraw();
    T3Gv.wallOpt.PostObjectDrawHook();
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    T3Util.Log('U.WallUtil AddCornerCancel output: completed');
  }

  /**
   * Adds a corner to a wall or polyline at the specified hit point
   * @param event - The event that triggered the corner addition
   * @returns Boolean indicating if the default event was prevented
   */
  AddCorner(event) {
    T3Util.Log('U.WallUtil AddCorner input:', event);

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
        hitPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
        targetElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
        targetId = targetElement.GetID();
      } else {
        // For right-click events
        hitPoint = Utils1.DeepCopy(T3Gv.opt.rClickParam.hitPoint);
        targetId = T3Gv.opt.rClickParam.targetId;
        targetElement = T3Gv.opt.svgObjectLayer.GetElementById(targetId);
      }

      // Get the target object and add corner if it's valid
      const targetObject = DataUtil.GetObjectPtr(targetId, true);

      if (targetObject && typeof targetObject.AddCorner === 'function') {
        targetObject.AddCorner(targetElement, hitPoint);
      }

      // Reset application state
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);
      OptCMUtil.CancelOperation();
      DrawUtil.ResetObjectDraw();
      T3Gv.wallOpt.PostObjectDrawHook();
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);

      T3Util.Log('U.WallUtil AddCorner output: false');
      return false;
    } catch (error) {
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  // /**
  //  * Enables outline movement mode for floor plan objects
  //  * Stops adding walls, resets the edit mode, and sets up container move mode
  //  * @param event - The event that triggered the outline movement
  //  */
  // MoveOutline(event) {
  //   T3Util.Log('U.WallUtil MoveOutline input:', event);

  //   // Stop wall creation process
  //   this.StopAddingWalls();

  //   // Reset editor state
  //   OptCMUtil.SetEditMode(NvConstant.EditState.Default);
  //   OptCMUtil.CancelOperation();

  //   // Enable polyline container movement mode
  //   T3Constant.DocContext.PolyLineContainerMoveMode = true;

  //   // Clear any active modal operations
  //   T3Gv.opt.SetModalOperation(OptConstant.OptTypes.None);

  //   T3Util.Log('U.WallUtil MoveOutline output: completed');
  // }

  /**
   * Starts the process of adding a corner to a wall
   * @param event - The event that triggered corner addition
   */
  AddCornerStart(event) {
    T3Util.Log('U.WallUtil AddCornerStart input:', event);

    this.StopAddingWalls();
    T3Gv.opt.CloseEdit();
    OptCMUtil.CancelOperation();
    OptCMUtil.SetEditMode(NvConstant.EditState.Edit);

    const visibleObjectIds = LayerUtil.ActiveVisibleZList();

    for (let i = 0; i < visibleObjectIds.length; i++) {
      const objectId = visibleObjectIds[i];
      const object = DataUtil.GetObjectPtr(objectId, false);

      if (!(object.flags & NvConstant.ObjFlags.Lock)) {
        if (object.objecttype === NvConstant.FNObjectTypes.FlWall) {
          T3Gv.opt.svgObjectLayer.GetElementById(objectId).svgObj.SDGObj.GetEventProxy().on('dragstart', this.AddCorner);
        }
      }
    }

    UIUtil.SetModalOperation(OptConstant.OptTypes.AddCorner);

    T3Util.Log('U.WallUtil AddCornerStart output: completed');
  }

  /**
   * Hook called after an object is drawn
   * @param drawEvent - The draw event type
   */
  PostObjectDrawHook(drawEvent?) {
    T3Util.Log('U.WallUtil PostObjectDrawHook input:', drawEvent);

    if (this.addingWalls) {
      if (drawEvent === BaseLine.prototype.LMDrawRelease) {
        this.AddWall();
      } else {
        this.StopAddingWalls();
      }
    }

    T3Util.Log('U.WallUtil PostObjectDrawHook output: completed');
  }

  /**
   * Notification handler for edit mode changes
   * @param editMode - The new edit mode
   * @returns Boolean indicating if default behavior should be prevented
   */
  NotifySetEditMode(editMode) {
    T3Util.Log('U.WallUtil NotifySetEditMode input:', editMode);

    if (
      editMode === NvConstant.EditState.Edit ||
      editMode === NvConstant.EditState.Default ||
      editMode === NvConstant.EditState.LinkConnect ||
      editMode === NvConstant.EditState.LinkJoin
    ) {
      T3Util.Log('U.WallUtil NotifySetEditMode output:', false);
      return false;
    }

    if (this.addingWalls) {
      this.StopAddingWalls();
    }

    T3Util.Log('U.WallUtil NotifySetEditMode output: completed');
  }

  /**
   * Creates and adds a new measurement line to the document
   */
  AddMeasureLine() {
    T3Util.Log('U.WallUtil AddMeasureLine input: none');

    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;
    const isTextVertical = (sessionData.def.textflags & NvConstant.TextFlags.HorizText) === 0;
    let dimensions = NvConstant.DimensionFlags.Always | sessionData.dimensions;
    dimensions = Utils2.SetFlag(dimensions, NvConstant.DimensionFlags.Standoff, false);

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
      TextGrow: NvConstant.TextGrowBehavior.Horizontal,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: isTextVertical,
      Dimensions: dimensions,
      TextFlags: NvConstant.TextFlags.HorizText,
      ShortRef: OptConstant.LineTypes.LsMeasuringTape,
      targflags: 0,
      hookflags: 0,
      bOverrideDefaultStyleOnDraw: true
    };

    const measureLine = new Line(measureLineParams);
    DrawUtil.DrawNewObject(measureLine, false);

    T3Util.Log('U.WallUtil AddMeasureLine output: completed');
  }

  /**
   * Creates and adds a new measurement area to the document
   * Configures a rectangular shape with appropriate styling for area measurement
   */
  AddMeasureArea() {
    T3Util.Log('U.WallUtil AddMeasureArea input: none');

    // Get session data
    const sessionData = T3Gv.stdObj.GetObject(T3Gv.opt.sdDataBlockId).Data;

    // Determine text orientation
    const isTextVertical = (sessionData.def.textflags & NvConstant.TextFlags.HorizText) === 0;

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
      TextGrow: NvConstant.TextGrowBehavior.Horizontal,
      TextAlign: T3Constant.DocContext.CurrentTextAlignment,
      TextDirection: isTextVertical,
      Dimensions: NvConstant.DimensionFlags.Always | NvConstant.DimensionFlags.Area,
      TextFlags: NvConstant.TextFlags.HorizText,
      StyleRecord: areaStyle,
      bOverrideDefaultStyleOnDraw: true,
      dataclass: PolygonConstant.ShapeTypes.MEASURE_AREA
    };

    // Set style properties for area measurement visualization
    measureAreaParams.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
    measureAreaParams.StyleRecord.Fill.Paint.Color = '#FF0000';
    measureAreaParams.StyleRecord.Fill.Paint.EndColor = '#FF0000';
    measureAreaParams.StyleRecord.Fill.FillEffect = 0;
    measureAreaParams.StyleRecord.OutsideEffect.OutsideType = 0;
    measureAreaParams.StyleRecord.Border.Thickness = 1;
    measureAreaParams.StyleRecord.Border.LinePattern = DSConstant.LinePatternData[DSConstant.WinLinePatterns.SEP_Dotted];
    measureAreaParams.StyleRecord.Fill.Paint.Opacity = 0.4;
    measureAreaParams.StyleRecord.Fill.Paint.EndOpacity = 0.4;

    // Create a new rectangle for area measurement
    const measureAreaRect = new Instance.Shape.Rect(measureAreaParams);

    // Add the area measurement to the document
    DrawUtil.DrawNewObject(measureAreaRect, false);

    T3Util.Log('U.WallUtil AddMeasureArea output: completed');
  }

  /**
   * Determines if layers should always be shown in the floor plan
   * @returns Boolean indicating layers should always be visible
   */
  AlwaysShowLayers() {
    T3Util.Log('U.WallUtil AlwaysShowLayers input: none');
    const result = true;
    T3Util.Log('U.WallUtil AlwaysShowLayers output:', result);
    return result;
  }

  // /**
  //  * Adds a wall opening to the floor plan when clicked
  //  * @param event - The click event that triggered the wall opening addition
  //  */
  // AddWallOpening(event) {
  //   T3Util.Log('U.WallUtil AddWallOpening input:', event);

  //   if (event.type === 'click') {
  //     // Stop any active wall creation process
  //     this.StopAddingWalls();
  //     T3Gv.opt.CloseEdit();

  //     // Prevent default event behavior
  //     if (event.preventDefault) {
  //       event.preventDefault();
  //     }

  //     // // Load the wall opening symbol
  //     // SDUI.Commands.MainController.Shapes.SD_PreLoad_Symbol(
  //     //   OptConstant.Common.WallOpenId,
  //     //   true,
  //     //   SDUI.Commands.MainController.Shapes.ForceStampSymbol,
  //     //   true
  //     // );
  //   }

  //   T3Util.Log('U.WallUtil AddWallOpening output: completed');
  // }

  // /**
  //  * Splits a wall at the point where the user clicked
  //  * @param event - The event that triggered the wall splitting
  //  * @returns Boolean indicating if the default event was prevented
  //  */
  // SplitWall(event) {
  //   T3Util.Log('U.WallUtil SplitWall input:', event);

  //   try {
  //     const hitInfo = {};

  //     // Handle event propagation
  //     event.stopPropagation();
  //     event.preventDefault();

  //     // Get coordinates and target element
  //     const hitPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
  //       event.gesture.center.clientX,
  //       event.gesture.center.clientY
  //     );
  //     const targetElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
  //     const targetObject = DataUtil.GetObjectPtr(targetElement.GetID(), false);

  //     // Perform hit testing
  //     if (targetObject) {
  //       targetObject.Hit(hitPoint, false, false, hitInfo);
  //     }

  //     // Split the wall if it's a polyline
  //     if (targetObject instanceof Instance.Shape.PolyLine) {
  //       // If the polyline is closed, prepare it for splitting
  //       if (targetObject.polylist.closed) {
  //         // Collab.BeginSecondaryEdit();
  //         DataUtil.GetObjectPtr(targetObject.BlockID, true);
  //         targetObject.MaintainDimensionThroughPolygonOpennessChange(false);
  //       }

  //       // Split the polyline at the hit segment
  //       T3Gv.opt.PolyLSplit(targetObject.BlockID, hitInfo.segment);
  //       OptCMUtil.SetEditMode(NvConstant.EditState.Default);
  //     }

  //     // Clean up and reset state
  //     OptCMUtil.CancelOperation();
  //     T3Gv.opt.PostObjectDraw();

  //     T3Util.Log('U.WallUtil SplitWall output: false');
  //     return false;
  //   } catch (error) {
  //     T3Gv.opt.ExceptionCleanup(error);
  //     throw error;
  //   }
  // }

  // /**
  //  * Initiates the wall splitting process
  //  * Sets up event handlers on wall objects to allow them to be split
  //  * @param event - The event that triggered the wall splitting start
  //  */
  // SplitWallStart(event) {
  //   T3Util.Log('U.WallUtil SplitWallStart input:', event);

  //   this.StopAddingWalls();
  //   T3Gv.opt.CloseEdit();
  //   OptCMUtil.CancelOperation();
  //   OptCMUtil.SetEditMode(
  //     NvConstant.EditState.Edit,
  //     CursorConstant.CursorType.ALIAS
  //   );

  //   const visibleObjectIds = LayerUtil.ActiveVisibleZList();

  //   for (let i = 0; i < visibleObjectIds.length; i++) {
  //     const objectId = visibleObjectIds[i];
  //     const object = DataUtil.GetObjectPtr(objectId, false);

  //     if (!(object.flags & NvConstant.ObjFlags.Lock)) {
  //       if (object.objecttype === NvConstant.FNObjectTypes.FlWall) {
  //         T3Gv.opt.svgObjectLayer.GetElementById(objectId).svgObj.SDGObj.GetEventProxy().on('dragstart', this.SplitWall);
  //       }
  //     }
  //   }

  //   T3Gv.opt.SetModalOperation(OptConstant.OptTypes.SplitWall);

  //   T3Util.Log('U.WallUtil SplitWallStart output: completed');
  // }

  /**
   * Ensures a cubicle is positioned behind its outline
   * Checks for intersections between polyline containers and adjusts z-order
   * @param objectId - The ID of the object to check
   */
  EnsureCubicleBehindOutline(objectId) {
    T3Util.Log('U.WallUtil EnsureCubicleBehindOutline input:', objectId);

    const visibleObjectIds = LayerUtil.ActiveVisibleZList();
    let compareObject = null;
    const targetObject = DataUtil.GetObjectPtr(objectId, false);

    // Helper function to check if one object is contained within another
    function isObjectContained(containerObject, contentObject) {
      const contentPoints = contentObject.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
      let hasIntersection = false;

      // Check if any points of the content object are inside the container
      for (let i = 0; i < contentPoints.length; i++) {
        const hitResult = new HitResult(-1, 0, null);
        hitResult.hitcode = containerObject.Hit(contentPoints[i], false, true, hitResult);

        if (hitResult && hitResult.hitcode === NvConstant.HitCodes.Border) {
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
          compareObject = DataUtil.GetObjectPtr(currentObjectId, false);

          if (compareObject instanceof PolyLineContainer && isObjectContained(compareObject, targetObject)) {
            const targetIndex = visibleObjectIds.indexOf(targetObject.BlockID);

            if (targetIndex < 0) {
              return;
            }

            if (targetIndex < i) {
              return;
            }

            T3Gv.opt.PutBehindObject(compareObject.BlockID, targetObject.BlockID);
            return;
          }
        }
      }
    }

    T3Util.Log('U.WallUtil EnsureCubicleBehindOutline output: completed');
  }

  /**
   * Determines if objects should be automatically inserted
   * @returns Boolean indicating if auto-insert is allowed
   */
  AllowAutoInsert() {
    T3Util.Log('U.WallUtil AllowAutoInsert input: none');
    const result = false;
    T3Util.Log('U.WallUtil AllowAutoInsert output:', result);
    return result;
  }

  /**
   * Gets the automation context for floor plan operations
   * @returns The floor plan context identifier
   */
  GetAutomationContext() {
    T3Util.Log('U.WallUtil GetAutomationContext input: none');
    const result = KeyboardConstant.Contexts.WallOpt;
    T3Util.Log('U.WallUtil GetAutomationContext output:', result);
    return result;
  }

}

export default WallOpt


