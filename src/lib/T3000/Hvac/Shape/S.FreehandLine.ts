

import BaseLine from './S.BaseLine'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import ShapeUtil from '../Opt/Shape/ShapeUtil';
import DSConstant from '../Opt/DS/DSConstant';
import Point from '../Model/Point';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import LMEvtUtil from '../Opt/Opt/LMEvtUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';

/**
 * Represents a freehand line shape that consists of multiple connected points.
 * This class extends BaseLine to provide functionality for drawing irregular lines with multiple points.
 *
 * The freehand line is defined by a starting point and a collection of points (pointlist) that trace the path of the line.
 * The shape can be rendered in SVG and supports various styling options like color, thickness and opacity.
 * Unlike regular lines, freehand lines cannot be rotated or have hooks attached to them.
 *
 * @extends BaseLine
 *
 * @example
 * ```typescript
 * // Create a new freehand line
 * const freehandLine = new FreehandLine({
 *   StartPoint: { x: 50, y: 50 },
 *   pointlist: [
 *     { x: 0, y: 0 },    // First point (relative to StartPoint)
 *     { x: 20, y: 30 },  // Second point
 *     { x: 40, y: 10 },  // Third point
 *     { x: 60, y: 40 }   // Fourth point
 *   ],
 *   // Optional styling
 *   StyleRecord: {
 *     Line: {
 *       Paint: { Color: '#FF0000', Opacity: 1.0 },
 *       Thickness: 2
 *     }
 *   }
 * });
 *
 * // Calculate the bounding frame
 * freehandLine.CalcFrame();
 *
 * // Render the freehand line to an SVG document
 * const svgShape = freehandLine.CreateShape(svgDoc, true);
 * ```
 *
 * @remarks
 * - Points in the pointlist are stored relative to the StartPoint
 * - The shape automatically calculates its bounding frame based on all points
 * - Unlike other shapes, freehand lines do not support rotation or linking
 * - The shape creates interactive resize handles at the corners when selected
 */
class FreehandLine extends BaseLine {

  public StartPoint: any;
  public EndPoint: any;
  public pointlist: any;

  /**
   * Creates a new FreehandLine instance
   * @param options - Configuration options for the freehand line
   */
  constructor(options) {
    options = options || {};
    options.LineType = OptConstant.LineType.FREEHAND;
    options.TextFlags = options.TextFlags | NvConstant.TextFlags.None;

    super(options);

    this.TextFlags = options.TextFlags || 0;
    this.StartPoint = options.StartPoint || { x: 0, y: 0 };
    this.EndPoint = options.EndPoint || { x: 0, y: 0 };
    this.pointlist = options.pointlist || [];
    this.RotationAngle = options.RotationAngle || 0;
    this.flags = options.flags || 0;

    this.CalcFrame();
  }

  /**
   * Gets the points that make up the freehand line
   * @param relativeToFrame - If true, returns points relative to the frame's origin
   * @returns Array of points that make up the freehand line
   */
  GetFreehandPoints(relativeToFrame) {
    let points = [],
      startX = this.StartPoint.x,
      startY = this.StartPoint.y;

    if (relativeToFrame === true) {
      startX -= this.Frame.x;
      startY -= this.Frame.y;
    }

    if (this.pointlist) {
      for (let i = 0; i < this.pointlist.length; i++) {
        const currentPoint = this.pointlist[i];
        let point = {
          x: currentPoint.x + startX,
          y: currentPoint.y + startY
        };
        points.push(point);
      }
    }

    return points;
  }

  /**
   * Calculates the bounding frame of the freehand line
   */
  CalcFrame() {
    let rect = {},
      points = [];

    if (this.pointlist && this.pointlist.length) {
      points = this.GetFreehandPoints(false);
      Utils2.GetPolyRect(rect, points);

      if (rect.width < 1) {
        rect.width = 1;
      }

      if (rect.height < 1) {
        rect.height = 1;
      }

      this.Frame = $.extend(true, {}, rect);
    }

    this.UpdateFrame(this.Frame);
  }

  /**
   * Gets dimensions for display in the UI
   * @returns Object containing x, y, width, and height
   */
  GetDimensionsForDisplay() {
    return {
      x: this.Frame.x,
      y: this.Frame.y,
      width: this.Frame.width,
      height: this.Frame.height
    };
  }

  /**
   * Gets the SVG frame for rendering
   * @param frame - Optional frame to use instead of the shape's frame
   * @returns Copy of the frame to use for SVG rendering
   */
  GetSVGFrame(frame) {
    var frameRect = {};

    if (frame == null) {
      frame = this.Frame;
    }

    Utils2.CopyRect(frameRect, frame);
    return frameRect;
  }

  /**
   * Updates the drawing representation of the freehand line
   * @param svgDoc - The SVG document object to update
   */
  UpdateDrawing(svgDoc) {
    var shapeElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Shape),
      slopElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Slop);

    this.CalcFrame();
    var points = this.GetFreehandPoints(true);

    svgDoc.SetSize(this.Frame.width, this.Frame.height);
    svgDoc.SetPos(this.Frame.x, this.Frame.y);
    shapeElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(shapeElement, points);
    slopElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(slopElement, points);
  }

  /**
   * Updates the SVG path data for the given element using the points
   * @param element - The SVG element to update
   * @param points - The points to use for drawing the path
   */
  UpdateSVG(element, points) {
    var path,
      pointCount = points.length;

    if (element && element.PathCreator) {
      path = element.PathCreator();
      path.BeginPath();

      if (pointCount > 1) {
        path.MoveTo(points[0].x, points[0].y);
      }

      for (let i = 1; i < pointCount; i++) {
        path.LineTo(points[i].x, points[i].y);
      }

      path.Apply();
    }
  }

  /**
   * Creates the SVG shape for rendering the freehand line
   * @param svgDoc - The SVG document to create elements in
   * @param isInteractive - Whether the shape should respond to events
   * @returns The created SVG shape container
   */
  CreateShape(svgDoc, isInteractive) {
    if (this.flags & NvConstant.ObjFlags.NotVisible) return null;

    let points = [],
      shapeContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer),
      shapePath = svgDoc.CreateShape(OptConstant.CSType.Path);

    shapePath.SetID(OptConstant.SVGElementClass.Shape);

    let slopPath = svgDoc.CreateShape(OptConstant.CSType.Path);
    slopPath.SetID(OptConstant.SVGElementClass.Slop);
    slopPath.ExcludeFromExport(true);

    this.CalcFrame();

    let frame = this.Frame,
      styleRecord = this.StyleRecord;

    styleRecord = this.SVGTokenizerHook(styleRecord);

    if (styleRecord == null) {
      let sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      if (sessionObject) {
        styleRecord = sessionObject.def.style;
      }
    }

    let frameWidth = frame.width,
      frameHeight = frame.height;

    shapeContainer.SetSize(frameWidth, frameHeight);
    shapeContainer.SetPos(this.Frame.x, this.Frame.y);
    shapePath.SetSize(frameWidth, frameHeight);

    points = this.GetFreehandPoints(true);
    this.UpdateSVG(shapePath, points);

    let lineColor = styleRecord.Line.Paint.Color,
      lineThickness = styleRecord.Line.Thickness;

    if (styleRecord.Line.Thickness > 0 && styleRecord.Line.Thickness < 1) {
      lineThickness = 1;
    }

    let lineOpacity = styleRecord.Line.Paint.Opacity;

    shapePath.SetFillColor('none');
    shapePath.SetStrokeColor(lineColor);
    shapePath.SetStrokeOpacity(lineOpacity);
    shapePath.SetStrokeWidth(lineThickness);

    slopPath.SetSize(frameWidth, frameHeight);
    this.UpdateSVG(slopPath, points);
    slopPath.SetStrokeColor('white');
    slopPath.SetFillColor('none');
    slopPath.SetOpacity(0);

    if (isInteractive) {
      slopPath.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      slopPath.SetEventBehavior(OptConstant.EventBehavior.None);
    }

    slopPath.SetStrokeWidth(lineThickness + OptConstant.Common.Slop);
    shapeContainer.AddElement(shapePath);
    shapeContainer.AddElement(slopPath);
    this.ApplyStyles(shapePath, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);
    shapeContainer.isShape = true;

    return shapeContainer;
  }

  /**
   * Callback method called after a shape is created
   * @param svgDoc - The SVG document object
   * @param blockId - The ID of the block/shape
   * @param options - Additional options
   * @param parentId - The parent ID if applicable
   */
  PostCreateShapeCallback(svgDoc, blockId, options, parentId) {
  }

  /**
   * Creates resize handles (knobs) at the corners of the shape
   * @param svgDoc - The SVG document object
   * @param blockId - The ID of the block/shape
   * @param options - Additional options
   * @param selectedId - The ID of the currently selected object
   * @returns The created action triggers group element
   */
  CreateActionTriggers(svgDoc, blockId, options, selectedId) {
    let knobSize = OptConstant.Common.KnobSize;
    let triggerGroup = svgDoc.CreateShape(OptConstant.CSType.Group);

    let scale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      scale *= 2;
    }

    let scaledKnobSize = knobSize / scale;
    let frame = this.Frame;
    let width = frame.width;
    let height = frame.height;

    // Get object pointer based on blockId
    DataUtil.GetObjectPtr(blockId, false);

    // Adjust frame dimensions to account for knob size
    width += scaledKnobSize;
    height += scaledKnobSize;

    let extendedFrame = $.extend(true, {}, frame);
    extendedFrame.x -= scaledKnobSize / 2;
    extendedFrame.y -= scaledKnobSize / 2;
    extendedFrame.width += scaledKnobSize;
    extendedFrame.height += scaledKnobSize;

    // Base knob configuration
    let knobConfig = {
      svgDoc: svgDoc,
      shapeType: OptConstant.CSType.Rect,
      knobSize: scaledKnobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      cursorType: CursorConstant.CursorType.RESIZE_LT,
      locked: false
    };

    // Adjust knob appearance if not selected
    if (blockId !== selectedId) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = 0;
    }

    // Top left knob
    knobConfig.knobID = OptConstant.ActionTriggerType.TopLeft;
    knobConfig.cursorType = CursorConstant.CursorType.RESIZE_LT;
    let knob = this.GenericKnob(knobConfig);
    triggerGroup.AddElement(knob);

    // Top right knob
    knobConfig.x = width - scaledKnobSize;
    knobConfig.y = 0;
    knobConfig.cursorType = CursorConstant.CursorType.RESIZE_RT;
    knobConfig.knobID = OptConstant.ActionTriggerType.TopRight;
    knob = this.GenericKnob(knobConfig);
    triggerGroup.AddElement(knob);

    // Bottom right knob
    knobConfig.x = width - scaledKnobSize;
    knobConfig.y = height - scaledKnobSize;
    knobConfig.cursorType = CursorConstant.CursorType.RESIZE_RB;
    knobConfig.knobID = OptConstant.ActionTriggerType.BottomRight;
    knob = this.GenericKnob(knobConfig);
    triggerGroup.AddElement(knob);

    // Bottom left knob
    knobConfig.x = 0;
    knobConfig.y = height - scaledKnobSize;
    knobConfig.cursorType = CursorConstant.CursorType.RESIZE_LB;
    knobConfig.knobID = OptConstant.ActionTriggerType.BottomLeft;
    knob = this.GenericKnob(knobConfig);
    triggerGroup.AddElement(knob);

    // Set group size and position
    triggerGroup.SetSize(width, height);
    triggerGroup.SetPos(extendedFrame.x, extendedFrame.y);
    triggerGroup.isShape = true;
    triggerGroup.SetID(OptConstant.Common.Action + blockId);

    return triggerGroup;
  }

  /**
   * Handles shape modification based on user interaction with resize handles
   * @param svgDoc - The SVG document object
   * @param mouseX - Current mouse X position
   * @param mouseY - Current mouse Y position
   * @param dragType - Type of drag operation
   * @param options - Additional options
   */
  ModifyShape(svgDoc, mouseX, mouseY, dragType, options) {
    let currentPoint = {
      x: mouseX,
      y: mouseY
    };

    let newBBox = $.extend(true, {}, T3Gv.opt.actionBBox);

    switch (T3Gv.opt.actionTriggerId) {
      case OptConstant.ActionTriggerType.TopLeft:
        let deltaX = newBBox.x - mouseX;
        let deltaY = newBBox.y - mouseY;
        newBBox.x = mouseX;
        newBBox.y = mouseY;
        newBBox.width += deltaX;
        newBBox.height += deltaY;

        // Handle negative dimensions
        if (newBBox.width < 0) {
          newBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
          newBBox.width = -newBBox.width;
        }
        if (newBBox.height < 0) {
          newBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
          newBBox.height = -newBBox.height;
        }

        T3Gv.opt.actionNewBBox = $.extend(true, {}, newBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, currentPoint);
        break;

      case OptConstant.ActionTriggerType.TopRight:
        deltaY = newBBox.y - mouseY;
        newBBox.y = mouseY;
        newBBox.height = newBBox.height + deltaY;
        newBBox.width = mouseX - newBBox.x;

        // Handle negative dimensions
        if (newBBox.width < 0) {
          newBBox.x = mouseX;
          newBBox.width = -newBBox.width;
        }
        if (newBBox.height < 0) {
          newBBox.y = T3Gv.opt.actionBBox.y + T3Gv.opt.actionBBox.height;
          newBBox.height = -newBBox.height;
        }

        T3Gv.opt.actionNewBBox = $.extend(true, {}, newBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, currentPoint);
        break;

      case OptConstant.ActionTriggerType.BottomRight:
        newBBox.width = mouseX - newBBox.x;
        newBBox.height = mouseY - newBBox.y;

        // Handle negative dimensions
        if (newBBox.width < 0) {
          newBBox.x = mouseX;
          newBBox.width = -newBBox.width;
        }
        if (newBBox.height < 0) {
          newBBox.y = mouseY;
          newBBox.height = -newBBox.height;
        }

        T3Gv.opt.actionNewBBox = $.extend(true, {}, newBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, currentPoint);
        break;

      case OptConstant.ActionTriggerType.BottomLeft:
        newBBox.height = mouseY - newBBox.y;
        deltaX = newBBox.x - mouseX;
        newBBox.x = mouseX;
        newBBox.width += deltaX;

        // Handle negative dimensions
        if (newBBox.width < 0) {
          newBBox.x = T3Gv.opt.actionBBox.x + T3Gv.opt.actionBBox.width;
          newBBox.width = -newBBox.width;
        }
        if (newBBox.height < 0) {
          newBBox.y = mouseY;
          newBBox.height = -newBBox.height;
        }

        T3Gv.opt.actionNewBBox = $.extend(true, {}, newBBox);
        this.HandleActionTriggerCallResize(T3Gv.opt.actionNewBBox, true, currentPoint);
        break;
    }
  }

  /**
   * Sets the size of the freehand line
   * @param width - New width for the shape
   * @param height - New height for the shape
   * @param updateFlag - Flag indicating whether to update immediately
   */
  SetSize(width, height, updateFlag) {
    let savedActionBBox, savedActionNewBBox;
    let newFrame = {};

    newFrame.x = this.Frame.x;
    newFrame.y = this.Frame.y;
    newFrame.width = this.Frame.width;
    newFrame.height = this.Frame.height;

    if (width) {
      newFrame.width = width;
    }

    if (height) {
      newFrame.height = height;
    }

    if (width || height) {
      savedActionBBox = T3Gv.opt.actionBBox;
      savedActionNewBBox = T3Gv.opt.actionNewBBox;

      T3Gv.opt.actionBBox = Utils1.DeepCopy(this.Frame);
      T3Gv.opt.actionNewBBox = Utils1.DeepCopy(this.Frame);

      this.HandleActionTriggerCallResize(newFrame, updateFlag, null);

      T3Gv.opt.actionBBox = savedActionBBox;
      T3Gv.opt.actionNewBBox = savedActionNewBBox;

      DataUtil.AddToDirtyList(this.BlockID);

      // Update flags if necessary
      if (this.rflags) {
        if (width) {
          this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
        }

        if (height) {
          this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
        }
      }
    }
  }

  /**
   * Handles the resizing of a freehand line when action triggers (resize handles) are used
   * @param newFrame - The new frame/bounding box dimensions
   * @param updateFlag - Flag indicating whether to update the display immediately
   * @param cursorPoint - The current cursor position
   */
  HandleActionTriggerCallResize(newFrame, updateFlag, cursorPoint) {
    this.prevBBox = $.extend(true, {}, this.Frame);
    let originalFrame = $.extend(false, {}, this.Frame);

    // Enforce minimum dimensions
    if (newFrame.width < OptConstant.Common.MinDim) {
      newFrame.width = OptConstant.Common.MinDim;
    }
    if (newFrame.height < OptConstant.Common.MinDim) {
      newFrame.height = OptConstant.Common.MinDim;
    }

    // Calculate scaling factors
    let widthScale = 1;
    let heightScale = 1;

    if (newFrame.width && !Utils2.IsEqual(this.Frame.width, 0)) {
      widthScale = newFrame.width / this.Frame.width;
    }

    if (newFrame.height && !Utils2.IsEqual(this.Frame.height, 0)) {
      heightScale = newFrame.height / this.Frame.height;
    }

    // Calculate position offsets
    let offsetX = newFrame.x - originalFrame.x;
    let offsetY = newFrame.y - originalFrame.y;

    // Update start point
    this.StartPoint.x += offsetX;
    this.StartPoint.y += offsetY;

    // Scale all points in the pointlist
    let pointCount = this.pointlist.length;
    for (let i = 0; i < pointCount; i++) {
      this.pointlist[i].x *= widthScale;
      this.pointlist[i].y *= heightScale;
    }

    this.CalcFrame();

    if (updateFlag === OptConstant.ActionTriggerType.LineLength) {
      updateFlag = 0;
      noMin = true;
    }

    // Update display coordinates if this is the active object
    if (T3Gv.opt.actionStoredObjectId === this.BlockID &&
      cursorPoint &&
      UIUtil.UpdateDisplayCoordinates(newFrame, cursorPoint, CursorConstant.CursorTypes.Grow, this)) {
      // Coordinates updated
    }

    if (updateFlag &&
      T3Gv.opt.actionSvgObject &&
      T3Gv.opt.actionStoredObjectId === this.BlockID) {

      if (T3Gv.opt.actionSvgObject === null) return;

      let triggerData = {
        action: updateFlag,
        prevBBox: this.prevBBox,
        trect: $.extend(true, {}, this.trect)
      };

      this.UpdateDrawing(T3Gv.opt.actionSvgObject);
    }
  }

  /**
   * Determines if the shape allows hooks
   * @param hookType - The type of hook
   * @param objectId - The ID of the object
   * @param options - Additional options
   * @returns False, as freehand lines do not allow hooks
   */
  AllowHook(hookType, objectId, options) {
    return false;
  }

  /**
   * Determines if the shape allows linking
   * @returns False, as freehand lines do not allow linking
   */
  AllowLink() {
    return false;
  }

  /**
   * Determines if the shape prevents linking
   * @returns True, as freehand lines prevent linking
   */
  PreventLink() {
    return true;
  }

  /**
   * Determines if rotation is disabled for this shape
   * @returns True, as freehand lines cannot be rotated
   */
  NoRotate() {
    return true;
  }

  /**
   * Handles custom snap behavior for the freehand line
   * @param snapData - The snap data object
   * @returns True to use custom snap behavior
   */
  CustomSnap(snapData) {
    return true;
  }

  /**
   * Adjusts the end of the freehand line during drawing
   * @param svgDoc - The SVG document object
   * @param mouseX - Current mouse X position
   * @param mouseY - Current mouse Y position
   * @param options - Additional options
   */
  AdjustLineEnd(svgDoc, mouseX, mouseY, options) {
    let lastPoint = this.pointlist[this.pointlist.length - 1];
    let deltaX = mouseX - lastPoint.x;
    let deltaY = mouseY - lastPoint.y;

    // Only add a new point if the distance is significant (> 3 pixels)
    if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) > 3) {
      let relativeX = mouseX - this.StartPoint.x;
      let relativeY = mouseY - this.StartPoint.y;
      let newPoint = new Point(relativeX, relativeY);
      this.pointlist.push(newPoint);
    }

    this.AdjustLine(svgDoc, mouseX, mouseY, options);
  }

  /**
   * Adjusts the freehand line during drawing
   * @param svgDoc - The SVG document object
   * @param mouseX - Current mouse X position
   * @param mouseY - Current mouse Y position
   * @param options - Additional options
   */
  AdjustLine(svgDoc, mouseX, mouseY, options) {
    if (svgDoc) {
      this.UpdateDrawing(svgDoc);
    } else {
      this.CalcFrame();
    }
  }

  /**
   * Handles actions during tracking (dragging)
   * @param event - The event object
   * @returns The event object
   */
  LMActionDuringTrack(event) {
    return event;
  }

  /**
   * Handles drawing updates during tracking (dragging)
   * @param event - The event object
   * @returns The event object
   */
  LMDrawDuringTrack(event) {
    return event;
  }

  /**
   * Handles the release event when finishing drawing
   * @param event - The release event
   */
  LMDrawRelease(event) {
    if (event) {
      Utils2.StopPropagationAndDefaults(event);
      event.gesture.stopDetect();
    }

    LMEvtUtil.UnbindActionClickHammerEvents();

    if (!T3Gv.opt.isMobilePlatform) {
      $(window).unbind('mousemove');
      T3Gv.opt.WorkAreaHammer.on('tap', Evt_WorkAreaHammerClick);
    }

    this.ResetAutoScrollTimer();

    // Prepare shape attributes
    var shapeAttributes = {
      attributes: {}
    };

    shapeAttributes.attributes.StyleRecord = Utils1.DeepCopy(T3Gv.opt.drawShape.StyleRecord);
    shapeAttributes.attributes.StartArrowID = T3Gv.opt.drawShape.StartArrowID;
    shapeAttributes.attributes.EndArrowID = T3Gv.opt.drawShape.EndArrowID;
    shapeAttributes.attributes.StartArrowDisp = T3Gv.opt.drawShape.StartArrowDisp;
    shapeAttributes.attributes.ArrowSizeIndex = T3Gv.opt.drawShape.ArrowSizeIndex;
    shapeAttributes.attributes.TextGrow = T3Gv.opt.drawShape.TextGrow;
    shapeAttributes.attributes.TextAlign = T3Gv.opt.drawShape.TextAlign;
    shapeAttributes.attributes.TextDirection = T3Gv.opt.drawShape.TextDirection;
    shapeAttributes.attributes.Dimensions = T3Gv.opt.drawShape.Dimensions;
    shapeAttributes.attributes.StartPoint = Utils1.DeepCopy(T3Gv.opt.drawShape.StartPoint);
    shapeAttributes.attributes.EndPoint = Utils1.DeepCopy(T3Gv.opt.drawShape.EndPoint);
    shapeAttributes.attributes.Frame = Utils1.DeepCopy(T3Gv.opt.drawShape.Frame);
    shapeAttributes.attributes.extraflags = OptConstant.ExtraFlags.SideKnobs;

    if (this.pointlist) {
      shapeAttributes.attributes.pointlist = Utils1.DeepCopy(this.pointlist);
    }

    shapeAttributes.LineTool = DSConstant.LineToolTypes.FreehandLine;

    if (false) {
      shapeAttributes.CreateList = [T3Gv.opt.drawShape.BlockID];
    }

    shapeAttributes.linkParams = Utils1.DeepCopy(T3Gv.opt.linkParams);
    shapeAttributes.Actions = [];

    this.LMDrawPostRelease(T3Gv.opt.actionStoredObjectId);
    DrawUtil.PostObjectDraw();
  }

  /**
   * Handles the click event when starting to draw a freehand line
   * @param mouseX - The X coordinate where the drawing starts
   * @param mouseY - The Y coordinate where the drawing starts
   */
  LMDrawClick(mouseX, mouseY) {
    T3Util.Log('ListManager.FreehandLine.prototype.LMDrawClick e, t=>', mouseX, mouseY);

    try {
      this.Frame.x = mouseX;
      this.Frame.y = mouseY;
      this.Frame.width = 0;
      this.Frame.height = 0;

      this.StartPoint = {
        x: mouseX,
        y: mouseY
      };

      this.EndPoint = {
        x: mouseX,
        y: mouseY
      };

      T3Gv.opt.WorkAreaHammer.off('dragstart');

      if (!T3Gv.opt.isMobilePlatform) {
        T3Gv.opt.WorkAreaHammer.on('drag', Evt_DrawTrackHandlerFactory(this));
        T3Gv.opt.WorkAreaHammer.on('dragend', Evt_DrawReleaseHandlerFactory(this));
      }
    } catch (error) {
      this.LMDrawClickExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  /**
   * Writes the freehand line attributes to the Shape Format Util file
   * @param writer - The file writer object
   * @param options - Options for writing
   */
  WriteShapeData(outputStream, options) {
    T3Util.Log('S.FreehandLine.WriteShapeData - Input:', { outputStream, options });

    // Get a copy of freehand points (true means relative to frame)
    let freehandPoints = Utils1.DeepCopy(this).GetFreehandPoints(true);

    // Write the freehand line opcode
    let codePosition = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cFreeHandLine);

    // Prepare the data structure
    let pointData,
      lineData = {
        InstID: this.BlockID,
        npts: freehandPoints.length,
        pts: []
      };

    // Convert all points
    let pointCount = freehandPoints.length;
    for (let i = 0; i < pointCount; i++) {
      pointData = new Point(freehandPoints[i].x, freehandPoints[i].y);
      lineData.pts.push(pointData);
    }

    // Write the structure to the file
    outputStream.writeStruct(DSConstant.FreehandLineStruct, lineData);
    ShapeUtil.WriteLength(outputStream, codePosition);

    T3Util.Log('S.FreehandLine.WriteShapeData - Output:', { freehandPoints });
  }
}

export default FreehandLine
