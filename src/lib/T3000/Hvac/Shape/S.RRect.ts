

import BaseShape from './S.BaseShape'
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import Point from '../Model/Point'
import $ from 'jquery'
import NvConstant from '../Data/Constant/NvConstant'
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import UIUtil from '../Opt/UI/UIUtil';
import Instance from '../Data/Instance/Instance';
import PolyUtil from '../Opt/Opt/PolyUtil';

/**
 * Represents a rounded rectangle shape in the T3000 HVAC system.
 *
 * @class RRect
 * @extends BaseShape
 * @description
 * The RRect class implements a rounded rectangle shape with configurable corner radius.
 * It supports both fixed and proportional corner sizes, SVG rendering, resizing operations,
 * style customization, and intersection calculations for connection points.
 *
 * Key features:
 * - SVG shape generation with main shape, slop (for interaction), and optional hatch pattern
 * - Corner size calculation based on shape parameters and dimensions
 * - Shape resize operations that maintain corner proportions
 * - Polygon point generation for perimeter calculations
 * - Integration with the T3000 drawing system
 *
 * The corner radius can be either:
 * - Proportional to the shape's smallest dimension (default)
 * - Fixed size when the FixedRR flag is set in moreflags
 */
class RRect extends BaseShape {

  constructor(inputParams: any) {
    T3Util.Log("= S.RRect: constructor input:", inputParams);
    const params = inputParams || {};
    params.ShapeType = OptConstant.ShapeType.RRect;
    super(params);
    this.dataclass = PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE;
    T3Util.Log("= S.RRect: constructor output:", this);
  }

  GetCornerSize(inputCornerSize?: number) {
    T3Util.Log("= S.RRect: GetCornerSize input:", inputCornerSize);

    const shapeWidth = this.Frame.width;
    const shapeHeight = this.Frame.height;
    let minDimension = shapeWidth;

    if (shapeHeight < minDimension) {
      minDimension = shapeHeight;
    }

    if (inputCornerSize) {
      minDimension = inputCornerSize;
    }

    if (this.moreflags & OptConstant.ObjMoreFlags.FixedRR) {
      let fixedDimension = OptConstant.Common.RRectFixedDim * this.shapeparam;
      const maxAllowed = 0.4 * minDimension;
      if (fixedDimension > maxAllowed) {
        fixedDimension = maxAllowed;
      }
      T3Util.Log("= S.RRect: GetCornerSize output:", fixedDimension);
      return fixedDimension;
    }

    const resultDimension = minDimension * this.shapeparam;
    T3Util.Log("= S.RRect: GetCornerSize output:", resultDimension);
    return resultDimension;
  }

  CreateShape(svgDoc: any, addEventSlop: boolean) {
    T3Util.Log("= S.RRect: CreateShape input:", { svgDoc, addEventSlop });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("= S.RRect: CreateShape output:", null);
      return null;
    }

    const shapeContainer = svgDoc.CreateShape(OptConstant.CSType.ShapeContainer);
    const mainShape = svgDoc.CreateShape(OptConstant.CSType.RRect);
    mainShape.SetID(OptConstant.SVGElementClass.Shape);

    const extendedFrame = $.extend(true, {}, this.Frame);
    let style = this.StyleRecord;
    if (style.Line.BThick) {
      Utils2.InflateRect(extendedFrame, style.Line.BThick, style.Line.BThick);
    }

    style = this.SVGTokenizerHook(style);
    const strokeColor = style.Line.Paint.Color;
    const strokeThickness = style.Line.Thickness;
    const strokePattern = style.Line.LinePattern;
    const width = extendedFrame.width;
    const height = extendedFrame.height;

    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(extendedFrame.x, extendedFrame.y);

    mainShape.SetSize(width, height);
    const cornerSize = this.GetCornerSize();
    mainShape.SetRRectSize(width, height, cornerSize, cornerSize);
    mainShape.SetStrokeColor(strokeColor);
    mainShape.SetStrokeWidth(strokeThickness);

    if (strokePattern !== 0) {
      mainShape.SetStrokePattern(strokePattern);
    }

    shapeContainer.AddElement(mainShape);
    this.ApplyStyles(mainShape, style);
    this.ApplyEffects(shapeContainer, false, false);

    const slopShape = svgDoc.CreateShape(OptConstant.CSType.RRect);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(strokeThickness + OptConstant.Common.Slop);
    if (addEventSlop) {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    slopShape.SetID(OptConstant.SVGElementClass.Slop);
    slopShape.ExcludeFromExport(true);
    slopShape.SetRRectSize(width, height, cornerSize, cornerSize);

    shapeContainer.AddElement(slopShape);

    const hatchType = style.Fill.Hatch;
    if (hatchType && hatchType !== 0) {
      const hatchShape = svgDoc.CreateShape(OptConstant.CSType.RRect);
      hatchShape.SetID(OptConstant.SVGElementClass.Hatch);
      hatchShape.SetSize(width, height);
      hatchShape.SetRRectSize(width, height, cornerSize, cornerSize);
      hatchShape.SetStrokeWidth(0);
      this.SetFillHatch(hatchShape, hatchType);
      shapeContainer.AddElement(hatchShape);
    }

    shapeContainer.isShape = true;

    if (this.DataID >= 0) {
      this.LMAddSVGTextObject(svgDoc, shapeContainer);
    }

    T3Util.Log("= S.RRect: CreateShape output:", shapeContainer);
    return shapeContainer;
  }

  Resize(
    svgElement: any,
    newDimensions: any,
    drawingContainer: any
  ) {
    T3Util.Log("= S.RRect: Resize input:", {
      svgElement,
      newDimensions,
      drawingContainer
    });

    drawingContainer.SetDimensionLinesVisibility(svgElement, false);

    const rotation = svgElement.GetRotation();
    const previousBBox = $.extend(true, {}, this.prevBBox);
    const dimensionClone = $.extend(true, {}, newDimensions);
    const inflatedDimensions = $.extend(true, {}, newDimensions);
    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(
      previousBBox,
      dimensionClone,
      rotation
    );

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(
        inflatedDimensions,
        this.StyleRecord.Line.BThick,
        this.StyleRecord.Line.BThick
      );
    }

    svgElement.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    svgElement.SetPos(
      inflatedDimensions.x + offset.x,
      inflatedDimensions.y + offset.y
    );

    const mainShape = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
    mainShape.SetSize(inflatedDimensions.width, inflatedDimensions.height);

    const slopShape = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
    if (slopShape) {
      slopShape.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    const hatchShape = svgElement.GetElementById(OptConstant.SVGElementClass.Hatch);
    if (hatchShape) {
      hatchShape.SetSize(newDimensions.width, newDimensions.height);
    }

    const cornerSize = this.GetCornerSize();
    mainShape.SetRRectSize(
      inflatedDimensions.width,
      inflatedDimensions.height,
      cornerSize,
      cornerSize
    );

    if (hatchShape) {
      hatchShape.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (slopShape) {
      slopShape.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    this.LMResizeSVGTextObject(
      svgElement,
      drawingContainer,
      newDimensions
    );

    svgElement.SetRotation(rotation);
    this.UpdateDimensionLines(svgElement);
    UIUtil.UpdateDisplayCoordinates(
      newDimensions,
      null,
      null,
      this
    );

    T3Util.Log("= S.RRect: Resize output:", offset);
    return offset;
  }

  ResizeInTextEdit(svgElement: any, newDimensions: any) {
    T3Util.Log("= S.RRect: ResizeInTextEdit input:", { svgElement, newDimensions });

    const rotation = svgElement.GetRotation();
    this.SetDimensionLinesVisibility(svgElement, false);

    const oldFrame = $.extend(true, {}, this.Frame);
    const dimensionClone = $.extend(true, {}, newDimensions);
    const inflatedDimensions = $.extend(true, {}, newDimensions);

    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(
      oldFrame,
      dimensionClone,
      rotation
    );

    if (this.StyleRecord.Line.BThick && this.polylist == null) {
      Utils2.InflateRect(
        inflatedDimensions,
        this.StyleRecord.Line.BThick,
        this.StyleRecord.Line.BThick
      );
    }

    svgElement.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    svgElement.SetPos(
      inflatedDimensions.x + offset.x,
      inflatedDimensions.y + offset.y
    );

    const shapeEl = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
    if (shapeEl) {
      shapeEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    const slopEl = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
    if (slopEl) {
      slopEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    const hatchEl = svgElement.GetElementById(OptConstant.SVGElementClass.Hatch);
    if (hatchEl) {
      hatchEl.SetSize(inflatedDimensions.width, inflatedDimensions.height);
    }

    // Preserve parameter reference
    this.shapeparam;

    let minDimension = inflatedDimensions.width;
    if (inflatedDimensions.height < minDimension) {
      minDimension = inflatedDimensions.height;
    }

    const cornerSize = this.GetCornerSize();

    if (shapeEl) {
      shapeEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (hatchEl) {
      hatchEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    if (slopEl) {
      slopEl.SetRRectSize(
        inflatedDimensions.width,
        inflatedDimensions.height,
        cornerSize,
        cornerSize
      );
    }

    svgElement.SetRotation(rotation);
    this.UpdateDimensionLines(svgElement);
    UIUtil.UpdateDisplayCoordinates(newDimensions, null, null, this);

    T3Util.Log("= S.RRect: ResizeInTextEdit output:", offset);
    return offset;
  }

  GetPolyPoints(
    divisionCount: number,
    applyPositionOffset: boolean,
    unusedParamA: any,
    shouldInflateFrame: boolean,
    unusedParamI: any
  ) {
    T3Util.Log("= S.RRect: GetPolyPoints input:", {
      divisionCount,
      applyPositionOffset,
      unusedParamA,
      shouldInflateFrame,
      unusedParamI
    });

    const pointsArray: Point[] = [];
    const rectCopy: any = {};
    const tempRect: any = {};

    // Copy current frame
    Utils2.CopyRect(rectCopy, this.Frame);

    // Possibly inflate rect if needed
    const halfThickness = this.StyleRecord.Line.Thickness / 2;
    if (shouldInflateFrame) {
      Utils2.InflateRect(rectCopy, halfThickness, halfThickness);
    }

    // Corner size
    const cornerSize = this.GetCornerSize();

    // TempRect initialization
    tempRect.x = 0;
    tempRect.y = 0;
    tempRect.width = cornerSize;
    tempRect.height = 2 * cornerSize;

    // Top-left corner
    PolyUtil.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      0,
      cornerSize,
      true
    );

    // Bottom-left corner
    tempRect.x = 0;
    tempRect.y = rectCopy.height - 2 * cornerSize;
    tempRect.width = cornerSize;
    tempRect.height = 2 * cornerSize;
    PolyUtil.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      cornerSize,
      0,
      true
    );

    // Bottom-right corner
    tempRect.x = rectCopy.width - cornerSize;
    tempRect.y = rectCopy.height;
    tempRect.width = cornerSize;
    tempRect.height = -2 * cornerSize;
    PolyUtil.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      0,
      -cornerSize,
      false
    );

    // Top-right corner
    tempRect.x = rectCopy.width - cornerSize;
    tempRect.y = 2 * cornerSize;
    tempRect.width = cornerSize;
    tempRect.height = -2 * cornerSize;
    PolyUtil.PolyYCurve(
      pointsArray,
      tempRect,
      divisionCount / 2,
      0,
      0,
      -cornerSize,
      0,
      false
    );

    // Close shape
    pointsArray.push(new Point(pointsArray[0].x, pointsArray[0].y));

    // Add position offset if needed
    if (!applyPositionOffset) {
      for (let i = 0; i < pointsArray.length; i++) {
        pointsArray[i].x += rectCopy.x;
        pointsArray[i].y += rectCopy.y;
      }
    }

    T3Util.Log("= S.RRect: GetPolyPoints output:", pointsArray);
    return pointsArray;
  }

  ExtendLines() {
  }

  GetPerimPts(
    eventObj: any,
    hookPoints: any[],
    anchorType: number,
    keepRotation: boolean,
    optionalParam: any,
    eventData: any
  ) {
    T3Util.Log("= S.RRect: GetPerimPts input:", {
      eventObj,
      hookPoints,
      anchorType,
      keepRotation,
      optionalParam,
      eventData
    });

    let outputPoints: Point[] = [];
    const localPoints: any[] = [];
    const interSectionData: any = {};
    const tmpIntersect: number[] = [0, 0];
    const baseDim = OptConstant.Common.DimMax;
    const totalHooks = hookPoints.length;

    // Special check
    if (
      totalHooks === 1 &&
      hookPoints[0].y === -OptConstant.AStyles.CoManager &&
      this.IsCoManager(interSectionData)
    ) {
      outputPoints.push(new Point(interSectionData.x, interSectionData.y));
      if (hookPoints[0].id != null) {
        outputPoints[0].id = hookPoints[0].id;
      }
      T3Util.Log("= S.RRect: GetPerimPts output:", outputPoints);
      return outputPoints;
    }

    // If anchorType is KAT and optionalParam is null
    if (anchorType === OptConstant.HookPts.KAT && optionalParam == null) {
      // Double === todo
      T3Util.Log("= S.RRect: GetPerimPts output:", outputPoints);
      // Return from base
      return new Instance.Shape.BaseDrawObject(this).GetPerimPts(
        eventObj,
        hookPoints,
        anchorType,
        false,
        optionalParam,
        eventData
      );
    }

    const useConnect = !!(this.flags & NvConstant.ObjFlags.UseConnect);

    if (useConnect) {
      for (let i = 0; i < totalHooks; i++) {
        outputPoints[i] = { x: 0, y: 0, id: 0 };
        outputPoints[i].x =
          (hookPoints[i].x / OptConstant.Common.DimMax) * this.Frame.width +
          this.Frame.x;
        outputPoints[i].y =
          (hookPoints[i].y / OptConstant.Common.DimMax) * this.Frame.height +
          this.Frame.y;
        if (hookPoints[i].id != null) {
          outputPoints[i].id = hookPoints[i].id;
        }
      }
    } else {
      // Double === todo
      outputPoints = new BaseDrawObject(this).GetPerimPts(
        eventObj,
        hookPoints,
        anchorType,
        true,
        optionalParam,
        eventData
      );

      let minSize = this.Frame.width;
      if (this.Frame.height < minSize) {
        minSize = this.Frame.height;
      }
      const cornerFactor = this.GetCornerSize() * OptConstant.Common.RoundFactor;
      const polyPoints = this.GetPolyPoints(
        OptConstant.Common.MaxPolyPoints,
        false,
        false,
        false,
        null
      );

      for (let idx = 0; idx < outputPoints.length; idx++) {
        if (hookPoints[idx].x === 0 && hookPoints[idx].y === 0) {
          outputPoints[idx].x += cornerFactor;
          outputPoints[idx].y += cornerFactor;
        } else if (hookPoints[idx].x === 0 && hookPoints[idx].y === baseDim) {
          outputPoints[idx].x += cornerFactor;
          outputPoints[idx].y -= cornerFactor;
        } else if (hookPoints[idx].x === baseDim && hookPoints[idx].y === 0) {
          outputPoints[idx].x -= cornerFactor;
          outputPoints[idx].y += cornerFactor;
        } else if (hookPoints[idx].x === baseDim && hookPoints[idx].y === baseDim) {
          outputPoints[idx].x -= cornerFactor;
          outputPoints[idx].y -= cornerFactor;
        } else if (hookPoints[idx].x < baseDim / 4) {
          const count = PolyUtil.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].y,
            tmpIntersect,
            null,
            false
          );
          if (count) {
            outputPoints[idx].x = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] < outputPoints[idx].x) {
              outputPoints[idx].x = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].x > (3 * baseDim) / 4) {
          const count = PolyUtil.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].y,
            tmpIntersect,
            null,
            false
          );
          if (count) {
            outputPoints[idx].x = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] > outputPoints[idx].x) {
              outputPoints[idx].x = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].y < baseDim / 4) {
          const count = PolyUtil.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].x,
            tmpIntersect,
            null,
            true
          );
          if (count) {
            outputPoints[idx].y = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] < outputPoints[idx].y) {
              outputPoints[idx].y = tmpIntersect[1];
            }
          }
        } else if (hookPoints[idx].y > (3 * baseDim) / 4) {
          const count = PolyUtil.PolyGetIntersect(
            polyPoints,
            outputPoints[idx].x,
            tmpIntersect,
            null,
            true
          );
          if (count) {
            outputPoints[idx].y = tmpIntersect[0];
            if (count > 1 && tmpIntersect[1] > outputPoints[idx].y) {
              outputPoints[idx].y = tmpIntersect[1];
            }
          }
        }
        if (hookPoints[idx].id != null) {
          outputPoints[idx].id = hookPoints[idx].id;
        }
      }
    }

    if (!keepRotation) {
      const rotationAngle = -this.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, outputPoints);
    }

    T3Util.Log("= S.RRect: GetPerimPts output:", outputPoints);
    return outputPoints;
  }

  SetShapeIndent(applyAdjustment: boolean) {
    T3Util.Log("= S.RRect: SetShapeIndent input:", applyAdjustment);

    // Read the inside dimensions
    const insideWidth = this.inside.width;
    const insideHeight = this.inside.height;
    // Choose the minimum dimension
    const minDimension = insideHeight > insideWidth ? insideWidth : insideHeight;
    // Default shape parameter
    let shapeParam = this.shapeparam;
    const roundFactor = OptConstant.Common.RoundFactor;
    let rectDimension: number = minDimension;

    // When fixed rounded rectangle flag is set, adjust the shape parameter
    if (this.moreflags & OptConstant.ObjMoreFlags.FixedRR) {
      rectDimension = minDimension;
      if (applyAdjustment) {
        // Increase rectDimension by twice the corner size adjusted by roundFactor
        rectDimension = minDimension + 2 * this.GetCornerSize() * roundFactor;
        rectDimension = minDimension + 2 * this.GetCornerSize(rectDimension) * roundFactor;
      }
      shapeParam = this.GetCornerSize(rectDimension) / rectDimension;
    }

    // Calculate the uniform indent based on the shape parameter and round factor
    const singleIndent = shapeParam * roundFactor;
    this.left_sindent = singleIndent;
    this.top_sindent = singleIndent;
    this.right_sindent = singleIndent;
    this.bottom_sindent = singleIndent;

    // Prepare denominators for tint calculations; default is 1 if no adjustment is applied.
    let divisorWidth = 1;
    let divisorHeight = 1;

    if (applyAdjustment) {
      divisorWidth = 1 - 2 * this.left_sindent;
      divisorHeight = divisorWidth;
    }

    // Calculate the table indent values for each side
    this.tindent.left = this.left_sindent * insideWidth / divisorWidth;
    this.tindent.top = this.top_sindent * insideHeight / divisorHeight;
    this.tindent.right = this.right_sindent * insideWidth / divisorWidth;
    this.tindent.bottom = this.bottom_sindent * insideHeight / divisorHeight;

    T3Util.Log("= S.RRect: SetShapeIndent output:", {
      left_sindent: this.left_sindent,
      top_sindent: this.top_sindent,
      right_sindent: this.right_sindent,
      bottom_sindent: this.bottom_sindent,
      tint: this.tindent
    });
  }

  SetShapeProperties(properties: any): boolean {
    T3Util.Log("= S.RRect: SetShapeProperties input:", properties);
    let updated = false;
    const fixedRFlag = OptConstant.ObjMoreFlags.FixedRR;

    if (properties.hasrrectselected) {
      if (((this.moreflags & fixedRFlag) > 0) === properties.rrectfixed && properties.rrectparam === this.shapeparam) {
        // No update needed if the fixed flag and parameter already match.
      } else {
        this.moreflags = Utils2.SetFlag(this.moreflags, fixedRFlag, properties.rrectfixed);
        this.shapeparam = properties.rrectparam;
        this.SetSize(
          this.Frame.width,
          0,
          OptConstant.ActionTriggerType.LineLength
        );
        updated = true;
      }
    }

    // Call the base implementation and update the flag if needed.
    if (super.SetShapeProperties(properties)) {
      updated = true;
    }

    T3Util.Log("= S.RRect: SetShapeProperties output:", updated);
    return updated;
  }
}

export default RRect
