

import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv'
import PolyLine from "./S.PolyLine"
import Point from '../Model/Point'
import Instance from '../Data/Instance/Instance';
import NvConstant from '../Data/Constant/NvConstant'
import PolySeg from '../Model/PolySeg'
import HitResult from '../Model/HitResult'
import T3Constant from '../Data/Constant/T3Constant';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import LayerUtil from '../Opt/Opt/LayerUtil';
import SvgUtil from '../Opt/Opt/SvgUtil';
import SelectUtil from '../Opt/Opt/SelectUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import ToolActUtil from '../Opt/Opt/ToolActUtil';
import PolyUtil from '../Opt/Opt/PolyUtil';
import HookUtil from '../Opt/Opt/HookUtil';

/**
 * A container class representing a polyline shape that can contain other objects.
 * Extends PolyLine to create a container that can be closed (forming a polygon) or open,
 * with capabilities to manage objects inside its boundaries.
 *
 * This class handles:
 * - Container behavior for enclosed shapes
 * - Special rendering of polygon containers with customizable borders
 * - Interaction handling including rotation, movement, and resizing
 * - Shape inflation/deflation operations
 * - Dimension calculations and display
 * - Snap behavior for alignment with other shapes
 * - Polygon modification with segment manipulation
 * - Coordinate transformations and rotations
 *
 * The container can operate in different modes based on whether it's closed or open,
 * with closed containers able to fully contain other objects and provide area dimensions.
 *
 * @extends PolyLine
 */
class PolyLineContainer extends PolyLine {

  public T3Type: string;

  constructor(params) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", params);

    params = params || {};
    if (params.Dimensions === undefined) {
      params.Dimensions = NvConstant.DimensionFlags.Always;
    }
    if (params.objecttype === undefined) {
      params.objecttype = NvConstant.FNObjectTypes.FlWall;
    }
    if (params.TextFlags === undefined) {
      params.TextFlags = 0;
    }
    params.TextFlags = Utils2.SetFlag(params.TextFlags, NvConstant.TextFlags.None, true);

    super(params);

    this.T3Type = "PolyLineContainer";

    T3Util.Log("= S.PolyLineContainer: Output instance:", this);
  }

  CreateShape(inputParams, shapeType) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", inputParams, shapeType);
    const result = super.CreateShape(inputParams, shapeType);
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  NoRotate() {
    T3Util.Log("= S.PolyLineContainer: Checking if rotation is allowed");
    const canRotate = this.polylist.closed;
    T3Util.Log("= S.PolyLineContainer: Rotation allowed:", canRotate);
    return !canRotate;
  }

  GetKnobSize(event) {
    T3Util.Log("= S.PolyLineContainer: Input event:", event);
    const knobSize = 2 * (1 * OptConstant.Common.KnobSize / 1);
    T3Util.Log("= S.PolyLineContainer: Output knobSize:", knobSize);
    return knobSize;
  }

  GetCornerKnobImages() {
    T3Util.Log("= S.PolyLineContainer: Fetching corner knob images");
    const knobImages = {
      nwse: CursorConstant.Knob.Path + CursorConstant.Knob.DiagonLeft,
      nesw: CursorConstant.Knob.Path + CursorConstant.Knob.DiagonRight
    };
    T3Util.Log("= S.PolyLineContainer: Corner knob images:", knobImages);
    return knobImages;
  }

  CreateActionTriggers(doc, triggerType, action, rotation) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", doc, triggerType, action, rotation);
    let segmentCount, knobSize = 0, angle = 0, knob = null, actionTriggers = null, halfKnobSize = 0;
    const isFirefox = -1 != navigator.userAgent.toLowerCase().indexOf("firefox");

    if (this.objecttype === NvConstant.FNObjectTypes.FlWall && (wallOpt && wallOpt.IsAddingWalls && wallOpt.IsAddingWalls() || T3Constant.DocContext.UsingWallTool)) {
      return null;
    }

    knobSize = this.GetKnobSize(doc);
    let scale = doc.docInfo.docToScreenScale;
    if (doc.docInfo.docScale <= .5) {
      scale *= 2;
    }
    knobSize /= scale;

    if (!(actionTriggers = super.CreateActionTriggers.call(this, doc, triggerType, action, rotation))) {
      return null;
    }

    halfKnobSize = knobSize / 2;
    const knobParams = {
      svgDoc: doc,
      shapeType: OptConstant.CSType.Image,
      knobSize: knobSize,
      fillOpacity: 1,
      strokeSize: 0,
      knobID: OptConstant.ActionTriggerType.MovePolySeg,
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, !1),
      locked: !1
    };

    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobParams.fillColor = "gray";
      knobParams.locked = !0;
    } else if (this.NoGrow()) {
      knobParams.fillColor = "red";
      knobParams.strokeColor = "red";
      knobParams.cursorType = CursorConstant.CursorType.Default;
    }

    if ((segmentCount = this.polylist.segs.length) !== 0) {
      if (segmentCount > 2 && 0 == (this.flags & NvConstant.ObjFlags.Lock)) {
        for (let i = 1; i < segmentCount; i++) {
          knobParams.cursorType = this.CalcCursorForAngle(this.GetSegmentAdjustAngle(i));
          if (this.NoGrow()) {
            knobParams.cursorType = CursorConstant.CursorType.Default;
          }

          switch (this.polylist.segs[i].LineType) {
            case OptConstant.LineType.LINE:
              knobParams.x = this.polylist.segs[i - 1].pt.x + (this.polylist.segs[i].pt.x - this.polylist.segs[i - 1].pt.x) / 2 + halfKnobSize + (this.StartPoint.x - this.Frame.x);
              knobParams.y = this.polylist.segs[i - 1].pt.y + (this.polylist.segs[i].pt.y - this.polylist.segs[i - 1].pt.y) / 2 + halfKnobSize + (this.StartPoint.y - this.Frame.y);
              knobParams.x -= knobSize / 2;
              knobParams.y -= knobSize / 2;
              break;
            case OptConstant.LineType.ARCLINE:
            case OptConstant.LineType.PARABOLA:
            case OptConstant.LineType.ARCSEGLINE:
              const existingKnob = actionTriggers.GetElementById(OptConstant.ActionTriggerType.PolyAdj, i);
              if (existingKnob) {
                const existingKnobPos = existingKnob.GetPos();
                const points = [
                  new Point(this.polylist.segs[i - 1].pt.x, this.polylist.segs[i - 1].pt.y),
                  existingKnobPos,
                  new Point(this.polylist.segs[i].pt.x, this.polylist.segs[i].pt.y)
                ];
                angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(points[0], points[2]);
                Utils3.RotatePointsAboutPoint(points[1], -angle, points);
                const newPoint = new Point(points[1].x, points[1].y);
                const bbox = existingKnob.GetGeometryBBox();
                newPoint.x += bbox.width + 3;
                points.push(newPoint);
                Utils3.RotatePointsAboutPoint(points[1], angle, points);
                knobParams.x = points[3].x;
                knobParams.y = points[3].y;
              }
              break;
          }

          knob = this.GenericKnob(knobParams);
          knob.SetUserData({
            hitSegment: i,
            moveAngle: 9999
          });
          if (knob && knob.SetURL) {
            knob.SetURL(CursorConstant.Knob.Path + CursorConstant.Knob.ExpandVert);
            knob.ExcludeFromExport(!0);
          }

          angle = Utils1.CalcAngleFromPoints(this.polylist.segs[i - 1].pt, this.polylist.segs[i].pt);
          if (angle !== 0) {
            if (isFirefox) {
              if ((angle >= 45 && angle <= 135) || (angle >= 235 && angle < 315)) {
                knob && knob.SetURL && knob.SetURL(CursorConstant.Knob.Path + CursorConstant.Knob.ExpandHoriz);
              }
            } else {
              knob.SetRotation(angle);
            }
          }

          actionTriggers.AddElement(knob);
        }
      }
      T3Util.Log("= S.PolyLineContainer: Output actionTriggers:", actionTriggers);
      return actionTriggers;
    }
  }

  PostCreateShapeCallback(doc, triggerType, action, rotation) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", doc, triggerType, action, rotation);
    const result = super.PostCreateShapeCallback(doc, triggerType, action, rotation);
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  UpdateSVG(svgDocument, points) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", svgDocument, points);
    const pathCreator = svgDocument.PathCreator();
    pathCreator.BeginPath();
    if (points.length > 1) {
      pathCreator.MoveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        pathCreator.LineTo(points[i].x, points[i].y);
      }
    }
    if (this.polylist.closed) {
      pathCreator.ClosePath();
    }
    pathCreator.Apply();
    T3Util.Log("= S.PolyLineContainer: Updated SVG path");
  }

  MostlyContains(shape) {
    T3Util.Log("= S.PolyLineContainer: Input shape:", shape);

    let rotationAngle = 0;
    let containsPoint = false;
    const boundingBox = {};
    const shapePoints = shape.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false);

    if (LayerUtil.ActiveVisibleZList().indexOf(shape.BlockID) < 0) {
      return false;
    }

    if (shape.RotationAngle !== 0) {
      rotationAngle = -shape.RotationAngle / (180 / NvConstant.Geometry.PI);
      Utils3.RotatePointsAboutCenter(shape.Frame, rotationAngle, shapePoints);
    }

    const thisPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false);
    const numPoints = shapePoints.length;

    for (let i = 0; i < numPoints; i++) {
      if (PolyUtil.PolyPtInPolygon(thisPoints, shapePoints[i])) {
        containsPoint = true;
        break;
      }
    }

    if (!containsPoint) {
      return false;
    }

    if (!Utils2.GetPolyRect(boundingBox, shapePoints)) {
      return false;
    }

    if (boundingBox.width === 0) {
      boundingBox.width = 1;
    }

    if (boundingBox.height === 0) {
      boundingBox.height = 1;
    }

    const intersection = Utils2.IntersectRect(this.Frame, boundingBox);
    const result = !!intersection && intersection.width * intersection.height > boundingBox.width * boundingBox.height * 0.75;

    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  InterceptMoveOperation(event) {
    T3Util.Log("= S.PolyLineContainer: Input event:", event);
    let targetElement, selectedObjects = [], zList = LayerUtil.ZList(), mostlyContainsFlag = false;

    try {
      targetElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
      if (!targetElement) return false;

      const targetID = targetElement.GetTargetForEvent(event).GetID();
      const docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);

      if (targetID === OptConstant.SVGElementClass.DimText) return true;

      if (this.PolyHitSeg(docCoords) === -1) mostlyContainsFlag = true;

      if (mostlyContainsFlag) {
        SelectUtil.ClearSelectionClick();
        selectedObjects.push(this.BlockID);

        for (let i = 0; i < zList.length; i++) {
          const obj = DataUtil.GetObjectPtr(zList[i], false);
          if (this.BlockID === obj.BlockID || obj.hooks.length) continue;
          if (this.MostlyContains(obj)) selectedObjects.push(obj.BlockID);
        }

        SelectUtil.SelectObjects(selectedObjects, false, false);
        T3Gv.opt.postMoveSelectId = this.BlockID;
        SvgUtil.HideAllSVGSelectionStates();
        T3Util.Log("= S.PolyLineContainer: Output selectedObjects:", selectedObjects);
        return false;
      }

      return false;
    } catch (error) {
      this.LMActionClickExpCleanup(error);
      T3Gv.opt.ExceptionCleanup(error);
      throw error;
    }
  }

  SetupInterceptMove(event) {
    T3Util.Log("= S.PolyLineContainer: Input event:", event);

    T3Gv.opt.eventTimestamp = Date.now();
    event.stopPropagation();

    const svgElement = T3Gv.opt.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    if (svgElement === null) {
      return false;
    }

    const elementID = svgElement.ID;
    T3Gv.opt.actionStoredObjectId = elementID;
    T3Gv.stdObj.PreserveBlock(elementID);

    const actionTriggerType = OptConstant.ActionTriggerType.MovePolySeg;
    T3Gv.opt.actionTriggerId = actionTriggerType;
    this.LMActionPreTrack(elementID, actionTriggerType);
    T3Gv.opt.actionSvgObject = svgElement;

    let docCoords = T3Gv.opt.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    docCoords = DrawUtil.DoAutoGrowDrag(docCoords);

    const hitResult = new HitResult(-1, 0, null);
    this.Hit(docCoords, false, false, hitResult);

    T3Gv.opt.actionTriggerData = {
      hitSegment: hitResult.segment + 1,
      moveAngle: 9999
    };

    const startX = docCoords.x;
    const startY = docCoords.y;
    const svgFrame = this.GetSVGFrame();

    T3Gv.opt.actionBBox = $.extend(true, {}, svgFrame);
    T3Gv.opt.actionNewBBox = $.extend(true, {}, svgFrame);
    SvgUtil.HideAllSVGSelectionStates();
    T3Gv.opt.actionStartX = startX;
    T3Gv.opt.actionStartY = startY;

    const finalHitResult = new HitResult(-1, 0, null);
    this.Hit(docCoords, false, false, finalHitResult);

    T3Util.Log("= S.PolyLineContainer: Output result:", true);
    return true;
  }

  Inflate(points, offset, isClosed) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", points, offset, isClosed);

    const rect = {};
    const inflatedPoints = [];
    const originalPoints = Utils1.DeepCopy(points);

    function calculateDistance(point1, point2) {
      const dx = point1.x - point2.x;
      const dy = point1.y - point2.y;
      return Utils2.sqrt(dx * dx + dy * dy);
    }

    function findNextValidPoint(points, startIndex, wrap) {
      for (let i = startIndex + 1; i < points.length; i++) {
        if (calculateDistance(points[startIndex], points[i]) > 1e-5) {
          return i;
        }
      }
      return wrap && startIndex === points.length - 1 && calculateDistance(points[startIndex], points[1]) > 1e-5 ? 1 : -1;
    }

    function findPreviousValidPoint(points, startIndex) {
      for (let i = startIndex - 1; i >= 0; i--) {
        if (calculateDistance(points[startIndex], points[i]) > 1e-5) {
          return i;
        }
      }
      return -1;
    }

    function createInflatedSegment(center, point1, point2, offset) {
      const angle = 360 - Utils1.CalcAngleFromPoints(point1, point2);
      const radian = 2 * Math.PI * (angle / 360);
      const segment = [{ x: point1.x, y: point1.y }, { x: point2.x, y: point2.y }];
      Utils3.RotatePointsAboutCenter(center, -radian, segment);
      segment[0].y += offset;
      segment[1].y += offset;
      Utils3.RotatePointsAboutCenter(center, radian, segment);
      return segment;
    }

    function adjustSegment(segment, offset) {
      const center = { x: (segment[0].x + segment[1].x) / 2, y: (segment[0].y + segment[1].y) / 2 };
      const angle = 360 - Utils1.CalcAngleFromPoints(segment[0], segment[1]);
      const radian = 2 * Math.PI * (angle / 360);
      Utils3.RotatePointsAboutPoint(center, -radian, segment);
      const absOffset = Math.abs(offset);
      if (segment[0].x < segment[1].x) {
        segment[0].x -= absOffset;
        segment[1].x += absOffset;
      } else {
        segment[0].x += absOffset;
        segment[1].x -= absOffset;
      }
      Utils3.RotatePointsAboutPoint(center, radian, segment);
    }

    function calculateAngleDifference(points, index1, index2, index3) {
      const angle1 = 360 - Utils1.CalcAngleFromPoints(points[index2], points[index1]);
      const angle2 = 360 - Utils1.CalcAngleFromPoints(points[index2], points[index3]);
      return angle2 - angle1;
    }

    Utils2.GetPolyRect(rect, points);

    for (let i = 0; i < points.length; i++) {
      const previousPointIndex = findPreviousValidPoint(originalPoints, i);
      const nextPointIndex = findNextValidPoint(originalPoints, i, isClosed);
      const previousSegment = previousPointIndex >= 0 ? createInflatedSegment(rect, originalPoints[previousPointIndex], originalPoints[i], offset) : [];
      const nextSegment = nextPointIndex >= 0 ? createInflatedSegment(rect, originalPoints[i], originalPoints[nextPointIndex], offset) : [];
      const newPoints = [];

      if (previousPointIndex >= 0 && nextPointIndex >= 0) {
        let angleDifference = calculateAngleDifference(originalPoints, previousPointIndex, i, nextPointIndex);
        if (angleDifference < 0) {
          angleDifference += 360;
        }
        if (angleDifference >= 30 && angleDifference <= 330) {
          const intersection = { x: 0, y: 0 };
          if (T3Gv.opt.GetIntersectPt(previousSegment[0], previousSegment[1], nextSegment[0], nextSegment[1], null, intersection)) {
            newPoints.push(new Point(intersection.x, intersection.y));
          }
        } else {
          adjustSegment(previousSegment, offset);
          newPoints.push(new Point(previousSegment[1].x, previousSegment[1].y));
          adjustSegment(nextSegment, offset);
          newPoints.push(new Point(nextSegment[0].x, nextSegment[0].y));
        }
      }

      if (newPoints.length === 0) {
        if (previousPointIndex >= 0) {
          newPoints.push(new Point(previousSegment[1].x, previousSegment[1].y));
        } else if (nextPointIndex >= 0) {
          newPoints.push(new Point(nextSegment[0].x, nextSegment[0].y));
        }
      }

      inflatedPoints.push(...newPoints);
    }

    if (isClosed && inflatedPoints.length > 0) {
      inflatedPoints[0] = inflatedPoints[inflatedPoints.length - 1];
    }

    T3Util.Log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
    return inflatedPoints;
  }

  InflatePolyLine(points, offset, isClosed) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", points, offset, isClosed);
    let inflatedPoints = this.Inflate(points, -offset, isClosed);
    if (Utils2.IsPointInPoly(points, inflatedPoints[1])) {
      inflatedPoints = this.Inflate(points, offset, isClosed);
    }
    T3Util.Log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
    return inflatedPoints;
  }

  MovePolySeg(event, newX, newY, segmentIndex, hitResult) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", event, newX, newY, segmentIndex, hitResult);

    const adjusted = this.AdjustPolySeg(
      event,
      T3Gv.opt.actionStartX,
      T3Gv.opt.actionStartY,
      newX,
      newY,
      hitResult,
      false,
      2,
      1000
    );

    if (adjusted) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
      T3Gv.opt.actionStartX = newX;
      T3Gv.opt.actionStartY = newY;
    }

    T3Util.Log("= S.PolyLineContainer: Output adjusted:", adjusted);
  }

  AfterModifyShape(event, triggerType) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", event, triggerType);

    if (triggerType === OptConstant.ActionTriggerType.MovePolySeg) {
      const handleMovePolySeg = (segmentIndex) => {
        let segmentCount = 0;
        let firstSegmentIndex = -1;
        let segmentsModified = false;
        const lineThickness = this.StyleRecord.Line.Thickness;
        let moveAngle = T3Gv.opt.actionTriggerData.moveAngle;
        const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
        const totalPoints = polyPoints.length;

        if (moveAngle !== 0) {
          moveAngle = 360 - moveAngle;
          const radian = 2 * Math.PI * (moveAngle / 360);
          Utils3.RotatePointsAboutCenter(this.Frame, -radian, polyPoints);
        }

        const xCoordinate = polyPoints[segmentIndex].x;

        if (this.polylist.closed) {
          let allEqual = true;
          for (let i = 0; i < totalPoints; i++) {
            if (!Utils2.IsEqual(polyPoints[i].x, xCoordinate, lineThickness)) {
              allEqual = false;
              break;
            }
          }
          if (allEqual) return;
        }

        for (let i = segmentIndex + 1; i < totalPoints && Utils2.IsEqual(polyPoints[i].x, xCoordinate, lineThickness); i++) {
          segmentCount++;
        }

        let removeSegments = true;
        if (segmentCount === 0 && segmentIndex === 1 && Utils2.IsEqual(polyPoints[totalPoints - 1].x, xCoordinate, lineThickness) && Utils2.IsEqual(polyPoints[totalPoints - 2].x, xCoordinate, lineThickness)) {
          segmentIndex = totalPoints - 2;
          segmentCount = 1;
          if (!Utils2.IsEqual(polyPoints[0].y, polyPoints[totalPoints - 2].y, lineThickness)) {
            removeSegments = false;
          }
        }

        if (segmentCount > 0 && removeSegments) {
          this.polylist.segs.splice(segmentIndex, segmentCount);
          segmentsModified = true;
          if (segmentIndex + 1 + segmentCount >= totalPoints && segmentCount === 1 && this.polylist.closed && Utils2.IsEqual(polyPoints[0].x, xCoordinate, lineThickness)) {
            this.polylist.segs.splice(0, 1);
            const newX = this.polylist.segs[0].pt.x + this.StartPoint.x;
            const newY = this.polylist.segs[0].pt.y + this.StartPoint.y;
            this.polylist.segs[0].pt.x = 0;
            this.polylist.segs[0].pt.y = 0;
            this.AdjustLineStart(null, newX, newY, OptConstant.ActionTriggerType.LineStart);
          }
        }

        for (let i = segmentIndex - 2; i > 0 && Utils2.IsEqual(polyPoints[i].x, xCoordinate, lineThickness); i--) {
          firstSegmentIndex = i;
        }

        if (!this.polylist.closed && segmentIndex === totalPoints - 1 && totalPoints === 3 && firstSegmentIndex < 0 && Utils2.IsEqual(polyPoints[0].x, xCoordinate, lineThickness)) {
          firstSegmentIndex = 0;
        }

        if (this.polylist.closed && firstSegmentIndex === 1) {
          if (Utils2.IsEqual(polyPoints[0].x, xCoordinate, lineThickness)) {
            firstSegmentIndex = 0;
          }
        } else if (firstSegmentIndex === 1 && this.polylist.segs.length > 2 && Utils2.IsEqual(polyPoints[0].x, xCoordinate, lineThickness)) {
          firstSegmentIndex = 0;
        }

        if (firstSegmentIndex >= 0) {
          this.polylist.segs.splice(firstSegmentIndex + 1, segmentIndex - 1 - firstSegmentIndex);
          segmentsModified = true;
        }

        if (this.polylist.closed && segmentCount === 0 && firstSegmentIndex < 0 && (segmentIndex === totalPoints - 1 || segmentIndex <= 2)) {
          const newX = polyPoints[2].x;
          let allEqual = true;
          if (segmentIndex === 2 && !Utils2.IsEqual(polyPoints[1].y, polyPoints[0].y, lineThickness)) {
            allEqual = false;
          }
          if (Utils2.IsEqual(polyPoints[1].x, newX, lineThickness) && Utils2.IsEqual(polyPoints[0].x, newX, lineThickness) && allEqual) {
            this.polylist.segs.splice(0, 2);
            segmentsModified = true;
            const newX = this.polylist.segs[0].pt.x + this.StartPoint.x;
            const newY = this.polylist.segs[0].pt.y + this.StartPoint.y;
            this.polylist.segs[0].pt.x = 0;
            this.polylist.segs[0].pt.y = 0;
            this.AdjustLineStart(null, newX, newY, OptConstant.ActionTriggerType.LineStart);
          } else if (segmentIndex === totalPoints - 1) {
            const newX = polyPoints[segmentIndex].x;
            if (Utils2.IsEqual(polyPoints[1].x, newX, lineThickness) && Utils2.IsEqual(polyPoints[0].x, newX, lineThickness)) {
              this.polylist.segs.splice(0, 1);
              segmentsModified = true;
              const newX = this.polylist.segs[0].pt.x + this.StartPoint.x;
              const newY = this.polylist.segs[0].pt.y + this.StartPoint.y;
              this.polylist.segs[0].pt.x = 0;
              this.polylist.segs[0].pt.y = 0;
              this.AdjustLineStart(null, newX, newY, OptConstant.ActionTriggerType.LineStart);
            }
          } else if (segmentIndex === 2 && Utils2.IsEqual(polyPoints[1].x, newX, lineThickness) && Utils2.IsEqual(polyPoints[0].x, newX, lineThickness)) {
            this.polylist.segs.splice(1, 1);
            segmentsModified = true;
          }
        }

        if (segmentsModified) {
          DataUtil.AddToDirtyList(this.BlockID);
        }
      };

      handleMovePolySeg(T3Gv.opt.actionTriggerData.hitSegment);
    }

    this.BaseLineAfterModifyShape(event, triggerType);
    T3Util.Log("= S.PolyLineContainer: Output result:", true);
  }

  BaseLineAfterModifyShape(event, triggerType) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", event, triggerType);

    if (T3Gv.opt.actionSvgObject) {
      const ellipseAxesElement = T3Gv.opt.actionSvgObject.GetElementById(OptConstant.Common.EllipseAxes);
      if (ellipseAxesElement != null) {
        T3Gv.opt.actionSvgObject.RemoveElement(ellipseAxesElement);
      }
    }

    if (T3Gv.opt.ob.Frame) {
      HookUtil.MaintainLink(event, this, T3Gv.opt.ob, triggerType);
      T3Gv.opt.ob = {};
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    OptCMUtil.SetLinkFlag(event, DSConstant.LinkFlags.Move);
    T3Gv.opt.UpdateLinks();

    if (this.arcobj) {
      this.arcobj = null;
    }

    T3Util.Log("= S.PolyLineContainer: Output result:", true);
  }

  UpdateDimensionFromText(event, text, dimensionData) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", event, text, dimensionData);

    let dimensionValue, dimensionLength, segmentIndex, polyPoints, rotatedPoints, segmentAngle, angleInRadians, adjustedX, adjustedY;
    let hitSegmentData = { hitSegment: 0, moveAngle: 0 };
    let originalState = Utils1.DeepCopy(this);
    let isClosed = this.polylist.closed;
    let isAllSegments = false;
    let originalDimensions = -1;

    if (dimensionData.hookedObjectInfo) {
      return this.UpdateDimensionsFromTextForHookedObject(event, text, dimensionData);
    }

    if (dimensionData.angleChange) {
      return this.UpdateLineAngleDimensionFromText(event, text, dimensionData);
    }

    segmentIndex = dimensionData.segment;
    T3Gv.opt.ob = originalState;
    DataUtil.GetObjectPtr(this.BlockID, true);
    SvgUtil.ShowSVGSelectionState(this.BlockID, false);

    dimensionValue = this.GetDimensionValueFromString(text, segmentIndex);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    if (dimensionLength <= 0 || dimensionValue < 0) {
      DataUtil.AddToDirtyList(this.BlockID);
      SvgUtil.RenderDirtySVGObjects();
      return;
    }

    hitSegmentData.hitSegment = segmentIndex + 1;
    if (hitSegmentData.hitSegment >= this.polylist.segs.length) {
      hitSegmentData.hitSegment = isClosed ? 1 : segmentIndex;
      isAllSegments = !isClosed;
    }

    if (!isClosed && (segmentIndex === 1 || segmentIndex === this.polylist.segs.length - 1)) {
      hitSegmentData.hitSegment = segmentIndex;
      isAllSegments = true;
    }

    hitSegmentData.moveAngle = this.GetSegmentAdjustAngle(hitSegmentData.hitSegment);
    segmentAngle = 360 - hitSegmentData.moveAngle;
    angleInRadians = 2 * Math.PI * (segmentAngle / 360);

    polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
    rotatedPoints = isClosed && this instanceof PolyLineContainer
      ? T3Gv.opt.InflateLine(polyPoints, this.StyleRecord.Line.BThick, isClosed, this.Dimensions & NvConstant.DimensionFlags.Exterior)
      : Utils1.DeepCopy(polyPoints);

    for (let i = 0; i < rotatedPoints.length; i++) {
      rotatedPoints[i].x += this.Frame.x;
      rotatedPoints[i].y += this.Frame.y;
    }

    adjustedX = rotatedPoints[segmentIndex].x;
    adjustedY = rotatedPoints[segmentIndex].y;
    Utils3.RotatePointsAboutCenter(this.Frame, -angleInRadians, rotatedPoints);

    let segmentHeight = Math.abs(rotatedPoints[segmentIndex].y - rotatedPoints[segmentIndex - 1].y);
    if (Math.abs(dimensionLength) <= segmentHeight || isAllSegments) {
      if (!(this.Dimensions & NvConstant.DimensionFlags.AllSeg)) {
        originalDimensions = this.Dimensions;
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.AllSeg, true);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.Total, false);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.EndPts, false);
      }

      super.UpdateDimensionFromText(event, text, dimensionData);

      if (originalDimensions > 0) {
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.AllSeg, originalDimensions & NvConstant.DimensionFlags.AllSeg);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.Total, originalDimensions & NvConstant.DimensionFlags.Total);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.EndPts, originalDimensions & NvConstant.DimensionFlags.EndPts);
      }

      return;
    }

    let newSegmentLength = 0 === segmentHeight ? dimensionLength : Math.sqrt(Math.pow(dimensionLength, 2) - Math.pow(segmentHeight, 2));
    rotatedPoints[segmentIndex].x = rotatedPoints[segmentIndex].x > rotatedPoints[segmentIndex - 1].x
      ? rotatedPoints[segmentIndex - 1].x + newSegmentLength
      : rotatedPoints[segmentIndex - 1].x - newSegmentLength;

    Utils3.RotatePointsAboutCenter(this.Frame, angleInRadians, rotatedPoints);

    let newX = rotatedPoints[segmentIndex].x;
    let newY = rotatedPoints[segmentIndex].y;
    this.AdjustPolySeg(event, adjustedX, adjustedY, newX, newY, hitSegmentData, true, 0);

    OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.Move);
    for (let i = 0; i < this.hooks.length; i++) {
      OptCMUtil.SetLinkFlag(this.hooks[i].objid, DSConstant.LinkFlags.Move);
    }

    T3Gv.opt.ActionTriggerData = segmentIndex;
    HookUtil.MaintainLink(this.BlockID, this, originalState, OptConstant.ActionTriggerType.PolyNode);

    let polyRectInfo = { wdDim: -1, htDim: -1 };
    if (this.GetPolyRectangularInfo(polyRectInfo)) {
      if (segmentIndex === polyRectInfo.wdDim || segmentIndex === polyRectInfo.wdDim + 2) {
        this.rwd = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, true);
      } else if (segmentIndex === polyRectInfo.htDim || segmentIndex === polyRectInfo.htDim + 2) {
        this.rht = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, true);
      }
    } else {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    if (this.Frame.x < 0 || this.Frame.y < 0) {
      let frameAdjustment = { x: 0, y: 0 };
      if (this.Frame.x < 0) {
        frameAdjustment.x = -this.Frame.x;
        this.Frame.x += frameAdjustment.x;
      }
      if (this.Frame.y < 0) {
        frameAdjustment.y = -this.Frame.y;
        if (this.Dimensions & NvConstant.DimensionFlags.Always || this.Dimensions & NvConstant.DimensionFlags.Select) {
          frameAdjustment.y += OptConstant.Common.DimDefaultStandoff;
        }
        this.Frame.y += frameAdjustment.y;
      }
      this.StartPoint.x += frameAdjustment.x;
      this.StartPoint.y += frameAdjustment.y;
      this.EndPoint.x += frameAdjustment.x;
      this.EndPoint.y += frameAdjustment.y;
      T3Gv.opt.SetObjectFrame(this.BlockID, this.Frame);
    }

    this.UpdateDrawing(event);
    if (this.DataID !== -1) {
      this.LMResizeSVGTextObject(event, this, this.Frame);
    }

    T3Util.Log("= S.PolyLineContainer: Output result:", true);
  }

  GetDimensionsForDisplay() {
    T3Util.Log("= S.PolyLineContainer: Getting dimensions for display");

    if (this.objecttype !== NvConstant.FNObjectTypes.FlWall) {
      const dimensions = this.BaseLineGetDimensions();
      T3Util.Log("= S.PolyLineContainer: Output dimensions:", dimensions);
      return dimensions;
    }

    const dimensionPoints = this.GetDimensionPoints();
    const boundingRect = {};
    Utils2.GetPolyRect(boundingRect, dimensionPoints);

    const result = {
      x: boundingRect.x,
      y: boundingRect.y,
      width: boundingRect.width,
      height: boundingRect.height
    };

    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  BaseLineGetDimensions() {
    T3Util.Log("= S.PolyLineContainer: Getting base line dimensions");

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    let deltaY = this.EndPoint.y - this.StartPoint.y;
    let length = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    let dimensions = {
      x: length,
      y: 0
    };

    T3Util.Log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  CanSnapToShapes(shape) {
    T3Util.Log("= S.PolyLineContainer: Input shape:", shape);
    let result;
    if (shape && !this.polylist.closed) {
      shape.distanceonly = NvConstant.Guide_DistanceTypes.PolyWall;
      result = this.BlockID;
    } else {
      result = this.BlockID;
    }
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  IsSnapTarget() {
    T3Util.Log("= S.PolyLineContainer: Checking if it is a snap target");
    const result = false;
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  GuideDistanceOnly() {
    T3Util.Log("= S.PolyLineContainer: Checking guide distance type");
    const result = this.polylist.closed ? NvConstant.Guide_DistanceTypes.Room : NvConstant.Guide_DistanceTypes.PolyWall;
    T3Util.Log("= S.PolyLineContainer: Output guide distance type:", result);
    return result;
  }

  SetCursors() {
    T3Util.Log("= S.PolyLineContainer: Setting cursors");

    const element = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    const currentOperation = T3Gv.opt.crtOpt;

    if ((/*currentOperation === OptConstant.OptTypes.SplitWall &&*/ false && this.polylist && this.polylist.segs.length >= 3) ||
      currentOperation === OptConstant.OptTypes.AddCorner) {
      const slopElement = element.GetElementById(OptConstant.SVGElementClass.Slop);
      if (slopElement) {
        slopElement.SetCursor(CursorConstant.CursorType.Cross);
      }
    } else {
      this.BaseShapeSetCursors();
    }

    T3Util.Log("= S.PolyLineContainer: Cursors set");
  }

  BaseShapeSetCursors() {
    T3Util.Log("= S.PolyLineContainer: Setting cursors");

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    const isOneClick = (this.TextFlags & NvConstant.TextFlags.OneClick) > 0;
    const editMode = OptCMUtil.GetEditMode();

    switch (editMode) {
      case NvConstant.EditState.Default:

        this.BaseDrawingObjectSetCursors();

        if (isOneClick) {
          const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
          if (shapeElement) {
            shapeElement.SetCursor(CursorConstant.CursorType.Text);
          }
          const slopElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
        }

        break;

      case NvConstant.EditState.FormatPaint:
        const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          shapeElement.SetCursor(CursorConstant.CursorType.Paint);
        }
        const slopElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) {
          slopElement.SetCursor(CursorConstant.CursorType.Paint);
        }
        break;

      default:
        this.BaseDrawingObjectSetCursors();
    }

    T3Util.Log("= S.PolyLineContainer: Cursors set");
  }

  BaseDrawingObjectSetCursors() {
    T3Util.Log("= S.PolyLineContainer: Setting cursors");

    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    let isTextElementActive = false;

    if (!(this.flags & NvConstant.ObjFlags.Lock) && svgElement) {
      if (OptCMUtil.GetEditMode() === NvConstant.EditState.Default) {
        const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          if (this.objecttype === NvConstant.FNObjectTypes.FrameContainer) {
            shapeElement.SetCursor(CursorConstant.CursorType.Default);
          } else {
            shapeElement.SetCursor(CursorConstant.CursorType.Add);
          }
        }

        const iconTypes = [
          OptConstant.ShapeIconType.HyperLink,
          OptConstant.ShapeIconType.Notes,
          OptConstant.ShapeIconType.ExpandedView,
          OptConstant.ShapeIconType.Comment,
          OptConstant.ShapeIconType.Attachment,
          OptConstant.ShapeIconType.FieldData
        ];

        iconTypes.forEach(iconType => {
          const iconElement = svgElement.GetElementById(iconType);
          if (iconElement) {
            iconElement.SetCursor(CursorConstant.CursorType.Pointer);
          }
        });

        const slopElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) {
          slopElement.SetCursor(CursorConstant.CursorType.Add);
        }

        const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && svgElement.textElem) {
          if (svgElement.textElem === activeEditElement) {
            shapeElement.SetCursor(CursorConstant.CursorType.Text);
            svgElement.textElem.SetCursorState(CursorConstant.CursorState.EditLink);
          } else {
            svgElement.textElem.SetCursorState(CursorConstant.CursorState.LinkOnly);
          }
        }

        if (this.Dimensions & NvConstant.DimensionFlags.Always ||
          (this.Dimensions & NvConstant.DimensionFlags.Select && this.IsSelected())) {
          const dimensionTextElements = svgElement.GetElementListWithId(OptConstant.SVGElementClass.DimText);
          dimensionTextElements.forEach(dimensionTextElement => {
            dimensionTextElement.SetCursorState(CursorConstant.CursorState.EditOnly);
            if (dimensionTextElement === activeEditElement) {
              isTextElementActive = true;
            }
          });

          if (isTextElementActive) {
            shapeElement.SetCursor(null);
            if (slopElement) {
              slopElement.SetCursor(null);
            }
          }
        }
      } else {
        this.ClearCursors();
      }
    }

    T3Util.Log("= S.PolyLineContainer: Cursors set");
  }

  GetListOfEnclosedObjects(includeHooks: boolean, includeSelf: boolean) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", includeHooks, includeSelf);

    const visibleZList = LayerUtil.ActiveVisibleZList();
    const enclosedObjects: number[] = [];

    if (!this.polylist.closed) {
      T3Util.Log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
      return enclosedObjects;
    }

    this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, true, null);

    for (let i = 0; i < visibleZList.length; i++) {
      const obj = DataUtil.GetObjectPtr(visibleZList[i], false);
      if (this.BlockID !== obj.BlockID) {
        const isHooked = includeSelf && obj.hooks.length === 1 && obj.hooks[0].objid === this.BlockID;
        if ((!includeHooks && obj.hooks.length) || this.MostlyContains(obj) || isHooked) {
          enclosedObjects.push(obj.BlockID);
        }
      }
    }

    T3Util.Log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
    return enclosedObjects;
  }

  AfterRotateShape(event) {
    T3Util.Log("= S.PolyLineContainer: Input event:", event);

    const endRotation = T3Gv.opt.rotateEndRotation;
    this.RotateAllInContainer(event, endRotation);

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    DataUtil.AddToDirtyList(event);
    SvgUtil.RenderDirtySVGObjects();

    T3Util.Log("= S.PolyLineContainer: Output result:", true);
  }

  RotateAllInContainer(event, rotationAngle) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", event, rotationAngle);

    LayerUtil.ActiveVisibleZList();
    let enclosedObjects = [];
    T3Gv.stdObj.PreserveBlock(T3Gv.opt.theSelectedListBlockID);
    let selectedObject = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID);
    let selectedData = selectedObject.Data;
    let originalData = Utils1.DeepCopy(selectedData);

    SelectUtil.ClearSelectionClick();
    enclosedObjects = this.GetListOfEnclosedObjects(false, true);
    enclosedObjects.push(this.BlockID);

    if (enclosedObjects.length <= 1) {
      let startRotation = T3Gv.opt.rotateStartRotation;
      let endRotation = T3Gv.opt.rotateEndRotation;

      T3Gv.opt.ob = Utils1.DeepCopy(this);
      T3Gv.opt.rotateStartRotation = 0;
      T3Gv.opt.rotateEndRotation = rotationAngle;
      T3Gv.opt.rotateStartPoint.x = this.RotateKnobPt.x;
      T3Gv.opt.rotateStartPoint.y = this.RotateKnobPt.y;
      T3Gv.opt.rotatePivotX = this.Frame.x + this.Frame.width / 2;
      T3Gv.opt.rotatePivotY = this.Frame.y + this.Frame.height / 2;

      super.AfterRotateShape(event);

      T3Gv.opt.rotateStartRotation = startRotation;
      T3Gv.opt.rotateEndRotation = endRotation;
      SelectUtil.SelectObjects(enclosedObjects, false, false);
      T3Gv.opt.ob = {};

      T3Util.Log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
      return enclosedObjects;
    }

    SelectUtil.SelectObjects(enclosedObjects, false, false);
    let groupID = ToolActUtil.GroupSelected(true, null, false, false, false);
    selectedData = T3Gv.stdObj.GetObject(T3Gv.opt.theSelectedListBlockID).Data;

    let groupObject = DataUtil.GetObjectPtr(groupID, true);
    T3Gv.opt.svgObjectLayer.GetElementById(groupObject.BlockID).SetRotation(rotationAngle);
    groupObject.RotationAngle = rotationAngle;
    ToolActUtil.UngroupShape(groupID, true);

    let lastObjectID = enclosedObjects.pop();
    SelectUtil.SelectObjects(originalData, false, false);
    let lastObject = DataUtil.GetObjectPtr(lastObjectID, false);
    lastObject.UpdateFrame();

    if (lastObject && (lastObject.r.x < 0 || lastObject.r.y < 0)) {
      ToolActUtil.Undo();
      // Collab.UnLockMessages();
      // Collab.UnBlockMessages();
    }

    T3Util.Log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
    return enclosedObjects;
  }

  GetPointsForAreaDimension() {
    T3Util.Log("= S.PolyLineContainer: Getting points for area dimension");

    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, false, false, null);
    const result = this.Dimensions & NvConstant.DimensionFlags.Exterior
      ? T3Gv.opt.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, true)
      : T3Gv.opt.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, false);

    T3Util.Log("= S.PolyLineContainer: Output points for area dimension:", result);
    return result;
  }

  GetDimensionPoints() {
    T3Util.Log("= S.PolyLineContainer: Getting dimension points");

    let dimensionPoints = [];
    let polyPoints = [];
    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let center = { x: this.Frame.width / 2, y: this.Frame.height / 2 };
    let startPoint = {};
    let endPoint = {};

    if (!this.polylist.closed && this.Dimensions & NvConstant.DimensionFlags.EndPts) {
      dimensionPoints.push(new Point(this.StartPoint.x - this.Frame.x, this.StartPoint.y - this.Frame.y));
      dimensionPoints.push(new Point(this.EndPoint.x - this.Frame.x, this.EndPoint.y - this.Frame.y));
    } else if (!this.polylist.closed && this.Dimensions & NvConstant.DimensionFlags.Total) {
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
      for (let i = 1; i < polyPoints.length; i++) {
        deltaX = Math.abs(polyPoints[i - 1].x - polyPoints[i].x);
        deltaY = Math.abs(polyPoints[i - 1].y - polyPoints[i].y);
        totalLength += Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      }
      startPoint.x = center.x - totalLength / 2;
      startPoint.y = center.y;
      dimensionPoints.push(new Point(startPoint.x, startPoint.y));
      endPoint.x = center.x + totalLength / 2;
      endPoint.y = center.y;
      dimensionPoints.push(new Point(endPoint.x, endPoint.y));
      const angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(new Point(0, 0), new Point(this.Frame.width, this.Frame.height));
      Utils3.RotatePointsAboutPoint(center, angle, dimensionPoints);
    } else {
      polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);
      dimensionPoints = this.polylist.closed
        ? T3Gv.opt.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, this.Dimensions & NvConstant.DimensionFlags.Exterior)
        : Utils1.DeepCopy(polyPoints);
    }

    T3Util.Log("= S.PolyLineContainer: Output dimension points:", dimensionPoints);
    return dimensionPoints;
  }

  CustomSnap(offsetX, offsetY, deltaX, deltaY, snapPoint, hitPoint) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", offsetX, offsetY, deltaX, deltaY, snapPoint, hitPoint);

    let closestX = 32768, closestY = 32768, snapX = 32768, snapY = 32768, hitSegment = -1;
    const zList = LayerUtil.ZList();
    const polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, null);

    for (let i = 0; i < polyPoints.length; i++) {
      polyPoints[i].x += offsetX;
      polyPoints[i].y += offsetY;
    }

    if (hitPoint) {
      const hitResult = {};
      if (Utils3.LineDStyleHit(polyPoints, { x: hitPoint.x + deltaX, y: hitPoint.y + deltaY }, this.StyleRecord.Line.Thickness, 0, hitResult) && hitResult.lpHit >= 0) {
        hitSegment = hitResult.lpHit;
      }
    }

    for (let i = 0; i < polyPoints.length; i++) {
      polyPoints[i].x += deltaX;
      polyPoints[i].y += deltaY;
    }

    const polyRect = {};
    Utils2.GetPolyRect(polyRect, polyPoints);

    for (let i = 0; i < zList.length; i++) {
      if (zList[i] !== this.BlockID) {
        if (T3Gv.opt.moveList && T3Gv.opt.moveList.includes(zList[i])) {
          continue;
        }

        const obj = DataUtil.GetObjectPtr(zList[i], false);
        if (obj instanceof PolyLineContainer) {
          const startSegment = hitSegment >= 0 ? hitSegment : 1;
          const endSegment = hitSegment >= 0 ? hitSegment + 1 : polyPoints.length;

          for (let j = startSegment; j < endSegment; j++) {
            const hitResult = new HitResult(-1, 0, null);
            let point = { x: polyPoints[j - 1].x, y: polyPoints[j - 1].y };

            if (!obj.Hit(point, false, false, hitResult)) {
              point = { x: polyPoints[j].x, y: polyPoints[j].y };
              if (!obj.Hit(point, false, false, hitResult)) {
                continue;
              }
            }

            const segmentIndex = hitResult.segment + 1;
            const objPolyPoints = obj.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, null);
            const angle1 = Utils1.CalcAngleFromPoints(polyPoints[j - 1], polyPoints[j]);
            const angle2 = Utils1.CalcAngleFromPoints(objPolyPoints[segmentIndex - 1], objPolyPoints[segmentIndex]);
            const angleDiff = 90 - angle1 + angle2;

            if (Math.abs(90 - angleDiff) <= 1 || Math.abs(270 - angleDiff) <= 1) {
              const snapPointCopy = { x: point.x, y: point.y };
              obj.SnapPointToSegment(segmentIndex, snapPointCopy);

              const deltaX = snapPointCopy.x - point.x;
              const deltaY = snapPointCopy.y - point.y;
              const angle = T3Gv.opt.GetCounterClockwiseAngleBetween2Points(polyPoints[j - 1], polyPoints[j]);
              let angleInDegrees = (angle / (2 * Math.PI)) * 360;

              if (angleInDegrees > 180) {
                angleInDegrees -= 180;
              }

              if (angleInDegrees % 90 < 1 || angleInDegrees % 90 > 89) {
                if (angleInDegrees >= 89 && angleInDegrees <= 91) {
                  if (Math.abs(deltaX) > 0.02 && Math.abs(snapX) > Math.abs(deltaX)) {
                    snapX = deltaX;
                  }
                  snapY = 32768;
                  if (Math.abs(obj.Frame.y - polyRect.y) < 10) {
                    snapY = obj.Frame.y - polyRect.y;
                  } else if (Math.abs(obj.Frame.y - (polyRect.y + polyRect.height)) < 10) {
                    snapY = obj.Frame.y - (polyRect.y + polyRect.height);
                  } else if (Math.abs(obj.Frame.y + obj.Frame.height - polyRect.y) < 10) {
                    snapY = obj.Frame.y + obj.Frame.height - polyRect.y;
                  } else if (Math.abs(obj.Frame.y + obj.Frame.height - (polyRect.y + polyRect.height)) < 10) {
                    snapY = obj.Frame.y + obj.Frame.height - (polyRect.y + polyRect.height);
                  }
                  if (Math.abs(closestY) > Math.abs(snapY)) {
                    closestY = snapY;
                  }
                } else if (Math.abs(deltaY) > 0.02 && Math.abs(closestY) > Math.abs(deltaY)) {
                  closestY = deltaY;
                  snapX = 32768;
                  if (Math.abs(obj.Frame.x - polyRect.x) < 10) {
                    snapX = obj.Frame.x - polyRect.x;
                  } else if (Math.abs(obj.Frame.x - (polyRect.x + polyRect.width)) < 10) {
                    snapX = obj.Frame.x - (polyRect.x + polyRect.width);
                  } else if (Math.abs(obj.Frame.x + obj.Frame.width - polyRect.x) < 10) {
                    snapX = obj.Frame.x + obj.Frame.width - polyRect.x;
                  } else if (Math.abs(obj.Frame.x + obj.Frame.width - (polyRect.x + polyRect.width)) < 10) {
                    snapX = obj.Frame.x + obj.Frame.width - (polyRect.x + polyRect.width);
                  }
                  if (Math.abs(snapX) > Math.abs(snapX)) {
                    snapX = snapX;
                  }
                }
              } else if (Math.abs(deltaX) > 0.02 || Math.abs(deltaY) > 0.02) {
                if (Math.abs(snapX) > Math.abs(deltaX)) {
                  snapX = deltaX;
                }
                if (Math.abs(closestY) > Math.abs(deltaY)) {
                  closestY = deltaY;
                }
              }
            }
          }
        }
      }
    }

    if (snapX !== 32768 || closestY !== 32768) {
      if (snapX < 32768) {
        hitPoint.x += snapX;
      }
      if (closestY < 32768) {
        hitPoint.y += closestY;
      }
      T3Util.Log("= S.PolyLineContainer: Output result:", true);
      return true;
    }

    T3Util.Log("= S.PolyLineContainer: Output result:", false);
    return false;
  }

  CanUseRFlags() {
    T3Util.Log("= S.PolyLineContainer: Checking if RFlags can be used");
    const result = this.GetPolyRectangularInfo(null);
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  SetSize(width, height, aspectRatio) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", width, height, aspectRatio);

    if (width !== null) {
      if (height === null && Math.abs(width - this.Frame.width) === 1) {
        return true;
      }
    } else if (height !== null && width === null && Math.abs(height - this.Frame.height) === 1) {
      return true;
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    const result = super.SetSize(width, height, aspectRatio);
    T3Util.Log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  AdjustDimensionLength(dimensionLength) {
    T3Util.Log("= S.PolyLineContainer: Input dimensionLength:", dimensionLength);
    let adjustedLength = dimensionLength;

    if (this.polylist && this.polylist.closed && this.GetPolyRectangularInfo(null) !== null) {
      const thicknessAdjustment = this.Dimensions & NvConstant.DimensionFlags.Exterior
        ? -this.StyleRecord.Line.Thickness
        : this.StyleRecord.Line.Thickness;

      if (dimensionLength !== null) {
        adjustedLength += thicknessAdjustment;
      }
    }

    T3Util.Log("= S.PolyLineContainer: Output adjustedLength:", adjustedLength);
    return adjustedLength;
  }

  GetDimensionsForDisplay() {
    T3Util.Log("= S.PolyLineContainer: Getting dimensions for display");

    const dimensions = {
      width: this.Frame.width,
      height: this.Frame.height,
      x: this.Frame.x,
      y: this.Frame.y
    };

    if (this.polylist && this.polylist.closed) {
      if (this.Dimensions & NvConstant.DimensionFlags.Exterior) {
        dimensions.x -= this.StyleRecord.Line.Thickness / 2;
        dimensions.y -= this.StyleRecord.Line.Thickness / 2;
        dimensions.width += this.StyleRecord.Line.Thickness;
        dimensions.height += this.StyleRecord.Line.Thickness;
      } else {
        dimensions.x += this.StyleRecord.Line.Thickness / 2;
        dimensions.y += this.StyleRecord.Line.Thickness / 2;
        dimensions.width -= this.StyleRecord.Line.Thickness;
        dimensions.height -= this.StyleRecord.Line.Thickness;
      }
    }

    T3Util.Log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  GetSnapRect() {
    T3Util.Log("= S.PolyLineContainer: Getting snap rect");
    const dimensions = this.GetDimensionsForDisplay();
    T3Util.Log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  GetDragR() {
    T3Util.Log("= S.PolyLineContainer: Getting drag rectangle");

    const dragRectangle = {};
    Utils2.CopyRect(dragRectangle, this.r);

    if (this.polylist && this.polylist.closed && this.StyleRecord && this.StyleRecord.Line) {
      const lineThickness = this.StyleRecord.Line.BThick;
      Utils2.InflateRect(dragRectangle, 2 * lineThickness, 2 * lineThickness);
    }

    T3Util.Log("= S.PolyLineContainer: Output drag rectangle:", dragRectangle);
    return dragRectangle;
  }

  SetShapeOrigin(x: number, y: number, width: number, height: number) {
    T3Util.Log("= S.PolyLineContainer: Input parameters:", x, y, width, height);

    let frame = this.GetSVGFrame();
    let offsetX = 0;
    let offsetY = 0;

    if (this.polylist && this.polylist.closed && height) {
      if (this.Dimensions & NvConstant.DimensionFlags.Exterior) {
        frame.x -= this.StyleRecord.Line.Thickness / 2;
        frame.y -= this.StyleRecord.Line.Thickness / 2;
        frame.width += this.StyleRecord.Line.Thickness;
        frame.height += this.StyleRecord.Line.Thickness;
      } else {
        frame.x += this.StyleRecord.Line.Thickness / 2;
        frame.y += this.StyleRecord.Line.Thickness / 2;
        frame.width -= this.StyleRecord.Line.Thickness;
        frame.height -= this.StyleRecord.Line.Thickness;
      }
    }

    if (x !== null) {
      offsetX = frame.x - x;
    }
    if (y !== null) {
      offsetY = frame.y - y;
    }

    this.StartPoint.x -= offsetX;
    this.StartPoint.y -= offsetY;
    this.EndPoint.x -= offsetX;
    this.EndPoint.y -= offsetY;
    this.CalcFrame();

    T3Util.Log("= S.PolyLineContainer: Output frame:", frame);
  }

  MaintainDimensionThroughPolygonOpennessChange(isClosed: boolean) {
    T3Util.Log("= S.PolyLineContainer: Input isClosed:", isClosed);

    let polyPoints = this.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false);
    let isExterior = false;

    if (isClosed) {
      this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.Total | NvConstant.DimensionFlags.EndPts, false);
      this.Dimensions = Utils2.SetFlag(this.Dimensions, NvConstant.DimensionFlags.AllSeg, true);
    }

    isExterior = isClosed ? !(this.Dimensions & NvConstant.DimensionFlags.Exterior) : this.Dimensions & NvConstant.DimensionFlags.Exterior;

    let inflatedPoints = T3Gv.opt.InflateLine(polyPoints, this.StyleRecord.Line.Thickness / 2, true, isExterior);

    if (inflatedPoints && inflatedPoints.length === this.polylist.segs.length) {
      this.StartPoint.x = inflatedPoints[0].x;
      this.StartPoint.y = inflatedPoints[0].y;
      this.EndPoint.x = inflatedPoints[inflatedPoints.length - 1].x;
      this.EndPoint.y = inflatedPoints[inflatedPoints.length - 1].y;

      for (let i = 0; i < this.polylist.segs.length; i++) {
        this.polylist.segs[i].pt.x = inflatedPoints[i].x - this.StartPoint.x;
        this.polylist.segs[i].pt.y = inflatedPoints[i].y - this.StartPoint.y;
      }
    }

    T3Util.Log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
  }

  ChangeLineThickness(newThickness) {
    T3Util.Log("= S.PolyLineContainer: Input newThickness:", newThickness);

    let temp, polyLine, points, instance, offset, originalPoints = [], segmentIndices = [], currentThickness = this.StyleRecord.Line.Thickness;
    this.UpdateFrame(null);
    offset = (currentThickness - newThickness) / 2;
    instance = this;

    if (instance.StyleRecord.Line.BThick && instance.polylist && instance.polylist.closed && instance.polylist.segs && instance.polylist.segs.length) {
      if (instance instanceof Instance.Shape.Polygon) {
        let polygonData = {};
        polygonData.Frame = instance.Frame;
        polyLine = new Instance.Shape.PolyLine(polygonData);
        polyLine.polylist = instance.polylist;
        polyLine.StartPoint = instance.StartPoint;
        polyLine.EndPoint = instance.EndPoint;
      } else {
        polyLine = instance;
      }

      points = polyLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, segmentIndices);
      if (segmentIndices.length > 0) {
        originalPoints.push(new Point(points[0].x, points[0].y));
        for (temp = 0; temp < segmentIndices.length; temp++) {
          originalPoints.push(new Point(points[segmentIndices[temp]].x, points[segmentIndices[temp]].y));
        }
      } else {
        originalPoints = Utils1.DeepCopy(points);
      }

      points = T3Gv.opt.InflateLine(originalPoints, Math.abs(offset), true, offset >= 0);
      instance.StartPoint.x = points[0].x;
      instance.StartPoint.y = points[0].y;
      instance.EndPoint.x = points[points.length - 1].x;
      instance.EndPoint.y = points[points.length - 1].y;

      let originalSegments = Utils1.DeepCopy(instance.polylist.segs);
      instance.polylist.segs = [];
      for (temp = 0; temp < points.length; temp++) {
        instance.polylist.segs.push(new PolySeg(1, points[temp].x - instance.StartPoint.x, points[temp].y - instance.StartPoint.y));
        if (temp < originalSegments.length) {
          instance.polylist.segs[temp].LineType = originalSegments[temp].LineType;
          instance.polylist.segs[temp].ShortRef = originalSegments[temp].ShortRef;
          instance.polylist.segs[temp].dataclass = originalSegments[temp].dataclass;
          instance.polylist.segs[temp].dimDeflection = originalSegments[temp].dimDeflection;
          instance.polylist.segs[temp].flags = originalSegments[temp].flags;
          instance.polylist.segs[temp].param = originalSegments[temp].param;
          instance.polylist.segs[temp].weight = originalSegments[temp].weight;
        }
      }

      if (instance instanceof Instance.Shape.BaseLine) {
        instance.CalcFrame();
      } else if (instance instanceof Instance.Shape.Polygon) {
        currentThickness = instance.StyleRecord.Line.BThick;
        let scaleX = instance.Frame.width / (instance.Frame.width + 2 * currentThickness);
        let scaleY = instance.Frame.height / (instance.Frame.height + 2 * currentThickness);
        let deltaX = instance.Frame.x * scaleX - instance.Frame.x + currentThickness;
        let deltaY = instance.Frame.y * scaleY - instance.Frame.y + currentThickness;
        instance.ScaleObject(deltaX, deltaY, null, 0, scaleX, scaleY, false);
      }
    }

    this.UpdateFrame(null);
    T3Util.Log("= S.PolyLineContainer: Output updated thickness:", newThickness);
  }

  ChangeLineThickness(newThickness) {
    T3Util.Log("= S.PolyLineContainer: Input newThickness:", newThickness);

    let temp, polyLine, points, instance, offset, originalPoints = [], segmentIndices = [];
    const currentThickness = this.StyleRecord.Line.Thickness;
    this.UpdateFrame(null);
    offset = (currentThickness - newThickness) / 2;
    instance = this;

    if (instance.StyleRecord.Line.BThick && instance.polylist && instance.polylist.closed && instance.polylist.segs && instance.polylist.segs.length) {
      if (instance instanceof Instance.Shape.Polygon) {
        let polygonData = {};
        polygonData.Frame = instance.Frame;
        polyLine = new Instance.Shape.PolyLine(polygonData);
        polyLine.polylist = instance.polylist;
        polyLine.StartPoint = instance.StartPoint;
        polyLine.EndPoint = instance.EndPoint;
      } else {
        polyLine = instance;
      }

      points = polyLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, segmentIndices);
      if (segmentIndices.length > 0) {
        originalPoints.push(new Point(points[0].x, points[0].y));
        for (temp = 0; temp < segmentIndices.length; temp++) {
          originalPoints.push(new Point(points[segmentIndices[temp]].x, points[segmentIndices[temp]].y));
        }
      } else {
        originalPoints = Utils1.DeepCopy(points);
      }

      points = T3Gv.opt.InflateLine(originalPoints, Math.abs(offset), true, offset >= 0);
      instance.StartPoint.x = points[0].x;
      instance.StartPoint.y = points[0].y;
      instance.EndPoint.x = points[points.length - 1].x;
      instance.EndPoint.y = points[points.length - 1].y;

      let originalSegments = Utils1.DeepCopy(instance.polylist.segs);
      instance.polylist.segs = [];
      for (temp = 0; temp < points.length; temp++) {
        instance.polylist.segs.push(new PolySeg(1, points[temp].x - instance.StartPoint.x, points[temp].y - instance.StartPoint.y));
        if (temp < originalSegments.length) {
          instance.polylist.segs[temp].LineType = originalSegments[temp].LineType;
          instance.polylist.segs[temp].ShortRef = originalSegments[temp].ShortRef;
          instance.polylist.segs[temp].dataclass = originalSegments[temp].dataclass;
          instance.polylist.segs[temp].dimDeflection = originalSegments[temp].dimDeflection;
          instance.polylist.segs[temp].flags = originalSegments[temp].flags;
          instance.polylist.segs[temp].param = originalSegments[temp].param;
          instance.polylist.segs[temp].weight = originalSegments[temp].weight;
        }
      }

      if (instance instanceof Instance.Shape.BaseLine) {
        instance.CalcFrame();
      } else if (instance instanceof Instance.Shape.Polygon) {
        const currentThickness = instance.StyleRecord.Line.BThick;
        const scaleX = instance.Frame.width / (instance.Frame.width + 2 * currentThickness);
        const scaleY = instance.Frame.height / (instance.Frame.height + 2 * currentThickness);
        const deltaX = instance.Frame.x * scaleX - instance.Frame.x + currentThickness;
        const deltaY = instance.Frame.y * scaleY - instance.Frame.y + currentThickness;
        instance.ScaleObject(deltaX, deltaY, null, 0, scaleX, scaleY, false);
      }
    }

    this.UpdateFrame(null);
    T3Util.Log("= S.PolyLineContainer: Output updated thickness:", newThickness);
  }
}

export default PolyLineContainer
