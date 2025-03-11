

import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/T3Gv'
import DefaultEvt from "../Event/EvtUtil";
import PolyLine from "./S.PolyLine"
import BaseLine from "./S.BaseLine";
import Point from '../Model/Point'
import BaseShape from './S.BaseShape'
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element';
import Instance from '../Data/Instance/Instance';
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import HitResult from '../Model/HitResult'
import ConstantData2 from '../Data/ConstantData2';

class PolyLineContainer extends PolyLine {

  public T3Type: string;

  constructor(params) {
    console.log("= S.PolyLineContainer: Input parameters:", params);

    params = params || {};
    if (params.Dimensions === undefined) {
      params.Dimensions = ConstantData.DimensionFlags.SED_DF_Always;
    }
    if (params.objecttype === undefined) {
      params.objecttype = ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL;
    }
    if (params.TextFlags === undefined) {
      params.TextFlags = 0;
    }
    params.TextFlags = Utils2.SetFlag(params.TextFlags, ConstantData.TextFlags.SED_TF_None, true);

    super(params);

    this.T3Type = "PolyLineContainer";

    console.log("= S.PolyLineContainer: Output instance:", this);
  }

  CreateShape(inputParams, shapeType) {
    console.log("= S.PolyLineContainer: Input parameters:", inputParams, shapeType);
    const result = super.CreateShape(inputParams, shapeType);
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  NoRotate() {
    console.log("= S.PolyLineContainer: Checking if rotation is allowed");
    const canRotate = this.polylist.closed;
    console.log("= S.PolyLineContainer: Rotation allowed:", canRotate);
    return !canRotate;
  }

  GetKnobSize(event) {
    console.log("= S.PolyLineContainer: Input event:", event);
    const knobSize = 2 * (1 * ConstantData.Defines.SED_KnobSize / 1);
    console.log("= S.PolyLineContainer: Output knobSize:", knobSize);
    return knobSize;
  }

  GetCornerKnobImages() {
    console.log("= S.PolyLineContainer: Fetching corner knob images");
    const knobImages = {
      nwse: ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag1,
      nesw: ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandDiag2
    };
    console.log("= S.PolyLineContainer: Corner knob images:", knobImages);
    return knobImages;
  }

  CreateActionTriggers(doc, triggerType, action, rotation) {
    console.log("= S.PolyLineContainer: Input parameters:", doc, triggerType, action, rotation);
    let segmentCount, knobSize = 0, angle = 0, knob = null, actionTriggers = null, halfKnobSize = 0;
    const isFirefox = -1 != navigator.userAgent.toLowerCase().indexOf("firefox");

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL && (gBusinessManager && gBusinessManager.IsAddingWalls && gBusinessManager.IsAddingWalls() || ConstantData.DocumentContext.UsingWallTool)) {
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
      shapeType: ConstantData.CreateShapeType.IMAGE,
      knobSize: knobSize,
      fillOpacity: 1,
      strokeSize: 0,
      knobID: ConstantData.ActionTriggerType.MOVEPOLYSEG,
      cursorType: this.CalcCursorForSegment(this.StartPoint, this.EndPoint, !1),
      locked: !1
    };

    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobParams.fillColor = "gray";
      knobParams.locked = !0;
    } else if (this.NoGrow()) {
      knobParams.fillColor = "red";
      knobParams.strokeColor = "red";
      knobParams.cursorType = SDGraphics.Element.CursorType.DEFAULT;
    }

    if ((segmentCount = this.polylist.segs.length) !== 0) {
      if (segmentCount > 2 && 0 == (this.flags & ConstantData.ObjFlags.SEDO_Lock)) {
        for (let i = 1; i < segmentCount; i++) {
          knobParams.cursorType = this.CalcCursorForAngle(this.GetSegmentAdjustAngle(i));
          if (this.NoGrow()) {
            knobParams.cursorType = SDGraphics.Element.CursorType.DEFAULT;
          }

          switch (this.polylist.segs[i].LineType) {
            case ConstantData.LineType.LINE:
              knobParams.x = this.polylist.segs[i - 1].pt.x + (this.polylist.segs[i].pt.x - this.polylist.segs[i - 1].pt.x) / 2 + halfKnobSize + (this.StartPoint.x - this.Frame.x);
              knobParams.y = this.polylist.segs[i - 1].pt.y + (this.polylist.segs[i].pt.y - this.polylist.segs[i - 1].pt.y) / 2 + halfKnobSize + (this.StartPoint.y - this.Frame.y);
              knobParams.x -= knobSize / 2;
              knobParams.y -= knobSize / 2;
              break;
            case ConstantData.LineType.ARCLINE:
            case ConstantData.LineType.PARABOLA:
            case ConstantData.LineType.ARCSEGLINE:
              const existingKnob = actionTriggers.GetElementByID(ConstantData.ActionTriggerType.POLYLADJ, i);
              if (existingKnob) {
                const existingKnobPos = existingKnob.GetPos();
                const points = [
                  new Point(this.polylist.segs[i - 1].pt.x, this.polylist.segs[i - 1].pt.y),
                  existingKnobPos,
                  new Point(this.polylist.segs[i].pt.x, this.polylist.segs[i].pt.y)
                ];
                angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(points[0], points[2]);
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
            knob.SetURL(ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandVert);
            knob.ExcludeFromExport(!0);
          }

          angle = Utils1.CalcAngleFromPoints(this.polylist.segs[i - 1].pt, this.polylist.segs[i].pt);
          if (angle !== 0) {
            if (isFirefox) {
              if ((angle >= 45 && angle <= 135) || (angle >= 235 && angle < 315)) {
                knob && knob.SetURL && knob.SetURL(ConstantData.Constants.FilePath_ImageKnobs + ConstantData.Constants.Knob_ExpandHoriz);
              }
            } else {
              knob.SetRotation(angle);
            }
          }

          actionTriggers.AddElement(knob);
        }
      }
      console.log("= S.PolyLineContainer: Output actionTriggers:", actionTriggers);
      return actionTriggers;
    }
  }

  PostCreateShapeCallback(doc, triggerType, action, rotation) {
    console.log("= S.PolyLineContainer: Input parameters:", doc, triggerType, action, rotation);
    const result = super.PostCreateShapeCallback(doc, triggerType, action, rotation);
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  UpdateSVG(svgDocument, points) {
    console.log("= S.PolyLineContainer: Input parameters:", svgDocument, points);
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
    console.log("= S.PolyLineContainer: Updated SVG path");
  }

  MostlyContains(shape) {
    console.log("= S.PolyLineContainer: Input shape:", shape);

    let rotationAngle = 0;
    let containsPoint = false;
    const boundingBox = {};
    const shapePoints = shape.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false);

    if (GlobalData.optManager.ActiveVisibleZList().indexOf(shape.BlockID) < 0) {
      return false;
    }

    if (shape.RotationAngle !== 0) {
      rotationAngle = -shape.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(shape.Frame, rotationAngle, shapePoints);
    }

    const thisPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false);
    const numPoints = shapePoints.length;

    for (let i = 0; i < numPoints; i++) {
      if (GlobalData.optManager.PolyPtInPolygon(thisPoints, shapePoints[i])) {
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

    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  InterceptMoveOperation(event) {
    console.log("= S.PolyLineContainer: Input event:", event);
    let targetElement, selectedObjects = [], zList = GlobalData.optManager.ZList(), mostlyContainsFlag = false;

    try {
      targetElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
      if (!targetElement) return false;

      const targetID = targetElement.GetTargetForEvent(event).GetID();
      const docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);

      if (targetID === ConstantData.SVGElementClass.DIMENSIONTEXT) return true;

      if (this.PolyHitSeg(docCoords) === -1) mostlyContainsFlag = true;

      if (mostlyContainsFlag) {
        GlobalData.optManager.ClearSelectionClick();
        selectedObjects.push(this.BlockID);

        for (let i = 0; i < zList.length; i++) {
          const obj = GlobalData.optManager.GetObjectPtr(zList[i], false);
          if (this.BlockID === obj.BlockID || obj.hooks.length) continue;
          if (this.MostlyContains(obj)) selectedObjects.push(obj.BlockID);
        }

        GlobalData.optManager.SelectObjects(selectedObjects, false, false);
        GlobalData.optManager.PostMoveSelectID = this.BlockID;
        GlobalData.optManager.HideAllSVGSelectionStates();
        console.log("= S.PolyLineContainer: Output selectedObjects:", selectedObjects);
        return false;
      }

      return false;
    } catch (error) {
      this.LM_ActionClick_ExceptionCleanup(error);
      GlobalData.optManager.ExceptionCleanup(error);
      throw error;
    }
  }

  SetupInterceptMove(event) {
    console.log("= S.PolyLineContainer: Input event:", event);

    GlobalData.optManager.theEventTimestamp = Date.now();
    event.stopPropagation();

    const svgElement = GlobalData.optManager.svgObjectLayer.FindElementByDOMElement(event.currentTarget);
    if (svgElement === null) {
      return false;
    }

    const elementID = svgElement.ID;
    GlobalData.optManager.theActionStoredObjectID = elementID;
    GlobalData.objectStore.PreserveBlock(elementID);

    const actionTriggerType = ConstantData.ActionTriggerType.MOVEPOLYSEG;
    GlobalData.optManager.theActionTriggerID = actionTriggerType;
    this.LM_ActionPreTrack(elementID, actionTriggerType);
    GlobalData.optManager.theActionSVGObject = svgElement;

    let docCoords = GlobalData.optManager.svgDoc.ConvertWindowToDocCoords(event.gesture.center.clientX, event.gesture.center.clientY);
    docCoords = GlobalData.optManager.DoAutoGrowDrag(docCoords);

    const hitResult = new HitResult(-1, 0, null);
    this.Hit(docCoords, false, false, hitResult);

    GlobalData.optManager.theActionTriggerData = {
      hitSegment: hitResult.segment + 1,
      moveAngle: 9999
    };

    const startX = docCoords.x;
    const startY = docCoords.y;
    const svgFrame = this.GetSVGFrame();

    GlobalData.optManager.theActionBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.theActionNewBBox = $.extend(true, {}, svgFrame);
    GlobalData.optManager.HideAllSVGSelectionStates();
    GlobalData.optManager.theActionStartX = startX;
    GlobalData.optManager.theActionStartY = startY;

    const finalHitResult = new HitResult(-1, 0, null);
    this.Hit(docCoords, false, false, finalHitResult);

    console.log("= S.PolyLineContainer: Output result:", true);
    return true;
  }

  Inflate(points, offset, isClosed) {
    console.log("= S.PolyLineContainer: Input parameters:", points, offset, isClosed);

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
        const angleDifference = calculateAngleDifference(originalPoints, previousPointIndex, i, nextPointIndex);
        if (angleDifference < 0) {
          angleDifference += 360;
        }
        if (angleDifference >= 30 && angleDifference <= 330) {
          const intersection = { x: 0, y: 0 };
          if (GlobalData.optManager.GetIntersectPt(previousSegment[0], previousSegment[1], nextSegment[0], nextSegment[1], null, intersection)) {
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

    console.log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
    return inflatedPoints;
  }

  InflatePolyLine(points, offset, isClosed) {
    console.log("= S.PolyLineContainer: Input parameters:", points, offset, isClosed);
    let inflatedPoints = this.Inflate(points, -offset, isClosed);
    if (Utils2.IsPointInPoly(points, inflatedPoints[1])) {
      inflatedPoints = this.Inflate(points, offset, isClosed);
    }
    console.log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
    return inflatedPoints;
  }

  MovePolySeg(event, newX, newY, segmentIndex, hitResult) {
    console.log("= S.PolyLineContainer: Input parameters:", event, newX, newY, segmentIndex, hitResult);

    const adjusted = this.AdjustPolySeg(
      event,
      GlobalData.optManager.theActionStartX,
      GlobalData.optManager.theActionStartY,
      newX,
      newY,
      hitResult,
      false,
      2,
      1000
    );

    if (adjusted) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
      GlobalData.optManager.theActionStartX = newX;
      GlobalData.optManager.theActionStartY = newY;
    }

    console.log("= S.PolyLineContainer: Output adjusted:", adjusted);
  }

  AfterModifyShape(event, triggerType) {
    console.log("= S.PolyLineContainer: Input parameters:", event, triggerType);

    if (triggerType === ConstantData.ActionTriggerType.MOVEPOLYSEG) {
      const handleMovePolySeg = (segmentIndex) => {
        let segmentCount = 0;
        let firstSegmentIndex = -1;
        let segmentsModified = false;
        const lineThickness = this.StyleRecord.Line.Thickness;
        let moveAngle = GlobalData.optManager.theActionTriggerData.moveAngle;
        const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
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
            this.AdjustLineStart(null, newX, newY, ConstantData.ActionTriggerType.LINESTART);
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
            this.AdjustLineStart(null, newX, newY, ConstantData.ActionTriggerType.LINESTART);
          } else if (segmentIndex === totalPoints - 1) {
            const newX = polyPoints[segmentIndex].x;
            if (Utils2.IsEqual(polyPoints[1].x, newX, lineThickness) && Utils2.IsEqual(polyPoints[0].x, newX, lineThickness)) {
              this.polylist.segs.splice(0, 1);
              segmentsModified = true;
              const newX = this.polylist.segs[0].pt.x + this.StartPoint.x;
              const newY = this.polylist.segs[0].pt.y + this.StartPoint.y;
              this.polylist.segs[0].pt.x = 0;
              this.polylist.segs[0].pt.y = 0;
              this.AdjustLineStart(null, newX, newY, ConstantData.ActionTriggerType.LINESTART);
            }
          } else if (segmentIndex === 2 && Utils2.IsEqual(polyPoints[1].x, newX, lineThickness) && Utils2.IsEqual(polyPoints[0].x, newX, lineThickness)) {
            this.polylist.segs.splice(1, 1);
            segmentsModified = true;
          }
        }

        if (segmentsModified) {
          GlobalData.optManager.AddToDirtyList(this.BlockID);
        }
      };

      handleMovePolySeg(GlobalData.optManager.theActionTriggerData.hitSegment);
    }

    this.BaseLine_AfterModifyShape(event, triggerType);
    console.log("= S.PolyLineContainer: Output result:", true);
  }

  BaseLine_AfterModifyShape(event, triggerType) {
    console.log("= S.PolyLineContainer: Input parameters:", event, triggerType);

    if (GlobalData.optManager.theActionSVGObject) {
      const ellipseAxesElement = GlobalData.optManager.theActionSVGObject.GetElementByID(ConstantData.Defines.EllipseAxes);
      if (ellipseAxesElement != null) {
        GlobalData.optManager.theActionSVGObject.RemoveElement(ellipseAxesElement);
      }
    }

    if (GlobalData.optManager.ob.Frame) {
      GlobalData.optManager.MaintainLink(event, this, GlobalData.optManager.ob, triggerType);
      GlobalData.optManager.ob = {};
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    GlobalData.optManager.SetLinkFlag(event, ConstantData.LinkFlags.SED_L_MOVE);
    GlobalData.optManager.UpdateLinks();

    if (this.arcobj) {
      this.arcobj = null;
    }

    console.log("= S.PolyLineContainer: Output result:", true);
  }

  UpdateDimensionFromText(event, text, dimensionData) {
    console.log("= S.PolyLineContainer: Input parameters:", event, text, dimensionData);

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
    GlobalData.optManager.ob = originalState;
    GlobalData.optManager.GetObjectPtr(this.BlockID, true);
    GlobalData.optManager.ShowSVGSelectionState(this.BlockID, false);

    dimensionValue = this.GetDimensionValueFromString(text, segmentIndex);
    if (dimensionValue >= 0) {
      dimensionLength = this.GetDimensionLengthFromValue(dimensionValue);
    }

    if (dimensionLength <= 0 || dimensionValue < 0) {
      GlobalData.optManager.AddToDirtyList(this.BlockID);
      GlobalData.optManager.RenderDirtySVGObjects();
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

    polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
    rotatedPoints = isClosed && this instanceof PolyLineContainer
      ? GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, isClosed, this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior)
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
      if (!(this.Dimensions & ConstantData.DimensionFlags.SED_DF_AllSeg)) {
        originalDimensions = this.Dimensions;
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_AllSeg, true);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Total, false);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_EndPts, false);
      }

      super.UpdateDimensionFromText(event, text, dimensionData);

      if (originalDimensions > 0) {
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_AllSeg, originalDimensions & ConstantData.DimensionFlags.SED_DF_AllSeg);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Total, originalDimensions & ConstantData.DimensionFlags.SED_DF_Total);
        this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_EndPts, originalDimensions & ConstantData.DimensionFlags.SED_DF_EndPts);
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

    GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    for (let i = 0; i < this.hooks.length; i++) {
      GlobalData.optManager.SetLinkFlag(this.hooks[i].objid, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.ActionTriggerData = segmentIndex;
    GlobalData.optManager.MaintainLink(this.BlockID, this, originalState, ConstantData.ActionTriggerType.POLYLNODE);

    let polyRectInfo = { wdDim: -1, htDim: -1 };
    if (this.GetPolyRectangularInfo(polyRectInfo)) {
      if (segmentIndex === polyRectInfo.wdDim || segmentIndex === polyRectInfo.wdDim + 2) {
        this.rwd = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, true);
      } else if (segmentIndex === polyRectInfo.htDim || segmentIndex === polyRectInfo.htDim + 2) {
        this.rht = dimensionValue;
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, true);
      }
    } else {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    if (this.Frame.x < 0 || this.Frame.y < 0) {
      let frameAdjustment = { x: 0, y: 0 };
      if (this.Frame.x < 0) {
        frameAdjustment.x = -this.Frame.x;
        this.Frame.x += frameAdjustment.x;
      }
      if (this.Frame.y < 0) {
        frameAdjustment.y = -this.Frame.y;
        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always || this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select) {
          frameAdjustment.y += ConstantData.Defines.DimensionDefaultStandoff;
        }
        this.Frame.y += frameAdjustment.y;
      }
      this.StartPoint.x += frameAdjustment.x;
      this.StartPoint.y += frameAdjustment.y;
      this.EndPoint.x += frameAdjustment.x;
      this.EndPoint.y += frameAdjustment.y;
      GlobalData.optManager.SetObjectFrame(this.BlockID, this.Frame);
    }

    this.UpdateDrawing(event);
    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(event, this, this.Frame);
    }

    console.log("= S.PolyLineContainer: Output result:", true);
  }

  GetDimensionsForDisplay() {
    console.log("= S.PolyLineContainer: Getting dimensions for display");

    if (this.objecttype !== ConstantData.ObjectTypes.SD_OBJT_FLOORPLAN_WALL) {
      const dimensions = this.BaseLine_GetDimensions();
      console.log("= S.PolyLineContainer: Output dimensions:", dimensions);
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

    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  BaseLine_GetDimensions() {
    console.log("= S.PolyLineContainer: Getting base line dimensions");

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    let deltaY = this.EndPoint.y - this.StartPoint.y;
    let length = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    let dimensions = {
      x: length,
      y: 0
    };

    console.log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  CanSnapToShapes(shape) {
    console.log("= S.PolyLineContainer: Input shape:", shape);
    let result;
    if (shape && !this.polylist.closed) {
      shape.distanceonly = ConstantData.Guide_DistanceTypes.PolyWall;
      result = this.BlockID;
    } else {
      result = this.BlockID;
    }
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  IsSnapTarget() {
    console.log("= S.PolyLineContainer: Checking if it is a snap target");
    const result = false;
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  GuideDistanceOnly() {
    console.log("= S.PolyLineContainer: Checking guide distance type");
    const result = this.polylist.closed ? ConstantData.Guide_DistanceTypes.Room : ConstantData.Guide_DistanceTypes.PolyWall;
    console.log("= S.PolyLineContainer: Output guide distance type:", result);
    return result;
  }

  SetCursors() {
    console.log("= S.PolyLineContainer: Setting cursors");

    const element = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    const currentOperation = GlobalData.optManager.currentModalOperation;

    if ((currentOperation === ConstantData2.ModalOperations.SPLITWALL && this.polylist && this.polylist.segs.length >= 3) ||
      currentOperation === ConstantData2.ModalOperations.ADDCORNER) {
      const slopElement = element.GetElementByID(ConstantData.SVGElementClass.SLOP);
      if (slopElement) {
        slopElement.SetCursor(SDGraphics.Element.CursorType.CROSSHAIR);
      }
    } else {
      this.BaseShape_SetCursors();
    }

    console.log("= S.PolyLineContainer: Cursors set");
  }

  BaseShape_SetCursors() {
    console.log("= S.PolyLineContainer: Setting cursors");

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    const isOneClick = (this.TextFlags & ConstantData.TextFlags.SED_TF_OneClick) > 0;
    const editMode = GlobalData.optManager.GetEditMode();

    switch (editMode) {
      case ConstantData.EditState.DEFAULT:
        const activeTableID = GlobalData.optManager.Table_GetActiveID();
        const table = this.GetTable(false);

        if (table && (isOneClick || this.BlockID === activeTableID)) {
          GlobalData.optManager.Table_SetCursors(svgElement, this, table, false);
        } else {
          if (table) {
            GlobalData.optManager.Table_SetCursors(svgElement, this, table, true);
          }
          this.BaseDrawingObject_SetCursors();

          if (isOneClick) {
            const shapeElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
            if (shapeElement) {
              shapeElement.SetCursor(Element.CursorType.TEXT);
            }
            const slopElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
          }
        }
        break;

      case ConstantData.EditState.FORMATPAINT:
        const shapeElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElement) {
          shapeElement.SetCursor(Element.CursorType.PAINT);
        }
        const slopElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetCursor(Element.CursorType.PAINT);
        }
        break;

      default:
        this.BaseDrawingObject_SetCursors();
    }

    console.log("= S.PolyLineContainer: Cursors set");
  }

  BaseDrawingObject_SetCursors() {
    console.log("= S.PolyLineContainer: Setting cursors");

    const svgElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    let isTextElementActive = false;

    if (!(this.flags & ConstantData.ObjFlags.SEDO_Lock) && svgElement) {
      if (GlobalData.optManager.GetEditMode() === ConstantData.EditState.DEFAULT) {
        const shapeElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElement) {
          if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FRAME_CONTAINER) {
            shapeElement.SetCursor(Element.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(Element.CursorType.ADD);
          }
        }

        const iconTypes = [
          ConstantData.ShapeIconType.HYPERLINK,
          ConstantData.ShapeIconType.TRELLOLINK,
          ConstantData.ShapeIconType.NOTES,
          ConstantData.ShapeIconType.EXPANDEDVIEW,
          ConstantData.ShapeIconType.COMMENT,
          ConstantData.ShapeIconType.ATTACHMENT,
          ConstantData.ShapeIconType.FIELDDATA
        ];

        iconTypes.forEach(iconType => {
          const iconElement = svgElement.GetElementByID(iconType);
          if (iconElement) {
            iconElement.SetCursor(Element.CursorType.POINTER);
          }
        });

        const slopElement = svgElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) {
          slopElement.SetCursor(Element.CursorType.ADD);
        }

        const activeEditElement = GlobalData.optManager.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && svgElement.textElem) {
          if (svgElement.textElem === activeEditElement) {
            shapeElement.SetCursor(Element.CursorType.TEXT);
            svgElement.textElem.SetCursorState(ConstantData.CursorState.EDITLINK);
          } else {
            svgElement.textElem.SetCursorState(ConstantData.CursorState.LINKONLY);
          }
        }

        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
          (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select && this.IsSelected())) {
          const dimensionTextElements = svgElement.GetElementListWithID(ConstantData.SVGElementClass.DIMENSIONTEXT);
          dimensionTextElements.forEach(dimensionTextElement => {
            dimensionTextElement.SetCursorState(ConstantData.CursorState.EDITONLY);
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

    console.log("= S.PolyLineContainer: Cursors set");
  }

  GetListOfEnclosedObjects(includeHooks: boolean, includeSelf: boolean) {
    console.log("= S.PolyLineContainer: Input parameters:", includeHooks, includeSelf);

    const visibleZList = GlobalData.optManager.ActiveVisibleZList();
    const enclosedObjects: number[] = [];

    if (!this.polylist.closed) {
      console.log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
      return enclosedObjects;
    }

    this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, true, null);

    for (let i = 0; i < visibleZList.length; i++) {
      const obj = GlobalData.optManager.GetObjectPtr(visibleZList[i], false);
      if (this.BlockID !== obj.BlockID) {
        const isHooked = includeSelf && obj.hooks.length === 1 && obj.hooks[0].objid === this.BlockID;
        if ((!includeHooks && obj.hooks.length) || this.MostlyContains(obj) || isHooked) {
          enclosedObjects.push(obj.BlockID);
        }
      }
    }

    console.log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
    return enclosedObjects;
  }

  AfterRotateShape(event) {
    console.log("= S.PolyLineContainer: Input event:", event);

    const endRotation = GlobalData.optManager.theRotateEndRotation;
    this.RotateAllInContainer(event, endRotation);

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    GlobalData.optManager.AddToDirtyList(event);
    GlobalData.optManager.RenderDirtySVGObjects();

    console.log("= S.PolyLineContainer: Output result:", true);
  }

  RotateAllInContainer(event, rotationAngle) {
    console.log("= S.PolyLineContainer: Input parameters:", event, rotationAngle);

    GlobalData.optManager.ActiveVisibleZList();
    let enclosedObjects = [];
    GlobalData.objectStore.PreserveBlock(GlobalData.optManager.theSelectedListBlockID);
    let selectedObject = GlobalData.objectStore.GetObject(GlobalData.optManager.theSelectedListBlockID);
    let selectedData = selectedObject.Data;
    let originalData = Utils1.DeepCopy(selectedData);

    GlobalData.optManager.ClearSelectionClick();
    enclosedObjects = this.GetListOfEnclosedObjects(false, true);
    enclosedObjects.push(this.BlockID);

    if (enclosedObjects.length <= 1) {
      let startRotation = GlobalData.optManager.theRotateStartRotation;
      let endRotation = GlobalData.optManager.theRotateEndRotation;

      GlobalData.optManager.ob = Utils1.DeepCopy(this);
      GlobalData.optManager.theRotateStartRotation = 0;
      GlobalData.optManager.theRotateEndRotation = rotationAngle;
      GlobalData.optManager.theRotateStartPoint.x = this.RotateKnobPt.x;
      GlobalData.optManager.theRotateStartPoint.y = this.RotateKnobPt.y;
      GlobalData.optManager.theRotatePivotX = this.Frame.x + this.Frame.width / 2;
      GlobalData.optManager.theRotatePivotY = this.Frame.y + this.Frame.height / 2;

      super.AfterRotateShape(event);

      GlobalData.optManager.theRotateStartRotation = startRotation;
      GlobalData.optManager.theRotateEndRotation = endRotation;
      GlobalData.optManager.SelectObjects(enclosedObjects, false, false);
      GlobalData.optManager.ob = {};

      console.log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
      return enclosedObjects;
    }

    GlobalData.optManager.SelectObjects(enclosedObjects, false, false);
    let groupID = GlobalData.optManager.GroupSelectedShapes(true, null, false, false, false);
    selectedData = GlobalData.objectStore.GetObject(GlobalData.optManager.theSelectedListBlockID).Data;

    let groupObject = GlobalData.optManager.GetObjectPtr(groupID, true);
    GlobalData.optManager.svgObjectLayer.GetElementByID(groupObject.BlockID).SetRotation(rotationAngle);
    groupObject.RotationAngle = rotationAngle;
    GlobalData.optManager.UngroupShape(groupID, true);

    let lastObjectID = enclosedObjects.pop();
    GlobalData.optManager.SelectObjects(originalData, false, false);
    let lastObject = GlobalData.optManager.GetObjectPtr(lastObjectID, false);
    lastObject.UpdateFrame();

    if (lastObject && (lastObject.r.x < 0 || lastObject.r.y < 0)) {
      GlobalData.optManager.Undo();
      Collab.UnLockMessages();
      Collab.UnBlockMessages();
    }

    console.log("= S.PolyLineContainer: Output enclosedObjects:", enclosedObjects);
    return enclosedObjects;
  }

  GetPointsForAreaDimension() {
    console.log("= S.PolyLineContainer: Getting points for area dimension");

    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, false, false, null);
    const result = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior
      ? GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, true)
      : GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, false);

    console.log("= S.PolyLineContainer: Output points for area dimension:", result);
    return result;
  }

  GetDimensionPoints() {
    console.log("= S.PolyLineContainer: Getting dimension points");

    let dimensionPoints = [];
    let polyPoints = [];
    let totalLength = 0;
    let deltaX = 0;
    let deltaY = 0;
    let center = { x: this.Frame.width / 2, y: this.Frame.height / 2 };
    let startPoint = {};
    let endPoint = {};

    if (!this.polylist.closed && this.Dimensions & ConstantData.DimensionFlags.SED_DF_EndPts) {
      dimensionPoints.push(new Point(this.StartPoint.x - this.Frame.x, this.StartPoint.y - this.Frame.y));
      dimensionPoints.push(new Point(this.EndPoint.x - this.Frame.x, this.EndPoint.y - this.Frame.y));
    } else if (!this.polylist.closed && this.Dimensions & ConstantData.DimensionFlags.SED_DF_Total) {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
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
      const angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(new Point(0, 0), new Point(this.Frame.width, this.Frame.height));
      Utils3.RotatePointsAboutPoint(center, angle, dimensionPoints);
    } else {
      polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);
      dimensionPoints = this.polylist.closed
        ? GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.BThick, this.polylist.closed, this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior)
        : Utils1.DeepCopy(polyPoints);
    }

    console.log("= S.PolyLineContainer: Output dimension points:", dimensionPoints);
    return dimensionPoints;
  }

  CustomSnap(offsetX, offsetY, deltaX, deltaY, snapPoint, hitPoint) {
    console.log("= S.PolyLineContainer: Input parameters:", offsetX, offsetY, deltaX, deltaY, snapPoint, hitPoint);

    let closestX = 32768, closestY = 32768, snapX = 32768, snapY = 32768, hitSegment = -1;
    const zList = GlobalData.optManager.ZList();
    const polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, null);

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
        if (GlobalData.optManager.theMoveList && GlobalData.optManager.theMoveList.includes(zList[i])) {
          continue;
        }

        const obj = GlobalData.optManager.GetObjectPtr(zList[i], false);
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
            const objPolyPoints = obj.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, null);
            const angle1 = Utils1.CalcAngleFromPoints(polyPoints[j - 1], polyPoints[j]);
            const angle2 = Utils1.CalcAngleFromPoints(objPolyPoints[segmentIndex - 1], objPolyPoints[segmentIndex]);
            const angleDiff = 90 - angle1 + angle2;

            if (Math.abs(90 - angleDiff) <= 1 || Math.abs(270 - angleDiff) <= 1) {
              const snapPointCopy = { x: point.x, y: point.y };
              obj.SnapPointToSegment(segmentIndex, snapPointCopy);

              const deltaX = snapPointCopy.x - point.x;
              const deltaY = snapPointCopy.y - point.y;
              const angle = GlobalData.optManager.SD_GetCounterClockwiseAngleBetween2Points(polyPoints[j - 1], polyPoints[j]);
              const angleInDegrees = (angle / (2 * Math.PI)) * 360;

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
      console.log("= S.PolyLineContainer: Output result:", true);
      return true;
    }

    console.log("= S.PolyLineContainer: Output result:", false);
    return false;
  }

  CanUseRFlags() {
    console.log("= S.PolyLineContainer: Checking if RFlags can be used");
    const result = this.GetPolyRectangularInfo(null);
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  SetSize(width, height, aspectRatio) {
    console.log("= S.PolyLineContainer: Input parameters:", width, height, aspectRatio);

    if (width !== null) {
      if (height === null && Math.abs(width - this.Frame.width) === 1) {
        return true;
      }
    } else if (height !== null && width === null && Math.abs(height - this.Frame.height) === 1) {
      return true;
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    const result = super.SetSize(width, height, aspectRatio);
    console.log("= S.PolyLineContainer: Output result:", result);
    return result;
  }

  AdjustDimensionLength(dimensionLength) {
    console.log("= S.PolyLineContainer: Input dimensionLength:", dimensionLength);
    let adjustedLength = dimensionLength;

    if (this.polylist && this.polylist.closed && this.GetPolyRectangularInfo(null) !== null) {
      const thicknessAdjustment = this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior
        ? -this.StyleRecord.Line.Thickness
        : this.StyleRecord.Line.Thickness;

      if (dimensionLength !== null) {
        adjustedLength += thicknessAdjustment;
      }
    }

    console.log("= S.PolyLineContainer: Output adjustedLength:", adjustedLength);
    return adjustedLength;
  }

  GetDimensionsForDisplay() {
    console.log("= S.PolyLineContainer: Getting dimensions for display");

    const dimensions = {
      width: this.Frame.width,
      height: this.Frame.height,
      x: this.Frame.x,
      y: this.Frame.y
    };

    if (this.polylist && this.polylist.closed) {
      if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior) {
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

    console.log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  GetSnapRect() {
    console.log("= S.PolyLineContainer: Getting snap rect");
    const dimensions = this.GetDimensionsForDisplay();
    console.log("= S.PolyLineContainer: Output dimensions:", dimensions);
    return dimensions;
  }

  GetDragR() {
    console.log("= S.PolyLineContainer: Getting drag rectangle");

    const dragRectangle = {};
    Utils2.CopyRect(dragRectangle, this.r);

    if (this.polylist && this.polylist.closed && this.StyleRecord && this.StyleRecord.Line) {
      const lineThickness = this.StyleRecord.Line.BThick;
      Utils2.InflateRect(dragRectangle, 2 * lineThickness, 2 * lineThickness);
    }

    console.log("= S.PolyLineContainer: Output drag rectangle:", dragRectangle);
    return dragRectangle;
  }

  SetShapeOrigin(x: number, y: number, width: number, height: number) {
    console.log("= S.PolyLineContainer: Input parameters:", x, y, width, height);

    let frame = this.GetSVGFrame();
    let offsetX = 0;
    let offsetY = 0;

    if (this.polylist && this.polylist.closed && height) {
      if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior) {
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

    console.log("= S.PolyLineContainer: Output frame:", frame);
  }

  MaintainDimensionThroughPolygonOpennessChange(isClosed: boolean) {
    console.log("= S.PolyLineContainer: Input isClosed:", isClosed);

    let polyPoints = this.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false);
    let isExterior = false;

    if (isClosed) {
      this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_Total | ConstantData.DimensionFlags.SED_DF_EndPts, false);
      this.Dimensions = Utils2.SetFlag(this.Dimensions, ConstantData.DimensionFlags.SED_DF_AllSeg, true);
    }

    isExterior = isClosed ? !(this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior) : this.Dimensions & ConstantData.DimensionFlags.SED_DF_Exterior;

    let inflatedPoints = GlobalData.optManager.InflateLine(polyPoints, this.StyleRecord.Line.Thickness / 2, true, isExterior);

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

    console.log("= S.PolyLineContainer: Output inflatedPoints:", inflatedPoints);
  }

  ChangeLineThickness(newThickness) {
    console.log("= S.PolyLineContainer: Input newThickness:", newThickness);

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

      points = polyLine.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, segmentIndices);
      if (segmentIndices.length > 0) {
        originalPoints.push(new Point(points[0].x, points[0].y));
        for (temp = 0; temp < segmentIndices.length; temp++) {
          originalPoints.push(new Point(points[segmentIndices[temp]].x, points[segmentIndices[temp]].y));
        }
      } else {
        originalPoints = Utils1.DeepCopy(points);
      }

      points = GlobalData.optManager.InflateLine(originalPoints, Math.abs(offset), true, offset >= 0);
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
    console.log("= S.PolyLineContainer: Output updated thickness:", newThickness);
  }

  ChangeLineThickness(newThickness) {
    console.log("= S.PolyLineContainer: Input newThickness:", newThickness);

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

      points = polyLine.GetPolyPoints(ConstantData.Defines.NPOLYPTS, false, true, false, segmentIndices);
      if (segmentIndices.length > 0) {
        originalPoints.push(new Point(points[0].x, points[0].y));
        for (temp = 0; temp < segmentIndices.length; temp++) {
          originalPoints.push(new Point(points[segmentIndices[temp]].x, points[segmentIndices[temp]].y));
        }
      } else {
        originalPoints = Utils1.DeepCopy(points);
      }

      points = GlobalData.optManager.InflateLine(originalPoints, Math.abs(offset), true, offset >= 0);
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
    console.log("= S.PolyLineContainer: Output updated thickness:", newThickness);
  }
}

export default PolyLineContainer
