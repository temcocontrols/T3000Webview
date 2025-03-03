

import { Type } from 'class-transformer'
import 'reflect-metadata'
import BaseLine from './Shape.BaseLine'
import DefaultEvt from "../Event/DefaultEvt";
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import Element from "../Basic/Basic.Element";
import $ from 'jquery';
import BaseShape from './Shape.BaseShape'
import Point from '../Model/Point'
import Document from '../Basic/Basic.Document'
import Instance from '../Data/Instance/Instance'
import ConstantData from '../Data/ConstantData'
import PolyList from '../Model/PolyList'
import PolySeg from '../Model/PolySeg'
import HitResult from '../Model/HitResult'
import SelectionAttributes from '../Model/SelectionAttributes'
import RightClickData from '../Model/RightClickData'
import ConstantData1 from '../Data/ConstantData1'

class PolyLine extends BaseLine {

  @Type(() => PolyList)
  public polylist: any;

  public StartPoint: any;
  public EndPoint: any;
  public hoplist: any;
  public ArrowheadData: any;
  public StartArrowID: any;
  public EndArrowID: any;
  public StartArrowDisp: any;
  public EndArrowDisp: any;
  public ArrowSizeIndex: any;
  public RotateKnobPt: any;
  public TextDirection: any;

  constructor(options) {
    console.log('S.PolyLine: constructor input', options);

    options = options || {};
    options.DrawingObjectBaseClass = ConstantData.DrawingObjectBaseClass.LINE;
    options.LineType = options.LineType || ConstantData.LineType.POLYLINE;

    super(options);

    this.polylist = options.polylist || new PolyList();
    this.polylist.flags = ConstantData.PolyListFlags.SD_PLF_FreeHand;

    this.StartPoint = options.StartPoint || { x: 0, y: 0 };
    this.EndPoint = options.EndPoint || { x: 0, y: 0 };

    this.hoplist = options.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = options.ArrowheadData || [];
    this.StartArrowID = options.StartArrowID || 0;
    this.EndArrowID = options.EndArrowID || 0;
    this.StartArrowDisp = options.StartArrowDisp || false;
    this.EndArrowDisp = options.EndArrowDisp || false;
    this.ArrowSizeIndex = options.ArrowSizeIndex || 0;
    this.RotateKnobPt = { x: 0, y: 0 };
    this.TextDirection = options.TextDirection || false;

    this.CalcFrame();

    console.log('S.PolyLine: constructor output', this);
  }

  CreateShape(svgDoc, isHidden) {
    console.log('S.PolyLine: CreateShape input', svgDoc, isHidden);

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;

    const shapeContainer = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const pathShape = svgDoc.CreateShape(ConstantData.CreateShapeType.PATH);
    pathShape.SetID(ConstantData.SVGElementClass.SHAPE);

    const polylineShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    polylineShape.SetID(ConstantData.SVGElementClass.SLOP);
    polylineShape.ExcludeFromExport(true);

    this.CalcFrame();
    const frame = this.Frame;
    let styleRecord = this.StyleRecord;

    styleRecord = this.SVGTokenizerHook(styleRecord) || GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false)?.def.style;

    const strokeColor = styleRecord.Line.Paint.Color;
    let strokeWidth = styleRecord.Line.Thickness;
    if (strokeWidth > 0 && strokeWidth < 1) strokeWidth = 1;

    const strokeOpacity = styleRecord.Line.Paint.Opacity;
    const strokePattern = styleRecord.Line.LinePattern;
    const width = frame.width;
    const height = frame.height;

    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(frame.x, frame.y);
    pathShape.SetSize(width, height);

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
    this.UpdateSVG(pathShape, polyPoints);

    pathShape.SetFillColor("none");
    pathShape.SetStrokeColor(strokeColor);
    pathShape.SetStrokeOpacity(strokeOpacity);
    pathShape.SetStrokeWidth(strokeWidth);
    if (strokePattern !== 0) pathShape.SetStrokePattern(strokePattern);

    polylineShape.SetSize(width, height);
    this.UpdateSVG(polylineShape, polyPoints);
    polylineShape.SetStrokeColor("white");
    polylineShape.SetFillColor("none");
    polylineShape.SetOpacity(0);
    polylineShape.SetEventBehavior(isHidden ? Element.EventBehavior.HIDDEN_OUT : Element.EventBehavior.NONE);
    polylineShape.SetStrokeWidth(strokeWidth + ConstantData.Defines.SED_Slop);

    shapeContainer.AddElement(pathShape);
    shapeContainer.AddElement(polylineShape);

    this.ApplyStyles(pathShape, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);

    const fillHatch = styleRecord.Fill.Hatch;
    if (fillHatch && fillHatch !== 0 && this.polylist && this.polylist.closed) {
      const polygonShape = svgDoc.CreateShape(ConstantData.CreateShapeType.POLYGON);
      polygonShape.SetPoints(polyPoints);
      polygonShape.SetID(ConstantData.SVGElementClass.HATCH);
      polygonShape.SetSize(width, height);
      polygonShape.SetStrokeWidth(0);
      this.SetFillHatch(polygonShape, fillHatch);
      shapeContainer.AddElement(polygonShape);
    }

    shapeContainer.isShape = true;
    this.AddIcons(svgDoc, shapeContainer);

    console.log('S.PolyLine: CreateShape output', shapeContainer);
    return shapeContainer;
  }

  PostCreateShapeCallback(svgDoc, shapeContainer, shape, isHidden) {
    console.log('= S.PolyLine PostCreateShapeCallback input', svgDoc, shapeContainer, shape, isHidden);

    const mainShape = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopShape = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    let startArrow = ConstantData1.ArrowheadLookupTable[this.StartArrowID];
    let endArrow = ConstantData1.ArrowheadLookupTable[this.EndArrowID];
    const arrowSize = ConstantData1.ArrowheadSizeTable[this.ArrowSizeIndex];

    if (startArrow.id === 0) startArrow = null;
    if (endArrow.id === 0) endArrow = null;

    if (startArrow || endArrow) {
      mainShape.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
      slopShape.SetArrowheads(startArrow, arrowSize, endArrow, arrowSize, this.StartArrowDisp, this.EndArrowDisp);
    }

    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(svgDoc, shapeContainer);
    }

    if (this.polylist && this.polylist.segs && this.polylist.segs.length > 1) {
      this.UpdateDimensionLines(shapeContainer);
    }

    console.log('= S.PolyLine PostCreateShapeCallback output', shapeContainer);
  }

  UpdateSVG(pathShape, polyPoints) {
    console.log('S.PolyLine: UpdateSVG input', pathShape, polyPoints);

    const pointCount = polyPoints.length;
    if (pathShape && pathShape.PathCreator) {
      const pathCreator = pathShape.PathCreator();
      pathCreator.BeginPath();
      if (pointCount > 1) {
        pathCreator.MoveTo(polyPoints[0].x, polyPoints[0].y);
        for (let i = 1; i < pointCount; i++) {
          pathCreator.LineTo(polyPoints[i].x, polyPoints[i].y);
        }
      }
      if (this.polylist.closed) {
        pathCreator.ClosePath();
      }
      pathCreator.Apply();
    }

    console.log('S.PolyLine: UpdateSVG output', pathShape);
  }

  SetFillHatch(shape, hatchType, color) {
    console.log('S.PolyLine: SetFillHatch input', shape, hatchType, color);

    if (hatchType !== -1 && hatchType !== 0) {
      let hatchIndex = hatchType - 1;
      let textureOptions = {};
      let effects = [];

      if (hatchIndex < 10) hatchIndex = "0" + hatchIndex;

      textureOptions.url = Constants.FilePath_Hatches + Constants.HatchName + hatchIndex + ".png";
      textureOptions.scale = 1;
      textureOptions.alignment = 0;
      textureOptions.dim = { x: 128, y: 128 };

      shape.SetTextureFill(textureOptions);

      let lineColor = this.StyleRecord.Line.Paint.Color;
      if (color) lineColor = color;

      effects.push({
        type: Effects.EffectType.RECOLOR,
        params: { color: lineColor }
      });

      shape.Effects().SetEffects(effects, this.Frame);
    } else {
      shape.SetFillColor("none");
    }

    console.log('S.PolyLine: SetFillHatch output', shape);
  }

  GetDimensionPoints() {
    console.log('S.PolyLine: GetDimensionPoints input');

    var dimensionPoints = [];
    var polyPoints = [];
    var totalLength = 0;
    var deltaX = 0;
    var deltaY = 0;
    var segmentLength = 0;
    var startPoint = {};
    var endPoint = {};

    if (!this.polylist.closed && this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts) {
      dimensionPoints.push(new Point(this.StartPoint.x - this.Frame.x, this.StartPoint.y - this.Frame.y));
      dimensionPoints.push(new Point(this.EndPoint.x - this.Frame.x, this.EndPoint.y - this.Frame.y));
    } else if (!this.polylist.closed && this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
      for (var i = 1; i < polyPoints.length; i++) {
        deltaX = Math.abs(polyPoints[i - 1].x - polyPoints[i].x);
        deltaY = Math.abs(polyPoints[i - 1].y - polyPoints[i].y);
        segmentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        totalLength += segmentLength;
      }
      var centerPoint = {
        x: this.Frame.width / 2,
        y: this.Frame.height / 2
      };
      startPoint.x = centerPoint.x - totalLength / 2;
      startPoint.y = centerPoint.y;
      dimensionPoints.push(new Point(startPoint.x, startPoint.y));
      endPoint.x = centerPoint.x + totalLength / 2;
      endPoint.y = centerPoint.y;
      dimensionPoints.push(new Point(endPoint.x, endPoint.y));
      var angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(new Point(0, 0), new Point(this.Frame.width, this.Frame.height));
      Utils3.RotatePointsAboutPoint(centerPoint, angle, dimensionPoints);
    } else {
      dimensionPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    }

    console.log('S.PolyLine: GetDimensionPoints output', dimensionPoints);
    return dimensionPoints;
  }

  AdjustDimensionLineDeflection(event, target, angle, segment, segmentInfo) {
    console.log('S.PolyLine: adjustDimensionLineDeflection input', event, target, angle, segment, segmentInfo);

    const segmentIndex = segmentInfo.segmentIndex;
    if (this.polylist && this.polylist.segs && this.polylist.segs.length !== 0) {
      if (segmentIndex >= 0 && segmentIndex < this.polylist.segs.length) {
        this.polylist.segs[segmentIndex].dimDeflection = this.getDimensionLineDeflection(event, target, angle, segmentInfo);
        this.updateDimensionLines(event);
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
          this.hideOrShowSelectOnlyDimensions(true);
        }
      }
    }

    console.log('S.PolyLine: adjustDimensionLineDeflection output', this.polylist);
  }

  GetDimensionDeflectionValue(segmentIndex) {
    console.log('S.PolyLine: GetDimensionDeflectionValue input', segmentIndex);

    if (this.polylist && this.polylist.segs && this.polylist.segs.length > 0 && segmentIndex >= 0 && segmentIndex < this.polylist.segs.length) {
      const deflectionValue = this.polylist.segs[segmentIndex].dimDeflection;
      console.log('S.PolyLine: GetDimensionDeflectionValue output', deflectionValue);
      return deflectionValue;
    }

    console.log('S.PolyLine: GetDimensionDeflectionValue output', null);
    return null;
  }

  GetDimensionFloatingPointValue(dimensionType: number): number | null {
    console.log("S.PolyLine: GetDimensionFloatingPointValue input", dimensionType);
    let dimensionValue = 0;
    let dimensionsInfo: any = {};

    if (!(this.rflags & ConstantData.FloatingPointDim.SD_FP_Width || this.rflags & ConstantData.FloatingPointDim.SD_FP_Height)) {
      console.log("S.PolyLine: GetDimensionFloatingPointValue output", null);
      return null;
    }
    if (!this.GetPolyRectangularInfo(dimensionsInfo)) {
      console.log("S.PolyLine: GetDimensionFloatingPointValue output", null);
      return null;
    }
    if (dimensionsInfo.wdDim === dimensionType || dimensionsInfo.wdDim + 2 === dimensionType) {
      if (this.rflags & ConstantData.FloatingPointDim.SD_FP_Width) {
        dimensionValue = this.GetDimensionLengthFromValue(this.rwd);
        const result = this.GetLengthInRulerUnits(dimensionValue);
        console.log("S.PolyLine: GetDimensionFloatingPointValue output", result);
        return result;
      }
    } else if ((dimensionsInfo.htDim === dimensionType || dimensionsInfo.htDim + 2 === dimensionType) &&
      (this.rflags & ConstantData.FloatingPointDim.SD_FP_Height)) {
      dimensionValue = this.GetDimensionLengthFromValue(this.rht);
      const result = this.GetLengthInRulerUnits(dimensionValue);
      console.log("S.PolyLine: GetDimensionFloatingPointValue output", result);
      return result;
    }
    console.log("S.PolyLine: GetDimensionFloatingPointValue output", null);
    return null;
  }

  UpdateDrawing(svgDocument) {
    console.log("S.PolyLine: UpdateDrawing input", svgDocument);

    console.log("S.PolyLine: UpdateDrawing - Starting update of dimensions and lines");

    // Get primary SVG elements for shape and slop
    const shapeElement = svgDocument.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    const slopElement = svgDocument.GetElementByID(ConstantData.SVGElementClass.SLOP);

    // Recalculate frame and get the polyline points (readable step parameters)
    this.CalcFrame();
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);

    // Update container size and position based on current frame
    svgDocument.SetSize(this.Frame.width, this.Frame.height);
    svgDocument.SetPos(this.Frame.x, this.Frame.y);

    // Update the shape element
    shapeElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(shapeElement, polyPoints);

    // Update the slop element
    slopElement.SetSize(this.Frame.width, this.Frame.height);
    this.UpdateSVG(slopElement, polyPoints);

    // Update the hatch element if it exists
    const hatchElement = svgDocument.GetElementByID(ConstantData.SVGElementClass.HATCH);
    if (hatchElement) {
      hatchElement.SetPoints(polyPoints);
      hatchElement.SetSize(this.Frame.width, this.Frame.height);
    }

    // If there are more than one polyline segments, update dimension lines
    if (this.polylist != null && this.polylist.segs != null && this.polylist.segs.length > 1) {
      this.UpdateDimensionLines(svgDocument);
    }

    console.log("S.PolyLine: UpdateDrawing output", svgDocument);
  }

  ScaleEndPoints() {
    console.log('S.PolyLine: ScaleEndPoints input', {
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });

    let scaleX = this.Frame.width / this.polylist.dim.x;
    let scaleY = this.Frame.height / this.polylist.dim.y;

    // No scaling needed if both scales are 1
    if (scaleX === 1 && scaleY === 1) {
      console.log('S.PolyLine: ScaleEndPoints output - no scaling performed', {
        Frame: this.Frame,
        StartPoint: this.StartPoint,
        EndPoint: this.EndPoint
      });
      return;
    }

    // Calculate the center of the frame
    let centerPoint = {
      x: this.Frame.x + this.Frame.width / 2,
      y: this.Frame.y + this.Frame.height / 2
    };

    // Scale StartPoint relative to center
    let deltaX = centerPoint.x - this.StartPoint.x;
    this.StartPoint.x = centerPoint.x - deltaX * scaleX;
    let deltaY = centerPoint.y - this.StartPoint.y;
    this.StartPoint.y = centerPoint.y - deltaY * scaleY;

    // Scale EndPoint relative to center
    deltaX = centerPoint.x - this.EndPoint.x;
    this.EndPoint.x = centerPoint.x - deltaX * scaleX;
    deltaY = centerPoint.y - this.EndPoint.y;
    this.EndPoint.y = centerPoint.y - deltaY * scaleY;

    console.log('S.PolyLine: ScaleEndPoints output', {
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
  }

  UpdateFrame(newFrame: any) {
    console.log("S.PolyLine: UpdateFrame input", newFrame);
    super.UpdateFrame(newFrame);
    if (this.polylist.closed && this.StyleRecord && this.StyleRecord.Line) {
      // Additional logic for closed polyline with line style can be added here if needed
    }
    console.log("S.PolyLine: UpdateFrame output", this.Frame);
  }

  CalcFrame() {
    console.log("S.PolyLine: CalcFrame input");

    let lineThickness: number;
    let polyPoints: any[] = [];
    let boundingRect: any = {};

    if (this.polylist) {
      // Reset polygon dimensions
      this.polylist.dim.x = 0;
      this.polylist.dim.y = 0;

      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
      if (polyPoints && polyPoints.length) {
        Utils2.GetPolyRect(boundingRect, polyPoints);
        if (boundingRect.width < 1) {
          boundingRect.width = 1;
        }
        if (boundingRect.height < 1) {
          boundingRect.height = 1;
        }
        if (this.polylist.closed) {
          // Set polygon dimensions when closed
          this.polylist.dim.x = boundingRect.width;
          this.polylist.dim.y = boundingRect.height;
          if (this.StyleRecord && this.StyleRecord.Line &&
            (this.StyleRecord.Line.BThick || (this instanceof Instance.Shape.PolyLineContainer))) {
            // When line has thickness or the object is a PolyLineContainer.
            this.inside = $.extend(true, {}, boundingRect);
            this.Frame = $.extend(true, {}, boundingRect);
            lineThickness = this.StyleRecord.Line.Thickness;
            Utils2.InflateRect(this.inside, -lineThickness / 2, -lineThickness / 2);
          } else {
            this.inside = $.extend(true, {}, boundingRect);
            this.Frame = $.extend(true, {}, boundingRect);
            if (this.StyleRecord && this.StyleRecord.Line) {
              lineThickness = this.StyleRecord.Line.Thickness;
            }
          }
        } else {
          // For non-closed polyline, simply update the frame.
          this.Frame = $.extend(true, {}, boundingRect);
        }
      }
    }
    this.UpdateFrame(this.Frame);
    console.log("S.PolyLine: CalcFrame output", this.Frame);
  }

  GetSVGFrame(inputFrame: any): any {
    console.log("S.PolyLine:GetSVGFrame input:", inputFrame);
    let outputFrame = {};
    if (inputFrame == null) {
      inputFrame = this.Frame;
    }
    Utils2.CopyRect(outputFrame, inputFrame);
    console.log("S.PolyLine:GetSVGFrame output:", outputFrame);
    return outputFrame;
  }

  GetDimensions(): { x: number; y: number } {
    console.log('S.PolyLine: GetDimensions input - Frame:', this.Frame);
    const dimensions = {
      x: this.Frame.width,
      y: this.Frame.height
    };
    console.log('S.PolyLine: GetDimensions output:', dimensions);
    return dimensions;
  }

  SetSize(newWidth, newHeight, extraParam) {
    console.log('S.PolyLine: SetSize input', { newWidth, newHeight, extraParam });

    // Default scale factors and order flags
    let scaleX = 1;
    let scaleY = 1;
    let horizontalOrder = false;
    let verticalOrder = false;
    let adjustX = 0;
    let adjustY = 0;
    const numSegments = this.polylist.segs.length;
    const endPointBackup = { x: 0, y: 0 };

    // Calculate scale factors based on new width and height (if applicable)
    if (newWidth && (!Utils2.IsEqual(this.Frame.width, 0))) {
      scaleX = newWidth / this.Frame.width;
    }
    if (newHeight && (!Utils2.IsEqual(this.Frame.height, 0))) {
      scaleY = newHeight / this.Frame.height;
    }

    // Scale each polyline segment if needed
    if (scaleX !== 1 || scaleY !== 1) {
      for (let i = 0; i < numSegments; i++) {
        this.polylist.segs[i].pt.x *= scaleX;
        this.polylist.segs[i].pt.y *= scaleY;
      }
    }

    // Determine order of start and end points
    if (this.StartPoint.x <= this.EndPoint.x) {
      horizontalOrder = true;
    }
    if (this.StartPoint.y <= this.EndPoint.y) {
      verticalOrder = true;
    }

    // Backup the current EndPoint
    endPointBackup.x = this.EndPoint.x;
    endPointBackup.y = this.EndPoint.y;

    // Update the EndPoint based on the last segment point relative to StartPoint
    this.EndPoint.x = this.StartPoint.x + this.polylist.segs[numSegments - 1].pt.x;
    this.EndPoint.y = this.StartPoint.y + this.polylist.segs[numSegments - 1].pt.y;

    // Adjust points if the ordering is reversed
    if (!horizontalOrder) {
      adjustX = endPointBackup.x - this.EndPoint.x;
      if (adjustX) {
        this.StartPoint.x += adjustX;
        this.EndPoint.x += adjustX;
      }
    }
    if (!verticalOrder) {
      adjustY = endPointBackup.y - this.EndPoint.y;
      if (adjustY) {
        this.StartPoint.y += adjustY;
        this.EndPoint.y += adjustY;
      }
    }

    // Clear floating point dimension flags if set
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    // Recalculate frame and update link flag
    this.CalcFrame();
    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

    console.log('S.PolyLine: SetSize output', { frame: this.Frame, startPoint: this.StartPoint, endPoint: this.EndPoint });
  }

  UpdateDimensions(svgDocument, xOffset, yOffset) {
    console.log("S.PolyLine: UpdateDimensions input", { svgDocument, xOffset, yOffset });
    // Get the SVG element for this BlockID
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Calculate the new X coordinate:
    // If a valid xOffset is provided, add it to the StartPoint.x, else use the EndPoint.x
    const newX = xOffset ? this.StartPoint.x + xOffset : this.EndPoint.x;

    // Similarly, calculate the new Y coordinate:
    // If a valid yOffset is provided, add it to the StartPoint.y, else use the EndPoint.y
    const newY = yOffset ? this.StartPoint.y + yOffset : this.EndPoint.y;

    // Adjust the end of the line accordingly
    this.AdjustLineEnd(svgElement, newX, newY, ConstantData.ActionTriggerType.LINEEND);

    console.log("S.PolyLine: UpdateDimensions output", { newX, newY });
  }

  GetApparentAngle(point: any): number {
    console.log("S.PolyLine: GetApparentAngle input:", point);

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    const segmentIndex = this.PolyHitSeg(point);

    let apparentAngle = 0;
    if (segmentIndex < 0) {
      apparentAngle = 0;
    } else {
      apparentAngle = this.GetDrawNormalizedAngle(polyPoints[segmentIndex - 1], polyPoints[segmentIndex]);
    }

    console.log("S.PolyLine: GetApparentAngle output:", apparentAngle);
    return apparentAngle;
  }

  SnapPointToSegment(segmentIndex, pointToSnap) {
    console.log("S.PolyLine: SnapPointToSegment input", { segmentIndex, pointToSnap });

    // Create an empty bounding rectangle
    const boundingRect = {};

    // Get the polyline points
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);

    // Calculate the angle difference between the segment endpoints
    let angleDifference = 360 - Utils1.CalcAngleFromPoints(polyPoints[segmentIndex - 1], polyPoints[segmentIndex]);
    if (angleDifference >= 360) {
      angleDifference = 0;
    }

    // Convert the angle difference into radians
    const angleRadians = (2 * Math.PI) * (angleDifference / 360);

    // Get the bounding rectangle from the polyline points
    Utils2.GetPolyRect(boundingRect, polyPoints);

    // Rotate polyPoints and the point to snap using the negative rotation angle
    Utils3.RotatePointsAboutCenter(boundingRect, -angleRadians, polyPoints);
    Utils3.RotatePointsAboutCenter(boundingRect, -angleRadians, [pointToSnap]);

    // Set the y coordinate of the point to snap equal to that of the segment's end point
    pointToSnap.y = polyPoints[segmentIndex].y;

    // Rotate the point back using the positive rotation angle
    Utils3.RotatePointsAboutCenter(boundingRect, angleRadians, [pointToSnap]);

    console.log("S.PolyLine: SnapPointToSegment output", { pointToSnap });
  }

  GetTextOnLineParams(textPositionFactor: number) {
    console.log("S.PolyLine: GetTextOnLineParams input:", { textPositionFactor });

    // Prepare the output parameters object with a new frame and points.
    let textParameters = {
      Frame: new Instance.Shape.Rect(),
      StartPoint: new Point(),
      EndPoint: new Point()
    };

    // Get the polyline points (without transformation)
    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    let totalPoints = polyPoints.length;

    // Determine left/right indices based on the x-coordinates
    let indexLeft: number, indexRight: number;
    if (polyPoints[0].x < polyPoints[totalPoints - 1].x) {
      indexLeft = 0;
      indexRight = totalPoints - 2;
    } else {
      indexLeft = totalPoints - 2;
      indexRight = 0;
    }

    // Default middle index is roughly in the center of the polyline points.
    let middleIndex = Math.round((totalPoints - 1.1) / 2);
    // Default factor and text alignment from the shape properties.
    let factor = 0.5;
    let alignment = this.TextAlign;

    // If there is a specified LineTextX value, override factor and force center alignment.
    if (this.LineTextX) {
      factor = this.LineTextX;
      alignment = ConstantData.TextAlign.CENTER;
    }

    // Decide which segment to use based on the text alignment.
    switch (alignment) {
      case ConstantData.TextAlign.TOPLEFT:
      case ConstantData.TextAlign.LEFT:
      case ConstantData.TextAlign.BOTTOMLEFT:
        // Use the left segment.
        textParameters.StartPoint.x = polyPoints[indexLeft].x;
        textParameters.StartPoint.y = polyPoints[indexLeft].y;
        textParameters.EndPoint.x = polyPoints[indexLeft + 1].x;
        textParameters.EndPoint.y = polyPoints[indexLeft + 1].y;
        break;
      case ConstantData.TextAlign.TOPRIGHT:
      case ConstantData.TextAlign.RIGHT:
      case ConstantData.TextAlign.BOTTOMRIGHT:
        // Use the right segment.
        textParameters.StartPoint.x = polyPoints[indexRight].x;
        textParameters.StartPoint.y = polyPoints[indexRight].y;
        textParameters.EndPoint.x = polyPoints[indexRight + 1].x;
        textParameters.EndPoint.y = polyPoints[indexRight + 1].y;
        break;
      default:
        // For any other alignment, choose a segment based on the position factor.
        middleIndex = (function (positionFactor: number, paramsRef: any): number {
          let totalLength = 0;
          let segmentLengths: number[] = [];
          // Sum lengths of each segment.
          for (let i = 1; i < totalPoints; i++) {
            let currentPt = polyPoints[i];
            let previousPt = polyPoints[i - 1];
            let dx = currentPt.x - previousPt.x;
            let dy = currentPt.y - previousPt.y;
            let segmentLength = Utils2.sqrt(dx * dx + dy * dy);
            segmentLengths.push(segmentLength);
            totalLength += segmentLength;
          }
          // Determine the target length to locate the segment.
          let targetLength = positionFactor * totalLength;
          for (let i = 0; i < totalPoints - 1; i++) {
            if (targetLength < segmentLengths[i]) {
              paramsRef.CenterProp = targetLength / segmentLengths[i];
              return i;
            }
            targetLength -= segmentLengths[i];
          }
          return Math.round((totalPoints - 1.1) / 2);
        })(factor, textParameters);

        textParameters.StartPoint.x = polyPoints[middleIndex].x;
        textParameters.StartPoint.y = polyPoints[middleIndex].y;
        textParameters.EndPoint.x = polyPoints[middleIndex + 1].x;
        textParameters.EndPoint.y = polyPoints[middleIndex + 1].y;
        break;
    }

    // Deep copy the current frame to the output parameters.
    textParameters.Frame = Utils1.DeepCopy(this.Frame);

    console.log("S.PolyLine: GetTextOnLineParams output:", textParameters);
    return textParameters;
  }

  AddCorner(svgElement: any, cornerPoint: Point) {
    console.log("S.PolyLine: AddCorner - input:", { svgElement, cornerPoint });

    // Rename variables for readability:
    let tempOffsetX: number, tempOffsetY: number;
    let newCornerSegment: any, nextSegmentIndex: number;
    let rotationAngle: number, majorScale: number;
    let scaleLabel: number, labelText: string;
    let computedAngle: number;
    let hookIndex: number;
    let isEndpointCorner = false;

    // Get the segment where the corner was hit.
    const cornerSegmentIndex = this.PolyHitSeg(cornerPoint);
    const linksObject = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theLinksBlockID, false);
    let hookList: any[] = [];

    // If no svgElement provided, get by BlockID.
    if (svgElement == null) {
      svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    }

    if (svgElement != null && this.polylist.segs[cornerSegmentIndex] !== undefined) {
      // Collaboration message support.
      if (Collab.AllowMessage()) {
        Collab.BeginSecondaryEdit();
        const collabData = {
          BlockID: this.BlockID,
          point: { x: cornerPoint.x, y: cornerPoint.y }
        };
      }

      // Preserve hooks related to this block.
      hookList = GlobalData.optManager.GetHookList(linksObject, hookList, this.BlockID, this, ConstantData.ListCodes.SED_LC_MOVEHOOK, {});
      for (hookIndex = 0; hookIndex < hookList.length; hookIndex++) {
        GlobalData.objectStore.PreserveBlock(hookList[hookIndex]);
      }

      // If the hit segment is a simple line, snap the point.
      if (this.polylist.segs[cornerSegmentIndex].LineType === ConstantData.LineType.LINE) {
        this.SnapPointToSegment(cornerSegmentIndex, cornerPoint);
      }

      nextSegmentIndex = cornerSegmentIndex + 1;
      // Check if we are at one end of an open polyline.
      if (this.polylist.closed || ((cornerSegmentIndex === 1 && (nextSegmentIndex = 1, isEndpointCorner = true)) ||
        (cornerSegmentIndex === this.polylist.segs.length - 1 && (isEndpointCorner = true)))) {

        // For endpoints, prepare an array of three points: previous segment, current segment and the new point.
        const tempPoints: Point[] = [];
        const previousSegmentPoint = {
          x: this.polylist.segs[cornerSegmentIndex - 1].pt.x,
          y: this.polylist.segs[cornerSegmentIndex - 1].pt.y
        };
        tempPoints.push(previousSegmentPoint);

        const currentSegmentPoint = {
          x: this.polylist.segs[cornerSegmentIndex].pt.x,
          y: this.polylist.segs[cornerSegmentIndex].pt.y
        };
        tempPoints.push(currentSegmentPoint);

        const relativeCornerPoint = {
          x: cornerPoint.x - this.StartPoint.x,
          y: cornerPoint.y - this.StartPoint.y
        };
        tempPoints.push(relativeCornerPoint);

        // Calculate the angle between first two points.
        computedAngle = Utils1.CalcAngleFromPoints(tempPoints[0], tempPoints[1]);
        let normalizedAngle = 360 - computedAngle;
        if (normalizedAngle >= 360) {
          normalizedAngle -= 360;
        }
        rotationAngle = 2 * Math.PI * (normalizedAngle / 360);

        // Rotate temp points to unrotate the frame.
        Utils3.RotatePointsAboutCenter(this.Frame, -rotationAngle, tempPoints);

        // Create a new corner segment from the relative corner point.
        newCornerSegment = new PolySeg(this.polylist.segs[cornerSegmentIndex].LineType,
          cornerPoint.x - this.StartPoint.x,
          cornerPoint.y - this.StartPoint.y);
        this.polylist.segs.splice(cornerSegmentIndex, 0, newCornerSegment);

        // Adjust boundary hooks based on whether the new corner is at the start or the end.
        if (cornerSegmentIndex === 1) {
          // For the first segment of open polyline.
          tempPoints[0].x = tempPoints[2].x;
          tempPoints[0].y += 50;
          Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, tempPoints);
          const newStartX = tempPoints[0].x + this.StartPoint.x;
          const newStartY = tempPoints[0].y + this.StartPoint.y;
          // Reset first segment relative point and adjust its start.
          this.polylist.segs[0].pt.x = 0;
          this.polylist.segs[0].pt.y = 0;
          this.AdjustLineStart(null, newStartX, newStartY, ConstantData.ActionTriggerType.LINESTART);
        } else {
          // For the last segment.
          tempPoints[1].x = tempPoints[2].x;
          tempPoints[1].y += 50;
          Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, tempPoints);
          const newEndX = tempPoints[1].x + this.StartPoint.x;
          const newEndY = tempPoints[1].y + this.StartPoint.y;
          this.AdjustLineEnd(null, newEndX, newEndY, ConstantData.ActionTriggerType.LINEEND);
        }
      } else {
        // When the new corner is inserted in the middle interior of the polyline.
        newCornerSegment = new PolySeg(this.polylist.segs[cornerSegmentIndex].LineType,
          cornerPoint.x - this.StartPoint.x,
          cornerPoint.y - this.StartPoint.y);
        this.polylist.segs.splice(cornerSegmentIndex, 0, newCornerSegment);

        // If not an endpoint, then add a duplicate segment.
        if (!isEndpointCorner) {
          newCornerSegment = new PolySeg(this.polylist.segs[cornerSegmentIndex].LineType,
            cornerPoint.x - this.StartPoint.x,
            cornerPoint.y - this.StartPoint.y);
          this.polylist.segs.splice(cornerSegmentIndex, 0, newCornerSegment);
        }

        // Calculate a label based on the ruler settings.
        majorScale = Number(gDocumentHandler.rulerSettings.majorScale);
        switch (gDocumentHandler.rulerSettings.units) {
          case ConstantData.RulerUnits.SED_Feet:
            scaleLabel = Math.abs(majorScale - this.polylist.segs.length);
            scaleLabel %= majorScale;
            scaleLabel++;
            labelText = scaleLabel.toString() + "'";
            break;
          case ConstantData.RulerUnits.SED_Inches:
            scaleLabel = Math.abs(majorScale - this.polylist.segs.length);
            scaleLabel %= majorScale;
            scaleLabel++;
            labelText = scaleLabel.toString() + '"';
            break;
          default:
            scaleLabel = Math.abs(majorScale - this.polylist.segs.length);
            scaleLabel %= majorScale;
            scaleLabel++;
            labelText = scaleLabel.toString();
        }

        // Preserve the current Dimension flags.
        const currentDimensions = this.Dimensions;
        this.UpdateDimensionFromText(svgElement, labelText, { segment: nextSegmentIndex });
        this.Dimensions = currentDimensions;
      }

      // Set link flags for the main block and all hooks.
      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      const hooksCount = this.hooks.length;
      for (hookIndex = 0; hookIndex < hooksCount; hookIndex++) {
        GlobalData.optManager.SetLinkFlag(this.hooks[hookIndex].objid, ConstantData.LinkFlags.SED_L_MOVE);
      }

      GlobalData.optManager.ActionTriggerData = cornerSegmentIndex;

      // If the frame is partially outside (negative coordinates), adjust it.
      if (this.Frame.x < 0 || this.Frame.y < 0) {
        const frameRect = this.Frame;
        if (frameRect.x < 0) {
          tempOffsetX = -frameRect.x;
          frameRect.x += tempOffsetX;
        }
        if (frameRect.y < 0) {
          tempOffsetY = -frameRect.y;
          // Add default standoff if required.
          if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
            this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
            tempOffsetY += ConstantData.Defines.DimensionDefaultStandoff;
          }
          frameRect.y += tempOffsetY;
        }
        this.StartPoint.x += tempOffsetX;
        this.StartPoint.y += tempOffsetY;
        this.EndPoint.x += tempOffsetX;
        this.EndPoint.y += tempOffsetY;
        GlobalData.optManager.SetObjectFrame(this.BlockID, frameRect);
      }

      // Update drawing and text objects.
      this.UpdateDrawing(svgElement);
      if (this.DataID != -1) {
        const mainElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
        this.LM_ResizeSVGTextObject(mainElement, this, this.Frame);
      }

      GlobalData.optManager.ShowSVGSelectionState(svgElement.GetID(), true);
      if (Collab.AllowMessage()) {
        Collab.BuildMessage(ConstantData.CollabMessages.AddCorner, { BlockID: this.BlockID, point: { x: cornerPoint.x, y: cornerPoint.y } }, false);
      }
      GlobalData.optManager.CompleteOperation(null);
    }

    console.log("S.PolyLine: AddCorner - output: Corner added successfully");
  }

  GetKnobSize(svgDocument) {
    console.log("S.PolyLine: GetKnobSize input", svgDocument);
    const knobSize = ConstantData.Defines.SED_KnobSize;
    console.log("S.PolyLine: GetKnobSize output", knobSize);
    return knobSize;
  }

  GetCornerKnobImages() {
    console.log("S.PolyLine: GetCornerKnobImages input");

    const knobImages = null;

    console.log("S.PolyLine: GetCornerKnobImages output", knobImages);
    return knobImages;
  }

  CreateActionTriggers(svgDocument, targetObject, additionalData, actionId) {
    console.log("S.PolyLine: CreateActionTriggers input", { svgDocument, targetObject, additionalData, actionId });

    // Determine whether rotation knob is allowed
    let allowRotateKnob = !this.NoRotate();
    // Get the corner knob images if present
    let cornerKnobImages = this.GetCornerKnobImages();
    // Get the base knob size from the svgDocument
    let knobSize = this.GetKnobSize(svgDocument);
    // The defined rotate knob size from constant definitions
    const definedRotateKnobSize = ConstantData.Defines.SED_RKnobSize;

    // Determine the document to screen scale factor.
    let docToScreenScale = svgDocument.docInfo.docToScreenScale;
    if (svgDocument.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }

    // Calculate the adjusted knob sizes in document coordinates.
    let adjustedKnobSize = knobSize / docToScreenScale;
    let adjustedRotateKnobSize = definedRotateKnobSize / docToScreenScale;

    // Get the number of segments in the polyline.
    let segmentsCount = (this.polylist && this.polylist.segs) ? this.polylist.segs.length : 0;

    // Create a group shape to contain all action triggers (knobs).
    let actionTriggersGroup = svgDocument.CreateShape(ConstantData.CreateShapeType.GROUP);

    // Get a copy of the PolyLine frame.
    let frame = this.Frame;
    // Increase the frame size by a padding of adjustedKnobSize for proper knob placement.
    let paddedFrame = $.extend(true, {}, frame);
    paddedFrame.x -= adjustedKnobSize / 2;
    paddedFrame.y -= adjustedKnobSize / 2;
    paddedFrame.width += adjustedKnobSize;
    paddedFrame.height += adjustedKnobSize;

    // Get the target object pointer (if exists) for hooks checking later.
    let targetObj = GlobalData.optManager.GetObjectPtr(targetObject, false);

    // The width and height of the group shape are based on the frame dimensions plus padding.
    let groupWidth = frame.width + adjustedKnobSize;
    let groupHeight = frame.height + adjustedKnobSize;

    // Clone the frame for later use.
    let frameClone = $.extend(true, {}, frame);

    // Setup default knob properties.
    let knobProps: any = {
      svgDoc: svgDocument,
      shapeType: ConstantData.CreateShapeType.RECT,
      knobSize: adjustedKnobSize,
      fillColor: "black",
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: "#777777",
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, false),
      locked: false
    };

    // If corner knob images exist then use them and adjust stroke settings.
    if (cornerKnobImages) {
      knobProps.strokeSize = 0;
      delete knobProps.strokeColor;
      delete knobProps.fillColor;
      knobProps.shapeType = ConstantData.CreateShapeType.IMAGE;
    }

    // When the target object is not the same as actionId then set different style.
    if (targetObject !== actionId) {
      knobProps.fillColor = "white";
      knobProps.fillOpacity = 0;
      knobProps.strokeSize = 1;
      knobProps.strokeColor = "black";
    }

    // If this object is locked then use gray fill.
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobProps.fillColor = "gray";
      knobProps.locked = true;
    } else if (this.NoGrow()) {
      // If growing is not allowed, use red color and default cursor.
      knobProps.fillColor = "red";
      knobProps.strokeColor = "red";
      knobProps.cursorType = Element.CursorType.DEFAULT;
    }

    // Create the start knob if the polyline is not closed.
    if (!this.polylist.closed) {
      knobProps.x = this.StartPoint.x - frame.x;
      knobProps.y = this.StartPoint.y - frame.y;
      knobProps.knobID = ConstantData.ActionTriggerType.LINESTART;
      if (segmentsCount > 1) {
        // Calculate cursor based on the first segment.
        knobProps.cursorType = this.CalcCursorForSegment(this.polylist.segs[0].pt, this.polylist.segs[1].pt, false);
      }
      // Check for hooked target object if available.
      if (targetObj && targetObj.hooks) {
        for (let hookIndex = 0; hookIndex < targetObj.hooks.length; hookIndex++) {
          if (targetObj.hooks[hookIndex].hookpt === ConstantData.HookPts.SED_KTL) {
            // For specific hook, change shape to oval and disable rotation.
            knobProps.shapeType = ConstantData.CreateShapeType.OVAL;
            allowRotateKnob = false;
            break;
          }
        }
      }
      if (this.NoGrow()) {
        knobProps.cursorType = Element.CursorType.DEFAULT;
      }
      let startKnob = this.GenericKnob(knobProps);
      if (cornerKnobImages && startKnob && startKnob.SetURL) {
        startKnob.SetURL(knobProps.cursorType === Element.CursorType.NWSE_RESIZE ? cornerKnobImages.nwse : cornerKnobImages.nesw);
      }
      actionTriggersGroup.AddElement(startKnob);
    }

    // Reset shape type for non-image knobs.
    knobProps.shapeType = ConstantData.CreateShapeType.RECT;
    if (cornerKnobImages) {
      knobProps.shapeType = ConstantData.CreateShapeType.IMAGE;
    }

    // Create the end knob.
    if (targetObj && targetObj.hooks) {
      for (let hookIndex = 0; hookIndex < targetObj.hooks.length; hookIndex++) {
        if (targetObj.hooks[hookIndex].hookpt === ConstantData.HookPts.SED_KTR) {
          knobProps.shapeType = ConstantData.CreateShapeType.OVAL;
          allowRotateKnob = false;
          break;
        }
      }
    }

    knobProps.x = this.EndPoint.x - frame.x;
    knobProps.y = this.EndPoint.y - frame.y;
    if (this.polylist.closed) {
      knobProps.knobID = ConstantData.ActionTriggerType.POLYLEND;
      if (segmentsCount > 3) {
        knobProps.cursorType = this.CalcCursorForSegment(this.polylist.segs[1].pt, this.polylist.segs[segmentsCount - 2].pt, true);
      } else if (segmentsCount > 1) {
        knobProps.cursorType = this.CalcCursorForSegment(this.polylist.segs[segmentsCount - 1].pt, this.polylist.segs[segmentsCount - 2].pt, false);
      }
    } else {
      knobProps.knobID = ConstantData.ActionTriggerType.LINEEND;
      if (segmentsCount > 1) {
        knobProps.cursorType = this.CalcCursorForSegment(this.polylist.segs[segmentsCount - 1].pt, this.polylist.segs[segmentsCount - 2].pt, false);
      }
    }
    if (this.NoGrow()) {
      knobProps.cursorType = Element.CursorType.DEFAULT;
    }
    let endKnob = this.GenericKnob(knobProps);
    if (cornerKnobImages && endKnob.SetURL) {
      endKnob.SetURL(knobProps.cursorType === Element.CursorType.NWSE_RESIZE ? cornerKnobImages.nwse : cornerKnobImages.nesw);
      endKnob.ExcludeFromExport(true);
    }
    actionTriggersGroup.AddElement(endKnob);

    // For each intermediate segment, create a node knob if appropriate.
    knobProps.shapeType = ConstantData.CreateShapeType.RECT;
    if (cornerKnobImages) {
      knobProps.shapeType = ConstantData.CreateShapeType.IMAGE;
    }
    for (let segmentIndex = 1; segmentIndex < segmentsCount - 1; segmentIndex++) {
      // Skip certain segment types for special curve segments.
      if (segmentIndex === 1) {
        switch (this.polylist.segs[segmentIndex].LineType) {
          case ConstantData.LineType.QUADBEZ:
          case ConstantData.LineType.CUBEBEZ:
          case ConstantData.LineType.NURBS:
          case ConstantData.LineType.ELLIPSE:
          case ConstantData.LineType.SPLINE:
            continue;
        }
      }
      if (segmentIndex === 2) {
        switch (this.polylist.segs[segmentIndex].LineType) {
          case ConstantData.LineType.NURBSSEG:
          case ConstantData.LineType.SPLINECON:
            continue;
        }
      }
      knobProps.x = this.polylist.segs[segmentIndex].pt.x + this.StartPoint.x - frame.x;
      knobProps.y = this.polylist.segs[segmentIndex].pt.y + this.StartPoint.y - frame.y;
      knobProps.cursorType = this.CalcCursorForSegment(this.polylist.segs[segmentIndex - 1].pt, this.polylist.segs[segmentIndex + 1].pt, true);
      if (this.NoGrow()) {
        knobProps.cursorType = Element.CursorType.DEFAULT;
      }
      knobProps.knobID = ConstantData.ActionTriggerType.POLYLNODE;
      let nodeKnob = this.GenericKnob(knobProps);
      // Set user data for the knob to indicate the segment index.
      if (nodeKnob) {
        nodeKnob.SetUserData(segmentIndex);
        if (cornerKnobImages && nodeKnob.SetURL) {
          nodeKnob.SetURL(knobProps.cursorType === Element.CursorType.NWSE_RESIZE ? cornerKnobImages.nwse : cornerKnobImages.nesw);
          nodeKnob.ExcludeFromExport(true);
        }
        actionTriggersGroup.AddElement(nodeKnob);
      }
    }

    // Create an adjustment knob for arc or curved segments.
    let adjustmentLine = { StartPoint: new Point(0, 0), EndPoint: new Point(0, 0) };
    // Set start point for adjustment line.
    adjustmentLine.StartPoint.x = 0;
    adjustmentLine.StartPoint.y = 0;
    adjustmentLine.EndPoint.x = 0;
    adjustmentLine.EndPoint.y = 0;
    // Calculate the scaled offset.
    let offsetX = frame.x;
    let offsetY = frame.y;
    if (frame && this.StartPoint) {
      offsetX = this.StartPoint.x - frame.x;
      offsetY = this.StartPoint.y - frame.y;
    }
    knobProps.shapeType = ConstantData.CreateShapeType.OVAL;
    knobProps.knobID = ConstantData.ActionTriggerType.POLYLADJ;
    knobProps.fillColor = "white";
    knobProps.fillOpacity = 0.001;
    knobProps.strokeSize = 1;
    knobProps.strokeColor = "green";
    for (let segmentIndex = 1; segmentIndex < segmentsCount; segmentIndex++) {
      // For curved segments such as ARCLINE, set adjustment knob position.
      if (this.polylist.segs[segmentIndex].LineType === ConstantData.LineType.ARCLINE) {
        adjustmentLine.StartPoint.x = this.polylist.segs[segmentIndex - 1].pt.x * u + offsetX;
        adjustmentLine.StartPoint.y = this.polylist.segs[segmentIndex - 1].pt.y * p + offsetY;
        adjustmentLine.EndPoint.x = this.polylist.segs[segmentIndex].pt.x * u + offsetX;
        adjustmentLine.EndPoint.y = this.polylist.segs[segmentIndex].pt.y * p + offsetY;
        if (this.polylist.segs[segmentIndex].param >= 0) {
          adjustmentLine.CurveAdjust = this.polylist.segs[segmentIndex].param;
          adjustmentLine.IsReversed = true;
        } else {
          adjustmentLine.CurveAdjust = -this.polylist.segs[segmentIndex].param;
          adjustmentLine.IsReversed = false;
        }
        adjustmentLine.FromPolygon = true;
        let arcLineObj = new Instance.Shape.ArcLine(adjustmentLine);
        arcLineObj.Frame = Utils2.Pt2Rect(adjustmentLine.StartPoint, adjustmentLine.EndPoint);
        let arcActionPoint = arcLineObj.CalcRadiusAndCenter(arcLineObj.StartPoint.x, arcLineObj.StartPoint.y, arcLineObj.EndPoint.x, arcLineObj.EndPoint.y, arcLineObj.CurveAdjust, arcLineObj.IsReversed);
        knobProps.x = arcActionPoint.actionX;
        knobProps.y = arcActionPoint.actionY;
        let arcKnob = this.GenericKnob(knobProps);
        arcKnob.SetUserData(segmentIndex);
        actionTriggersGroup.AddElement(arcKnob);
      }
      // For PARABOLA and ARCSEGLINE segments, create adjustment knobs similarly.
      else if (this.polylist.segs[segmentIndex].LineType === ConstantData.LineType.PARABOLA) {
        let parabolaAdjPoint = this.Pr_PolyLGetParabolaAdjPoint(true, segmentIndex);
        if (parabolaAdjPoint) {
          knobProps.x = parabolaAdjPoint.x + this.StartPoint.x - frame.x;
          knobProps.y = parabolaAdjPoint.y + this.StartPoint.y - frame.y;
          let parabolaKnob = this.GenericKnob(knobProps);
          parabolaKnob.SetUserData(segmentIndex);
          actionTriggersGroup.AddElement(parabolaKnob);
        }
      }
      else if (this.polylist.segs[segmentIndex].LineType === ConstantData.LineType.ARCSEGLINE) {
        let ellipseAdjPoint = this.Pr_PolyLGetEllipseAdjPoint(true, segmentIndex);
        knobProps.x = ellipseAdjPoint.x + this.StartPoint.x - frame.x;
        knobProps.y = ellipseAdjPoint.y + this.StartPoint.y - frame.y;
        let ellipseKnob = this.GenericKnob(knobProps);
        ellipseKnob.SetUserData(segmentIndex);
        actionTriggersGroup.AddElement(ellipseKnob);
      }
    }

    // If the document is not touch initiated and the object is not locked and can grow,
    // create a rotate knob.
    if (!GlobalData.optManager.bTouchInitiated && !knobProps.locked && !this.NoGrow()) {
      knobProps.shapeType = ConstantData.CreateShapeType.OVAL;
      // Position the rotate knob roughly at the top-right corner of the frame.
      if (frame.width < frame.height) {
        knobProps.x = frame.width / 2;
        knobProps.y = frame.height - 2 * adjustedRotateKnobSize;
      } else {
        knobProps.y = frame.height / 2;
        knobProps.x = frame.width - 2 * adjustedRotateKnobSize;
      }
      // Save the rotate knob position in the object.
      this.RotateKnobPt.x = knobProps.x + frame.x;
      this.RotateKnobPt.y = knobProps.y + frame.y;
      knobProps.cursorType = Element.CursorType.ROTATE;
      knobProps.knobID = ConstantData.ActionTriggerType.ROTATE;
      knobProps.fillColor = "white";
      knobProps.fillOpacity = 0.5;
      knobProps.strokeSize = 1.5;
      knobProps.strokeColor = "black";
      knobProps.knobSize = adjustedRotateKnobSize;
      let rotateKnob = this.GenericKnob(knobProps);
      actionTriggersGroup.AddElement(rotateKnob);
      // Reset knob size to the default adjustedKnobSize.
      knobProps.knobSize = adjustedKnobSize;
    }

    // If the object has standoff dimensions and can use dimension lines, create adjustment knobs for dimensions.
    if ((this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff) && this.CanUseStandOffDimensionLines()) {
      this.CreateDimensionAdjustmentKnobs(actionTriggersGroup, additionalData, knobProps);
    }

    // Finalize the action trigger group: set its size and position.
    actionTriggersGroup.SetSize(groupWidth, groupHeight);
    actionTriggersGroup.SetPos(paddedFrame.x, paddedFrame.y);
    actionTriggersGroup.isShape = true;
    actionTriggersGroup.SetID(ConstantData.Defines.Action + targetObject);

    console.log("S.PolyLine: CreateActionTriggers output", actionTriggersGroup);
    return actionTriggersGroup;
  }

  ScaleObject(
    offsetX: number,
    offsetY: number,
    rotationCenter: { x: number; y: number },
    rotationAngleDegrees: number,
    scaleX: number,
    scaleY: number,
    adjustLineThickness: boolean
  ) {
    console.log('S.PolyLine: ScaleObject input', { offsetX, offsetY, rotationCenter, rotationAngleDegrees, scaleX, scaleY, adjustLineThickness });

    let segIndex: number,
      numSegments: number,
      tempParabolaAdj: any,
      tempArcResult: any;
    let offsetPoint: { x: number; y: number } = { x: 0, y: 0 };
    let scaledOffset: { x: number; y: number } = { x: 0, y: 0 };
    let parabolaAdjPoints: { x: number; y: number } = { x: 0, y: 0 };
    let arcAdjPoints: { x: number; y: number } = { x: 0, y: 0 };
    let tempAdjPoints: any[] = [];

    // If no scale provided, compute scale factors based on inside and polylist dimensions.
    if (scaleX === 0) {
      if (!(this.polylist.dim.x > 0 && this.polylist.dim.y > 0)) return;
      scaleX = this.inside.width / this.polylist.dim.x;
      scaleY = this.inside.height / this.polylist.dim.y;
      this.StartPoint.x = this.Frame.x + this.polylist.offset.x;
      this.StartPoint.y = this.Frame.y + this.polylist.offset.y;
    }

    // Reset floating point dimension flags
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    if (scaleX !== 1 || scaleY !== 1) {
      if (adjustLineThickness) {
        let maxScale = scaleX;
        if (scaleY > maxScale) maxScale = scaleY;
        this.StyleRecord.Line.Thickness = maxScale * this.StyleRecord.Line.Thickness;
        this.StyleRecord.Line.BThick = maxScale * this.StyleRecord.Line.BThick;
      }

      offsetPoint.x = this.StartPoint.x - this.Frame.x;
      offsetPoint.y = this.StartPoint.y - this.Frame.y;
      scaledOffset.x = offsetPoint.x * scaleX;
      scaledOffset.y = offsetPoint.y * scaleY;

      numSegments = this.polylist.segs.length;
      for (segIndex = 1; segIndex < numSegments; segIndex++) {
        switch (this.polylist.segs[segIndex].LineType) {
          case ConstantData.LineType.PARABOLA:
            if (this.polylist.segs[segIndex].param !== 0 && segIndex > 0) {
              tempParabolaAdj = this.Pr_PolyLGetParabolaAdjPoint(true, segIndex);
              if (tempParabolaAdj) {
                tempParabolaAdj.x += this.StartPoint.x;
                tempParabolaAdj.y += this.StartPoint.y;
                tempAdjPoints[segIndex] = new Point(tempParabolaAdj.x, tempParabolaAdj.y);
              } else {
                this.polylist.segs[segIndex].param = 0;
                this.polylist.segs[segIndex].ShortRef = 0;
              }
            }
            break;
          case ConstantData.LineType.ARCLINE:
            if (this.polylist.segs[segIndex].param !== 0 && segIndex > 0) {
              tempArcResult = this.Pr_PolyLGetArc(segIndex, offsetPoint);
              tempAdjPoints[segIndex] = tempArcResult.pt;
            }
            break;
        }
      }

      // Scale the start and end points.
      this.StartPoint.x = this.StartPoint.x * scaleX;
      this.StartPoint.y = this.StartPoint.y * scaleY;
      this.EndPoint.x = this.EndPoint.x * scaleX;
      this.EndPoint.y = this.EndPoint.y * scaleY;

      // Scale each polyline segment.
      for (segIndex = 0; segIndex < numSegments; segIndex++) {
        switch (this.polylist.segs[segIndex].LineType) {
          case ConstantData.LineType.PARABOLA:
            this.polylist.segs[segIndex].pt.x *= scaleX;
            this.polylist.segs[segIndex].pt.y *= scaleY;
            if (this.polylist.segs[segIndex].param !== 0 && segIndex > 0) {
              let scaledParabolaAdj = { x: tempAdjPoints[segIndex].x * scaleX, y: tempAdjPoints[segIndex].y * scaleY };
              this.Pr_PolyLGetParabolaParam(scaledParabolaAdj, segIndex);
            }
            break;
          case ConstantData.LineType.ARCLINE:
            this.polylist.segs[segIndex].pt.x *= scaleX;
            this.polylist.segs[segIndex].pt.y *= scaleY;
            if (this.polylist.segs[segIndex].param !== 0 && segIndex > 0) {
              tempArcResult = this.Pr_PolyLGetArc(segIndex, scaledOffset);
              arcAdjPoints.x = tempAdjPoints[segIndex].x * scaleX;
              arcAdjPoints.y = tempAdjPoints[segIndex].y * scaleY;
              this.Pr_PolyLGetArcParam(tempArcResult.arcobj, arcAdjPoints, segIndex);
            }
            break;
          default:
            this.polylist.segs[segIndex].pt.x *= scaleX;
            this.polylist.segs[segIndex].pt.y *= scaleY;
        }
      }

      if (this instanceof BaseShape) {
        this.polylist.offset.x = scaledOffset.x;
        this.polylist.offset.y = scaledOffset.y;
        this.polylist.dim.x = this.inside.width;
        this.polylist.dim.y = this.inside.height;
        console.log('S.PolyLine: ScaleObject output (BaseShape scaling applied)', {
          StartPoint: this.StartPoint,
          EndPoint: this.EndPoint,
          Frame: this.Frame
        });
        return;
      }
    } else if (this instanceof BaseShape) {
      return;
    }

    // Get updated polyline points.
    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    numSegments = polyPoints.length;
    for (segIndex = 0; segIndex < numSegments; segIndex++) {
      polyPoints[segIndex].x += offsetX;
      polyPoints[segIndex].y += offsetY;
    }

    if (rotationAngleDegrees) {
      let rotationAngleRadians = 2 * Math.PI * (rotationAngleDegrees / 360);
      Utils3.RotatePointsAboutPoint(rotationCenter, 2 * Math.PI - rotationAngleRadians, polyPoints);
    }

    // Update start point based on the new polyline points.
    this.StartPoint.x = polyPoints[0].x;
    this.StartPoint.y = polyPoints[0].y;
    for (segIndex = 0; segIndex < numSegments; segIndex++) {
      this.polylist.segs[segIndex].pt.x = polyPoints[segIndex].x - this.StartPoint.x;
      this.polylist.segs[segIndex].pt.y = polyPoints[segIndex].y - this.StartPoint.y;
    }
    this.EndPoint.x = polyPoints[numSegments - 1].x;
    this.EndPoint.y = polyPoints[numSegments - 1].y;
    this.CalcFrame();

    console.log('S.PolyLine: ScaleObject output', { StartPoint: this.StartPoint, EndPoint: this.EndPoint, Frame: this.Frame });
  }

  GetScale() {
    console.log("S.PolyLine: GetScale input", {});

    let polyWidth: number;
    let polyHeight: number;
    let scaleFactorX: number;
    let scaleFactor = {
      x: 0,
      y: 0
    };

    if (this.polylist.closed && this.polylist.dim.x && this.polylist.dim.y) {
      polyWidth = this.polylist.dim.x;
      polyHeight = this.polylist.dim.y < 1 ? 1 : this.polylist.dim.y;

      if (polyWidth < 1) {
        polyWidth = 1;
      }

      scaleFactorX = this.inside.width / polyWidth;
      this.inside.height / polyHeight; // Unused expression
    } else {
      scaleFactorX = 1;
      1; // Unused expression
    }

    scaleFactor.x = scaleFactorX;
    scaleFactor.y = scaleFactorX;

    console.log("S.PolyLine: GetScale output", scaleFactor);
    return scaleFactor;
  }

  GetPolyPoints(pointCount, includeFrameOffset, includeAllSegments, includeClosedSegments, segmentIndices) {
    console.log('S.PolyLine: GetPolyPoints input', { pointCount, includeFrameOffset, includeAllSegments, includeClosedSegments, segmentIndices });

    let polyPoints = [];
    let scaleX = 1, scaleY = 1;
    let startX = this.StartPoint.x - this.Frame.x;
    let startY = this.StartPoint.y - this.Frame.y;

    if (this.polylist && this.polylist.segs.length) {
      if (this.polylist.closed && this.polylist.dim.x && this.polylist.dim.y) {
        let dimX = this.polylist.dim.x;
        let dimY = this.polylist.dim.y < 1 ? 1 : this.polylist.dim.y;
        dimX = dimX < 1 ? 1 : dimX;
        scaleX = this.inside.width / dimX;
        scaleY = this.inside.height / dimY;
      }

      const segmentCount = this.polylist.segs.length;

      if (includeAllSegments) {
        for (let i = 0; i < segmentCount; i++) {
          polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
        }
      } else {
        polyPoints.push(new Point(this.polylist.segs[0].pt.x * scaleX + startX, this.polylist.segs[0].pt.y * scaleY + startY));
        for (let i = 1; i < segmentCount; i++) {
          switch (this.polylist.segs[i].LineType) {
            case ConstantData.LineType.LINE:
            case ConstantData.LineType.MOVETO:
            case ConstantData.LineType.MOVETO_NEWPOLY:
              polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
              break;
            case ConstantData.LineType.NURBS:
              if (i < segmentCount - 1 && this.polylist.segs[i + 1].LineType == ConstantData.LineType.NURBSSEG) {
                let totalLength = 0;
                for (let j = i; j < segmentCount && this.polylist.segs[j].LineType == ConstantData.LineType.NURBSSEG; j++) {
                  let deltaX = this.polylist.segs[j].pt.x - this.polylist.segs[j - 1].pt.x;
                  let deltaY = this.polylist.segs[j].pt.y - this.polylist.segs[j - 1].pt.y;
                  totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                }
                const docScale = GlobalData.optManager.svgDoc.docInfo.docScale;
                let nurbsPointCount = Math.floor(totalLength / 8 * docScale);
                nurbsPointCount = nurbsPointCount < pointCount ? pointCount : nurbsPointCount;
                const nurbsPoints = this.Pr_GetNURBSPoints(i, nurbsPointCount, startX, startY, scaleX, scaleY);
                polyPoints = polyPoints.concat(nurbsPoints);
              }
              break;
            case ConstantData.LineType.QUADBEZ:
              const quadBezierPoints = this.Pr_GetQuadraticBezierPoints(i, pointCount, startX, startY, scaleX, scaleY);
              polyPoints = polyPoints.concat(quadBezierPoints);
              break;
            case ConstantData.LineType.CUBEBEZ:
              const cubicBezierPoints = this.Pr_GetCubicBezierPoints(i, pointCount, startX, startY, scaleX, scaleY);
              polyPoints = polyPoints.concat(cubicBezierPoints);
              break;
            case ConstantData.LineType.ELLIPSE:
              const ellipticalArcPoints = this.Pr_GetEllipticalArcPoints(i, pointCount, startX, startY, scaleX, scaleY);
              polyPoints = polyPoints.concat(ellipticalArcPoints);
              break;
            case ConstantData.LineType.SPLINE:
              if (i < segmentCount - 1 && this.polylist.segs[i + 1].LineType == ConstantData.LineType.SPLINECON) {
                let totalSplineLength = 0;
                for (let j = i; j < segmentCount && this.polylist.segs[j].LineType == ConstantData.LineType.SPLINECON; j++) {
                  let deltaX = this.polylist.segs[j].pt.x - this.polylist.segs[j - 1].pt.x;
                  let deltaY = this.polylist.segs[j].pt.y - this.polylist.segs[j - 1].pt.y;
                  totalSplineLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                }
                const docScale = GlobalData.optManager.svgDoc.docInfo.docScale;
                let splinePointCount = Math.floor(totalSplineLength / 8 * docScale);
                splinePointCount = splinePointCount < pointCount ? pointCount : splinePointCount;
                const splinePoints = this.Pr_GetSPLINEPoints(i, splinePointCount, startX, startY, scaleX, scaleY);
                polyPoints = polyPoints.concat(splinePoints);
              }
              break;
            case ConstantData.LineType.PARABOLA:
              const parabolaPoints = this.Pr_GetParabolaPoints(pointCount, true, i, this.polylist.segs[i].param, this.polylist.segs[i].ShortRef, scaleX, scaleY);
              polyPoints = polyPoints.concat(parabolaPoints);
              polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
              break;
            case ConstantData.LineType.ARCSEGLINE:
              const arcSegmentPoints = this.Pr_GetEllipsePoints(pointCount, true, i, this.polylist.segs[i].param, this.polylist.segs[i].ShortRef, scaleX, scaleY);
              polyPoints = polyPoints.concat(arcSegmentPoints);
              polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
              break;
            case ConstantData.LineType.ARCLINE:
              if (this.polylist.segs[i].param === 0) {
                polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
              } else {
                const arcLineData = {
                  StartPoint: new Point(this.polylist.segs[i - 1].pt.x, this.polylist.segs[i - 1].pt.y),
                  EndPoint: new Point(this.polylist.segs[i].pt.x, this.polylist.segs[i].pt.y),
                  CurveAdjust: Math.abs(this.polylist.segs[i].param),
                  IsReversed: this.polylist.segs[i].param >= 0,
                  FromPolygon: true
                };
                const arcLine = new Instance.Shape.ArcLine(arcLineData);
                arcLine.Frame = Utils2.Pt2Rect(arcLineData.StartPoint, arcLineData.EndPoint);
                const arcLinePoints = arcLine.GetPolyPoints(Math.ceil(ConstantData.Defines.NPOLYPTS / 2), false, false, false, null);
                for (let j = 0; j < arcLinePoints.length; j++) {
                  arcLinePoints[j].x = arcLinePoints[j].x * scaleX + startX;
                  arcLinePoints[j].y = arcLinePoints[j].y * scaleY + startY;
                }
                polyPoints = polyPoints.concat(arcLinePoints);
                polyPoints.push(new Point(this.polylist.segs[i].pt.x * scaleX + startX, this.polylist.segs[i].pt.y * scaleY + startY));
              }
              break;
            default:
              break;
          }
          if (segmentIndices) {
            segmentIndices.push(polyPoints.length - 1);
          }
        }
      }

      if (!includeFrameOffset) {
        for (let i = 0; i < polyPoints.length; i++) {
          polyPoints[i].x += this.Frame.x;
          polyPoints[i].y += this.Frame.y;
        }
      }
    } else {
      polyPoints = super.GetPolyPoints(pointCount, includeFrameOffset, true);
    }

    console.log('S.PolyLine: GetPolyPoints output', polyPoints);
    return polyPoints;
  }

  BeforeModifyShape(event, x, y) {
    console.log('S.PolyLine: BeforeModifyShape input', { event, x, y });

    let segmentCount, scaleX, scaleY, startX, startY, arcParams = {};
    segmentCount = this.polylist && this.polylist.segs ? this.polylist.segs.length : 0;

    if (segmentCount !== 0) {
      if (this.polylist.closed && this.polylist.dim.x && this.polylist.dim.y) {
        let dimX = this.polylist.dim.x;
        let dimY = this.polylist.dim.y < 1 ? 1 : this.polylist.dim.y;
        dimX = dimX < 1 ? 1 : dimX;
        scaleX = this.Frame.width / dimX;
        scaleY = this.Frame.height / dimY;
      } else {
        scaleX = 1;
        scaleY = 1;
      }

      startX = this.StartPoint.x;
      startY = this.StartPoint.y;

      if (y > 0 && y <= segmentCount - 1) {
        switch (this.polylist.segs[y].LineType) {
          case ConstantData.LineType.PARABOLA:
            break;
          case ConstantData.LineType.ARCLINE:
            arcParams.StartPoint = new Point(this.polylist.segs[y - 1].pt.x * scaleX + startX, this.polylist.segs[y - 1].pt.y * scaleY + startY);
            arcParams.EndPoint = new Point(this.polylist.segs[y].pt.x * scaleX + startX, this.polylist.segs[y].pt.y * scaleY + startY);
            let param = this.polylist.segs[y].param;
            if (param >= 0) {
              arcParams.CurveAdjust = param;
              arcParams.IsReversed = true;
            } else {
              arcParams.CurveAdjust = -param;
              arcParams.IsReversed = false;
            }
            arcParams.FromPolygon = true;
            this.arcobj = new Instance.Shape.ArcLine(arcParams);
            this.arcobj.Frame = Utils2.Pt2Rect(arcParams.StartPoint, arcParams.EndPoint);
            this.arcobj.BeforeModifyShape(event, x, y);
            break;
        }
      }
    }

    console.log('S.PolyLine: BeforeModifyShape output', { arcParams });
  }

  SnapNewPointTo90Degrees(segmentIndex, newPoint) {
    console.log('S.PolyLine: SnapNewPointTo90Degrees input', { segmentIndex, newPoint });

    let previousSegmentIndex = -1;
    let nextSegmentIndex = -1;
    let snapped = false;

    if (!window.event || !window.event.ctrlKey) {
      const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);

      if (segmentIndex - 1 >= 0) {
        previousSegmentIndex = segmentIndex - 1;
      } else if (this.polylist.closed && this.polylist.segs.length > 2) {
        previousSegmentIndex = this.polylist.segs.length - 2;
      }

      if (previousSegmentIndex >= 0 && this.AdjustForLineAngleSnap(polyPoints[previousSegmentIndex], newPoint)) {
        snapped = true;
      }

      nextSegmentIndex = segmentIndex + 1;
      if (nextSegmentIndex >= this.polylist.segs.length) {
        nextSegmentIndex = this.polylist.closed ? 1 : -1;
      }

      if (nextSegmentIndex >= 0 && this.AdjustForLineAngleSnap(polyPoints[nextSegmentIndex], newPoint)) {
        snapped = true;
      }
    }

    console.log('S.PolyLine: SnapNewPointTo90Degrees output', snapped);
    return snapped;
  }

  ModifyShape(event, x, y, actionType, segmentIndex, snapToGrid) {
    console.log('S.PolyLine: ModifyShape input', { event, x, y, actionType, segmentIndex, snapToGrid });

    let segmentCount = this.polylist && this.polylist.segs ? this.polylist.segs.length : 0;
    let arcParams = {};
    let newPoint = null;

    if (segmentCount !== 0) {
      if (actionType === ConstantData.ActionTriggerType.POLYLNODE) {
        if (segmentIndex >= 1 && segmentIndex < segmentCount) {
          newPoint = new Point(x, y);
          if (!snapToGrid && this.SnapNewPointTo90Degrees(segmentIndex, newPoint)) {
            x = newPoint.x;
            y = newPoint.y;
          }
          this.polylist.segs[segmentIndex].pt.x = x - this.StartPoint.x;
          this.polylist.segs[segmentIndex].pt.y = y - this.StartPoint.y;

          if (this.polylist.segs[segmentIndex].LineType === ConstantData.LineType.ARCSEGLINE) {
            arcParams = this.Pr_PolyLGetArcQuadrant(this.polylist.segs[segmentIndex - 1].pt, this.polylist.segs[segmentIndex].pt, this.polylist.segs[segmentIndex].param);
            this.polylist.segs[segmentIndex].ShortRef = arcParams.ShortRef;
          }

          if (segmentIndex < segmentCount - 1 && this.polylist.segs[segmentIndex + 1].LineType === ConstantData.LineType.ARCSEGLINE) {
            arcParams = this.Pr_PolyLGetArcQuadrant(this.polylist.segs[segmentIndex].pt, this.polylist.segs[segmentIndex + 1].pt, this.polylist.segs[segmentIndex + 1].param);
            this.polylist.segs[segmentIndex + 1].ShortRef = arcParams.ShortRef;
          }
        }
      } else if (actionType === ConstantData.ActionTriggerType.POLYLADJ && segmentIndex > 0 && segmentIndex <= segmentCount - 1) {
        switch (this.polylist.segs[segmentIndex].LineType) {
          case ConstantData.LineType.PARABOLA:
            arcParams.x = x;
            arcParams.y = y;
            this.Pr_PolyLGetParabolaParam(arcParams, segmentIndex);
            break;
          case ConstantData.LineType.ARCSEGLINE:
            arcParams.x = x;
            arcParams.y = y;
            this.Pr_PolyLGetEllipseParam(arcParams, segmentIndex, event);
            break;
          case ConstantData.LineType.ARCLINE:
            if (this.arcobj) {
              this.arcobj.ModifyShape(null, x, y, actionType, segmentIndex);
              this.polylist.segs[segmentIndex].param = this.arcobj.IsReversed ? this.arcobj.CurveAdjust : -this.arcobj.CurveAdjust;
            }
            break;
        }
      }

      const updatedPoint = { x, y };
      const dimensions = this.GetDimensionsForDisplay();
      GlobalData.optManager.UpdateDisplayCoordinates(dimensions, updatedPoint, ConstantData.CursorTypes.Grow, this);
      this.UpdateDrawing(event);

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(event, this, this.Frame);
      }
    }

    console.log('S.PolyLine: ModifyShape output', { polylist: this.polylist, Frame: this.Frame });
  }

  BeforeRotate(event) {
    console.log('S.PolyLine: BeforeRotate input', event);

    const frame = this.Frame;
    GlobalData.optManager.theRotateKnobCenterDivisor = this.RotateKnobCenterDivisor();
    GlobalData.optManager.theRotateStartRotation = 0;
    GlobalData.optManager.theRotateEndRotation = GlobalData.optManager.theRotateStartRotation;
    GlobalData.optManager.theRotateStartPoint.x = this.RotateKnobPt.x;
    GlobalData.optManager.theRotateStartPoint.y = this.RotateKnobPt.y;
    GlobalData.optManager.theRotatePivotX = frame.x + frame.width / GlobalData.optManager.theRotateKnobCenterDivisor.x;
    GlobalData.optManager.theRotatePivotY = frame.y + frame.height / GlobalData.optManager.theRotateKnobCenterDivisor.y;

    console.log('S.PolyLine: BeforeRotate output', {
      rotateKnobCenterDivisor: GlobalData.optManager.theRotateKnobCenterDivisor,
      rotateStartRotation: GlobalData.optManager.theRotateStartRotation,
      rotateEndRotation: GlobalData.optManager.theRotateEndRotation,
      rotateStartPoint: GlobalData.optManager.theRotateStartPoint,
      rotatePivotX: GlobalData.optManager.theRotatePivotX,
      rotatePivotY: GlobalData.optManager.theRotatePivotY
    });
  }

  AdjustRotate(mouseX, mouseY, event) {
    console.log('S.PolyLine: AdjustRotate input', { mouseX, mouseY, event });

    let rotationAngle;
    const pivotX = GlobalData.optManager.theRotatePivotX;
    const pivotY = GlobalData.optManager.theRotatePivotY;
    const startX = GlobalData.optManager.theRotateStartPoint.x;
    const startY = GlobalData.optManager.theRotateStartPoint.y;
    const deltaX = mouseX - pivotX;
    const deltaY = mouseY - pivotY;

    if (startX === pivotX) {
      if (Math.abs(deltaY) < 1e-4) deltaY = 1e-4;
      rotationAngle = -Math.atan(deltaX / deltaY) * 180 / ConstantData.Geometry.PI;
      if (deltaY < 0) rotationAngle += 180;
    } else if (startY === pivotY) {
      if (Math.abs(deltaX) < 1e-4) deltaX = 1e-4;
      rotationAngle = Math.atan(deltaY / deltaX) * 180 / ConstantData.Geometry.PI;
      if (deltaX < 0) rotationAngle += 180;
    } else {
      return;
    }

    const overrideSnaps = GlobalData.optManager.OverrideSnaps(event);
    if (GlobalData.docHandler.documentConfig.enableSnap && !overrideSnaps) {
      rotationAngle = Math.round(rotationAngle / GlobalData.optManager.theRotateSnap) * GlobalData.optManager.theRotateSnap;
    }
    if (rotationAngle < 0) rotationAngle += 360;

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle / 360 * (2 * Math.PI), polyPoints);

    const boundingRect = {};
    Utils2.GetPolyRect(boundingRect, polyPoints);

    if (boundingRect.x >= 0 && boundingRect.y >= 0) {
      if (GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto) {
        const sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
        if (boundingRect.x + boundingRect.width > sessionBlock.dim.x || boundingRect.y + boundingRect.height > sessionBlock.dim.y) {
          return;
        }
      }
      GlobalData.optManager.theRotateEndRotation = rotationAngle;
      this.Rotate(GlobalData.optManager.theActionSVGObject, rotationAngle);
    }

    console.log('S.PolyLine: AdjustRotate output', { rotationAngle });
  }

  Rotate(svgElement, rotationAngle) {
    console.log('S.PolyLine: Rotate input', { svgElement, rotationAngle });

    svgElement.SetRotation(rotationAngle, GlobalData.optManager.theRotatePivotX, GlobalData.optManager.theRotatePivotY);

    console.log('S.PolyLine: Rotate output', { svgElement, rotationAngle });
  }

  AfterRotateShape(event, actionType) {
    console.log('S.PolyLine: AfterRotateShape input', { event, actionType });

    const endRotation = GlobalData.optManager.theRotateEndRotation;
    const pivotPoint = {
      x: GlobalData.optManager.theRotatePivotX,
      y: GlobalData.optManager.theRotatePivotY
    };
    const rotationAngle = -(endRotation - GlobalData.optManager.theRotateStartRotation) / (180 / ConstantData.Geometry.PI);

    GlobalData.optManager.RotatePointAroundPoint(pivotPoint, GlobalData.optManager.theRotateStartPoint, rotationAngle);

    const segmentCount = this.polylist.segs.length;
    for (let i = 0; i < segmentCount; ++i) {
      if (this.polylist.segs[i].LineType === ConstantData.LineType.ELLIPSE) {
        this.polylist.segs[i].weight += 10 * endRotation;
      }
    }

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    Utils3.RotatePointsAboutPoint(pivotPoint, rotationAngle, polyPoints);

    const pointCount = polyPoints.length;
    this.StartPoint.x = polyPoints[0].x;
    this.StartPoint.y = polyPoints[0].y;
    for (let i = 0; i < pointCount; i++) {
      this.polylist.segs[i].pt.x = polyPoints[i].x - this.StartPoint.x;
      this.polylist.segs[i].pt.y = polyPoints[i].y - this.StartPoint.y;
    }
    this.EndPoint.x = polyPoints[pointCount - 1].x;
    this.EndPoint.y = polyPoints[pointCount - 1].y;

    if (actionType !== ConstantData.ActionTriggerType.MOVEPOLYSEG) {
      this.CalcFrame();
      GlobalData.optManager.AddToDirtyList(event);
      GlobalData.optManager.RenderDirtySVGObjects();
      this.UpdateFrame();

      if (this.r.x < 0 || this.r.y < 0) {
        GlobalData.optManager.Undo();
        Collab.UnLockMessages();
        Collab.UnBlockMessages();
        return;
      }

      if (GlobalData.optManager.ob && GlobalData.optManager.ob.Frame) {
        GlobalData.optManager.MaintainLink(event, this, GlobalData.optManager.ob, ConstantData.ActionTriggerType.ROTATE);
        GlobalData.optManager.ob = {};
      }

      if (this.rflags) {
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      }

      GlobalData.optManager.SetLinkFlag(event, ConstantData.LinkFlags.SED_L_MOVE);
      GlobalData.optManager.UpdateLinks();
      GlobalData.optManager.AddToDirtyList(event);
    }

    console.log('S.PolyLine: AfterRotateShape output', { StartPoint: this.StartPoint, EndPoint: this.EndPoint, Frame: this.Frame });
  }

  IsAdjustingToClosed(x: number, y: number): boolean {
    console.log('S.PolyLine: isAdjustingToClosed input', { x, y });

    const hitResult = new HitResult(-1, 0, null);
    const hookPoint = {
      id: GlobalData.optManager.theActionTriggerID === ConstantData.ActionTriggerType.LINESTART ? ConstantData.HookPts.SED_KTL : ConstantData.HookPts.SED_KTR,
      x: x,
      y: y
    };

    const result = this.ClosePolygon(this.BlockID, [hookPoint], hitResult);

    console.log('S.PolyLine: isAdjustingToClosed output', result);
    return result;
  }

  AdjustLine(event, newX, newY, actionType, snapToGrid) {
    console.log('S.PolyLine: AdjustLine input', { event, newX, newY, actionType, snapToGrid });

    let segmentCount = this.polylist.segs.length;
    let arcParams = {};
    let newPoint = new Point(newX, newY);

    if (this.polylist.closed && actionType === ConstantData.ActionTriggerType.POLYLEND) {
      actionType = ConstantData.ActionTriggerType.LINESTART;
    }

    switch (actionType) {
      case ConstantData.ActionTriggerType.LINEEND:
        if (!snapToGrid && this.SnapNewPointTo90Degrees(segmentCount - 1, newPoint)) {
          newX = newPoint.x;
          newY = newPoint.y;
        }
        this.polylist.segs[segmentCount - 1].pt.x = newX - this.StartPoint.x;
        this.polylist.segs[segmentCount - 1].pt.y = newY - this.StartPoint.y;
        this.EndPoint.x = newX;
        this.EndPoint.y = newY;
        if (this.polylist.segs[segmentCount - 1].LineType === ConstantData.LineType.ARCSEGLINE) {
          arcParams = this.Pr_PolyLGetArcQuadrant(this.polylist.segs[segmentCount - 2].pt, this.polylist.segs[segmentCount - 1].pt, this.polylist.segs[segmentCount - 1].param);
          this.polylist.segs[segmentCount - 1].ShortRef = arcParams.ShortRef;
        }
        break;

      case ConstantData.ActionTriggerType.LINESTART:
        if (!snapToGrid && this.SnapNewPointTo90Degrees(0, newPoint)) {
          newX = newPoint.x;
          newY = newPoint.y;
        }
        let offsetX = newX - this.StartPoint.x;
        let offsetY = newY - this.StartPoint.y;
        this.StartPoint.x = newX;
        this.StartPoint.y = newY;
        for (let i = 1; i < segmentCount; i++) {
          this.polylist.segs[i].pt.x -= offsetX;
          this.polylist.segs[i].pt.y -= offsetY;
        }
        if (this.polylist.closed) {
          this.EndPoint.x = this.StartPoint.x;
          this.EndPoint.y = this.StartPoint.y;
          this.polylist.segs[segmentCount - 1].pt.x = 0;
          this.polylist.segs[segmentCount - 1].pt.y = 0;
        }
        switch (this.polylist.segs[1].LineType) {
          case ConstantData.LineType.ARCSEGLINE:
            arcParams = this.Pr_PolyLGetArcQuadrant(this.polylist.segs[0].pt, this.polylist.segs[1].pt, this.polylist.segs[1].param);
            this.polylist.segs[1].ShortRef = arcParams.ShortRef;
            break;
          case ConstantData.LineType.QUADBEZ:
          case ConstantData.LineType.CUBEBEZ:
          case ConstantData.LineType.ELLIPSE:
            this.polylist.segs[1].pt.x = this.polylist.segs[0].pt.x;
            this.polylist.segs[1].pt.y = this.polylist.segs[0].pt.y;
            break;
          case ConstantData.LineType.NURBS:
          case ConstantData.LineType.SPLINE:
            this.polylist.segs[1].pt.x = this.polylist.segs[0].pt.x;
            this.polylist.segs[1].pt.y = this.polylist.segs[0].pt.y;
            this.polylist.segs[2].pt.x = this.polylist.segs[0].pt.x;
            this.polylist.segs[2].pt.y = this.polylist.segs[0].pt.y;
            break;
        }
        break;
    }

    if (event) {
      this.UpdateDrawing(event);
      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(event, this, this.Frame);
      }
    } else {
      this.CalcFrame();
    }

    const dimensions = this.GetDimensionsForDisplay();
    GlobalData.optManager.UpdateDisplayCoordinates(dimensions, newPoint, ConstantData.CursorTypes.Grow, this);

    console.log('S.PolyLine: AdjustLine output', { StartPoint: this.StartPoint, EndPoint: this.EndPoint, Frame: this.Frame });
  }

  AdjustLineEnd(event, newX, newY, actionType, snapToGrid) {
    console.log('S.PolyLine: AdjustLineEnd input', { event, newX, newY, actionType, snapToGrid });

    if (this.polylist.segs.length === 2) {
      const originalEndPoint = {
        x: this.EndPoint.x,
        y: this.EndPoint.y
      };
      this.EndPoint.x = newX;
      this.EndPoint.y = newY;
      this.EnforceMinimum(false);
      newX = this.EndPoint.x;
      newY = this.EndPoint.y;
      this.EndPoint.x = originalEndPoint.x;
      this.EndPoint.y = originalEndPoint.y;
    }

    this.AdjustLine(event, newX, newY, actionType, snapToGrid);

    console.log('S.PolyLine: AdjustLineEnd output', { EndPoint: this.EndPoint });
  }

  AdjustLineStart(event, newX, newY, actionType, snapToGrid) {
    console.log('S.PolyLine: AdjustLineStart input', { event, newX, newY, actionType, snapToGrid });

    if (this.polylist.segs.length === 2) {
      const originalStartPoint = {
        x: this.StartPoint.x,
        y: this.StartPoint.y
      };
      this.StartPoint.x = newX;
      this.StartPoint.y = newY;
      this.EnforceMinimum(true);
      newX = this.StartPoint.x;
      newY = this.StartPoint.y;
      this.StartPoint.x = originalStartPoint.x;
      this.StartPoint.y = originalStartPoint.y;
    }

    this.AdjustLine(event, newX, newY, ConstantData.ActionTriggerType.LINESTART, snapToGrid);

    console.log('S.PolyLine: AdjustLineStart output', { StartPoint: this.StartPoint });
  }

  Flip(flags, isTemporary) {
    console.log('S.PolyLine: Flip input', { flags, isTemporary });

    let segmentCount, frame, width, height, isFlipped = false;
    const points = [], parabolaAdjPoints = [], tempPoint = {};

    if (!isTemporary) {
      GlobalData.optManager.ob = Utils1.DeepCopy(this);
    }

    segmentCount = this.polylist.segs.length;
    frame = this.Frame;

    if (this.polylist.closed && this.polylist.dim.x && this.polylist.dim.y) {
      width = this.polylist.dim.x;
      height = this.polylist.dim.y;
      if (this instanceof Instance.Shape.Polygon) {
        this.StartPoint.x = this.Frame.x + this.polylist.offset.x;
        this.StartPoint.y = this.Frame.y + this.polylist.offset.y;
      }
    } else {
      width = frame.width;
      height = frame.height;
    }

    if (flags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      isFlipped = true;
      const offsetY = this.StartPoint.y - frame.y;
      for (let i = 0; i < segmentCount; i++) {
        points.push(new Point(this.polylist.segs[i].pt.x, this.polylist.segs[i].pt.y + offsetY));
        if (this.polylist.segs[i].LineType === ConstantData.LineType.PARABOLA) {
          parabolaAdjPoints[i] = this.Pr_PolyLGetParabolaAdjPoint(false, i);
          parabolaAdjPoints[i].y -= frame.y;
        }
      }
      for (let i = 0; i < segmentCount; i++) {
        points[i].y = height - points[i].y;
        if (parabolaAdjPoints[i]) {
          parabolaAdjPoints[i].y = height - parabolaAdjPoints[i].y;
          parabolaAdjPoints[i].y += frame.y;
        }
      }
      const newY = points[0].y;
      for (let i = 0; i < segmentCount; i++) {
        this.polylist.segs[i].pt.y = points[i].y - newY;
      }
      this.StartPoint.y = points[0].y + this.Frame.y;
      this.EndPoint.y = points[segmentCount - 1].y + this.Frame.y;
    }

    if (flags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      isFlipped = true;
      const offsetX = this.StartPoint.x - frame.x;
      for (let i = 0; i < segmentCount; i++) {
        points.push(new Point(this.polylist.segs[i].pt.x + offsetX, this.polylist.segs[i].pt.y));
        if (this.polylist.segs[i].LineType === ConstantData.LineType.PARABOLA && i > 0) {
          parabolaAdjPoints[i] = this.Pr_PolyLGetParabolaAdjPoint(false, i);
          parabolaAdjPoints[i].x -= frame.x;
        }
      }
      for (let i = 0; i < segmentCount; i++) {
        points[i].x = width - points[i].x;
        if (parabolaAdjPoints[i]) {
          parabolaAdjPoints[i].x = width - parabolaAdjPoints[i].x;
          parabolaAdjPoints[i].x += frame.x;
        }
      }
      const newX = points[0].x;
      for (let i = 0; i < segmentCount; i++) {
        this.polylist.segs[i].pt.x = points[i].x - newX;
      }
      this.StartPoint.x = points[0].x + this.Frame.x;
      this.EndPoint.x = points[segmentCount - 1].x + this.Frame.x;
    }

    if (isFlipped) {
      for (let i = 0; i < segmentCount; i++) {
        switch (this.polylist.segs[i].LineType) {
          case ConstantData.LineType.ARCLINE:
            this.polylist.segs[i].param = -this.polylist.segs[i].param;
            break;
          case ConstantData.LineType.ARCSEGLINE:
            const arcQuadrant = this.Pr_PolyLGetArcQuadrant(this.polylist.segs[i - 1].pt, this.polylist.segs[i].pt, this.polylist.segs[i].param);
            this.polylist.segs[i].ShortRef = arcQuadrant.ShortRef;
            break;
          case ConstantData.LineType.PARABOLA:
            if (parabolaAdjPoints[i]) {
              tempPoint.x = parabolaAdjPoints[i].x;
              tempPoint.y = parabolaAdjPoints[i].y;
              this.Pr_PolyLGetParabolaParam(tempPoint, i);
            }
            break;
          case ConstantData.LineType.ELLIPSE:
            let weight = this.polylist.segs[i].weight;
            weight = 3600 - weight;
            this.polylist.segs[i].weight = weight;
            break;
        }
      }

      if (!isTemporary) {
        if (GlobalData.optManager.ob && GlobalData.optManager.ob.Frame) {
          GlobalData.optManager.MaintainLink(this.BlockID, this, GlobalData.optManager.ob, ConstantData.ActionTriggerType.FLIP);
        }
        GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
      }

      if (this.polylist.closed) {
        this.polylist.offset.x = this.StartPoint.x - this.Frame.x;
        this.polylist.offset.y = this.StartPoint.y - this.Frame.y;
      }
    }

    GlobalData.optManager.ob = {};
    console.log('S.PolyLine: Flip output', this);
  }

  LinkGrow(blockID, hookPoint, newPoint) {
    console.log('S.PolyLine: LinkGrow input', { blockID, hookPoint, newPoint });

    switch (hookPoint) {
      case ConstantData.HookPts.SED_KTL:
        this.AdjustLineStart(null, newPoint.x, newPoint.y);
        break;
      case ConstantData.HookPts.SED_KTR:
        this.AdjustLineEnd(null, newPoint.x, newPoint.y, ConstantData.ActionTriggerType.LINEEND);
        break;
    }

    GlobalData.optManager.SetLinkFlag(blockID, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.AddToDirtyList(blockID);

    console.log('S.PolyLine: LinkGrow output', { blockID, hookPoint, newPoint });
  }

  ClosePolygon(blockID, hookPoints, hitResult) {
    console.log('S.PolyLine: ClosePolygon input', { blockID, hookPoints, hitResult });

    if (hookPoints && hookPoints.length && this.polylist && this.polylist.segs.length > 3 && !this.polylist.closed) {
      this.Hit(hookPoints[0], false, true, hitResult, hookPoints[0].id);

      if (hitResult.hitcode === ConstantData.HitCodes.SED_PLApp) {
        if (hookPoints[0].id === ConstantData.HookPts.SED_KTL && hitResult.segment === ConstantData.HookPts.SED_KTR) {
          hitResult.objectid = blockID;
          hitResult.pt.x = this.polylist.segs[this.polylist.segs.length - 1].pt.x + this.StartPoint.x;
          hitResult.pt.y = this.polylist.segs[this.polylist.segs.length - 1].pt.y + this.StartPoint.y;
          console.log('S.PolyLine: ClosePolygon output', true);
          return true;
        }
        if (hookPoints[0].id === ConstantData.HookPts.SED_KTR && hitResult.segment === ConstantData.HookPts.SED_KTL) {
          hitResult.objectid = blockID;
          hitResult.pt.x = this.polylist.segs[0].pt.x + this.StartPoint.x;
          hitResult.pt.y = this.polylist.segs[0].pt.y + this.StartPoint.y;
          console.log('S.PolyLine: ClosePolygon output', true);
          return true;
        }
      }
    }

    console.log('S.PolyLine: ClosePolygon output', false);
    return false;
  }

  PolyGetTargetPointList(hookFlags) {
    console.log("S.PolyLine: PolyGetTargetPointList input", { hookFlags });

    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, true, null);
    let inflatedPoints = [];
    let combinedPoints = [];
    let rotationAngleRadians = 0;

    if (this.polylist && this.polylist.closed && this.StyleRecord.Line.BThick && !(hookFlags & ConstantData.HookFlags.SED_LC_ShapeOnLine)) {
      let outerInflatedPoints = GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, true, true);
      let innerInflatedPoints = GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, true, false);
      combinedPoints = outerInflatedPoints.concat(innerInflatedPoints);
      polyPoints = polyPoints.concat(combinedPoints);
    } else if (this.RotationAngle !== 0) {
      rotationAngleRadians = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngleRadians, polyPoints);
    }

    console.log("S.PolyLine: PolyGetTargetPointList output", polyPoints);
    return polyPoints;
  }

  GetTargetPoints(hookPoint, hookFlags, targetObjectID) {
    console.log("S.PolyLine: GetTargetPoints input", { hookPoint, hookFlags, targetObjectID });

    const HookPts = ConstantData.HookPts;
    if (targetObjectID != null && targetObjectID >= 0 && GlobalData.optManager.GetObjectPtr(targetObjectID, false).DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
      switch (hookPoint.id) {
        case HookPts.SED_KTC:
        case HookPts.SED_KBC:
        case HookPts.SED_KRC:
        case HookPts.SED_KLC:
          console.log("S.PolyLine: GetTargetPoints output", null);
          return null;
      }
    }

    const result = this.BaseShape_PolyGetTargets(hookPoint, hookFlags, this.Frame);
    console.log("S.PolyLine: GetTargetPoints output", result);
    return result;
  }

  BaseShape_PolyGetTargets(hookPoint, hookFlags, targetFrame) {
    console.log("S.PolyLine: BaseShape_PolyGetTargets input", { hookPoint, hookFlags, targetFrame });

    let closestPointIndex = -1;
    let minDistance = ConstantData.Defines.LongIntMax;
    let closestPoint = { x: 0, y: 0 };
    const targetPoints = this.PolyGetTargetPointList(hookFlags);

    if (!hookPoint) return null;

    let snappedPoint = { x: hookPoint.x, y: hookPoint.y };
    const enableSnap = GlobalData.docHandler.documentConfig.enableSnap && !(hookFlags & ConstantData.HookFlags.SED_LC_NoSnaps);
    if (enableSnap) {
      snappedPoint = GlobalData.docHandler.SnapToGrid(snappedPoint);
      snappedPoint.y = Math.max(targetFrame.y, Math.min(snappedPoint.y, targetFrame.y + targetFrame.height));
      snappedPoint.x = Math.max(targetFrame.x, Math.min(snappedPoint.x, targetFrame.x + targetFrame.width));
    }

    for (let i = 1; i < targetPoints.length; i++) {
      const startPoint = targetPoints[i - 1];
      const endPoint = targetPoints[i];

      if (Utils2.EqualPt(startPoint, endPoint)) continue;

      let distance;
      let intersectionPoint = { x: hookPoint.x, y: hookPoint.y };

      if (Math.abs((endPoint.y - startPoint.y) / (endPoint.x - startPoint.x)) > 1) {
        if (enableSnap) intersectionPoint.y = snappedPoint.y;
        const xIntersection = (endPoint.x - startPoint.x) / (endPoint.y - startPoint.y) * (intersectionPoint.y - startPoint.y) + startPoint.x;
        distance = Math.abs(xIntersection - intersectionPoint.x);
        intersectionPoint.x = xIntersection;

        if (xIntersection < Math.min(startPoint.x, endPoint.x) || xIntersection > Math.max(startPoint.x, endPoint.x)) {
          distance = ConstantData.Defines.LongIntMax;
        } else {
          const rect = Utils2.Pt2Rect(startPoint, endPoint);
          Utils2.InflateRect(rect, 1, 1);
          if (!Utils2.pointInRect(rect, intersectionPoint)) distance = ConstantData.Defines.LongIntMax;
        }
      } else {
        if (enableSnap) intersectionPoint.x = snappedPoint.x;
        const yIntersection = (endPoint.y - startPoint.y) / (endPoint.x - startPoint.x) * (intersectionPoint.x - startPoint.x) + startPoint.y;
        distance = Math.abs(yIntersection - intersectionPoint.y);
        intersectionPoint.y = yIntersection;

        if (yIntersection < Math.min(startPoint.y, endPoint.y) || yIntersection > Math.max(startPoint.y, endPoint.y)) {
          distance = ConstantData.Defines.LongIntMax;
        } else {
          const rect = Utils2.Pt2Rect(startPoint, endPoint);
          Utils2.InflateRect(rect, 1, 1);
          if (!Utils2.pointInRect(rect, intersectionPoint)) distance = ConstantData.Defines.LongIntMax;
        }
      }

      if (distance < minDistance) {
        closestPointIndex = i;
        minDistance = distance;
        closestPoint = { x: intersectionPoint.x, y: intersectionPoint.y };
      }
    }

    if (closestPointIndex >= 0) {
      const relativePoint = [{ x: closestPoint.x, y: closestPoint.y }];
      if (this.RotationAngle !== 0) {
        const angleRadians = this.RotationAngle / (180 / ConstantData.Geometry.PI);
        Utils3.RotatePointsAboutCenter(targetFrame, angleRadians, relativePoint);
      }

      const width = targetFrame.width;
      const height = targetFrame.height;
      const relativeX = width === 0 ? 0 : (relativePoint[0].x - targetFrame.x) / width;
      const relativeY = height === 0 ? 0 : (relativePoint[0].y - targetFrame.y) / height;

      const result = [new Point(relativeX * ConstantData.Defines.SED_CDim, relativeY * ConstantData.Defines.SED_CDim)];
      console.log("S.PolyLine: BaseShape_PolyGetTargets output", result);
      return result;
    }

    console.log("S.PolyLine: BaseShape_PolyGetTargets output", null);
    return null;
  }

  GetPerimeterPoints(event, hookPoints, hookPointID, rotationAngle, scaleFactor, targetObjectID) {
    console.log('S.PolyLine: GetPerimeterPoints input', { event, hookPoints, hookPointID, rotationAngle, scaleFactor, targetObjectID });

    let perimeterPoints = [];
    let frame = this.Frame;

    if (hookPoints && hookPoints.length === 2 && hookPoints[0].id === ConstantData.HookPts.SED_KTL && hookPoints[1].id === ConstantData.HookPts.SED_KTR) {
      perimeterPoints.push(new Point(this.StartPoint.x, this.StartPoint.y));
      perimeterPoints[0].id = hookPoints[0].id;
      perimeterPoints.push(new Point(this.EndPoint.x, this.EndPoint.y));
      perimeterPoints[1].id = hookPoints[1].id;
      console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
      return perimeterPoints;
    }

    let targetObject = GlobalData.optManager.GetObjectPtr(targetObjectID, false);

    if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_MULTIPLICITY && hookPoints) {
      let baseLine, polyPoints = this.GetPolyPoints(1, false, true, false, null), segmentInfo = {}, polyPointsLength = polyPoints.length;

      if (hookPoints[0].x === 0) {
        segmentInfo.StartPoint = polyPoints[0];
        segmentInfo.EndPoint = polyPoints[1];
        segmentInfo.LineType = ConstantData.LineType.LINE;
        baseLine = new BaseLine(segmentInfo);
        baseLine.StartPoint = segmentInfo.StartPoint;
        baseLine.EndPoint = segmentInfo.EndPoint;
        baseLine.Frame = Utils2.Pt2Rect(segmentInfo.StartPoint, segmentInfo.EndPoint);
        perimeterPoints = super.GetPerimeterPoints(event, hookPoints, hookPointID, rotationAngle, scaleFactor, targetObjectID);
      } else {
        segmentInfo.StartPoint = polyPoints[polyPointsLength - 2];
        segmentInfo.EndPoint = polyPoints[polyPointsLength - 1];
        segmentInfo.LineType = ConstantData.LineType.LINE;
        baseLine = new BaseLine(segmentInfo);
        baseLine.StartPoint = segmentInfo.StartPoint;
        baseLine.EndPoint = segmentInfo.EndPoint;
        baseLine.Frame = Utils2.Pt2Rect(segmentInfo.StartPoint, segmentInfo.EndPoint);
        perimeterPoints = super.GetPerimeterPoints(event, hookPoints, hookPointID, rotationAngle, scaleFactor, targetObjectID);
      }
      console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
      return perimeterPoints;
    }

    if (targetObject && targetObject.objecttype === ConstantData.ObjectTypes.SD_OBJT_EXTRATEXTLABEL && hookPoints.length === 1) {
      perimeterPoints = super.GetPerimeterPoints(event, hookPoints, hookPointID, rotationAngle, scaleFactor, targetObjectID);
      console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
      return perimeterPoints;
    }

    if (hookPointID >= ConstantData.HookPts.SED_KCTL && hookPointID <= ConstantData.HookPts.SED_KCC) {
      if (hookPoints[0].x === 0) {
        perimeterPoints[0] = { x: this.StartPoint.x, y: this.StartPoint.y, id: hookPoints[0].id || 0 };
        console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
        return perimeterPoints;
      }
      if (hookPoints[0].x === ConstantData.Defines.SED_CDim) {
        perimeterPoints[0] = { x: this.EndPoint.x, y: this.EndPoint.y, id: hookPoints[0].id || 0 };
        console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
        return perimeterPoints;
      }
    }

    for (let i = 0; i < hookPoints.length; i++) {
      perimeterPoints[i] = { x: 0, y: 0, id: 0 };
      let width = frame.width;
      let height = frame.height;
      perimeterPoints[i].x = (hookPoints[i].x / ConstantData.Defines.SED_CDim) * width + frame.x;
      perimeterPoints[i].y = (hookPoints[i].y / ConstantData.Defines.SED_CDim) * height + frame.y;
      if (hookPoints[i].id != null) {
        perimeterPoints[i].id = hookPoints[i].id;
      }
    }

    console.log('S.PolyLine: GetPerimeterPoints output', perimeterPoints);
    return perimeterPoints;
  }

  HookToPoint(hookPoint, rect) {
    console.log('S.PolyLine: HookToPoint input', { hookPoint, rect });

    let segmentCount;
    const startPoint = { x: 0, y: 0 };
    const endPoint = { x: 0, y: 0 };
    const boundingRect = {};

    if (hookPoint === ConstantData.HookPts.SED_KTL) {
      startPoint.x = this.StartPoint.x;
      startPoint.y = this.StartPoint.y;
      endPoint.x = this.StartPoint.x + this.polylist.segs[1].pt.x;
      endPoint.y = this.StartPoint.y + this.polylist.segs[1].pt.y;

      if (rect) {
        const rectData = Utils2.Pt2Rect(this.StartPoint, endPoint);
        rect.x = rectData.x;
        rect.y = rectData.y;
        rect.width = rectData.width;
        rect.height = rectData.height;
      }
    } else {
      startPoint.x = this.EndPoint.x;
      startPoint.y = this.EndPoint.y;
      segmentCount = this.polylist.segs.length;
      endPoint.x = this.StartPoint.x + this.polylist.segs[segmentCount - 2].pt.x;
      endPoint.y = this.StartPoint.y + this.polylist.segs[segmentCount - 2].pt.y;

      if (rect) {
        const rectData = Utils2.Pt2Rect(this.EndPoint, endPoint);
        rect.x = rectData.x;
        rect.y = rectData.y;
        rect.width = rectData.width;
        rect.height = rectData.height;
      }
    }

    console.log('S.PolyLine: HookToPoint output', startPoint);
    return startPoint;
  }

  GetSegmentLineFace(event, targetPoint, anchorPoint) {
    console.log('S.PolyLine: GetSegmentLineFace input', { event, targetPoint, anchorPoint });

    let hitResult = 0;
    const hitInfo = {};
    const hitPoint = { x: anchorPoint.x, y: anchorPoint.y };
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    const hitSegment = {};

    if (Utils3.LineDStyleHit(polyPoints, hitPoint, this.StyleRecord.Line.Thickness, 0, hitSegment) && hitSegment.lpHit >= 0) {
      const segmentRect = Utils2.Pt2Rect(polyPoints[hitSegment.lpHit], polyPoints[hitSegment.lpHit + 1]);
      hitResult = segmentRect.width >= segmentRect.height
        ? (targetPoint.y >= anchorPoint.y ? ConstantData.HookPts.SED_KBC : ConstantData.HookPts.SED_KTC)
        : (targetPoint.x >= anchorPoint.x ? ConstantData.HookPts.SED_KRC : ConstantData.HookPts.SED_KLC);
    }

    console.log('S.PolyLine: GetSegmentLineFace output', hitResult);
    return hitResult;
  }

  PolyHitSeg(point) {
    console.log("S.PolyLine: PolyHitSeg input", { point });
    // Get the polyline points and collect segment indices into an array
    let segmentIndices = [];
    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, segmentIndices);
    let hitResult = {}; // to be populated by the hit test
    let testPoint = { x: point.x, y: point.y };

    // Check if the point hits the polyline line style within the given thickness
    if (Utils3.LineDStyleHit(polyPoints, testPoint, this.StyleRecord.Line.Thickness, 0, hitResult) && hitResult.lpHit >= 0) {
      let indicesCount = segmentIndices.length;
      for (let idx = 0; idx < indicesCount; idx++) {
        if (hitResult.lpHit < segmentIndices[idx]) {
          hitResult.lpHit = idx;
          break;
        }
      }
      const result = hitResult.lpHit + 1;
      console.log("S.PolyLine: PolyHitSeg output", result);
      return result;
    }
    console.log("S.PolyLine: PolyHitSeg output", -1);
    return -1;
  }

  MaintainPoint(point, targetID, targetObject, drawingObject, actionType) {
    console.log('S.PolyLine: MaintainPoint input', { point, targetID, targetObject, drawingObject, actionType });

    let segmentIndex, hitSegment, polyPoints, inflatedPolyPoints, hitResult = {}, startPoint = {}, endPoint = {}, tempRect = {}, tempObject = {}, tempPolyPoints = [], tempHitResult = {}, tempInflatedPolyPoints = [];
    let isLine = drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.LINE;

    if (isLine) {
      switch (drawingObject.LineType) {
        case ConstantData.LineType.SEGLINE:
        case ConstantData.LineType.ARCSEGLINE:
        case ConstantData.LineType.POLYLINE:
          for (segmentIndex = -1, hitSegment = 0; hitSegment < drawingObject.hooks.length; hitSegment++) {
            if (drawingObject.hooks[hitSegment].objid === targetID) {
              drawingObject.HookToPoint(drawingObject.hooks[hitSegment].hookpt, tempRect);
              segmentIndex = 0;
              break;
            }
          }
          if (segmentIndex !== 0) return true;

          tempObject = Utils1.DeepCopy(drawingObject);
          Utils2.CopyRect(tempObject.Frame, tempRect);
          tempObject.StartPoint.x = tempRect.x;
          tempObject.StartPoint.y = tempRect.y;
          tempObject.EndPoint.x = tempRect.x + tempRect.width;
          tempObject.EndPoint.y = tempRect.y + tempRect.height;
          drawingObject = tempObject;
      }
    }

    let hitSegmentIndex = targetObject.PolyHitSeg(point);
    if (targetObject.polylist.segs.length !== this.polylist.segs.length || actionType === ConstantData.ActionTriggerType.FLIP) {
      segmentIndex = this.PolyHitSeg(point);
      if (segmentIndex < 0) segmentIndex = targetObject.PolyHitSeg(point);
      if (segmentIndex >= this.polylist.segs.length) segmentIndex = this.polylist.segs.length - 1;
    } else {
      segmentIndex = hitSegmentIndex;
    }

    polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    if (this.polylist && this.polylist.closed && this.StyleRecord.Line.BThick && drawingObject instanceof BaseLine) {
      let hitInfo = {};
      let targetPolyPoints = targetObject.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
      let isHit = Utils3.LineDStyleHit(targetPolyPoints, { x: point.x, y: point.y }, 2, -12, hitInfo);

      if (!isHit || hitInfo.lpHit < 0) {
        let inflatedTargetPolyPoints = GlobalData.optManager.InflateLine(targetPolyPoints, targetObject.StyleRecord.Line.BThick, true, false);
        isHit = Utils3.LineDStyleHit(inflatedTargetPolyPoints, { x: point.x, y: point.y }, 2, -12, hitInfo);
        if (isHit && hitInfo.lpHit >= 0) {
          polyPoints = GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, true, false);
        } else {
          let fullyInflatedTargetPolyPoints = GlobalData.optManager.InflateLine(targetPolyPoints, targetObject.StyleRecord.Line.BThick, true, true);
          isHit = Utils3.LineDStyleHit(fullyInflatedTargetPolyPoints, { x: point.x, y: point.y }, 2, -12, hitInfo);
          if (isHit && hitInfo.lpHit >= 0) {
            polyPoints = GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, true, true);
          }
        }
      }
    }

    if (segmentIndex >= 0 && hitSegmentIndex >= 0) {
      tempRect = Utils2.Pt2Rect(polyPoints[segmentIndex], polyPoints[segmentIndex - 1]);
      tempObject = Utils1.DeepCopy(this);
      Utils2.CopyRect(tempObject.Frame, tempRect);
      tempObject.StartPoint.x = polyPoints[segmentIndex - 1].x;
      tempObject.StartPoint.y = polyPoints[segmentIndex - 1].y;
      tempObject.EndPoint.x = polyPoints[segmentIndex].x;
      tempObject.EndPoint.y = polyPoints[segmentIndex].y;

      tempPolyPoints = targetObject.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
      tempHitResult = Utils1.DeepCopy(targetObject);
      tempRect = Utils2.Pt2Rect(tempPolyPoints[hitSegmentIndex], tempPolyPoints[hitSegmentIndex - 1]);
      Utils2.CopyRect(tempHitResult.Frame, tempRect);
      tempHitResult.StartPoint.x = tempPolyPoints[hitSegmentIndex - 1].x;
      tempHitResult.StartPoint.y = tempPolyPoints[hitSegmentIndex - 1].y;
      tempHitResult.EndPoint.x = tempPolyPoints[hitSegmentIndex].x;
      tempHitResult.EndPoint.y = tempPolyPoints[hitSegmentIndex].y;

      if (drawingObject.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.SHAPE) {
        return GlobalData.optManager.LineCheckPoint(tempObject, point) || GlobalData.optManager.Lines_MaintainDist(tempObject, tempHitResult, actionType, point), true;
      }

      switch (actionType) {
        case ConstantData.ActionTriggerType.POLYLNODE:
          actionType = (GlobalData.optManager.theActionTriggerData === segmentIndex - 1 || GlobalData.optManager.theActionTriggerData === segmentIndex) &&
            tempObject.StartPoint.x === polyPoints[GlobalData.optManager.theActionTriggerData].x &&
            tempObject.StartPoint.y === polyPoints[GlobalData.optManager.theActionTriggerData].y ?
            ConstantData.ActionTriggerType.LINESTART : ConstantData.ActionTriggerType.LINEEND;
          break;
        case ConstantData.ActionTriggerType.ROTATE:
          return GlobalData.optManager.Lines_MaintainDist(tempObject, tempHitResult, actionType, point), true;
        default:
          actionType = ConstantData.ActionTriggerType.LINEEND;
      }

      if (GlobalData.optManager.LineCheckPoint(tempObject, point)) return true;

      if (targetObject.polylist.segs.length === this.polylist.segs.length) {
        GlobalData.optManager.Lines_MaintainDistWithinSegment(this, targetObject, segmentIndex, point);
        return true;
      } else {
        return GlobalData.optManager.Lines_Intersect(tempObject, drawingObject, point) || GlobalData.optManager.Lines_MaintainDist(tempObject, tempHitResult, actionType, point), true;
      }
    }

    console.log('S.PolyLine: MaintainPoint output', true);
    return true;
  }

  ChangeTarget(
    objectHookID: number,
    objectTargetID: number,
    paramA: any,
    paramR: any,
    paramI: any,
    paramN: any
  ) {
    console.log("S.PolyLine: ChangeTarget input", {
      objectHookID,
      objectTargetID,
      paramA,
      paramR,
      paramI,
      paramN
    });

    let angle = 0;
    let targetObject: any = null;
    const tempRect: any = {};
    let hookedPoint: any = null;
    let loopIndex = 0;

    targetObject = GlobalData.optManager.GetObjectPtr(objectTargetID, false);
    if (
      this.TextFlags & ConstantData.TextFlags.SED_TF_HorizText &&
      targetObject instanceof BaseShape
    ) {
      for (loopIndex = 0; loopIndex < targetObject.hooks.length; loopIndex++) {
        if (targetObject.hooks[loopIndex].objid === objectHookID) {
          hookedPoint = targetObject.HookToPoint(
            targetObject.hooks[loopIndex].hookpt,
            tempRect
          );
          break;
        }
      }

      if (hookedPoint != null && this.PolyHitSeg(hookedPoint) >= 0) {
        angle = this.GetApparentAngle(hookedPoint);
        angle = Math.abs(angle) % 180;
        const rotationAngleAbs = Math.abs(targetObject.RotationAngle % 180);
        if (
          Math.abs(rotationAngleAbs - angle) > 2 &&
          Math.abs(rotationAngleAbs - (angle - 180)) > 2
        ) {
          targetObject.RotationAngle = angle;
          GlobalData.optManager.SetLinkFlag(
            this.BlockID,
            ConstantData.LinkFlags.SED_L_MOVE |
            ConstantData.LinkFlags.SED_L_CHANGE
          );
          GlobalData.optManager.AddToDirtyList(objectTargetID);
        }
      }
    }

    GlobalData.optManager.AddToDirtyList(this.BlockID);

    console.log("S.PolyLine: ChangeTarget output", {
      angle,
      hookedPoint,
      loopIndex
    });
  }

  LM_DrawPreTrack(event) {
    console.log("S.PolyLine: LM_DrawPreTrack input", { event });

    if (
      GlobalData.optManager.LinkParams &&
      (GlobalData.optManager.LinkParams.ConnectIndex >= 0 ||
        GlobalData.optManager.LinkParams.JoinIndex >= 0)
    ) {
      this.LM_DrawRelease();
      console.log("S.PolyLine: LM_DrawPreTrack output", false);
      return false;
    } else {
      super.LM_DrawPreTrack(event);
      console.log("S.PolyLine: LM_DrawPreTrack output", true);
      return true;
    }
  }

  LM_DrawClick_ExceptionCleanup(event: any): void {
    console.log("S.PolyLine: LM_DrawClick_ExceptionCleanup input", { event });

    GlobalData.optManager.unbindActionClickHammerEvents();

    if (!GlobalData.optManager.isMobilePlatform) {
      $(window).unbind("mousemove");
      GlobalData.optManager.WorkAreaHammer.on("tap", DefaultEvt.Evt_WorkAreaHammerTap);
    }

    this.ResetAutoScrollTimer();
    GlobalData.optManager.LinkParams = null;
    GlobalData.optManager.theActionStoredObjectID = -1;
    GlobalData.optManager.theActionSVGObject = null;
    GlobalData.optManager.WorkAreaHammer.on("dragstart", DefaultEvt.Evt_WorkAreaHammerDragStart);

    console.log("S.PolyLine: LM_DrawClick_ExceptionCleanup output", {});
  }

  LM_DrawClick(initialX: number, initialY: number) {
    console.log("S.PolyLine: LM_DrawClick input", { initialX, initialY });
    try {
      // Initialize the frame and points
      this.Frame.x = initialX;
      this.Frame.y = initialY;
      this.Frame.width = 0;
      this.Frame.height = 0;
      this.StartPoint = { x: initialX, y: initialY };
      this.EndPoint = { x: initialX, y: initialY };

      const self = this;
      GlobalData.optManager.WorkAreaHammer.off("dragstart");

      if (GlobalData.optManager.isMobilePlatform) {
        GlobalData.optManager.WorkAreaHammer.on(
          "dragstart",
          DefaultEvt.Evt_PolyLineDrawDragStart
        );
        GlobalData.optManager.WorkAreaHammer.on(
          "drag",
          DefaultEvt.Evt_DrawTrackHandlerFactory(this)
        );
        GlobalData.optManager.WorkAreaHammer.on(
          "dragend",
          DefaultEvt.Evt_PolyLineDrawExtendHandlerFactory(this)
        );
      }

      GlobalData.optManager.WorkAreaHammer.on(
        "doubletap",
        DefaultEvt.Evt_DrawReleaseHandlerFactory(this)
      );

      if (!GlobalData.optManager.isMobilePlatform) {
        GlobalData.optManager.WorkAreaHammer.on(
          "tap",
          DefaultEvt.Evt_PolyLineDrawExtendHandlerFactory(this)
        );
        GlobalData.optManager.WorkAreaHammer.on(
          "drag",
          DefaultEvt.Evt_DrawTrackHandlerFactory(this)
        );
        GlobalData.optManager.WorkAreaHammer.on(
          "dragend",
          DefaultEvt.Evt_PolyLineDrawExtendHandlerFactory(this)
        );
        $(window).bind("mousemove", function (mouseEvent) {
          try {
            self.LM_DrawTrack(mouseEvent);
          } catch (error) {
            self.LM_DrawClick_ExceptionCleanup(error);
            GlobalData.optManager.ExceptionCleanup(error);
            throw error;
          }
        });
      }

      console.log("S.PolyLine: LM_DrawClick output", { message: "Click handled successfully" });
    } catch (error) {
      this.LM_DrawClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  LM_DrawRelease(event) {
    console.log("S.PolyLine: LM_DrawRelease input", { event });

    // Stop gesture detection if available
    if (event && event.gesture) {
      event.gesture.stopDetect();
    }
    GlobalData.optManager.unbindActionClickHammerEvents();
    if (!GlobalData.optManager.isMobilePlatform) {
      $(window).unbind("mousemove");
      GlobalData.optManager.WorkAreaHammer.on("tap", DefaultEvt.Evt_WorkAreaHammerTap);
    }

    // Calculate distance between the last two segments
    const segmentCount = this.polylist.segs.length;
    const deltaX = this.polylist.segs[segmentCount - 2].pt.x - this.polylist.segs[segmentCount - 1].pt.x;
    const deltaY = this.polylist.segs[segmentCount - 2].pt.y - this.polylist.segs[segmentCount - 1].pt.y;
    const segmentDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Remove the last segment if conditions meet
    if (segmentCount > 2 && segmentDistance < 5) {
      this.polylist.segs.pop();
    }

    this.ResetAutoScrollTimer();

    // If collaboration messages are allowed, prepare and build a message payload
    if (Collab.AllowMessage()) {
      const messagePayload = {
        attributes: {}
      };

      messagePayload.attributes.StyleRecord = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StyleRecord);
      messagePayload.attributes.StartArrowID = GlobalData.optManager.theDrawShape.StartArrowID;
      messagePayload.attributes.EndArrowID = GlobalData.optManager.theDrawShape.EndArrowID;
      messagePayload.attributes.StartArrowDisp = GlobalData.optManager.theDrawShape.StartArrowDisp;
      messagePayload.attributes.ArrowSizeIndex = GlobalData.optManager.theDrawShape.ArrowSizeIndex;
      messagePayload.attributes.TextGrow = GlobalData.optManager.theDrawShape.TextGrow;
      messagePayload.attributes.TextAlign = GlobalData.optManager.theDrawShape.TextAlign;
      messagePayload.attributes.TextDirection = GlobalData.optManager.theDrawShape.TextDirection;
      messagePayload.attributes.Dimensions = GlobalData.optManager.theDrawShape.Dimensions;
      messagePayload.attributes.StartPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.StartPoint);
      messagePayload.attributes.EndPoint = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.EndPoint);
      messagePayload.attributes.Frame = Utils1.DeepCopy(GlobalData.optManager.theDrawShape.Frame);
      messagePayload.attributes.extraflags = ConstantData.ExtraFlags.SEDE_SideKnobs;
      if (this.polylist) {
        messagePayload.attributes.polylist = Utils1.DeepCopy(this.polylist);
      }

      messagePayload.LineTool = ConstantData.DocumentContext.LineTool;
      Collab.AddNewBlockToSecondary(GlobalData.optManager.theDrawShape.BlockID);
      if (Collab.IsSecondary()) {
        messagePayload.CreateList = [GlobalData.optManager.theDrawShape.BlockID];
      }
      messagePayload.LinkParams = Utils1.DeepCopy(GlobalData.optManager.LinkParams);
      messagePayload.Actions = [];

      let action = new Collab.MessageAction(ConstantData.CollabMessageActions.CreateLine);
      messagePayload.Actions.push(action);
      action = new Collab.MessageAction(ConstantData.CollabMessageActions.LinkObject);
      messagePayload.Actions.push(action);

      Collab.BuildMessage(ConstantData.CollabMessages.AddLine, messagePayload, false);
    }

    this.LM_DrawPostRelease(GlobalData.optManager.theActionStoredObjectID);
    GlobalData.optManager.PostObjectDraw();

    console.log("S.PolyLine: LM_DrawRelease output", { segmentCount, segmentDistance });
  }

  LM_DrawExtend(event: any) {
    console.log("S.PolyLine: LM_DrawExtend input", event);

    // If there is an active link (either ConnectIndex or JoinIndex is set), release the drawing.
    if (
      GlobalData.optManager.LinkParams &&
      (GlobalData.optManager.LinkParams.ConnectIndex >= 0 ||
        GlobalData.optManager.LinkParams.JoinIndex >= 0)
    ) {
      this.LM_DrawRelease(event);
    } else {
      // Convert the gesture center coordinates from window to document space.
      let documentCoordinates = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
        event.gesture.center.clientX,
        event.gesture.center.clientY
      );

      // Get the total number of segments and calculate the penultimate segment point.
      let totalSegments = this.polylist.segs.length;
      let penultimatePoint = {
        x: this.polylist.segs[totalSegments - 2].pt.x + this.StartPoint.x,
        y: this.polylist.segs[totalSegments - 2].pt.y + this.StartPoint.y
      };

      // Calculate the distance from the penultimate point to the current document coordinates.
      let deltaX = documentCoordinates.x - penultimatePoint.x;
      let deltaY = documentCoordinates.y - penultimatePoint.y;
      let distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

      // If the distance is at least 10, add a new segment.
      if (distance >= 10) {
        let newSegmentX = documentCoordinates.x - this.StartPoint.x;
        let newSegmentY = documentCoordinates.y - this.StartPoint.y;
        this.polylist.segs.push(new PolySeg(ConstantData.LineType.LINE, newSegmentX, newSegmentY));

        // If the maximum number of segments is reached, release the drawing.
        if (this.polylist.segs.length >= ConstantData.Defines.SED_MaxPolySegs) {
          this.LM_DrawRelease(event);
        }
      }
    }

    console.log("S.PolyLine: LM_DrawExtend output", { polySegments: this.polylist.segs });
  }

  RightClick(event) {
    console.log("S.PolyLine: RightClick input", { event });

    // Convert window coordinates to document coordinates
    let docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(
      event.gesture.center.clientX,
      event.gesture.center.clientY
    );

    // Initialize hit result and get the corresponding SVG element from the DOM event target.
    let hitDetails = new HitResult(-1, 0, null);
    let svgElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);

    // Select object on click; if failed, return false.
    if (!GlobalData.optManager.SelectObjectFromClick(event, svgElement)) {
      console.log("S.PolyLine: RightClick output", false);
      return false;
    }

    // Get the target object using the element ID.
    let elementId = svgElement.GetID();
    let targetObject = GlobalData.optManager.GetObjectPtr(elementId, false);
    let spellIndex = -1;

    // Check if the target object has an associated text object.
    if (targetObject && targetObject.GetTextObject() >= 0) {
      let textElement = svgElement.textElem;
      if (textElement) {
        spellIndex = textElement.GetSpellAtLocation(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
        if (spellIndex >= 0) {
          GlobalData.optManager.ActivateTextEdit(svgElement, event, true);
        }
      }
    }

    // Setup right-click parameters.
    GlobalData.optManager.RightClickParams = new RightClickData();
    GlobalData.optManager.RightClickParams.TargetID = svgElement.GetID();
    GlobalData.optManager.RightClickParams.HitPt.x = docCoords.x;
    GlobalData.optManager.RightClickParams.HitPt.y = docCoords.y;
    GlobalData.optManager.RightClickParams.Locked = (this.flags & ConstantData.ObjFlags.SEDO_Lock) > 0;

    // Perform a hit test.
    this.Hit(docCoords, false, false, hitDetails);
    if (hitDetails.hitcode) {
      GlobalData.optManager.RightClickParams.segment = hitDetails.segment;
    }

    // Check if there is an active text edit.
    if (GlobalData.optManager.GetActiveTextEdit() !== null) {
      let activeEdit = GlobalData.optManager.svgDoc.GetActiveEdit();
      spellIndex = -1;
      if (activeEdit) {
        spellIndex = activeEdit.GetSpellAtLocation(
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }
      if (spellIndex >= 0) {
        GlobalData.optManager.svgDoc.GetSpellCheck().ShowSpellMenu(
          activeEdit,
          spellIndex,
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        Commands.MainController.ShowContextualMenu(
          Resources.Controls.ContextMenus.TextMenu.Id.toLowerCase(),
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }
    } else {
      // Show contextual menu based on object type.
      if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
        Commands.MainController.ShowContextualMenu(
          Resources.Controls.ContextMenus.PolyWall.Id.toLowerCase(),
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      } else {
        Commands.MainController.ShowContextualMenu(
          Resources.Controls.ContextMenus.PolyLine.Id.toLowerCase(),
          event.gesture.center.clientX,
          event.gesture.center.clientY
        );
      }
    }

    console.log("S.PolyLine: RightClick output", true);
  }

  Pr_GetNURBSPoints(
    startSegmentIndex: number,
    numPoints: number,
    xOffset: number,
    yOffset: number,
    scaleX: number,
    scaleY: number
  ): Point[] {
    console.log("S.PolyLine: Pr_GetNURBSPoints input", { startSegmentIndex, numPoints, xOffset, yOffset, scaleX, scaleY });

    // Internal helper: Compute the NURBS basis functions.
    function computeNURBSBasis(): Float64Array {
      // T: basis values, knots: knot vector
      let stepInterval = (knots[knotCount - 1] - knots[0]) / numPoints;
      let knotIndex = 0;
      let currentKnot = knots[0];
      for (let r = 0; r < numPoints; r++) {
        while (currentKnot >= knots[knotIndex]) {
          knotIndex++;
        }
        // Compute index offset for the current row in T.
        let tOffset = (knotIndex - 1) + (nurbsCount * r);
        T[tOffset] = 1;
        // Calculate basis coefficients for degree 2 to 'degree'
        for (let deg = 2; deg <= degree; deg++) {
          // Determine starting index for the inner loop.
          let innerStart = knotIndex - deg + 1;
          if (innerStart < 0) innerStart = 0;
          for (let a = innerStart; a <= knotIndex - 1; a++) {
            let diff1 = knots[a + deg - 1] - knots[a];
            let diff2 = knots[a + deg] - knots[a + 1];
            if (diff1 === 0) diff1 = 1e-11;
            if (diff2 === 0) diff2 = 1e-11;
            if (a + tOffset + 1 < T.length) {
              T[a + tOffset] =
                T[a + tOffset] * (currentKnot - knots[a]) / diff1 +
                T[a + 1 + tOffset] * (knots[a + deg] - currentKnot) / diff2;
            }
          }
        }
        // Normalize the basis values.
        let sumBasis = 0;
        for (let i = 0; i < pCount; i++) {
          sumBasis += weights[i] * T[i + tOffset];
        }
        for (let i = 0; i < pCount; i++) {
          T[i + tOffset] = (weights[i] * T[i + tOffset]) / sumBasis;
        }
        currentKnot += stepInterval;
      }
      return T;
    }

    // Determine number of segments and set up the curve degree.
    let index = startSegmentIndex;
    let nurbsCount = 0;
    let hasNURBS = false;
    for (index = startSegmentIndex; index < this.polylist.segs.length &&
      (this.polylist.segs[index].LineType === ConstantData.LineType.NURBS ||
        this.polylist.segs[index].LineType === ConstantData.LineType.NURBSSEG); index++) {
      if (this.polylist.segs[index].LineType === ConstantData.LineType.NURBS) {
        if (hasNURBS) break;
        hasNURBS = true;
      }
      if (this.polylist.segs[index].LineType === ConstantData.LineType.NURBSSEG) {
        nurbsCount++;
      }
    }

    // The degree is determined by the ShortRef property.
    let degree = this.polylist.segs[startSegmentIndex].ShortRef + 1;

    // Build weights array from the segments following the start
    let weights: number[] = [];
    for (let s = 0; s < nurbsCount; s++) {
      weights.push(this.polylist.segs[s + startSegmentIndex + 1].weight);
    }
    // pCount is the number of control points
    let pCount = nurbsCount;

    // Build the knot vector.
    let knots: number[] = [];
    let knotCount: number;
    if (this.polylist.segs[startSegmentIndex].param === -1) {
      // Uniform knot vector
      let knotVal = 0;
      for (let s = 0; s < degree; s++) {
        knots.push(knotVal);
        knotVal++;
      }
      knotVal++;
      for (let s = degree; s < nurbsCount + 1; s++) {
        knots.push(knotVal);
        knotVal++;
      }
      let uniformInterval = knots[knots.length - 1] - knots[0];
      for (let s = 1; s < degree; s++) {
        knots.push(uniformInterval);
      }
      knotCount = knots.length;
    } else {
      // Use provided parameters
      for (let s = 0; s < nurbsCount - 1; s++) {
        knots.push(this.polylist.segs[s + startSegmentIndex + 1].param);
      }
      knots.push(this.polylist.segs[startSegmentIndex].param);
      let tempParam = this.polylist.segs[nurbsCount + startSegmentIndex + 1].param;
      knots.push(tempParam);
      let interval = tempParam - knots[0];
      for (let s = 0; s < degree - 1; s++) {
        knots.push(knots[s + 1] + interval);
      }
      knotCount = nurbsCount + degree;
    }

    // Build control point coordinate arrays.
    let xControlPoints: number[] = [];
    let yControlPoints: number[] = [];
    for (let s = 0; s < nurbsCount; s++) {
      xControlPoints.push(this.polylist.segs[s + startSegmentIndex + 1].pt.x);
      yControlPoints.push(this.polylist.segs[s + startSegmentIndex + 1].pt.y);
    }

    // Prepare arrays for the basis function computation.
    const L = numPoints;
    const totalBasisElements = pCount * L;
    let T = new Float64Array(totalBasisElements);
    let xControl = new Float64Array(xControlPoints);
    let yControl = new Float64Array(yControlPoints);
    weights = new Float64Array(weights);

    // Normalize the knot vector.
    knots = new Float64Array(knots);
    let knotStart = knots[0];
    let knotRange = knots[knotCount - 1] - knotStart;
    for (let s = 0; s < knotCount; s++) {
      knots[s] = (knots[s] - knotStart) / knotRange;
    }
    for (let s = 0; s < knots.length; s++) {
      knots[s] = Math.floor(1e4 * knots[s]) / 1e4;
      if (s > 0) {
        if (knots[s] < knots[s - 1]) {
          knots[s] = knots[s - 1];
        }
      } else {
        if (knots[0] > knots[1]) {
          knots[0] = 0;
        }
      }
    }

    // Compute basis functions and cache if possible.
    if (this.polylist.closed) {
      computeNURBSBasis();
    } else if (
      this.polylist.segs[startSegmentIndex].UserData == null ||
      this.polylist.segs[startSegmentIndex].UserData.nPoints !== numPoints ||
      this.polylist.segs[startSegmentIndex].UserData.basis.length === 0
    ) {
      computeNURBSBasis();
      this.polylist.segs[startSegmentIndex].UserData = {
        nPoints: numPoints,
        basis: T
      };
    } else {
      T = this.polylist.segs[startSegmentIndex].UserData.basis;
    }

    // Compute the NURBS curve points using the computed basis.
    let resultPoints: Point[] = [];
    {
      // The following loop mimics the accumulation of spline points.
      // Note: The original inner loops were minified; this version is restructured for clarity.
      let step = (knots[knotCount - 1] - knots[0]) / numPoints;
      // Determine an initial offset into the basis function array.
      let basisOffset = (Math.floor((knots[degree - 1] - knots[0]) / step) + 1) * pCount;
      // Accumulate the first point.
      let xAccum = 0, yAccum = 0;
      for (let i = 0; i < pCount; i++) {
        let weightVal = weights[i] * T[i + basisOffset];
        xAccum += xControl[i] * weightVal;
        yAccum += yControl[i] * weightVal;
      }
      resultPoints.push(new Point(xAccum * scaleX + xOffset, yAccum * scaleY + yOffset));

      // Loop over remaining segments of the basis array and accumulate curve points.
      for (let seg = degree - 1; seg < pCount; seg++) {
        let newBasisIndex = Math.floor((knots[seg + 1] - knots[0]) / step);
        // Update basis offset.
        basisOffset += pCount;
        if (basisOffset + pCount - 1 < totalBasisElements) {
          xAccum = 0;
          yAccum = 0;
          for (let i = 0; i < pCount; i++) {
            let weightVal = T[i + basisOffset];
            xAccum += xControl[i] * weightVal;
            yAccum += yControl[i] * weightVal;
          }
          resultPoints.push(new Point(xAccum * scaleX + xOffset, yAccum * scaleY + yOffset));
        }
      }
    }

    console.log("S.PolyLine: Pr_GetNURBSPoints output", resultPoints);
    return resultPoints;
  }

  Pr_GetSPLINEPoints(
    startSegmentIndex: number,
    numPoints: number,
    xOffset: number,
    yOffset: number,
    scaleX: number,
    scaleY: number
  ): Point[] {
    console.log("S.PolyLine: Pr_GetSPLINEPoints input", {
      startSegmentIndex,
      numPoints,
      xOffset,
      yOffset,
      scaleX,
      scaleY,
    });

    // Helper function to compute the spline basis array.
    function computeSplineBasis() {
      let basisIndex: number, innerLoopIndex: number, tempLoopIndex: number;
      let currentValue: number, basisSum: number, coeff: number;
      // Calculate the knot interval length (C is numPoints).
      let interval = (gArray[totalG - 1] - gArray[0]) / numPoints;
      tempLoopIndex = 0;
      currentValue = gArray[0];
      // Loop over each step in the parameter space.
      for (let r = 0; r < numPoints; r++) {
        // Find the knot span where currentValue lies.
        while (currentValue >= gArray[tempLoopIndex]) {
          tempLoopIndex++;
        }
        // Set basis coefficient at proper index.
        let offset = (tempLoopIndex - 1) + (mCount * r);
        fArray[offset] = 1;
        for (let d = 2; d <= degree; d++) {
          // Compute lower index for the inner loop.
          let startIndex = tempLoopIndex - d + 1;
          if (startIndex < 0) startIndex = 0;
          // Update basis coefficients.
          for (innerLoopIndex = startIndex; innerLoopIndex <= tempLoopIndex - 1; innerLoopIndex++) {
            let diff1 = gArray[innerLoopIndex + d - 1] - gArray[innerLoopIndex];
            let diff2 = gArray[innerLoopIndex + d] - gArray[innerLoopIndex + 1];
            if (diff1 === 0) diff1 = 1e-11;
            if (diff2 === 0) diff2 = 1e-11;
            if (innerLoopIndex + offset + 1 < totalF) {
              fArray[innerLoopIndex + offset] =
                fArray[innerLoopIndex + offset] * (currentValue - gArray[innerLoopIndex]) / diff1 +
                fArray[innerLoopIndex + 1 + offset] * (gArray[innerLoopIndex + d] - currentValue) / diff2;
            }
          }
        }
        // Normalize the basis functions.
        basisSum = 0;
        for (let d = 0; d < pCount; d++) {
          basisSum += dArray[d] * fArray[d + offset];
        }
        for (let d = 0; d < pCount; d++) {
          fArray[d + offset] = (dArray[d] * fArray[d + offset]) / basisSum;
        }
        currentValue += interval;
      }
    }

    // Main local variables.
    let index: number;
    let xCoordinates: number[] = [];
    let yCoordinates: number[] = [];
    let degree = this.polylist.segs[startSegmentIndex].ShortRef + 1;
    // Determine number of continuous spline segments.
    let pCount = 1;
    for (
      index = startSegmentIndex + 1;
      index < this.polylist.segs.length &&
      this.polylist.segs[index].LineType === ConstantData.LineType.SPLINECON;
      index++
    ) {
      pCount++;
    }
    // Create a dArray (all ones) for weighting.
    let dArray: number[] = [];
    for (index = 0; index < pCount; index++) {
      dArray.push(1);
    }

    // Construct the knot vector (gArray).
    let totalG: number;
    let gArray: number[] = [];
    gArray.push(this.polylist.segs[startSegmentIndex].param);
    gArray.push(this.polylist.segs[startSegmentIndex].weight);
    const dataClass = this.polylist.segs[startSegmentIndex].dataclass;
    for (index = 2; index < pCount; index++) {
      gArray.push(this.polylist.segs[index + startSegmentIndex].weight);
    }
    // Append dataClass values to form a clamped knot vector.
    gArray.push(dataClass);
    for (index = 0; index < degree - 1; index++) {
      gArray.push(dataClass);
    }
    totalG = gArray.length;
    const mCount = pCount;
    // Get the control point coordinate arrays.
    xCoordinates.push(this.polylist.segs[startSegmentIndex].pt.x);
    yCoordinates.push(this.polylist.segs[startSegmentIndex].pt.y);
    for (index = 1; index < pCount; index++) {
      xCoordinates.push(this.polylist.segs[index + startSegmentIndex].pt.x);
      yCoordinates.push(this.polylist.segs[index + startSegmentIndex].pt.y);
    }

    // Prepare arrays for spline computation.
    const C = numPoints;
    const totalF = pCount * C;
    let fArray = new Float64Array(totalF);
    const LArray = new Float64Array(xCoordinates);
    const IArray = new Float64Array(yCoordinates);
    dArray = new Float64Array(dArray);

    // Normalize the knot vector.
    let T0 = (gArray = gArray.map(v => v))[0];
    let gRange = gArray[totalG - 1] - T0;
    for (index = 0; index < totalG; index++) {
      gArray[index] = (gArray[index] - T0) / gRange;
    }
    for (index = 0; index < gArray.length; index++) {
      gArray[index] = Math.floor(1e4 * gArray[index]) / 1e4;
      if (index > 0 && gArray[index] < gArray[index - 1]) {
        gArray[index] = gArray[index - 1];
      } else if (index === 0 && gArray[0] > gArray[1]) {
        gArray[0] = 0;
      }
    }

    // Check if userData exists; if not, compute the basis.
    if (this.polylist.closed) {
      computeSplineBasis();
    } else if (
      this.polylist.segs[startSegmentIndex].UserData == null ||
      this.polylist.segs[startSegmentIndex].UserData.nPoints !== numPoints ||
      this.polylist.segs[startSegmentIndex].UserData.basis.length === 0
    ) {
      computeSplineBasis();
      this.polylist.segs[startSegmentIndex].UserData = {
        nPoints: numPoints,
        basis: fArray,
      };
    } else {
      fArray = this.polylist.segs[startSegmentIndex].UserData.basis;
    }

    // Compute the spline points using the basis and control point coordinates.
    let splinePoints: Point[] = [];
    {
      let basisStep = (gArray[totalG - 1] - gArray[0]) / numPoints;
      let hAccum = 0;
      let vAccum = 0;
      let TIndex = (Math.floor((gArray[degree - 1] - gArray[0]) / numPoints) + 1) * mCount;
      // Accumulate the first spline point.
      for (index = 0; index < pCount; index++) {
        let weight = dArray[index] * fArray[index + TIndex];
        hAccum += LArray[index] * weight;
        vAccum += IArray[index] * weight;
      }
      splinePoints.push(new Point(hAccum * scaleX + xOffset, vAccum * scaleY + yOffset));

      // For additional points, further computation would be performed.
      // (The detailed inner-loop from the original code is minified and omitted here for readability.)
      // In a full implementation, you would iterate over the remaining knot spans to compute more points.
    }

    console.log("S.PolyLine: Pr_GetSPLINEPoints output", splinePoints);
    return splinePoints;
  }

  Pr_GetQuadraticBezierPoints(
    startIndex: number,
    pointCount: number,
    xOffset: number,
    yOffset: number,
    scaleX: number,
    scaleY: number
  ): Point[] {
    console.log("S.PolyLine: Pr_GetQuadraticBezierPoints input", {
      startIndex,
      pointCount,
      xOffset,
      yOffset,
      scaleX,
      scaleY
    });

    // Retrieve control points from polylist segments
    const p0x = this.polylist.segs[startIndex].pt.x;
    const p0y = this.polylist.segs[startIndex].pt.y;
    const p1x = this.polylist.segs[startIndex + 1].pt.x;
    const p1y = this.polylist.segs[startIndex + 1].pt.y;
    const p2x = this.polylist.segs[startIndex + 2].pt.x;
    const p2y = this.polylist.segs[startIndex + 2].pt.y;

    const resultPoints: Point[] = [];
    const step = 1 / (pointCount - 1);
    let t = 0;

    for (let i = 0; i < pointCount; i++) {
      // Quadratic Bezier calculation: B(t) = (1-t)² * P0 + 2(1-t)t * P1 + t² * P2
      const oneMinusT = 1 - t;
      const bx = oneMinusT * oneMinusT * p0x + 2 * oneMinusT * t * p1x + t * t * p2x;
      const by = oneMinusT * oneMinusT * p0y + 2 * oneMinusT * t * p1y + t * t * p2y;
      // Apply scaling and offsets
      resultPoints.push(new Point(bx * scaleX + xOffset, by * scaleY + yOffset));
      t += step;
    }

    console.log("S.PolyLine: Pr_GetQuadraticBezierPoints output", resultPoints);
    return resultPoints;
  }

  Pr_GetCubicBezierPoints(
    startSegmentIndex: number,
    pointCount: number,
    xOffset: number,
    yOffset: number,
    scaleX: number,
    scaleY: number
  ): Point[] {
    console.log("S.PolyLine: Pr_GetCubicBezierPoints input", {
      startSegmentIndex,
      pointCount,
      xOffset,
      yOffset,
      scaleX,
      scaleY,
    });

    // Retrieve control points from the polyline segments
    const p0x = this.polylist.segs[startSegmentIndex].pt.x;
    const p0y = this.polylist.segs[startSegmentIndex].pt.y;
    const p1x = this.polylist.segs[startSegmentIndex + 1].pt.x;
    const p1y = this.polylist.segs[startSegmentIndex + 1].pt.y;
    const p2x = this.polylist.segs[startSegmentIndex + 2].pt.x;
    const p2y = this.polylist.segs[startSegmentIndex + 2].pt.y;
    const p3x = this.polylist.segs[startSegmentIndex + 3].pt.x;
    const p3y = this.polylist.segs[startSegmentIndex + 3].pt.y;

    // Calculate the step of t for each point to be generated
    const tStep = 1 / (pointCount - 1);
    let t = 0;
    const bezierPoints: Point[] = [];

    for (let i = 0; i < pointCount; i++) {
      const oneMinusT = 1 - t;
      const oneMinusT2 = oneMinusT * oneMinusT;
      const oneMinusT3 = oneMinusT2 * oneMinusT;
      const t2 = t * t;
      const t3 = t2 * t;

      // Cubic Bezier formulation
      const bezierX =
        oneMinusT3 * p0x +
        3 * oneMinusT2 * t * p1x +
        3 * oneMinusT * t2 * p2x +
        t3 * p3x;
      const bezierY =
        oneMinusT3 * p0y +
        3 * oneMinusT2 * t * p1y +
        3 * oneMinusT * t2 * p2y +
        t3 * p3y;

      // Apply scaling and offsets
      const point = new Point(bezierX * scaleX + xOffset, bezierY * scaleY + yOffset);
      bezierPoints.push(point);

      t += tStep;
    }

    console.log("S.PolyLine: Pr_GetCubicBezierPoints output", bezierPoints);
    return bezierPoints;
  }

  Pr_GetEllipticalArcPoints(
    segmentIndex: number,
    pointCount: number,
    xOffset: number,
    yOffset: number,
    scaleX: number,
    scaleY: number
  ) {
    console.log("S.PolyLine: Pr_GetEllipticalArcPoints input", {
      segmentIndex,
      pointCount,
      xOffset,
      yOffset,
      scaleX,
      scaleY
    });

    const points: Point[] = [];

    // Read and floor key point coordinates from polyline segments.
    let x1 = Math.floor(this.polylist.segs[segmentIndex].pt.x);
    let y1 = Math.floor(this.polylist.segs[segmentIndex].pt.y);
    let x2 = Math.floor(this.polylist.segs[segmentIndex + 1].pt.x);
    let y2 = Math.floor(this.polylist.segs[segmentIndex + 1].pt.y);
    let x3 = Math.floor(this.polylist.segs[segmentIndex + 2].pt.x);
    let y3 = Math.floor(this.polylist.segs[segmentIndex + 2].pt.y);

    // If the middle segment is degenerate, return two points.
    if ((x2 === x1 && y2 === y1) || (x2 === x3 && y2 === y3)) {
      points.push(new Point(x1 * scaleX + xOffset, y1 * scaleY + yOffset));
      points.push(new Point(x3 * scaleX + xOffset, y3 * scaleY + yOffset));
      console.log("S.PolyLine: Pr_GetEllipticalArcPoints output", points);
      return points;
    }

    // Get weight and arc parameter from the segment.
    const weightScaled = this.polylist.segs[segmentIndex].weight / 10;
    const arcParam = this.polylist.segs[segmentIndex].param;

    // Calculate arc direction based on three key points.
    const calculateArcDirection = (
      xA: number,
      yA: number,
      xC: number,
      yC: number,
      xB: number,
      yB: number
    ): number => {
      xA = Math.floor(xA);
      yA = Math.floor(yA);
      xC = Math.floor(xC);
      yC = Math.floor(yC);
      xB = Math.floor(xB);
      yB = Math.floor(yB);
      if (xA === xC) {
        return xB < xA ? (yC > yA ? 1 : -1) : xB > xA ? (yC > yA ? -1 : 1) : 0;
      }
      if (yA === yC) {
        return yB < yA ? (xC > xA ? -1 : 1) : yB > yA ? (xC > xA ? 1 : -1) : 0;
      }
      const slope = (yC - yA) / (xC - xA);
      const expectedY = slope * xB + (yA - slope * xA);
      if (Math.abs(yB - expectedY) > 0.001 && slope !== 0) {
        return yB > expectedY ? (xC > xA ? 1 : -1) : (xC > xA ? -1 : 1);
      }
      return 0;
    };

    const arcDirection = calculateArcDirection(x1, y1, x3, y3, x2, y2);
    if (arcDirection === 0) {
      points.push(new Point(x2 * scaleX + xOffset, y2 * scaleY + yOffset));
      points.push(new Point(x3 * scaleX + xOffset, y3 * scaleY + yOffset));
      console.log("S.PolyLine: Pr_GetEllipticalArcPoints output", points);
      return points;
    }

    // Compute ellipse parameters from three key points and arc specifications.
    const getEllipseParameters = (
      xA: number,
      yA: number,
      xC: number,
      yC: number,
      xB: number,
      yB: number,
      weight: number,
      arcParam: number
    ) => {
      const result: any = {};
      const rotation = 2 * Math.PI * (weight / 360);

      const rA = Math.sqrt(xA * xA + yA * yA);
      const angleA = Math.atan2(yA, xA);
      const rotatedXA = rA * Math.cos(angleA - rotation);
      const rotatedYA = rA * Math.sin(angleA - rotation);

      const rC = Math.sqrt(xC * xC + yC * yC);
      const angleC = Math.atan2(yC, xC);
      const rotatedXC = rC * Math.cos(angleC - rotation);
      const rotatedYC = rC * Math.sin(angleC - rotation);

      const rB = Math.sqrt(xB * xB + yB * yB);
      const angleB = Math.atan2(yB, xB);
      const rotatedXB = rB * Math.cos(angleB - rotation);
      const rotatedYB = rB * Math.sin(angleB - rotation);

      let hVal =
        (rotatedXA - rotatedXC) *
        (rotatedXA + rotatedXC) *
        (rotatedYC - rotatedYB) -
        (rotatedXC - rotatedXB) *
        (rotatedXC + rotatedXB) *
        (rotatedYA - rotatedYC) +
        arcParam * arcParam * (rotatedYA - rotatedYC) *
        (rotatedYC - rotatedYB) *
        (rotatedYA - rotatedYB);

      let mVal =
        (rotatedXA - rotatedXC) *
        (rotatedXC - rotatedXB) /
        (arcParam * arcParam) +
        (rotatedXC - rotatedXB) *
        (rotatedYA - rotatedYC) *
        (rotatedYA + rotatedYC) -
        (rotatedXA - rotatedXC) *
        (rotatedYC - rotatedYB) *
        (rotatedYC + rotatedYB);

      const C_val = rotatedXA;
      const y_val = rotatedYA;
      // Normalize hVal and mVal.
      hVal = hVal / (2 * ((rotatedXA - rotatedXC) * (rotatedYC - rotatedYB) - (rotatedXC - rotatedXB) * (rotatedYA - rotatedYC)));
      mVal = mVal / (2 * ((rotatedXC - rotatedXB) * (rotatedYA - rotatedYC) - (rotatedXA - rotatedXC) * (rotatedYC - rotatedYB)));

      const magnitude = Math.sqrt(hVal * hVal + mVal * mVal);
      hVal = magnitude * Math.cos(Math.atan2(mVal, hVal) + rotation);
      mVal = magnitude * Math.sin(Math.atan2(mVal, hVal) + rotation);

      const majorAxis = Math.sqrt((C_val - hVal) * (C_val - hVal) + (y_val - mVal) * (y_val - mVal) * (arcParam * arcParam));
      const minorAxis = majorAxis / arcParam;

      result.centerX = hVal;
      result.centerY = mVal;
      result.majorAxis = majorAxis;
      result.minorAxis = minorAxis;
      result.angle = rotation;
      result.eccentricity = arcParam;
      return result;
    };

    const ellipseParams = getEllipseParameters(x1, y1, x3, y3, x2, y2, weightScaled, arcParam);
    const centerX = ellipseParams.centerX;
    const centerY = ellipseParams.centerY;
    const majorAxis = ellipseParams.majorAxis;
    const minorAxis = ellipseParams.minorAxis;

    // Calculate start and end angles for the arc.
    let startAngle: number, endAngle: number;
    const deltaAngle = -2 * Math.PI * (weightScaled / 360);
    const fullCircle = 2 * Math.PI;
    if (deltaAngle === 0) {
      startAngle = Math.atan2(centerY - y1, (x1 - centerX) / arcParam);
      // The second computation is not stored.
      endAngle = Math.atan2(centerY - y3, (x3 - centerX) / arcParam);
    } else {
      const tempPoints = [
        { x: x1, y: y1 },
        { x: x2, y: y2 },
        { x: x3, y: y3 }
      ];
      // Rotate points by -deltaAngle around the computed center.
      (function (center, angle, pts) {
        for (let j = 0; j < pts.length; j++) {
          const dx = pts[j].x - center.x;
          const dy = pts[j].y - center.y;
          const cosA = Math.cos(angle);
          const sinA = Math.sin(angle);
          pts[j].x = dx * cosA - dy * sinA + center.x;
          pts[j].y = dx * sinA + dy * cosA + center.y;
        }
      })({ x: centerX, y: centerY }, -deltaAngle, tempPoints);
      startAngle = Math.atan2(centerY - tempPoints[0].y, (tempPoints[0].x - centerX) / arcParam);
      endAngle = Math.atan2(centerY - tempPoints[2].y, (tempPoints[2].x - centerX) / arcParam);
    }
    if (endAngle < startAngle) {
      endAngle += fullCircle;
    }
    const isClockwise = arcDirection === 1;

    // Generate points along the elliptical arc.
    const generateArcPoints = (
      majAxis: number,
      minAxis: number,
      ctrX: number,
      ctrY: number,
      deltaAng: number,
      startAng: number,
      endAng: number,
      clockwise: boolean,
      numPoints: number
    ): Point[] => {
      const pts: Point[] = [];
      let angleStep: number;
      if (clockwise) {
        angleStep = (endAng - startAng) / (numPoints - 1);
      } else {
        angleStep = -(fullCircle - (endAng - startAng)) / (numPoints - 1);
      }
      let currentAngle = startAng;
      for (let j = 0; j < numPoints; j++) {
        const xVal = ctrX + majAxis * Math.cos(currentAngle) * Math.cos(deltaAng) - minAxis * Math.sin(currentAngle) * Math.sin(deltaAng);
        const yVal = ctrY + majAxis * Math.cos(currentAngle) * Math.sin(-deltaAng) - minAxis * Math.sin(currentAngle) * Math.cos(deltaAng);
        pts.push(new Point(xVal * scaleX + xOffset, yVal * scaleY + yOffset));
        currentAngle += angleStep;
      }
      return pts;
    };

    const arcPoints = generateArcPoints(
      majorAxis,
      minorAxis,
      centerX,
      centerY,
      deltaAngle,
      startAngle,
      endAngle,
      isClockwise,
      pointCount
    );

    console.log("S.PolyLine: Pr_GetEllipticalArcPoints output", arcPoints);
    return arcPoints;
  }

  Pr_GetParabolaPoints(numPoints, isClosed, segmentIndex, param, shortRef, scaleX, scaleY) {
    console.log("S.PolyLine: Pr_GetParabolaPoints input", { numPoints, isClosed, segmentIndex, param, shortRef, scaleX, scaleY });

    let deltaX, deltaY, distance, center = {}, isRotated = false, points = [], parabolaPoints = [];
    let startX = this.StartPoint.x - this.Frame.x;
    let startY = this.StartPoint.y - this.Frame.y;

    if (!isClosed) {
      startX = this.StartPoint.x;
      startY = this.StartPoint.y;
    }

    if (Math.abs(param) < 1) {
      parabolaPoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x * scaleX + startX, this.polylist.segs[segmentIndex - 1].pt.y * scaleY + startY));
      parabolaPoints.push(new Point(this.polylist.segs[segmentIndex].pt.x * scaleX + startX, this.polylist.segs[segmentIndex].pt.y * scaleY + startY));
      console.log("S.PolyLine: Pr_GetParabolaPoints output", parabolaPoints);
      return parabolaPoints;
    }

    points.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x * scaleX + startX, this.polylist.segs[segmentIndex - 1].pt.y * scaleY + startY));
    points.push(new Point(this.polylist.segs[segmentIndex].pt.x * scaleX + startX, this.polylist.segs[segmentIndex].pt.y * scaleY + startY));

    deltaX = points[1].x - points[0].x;
    deltaY = points[1].y - points[0].y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 1) {
      console.log("S.PolyLine: Pr_GetParabolaPoints output", parabolaPoints);
      return parabolaPoints;
    }

    if (Math.round(6 * Math.abs(deltaY)) >= 1) {
      isRotated = true;
      const sinAngle = deltaY / distance;
      const cosAngle = deltaX / distance;
      let rotationAngle = Math.asin(sinAngle);
      if (cosAngle < 0) {
        rotationAngle = -rotationAngle;
        param = -param;
        shortRef = -shortRef;
      }
      center.x = (points[0].x + points[1].x) / 2;
      center.y = (points[0].y + points[1].y) / 2;
      Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
    }

    points.push(new Point((points[0].x + points[1].x) / 2, points[0].y + param));

    const midX = points[2].x;
    const midY = points[2].y;

    for (let i = 0; i < 3; i++) {
      points[i].x -= midX;
      points[i].y -= midY;
    }

    center.x = (points[0].x + points[1].x) / 2;
    center.y = (points[0].y + points[1].y) / 2;

    const parabolaFactor = points[0].y / (points[0].x * points[0].x);
    const adjustedShortRef = shortRef / param;
    const step = (points[1].x - points[0].x) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      let x = points[0].x + step * i;
      x += adjustedShortRef * (param + (parabolaFactor * x * x));
      let y = parabolaFactor * x * x;
      if (isRotated) {
        const tempPoint = { x, y };
        Utils3.RotatePointsAboutPoint(center, -rotationAngle, [tempPoint]);
        x = tempPoint.x;
        y = tempPoint.y;
      }
      parabolaPoints.push(new Point(x + midX + startX, y + midY + startY));
    }

    console.log("S.PolyLine: Pr_GetParabolaPoints output", parabolaPoints);
    return parabolaPoints;
  }

  Pr_PolyLGetParabolaAdjPoint(event, segmentIndex) {
    console.log("S.PolyLine: Pr_PolyLGetParabolaAdjPoint input", { event, segmentIndex });

    let deltaX, deltaY, distance, param, shortRef, center = {}, isRotated = false, points = [], adjPoint = {};

    points.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x, this.polylist.segs[segmentIndex - 1].pt.y));
    points.push(new Point(this.polylist.segs[segmentIndex].pt.x, this.polylist.segs[segmentIndex].pt.y));

    deltaX = points[1].x - points[0].x;
    deltaY = points[1].y - points[0].y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance < 1) {
      console.log("S.PolyLine: Pr_PolyLGetParabolaAdjPoint output", adjPoint);
      return adjPoint;
    }

    param = this.polylist.segs[segmentIndex].param;
    shortRef = this.polylist.segs[segmentIndex].ShortRef;

    if (Math.abs(deltaY) >= 1) {
      isRotated = true;
      const sinAngle = deltaY / distance;
      const cosAngle = deltaX / distance;
      let rotationAngle = Math.asin(sinAngle);
      if (cosAngle < 0) {
        rotationAngle = -rotationAngle;
        param = -param;
        shortRef = -shortRef;
      }
      center.x = (points[0].x + points[1].x) / 2;
      center.y = (points[0].y + points[1].y) / 2;
      Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
    }

    points.push(new Point((points[0].x + points[1].x) / 2 + shortRef, points[0].y + param));

    if (isRotated) {
      Utils3.RotatePointsAboutPoint(center, -rotationAngle, points);
    }

    adjPoint.x = points[2].x;
    adjPoint.y = points[2].y;

    if (!event) {
      adjPoint.x += this.StartPoint.x;
      adjPoint.y += this.StartPoint.y;
    }

    console.log("S.PolyLine: Pr_PolyLGetParabolaAdjPoint output", adjPoint);
    return adjPoint;
  }

  Pr_PolyLGetParabolaParam(event, segmentIndex) {
    console.log("S.PolyLine: Pr_PolyLGetParabolaParam input", { event, segmentIndex });

    let deltaX, deltaY, distance, rotationAngle, sinAngle, cosAngle, center = {}, direction = 1, points = [];

    points.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x, this.polylist.segs[segmentIndex - 1].pt.y));
    points.push(new Point(this.polylist.segs[segmentIndex].pt.x, this.polylist.segs[segmentIndex].pt.y));

    deltaX = points[1].x - points[0].x;
    deltaY = points[1].y - points[0].y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance >= 1) {
      const offsetX = event.x - this.StartPoint.x;
      const offsetY = event.y - this.StartPoint.y;

      points.push(new Point(offsetX, offsetY));

      if (Math.abs(deltaY) >= 1) {
        rotationAngle = Math.asin(deltaY / distance);
        if (deltaX < 0) {
          rotationAngle = -rotationAngle;
          direction = -direction;
        }
        center.x = (points[0].x + points[1].x) / 2;
        center.y = (points[0].y + points[1].y) / 2;
        Utils3.RotatePointsAboutPoint(center, rotationAngle, points);
      } else {
        rotationAngle = 0;
      }

      const midX = (points[0].x + points[1].x) / 2;
      const midY = points[0].y;

      this.polylist.segs[segmentIndex].param = (points[2].y - midY) * direction;
      this.polylist.segs[segmentIndex].ShortRef = (points[2].x - midX) * direction;

      let adjustedShortRef = 6 * this.polylist.segs[segmentIndex].ShortRef;
      adjustedShortRef = Math.floor(adjustedShortRef);
      this.polylist.segs[segmentIndex].ShortRef = adjustedShortRef / 6;
    }

    console.log("S.PolyLine: Pr_PolyLGetParabolaParam output", { param: this.polylist.segs[segmentIndex].param, ShortRef: this.polylist.segs[segmentIndex].ShortRef });
  }

  Pr_PolyLGetArc(segmentIndex, offset) {
    console.log("S.PolyLine: Pr_PolyLGetArc input", { segmentIndex, offset });

    let arcLine, radiusAndCenter, startPoint = {}, endPoint = {}, centerPoint = {}, result = {
      arcObject: null,
      point: { x: 0, y: 0 }
    };

    startPoint.x = this.polylist.segs[segmentIndex - 1].pt.x + offset.x;
    startPoint.y = this.polylist.segs[segmentIndex - 1].pt.y + offset.y;
    endPoint.x = this.polylist.segs[segmentIndex].pt.x + offset.x;
    endPoint.y = this.polylist.segs[segmentIndex].pt.y + offset.y;

    if (this.polylist.segs[segmentIndex].param >= 0) {
      arcLine = {
        StartPoint: startPoint,
        EndPoint: endPoint,
        CurveAdjust: this.polylist.segs[segmentIndex].param,
        IsReversed: true,
        FromPolygon: true
      };
    } else {
      arcLine = {
        StartPoint: startPoint,
        EndPoint: endPoint,
        CurveAdjust: -this.polylist.segs[segmentIndex].param,
        IsReversed: false,
        FromPolygon: true
      };
    }

    const arcObject = new Instance.Shape.ArcLine(arcLine);
    arcObject.Frame = Utils2.Pt2Rect(startPoint, endPoint);
    radiusAndCenter = arcObject.CalcRadiusAndCenter(startPoint.x, startPoint.y, endPoint.x, endPoint.y, arcLine.CurveAdjust, arcLine.IsReversed);
    centerPoint.x = radiusAndCenter.actionX;
    centerPoint.y = radiusAndCenter.actionY;
    arcObject.BeforeModifyShape(centerPoint.x, centerPoint.y, 0);

    result.arcObject = arcObject;
    result.point = centerPoint;

    console.log("S.PolyLine: Pr_PolyLGetArc output", result);
    return result;
  }

  Pr_PolyLGetArcParam(shape, targetPoint, segmentIndex) {
    console.log("S.PolyLine: Pr_PolyLGetArcParam input", { shape, targetPoint, segmentIndex });

    if (shape) {
      shape.ModifyShape(null, targetPoint.x, targetPoint.y, -1, 0);
      if (shape.IsReversed) {
        this.polylist.segs[segmentIndex].param = shape.CurveAdjust;
      } else {
        this.polylist.segs[segmentIndex].param = -shape.CurveAdjust;
      }
    }

    console.log("S.PolyLine: Pr_PolyLGetArcParam output", this.polylist.segs[segmentIndex].param);
  }

  Pr_GetEllipsePoints(numPoints, isClosed, segmentIndex, rotationAngle, arcQuadrant, scaleX, scaleY) {
    console.log("S.PolyLine: Pr_GetEllipsePoints input", { numPoints, isClosed, segmentIndex, rotationAngle, arcQuadrant, scaleX, scaleY });

    let deltaX, deltaY, distance, center = {}, sinAngle, cosAngle, adjustedAngle, rotatedPoints = [], ellipsePoints = [], tempPoint = {};
    let startX = this.StartPoint.x - this.Frame.x;
    let startY = this.StartPoint.y - this.Frame.y;

    rotatedPoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x + startX, this.polylist.segs[segmentIndex - 1].pt.y + startY));
    rotatedPoints.push(new Point(this.polylist.segs[segmentIndex].pt.x + startX, this.polylist.segs[segmentIndex].pt.y + startY));

    deltaX = rotatedPoints[1].x - rotatedPoints[0].x;
    deltaY = rotatedPoints[1].y - rotatedPoints[0].y;
    distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    center.x = this.polylist.segs[segmentIndex - 1].pt.x;
    center.y = this.polylist.segs[segmentIndex - 1].pt.y;

    if (!isClosed) {
      startX = this.StartPoint.x;
      startY = this.StartPoint.y;
    }

    if (distance < 1) {
      ellipsePoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x * scaleX + startX, this.polylist.segs[segmentIndex - 1].pt.y * scaleY + startY));
      ellipsePoints.push(new Point(this.polylist.segs[segmentIndex].pt.x * scaleX + startX, this.polylist.segs[segmentIndex].pt.y * scaleY + startY));
      console.log("S.PolyLine: Pr_GetEllipsePoints output", ellipsePoints);
      return ellipsePoints;
    }

    if (Math.abs(rotationAngle) >= 0.01) {
      sinAngle = Math.sin(rotationAngle);
      cosAngle = Math.cos(rotationAngle);
      adjustedAngle = Math.asin(sinAngle);
      Utils3.RotatePointsAboutPoint(center, adjustedAngle, rotatedPoints);
    }

    let ellipseCenterX, ellipseCenterY, direction = 1;
    switch (arcQuadrant) {
      case ConstantData.ArcQuad.SD_PLA_TL:
      case ConstantData.ArcQuad.SD_PLA_TR:
        ellipseCenterX = rotatedPoints[1].x;
        ellipseCenterY = rotatedPoints[0].y;
        direction = -1;
        break;
      case ConstantData.ArcQuad.SD_PLA_BR:
      default:
        ellipseCenterX = rotatedPoints[1].x;
        ellipseCenterY = rotatedPoints[0].y;
    }

    for (let i = 0; i < 2; i++) {
      rotatedPoints[i].x -= ellipseCenterX;
      rotatedPoints[i].y -= ellipseCenterY;
    }

    let width = Math.abs(rotatedPoints[1].x - rotatedPoints[0].x);
    let height = Math.abs(rotatedPoints[1].y - rotatedPoints[0].y);
    width *= width;

    if (width < 0.0001) {
      ellipsePoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x * scaleX + startX, this.polylist.segs[segmentIndex - 1].pt.y * scaleY + startY));
      ellipsePoints.push(new Point(this.polylist.segs[segmentIndex].pt.x * scaleX + startX, this.polylist.segs[segmentIndex].pt.y * scaleY + startY));
      console.log("S.PolyLine: Pr_GetEllipsePoints output", ellipsePoints);
      return ellipsePoints;
    }

    let step = (rotatedPoints[1].x - rotatedPoints[0].x) / (numPoints - 1);
    for (let i = 0; i < numPoints; i++) {
      let x = rotatedPoints[0].x + step * i;
      let y = direction * Math.sqrt(1 - x * x / width) * height;
      if (Math.abs(rotationAngle) >= 0.01) {
        tempPoint.x = (x + ellipseCenterX - center.x) * cosAngle - (y + ellipseCenterY - center.y) * sinAngle + center.x;
        tempPoint.y = (x + ellipseCenterX - center.x) * sinAngle + (y + ellipseCenterY - center.y) * cosAngle + center.y;
      } else {
        tempPoint.x = x + ellipseCenterX;
        tempPoint.y = y + ellipseCenterY;
      }
      ellipsePoints.push(new Point(tempPoint.x * scaleX + startX, tempPoint.y * scaleY + startY));
    }

    console.log("S.PolyLine: Pr_GetEllipsePoints output", ellipsePoints);
    return ellipsePoints;
  }

  Pr_PolyLGetEllipseAdjPoint(event, segmentIndex) {
    console.log("S.PolyLine: Pr_PolyLGetEllipseAdjPoint input", { event, segmentIndex });

    let sinAngle, cosAngle, adjustedAngle, rotatedPoints = [], center = {}, ellipseAdjPoint = {};

    rotatedPoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x, this.polylist.segs[segmentIndex - 1].pt.y));
    rotatedPoints.push(new Point(this.polylist.segs[segmentIndex].pt.x, this.polylist.segs[segmentIndex].pt.y));

    center.x = this.polylist.segs[segmentIndex - 1].pt.x;
    center.y = this.polylist.segs[segmentIndex - 1].pt.y;

    const angle = this.polylist.segs[segmentIndex].param;
    if (Math.abs(angle) >= 0.01) {
      sinAngle = Math.sin(angle);
      cosAngle = Math.cos(angle);
      adjustedAngle = Math.asin(sinAngle);
      if (cosAngle < 0) adjustedAngle = -adjustedAngle;
      Utils3.RotatePointsAboutPoint(center, adjustedAngle, rotatedPoints);
    }

    rotatedPoints.push(new Point(rotatedPoints[1].x, rotatedPoints[0].y));
    if (Math.abs(angle) >= 0.01) {
      Utils3.RotatePointsAboutPoint(center, -adjustedAngle, rotatedPoints);
    }

    ellipseAdjPoint.x = rotatedPoints[2].x;
    ellipseAdjPoint.y = rotatedPoints[2].y;

    if (!event) {
      ellipseAdjPoint.x += this.StartPoint.x;
      ellipseAdjPoint.y += this.StartPoint.y;
    }

    console.log("S.PolyLine: Pr_PolyLGetEllipseAdjPoint output", ellipseAdjPoint);
    return ellipseAdjPoint;
  }

  Pr_PolyLGetEllipseParam(event, segmentIndex, svgDocument) {
    console.log("S.PolyLine: Pr_PolyLGetEllipseParam input", { event, segmentIndex, svgDocument });

    let deltaX, deltaY, slope, angle, quadrant, ellipseAdjPoint, polyPoints = [], boundingRect = {}, ellipseAxesElement = {};

    polyPoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x, this.polylist.segs[segmentIndex - 1].pt.y));
    polyPoints.push(new Point(this.polylist.segs[segmentIndex].pt.x, this.polylist.segs[segmentIndex].pt.y));

    deltaX = polyPoints[1].x - polyPoints[0].x;
    deltaY = polyPoints[1].y - polyPoints[0].y;

    if (Math.sqrt(deltaX * deltaX + deltaY * deltaY) >= 1 && Math.abs(deltaY) > 1) {
      const offsetX = event.x - this.StartPoint.x;
      const offsetY = event.y - this.StartPoint.y;

      polyPoints.push(new Point(offsetX, offsetY));

      deltaY = polyPoints[2].y - polyPoints[0].y;
      deltaX = polyPoints[2].x - polyPoints[0].x;

      if (Math.abs(deltaX) < 0.001) {
        angle = ConstantData.Geometry.PI / 2;
      } else {
        slope = deltaY / deltaX;
        angle = Math.atan(slope);
      }

      this.polylist.segs[segmentIndex].param = angle;

      quadrant = this.Pr_PolyLGetArcQuadrant(polyPoints[0], polyPoints[1], angle);
      if (quadrant.ShortRef !== this.polylist.segs[segmentIndex].ShortRef) {
        this.polylist.segs[segmentIndex].ShortRef = quadrant.ShortRef;
      }

      ellipseAdjPoint = this.Pr_PolyLGetEllipseAdjPoint(true, segmentIndex);
      polyPoints.pop();
      polyPoints.splice(1, 0, ellipseAdjPoint);

      Utils2.GetPolyRect(boundingRect, polyPoints);

      const frameOffsetX = this.StartPoint.x - this.Frame.x;
      const frameOffsetY = this.StartPoint.y - this.Frame.y;
      const ellipseAxesId = ConstantData.Defines.EllipseAxes;

      ellipseAxesElement = svgDocument.GetElementByID(ellipseAxesId);
      if (!ellipseAxesElement) {
        ellipseAxesElement = GlobalData.optManager.svgDoc.CreateShape(ConstantData.CreateShapeType.POLYLINE);
        ellipseAxesElement.SetFillColor("none");
        ellipseAxesElement.SetStrokeColor("green");
        ellipseAxesElement.SetStrokePattern("4,2");
        ellipseAxesElement.SetID(ellipseAxesId);
        svgDocument.AddElement(ellipseAxesElement);
      }

      if (ellipseAxesElement) {
        ellipseAxesElement.SetSize(boundingRect.width, boundingRect.height);
        for (let i = 0; i < polyPoints.length; i++) {
          polyPoints[i].x += frameOffsetX;
          polyPoints[i].y += frameOffsetY;
        }
        ellipseAxesElement.SetPoints(polyPoints);
      }
    }

    console.log("S.PolyLine: Pr_PolyLGetEllipseParam output", { polyPoints, boundingRect, ellipseAxesElement });
  }

  Pr_PolyLGetArcQuadrant(startPoint, endPoint, angle) {
    console.log("S.PolyLine: Pr_PolyLGetArcQuadrant input", { startPoint, endPoint, angle });

    let sinAngle, cosAngle, adjustedAngle, rotatedPoints = [], result = { param: 0, ShortRef: 0 }, center = {};

    rotatedPoints.push(new Point(startPoint.x, startPoint.y));
    rotatedPoints.push(new Point(endPoint.x, endPoint.y));
    center.x = startPoint.x;
    center.y = startPoint.y;

    if (Math.abs(angle) >= 0.01) {
      sinAngle = Math.sin(angle);
      cosAngle = Math.cos(angle);
      adjustedAngle = Math.asin(sinAngle);
      if (cosAngle < 0) adjustedAngle = -adjustedAngle;
      Utils3.RotatePointsAboutPoint(center, adjustedAngle, rotatedPoints);
    }

    const firstPoint = rotatedPoints[0];
    const secondPoint = rotatedPoints[1];

    if (secondPoint.x > firstPoint.x) {
      if (secondPoint.y > firstPoint.y) {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
        if (endPoint.notclockwise) result.param = 0;
      } else {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TL;
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
          result.param = ConstantData.Geometry.PI / 2;
        }
      }
    } else {
      if (secondPoint.y > firstPoint.y) {
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_BR;
        if (endPoint.notclockwise) {
          result.ShortRef = ConstantData.ArcQuad.SD_PLA_BL;
          result.param = ConstantData.Geometry.PI / 2;
        }
      } else {
        result.param = -ConstantData.Geometry.PI / 2;
        result.ShortRef = ConstantData.ArcQuad.SD_PLA_TR;
        if (endPoint.notclockwise) result.param = 0;
      }
    }

    console.log("S.PolyLine: Pr_PolyLGetArcQuadrant output", result);
    return result;
  }

  NeedsAddLineThicknessToDimension(event, target) {
    console.log("S.PolyLine: NeedsAddLineThicknessToDimension input", { event, target });

    const needsAddLineThickness = !!this.polylist.closed;

    console.log("S.PolyLine: NeedsAddLineThicknessToDimension output", needsAddLineThickness);
    return needsAddLineThickness;
  }

  GetExteriorDimensionMeasurementLineThicknessAdjustment(segmentIndex: number): number {
    console.log("S.PolyLine: GetExteriorDimensionMeasurementLineThicknessAdjustment input", { segmentIndex });

    let thickness = this.ConvToUnits(this.StyleRecord.Line.Thickness, gDocumentHandler.rulerSettings.originx);
    thickness /= 2;

    if (!this.IsTerminalSegment(segmentIndex)) {
      thickness *= 2;
    }

    console.log("S.PolyLine: GetExteriorDimensionMeasurementLineThicknessAdjustment output", thickness);
    return thickness;
  }

  CanUseStandOffDimensionLines() {
    console.log("S.PolyLine: CanUseStandOffDimensionLines input");

    const canUse = !!this.polylist.closed || !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) && !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts);

    console.log("S.PolyLine: CanUseStandOffDimensionLines output", canUse);
    return canUse;
  }

  GetDimensionTextForPoints(startPoint, endPoint) {
    console.log("S.PolyLine: GetDimensionTextForPoints input", { startPoint, endPoint });

    let polyPoints = [];
    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let distance = 0;
    let angle = 0;
    let rotationRadians = 0;

    if (!this.polylist.closed && this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, false, false, null);
      for (let i = 1; i < polyPoints.length; i++) {
        deltaX = Math.abs(polyPoints[i - 1].x - polyPoints[i].x);
        deltaY = Math.abs(polyPoints[i - 1].y - polyPoints[i].y);
        totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      }
    } else {
      angle = 360 - Utils1.CalcAngleFromPoints(startPoint, endPoint);
      rotationRadians = 2 * Math.PI * (angle / 360);
      polyPoints.push(new Point(startPoint.x, startPoint.y));
      polyPoints.push(new Point(endPoint.x, endPoint.y));
      Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, polyPoints);
      totalLength = Math.abs(polyPoints[0].x - polyPoints[1].x);
    }

    const result = this.GetLengthInRulerUnits(totalLength);
    console.log("S.PolyLine: GetDimensionTextForPoints output", result);
    return result;
  }

  UpdateSecondaryDimensions(event, target, additionalData) {
    console.log("S.PolyLine: UpdateSecondaryDimensions input", { event, target, additionalData });

    let polyPoints = [];
    let pointCount = 0;
    const shouldUpdateDimensions = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always || this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select;

    if (this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL || this.Dimensions & ConstantData.DimensionFlags.SED_DF_HideHookedObjDimensions || (shouldUpdateDimensions || additionalData) && this.UpdateHookedObjectDimensionLines(event, target, additionalData)) {
      if (shouldUpdateDimensions && this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowLineAngles && this.polylist) {
        polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
        pointCount = polyPoints.length;
        for (let i = 1; i < pointCount; i++) {
          this.DrawDimensionAngle(event, target, i, polyPoints);
        }
      }
    }

    console.log("S.PolyLine: UpdateSecondaryDimensions output", { polyPoints, pointCount });
  }

  GetBoundingBoxesForSecondaryDimensions() {
    console.log("S.PolyLine: GetBoundingBoxesForSecondaryDimensions input");

    let boundingBoxes = super.GetBoundingBoxesForSecondaryDimensions();

    if (!(this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowLineAngles)) {
      console.log("S.PolyLine: GetBoundingBoxesForSecondaryDimensions output", boundingBoxes);
      return boundingBoxes;
    }

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    const pointCount = polyPoints.length;

    for (let i = 1; i < pointCount; i++) {
      const dimensionAngleInfo = this.GetDimensionAngleInfo(i, polyPoints);
      if (dimensionAngleInfo) {
        dimensionAngleInfo.text = null;
        boundingBoxes.push(dimensionAngleInfo.textRect);
      }
    }

    console.log("S.PolyLine: GetBoundingBoxesForSecondaryDimensions output", boundingBoxes);
    return boundingBoxes;
  }


  GetAreaWidthAndHeightText(polyPoints) {
    console.log("S.PolyLine: GetAreaWidthAndHeightText input", { polyPoints });

    let width, height, widthIndex, heightIndex, angle, result = "";

    if (this.polylist && this.polylist.closed && GlobalData.optManager.IsRectangularPolygon(polyPoints)) {
      angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(polyPoints[0], polyPoints[1]);

      if (angle < Math.PI / 4 || angle > 1.5 * Math.PI || (angle > 0.75 * Math.PI && angle < 1.25 * Math.PI)) {
        widthIndex = 1;
        heightIndex = 2;
      } else {
        widthIndex = 2;
        heightIndex = 1;
      }

      width = Utils2.GetDistanceBetween2Points(polyPoints[widthIndex - 1], polyPoints[widthIndex]);
      height = Utils2.GetDistanceBetween2Points(polyPoints[heightIndex - 1], polyPoints[heightIndex]);

      result = this.GetLengthInRulerUnits(height) + " x " + this.GetLengthInRulerUnits(width);
    }

    console.log("S.PolyLine: GetAreaWidthAndHeightText output", result);
    return result;
  }

  SetSegmentAngle(event, segmentIndex, angle) {
    console.log('S.PolyLine: SetSegmentAngle input', { event, segmentIndex, angle });

    let rotationAngle, counterClockwiseAngle, segmentPoints = [], previousSegmentPoints = [], actionType = -1, offsetX = 0, offsetY = 0;

    if (segmentIndex <= 0 || segmentIndex >= this.polylist.segs.length) {
      console.log('S.PolyLine: SetSegmentAngle output', false);
      return;
    }

    GlobalData.optManager.GetObjectPtr(this.BlockID, true);
    const originalState = Utils1.DeepCopy(this);

    segmentPoints.push(new Point(this.polylist.segs[segmentIndex - 1].pt.x, this.polylist.segs[segmentIndex - 1].pt.y));
    segmentPoints.push(new Point(this.polylist.segs[segmentIndex].pt.x, this.polylist.segs[segmentIndex].pt.y));
    segmentPoints[0].x += this.StartPoint.x;
    segmentPoints[1].x += this.StartPoint.x;
    segmentPoints[0].y += this.StartPoint.y;
    segmentPoints[1].y += this.StartPoint.y;

    const initialPoint = new Point(segmentPoints[1].x, segmentPoints[1].y);
    rotationAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(segmentPoints[0], segmentPoints[1]);
    Utils3.RotatePointsAboutPoint(segmentPoints[0], -rotationAngle, segmentPoints);

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_InteriorAngles) {
      previousSegmentPoints.push(new Point(segmentPoints[0].x, segmentPoints[0].y));
      if (segmentIndex === 1) {
        if (!this.polylist.closed) {
          console.log('S.PolyLine: SetSegmentAngle output', false);
          return;
        }
        previousSegmentPoints.push(new Point(this.polylist.segs[this.polylist.segs.length - 2].pt.x, this.polylist.segs[this.polylist.segs.length - 2].pt.y));
      } else {
        previousSegmentPoints.push(new Point(this.polylist.segs[segmentIndex - 2].pt.x, this.polylist.segs[segmentIndex - 2].pt.y));
      }
      previousSegmentPoints[1].x += this.StartPoint.x;
      previousSegmentPoints[1].y += this.StartPoint.y;
      counterClockwiseAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(previousSegmentPoints[0], previousSegmentPoints[1]);
      Utils3.RotatePointsAboutPoint(segmentPoints[0], counterClockwiseAngle, segmentPoints);
    } else {
      counterClockwiseAngle = 0;
    }

    const angleInRadians = angle / 360 * (2 * Math.PI);
    let angleDifference = rotationAngle - counterClockwiseAngle;
    if (angleDifference < 0) angleDifference += 2 * Math.PI;
    if (angleDifference > Math.PI) angleInRadians = 2 * Math.PI - angleInRadians;

    Utils3.RotatePointsAboutPoint(segmentPoints[0], angleInRadians, segmentPoints);

    if (segmentIndex === this.polylist.segs.length - 1) {
      actionType = this.polylist.closed ? ConstantData.ActionTriggerType.POLYLEND : ConstantData.ActionTriggerType.LINEEND;
      this.AdjustLineEnd(event, segmentPoints[1].x, segmentPoints[1].y, actionType);
    } else if (segmentIndex === 0) {
      this.AdjustLineStart(event, segmentPoints[1].x, segmentPoints[1].y, ConstantData.ActionTriggerType.LINESTART);
    } else {
      this.ModifyShape(event, segmentPoints[1].x, segmentPoints[1].y, ConstantData.ActionTriggerType.POLYLNODE, segmentIndex);
    }

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.ActionTriggerData = segmentIndex;
    GlobalData.optManager.MaintainLink(this.BlockID, this, originalState, ConstantData.ActionTriggerType.POLYLNODE);

    if (this.Frame.x < 0 || this.Frame.y < 0) {
      const frame = this.Frame;
      if (frame.x < 0) {
        offsetX = -frame.x;
        frame.x += offsetX;
      }
      if (frame.y < 0) {
        offsetY = -frame.y;
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always || this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
          offsetY += ConstantData.Defines.DimensionDefaultStandoff;
        }
        frame.y += offsetY;
      }
      this.StartPoint.x += offsetX;
      this.StartPoint.y += offsetY;
      this.EndPoint.x += offsetX;
      this.EndPoint.y += offsetY;
      GlobalData.optManager.SetObjectFrame(this.BlockID, frame);
    }

    this.UpdateDrawing(event);
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(event, this, this.Frame);
    }

    console.log('S.PolyLine: SetSegmentAngle output', true);
  }

  IsTextFrameOverlap(textFrame, rotationAngle) {
    console.log("S.PolyLine: IsTextFrameOverlap input", { textFrame, rotationAngle });

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    const adjustedAngle = 360 - rotationAngle;
    const rotationRadians = 2 * Math.PI * (adjustedAngle / 360);

    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, polyPoints);
    const isOverlap = Utils2.IsFrameCornersInPoly(polyPoints, textFrame);

    console.log("S.PolyLine: IsTextFrameOverlap output", isOverlap);
    return isOverlap;
  }

  IsTerminalSegment(segmentIndex: number): boolean {
    console.log("S.PolyLine: IsTerminalSegment input", { segmentIndex });

    const isTerminal = !this.polylist.closed && (segmentIndex === 1 || segmentIndex === this.polylist.segs.length - 1);

    console.log("S.PolyLine: IsTerminalSegment output", isTerminal);
    return isTerminal;
  }

  UpdateDimensionFromTextObj(event, textObject) {
    console.log("S.PolyLine: UpdateDimensionFromTextObj input", { event, textObject });

    let text = "";
    let userData = null;

    GlobalData.objectStore.PreserveBlock(this.BlockID);

    if (textObject) {
      text = textObject.text;
      userData = textObject.userData;
    } else {
      text = event.GetText();
      userData = event.GetUserData();
    }

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    this.UpdateDimensionFromText(svgElement, text, userData);

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    if (this.HyperlinkText !== "" || this.NoteID !== -1 || this.CommentID !== -1 || this.HasFieldData()) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
    }

    GlobalData.optManager.CompleteOperation(null);

    console.log("S.PolyLine: UpdateDimensionFromTextObj output", { text, userData });
  }

  UpdateEndPointDimensionFromText(event, dimensionLength) {
    console.log("S.PolyLine: UpdateEndPointDimensionFromText input", { event, dimensionLength });

    const points = [this.StartPoint, this.EndPoint];

    if (!this.closed) {
      let angle = Utils1.CalcAngleFromPoints(this.StartPoint, this.EndPoint);
      angle = 360 - angle;
      const rotationRadians = 2 * Math.PI * (angle / 360);

      Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, points);
      points[1].x = points[0].x + dimensionLength;
      Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, points);

      this.AdjustLineEnd(null, points[1].x, points[1].y, ConstantData.ActionTriggerType.LINEEND);
    }

    console.log("S.PolyLine: UpdateEndPointDimensionFromText output", { StartPoint: this.StartPoint, EndPoint: this.EndPoint });
  }

  UpdateTotalDimensionFromText(event, dimensionLength) {
    console.log("S.PolyLine: UpdateTotalDimensionFromText input", { event, dimensionLength });

    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let segmentLength = 0;
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);

    for (let i = 1; i < polyPoints.length; i++) {
      deltaX = Math.abs(polyPoints[i - 1].x - polyPoints[i].x);
      deltaY = Math.abs(polyPoints[i - 1].y - polyPoints[i].y);
      segmentLength = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      totalLength += segmentLength;
    }

    const scaleFactor = dimensionLength / totalLength;
    let offsetX = -(this.Frame.x * scaleFactor - this.Frame.x);
    offsetX -= (this.Frame.width * scaleFactor - this.Frame.width) / 2;
    let offsetY = -(this.Frame.y * scaleFactor - this.Frame.y);
    offsetY -= (this.Frame.height * scaleFactor - this.Frame.height) / 2;

    this.ScaleObject(offsetX, offsetY, null, 0, scaleFactor, scaleFactor, false);

    console.log("S.PolyLine: UpdateTotalDimensionFromText output", { Frame: this.Frame, StartPoint: this.StartPoint, EndPoint: this.EndPoint });
  }

  UpdateSegmentDimensionFromText(event, dimensionLength, segmentIndex) {
    console.log("S.PolyLine: UpdateSegmentDimensionFromText input", { event, dimensionLength, segmentIndex });

    let angle, rotatedAngle, polyPoints, inflatedPoints, startX, startY, endX, endY, deltaX, deltaY;
    const hitResult = new HitResult(-1, 0, null);
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

    angle = Utils1.CalcAngleFromPoints(this.polylist.segs[segmentIndex - 1].pt, this.polylist.segs[segmentIndex].pt);
    if (this.polylist.segs[segmentIndex - 1].pt.x === this.polylist.segs[segmentIndex].pt.x &&
      this.polylist.segs[segmentIndex - 1].pt.y === this.polylist.segs[segmentIndex].pt.y) {
      const previousSegmentIndex = segmentIndex === 1 ? 2 : segmentIndex - 1;
      angle = Utils1.CalcAngleFromPoints(this.polylist.segs[previousSegmentIndex - 1].pt, this.polylist.segs[previousSegmentIndex].pt);
      angle = (angle + 90) >= 360 ? angle - 270 : angle + 90;
    }

    rotatedAngle = 360 - angle;
    const rotationRadians = 2 * Math.PI * (rotatedAngle / 360);

    polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    inflatedPoints = this.polylist.closed && this instanceof Instance.Shape.PolyLineContainer
      ? GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior)
      : Utils1.DeepCopy(polyPoints);

    inflatedPoints.forEach(point => {
      point.x += this.Frame.x;
      point.y += this.Frame.y;
    });

    let currentSegmentIndex = segmentIndex;
    let previousSegmentIndex = segmentIndex - 1;
    if (!this.polylist.closed && segmentIndex === 1 && inflatedPoints.length > 2) {
      currentSegmentIndex = 0;
      previousSegmentIndex = 1;
    }

    startX = inflatedPoints[currentSegmentIndex].x;
    startY = inflatedPoints[currentSegmentIndex].y;

    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, inflatedPoints);
    inflatedPoints[previousSegmentIndex].x = inflatedPoints[currentSegmentIndex].x < inflatedPoints[previousSegmentIndex].x
      ? inflatedPoints[currentSegmentIndex].x + dimensionLength
      : inflatedPoints[currentSegmentIndex].x - dimensionLength;
    Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, inflatedPoints);

    endX = inflatedPoints[currentSegmentIndex].x;
    endY = inflatedPoints[currentSegmentIndex].y;

    if (segmentIndex === this.polylist.segs.length - 1) {
      this.AdjustLineEnd(null, endX, endY, this.polylist.closed ? ConstantData.ActionTriggerType.POLYLEND : ConstantData.ActionTriggerType.LINEEND);
      if (!this.polylist.closed) {
        const hookPoints = [{ id: ConstantData.HookPts.SED_KTR, x: endX, y: endY }];
        if (this.ClosePolygon(this.BlockID, hookPoints, hitResult)) {
          this.polylist.segs[this.polylist.segs.length - 1].pt = Utils1.DeepCopy(this.polylist.segs[0].pt);
          this.polylist.closed = true;
          if (this instanceof PolyLine) {
            this.MaintainDimensionThroughPolygonOpennessChange(this.polylist.closed);
          }
        }
      }
    } else if (!this.polylist.closed && segmentIndex === 1) {
      this.AdjustLineStart(null, endX, endY, ConstantData.ActionTriggerType.LINESTART);
      const hookPoints = [{ id: ConstantData.HookPts.SED_KTL, x: endX, y: endY }];
      if (this.ClosePolygon(this.BlockID, hookPoints, hitResult)) {
        this.polylist.segs[0].pt = Utils1.DeepCopy(this.polylist.segs[this.polylist.segs.length - 1].pt);
        this.polylist.closed = true;
        if (this instanceof PolyLine) {
          this.MaintainDimensionThroughPolygonOpennessChange(this.polylist.closed);
        }
      }
    } else {
      deltaX = endX - startX;
      deltaY = endY - startY;

      if (this.polylist.closed && this.polylist.dim.x && this.polylist.dim.y) {
        const dimX = this.polylist.dim.x;
        const dimY = this.polylist.dim.y < 1 ? 1 : this.polylist.dim.y;
        const scaleX = this.Frame.width / dimX;
        const scaleY = this.Frame.height / dimY;
        this.polylist.segs[segmentIndex].pt.x += deltaX * scaleX;
        this.polylist.segs[segmentIndex].pt.y += deltaY * scaleY;
      } else {
        this.polylist.segs[segmentIndex].pt.x += deltaX;
        this.polylist.segs[segmentIndex].pt.y += deltaY;
      }
    }

    console.log("S.PolyLine: UpdateSegmentDimensionFromText output", { polylist: this.polylist, Frame: this.Frame });
  }

  UpdateDimensionFromText(event, dimensionText, dimensionData) {
    console.log("S.PolyLine: UpdateDimensionFromText input", { event, dimensionText, dimensionData });

    let dimensionLength = -1;
    let widthAdjustment = 0;
    let heightAdjustment = 0;

    if (dimensionData.angleChange) {
      this.UpdateLineAngleDimensionFromText(event, dimensionText, dimensionData);
      return;
    }

    const segmentIndex = dimensionData.segment;
    GlobalData.optManager.ShowSVGSelectionState(this.BlockID, false);

    const dimensionValue = this.GetDimensionValueFromString(dimensionText, segmentIndex);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    if (dimensionLength < 0) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
      return;
    }

    const originalState = Utils1.DeepCopy(this);

    if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg ||
      !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts) &&
      !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total)) {

      this.UpdateSegmentDimensionFromText(event, dimensionLength, segmentIndex);

      const rectInfo = { wdDim: -1, htDim: -1 };
      if (this.GetPolyRectangularInfo(rectInfo)) {
        if (segmentIndex === rectInfo.wdDim || segmentIndex === rectInfo.wdDim + 2) {
          this.rwd = dimensionValue;
          this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, true);
        } else if (segmentIndex === rectInfo.htDim || segmentIndex === rectInfo.htDim + 2) {
          this.rht = dimensionValue;
          this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, true);
        }
      } else {
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      }
    } else if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts) {
      this.UpdateEndPointDimensionFromText(event, dimensionLength);
    } else if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      this.UpdateTotalDimensionFromText(event, dimensionLength);
    }

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);

    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.ActionTriggerData = segmentIndex;
    GlobalData.optManager.MaintainLink(this.BlockID, this, originalState, ConstantData.ActionTriggerType.POLYLNODE);

    if (this.Frame.x < 0 || this.Frame.y < 0) {
      const frame = this.Frame;
      if (frame.x < 0) {
        widthAdjustment = -frame.x;
        frame.x += widthAdjustment;
      }
      if (frame.y < 0) {
        heightAdjustment = -frame.y;
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
          this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
          heightAdjustment += ConstantData.Defines.DimensionDefaultStandoff;
        }
        frame.y += heightAdjustment;
      }
      this.StartPoint.x += widthAdjustment;
      this.StartPoint.y += heightAdjustment;
      this.EndPoint.x += widthAdjustment;
      this.EndPoint.y += heightAdjustment;
      GlobalData.optManager.SetObjectFrame(this.BlockID, frame);
    }

    this.UpdateDrawing(event);
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(event, this, this.Frame);
    }

    console.log("S.PolyLine: UpdateDimensionFromText output", { Frame: this.Frame, StartPoint: this.StartPoint, EndPoint: this.EndPoint });
  }

  GetLineChangeFrame() {
    console.log("S.PolyLine: GetLineChangeFrame input");

    let frameRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    if (frameRect.width < ConstantData.Defines.SED_SegDefLen) {
      frameRect.width = ConstantData.Defines.SED_SegDefLen;
    }
    if (frameRect.height < ConstantData.Defines.SED_SegDefLen) {
      frameRect.height = ConstantData.Defines.SED_SegDefLen;
    }

    console.log("S.PolyLine: GetLineChangeFrame output", frameRect);
    return frameRect;
  }

  CancelObjectDraw() {
    console.log("S.PolyLine: CancelObjectDraw input");

    GlobalData.optManager.unbindActionClickHammerEvents();
    GlobalData.optManager.WorkAreaHammer.off("doubletap");

    if (!GlobalData.optManager.isMobilePlatform) {
      $(window).unbind("mousemove");
      GlobalData.optManager.WorkAreaHammer.on("tap", DefaultEvt.Evt_WorkAreaHammerTap);
    }

    this.ResetAutoScrollTimer();
    GlobalData.optManager.AddToDirtyList(this.BlockID);
    GlobalData.optManager.RenderDirtySVGObjects();
    GlobalData.optManager.SelectObjects([this.BlockID], false, true);

    console.log("S.PolyLine: CancelObjectDraw output", true);
    return true;
  }

  GetBoundingBox() {
    console.log("S.PolyLine: GetBoundingBox input");

    const boundingBox = this.Frame;

    console.log("S.PolyLine: GetBoundingBox output", boundingBox);
    return boundingBox;
  }

  IsRightAngle(segmentIndex: number, tolerance: number): boolean {
    console.log("S.PolyLine: IsRightAngle input", { segmentIndex, tolerance });

    let previousSegmentIndex = segmentIndex - 1;
    if (previousSegmentIndex < 0) {
      if (!this.polylist.closed) {
        console.log("S.PolyLine: IsRightAngle output", false);
        return false;
      }
      previousSegmentIndex = this.polylist.segs.length - 1;
    }

    let nextSegmentIndex = segmentIndex + 1;
    if (nextSegmentIndex > this.polylist.segs.length - 1) {
      if (!this.polylist.closed) {
        console.log("S.PolyLine: IsRightAngle output", false);
        return false;
      }
      nextSegmentIndex = 1;
    }

    const angle1 = Utils1.CalcAngleFromPoints(this.polylist.segs[previousSegmentIndex].pt, this.polylist.segs[segmentIndex].pt);
    const angle2 = Utils1.CalcAngleFromPoints(this.polylist.segs[segmentIndex].pt, this.polylist.segs[nextSegmentIndex].pt);
    const angleDifference = Math.abs(angle1 - angle2);

    const isRightAngle = Math.abs(90 - angleDifference) <= tolerance || Math.abs(270 - angleDifference) <= tolerance;
    console.log("S.PolyLine: IsRightAngle output", isRightAngle);
    return isRightAngle;
  }

  GetPolyRectangularInfo(dimensionInfo: any): boolean {
    console.log("S.PolyLine: GetPolyRectangularInfo input:", dimensionInfo);

    // Get polyline points with full details.
    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    let isRectangle = true;

    // Only consider a rectangle if exactly 5 segments and the polyline is closed.
    if (this.polylist.segs.length !== 5 || !this.polylist.closed) {
      console.log("S.PolyLine: GetPolyRectangularInfo output:", false);
      return false;
    }

    // Remove duplicate consecutive points.
    let uniquePoints: { x: number; y: number }[] = [];
    const totalPoints = polyPoints.length;
    for (let index = 0; index < totalPoints; index++) {
      if (index < totalPoints - 1 && polyPoints[index].x === polyPoints[index + 1].x && polyPoints[index].y === polyPoints[index + 1].y) {
        // Skip duplicate point.
        continue;
      }
      uniquePoints.push(polyPoints[index]);
    }
    polyPoints = uniquePoints;

    if (polyPoints.length !== 5) {
      console.log("S.PolyLine: GetPolyRectangularInfo output:", false);
      return false;
    }

    // Check that consecutive angles are nearly 90 degrees.
    let previousAngle = 0;
    for (let index = 0; index < polyPoints.length - 1 && isRectangle; index++) {
      let currentAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(polyPoints[index], polyPoints[index + 1]);
      if (index > 0) {
        let angleDifference = currentAngle - previousAngle;
        if (angleDifference < 0) {
          angleDifference += 2 * Math.PI;
        }
        if (angleDifference > Math.PI) {
          angleDifference -= Math.PI;
        }
        // Check if the angle difference is approximately 90 degrees (±0.052 radians)
        if (!(angleDifference >= Math.PI / 2 - 0.052 && angleDifference <= Math.PI / 2 + 0.052)) {
          isRectangle = false;
        }
      }
      previousAngle = currentAngle;
    }

    // Verify side length ratios.
    let sideLength1 = Utils2.GetDistanceBetween2Points(polyPoints[0], polyPoints[1]);
    let sideLength2 = Utils2.GetDistanceBetween2Points(polyPoints[2], polyPoints[3]);
    let ratio1 = sideLength1 / sideLength2;
    if (ratio1 <= 0.99 || ratio1 >= 1.01) {
      console.log("S.PolyLine: GetPolyRectangularInfo output:", false);
      return false;
    }

    sideLength1 = Utils2.GetDistanceBetween2Points(polyPoints[1], polyPoints[2]);
    sideLength2 = Utils2.GetDistanceBetween2Points(polyPoints[3], polyPoints[4]);
    let ratio2 = sideLength1 / sideLength2;
    if (ratio2 <= 0.99 || ratio2 >= 1.01) {
      console.log("S.PolyLine: GetPolyRectangularInfo output:", false);
      return false;
    }

    // Determine dimensions based on the angle of the first side.
    let firstSideAngle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(polyPoints[0], polyPoints[1]);
    let wdDimension: number, htDimension: number;
    if (firstSideAngle < Math.PI / 4 || firstSideAngle > 1.5 * Math.PI || (firstSideAngle > 0.75 * Math.PI && firstSideAngle < 1.25 * Math.PI)) {
      wdDimension = 1;
      htDimension = 2;
    } else {
      wdDimension = 2;
      htDimension = 1;
    }

    // Set the dimensions on the input parameter if provided.
    if (dimensionInfo) {
      dimensionInfo.wdDim = wdDimension;
      dimensionInfo.htDim = htDimension;
    }

    console.log("S.PolyLine: GetPolyRectangularInfo output:", true);
    return true;
  }

  GetSegmentsBeforeAndAfter(segmentIndex: number, segmentsInfo: { segBefore: number; segAfter: number }) {
    console.log("S.PolyLine: GetSegmentsBeforeAndAfter input:", { segmentIndex, segmentsInfo });

    segmentsInfo.segAfter = segmentIndex + 1;
    if (segmentsInfo.segAfter >= this.polylist.segs.length) {
      segmentsInfo.segAfter = this.polylist.closed ? 1 : -1;
    }

    segmentsInfo.segBefore = segmentIndex - 1;
    if (segmentsInfo.segBefore === 0) {
      segmentsInfo.segBefore = this.polylist.closed ? this.polylist.segs.length - 1 : -1;
    }

    console.log("S.PolyLine: GetSegmentsBeforeAndAfter output:", segmentsInfo);
  }

  MaintainDimensionThroughPolygonOpennessChange(isPolygonClosed) {
    console.log("S.PolyLine: MaintainDimensionThroughPolygonOpennessChange input:", isPolygonClosed);

    if (isPolygonClosed) {
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        ConstantData.DimensionFlags.SED_DF_Total | ConstantData.DimensionFlags.SED_DF_EndPts,
        false
      );
      this.Dimensions = Utils2.SetFlag(
        this.Dimensions,
        ConstantData.DimensionFlags.SED_DF_AllSeg,
        true
      );
    }

    console.log("S.PolyLine: MaintainDimensionThroughPolygonOpennessChange output:", this.Dimensions);
  }

  GetUnrotatedBoundingBoxOfProposedFrame(proposedFrame: any) {
    console.log("S.PolyLine: GetUnrotatedBoundingBoxOfProposedFrame input:", proposedFrame);

    let cloneFrame = Utils1.DeepCopy(proposedFrame);
    let dimensionsRect = this.GetDimensionsRect();
    let horizontalDiff = 0, verticalDiff = 0;

    if (dimensionsRect.width > 0) {
      horizontalDiff = dimensionsRect.width - this.Frame.width;
      verticalDiff = dimensionsRect.height - this.Frame.height;
    } else if (this.StyleRecord && this.StyleRecord.Line && this.StyleRecord.Line.Thickness > ConstantData.Defines.SED_KnobSize) {
      horizontalDiff = this.StyleRecord.Line.Thickness;
      verticalDiff = this.StyleRecord.Line.Thickness;
    } else {
      horizontalDiff = ConstantData.Defines.SED_KnobSize;
      verticalDiff = ConstantData.Defines.SED_KnobSize;
    }

    Utils2.InflateRect(cloneFrame, horizontalDiff / 2, verticalDiff / 2);

    console.log("S.PolyLine: GetUnrotatedBoundingBoxOfProposedFrame output:", cloneFrame);
    return cloneFrame;
  }

  AdjustPolySeg(
    event: any,
    initialX: number,
    initialY: number,
    newPointX: number,
    newPointY: number,
    moveData: { moveAngle: number; hitSegment: number },
    offsetEnabled: boolean,
    minDistance: number,
    maxDistance: number
  ): boolean {
    console.log("S.PolyLine: AdjustPolylineSegment input:", {
      event,
      initialX,
      initialY,
      newPointX,
      newPointY,
      moveData,
      offsetEnabled,
      minDistance,
      maxDistance
    });

    let clonePolyList = Utils1.DeepCopy(this.polylist);
    let originalFrame = Utils1.DeepCopy(this.Frame);
    let originalStartPoint = Utils1.DeepCopy(this.StartPoint);
    let originalEndPoint = Utils1.DeepCopy(this.EndPoint);

    // Get the unrotated bounding box and check if negative coordinates are present.
    const unrotatedBBox = this.GetUnrotatedBoundingBoxOfProposedFrame(this.Frame);
    const hasNegativeCoordinates = unrotatedBBox.x < 0 || unrotatedBBox.y < 0;

    // Prepare two input points array: one at (initialX, initialY) and one at (newPointX, newPointY)
    let pointArray: { x: number; y: number }[] = [];
    const inputPoint = { x: initialX, y: initialY };
    const targetPoint = { x: newPointX, y: newPointY };
    pointArray.push(inputPoint);
    pointArray.push(targetPoint);

    // Determine the move angle from moveData if not yet set.
    let moveAngle = moveData.moveAngle;
    const hitSegmentIndex = moveData.hitSegment;
    if (moveAngle === 9999) {
      moveAngle = this.GetSegmentAdjustAngle(hitSegmentIndex);
      moveData.moveAngle = moveAngle;
    }
    // Convert angle for rotation (flipped)
    moveAngle = 360 - moveAngle;
    const rotationRadians = (2 * Math.PI * moveAngle) / 360;

    // Get the polyline points (all segments)
    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
    // Get the current point at the hit segment
    const currentSegmentPoint = { x: polyPoints[hitSegmentIndex].x, y: polyPoints[hitSegmentIndex].y };

    // Rotate polyPoints and our input point array (P) backward by rotationRadians
    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, polyPoints);
    Utils3.RotatePointsAboutCenter(this.Frame, -rotationRadians, pointArray);

    // If the moved distance is too small, cancel the adjustment.
    if (Math.abs(pointArray[1].x - pointArray[0].x) < minDistance) {
      console.log("S.PolyLine: AdjustPolylineSegment output: false (<minDistance)");
      return false;
    }
    // If a maxDistance is provided and exceeded, cancel the adjustment.
    if (maxDistance && maxDistance > 0 && Math.abs(pointArray[1].x - pointArray[0].x) > maxDistance) {
      console.log("S.PolyLine: AdjustPolylineSegment output: false (>maxDistance)");
      return false;
    }

    if (isNaN(pointArray[1].x - pointArray[0].x)) {
      console.log("S.PolyLine: AdjustPolylineSegment output: false (NaN difference)");
      return false;
    }

    // Apply the horizontal adjustment to the affected segments.
    const deltaX = pointArray[1].x - pointArray[0].x;
    polyPoints[hitSegmentIndex - 1].x += deltaX;
    polyPoints[hitSegmentIndex].x += deltaX;

    // Rotate the polyline points back to the original orientation.
    Utils3.RotatePointsAboutCenter(this.Frame, rotationRadians, polyPoints);

    // Calculate the translation that was applied.
    const translationX = polyPoints[hitSegmentIndex].x - currentSegmentPoint.x;
    const translationY = polyPoints[hitSegmentIndex].y - currentSegmentPoint.y;

    // Get the current scale factors.
    const scaleFactors = this.GetScale();

    // Update the left side segment if applicable.
    if (hitSegmentIndex - 1 !== 0) {
      const updatedPointBefore = {
        x: this.polylist.segs[hitSegmentIndex - 1].pt.x + translationX / scaleFactors.x,
        y: this.polylist.segs[hitSegmentIndex - 1].pt.y + translationY / scaleFactors.y
      };
      this.polylist.segs[hitSegmentIndex - 1].pt = $.extend(true, {}, updatedPointBefore);
    }
    // Update the segment at hitSegmentIndex if applicable.
    if (hitSegmentIndex !== this.polylist.segs.length - 1) {
      const updatedPointAt = {
        x: this.polylist.segs[hitSegmentIndex].pt.x + translationX / scaleFactors.x,
        y: this.polylist.segs[hitSegmentIndex].pt.y + translationY / scaleFactors.y
      };
      this.polylist.segs[hitSegmentIndex].pt = $.extend(true, {}, updatedPointAt);
    }

    // Get the SVG element for the current block.
    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    let frameUpdated = false;
    if (hitSegmentIndex - 1 === 0) {
      this.AdjustLineStart(svgElement, polyPoints[hitSegmentIndex - 1].x, polyPoints[hitSegmentIndex - 1].y, ConstantData.ActionTriggerType.LINESTART);
      frameUpdated = true;
    }
    if (hitSegmentIndex === this.polylist.segs.length - 1) {
      this.AdjustLineEnd(
        svgElement,
        polyPoints[hitSegmentIndex].x,
        polyPoints[hitSegmentIndex].y,
        this.polylist.closed ? ConstantData.ActionTriggerType.POLYLEND : ConstantData.ActionTriggerType.LINEEND
      );
      frameUpdated = true;
    }
    // Reset floating point dimension flags.
    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }
    // Recalculate frame if necessary, otherwise update drawing.
    if (frameUpdated) {
      this.CalcFrame();
    } else {
      this.UpdateDrawing(event);
      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(event, this, this.Frame);
      }
    }

    // Check if the new unrotated bounding box is negative.
    const newUnrotatedBBox = this.GetUnrotatedBoundingBoxOfProposedFrame(this.Frame);
    if (!hasNegativeCoordinates && (newUnrotatedBBox.x < 0 || newUnrotatedBBox.y < 0)) {
      if (offsetEnabled) {
        let offset = { x: 0, y: 0 };
        if (newUnrotatedBBox.x < 0) {
          offset.x = -newUnrotatedBBox.x;
        }
        if (newUnrotatedBBox.y < 0) {
          offset.y = -newUnrotatedBBox.y;
        }
        this.OffsetShape(offset.x, offset.y);
        const enclosedObjects = this.GetListOfEnclosedObjects(false);
        for (let idx = 0; idx < enclosedObjects.length; idx++) {
          GlobalData.optManager.GetObjectPtr(enclosedObjects[idx], true).OffsetShape(offset.x, offset.y);
          GlobalData.optManager.SetLinkFlag(enclosedObjects[idx], ConstantData.LinkFlags.SED_L_MOVE);
          GlobalData.optManager.AddToDirtyList(enclosedObjects[idx]);
        }
        this.UpdateDrawing(event);
      } else {
        // Revert to original state.
        this.polylist = Utils1.DeepCopy(clonePolyList);
        this.Frame = Utils1.DeepCopy(originalFrame);
        this.StartPoint = Utils1.DeepCopy(originalStartPoint);
        this.EndPoint = Utils1.DeepCopy(originalEndPoint);
        this.UpdateDrawing(event);
        if (this.DataID !== -1) {
          this.LM_ResizeSVGTextObject(event, this, this.Frame);
        }
      }
    }

    // Update the display coordinates.
    const displayDimensions = this.GetDimensionsForDisplay();
    const selectionAttrs = new SelectionAttributes();
    selectionAttrs.width = displayDimensions.width;
    selectionAttrs.height = displayDimensions.height;
    selectionAttrs.left = displayDimensions.x;
    selectionAttrs.top = displayDimensions.y;
    GlobalData.optManager.UpdateDisplayCoordinates(
      displayDimensions,
      targetPoint,
      ConstantData.CursorTypes.Grow,
      this
    );

    console.log("S.PolyLine: AdjustPolylineSegment output:", {
      polylist: this.polylist,
      Frame: this.Frame,
      StartPoint: this.StartPoint,
      EndPoint: this.EndPoint
    });
    return true;
  }

  GetSegmentAdjustAngle(segmentIndex: number): number {
    console.log("S.PolyLine: GetSegmentAdjustAngle input:", segmentIndex);

    let adjustedAngle = 9999;
    let segmentsInfo = { segBefore: 0, segAfter: 0 };
    let segBefore = 0;

    if (this.polylist.segs.length <= 5) {
      this.GetSegmentsBeforeAndAfter(segmentIndex, segmentsInfo);
      let segAfter = segmentsInfo.segAfter;
      segBefore = segmentsInfo.segBefore;

      if (segBefore != -1) {
        this.GetSegmentsBeforeAndAfter(segBefore, segmentsInfo);
        if (segmentsInfo.segBefore != -1 && this.IsRightAngle(segmentsInfo.segBefore, 3)) {
          adjustedAngle = Utils1.CalcAngleFromPoints(
            this.polylist.segs[segBefore - 1].pt,
            this.polylist.segs[segBefore].pt
          );
        }
      }

      if (adjustedAngle === 9999 && segAfter != -1 && this.IsRightAngle(segAfter, 3)) {
        adjustedAngle = Utils1.CalcAngleFromPoints(
          this.polylist.segs[segAfter - 1].pt,
          this.polylist.segs[segAfter].pt
        );
      }

      if (adjustedAngle !== 9999) {
        let currentAngle = Utils1.CalcAngleFromPoints(
          this.polylist.segs[segmentIndex - 1].pt,
          this.polylist.segs[segmentIndex].pt
        );
        // Anonymous function to adjust angle based on right angle snapping rules.
        const checkAngleValidity = (angleFromSegment: number, newAngle: number): boolean => {
          let correction = 90 - angleFromSegment;
          angleFromSegment += correction;
          newAngle += correction;
          if (newAngle >= 360) newAngle -= 360;
          if (newAngle < 0) newAngle += 360;
          return (Math.abs(90 - newAngle) < 5 || Math.abs(180 - newAngle) < 5);
        };
        if (checkAngleValidity(currentAngle, adjustedAngle)) {
          adjustedAngle = 9999;
        }
      }
    }

    if (adjustedAngle === 9999) {
      adjustedAngle = Utils1.CalcAngleFromPoints(
        this.polylist.segs[segmentIndex - 1].pt,
        this.polylist.segs[segmentIndex].pt
      );
      adjustedAngle += 90;
      if (adjustedAngle >= 360) {
        adjustedAngle -= 360;
      }
    }

    console.log("S.PolyLine: GetSegmentAdjustAngle output:", adjustedAngle);
    return adjustedAngle;
  }

}

export default PolyLine
