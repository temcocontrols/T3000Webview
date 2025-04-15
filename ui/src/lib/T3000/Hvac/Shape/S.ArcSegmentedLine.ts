

import SegmentedLine from './S.SegmentedLine'
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import Instance from '../Data/Instance/Instance';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import TextConstant from '../Data/Constant/TextConstant';
import Point from '../Model/Point';

/**
 * Class representing an arc segmented line in an HVAC visualization system.
 *
 * @class ArcSegmentedLine
 * @extends {SegmentedLine}
 * @description
 * The ArcSegmentedLine class renders a line with multiple segments connected by arcs,
 * providing a smoother visual representation compared to straight segmented lines.
 * It is commonly used in HVAC diagrams to represent curved pipe or duct connections.
 *
 * Key features:
 * - Creates SVG representations with proper arc connections between segments
 * - Supports styling including color, opacity, line thickness, and patterns
 * - Handles both simple segments and complex multi-segment paths
 * - Provides slop elements for better interaction and selection
 * - Supports text positioning relative to the curved line
 *
 * @example
 * ```typescript
 * // Create a new arc segmented line
 * const arcLine = new ArcSegmentedLine({
 *   StartPoint: new Point(100, 100),
 *   EndPoint: new Point(300, 300),
 *   StyleRecord: {
 *     Line: {
 *       Paint: {
 *         Color: '#FF0000',
 *         Opacity: 1.0
 *       },
 *       Thickness: 2,
 *       LinePattern: 0
 *     }
 *   }
 * });
 *
 * // Add to SVG context
 * const svgContainer = svgContext.CreateShape(OptConstant.CSType.ShapeContainer);
 * const renderedShape = arcLine.CreateShape(svgContext, false);
 * svgContainer.AddElement(renderedShape);
 * ```
 */
class ArcSegmentedLine extends SegmentedLine {

  constructor(options: any) {
    T3Util.Log("S.ArcSegmentedLine - Constructor input:", options);
    options = options || {};
    options.LineType = options.LineType || OptConstant.LineType.ARCSEGLINE;
    super(options);
    T3Util.Log("S.ArcSegmentedLine - Constructor output initialized with:", options);
  }

  CreateShape(svgContext, isPreviewMode) {
    T3Util.Log("S.ArcSegmentedLine - CreateShape input:", { svgContext, isPreviewMode });

    let shapePath, shapeSlop, pointsArray = [];
    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("S.ArcSegmentedLine - CreateShape output:", null);
      return null;
    }

    let polyPointsResult;
    const containerShape = svgContext.CreateShape(OptConstant.CSType.ShapeContainer);
    const isSimpleSegment = (this.hoplist.nhops === 0);

    if (isSimpleSegment) {
      shapePath = svgContext.CreateShape(OptConstant.CSType.Path);
      shapeSlop = svgContext.CreateShape(OptConstant.CSType.Path);
    } else {
      shapePath = svgContext.CreateShape(OptConstant.CSType.Polyline);
      shapeSlop = svgContext.CreateShape(OptConstant.CSType.Polyline);
    }

    shapePath.SetID(OptConstant.SVGElementClass.Shape);
    shapeSlop.SetID(OptConstant.SVGElementClass.Slop);
    shapeSlop.ExcludeFromExport(true);

    this.CalcFrame();

    const boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    let styleRecord = this.StyleRecord;
    styleRecord = this.SVGTokenizerHook(styleRecord);
    // Extract stroke color from style.
    const strokeColor = styleRecord.Line.Paint.Color;
    let strokeWidth = styleRecord.Line.Thickness;
    const strokeOpacity = styleRecord.Line.Paint.Opacity;
    const linePattern = styleRecord.Line.LinePattern;

    // Ensure minimum stroke width.
    if (strokeWidth > 0 && strokeWidth < 1) {
      strokeWidth = 1;
    }

    const shapeWidth = boundingRect.width;
    const shapeHeight = boundingRect.height;

    containerShape.SetSize(shapeWidth, shapeHeight);
    containerShape.SetPos(boundingRect.x, boundingRect.y);
    shapePath.SetSize(shapeWidth, shapeHeight);

    if (isSimpleSegment) {
      pointsArray = Instance.Shape.SegmentedLine.prototype.GetPolyPoints.call(this, OptConstant.Common.MaxPolyPoints, true, true, null);
      polyPointsResult = this.UpdateSVG(shapePath, pointsArray);
    } else {
      pointsArray = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true);
      if (this.hoplist.nhops !== 0) {
        const hopsResult = T3Gv.opt.InsertHops(this, pointsArray, pointsArray.length);
        pointsArray = pointsArray.slice(0, hopsResult.npts);
      }
      shapePath.SetPoints(pointsArray);
    }

    shapePath.SetFillColor('none');
    shapePath.SetStrokeColor(strokeColor);
    shapePath.SetStrokeOpacity(strokeOpacity);
    shapePath.SetStrokeWidth(strokeWidth);
    if (linePattern !== 0) {
      shapePath.SetStrokePattern(linePattern);
    }

    shapeSlop.SetSize(shapeWidth, shapeHeight);
    if (isSimpleSegment) {
      shapeSlop.SetPath(polyPointsResult);
    } else {
      shapeSlop.SetPoints(pointsArray);
    }

    shapeSlop.SetStrokeColor('white');
    shapeSlop.SetFillColor('none');
    shapeSlop.SetOpacity(0);
    if (isPreviewMode) {
      shapeSlop.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      shapeSlop.SetEventBehavior(OptConstant.EventBehavior.None);
    }

    shapeSlop.SetStrokeWidth(strokeWidth + OptConstant.Common.Slop);
    containerShape.AddElement(shapePath);
    containerShape.AddElement(shapeSlop);

    this.ApplyStyles(shapePath, styleRecord);
    this.ApplyEffects(containerShape, false, true);

    containerShape.isShape = true;
    this.AddIcons(svgContext, containerShape);

    T3Util.Log("S.ArcSegmentedLine - CreateShape output:", containerShape);
    return containerShape;
  }

  UpdateSVG(svgElement, points) {
    T3Util.Log("S.ArcSegmentedLine - updateSVG input:", { svgElement, points });

    // Create the path creator from the svg element.
    const arcCreator = svgElement.PathCreator();
    arcCreator.BeginPath();
    arcCreator.MoveTo(points[0].x, points[0].y);

    let currentX = points[0].x;
    let currentY = points[0].y;
    const pointsCount = points.length;

    // If there are only two points, just draw a line.
    if (pointsCount === 2) {
      arcCreator.LineTo(points[1].x, points[1].y);
    }

    // Process additional points to create arcs.
    for (let index = 2; index < pointsCount; index++) {
      // Preserve previous coordinates.
      const previousX = currentX;
      const previousY = currentY;
      let radiusX, radiusY, delta, diff, anticlockwise;

      if (points[index - 1].x === points[index].x) {
        if (index < pointsCount - 1) {
          currentY = (points[index - 1].y + points[index].y) / 2;
          radiusY = Math.abs(points[index - 1].y - points[index].y) / 2;
        } else {
          radiusY = Math.abs(currentY - points[index].y);
          currentY = points[index].y;
        }
        radiusX = Math.abs(currentX - points[index].x);
        delta = currentY - previousY;
        diff = (currentX = points[index].x) - previousX;
        anticlockwise = !((diff >= 0 && delta < 0) || (diff < 0 && delta >= 0));
      } else {
        if (index < pointsCount - 1) {
          radiusX = Math.abs(points[index - 1].x - points[index].x) / 2;
          currentX = (points[index - 1].x + points[index].x) / 2;
        } else {
          radiusX = Math.abs(currentX - points[index].x);
          currentX = points[index].x;
        }
        radiusY = Math.abs(currentY - points[index].y);
        delta = (currentY = points[index].y) - previousY;
        diff = currentX - previousX;
        anticlockwise = !((diff < 0 && delta < 0) || (diff >= 0 && delta >= 0));
      }
      arcCreator.ArcTo(currentX, currentY, radiusX, radiusY, 0, anticlockwise, false, false);
    }

    const pathDefinition = arcCreator.ToString();
    svgElement.SetPath(pathDefinition);
    T3Util.Log("S.ArcSegmentedLine - updateSVG output:", pathDefinition);
    return pathDefinition;
  }

  GetPolyPoints(numPoints: number, useRelativeCoordinates: boolean, includeStartPoint: boolean, unusedFlag: any, unusedParam: any) {
    T3Util.Log("S.ArcSegmentedLine - GetPolyPoints input:", { numPoints, useRelativeCoordinates, includeStartPoint, unusedFlag, unusedParam });

    let basePoints: Point[],
      index: number,
      totalPoints: number,
      currentX: number,
      currentY: number,
      boundingRect,
      prevX: number,
      prevY: number,
      diff: number,
      delta: number,
      isClockwise: boolean,
      resultPoints: Point[] = [];

    // Obtain base points from SegmentedLine's implementation.
    basePoints = Instance.Shape.SegmentedLine.prototype.GetPolyPoints.call(this, OptConstant.Common.MaxPolyPoints, true, true, false, null);
    boundingRect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);

    // Check if the starting and ending directions are zero and the bounding rectangle is degenerate.
    if (
      this.segl.firstdir === 0 &&
      this.segl.lastdir === 0 &&
      (Utils2.IsEqual(boundingRect.height, 0) || Utils2.IsEqual(boundingRect.width, 0))
    ) {
      resultPoints = basePoints;
      if (!useRelativeCoordinates) {
        for (index = 0, totalPoints = resultPoints.length; index < totalPoints; index++) {
          resultPoints[index].x += boundingRect.x;
          resultPoints[index].y += boundingRect.y;
        }
      }
      T3Util.Log("S.ArcSegmentedLine - GetPolyPoints output:", resultPoints);
      return resultPoints;
    }

    if (this.segl && this.segl.pts.length) {
      // Initialize starting point values.
      currentX = basePoints[0].x;
      currentY = basePoints[0].y;
      totalPoints = basePoints.length;
      if (includeStartPoint) {
        resultPoints.push(new Point(currentX, currentY));
      }
      // Process remaining points starting from index 2.
      for (index = 2; index < totalPoints; index++) {
        prevX = currentX;
        prevY = currentY;
        if (basePoints[index - 1].x === basePoints[index].x) {
          if (index < totalPoints - 1) {
            currentY = (basePoints[index - 1].y + basePoints[index].y) / 2;
            // The computed half-difference is not used further.
            Math.abs(basePoints[index - 1].y - basePoints[index].y) / 2;
          } else {
            Math.abs(currentY - basePoints[index].y);
            currentY = basePoints[index].y;
          }
          Math.abs(currentX - basePoints[index].x);
          delta = currentY - prevY;
          diff = (currentX = basePoints[index].x) - prevX;
          isClockwise = !((diff >= 0 && delta < 0) || (diff < 0 && delta >= 0));
        } else {
          if (index < totalPoints - 1) {
            Math.abs(basePoints[index - 1].x - basePoints[index].x);
            currentX = (basePoints[index - 1].x + basePoints[index].x) / 2;
          } else {
            Math.abs(currentX - basePoints[index].x);
            currentX = basePoints[index].x;
          }
          Math.abs(currentY - basePoints[index].y);
          delta = (currentY = basePoints[index].y) - prevY;
          diff = currentX - prevX;
          isClockwise = !((diff < 0 && delta < 0) || (diff >= 0 && delta >= 0));
        }
        if (includeStartPoint) {
          resultPoints.push(new Point(currentX, currentY));
          resultPoints[resultPoints.length - 1].notclockwise = !isClockwise;
        } else {
          T3Gv.opt.EllipseToPoints(resultPoints, numPoints / 2, prevX, currentX, prevY, currentY, isClockwise);
        }
      }
      if (!useRelativeCoordinates) {
        for (index = 0, totalPoints = resultPoints.length; index < totalPoints; index++) {
          resultPoints[index].x += boundingRect.x;
          resultPoints[index].y += boundingRect.y;
        }
      }
    } else {
      resultPoints = Instance.Shape.BaseLine.prototype.GetPolyPoints.call(this, numPoints, useRelativeCoordinates, true, null);
    }

    T3Util.Log("S.ArcSegmentedLine - GetPolyPoints output:", resultPoints);
    return resultPoints;
  }

  GetTextOnLineParams(event: any) {
    T3Util.Log("S.ArcSegmentedLine - GetTextOnLineParams input:", event);

    if (this.segl.pts.length !== 3) {
      const result = Instance.Shape.SegmentedLine.prototype.GetTextOnLineParams.call(this, event);
      T3Util.Log("S.ArcSegmentedLine - GetTextOnLineParams output:", result);
      return result;
    }

    switch (this.TextAlign) {
      case TextConstant.TextAlign.TopCenter:
      case TextConstant.TextAlign.Center:
      case TextConstant.TextAlign.BottomCenter: {
        const polyPoints = this.GetPolyPoints(22, false, false, false, null);
        const rotatedPoints: Point[] = [];
        const textParams = {
          Frame: new Instance.Shape.Rect(),
          StartPoint: new Point(),
          EndPoint: new Point()
        };

        textParams.Frame = Utils2.Pt2Rect(polyPoints[0], polyPoints[9]);
        const angle = T3Gv.opt.GetClockwiseAngleBetween2PointsInRadians(polyPoints[0], polyPoints[9]);

        rotatedPoints.push(new Point(polyPoints[0].x, polyPoints[0].y));
        rotatedPoints.push(new Point(polyPoints[9].x, polyPoints[9].y));
        rotatedPoints.push(new Point(polyPoints[7].x, polyPoints[7].y));

        Utils3.RotatePointsAboutCenter(textParams.Frame, angle, rotatedPoints);
        rotatedPoints[0].y = rotatedPoints[2].y;
        rotatedPoints[1].y = rotatedPoints[2].y;
        Utils3.RotatePointsAboutCenter(textParams.Frame, -angle, rotatedPoints);

        textParams.StartPoint.x = rotatedPoints[0].x;
        textParams.StartPoint.y = rotatedPoints[0].y;
        textParams.EndPoint.x = rotatedPoints[1].x;
        textParams.EndPoint.y = rotatedPoints[1].y;
        textParams.CenterProp = 0.3;

        T3Util.Log("S.ArcSegmentedLine - GetTextOnLineParams output:", textParams);
        return textParams;
      }
      default: {
        const result = Instance.Shape.SegmentedLine.prototype.GetTextOnLineParams.call(this, event);
        T3Util.Log("S.ArcSegmentedLine - GetTextOnLineParams output:", result);
        return result;
      }
    }
  }
}

export default ArcSegmentedLine
