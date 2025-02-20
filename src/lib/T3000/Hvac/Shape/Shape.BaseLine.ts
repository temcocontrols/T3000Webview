



import BaseDrawingObject from './Shape.BaseDrawingObject'
import Utils2 from "../Helper/Utils2";
import Instance from "../Data/Instance/Instance"
import ConstantData from "../Data/ConstantData"

class BaseLine extends BaseDrawingObject {

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
    console.log("= S.BaseLine: constructor called with input:", params);

    // Ensure params is defined and set default values
    params = params || {};
    params.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.LINE;
    params.maxhooks = 2;

    if (typeof params.targflags === "undefined") {
      params.targflags = ConstantData.HookFlags.SED_LC_Line | ConstantData.HookFlags.SED_LC_AttachToLine;
    }

    if (typeof params.hookflags === "undefined") {
      params.hookflags = ConstantData.HookFlags.SED_LC_Shape | ConstantData.HookFlags.SED_LC_Line;
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

    console.log("= S.BaseLine: constructor output:", this);
  }

  checkIfPolyLine(polylineObj: any): boolean {
    console.log("= S.BaseLine: checkIfPolyLine called with input:", polylineObj);

    const PolyLineClass = Instance.Shape.PolyLine;
    const isPolyLine = polylineObj instanceof PolyLineClass;

    console.log("= S.BaseLine: checkIfPolyLine output:", isPolyLine);
    return isPolyLine;
  }

  CalcFrame(inputFlag?: boolean): void {
    console.log("= S.BaseLine: CalcFrame called with inputFlag =", inputFlag);

    // Calculate the initial frame from start and end points
    let isSegLine = false;
    this.Frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: Initial Frame calculated as", this.Frame);

    // Check if the line type requires segment processing
    if (this.LineType === ConstantData.LineType.SEGLINE) {
      isSegLine = true;
      console.log("= S.BaseLine: LineType is SEGLINE, setting isSegLine to", isSegLine);
    }

    // Get the polygon points for the frame computation
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, isSegLine, false, null);
    console.log("= S.BaseLine: Retrieved polyPoints:", polyPoints);

    // If polyPoints exist, update the frame accordingly
    if (polyPoints && polyPoints.length) {
      Utils2.GetPolyRect(this.Frame, polyPoints);
      console.log("= S.BaseLine: Updated Frame using polyPoints:", this.Frame);
    }

    // Update the frame with additional properties if needed
    this.UpdateFrame(this.Frame, inputFlag);
    console.log("= S.BaseLine: Final Frame after UpdateFrame:", this.Frame);
  }

  GetArrowheadFormat(): ArrowheadRecord {
    console.log("= S.BaseLine: GetArrowheadFormat called");
    console.log("= S.BaseLine: Input this =", this);

    const arrHead = new ArrowheadRecord();
    if (SDF.LineIsReversed(this, null, false)) {
      console.log("= S.BaseLine: Line is reversed");
      arrHead.StartArrowID = this.EndArrowID;
      arrHead.EndArrowID = this.StartArrowID;
      arrHead.StartArrowDisp = this.EndArrowDisp;
      arrHead.EndArrowDisp = this.StartArrowDisp;
    } else {
      console.log("= S.BaseLine: Line is not reversed");
      arrHead.StartArrowID = this.StartArrowID;
      arrHead.EndArrowID = this.EndArrowID;
      arrHead.StartArrowDisp = this.StartArrowDisp;
      arrHead.EndArrowDisp = this.EndArrowDisp;
    }
    arrHead.ArrowSizeIndex = this.ArrowSizeIndex;

    console.log("= S.BaseLine: Output ArrowheadRecord =", arrHead);
    return arrHead;
  }

  GetSVGFrame(inputFrame?: any): any {
    console.log("= S.BaseLine: GetSVGFrame called with input:", inputFrame);
    let frame: any = {};

    if (inputFrame != null) {
      Utils2.CopyRect(frame, inputFrame);
    } else {
      frame = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    }

    console.log("= S.BaseLine: GetSVGFrame output:", frame);
    return frame;
  }

  GetPositionRect(): any {
    console.log("= S.BaseLine: GetPositionRect called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const positionRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    console.log("= S.BaseLine: GetPositionRect output:", positionRect);
    return positionRect;
  }

  AdjustPinRect(pinRect: any, offset: any, additional: any): any {
    console.log("= S.BaseLine: AdjustPinRect called with", { pinRect, offset, additional });
    const adjustedPinRect =
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR
        ? GlobalData.optManager.GanttAdjustPinRect(this.BlockID, pinRect, offset, additional)
        : pinRect;
    console.log("= S.BaseLine: AdjustPinRect output:", adjustedPinRect);
    return adjustedPinRect;
  }

  GetDimensions(): { x: number; y: number } {
    console.log("= S.BaseLine: GetDimensions called with StartPoint:", this.StartPoint, "and EndPoint:", this.EndPoint);
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    const dimensions = { x: distance, y: 0 };
    console.log("= S.BaseLine: GetDimensions output:", dimensions);
    return dimensions;
  }

  GetDimensionsForDisplay(): { x: number; y: number; width: number; height: number } {
    console.log("= S.BaseLine: GetDimensionsForDisplay called with no input parameters");

    const dimensions = this.GetDimensions();
    console.log("= S.BaseLine: Dimensions retrieved:", dimensions);

    const result = {
      x: this.Frame.x,
      y: this.Frame.y,
      width: dimensions.x,
      height: dimensions.y,
    };

    console.log("= S.BaseLine: GetDimensionsForDisplay output:", result);
    return result;
  }

  GetSnapRect() {
    console.log("= S.BaseLine: GetSnapRect called with no input");

    // Create a snap rectangle by copying the current frame.
    let snapRect: any = {};
    Utils2.CopyRect(snapRect, this.Frame);
    console.log("= S.BaseLine: Initial snapRect copied from Frame:", snapRect);

    // If the object is a floorplan wall, adjust the snap rectangle dimensions.
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
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
      console.log("= S.BaseLine: snapRect after inflation for floorplan wall:", snapRect);
    }

    console.log("= S.BaseLine: GetSnapRect returning:", snapRect);
    return snapRect;
  }

  CanSnapToShapes(input: any): number {
    console.log("= S.BaseLine: CanSnapToShapes called with input:", input);

    if (input && this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      if (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x, this.StyleRecord.Line.BThick)) {
        input.distanceonly = ConstantData.Guide_DistanceTypes.Vertical_Wall;
        console.log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Vertical_Wall");
        return this.BlockID;
      }
      if (Utils2.IsEqual(this.StartPoint.y, this.EndPoint.y, this.StyleRecord.Line.BThick)) {
        input.distanceonly = ConstantData.Guide_DistanceTypes.Horizontal_Wall;
        console.log("= S.BaseLine: CanSnapToShapes output:", this.BlockID, "for Horizontal_Wall");
        return this.BlockID;
      }
    }

    console.log("= S.BaseLine: CanSnapToShapes output: -1");
    return -1;
  }

  IsSnapTarget(): boolean {
    console.log("= S.BaseLine: IsSnapTarget called with no input");
    const result = false;
    console.log("= S.BaseLine: IsSnapTarget output:", result);
    return result;
  }

  GuideDistanceOnly(): any {
    console.log("= S.BaseLine: Guide_DistanceOnly called");

    const isFloorPlanWall = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;
    const result = isFloorPlanWall ? ConstantData.Guide_DistanceTypes.PolyWall : false;

    console.log("= S.BaseLine: Guide_DistanceOnly returning", result);
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
    console.log("= S.BaseLine: CreateDimension called with input:", {
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
      console.log("= S.BaseLine: CreateDimension output:", result);
      return result;
    }

    console.log("= S.BaseLine: CreateDimension condition not met, returning undefined.");
    return undefined;
  }

  GetDimensionTextForPoints(e, t) {
    //'use strict';
    var a,
      r = [],
      i = 0,
      n = 0,
      o = 0,
      s = 0,
      l = 0;
    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      var S = this.GetPolyPoints(200, !0, !1, !1, null);
      for (a = 1; a < S.length; a++) s = Math.abs(S[a].x - S[a - 1].x),
        l = Math.abs(S[a].y - S[a - 1].y),
        (s || l) &&
        (o += Math.sqrt(s * s + l * l))
    } else i = 360 - Utils1.CalcAngleFromPoints(e, t),
      n = 2 * Math.PI * (i / 360),
      r.push(new Point(e.x, e.y)),
      r.push(new Point(t.x, t.y)),
      Utils3.RotatePointsAboutCenter(this.Frame, - n, r),
      o = Math.abs(r[0].x - r[1].x);
    return this.GetLengthInRulerUnits(o)
  }

  EnforceMinimum(e) {
    var t,
      a = ConstantData.Defines.SED_MinDim;
    if (Utils2.IsEqual(this.EndPoint.x, this.StartPoint.x)) t = this.EndPoint.y - this.StartPoint.y,
      Math.abs(t) < a &&
      this.hooks.length < 2 &&
      (
        t >= 0 ? e ? this.StartPoint.y = this.EndPoint.y - a : this.EndPoint.y = this.StartPoint.y + a : e ? this.StartPoint.y = this.EndPoint.y + a : this.EndPoint.y = this.StartPoint.y - a
      );
    else if (Utils2.IsEqual(this.EndPoint.y, this.StartPoint.y)) t = this.EndPoint.x - this.StartPoint.x,
      Math.abs(t) < a &&
      this.hooks.length < 2 &&
      (
        t >= 0 ? e ? this.StartPoint.x = this.EndPoint.x - a : this.EndPoint.x = this.StartPoint.x + a : e ? this.StartPoint.x = this.EndPoint.x + a : this.EndPoint.x = this.StartPoint.x - a
      );
    else {
      var r,
        i;
      r = this.EndPoint.x - this.StartPoint.x,
        i = this.EndPoint.y - this.StartPoint.y,
        Math.abs(r) < a &&
        Math.abs(i) < a &&
        this.hooks.length < 2 &&
        (
          Math.abs(r) >= Math.abs(i) ? r >= 0 ? e ? this.StartPoint.x = this.EndPoint.x - a : this.EndPoint.x = this.StartPoint.x + a : e ? this.StartPoint.x = this.EndPoint.x + a : this.EndPoint.x = this.StartPoint.x - a : i >= 0 ? e ? this.StartPoint.y = this.EndPoint.y - a : this.EndPoint.y = this.StartPoint.y + a : e ? this.StartPoint.y = this.EndPoint.y + a : this.EndPoint.y = this.StartPoint.y - a
        )
    }
  }

  UpdateDimensions(newLength: number, unusedParam1: any, unusedParam2: any): void {
    console.log("= S.BaseLine: UpdateDimensions called with input:", { newLength, unusedParam1, unusedParam2 });

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
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select
      ) {
        shiftY += ConstantData.Defines.DimensionDefaultStandoff;
      }
      adjustedY += shiftY;
    }

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Adjust the line end point using the calculated coordinates
    this.AdjustLineEnd(svgElement, adjustedX, adjustedY, ConstantData.ActionTriggerType.LINEEND, true);

    // If there's any shift, adjust the line start point accordingly
    if (shiftX > 0 || shiftY > 0) {
      adjustedX = this.StartPoint.x + shiftX;
      adjustedY = this.StartPoint.y + shiftY;
      this.AdjustLineStart(svgElement, adjustedX, adjustedY, ConstantData.ActionTriggerType.LINESTART, true);
    }

    console.log("= S.BaseLine: UpdateDimensions output: StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  OffsetShape(offsetX: number, offsetY: number): void {
    console.log("= S.BaseLine: OffsetShape called with offsetX:", offsetX, "offsetY:", offsetY);

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

    console.log("= S.BaseLine: OffsetShape updated Frame:", this.Frame, "StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  SetShapeOrigin(newX: number, newY: number, additionalParam: any): void {
    console.log("= S.BaseLine: SetShapeOrigin called with newX:", newX, "newY:", newY, "additionalParam:", additionalParam);

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

    console.log("= S.BaseLine: SetShapeOrigin updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  UpdateFrame(inputFrame, shouldRedraw) {
    console.log("= S.BaseLine: UpdateFrame called with inputFrame:", inputFrame, "shouldRedraw:", shouldRedraw);

    let arrowheadBounds;
    let shapeElement;
    let frame = inputFrame || this.Frame;
    let lineTextRect = this.LineTextX ? $.extend(true, {}, this.trect) : null;
    let lineThickness = this.StyleRecord?.Line?.Thickness || 0;
    let minLineThickness = Math.max(lineThickness, ConstantData.Defines.SED_MinWid);

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
    if (GlobalData.optManager) {
      shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

      if (shouldRedraw) {
        if (shapeElement) {
          GlobalData.optManager.svgObjectLayer.RemoveElement(shapeElement);
          Collab.NoRedrawFromSameEditor = false;
        }
        shapeElement = this.CreateShape(GlobalData.optManager.svgDoc, false);
      } else if (shapeElement) {
        frame = this.GetSVGFrame();
        shapeElement = shapeElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
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
    if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL && !this.LineTextX) {
      let textParams = this.GetTextOnLineParams(this.BlockID);
      let textRect = Utils2.Pt2Rect(textParams.StartPoint, textParams.EndPoint);

      if (!this.TextWrapWidth) {
        let diagonal = Math.sqrt(frame.width ** 2 + frame.height ** 2);
        this.TextWrapWidth = diagonal / 2;
      }

      let widthDifference = textRect.width - this.TextWrapWidth;
      switch (SDF.TextAlignToWin(this.TextAlign).just) {
        case FileParser.TextJust.TA_LEFT:
          this.trect.x = textRect.x;
          this.trect.width = this.TextWrapWidth;
          break;
        case FileParser.TextJust.TA_RIGHT:
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

    console.log("= S.BaseLine: UpdateFrame output:", this.Frame, this.r);
  }

  GetHitTestFrame(): any {
    console.log("= S.BaseLine: GetHitTestFrame called");

    // Create a copy of the current frame
    let hitTestFrame = {};
    Utils2.CopyRect(hitTestFrame, this.Frame);
    console.log("= S.BaseLine: Initial hitTestFrame copied from Frame:", hitTestFrame);

    // Inflate the rectangle by half the knob size
    const knobSize = ConstantData.Defines.SED_KnobSize;
    Utils2.InflateRect(hitTestFrame, knobSize / 2, knobSize / 2);
    console.log("= S.BaseLine: Inflated hitTestFrame by knob size:", hitTestFrame);

    // Union the inflated rectangle with the main rectangle
    hitTestFrame = Utils2.UnionRect(hitTestFrame, this.r, hitTestFrame);
    console.log("= S.BaseLine: Final hitTestFrame after union with main rectangle:", hitTestFrame);

    return hitTestFrame;
  }

  GetMoveRect(includeInflation: boolean, isGanttBar: boolean): any {
    console.log("= S.BaseLine: GetMoveRect called with includeInflation:", includeInflation, "isGanttBar:", isGanttBar);

    const moveRect: any = {};

    if (includeInflation) {
      Utils2.CopyRect(moveRect, this.r);
      Utils2.InflateRect(moveRect, 0, 0);
    } else if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      Utils2.CopyRect(moveRect, this.Frame);
      let lineThickness = 0;

      if (this.StyleRecord?.Line?.Thickness) {
        lineThickness = this.StyleRecord.Line.Thickness;
      }

      Utils2.InflateRect(moveRect, 0, lineThickness / 2);
    } else {
      Utils2.CopyRect(moveRect, this.Frame);
    }

    console.log("= S.BaseLine: GetMoveRect output:", moveRect);
    return moveRect;
  }

  SetSize(newWidth: number, newHeight: number, actionType: number): void {
    console.log("= S.BaseLine: SetSize called with newWidth:", newWidth, "newHeight:", newHeight, "actionType:", actionType);

    let shouldAdjustEnd = false;
    let widthDifference = 0;
    let heightDifference = 0;

    if (actionType !== ConstantData.ActionTriggerType.LINELENGTH || newWidth == null) {
      if (newWidth != null) {
        widthDifference = newWidth - this.Frame.width;
      }
      if (newHeight != null) {
        heightDifference = newHeight - this.Frame.height;
      }

      if (this.rflags) {
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      }

      if (this.StartPoint.x < this.EndPoint.x || (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x) && this.StartPoint.y < this.EndPoint.y)) {
        shouldAdjustEnd = true;
      }

      const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

      if (shouldAdjustEnd) {
        this.AdjustLineEnd(svgElement, this.EndPoint.x + widthDifference, this.EndPoint.y + heightDifference, 0, true);
      } else {
        this.AdjustLineStart(svgElement, this.StartPoint.x + widthDifference, this.StartPoint.y + heightDifference, 0, true);
      }

      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    } else {
      this.UpdateDimensions(newWidth);
    }

    console.log("= S.BaseLine: SetSize completed with updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  AdjustForLineAngleSnap(startPoint: Point, endPoint: Point): boolean {
    console.log("= S.BaseLine: AdjustForLineAngleSnap called with startPoint:", startPoint, "endPoint:", endPoint);

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

    console.log("= S.BaseLine: AdjustForLineAngleSnap output endPoint:", endPoint, "adjusted:", adjusted);
    return adjusted;
  }

  GetAngle(params: any): number {
    console.log("= S.BaseLine: GetAngle called with params:", params);

    let angle = 0;
    const textParams = this.GetTextOnLineParams(params);
    let startPoint = textParams.StartPoint;
    let endPoint = textParams.EndPoint;

    if (this.LineType === ConstantData.LineType.LINE) {
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
      angle = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInDegrees(startPoint, endPoint);
    }

    console.log("= S.BaseLine: GetAngle output:", angle);
    return angle;
  }

  GetDrawNormalizedAngle(startPoint: Point, endPoint: Point): number {
    console.log("= S.BaseLine: GetDrawNormalizedAngle called with startPoint:", startPoint, "endPoint:", endPoint);

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

    console.log("= S.BaseLine: GetDrawNormalizedAngle output:", angle);
    return angle;
  }

  GetApparentAngle(params: any): number {
    console.log("= S.BaseLine: GetApparentAngle called with params:", params);

    const angle = this.GetDrawNormalizedAngle(this.StartPoint, this.EndPoint);

    console.log("= S.BaseLine: GetApparentAngle output:", angle);
    return angle;
  }

  IsReverseWinding(): boolean {
    console.log("= S.BaseLine: IsReverseWinding called");

    let points = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    console.log("= S.BaseLine: Retrieved points:", points);

    if (points.length === 2) {
      const isReversed = points[0].x > points[1].x;
      console.log("= S.BaseLine: IsReverseWinding output (2 points):", isReversed);
      return isReversed;
    }

    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
    }

    const isReversed = 0.5 * area >= 0;
    console.log("= S.BaseLine: IsReverseWinding output:", isReversed);
    return isReversed;
  }

  LinkGrow(blockID: number, hookPoint: number, newPoint: Point): void {
    console.log("= S.BaseLine: LinkGrow called with blockID:", blockID, "hookPoint:", hookPoint, "newPoint:", newPoint);

    switch (hookPoint) {
      case ConstantData.HookPts.SED_KTL:
        this.StartPoint.x = newPoint.x;
        this.StartPoint.y = newPoint.y;
        break;
      case ConstantData.HookPts.SED_KTR:
        this.EndPoint.x = newPoint.x;
        this.EndPoint.y = newPoint.y;
        break;
    }

    this.CalcFrame(true);
    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.AddToDirtyList(blockID);

    console.log("= S.BaseLine: LinkGrow updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  HandleActionTriggerTrackCommon(e, t, a, r) {
    console.log("= S.BaseLine: HandleActionTriggerTrackCommon called with e:", e, "t:", t, "a:", a, "r:", r);

    const startX = GlobalData.optManager.theActionStartX;
    const startY = GlobalData.optManager.theActionStartY;
    const actionBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);

    let adjustedPoint = {};

    function adjustPoint(x, y, rect) {
      const point = { x, y };
      if (rect.x < 0) point.x -= rect.x;
      if (rect.y < 0) point.y -= rect.y;
      return point;
    }

    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.LINESTART:
        this.AdjustLineStart(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, a);
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.StartPoint.x, this.StartPoint.y, this.r);
          this.AdjustLineStart(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, a);
        }
        break;
      case ConstantData.ActionTriggerType.POLYLEND:
      case ConstantData.ActionTriggerType.LINEEND:
        this.AdjustLineEnd(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, a);
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(this.EndPoint.x, this.EndPoint.y, this.r);
          this.AdjustLineEnd(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, a);
        }
        break;
      case ConstantData.ActionTriggerType.ROTATE:
        this.AdjustRotate(e, t, r);
        break;
      case ConstantData.ActionTriggerType.MODIFYSHAPE:
      case ConstantData.ActionTriggerType.SEGL_ONE:
      case ConstantData.ActionTriggerType.SEGL_TWO:
      case ConstantData.ActionTriggerType.SEGL_THREE:
      case ConstantData.ActionTriggerType.POLYLNODE:
      case ConstantData.ActionTriggerType.POLYLADJ:
      case ConstantData.ActionTriggerType.TOPLEFT:
      case ConstantData.ActionTriggerType.TOPRIGHT:
      case ConstantData.ActionTriggerType.BOTTOMLEFT:
      case ConstantData.ActionTriggerType.BOTTOMRIGHT:
        this.ModifyShape(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData, a);
        this.UpdateFrame();
        if (this.r.x < 0 || this.r.y < 0) {
          adjustedPoint = adjustPoint(e, t, this.r);
          this.ModifyShape(GlobalData.optManager.theActionSVGObject, adjustedPoint.x, adjustedPoint.y, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
          this.UpdateFrame();
        }
        break;
      case ConstantData.ActionTriggerType.MOVEPOLYSEG:
        this.MovePolySeg(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
        break;
      case ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ:
        this.DimensionLineDeflectionAdjust(GlobalData.optManager.theActionSVGObject, e, t, GlobalData.optManager.theActionTriggerID, GlobalData.optManager.theActionTriggerData);
        break;
    }

    console.log("= S.BaseLine: HandleActionTriggerTrackCommon completed with updated StartPoint:", this.StartPoint, "EndPoint:", this.EndPoint);
  }

  AdjustRotate(mouseX: number, mouseY: number, event: any): void {
    console.log("= S.BaseLine: AdjustRotate called with mouseX:", mouseX, "mouseY:", mouseY, "event:", event);

    const pivotX = GlobalData.optManager.theRotatePivotX;
    const pivotY = GlobalData.optManager.theRotatePivotY;
    let deltaX = mouseX - pivotX;
    let deltaY = mouseY - pivotY;
    let angle = 0;

    if (deltaX === 0 && deltaY === 0) {
      angle = 0;
    } else if (deltaX === 0) {
      angle = deltaY > 0 ? 90 : 270;
    } else if (deltaX >= 0 && deltaY >= 0) {
      angle = Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    } else if ((deltaX < 0 && deltaY >= 0) || (deltaX < 0 && deltaY < 0)) {
      angle = 180 + Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    } else if (deltaX >= 0 && deltaY < 0) {
      angle = 360 + Math.atan(deltaY / deltaX) * (180 / ConstantData.Geometry.PI);
    }

    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);
    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnaps) {
      const enhanceSnaps = GlobalData.optManager.EnhanceSnaps(event);
      const snapAngle = enhanceSnaps ? GlobalData.optManager.enhanceRotateSnap : GlobalData.optManager.theRotateSnap;
      angle = Math.round(angle / snapAngle) * snapAngle;
    }

    if (this.Rotate(GlobalData.optManager.theActionSVGObject, angle)) {
      GlobalData.optManager.theRotateEndRotation = angle;
    }

    console.log("= S.BaseLine: AdjustRotate output angle:", angle);
  }

  DimensionLineDeflectionAdjust(svgDoc, mouseX, mouseY, actionTriggerID, triggerData) {
    console.log('= S.BaseLine: DimensionLineDeflectionAdjust called with', {
      svgDoc,
      mouseX,
      mouseY,
      actionTriggerID,
      triggerData
    });

    // Calculate the horizontal deflection for the dimension line
    this.dimensionDeflectionH = this.GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData);
    console.log('= S.BaseLine: Calculated dimensionDeflectionH:', this.dimensionDeflectionH);

    // Update the dimension lines on the SVG document
    this.UpdateDimensionLines(svgDoc);
    console.log('= S.BaseLine: Dimension lines updated');

    // Check if the dimension should be shown only when selected
    const isDimSelect = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select;
    console.log('= S.BaseLine: isDimSelect:', isDimSelect);

    // Hide or show dimensions based on selection state
    if (isDimSelect) {
      this.HideOrShowSelectOnlyDimensions(true);
      console.log('= S.BaseLine: Select-only dimensions shown');
    }

    console.log('= S.BaseLine: DimensionLineDeflectionAdjust completed');
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
    console.log("= S.BaseLine: ScaleObject called with", {
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
      this.StartPoint = GlobalData.optManager.RotatePointAroundPoint(rotationCenter, this.StartPoint, rotationRadians);
      this.EndPoint = GlobalData.optManager.RotatePointAroundPoint(rotationCenter, this.EndPoint, rotationRadians);
    }

    // Adjust the curve if necessary
    if (this.CurveAdjust) {
      this.CurveAdjust *= (scaleX + scaleY) / 2;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Adjust line thickness if required
    if (adjustThickness) {
      const maxScale = Math.max(scaleX, scaleY);
      this.StyleRecord.Line.Thickness *= maxScale;
      this.StyleRecord.Line.BThick *= maxScale;
    }

    // Recalculate the frame
    this.CalcFrame();

    console.log("= S.BaseLine: ScaleObject output", {
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint,
      CurveAdjust: this.CurveAdjust,
      StyleRecord: this.StyleRecord
    });
  }

  CanUseStandOffDimensionLines(): boolean {
    console.log("= S.BaseLine: CanUseStandOffDimensionLines called");
    const result = true;
    console.log("= S.BaseLine: CanUseStandOffDimensionLines output:", result);
    return result;
  }

  GetDimensionLineDeflection(svgDoc, mouseX, mouseY, triggerData) {
    console.log("= S.BaseLine: GetDimensionLineDeflection called with", {
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

    console.log("= S.BaseLine: GetDimensionLineDeflection output:", deflection);
    return deflection;
  }

  HandleActionTriggerCallResize(event, triggerData) {
    console.log("= S.BaseLine: HandleActionTriggerCallResize called with event:", event, "triggerData:", triggerData);

    // Perform the resize operation
    const resizeAdjustment = this.Resize(
      GlobalData.optManager.theActionSVGObject,
      GlobalData.optManager.theActionNewBBox
    );

    // Update the action bounding box and start coordinates
    GlobalData.optManager.theActionBBox.x += resizeAdjustment.x;
    GlobalData.optManager.theActionBBox.y += resizeAdjustment.y;
    GlobalData.optManager.theActionStartX += resizeAdjustment.x;
    GlobalData.optManager.theActionStartY += resizeAdjustment.y;

    console.log("= S.BaseLine: HandleActionTriggerCallResize output resizeAdjustment:", resizeAdjustment);
  }

  HandleActionTriggerDoAutoScroll() {
    console.log("= S.BaseLine: HandleActionTriggerDoAutoScroll called");

    // Set a timeout for the auto-scroll function
    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout('HandleActionTriggerDoAutoScroll', 100);

    // Convert window coordinates to document coordinates
    const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(GlobalData.optManager.autoScrollXPos, GlobalData.optManager.autoScrollYPos);
    console.log("= S.BaseLine: Converted document coordinates:", docCoords);

    // Track the pin point if PinRect is defined
    if (GlobalData.optManager.PinRect) {
      GlobalData.optManager.PinTrackPoint(docCoords);
    }

    // Perform auto-grow drag adjustments
    const adjustedCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);
    console.log("= S.BaseLine: Adjusted coordinates after auto-grow drag:", adjustedCoords);

    // Scroll to the new position
    GlobalData.docHandler.ScrollToPosition(adjustedCoords.x, adjustedCoords.y);

    // Handle the common action trigger track
    this.HandleActionTriggerTrackCommon(adjustedCoords.x, adjustedCoords.y);

    console.log("= S.BaseLine: HandleActionTriggerDoAutoScroll completed");
  }

  AutoScrollCommon(event, enableSnap, autoScrollCallback) {
    console.log('= S.BaseLine: AutoScrollCommon called with event:', event, 'enableSnap:', enableSnap, 'autoScrollCallback:', autoScrollCallback);

    let clientX, clientY;
    let shouldAutoScroll = false;

    // Determine clientX and clientY based on the event type
    if (GlobalData.optManager.OverrideSnaps(event)) {
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
    const docInfo = GlobalData.optManager.svgDoc.docInfo;

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
      if (enableSnap && GlobalData.docHandler.documentConfig.enableSnap) {
        const snapPoint = GlobalData.docHandler.SnapToGrid({ x: scrollX, y: scrollY });
        scrollX = snapPoint.x;
        scrollY = snapPoint.y;
      }

      // Set auto-scroll positions and start the timer if not already running
      GlobalData.optManager.autoScrollXPos = scrollX;
      GlobalData.optManager.autoScrollYPos = scrollY;
      if (GlobalData.optManager.autoScrollTimerID === -1) {
        GlobalData.optManager.autoScrollTimer = new HvTimer(this);
        GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(autoScrollCallback, 0);
      }

      console.log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = false');
      return false;
    }

    // Reset the auto-scroll timer if no auto-scroll is needed
    this.ResetAutoScrollTimer();
    console.log('= S.BaseLine: AutoScrollCommon output: shouldAutoScroll = true');
    return true;
  }

  LM_ActionTrack(event) {
    console.log('= S.BaseLine: LM_ActionTrack called with event:', event);

    let t;
    let a;
    let r;
    let i = false;

    if (Utils2.StopPropagationAndDefaults(event), -1 == GlobalData.optManager.theActionStoredObjectID) {
      return false;
    }

    const n = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    const o = event.gesture.srcEvent.altKey;

    if (GlobalData.optManager.PinRect) {
      GlobalData.optManager.PinTrackPoint(n);
    }

    const adjustedCoords = GlobalData.optManager.DoAutoGrowDrag(n);
    const trackCoords = this.LM_ActionDuringTrack(adjustedCoords);

    t = GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;

    if (GlobalData.optManager.OverrideSnaps(event)) {
      t = true;
    }

    if (GlobalData.optManager.theActionTriggerID !== ConstantData.ActionTriggerType.MODIFYSHAPE &&
      GlobalData.docHandler.documentConfig.enableSnap && !t) {
      const deltaX = trackCoords.x - GlobalData.optManager.theActionStartX;
      const deltaY = trackCoords.y - GlobalData.optManager.theActionStartY;
      const isMovePolySeg = GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.MOVEPOLYSEG;

      if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.ROTATE ||
        this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, isMovePolySeg, trackCoords) || isMovePolySeg) {
        // Do nothing
      } else {
        trackCoords = GlobalData.docHandler.SnapToGrid(trackCoords);
      }
    }

    if (this.AutoScrollCommon(event, !t, 'HandleActionTriggerDoAutoScroll')) {
      this.HandleActionTriggerTrackCommon(trackCoords.x, trackCoords.y, o, event);
    }

    console.log('= S.BaseLine: LM_ActionTrack completed with updated coordinates:', trackCoords);
  }

  LM_ActionRelease(event, isSecondary) {
    console.log("= S.BaseLine: LM_ActionRelease called with event:", event, "isSecondary:", isSecondary);

    if (!isSecondary) {
      GlobalData.optManager.unbindActionClickHammerEvents();
      this.ResetAutoScrollTimer();

      if (Collab.AllowMessage()) {
        const actionData = {
          BlockID: GlobalData.optManager.theActionStoredObjectID,
          theActionTriggerID: GlobalData.optManager.theActionTriggerID,
          theRotateEndRotation: GlobalData.optManager.theRotateEndRotation,
          theRotatePivotX: GlobalData.optManager.theRotatePivotX,
          theRotatePivotY: GlobalData.optManager.theRotatePivotY,
          theRotateStartPoint: Utils1.DeepCopy(GlobalData.optManager.theRotateStartPoint),
          CurveAdjust: this.CurveAdjust,
          IsReversed: this.IsReversed,
          Frame: Utils1.DeepCopy(this.Frame),
          StartPoint: Utils1.DeepCopy(this.StartPoint),
          EndPoint: Utils1.DeepCopy(this.EndPoint),
        };

        if (GlobalData.optManager.theActionTriggerData) {
          actionData.hitSegment = GlobalData.optManager.theActionTriggerData.hitSegment;
          actionData.moveAngle = GlobalData.optManager.theActionTriggerData.moveAngle;
        }

        if (GlobalData.optManager.ob.Frame) {
          actionData.ob = {
            StartPoint: Utils1.DeepCopy(GlobalData.optManager.ob.StartPoint),
            EndPoint: Utils1.DeepCopy(GlobalData.optManager.ob.EndPoint),
            Frame: Utils1.DeepCopy(GlobalData.optManager.ob.Frame),
            CurveAdjust: GlobalData.optManager.ob.CurveAdjust,
            IsReversed: GlobalData.optManager.ob.IsReversed,
          };
        }

        if (GlobalData.optManager.LinkParams) {
          actionData.LinkParams = Utils1.DeepCopy(GlobalData.optManager.LinkParams);
        }

        if (this.segl) {
          actionData.segl = Utils1.DeepCopy(this.segl);
        }

        if (this.polylist) {
          actionData.polylist = Utils1.DeepCopy(this.polylist);
        }

        if (this.pointlist) {
          actionData.pointlist = Utils1.DeepCopy(this.pointlist);
        }

        if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.DIMENSION_LINE_ADJ) {
          actionData.dimensionDeflectionH = this.dimensionDeflectionH;
          actionData.dimensionDeflectionV = this.dimensionDeflectionV;
        }
      }
    }

    switch (GlobalData.optManager.theActionTriggerID) {
      case ConstantData.ActionTriggerType.ROTATE:
        this.AfterRotateShape(GlobalData.optManager.theActionStoredObjectID);
        break;
      case ConstantData.ActionTriggerType.MODIFYSHAPE:
      case ConstantData.ActionTriggerType.SEGL_ONE:
      case ConstantData.ActionTriggerType.SEGL_TWO:
      case ConstantData.ActionTriggerType.SEGL_THREE:
      case ConstantData.ActionTriggerType.POLYLNODE:
      case ConstantData.ActionTriggerType.POLYLADJ:
      case ConstantData.ActionTriggerType.POLYLEND:
      case ConstantData.ActionTriggerType.MOVEPOLYSEG:
        this.AfterModifyShape(GlobalData.optManager.theActionStoredObjectID, GlobalData.optManager.theActionTriggerID);
        break;
      default:
        if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
          switch (GlobalData.optManager.theActionTriggerID) {
            case ConstantData.ActionTriggerType.LINEEND:
            case ConstantData.ActionTriggerType.LINESTART:
              GlobalData.optManager.GanttAdjustBar(GlobalData.optManager.theActionStoredObjectID, GlobalData.optManager.theActionTriggerID);
          }
        }

        if (GlobalData.optManager.ob.Frame) {
          GlobalData.optManager.MaintainLink(GlobalData.optManager.theActionStoredObjectID, this, GlobalData.optManager.ob, GlobalData.optManager.theActionTriggerID);
          GlobalData.optManager.ob = {};
          GlobalData.optManager.SetLinkFlag(GlobalData.optManager.theActionStoredObjectID, ConstantData.LinkFlags.SED_L_MOVE);
          GlobalData.optManager.UpdateLinks();
        }
    }

    this.LM_ActionPostRelease(GlobalData.optManager.theActionStoredObjectID);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      GlobalData.optManager.AddToDirtyList(GlobalData.optManager.theActionStoredObjectID);
    }

    if (!isSecondary) {
      GlobalData.optManager.theActionStoredObjectID = -1;
      GlobalData.optManager.theActionSVGObject = null;
    }

    GlobalData.optManager.ShowOverlayLayer();
    GlobalData.optManager.CompleteOperation(null);

    console.log("= S.BaseLine: LM_ActionRelease completed");
  }

  LM_ActionPreTrack(actionStoredObjectID, actionTriggerID) {
    console.log("= S.BaseLine: LM_ActionPreTrack called with actionStoredObjectID:", actionStoredObjectID, "actionTriggerID:", actionTriggerID);

    let objectPtr, sessionPtr, linkParams, hookIndex = -1;

    // Retrieve the object pointer for the given actionStoredObjectID
    objectPtr = GlobalData.optManager.GetObjectPtr(actionStoredObjectID, false);
    if (!objectPtr) {
      console.log("= S.BaseLine: LM_ActionPreTrack - objectPtr not found");
      return;
    }

    // Deep copy the object pointer to GlobalData.optManager.ob
    GlobalData.optManager.ob = Utils1.DeepCopy(objectPtr);

    // Determine the hook index based on the actionTriggerID
    switch (actionTriggerID) {
      case ConstantData.ActionTriggerType.LINESTART:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_KTL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WTL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WTR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      case ConstantData.ActionTriggerType.LINEEND:
        for (let i = 0; i < objectPtr.hooks.length; i++) {
          if (
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_KTR ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WBL ||
            objectPtr.hooks[i].hookpt === ConstantData.HookPts.SED_WBR
          ) {
            hookIndex = i;
            break;
          }
        }
        break;
      default:
        console.log("= S.BaseLine: LM_ActionPreTrack - invalid actionTriggerID");
        return;
    }

    // Reset floating point dimensions flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Initialize LinkParameters
    linkParams = new LinkParameters();
    GlobalData.optManager.LinkParams = linkParams;

    // Retrieve the session pointer
    sessionPtr = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Set ArraysOnly flag if linking is not allowed
    if (!this.AllowLink()) {
      linkParams.ArraysOnly = true;
    }

    // Set AllowJoin flag based on session flags
    if (sessionPtr) {
      linkParams.AllowJoin = sessionPtr.flags & ConstantData.SessionFlags.SEDS_FreeHand;
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
    const linksBlockPtr = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);

    // Get the hook list for circular targets
    linkParams.lpCircList = GlobalData.optManager.GetHookList(
      linksBlockPtr,
      linkParams.lpCircList,
      actionStoredObjectID,
      objectPtr,
      ConstantData.ListCodes.SED_LC_CIRCTARG,
      {}
    );

    // Add the single hook object to the circular list if no valid hook index is found
    if (hookIndex < 0 && objectPtr.hooks.length === 1 && linkParams.lpCircList) {
      linkParams.lpCircList.push(objectPtr.hooks[0].objid);
    }

    console.log("= S.BaseLine: LM_ActionPreTrack completed with LinkParams:", linkParams);
    return true;
  }

  LM_ActionDuringTrack(event) {
    console.log('= S.BaseLine: LM_ActionDuringTrack called with event:', event);

    const points = [{ x: 0, y: 0 }];

    if (GlobalData.optManager.LinkParams) {
      points[0].x = event.x;
      points[0].y = event.y;

      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        points[0].id = GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINESTART
          ? ConstantData.HookPts.SED_KTL
          : ConstantData.HookPts.SED_KTR;

        GlobalData.optManager.theDragDeltaX = 0;
        GlobalData.optManager.theDragDeltaY = 0;

        if (GlobalData.optManager.FindConnect(
          GlobalData.optManager.theActionStoredObjectID,
          this,
          points,
          true,
          false,
          GlobalData.optManager.LinkParams.AllowJoin,
          event
        )) {
          event.x += GlobalData.optManager.theDragDeltaX;
          event.y += GlobalData.optManager.theDragDeltaY;
        }
      }
    }

    console.log('= S.BaseLine: LM_ActionDuringTrack output event:', event);
    return event;
  }

  AfterRotateShape(blockID: number): void {
    console.log("= S.BaseLine: AfterRotateShape called with blockID:", blockID);

    // Check if the rectangle's x or y coordinates are negative
    if (this.r.x < 0 || this.r.y < 0) {
      console.log("= S.BaseLine: Rectangle coordinates are negative, performing undo operation");
      GlobalData.optManager.Undo();
      Collab.UnLockMessages();
      Collab.UnBlockMessages();
      return;
    }

    // Maintain link if the frame is defined
    if (GlobalData.optManager.ob.Frame) {
      console.log("= S.BaseLine: Maintaining link with frame:", GlobalData.optManager.ob.Frame);
      GlobalData.optManager.MaintainLink(blockID, this, GlobalData.optManager.ob, ConstantData.ActionTriggerType.ROTATE);
      GlobalData.optManager.ob = {};
    }

    // Set link flag and update links
    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();

    console.log("= S.BaseLine: AfterRotateShape completed for blockID:", blockID);
  }

  AfterModifyShape(blockID: number, actionTriggerID: number): void {
    console.log("= S.BaseLine: AfterModifyShape called with blockID:", blockID, "actionTriggerID:", actionTriggerID);

    if (GlobalData.optManager.theActionSVGObject) {
      const ellipseAxesElement = GlobalData.optManager.theActionSVGObject.GetElementByID(ConstantData.Defines.EllipseAxes);
      if (ellipseAxesElement != null) {
        GlobalData.optManager.theActionSVGObject.RemoveElement(ellipseAxesElement);
        console.log("= S.BaseLine: Removed ellipseAxesElement:", ellipseAxesElement);
      }
    }

    if (GlobalData.optManager.ob.Frame) {
      GlobalData.optManager.MaintainLink(blockID, this, GlobalData.optManager.ob, actionTriggerID);
      GlobalData.optManager.ob = {};
      console.log("= S.BaseLine: Maintained link and reset ob.Frame");
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      console.log("= S.BaseLine: Reset floating point dimensions flags");
    }

    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();
    console.log("= S.BaseLine: Set link flag and updated links");

    if (this.arcobj) {
      this.arcobj = null;
      console.log("= S.BaseLine: Reset arcobj to null");
    }

    console.log("= S.BaseLine: AfterModifyShape completed for blockID:", blockID);
  }

  LM_ActionPostRelease(blockID: number): void {
    console.log("= S.BaseLine: LM_ActionPostRelease called with blockID:", blockID);

    // Set edit mode to default
    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

    // Check if LinkParams is not null
    if (GlobalData.optManager.LinkParams) {
      // Handle HiliteConnect
      if (GlobalData.optManager.LinkParams.HiliteConnect >= 0) {
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteConnect,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          false,
          this.BlockID,
          GlobalData.optManager.LinkParams.HiliteInside
        );
        GlobalData.optManager.LinkParams.HiliteConnect = -1;
        GlobalData.optManager.LinkParams.HiliteInside = null;
      }

      // Handle HiliteJoin
      if (GlobalData.optManager.LinkParams.HiliteJoin >= 0) {
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteJoin,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        GlobalData.optManager.LinkParams.HiliteJoin = -1;
      }

      // Handle JoinIndex
      if (GlobalData.optManager.LinkParams.JoinIndex >= 0) {
        GlobalData.optManager.PolyLJoin(
          GlobalData.optManager.LinkParams.JoinIndex,
          GlobalData.optManager.LinkParams.JoinData,
          blockID,
          GlobalData.optManager.LinkParams.JoinSourceData,
          false
        );
      } else if (GlobalData.optManager.LinkParams.ConnectIndex >= 0 || GlobalData.optManager.LinkParams.InitialHook >= 0) {
        GlobalData.optManager.UpdateHook(
          blockID,
          GlobalData.optManager.LinkParams.InitialHook,
          GlobalData.optManager.LinkParams.ConnectIndex,
          GlobalData.optManager.LinkParams.HookIndex,
          GlobalData.optManager.LinkParams.ConnectPt,
          GlobalData.optManager.LinkParams.ConnectInside
        );
      }

      // Set link flag and update links
      GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
      GlobalData.optManager.UpdateLinks();

      // Clear LinkParams
      GlobalData.optManager.LinkParams = null;
    }

    console.log("= S.BaseLine: LM_ActionPostRelease completed for blockID:", blockID);
  }

  LM_SetupActionClick(event, isSecondary) {
    console.log("= S.BaseLine: LM_SetupActionClick called with event:", event, "isSecondary:", isSecondary);

    let actionStoredObjectID, actionTriggerID, preservedBlock, targetElement;

    if (isSecondary) {
      actionStoredObjectID = GlobalData.optManager.theActionStoredObjectID;
      actionTriggerID = GlobalData.optManager.theActionTriggerID;
      GlobalData.optManager.PinRect = null;
      preservedBlock = GlobalData.objectStore.PreserveBlock(actionStoredObjectID);
    } else {
      GlobalData.optManager.SetUIAdaptation(event);
      GlobalData.optManager.theEventTimestamp = Date.now();
      event.stopPropagation();

      const overlayElement = GlobalData.optManager.svgOverlayLayer.FindElementByDOMElement(event.currentTarget);
      if (overlayElement === null) return false;

      const elementID = overlayElement.GetID();
      actionStoredObjectID = parseInt(elementID.substring(ConstantData.Defines.Action.length), 10);
      GlobalData.optManager.theActionStoredObjectID = actionStoredObjectID;

      targetElement = overlayElement.GetTargetForEvent(event);
      if (targetElement == null) return false;

      preservedBlock = GlobalData.objectStore.PreserveBlock(actionStoredObjectID);
      actionTriggerID = targetElement.GetID();
      GlobalData.optManager.theActionTriggerID = actionTriggerID;
      GlobalData.optManager.theActionTriggerData = targetElement.GetUserData();
      GlobalData.optManager.PinRect = null;
    }

    if (preservedBlock.Data.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      GlobalData.optManager.PinRect = {};
      GlobalData.optManager.PinRect = this.AdjustPinRect(GlobalData.optManager.PinRect, false, actionTriggerID);
    }

    if (!isSecondary) {
      GlobalData.optManager.SetControlDragMode(targetElement);
    }

    this.LM_ActionPreTrack(actionStoredObjectID, actionTriggerID);
    GlobalData.optManager.theActionSVGObject = GlobalData.optManager.svgObjectLayer.GetElementByID(actionStoredObjectID);

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      this.HideAllIcons(GlobalData.optManager.svgDoc, GlobalData.optManager.theActionSVGObject);
    }

    let coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    let shouldSnap = GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;

    if (GlobalData.optManager.OverrideSnaps(event)) {
      shouldSnap = true;
    }

    if (GlobalData.docHandler.documentConfig.enableSnap && !shouldSnap) {
      coords = GlobalData.docHandler.SnapToGrid(coords);
    }

    coords = GlobalData.optManager.DoAutoGrowDrag(coords);
    const startX = coords.x;
    const startY = coords.y;

    GlobalData.optManager.theActionLockAspectRatio = event.gesture.srcEvent.shiftKey;
    if (this.ResizeAspectConstrain) {
      GlobalData.optManager.theActionLockAspectRatio = !GlobalData.optManager.theActionLockAspectRatio;
    }

    const svgFrame = this.GetSVGFrame();
    if (GlobalData.optManager.theActionLockAspectRatio) {
      if (svgFrame.height === 0) {
        GlobalData.optManager.theActionLockAspectRatio = false;
      } else {
        GlobalData.optManager.theActionAspectRatioWidth = svgFrame.width;
        GlobalData.optManager.theActionAspectRatioHeight = svgFrame.height;
      }
    }

    GlobalData.optManager.theActionBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.HideOverlayLayer();
    GlobalData.optManager.theActionStartX = startX;
    GlobalData.optManager.theActionStartY = startY;

    if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.ROTATE) {
      this.BeforeRotate(svgFrame);
    } else if (GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.MODIFYSHAPE || GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.POLYLADJ) {
      this.BeforeModifyShape(startX, startY, GlobalData.optManager.theActionTriggerData);
    }

    console.log("= S.BaseLine: LM_SetupActionClick output:", true);
    return true;
  }

  BeforeRotate(frame: any): void {
    console.log("= S.BaseLine: BeforeRotate called with frame:", frame);

    // Set the rotation knob center divisor
    GlobalData.optManager.theRotateKnobCenterDivisor = this.RotateKnobCenterDivisor();

    // Calculate the start rotation angle in degrees
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    GlobalData.optManager.theRotateStartRotation = 180 * Math.atan2(deltaY, deltaX) / Math.PI;
    GlobalData.optManager.theRotateEndRotation = GlobalData.optManager.theRotateStartRotation;

    // Calculate the pivot point for rotation
    GlobalData.optManager.theRotatePivotX = frame.x + frame.width / GlobalData.optManager.theRotateKnobCenterDivisor.x;
    GlobalData.optManager.theRotatePivotY = frame.y + frame.height / GlobalData.optManager.theRotateKnobCenterDivisor.y;

    // Store the start and end points
    GlobalData.optManager.theRotateStartPoint = $.extend(true, {}, this.StartPoint);
    GlobalData.optManager.theRotateEndPoint = $.extend(true, {}, this.EndPoint);

    console.log("= S.BaseLine: BeforeRotate output:", {
      theRotateStartRotation: GlobalData.optManager.theRotateStartRotation,
      theRotateEndRotation: GlobalData.optManager.theRotateEndRotation,
      theRotatePivotX: GlobalData.optManager.theRotatePivotX,
      theRotatePivotY: GlobalData.optManager.theRotatePivotY,
      theRotateStartPoint: GlobalData.optManager.theRotateStartPoint,
      theRotateEndPoint: GlobalData.optManager.theRotateEndPoint
    });
  }

  LM_ActionClick_ExceptionCleanup(error) {
    console.log("= S.BaseLine: LM_ActionClick_ExceptionCleanup called with error:", error);

    // Unbind action click hammer events
    GlobalData.optManager.unbindActionClickHammerEvents();

    // Reset auto scroll timer
    this.ResetAutoScrollTimer();

    // Clear global data properties
    GlobalData.optManager.ob = {};
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionTriggerID = -1;
    GlobalData.optManager.theActionTriggerData = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;

    // Unblock messages
    Collab.UnBlockMessages();

    console.log("= S.BaseLine: LM_ActionClick_ExceptionCleanup completed");
  }

  LM_ActionClick(event, isSecondary) {
    console.log("= S.BaseLine: LM_ActionClick called with event:", event, "isSecondary:", isSecondary);

    try {
      const blockID = this.BlockID;
      const objectPtr = GlobalData.optManager.GetObjectPtr(blockID, false);

      if (!(objectPtr && objectPtr instanceof BaseDrawingObject)) {
        console.log("= S.BaseLine: LM_ActionClick - objectPtr is not an instance of BaseDrawingObject");
        return false;
      }

      GlobalData.optManager.DoAutoGrowDragInit(0, blockID);

      if (!this.LM_SetupActionClick(event, isSecondary)) {
        console.log("= S.BaseLine: LM_ActionClick - LM_SetupActionClick returned false");
        return;
      }

      Collab.BeginSecondaryEdit();

      const actionObjectPtr = GlobalData.optManager.GetObjectPtr(blockID, false);
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_ActionTrackHandlerFactory(actionObjectPtr));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_ActionReleaseHandlerFactory(actionObjectPtr));

      console.log("= S.BaseLine: LM_ActionClick setup completed for blockID:", blockID);
    } catch (error) {
      console.error("= S.BaseLine: LM_ActionClick encountered an error:", error);
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  Rotate(svgElement: any, endRotation: number): boolean {
    console.log("= S.BaseLine: Rotate called with svgElement:", svgElement, "endRotation:", endRotation);

    const pivotPoint = {
      x: GlobalData.optManager.theRotatePivotX,
      y: GlobalData.optManager.theRotatePivotY
    };

    const rotationRadians = (endRotation - GlobalData.optManager.theRotateStartRotation) / (180 / ConstantData.Geometry.PI);
    const rotatedStartPoint = GlobalData.optManager.RotatePointAroundPoint(pivotPoint, GlobalData.optManager.theRotateStartPoint, rotationRadians);
    const rotatedEndPoint = GlobalData.optManager.RotatePointAroundPoint(pivotPoint, GlobalData.optManager.theRotateEndPoint, rotationRadians);

    console.log("= S.BaseLine: Rotated points calculated as rotatedStartPoint:", rotatedStartPoint, "rotatedEndPoint:", rotatedEndPoint);

    if (rotatedStartPoint.x < 0 || rotatedStartPoint.y < 0 || rotatedEndPoint.x < 0 || rotatedEndPoint.y < 0) {
      console.log("= S.BaseLine: Rotation resulted in negative coordinates, returning false");
      return false;
    }

    if (GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto) {
      const sessionObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
      if (rotatedStartPoint.x > sessionObject.dim.x || rotatedStartPoint.y > sessionObject.dim.y || rotatedEndPoint.x > sessionObject.dim.x || rotatedEndPoint.y > sessionObject.dim.y) {
        console.log("= S.BaseLine: Rotation resulted in coordinates outside session dimensions, returning false");
        return false;
      }
    }

    this.AdjustLineStart(svgElement, rotatedStartPoint.x, rotatedStartPoint.y, 0, true);
    this.AdjustLineEnd(svgElement, rotatedEndPoint.x, rotatedEndPoint.y, ConstantData.ActionTriggerType.LINEEND, true);

    console.log("= S.BaseLine: Rotate completed successfully");
    return true;
  }

  RotateKnobCenterDivisor(): { x: number; y: number } {
    console.log("= S.BaseLine: RotateKnobCenterDivisor called");

    const divisor = {
      x: 2,
      y: 2
    };

    console.log("= S.BaseLine: RotateKnobCenterDivisor output:", divisor);
    return divisor;
  }

  GetHookFlags(): number {
    console.log("= S.BaseLine: GetHookFlags called");

    const hookFlags = ConstantData.HookFlags.SED_LC_Shape |
      ConstantData.HookFlags.SED_LC_Line |
      ConstantData.HookFlags.SED_LC_CHook;

    console.log("= S.BaseLine: GetHookFlags output:", hookFlags);
    return hookFlags;
  }


  AllowLink() {

    const layersManager = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLayersManagerBlockID, false);
    const session = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    const useEdges = layersManager && layersManager.activelayer >= 0 && (layersManager.layers[layersManager.activelayer].flags & ConstantData.LayerFlags.SDLF_UseEdges);
    const fromOverlayLayer = GlobalData.optManager.FromOverlayLayer;
    const sessionLink = session && (session.flags & ConstantData.SessionFlags.SEDS_LLink);

    return !useEdges && (fromOverlayLayer || sessionLink);
  }



  GetHookPoints(): { x: number; y: number; id: number }[] {
    console.log("= S.BaseLine: GetHookPoints called");

    const hookDimension = ConstantData.Defines.SED_CDim;
    const hookPoints = [
      {
        x: 0,
        y: 0,
        id: ConstantData.HookPts.SED_KTL
      },
      {
        x: hookDimension,
        y: hookDimension,
        id: ConstantData.HookPts.SED_KTR
      }
    ];

    console.log("= S.BaseLine: GetHookPoints output:", hookPoints);
    return hookPoints;
  }

  Pr_GetWidthAdjustment() {
    console.log("= S.BaseLine: Pr_GetWidthAdjustment called");

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

    console.log("= S.BaseLine: Pr_GetWidthAdjustment output:", result);
    return result;
  }

  GetConnectLine(): { startpt: Point; endpt: Point } | null {
    console.log("= S.BaseLine: GetConnectLine called");

    // This method is intended to be overridden by subclasses if needed.
    // By default, it returns null indicating no specific connection line.
    const result = null;

    console.log("= S.BaseLine: GetConnectLine output:", result);
    return result;
  }

  GetPerimPts(hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex) {
    console.log("= S.BaseLine: GetPerimPts called with", { hookPoints, targetPoints, targetID, isRelative, additionalParam, hookIndex });

    let resultPoints = [];
    let startPoint = {};
    let endPoint = {};
    const HookPts = ConstantData.HookPts;
    const numTargetPoints = targetPoints.length;

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL && hookIndex < 0 && numTargetPoints > 1) {
      const lineThickness = this.StyleRecord.Line.Thickness / 2;
      const widthAdjustment = this.Pr_GetWidthAdjustment();

      for (let i = 0; i < numTargetPoints; i++) {
        let point = {};
        switch (targetPoints[i].id) {
          case HookPts.SED_WTL:
            point = { x: this.StartPoint.x - widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WTR:
            point = { x: this.StartPoint.x + widthAdjustment.deltax, y: this.StartPoint.y - widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WBL:
            point = { x: this.EndPoint.x - widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_WBR:
            point = { x: this.EndPoint.x + widthAdjustment.deltax, y: this.EndPoint.y + widthAdjustment.deltay, id: targetPoints[i].id };
            break;
          case HookPts.SED_KTL:
            point = { x: this.StartPoint.x, y: this.StartPoint.y, id: targetPoints[i].id };
            break;
          case HookPts.SED_KTR:
            point = { x: this.EndPoint.x, y: this.EndPoint.y, id: targetPoints[i].id };
            break;
        }
        resultPoints.push(point);
      }
      console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
      return resultPoints;
    }

    if (hookIndex >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(hookIndex, false);
      if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
        if (targetObject.hooks.length > 1) {
          if (targetObject.hooks[0].objid === this.BlockID) {
            resultPoints[0] = { x: 0, y: this.StartPoint.y };
            resultPoints[0].x = GlobalData.optManager.GetDependencyLineStartX(targetObject);
            if (targetPoints[0].id != null) resultPoints[0].id = targetPoints[0].id;
            const endArrowDisp = this.EndArrowDisp;
            if (resultPoints[0].x > GlobalData.optManager.GetDependencyLineEndX(targetObject) - endArrowDisp + 1) {
              resultPoints[0].x = GlobalData.optManager.GetDependencyLineEndX(targetObject) - endArrowDisp + 1;
            }
            console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
            return resultPoints;
          }
          if (targetObject.hooks[1].objid === this.BlockID) {
            resultPoints[0] = { x: 0, y: this.StartPoint.y };
            if (targetPoints[0].id != null) resultPoints[0].id = targetPoints[0].id;
            resultPoints[0].x = GlobalData.optManager.GetDependencyLineEndX(targetObject);
            console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
            return resultPoints;
          }
        }
      } else if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_MULTIPLICITY) {
        let offsetX = 5;
        let offsetY = 5;
        offsetX += targetObject.Frame.width / 2;
        let angle = this.GetAngle(null);
        if (angle >= 90) angle = 180 - angle;
        const angleRadians = angle / 180 * Math.PI;
        let delta = 0;

        if (angle <= 45) {
          if (targetObject.subtype == ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) offsetY = -targetObject.Frame.height - 5;
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
          if (targetObject.subtype == ConstantData.ObjectSubTypes.SD_SUBT_MULTIPLICITY_FLIPPED) offsetX = -offsetX;
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
        console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
        return resultPoints;
      } else if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_EXTRATEXTLABEL && numTargetPoints === 1) {
        const proportion = targetPoints[0].x / ConstantData.Defines.SED_CDim;
        const pointOnLine = this.GetPointOnLine(proportion);
        resultPoints.push(pointOnLine);
        resultPoints[0].id = targetPoints[0].id;
        console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
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
      } else if (targetPoints[i].x === ConstantData.Defines.SED_CDim && targetPoints[i].y === ConstantData.Defines.SED_CDim) {
        resultPoints[i].x = endPoint.x;
        resultPoints[i].y = endPoint.y;
      } else {
        const deltaX = endPoint.x - startPoint.x;
        const deltaY = endPoint.y - startPoint.y;
        resultPoints[i].x = (targetPoints[i].x / ConstantData.Defines.SED_CDim) * deltaX + startPoint.x;
        resultPoints[i].y = (targetPoints[i].y / ConstantData.Defines.SED_CDim) * deltaY + startPoint.y;
      }
      if (targetPoints[i].id != null) resultPoints[i].id = targetPoints[i].id;
    }

    console.log("= S.BaseLine: GetPerimPts output:", resultPoints);
    return resultPoints;
  }

  GetPointOnLine(proportion: number): Point {
    console.log("= S.BaseLine: GetPointOnLine called with proportion:", proportion);

    const distanceBetweenPoints = (point1: Point, point2: Point): number => {
      const deltaX = point1.x - point2.x;
      const deltaY = point1.y - point2.y;
      return Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
    };

    const resultPoint: Point = { x: this.StartPoint.x, y: this.StartPoint.y };
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
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

    console.log("= S.BaseLine: GetPointOnLine output:", resultPoint);
    return resultPoint;
  }

  GetTargetPoints(hookPoint, hookFlags, targetID) {
    console.log("= S.BaseLine: GetTargetPoints called with", { hookPoint, hookFlags, targetID });

    let isVertical = false;
    let isHorizontal = false;
    const targetPoints = [{ x: 0, y: 0 }];
    const adjustedPoint = { x: 0, y: 0 };
    const hookPts = ConstantData.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(targetID, false);

      if (targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
        if (targetObject.hooks.length > 1) {
          if (targetObject.hooks[0].objid === this.BlockID) {
            targetPoints[0].x = ConstantData.Defines.SED_CDim;
            targetPoints[0].y = ConstantData.Defines.SED_CDim / 2;
            console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
            return targetPoints;
          }
          if (targetObject.hooks[1].objid === this.BlockID) {
            targetPoints[0].x = 0;
            targetPoints[0].y = ConstantData.Defines.SED_CDim / 2;
            console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
            return targetPoints;
          }
        }
      } else if (targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        switch (hookPoint.id) {
          case hookPts.SED_KTC:
          case hookPts.SED_KBC:
          case hookPts.SED_KRC:
          case hookPts.SED_KLC:
            const isReversed = SDF.LineIsReversed(this, null, false);
            if (this.hooks.length === 0) {
              if (isReversed) {
                targetPoints[0].x = ConstantData.Defines.SED_CDim;
                targetPoints[0].y = ConstantData.Defines.SED_CDim;
                targetPoints.push({ x: 0, y: 0 });
              } else {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                targetPoints.push({ x: ConstantData.Defines.SED_CDim, y: ConstantData.Defines.SED_CDim });
              }
              console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
              return targetPoints;
            }
            if (this.hooks.length === 1) {
              if (this.hooks[0].hookpt === hookPts.SED_KTR) {
                targetPoints[0].x = 0;
                targetPoints[0].y = 0;
                console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
                return targetPoints;
              }
              if (this.hooks[0].hookpt === hookPts.SED_KTL) {
                targetPoints[0].x = ConstantData.Defines.SED_CDim;
                targetPoints[0].y = ConstantData.Defines.SED_CDim;
                console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
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

    if (isVertical || Math.abs(slope) > 1 || (hookFlags & ConstantData.HookFlags.SED_LC_HOnly && !isHorizontal)) {
      if (GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps)) {
        adjustedPoint = GlobalData.docHandler.SnapToGrid(adjustedPoint);
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
      if (GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps)) {
        adjustedPoint = GlobalData.docHandler.SnapToGrid(adjustedPoint);
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
      targetPoints[0].y = (offsetY / deltaY) * ConstantData.Defines.SED_CDim;
    }
    targetPoints[0].x = isVertical ? targetPoints[0].y : (offsetX / deltaX) * ConstantData.Defines.SED_CDim;

    if (isHorizontal) {
      targetPoints[0].y = targetPoints[0].x;
    }

    if (targetPoints[0].x > ConstantData.Defines.SED_CDim) {
      targetPoints[0].x = ConstantData.Defines.SED_CDim;
    }
    if (targetPoints[0].y > ConstantData.Defines.SED_CDim) {
      targetPoints[0].y = ConstantData.Defines.SED_CDim;
    }
    if (targetPoints[0].x < 0) {
      targetPoints[0].x = 0;
    }
    if (targetPoints[0].y < 0) {
      targetPoints[0].y = 0;
    }

    console.log("= S.BaseLine: GetTargetPoints output:", targetPoints);
    return targetPoints;
  }

  AllowHook(hookPoint: any, targetID: number, distance: number): boolean {
    console.log("= S.BaseLine: AllowHook called with hookPoint:", hookPoint, "targetID:", targetID, "distance:", distance);

    const HookPts = ConstantData.HookPts;

    if (targetID != null && targetID >= 0) {
      const targetObject = GlobalData.optManager.GetObjectPtr(targetID, false);

      if (targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        switch (hookPoint.id) {
          case HookPts.SED_KTC:
          case HookPts.SED_KBC:
          case HookPts.SED_KRC:
          case HookPts.SED_KLC:
            if (distance > 200) {
              console.log("= S.BaseLine: AllowHook output: false (distance > 200)");
              return false;
            }
            break;
          default:
            if (hookPoint.id >= HookPts.SED_CustomBase && hookPoint.id < HookPts.SED_CustomBase + 100 && distance > 200) {
              console.log("= S.BaseLine: AllowHook output: false (custom hook point and distance > 200)");
              return false;
            }
        }
      }
    }

    console.log("= S.BaseLine: AllowHook output: true");
    return true;
  }

  DeleteObject() {
    console.log("= S.BaseLine: DeleteObject called");

    // Call the base class DeleteObject method
    super.DeleteObject();

    // Handle specific object types
    switch (this.objecttype) {
      case ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR:
        console.log("= S.BaseLine: Handling SD_OBJT_GANTT_BAR");

        if (this.datasetElemID >= 0) {
          const deleteResult = GlobalData.optManager.GanttDeleteTask(
            this.datasetTableID,
            this.datasetElemID,
            this.BlockID,
            true,
            null
          );

          if (deleteResult === -2) {
            console.log("= S.BaseLine: GanttDeleteTask returned -2, exiting");
            return;
          }
        }

        if (this.hooks.length) {
          const hookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

          if (hookObject && hookObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_CHART) {
            console.log("= S.BaseLine: Returning Gantt chart object:", hookObject);
            return hookObject;
          }
        }
        break;

      case ConstantData.ObjectTypes.SD_OBJT_NG_EVENT:
        console.log("= S.BaseLine: Handling SD_OBJT_NG_EVENT");

        if (this.datasetElemID >= 0) {
          ListManager.SDData.DeleteRow(this.datasetElemID);
        }

        if (this.hooks.length) {
          const hookObject = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);

          if (hookObject && hookObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_NG_TIMELINE) {
            console.log("= S.BaseLine: Returning NG timeline object:", hookObject);
            return hookObject;
          }
        }
        break;

      default:
        console.log("= S.BaseLine: No specific handling for objecttype:", this.objecttype);
    }

    console.log("= S.BaseLine: DeleteObject completed");
  }

  GetSegLFace(objectType: number, point: Point, referencePoint: Point): number {
    console.log("= S.BaseLine: GetSegLFace called with objectType:", objectType, "point:", point, "referencePoint:", referencePoint);

    let result: number;

    if (objectType === ConstantData.ObjectTypes.SD_OBJT_GANTT_CONNECTOR) {
      if (this.Frame.x + this.Frame.height <= referencePoint.x) {
        result = ConstantData.HookPts.SED_KRC;
      } else if (this.y > referencePoint.y) {
        result = ConstantData.HookPts.SED_KTC;
      } else {
        result = ConstantData.HookPts.SED_KBC;
      }
    } else {
      if (this.Frame.width >= this.Frame.height) {
        result = point.y >= referencePoint.y ? ConstantData.HookPts.SED_KBC : ConstantData.HookPts.SED_KTC;
      } else {
        result = point.x >= referencePoint.x ? ConstantData.HookPts.SED_KRC : ConstantData.HookPts.SED_KLC;
      }
    }

    console.log("= S.BaseLine: GetSegLFace output:", result);
    return result;
  }

  GetSpacing(): { width: number | null; height: number | null } {
    console.log("= S.BaseLine: GetSpacing called");

    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const spacing = { width: null, height: null };

    if (this.hooks.length === 2) {
      const hook1 = GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false);
      const hook2 = GlobalData.optManager.GetObjectPtr(this.hooks[1].objid, false);

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

    console.log("= S.BaseLine: GetSpacing output:", spacing);
    return spacing;
  }

  GetShapeConnectPoint(hookPointID) {
    console.log("= S.BaseLine: GetShapeConnectPoint called with hookPointID:", hookPointID);

    const connectPoint = { x: 0, y: 0 };
    const alternatePoint = { x: 0, y: 0 };
    const dimension = ConstantData.Defines.SED_CDim;
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

    const result = hookPointID === ConstantData.HookPts.SED_KTL ? alternatePoint : connectPoint;
    console.log("= S.BaseLine: GetShapeConnectPoint output:", result);
    return result;
  }

  GetBestHook(hookPointID: number, hookPoint: Point, relativePoint: Point): number {
    console.log("= S.BaseLine: GetBestHook called with hookPointID:", hookPointID, "hookPoint:", hookPoint, "relativePoint:", relativePoint);

    const dimension = ConstantData.Defines.SED_CDim;
    const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    const HookPts = ConstantData.HookPts;
    let isEndPoint = false;

    const targetObject = GlobalData.optManager.GetObjectPtr(hookPointID, false);
    if (targetObject && targetObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      switch (hookPoint) {
        case HookPts.SED_KTC:
        case HookPts.SED_KBC:
        case HookPts.SED_KRC:
        case HookPts.SED_KLC:
          if (rect.width < rect.height) {
            isEndPoint = rect.y === this.EndPoint.y;
            const bestHook = relativePoint.y < dimension / 2 ? (isEndPoint ? HookPts.SED_KTC : HookPts.SED_KBC) : (isEndPoint ? HookPts.SED_KBC : HookPts.SED_KTC);
            console.log("= S.BaseLine: GetBestHook output:", bestHook);
            return bestHook;
          } else {
            isEndPoint = rect.x === this.EndPoint.x;
            const bestHook = relativePoint.x < dimension / 2 ? (isEndPoint ? HookPts.SED_KLC : HookPts.SED_KRC) : (isEndPoint ? HookPts.SED_KRC : HookPts.SED_KLC);
            console.log("= S.BaseLine: GetBestHook output:", bestHook);
            return bestHook;
          }
        default:
          console.log("= S.BaseLine: GetBestHook output (default):", hookPoint);
          return hookPoint;
      }
    }

    console.log("= S.BaseLine: GetBestHook output (no target object):", hookPoint);
    return hookPoint;
  }

  CreateConnectHilites(svgDoc, targetPoint, hookPoint, isJoin, hookIndex, additionalParam) {
    console.log("= S.BaseLine: CreateConnectHilites called with", {
      svgDoc,
      targetPoint,
      hookPoint,
      isJoin,
      hookIndex,
      additionalParam
    });

    const groupElement = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    let scale = svgDoc.docInfo.docToScreenScale;
    if (svgDoc.docInfo.docScale <= 0.5) {
      scale *= 2;
    }

    let knobSize = ConstantData.Defines.CONNECTPT_LINE_DIM / scale;
    if (isJoin) {
      knobSize = ConstantData.Defines.JOINPT_LINE_DIM / scale;
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
        } else if (hookPoint.x === ConstantData.Defines.SED_CDim && hookPoint.y === ConstantData.Defines.SED_CDim) {
          perimeter[0].x = this.EndPoint.x;
          perimeter[0].y = this.EndPoint.y;
        }
      }

      position.x = perimeter[0].x - knobSize;
      position.y = perimeter[0].y - knobSize;
      position.width = knobSize;
      position.height = knobSize;

      let knobParams = null;
      if (GlobalData.optManager.bTouchInitiated) {
        knobParams = {
          svgDoc,
          shapeType: ConstantData.CreateShapeType.OVAL,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 0.25,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: Element.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 2;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = Element.CursorType.CUR_JOIN;
        }
      } else {
        knobParams = {
          svgDoc,
          shapeType: ConstantData.CreateShapeType.OVAL,
          x: knobSize / 2,
          y: knobSize / 2,
          knobSize,
          fillColor: 'black',
          fillOpacity: 1,
          strokeSize: 1,
          strokeColor: '#777777',
          KnobID: 0,
          cursorType: Element.CursorType.ANCHOR
        };
        if (isJoin) {
          knobParams.fillColor = 'none';
          knobParams.strokeSize = 1;
          knobParams.strokeColor = 'black';
          knobParams.cursorType = Element.CursorType.CUR_JOIN;
        }
      }

      const knobElement = this.GenericKnob(knobParams);
      groupElement.AddElement(knobElement);
      groupElement.SetPos(position.x, position.y);
      groupElement.SetSize(position.width, position.height);
      groupElement.isShape = true;
      groupElement.SetID('hilite_' + targetPoint);

      console.log("= S.BaseLine: CreateConnectHilites output:", groupElement);
      return groupElement;
    }
  }

  HookToPoint(hookId: number, outRect?: any): Point {
    console.log("= S.BaseLine: HookToPoint input, hookId:", hookId, "outRect:", outRect);

    // Initialize the result point
    const resultPoint: Point = { x: 0, y: 0 };

    // Get the constant alias for ease of reading
    const CD = ConstantData;

    // Calculate the width adjustment using the helper method
    const widthAdjustment = this.Pr_GetWidthAdjustment();

    // Determine the hook point based on the hookId
    switch (hookId) {
      case CD.HookPts.SED_KTL:
        resultPoint.x = this.StartPoint.x;
        resultPoint.y = this.StartPoint.y;
        break;
      case CD.HookPts.SED_KTR:
        resultPoint.x = this.EndPoint.x;
        resultPoint.y = this.EndPoint.y;
        break;
      case CD.HookPts.SED_WTL:
        resultPoint.x = this.StartPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WTR:
        resultPoint.x = this.StartPoint.x + widthAdjustment.deltax;
        resultPoint.y = this.StartPoint.y - widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WBL:
        resultPoint.x = this.EndPoint.x - widthAdjustment.deltax;
        resultPoint.y = this.EndPoint.y + widthAdjustment.deltay;
        break;
      case CD.HookPts.SED_WBR:
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

    console.log("= S.BaseLine: HookToPoint output, resultPoint:", resultPoint, "outRect:", outRect);
    return resultPoint;
  }

  MaintainPoint(point: Point, targetId: number, distance: number, lineObj: any, offset: any): boolean {
    console.log("= S.BaseLine: MaintainPoint input:", { point, targetId, distance, lineObj, offset });

    let hookIndex: number = -1;
    let currentLine = lineObj;
    const hookRect: any = {};
    let newLine: any = {};

    if (currentLine.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE) {
      switch (currentLine.LineType) {
        case ConstantData.LineType.SEGLINE:
        case ConstantData.LineType.ARCSEGLINE:
        case ConstantData.LineType.POLYLINE:
          // loop through hooks to find the matching target id
          for (let i = 0; i < currentLine.hooks.length; i++) {
            if (currentLine.hooks[i].targetid === targetId) {
              currentLine.HookToPoint(currentLine.hooks[i].hookpt, hookRect);
              hookIndex = 0; // found a matching hook
              break;
            }
          }
          if (hookIndex !== 0) {
            console.log("= S.BaseLine: MaintainPoint output: returning true early (no matching hook)");
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
      if (GlobalData.optManager.LineCheckPoint(this, point)) {
        console.log("= S.BaseLine: MaintainPoint output: returning true early (LineCheckPoint true)");
        return true;
      }
      if (GlobalData.optManager.Lines_Intersect(this, currentLine, point)) {
        console.log("= S.BaseLine: MaintainPoint output: returning true early (Lines_Intersect true)");
        return true;
      }
      GlobalData.optManager.Lines_MaintainDist(this, distance, offset, point);
    } else {
      GlobalData.optManager.Lines_MaintainDist(this, distance, offset, point);
    }

    console.log("= S.BaseLine: MaintainPoint output: returning true");
    return true;
  }

  ChangeTarget(e: any, targetId: any, a: any, r: any, i: any, n: any): void {
    console.log("= S.BaseLine: ChangeTarget called with e:", e, "targetId:", targetId, "a:", a, "r:", r, "i:", i, "n:", n);

    let apparentAngle = 0;
    let targetObj: any = GlobalData.optManager.GetObjectPtr(targetId, false);

    if (this.TextFlags & ConstantData.TextFlags.SED_TF_HorizText &&
      targetObj instanceof Instance.Shape.BaseShape) {

      apparentAngle = this.GetApparentAngle(-1);
      apparentAngle = Math.abs(apparentAngle) % 180;

      let targetRotation = Math.abs(targetObj.RotationAngle % 180);
      console.log("= S.BaseLine: ChangeTarget computed apparentAngle:", apparentAngle, "targetRotation:", targetRotation);

      if (Math.abs(targetRotation - apparentAngle) > 2 &&
        Math.abs(targetRotation - (apparentAngle - 180)) > 2) {
        targetObj.RotationAngle = apparentAngle;
        GlobalData.optManager.SetLinkFlag(
          this.BlockID,
          ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
        );
        GlobalData.optManager.AddToDirtyList(targetId);
        console.log("= S.BaseLine: ChangeTarget updated targetObj.RotationAngle to:", apparentAngle);
      } else {
        console.log("= S.BaseLine: ChangeTarget rotation difference within tolerance, no update performed");
      }
    }

    GlobalData.optManager.AddToDirtyList(this.BlockID);
    console.log("= S.BaseLine: ChangeTarget completed for BlockID:", this.BlockID);
  }

  GetPolyPoints(numPoints: number, isRelative: boolean, a: any, r: any, i: any): Point[] {
    console.log("= S.BaseLine: GetPolyPoints called with:", { numPoints, isRelative, a, r, i });

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

    console.log("= S.BaseLine: GetPolyPoints output:", points);
    return points;
  }

  Hit(e, t, a, r, i) {
    console.log("= S.BaseLine: Hit called with input:", { e, t, a, r, i });

    // Initialize local variables
    var n, o, s, l, S, c, u;
    var p = { x: 0, y: 0 };
    var d = ConstantData.Defines.SED_KnobSize;
    var D = 1;
    var g = {};
    var h = [];

    // Get current document scale factor
    D = GlobalData.optManager.svgDoc.docInfo.docToScreenScale;
    if (GlobalData.optManager.svgDoc.docInfo.docScale <= 0.5) {
      D *= 2;
    }

    // If flag "a" is truthy, check hit on endpoints (with inflated points)
    if (a) {
      // Calculate an inflation size based on knob size and scale
      S = (GlobalData.optManager.bTouchInitiated, 2 * d / D);
      c = Utils2.InflatePoint(this.StartPoint, S);
      g = Utils2.InflatePoint(this.EndPoint, S);

      // If a hook is provided via parameter i, adjust accordingly
      if (i) {
        if (i === ConstantData.HookPts.SED_KTL) {
          c = null;
        }
        if (i === ConstantData.HookPts.SED_KTR) {
          g = null;
        }
      }

      // Also check the object's hooks and nullify endpoints if necessary
      if (this.hooks) {
        for (l = 0; l < this.hooks.length; l++) {
          if (this.hooks[l].hookpt === ConstantData.HookPts.SED_KTL) {
            c = null;
          }
          if (this.hooks[l].hookpt === ConstantData.HookPts.SED_KTR) {
            g = null;
          }
        }
      }

      // If the inflated start point exists and the hit point lies within it...
      if (c && Utils2.pointInRect(c, e)) {
        u = GlobalData.optManager.GetObjectPtr(r.objectid, false);
        if (!(u && u.polylist && u.polylist.closed)) {
          if (r) {
            r.hitcode = ConstantData.HitCodes.SED_PLApp;
            r.segment = ConstantData.HookPts.SED_KTL;
            r.pt = { x: this.StartPoint.x, y: this.StartPoint.y };
          }
          console.log("= S.BaseLine: Hit returning hitcode SED_PLApp (start point)");
          return ConstantData.HitCodes.SED_PLApp;
        }
      }
      // If the inflated end point exists and the hit point lies within it...
      if (g && Utils2.pointInRect(g, e)) {
        u = GlobalData.optManager.GetObjectPtr(r.objectid, false);
        if (!(u && u.polylist && u.polylist.closed)) {
          if (r) {
            r.hitcode = ConstantData.HitCodes.SED_PLApp;
            r.segment = ConstantData.HookPts.SED_KTR;
            r.pt = { x: this.EndPoint.x, y: this.EndPoint.y };
          }
          console.log("= S.BaseLine: Hit returning hitcode SED_PLApp (end point)");
          return ConstantData.HitCodes.SED_PLApp;
        }
      }
    }

    // Get polyline points for the object
    n = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, h);
    p.x = e.x;
    p.y = e.y;

    var m = {};
    // Compute hit using line style hit detection helper
    o = Utils3.LineDStyleHit(n, p, this.StyleRecord.Line.Thickness, 0, m);
    if (m.lpHit !== void 0 && r) {
      // Determine segment index by comparing m.lpHit with array h
      for (s = h.length, l = 0; l < s; l++) {
        if (m.lpHit < h[l]) {
          m.lpHit = l;
          break;
        }
      }
      r.segment = m.lpHit;
    }
    if (r) {
      r.hitcode = o;
    }
    console.log("= S.BaseLine: Hit returning output hitcode:", o);
    return o;
  }

  StartNewObjectDrawDoAutoScroll() {
    console.log("= S.BaseLine: StartNewObjectDrawDoAutoScroll called");

    // Set the auto-scroll timer with a 100ms timeout
    GlobalData.optManager.autoScrollTimerID = GlobalData.optManager.autoScrollTimer.setTimeout(
      'StartNewObjectDrawDoAutoScroll',
      100
    );
    console.log("= S.BaseLine: autoScrollTimerID set to", GlobalData.optManager.autoScrollTimerID);

    // Convert window coordinates (autoScrollXPos, autoScrollYPos) to document coordinates
    let docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      GlobalData.optManager.autoScrollXPos,
      GlobalData.optManager.autoScrollYPos
    );
    console.log("= S.BaseLine: Converted window coords to docCoords:", docCoords);

    // Adjust the document coordinates for auto-grow drag
    docCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);
    console.log("= S.BaseLine: After DoAutoGrowDrag, docCoords:", docCoords);

    // Scroll the document to the new position
    GlobalData.docHandler.ScrollToPosition(docCoords.x, docCoords.y);
    console.log("= S.BaseLine: Scrolled to position:", docCoords);

    // Continue drawing tracking with the updated coordinates
    this.StartNewObjectDrawTrackCommon(docCoords.x, docCoords.y, null);
    console.log("= S.BaseLine: Called StartNewObjectDrawTrackCommon with coords:", docCoords.x, docCoords.y);
  }

  StartNewObjectDrawTrackCommon(x: number, y: number, extraFlag: any): void {
    console.log("= S.BaseLine: StartNewObjectDrawTrackCommon called with x:", x, "y:", y, "extraFlag:", extraFlag);

    // Compute differences relative to the action start coordinates
    const deltaX = x - GlobalData.optManager.theActionStartX;
    const deltaY = y - GlobalData.optManager.theActionStartY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    console.log("= S.BaseLine: Computed deltaX:", deltaX, "deltaY:", deltaY, "distance:", distance);

    // Make a deep copy of the action bounding box
    const actionBBox = $.extend(true, {}, GlobalData.optManager.theActionBBox);
    console.log("= S.BaseLine: actionBBox:", actionBBox);

    // Adjust the line end point
    this.AdjustLineEnd(
      GlobalData.optManager.theActionSVGObject,
      x,
      y,
      ConstantData.ActionTriggerType.LINEEND,
      extraFlag
    );
    console.log("= S.BaseLine: AdjustLineEnd called with x:", x, "y:", y, "trigger:", ConstantData.ActionTriggerType.LINEEND, "extraFlag:", extraFlag);
  }

  LM_DrawTrack(e: any): void {
    console.log("= S.BaseLine: LM_DrawTrack - input:", e);

    // Stop propagation and default behavior
    Utils2.StopPropagationAndDefaults(e);

    let coords: any;
    let altKeyFlag: number = 0;

    // Check if an action stored object exists; if not, exit early
    if (GlobalData.optManager.theActionStoredObjectID === -1) {
      console.log("= S.BaseLine: LM_DrawTrack - no action stored object; returning early");
      return;
    }

    // Convert window coordinates to document coordinates
    if (e.gesture) {
      coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        e.gesture.center.clientX,
        e.gesture.center.clientY
      );
      altKeyFlag = e.gesture.srcEvent.altKey;
    } else {
      coords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        e.clientX,
        e.clientY
      );
    }

    // Process the coordinate adjustments during draw
    coords = this.LM_DrawDuringTrack(coords);

    // Check if link parameters exist and if ConnectIndex is valid
    let hasLinkParams: boolean = GlobalData.optManager.LinkParams &&
      GlobalData.optManager.LinkParams.ConnectIndex >= 0;
    if (GlobalData.optManager.OverrideSnaps(e)) {
      hasLinkParams = true;
    }

    // If snapping is enabled and no valid link parameter is present, apply grid snapping
    if (GlobalData.docHandler.documentConfig.enableSnap && !hasLinkParams) {
      const deltaX: number = coords.x - GlobalData.optManager.theActionStartX;
      const deltaY: number = coords.y - GlobalData.optManager.theActionStartY;
      if (!this.CustomSnap(this.Frame.x, this.Frame.y, deltaX, deltaY, false, coords)) {
        coords = GlobalData.docHandler.SnapToGrid(coords);
      }
    }

    // Adjust coordinates for auto-grow drag
    coords = GlobalData.optManager.DoAutoGrowDrag(coords);

    // Continue drawing if no auto-scroll is triggered; otherwise, auto-scroll will handle it
    if (this.AutoScrollCommon(e, !hasLinkParams, 'StartNewObjectDrawDoAutoScroll')) {
      this.StartNewObjectDrawTrackCommon(coords.x, coords.y, altKeyFlag);
    }

    console.log("= S.BaseLine: LM_DrawTrack - output coords:", coords, "altKeyFlag:", altKeyFlag);
  }

  CancelObjectDraw(): boolean {
    console.log("= S.BaseLine: CancelObjectDraw input: none");

    // Unbind click hammer events
    GlobalData.optManager.unbindActionClickHammerEvents();

    // If LineStamp is set, cancel the mousemove event (if not mobile) and reset LineStamp
    if (GlobalData.optManager.LineStamp) {
      if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.WorkAreaHammer.off('mousemove');
      }
      GlobalData.optManager.LineStamp = false;
    }

    // Reset overlay state and rebind tap event
    GlobalData.optManager.FromOverlayLayer = false;
    GlobalData.optManager.WorkAreaHammer.on('tap', DefaultEvt.Evt_WorkAreaHammerTap);

    // Reset the auto-scroll timer
    this.ResetAutoScrollTimer();

    console.log("= S.BaseLine: CancelObjectDraw output: true");
    return true;
  }

  LM_DrawRelease(e, t) {
    console.log("= S.BaseLine: LM_DrawRelease called with input:", { e, t });

    try {
      let a, r = {}, minlen;
      // Set default minimum segment length
      minlen = ConstantData.Defines.SED_SegDefLen;

      if (t) {
        r = t;
        a = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(t.x, t.y);
      } else if (e.gesture) {
        r = {
          x: e.gesture.center.clientX,
          y: e.gesture.center.clientY
        };
        a = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
          e.gesture.center.clientX,
          e.gesture.center.clientY
        );
      } else {
        r = {
          x: e.clientX,
          y: e.clientY
        };
        a = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(e.clientX, e.clientY);
      }

      if (e) {
        Utils2.StopPropagationAndDefaults(e);
      }

      let i, n;
      const o = 2 * ConstantData.Defines.SED_MinDim;
      if (GlobalData.optManager.FromOverlayLayer) {
        i = GlobalData.optManager.theLineDrawStartX - a.x;
        n = GlobalData.optManager.theLineDrawStartY - a.y;
        minlen -= 20;
      } else {
        i = GlobalData.optManager.theDrawStartX - a.x;
        n = GlobalData.optManager.theDrawStartY - a.y;
      }

      // Check if the movement is too short to consider as a draw operation
      if (
        !GlobalData.optManager.LineStamp &&
        Math.abs(i) < o &&
        Math.abs(n) < o
      ) {
        GlobalData.optManager.LineStamp = true;
        if (
          !GlobalData.optManager.isMobilePlatform &&
          GlobalData.optManager.WorkAreaHammer
        ) {
          GlobalData.optManager.WorkAreaHammer.on(
            "mousemove",
            DefaultEvt.Evt_DrawTrackHandlerFactory(this)
          );
        }
        console.log("= S.BaseLine: LM_DrawRelease short movement detected; starting line stamp.");
        return;
      }

      if (GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.unbindActionClickHammerEvents();
        GlobalData.optManager.WorkAreaHammer.on("tap", DefaultEvt.Evt_WorkAreaHammerTap);
      }

      if (e && e.gesture) {
        e.gesture.stopDetect();
      }
      this.ResetAutoScrollTimer();

      if (GlobalData.optManager.FromOverlayLayer && (i * i + n * n < minlen * minlen)) {
        SDUI.Commands.MainController.Shapes.CancelModalOperation();
        console.log("= S.BaseLine: LM_DrawRelease canceled due to insufficient length in overlay mode.");
        return;
      }

      // Prepare link parameters backup copy
      const s = {
        LinkParams: Utils1.DeepCopy(GlobalData.optManager.LinkParams)
      };

      const l = this.LM_DrawPostRelease(GlobalData.optManager.theActionStoredObjectID);
      let S = null;
      if (GlobalData.optManager.FromOverlayLayer) {
        S = gBusinessController.AddLineLabel(this.BlockID);
      }

      // Build collaboration message if allowed
      if (Collab.AllowMessage()) {
        const c: any = { attributes: {} };
        c.attributes.StyleRecord = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StyleRecord);
        c.attributes.StartArrowID = GlobalData.optManager.theDrawShape.StartArrowID;
        c.attributes.EndArrowID = GlobalData.optManager.theDrawShape.EndArrowID;
        c.attributes.StartArrowDisp = GlobalData.optManager.theDrawShape.StartArrowDisp;
        c.attributes.ArrowSizeIndex = GlobalData.optManager.theDrawShape.ArrowSizeIndex;
        c.attributes.TextGrow = GlobalData.optManager.theDrawShape.TextGrow;
        c.attributes.TextAlign = GlobalData.optManager.theDrawShape.TextAlign;
        c.attributes.TextDirection = GlobalData.optManager.theDrawShape.TextDirection;
        c.attributes.TextFlags = GlobalData.optManager.theDrawShape.TextFlags;
        c.attributes.Dimensions = GlobalData.optManager.theDrawShape.Dimensions;
        c.attributes.StartPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StartPoint);
        c.attributes.EndPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.EndPoint);
        c.attributes.Frame = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.Frame);
        c.attributes.objecttype = this.objecttype;
        c.attributes.ShortRef = this.ShortRef;
        c.attributes.shapeparam = this.shapeparam;
        if (this.CurveAdjust != null) {
          c.attributes.CurveAdjust = this.CurveAdjust;
        }
        if (this.segl) {
          c.attributes.segl = Utils1.DeepCopy(this.segl);
        }
        c.UsingWallTool = ConstantData.DocumentContext.UsingWallTool;
        c.LineTool = ConstantData.DocumentContext.LineTool;
        if (Collab.CreateList.length) {
          Collab.AddNewBlockToSecondary(Collab.CreateList[0]);
        }
        if (Collab.IsSecondary() && Collab.CreateList.length) {
          c.CreateList = [].concat(Collab.CreateList);
        }
        c.LinkParams = s.LinkParams;
        c.Actions = [];
        let u = new Collab.MessageAction(ConstantData.CollabMessageActions.CreateLine);
        c.Actions.push(u);
        u = new Collab.MessageAction(ConstantData.CollabMessageActions.LinkObject);
        c.Actions.push(u);
        if (S) {
          c.label = S;
          u = new Collab.MessageAction(ConstantData.CollabMessageActions.AddLabel);
          c.Actions.push(u);
        }
        const p = Collab.BuildMessage(ConstantData.CollabMessages.AddLine, c, false, true);
        if (p) {
          Collab.SendMessage(p);
        }
      }

      // Post-draw operations and finalizing
      if (l) {
        GlobalData.optManager.PostObjectDraw(null);
      } else {
        GlobalData.optManager.PostObjectDraw(this.LM_DrawRelease);
      }

      if (GlobalData.optManager.LineStamp) {
        if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
          GlobalData.optManager.WorkAreaHammer.off("mousemove");
        }
        GlobalData.optManager.LineStamp = false;
      }

      if (GlobalData.optManager.FromOverlayLayer) {
        GlobalData.optManager.FromOverlayLayer = false;
        gBusinessController.CompleteAction(this.BlockID, r);
      }

      console.log("= S.BaseLine: LM_DrawRelease output completed successfully.");
    } catch (e) {
      GlobalData.optManager.CancelModalOperation();
      this.LM_DrawClick_ExceptionCleanup(e);
      GlobalData.optManager.ExceptionCleanup(e);
      console.error("= S.BaseLine: LM_DrawRelease encountered error:", e);
      throw e;
    }
    console.log("= S.BaseLine: LM_DrawRelease finished execution.");
  }

  LM_DrawPreTrack(e) {
    console.log("= S.BaseLine: LM_DrawPreTrack called with input:", e);

    let hookFlags = this.GetHookFlags();
    let session = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    let linksBlock;
    let extra = {}; // extra object for GetHookList
    let hookPoints = [{ x: 0, y: 0 }];
    let allowLink = this.AllowLink();

    if (allowLink) {
      GlobalData.optManager.LinkParams = new LinkParameters();
      if (session && !GlobalData.optManager.FromOverlayLayer) {
        GlobalData.optManager.LinkParams.AllowJoin = session.flags & ConstantData.SessionFlags.SEDS_FreeHand;
      }
      if (hookFlags & ConstantData.HookFlags.SED_LC_CHook) {
        hookPoints[0].id = ConstantData.HookPts.SED_KTL;
        hookPoints[0].x = e.x;
        hookPoints[0].y = e.y;
        GlobalData.optManager.theDragDeltaX = 0;
        GlobalData.optManager.theDragDeltaY = 0;

        linksBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);
        if (
          GlobalData.optManager.FindConnect(
            GlobalData.optManager.theActionStoredObjectID,
            this,
            hookPoints,
            false,
            false,
            GlobalData.optManager.LinkParams.AllowJoin,
            e
          )
        ) {
          GlobalData.optManager.LinkParams.SConnectIndex = GlobalData.optManager.LinkParams.ConnectIndex;
          GlobalData.optManager.LinkParams.SConnectHookFlag = GlobalData.optManager.LinkParams.ConnectHookFlag;
          GlobalData.optManager.LinkParams.SConnectInside = GlobalData.optManager.LinkParams.ConnectInside;
          GlobalData.optManager.LinkParams.SConnectPt.x = GlobalData.optManager.LinkParams.ConnectPt.x;
          GlobalData.optManager.LinkParams.SConnectPt.y = GlobalData.optManager.LinkParams.ConnectPt.y;
          GlobalData.optManager.LinkParams.ConnectIndex = -1;
          GlobalData.optManager.LinkParams.Hookindex = -1;
          GlobalData.optManager.LinkParams.ConnectInside = 0;
          GlobalData.optManager.LinkParams.ConnectHookFlag = 0;
          e.x += GlobalData.optManager.theDragDeltaX;
          e.y += GlobalData.optManager.theDragDeltaY;
          this.StartPoint.x += GlobalData.optManager.theDragDeltaX;
          this.StartPoint.y += GlobalData.optManager.theDragDeltaY;
          this.EndPoint.x = this.StartPoint.x;
          this.EndPoint.y = this.StartPoint.y;
          GlobalData.optManager.LinkParams.lpCircList = GlobalData.optManager.GetHookList(
            linksBlock,
            GlobalData.optManager.LinkParams.lpCircList,
            GlobalData.optManager.LinkParams.SConnectIndex,
            this,
            ConstantData.ListCodes.SED_LC_TARGONLY,
            extra
          );
        } else if (GlobalData.optManager.LinkParams.JoinIndex >= 0) {
          GlobalData.optManager.LinkParams.SJoinIndex = GlobalData.optManager.LinkParams.JoinIndex;
          GlobalData.optManager.LinkParams.SJoinData = GlobalData.optManager.LinkParams.JoinData;
          GlobalData.optManager.LinkParams.SJoinSourceData = GlobalData.optManager.LinkParams.JoinSourceData;
          GlobalData.optManager.LinkParams.SConnectPt.x = GlobalData.optManager.LinkParams.ConnectPt.x;
          GlobalData.optManager.LinkParams.SConnectPt.y = GlobalData.optManager.LinkParams.ConnectPt.y;
          GlobalData.optManager.LinkParams.JoinIndex = -1;
          GlobalData.optManager.LinkParams.JoinData = 0;
          GlobalData.optManager.LinkParams.JoinSourceData = 0;
          GlobalData.optManager.LinkParams.lpCircList = GlobalData.optManager.GetHookList(
            linksBlock,
            GlobalData.optManager.LinkParams.lpCircList,
            GlobalData.optManager.LinkParams.SJoinIndex,
            this,
            ConstantData.ListCodes.SED_LC_CIRCTARG,
            extra
          );
        }
      }
    } else {
      // When linking is not allowed, just retrieve the session
      session = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
    }

    // If session exists and the object is a PolyLine or the session allows free-hand,
    // then set LinkParams with ArraysOnly flag.
    if (
      session &&
      (
        this instanceof Instance.Shape.PolyLine ||
        (session.flags & ConstantData.SessionFlags.SEDS_FreeHand)
      )
    ) {
      GlobalData.optManager.LinkParams = new LinkParameters();
      GlobalData.optManager.LinkParams.ArraysOnly = true;
      GlobalData.optManager.LinkParams.AllowJoin = session.flags & ConstantData.SessionFlags.SEDS_FreeHand;
    }

    console.log("= S.BaseLine: LM_DrawPreTrack output LinkParams:", GlobalData.optManager.LinkParams);
    return true;
  }
  // LM_DrawDuringTrack(e) { }

  LM_DrawDuringTrack(e: any): any {
    console.log("= S.BaseLine: LM_DrawDuringTrack - input:", e);

    let t: any;
    let a: any;
    let resultPoints = [{ x: 0, y: 0 }];
    let hasJoinIssue = false;

    if (GlobalData.optManager.LinkParams != null) {
      // Set initial connection point and drag deltas
      resultPoints[0].x = e.x;
      resultPoints[0].y = e.y;
      resultPoints[0].id = ConstantData.HookPts.SED_KTR;
      GlobalData.optManager.theDragDeltaX = 0;
      GlobalData.optManager.theDragDeltaY = 0;

      // Attempt to find a connection
      const foundConnection = GlobalData.optManager.FindConnect(
        GlobalData.optManager.theActionStoredObjectID,
        this,
        resultPoints,
        true,
        false,
        GlobalData.optManager.LinkParams.AllowJoin,
        e
      );
      if (foundConnection) {
        e.x += GlobalData.optManager.theDragDeltaX;
        e.y += GlobalData.optManager.theDragDeltaY;
      }

      // Check for join conditions if SJoinIndex is set and JoinIndex is not yet assigned
      if (
        GlobalData.optManager.LinkParams.SJoinIndex >= 0 &&
        GlobalData.optManager.LinkParams.JoinIndex < 0
      ) {
        t = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.LinkParams.SJoinIndex);
        // Check if the object is a polyline
        if (this.checkIfPolyLine(t)) {
          a = new HitResult(-1, 0, null);
          a.hitcode = t.Hit(e, false, true, a);
          if (a && a.hitcode === ConstantData.HitCodes.SED_PLApp && GlobalData.optManager.LinkParams.SJoinData != a.segment) {
            hasJoinIssue = true;
          }
        }
        if (hasJoinIssue) {
          GlobalData.optManager.LinkParams.JoinIndex = t.BlockID;
          GlobalData.optManager.LinkParams.JoinData = a.segment;
          if (GlobalData.optManager.LinkParams.HiliteJoin < 0) {
            GlobalData.optManager.LinkParams.hiliteJoin = t.BlockID;
            if (GlobalData.optManager.GetEditMode() != ConstantData.EditState.LINKJOIN) {
              GlobalData.optManager.SetEditMode(ConstantData.EditState.LINKJOIN, null, false);
              t.SetCursors();
              GlobalData.optManager.SetEditMode(ConstantData.EditState.LINKJOIN, null, false);
            }
          }
        } else {
          if (GlobalData.optManager.LinkParams.HiliteJoin >= 0) {
            GlobalData.optManager.HiliteConnect(
              GlobalData.optManager.LinkParams.HiliteJoin,
              GlobalData.optManager.LinkParams.ConnectPt,
              false,
              true,
              this.BlockID,
              null
            );
            GlobalData.optManager.LinkParams.HiliteJoin = -1;
          }
          GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
        }
      }
    }

    console.log("= S.BaseLine: LM_DrawDuringTrack - output:", e);
    return e;
  }

  LM_DrawPostRelease(actionStoredObjectID: number): boolean {
    console.log("= S.BaseLine: LM_DrawPostRelease called with actionStoredObjectID =", actionStoredObjectID);

    if (GlobalData.optManager.LinkParams != null) {
      // Process SHiliteConnect if present
      if (GlobalData.optManager.LinkParams.SHiliteConnect >= 0) {
        console.log("= S.BaseLine: Processing SHiliteConnect =", GlobalData.optManager.LinkParams.SHiliteConnect);
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.SHiliteConnect,
          GlobalData.optManager.LinkParams.SConnectPt,
          false,
          false,
          this.BlockID,
          GlobalData.optManager.LinkParams.SHiliteInside
        );
        GlobalData.optManager.LinkParams.SHiliteConnect = -1;
        GlobalData.optManager.LinkParams.SHiliteInside = null;
      }
      // Process HiliteConnect if present
      if (GlobalData.optManager.LinkParams.HiliteConnect >= 0) {
        console.log("= S.BaseLine: Processing HiliteConnect =", GlobalData.optManager.LinkParams.HiliteConnect);
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteConnect,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          false,
          this.BlockID,
          GlobalData.optManager.LinkParams.HiliteInside
        );
        GlobalData.optManager.LinkParams.HiliteConnect = -1;
        GlobalData.optManager.LinkParams.HiliteInside = null;
      }
      // Process SHiliteJoin if present
      if (GlobalData.optManager.LinkParams.SHiliteJoin >= 0) {
        console.log("= S.BaseLine: Processing SHiliteJoin =", GlobalData.optManager.LinkParams.SHiliteJoin);
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.SHiliteJoin,
          GlobalData.optManager.LinkParams.SConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        GlobalData.optManager.LinkParams.SHiliteJoin = -1;
      }
      // Process HiliteJoin if present
      if (GlobalData.optManager.LinkParams.HiliteJoin >= 0) {
        console.log("= S.BaseLine: Processing HiliteJoin =", GlobalData.optManager.LinkParams.HiliteJoin);
        GlobalData.optManager.HiliteConnect(
          GlobalData.optManager.LinkParams.HiliteJoin,
          GlobalData.optManager.LinkParams.ConnectPt,
          false,
          true,
          this.BlockID,
          null
        );
        GlobalData.optManager.LinkParams.HiliteJoin = -1;
      }

      // Set edit mode to default
      console.log("= S.BaseLine: Setting edit mode to DEFAULT");
      GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);

      // Process SJoinIndex if available
      if (GlobalData.optManager.LinkParams.SJoinIndex >= 0) {
        console.log("= S.BaseLine: Processing SJoinIndex =", GlobalData.optManager.LinkParams.SJoinIndex);
        var newConnectID = GlobalData.optManager.PolyLJoin(
          GlobalData.optManager.LinkParams.SJoinIndex,
          GlobalData.optManager.LinkParams.SJoinData,
          actionStoredObjectID,
          GlobalData.optManager.LinkParams.SJoinSourceData,
          false
        );
        if (
          newConnectID != actionStoredObjectID &&
          newConnectID >= 0 &&
          (actionStoredObjectID = newConnectID, GlobalData.optManager.LinkParams.ConnectIndex >= 0)
        ) {
          GlobalData.optManager.LinkParams.ConnectIndex = -1;
          console.log("= S.BaseLine: Updated actionStoredObjectID to", newConnectID);
          var joinObj = GlobalData.optManager.GetObjectPtr(newConnectID, false);
          if (Utils2.EqualPt(this.EndPoint, joinObj.StartPoint)) {
            GlobalData.optManager.LinkParams.JoinSourceData = 1;
          } else {
            GlobalData.optManager.LinkParams.JoinSourceData = 2;
          }
        }
      }
      // Process SConnectIndex if no SJoinIndex
      else if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.SConnectIndex >= 0) {
        console.log("= S.BaseLine: Processing SConnectIndex =", GlobalData.optManager.LinkParams.SConnectIndex);
        GlobalData.optManager.LinkParams.SConnectIndex = GlobalData.optManager.SD_GetVisioTextParent(
          GlobalData.optManager.LinkParams.SConnectIndex
        );
        GlobalData.optManager.UpdateHook(
          actionStoredObjectID,
          -1,
          GlobalData.optManager.LinkParams.SConnectIndex,
          ConstantData.HookPts.SED_KTL,
          GlobalData.optManager.LinkParams.SConnectPt,
          GlobalData.optManager.LinkParams.SConnectInside
        );
      }

      // Determine result based on JoinIndex or ConnectIndex
      var result = false;
      if (GlobalData.optManager.LinkParams.JoinIndex >= 0) {
        console.log("= S.BaseLine: Processing JoinIndex =", GlobalData.optManager.LinkParams.JoinIndex);
        result =
          GlobalData.optManager.PolyLJoin(
            GlobalData.optManager.LinkParams.JoinIndex,
            GlobalData.optManager.LinkParams.JoinData,
            actionStoredObjectID,
            GlobalData.optManager.LinkParams.JoinSourceData,
            false
          ) == -2;
      } else if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0) {
        console.log("= S.BaseLine: Processing ConnectIndex =", GlobalData.optManager.LinkParams.ConnectIndex);
        GlobalData.optManager.UpdateHook(
          actionStoredObjectID,
          GlobalData.optManager.LinkParams.InitialHook,
          GlobalData.optManager.LinkParams.ConnectIndex,
          GlobalData.optManager.LinkParams.HookIndex,
          GlobalData.optManager.LinkParams.ConnectPt,
          GlobalData.optManager.LinkParams.ConnectInside
        );
      }

      // Clear continuous drawing flag and update links
      this.hookflags = Utils2.SetFlag(
        this.hookflags,
        ConstantData.HookFlags.SED_LC_NoContinuous,
        false
      );
      console.log("= S.BaseLine: Updating links");
      GlobalData.optManager.UpdateLinks();

      // Clear LinkParams
      GlobalData.optManager.LinkParams = null;

      console.log("= S.BaseLine: LM_DrawPostRelease output =", result);
      return result;
    }

    console.log("= S.BaseLine: LM_DrawPostRelease: No LinkParams found, returning false");
    return false;
  }

  LM_DrawClick_ExceptionCleanup(e) {
    console.log("= S.BaseLine: LM_DrawClick_ExceptionCleanup - Start, input:", e);

    GlobalData.optManager.unbindActionClickHammerEvents();

    if (GlobalData.optManager.LineStamp) {
      if (!GlobalData.optManager.isMobilePlatform && GlobalData.optManager.WorkAreaHammer) {
        GlobalData.optManager.WorkAreaHammer.off('mousemove');
        console.log("= S.BaseLine: Disabled 'mousemove' event on WorkAreaHammer");
      }
      GlobalData.optManager.LineStamp = false;
      console.log("= S.BaseLine: LineStamp flag reset to false");
    }

    GlobalData.optManager.WorkAreaHammer.on('tap', DefaultEvt.Evt_WorkAreaHammerTap);
    console.log("= S.BaseLine: Bound 'tap' event to Evt_WorkAreaHammerTap");

    this.ResetAutoScrollTimer();
    console.log("= S.BaseLine: Auto-scroll timer reset");

    GlobalData.optManager.LinkParams = null;
    console.log("= S.BaseLine: LinkParams set to null");

    GlobalData.optManager.theActionStoredObjectID = -1;
    console.log("= S.BaseLine: theActionStoredObjectID set to -1");

    GlobalData.optManager.theActionSVGObject = null;
    console.log("= S.BaseLine: theActionSVGObject set to null");

    GlobalData.optManager.LineStamp = false;
    console.log("= S.BaseLine: LineStamp flag ensured to be false");

    GlobalData.optManager.FromOverlayLayer = false;
    console.log("= S.BaseLine: FromOverlayLayer set to false");

    GlobalData.optManager.WorkAreaHammer.on('dragstart', DefaultEvt.Evt_WorkAreaHammerDragStart);
    console.log("= S.BaseLine: Bound 'dragstart' event to Evt_WorkAreaHammerDragStart");

    console.log("= S.BaseLine: LM_DrawClick_ExceptionCleanup - End");
  }


  LM_DrawClick(docCorX: number, docCorY: number): void {
    console.log("= S.BaseLine: LM_DrawClick input:", { docCorX, docCorY });

    try {
      // Update frame and starting/ending points
      this.Frame.x = docCorX;
      this.Frame.y = docCorY;
      this.StartPoint = { x: docCorX, y: docCorY };
      this.EndPoint = { x: docCorX, y: docCorY };

      console.log("= S.BaseLine: LM_DrawClick updated Frame, StartPoint, EndPoint:", {
        Frame: this.Frame,
        StartPoint: this.StartPoint,
        EndPoint: this.EndPoint
      });

      // Register event handlers for drawing
      GlobalData.optManager.WorkAreaHammer.on('drag', DefaultEvt.Evt_DrawTrackHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.on('dragend', DefaultEvt.Evt_DrawReleaseHandlerFactory(this));
      GlobalData.optManager.WorkAreaHammer.off('tap');

      console.log("= S.BaseLine: LM_DrawClick output: registered event handlers");
    } catch (error) {
      console.log("= S.BaseLine: LM_DrawClick error:", error);
      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  WriteSDFAttributes(e, t) {
    var a = 0,
      r = - 1;
    if (this.DataID >= 0) {
      switch (SDF.TextAlignToWin(this.TextAlign).vjust) {
        case FileParser.TextJust.TA_TOP:
        case FileParser.TextJust.TA_BOTTOM:
      }
      a = ConstantData.TextFlags.SED_TF_AttachC,
        this.LineTextX &&
        (a = ConstantData.TextFlags.SED_TF_AttachC),
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_AttachA | ConstantData.TextFlags.SED_TF_AttachB | ConstantData.TextFlags.SED_TF_AttachC | ConstantData.TextFlags.SED_TF_AttachD,
          !1
        ),
        this.TextFlags = Utils2.SetFlag(this.TextFlags, a, !0),
        this.TextFlags = Utils2.SetFlag(
          this.TextFlags,
          ConstantData.TextFlags.SED_TF_HorizText,
          !this.TextDirection
        )
    } (t.WriteBlocks || t.WriteVisio) &&
      (r = this.DataID),
      t.WriteVisio &&
      this.polylist &&
      ListManager.PolyLine.prototype.WriteSDFAttributes.call(this, e, t, !1),
      SDF.WriteTextParams(e, this, r, t),
      t.WriteVisio &&
      r >= 0 &&
      SDF.WriteText(e, this, null, null, !1, t),
      SDF.WriteArrowheads(e, t, this)
  }

  ChangeBackgroundColor(newColor: string, currentColor: string): void {
    console.log("= S.BaseLine: ChangeBackgroundColor called with newColor:", newColor, "currentColor:", currentColor);

    if (
      this.StyleRecord.Fill.Paint.FillType !== ConstantData.FillTypes.SDFILL_TRANSPARENT &&
      this.StyleRecord.Fill.Paint.Color === currentColor
    ) {
      const obj = GlobalData.optManager.GetObjectPtr(this.BlockID, true);
      console.log("= S.BaseLine: Retrieved object:", obj);

      this.StyleRecord.Fill.Paint.Color = newColor;
      console.log("= S.BaseLine: Background color changed to:", newColor);
    } else {
      console.log("= S.BaseLine: Conditions not met, background color remains unchanged.");
    }

    console.log("= S.BaseLine: ChangeBackgroundColor completed.");
  }

  ResizeInTextEdit(e: any, t: any): { x: number; y: number } {
    console.log("= S.BaseLine: ResizeInTextEdit called with input:", { e, t });
    const result = { x: 0, y: 0 };
    console.log("= S.BaseLine: ResizeInTextEdit output:", result);
    return result;
  }

  CalcTextPosition(e) {
    console.log("= S.BaseLine: CalcTextPosition called with input:", e);

    // Calculate the center of the input frame
    const inputCenter = {
      x: e.Frame.x + e.Frame.width / 2,
      y: e.Frame.y + e.Frame.height / 2,
    };

    // Collect the start and end points of the line
    const linePoints = [];
    linePoints.push({
      x: this.StartPoint.x,
      y: this.StartPoint.y,
    });
    linePoints.push({
      x: this.EndPoint.x,
      y: this.EndPoint.y,
    });

    // Calculate the center of this object's frame
    const currentCenter = {
      x: this.Frame.x + this.Frame.width / 2,
      y: this.Frame.y + this.Frame.height / 2,
    };

    // Get the base angle and the additional rotation angle provided by input
    const baseAngle = this.GetAngle(null);
    let rotationAngle = e.RotationAngle;

    // If this is a simple line, adjust the rotationAngle with the base angle
    if (this.LineType === ConstantData.LineType.LINE) {
      rotationAngle = baseAngle + rotationAngle;
      rotationAngle %= 180;
      if (Math.abs(rotationAngle) < 1) {
        rotationAngle = 0;
      }
    }

    // Calculate the differences between start and end points for distance calculation
    const deltaX = this.EndPoint.x - this.StartPoint.x;
    const deltaY = this.EndPoint.y - this.StartPoint.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    this.TextWrapWidth = distance;

    // Check angle modulo for horizontal text flag
    const modBaseAngle = baseAngle % 180;
    if (!Utils2.IsEqual(modBaseAngle, 0) && rotationAngle === 0) {
      this.TextFlags = Utils2.SetFlag(
        this.TextFlags,
        ConstantData.TextFlags.SED_TF_HorizText,
        true
      );
    }

    // Compute the rotation (in radians) needed for alignment
    const rotationRadian = -baseAngle * ConstantData.Geometry.PI / 180;
    Utils3.RotatePointsAboutPoint(currentCenter, rotationRadian, linePoints);

    // Determine text position along the line (normalized proportion)
    this.LineTextX = (inputCenter.x - linePoints[0].x) / distance;
    if (this.LineTextX < 0) {
      this.LineTextX = 1 + this.LineTextX;
    }
    // Vertical offset between the input center and the first point after rotation
    this.LineTextY = inputCenter.y - linePoints[0].y;

    // Copy the text rectangle from the input if available
    if (this.LineTextX) {
      this.trect = $.extend(true, {}, e.trect);
    }

    console.log("= S.BaseLine: CalcTextPosition output:", {
      LineTextX: this.LineTextX,
      LineTextY: this.LineTextY,
      TextWrapWidth: this.TextWrapWidth,
      trect: this.trect,
    });
  }

  SetTextObject(dataID: number): boolean {
    this.DataID = dataID;

    // Get text alignment settings based on current text alignment
    const textAlignSettings = SDF.TextAlignToWin(this.TextAlign);
    // Retrieve the current session object
    const sessionObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Update style fill color using the session background color
    this.StyleRecord.Fill.Paint.Color = sessionObj.background.Paint.Color;

    // If vertical justification is center, use a solid fill with full opacity;
    // otherwise, use a transparent fill.
    if (textAlignSettings.vjust === FileParser.TextJust.TA_CENTER) {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_TRANSPARENT;
    }

    return true;
  }

  SetTextObject(dataID: number): boolean {
    this.DataID = dataID;

    // Get text alignment settings based on current text alignment
    const textAlignSettings = SDF.TextAlignToWin(this.TextAlign);
    // Retrieve the current session object
    const sessionObj = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);

    // Update style fill color using the session background color
    this.StyleRecord.Fill.Paint.Color = sessionObj.background.Paint.Color;

    // If vertical justification is center, use a solid fill with full opacity;
    // otherwise, use a transparent fill.
    if (textAlignSettings.vjust === FileParser.TextJust.TA_CENTER) {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_SOLID;
      this.StyleRecord.Fill.Paint.Opacity = 1;
    } else {
      this.StyleRecord.Fill.Paint.FillType = ConstantData.FillTypes.SDFILL_TRANSPARENT;
    }

    return true;
  }

  GetTextOnLineParams(inputParam: any) {
    console.log("= S.BaseLine: GetTextOnLineParams input:", inputParam);

    const params = {
      Frame: new Rect(),
      StartPoint: new Point(),
      EndPoint: new Point()
    };

    // Copy start and end points from the object
    params.StartPoint.x = this.StartPoint.x;
    params.StartPoint.y = this.StartPoint.y;
    params.EndPoint.x = this.EndPoint.x;
    params.EndPoint.y = this.EndPoint.y;

    // Calculate the frame from the start and end points
    params.Frame = Utils2.Pt2Rect(params.StartPoint, params.EndPoint);

    // If there is a non-zero LineTextX, apply additional properties
    if (this.LineTextX !== 0) {
      params.CenterProp = this.LineTextX;
      params.Displacement = this.LineTextY;
    }

    console.log("= S.BaseLine: GetTextOnLineParams output:", params);
    return params;
  }

  TextDirectionCommon(e, t, a, r) {
    console.log("= S.BaseLine: TextDirectionCommon input:", { e, t, a, r });

    var i, n, o, s, l, S, c, u,
      p = e.GetTextMinDimensions(),
      d = p.width,
      D = this.GetTextOnLineParams(r),
      g = D.StartPoint.x,
      h = D.Frame.x,
      m = D.EndPoint.x,
      C = p.height,
      y = D.StartPoint.y,
      f = D.Frame.y,
      L = D.EndPoint.y,
      I = GlobalData.optManager.SD_GetClockwiseAngleBetween2PointsInRadians(D.StartPoint, D.EndPoint),
      T = I * (180 / ConstantData.Geometry.PI),
      b = false,
      M = 0.5,
      P = {},
      R = 0,
      A = 0;

    // Set vertical alignment and prepare linetrect
    e.SetVerticalAlignment('top');
    this.linetrect = $.extend(true, {}, this.Frame);

    if (this.LineTextY) {
      R = this.LineTextY * Math.cos(I);
      A = -this.LineTextY * Math.sin(I);
    }

    if (this.VisioRotationDiff) {
      T -= this.VisioRotationDiff;
    }

    if (T > 90 && T < 270) {
      T -= 180;
      b = true;
    }

    if (!a && this.TextDirection) {
      // no change
    } else {
      I = 0;
      T = 0;
      i = this.TextAlign;
      s = this.TextDirection;
    }

    if (this.LineTextX || this.LineTextY) {
      if (p) {
        this.theMinTextDim.width = p.width;
        this.theMinTextDim.height = p.height;
        if (a) {
          this.TextAlign = i;
        }
        var _ = SDF.TextAlignToJust(this.TextAlign);
        if (b && (T += 180, this.LineType === ConstantData.LineType.LINE)) {
          switch (_.just) {
            case ConstantData.TextAlign.LEFT:
              _.just = ConstantData.TextAlign.RIGHT;
              break;
            case ConstantData.TextAlign.RIGHT:
              _.just = ConstantData.TextAlign.LEFT;
              break;
          }
        }
        if (t) {
          t.SetSize(d + 2, C + 2);
        }
        c = g + (m - g) * (M = D.CenterProp) - h + A;
        u = y + (L - y) * M - f + R;
        if (this.trect.height === 0) {
          this.trect.height = 3 * C;
        }
        var E = C;
        if (this.trect.height > C) {
          E = this.trect.height;
        }
        n = this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL
          ? c - p.width / 2
          : c - this.trect.width / 2;
        o = u - E / 2;
        e.SetPos(n, o);
        e.SetVerticalAlignment(_.vjust);
        e.SetParagraphAlignment(_.just);
        if (this.TextDirection) {
          e.SetRotation(T, c, u);
        } else {
          e.SetRotation(0, c, u);
        }
        P = { x: c, y: u };

        var w = {};
        switch (_.just) {
          case ConstantData.TextAlign.LEFT:
            w.x = n - 1;
            break;
          case ConstantData.TextAlign.RIGHT:
            w.x = n - 1 + this.trect.width - d;
            break;
          default:
            w.x = c - d / 2 - 1;
        }
        switch (_.vjust) {
          case 'top':
            w.y = u - 1 - E / 2;
            break;
          case 'bottom':
            w.y = u - C / 2 - 1 + E / 2;
            break;
          default:
            w.y = u - C / 2 - 1;
        }
        if (t) {
          t.SetPos(w.x, w.y);
        }

        this.linetrect.x = w.x;
        this.linetrect.y = w.y;
        this.linetrect.width = d + 2;
        this.linetrect.height = C + 2;

        if (this.TextDirection) {
          if (t) {
            t.SetRotation(T, c, u);
          }
          this.linetrect = GlobalData.optManager.RotateRect(this.linetrect, P, T);
        } else if (t) {
          t.SetRotation(0, c, u);
        }
        this.UpdateFrame();
      }
    } else if (p) {
      // Alternative branch when no LineTextX or LineTextY is set
      this.theMinTextDim.width = p.width;
      this.theMinTextDim.height = p.height;
      t.SetSize(d + 2, C + 2);
      switch (this.TextAlign) {
        case ConstantData.TextAlign.TOPLEFT:
          l = g - h + (d / 2) * Math.cos(I);
          S = y - f + (d / 2) * Math.sin(I);
          t.SetPos(l - d / 2 - 1, S - C - this.StyleRecord.Line.Thickness / 2 - 2);
          n = l - d / 2;
          o = S - C - this.StyleRecord.Line.Thickness / 2 - 1;
          e.SetPos(l - d / 2, S - C - this.StyleRecord.Line.Thickness / 2 - 1);
          e.SetRotation(T, l, S);
          P = { x: l, y: S };
          t.SetRotation(T, l, S);
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            b = false;
          }
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          }
          break;
        case ConstantData.TextAlign.LEFT:
          l = g - h + (d / 2) * Math.cos(I);
          S = y - f + (d / 2) * Math.sin(I);
          t.SetPos(l - d / 2 - 1, S - C / 2 - 1);
          n = l - d / 2;
          o = S - C / 2;
          e.SetPos(l - d / 2, S - C / 2);
          e.SetRotation(T, l, S);
          P = { x: l, y: S };
          t.SetRotation(T, l, S);
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            b = false;
          }
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          }
          break;
        case ConstantData.TextAlign.BOTTOMLEFT:
          l = g - h + (d / 2) * Math.cos(I);
          S = y - f + (d / 2) * Math.sin(I);
          t.SetPos(l - d / 2 - 1, S + this.StyleRecord.Line.Thickness / 2 + 1);
          n = l - d / 2;
          o = S + this.StyleRecord.Line.Thickness / 2 + 2;
          e.SetPos(l - d / 2, S + this.StyleRecord.Line.Thickness / 2 + 2);
          t.SetRotation(T, l, S);
          e.SetRotation(T, l, S);
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            b = false;
          }
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          }
          P = { x: l, y: S };
          break;
        case ConstantData.TextAlign.TOPCENTER:
          c = (g + m) / 2 - h;
          u = (y + L) / 2 - f;
          t.SetPos(c - d / 2 - 2, u - C - this.StyleRecord.Line.Thickness / 2 - 2);
          n = c - d / 2 - 1;
          o = u - C - this.StyleRecord.Line.Thickness / 2 - 1;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            if (D.CenterProp) {
              this.trect.x = h + c - this.trect.width / 2;
            }
            n = this.trect.x - h;
            e.SetPos(n, o);
            e.SetRotation(T, n + this.trect.width / 2, u);
            P = { x: n + this.trect.width / 2, y: u };
          } else {
            e.SetPos(c - d / 2 - 1, u - C - this.StyleRecord.Line.Thickness / 2 - 1);
            e.SetRotation(T, c, u);
            P = { x: c, y: u };
          }
          t.SetRotation(T, c, u);
          e.SetParagraphAlignment(ConstantData.TextAlign.CENTER);
          P = { x: c, y: u };
          break;
        case ConstantData.TextAlign.CENTER:
          if (D.CenterProp) {
            M = D.CenterProp;
          }
          c = g + (m - g) * M - h + A;
          u = y + (L - y) * M - f + R;
          t.SetPos(c - d / 2 - 1, u - C / 2 - 1);
          n = c - d / 2;
          o = u - C / 2;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            if (D.CenterProp) {
              this.trect.x = h + c - this.trect.width / 2;
            }
            n = this.trect.x - h;
            e.SetPos(n, o);
            e.SetRotation(T, n + this.trect.width / 2, u);
            P = { x: n + this.trect.width / 2, y: u };
          } else {
            e.SetPos(n, o);
            e.SetRotation(T, c, u);
            P = { x: c, y: u };
          }
          t.SetRotation(T, c, u);
          e.SetParagraphAlignment(ConstantData.TextAlign.CENTER);
          P = { x: c, y: u };
          break;
        case ConstantData.TextAlign.BOTTOMCENTER:
          c = (g + m) / 2 - h;
          u = (y + L) / 2 - f;
          t.SetPos(c - d / 2 - 1, u + this.StyleRecord.Line.Thickness / 2 + 1);
          n = c - d / 2;
          o = u + this.StyleRecord.Line.Thickness / 2 + 2;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            if (D.CenterProp) {
              this.trect.x = h + c - this.trect.width / 2;
            }
            n = this.trect.x - h;
            e.SetPos(n, o);
            e.SetRotation(T, n + this.trect.width / 2, u);
            P = { x: n + this.trect.width / 2, y: u };
          } else {
            e.SetPos(c - d / 2, u + this.StyleRecord.Line.Thickness / 2 + 2);
            e.SetRotation(T, c, u);
            P = { x: c, y: u };
          }
          t.SetRotation(T, c, u);
          e.SetParagraphAlignment(ConstantData.TextAlign.CENTER);
          break;
        case ConstantData.TextAlign.TOPRIGHT:
          M = 1;
          if (D.CenterProp) { M = D.CenterProp; }
          l = (m - h) * M - (d / 2) * Math.cos(I) + A;
          S = (L - f) * M - (d / 2) * Math.sin(I) + R;
          t.SetPos(l - d / 2 - 1, S - C - this.StyleRecord.Line.Thickness / 2 - 2);
          n = l - d / 2;
          o = S - C - this.StyleRecord.Line.Thickness / 2 - 1;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            M = 1;
            if (D.CenterProp) { M = D.CenterProp; }
            n = (m - h) * M - (this.trect.width / 2) * Math.cos(I) + A;
            o = (L - f) * M - (this.trect.width / 2) * Math.sin(I) + R;
            e.SetPos(n - this.trect.width / 2, o - C);
            e.SetRotation(T, n, o);
            P = { x: n, y: o };
          } else {
            e.SetPos(l - d / 2, S - C - this.StyleRecord.Line.Thickness / 2 - 1);
            e.SetRotation(T, l, S);
            P = { x: l, y: S };
          }
          t.SetRotation(T, l, S);
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          }
          P = { x: l, y: S };
          break;
        case ConstantData.TextAlign.RIGHT:
          M = 1;
          if (D.CenterProp) { M = D.CenterProp; }
          l = (m - h) * M - (d / 2) * Math.cos(I) + A;
          S = (L - f) * M - (d / 2) * Math.sin(I) + R;
          t.SetPos(l - d / 2 - 1, S - C / 2 - 1);
          n = l - d / 2;
          o = S - C / 2;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            M = 1;
            if (D.CenterProp) { M = D.CenterProp; }
            n = (m - h) * M - (this.trect.width / 2) * Math.cos(I) + A;
            o = (L - f) * M - (this.trect.width / 2) * Math.sin(I) + R;
            e.SetPos(n - this.trect.width / 2, o - C / 2);
            e.SetRotation(T, n, o);
            P = { x: n, y: o };
          } else {
            e.SetPos(l - d / 2, S - C / 2);
            e.SetRotation(T, l, S);
            P = { x: l, y: S };
          }
          t.SetRotation(T, l, S);
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          }
          break;
        case ConstantData.TextAlign.BOTTOMRIGHT:
          l = m - h - (d / 2) * Math.cos(I);
          S = L - f - (d / 2) * Math.sin(I);
          t.SetPos(l - d / 2 - 1, S + this.StyleRecord.Line.Thickness / 2 + 1);
          n = l - d / 2;
          o = S + this.StyleRecord.Line.Thickness / 2 + 2;
          if (this.TextGrow === ConstantData.TextGrowBehavior.VERTICAL) {
            M = 1;
            if (D.CenterProp) { M = D.CenterProp; }
            n = (m - h) * M - (this.trect.width / 2) * Math.cos(I) + A;
            o = (L - f) * M - (this.trect.width / 2) * Math.sin(I) + R;
            e.SetPos(n - this.trect.width / 2, o + this.StyleRecord.Line.Thickness / 2 + 2);
            e.SetRotation(T, n, o);
            P = { x: n, y: o };
          } else {
            e.SetPos(l - d / 2, S + this.StyleRecord.Line.Thickness / 2 + 2);
            e.SetRotation(T, l, S);
            P = { x: l, y: S };
          }
          t.SetRotation(T, l, S);
          if (b) {
            e.SetParagraphAlignment(ConstantData.TextAlign.LEFT);
          } else {
            e.SetParagraphAlignment(ConstantData.TextAlign.RIGHT);
          }
          break;
      }
      this.linetrect.x = n + this.Frame.x;
      this.linetrect.y = o + this.Frame.y;
      this.linetrect.width = d;
      this.linetrect.height = C;
      P.x += this.Frame.x;
      P.y += this.Frame.y;

      // Rotate linetrect using current pivot P and angle T
      $.extend(true, {}, this.linetrect);
      this.linetrect = GlobalData.optManager.RotateRect(this.linetrect, P, T);
      var F = $.extend(true, {}, this.linetrect);
      GlobalData.optManager.TextPinFrame(this.linetrect, C);
      // Adjust linetrect back relative to Frame
      this.linetrect.x -= this.Frame.x;
      this.linetrect.y -= this.Frame.y;
      this.UpdateFrame();
    }

    if (a) {
      this.TextDirection = s;
      this.TextAlign = i;
    }

    console.log("= S.BaseLine: TextDirectionCommon output finished");
  }

  LM_AddSVGTextObject(svgDoc: any, shapeContainer: any): void {
    console.log("= S.BaseLine: LM_AddSVGTextObject - input:", { svgDoc, shapeContainer });

    // Prepare the base rectangle for text background using this.trect
    const textRect = this.trect;
    const textBackground = svgDoc.CreateShape(ConstantData.CreateShapeType.RECT);
    textBackground.SetID(ConstantData.SVGElementClass.TEXTBACKGROUND);
    textBackground.SetStrokeWidth(0);

    let fillColor = this.StyleRecord.Fill.Paint.Color;
    textBackground.SetFillColor(fillColor);
    if (this.StyleRecord.Fill.Paint.FillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
      textBackground.SetOpacity(0);
    } else {
      textBackground.SetOpacity(this.StyleRecord.Fill.Paint.Opacity);
    }

    // Create the text element
    const textElement = svgDoc.CreateShape(ConstantData.CreateShapeType.TEXT);
    textElement.SetID(ConstantData.SVGElementClass.TEXT);
    textElement.SetRenderingEnabled(false);
    textElement.SetSize(textRect.width, textRect.height);
    textElement.SetSpellCheck(this.AllowSpell());
    textElement.InitDataSettings(this.fieldDataTableID, this.fieldDataElemID);

    // Mark the container as a text container and assign the text element to it.
    shapeContainer.isText = true;
    shapeContainer.textElem = textElement;

    // Retrieve the corresponding object from the object store to get runtime text if available.
    const sourceObj = GlobalData.objectStore.GetObject(this.DataID);
    if (sourceObj.Data.runtimeText) {
      textElement.SetRuntimeText(sourceObj.Data.runtimeText);
    } else {
      textElement.SetText('');
      textElement.SetParagraphAlignment(this.TextAlign);
      textElement.SetVerticalAlignment('top');
    }
    if (!sourceObj.Data.runtimeText) {
      sourceObj.Data.runtimeText = textElement.GetRuntimeText();
    }

    // Set text constraints if not using vertical text growth.
    if (this.TextGrow !== ConstantData.TextGrowBehavior.VERTICAL) {
      textElement.SetConstraints(
        GlobalData.optManager.theContentHeader.MaxWorkDim.x,
        0,
        textRect.height
      );
    }

    // Disable hyperlinks if part of a group.
    if (this.bInGroup) {
      textElement.DisableHyperlinks(true);
    }

    textElement.SetRenderingEnabled(true);

    // Get the minimum dimensions required for the text.
    const minDimensions = textElement.GetTextMinDimensions();
    const textMinHeight = minDimensions.height;
    let verticalOffset: number = 0;

    // If text direction is active and line thickness is big enough, adjust the opacity of the background.
    if (this.TextDirection && this.StyleRecord.Line.Thickness >= textMinHeight && textBackground) {
      fillColor = this.StyleRecord.Line.Paint.Color;
      textBackground.SetOpacity(0);
    }

    // Determine vertical offset based on text alignment settings if either LineTextY or LineTextX is set.
    if (this.LineTextY || this.LineTextX) {
      const vAlign = SDF.TextAlignToWin(this.TextAlign).vjust;
      switch (vAlign) {
        case FileParser.TextJust.TA_TOP:
          verticalOffset = textRect.height / 2 - textMinHeight / 2 + this.LineTextY;
          break;
        case FileParser.TextJust.TA_BOTTOM:
          verticalOffset = -textRect.height / 2 + textMinHeight / 2 + this.LineTextY;
          break;
        default:
          verticalOffset = this.LineTextY;
      }
    }
    console.log("= S.BaseLine: LM_AddSVGTextObject - verticalOffset computed:", verticalOffset);

    // Add the background and text elements to the container.
    if (textBackground) {
      shapeContainer.AddElement(textBackground);
    }
    shapeContainer.AddElement(textElement);

    // Adjust text direction, alignment and rotation.
    this.TextDirectionCommon(textElement, textBackground, false, null);

    // Set the edit callback for the text element.
    textElement.SetEditCallback(GlobalData.optManager.TextCallback, shapeContainer);

    console.log("= S.BaseLine: LM_AddSVGTextObject - output: Text element added to shapeContainer");
  }

  LM_ResizeSVGTextObject(svgDoc: any, shapeObj: any, extraParam: any) {
    console.log("= S.BaseLine: LM_ResizeSVGTextObject called with input:", {
      svgDoc,
      shapeObj,
      extraParam
    });

    if (shapeObj.DataID !== -1) {
      const textBackground = svgDoc.GetElementByID(ConstantData.SVGElementClass.TEXTBACKGROUND);
      const textElement = svgDoc.GetElementByID(ConstantData.SVGElementClass.TEXT);

      if (textElement) {
        shapeObj.TextDirectionCommon(textElement, textBackground, false, null);
        console.log("= S.BaseLine: LM_ResizeSVGTextObject updated text direction.");
      } else {
        console.log("= S.BaseLine: LM_ResizeSVGTextObject - No text element found.");
      }
    } else {
      console.log("= S.BaseLine: LM_ResizeSVGTextObject skipped because DataID is -1.");
    }

    console.log("= S.BaseLine: LM_ResizeSVGTextObject completed.");
  }

  AdjustTextEditBackground(containerId: string, svgContainer?: any) {
    console.log("= S.BaseLine: AdjustTextEditBackground called with containerId:", containerId, "svgContainer:", svgContainer);

    if (this.DataID !== -1) {
      let container;
      if (svgContainer) {
        container = svgContainer;
      } else {
        container = GlobalData.optManager.svgObjectLayer.GetElementByID(containerId);
      }

      const textBackground = container.GetElementByID(ConstantData.SVGElementClass.TEXTBACKGROUND);
      const textElement = container.GetElementByID(ConstantData.SVGElementClass.TEXT);

      if (textElement) {
        const useDefault = (svgContainer == null);
        this.TextDirectionCommon(textElement, textBackground, useDefault, null);
        console.log("= S.BaseLine: AdjustTextEditBackground - TextDirectionCommon updated text direction for text element.");
      } else {
        console.log("= S.BaseLine: AdjustTextEditBackground - No text element found in container.");
      }
    } else {
      console.log("= S.BaseLine: AdjustTextEditBackground - DataID is -1, skipping update.");
    }

    console.log("= S.BaseLine: AdjustTextEditBackground completed");
  }

  AddCorner(e, t) {
  }

  SVGTokenizerHook(style: any): any {
    console.log("= S.BaseLine: SVGTokenizerHook input:", style);

    if (GlobalData.optManager.bTokenizeStyle) {
      // Create a deep copy of the style object to avoid side effects
      style = Utils1.DeepCopy(style);

      // Replace fill color with a placeholder for solid fill
      style.Fill.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.SolidFill,
        style.Fill.Paint.Color
      );

      // Replace line paint color with a placeholder for line color
      style.Line.Paint.Color = Basic.Symbol.CreatePlaceholder(
        Basic.Symbol.Placeholder.LineColor,
        style.Line.Paint.Color
      );

      // If both StartArrowID and EndArrowID are zero, replace line thickness with a placeholder
      if (this.StartArrowID === 0 && this.EndArrowID === 0) {
        style.Line.Thickness = Basic.Symbol.CreatePlaceholder(
          Basic.Symbol.Placeholder.LineThick,
          style.Line.Thickness
        );
      }
    }

    console.log("= S.BaseLine: SVGTokenizerHook output:", style);
    return style;
  }

  GetDimensionPoints() {
    console.log("= S.BaseLine: GetDimensionPoints input: none");
    const dimensionPoints: Point[] = [];
    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    dimensionPoints.push(
      new Point(
        this.StartPoint.x - boundingRect.x,
        this.StartPoint.y - boundingRect.y
      )
    );
    dimensionPoints.push(
      new Point(
        this.EndPoint.x - boundingRect.x,
        this.EndPoint.y - boundingRect.y
      )
    );

    console.log("= S.BaseLine: GetDimensionPoints output:", dimensionPoints);
    return dimensionPoints;
  }

  PostCreateShapeCallback(
    svgDoc: any,
    shapeContainer: any,
    forceUpdate: boolean,
    extraParam: any
  ): void {
    console.log('= S.BaseLine: PostCreateShapeCallback - input:', {
      svgDoc,
      shapeContainer,
      forceUpdate,
      extraParam
    });

    const shapeElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) {
      startArrow = null;
    }
    if (endArrow.id === 0) {
      endArrow = null;
    }

    if (startArrow || endArrow) {
      shapeElement.SetArrowheads(
        startArrow,
        arrowSize,
        endArrow,
        arrowSize,
        this.StartArrowDisp,
        this.EndArrowDisp
      );
      slopElement.SetArrowheads(
        startArrow,
        arrowSize,
        endArrow,
        arrowSize,
        this.StartArrowDisp,
        this.EndArrowDisp
      );
    }

    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, shapeContainer);
    }

    this.UpdateDimensionLines(shapeContainer, null);
    this.UpdateCoordinateLines(shapeContainer, null);

    console.log('= S.BaseLine: PostCreateShapeCallback - output completed');
  }

  CreateActionTriggers(svgDoc: any, triggerId: any, paramA: any, paramR: any) {
    console.log("= S.BaseLine: CreateActionTriggers called with input:", { svgDoc, triggerId, paramA, paramR });

    let isEditable: boolean = true;
    let theKnob: any;
    let groupElement = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP);
    const knobSizeDefault = ConstantData.Defines.SED_KnobSize;
    const rKnobSizeDefault = ConstantData.Defines.SED_RKnobSize;

    // Check if using wall tool and adding walls
    if (
      !(
        this instanceof Line &&
        this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
        (
          (GlobalData.gBusinessManager &&
            GlobalData.gBusinessManager.IsAddingWalls &&
            GlobalData.gBusinessManager.IsAddingWalls()) ||
          ConstantData.DocumentContext.UsingWallTool
        )
      )
    ) {
      let scale = svgDoc.docInfo.docToScreenScale;
      if (svgDoc.docInfo.docScale <= 0.5) {
        scale *= 2;
      }
      let scaledKnobSize = knobSizeDefault / scale;
      let scaledRKnobSize = rKnobSizeDefault / scale;
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        scaledKnobSize *= 2;
      }
      const frameRect = this.Frame;
      let widthWithKnob = frameRect.width + scaledKnobSize;
      let heightWithKnob = frameRect.height + scaledKnobSize;
      let adjustedFrame = $.extend(true, {}, frameRect);
      adjustedFrame.x -= scaledKnobSize / 2;
      adjustedFrame.y -= scaledKnobSize / 2;
      adjustedFrame.width += scaledKnobSize;
      adjustedFrame.height += scaledKnobSize;

      // Create base knob parameters for LINESTART trigger
      let knobParams: any = {
        svgDoc: svgDoc,
        shapeType: ConstantData.CreateShapeType.RECT,
        knobSize: scaledKnobSize,
        fillColor: "black",
        fillOpacity: 1,
        strokeSize: 1,
        strokeColor: "#777777",
        cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
        locked: false
      };

      // If triggerId is not equal to paramR then change properties for switch trigger
      if (triggerId != paramR) {
        knobParams.fillColor = "white";
        knobParams.strokeSize = 1;
        knobParams.strokeColor = "black";
        knobParams.fillOpacity = 0;
      }

      // Apply lock or no-grow settings
      if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
        knobParams.fillColor = "gray";
        knobParams.locked = true;
      } else if (this.NoGrow()) {
        knobParams.fillColor = "red";
        knobParams.strokeColor = "red";
        knobParams.cursorType = Element.CursorType.DEFAULT;
      }

      // Set position for LINESTART knob relative to frame
      knobParams.x = this.StartPoint.x - this.Frame.x;
      knobParams.y = this.StartPoint.y - this.Frame.y;
      knobParams.knobID = ConstantData.ActionTriggerType.LINESTART;

      // Check the object pointed by triggerId for hooks at SED_KTL if available
      let objectPtr = GlobalData.optManager.GetObjectPtr(triggerId, false);
      if (objectPtr && objectPtr.hooks) {
        for (let h = 0; h < objectPtr.hooks.length; h++) {
          if (objectPtr.hooks[h].hookpt === ConstantData.HookPts.SED_KTL) {
            knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
            isEditable = false;
            break;
          }
        }
      }

      // For floorplan wall objects override shape if necessary
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        knobParams.shapeType = ConstantData.CreateShapeType.IMAGE;
      }
      theKnob = this.GenericKnob(knobParams);
      if (
        this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
        theKnob.SetURL
      ) {
        theKnob.SetURL(
          knobParams.cursorType === Element.CursorType.NWSE_RESIZE
            ? ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag1
            : ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag2
        );
        theKnob.ExcludeFromExport(true);
      }
      groupElement.AddElement(theKnob);

      // Process the LINEEND knob for the other end.
      knobParams.shapeType = ConstantData.CreateShapeType.RECT;
      if (objectPtr && objectPtr.hooks) {
        for (let h = 0; h < objectPtr.hooks.length; h++) {
          if (objectPtr.hooks[h].hookpt === ConstantData.HookPts.SED_KTR) {
            knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
            isEditable = false;
            break;
          }
        }
      }
      knobParams.x = this.EndPoint.x - this.Frame.x;
      knobParams.y = this.EndPoint.y - this.Frame.y;
      knobParams.knobID = ConstantData.ActionTriggerType.LINEEND;
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        knobParams.shapeType = ConstantData.CreateShapeType.IMAGE;
      }
      theKnob = this.GenericKnob(knobParams);
      if (
        this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
        theKnob.SetURL
      ) {
        theKnob.SetURL(
          knobParams.cursorType === Element.CursorType.NWSE_RESIZE
            ? ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag1
            : ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag2
        );
        theKnob.ExcludeFromExport(true);
      }
      groupElement.AddElement(theKnob);

      // Add the ROTATE knob if applicable.
      if (GlobalData.optManager.bTouchInitiated) {
        isEditable = false;
      }
      if (isEditable && !knobParams.locked && !this.NoGrow()) {
        knobParams.shapeType = ConstantData.CreateShapeType.OVAL;
        let angleRadians = Math.atan((this.EndPoint.y - this.StartPoint.y) / (this.EndPoint.x - this.StartPoint.x));
        if (angleRadians < 0) {
          angleRadians *= -1;
        }
        if (this.EndPoint.x >= this.StartPoint.x) {
          knobParams.x = this.EndPoint.x - 3 * scaledRKnobSize * Math.cos(angleRadians) - this.Frame.x + scaledKnobSize / 2 - scaledRKnobSize / 2;
        } else {
          knobParams.x = this.EndPoint.x + 3 * scaledRKnobSize * Math.cos(angleRadians) - this.Frame.x + scaledKnobSize / 2 - scaledRKnobSize / 2;
        }
        if (this.EndPoint.y >= this.StartPoint.y) {
          knobParams.y = this.EndPoint.y - 3 * scaledRKnobSize * Math.sin(angleRadians) - this.Frame.y + scaledKnobSize / 2 - scaledRKnobSize / 2;
        } else {
          knobParams.y = this.EndPoint.y + 3 * scaledRKnobSize * Math.sin(angleRadians) - this.Frame.y + scaledKnobSize / 2 - scaledRKnobSize / 2;
        }
        knobParams.cursorType = Element.CursorType.ROTATE;
        knobParams.knobID = ConstantData.ActionTriggerType.ROTATE;
        knobParams.fillColor = "white";
        knobParams.fillOpacity = 0.001;
        knobParams.strokeSize = 2.5;
        knobParams.knobSize = scaledRKnobSize;
        knobParams.strokeColor = "white";

        theKnob = this.GenericKnob(knobParams);
        groupElement.AddElement(theKnob);

        knobParams.strokeSize = 1;
        knobParams.strokeColor = "black";
        theKnob = this.GenericKnob(knobParams);
        groupElement.AddElement(theKnob);

        // Restore knobSize to default for further triggers if needed
        knobParams.knobSize = scaledKnobSize;
      }

      // Create dimension adjustment knobs if needed
      if (
        this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff &&
        this.CanUseStandOffDimensionLines()
      ) {
        let currentSVGElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
        this.CreateDimensionAdjustmentKnobs(groupElement, currentSVGElement, knobParams);
      }

      groupElement.SetSize(widthWithKnob, heightWithKnob);
      groupElement.SetPos(adjustedFrame.x, adjustedFrame.y);
      groupElement.isShape = true;
      groupElement.SetID(ConstantData.Defines.Action + triggerId);

      console.log("= S.BaseLine: CreateActionTriggers output:", groupElement);
      return groupElement;
    }
  }

  CalcCursorForSegment(startPoint: any, endPoint: any, useAlternateCursor: boolean) {
    console.log("= S.BaseLine: CalcCursorForSegment called with input:", {
      startPoint,
      endPoint,
      useAlternateCursor
    });

    const angleInDegrees = Utils1.CalcAngleFromPoints(startPoint, endPoint);
    console.log("= S.BaseLine: CalcCursorForSegment angleInDegrees:", angleInDegrees);

    const cursorType = this.CalcCursorForAngle(angleInDegrees, useAlternateCursor);
    console.log("= S.BaseLine: CalcCursorForSegment output:", cursorType);

    return cursorType;
  }

  NoRotate(): boolean {
    console.log("= S.BaseLine: NoRotate called with input: none");
    const result = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR
      || this.hooks.length > 1;
    console.log("= S.BaseLine: NoRotate output:", result);
    return result;
  }

  SetRuntimeEffects(effectSettings: any): void {
    console.log("= S.BaseLine: SetRuntimeEffects called with input:", effectSettings);

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    if (svgElement) {
      this.ApplyEffects(svgElement, effectSettings, true);
      console.log("= S.BaseLine: SetRuntimeEffects output: Effects applied to svgElement:", svgElement);
    } else {
      console.log("= S.BaseLine: SetRuntimeEffects output: No element found for BlockID:", this.BlockID);
    }
  }

  ApplyStyles(shapeElement: any, styleRecord: any) {
    console.log("= S.BaseLine: ApplyStyles input:", { shapeElement, styleRecord });

    let fillType = styleRecord.Fill.Paint.FillType;
    let lineType = styleRecord.Line.Paint.FillType;
    let hasImage = this.ImageURL !== '';

    if (this.polylist && this.polylist.closed) {
      if (hasImage) {
        let fillMode = 'PROPFILL';
        let cropRect = { x: 0, y: 0, width: 0, height: 0 };

        if (this.ImageHeader) {
          if (this.ImageHeader.croprect) {
            cropRect.x = this.ImageHeader.croprect.left;
            cropRect.y = this.ImageHeader.croprect.top;
            cropRect.width = this.ImageHeader.croprect.right - this.ImageHeader.croprect.left;
            cropRect.height = this.ImageHeader.croprect.bottom - this.ImageHeader.croprect.top;
          }
          if (this.ImageHeader.imageflags !== undefined &&
            this.ImageHeader.imageflags === ConstantData.ImageScales.SDIMAGE_ALWAYS_FIT) {
            fillMode = 'NOPROP';
          }
        }

        shapeElement.SetImageFill(this.ImageURL, {
          scaleType: fillMode,
          cropRect: cropRect
        });
        shapeElement.SetFillOpacity(styleRecord.Fill.Paint.Opacity);

      } else if (fillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
        shapeElement.SetGradientFill(
          this.CreateGradientRecord(
            styleRecord.Fill.Paint.GradientFlags,
            styleRecord.Fill.Paint.Color,
            styleRecord.Fill.Paint.Opacity,
            styleRecord.Fill.Paint.EndColor,
            styleRecord.Fill.Paint.EndOpacity
          )
        );
      } else if (fillType === ConstantData.FillTypes.SDFILL_RICHGRADIENT) {
        shapeElement.SetGradientFill(
          this.CreateRichGradientRecord(styleRecord.Fill.Paint.GradientFlags)
        );
      } else if (fillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
        let textureConfig = {
          url: '',
          scale: 1,
          alignment: styleRecord.Fill.Paint.TextureScale.AlignmentScalar
        };
        let textureIndex = styleRecord.Fill.Paint.Texture;
        if (GlobalData.optManager.TextureList.Textures[textureIndex]) {
          textureConfig.dim = GlobalData.optManager.TextureList.Textures[textureIndex].dim;
          textureConfig.url = GlobalData.optManager.TextureList.Textures[textureIndex].ImageURL;
          textureConfig.scale = GlobalData.optManager.CalcTextureScale(
            styleRecord.Fill.Paint.TextureScale,
            textureConfig.dim.x
          );
          styleRecord.Fill.Paint.TextureScale.Scale = textureConfig.scale;
          if (!textureConfig.url) {
            textureConfig.url = Constants.FilePath_CMSRoot +
              Constants.FilePath_Textures +
              GlobalData.optManager.TextureList.Textures[textureIndex].filename;
          }
          shapeElement.SetTextureFill(textureConfig);
          shapeElement.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
        }
      } else if (fillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
        shapeElement.SetFillColor('none');
      } else {
        shapeElement.SetFillColor(styleRecord.Fill.Paint.Color);
        shapeElement.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      }
    }

    if (lineType === ConstantData.FillTypes.SDFILL_GRADIENT) {
      shapeElement.SetGradientStroke(
        this.CreateGradientRecord(
          styleRecord.Line.Paint.GradientFlags,
          styleRecord.Line.Paint.Color,
          styleRecord.Line.Paint.Opacity,
          styleRecord.Line.Paint.EndColor,
          styleRecord.Line.Paint.EndOpacity
        )
      );
    } else if (lineType === ConstantData.FillTypes.SDFILL_RICHGRADIENT) {
      shapeElement.SetGradientStroke(
        this.CreateRichGradientRecord(styleRecord.Line.Paint.GradientFlags)
      );
    } else if (lineType === ConstantData.FillTypes.SDFILL_TEXTURE) {
      let textureConfig = {
        url: '',
        scale: styleRecord.Line.Paint.TextureScale.Scale,
        alignment: styleRecord.Line.Paint.TextureScale.AlignmentScalar
      };
      let textureIndex = styleRecord.Line.Paint.Texture;
      textureConfig.dim = GlobalData.optManager.TextureList.Textures[textureIndex].dim;
      textureConfig.url = GlobalData.optManager.TextureList.Textures[textureIndex].ImageURL;
      if (!textureConfig.url) {
        textureConfig.url = Constants.FilePath_CMSRoot +
          Constants.FilePath_Textures +
          GlobalData.optManager.TextureList.Textures[textureIndex].filename;
      }
      shapeElement.SetTextureStroke(textureConfig);
      shapeElement.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);
    } else if (lineType === ConstantData.FillTypes.SDFILL_SOLID) {
      shapeElement.SetStrokeColor(styleRecord.Line.Paint.Color);
      shapeElement.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);
    } else {
      shapeElement.SetStrokeColor('none');
    }

    console.log("= S.BaseLine: ApplyStyles output");
  }

  CalcLineHops(shapeObj: any, extraParam: any) {
    console.log("= S.BaseLine: CalcLineHops input:", { shapeObj, extraParam });

    let polyPoints = this.GetPolyPoints(
      ConstantData.Defines.NPOLYPTS,
      false,
      false,
      false,
      null
    );
    let polyLength = polyPoints.length;

    let shapePoints = shapeObj.GetPolyPoints(
      ConstantData.Defines.NPOLYPTS,
      false,
      false,
      false,
      null
    );
    let shapeLength = shapePoints.length;

    for (let indexA = 0; indexA < polyLength; ++indexA) {
      if (this.hoplist.nhops > ConstantData.Defines.SDMAXHOPS) {
        console.log("= S.BaseLine: CalcLineHops output: max hops reached");
        return;
      }

      let startPoint, endPoint;
      if (indexA > 0) {
        startPoint = polyPoints[indexA - 1];
        endPoint = polyPoints[indexA];
      } else {
        startPoint = polyPoints[indexA];
        endPoint = polyPoints[indexA + 1];
        indexA++;
      }

      let hopResult = this.AddHopPoint(
        startPoint,
        endPoint,
        shapePoints,
        shapeLength,
        indexA,
        extraParam
      );
      if (hopResult == null) {
        console.log("= S.BaseLine: CalcLineHops output: no hopResult");
        break;
      }

      if (hopResult.bSuccess) {
        let tempIndex = hopResult.tindex;
        if (tempIndex >= 1 && shapeLength > 2) {
          shapePoints = shapePoints.slice(tempIndex);
          shapeLength -= tempIndex;
          hopResult = this.AddHopPoint(
            startPoint,
            endPoint,
            shapePoints,
            shapeLength,
            indexA,
            extraParam
          );
          if (!hopResult) break;
          tempIndex = hopResult.tindex;
        }

        if (tempIndex < shapeLength - 1) {
          shapePoints = shapePoints.slice(tempIndex);
          shapeLength -= tempIndex;
          hopResult = this.AddHopPoint(
            startPoint,
            endPoint,
            shapePoints,
            shapeLength,
            indexA,
            extraParam
          );
          if (!hopResult) break;
        }
      }
    }

    console.log("= S.BaseLine: CalcLineHops output: completed");
  }

  DebugLineHops(svgDoc: any) {
    console.log("= S.BaseLine: DebugLineHops input:", { svgDoc });

    const hopCount = this.hoplist.nhops;
    let currentHop = null;
    let inConsLine = false;
    const sedSessionObject = GlobalData.optManager.GetObjectPtr(
      GlobalData.optManager.theSEDSessionBlockID,
      false
    );

    if ((sedSessionObject.flags & ConstantData.SessionFlags.SEDS_AllowHops) !== 0) {
      let defaultRadius = sedSessionObject.hopdim.x;
      let sumX = 0;
      let sumY = 0;
      let consCount = 0;

      for (let hopIndex = 0; hopIndex < hopCount; ++hopIndex) {
        currentHop = this.hoplist.hops[hopIndex];
        if (currentHop.cons) {
          inConsLine = true;
          consCount++;
          sumX += currentHop.pt.x;
          sumY += currentHop.pt.y;
        } else {
          let color = "red";
          let radius = defaultRadius;
          if (inConsLine) {
            color = "green";
            radius = 3 * sedSessionObject.hopdim.x;
            consCount++;
            sumX += currentHop.pt.x;
            sumY += currentHop.pt.y;
            sumX /= consCount;
            sumY /= consCount;
            inConsLine = false;
          } else {
            sumX = currentHop.pt.x;
            sumY = currentHop.pt.y;
          }

          const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
          const knobParams = {
            svgDoc: svgDoc,
            shapeType: ConstantData.CreateShapeType.OVAL,
            x: boundingRect.x + (sumX - radius / 2),
            y: boundingRect.y + (sumY - radius / 2),
            knobSize: radius,
            fillColor: "none",
            fillOpacity: 1,
            strokeSize: 1,
            strokeColor: color,
            KnobID: 0,
            cursorType: Element.CursorType.CROSSHAIR
          };

          const newKnob = this.GenericKnob(knobParams);
          newKnob.SetID("hoptarget");
          GlobalData.optManager.svgOverlayLayer.AddElement(newKnob);

          sumX = 0;
          sumY = 0;
          consCount = 0;
        }
      }
    }

    console.log("= S.BaseLine: DebugLineHops output: completed");
  }

  AddHopPoint(
    startPoint: any,
    endPoint: any,
    pointArray: any[],
    totalPoints: number,
    segmentIndex: number,
    extraData: any
  ) {
    console.log("= S.BaseLine: AddHopPoint input:", {
      startPoint,
      endPoint,
      pointArray,
      totalPoints,
      segmentIndex,
      extraData
    });

    if (this.hoplist.nhops > ConstantData.Defines.SDMAXHOPS) {
      console.log("= S.BaseLine: AddHopPoint output: Max hops exceeded");
      return { bSuccess: false, tindex: -1 };
    }

    let offset = 0;
    let iterationCount = 0;
    const fullPoints = pointArray;
    pointArray = fullPoints.slice(offset);

    let intersection = GlobalData.optManager.PolyLIntersect(
      startPoint,
      endPoint,
      pointArray,
      totalPoints
    );
    let ipt = intersection.ipt;
    let lpseg = intersection.lpseg;

    while (intersection.bSuccess) {
      let startRect = Utils2.Pt2Rect(startPoint, endPoint);
      Utils2.InflateRect(startRect, 2, 2);

      if (
        ipt.x >= startRect.x &&
        ipt.x <= startRect.x + startRect.width &&
        ipt.y >= startRect.y &&
        ipt.y <= startRect.y + startRect.height
      ) {
        lpseg += offset;
        let dx = ipt.x - endPoint.x;
        let dy = ipt.y - endPoint.y;

        const hopInfo = {
          segment: segmentIndex,
          index: extraData,
          pt: ipt,
          dist: Utils2.sqrt(dx * dx + dy * dy),
          cons: false
        };

        this.hoplist.hops.push(hopInfo);
        this.hoplist.nhops++;

        console.log("= S.BaseLine: AddHopPoint output:", {
          bSuccess: true,
          tindex: lpseg
        });
        return { bSuccess: true, tindex: lpseg };
      }

      offset += lpseg;
      if (offset > totalPoints - 1) {
        break;
      }

      iterationCount++;
      if (iterationCount > totalPoints) {
        break;
      }

      pointArray = fullPoints.slice(offset);
      totalPoints = pointArray.length;

      intersection = GlobalData.optManager.PolyLIntersect(
        startPoint,
        endPoint,
        pointArray,
        totalPoints
      );
      lpseg = intersection.lpseg;
      ipt = intersection.ipt;
    }

    console.log("= S.BaseLine: AddHopPoint output:", {
      bSuccess: false,
      tindex: lpseg
    });
    return { bSuccess: false, tindex: lpseg };
  }

  SetObjectStyle(e) {
    console.log("= S.BaseLine: SetObjectStyle input:", e);

    // Deep copy the input style object
    let style = Utils1.DeepCopy(e);
    let reverseArrows = false;

    // If not a segline and segl exists, remove it
    if (this.LineType !== ConstantData.LineType.SEGLINE && style.segl != null) {
      delete style.segl;
    }

    // Process arrowhead properties if either EndArrowID or StartArrowID exists
    if (!(e.EndArrowID == null && e.StartArrowID == null)) {
      // Determine if arrows need to be reversed based on the start and end points
      if (this.StartPoint.x < this.EndPoint.x) {
        reverseArrows = false;
      } else if (this.StartPoint.x > this.EndPoint.x || this.StartPoint.y > this.EndPoint.y) {
        reverseArrows = true;
      }

      if (reverseArrows) {
        style.EndArrowID = this.EndArrowID;
        style.StartArrowID = this.StartArrowID;
        style.EndArrowDisp = this.EndArrowDisp;
        style.StartArrowDisp = this.StartArrowDisp;

        if (e.EndArrowID != null) {
          style.StartArrowID = e.EndArrowID;
          style.StartArrowDisp = e.EndArrowDisp;
        }
        if (e.StartArrowID != null) {
          style.EndArrowID = e.StartArrowID;
          style.EndArrowDisp = e.StartArrowDisp;
        }
      }
    }

    // If polylist is not closed and Hatch is defined, set Hatch to 0
    if (!(this.polylist && this.polylist.closed) &&
      style && style.StyleRecord && style.StyleRecord.Fill && style.StyleRecord.Fill.Hatch) {
      style.StyleRecord.Fill.Hatch = 0;
    }

    // For Gantt bar objects, transfer the line thickness from the current style
    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR &&
      style.StyleRecord && style.StyleRecord.Name &&
      style.StyleRecord.Line && style.StyleRecord.Line.Thickness) {
      style.StyleRecord.Line.Thickness = this.StyleRecord.Line.Thickness;
    }

    // Call the base class SetObjectStyle method
    let result = super.SetObjectStyle(style);

    // If there's a fill record in the style, clear the ImageURL
    if (result.StyleRecord && result.StyleRecord.Fill) {
      this.ImageURL = '';
    }

    console.log("= S.BaseLine: SetObjectStyle output:", result);
    return result;
  }

  GetArrowheadSelection(e: any): boolean {
    console.log("= S.BaseLine: GetArrowheadSelection called with input:", e);

    if (e) {
      // Determine whether to reverse arrowheads based on the current object's geometry.
      const shouldReverse = (function determineReverse(obj: any): boolean {
        // Calculate the horizontal difference.
        const deltaX = Math.abs(obj.EndPoint.x - obj.StartPoint.x);
        console.log("= S.BaseLine: determineReverse - deltaX:", deltaX);

        // If the horizontal difference is almost zero, decide based on vertical ordering.
        if (deltaX < 0.01) {
          const reverse = obj.EndPoint.y < obj.StartPoint.y;
          console.log("= S.BaseLine: determineReverse - vertical comparison; reverse =", reverse);
          return reverse;
        }

        // Otherwise, compute a rectangle from EndPoint and StartPoint.
        const rect = Utils2.Pt2Rect(obj.EndPoint, obj.StartPoint);
        console.log("= S.BaseLine: determineReverse - computed rect:", rect);

        const condition1 =
          Math.abs(obj.EndPoint.x - rect.x) < 0.01 &&
          Math.abs(obj.EndPoint.y - rect.y) < 0.01;
        const condition2 =
          Math.abs(obj.EndPoint.x - rect.x) < 0.01 &&
          Math.abs(obj.EndPoint.y - (rect.y + rect.height)) < 0.01;

        console.log("= S.BaseLine: determineReverse - condition1:", condition1, ", condition2:", condition2);
        return condition1 || condition2;
      })(this);

      console.log("= S.BaseLine: GetArrowheadSelection - shouldReverse:", shouldReverse);

      if (shouldReverse) {
        // Reverse the start and end arrowhead values.
        e.StartArrowID = this.EndArrowID;
        e.StartArrowDisp = this.EndArrowDisp;
        e.EndArrowID = this.StartArrowID;
        e.EndArrowDisp = this.StartArrowDisp;
        console.log("= S.BaseLine: GetArrowheadSelection - Reversed arrowhead values.");
      } else {
        // Retain the original arrowhead values.
        e.StartArrowID = this.StartArrowID;
        e.StartArrowDisp = this.StartArrowDisp;
        e.EndArrowID = this.EndArrowID;
        e.EndArrowDisp = this.EndArrowDisp;
        console.log("= S.BaseLine: GetArrowheadSelection - Retained original arrowhead values.");
      }

      // Always copy the arrow size index.
      e.ArrowSizeIndex = this.ArrowSizeIndex;
      console.log("= S.BaseLine: GetArrowheadSelection - ArrowSizeIndex set to:", this.ArrowSizeIndex);
    }

    console.log("= S.BaseLine: GetArrowheadSelection output:", e);
    return true;
  }

  UpdateDimensionFromTextObj(inputObj: any, options: any): void {
    console.log("= S.BaseLine: UpdateDimensionFromTextObj called with input:", { inputObj, options });

    // Preserve the block before updating dimensions
    GlobalData.objectStore.PreserveBlock(this.BlockID);

    // Hide the SVG selection state for this block
    GlobalData.optManager.ShowSVGSelectionState(this.BlockID, false);

    // Get the SVG element associated with this BlockID
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Retrieve text and user data either from options or from the input object
    let textValue: string;
    let userData: any;
    if (options) {
      textValue = options.text;
      userData = options.userData;
    } else {
      textValue = inputObj.GetText();
      userData = inputObj.GetUserData();
    }

    // Update the dimensions from the extracted text
    this.UpdateDimensionFromText(svgElement, textValue, userData);

    // Mark this block for link update
    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

    // For each hook attached to the object, mark its link flag too
    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    // If any additional text-related properties are present, add the block to the dirty list
    if (
      this.HyperlinkText !== "" ||
      this.NoteID !== -1 ||
      this.CommentID !== -1 ||
      this.HasFieldData()
    ) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
    }

    // Complete any pending operations
    GlobalData.optManager.CompleteOperation(null);

    // If the frame is partially offscreen, scroll the object into view
    if (this.Frame.x < 0 || this.Frame.y < 0) {
      GlobalData.optManager.ScrollObjectIntoView(this.BlockID, false);
    }

    console.log("= S.BaseLine: UpdateDimensionFromTextObj completed for BlockID:", this.BlockID);
  }

  UpdateDimensionFromText(svgElement: any, textStr: string, opts: any) {
    console.log("= S.BaseLine: UpdateDimensionFromText - input:", { svgElement, textStr, opts });

    let dimensionValue: number;
    let segment: any;
    let i: number; // loop index for hooks
    let dimensionLength: number = -1;

    // If options indicate that the object is hooked, delegate to the hooked object updater
    if (opts.hookedObjectInfo) {
      console.log("= S.BaseLine: UpdateDimensionFromText - detected hookedObjectInfo, delegating update to UpdateDimensionsFromTextForHookedObject");
      return this.UpdateDimensionsFromTextForHookedObject(svgElement, textStr, opts);
    }

    // Retrieve the segment from options and calculate the dimension value
    segment = opts.segment;
    dimensionValue = this.GetDimensionValueFromString(textStr, segment);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    if (dimensionLength < 0) {
      console.log("= S.BaseLine: UpdateDimensionFromText - calculated dimensionLength is invalid (<0). Marking dirty and rendering.");
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
      return;
    }

    // Update the dimensions with the computed length
    this.UpdateDimensions(dimensionLength, null, null);
    GlobalData.optManager.SetLinkFlag(
      this.BlockID,
      ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
    );

    // Update link flags for all attached hooks
    for (i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(
        this.hooks[i].objid,
        ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE
      );
    }

    GlobalData.optManager.UpdateLinks();

    // If the current displayed dimensions match the calculated length, update runtime flags
    if (this.GetDimensionsForDisplay().width === dimensionLength) {
      this.rwd = dimensionValue;
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, true);
    }

    // Update the dimension lines reflecting the new dimensions
    this.UpdateDimensionLines(svgElement);

    console.log("= S.BaseLine: UpdateDimensionFromText - output: dimension updated with length", dimensionLength);
  }

  UpdateSecondaryDimensions(shapeContainer: any, creator: any, forceFlag: boolean): void {
    console.log("= S.BaseLine: UpdateSecondaryDimensions called with input:", { shapeContainer, creator, forceFlag });

    const isWall = this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;
    const isHideHookedDim = !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions);
    const isShowAlways = (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always) ||
      (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) || forceFlag;

    console.log("= S.BaseLine: UpdateSecondaryDimensions computed flags:", { isWall, isHideHookedDim, isShowAlways });

    if (isWall && isHideHookedDim && isShowAlways) {
      this.UpdateHookedObjectDimensionLines(shapeContainer, creator, forceFlag);
    }

    console.log("= S.BaseLine: UpdateSecondaryDimensions completed.");
  }



  GetBoundingBoxesForSecondaryDimensions() {
    console.log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions called, input: none");

    // Retrieve hooked object dimension info
    let hookedInfo = this.GetHookedObjectDimensionInfo();
    let boundingBoxes = [];

    // Check if object is a floorplan wall, dimensions should not be hidden,
    // and all segments are enabled.
    if (
      this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL &&
      !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions) &&
      (this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg)
    ) {
      for (let index = 0, count = hookedInfo.length; index < count; index++) {
        let dimensionInfo = hookedInfo[index];

        // Skip if start and end points are equal
        if (Utils2.EqualPt(dimensionInfo.start, dimensionInfo.end)) {
          continue;
        }

        // Calculate the angle between start and end points
        let angle = Utils1.CalcAngleFromPoints(dimensionInfo.start, dimensionInfo.end);
        // Get the text representation for the dimension
        let dimensionText = this.GetDimensionTextForPoints(dimensionInfo.start, dimensionInfo.end);
        // Retrieve left, right and text frame points for the dimension
        let dimensionPoints = this.GetPointsForDimension(
          angle,
          dimensionText,
          dimensionInfo.start,
          dimensionInfo.end,
          dimensionInfo.segment,
          true
        );

        if (dimensionPoints) {
          boundingBoxes.push(dimensionPoints.left);
          boundingBoxes.push(dimensionPoints.right);
          boundingBoxes.push(dimensionPoints.textFrame);
        }
      }
    }

    console.log("= S.BaseLine: GetBoundingBoxesForSecondaryDimensions output:", boundingBoxes);
    return boundingBoxes;
  }

  AddIcon(e, container, iconPosition) {
    console.log("= S.BaseLine: AddIcon called with input:", { e, container, iconPosition });

    let targetX, targetY;
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const len = polyPoints.length;

    if (this.DataID >= 0) {
      if (len === 2) {
        targetX = polyPoints[1].x;
        targetY = polyPoints[1].y;
      } else if (len === 3) {
        targetX = polyPoints[2].x;
        targetY = polyPoints[2].y;
      } else {
        targetX = polyPoints[len - 1].x;
        targetY = polyPoints[len - 1].y;
      }

      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        targetX -= this.iconSize;
        iconPosition.y = targetY - 2 * this.iconSize;
      } else {
        // For segmented lines
        targetX -= this.iconSize;
        iconPosition.y = targetY - 2 * this.iconSize;
      }
      iconPosition.x = targetX - this.iconSize * this.nIcons;
    } else {
      if (len === 2) {
        targetX = (polyPoints[0].x + polyPoints[1].x) / 2;
        targetY = (polyPoints[0].y + polyPoints[1].y) / 2;
      } else if (len === 3) {
        targetX = polyPoints[1].x;
        targetY = polyPoints[1].y;
      } else {
        const midIndex = Math.floor(len / 2);
        targetX = polyPoints[midIndex].x;
        targetY = polyPoints[midIndex].y;
      }

      if (this instanceof Instance.Shape.Line) {
        if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
          iconPosition.y = targetY - (this.StyleRecord.Line.Thickness / 2 + this.iconSize / 8);
        } else {
          targetX += this.iconSize / 2;
          iconPosition.y = targetY + this.iconSize / 4;
        }
      } else if (this instanceof Instance.Shape.ArcLine) {
        targetX += this.iconSize / 2;
        iconPosition.y = targetY + this.iconSize / 2;
      } else if (this instanceof Instance.Shape.SegmentedLine) {
        iconPosition.y = targetY + this.iconSize / 2;
      } else {
        iconPosition.y = targetY - this.iconSize / 2;
      }
      iconPosition.x = targetX - this.iconSize * this.nIcons;
    }

    const iconElement = this.GenericIcon(iconPosition);
    this.nIcons++;
    container.AddElement(iconElement);
    console.log("= S.BaseLine: AddIcon output:", iconElement);
    return iconElement;
  }

  GetNotePos(e: any, t: any): { x: number; y: number } {
    console.log("= S.BaseLine: GetNotePos called with input:", { e, t });

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true);
    const numPoints = polyPoints.length;
    let posX: number, posY: number;
    let adjustedPos: { x?: number; y?: number } = {};
    let svgFrame: { x: number; y: number; width: number; height: number };

    if (this.DataID >= 0) {
      // Determine base position based on the number of poly points
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

      // Adjust based on object type: for Line or ArcLine, use specific offset
      if (this instanceof Instance.Shape.Line || this instanceof Instance.Shape.ArcLine) {
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      } else {
        // For segmented lines or others, use same adjustment
        posX -= this.iconSize;
        adjustedPos.y = posY - 2 * this.iconSize;
      }

      adjustedPos.x = posX - this.iconSize * this.nIcons;
      if (this.nIcons === 1) {
        adjustedPos.x += 2 * this.iconSize;
      }

      svgFrame = this.GetSVGFrame();
      const result = {
        x: svgFrame.x + (adjustedPos.x as number),
        y: svgFrame.y + (adjustedPos.y as number) + this.iconSize
      };
      console.log("= S.BaseLine: GetNotePos output:", result);
      return result;
    } else {
      // When DataID is not valid, use alternative positioning
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
        x: svgFrame.x + (adjustedPos.x as number),
        y: svgFrame.y + (adjustedPos.y as number) + this.iconSize
      };
      console.log("= S.BaseLine: GetNotePos output:", result);
      return result;
    }
  }

  PolyLine_Pr_PolyLGetArcQuadrant(startPoint: Point, endPoint: any, angle: number) {
    console.log("= S.BaseLine: PolyLine_Pr_PolyLGetArcQuadrant input:", { startPoint, endPoint, angle });

    // Initialize the result object with default values
    let result = { param: 0, ShortRef: 0 };

    // Build an array of points starting with the startPoint and endPoint
    let points: Point[] = [];
    points.push(new Point(startPoint.x, startPoint.y));
    points.push(new Point(endPoint.x, endPoint.y));

    // Define a center point for rotation (using the start point as center)
    let center = { x: startPoint.x, y: startPoint.y };

    // If the given angle is significant, rotate the points around the center
    if (Math.abs(angle) >= 0.01) {
      const sinValue = Math.sin(angle);
      const cosValue = Math.cos(angle);
      let rotationAngle = Math.asin(sinValue);
      if (cosValue < 0) {
        rotationAngle = -rotationAngle;
      }
      Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
    }

    // Extract rotated start and end points
    const rotatedStart = points[0];
    const rotatedEnd = points[1];

    // Determine the arc quadrant settings based on the positions of the rotated points
    if (rotatedEnd.x > rotatedStart.x) {
      if (rotatedEnd.y > rotatedStart.y) {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        if (endPoint.notclockwise) {
          result.param = 0;
        }
      } else {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
          result.param = ConstantData.Geometry.PI / 2;
        }
      }
    } else {
      if (rotatedEnd.y > rotatedStart.y) {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
          result.param = ConstantData.Geometry.PI / 2;
        }
      } else {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
        if (endPoint.notclockwise) {
          result.param = 0;
        }
      }
    }

    console.log("= S.BaseLine: PolyLine_Pr_PolyLGetArcQuadrant output:", result);
    return result;
  }

  FieldDataAllowed(): boolean {
    console.log("= S.BaseLine: FieldDataAllowed called - input: none");
    const result = false;
    console.log("= S.BaseLine: FieldDataAllowed output:", result);
    return result;
  }
}

export default BaseLine
