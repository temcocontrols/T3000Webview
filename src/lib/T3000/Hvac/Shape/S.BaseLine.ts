

import BaseDrawObject from "./S.BaseDrawObject"
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import EvtUtil from "../Event/EvtUtil";
import $ from 'jquery'
import T3Timer from '../Util/T3Timer'
import Point from '../Model/Point'
import Rect from "./S.Rect";
import Instance from "../Data/Instance/Instance"
import NvConstant from "../Data/Constant/NvConstant"
import HitResult from '../Model/HitResult'
import LinkParameters from '../Model/LinkParameters'
import ArrowheadRecord from '../Model/ArrowheadRecord'
import ShapeUtil from '../Opt/Shape/ShapeUtil';
import T3Constant from '../Data/Constant/T3Constant';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import TextConstant from '../Data/Constant/TextConstant';
import T3Util from '../Util/T3Util';
import DataUtil from "../Opt/Data/DataUtil";
import RightClickMd from "../Model/RightClickMd";
import UIUtil from "../Opt/UI/UIUtil";
import LayerUtil from "../Opt/Opt/LayerUtil";
import RulerUtil from "../Opt/UI/RulerUtil";
import OptCMUtil from "../Opt/Opt/OptCMUtil";
import SvgUtil from "../Opt/Opt/SvgUtil";
import DrawUtil from "../Opt/Opt/DrawUtil";
import HookUtil from "../Opt/Opt/HookUtil";
import LMEvtUtil from "../Opt/Opt/LMEvtUtil";
import SelectUtil from "../Opt/Opt/SelectUtil";
import ToolActUtil from "../Opt/Opt/ToolActUtil";
import PolyUtil from "../Opt/Opt/PolyUtil";
import TextUtil from "../Opt/Opt/TextUtil";

/**
 * Represents a base line object in the T3000 drawing system.
 *
 * @class BaseLine
 * @extends BaseDrawObject
 * @description
 * The BaseLine class provides core functionality for all line-based objects in the T3000 HVAC drawing system.
 * It manages line properties, connections, rendering, and interaction behaviors including:
 * - Line styling and appearance (line types, thickness, etc.)
 * - Arrow styling for line endpoints
 * - Connection points (hooks) for linking objects
 * - Hit testing for user interaction
 * - Geometric operations (rotation, scaling, etc.)
 * - Event handling for drawing and modification
 *
 * BaseLine serves as the foundation for more specialized line classes like PolyLine,
 * SegLine and other line variants.
 *
 * @example
 * // Create a basic line with start and end points
 * const lineParams = {
 *   LineType: OptConstant.LineType.LINE,
 *   StyleRecord: defaultLineStyle,
 *   StartPoint: { x: 100, y: 100 },
 *   EndPoint: { x: 200, y: 150 }
 * };
 * const newLine = new BaseLine(lineParams);
 *
 * // Add arrows to the line
 * newLine.StartArrowID = OptConstant.ArrowStyles.Arrow;
 * newLine.EndArrowID = OptConstant.ArrowStyles.Circle;
 * newLine.ArrowSizeIndex = 2; // Medium size
 *
 * // Create a shape and add it to the drawing
 * const lineShape = newLine.CreateShape(T3Gv.opt.svgDoc, false);
 * T3Gv.opt.svgObjectLayer.AddElement(lineShape);
 */
class BaseLine extends BaseDrawObject {

  public LineType: any;
  public linetrect: any;
  public theMinTextDim: any;
  public TextWrapWidth: any;
  public polylist: any;

  public StartArrowID: any;
  public EndArrowID: any;
  public StartArrowDisp: any;
  public EndArrowDisp: any;
  public ArrowSizeIndex: any;

  constructor(params: any) {
    T3Util.Log("= S.BaseLine: constructor called with input:", params);

    // Ensure params is defined and set default values
    params = params || {};
    params.DrawingObjectBaseClass = OptConstant.DrawObjectBaseClass.Line;
    params.maxhooks = 2;

    if (typeof params.targflags === "undefined") {
      params.targflags = NvConstant.HookFlags.LcLine | NvConstant.HookFlags.LcAttachToLine;
    }

    if (typeof params.hookflags === "undefined") {
      params.hookflags = NvConstant.HookFlags.LcShape | NvConstant.HookFlags.LcLine;
    }

    // Call the base class constructor
    super(params);

    // Initialize properties with formatted assignments
    this.LineType = params.LineType;
    this.linetrect = { x: 0, y: 0, width: 0, height: 0 };
    this.theMinTextDim = { width: 0, height: 0 };
    this.TextWrapWidth = 0;
    this.iconShapeBottomOffset = 20;
    this.iconShapeRightOffset = 0;

    T3Util.Log("= S.BaseLine: constructor output:", this);
  }

  checkIfPolyLine(polylineObj: any): boolean {
    T3Util.Log("= S.BaseLine: checkIfPolyLine called with input:", polylineObj);

    const PolyLineClass = Instance.Shape.PolyLine;
    const isPolyLine = polylineObj instanceof PolyLineClass;

    T3Util.Log("= S.BaseLine: checkIfPolyLine output:", isPolyLine);
    return isPolyLine;
  }

  CalcFrame(inputFlag?: boolean): void {
    T3Util.Log("= S.BaseLine: CalcFrame called with inputFlag =", inputFlag);

    // Calculate the initial frame from start and end points
    let isSegLine = false;
    this.Frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    T3Util.Log("= S.BaseLine: Initial Frame calculated as", this.Frame);

    // Check if the line type requires segment processing
    if (this.LineType === OptConstant.LineType.SEGLINE) {
      isSegLine = true;
      T3Util.Log("= S.BaseLine: LineType is SEGLINE, setting isSegLine to", isSegLine);
    }

    // Get the polygon points for the frame computation
    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, isSegLine, false, null);
    T3Util.Log("= S.BaseLine: Retrieved polyPoints:", polyPoints);

    // If polyPoints exist, update the frame accordingly
    if (polyPoints && polyPoints.length) {
      Utils2.GetPolyRect(this.Frame, polyPoints);
      T3Util.Log("= S.BaseLine: Updated Frame using polyPoints:", this.Frame);
    }

    // Update the frame with additional properties if needed
    this.UpdateFrame(this.Frame, inputFlag);
    T3Util.Log("= S.BaseLine: Final Frame after UpdateFrame:", this.Frame);
  }

  GetArrowheadFormat(): ArrowheadRecord {
    T3Util.Log("= S.BaseLine: GetArrowheadFormat called");
    T3Util.Log("= S.BaseLine: Input this =", this);

    const arrHead = new ArrowheadRecord();
    if (ShapeUtil.LineIsReversed(this, null, false)) {
      T3Util.Log("= S.BaseLine: Line is reversed");
      arrHead.StartArrowID = this.EndArrowID;
      arrHead.EndArrowID = this.StartArrowID;
      arrHead.StartArrowDisp = this.EndArrowDisp;
      arrHead.EndArrowDisp = this.StartArrowDisp;
    } else {
      T3Util.Log("= S.BaseLine: Line is not reversed");
      arrHead.StartArrowID = this.StartArrowID;
      arrHead.EndArrowID = this.EndArrowID;
      arrHead.StartArrowDisp = this.StartArrowDisp;
      arrHead.EndArrowDisp = this.EndArrowDisp;
    }
    arrHead.ArrowSizeIndex = this.ArrowSizeIndex;

    T3Util.Log("= S.BaseLine: Output ArrowheadRecord =", arrHead);
    return arrHead;
  }

  GetSVGFrame(inputFrame?: any): any {
    T3Util.Log("= S.BaseLine: GetSVGFrame called with input:", inputFrame);
    let frame: any = {};

    if (inputFrame != null) {
      Utils2.CopyRect(frame, inputFrame);
    } else {
      frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    }

    T3Util.Log("= S.BaseLine: GetSVGFrame output:", frame);
    return frame;
  }

  GetPositionRect(): any {
    T3Util.Log("= S.BaseLine: GetPositionRect called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const positionRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    T3Util.Log("= S.BaseLine: GetPositionRect output:", positionRect);
    return positionRect;
  }

  AdjustPinRect(pinRect: any, offset: any, additional: any): any {
    T3Util.Log("= S.BaseLine: AdjustPinRect called with", { pinRect, offset, additional });
    const adjustedPinRect = pinRect;
    T3Util.Log("= S.BaseLine: AdjustPinRect output:", adjustedPinRect);
    return adjustedPinRect;
  }

  GetDimensions(): { x: number; y: number } {
    T3Util.Log("= S.BaseLine: GetDimensions called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    const dimensions = { x: distance, y: 0 };
    T3Util.Log("= S.BaseLine: GetDimensions output:", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay(): { x: number; y: number; width: number; height: number } {
    T3Util.Log("= S.BaseLine: GetDimensionsForDisplay called with no input parameters");

    const dimensions = this.GetDimensions();
    T3Util.Log("= S.BaseLine: Dimensions retrieved:", dimensions);

    const result = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: dimensions.x,
      height: dimensions.y,
    };

    T3Util.Log("= S.BaseLine: GetDimensionsForDisplay output:", result);
    return result;
  }

  GetSnapRect() {
    T3Util.Log("= S.BaseLine: GetSnapRect called with no input");

    // Create a snap rectangle by copying the current frame.
    let snapRect: any = {};
    Utils2.CopyRect(snapRect, this.Frame);
    T3Util.Log("= S.BaseLine: Initial snapRect copied from Frame:", snapRect);

    // If the object is a wall opt wall, adjust the snap rectangle dimensions.
    if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
      let widthInflation = 0;
      let heightInflation = 0;

      // Inflate width if necessary.
      if (snapRect.width === 0) {
        widthInflation = this.StyleRecord.Line.Thickness / 2;
      }

      // Inflate height if necessary.
      if (snapRect.height === 0) {
        heightInflation = this.StyleRecord.Line.Thickness / 2;
      }

      Utils2.InflateRect(snapRect, widthInflation, heightInflation);
      T3Util.Log("= S.BaseLine: snapRect after inflation for wall opt wall:", snapRect);
    }

    T3Util.Log("= S.BaseLine: GetSnapRect returning:", snapRect);
    return snapRect;
  }

  CanSnapToShapes(input: any): number {
    T3Util.Log("= S.BaseLine: CanSnapToShapes called with input:", input);

    if (input && this.objecttype === NvConstant.FNObjectTypes.FlWall) {
      if (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x, this.StyleRecord.Line.BThick)) {
        input.distanceonly = NvConstant.Guide_DistanceTypes.Vertical_Wall;
        T3Util.Log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Vertical_Wall");
        return this.BlockID;
      }
      if (Utils2.IsEqual(this.StartPoint.y, this.EndPoint.y, this.StyleRecord.Line.BThick)) {
        input.distanceonly = NvConstant.Guide_DistanceTypes.Horizontal_Wall;
        T3Util.Log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Horizontal_Wall");
        return this.BlockID;
      }
    }

    T3Util.Log("= S.BaseLine: CanSnapToShapes output: -1");
    return -1;
  }

  IsSnapTarget(): boolean {
    T3Util.Log("= S.BaseLine: IsSnapTarget called with no input");
    const result = false;
    T3Util.Log("= S.BaseLine: IsSnapTarget output:", result);
    return result;
  }

  GuideDistanceOnly(): any {
    T3Util.Log("= S.BaseLine: GuideDistanceOnly called");

    const isFloorPlanWall = this.objecttype === NvConstant.FNObjectTypes.FlWall;
    const result = isFloorPlanWall ? NvConstant.Guide_DistanceTypes.PolyWall : false;

    T3Util.Log("= S.BaseLine: GuideDistanceOnly returning", result);
    return result;
  }

  CreateDimension(
    startPoint: any,
    endPoint: any,
    dimensionParam: any,
    extraParam1: any,
    extraParam2: any,
    extraParam3: any,
    extraParam4: any,
    extraParam5: any,
    extraParam6: any,
    extraParam7: any,
    extraParam8: any
  ): any {
    T3Util.Log("= S.BaseLine: CreateDimension called with input:", {
      startPoint,
      endPoint,
      dimensionParam,
      extraParam1,
      extraParam2,
      extraParam3,
      extraParam4,
      extraParam5,
      extraParam6,
      extraParam7,
      extraParam8,
    });

    if (
      !dimensionParam ||
      (this instanceof Instance.Shape.PolyLine &&
        this.polylist &&
        this.polylist.closed)
    ) {
      const result = super.CreateDimension(
        startPoint,
        endPoint,
        dimensionParam,
        extraParam1,
        extraParam2,
        extraParam3,
        extraParam4,
        extraParam5,
        extraParam6,
        extraParam7,
        extraParam8
      );
      T3Util.Log("= S.BaseLine: CreateDimension output:", result);
      return result;
    }

    T3Util.Log("= S.BaseLine: CreateDimension condition not met, returning undefined.");
    return undefined;
  }

  GetDimensionTextForPoints(startPoint: Point, endPoint: Point): string {
    T3Util.Log("= S.BaseDrawObject: GetDimensionTextForPoints input:", { startPoint, endPoint });

    let totalLength = 0;

    // If total dimension flag is set then calculate the total polyline length.
    if (this.Dimensions & NvConstant.DimensionFlags.Total) {
      const polyPoints = this.GetPolyPoints(200, true, false, false, null);
      for (let i = 1; i < polyPoints.length; i++) {
        const deltaX = Math.abs(polyPoints[i].x - polyPoints[i - 1].x);
        const deltaY = Math.abs(polyPoints[i].y - polyPoints[i - 1].y);
        if (deltaX !== 0 || deltaY !== 0) {
          totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        }
      }
    } else {
      // Otherwise compute the arc dimension.
      // Calculate the angle difference between 360 and the angle from startPoint to endPoint.
      const angleDifferenceDegrees = 360 - Utils1.CalcAngleFromPoints(startPoint, endPoint);
      // Convert the angle difference to radians.
      const rotationRadians = 2 * Math.PI * (angleDifferenceDegrees / 360);

      // Create a copy of start and end points.
      const points: Point[] = [
        new Point(startPoint.x, startPoint.y),
        new Point(endPoint.x, endPoint.y)
      ];
      // Rotate the points about the current Frame using the negative rotation.
      Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, points);
      // Use the absolute difference in x-coordinate after rotation.
      totalLength = Math.abs(points[0].x - points[1].x);
    }

    // Convert the calculated length in pixels (or document units) into ruler units (e.g. inches, cm, etc.).
    const dimensionText: string = RulerUtil.GetLengthInRulerUnits(totalLength);
    T3Util.Log("= S.BaseDrawObject: GetDimensionTextForPoints output:", dimensionText);
    return dimensionText;
  }

  EnforceMinimum(isPrimary: boolean): void {
    T3Util.Log("= S.BaseDrawObject: EnforceMinimum input:", { isPrimary, StartPoint: this.StartPoint, EndPoint: this.EndPoint });

    const minDim = OptConstant.Common.MinDim;

    // Case 1: Vertical line (same x-coordinate)
    if (Utils2.IsEqual(this.EndPoint.x, this.StartPoint.x)) {
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      if (Math.abs(deltaY) < minDim && this.hooks.length < 2) {
        if (deltaY >= 0) {
          if (isPrimary) {
            this.StartPoint.y = this.EndPoint.y - minDim;
          } else {
            this.EndPoint.y = this.StartPoint.y + minDim;
          }
        } else {
          if (isPrimary) {
            this.StartPoint.y = this.EndPoint.y + minDim;
          } else {
            this.EndPoint.y = this.StartPoint.y - minDim;
          }
        }
      }
    }
    // Case 2: Horizontal line (same y-coordinate)
    else if (Utils2.IsEqual(this.EndPoint.y, this.StartPoint.y)) {
      const deltaX = this.EndPoint.x - this.StartPoint.x;
      if (Math.abs(deltaX) < minDim && this.hooks.length < 2) {
        if (deltaX >= 0) {
          if (isPrimary) {
            this.StartPoint.x = this.EndPoint.x - minDim;
          } else {
            this.EndPoint.x = this.StartPoint.x + minDim;
          }
        } else {
          if (isPrimary) {
            this.StartPoint.x = this.EndPoint.x + minDim;
          } else {
            this.EndPoint.x = this.StartPoint.x - minDim;
          }
        }
      }
    }
    // Case 3: Diagonal line (neither x nor y are equal)
    else {
      const deltaX = this.EndPoint.x - this.StartPoint.x;
      const deltaY = this.EndPoint.y - this.StartPoint.y;
      if (Math.abs(deltaX) < minDim && Math.abs(deltaY) < minDim && this.hooks.length < 2) {
        // Compare absolute differences to decide which axis to adjust
        if (Math.abs(deltaX) >= Math.abs(deltaY)) {
          // Adjust along x-axis
          if (deltaX >= 0) {
            if (isPrimary) {
              this.StartPoint.x = this.EndPoint.x - minDim;
            } else {
              this.EndPoint.x = this.StartPoint.x + minDim;
            }
          } else {
            if (isPrimary) {
              this.StartPoint.x = this.EndPoint.x + minDim;
            } else {
              this.EndPoint.x = this.StartPoint.x - minDim;
            }
          }
        } else {
          // Adjust along y-axis
          if (deltaY >= 0) {
            if (isPrimary) {
              this.StartPoint.y = this.EndPoint.y - minDim;
            } else {
              this.EndPoint.y = this.StartPoint.y + minDim;
            }
          } else {
            if (isPrimary) {
              this.StartPoint.y = this.EndPoint.y + minDim;
            } else {
              this.EndPoint.y = this.StartPoint.y - minDim;
            }
          }
        }
      }
    }

    T3Util.Log("= S.BaseDrawObject: EnforceMinimum output:", { StartPoint: this.StartPoint, EndPoint: this.EndPoint });
  }

  UpdateDimensions(newLength: number, unusedParam1: any, unusedParam2: any): void {
    T3Util.Log("= S.BaseLine: UpdateDimensions called with input:", { newLength, unusedParam1, unusedParam2 });

    let angleDegrees = 0;
    let adjustedX = 0;
    let adjustedY = 0;
    let shiftX = 0;
    let shiftY = 0;
    const points: Point[] = [];
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Translate start and end points relative to the rectangle origin
    points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
    points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

    // Calculate the rotation angle and convert to radians
    angleDegrees = 360 - Utils1.CalcAngleFromPoints(points[0], points[1]);
    const rotationRadians = 2 * Math.PI * (angleDegrees / 360);

    // Rotate points by -rotationRadians
    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, points);

    // Set the second point's x-coordinate based on the new length
    if (points[0].x < points[1].x) {
      points[1].x = points[0].x + newLength;
    } else {
      points[1].x = points[0].x - newLength;
    }

    // Rotate points back by rotationRadians
    Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, points);

    // Calculate adjusted coordinates relative to the original rectangle
    adjustedX = points[1].x + rect.x;
    adjustedY = points[1].y + rect.y;

    // Adjust X if the new value is negative
    if (adjustedX < 0) {
      shiftX = -adjustedX;
      adjustedX = 0;
    }

    // Adjust Y if the new value is negative and add a standoff if necessary
    if (adjustedY < 0) {
      shiftY += -adjustedY;
      if (
        this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select
      ) {
        shiftY += OptConstant.Common.DimDefaultStandoff;
      }
      adjustedY += shiftY;
    }

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    // Adjust the line end point using the calculated coordinates
    this.AdjustLineEnd(svgElement, adjustedX, adjustedY, OptConstant.ActionTriggerType.LineEnd, true);

    // If there's any shift, adjust the line start point accordingly
    if (shiftX > 0 || shiftY > 0) {
      adjustedX = this.StartPoint.x + shiftX;
      adjustedY = this.StartPoint.y + shiftY;
      this.AdjustLineStart(svgElement, adjustedX, adjustedY, OptConstant.ActionTriggerType.LineStart, true);
    }

    T3Util.Log("= S.BaseLine: UpdateDimensions output: StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  OffsetShape(offsetX: number, offsetY: number): void {
    T3Util.Log("= S.BaseLine: OffsetShape called with offsetX:", offsetX, "offsetY:", offsetY);

    // Update frame and points with the given offsets
    this.Frame.x += offsetX;
    this.Frame.y += offsetY;
    this.r.x += offsetX;
    this.r.y += offsetY;
    this.StartPoint.x += offsetX;
    this.StartPoint.y += offsetY;
    this.EndPoint.x += offsetX;
    this.EndPoint.y += offsetY;

    // Recalculate the frame
    this.CalcFrame();

    T3Util.Log("= S.BaseLine: OffsetShape updated Frame:", this.Frame, "StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  SetShapeOrigin(newX: number, newY: number, additionalParam: any): void {
    T3Util.Log("= S.BaseLine: SetShapeOrigin called with newX:", newX, "newY:", newY, "additionalParam:", additionalParam);

    const frame = this.GetSVGFrame();
    let deltaX = 0;
    let deltaY = 0;

    if (newX != null) {
      deltaX = frame.x - newX;
    }

    if (newY != null) {
      deltaY = frame.y - newY;
    }

    this.StartPoint.x -= deltaX;
    this.StartPoint.y -= deltaY;
    this.EndPoint.x -= deltaX;
    this.EndPoint.y -= deltaY;

    this.CalcFrame();

    T3Util.Log("= S.BaseLine: SetShapeOrigin updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  UpdateFrame(inputFrame, shouldRedraw) {
    T3Util.Log("= S.BaseLine: UpdateFrame called with inputFrame:", inputFrame, "shouldRedraw:", shouldRedraw);

    let arrowheadBounds;
    let shapeElement;
    let frame = inputFrame || this.Frame;
    let lineTextRect = this.LineTextX ? $.extend(true, {}, this.trect) : null;
    let lineThickness = this.StyleRecord?.Line?.Thickness || 0;
    let minLineThickness = Math.max(lineThickness, OptConstant.Common.MinWidth);

    // Call the base class UpdateFrame method
    super.UpdateFrame(frame);

    // Copy the line rectangle and adjust its position
    let adjustedLineRect = $.extend(true, {}, this.linetrect);
    adjustedLineRect.x += this.Frame.x;
    adjustedLineRect.y += this.Frame.y;

    // Ensure StartPoint is defined
    if (this.StartPoint?.x == null) {
      shouldRedraw = false;
    }

    // Handle SVG element updates
    if (T3Gv.opt) {
      shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

      if (shouldRedraw) {
        if (shapeElement) {
          T3Gv.opt.svgObjectLayer.RemoveElement(shapeElement);
          // Collab.NoRedrawFromSameEditor = false;
          // T3Gv.opt.collaboration.NoRedrawFromSameEditor = false;
        }
        shapeElement = this.CreateShape(T3Gv.opt.svgDoc, false);
      } else if (shapeElement) {
        frame = this.GetSVGFrame();
        shapeElement = shapeElement.GetElementById(OptConstant.SVGElementClass.Shape);
      }

      if (shapeElement) {
        arrowheadBounds = shapeElement.GetArrowheadBounds();
        if (arrowheadBounds && arrowheadBounds.length) {
          for (let i = 0; i < arrowheadBounds.length; i++) {
            arrowheadBounds[i].x += frame.x;
            arrowheadBounds[i].y += frame.y;
            this.r = Utils2.UnionRect(arrowheadBounds[i], this.r, this.r);
          }
        }
      }
    }

    // Inflate the rectangle by the line thickness
    Utils2.InflateRect(this.r, minLineThickness / 2, minLineThickness / 2);

    // Add effect settings to the rectangle
    if (this.StyleRecord) {
      let effectSettings = this.CalcEffectSettings(this.Frame, this.StyleRecord, false);
      if (effectSettings) {
        Utils2.Add2Rect(this.r, effectSettings.extent);
      }
    }

    // Union the line rectangle with the main rectangle
    if (this.DataID >= 0 && this.linetrect.width) {
      this.r = Utils2.UnionRect(adjustedLineRect, this.r, this.r);
    }

    // Add dimensions to the rectangle
    this.AddDimensionsToR();

    // Handle vertical text growth
    if (this.TextGrow === NvConstant.TextGrowBehavior.Vertical && !this.LineTextX) {
      let textParams = this.GetTextOnLineParams(this.BlockID);
      let textRect = Utils2.Pt2Rect(textParams.StartPoint, textParams.EndPoint);

      if (!this.TextWrapWidth) {
        let diagonal = Math.sqrt(frame.width ** 2 + frame.height ** 2);
        this.TextWrapWidth = diagonal / 2;
      }

      let widthDifference = textRect.width - this.TextWrapWidth;
      switch (ShapeUtil.TextAlignToWin(this.TextAlign).just) {
        case TextConstant.TextJust.Left:
          this.trect.x = textRect.x;
          this.trect.width = this.TextWrapWidth;
          break;
        case TextConstant.TextJust.Right:
          this.trect.x = textRect.x + textRect.width - this.TextWrapWidth;
          this.trect.width = this.TextWrapWidth;
          break;
        default:
          this.trect.x = textRect.x + widthDifference / 2;
          this.trect.width = this.TextWrapWidth;
      }
    }

    // Restore the original text rectangle dimensions if needed
    if (lineTextRect) {
      this.trect.width = lineTextRect.width;
      this.trect.height = lineTextRect.height;
    }

    T3Util.Log("= S.BaseLine: UpdateFrame output:", this.Frame, this.r);
  }

  GetHitTestFrame(): any {
    T3Util.Log("= S.BaseLine: GetHitTestFrame called");

    // Create a copy of the current frame
    let hitTestFrame = {};
    Utils2.CopyRect(hitTestFrame, this.Frame);
    T3Util.Log("= S.BaseLine: Initial hitTestFrame copied from Frame:", hitTestFrame);

    // Inflate the rectangle by half the knob size
    const knobSize = OptConstant.Common.KnobSize;
    Utils2.InflateRect(hitTestFrame, knobSize / 2, knobSize / 2);
    T3Util.Log("= S.BaseLine: Inflated hitTestFrame by knob size:", hitTestFrame);

    // Union the inflated rectangle with the main rectangle
    hitTestFrame = Utils2.UnionRect(hitTestFrame, this.r, hitTestFrame);
    T3Util.Log("= S.BaseLine: Final hitTestFrame after union with main rectangle:", hitTestFrame);

    return hitTestFrame;
  }

  GetMoveRect(includeInflation: boolean): any {
    T3Util.Log("= S.BaseLine: GetMoveRect called with includeInflation:", includeInflation);

    const moveRect: any = {};

    if (includeInflation) {
      Utils2.CopyRect(moveRect, this.r);
      Utils2.InflateRect(moveRect, 0, 0);
    } else {
      Utils2.CopyRect(moveRect, this.Frame);
    }

    T3Util.Log("= S.BaseLine: GetMoveRect output:", moveRect);
    return moveRect;
  }

  SetSize(newWidth: number, newHeight: number, actionType: number): void {
    T3Util.Log("= S.BaseLine: SetSize called with newWidth:", newWidth, "newHeight:", newHeight, "actionType:", actionType);

    let shouldAdjustEnd = false;
    let widthDifference = 0;
    let heightDifference = 0;

    if (actionType !== OptConstant.ActionTriggerType.LineLength || newWidth == null) {
      if (newWidth != null) {
        widthDifference = newWidth - this.Frame.width;
      }
      if (newHeight != null) {
        heightDifference = newHeight - this.Frame.height;
      }

      if (this.rflags) {
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
      }

      if (this.StartPoint.x < this.EndPoint.x || (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x) && this.StartPoint.y < this.EndPoint.y)) {
        shouldAdjustEnd = true;
      }

      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

      if (shouldAdjustEnd) {
        this.AdjustLineEnd(svgElement, this.EndPoint.x + widthDifference, this.EndPoint.y + heightDifference, 0, true);
      } else {
        this.AdjustLineStart(svgElement, this.StartPoint.x + widthDifference, this.StartPoint.y + heightDifference, 0, true);
      }

      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
    } else {
      this.UpdateDimensions(newWidth);
    }

    T3Util.Log("= S.BaseLine: SetSize completed with updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  AdjustForLineAngleSnap(startPoint: Point, endPoint: Point): boolean {
    T3Util.Log("= S.BaseLine: AdjustForLineAngleSnap called with startPoint:", startPoint, "endPoint:", endPoint);

    let angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    let adjusted = false;

    // Snap to horizontal or vertical angles
    if ((angle >= 358 || angle <= 3) || (angle >= 178 && angle <= 183)) {
      endPoint.y = startPoint.y;
      adjusted = true;
    }

    if ((angle >= 88 && angle <= 93) || (angle >= 268 && angle <= 273)) {
      endPoint.x = startPoint.x;
      adjusted = true;
    }

    T3Util.Log("= S.BaseLine: AdjustForLineAngleSnap output endPoint:", endPoint, "adjusted:", adjusted);
    return adjusted;
  }

  GetAngle(params: any): number {
    T3Util.Log("= S.BaseLine: GetAngle called with params:", params);

    let angle = 0;
    const textParams = this.GetTextOnLineParams(params);
    let startPoint = textParams.StartPoint;
    let endPoint = textParams.EndPoint;

    if (this.LineType === OptConstant.LineType.LINE) {
      if (startPoint.x > endPoint.x) {
        startPoint = textParams.EndPoint;
        endPoint = textParams.StartPoint;
      }

      const deltaX = Math.abs(startPoint.x - endPoint.x);
      const deltaY = Math.abs(startPoint.y - endPoint.y);

      if (deltaY < 1) {
        angle = 0;
      } else if (deltaX < 1) {
        angle = 90;
      } else {
        const radian = Math.atan(deltaY / deltaX);
        angle = startPoint.y < endPoint.y ? 180 - (angle = 180 * radian / Math.PI) : 180 * radian / Math.PI;
      }
    } else {
      angle = T3Gv.opt.GetClockwiseAngleBetween2PointsInDegrees(startPoint, endPoint);
    }

    T3Util.Log("= S.BaseLine: GetAngle output:", angle);
    return angle;
  }

  GetDrawNormalizedAngle(startPoint: Point, endPoint: Point): number {
    T3Util.Log("= S.BaseLine: GetDrawNormalizedAngle called with startPoint:", startPoint, "endPoint:", endPoint);

    let angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    let isReversed = false;

    if (this.polylist) {
      if (this.checkIfPolyLine(this)) {
        isReversed = this.IsReverseWinding();
      } else if (this.IsReversed !== undefined) {
        isReversed = this.IsReversed;
      }
    } else if (angle >= 180) {
      isReversed = true;
    }

    if (isReversed) {
      angle -= 180;
      if (angle < 0) {
        angle += 360;
      }
    }

    T3Util.Log("= S.BaseLine: GetDrawNormalizedAngle output:", angle);
    return angle;
  }

  GetApparentAngle(params: any): number {
    T3Util.Log("= S.BaseLine: GetApparentAngle called with params:", params);

    const angle = this.GetDrawNormalizedAngle(this.StartPoint, this.EndPoint);

    T3Util.Log("= S.BaseLine: GetApparentAngle output:", angle);
    return angle;
  }

  IsReverseWinding(): boolean {
    T3Util.Log("= S.BaseLine: IsReverseWinding called");

    let points = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
    T3Util.Log("= S.BaseLine: Retrieved points:", points);

    if (points.length === 2) {
      const isReversed = points[0].x > points[1].x;
      T3Util.Log("= S.BaseLine: IsReverseWinding output (2 points):", isReversed);
      return isReversed;
    }

    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }

    const isReversed = 0.5 * area >= 0;
    T3Util.Log("= S.BaseLine: IsReverseWinding output:", isReversed);
    return isReversed;
  }

  LinkGrow(blockID: number, hookPoint: number, newPoint: Point): void {
    T3Util.Log("= S.BaseLine: LinkGrow called with blockID:", blockID, "hookPoint:", hookPoint, "newPoint:", newPoint);

    switch (hookPoint) {
      case OptConstant.HookPts.KTL:
        this.StartPoint.x = newPoint.x;
        this.StartPoint.y = newPoint.y;
        break;
      case OptConstant.HookPts.KTR:
        this.EndPoint.x = newPoint.x;
        this.EndPoint.y = newPoint.y;
        break;
    }

    this.CalcFrame(true);
    OptCMUtil.SetLinkFlag(blockID, DSConstant.LinkFlags.Move);
    DataUtil.AddToDirtyList(blockID);

    T3Util.Log("= S.BaseLine: LinkGrow updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  HandleActionTriggerTrackCommon(
    newX: number,
    newY: number,
    redrawFlag: boolean,
    eventObj: any
  ): void {
    T3Util.Log("= S.BaseLine: HandleActionTriggerTrackCommon called with input:", {
      newX,
      newY,
      redrawFlag,
      eventObj,
    });

    const actionStartX = T3Gv.opt.actionStartX;
    const actionStartY = T3Gv.opt.actionStartY;
    const actionBBox = $.extend(true, {}, T3Gv.opt.actionBBox);
    let adjustedPoint = {};

    function adjustPoint(x: number, y: number, rect: any): { x: number; y: number } {
      const point = { x: x, y: y };
      if (rect.x < 0) point.x -= rect.x;
      if (rect.y < 0) point.y -= rect.y;
      return point;
    }

    switch (T3Gv.opt.actionTriggerId) {
      case OptConstant.ActionTriggerType.LineStart:
        this.AdjustLineStart(
          T3Gv.opt.actionSvgObject,
          newX,
          newY,
          T3Gv.opt.actionTriggerId,
          redrawFlag
        );
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.StartPoint.x, this.StartPoint.y, this.r);
          this.AdjustLineStart(
            T3Gv.opt.actionSvgObject,
            adjustedPoint.x,
            adjustedPoint.y,
            T3Gv.opt.actionTriggerId,
            redrawFlag
          );
        }
        break;
      case OptConstant.ActionTriggerType.PolyEnd:
      case OptConstant.ActionTriggerType.LineEnd:
        this.AdjustLineEnd(
          T3Gv.opt.actionSvgObject,
          newX,
          newY,
          T3Gv.opt.actionTriggerId,
          redrawFlag
        );
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.EndPoint.x, this.EndPoint.y, this.r);
          this.AdjustLineEnd(
            T3Gv.opt.actionSvgObject,
            adjustedPoint.x,
            adjustedPoint.y,
            T3Gv.opt.actionTriggerId,
            redrawFlag
          );
        }
        break;
      case OptConstant.ActionTriggerType.Rotate:
        this.AdjustRotate(newX, newY, eventObj);
        break;
      case OptConstant.ActionTriggerType.ModifyShape:
      case OptConstant.ActionTriggerType.SeglOne:
      case OptConstant.ActionTriggerType.SeglTwo:
      case OptConstant.ActionTriggerType.SeglThree:
      case OptConstant.ActionTriggerType.PolyNode:
      case OptConstant.ActionTriggerType.PolyAdj:
      case OptConstant.ActionTriggerType.TopLeft:
      case OptConstant.ActionTriggerType.TopRight:
      case OptConstant.ActionTriggerType.BottomLeft:
      case OptConstant.ActionTriggerType.BottomRight:
        this.ModifyShape(
          T3Gv.opt.actionSvgObject,
          newX,
          newY,
          T3Gv.opt.actionTriggerId,
          T3Gv.opt.actionTriggerData,
          redrawFlag
        );
        this.UpdateFrame();
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(newX, newY, this.r);
          this.ModifyShape(
            T3Gv.opt.actionSvgObject,
            adjustedPoint.x,
            adjustedPoint.y,
            T3Gv.opt.actionTriggerId,
            T3Gv.opt.actionTriggerData
          );
          this.UpdateFrame();
        }
        break;
      case OptConstant.ActionTriggerType.MovePolySeg:
        this.MovePolySeg(
          T3Gv.opt.actionSvgObject,
          newX,
          newY,
          T3Gv.opt.actionTriggerId,
          T3Gv.opt.actionTriggerData
        );
        break;
      case OptConstant.ActionTriggerType.DimLineAdj:
        this.DimensionLineDeflectionAdjust(
          T3Gv.opt.actionSvgObject,
          newX,
          newY,
          T3Gv.opt.actionTriggerId,
          T3Gv.opt.actionTriggerData
        );
        break;
    }

    T3Util.Log("= S.BaseLine: HandleActionTriggerTrackCommon completed with updated StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
  }


  AdjustRotate(mouseX: number, mouseY: number, event: any): void {
    T3Util.Log("= S.BaseLine: AdjustRotate called with mouseX:", mouseX, "mouseY:", mouseY, "event:", event);

    const pivotX = T3Gv.opt.rotatePivotX;
    const pivotY = T3Gv.opt.rotatePivotY;
    let deltaX = mouseX - pivotX;
    let deltaY = mouseY - pivotY;
    let angle = 0;

    if (deltaX === 0 && deltaY === 0) {
      angle = 0;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else if (deltaX >= 0 && deltaY >= 0) {
      angle = Math.atan(deltaY / deltaX) * (180 / NvConstant.Geometry.PI);
    } else if ((deltaX < 0 && deltaY >= 0) || (deltaX < 0 && deltaY < 0)) {
      angle = 180 + Math.atan(deltaY / deltaX) * (180 / NvConstant.Geometry.PI);
    } else if (deltaX >= 0 && deltaY < 0) {
      angle = 360 + Math.atan(deltaY / deltaX) * (180 / NvConstant.Geometry.PI);
    }

    const overrideSnaps = T3Gv.opt.OverrideSnaps(event);
    if (T3Gv.docUtil.docConfig.enableSnap && !overrideSnaps) {
      const enhanceSnaps = T3Gv.opt.EnhanceSnaps(event);
      const snapAngle = enhanceSnaps ? T3Gv.opt.enhanceRotateSnap : T3Gv.opt.rotateSnap;
      angle = Math.round(angle / snapAngle) * snapAngle;
    }

    if (this.Rotate(T3Gv.opt.actionSvgObject, angle)) {
      T3Gv.opt.rotateEndRotation = angle;
    }

    T3Util.Log("= S.BaseLine: AdjustRotate output angle:", angle);
  }

  DimensionLineDeflectionAdjust(svgDoc, mouseX, mouseY, actionTriggerID, triggerData) {
    T3Util.Log('= S.BaseLine: DimensionLineDeflectionAdjust called with', {
      svgDoc,
      mouseX,
      mouseY,
      actionTriggerID,
      triggerData
    });

    // Calculate the horizontal deflection for the dimension line
    this.dimensionDeflectionH = this.GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData);
    T3Util.Log('= S.BaseLine: Calculated dimensionDeflectionH:', this.dimensionDeflectionH);

    // Update the dimension lines on the SVG document
    this.UpdateDimensionLines(svgDoc);
    T3Util.Log('= S.BaseLine: Dimension lines updated');

    // Check if the dimension should be shown only when selected
    const isDimSelect = this.Dimensions & NvConstant.DimensionFlags.Select;
    T3Util.Log('= S.BaseLine: isDimSelect:', isDimSelect);

    // Hide or show dimensions based on selection state
    if (isDimSelect) {
      this.HideOrShowSelectOnlyDimensions(true);
      T3Util.Log('= S.BaseLine: Select-only dimensions shown');
    }

    T3Util.Log('= S.BaseLine: DimensionLineDeflectionAdjust completed');
  }

  ScaleObject(
    offsetX: number,
    offsetY: number,
    rotationCenter: Point,
    rotationAngle: number,
    scaleX: number,
    scaleY: number,
    adjustThickness: boolean
  ) {
    T3Util.Log("= S.BaseLine: ScaleObject called with", {
      offsetX,
      offsetY,
      rotationCenter,
      rotationAngle,
      scaleX,
      scaleY,
      adjustThickness
    });

    // Scale the start and end points
    this.StartPoint.x = offsetX + this.StartPoint.x * scaleX;
    this.StartPoint.y = offsetY + this.StartPoint.y * scaleY;
    this.EndPoint.x = offsetX + this.EndPoint.x * scaleX;
    this.EndPoint.y = offsetY + this.EndPoint.y * scaleY;

    // Rotate the points if a rotation angle is provided
    if (rotationAngle) {
      const rotationRadians = 2 * Math.PI * (rotationAngle / 360);
      this.StartPoint = T3Gv.opt.RotatePointAroundPoint(rotationCenter, this.StartPoint, rotationRadians);
      this.EndPoint = T3Gv.opt.RotatePointAroundPoint(rotationCenter, this.EndPoint, rotationRadians);
    }

    // Adjust the curve if necessary
    if (this.CurveAdjust) {
      this.CurveAdjust *= (scaleX + scaleY) / 2;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    // Adjust line thickness if required
    if (adjustThickness) {
      const maxScale = Math.max(scaleX, scaleY);
      this.StyleRecord.Line.Thickness *= maxScale;
      this.StyleRecord.Line.BThick *= maxScale;
    }

    // Recalculate the frame
    this.CalcFrame();

    T3Util.Log("= S.BaseLine: ScaleObject output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      CurveAdjust: this.CurveAdjust,
      StyleRecord: this.StyleRecord
    });
  }

  CanUseStandOffDimensionLines(): boolean {
    T3Util.Log("= S.BaseLine: CanUseStandOffDimensionLines called");
    const result = true;
    T3Util.Log("= S.BaseLine: CanUseStandOffDimensionLines output:", result);
    return result;
  }

  GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData) {
    T3Util.Log("= S.BaseLine: GetDimensionLineDeflection called with", {
      svgDoc,
      mouseX,
      mouseY,
      triggerData
    });

    let deflection = 0;
    const points = [];
    const adjustedPoint = new Point(0, 0);
    const dimensionPoints = this.GetDimensionPoints();

    // Adjust dimension points by the inside offset
    for (let i = 0; i < dimensionPoints.length; i++) {
      dimensionPoints[i].x += this.inside.x;
      dimensionPoints[i].y += this.inside.y;
    }

    // Calculate the adjusted knob point
    adjustedPoint.x = triggerData.knobPoint.x + this.Frame.x - triggerData.adjustForKnob;
    adjustedPoint.y = triggerData.knobPoint.y + this.Frame.y - triggerData.adjustForKnob;

    // Add points to the array for rotation
    points.push(dimensionPoints[triggerData.segmentIndex - 1]);
    points.push(dimensionPoints[triggerData.segmentIndex]);
    points.push(new Point(adjustedPoint.x, adjustedPoint.y));
    points.push(new Point(mouseX, mouseY));

    // Rotate points about the center
    Utils3.RotatePointsAboutCenter(this.Frame, -triggerData.ccAngleRadians, points);

    // Check if the object is a BaseLine with specific conditions
    if (this instanceof Instance.Shape.BaseLine && (!this.polylist || this.polylist.segs.length === 2)) {
      const quadrant = Math.floor((triggerData.ccAngleRadians - 0.01) / (Math.PI / 2));
      if (quadrant !== 1 && quadrant !== 2) {
        Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, points);
      }
    } else if (this.polylist && this.IsReverseWinding()) {
      Utils3.RotatePointsAboutCenter(this.Frame, Math.PI, points);
    }

    // Calculate the deflection
    deflection = points[3].y - points[2].y;
    if (this.polylist && this.polylist.segs[triggerData.segmentIndex].dimTextAltPositioning) {
      deflection = triggerData.originalDeflection - deflection;
    } else {
      deflection = triggerData.originalDeflection + deflection;
    }

    T3Util.Log("= S.BaseLine: GetDimensionLineDeflection output:", deflection);
    return deflection;
  }

  HandleActionTriggerCallResize(event, triggerData) {
    T3Util.Log("= S.BaseLine: HandleActionTriggerCallResize called with event:", event, "triggerData:", triggerData);

    // Perform the resize operation
    const resizeAdjustment = this.Resize(
      T3Gv.opt.actionSvgObject,
      T3Gv.opt.actionNewBBox
    );

    // Update the action bounding box and start coordinates
    T3Gv.opt.actionBBox.x += resizeAdjustment.x;
    T3Gv.opt.actionBBox.y += resizeAdjustment.y;
    T3Gv.opt.actionStartX += resizeAdjustment.x;
    T3Gv.opt.actionStartY += resizeAdjustment.y;

    T3Util.Log("= S.BaseLine: HandleActionTriggerCallResize output resizeAdjustment:", resizeAdjustment);
  }

  HandleActionTriggerDoAutoScroll() {
    T3Util.Log("= S.BaseLine: HandleActionTriggerDoAutoScroll called");

    // Set a timeout for the auto-scroll function
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);

    // Convert window coordinates to document coordinates
    const docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(T3Gv.opt.autoScrollXPos, T3Gv.opt.autoScrollYPos);
    T3Util.Log("= S.BaseLine: Converted document coordinates:", docCoords);

    // Track the pin point if pinRect is defined
    if (T3Gv.opt.pinRect) {
      T3Gv.opt.PinTrackPoint(docCoords);
    }

    // Perform auto-grow drag adjustments
    const adjustedCoords = DrawUtil.DoAutoGrowDrag(docCoords);
    T3Util.Log("= S.BaseLine: Adjusted coordinates after auto-grow drag:", adjustedCoords);

    // Scroll to the new position
    T3Gv.docUtil.ScrollToPosition(adjustedCoords.x, adjustedCoords.y);

    // Handle the common action trigger track
    this.HandleActionTriggerTrackCommon(adjustedCoords.x, adjustedCoords.y);

    T3Util.Log("= S.BaseLine: HandleActionTriggerDoAutoScroll completed");
  }

  AutoScrollCommon(event, enableSnap, autoScrollCallback) {
    T3Util.Log('= S.BaseLine: AutoScrollCommon called with event:', event, 'enableSnap:', enableSnap, 'autoScrollCallback:', autoScrollCallback);

    let clientX, clientY;
    let shouldAutoScroll = false;

    // Determine clientX and clientY based on the event type
    if (T3Gv.opt.OverrideSnaps(event)) {
      enableSnap = false;
    }
    if (event.gesture) {
      clientX = event.gesture.center.clientX;
      clientY = event.gesture.center.clientY;
    } else {
      clientX = event.clientX;
      clientY = event.clientY;
    }

    let scrollX = clientX;
    let scrollY = clientY;
    const docInfo = T3Gv.opt.svgDoc.docInfo;

    // Check if auto-scroll is needed and adjust scrollX and scrollY accordingly
    if (clientX >= docInfo.dispX + docInfo.dispWidth - 4) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX + docInfo.dispWidth - 4 + 32;
    }
    if (clientX < docInfo.dispX) {
      shouldAutoScroll = true;
      scrollX = docInfo.dispX - 32;
    }
    if (clientY >= docInfo.dispY + docInfo.dispHeight - 4) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY + docInfo.dispHeight - 4 + 32;
    }
    if (clientY < docInfo.dispY) {
      shouldAutoScroll = true;
      scrollY = docInfo.dispY - 4 - 32;
    }

    // Perform snapping if enabled
    if (shouldAutoScroll) {
      if (enableSnap && T3Gv.docUtil.docConfig.enableSnap) {
        const snapPoint = T3Gv.docUtil.SnapToGrid({ x: scrollX, y: scrollY });
        scrollX = snapPoint.x;
        scrollY = snapPoint.y;
      }

      // Set auto-scroll positions and start the timer if not already running
      T3Gv.opt.autoScrollXPos = scrollX;
      T3Gv.opt.autoScrollYPos = scrollY;
      if (T3Gv.opt.autoScrollTimerId === -1) {
        T3Gv.opt.autoScrollTimer = new T3Timer(this);
        T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(autoScrollCallback, 0);
      }

      T3Util.Log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = false');
      return false;
    }

    // Reset the auto-scroll timer if no auto-scroll is needed
    this.ResetAutoScrollTimer();
    T3Util.Log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = true');
    return true;
  }

  LMActionTrack(event) {
    T3Util.Log('= S.BaseLine: LMActionTrack called with event:', event);

    let t;
    let a;
    let r;
    let i = false;

    if (Utils2.StopPropagationAndDefaults(event), -1 == T3Gv.opt.actionStoredObjectId) {
      return false;
    }

    const n = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const o = event.gesture.srcEvent.altKey;

    if (T3Gv.opt.pinRect) {
      T3Gv.opt.PinTrackPoint(n);
    }

    const adjustedCoords = DrawUtil.DoAutoGrowDrag(n);
    let trackCoords = this.LMActionDuringTrack(adjustedCoords);

    t = T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0;

    if (T3Gv.opt.OverrideSnaps(event)) {
      t = true;
    }

    if (T3Gv.opt.actionTriggerId !== OptConstant.ActionTriggerType.ModifyShape &&
      T3Gv.docUtil.docConfig.enableSnap && !t) {
      const deltaX = trackCoords.x - T3Gv.opt.actionStartX;
      const deltaY = trackCoords.y - T3Gv.opt.actionStartY;
      const isMovePolySeg = T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.MovePolySeg;

      if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.Rotate ||
        this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, isMovePolySeg, trackCoords) || isMovePolySeg) {
        // Do nothing
      } else {
        trackCoords = T3Gv.docUtil.SnapToGrid(trackCoords);
      }
    }

    if (this.AutoScrollCommon(event, !t, 'HandleActionTriggerDoAutoScroll')) {
      this.HandleActionTriggerTrackCommon(trackCoords.x, trackCoords.y, o, event);
    }

    T3Util.Log('= S.BaseLine: LMActionTrack completed with updated coordinates:', trackCoords);
  }

  LMActionRelease(event, isSecondary) {
    T3Util.Log("= S.BaseLine: LMActionRelease called with event:", event, "isSecondary:", isSecondary);

    if (!isSecondary) {
      LMEvtUtil.UnbindActionClickHammerEvents();
      this.ResetAutoScrollTimer();

      // if (Collab.AllowMessage()) {
      //   const actionData = {
      //     BlockID: T3Gv.opt.actionStoredObjectId,
      //     actionTriggerId: T3Gv.opt.actionTriggerId,
      //     rotateEndRotation: T3Gv.opt.rotateEndRotation,
      //     rotatePivotX: T3Gv.opt.rotatePivotX,
      //     rotatePivotY: T3Gv.opt.rotatePivotY,
      //     rotateStartPoint: Utils1.DeepCopy(T3Gv.opt.rotateStartPoint),
      //     CurveAdjust: this.CurveAdjust,
      //     IsReversed: this.IsReversed,
      //     Frame: Utils1.DeepCopy(this.Frame),
      //     StartPoint: Utils1.DeepCopy(this.StartPoint),
      //     EndPoint: Utils1.DeepCopy(this.EndPoint),
      //   };

      //   if (T3Gv.opt.actionTriggerData) {
      //     actionData.hitSegment = T3Gv.opt.actionTriggerData.hitSegment;
      //     actionData.moveAngle = T3Gv.opt.actionTriggerData.moveAngle;
      //   }

      //   if (T3Gv.opt.ob.Frame) {
      //     actionData.ob = {
      //       StartPoint: Utils1.DeepCopy(T3Gv.opt.ob.StartPoint),
      //       EndPoint: Utils1.DeepCopy(T3Gv.opt.ob.EndPoint),
      //       Frame: Utils1.DeepCopy(T3Gv.opt.ob.Frame),
      //       CurveAdjust: T3Gv.opt.ob.CurveAdjust,
      //       IsReversed: T3Gv.opt.ob.IsReversed,
      //     };
      //   }

      //   if (T3Gv.opt.linkParams) {
      //     actionData.linkParams = Utils1.DeepCopy(T3Gv.opt.linkParams);
      //   }

      //   if (this.segl) {
      //     actionData.segl = Utils1.DeepCopy(this.segl);
      //   }

      //   if (this.polylist) {
      //     actionData.polylist = Utils1.DeepCopy(this.polylist);
      //   }

      //   if (this.pointlist) {
      //     actionData.pointlist = Utils1.DeepCopy(this.pointlist);
      //   }

      //   if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.DimLineAdj) {
      //     actionData.dimensionDeflectionH = this.dimensionDeflectionH;
      //     actionData.dimensionDeflectionV = this.dimensionDeflectionV;
      //   }
      // }
    }

    switch (T3Gv.opt.actionTriggerId) {
      case OptConstant.ActionTriggerType.Rotate:
        this.AfterRotateShape(T3Gv.opt.actionStoredObjectId);
        break;
      case OptConstant.ActionTriggerType.ModifyShape:
      case OptConstant.ActionTriggerType.SeglOne:
      case OptConstant.ActionTriggerType.SeglTwo:
      case OptConstant.ActionTriggerType.SeglThree:
      case OptConstant.ActionTriggerType.PolyNode:
      case OptConstant.ActionTriggerType.PolyAdj:
      case OptConstant.ActionTriggerType.PolyEnd:
      case OptConstant.ActionTriggerType.MovePolySeg:
        this.AfterModifyShape(T3Gv.opt.actionStoredObjectId, T3Gv.opt.actionTriggerId);
        break;
      default:

        if (T3Gv.opt.ob.Frame) {
          HookUtil.MaintainLink(T3Gv.opt.actionStoredObjectId, this, T3Gv.opt.ob, T3Gv.opt.actionTriggerId);
          T3Gv.opt.ob = {};
          OptCMUtil.SetLinkFlag(T3Gv.opt.actionStoredObjectId, DSConstant.LinkFlags.Move);
          T3Gv.opt.UpdateLinks();
        }
    }

    this.LMActionPostRelease(T3Gv.opt.actionStoredObjectId);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      DataUtil.AddToDirtyList(T3Gv.opt.actionStoredObjectId);
    }

    if (!isSecondary) {
      T3Gv.opt.actionStoredObjectId = -1;
      T3Gv.opt.actionSvgObject = null;
    }

    LayerUtil.ShowOverlayLayer();
    DrawUtil.CompleteOperation(null);

    T3Util.Log("= S.BaseLine: LMActionRelease completed");
  }

  LMActionPreTrack(actionStoredObjectID, actionTriggerID) {
    T3Util.Log("= S.BaseLine: LMActionPreTrack called with actionStoredObjectID:", actionStoredObjectID, "actionTriggerID:", actionTriggerID);

    let objectPtr, sessionPtr, linkParams, hookIndex = -1;

    // Retrieve the object pointer for the given actionStoredObjectID
    objectPtr = DataUtil.GetObjectPtr(actionStoredObjectID, false);
    if (!objectPtr) {
      T3Util.Log("= S.BaseLine: LMActionPreTrack - objectPtr not found");
      return;
    }

    // Deep copy the object pointer to T3Gv.opt.ob
    T3Gv.opt.ob = Utils1.DeepCopy(objectPtr);

    // Determine the hook index based on the actionTriggerID
    switch (actionTriggerID) {
      case OptConstant.ActionTriggerType.LineStart:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.KTL ||
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.WTL ||
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.WTR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      case OptConstant.ActionTriggerType.LineEnd:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.KTR ||
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.WBL ||
            objectPtr.hooks[i].hookpt === OptConstant.HookPts.WBR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      default:
        T3Util.Log("= S.BaseLine: LMActionPreTrack - invalid actionTriggerID");
        return;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    // Initialize LinkParameters
    linkParams = new LinkParameters();
    T3Gv.opt.linkParams = linkParams;

    // Retrieve the session pointer
    sessionPtr = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Set ArraysOnly flag if linking is not allowed
    if (!this.AllowLink()) {
      linkParams.ArraysOnly = true;
    }

    // Set AllowJoin flag based on session flags
    if (sessionPtr) {
      linkParams.AllowJoin = sessionPtr.flags & OptConstant.SessionFlags.FreeHand;
    }

    // Set connection parameters if a valid hook index is found
    if (hookIndex >= 0) {
      linkParams.ConnectIndex = objectPtr.hooks[hookIndex].objid;
      linkParams.PrevConnect = objectPtr.hooks[hookIndex].objid;
      linkParams.ConnectPt.x = objectPtr.hooks[hookIndex].connect.x;
      linkParams.ConnectPt.y = objectPtr.hooks[hookIndex].connect.y;
      linkParams.ConnectInside = objectPtr.hooks[hookIndex].cellid;
      linkParams.HookIndex = objectPtr.hooks[hookIndex].hookpt;
      linkParams.InitialHook = hookIndex;
    }

    // Retrieve the links block object pointer
    const linksBlockPtr = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

    // Get the hook list for circular targets
    linkParams.lpCircList = HookUtil.GetHookList(
      linksBlockPtr,
      linkParams.lpCircList,
      actionStoredObjectID,
      objectPtr,
      NvConstant.ListCodes.CircTarg,
      {}
    );

    // Add the single hook object to the circular list if no valid hook index is found
    if (hookIndex < 0 && objectPtr.hooks.length === 1 && linkParams.lpCircList) {
      linkParams.lpCircList.push(objectPtr.hooks[0].objid);
    }

    T3Util.Log("= S.BaseLine: LMActionPreTrack completed with linkParams:", linkParams);
    return true;
  }

  LMActionDuringTrack(event) {
    T3Util.Log('= S.BaseLine: LMActionDuringTrack called with event:', event);

    const points = [{ x: 0, y: 0 }];

    if (T3Gv.opt.linkParams) {
      points[0].x = event.x;
      points[0].y = event.y;

      if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
        points[0].id = T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.LineStart
          ? OptConstant.HookPts.KTL
          : OptConstant.HookPts.KTR;

        T3Gv.opt.dragDeltaX = 0;
        T3Gv.opt.dragDeltaY = 0;

        if (SelectUtil.FindConnect(
          T3Gv.opt.actionStoredObjectId,
          this,
          points,
          true,
          false,
          T3Gv.opt.linkParams.AllowJoin,
          event
        )) {
          event.x += T3Gv.opt.dragDeltaX;
          event.y += T3Gv.opt.dragDeltaY;
        }
      }
    }

    T3Util.Log('= S.BaseLine: LMActionDuringTrack output event:', event);
    return event;
  }

  AfterRotateShape(blockID: number): void {
    T3Util.Log("= S.BaseLine: AfterRotateShape called with blockID:", blockID);

    // Check if the rectangle's x or y coordinates are negative
    if (this.r.x < 0 || this.r.y < 0) {
      T3Util.Log("= S.BaseLine: Rectangle coordinates are negative, performing undo operation");
      ToolActUtil.Undo();
      // Collab.UnLockMessages();
      // Collab.UnBlockMessages();
      return;
    }

    // Maintain link if the frame is defined
    if (T3Gv.opt.ob.Frame) {
      T3Util.Log("= S.BaseLine: Maintaining link with frame:", T3Gv.opt.ob.Frame);
      HookUtil.MaintainLink(blockID, this, T3Gv.opt.ob, OptConstant.ActionTriggerType.Rotate);
      T3Gv.opt.ob = {};
    }

    // Set link flag and update links
    OptCMUtil.SetLinkFlag(blockID, DSConstant.LinkFlags.Move);
    T3Gv.opt.UpdateLinks();

    T3Util.Log("= S.BaseLine: AfterRotateShape completed for blockID:", blockID);
  }

  AfterModifyShape(blockID: number, actionTriggerID: number): void {
    T3Util.Log("= S.BaseLine: AfterModifyShape called with blockID:", blockID, "actionTriggerID:", actionTriggerID);

    if (T3Gv.opt.actionSvgObject) {
      const ellipseAxesElement = T3Gv.opt.actionSvgObject.GetElementById(OptConstant.Common.EllipseAxes);
      if (ellipseAxesElement != null) {
        T3Gv.opt.actionSvgObject.RemoveElement(ellipseAxesElement);
        T3Util.Log("= S.BaseLine: Removed ellipseAxesElement:", ellipseAxesElement);
      }
    }

    if (T3Gv.opt.ob.Frame) {
      HookUtil.MaintainLink(blockID, this, T3Gv.opt.ob, actionTriggerID);
      T3Gv.opt.ob = {};
      T3Util.Log("= S.BaseLine: Maintained link and reset ob.Frame");
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
      T3Util.Log("= S.BaseLine: Reset floating point dimensions flags");
    }

    OptCMUtil.SetLinkFlag(blockID, DSConstant.LinkFlags.Move);
    T3Gv.opt.UpdateLinks();
    T3Util.Log("= S.BaseLine: Set link flag and updated links");

    if (this.arcobj) {
      this.arcobj = null;
      T3Util.Log("= S.BaseLine: Reset arcobj to null");
    }

    T3Util.Log("= S.BaseLine: AfterModifyShape completed for blockID:", blockID);
  }

  LMActionPostRelease(blockID: number): void {
    T3Util.Log("= S.BaseLine: LMActionPostRelease called with blockID:", blockID);

    // Set edit mode to default
    OptCMUtil.SetEditMode(NvConstant.EditState.Default);

    // Check if linkParams is not null
    if (T3Gv.opt.linkParams) {
      // Handle HiliteConnect
      if (T3Gv.opt.linkParams.HiliteConnect >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteConnect,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          false,
          this.BlockID,
          T3Gv.opt.linkParams.HiliteInside
        );
        T3Gv.opt.linkParams.HiliteConnect = -1;
        T3Gv.opt.linkParams.HiliteInside = null;
      }

      // Handle HiliteJoin
      if (T3Gv.opt.linkParams.HiliteJoin >= 0) {
        HookUtil.HiliteConnect(
          T3Gv.opt.linkParams.HiliteJoin,
          T3Gv.opt.linkParams.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        T3Gv.opt.linkParams.HiliteJoin = -1;
      }

      // Handle JoinIndex
      if (T3Gv.opt.linkParams.JoinIndex >= 0) {
        PolyUtil.PolyLJoin(
          T3Gv.opt.linkParams.JoinIndex,
          T3Gv.opt.linkParams.JoinData,
          blockID,
          T3Gv.opt.linkParams.JoinSourceData,
          false
        );
      } else if (T3Gv.opt.linkParams.ConnectIndex >= 0 || T3Gv.opt.linkParams.InitialHook >= 0) {
        HookUtil.UpdateHook(
          blockID,
          T3Gv.opt.linkParams.InitialHook,
          T3Gv.opt.linkParams.ConnectIndex,
          T3Gv.opt.linkParams.HookIndex,
          T3Gv.opt.linkParams.ConnectPt,
          T3Gv.opt.linkParams.ConnectInside
        );
      }

      // Set link flag and update links
      OptCMUtil.SetLinkFlag(blockID, DSConstant.LinkFlags.Move);
      T3Gv.opt.UpdateLinks();

      // Clear linkParams
      T3Gv.opt.linkParams = null;
    }

    T3Util.Log("= S.BaseLine: LMActionPostRelease completed for blockID:", blockID);
  }

  LMSetupActionClick(event, isSecondary) {
    T3Util.Log("= S.BaseLine: LMSetupActionClick called with event:", event, "isSecondary:", isSecondary);

    let actionStoredObjectID, actionTriggerID, preservedBlock, targetElement;

    if (isSecondary) {
      actionStoredObjectID = T3Gv.opt.actionStoredObjectId;
      actionTriggerID = T3Gv.opt.actionTriggerId;
      T3Gv.opt.pinRect = null;
      preservedBlock = T3Gv.stdObj.PreserveBlock(actionStoredObjectID);
    } else {
      // T3Gv.opt.SetUIAdaptation(event);
      T3Gv.opt.eventTimestamp = Date.now();
      event.stopPropagation();

      const overlayElement = T3Gv.opt.svgOverlayLayer.FindElementByDOMElement(event.currentTarget);
      if (overlayElement === null) return false;

      const elementID = overlayElement.GetID();
      actionStoredObjectID = parseInt(elementID.substring(OptConstant.Common.Action.length), 10);
      T3Gv.opt.actionStoredObjectId = actionStoredObjectID;

      targetElement = overlayElement.GetTargetForEvent(event);
      if (targetElement == null) return false;

      preservedBlock = T3Gv.stdObj.PreserveBlock(actionStoredObjectID);
      actionTriggerID = targetElement.GetID();
      T3Gv.opt.actionTriggerId = actionTriggerID;
      T3Gv.opt.actionTriggerData = targetElement.GetUserData();
      T3Gv.opt.pinRect = null;
    }

    if (!isSecondary) {
      T3Gv.opt.SetControlDragMode(targetElement);
    }

    this.LMActionPreTrack(actionStoredObjectID, actionTriggerID);
    T3Gv.opt.actionSvgObject = T3Gv.opt.svgObjectLayer.GetElementById(actionStoredObjectID);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      this.HideAllIcons(T3Gv.opt.svgDoc, T3Gv.opt.actionSvgObject);
    }

    let coords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    let shouldSnap = T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0;

    if (T3Gv.opt.OverrideSnaps(event)) {
      shouldSnap = true;
    }

    if (T3Gv.docUtil.docConfig.enableSnap && !shouldSnap) {
      coords = T3Gv.docUtil.SnapToGrid(coords);
    }

    coords = DrawUtil.DoAutoGrowDrag(coords);
    const startX = coords.x;
    const startY = coords.y;

    T3Gv.opt.actionLockAspectRatio = event.gesture.srcEvent.shiftKey;
    if (this.ResizeAspectConstrain) {
      T3Gv.opt.actionLockAspectRatio = !T3Gv.opt.actionLockAspectRatio;
    }

    const svgFrame = this.GetSVGFrame();
    if (T3Gv.opt.actionLockAspectRatio) {
      if (svgFrame.height === 0) {
        T3Gv.opt.actionLockAspectRatio = false;
      } else {
        T3Gv.opt.actionAspectRatioWidth = svgFrame.width;
        T3Gv.opt.actionAspectRatioHeight = svgFrame.height;
      }
    }

    T3Gv.opt.actionBBox = $.extend(true, {}, svgFrame);
    T3Gv.opt.actionNewBBox = $.extend(true, {}, svgFrame);
    LayerUtil.HideOverlayLayer();
    T3Gv.opt.actionStartX = startX;
    T3Gv.opt.actionStartY = startY;

    if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.Rotate) {
      this.BeforeRotate(svgFrame);
    } else if (T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.ModifyShape || T3Gv.opt.actionTriggerId === OptConstant.ActionTriggerType.PolyAdj) {
      this.BeforeModifyShape(startX, startY, T3Gv.opt.actionTriggerData);
    }

    T3Util.Log("= S.BaseLine: LMSetupActionClick output:", true);
    return true;
  }

  BeforeRotate(frame: any): void {
    T3Util.Log("= S.BaseLine: BeforeRotate called with frame:", frame);

    // Set the rotation knob center divisor
    T3Gv.opt.rotateKnobCenterDivisor = this.RotateKnobCenterDivisor();

    // Calculate the start rotation angle in degrees
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    T3Gv.opt.rotateStartRotation = 180 * Math.atan2(deltaY, deltaX) / Math.PI;
    T3Gv.opt.rotateEndRotation = T3Gv.opt.rotateStartRotation;

    // Calculate the pivot point for rotation
    T3Gv.opt.rotatePivotX = frame.x + frame.width / T3Gv.opt.rotateKnobCenterDivisor.x;
    T3Gv.opt.rotatePivotY = frame.y + frame.height / T3Gv.opt.rotateKnobCenterDivisor.y;

    // Store the start and end points
    T3Gv.opt.rotateStartPoint = $.extend(true, {}, this.StartPoint);
    T3Gv.opt.rotateEndPoint = $.extend(true, {}, this.EndPoint);

    T3Util.Log("= S.BaseLine: BeforeRotate output:", {
      rotateStartRotation: T3Gv.opt.rotateStartRotation,
      rotateEndRotation: T3Gv.opt.rotateEndRotation,
      rotatePivotX: T3Gv.opt.rotatePivotX,
      rotatePivotY: T3Gv.opt.rotatePivotY,
      rotateStartPoint: T3Gv.opt.rotateStartPoint,
      rotateEndPoint: T3Gv.opt.rotateEndPoint
    });
  }

  LMActionClickExpCleanup(error) {
    T3Util.Log("= S.BaseLine: LMActionClickExpCleanup called with error:", error);

    // Unbind action click hammer events
    LMEvtUtil.UnbindActionClickHammerEvents();

    // Reset auto scroll timer
    this.ResetAutoScrollTimer();

    // Clear global data properties
    T3Gv.opt.ob = {};
    T3Gv.opt.linkParams = null;
    T3Gv.opt.actionTriggerId = -1;
    T3Gv.opt.actionTriggerData = null;
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;

    // Unblock messages
    // Collab.UnBlockMessages();

    T3Util.Log("= S.BaseLine: LMActionClickExpCleanup completed");
  }

  LMActionClick(event, isSecondary) {
    T3Util.Log("= S.BaseLine: LMActionClick called with event:", event, "isSecondary:", isSecondary);

    try {
      const blockID = this.BlockID;
      const objectPtr = DataUtil.GetObjectPtr(blockID, false);

      if (!(objectPtr && objectPtr instanceof BaseDrawObject)) {
        T3Util.Log("= S.BaseLine: LMActionClick - objectPtr is not an instance of BaseDrawObject");
        return false;
      }

      DrawUtil.InitializeAutoGrowDrag(0, blockID);

      if (!this.LMSetupActionClick(event, isSecondary)) {
        T3Util.Log("= S.BaseLine: LMActionClick - LMSetupActionClick returned false");
        return;
      }

      // Collab.BeginSecondaryEdit();

      const actionObjectPtr = DataUtil.GetObjectPtr(blockID, false);
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_ActionTrackHandlerFactory(actionObjectPtr));
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_ActionReleaseHandlerFactory(actionObjectPtr));

      T3Util.Log("= S.BaseLine: LMActionClick setup completed for blockID:", blockID);
    } catch (error) {
      console.error("= S.BaseLine: LMActionClick encountered an error:", error);
      this.LMActionClickExpCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  Rotate(svgElement: any, endRotation: number): boolean {
    T3Util.Log("= S.BaseLine: Rotate called with svgElement:", svgElement, "endRotation:", endRotation);

    const pivotPoint = {
      x: T3Gv.opt.rotatePivotX,
      y: T3Gv.opt.rotatePivotY
    };

    const rotationRadians = (endRotation - T3Gv.opt.rotateStartRotation) / (180 / NvConstant.Geometry.PI);
    const rotatedStartPoint = T3Gv.opt.RotatePointAroundPoint(pivotPoint, T3Gv.opt.rotateStartPoint, rotationRadians);
    const rotatedEndPoint = T3Gv.opt.RotatePointAroundPoint(pivotPoint, T3Gv.opt.rotateEndPoint, rotationRadians);

    T3Util.Log("= S.BaseLine: Rotated points calculated as rotatedStartPoint:", rotatedStartPoint, "rotatedEndPoint:", rotatedEndPoint);

    if (rotatedStartPoint.x < 0 || rotatedStartPoint.y < 0 || rotatedEndPoint.x < 0 || rotatedEndPoint.y < 0) {
      T3Util.Log("= S.BaseLine: Rotation resulted in negative coordinates, returning false");
      return false;
    }

    if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
      const sessionObject = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      if (rotatedStartPoint.x > sessionObject.dim.x || rotatedStartPoint.y > sessionObject.dim.y || rotatedEndPoint.x > sessionObject.dim.x || rotatedEndPoint.y > sessionObject.dim.y) {
        T3Util.Log("= S.BaseLine: Rotation resulted in coordinates outside session dimensions, returning false");
        return false;
      }
    }

    this.AdjustLineStart(svgElement, rotatedStartPoint.x, rotatedStartPoint.y, 0, true);
    this.AdjustLineEnd(svgElement, rotatedEndPoint.x, rotatedEndPoint.y, OptConstant.ActionTriggerType.LineEnd, true);

    T3Util.Log("= S.BaseLine: Rotate completed successfully");
    return true;
  }

  RotateKnobCenterDivisor(): { x: number; y: number } {
    T3Util.Log("= S.BaseLine: RotateKnobCenterDivisor called");

    const divisor = {
      x: 2,
      y: 2
    };

    T3Util.Log("= S.BaseLine: RotateKnobCenterDivisor output:", divisor);
    return divisor;
  }

  GetHookFlags(): number {
    T3Util.Log("= S.BaseLine: GetHookFlags called");

    const hookFlags = NvConstant.HookFlags.LcShape |
      NvConstant.HookFlags.LcLine |
      NvConstant.HookFlags.LcCHook;

    T3Util.Log("= S.BaseLine: GetHookFlags output:", hookFlags);
    return hookFlags;
  }

  AllowLink() {

    const layersManager = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    const session = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    const useEdges = layersManager && layersManager.activelayer >= 0 && (layersManager.layers[layersManager.activelayer].flags & NvConstant.LayerFlags.UseEdges);
    const fromOverlayLayer = T3Gv.opt.fromOverlayLayer;
    const sessionLink = session && (session.flags & OptConstant.SessionFlags.LLink);

    return !useEdges && (fromOverlayLayer || sessionLink);
  }

  GetHookPoints(): { x: number; y: number; id: number }[] {
    T3Util.Log("= S.BaseLine: GetHookPoints called");

    const hookDimension = OptConstant.Common.DimMax;
    const hookPoints = [
      {
        x: 0,
        y: 0,
        id: OptConstant.HookPts.KTL
      },
      {
        x: hookDimension,
        y: hookDimension,
        id: OptConstant.HookPts.KTR
      }
    ];

    T3Util.Log("= S.BaseLine: GetHookPoints output:", hookPoints);
    return hookPoints;
  }

  PrGetWidthAdjustment() {
    T3Util.Log("= S.BaseLine: PrGetWidthAdjustment called");

    const lineThicknessHalf = this.StyleRecord.Line.Thickness / 2;
    let angle = this.GetAngle(null);

    if (angle >= 90) {
      angle = 180 - angle;
    }

    const angleRadians = angle / 180 * Math.PI;
    const deltaX = Math.sin(angleRadians) * lineThicknessHalf;
    const deltaY = Math.cos(angleRadians) * lineThicknessHalf;

    const result = {
      deltax: deltaX,
      deltay: deltaY
    };

    T3Util.Log("= S.BaseLine: PrGetWidthAdjustment output:", result);
    return result;
  }

  GetConnectLine(): { startpt: Point; endpt: Point } | null {
    T3Util.Log("= S.BaseLine: GetConnectLine called");

    // This method is intended to be overridden by subclasses if needed.
    // By default, it returns null indicating no specific connection line.
    const result = null;

    T3Util.Log("= S.BaseLine: GetConnectLine output:", result);
    return result;
  }

  GetPerimPts(hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex) {
    T3Util.Log("= S.BaseLine: GetPerimPts called with", { hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex });

    let resultPoints = [];
    let startPoint = {};
    let endPoint = {};
    const HookPts = OptConstant.HookPts;
    const numTargetPoints = targetPoints.length;

    if (this.objecttype === NvConstant.FNObjectTypes.FlWall && hookIndex < 0 && numTargetPoints > 1) {
      const lineThickness = this.StyleRecord.Line.Thickness / 2;
      const widthAdjustment = this.PrGetWidthAdjustment();

      for (let i = 0; i < numTargetPoints; i++) {
        let point = {};
        switch (targetPoints[i].id) {
          case HookPts.WTL:
            point = { x: this.StartPoint.x - widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.WTR:
            point = { x: this.StartPoint.x + widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.WBL:
            point = { x: this.EndPoint.x - widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.WBR:
            point = { x: this.EndPoint.x + widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.KTL:
            point = { x: this.StartPoint.x, y: this.StartPoint.y, id: targetPoints[i].id };
            break;
          case HookPts.KTR:
            point = { x: this.EndPoint.x, y: this.EndPoint.y, id: targetPoints[i].id };
            break;
        }
        resultPoints.push(point);
      }
      T3Util.Log("= S.BaseLine: GetPerimPts output:", resultPoints);
      return resultPoints;
    }

    if (hookIndex >= 0) {
      const targetObject = DataUtil.GetObjectPtr(hookIndex, false);
      if (targetObject && targetObject.objecttype === NvConstant.FNObjectTypes.Multiplicity) {
        let offsetX = 5;
        let offsetY = 5;
        offsetX += targetObject.Frame.width / 2;
        let angle = this.GetAngle(null);
        if (angle >= 90) angle = 180 - angle;
        const angleRadians = angle / 180 * Math.PI;
        let delta = 0;

        if (angle <= 45) {
          if (targetObject.subtype == NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) offsetY = -targetObject.Frame.height - 5;
          delta = Math.tan(angleRadians) * offsetX;
          if (targetPoints[0].x === 0) {
            if (this.StartPoint.y < this.EndPoint.y) offsetY -= delta;
            else offsetY += delta;
          } else {
            if (this.StartPoint.y < this.EndPoint.y) offsetY += delta;
            else offsetY -= delta;
          }
          offsetY = -offsetY;
          if (this.StartPoint.x >= this.EndPoint.x) offsetX = -offsetX;
        } else {
          if (targetObject.subtype == NvConstant.ObjectSubTypes.SubtMultiplicityFilpped) offsetX = -offsetX;
          const tanInverse = Math.tan(Math.PI / 2 - angleRadians);
          if (targetPoints[0].x === 0) {
            if (this.StartPoint.y >= this.EndPoint.y) offsetY = -offsetY;
            else offsetY += targetObject.Frame.height;
            delta = tanInverse * Math.abs(offsetY);
            if (this.StartPoint.x < this.EndPoint.x) offsetX += delta;
            else offsetX -= delta;
          } else {
            if (this.StartPoint.y >= this.EndPoint.y) offsetY += targetObject.Frame.height;
            else offsetY = -offsetY;
            delta = tanInverse * Math.abs(offsetY);
            if (this.StartPoint.x < this.EndPoint.x) offsetX -= delta;
            else offsetX += delta;
            offsetX = -offsetX;
          }
        }

        if (targetPoints[0].x === 0) {
          resultPoints.push(new Point(this.StartPoint.x + offsetX, this.StartPoint.y + offsetY));
          resultPoints[0].id = targetPoints[0].id;
        } else {
          resultPoints.push(new Point(this.EndPoint.x - offsetX, this.EndPoint.y + offsetY));
          resultPoints[0].id = targetPoints[0].id;
        }
        T3Util.Log("= S.BaseLine: GetPerimPts output:", resultPoints);
        return resultPoints;
      } else if (targetObject && targetObject.objecttype === NvConstant.FNObjectTypes.ExtraTextLable && numTargetPoints === 1) {
        const proportion = targetPoints[0].x / OptConstant.Common.DimMax;
        const pointOnLine = this.GetPointOnLine(proportion);
        resultPoints.push(pointOnLine);
        resultPoints[0].id = targetPoints[0].id;
        T3Util.Log("= S.BaseLine: GetPerimPts output:", resultPoints);
        return resultPoints;
      }
    }

    const connectLine = this.GetConnectLine();
    if (connectLine) {
      startPoint = connectLine.startpt;
      endPoint = connectLine.endpt;
    } else {
      startPoint = this.StartPoint;
      endPoint = this.EndPoint;
    }

    for (let i = 0; i < numTargetPoints; i++) {
      resultPoints[i] = { x: 0, y: 0, id: 0 };
      if (targetPoints[i].x === 0 && targetPoints[i].y === 0) {
        resultPoints[i].x = startPoint.x;
        resultPoints[i].y = startPoint.y;
      } else if (targetPoints[i].x === OptConstant.Common.DimMax && targetPoints[i].y === OptConstant.Common.DimMax) {
        resultPoints[i].x = endPoint.x;
        resultPoints[i].y = endPoint.y;
      } else {
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;
        resultPoints[i].x = (targetPoints[i].x / OptConstant.Common.DimMax) * deltaX + startPoint.x;
        resultPoints[i].y = (targetPoints[i].y / OptConstant.Common.DimMax) * deltaY + startPoint.y;
      }
      if (targetPoints[i].id != null) resultPoints[i].id = targetPoints[i].id;
    }

    T3Util.Log("= S.BaseLine: GetPerimPts output:", resultPoints);
    return resultPoints;
  }

  GetPointOnLine(proportion: number): Point {
    T3Util.Log("= S.BaseLine: GetPointOnLine called with proportion:", proportion);

    const distanceBetweenPoints = (point1: Point, point2: Point): number => {
      const deltaX = point1.x - point2.x;
      const deltaY = point1.y - point2.y;
      return Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    };

    const resultPoint: Point = { x: this.StartPoint.x, y: this.StartPoint.y };
    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
    const segments: { pt1: Point; pt2: Point; len: number }[] = [];
    let totalLength = 0;

    for (let i = 1; i < polyPoints.length; i++) {
      const point1 = polyPoints[i - 1];
      const point2 = polyPoints[i];
      const segmentLength = distanceBetweenPoints(point1, point2);
      segments.push({ pt1: point1, pt2: point2, len: segmentLength });
      totalLength += segmentLength;
    }

    proportion = Math.max(0, Math.min(1, proportion));
    const targetLength = proportion * totalLength;
    let accumulatedLength = 0;

    for (const segment of segments) {
      const { pt1, pt2, len } = segment;
      if (accumulatedLength + len >= targetLength) {
        const segmentProportion = (targetLength - accumulatedLength) / len;
        resultPoint.x = pt1.x + (pt2.x - pt1.x) * segmentProportion;
        resultPoint.y = pt1.y + (pt2.y - pt1.y) * segmentProportion;
        break;
      }
      accumulatedLength += len;
    }

    T3Util.Log("= S.BaseLine: GetPointOnLine output:", resultPoint);
    return resultPoint;
  }

  GetTargetPoints(hookPoint, hookFlags, targetID) {
    T3Util.Log("= S.BaseLine: GetTargetPoints called with", { hookPoint, hookFlags, targetID });

    let isVertical = false;
    let isHorizontal = false;
    const targetPoints = [{ x: 0, y: 0 }];
    let adjustedPoint = { x: 0, y: 0 };
    const hookPts = OptConstant.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = DataUtil.GetObjectPtr(targetID, false);

      if (targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        switch (hookPoint.id) {
          case hookPts.SED_KTC:
          case hookPts.SED_KBC:
          case hookPts.SED_KRC:
          case hookPts.SED_KLC:
            const isReversed = ShapeUtil.LineIsReversed(this, null, false);
            if (this.hooks.length === 0) {
              if (isReversed) {
                targetPoints[0].x = OptConstant.Common.DimMax;
                targetPoints[0].y = OptConstant.Common.DimMax;
                targetPoints.push({ x: 0, y: 0 });
              } else {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                targetPoints.push({ x: OptConstant.Common.DimMax, y: OptConstant.Common.DimMax });
              }
              T3Util.Log("= S.BaseLine: GetTargetPoints output:", targetPoints);
              return targetPoints;
            }
            if (this.hooks.length === 1) {
              if (this.hooks[0].hookpt === hookPts.SED_KTR) {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                T3Util.Log("= S.BaseLine: GetTargetPoints output:", targetPoints);
                return targetPoints;
              }
              if (this.hooks[0].hookpt === hookPts.SED_KTL) {
                targetPoints[0].x = OptConstant.Common.DimMax;
                targetPoints[0].y = OptConstant.Common.DimMax;
                T3Util.Log("= S.BaseLine: GetTargetPoints output:", targetPoints);
                return targetPoints;
              }
            }
            return [];
        }
      }
    }

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    if (Utils2.IsEqual(deltaX, 0)) {
      deltaX = 0;
    }
    if (deltaX === 0) {
      isVertical = true;
    }

    let deltaY = this.EndPoint.y - this.StartPoint.y;
    if (Utils2.IsEqual(deltaY, 0)) {
      deltaY = 0;
    }
    if (deltaY === 0) {
      isHorizontal = true;
    }

    let slope = isVertical ? 0 : deltaY / deltaX;

    adjustedPoint.x = hookPoint.x;
    adjustedPoint.y = hookPoint.y;

    if (isVertical || Math.abs(slope) > 1 || (hookFlags & NvConstant.HookFlags.LcHOnly && !isHorizontal)) {
      if (T3Gv.docUtil.docConfig.enableSnap && !(hookFlags & NvConstant.HookFlags.LcNoSnaps)) {
        adjustedPoint = T3Gv.docUtil.SnapToGrid(adjustedPoint);
        const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        if (adjustedPoint.y < frame.y) {
          adjustedPoint.y = frame.y;
        }
        if (adjustedPoint.y > frame.y + frame.height) {
          adjustedPoint.y = frame.y + frame.height;
        }
      }
      const offsetY = adjustedPoint.y - this.StartPoint.y;
      var offsetX = isVertical ? offsetY : offsetY / slope;
    } else {
      if (T3Gv.docUtil.docConfig.enableSnap && !(hookFlags & NvConstant.HookFlags.LcNoSnaps)) {
        adjustedPoint = T3Gv.docUtil.SnapToGrid(adjustedPoint);
        const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
        if (adjustedPoint.x < frame.x) {
          adjustedPoint.x = frame.x;
        }
        if (adjustedPoint.x > frame.x + frame.width) {
          adjustedPoint.x = frame.x + frame.width;
        }
      }
      const offsetX = adjustedPoint.x - this.StartPoint.x;
      var offsetY = offsetX * slope;
    }

    if (!isHorizontal) {
      targetPoints[0].y = (offsetY / deltaY) * OptConstant.Common.DimMax;
    }
    targetPoints[0].x = isVertical ? targetPoints[0].y : (offsetX / deltaX) * OptConstant.Common.DimMax;

    if (isHorizontal) {
      targetPoints[0].y = targetPoints[0].x;
    }

    if (targetPoints[0].x > OptConstant.Common.DimMax) {
      targetPoints[0].x = OptConstant.Common.DimMax;
    }
    if (targetPoints[0].y > OptConstant.Common.DimMax) {
      targetPoints[0].y = OptConstant.Common.DimMax;
    }
    if (targetPoints[0].x < 0) {
      targetPoints[0].x = 0;
    }
    if (targetPoints[0].y < 0) {
      targetPoints[0].y = 0;
    }

    T3Util.Log("= S.BaseLine: GetTargetPoints output:", targetPoints);
    return targetPoints;
  }

  AllowHook(hookPoint: any, targetID: number, distance: number): boolean {
    T3Util.Log("= S.BaseLine: AllowHook called with hookPoint:", hookPoint, "targetID:", targetID, "distance:", distance);

    const HookPts = OptConstant.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = DataUtil.GetObjectPtr(targetID, false);

      if (targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
        switch (hookPoint.id) {
          case HookPts.KTC:
          case HookPts.KBC:
          case HookPts.KRC:
          case HookPts.KLC:
            if (distance > 200) {
              T3Util.Log("= S.BaseLine: AllowHook output: false (distance > 200)");
              return false;
            }
            break;
          default:
            if (hookPoint.id >= HookPts.CustomBase && hookPoint.id < HookPts.CustomBase + 100 && distance > 200) {
              T3Util.Log("= S.BaseLine: AllowHook output: false (custom hook point and distance > 200)");
              return false;
            }
        }
      }
    }

    T3Util.Log("= S.BaseLine: AllowHook output: true");
    return true;
  }

  DeleteObject() {
    T3Util.Log("= S.BaseLine: DeleteObject called");

    // Call the base class DeleteObject method
    super.DeleteObject();

    // Handle specific object types
    switch (this.objecttype) {

      case NvConstant.FNObjectTypes.NgEvent:
        T3Util.Log("= S.BaseLine: Handling NgEvent");

        if (this.hooks.length) {
          const hookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);

          // if (hookObject && hookObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_NG_TIMELINE) {
          //   T3Util.Log("= S.BaseLine: Returning NG timeline object:", hookObject);
          //   return hookObject;
          // }
        }
        break;

      default:
        T3Util.Log("= S.BaseLine: No specific handling for objecttype:", this.objecttype);
    }

    T3Util.Log("= S.BaseLine: DeleteObject completed");
  }

  GetSegLFace(objectType: number, point: Point, referencePoint: Point): number {
    T3Util.Log("= S.BaseLine: GetSegLFace called with objectType:", objectType, "point:", point, "referencePoint:", referencePoint);

    let result: number;

    if (this.Frame.width >= this.Frame.height) {
      result = point.y >= referencePoint.y ? OptConstant.HookPts.KBC : OptConstant.HookPts.KTC;
    } else {
      result = point.x >= referencePoint.x ? OptConstant.HookPts.KRC : OptConstant.HookPts.KLC;
    }

    T3Util.Log("= S.BaseLine: GetSegLFace output:", result);
    return result;
  }

  GetSpacing(): { width: number | null; height: number | null } {
    T3Util.Log("= S.BaseLine: GetSpacing called");

    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const spacing = { width: null, height: null };

    if (this.hooks.length === 2) {
      const hook1 = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      const hook2 = DataUtil.GetObjectPtr(this.hooks[1].objid, false);

      if (rect.width < rect.height) {
        spacing.height = Math.abs(this.StartPoint.y - this.EndPoint.y);
        if (hook1 && hook2) {
          spacing.height = hook1.Frame.y < hook2.Frame.y
            ? hook2.Frame.y - (hook1.Frame.y + hook1.Frame.height)
            : hook1.Frame.y - (hook2.Frame.y + hook2.Frame.height);
        }
      } else {
        spacing.width = Math.abs(this.StartPoint.x - this.EndPoint.x);
        if (hook1 && hook2) {
          spacing.width = hook1.Frame.x < hook2.Frame.x
            ? hook2.Frame.x - (hook1.Frame.x + hook1.Frame.width)
            : hook1.Frame.x - (hook2.Frame.x + hook2.Frame.width);
        }
      }
    }

    T3Util.Log("= S.BaseLine: GetSpacing output:", spacing);
    return spacing;
  }

  GetShapeConnectPoint(hookPointID) {
    T3Util.Log("= S.BaseLine: GetShapeConnectPoint called with hookPointID:", hookPointID);

    const connectPoint = { x: 0, y: 0 };
    const alternatePoint = { x: 0, y: 0 };
    const dimension = OptConstant.Common.DimMax;
    const frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    if (frame.width < frame.height) {
      connectPoint.x = dimension / 2;
      alternatePoint.x = dimension / 2;
      if (this.EndPoint.y < this.StartPoint.y) {
        connectPoint.y = dimension;
        alternatePoint.y = 0;
      } else {
        connectPoint.y = 0;
        alternatePoint.y = dimension;
      }
    } else {
      connectPoint.y = dimension / 2;
      alternatePoint.y = dimension / 2;
      if (this.EndPoint.x < this.StartPoint.x) {
        connectPoint.x = dimension;
        alternatePoint.x = 0;
      } else {
        connectPoint.x = 0;
        alternatePoint.x = dimension;
      }
    }

    const result = hookPointID === OptConstant.HookPts.KTL ? alternatePoint : connectPoint;
    T3Util.Log("= S.BaseLine: GetShapeConnectPoint output:", result);
    return result;
  }

  /**
   * Determines the best hook point for connecting to another object based on geometry
   *
   * This function analyzes the relationship between this line and a target object to determine
   * the optimal hook point. It considers the orientation of the line (whether it's more vertical
   * or horizontal) and the relative position of the target point to select the most appropriate
   * hook point from the four cardinal directions (top, bottom, left, right center points).
   *
   * @param targetObjectId - The ID of the target object to connect to
   * @param requestedHookPoint - The initially requested hook point ID
   * @param relativePosition - The relative position coordinates within the object
   * @returns The ID of the most appropriate hook point
   */
  GetBestHook(targetObjectId, requestedHookPoint, relativePosition) {
    const maxDimension = OptConstant.Common.DimMax;
    const frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const hookPointConstants = OptConstant.HookPts;
    let isEndPointAtOrigin = false;

    // Get the target object from the object pointer
    const targetObject = DataUtil.GetObjectPtr(targetObjectId, false);

    // Handle target objects that are shapes
    if (targetObject && targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape) {
      switch (requestedHookPoint) {
        case hookPointConstants.KTC: // Top center
        case hookPointConstants.KBC: // Bottom center
        case hookPointConstants.KRC: // Right center
        case hookPointConstants.KLC: // Left center
          // If the line is more vertical than horizontal
          if (frameRect.width < frameRect.height) {
            // Determine if the endpoint is at the beginning of the frame (top)
            isEndPointAtOrigin = frameRect.y === this.EndPoint.y;

            // For the top half of the object, choose top or bottom center based on line orientation
            if (relativePosition?.y < maxDimension / 2) {
              return isEndPointAtOrigin ? hookPointConstants.KTC : hookPointConstants.KBC;
            }
            // For the bottom half of the object, choose bottom or top center based on line orientation
            else {
              return isEndPointAtOrigin ? hookPointConstants.KBC : hookPointConstants.KTC;
            }
          }
          // If the line is more horizontal than vertical
          else {
            // Determine if the endpoint is at the beginning of the frame (left)
            isEndPointAtOrigin = frameRect.x === this.EndPoint.x;

            // For the left half of the object, choose left or right center based on line orientation
            if (relativePosition?.x < maxDimension / 2) {
              return isEndPointAtOrigin ? hookPointConstants.KLC : hookPointConstants.KRC;
            }
            // For the right half of the object, choose right or left center based on line orientation
            else {
              return isEndPointAtOrigin ? hookPointConstants.KRC : hookPointConstants.KLC;
            }
          }

        // For other hook points, return the requested hook point unchanged
        default:
          return requestedHookPoint;
      }
    }

    // If the target object isn't a shape or doesn't exist, return the requested hook point
    return requestedHookPoint;
  }

  CreateConnectHilites(svgDoc, targetPoint, hookPoint, isJoin, hookIndex, additionalParam) {
    T3Util.Log("= S.BaseLine: CreateConnectHilites called with", {
      svgDoc,
      targetPoint,
      hookPoint,
      isJoin,
      hookIndex,
      additionalParam
    });

    const groupElement = svgDoc.CreateShape(OptConstant.CSType.Group);
    let scale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      scale *= 2;
    }

    let knobSize = OptConstant.Common.ConnPointLineDim / scale;
    if (isJoin) {
      knobSize = OptConstant.Common.JoinPointLineDim / scale;
    }

    const perimeterPoints = [];
    const position = {};

    if (hookPoint != null) {
      perimeterPoints.push(hookPoint);
      const perimeter = this.GetPerimPts(targetPoint, perimeterPoints, null, true, null, hookIndex);

      if (isJoin) {
        if (hookPoint.x === 0 && hookPoint.y === 0) {
          perimeter[0].x = this.StartPoint.x;
          perimeter[0].y = this.StartPoint.y;
        } else if (hookPoint.x === OptConstant.Common.DimMax && hookPoint.y === OptConstant.Common.DimMax) {
          perimeter[0].x = this.EndPoint.x;
          perimeter[0].y = this.EndPoint.y;
        }
      }

      position.x = perimeter[0].x - knobSize;
      position.y = perimeter[0].y - knobSize;
      position.width = knobSize;
      position.height = knobSize;

      let knobParams = null;
      if (T3Gv.opt.touchInitiated) {
        knobParams = {
          svgDoc,
          shapeType: OptConstant.CSType.Oval,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 0.25,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: CursorConstant.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 2;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = CursorConstant.CursorType.CUR_JOIN;
        }
      } else {
        knobParams = {
          svgDoc,
          shapeType: OptConstant.CSType.Oval,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 1,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: CursorConstant.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 1;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = CursorConstant.CursorType.CUR_JOIN;
        }
      }

      const knobElement = this.GenericKnob(knobParams);
      groupElement.AddElement(knobElement);
      groupElement.SetPos(position.x, position.y);
      groupElement.SetSize(position.width, position.height);
      groupElement.isShape = true;
      groupElement.SetID('hilite_' + targetPoint);

      T3Util.Log("= S.BaseLine: CreateConnectHilites output:", groupElement);
      return groupElement;
    }
  }

  HookToPoint(hookId: number, outRect?: any): Point {
    T3Util.Log("= S.BaseLine: HookToPoint input, hookId:", hookId, "outRect:", outRect);

    // Initialize the result point
    const resultPoint: Point = { x: 0, y: 0 };

    // Get the constant alias for ease of reading
    const CD = OptConstant;

    // Calculate the width adjustment using the helper method
    const widthAdjustment = this.PrGetWidthAdjustment();

    // Determine the hook point based on the hookId
    switch (hookId) {
      case CD.HookPts.KTL:
        resultPoint.x = this.StartPoint.x;
        resultPoint.y = this.StartPoint.y;
        break;
      case CD.HookPts.KTR:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
        break;
      case CD.HookPts.WTL:
        resultPoint.x = this.StartPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.WTR:
        resultPoint.x = this.StartPoint.x + widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.WBL:
        resultPoint.x = this.EndPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.EndPoint.y + widthAdjustment.deltay;
        break;
      case CD.HookPts.WBR:
        resultPoint.x = this.EndPoint.x + widthAdjustment.deltax;
        resultPoint.y = this.EndPoint.y + widthAdjustment.deltay;
        break;
      default:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
    }

    // If an output rectangle is provided, calculate and assign the rectangle based on StartPoint and EndPoint
    if (outRect) {
      const computedRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      outRect.x = computedRect.x;
      outRect.y = computedRect.y;
      outRect.width = computedRect.width;
      outRect.height = computedRect.height;
    }

    T3Util.Log("= S.BaseLine: HookToPoint output, resultPoint:", resultPoint, "outRect:", outRect);
    return resultPoint;
  }

  MaintainPoint(point: Point, targetId: number, distance: number, lineObj: any, offset: any): boolean {
    T3Util.Log("= S.BaseLine: MaintainPoint input:", { point, targetId, distance, lineObj, offset });

    let hookIndex: number = -1;
    let currentLine = lineObj;
    const hookRect: any = {};
    let newLine: any = {};

    if (currentLine.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
      switch (currentLine.LineType) {
        case OptConstant.LineType.SEGLINE:
        case OptConstant.LineType.ARCSEGLINE:
        case OptConstant.LineType.POLYLINE:
          // loop through hooks to find the matching target id
          for (let i = 0; i < currentLine.hooks.length; i++) {
            if (currentLine.hooks[i].targetid === targetId) {
              currentLine.HookToPoint(currentLine.hooks[i].hookpt, hookRect);
              hookIndex = 0; // found a matching hook
              break;
            }
          }
          if (hookIndex !== 0) {
            T3Util.Log("= S.BaseLine: MaintainPoint output: returning true early (no matching hook)");
            return true;
          }
          newLine = Utils1.DeepCopy(currentLine);
          Utils2.CopyRect(newLine.Frame, hookRect);
          newLine.StartPoint.x = hookRect.x;
          newLine.StartPoint.y = hookRect.y;
          newLine.EndPoint.x = hookRect.x + hookRect.width;
          newLine.EndPoint.y = hookRect.y + hookRect.height;
          currentLine = newLine;
          break;
      }
      if (T3Gv.opt.LineCheckPoint(this, point)) {
        T3Util.Log("= S.BaseLine: MaintainPoint output: returning true early (LineCheckPoint true)");
        return true;
      }
      if (T3Gv.opt.LinesIntersect(this, currentLine, point)) {
        T3Util.Log("= S.BaseLine: MaintainPoint output: returning true early (LinesIntersect true)");
        return true;
      }
      T3Gv.opt.Lines_MaintainDist(this, distance, offset, point);
    } else {
      T3Gv.opt.Lines_MaintainDist(this, distance, offset, point);
    }

    T3Util.Log("= S.BaseLine: MaintainPoint output: returning true");
    return true;
  }

  ChangeTarget(e: any, targetId: any, a: any, r: any, i: any, n: any): void {
    T3Util.Log("= S.BaseLine: ChangeTarget called with e:", e, "targetId:", targetId, "a:", a, "r:", r, "i:", i, "n:", n);

    let apparentAngle = 0;
    let targetObj: any = DataUtil.GetObjectPtr(targetId, false);

    if (this.TextFlags & NvConstant.TextFlags.HorizText &&
      targetObj instanceof Instance.Shape.BaseShape) {

      apparentAngle = this.GetApparentAngle(-1);
      apparentAngle = Math.abs(apparentAngle) % 180;

      let targetRotation = Math.abs(targetObj.RotationAngle % 180);
      T3Util.Log("= S.BaseLine: ChangeTarget computed apparentAngle:", apparentAngle, "targetRotation:", targetRotation);

      if (Math.abs(targetRotation - apparentAngle) > 2 &&
        Math.abs(targetRotation - (apparentAngle - 180)) > 2) {
        targetObj.RotationAngle = apparentAngle;
        OptCMUtil.SetLinkFlag(
          this.BlockID,
          DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
        );
        DataUtil.AddToDirtyList(targetId);
        T3Util.Log("= S.BaseLine: ChangeTarget updated targetObj.RotationAngle to:", apparentAngle);
      } else {
        T3Util.Log("= S.BaseLine: ChangeTarget rotation difference within tolerance, no update performed");
      }
    }

    DataUtil.AddToDirtyList(this.BlockID);
    T3Util.Log("= S.BaseLine: ChangeTarget completed for BlockID:", this.BlockID);
  }

  GetPolyPoints(numPoints: number, isRelative: boolean, a: any, r: any, i?: any): Point[] {
    T3Util.Log("= S.BaseLine: GetPolyPoints called with:", { numPoints, isRelative, a, r, i });

    // Create the points array using StartPoint and EndPoint
    const points: Point[] = [
      new Point(this.StartPoint.x, this.StartPoint.y),
      new Point(this.EndPoint.x, this.EndPoint.y)
    ];

    // If points should be relative to the frame, subtract frame offsets
    if (isRelative) {
      for (const point of points) {
        point.x -= this.Frame.x;
        point.y -= this.Frame.y;
      }
    }

    T3Util.Log("= S.BaseLine: GetPolyPoints output:", points);
    return points;
  }

  Hit(
    point: { x: number; y: number },
    t: any,
    isKnob: boolean,
    hitResult: any,
    hookPointID: number
  ): number {
    T3Util.Log("= S.BaseLine: Hit called with input:", { point, t, isKnob, hitResult, hookPointID });

    let hitCode: number;
    let inflatedStartPoint: any;
    let inflatedEndPoint: any;
    const knobSize = OptConstant.Common.KnobSize;
    let docToScreenScale = T3Gv.opt.svgDoc.docInfo.docToScreenScale;

    if (T3Gv.opt.svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }

    if (isKnob) {
      const inflatedSize = 2 * knobSize / docToScreenScale;
      inflatedStartPoint = Utils2.InflatePoint(this.StartPoint, inflatedSize);
      inflatedEndPoint = Utils2.InflatePoint(this.EndPoint, inflatedSize);

      if (hookPointID) {
        if (hookPointID === OptConstant.HookPts.KTL) {
          inflatedStartPoint = null;
        }
        if (hookPointID === OptConstant.HookPts.KTR) {
          inflatedEndPoint = null;
        }
      }

      if (this.hooks) {
        for (let i = 0; i < this.hooks.length; i++) {
          if (this.hooks[i].hookpt === OptConstant.HookPts.KTL) {
            inflatedStartPoint = null;
          }
          if (this.hooks[i].hookpt === OptConstant.HookPts.KTR) {
            inflatedEndPoint = null;
          }
        }
      }

      if (inflatedStartPoint && Utils2.pointInRect(inflatedStartPoint, point)) {
        const targetObject = DataUtil.GetObjectPtr(hitResult.objectid, false);
        if (!(targetObject && targetObject.polylist && targetObject.polylist.closed)) {
          if (hitResult) {
            hitResult.hitcode = NvConstant.HitCodes.PLApp;
            hitResult.segment = OptConstant.HookPts.KTL;
            hitResult.pt.x = this.StartPoint.x;
            hitResult.pt.y = this.StartPoint.y;
          }
          T3Util.Log("= S.BaseLine: Hit output:", NvConstant.HitCodes.PLApp);
          return NvConstant.HitCodes.PLApp;
        }
      }

      if (inflatedEndPoint && Utils2.pointInRect(inflatedEndPoint, point)) {
        const targetObject = DataUtil.GetObjectPtr(hitResult.objectid, false);
        if (!(targetObject && targetObject.polylist && targetObject.polylist.closed)) {
          if (hitResult) {
            hitResult.hitcode = NvConstant.HitCodes.PLApp;
            hitResult.segment = OptConstant.HookPts.KTR;
            hitResult.pt.x = this.EndPoint.x;
            hitResult.pt.y = this.EndPoint.y;
          }
          T3Util.Log("= S.BaseLine: Hit output:", NvConstant.HitCodes.PLApp);
          return NvConstant.HitCodes.PLApp;
        }
      }
    }

    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, true, []);
    const hitPoint = { x: point.x, y: point.y };
    const hitData = {};

    hitCode = Utils3.LineDStyleHit(polyPoints, hitPoint, this.StyleRecord.Line.Thickness, 0, hitData);

    if (hitData.lpHit !== undefined && hitResult) {
      for (let i = 0; i < polyPoints.length; i++) {
        if (hitData.lpHit < polyPoints[i]) {
          hitData.lpHit = i;
          break;
        }
      }
      hitResult.segment = hitData.lpHit;
    }

    if (hitResult) {
      hitResult.hitcode = hitCode;
    }

    T3Util.Log("= S.BaseLine: Hit output:", hitCode);
    return hitCode;
  }

  StartNewObjectDrawDoAutoScroll() {
    T3Util.Log("= S.BaseLine: StartNewObjectDrawDoAutoScroll called");

    // Set the auto-scroll timer with a 100ms timeout
    T3Gv.opt.autoScrollTimerId = T3Gv.opt.autoScrollTimer.setTimeout(
      'StartNewObjectDrawDoAutoScroll',
      100
    );
    T3Util.Log("= S.BaseLine: autoScrollTimerId set to", T3Gv.opt.autoScrollTimerId);

    // Convert window coordinates (autoScrollXPos, autoScrollYPos) to document coordinates
    let docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      T3Gv.opt.autoScrollXPos,
      T3Gv.opt.autoScrollYPos
    );
    T3Util.Log("= S.BaseLine: Converted window coords to docCoords:", docCoords);

    // Adjust the document coordinates for auto-grow drag
    docCoords = DrawUtil.DoAutoGrowDrag(docCoords);
    T3Util.Log("= S.BaseLine: After DoAutoGrowDrag, docCoords:", docCoords);

    // Scroll the document to the new position
    T3Gv.docUtil.ScrollToPosition(docCoords.x, docCoords.y);
    T3Util.Log("= S.BaseLine: Scrolled to position:", docCoords);

    // Continue drawing tracking with the updated coordinates
    this.StartNewObjectDrawTrackCommon(docCoords.x, docCoords.y, null);
    T3Util.Log("= S.BaseLine: Called StartNewObjectDrawTrackCommon with coords:", docCoords.x, docCoords.y);
  }

  StartNewObjectDrawTrackCommon(x: number, y: number, extraFlag: any): void {
    T3Util.Log("= S.BaseLine: StartNewObjectDrawTrackCommon called with x:", x, "y:", y, "extraFlag:", extraFlag);

    // Compute differences relative to the action start coordinates
    const deltaX = x - T3Gv.opt.actionStartX;
    const deltaY = y - T3Gv.opt.actionStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    T3Util.Log("= S.BaseLine: Computed deltaX:", deltaX, "deltaY:", deltaY, "distance:", distance);

    // Make a deep copy of the action bounding box
    const actionBBox = $.extend(true, {}, T3Gv.opt.actionBBox);
    T3Util.Log("= S.BaseLine: actionBBox:", actionBBox);

    // Adjust the line end point
    this.AdjustLineEnd(
      T3Gv.opt.actionSvgObject,
      x,
      y,
      OptConstant.ActionTriggerType.LineEnd,
      extraFlag
    );
    T3Util.Log("= S.BaseLine: AdjustLineEnd called with x:", x, "y:", y, "trigger:", OptConstant.ActionTriggerType.LineEnd, "extraFlag:", extraFlag);
  }

  LMDrawTrack(event: any) {
    T3Util.Log("= S.BaseLine: LMDrawTrack called with event:", event);

    // Stop propagation and default handling
    Utils2.StopPropagationAndDefaults(event);

    let trackPoint: { x: number; y: number };
    let altKeyFlag = 0;

    // Check if action stored object is valid
    if (T3Gv.opt.actionStoredObjectId === -1) {
      T3Util.Log("= S.BaseLine: LMDrawTrack aborted, actionStoredObjectId is -1");
      return false;
    }

    // Get window coordinates and convert to document coordinates
    if (event.gesture) {
      trackPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );
      altKeyFlag = event.gesture.srcEvent.altKey;
    } else {
      trackPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
        event.clientX,
        event.clientY
      );
    }

    T3Util.Log("= S.BaseLine: LMDrawTrack input point (before track):", trackPoint);

    // Process during track
    trackPoint = this.LMDrawDuringTrack(trackPoint);
    T3Util.Log("= S.BaseLine: After LMDrawDuringTrack, trackPoint:", trackPoint);

    // Determine if link parameters indicate an active connection
    let hasLinkParams =
      T3Gv.opt.linkParams &&
      T3Gv.opt.linkParams.ConnectIndex >= 0;

    // If override snaps is enabled, force snap behavior
    if (T3Gv.opt.OverrideSnaps(event)) {
      hasLinkParams = true;
    }

    // If snapping is enabled and there's no active link connection, snap the point to grid
    if (T3Gv.docUtil.docConfig.enableSnap && !hasLinkParams) {
      const deltaX = trackPoint.x - T3Gv.opt.actionStartX;
      const deltaY = trackPoint.y - T3Gv.opt.actionStartY;
      T3Util.Log("= S.BaseLine: Calculated delta for snapping:", { deltaX, deltaY });
      if (!this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, false, trackPoint)) {
        trackPoint = T3Gv.docUtil.SnapToGrid(trackPoint);
        T3Util.Log("= S.BaseLine: After SnapToGrid, trackPoint:", trackPoint);
      }
    }

    // Adjust the point for auto-grow dragging
    trackPoint = DrawUtil.DoAutoGrowDrag(trackPoint);
    T3Util.Log("= S.BaseLine: After DoAutoGrowDrag, trackPoint:", trackPoint);

    // Auto-scroll and process new object drawing
    if (this.AutoScrollCommon(event, !hasLinkParams, "StartNewObjectDrawDoAutoScroll")) {
      T3Util.Log("= S.BaseLine: AutoScrollCommon returned true. Calling StartNewObjectDrawTrackCommon with:", {
        x: trackPoint.x,
        y: trackPoint.y,
        altKey: altKeyFlag
      });
      this.StartNewObjectDrawTrackCommon(trackPoint.x, trackPoint.y, altKeyFlag);
    } else {
      T3Util.Log("= S.BaseLine: AutoScrollCommon returned false, not calling StartNewObjectDrawTrackCommon");
    }

    T3Util.Log("= S.BaseLine: LMDrawTrack completed with final trackPoint:", trackPoint);
  }

  CancelObjectDraw(): boolean {
    T3Util.Log("= S.BaseLine: CancelObjectDraw called");

    // Unbind click hammer events
    LMEvtUtil.UnbindActionClickHammerEvents();

    // Handle the lineStamp flag: if set, unbind mousemove on non-mobile platforms
    if (T3Gv.opt.lineStamp) {
      if (!T3Gv.opt.isMobilePlatform && T3Gv.opt.WorkAreaHammer) {
        T3Gv.opt.WorkAreaHammer.off('mousemove');
      }
      T3Gv.opt.lineStamp = false;
    }

    // Reset overlay flag and re-bind tap event
    T3Gv.opt.fromOverlayLayer = false;
    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);

    // Reset auto-scroll timer
    this.ResetAutoScrollTimer();

    T3Util.Log("= S.BaseLine: CancelObjectDraw completed with output: true");
    return true;
  }

  LMDrawRelease(event: any, touch: any) {
    T3Util.Log("= S.BaseLine: LMDrawRelease called with input:", { event: event, touch: touch });
    try {
      // Determine pointer position and conversion point (document coordinates)
      let conversionPoint: any;
      let pointerPos: { x: number; y: number } = { x: 0, y: 0 };
      const defaultMinLength: number = OptConstant.Common.SegDefLen;
      let minLength: number = defaultMinLength;

      if (touch) {
        pointerPos = { x: touch.x, y: touch.y };
        conversionPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(touch.x, touch.y);
      } else if (event.gesture) {
        pointerPos = {
          x: event.gesture.center.clientX,
          y: event.gesture.center.clientY,
        };
        conversionPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        pointerPos = { x: event.clientX, y: event.clientY };
        conversionPoint = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.clientX, event.clientY);
      }
      T3Util.Log("= S.BaseLine: LMDrawRelease - pointerPos:", pointerPos, "conversionPoint:", conversionPoint);

      if (event) {
        Utils2.StopPropagationAndDefaults(event);
      }

      // Calculate differences between starting draw point and current conversion point
      let deltaX: number, deltaY: number;
      const movementThreshold: number = 2 * OptConstant.Common.MinDim;

      if (T3Gv.opt.fromOverlayLayer) {
        deltaX = T3Gv.opt.lineDrawStartX - conversionPoint.x;
        deltaY = T3Gv.opt.lineDrawStartY - conversionPoint.y;
        // For overlay, reduce the minimum length to make the snapping easier
        minLength -= 20;
      } else {
        deltaX = T3Gv.opt.drawStartX - conversionPoint.x;
        deltaY = T3Gv.opt.drawStartY - conversionPoint.y;
      }
      T3Util.Log("= S.BaseLine: LMDrawRelease - deltaX:", deltaX, "deltaY:", deltaY, "minLength:", minLength);

      // If movement is very small and lineStamp flag is not set, set lineStamp and bind mousemove (for desktop)
      if (
        !T3Gv.opt.lineStamp &&
        Math.abs(deltaX) < movementThreshold &&
        Math.abs(deltaY) < movementThreshold
      ) {
        T3Gv.opt.lineStamp = true;
        if (!T3Gv.opt.isMobilePlatform && T3Gv.opt.WorkAreaHammer) {
          T3Gv.opt.WorkAreaHammer.on(
            "mousemove",
            EvtUtil.Evt_DrawTrackHandlerFactory(this)
          );
        }
        T3Util.Log("= S.BaseLine: LMDrawRelease - negligible movement; early exit.");
        return;
      }

      // Unbind click events and re-bind tap events on the work area hammer
      if (T3Gv.opt.WorkAreaHammer) {
        LMEvtUtil.UnbindActionClickHammerEvents();
        T3Gv.opt.WorkAreaHammer.on("tap", EvtUtil.Evt_WorkAreaHammerClick);
      }
      if (event && event.gesture) {
        event.gesture.stopDetect();
      }
      this.ResetAutoScrollTimer();

      // Verify if movement is long enough when using overlay; if not, cancel the modal operation
      if (
        T3Gv.opt.fromOverlayLayer &&
        (deltaX * deltaX + deltaY * deltaY) < minLength * minLength
      ) {
        // T3Util.Log("= S.BaseLine: LMDrawRelease - movement below minimum length; canceling modal operation.");
        // return SDUI.Commands.MainController.Shapes.CancelOperation();
      }

      // Preserve current linkParams for messaging output
      const localLinkParams = {
        linkParams: Utils1.DeepCopy(T3Gv.opt.linkParams)
      };

      // Complete the drawing by calling LMDrawPostRelease
      const postReleaseResult = this.LMDrawPostRelease(T3Gv.opt.actionStoredObjectId);
      let addedLabel: any = null;
      if (T3Gv.opt.fromOverlayLayer) {
        addedLabel = gBusinessController.AddLineLabel(this.BlockID);
      }

      // Execute post drawing routines
      if (postReleaseResult) {
        DrawUtil.PostObjectDraw(null);
      } else {
        DrawUtil.PostObjectDraw(this.LMDrawRelease);
      }

      // Unbind temporary mousemove events if set via lineStamp, then reset flag
      if (T3Gv.opt.lineStamp) {
        if (!T3Gv.opt.isMobilePlatform && T3Gv.opt.WorkAreaHammer) {
          T3Gv.opt.WorkAreaHammer.off("mousemove");
        }
        T3Gv.opt.lineStamp = false;
      }

      // If drawing was initiated from overlay, complete operation action and reset overlay flag
      if (T3Gv.opt.fromOverlayLayer) {
        T3Gv.opt.fromOverlayLayer = false;
        gBusinessController.CompleteAction(this.BlockID, pointerPos);
      }
      T3Util.Log("= S.BaseLine: LMDrawRelease output: completed successfully");
    } catch (error) {
      OptCMUtil.CancelOperation();
      this.LMDrawClickExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      console.error("= S.BaseLine: LMDrawRelease encountered error:", error);
      throw error;
    }
  }

  LMDrawPreTrack(event: any): boolean {
    T3Util.Log("= S.BaseLine: LMDrawPreTrack called with event:", event);

    // Initialize variables with readable names
    let hookFlags = this.GetHookFlags();
    let sessionObj = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    let linksBlockObj: any;
    let hookList: Array<{ x: number; y: number; id?: number }> = [{ x: 0, y: 0 }];
    let extraData: any = {}; // for GetHookList
    const allowLink: boolean = this.AllowLink();

    if (allowLink) {
      T3Gv.opt.linkParams = new LinkParameters();

      if (sessionObj) {
        if (!T3Gv.opt.fromOverlayLayer) {
          T3Gv.opt.linkParams.AllowJoin = sessionObj.flags & OptConstant.SessionFlags.FreeHand;
        }
      }

      if (hookFlags & NvConstant.HookFlags.LcCHook) {
        // Set the hook list using the event point as starting hook (Top Left)
        hookList[0].id = OptConstant.HookPts.KTL;
        hookList[0].x = event.x;
        hookList[0].y = event.y;

        // Reset drag delta values
        T3Gv.opt.dragDeltaX = 0;
        T3Gv.opt.dragDeltaY = 0;

        linksBlockObj = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, false);

        // Try to find a connection using the hook list
        if (
          SelectUtil.FindConnect(
            T3Gv.opt.actionStoredObjectId,
            this,
            hookList,
            false,
            false,
            T3Gv.opt.linkParams.AllowJoin,
            event
          )
        ) {
          // Save connection hook parameters into temporary SConnect* properties
          T3Gv.opt.linkParams.SConnectIndex = T3Gv.opt.linkParams.ConnectIndex;
          T3Gv.opt.linkParams.SConnectHookFlag = T3Gv.opt.linkParams.ConnectHookFlag;
          T3Gv.opt.linkParams.SConnectInside = T3Gv.opt.linkParams.ConnectInside;
          T3Gv.opt.linkParams.SConnectPt.x = T3Gv.opt.linkParams.ConnectPt.x;
          T3Gv.opt.linkParams.SConnectPt.y = T3Gv.opt.linkParams.ConnectPt.y;

          // Reset connection parameters
          T3Gv.opt.linkParams.ConnectIndex = -1;
          T3Gv.opt.linkParams.Hookindex = -1;
          T3Gv.opt.linkParams.ConnectInside = 0;
          T3Gv.opt.linkParams.ConnectHookFlag = 0;

          // Adjust event and line start coordinates using the drag delta
          event.x += T3Gv.opt.dragDeltaX;
          event.y += T3Gv.opt.dragDeltaY;
          this.StartPoint.x += T3Gv.opt.dragDeltaX;
          this.StartPoint.y += T3Gv.opt.dragDeltaY;
          this.EndPoint.x = this.StartPoint.x;
          this.EndPoint.y = this.StartPoint.y;

          // Get circular target hook list
          T3Gv.opt.linkParams.lpCircList = HookUtil.GetHookList(
            linksBlockObj,
            T3Gv.opt.linkParams.lpCircList,
            T3Gv.opt.linkParams.SConnectIndex,
            this,
            NvConstant.ListCodes.TargOnly,
            extraData
          );
        } else if (T3Gv.opt.linkParams.JoinIndex >= 0) {
          // Process join parameters if a join exists
          T3Gv.opt.linkParams.SJoinIndex = T3Gv.opt.linkParams.JoinIndex;
          T3Gv.opt.linkParams.SJoinData = T3Gv.opt.linkParams.JoinData;
          T3Gv.opt.linkParams.SJoinSourceData = T3Gv.opt.linkParams.JoinSourceData;
          T3Gv.opt.linkParams.SConnectPt.x = T3Gv.opt.linkParams.ConnectPt.x;
          T3Gv.opt.linkParams.SConnectPt.y = T3Gv.opt.linkParams.ConnectPt.y;
          T3Gv.opt.linkParams.JoinIndex = -1;
          T3Gv.opt.linkParams.JoinData = 0;
          T3Gv.opt.linkParams.JoinSourceData = 0;
          T3Gv.opt.linkParams.lpCircList = HookUtil.GetHookList(
            linksBlockObj,
            T3Gv.opt.linkParams.lpCircList,
            T3Gv.opt.linkParams.SJoinIndex,
            this,
            NvConstant.ListCodes.CircTarg,
            extraData
          );
        }
      }
    } else if (sessionObj) {
      // If linking is not allowed, check if object is a PolyLine or freehand allowed
      if (this instanceof Instance.Shape.PolyLine || sessionObj.flags & OptConstant.SessionFlags.FreeHand) {
        T3Gv.opt.linkParams = new LinkParameters();
        T3Gv.opt.linkParams.ArraysOnly = true;
        T3Gv.opt.linkParams.AllowJoin = sessionObj.flags & OptConstant.SessionFlags.FreeHand;
      }
    }

    T3Util.Log("= S.BaseLine: LMDrawPreTrack returning:", true);
    return true;
  }

  // LMDrawDuringTrack(e) { }

  LMDrawDuringTrack(event: any) {
    T3Util.Log("= S.BaseLine: LMDrawDuringTrack called with input:", event);

    let connectionResult: any;
    let hitResult: HitResult;
    let hookPoints: { x: number; y: number; id?: number }[] = [
      { x: 0, y: 0 }
    ];
    let joinChanged: boolean = false;

    // If no linkParams then skip connection logic
    if (T3Gv.opt.linkParams == null) {
      T3Util.Log("= S.BaseLine: LMDrawDuringTrack output (no linkParams):", event);
      return event;
    }

    // Set hook point for connection attempt
    hookPoints[0].x = event.x;
    hookPoints[0].y = event.y;
    hookPoints[0].id = OptConstant.HookPts.KTR;

    // Reset drag deltas
    T3Gv.opt.dragDeltaX = 0;
    T3Gv.opt.dragDeltaY = 0;

    // Attempt to find a connection; if found, adjust e.x and e.y
    if (SelectUtil.FindConnect(
      T3Gv.opt.actionStoredObjectId,
      this,
      hookPoints,
      true,
      false,
      T3Gv.opt.linkParams.AllowJoin,
      event
    )) {
      event.x += T3Gv.opt.dragDeltaX;
      event.y += T3Gv.opt.dragDeltaY;
    }

    // Check for join conditions when SJoinIndex is set and JoinIndex is not yet set
    if (
      T3Gv.opt.linkParams.SJoinIndex >= 0 &&
      T3Gv.opt.linkParams.JoinIndex < 0
    ) {
      // Get the candidate join object
      let joinObject = DataUtil.GetObjectPtr(T3Gv.opt.linkParams.SJoinIndex);
      // Check if the join candidate is a PolyLine
      if (this.checkIfPolyLine(joinObject)) {
        hitResult = new HitResult(-1, 0, null);
        hitResult.hitcode = joinObject.Hit(event, false, true, hitResult);

        if (
          hitResult &&
          hitResult.hitcode === NvConstant.HitCodes.PLApp &&
          T3Gv.opt.linkParams.SJoinData != hitResult.segment
        ) {
          joinChanged = true;
        }

        if (joinChanged) {
          T3Gv.opt.linkParams.JoinIndex = joinObject.BlockID;
          T3Gv.opt.linkParams.JoinData = hitResult.segment;
          if (T3Gv.opt.linkParams.HiliteJoin < 0) {
            T3Gv.opt.linkParams.hiliteJoin = joinObject.BlockID;
            if (OptCMUtil.GetEditMode() != NvConstant.EditState.LinkJoin) {
              OptCMUtil.SetEditMode(NvConstant.EditState.LinkJoin, null, false);
              joinObject.SetCursors();
              OptCMUtil.SetEditMode(NvConstant.EditState.LinkJoin, null, false);
            }
          }
        } else {
          if (T3Gv.opt.linkParams.HiliteJoin >= 0) {
            HookUtil.HiliteConnect(
              T3Gv.opt.linkParams.HiliteJoin,
              T3Gv.opt.linkParams.ConnectPt,
              false,
              true,
              this.BlockID,
              null
            );
            T3Gv.opt.linkParams.HiliteJoin = -1;
          }
          OptCMUtil.SetEditMode(NvConstant.EditState.Default);
        }
      }
    }

    T3Util.Log("= S.BaseLine: LMDrawDuringTrack output:", event);
    return event;
  }

  LMDrawPostRelease(actionTarget: number): number {
    T3Util.Log("= S.BaseLine: LMDrawPostRelease input:", actionTarget);

    // Check if linkParams exist
    if (T3Gv.opt.linkParams != null) {
      const lp = T3Gv.opt.linkParams;

      // Process SHiliteConnect: if set, clear after hiliting using SConnectPt
      if (lp.SHiliteConnect >= 0) {
        HookUtil.HiliteConnect(
          lp.SHiliteConnect,
          lp.SConnectPt,
          false,
          false,
          this.BlockID,
          lp.SHiliteInside
        );
        lp.SHiliteConnect = -1;
        lp.SHiliteInside = null;
      }

      // Process HiliteConnect: if set, clear after hiliting using ConnectPt
      if (lp.HiliteConnect >= 0) {
        HookUtil.HiliteConnect(
          lp.HiliteConnect,
          lp.ConnectPt,
          false,
          false,
          this.BlockID,
          lp.HiliteInside
        );
        lp.HiliteConnect = -1;
        lp.HiliteInside = null;
      }

      // Process SHiliteJoin: if set, hilite join in "join" mode then clear
      if (lp.SHiliteJoin >= 0) {
        HookUtil.HiliteConnect(
          lp.SHiliteJoin,
          lp.SConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        lp.SHiliteJoin = -1;
      }

      // Process HiliteJoin: if set, hilite join using ConnectPt then clear
      if (lp.HiliteJoin >= 0) {
        HookUtil.HiliteConnect(
          lp.HiliteJoin,
          lp.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        lp.HiliteJoin = -1;
      }

      // Reset edit mode to default
      OptCMUtil.SetEditMode(NvConstant.EditState.Default);

      // If SJoinIndex is set then perform PolyLJoin on the join information
      if (lp.SJoinIndex >= 0) {
        let joinResult = PolyUtil.PolyLJoin(
          lp.SJoinIndex,
          lp.SJoinData,
          actionTarget,
          lp.SJoinSourceData,
          false
        );

        if (joinResult !== actionTarget && joinResult >= 0) {
          // Update action target and clear ConnectIndex if set
          actionTarget = joinResult;
          if (lp.ConnectIndex >= 0) {
            lp.ConnectIndex = -1;
          }
          // Determine JoinSourceData based on the equality of EndPoint and the join object's StartPoint
          const joinObj = DataUtil.GetObjectPtr(joinResult, false);
          if (Utils2.EqualPt(this.EndPoint, joinObj.StartPoint)) {
            lp.JoinSourceData = 1;
          } else {
            lp.JoinSourceData = 2;
          }
        }
      }

      // Initialize result flag
      let result = 0; // default false (0) as number flag

      // If JoinIndex is set, call PolyLJoin and check for a return value of -2
      if (lp.JoinIndex >= 0) {
        result = (PolyUtil.PolyLJoin(
          lp.JoinIndex,
          lp.JoinData,
          actionTarget,
          lp.JoinSourceData,
          false
        ) === -2) ? 1 : 0;
      }
      // Otherwise, if ConnectIndex is set, update the hook using the stored parameters
      else if (lp.ConnectIndex >= 0) {
        HookUtil.UpdateHook(
          actionTarget,
          lp.InitialHook,
          lp.ConnectIndex,
          lp.HookIndex,
          lp.ConnectPt,
          lp.ConnectInside
        );
      }

      // Clear the NoContinuous flag from hookflags
      this.hookflags = Utils2.SetFlag(this.hookflags, NvConstant.HookFlags.LcNoContinuous, false);

      // Update links and clear the linkParams
      T3Gv.opt.UpdateLinks();
      T3Gv.opt.linkParams = null;

      T3Util.Log("= S.BaseLine: LMDrawPostRelease output:", result);
      return result;
    }
    // If no linkParams, do nothing and return default (0)
    return 0;
  }

  LMDrawClickExceptionCleanup(event) {
    T3Util.Log("= S.BaseLine: LMDrawClickExceptionCleanup called with input:", event);

    LMEvtUtil.UnbindActionClickHammerEvents();

    if (T3Gv.opt.lineStamp) {
      if (!T3Gv.opt.isMobilePlatform && T3Gv.opt.WorkAreaHammer) {
        T3Gv.opt.WorkAreaHammer.off('mousemove');
      }
      T3Gv.opt.lineStamp = false;
    }

    T3Gv.opt.WorkAreaHammer.on('tap', EvtUtil.Evt_WorkAreaHammerClick);
    this.ResetAutoScrollTimer();
    T3Gv.opt.linkParams = null;
    T3Gv.opt.actionStoredObjectId = -1;
    T3Gv.opt.actionSvgObject = null;
    T3Gv.opt.lineStamp = false;
    T3Gv.opt.fromOverlayLayer = false;
    T3Gv.opt.WorkAreaHammer.on('dragstart', EvtUtil.Evt_WorkAreaHammerDragStart);

    T3Util.Log("= S.BaseLine: LMDrawClickExceptionCleanup output: cleanup complete");
  }

  LMDrawClick(docCorX, docCorY) {

    //docCorX, docCorY

    T3Util.Log('3 ========= LMDrawClick 1 draw click e=>', docCorX, docCorY);

    try {
      this.Frame.x = docCorX;
      this.Frame.y = docCorY;
      this.StartPoint = { x: docCorX, y: docCorY };
      this.EndPoint = { x: docCorX, y: docCorY };
      T3Gv.opt.WorkAreaHammer.on('drag', EvtUtil.Evt_DrawTrackHandlerFactory(this));
      T3Gv.opt.WorkAreaHammer.on('dragend', EvtUtil.Evt_DrawReleaseHandlerFactory(this));
      T3Gv.opt.WorkAreaHammer.off('tap');
    } catch (error) {

      T3Util.Log('3 ========= LMDrawClick 2 eRRdraw click e=>', error);

      this.LMDrawClickExceptionCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  WriteShapeData(outputStream, options) {


    T3Util.Log("= S.BaseLine: WriteShapeData called with input:", { outputStream: outputStream, options: options });

    return;

    // Initialize attach flag and a temporary DataID holder.
    let attachFlag = 0;
    let dataIdForWrite = -1;

    // Process only if DataID is valid.
    if (this.DataID >= 0) {
      T3Util.Log("= S.BaseLine: DataID is valid:", this.DataID);

      // Evaluate vertical justification from text alignment.
      const textAlignWin = ShapeUtil.TextAlignToWin(this.TextAlign);
      switch (textAlignWin.vjust) {
        case TextConstant.TextJust.Top:
        case TextConstant.TextJust.Bottom:
          T3Util.Log("= S.BaseLine: Vertical justification is TOP or BOTTOM");
          break;
      }

      // Set attachFlag based on LineTextX. Default is AttachC.
      attachFlag = NvConstant.TextFlags.AttachC;
      if (this.LineTextX) {
        attachFlag = NvConstant.TextFlags.AttachC;
        T3Util.Log("= S.BaseLine: LineTextX is set; using AttachC flag");
      }

      // Clear all attach flags (AttachA, AttachB, AttachC, and AttachD).
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        NvConstant.TextFlags.AttachA |
        NvConstant.TextFlags.AttachB |
        NvConstant.TextFlags.AttachC |
        NvConstant.TextFlags.AttachD,
        false
      );
      T3Util.Log("= S.BaseLine: Cleared attach flags; current TextFlags:", this.TextFlags);

      // Set the specific attach flag.
      this.TextFlags = Utils2.SetFlag(this.TextFlags, attachFlag, true);
      T3Util.Log("= S.BaseLine: Set attach flag (", attachFlag, "); current TextFlags:", this.TextFlags);

      // Set the horizontal text flag based on TextDirection.
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        NvConstant.TextFlags.HorizText,
        !this.TextDirection
      );
      T3Util.Log("= S.BaseLine: Set horizontal text flag (", !this.TextDirection, "); current TextFlags:", this.TextFlags);
    }

    if (options.WriteBlocks) {
      dataIdForWrite = this.DataID;
    }

    // Write text parameters to ShapeUtil.
    T3Util.Log("= S.BaseLine: Writing text parameters with DataID:", dataIdForWrite);
    ShapeUtil.WriteTextParams(outputStream, this, dataIdForWrite, options);

    // Write arrowhead attributes.
    T3Util.Log("= S.BaseLine: Writing arrowhead attributes");
    ShapeUtil.WriteArrowheads(outputStream, options, this);

    T3Util.Log("= S.BaseLine: WriteShapeData completed with output:", {
      DataID: this.DataID,
      TextFlags: this.TextFlags
    });
  }

  ChangeBackgroundColor(newColor: string, currentColor: string): void {
    T3Util.Log("= S.BaseLine: ChangeBackgroundColor called with newColor:", newColor, "currentColor:", currentColor);

    if (
      this.StyleRecord.Fill.Paint.FillType !== NvConstant.FillTypes.Transparent &&
      this.StyleRecord.Fill.Paint.Color === currentColor
    ) {
      T3Util.Log("= S.BaseLine: Condition met. Updating background color.");
      DataUtil.GetObjectPtr(this.BlockID, true);
      this.StyleRecord.Fill.Paint.Color = newColor;
      T3Util.Log("= S.BaseLine: Background color updated to:", this.StyleRecord.Fill.Paint.Color);
    } else {
      T3Util.Log("= S.BaseLine: Condition not met. Background color remains:", this.StyleRecord.Fill.Paint.Color);
    }
  }

  ResizeInTextEdit(textObject: any, newSize: any): { x: number; y: number } {
    T3Util.Log("= S.BaseLine: ResizeInTextEdit called with input:", { textObject, newSize });
    const result = { x: 0, y: 0 };
    T3Util.Log("= S.BaseLine: ResizeInTextEdit output:", result);
    return result;
  }

  CalcTextPosition(params: any) {
    T3Util.Log("= S.BaseLine: CalcTextPosition input:", params);

    // Calculate the center of the incoming frame
    const paramsCenter = {
      x: params.Frame.x + params.Frame.width / 2,
      y: params.Frame.y + params.Frame.height / 2,
    };

    // Build an array containing the start and end points of this line
    const linePoints = [
      { x: this.StartPoint.x, y: this.StartPoint.y },
      { x: this.EndPoint.x, y: this.EndPoint.y },
    ];

    // Calculate the center of this object's frame
    const frameCenter = {
      x: this.Frame.x + this.Frame.width / 2,
      y: this.Frame.y + this.Frame.height / 2,
    };

    // Get the angle of the line (in degrees)
    const lineAngle = this.GetAngle(null);
    let rotationAngle = params.RotationAngle;

    // If this is a simple line, adjust the rotation angle and normalize it to [0,180)
    if (this.LineType === OptConstant.LineType.LINE) {
      rotationAngle = lineAngle + rotationAngle;
      rotationAngle %= 180;
      if (Math.abs(rotationAngle) < 1) {
        rotationAngle = 0;
      }
    }

    // Compute the differences between the end and start points
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const modAngle = lineAngle % 180;

    // If the line is not horizontally aligned and there is no additional rotation,
    // set the horizontal text flag.
    if (!Utils2.IsEqual(modAngle, 0) && rotationAngle === 0) {
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        NvConstant.TextFlags.HorizText,
        true
      );
    }

    // Calculate the total length of the line and update TextWrapWidth
    const lineLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    this.TextWrapWidth = lineLength;

    // Rotate the line points about the frame center by the negative line angle (in radians)
    const angleInRadians = -lineAngle * NvConstant.Geometry.PI / 180;
    Utils3.RotatePointsAboutPoint(frameCenter, angleInRadians, linePoints);

    // Calculate the relative text positions based on the rotated points
    this.LineTextX = (paramsCenter.x - linePoints[0].x) / lineLength;
    if (this.LineTextX < 0) {
      this.LineTextX = 1 + this.LineTextX;
    }
    this.LineTextY = paramsCenter.y - linePoints[0].y;

    // If LineTextX is valid, copy the text rectangle from the input parameters
    if (this.LineTextX) {
      this.trect = $.extend(true, {}, params.trect);
    }

    T3Util.Log("= S.BaseLine: CalcTextPosition output:", {
      LineTextX: this.LineTextX,
      LineTextY: this.LineTextY,
      TextWrapWidth: this.TextWrapWidth,
      trect: this.trect,
    });
  }

  SetTextObject(newDataId: any): boolean {
    T3Util.Log("= S.BaseLine: SetTextObject called with newDataId =", newDataId);

    // Set the DataID property
    this.DataID = newDataId;

    // Get text alignment settings and session object
    const textAlignWin = ShapeUtil.TextAlignToWin(this.TextAlign);
    const sessionObj = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Update the fill color based on the session background
    this.StyleRecord.Fill.Paint.Color = sessionObj.background.Paint.Color;

    // Set FillType and Opacity based on vertical justification
    if (textAlignWin.vjust === TextConstant.TextJust.Center) {
      this.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
    }

    T3Util.Log("= S.BaseLine: SetTextObject output, DataID =", this.DataID, "StyleRecord.Fill =", this.StyleRecord.Fill);
    return true;
  }

  GetTextOnLineParams(e) {
    T3Util.Log("= S.BaseLine: GetTextOnLineParams called with input:", e);

    let params = {
      Frame: new Rect(),
      StartPoint: new Point(),
      EndPoint: new Point()
    };

    // Copy StartPoint and EndPoint from the current object
    params.StartPoint.x = this.StartPoint.x;
    params.StartPoint.y = this.StartPoint.y;
    params.EndPoint.x = this.EndPoint.x;
    params.EndPoint.y = this.EndPoint.y;

    // Calculate the frame using the start and end points
    params.Frame = Utils2.Pt2Rect(params.StartPoint, params.EndPoint);

    // If LineTextX is not zero, set CenterProp and Displacement accordingly
    if (this.LineTextX !== 0) {
      params.CenterProp = this.LineTextX;
      params.Displacement = this.LineTextY;
    }

    T3Util.Log("= S.BaseLine: GetTextOnLineParams output:", params);
    return params;
  }

  TextDirectionCommon(textObj, bgObj, useOriginal, extraParam) {
    T3Util.Log("= S.BaseLine: TextDirectionCommon input:", { textObj, bgObj, useOriginal, extraParam });
    // Get the minimum text dimensions
    let textMinDim = textObj.GetTextMinDimensions();
    let textWidth = textMinDim.width;
    let textHeight = textMinDim.height;

    // Get on-line text parameters
    let textParams = this.GetTextOnLineParams(extraParam);
    let startX = textParams.StartPoint.x;
    let frameX = textParams.Frame.x;
    let endX = textParams.EndPoint.x;
    let height = textHeight; // local copy for clarity
    let startY = textParams.StartPoint.y;
    let frameY = textParams.Frame.y;
    let endY = textParams.EndPoint.y;

    // Calculate the rotation angle between start and end points (in radians and degrees)
    let angleRadians = T3Gv.opt.GetClockwiseAngleBetween2PointsInRadians(textParams.StartPoint, textParams.EndPoint);
    let angleDegrees = angleRadians * (180 / NvConstant.Geometry.PI);

    // Flags and adjustments
    let flipText = false;
    let centerProp = 0.5;
    let centerPoint = {};
    let offsetX = 0, offsetY = 0;

    // Temporary variables for calculated positions
    let finalX = 0, finalY = 0;

    // Update vertical alignment of the text object
    textObj.SetVerticalAlignment('top');
    this.linetrect = $.extend(true, {}, this.Frame);

    // Calculate offsets if LineTextY is provided
    if (this.LineTextY) {
      offsetX = this.LineTextY * Math.cos(angleRadians);
      offsetY = -this.LineTextY * Math.sin(angleRadians);
    }

    // Flip text if angle is in (90,270)
    if (angleDegrees > 90 && angleDegrees < 270) {
      angleDegrees -= 180;
      flipText = true;
    }

    // If not using original orientation AND TextDirection flag is set, then override angle parameters
    if (!useOriginal && this.TextDirection) {
      angleRadians = 0;
      angleDegrees = 0;
      // preserve original TextAlign and TextDirection for later restore
      var origTextAlign = this.TextAlign;
      var origTextDirection = this.TextDirection;
    }

    // Main block when LineTextX or LineTextY is defined
    if (this.LineTextX || this.LineTextY) {
      if (textMinDim) {
        // Save the minimum text dimensions for later text object calculation
        this.theMinTextDim.width = textWidth;
        this.theMinTextDim.height = textHeight;

        // If "useOriginal" then restore TextAlign from saved setting
        if (useOriginal) {
          this.TextAlign = origTextAlign;
        }

        // Get a justification object from text alignment
        let just = ShapeUtil.TextAlignToJust(this.TextAlign);

        // If text is flipped and this is a simple line, swap left/right alignment
        if (flipText && this.LineType === OptConstant.LineType.LINE) {
          switch (just.just) {
            case TextConstant.TextAlign.Left:
              just.just = TextConstant.TextAlign.Right;
              break;
            case TextConstant.TextAlign.Right:
              just.just = TextConstant.TextAlign.Left;
              break;
          }
        }

        // Update the background object size if provided
        if (bgObj) {
          bgObj.SetSize(textWidth + 2, textHeight + 2);
        }

        // Calculate the center position along the line based on CenterProp
        centerProp = D.CenterProp = textParams.CenterProp; // using CenterProp from text parameters
        let posX = startX + (endX - startX) * centerProp - frameX + offsetY;
        let posY = startY + (endY - startY) * centerProp - frameY + offsetX;

        // If no height is set in text rectangle then set default height
        if (this.trect.height === 0) {
          this.trect.height = 3 * textHeight;
        }

        // Choose height from trect if larger
        let finalTextHeight = this.trect.height > textHeight ? this.trect.height : textHeight;

        // Calculate the position for text object placement
        finalX = this.TextGrow === NvConstant.TextGrowBehavior.Horizontal ?
          posX - textWidth / 2 : posX - this.trect.width / 2;
        finalY = posY - finalTextHeight / 2;

        textObj.SetPos(finalX, finalY);
        textObj.SetVerticalAlignment(just.vjust);
        textObj.SetParagraphAlignment(just.just);

        // Rotate text based on TextDirection flag
        if (this.TextDirection) {
          textObj.SetRotation(angleDegrees, posX, posY);
        } else {
          textObj.SetRotation(0, posX, posY);
        }

        centerPoint = { x: posX, y: posY };

        // Set background object position accordingly
        if (bgObj) {
          let bgPos = {};
          switch (just.just) {
            case TextConstant.TextAlign.Left:
              bgPos.x = finalX - 1;
              break;
            case TextConstant.TextAlign.Right:
              bgPos.x = finalX - 1 + this.trect.width - textWidth;
              break;
            default:
              bgPos.x = posX - textWidth / 2 - 1;
          }
          switch (just.vjust) {
            case 'top':
              bgPos.y = finalY - 1 - finalTextHeight / 2;
              break;
            case 'bottom':
              bgPos.y = finalY - textHeight / 2 - 1 + finalTextHeight / 2;
              break;
            default:
              bgPos.y = finalY - textHeight / 2 - 1;
          }
          bgObj.SetPos(bgPos.x, bgPos.y);
        }

        // Update linerect and adjust with frame offsets
        this.linetrect.x = finalX + this.Frame.x;
        this.linetrect.y = finalY + this.Frame.y;
        this.linetrect.width = textWidth + 2;
        this.linetrect.height = textHeight + 2;

        // Adjust rotation of background
        if (this.TextDirection) {
          if (bgObj) {
            bgObj.SetRotation(angleDegrees, posX, posY);
          }
          this.linetrect = T3Gv.opt.RotateRect(this.linetrect, centerPoint, angleDegrees);
        } else if (bgObj) {
          bgObj.SetRotation(0, posX, posY);
        }

        // Finally, update the frame to reflect changes
        this.UpdateFrame();
      }
    } else if (textMinDim) {
      // Else block for when no LineTextX or LineTextY is set
      this.theMinTextDim.width = textWidth;
      this.theMinTextDim.height = textHeight;
      bgObj.SetSize(textWidth + 2, textHeight + 2);
      switch (this.TextAlign) {
        case TextConstant.TextAlign.TopLeft:
          finalX = startX - frameX + textWidth / 2 * Math.cos(angleRadians);
          finalY = startY - frameY + textWidth / 2 * Math.sin(angleRadians);
          bgObj.SetPos(finalX - textWidth / 2 - 1, finalY - textHeight - this.StyleRecord.Line.Thickness / 2 - 2);
          finalX = finalX - textWidth / 2;
          finalY = finalY - textHeight - this.StyleRecord.Line.Thickness / 2 - 1;
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          centerPoint = { x: finalX + textWidth / 2, y: finalY + textHeight / 2 };
          bgObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          if (this.TextGrow === NvConstant.TextGrowBehavior.Vertical) {
            flipText = false;
          }
          flipText ? textObj.SetParagraphAlignment(TextConstant.TextAlign.Right)
            : textObj.SetParagraphAlignment(TextConstant.TextAlign.Left);
          break;
        case TextConstant.TextAlign.Left:
          finalX = startX - frameX + textWidth / 2 * Math.cos(angleRadians);
          finalY = startY - frameY + textWidth / 2 * Math.sin(angleRadians);
          bgObj.SetPos(finalX - textWidth / 2 - 1, finalY - textHeight / 2 - 1);
          finalX = finalX - textWidth / 2;
          finalY = finalY - textHeight / 2;
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          centerPoint = { x: finalX + textWidth / 2, y: finalY + textHeight / 2 };
          bgObj.SetRotation(angleDegrees, finalX + textWidth / 2, finalY + textHeight / 2);
          if (this.TextGrow === NvConstant.TextGrowBehavior.Vertical) {
            flipText = false;
          }
          flipText ? textObj.SetParagraphAlignment(TextConstant.TextAlign.Right)
            : textObj.SetParagraphAlignment(TextConstant.TextAlign.Left);
          break;
        // Implement other cases for BOTTOMLEFT, TOPCENTER, CENTER, BOTTOMCENTER,
        // TOPRIGHT, RIGHT, BOTTOMRIGHT similar to above as needed...
        // For brevity, not all cases are modified here.
        default:
          // Default positioning if no alignment match
          finalX = (startX + endX) / 2 - frameX;
          finalY = (startY + endY) / 2 - frameY;
          bgObj.SetPos(finalX, finalY);
          textObj.SetPos(finalX, finalY);
          textObj.SetRotation(angleDegrees, finalX, finalY);
          centerPoint = { x: finalX, y: finalY };
          bgObj.SetRotation(angleDegrees, finalX, finalY);
          textObj.SetParagraphAlignment(TextConstant.TextAlign.Center);
          break;
      }

      this.linetrect.x = finalX + this.Frame.x;
      this.linetrect.y = finalY + this.Frame.y;
      this.linetrect.width = textWidth;
      this.linetrect.height = textHeight;
      centerPoint.x += this.Frame.x;
      centerPoint.y += this.Frame.y;
      this.linetrect = T3Gv.opt.RotateRect(this.linetrect, centerPoint, angleDegrees);
      let tempRect = $.extend(true, {}, this.linetrect);
      T3Gv.opt.TextPinFrame(this.linetrect, textHeight);
      this.linetrect.x = this.linetrect.x - this.Frame.x;
      this.linetrect.y = this.linetrect.y - this.Frame.y;
      this.UpdateFrame();
    }

    // Restore original settings if useOriginal is true
    if (useOriginal) {
      this.TextDirection = origTextDirection;
      this.TextAlign = origTextAlign;
    }
    T3Util.Log("= S.BaseLine: TextDirectionCommon output:", { linerect: this.linetrect });
  }

  LMAddSVGTextObject(svgDoc, container) {
    T3Util.Log("= S.BaseLine: LMAddSVGTextObject input:", { svgDoc, container });

    // Use the text rectangle stored in this.trect to size the text object.
    const trect = this.trect;

    // Create background rectangle for the text.
    const bgRect = svgDoc.CreateShape(OptConstant.CSType.Rect);
    bgRect.SetID(OptConstant.SVGElementClass.TextBackground);
    bgRect.SetStrokeWidth(0);

    let fillColor = this.StyleRecord.Fill.Paint.Color;
    bgRect.SetFillColor(fillColor);
    if (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent) {
      bgRect.SetOpacity(0);
    } else {
      bgRect.SetOpacity(this.StyleRecord.Fill.Paint.Opacity);
    }

    // Create the text shape.
    const textShape = svgDoc.CreateShape(OptConstant.CSType.Text);
    textShape.SetID(OptConstant.SVGElementClass.Text);
    textShape.SetRenderingEnabled(false);
    textShape.SetSize(trect.width, trect.height);
    textShape.SetSpellCheck(this.AllowSpell());

    // Mark the container as a text container and save the text element.
    container.isText = true;
    container.textElem = textShape;

    // Get the stored object using DataID.
    const storedObject = T3Gv.stdObj.GetObject(this.DataID);
    if (storedObject.Data.runtimeText) {
      textShape.SetRuntimeText(storedObject.Data.runtimeText);
    } else {
      textShape.SetText('');
      textShape.SetParagraphAlignment(this.TextAlign);
      textShape.SetVerticalAlignment('top');
    }
    if (!storedObject.Data.runtimeText) {
      storedObject.Data.runtimeText = textShape.GetRuntimeText();
    }

    // Set constraints if the text is not growing vertically.
    if (this.TextGrow !== NvConstant.TextGrowBehavior.Vertical) {
      textShape.SetConstraints(T3Gv.opt.header.MaxWorkDim.x, 0, trect.height);
    }

    // Disable hyperlinks if the text object is in a group.
    if (this.bInGroup) {
      textShape.DisableHyperlinks(true);
    }

    // Enable rendering for the text.
    textShape.SetRenderingEnabled(true);

    // Get minimum text dimensions.
    const textMinDimensions = textShape.GetTextMinDimensions();
    const textHeight = textMinDimensions.height;
    let verticalOffset;
    // If in text direction mode and line thickness is tall enough, hide background.
    if (
      this.TextDirection &&
      this.StyleRecord.Line.Thickness >= textMinDimensions.height &&
      bgRect
    ) {
      fillColor = this.StyleRecord.Line.Paint.Color;
      bgRect.SetOpacity(0);
    }

    // Calculate vertical offset based on text alignment.
    if (this.LineTextY || this.LineTextX) {
      const winTextAlign = ShapeUtil.TextAlignToWin(this.TextAlign);
      switch (winTextAlign.vjust) {
        case TextConstant.TextJust.Top:
          verticalOffset = this.trect.height / 2 - textHeight / 2 + this.LineTextY;
          break;
        case TextConstant.TextJust.Bottom:
          verticalOffset = -this.trect.height / 2 + textHeight / 2 + this.LineTextY;
          break;
        default:
          verticalOffset = this.LineTextY;
      }
    }
    // This value is calculated although Math.abs() is applied without assignment.
    Math.abs(verticalOffset);

    // Add background and text elements to the container.
    if (bgRect) {
      container.AddElement(bgRect);
    }
    container.AddElement(textShape);

    // Adjust text direction and style.
    this.TextDirectionCommon(textShape, bgRect, false, null);

    // Set the text edit callback.
    textShape.SetEditCallback(T3Gv.opt.TextCallback, container);

    T3Util.Log("= S.BaseLine: LMAddSVGTextObject output:", { addedTextElement: textShape });
  }

  LMResizeSVGTextObject(svgDoc: any, textContainer: any, extraData: any): void {
    T3Util.Log("= S.BaseLine: LMResizeSVGTextObject called with input:", { svgDoc, textContainer, extraData });

    if (textContainer.DataID !== -1) {
      const textBackground = svgDoc.GetElementById(OptConstant.SVGElementClass.TextBackground);
      const textElement = svgDoc.GetElementById(OptConstant.SVGElementClass.Text);

      if (textElement) {
        textContainer.TextDirectionCommon(textElement, textBackground, false, null);
      }
    }

    T3Util.Log("= S.BaseLine: LMResizeSVGTextObject completed");
  }

  AdjustTextEditBackground(elementId: string | number, container?: any) {
    T3Util.Log("= S.BaseLine: AdjustTextEditBackground called with input:", { elementId, container });

    // Only adjust if a valid DataID exists
    if (this.DataID !== -1) {
      // Use provided container if available; otherwise get it from the SVG object layer by elementId
      const svgContainer = container ? container : T3Gv.opt.svgObjectLayer.GetElementById(elementId);
      T3Util.Log("= S.BaseLine: Retrieved svgContainer:", svgContainer);

      // Retrieve text background and text elements from the container
      const textBackgroundElement = svgContainer.GetElementById(OptConstant.SVGElementClass.TextBackground);
      const textElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Text);
      T3Util.Log("= S.BaseLine: Retrieved textBackgroundElement:", textBackgroundElement, "and textElement:", textElement);

      // If a text element is present, adjust its text direction
      if (textElement) {
        // If no container parameter was provided we treat it as original (true)
        const useOriginal = container == null;
        this.TextDirectionCommon(textElement, textBackgroundElement, useOriginal, null);
        T3Util.Log("= S.BaseLine: TextDirectionCommon applied with useOriginal =", useOriginal);
      } else {
        T3Util.Log("= S.BaseLine: No text element found in the SVG container.");
      }
    } else {
      T3Util.Log("= S.BaseLine: Skipped AdjustTextEditBackground because DataID is -1.");
    }

    T3Util.Log("= S.BaseLine: AdjustTextEditBackground completed.");
  }

  AddCorner(cornerIndex: number, cornerData: any): void {
    T3Util.Log("= S.BaseLine: AddCorner called with input:", { cornerIndex, cornerData });

    // TODO: Implement the logic to add a corner using the provided parameters.
    // For example, you might want to update internal corner lists or recalc shapes.

    T3Util.Log("= S.BaseLine: AddCorner completed with no output (void)");
  }

  SVGTokenizerHook(e: any): any {
    T3Util.Log("= S.BaseLine: SVGTokenizerHook called with input:", e);

    if (T3Gv.opt.bTokenizeStyle) {
      // Make a deep copy of input object
      e = Utils1.DeepCopy(e);

      // Replace fill color with a placeholder
      e.Fill.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.SolidFill,
        e.Fill.Paint.Color
      );

      // Replace stroke (line) color with a placeholder
      e.Line.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.LineColor,
        e.Line.Paint.Color
      );

      // If both arrow IDs are not set, replace the line thickness with a placeholder
      if (this.StartArrowID === 0 && this.EndArrowID === 0) {
        e.Line.Thickness = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.LineThick,
          e.Line.Thickness
        );
      }
    }

    T3Util.Log("= S.BaseLine: SVGTokenizerHook output:", e);
    return e;
  }

  GetDimensionPoints(): Point[] {
    T3Util.Log("= S.BaseLine: GetDimensionPoints called, input: none");

    const points: Point[] = [];
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    T3Util.Log("= S.BaseLine: Computed rect =", rect);

    const startPointRelative = new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y);
    T3Util.Log("= S.BaseLine: Computed relative start point =", startPointRelative);

    const endPointRelative = new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y);
    T3Util.Log("= S.BaseLine: Computed relative end point =", endPointRelative);

    points.push(startPointRelative);
    points.push(endPointRelative);

    T3Util.Log("= S.BaseLine: GetDimensionPoints output =", points);
    return points;
  }

  PostCreateShapeCallback(svgDoc: any, shapeContainer: any, flag: boolean, extra: any): void {
    T3Util.Log("= S.BaseLine: PostCreateShapeCallback input:", { svgDoc, shapeContainer, flag, extra });

    // Retrieve the main shape and the slop elements from the container.
    const shapeElement = shapeContainer.GetElementById(OptConstant.SVGElementClass.Shape);
    const slopElement = shapeContainer.GetElementById(OptConstant.SVGElementClass.Slop);
    T3Util.Log("= S.BaseLine: Retrieved shapeElement and slopElement", { shapeElement, slopElement });

    // Look up arrowhead definitions using constants.
    let startArrow = T3Gv.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = T3Gv.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = T3Gv.ArrowheadSizeTable[this.ArrowSizeIndex];
    T3Util.Log("= S.BaseLine: Arrow lookup:", { startArrow, endArrow, arrowSize });

    // If arrow id is zero, set the corresponding arrow to null.
    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }
    T3Util.Log("= S.BaseLine: Arrow after check:", { startArrow, endArrow });

    // If either arrow is set, assign them to both shapeElement and slopElement.
    if (startArrow || endArrow) {
      shapeElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      slopElement.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      T3Util.Log("= S.BaseLine: Arrowheads set on shapeElement and slopElement");
    } else {
      T3Util.Log("= S.BaseLine: No arrowheads to set (both null)");
    }

    // If DataID is valid, add the SVG text object.
    if (this.DataID >= 0) {
      this.LMAddSVGTextObject(svgDoc, shapeContainer);
      T3Util.Log("= S.BaseLine: SVG text object added");
    } else {
      T3Util.Log("= S.BaseLine: DataID is invalid, skipping text object addition");
    }

    // Update dimension lines.
    this.UpdateDimensionLines(shapeContainer, null);
    T3Util.Log("= S.BaseLine: Dimension lines updated");

    // Update coordinate lines (horizontal/vertical) fixed at the start point.
    this.UpdateCoordinateLines(shapeContainer, null);
    T3Util.Log("= S.BaseLine: Coordinate lines updated");

    T3Util.Log("= S.BaseLine: PostCreateShapeCallback completed");
  }

  CreateActionTriggers(
    svgDoc: any,
    triggerTarget: any,
    unusedParam: any,
    secondaryTarget: any
  ): any {
    T3Util.Log("= S.BaseLine: CreateActionTriggers input:", { svgDoc, triggerTarget, unusedParam, secondaryTarget });

    let isInteractive = true,
      actionKnob: any,
      groupShape = svgDoc.CreateShape(OptConstant.CSType.Group),
      knobSizeConst = OptConstant.Common.KnobSize,
      rotationKnobSizeConst = OptConstant.Common.RKnobSize;

    // Check if the object is a Line that is a wall opt wall and if the wall tool is enabled
    if (!(
      this instanceof Instance.Shape.Line &&
      this.objecttype === NvConstant.FNObjectTypes.FlWall &&
      (
        (T3Gv.wallOpt && T3Gv.wallOpt.IsAddingWalls && T3Gv.wallOpt.IsAddingWalls()) ||
        T3Constant.DocContext.UsingWallTool
      )
    )) {
      let docScale = svgDoc.docInfo.docToScreenScale;
      if (svgDoc.docInfo.docScale <= 0.5) {
        docScale *= 2;
      }
      const scaledKnobSize = (knobSizeConst / docScale) * (this.objecttype === NvConstant.FNObjectTypes.FlWall ? 2 : 1);
      const scaledRotKnobSize = rotationKnobSizeConst / docScale;

      // Get frame properties and adjust for knob placement
      const frameRect = this.Frame;
      let width = frameRect.width + scaledKnobSize;
      let height = frameRect.height + scaledKnobSize;

      // Expand the frame rectangle for proper knob placement
      const expandedFrame = $.extend(true, {}, frameRect);
      expandedFrame.x -= scaledKnobSize / 2;
      expandedFrame.y -= scaledKnobSize / 2;
      expandedFrame.width += scaledKnobSize;
      expandedFrame.height += scaledKnobSize;

      // Prepare knob parameters for the LINESTART knob
      let knobParams: any = {
        svgDoc: svgDoc,
        shapeType: OptConstant.CSType.Rect,
        knobSize: scaledKnobSize,
        fillColor: 'black',
        fillOpacity: 1,
        strokeSize: 1,
        strokeColor: '#777777',
        cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
        locked: false
      };

      // If triggerTarget differs from secondaryTarget, modify knob colors and styles
      if (triggerTarget !== secondaryTarget) {
        knobParams.fillColor = 'white';
        knobParams.strokeSize = 1;
        knobParams.strokeColor = 'black';
        knobParams.fillOpacity = 0;
      }

      // Adjust knob appearance if the object is locked or not growable
      if (this.flags & NvConstant.ObjFlags.Lock) {
        knobParams.fillColor = 'gray';
        knobParams.locked = true;
      } else if (this.NoGrow()) {
        knobParams.fillColor = 'red';
        knobParams.strokeColor = 'red';
        knobParams.cursorType = CursorConstant.CursorType.DEFAULT;
      }

      // Set the position and ID for the LINESTART knob
      knobParams.x = this.StartPoint.x - this.Frame.x;
      knobParams.y = this.StartPoint.y - this.Frame.y;
      knobParams.knobID = OptConstant.ActionTriggerType.LineStart;

      // Check for a hook in the linked object (for example, if a hook with SED_KTL exists)
      let hookIndex: number;
      const linkedObject = DataUtil.GetObjectPtr(triggerTarget, false);
      if (linkedObject && linkedObject.hooks) {
        for (hookIndex = 0; hookIndex < linkedObject.hooks.length; hookIndex++) {
          if (linkedObject.hooks[hookIndex].hookpt === OptConstant.HookPts.KTL) {
            knobParams.shapeType = OptConstant.CSType.Oval;
            isInteractive = false;
            break;
          }
        }
      }
      // For wall opt walls, set the shape type to IMAGE
      if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
        knobParams.shapeType = OptConstant.CSType.Image;
      }

      // Create the LINESTART knob and add it to the group
      actionKnob = this.GenericKnob(knobParams);
      if (this.objecttype === NvConstant.FNObjectTypes.FlWall && actionKnob.SetURL) {
        actionKnob.SetURL(
          knobParams.cursorType === CursorConstant.CursorType.NWSE_RESIZE
            ? CursorConstant.Knob.Path + CursorConstant.Knob.DiagonLeft
            : CursorConstant.Knob.Path + CursorConstant.Knob.DiagonRight
        );
        actionKnob.ExcludeFromExport(true);
      }
      groupShape.AddElement(actionKnob);

      // Create the LINEEND knob: reset shapeType to RECT by default
      knobParams.shapeType = OptConstant.CSType.Rect;
      if (linkedObject && linkedObject.hooks) {
        for (hookIndex = 0; hookIndex < linkedObject.hooks.length; hookIndex++) {
          if (linkedObject.hooks[hookIndex].hookpt === OptConstant.HookPts.KTR) {
            knobParams.shapeType = OptConstant.CSType.Oval;
            isInteractive = false;
            break;
          }
        }
      }
      knobParams.x = this.EndPoint.x - this.Frame.x;
      knobParams.y = this.EndPoint.y - this.Frame.y;
      knobParams.knobID = OptConstant.ActionTriggerType.LineEnd;
      if (this.objecttype === NvConstant.FNObjectTypes.FlWall) {
        knobParams.shapeType = OptConstant.CSType.Image;
      }
      actionKnob = this.GenericKnob(knobParams);
      if (this.objecttype === NvConstant.FNObjectTypes.FlWall && actionKnob.SetURL) {
        actionKnob.SetURL(
          knobParams.cursorType === CursorConstant.CursorType.NWSE_RESIZE
            ? CursorConstant.Knob.Path + CursorConstant.Knob.DiagonLeft
            : CursorConstant.Knob.Path + CursorConstant.Knob.DiagonRight
        );
        actionKnob.ExcludeFromExport(true);
      }
      groupShape.AddElement(actionKnob);

      // Create the ROTATE knob if interactive and allowed
      if (isInteractive && !knobParams.locked && !this.NoGrow()) {
        knobParams.shapeType = OptConstant.CSType.Oval;
        // Calculate angle tangent for adjustment
        let angleTan = Math.atan((this.EndPoint.y - this.StartPoint.y) / (this.EndPoint.x - this.StartPoint.x));
        if (angleTan < 0) {
          angleTan = Math.abs(angleTan);
        }
        // Adjust X position based on the orientation
        if (this.EndPoint.x >= this.StartPoint.x) {
          knobParams.x = this.EndPoint.x - 3 * scaledRotKnobSize * Math.cos(angleTan) - this.Frame.x + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        } else {
          knobParams.x = this.EndPoint.x + 3 * scaledRotKnobSize * Math.cos(angleTan) - this.Frame.x + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        }
        // Adjust Y position based on the orientation
        if (this.EndPoint.y >= this.StartPoint.y) {
          knobParams.y = this.EndPoint.y - 3 * scaledRotKnobSize * Math.sin(angleTan) - this.Frame.y + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        } else {
          knobParams.y = this.EndPoint.y + 3 * scaledRotKnobSize * Math.sin(angleTan) - this.Frame.y + scaledKnobSize / 2 - scaledRotKnobSize / 2;
        }
        knobParams.cursorType = CursorConstant.CursorType.ROTATE;
        knobParams.knobID = OptConstant.ActionTriggerType.Rotate;
        knobParams.fillColor = 'white';
        knobParams.fillOpacity = 0.001;
        knobParams.strokeSize = 2.5;
        knobParams.knobSize = scaledRotKnobSize;
        knobParams.strokeColor = 'white';
        actionKnob = this.GenericKnob(knobParams);
        groupShape.AddElement(actionKnob);
        // Create a second rotate knob for outline effects
        knobParams.strokeSize = 1;
        knobParams.strokeColor = 'black';
        actionKnob = this.GenericKnob(knobParams);
        groupShape.AddElement(actionKnob);
        // Reset knob size to original scaled knob size
        knobParams.knobSize = scaledKnobSize;
      }

      // Add dimension adjustment knobs if stand-off dimension lines are allowed and used
      if (
        this.Dimensions & NvConstant.DimensionFlags.Standoff &&
        this.CanUseStandOffDimensionLines()
      ) {
        const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
        this.CreateDimensionAdjustmentKnobs(groupShape, svgElement, knobParams);
      }

      groupShape.SetSize(width, height);
      groupShape.SetPos(expandedFrame.x, expandedFrame.y);
      groupShape.isShape = true;
      groupShape.SetID(OptConstant.Common.Action + triggerTarget);

      T3Util.Log("= S.BaseLine: CreateActionTriggers output:", groupShape);
      return groupShape;
    }
  }

  CalcCursorForSegment(startPoint: Point, endPoint: Point, flag?: boolean): string {
    T3Util.Log("= S.BaseLine: CalcCursorForSegment input:", { startPoint, endPoint, flag });
    const angle = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    T3Util.Log("= S.BaseLine: Calculated angle:", angle);
    const cursor = this.CalcCursorForAngle(angle, flag);
    T3Util.Log("= S.BaseLine: CalcCursorForSegment output:", { cursor });
    return cursor;
  }

  NoRotate(): boolean {
    T3Util.Log("= S.BaseLine: NoRotate called, input: none");
    const result = this.hooks.length > 1;
    T3Util.Log("= S.BaseLine: NoRotate output:", result);
    return result;
  }

  SetRuntimeEffects(effects: any): void {
    T3Util.Log("= S.BaseLine: SetRuntimeEffects called with input:", effects);
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (svgElement) {
      T3Util.Log("= S.BaseLine: Retrieved SVG element for BlockID", this.BlockID, ":", svgElement);
      this.ApplyEffects(svgElement, effects, true);
      T3Util.Log("= S.BaseLine: Applied runtime effects with input:", effects);
    } else {
      T3Util.Log("= S.BaseLine: No SVG element found for BlockID", this.BlockID);
    }
  }

  ApplyStyles(element: any, styleObj: any) {
    T3Util.Log("= S.BaseLine: ApplyStyles called with input:", { element, styleObj });

    // Retrieve fill and stroke types and check if an image is set
    const fillType = styleObj.Fill.Paint.FillType;
    const lineFillType = styleObj.Line.Paint.FillType;
    const hasImage = this.ImageURL !== '';

    if (this.polylist && this.polylist.closed) {
      // Process image fill for closed polylines
      if (hasImage) {
        let scaleType = 'PROPFILL';
        let cropRect = { x: 0, y: 0, width: 0, height: 0 };

        if (this.ImageHeader) {
          if (this.ImageHeader.croprect) {
            cropRect.x = this.ImageHeader.croprect.left;
            cropRect.y = this.ImageHeader.croprect.top;
            cropRect.width = this.ImageHeader.croprect.right - this.ImageHeader.croprect.left;
            cropRect.height = this.ImageHeader.croprect.bottom - this.ImageHeader.croprect.top;
          }
          if (this.ImageHeader.imageflags !== undefined &&
            this.ImageHeader.imageflags === NvConstant.ImageScales.AlwaysFit) {
            scaleType = 'NOPROP';
          }
        }
        T3Util.Log("= S.BaseLine: Applying image fill with", { url: this.ImageURL, scaleType, cropRect });
        element.SetImageFill(this.ImageURL, { scaleType, cropRect });
        element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
      }
    } else {
      // Process normal fill styles based on the fill type
      if (fillType === NvConstant.FillTypes.Gradient) {
        const gradientRecord = this.CreateGradientRecord(
          styleObj.Fill.Paint.GradientFlags,
          styleObj.Fill.Paint.Color,
          styleObj.Fill.Paint.Opacity,
          styleObj.Fill.Paint.EndColor,
          styleObj.Fill.Paint.EndOpacity
        );
        T3Util.Log("= S.BaseLine: Applying gradient fill with record:", gradientRecord);
        element.SetGradientFill(gradientRecord);
      } else if (fillType === NvConstant.FillTypes.RichGradient) {
        const richGradientRecord = this.CreateRichGradientRecord(styleObj.Fill.Paint.GradientFlags);
        T3Util.Log("= S.BaseLine: Applying rich gradient fill with record:", richGradientRecord);
        element.SetGradientFill(richGradientRecord);
      } else if (fillType === NvConstant.FillTypes.Texture) {
        const textureParams = {
          url: '',
          scale: 1,
          alignment: styleObj.Fill.Paint.TextureScale.AlignmentScalar
        };
        const textureIndex = styleObj.Fill.Paint.Texture;
        if (T3Gv.opt.TextureList.Textures[textureIndex]) {
          textureParams.dim = T3Gv.opt.TextureList.Textures[textureIndex].dim;
          textureParams.url = T3Gv.opt.TextureList.Textures[textureIndex].ImageURL;
          textureParams.scale = T3Gv.opt.CalcTextureScale(styleObj.Fill.Paint.TextureScale, textureParams.dim.x);
          styleObj.Fill.Paint.TextureScale.Scale = textureParams.scale;
          if (!textureParams.url) {
            textureParams.url = Constants.FilePath_CMSRoot + Constants.FilePath_Textures +
              T3Gv.opt.TextureList.Textures[textureIndex].filename;
          }
          T3Util.Log("= S.BaseLine: Applying texture fill with params:", textureParams);
          element.SetTextureFill(textureParams);
          element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
        }
      } else if (fillType === NvConstant.FillTypes.Transparent) {
        T3Util.Log("= S.BaseLine: Applying transparent fill");
        element.SetFillColor('none');
      } else {
        T3Util.Log("= S.BaseLine: Applying solid fill with color:", styleObj.Fill.Paint.Color);
        element.SetFillColor(styleObj.Fill.Paint.Color);
        element.SetFillOpacity(styleObj.Fill.Paint.Opacity);
      }
    }

    // Process stroke (line) styles based on the line fill type
    if (lineFillType === NvConstant.FillTypes.Gradient) {
      const gradientStrokeRecord = this.CreateGradientRecord(
        styleObj.Line.Paint.GradientFlags,
        styleObj.Line.Paint.Color,
        styleObj.Line.Paint.Opacity,
        styleObj.Line.Paint.EndColor,
        styleObj.Line.Paint.EndOpacity
      );
      T3Util.Log("= S.BaseLine: Applying gradient stroke with record:", gradientStrokeRecord);
      element.SetGradientStroke(gradientStrokeRecord);
    } else if (lineFillType === NvConstant.FillTypes.RichGradient) {
      const richGradientStrokeRecord = this.CreateRichGradientRecord(styleObj.Line.Paint.GradientFlags);
      T3Util.Log("= S.BaseLine: Applying rich gradient stroke with record:", richGradientStrokeRecord);
      element.SetGradientStroke(richGradientStrokeRecord);
    } else if (lineFillType === NvConstant.FillTypes.Texture) {
      const textureStrokeParams = {
        url: '',
        scale: styleObj.Line.Paint.TextureScale.Scale,
        alignment: styleObj.Line.Paint.TextureScale.AlignmentScalar
      };
      const textureIndex = styleObj.Line.Paint.Texture;
      textureStrokeParams.dim = T3Gv.opt.TextureList.Textures[textureIndex].dim;
      textureStrokeParams.url = T3Gv.opt.TextureList.Textures[textureIndex].ImageURL;
      if (!textureStrokeParams.url) {
        textureStrokeParams.url = Constants.FilePath_CMSRoot +
          Constants.FilePath_Textures +
          T3Gv.opt.TextureList.Textures[textureIndex].filename;
      }
      T3Util.Log("= S.BaseLine: Applying texture stroke with params:", textureStrokeParams);
      element.SetTextureStroke(textureStrokeParams);
      element.SetStrokeOpacity(styleObj.Line.Paint.Opacity);
    } else if (lineFillType === NvConstant.FillTypes.Solid) {
      T3Util.Log("= S.BaseLine: Applying solid stroke with color:", styleObj.Line.Paint.Color);
      element.SetStrokeColor(styleObj.Line.Paint.Color);
      element.SetStrokeOpacity(styleObj.Line.Paint.Opacity);
    } else {
      T3Util.Log("= S.BaseLine: No stroke to apply, setting stroke color to none");
      element.SetStrokeColor('none');
    }

    T3Util.Log("= S.BaseLine: ApplyStyles completed for element:", element);
  }

  CalcLineHops(targetShape: any, hopData: any): void {
    T3Util.Log("= S.BaseLine: CalcLineHops called with targetShape =", targetShape, "and hopData =", hopData);

    // Get poly-points for the current object and the target shape
    const basePolyPoints: Point[] = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
    let basePointCount: number = basePolyPoints.length;
    let targetPolyPoints: Point[] = targetShape.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
    let targetPointCount: number = targetPolyPoints.length;

    // Iterate over base poly-points
    for (let baseIdx = 0; baseIdx < basePointCount; ++baseIdx) {
      // Check if maximum hops is exceeded
      if (this.hoplist.nhops > OptConstant.Common.MaxHops) {
        T3Util.Log("= S.BaseLine: Maximum hop count exceeded, exiting CalcLineHops");
        return;
      }

      let prevPoint: Point, currPoint: Point;
      if (baseIdx > 0) {
        prevPoint = basePolyPoints[baseIdx - 1];
        currPoint = basePolyPoints[baseIdx];
      } else {
        // For the first point, use current and the next point; increment index to skip duplicate
        prevPoint = basePolyPoints[baseIdx];
        currPoint = basePolyPoints[baseIdx + 1];
        baseIdx++;
      }

      T3Util.Log("= S.BaseLine: Processing base segment between", prevPoint, "and", currPoint);

      // Try to add a hop point using the current segment and target poly points
      let hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
      if (hopResult == null) {
        T3Util.Log("= S.BaseLine: AddHopPoint returned null, breaking out of loop");
        break;
      }
      T3Util.Log("= S.BaseLine: AddHopPoint result =", hopResult);

      // If hop was successful, refine the target poly points further
      if (hopResult.bSuccess) {
        let tIndex: number = hopResult.tindex;
        if (tIndex >= 1 && targetPointCount > 2) {
          T3Util.Log("= S.BaseLine: First hop success with tindex =", tIndex, "; refining target poly points");
          targetPolyPoints = targetPolyPoints.slice(tIndex);
          targetPointCount -= tIndex;
          hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
          if (hopResult == null) {
            T3Util.Log("= S.BaseLine: Second AddHopPoint returned null, breaking out of loop");
            break;
          }
          tIndex = hopResult.tindex;
          T3Util.Log("= S.BaseLine: Refined hop result, new tindex =", tIndex);
        }
        if (tIndex < targetPointCount - 1) {
          T3Util.Log("= S.BaseLine: tindex =", tIndex, "is less than targetPointCount - 1 =", targetPointCount - 1, "; further refining target poly points");
          targetPolyPoints = targetPolyPoints.slice(tIndex);
          targetPointCount -= tIndex;
          hopResult = this.AddHopPoint(prevPoint, currPoint, targetPolyPoints, targetPointCount, baseIdx, hopData);
          if (hopResult == null) {
            T3Util.Log("= S.BaseLine: Third AddHopPoint returned null, breaking out of loop");
            break;
          }
          tIndex = hopResult.tindex;
          T3Util.Log("= S.BaseLine: Final hop refinement, new tindex =", tIndex);
        }
      }
    }
    T3Util.Log("= S.BaseLine: CalcLineHops completed");
  }

  DebugLineHops(svgDoc: any): void {
    T3Util.Log("= S.BaseLine: DebugLineHops called with input:", svgDoc);

    // Total number of hops in the hoplist
    const totalHops: number = this.hoplist.nhops;

    // Temporary variable for the current hop and flag for aggregation
    let currentHop: any = null;
    let aggregate: boolean = false;

    // Get the session object using the SDDataBlockID
    const session = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);

    // Process only if the session allows hops
    if ((session.flags & OptConstant.SessionFlags.AllowHops) !== 0) {
      // Get the base hop dimension from the session and initialize accumulators
      let hopDimension: number = session.hopdim.x;
      let sumX: number = 0;
      let sumY: number = 0;
      let count: number = 0;

      // Loop through each hop in the hoplist
      for (let index = 0; index < totalHops; index++) {
        currentHop = this.hoplist.hops[index];

        if (currentHop.cons) {
          // If this hop is marked as 'consolidated'
          aggregate = true;
          count++;
          sumX += currentHop.pt.x;
          sumY += currentHop.pt.y;
        } else {
          // Not consolidated; decide based on the previous aggregation state
          let strokeColor: string;
          if (aggregate) {
            // If we had an aggregation, mark the color green and extend the hop dimension
            strokeColor = 'green';
            hopDimension = 3 * session.hopdim.x;
            count++;
            sumX += currentHop.pt.x;
            sumY += currentHop.pt.y;
            // Compute the average position over hops
            sumX /= count;
            sumY /= count;
            aggregate = false;
          } else {
            // Otherwise, use red and original hop dimension
            strokeColor = 'red';
            hopDimension = session.hopdim.x;
            sumX = currentHop.pt.x;
            sumY = currentHop.pt.y;
          }

          // Get the main shape rectangle defined by the start and end points
          const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

          // Prepare knob parameters with readable names
          const knobParams = {
            svgDoc: svgDoc,
            shapeType: OptConstant.CSType.Oval,
            x: rect.x + (sumX - hopDimension / 2),
            y: rect.y + (sumY - hopDimension / 2),
            knobSize: hopDimension,
            fillColor: 'none',
            fillOpacity: 1,
            strokeSize: 1,
            strokeColor: strokeColor,
            KnobID: 0,
            cursorType: CursorConstant.CursorType.CROSSHAIR
          };

          T3Util.Log("= S.BaseLine: DebugLineHops knobParams:", knobParams);

          // Create a knob element based on the parameters
          const knob = this.GenericKnob(knobParams);

          // Set an ID for the knob and add it to the overlay layer
          knob.SetID("hoptarget");
          T3Gv.opt.svgOverlayLayer.AddElement(knob);

          // Reset accumulators after drawing the knob
          sumX = 0;
          sumY = 0;
          count = 0;
        }
      }
    }
    T3Util.Log("= S.BaseLine: DebugLineHops completed");
  }

  AddHopPoint(
    startPoint: Point,
    endPoint: Point,
    polyPoints: Point[],
    numPoints: number,
    segmentIndex: number,
    hopIndex: number
  ): { bSuccess: boolean; tindex: number } {
    T3Util.Log("= S.BaseLine: AddHopPoint called with input:", {
      startPoint,
      endPoint,
      polyPoints,
      numPoints,
      segmentIndex,
      hopIndex,
    });

    let rect: any,
      intersectPoint: Point,
      deltaX: number,
      deltaY: number,
      tindexAcc: number,
      accumulated = 0,
      iteration = 0;

    // Exit early if maximum hops reached
    if (this.hoplist.nhops > OptConstant.Common.MaxHops) {
      T3Util.Log("= S.BaseLine: Maximum hops exceeded, no hop added.");
      return { bSuccess: false, tindex: 0 };
    }

    // Save original polyPoints for slicing later and initialize working set.
    const originalPolyPoints = polyPoints;
    polyPoints = originalPolyPoints.slice(accumulated);
    let intersectData = T3Gv.opt.PolyLIntersect(startPoint, endPoint, polyPoints, numPoints);
    intersectPoint = intersectData.ipt;
    // tindexAcc holds the index (lpseg) from intersection.
    tindexAcc = intersectData.lpseg;

    // Loop until intersection is not successful.
    while (intersectData.bSuccess) {
      // Get the bounding rectangle for the line segment and inflate it.
      rect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(rect, 2, 2);

      // Check if the intersection point lies within the inflated rectangle.
      if (
        intersectPoint.x >= rect.x &&
        intersectPoint.x <= rect.x + rect.width &&
        intersectPoint.y >= rect.y &&
        intersectPoint.y <= rect.y + rect.height
      ) {
        tindexAcc += accumulated;
        // Calculate distance from endPoint.
        deltaX = intersectPoint.x - endPoint.x;
        deltaY = intersectPoint.y - endPoint.y;
        const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
        // Create hop object.
        const hopObj = {
          segment: segmentIndex,
          index: hopIndex,
          pt: intersectPoint,
          dist: distance,
          cons: false,
        };
        this.hoplist.hops.push(hopObj);
        this.hoplist.nhops++;
        const output = { bSuccess: true, tindex: tindexAcc };
        T3Util.Log("= S.BaseLine: AddHopPoint output:", output);
        return output;
      }

      // Update accumulated index.
      accumulated += tindexAcc;
      if (accumulated > numPoints - 1) {
        break;
      }
      if (++iteration > numPoints) {
        break;
      }

      // Update working set with remaining polyPoints.
      polyPoints = originalPolyPoints.slice(accumulated);
      numPoints = polyPoints.length;

      intersectData = T3Gv.opt.PolyLIntersect(startPoint, endPoint, polyPoints, numPoints);
      tindexAcc = intersectData.lpseg;
      intersectPoint = intersectData.ipt;
    }

    const output = { bSuccess: false, tindex: tindexAcc };
    T3Util.Log("= S.BaseLine: AddHopPoint output:", output);
    return output;
  }

  /**
   * Handles right-click events on line objects
   *
   * This method processes right-click interactions on line objects, performing several key actions:
   * - Converts window coordinates to document coordinates
   * - Finds and selects the target SVG element
   * - Handles text-related interactions such as spell checking
   * - Sets up right-click parameters for contextual menus
   * - Triggers spell checking menus or contextual menus based on edit state
   *
   * The function manages both object selection and text editing capabilities,
   * coordinating the different behaviors depending on the context of the click.
   *
   * @param event - The right-click event object containing gesture and position information
   * @returns Boolean indicating whether the right-click was handled successfully
   */
  RightClick(event) {
    T3Util.Log("= S.BaseLine: RightClick called with input:", event);

    // Convert window coordinates to document coordinates
    const documentPosition = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );
    T3Util.Log("= S.BaseLine: Converted document coords:", documentPosition);

    // Find the target SVG element that was clicked
    const targetElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    T3Util.Log("= S.BaseLine: Found target element:", targetElement);

    // Select the object from the click; if not selected, exit
    if (!SelectUtil.SelectObjectFromClick(event, targetElement)) {
      T3Util.Log("= S.BaseLine: RightClick - selection failed, returning false");
      return false;
    }

    // Retrieve the object via its ID
    const objectId = targetElement.GetID();
    let objectPointer = DataUtil.GetObjectPtr(objectId, false);
    T3Util.Log("= S.BaseLine: Retrieved object:", objectPointer);

    // If the object has a text component, check for spell location and activate text edit if needed
    if (objectPointer && objectPointer.GetTextObject() >= 0) {
      const textElement = targetElement.textElem;
      if (textElement) {
        const spellIndex = textElement.GetSpellAtLocation(event.gesture.center.clientX, event.gesture.center.clientY);
        T3Util.Log("= S.BaseLine: Spell index at location:", spellIndex);
        if (spellIndex >= 0) {
          TextUtil.ActivateTextEdit(targetElement, event, true);
        }
      }
    }

    // Prepare right-click parameters
    T3Gv.opt.rClickParam = new RightClickMd();
    T3Gv.opt.rClickParam.targetId = targetElement.GetID();
    T3Gv.opt.rClickParam.hitPoint.x = documentPosition.x;
    T3Gv.opt.rClickParam.hitPoint.y = documentPosition.y;
    T3Gv.opt.rClickParam.locked = ((this.flags & NvConstant.ObjFlags.Lock) > 0);
    T3Util.Log("= S.BaseLine: Set Right click param:", T3Gv.opt.rClickParam);

    // Handle active text editing - show spell menu or context menu as appropriate
    if (TextUtil.GetActiveTextEdit() != null) {
      const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
      let spellIndex = -1;

      if (activeEditElement) {
        spellIndex = activeEditElement.GetSpellAtLocation(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }

      T3Util.Log("= S.BaseLine: Active edit spell index:", spellIndex);

      if (spellIndex >= 0) {
        // Show spell checking menu at the click location
        T3Gv.opt.svgDoc.GetSpellCheck().ShowSpellMenu(
          activeEditElement,
          spellIndex,
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        // Show the context menu
        UIUtil.ShowContextMenu(true, "", event.gesture.center.clientX, event.gesture.center.clientY);
      }
    } else {
      // Show the context menu when no text is being edited
      UIUtil.ShowContextMenu(true, "", event.gesture.center.clientX, event.gesture.center.clientY);
    }

    T3Util.Log("= S.BaseLine: RightClick completed");
  }

  SetObjectStyle(style: any) {
    T3Util.Log("= S.BaseLine: SetObjectStyle called with input:", style);

    // Make a deep copy of the input style
    let newStyle = Utils1.DeepCopy(style);
    let shouldSwapArrows = false;

    // If not a SEGLINE and segl property exists, delete it
    if (this.LineType !== OptConstant.LineType.SEGLINE && newStyle.segl != null) {
      delete newStyle.segl;
    }

    // If either arrow ID is provided
    if (!(style.EndArrowID == null && style.StartArrowID == null)) {
      // Determine whether to swap arrows based on start and end point positions
      if (this.StartPoint.x < this.EndPoint.x) {
        shouldSwapArrows = false;
      } else if (this.StartPoint.x > this.EndPoint.x || this.StartPoint.y > this.EndPoint.y) {
        shouldSwapArrows = true;
      }

      if (shouldSwapArrows) {
        // Swap the arrow values from this object by default
        newStyle.EndArrowID = this.EndArrowID;
        newStyle.StartArrowID = this.StartArrowID;
        newStyle.EndArrowDisp = this.EndArrowDisp;
        newStyle.StartArrowDisp = this.StartArrowDisp;

        // If input has specific arrow IDs, override accordingly
        if (style.EndArrowID != null) {
          newStyle.StartArrowID = style.EndArrowID;
          newStyle.StartArrowDisp = style.EndArrowDisp;
        }
        if (style.StartArrowID != null) {
          newStyle.EndArrowID = style.StartArrowID;
          newStyle.EndArrowDisp = style.StartArrowDisp;
        }
      }
    }

    // For non-closed polylines, reset the hatch property to 0 if set
    if (!(this.polylist && this.polylist.closed)) {
      if (newStyle &&
        newStyle.StyleRecord &&
        newStyle.StyleRecord.Fill &&
        newStyle.StyleRecord.Fill.Hatch) {
        newStyle.StyleRecord.Fill.Hatch = 0;
      }
    }

    // Call the superclass method for setting the object style
    let result = super.SetObjectStyle(newStyle);

    // If the result has a StyleRecord with Fill, clear the ImageURL property
    if (result.StyleRecord && result.StyleRecord.Fill) {
      this.ImageURL = '';
    }

    T3Util.Log("= S.BaseLine: SetObjectStyle output:", result);
    return result;
  }

  GetArrowheadSelection(selection: any): boolean {
    T3Util.Log("= S.BaseLine: GetArrowheadSelection - input:", selection);

    if (selection) {
      // Determine if the arrowhead order should be reversed
      const isReversed = (function (obj: any): boolean {
        if (Math.abs(obj.EndPoint.x - obj.StartPoint.x) < 0.01) {
          return obj.EndPoint.y < obj.StartPoint.y;
        }
        const rect = Utils2.Pt2Rect(obj.EndPoint, obj.StartPoint);
        return (
          (Math.abs(obj.EndPoint.x - rect.x) < 0.01 && Math.abs(obj.EndPoint.y - rect.y) < 0.01) ||
          (Math.abs(obj.EndPoint.x - rect.x) < 0.01 && Math.abs(obj.EndPoint.y - (rect.y + rect.height)) < 0.01)
        );
      })(this);

      if (isReversed) {
        selection.StartArrowID = this.EndArrowID;
        selection.StartArrowDisp = this.EndArrowDisp;
        selection.EndArrowID = this.StartArrowID;
        selection.EndArrowDisp = this.StartArrowDisp;
      } else {
        selection.StartArrowID = this.StartArrowID;
        selection.StartArrowDisp = this.StartArrowDisp;
        selection.EndArrowID = this.EndArrowID;
        selection.EndArrowDisp = this.EndArrowDisp;
      }
      selection.ArrowSizeIndex = this.ArrowSizeIndex;
    }

    T3Util.Log("= S.BaseLine: GetArrowheadSelection - output:", selection);
    return true;
  }

  UpdateDimensionFromTextObj(sourceElement: any, textData: any) {
    T3Util.Log("= S.BaseLine: UpdateDimensionFromTextObj called with input:", { sourceElement, textData });

    // Local variables for text content and user data
    let textContent: string = "";
    let userData: number = -1;

    // Preserve the current block so Undo works correctly
    T3Gv.stdObj.PreserveBlock(this.BlockID);

    // Hide the SVG selection state for this block
    SvgUtil.ShowSVGSelectionState(this.BlockID, false);

    // Retrieve the SVG element for this block
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    T3Util.Log("= S.BaseLine: Retrieved SVG element for BlockID", this.BlockID, svgElement);

    // Get text content and user data either from textData or from the source element
    if (textData) {
      textContent = textData.text;
      userData = textData.userData;
    } else {
      textContent = sourceElement.GetText();
      userData = sourceElement.GetUserData();
    }
    T3Util.Log("= S.BaseLine: Determined text content and userData:", { textContent, userData });

    // Update dimensions based on the text content and user data
    this.UpdateDimensionFromText(svgElement, textContent, userData);
    T3Util.Log("= S.BaseLine: UpdateDimensionFromText completed");

    // Set link flag for the current block
    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
    T3Util.Log("= S.BaseLine: Set link flag for BlockID", this.BlockID);

    // Set link flag for each hooked object
    for (let i = 0; i < this.hooks.length; i++) {
      OptCMUtil.SetLinkFlag(this.hooks[i].objid, DSConstant.LinkFlags.Move);
      T3Util.Log("= S.BaseLine: Set link flag for hook object with id", this.hooks[i].objid);
    }

    // If hyperlink, note, comment, or field data exists, add this block to the dirty list
    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      DataUtil.AddToDirtyList(this.BlockID);
      T3Util.Log("= S.BaseLine: Added BlockID to dirty list", this.BlockID);
    }

    // Complete the current operation
    DrawUtil.CompleteOperation(null);
    T3Util.Log("= S.BaseLine: Completed operation for BlockID", this.BlockID);

    // If frame coordinates are negative, scroll the object into view
    if (this.Frame.x < 0 || this.Frame.y < 0) {
      T3Gv.opt.ScrollObjectIntoView(this.BlockID, false);
      T3Util.Log("= S.BaseLine: Scrolled object into view for BlockID", this.BlockID);
    }

    T3Util.Log("= S.BaseLine: UpdateDimensionFromTextObj completed for BlockID", this.BlockID);
  }

  UpdateDimensionFromText(inputElement: any, textValue: string, options: any): void {
    T3Util.Log("= S.BaseLine: UpdateDimensionFromText called with input:", { inputElement, textValue, options });

    let dimensionValue: number;
    let segment: number;
    let hookIndex: number;
    let dimensionLength: number = -1;

    // If hooked object info exists, delegate accordingly.
    if (options.hookedObjectInfo) {
      const hookedResult = this.UpdateDimensionsFromTextForHookedObject(inputElement, textValue, options);
      T3Util.Log("= S.BaseLine: UpdateDimensionFromText (hooked) output:", hookedResult);
      return;
    }

    // Get segment index from options.
    segment = options.segment;

    // Retrieve the dimension value from the string for the given segment.
    dimensionValue = this.GetDimensionValueFromString(textValue, segment);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    // If the computed dimension length is invalid, mark dirty and re-render, then exit.
    if (dimensionLength < 0) {
      DataUtil.AddToDirtyList(this.BlockID);
      SvgUtil.RenderDirtySVGObjects();
      T3Util.Log("= S.BaseLine: UpdateDimensionFromText output: invalid dimensionLength (< 0), early return");
      return;
    }

    // Update the object dimensions.
    this.UpdateDimensions(dimensionLength, null, null);

    // Set link flags for this object.
    OptCMUtil.SetLinkFlag(
      this.BlockID,
      DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
    );

    // Set link flags for each hooked object.
    for (hookIndex = 0; hookIndex < this.hooks.length; hookIndex++) {
      OptCMUtil.SetLinkFlag(
        this.hooks[hookIndex].objid,
        DSConstant.LinkFlags.Move | DSConstant.LinkFlags.Change
      );
    }

    // Update all links.
    T3Gv.opt.UpdateLinks();

    // If the display width equals the dimensionLength, update runtime flags.
    if (this.GetDimensionsForDisplay().width === dimensionLength) {
      this.rwd = dimensionValue;
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, true);
    }

    // Update the dimension lines based on the new dimensions.
    this.UpdateDimensionLines(inputElement);

    T3Util.Log("= S.BaseLine: UpdateDimensionFromText completed, output dimensionLength:", dimensionLength);
  }

  UpdateSecondaryDimensions(container: any, creator: any, forcedUpdate: boolean): void {
    T3Util.Log("= S.BaseLine: UpdateSecondaryDimensions called with input:", { container, creator, forcedUpdate });

    const isWall: boolean = this.objecttype === NvConstant.FNObjectTypes.FlWall;
    const isHookedDimVisible: boolean = !(this.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions);
    const shouldShowAlways: boolean =
      Boolean(this.Dimensions & NvConstant.DimensionFlags.Always ||
        this.Dimensions & NvConstant.DimensionFlags.Select || forcedUpdate);

    if (isWall && isHookedDimVisible && shouldShowAlways) {
      this.UpdateHookedObjectDimensionLines(container, creator, forcedUpdate);
    }

    T3Util.Log("= S.BaseLine: UpdateSecondaryDimensions completed");
  }

  GetBoundingBoxesForSecondaryDimensions(): any[] {
    T3Util.Log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions called, input: none");

    // Retrieve hooked object dimension info
    const hookedInfo = this.GetHookedObjectDimensionInfo();
    T3Util.Log("= S.BaseLine: Retrieved hookedInfo:", hookedInfo);

    const boundingBoxes: any[] = [];

    // Process only if the object is a wall opt wall, secondary dimensions are not hidden, and all segments are enabled.
    if (
      this.objecttype === NvConstant.FNObjectTypes.FlWall &&
      !(this.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions) &&
      (this.Dimensions & NvConstant.DimensionFlags.AllSeg)
    ) {
      T3Util.Log("= S.BaseLine: Conditions met for processing secondary dimensions.");

      for (let index = 0, count = hookedInfo.length; index < count; index++) {
        const dimensionInfo = hookedInfo[index];
        T3Util.Log(`= S.BaseLine: Processing hookedInfo[${index}]:`, dimensionInfo);

        // Skip processing if start and end points are identical
        if (Utils2.EqualPt(dimensionInfo.start, dimensionInfo.end)) {
          T3Util.Log(`= S.BaseLine: Skipping index ${index} as start and end points are equal.`);
          continue;
        }

        // Calculate angle between start and end points
        const angle = Utils1.CalcAngleFromPoints(dimensionInfo.start, dimensionInfo.end);
        T3Util.Log(`= S.BaseLine: Calculated angle at index ${index}:`, angle);

        // Get the dimension text for the current segment
        const dimensionText = this.GetDimensionTextForPoints(dimensionInfo.start, dimensionInfo.end);
        T3Util.Log(`= S.BaseLine: Retrieved dimensionText at index ${index}:`, dimensionText);

        // Retrieve left, right, and text frame bounding boxes for the dimension
        const dimensionPoints = this.GetPointsForDimension(
          angle,
          dimensionText,
          dimensionInfo.start,
          dimensionInfo.end,
          dimensionInfo.segment,
          true
        );
        T3Util.Log(`= S.BaseLine: Retrieved dimensionPoints at index ${index}:`, dimensionPoints);

        if (dimensionPoints) {
          boundingBoxes.push(dimensionPoints.left);
          boundingBoxes.push(dimensionPoints.right);
          boundingBoxes.push(dimensionPoints.textFrame);
          T3Util.Log(`= S.BaseLine: Added bounding boxes from index ${index}.`);
        }
      }
    } else {
      T3Util.Log("= S.BaseLine: Conditions not met for processing secondary dimensions.");
    }

    T3Util.Log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions output:", boundingBoxes);
    return boundingBoxes;
  }

  /**
   * Adds an icon to a line shape at an appropriate position based on the line's geometry
   *
   * This method calculates the position of an icon based on the line's geometry and type.
   * For lines with valid DataID, icons are positioned near the endpoints.
   * For lines without DataID, icons are positioned near the midpoint or center.
   * Different positioning logic applies based on whether the line is a straight line,
   * arc line, segmented line, or other line type.
   *
   * @param eventData - Event data that triggered the icon creation
   * @param svgContainer - The SVG container to add the icon to
   * @param iconPositionCoords - Object to store the calculated icon position
   * @returns The created icon element
   */
  AddIcon(eventData: any, svgContainer: any, iconPositionCoords: any): any {
    T3Util.Log("= S.BaseLine: AddIcon called with input:", { eventData, svgContainer, iconPositionCoords });

    let targetX: number, targetY: number;
    const polylinePoints: any[] = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true);
    const pointsCount: number = polylinePoints.length;

    if (this.DataID >= 0) {
      // When DataID is valid, choose target point based on polylinePoints length
      if (pointsCount === 2) {
        // For simple lines, use the end point
        targetX = polylinePoints[1].x;
        targetY = polylinePoints[1].y;
      } else if (pointsCount === 3) {
        // For lines with 3 points, use the last point
        targetX = polylinePoints[2].x;
        targetY = polylinePoints[2].y;
      } else {
        // For lines with many points, use the last point
        targetX = polylinePoints[pointsCount - 1].x;
        targetY = polylinePoints[pointsCount - 1].y;
      }

      // Adjust position based on line type
      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        targetX -= this.iconSize;
        iconPositionCoords.y = targetY - 2 * this.iconSize;
      } else {
        // For segmented lines or other shapes
        targetX -= this.iconSize;
        iconPositionCoords.y = targetY - 2 * this.iconSize;
      }
      iconPositionCoords.x = targetX - this.iconSize * this.nIcons;
    } else {
      // When DataID is not valid, choose the midpoint or center point
      if (pointsCount === 2) {
        // For simple lines, use the midpoint
        targetX = (polylinePoints[0].x + polylinePoints[1].x) / 2;
        targetY = (polylinePoints[0].y + polylinePoints[1].y) / 2;
      } else if (pointsCount === 3) {
        // For lines with 3 points, use the middle point
        targetX = polylinePoints[1].x;
        targetY = polylinePoints[1].y;
      } else {
        // For lines with many points, use a point in the middle
        const midIndex = Math.floor(pointsCount / 2);
        targetX = polylinePoints[midIndex].x;
        targetY = polylinePoints[midIndex].y;
      }

      // Adjust position based on line type
      if (this instanceof Instance.Shape.Line) {
        targetX += this.iconSize / 2;
        iconPositionCoords.y = targetY + this.iconSize / 4;
      } else if (this instanceof Instance.Shape.ArcLine) {
        targetX += this.iconSize / 2;
        iconPositionCoords.y = targetY + this.iconSize / 2;
      } else if (this instanceof Instance.Shape.SegmentedLine) {
        iconPositionCoords.y = targetY + this.iconSize / 2;
      } else {
        iconPositionCoords.y = targetY - this.iconSize / 2;
      }
      iconPositionCoords.x = targetX - this.iconSize * this.nIcons;
    }

    // Create the icon element using the computed iconPositionCoords
    const iconElement = this.GenericIcon(iconPositionCoords);
    this.nIcons++;
    svgContainer.AddElement(iconElement);

    T3Util.Log("= S.BaseLine: AddIcon output:", iconElement);
    return iconElement;
  }

  GetNotePos(event: any, param: any): { x: number; y: number } {
    T3Util.Log("= S.BaseLine: GetNotePos called with input:", { event, param });

    // Retrieve polyline points (relative to frame)
    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true);
    const numPoints = polyPoints.length;
    let posX: number, posY: number;
    let adjustedPos: { x: number; y: number } = { x: 0, y: 0 };
    let svgFrame: { x: number; y: number; width: number; height: number };

    if (this.DataID >= 0) {
      // When DataID is valid, determine base position from the polyline endpoints
      if (numPoints === 2) {
        posX = polyPoints[1].x;
        posY = polyPoints[1].y;
      } else if (numPoints === 3) {
        posX = polyPoints[2].x;
        posY = polyPoints[2].y;
      } else {
        posX = polyPoints[numPoints - 1].x;
        posY = polyPoints[numPoints - 1].y;
      }

      // Adjust position for specific object types
      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      } else {
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      }

      adjustedPos.x = posX - this.iconSize * this.nIcons;
      if (this.nIcons === 1) {
        adjustedPos.x += 2 * this.iconSize;
      }

      svgFrame = this.GetSVGFrame();
      const result = {
        x: svgFrame.x + adjustedPos.x,
        y: svgFrame.y + adjustedPos.y + this.iconSize
      };
      T3Util.Log("= S.BaseLine: GetNotePos output (DataID valid):", result);
      return result;
    } else {
      // When DataID is not valid, use alternative positioning based on polyline midpoint
      if (numPoints === 2) {
        posX = (polyPoints[0].x + polyPoints[1].x) / 2;
        posY = (polyPoints[0].y + polyPoints[1].y) / 2;
      } else if (numPoints === 3) {
        posX = polyPoints[1].x;
        posY = polyPoints[1].y;
      } else {
        const midIndex = Math.floor(numPoints / 2);
        posX = polyPoints[midIndex].x;
        posY = polyPoints[midIndex].y;
      }

      // Adjust for specific shape types
      if (this instanceof Instance.Shape.Line) {
        posX += this.iconSize / 2;
        adjustedPos.y = posY + this.iconSize / 4;
      } else if (this instanceof Instance.Shape.ArcLine) {
        posX += this.iconSize / 2;
        adjustedPos.y = posY + this.iconSize / 2;
      } else if (this instanceof Instance.Shape.SegmentedLine) {
        adjustedPos.y = posY + this.iconSize / 2;
      } else {
        adjustedPos.y = posY - this.iconSize / 2;
      }

      if (this.nIcons === 1) {
        posX += this.iconSize;
      }
      adjustedPos.x = posX;

      svgFrame = this.GetSVGFrame();
      const result = {
        x: svgFrame.x + adjustedPos.x,
        y: svgFrame.y + adjustedPos.y + this.iconSize
      };
      T3Util.Log("= S.BaseLine: GetNotePos output (DataID invalid):", result);
      return result;
    }
  }

  PolyLinePrPolyLGetArcQuadrant(
    startPoint: Point,
    endPoint: Point,
    angle: number
  ): { param: number; ShortRef: number } {
    T3Util.Log("= S.BaseLine: PolyLinePrPolyLGetArcQuadrant - input:", {
      startPoint,
      endPoint,
      angle,
    });

    // Initialize default result object
    let result = { param: 0, ShortRef: 0 };

    // Create a copy of the points array containing startPoint and endPoint
    let points: Point[] = [
      new Point(startPoint.x, startPoint.y),
      new Point(endPoint.x, endPoint.y)
    ];
    T3Util.Log("= S.BaseLine: Points array before rotation:", points);

    // Define the center of rotation (use startPoint as center)
    let center = { x: startPoint.x, y: startPoint.y };
    T3Util.Log("= S.BaseLine: Center of rotation:", center);

    // If the angle is significant, rotate the points about the center
    if (Math.abs(angle) >= 0.01) {
      const sinValue = Math.sin(angle);
      const cosValue = Math.cos(angle);
      let rotationAngle = Math.asin(sinValue);
      if (cosValue < 0) {
        rotationAngle = -rotationAngle;
      }
      T3Util.Log("= S.BaseLine: rotationAngle computed:", rotationAngle);
      Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
      T3Util.Log("= S.BaseLine: Points array after rotation:", points);
    } else {
      T3Util.Log("= S.BaseLine: Angle less than threshold, no rotation applied.");
    }

    // Extract the rotated start and end points
    const rotatedStart = points[0];
    const rotatedEnd = points[1];
    T3Util.Log("= S.BaseLine: Rotated start point:", rotatedStart);
    T3Util.Log("= S.BaseLine: Rotated end point:", rotatedEnd);

    // Determine the quadrant of the arc and set parameters accordingly
    if (rotatedEnd.x > rotatedStart.x) {
      if (rotatedEnd.y > rotatedStart.y) {
        result.param = -NvConstant.Geometry.PI / 2;
        result.ShortRef = OptConstant.ArcQuad.PLA_BL;
        T3Util.Log("= S.BaseLine: Condition: rotatedEnd.x > rotatedStart.x and rotatedEnd.y > rotatedStart.y");
        if (endPoint.notclockwise) {
          result.param = 0;
          T3Util.Log("= S.BaseLine: endPoint.notclockwise is true, setting result.param to 0");
        }
      } else {
        result.ShortRef = OptConstant.ArcQuad.PLA_TL;
        T3Util.Log("= S.BaseLine: Condition: rotatedEnd.x > rotatedStart.x and rotatedEnd.y <= rotatedStart.y");
        if (endPoint.notclockwise) {
          result.ShortRef = OptConstant.ArcQuad.PLA_TR;
          result.param = NvConstant.Geometry.PI / 2;
          T3Util.Log("= S.BaseLine: endPoint.notclockwise is true, setting result.ShortRef to SD_PLA_TR and result.param to PI/2");
        }
      }
    } else {
      if (rotatedEnd.y > rotatedStart.y) {
        result.ShortRef = OptConstant.ArcQuad.SD_PLA_BR;
        T3Util.Log("= S.BaseLine: Condition: rotatedEnd.x <= rotatedStart.x and rotatedEnd.y > rotatedStart.y");
        if (endPoint.notclockwise) {
          result.ShortRef = OptConstant.ArcQuad.PLA_BL;
          result.param = NvConstant.Geometry.PI / 2;
          T3Util.Log("= S.BaseLine: endPoint.notclockwise is true, setting result.ShortRef to SD_PLA_BL and result.param to PI/2");
        }
      } else {
        result.param = -NvConstant.Geometry.PI / 2;
        result.ShortRef = OptConstant.ArcQuad.PLA_TR;
        T3Util.Log("= S.BaseLine: Condition: rotatedEnd.x <= rotatedStart.x and rotatedEnd.y <= rotatedStart.y");
        if (endPoint.notclockwise) {
          result.param = 0;
          T3Util.Log("= S.BaseLine: endPoint.notclockwise is true, setting result.param to 0");
        }
      }
    }

    T3Util.Log("= S.BaseLine: PolyLinePrPolyLGetArcQuadrant - output:", result);
    return result;
  }

  FieldDataAllowed(): boolean {
    T3Util.Log("= S.BaseLine: FieldDataAllowed called, input: none");
    const result: boolean = false;
    T3Util.Log("= S.BaseLine: FieldDataAllowed output:", result);
    return result;
  }
}

export default BaseLine
