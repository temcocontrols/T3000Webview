

import BaseLine from './S.BaseLine'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import T3Gv from '../Data/T3Gv';
import Point from '../Model/Point'
import NvConstant from '../Data/Constant/NvConstant'
import SelectionAttr from '../Model/SelectionAttr'
import Instance from '../Data/Instance/Instance';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import DataUtil from '../Opt/Data/DataUtil';
import UIUtil from '../Opt/UI/UIUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';
import DrawUtil from '../Opt/Opt/DrawUtil';
import PolyUtil from '../Opt/Opt/PolyUtil';
import HookUtil from '../Opt/Opt/HookUtil';

/**
 * Represents a line shape in the T3000 HVAC drawing system.
 * Extends BaseLine to provide specialized line drawing functionality.
 *
 * The Line class supports various line styles, arrows, and measurements, and can be
 * displayed with different visual properties like thickness, color, and pattern.
 * It handles rendering as SVG, user interaction, dimension annotations, and line manipulations
 * such as adding corners, flipping, and precise positioning.
 *
 * @extends BaseLine
 * @example
 * ```typescript
 * // Create a basic line from (100, 100) to (300, 200)
 * const lineParams = {
 *   StartPoint: { x: 100, y: 100 },
 *   EndPoint: { x: 300, y: 200 },
 *   StyleRecord: {
 *     Line: {
 *       Paint: { Color: '#FF0000', Opacity: 1 },
 *       Thickness: 2,
 *       LinePattern: 0
 *     }
 *   }
 * };
 *
 * // Instantiate the line
 * const myLine = new Line(lineParams);
 *
 * // Add the line to the SVG container
 * const svgContainer = T3Gv.opt.svgObjectLayer;
 * const lineShape = myLine.CreateShape(svgContainer, false);
 *
 * // Adjust line end point
 * myLine.AdjustLineEnd(lineShape, 400, 250);
 *
 * // Add a corner to convert to polyline
 * myLine.AddCorner(null, { x: 350, y: 100 });
 * ```
 */
class Line extends BaseLine {

  public StartPoint: Point;
  public EndPoint: Point;
  public FixedPoint: number[];
  public LineOrientation: number;
  public hoplist: any;
  public ArrowheadData: any[];
  public ShortRef: number;
  public shapeparam: number;
  public StartArrowID: number;
  public EndArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;
  public TextDirection: boolean;

  constructor(lineParam: any = {}) {

    lineParam = lineParam || {};
    lineParam.LineType = OptConstant.LineType.LINE;

    super(lineParam);

    this.StartPoint = lineParam.StartPoint || { x: 0, y: 0 };
    this.EndPoint = lineParam.EndPoint || { x: 0, y: 0 };
    this.FixedPoint = lineParam.FixedPoint || [0, 0];
    this.LineOrientation = lineParam.LineOrientation || OptConstant.LineOrientation.None;
    this.hoplist = lineParam.hoplist || { nhops: 0, hops: [] };
    this.ArrowheadData = lineParam.ArrowheadData || [];
    this.ShortRef = lineParam.ShortRef || 0;
    this.shapeparam = lineParam.shapeparam || 0;
    this.StartArrowID = lineParam.StartArrowID || 0;
    this.EndArrowID = lineParam.EndArrowID || 0;
    this.StartArrowDisp = lineParam.StartArrowDisp || false;
    this.EndArrowDisp = lineParam.EndArrowDisp || false;
    this.ArrowSizeIndex = lineParam.ArrowSizeIndex || 0;
    this.TextDirection = lineParam.TextDirection || false;

    this.CalcFrame();
  }

  GetLineShapePolyPoints(numPoints: number, adjustForFrame: boolean) {
    T3Util.Log('S.Line - Input:', { numPoints, adjustForFrame });

    let points: Point[] = [];
    let shapeParam = this.shapeparam;
    let shortRef = this.ShortRef;

    if (shapeParam < 0.01) {
      shortRef = 0;
    }

    let deltaX = this.EndPoint.x - this.StartPoint.x;
    let deltaY = this.EndPoint.y - this.StartPoint.y;
    let isDoubleArrow = false;

    switch (shortRef) {
      case 0:
      case OptConstant.LineTypes.LsMeasuringTape:
        points.push(new Point(this.StartPoint.x, this.StartPoint.y));
        points.push(new Point(this.EndPoint.x, this.EndPoint.y));
        break;
      case 1:
      case 2:
        if (shortRef === 2) {
          isDoubleArrow = true;
        }

        let length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        if (length === 0) break;

        let sinTheta = deltaY / length;
        let cosTheta = deltaX / length;
        let arrowLength = length > 200 ? 200 : length;
        let arrowHeadLength = shapeParam * arrowLength / 2;
        let segmentLength = (length - 2 * arrowHeadLength) / 2;

        let startPoint = new Point(this.StartPoint.x, this.StartPoint.y);
        points.push(startPoint);

        let firstSegmentEnd = new Point(
          this.StartPoint.x + segmentLength * cosTheta,
          this.StartPoint.y + segmentLength * sinTheta
        );
        points.push(firstSegmentEnd);

        let arrowHeadBase = new Point(
          firstSegmentEnd.x + arrowHeadLength * sinTheta,
          firstSegmentEnd.y - arrowHeadLength * cosTheta
        );

        if (isDoubleArrow) {
          points.push(arrowHeadBase);
          let arrowHeadTip = new Point(
            arrowHeadBase.x + arrowHeadLength * cosTheta,
            arrowHeadBase.y + arrowHeadLength * sinTheta
          );
          points.push(arrowHeadTip);

          let secondArrowHeadBase = new Point(
            arrowHeadTip.x - 2 * arrowHeadLength * sinTheta,
            arrowHeadTip.y + 2 * arrowHeadLength * cosTheta
          );
          points.push(secondArrowHeadBase);

          let secondSegmentEnd = new Point(
            secondArrowHeadBase.x + arrowHeadLength * cosTheta,
            secondArrowHeadBase.y + arrowHeadLength * sinTheta
          );
          points.push(secondSegmentEnd);

          let endPoint = new Point(this.EndPoint.x, this.EndPoint.y);
          points.push(endPoint);
        } else {
          let arrowHeadTip = new Point(
            arrowHeadBase.x + arrowHeadLength * cosTheta - arrowHeadLength * cosTheta / 2,
            arrowHeadBase.y + arrowHeadLength * sinTheta - arrowHeadLength * sinTheta / 2
          );
          points.push(arrowHeadTip);

          let secondArrowHeadBase = new Point(
            arrowHeadTip.x - 2 * arrowHeadLength * sinTheta + 2 * arrowHeadLength * cosTheta / 2,
            arrowHeadTip.y + 2 * arrowHeadLength * cosTheta + 2 * arrowHeadLength * sinTheta / 2
          );
          points.push(secondArrowHeadBase);

          let secondSegmentEnd = new Point(
            secondArrowHeadBase.x + arrowHeadLength * cosTheta,
            secondArrowHeadBase.y + arrowHeadLength * sinTheta
          );
          points.push(secondSegmentEnd);

          let endPoint = new Point(this.EndPoint.x, this.EndPoint.y);
          points.push(endPoint);
        }
        break;
    }

    if (adjustForFrame) {
      for (let i = 0; i < points.length; i++) {
        points[i].x -= this.Frame.x;
        points[i].y -= this.Frame.y;
      }
    }

    T3Util.Log('S.Line - Output:', points);
    return points;
  }

  CreateShape(svgContainer, isHidden) {
    T3Util.Log('S.Line - Input:', { svgContainer, isHidden });

    if (this.flags & NvConstant.ObjFlags.NotVisible) return null;

    let shapeContainer = svgContainer.CreateShape(OptConstant.CSType.ShapeContainer);
    let shapeElement = null;
    let shortRef = this.ShortRef;
    let lineColor = '#000000';
    let lineThickness = 1;
    let lineOpacity = 1;
    let linePattern = 0;

    if (this.shapeparam < 0.01) {
      shortRef = 0;
    }

    let isSimpleLine = (shortRef === 0 || shortRef == OptConstant.LineTypes.LsMeasuringTape) && this.hoplist.nhops === 0;

    shapeElement = isSimpleLine ? svgContainer.CreateShape(OptConstant.CSType.Line) : svgContainer.CreateShape(OptConstant.CSType.Polyline);
    shapeElement.SetID(OptConstant.SVGElementClass.Shape);

    let slopElement = isSimpleLine ? svgContainer.CreateShape(OptConstant.CSType.Line) : svgContainer.CreateShape(OptConstant.CSType.Polyline);
    slopElement.SetID(OptConstant.SVGElementClass.Slop);
    slopElement.ExcludeFromExport(true);

    this.CalcFrame();
    let frame = this.Frame;
    let styleRecord = this.StyleRecord;

    if (styleRecord == null) {
      let sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      if (sessionBlock) {
        styleRecord = sessionBlock.def.style;
      }
    }

    if (styleRecord) {
      lineColor = styleRecord.Line.Paint.Color;
      lineThickness = styleRecord.Line.Thickness;
      if (lineThickness > 0 && lineThickness < 1) {
        lineThickness = 1;
      }
      lineOpacity = styleRecord.Line.Paint.Opacity;
      linePattern = styleRecord.Line.LinePattern;
    }

    let frameWidth = frame.width;
    let frameHeight = frame.height;

    shapeContainer.SetSize(frameWidth, frameHeight);
    shapeContainer.SetPos(this.Frame.x, this.Frame.y);
    shapeElement.SetSize(frameWidth, frameHeight);

    let points = [];
    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      points = this.GetLineShapePolyPoints(OptConstant.Common.MaxPolyPoints, true);
      if (this.hoplist.nhops !== 0) {
        let hopResult = T3Gv.opt.InsertHops(this, points, points.length);
        points = points.slice(0, hopResult.npts);
      }
      shapeElement.SetPoints(points);
    }

    shapeElement.SetFillColor('none');
    shapeElement.SetStrokeColor(lineColor);
    shapeElement.SetStrokeOpacity(lineOpacity);
    shapeElement.SetStrokeWidth(lineThickness);
    if (linePattern !== 0) {
      shapeElement.SetStrokePattern(linePattern);
    }

    slopElement.SetSize(frameWidth, frameHeight);
    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      slopElement.SetPoints(points);
    }

    slopElement.SetStrokeColor('white');
    slopElement.SetFillColor('none');
    slopElement.SetOpacity(0);
    if (isHidden) {
      slopElement.SetEventBehavior(OptConstant.EventBehavior.HiddenOut);
    } else {
      slopElement.SetEventBehavior(OptConstant.EventBehavior.None);
    }
    slopElement.SetStrokeWidth(lineThickness + OptConstant.Common.Slop);

    shapeContainer.AddElement(shapeElement);
    shapeContainer.AddElement(slopElement);

    this.ApplyStyles(shapeElement, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);

    shapeContainer.isShape = true;
    this.AddIcons(svgContainer, shapeContainer);

    T3Util.Log('S.Line - Output:', shapeContainer);
    return shapeContainer;
  }

  SetCursors() {
    T3Util.Log('S.Line - Input:', { crtOpt: T3Gv.opt.crtOpt });

    let shapeElement;
    const shapeContainer = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    if (T3Gv.opt.crtOpt === OptConstant.OptTypes.AddCorner) {
      shapeElement = shapeContainer.GetElementById(OptConstant.SVGElementClass.Slop);
      if (shapeElement) {
        shapeElement.SetCursor(CursorConstant.CursorType.CROSSHAIR);
      }
    } else {
      this.BaseDrawingObjectSetCursors();
    }

    T3Util.Log('S.Line - Output:', { shapeElement });
  }

  BaseDrawingObjectSetCursors() {
    T3Util.Log('S.Line - Input:', { BlockID: this.BlockID, flags: this.flags });

    const shapeContainer = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    let isDimensionTextActive = false;

    if (!(this.flags & NvConstant.ObjFlags.Lock) && shapeContainer) {
      if (OptCMUtil.GetEditMode() === NvConstant.EditState.Default) {
        const shapeElement = shapeContainer.GetElementById(OptConstant.SVGElementClass.Shape);
        if (shapeElement) {
          if (this.objecttype === NvConstant.FNObjectTypes.FrameContainer) {
            shapeElement.SetCursor(CursorConstant.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(CursorConstant.CursorType.ADD);
          }
        }

        const hyperlinkIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.HyperLink);
        if (hyperlinkIcon) hyperlinkIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const notesIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.Notes);
        if (notesIcon) notesIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const expandedViewIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.ExpandedView);
        if (expandedViewIcon) expandedViewIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const commentIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.Comment);
        if (commentIcon) commentIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const attachmentIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.Attachment);
        if (attachmentIcon) attachmentIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const fieldDataIcon = shapeContainer.GetElementById(OptConstant.ShapeIconType.FieldData);
        if (fieldDataIcon) fieldDataIcon.SetCursor(CursorConstant.CursorType.POINTER);

        const slopElement = shapeContainer.GetElementById(OptConstant.SVGElementClass.Slop);
        if (slopElement) slopElement.SetCursor(CursorConstant.CursorType.ADD);

        const activeEditElement = T3Gv.opt.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && shapeContainer.textElem) {
          if (shapeContainer.textElem === activeEditElement) {
            shapeElement.SetCursor(CursorConstant.CursorType.TEXT);
            shapeContainer.textElem.SetCursorState(CursorConstant.CursorState.EditLink);
          } else {
            shapeContainer.textElem.SetCursorState(CursorConstant.CursorState.LinkOnly);
          }
        }

        if (this.Dimensions & NvConstant.DimensionFlags.Always ||
          (this.Dimensions & NvConstant.DimensionFlags.Select && this.IsSelected())) {
          const dimensionTextElements = shapeContainer.GetElementListWithId(OptConstant.SVGElementClass.DimText);
          for (let i = 0; i < dimensionTextElements.length; i++) {
            dimensionTextElements[i].SetCursorState(CursorConstant.CursorState.EditOnly);
            if (dimensionTextElements[i] === activeEditElement) {
              isDimensionTextActive = true;
            }
          }
          if (isDimensionTextActive) {
            shapeElement.SetCursor(null);
            if (slopElement) slopElement.SetCursor(null);
          }
        }
      } else {
        this.ClearCursors();
      }
    }

    T3Util.Log('S.Line - Output:', { shapeContainer, isDimensionTextActive });
  }

  AdjustLineStart(svgContainer, startX, startY, endX, endY, enforceMinimum) {
    T3Util.Log('S.Line - Input:', { svgContainer, startX, startY, endX, endY, enforceMinimum });

    let points = [];
    let shapeElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Shape);
    let slopElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Slop);

    this.StartPoint.x = startX;
    this.StartPoint.y = startY;

    if (!enforceMinimum) {
      this.EnforceMinimum(true);
    }

    let adjustForLineAngleSnap = false;
    if (T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0) {
      adjustForLineAngleSnap = true;
    }

    if (endY) {
      adjustForLineAngleSnap = true;
    }

    if (!adjustForLineAngleSnap) {
      this.AdjustForLineAngleSnap(this.EndPoint, this.StartPoint);
    }

    this.CalcFrame();
    svgContainer.SetSize(this.Frame.width, this.Frame.height);
    svgContainer.SetPos(this.Frame.x, this.Frame.y);
    shapeElement.SetSize(this.Frame.width, this.Frame.height);

    let polyPoints = [];
    let isSimpleLine = (this.ShortRef === 0 || this.ShortRef == OptConstant.LineTypes.LsMeasuringTape) && this.hoplist.nhops === 0;

    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      polyPoints = this.GetLineShapePolyPoints(OptConstant.Common.MaxPolyPoints, true);
      shapeElement.SetPoints(polyPoints);
    }

    slopElement.SetSize(this.Frame.width, this.Frame.height);

    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      slopElement.SetPoints(polyPoints);
    }

    this.CalcFrame();

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    svgContainer.SetSize(this.Frame.width, this.Frame.height);
    svgContainer.SetPos(this.Frame.x, this.Frame.y);
    shapeElement.SetSize(this.Frame.width, this.Frame.height);

    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      polyPoints = this.GetLineShapePolyPoints(OptConstant.Common.MaxPolyPoints, true);
      shapeElement.SetPoints(polyPoints);
    }

    slopElement.SetSize(this.Frame.width, this.Frame.height);

    if (isSimpleLine) {
      slopElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      slopElement.SetPoints(polyPoints);
    }

    this.UpdateDimensionLines(svgContainer);
    this.UpdateCoordinateLines(svgContainer);

    new SelectionAttr();
    let rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
    points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

    let deltaX = points[0].x - points[1].x;
    let deltaY = points[0].y - points[1].y;
    Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    UIUtil.UpdateDisplayCoordinates(this.Frame, this.StartPoint, CursorConstant.CursorTypes.Grow, this);

    if (this.DataID !== -1) {
      this.LMResizeSVGTextObject(svgContainer, this, this.Frame);
    }

    T3Util.Log('S.Line - Output:', { shapeElement, slopElement, points });
  }

  AdjustLineEnd(svgContainer, newEndPointX, newEndPointY, unusedParam, forceAngleSnap) {
    T3Util.Log("S.Connector - Input:", { svgContainer, newEndPointX, newEndPointY, unusedParam, forceAngleSnap });

    let points = [];
    let shapeElement, slopElement;
    if (svgContainer) {
      shapeElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Shape);
      slopElement = svgContainer.GetElementById(OptConstant.SVGElementClass.Slop);
    }

    // Update endpoint and enforce minimum constraints
    this.EndPoint.x = newEndPointX;
    this.EndPoint.y = newEndPointY;
    this.EnforceMinimum(false);

    // Determine if line angle snap adjustment is needed
    const linkParamsExist = T3Gv.opt.linkParams && T3Gv.opt.linkParams.ConnectIndex >= 0;
    const adjustForSnap = forceAngleSnap || linkParamsExist;

    if (adjustForSnap) {
      this.AdjustForLineAngleSnap(this.StartPoint, this.EndPoint);
    }

    // Recalculate the bounding frame
    this.CalcFrame();

    if (svgContainer) {
      // Update container sizes and positions.
      svgContainer.SetSize(this.Frame.width, this.Frame.height);
      svgContainer.SetPos(this.Frame.x, this.Frame.y);
      shapeElement.SetSize(this.Frame.width, this.Frame.height);

      let polyPoints = [];
      const isSimpleLine =
        (this.ShortRef === 0 ||
          this.ShortRef === OptConstant.LineTypes.LsMeasuringTape) &&
        this.hoplist.nhops === 0;

      if (isSimpleLine) {
        shapeElement.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        polyPoints = this.GetLineShapePolyPoints(OptConstant.Common.MaxPolyPoints, true);
        shapeElement.SetPoints(polyPoints);
      }

      slopElement.SetSize(this.Frame.width, this.Frame.height);

      if (isSimpleLine) {
        slopElement.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        slopElement.SetPoints(polyPoints);
      }

      if (this.rflags) {
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
      }

      // Recalculate frame and update container again
      this.CalcFrame();
      svgContainer.SetSize(this.Frame.width, this.Frame.height);
      svgContainer.SetPos(this.Frame.x, this.Frame.y);
      shapeElement.SetSize(this.Frame.width, this.Frame.height);

      if (isSimpleLine) {
        shapeElement.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        polyPoints = this.GetLineShapePolyPoints(OptConstant.Common.MaxPolyPoints, true);
        shapeElement.SetPoints(polyPoints);
      }

      slopElement.SetSize(this.Frame.width, this.Frame.height);

      if (isSimpleLine) {
        slopElement.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        slopElement.SetPoints(polyPoints);
      }

      this.UpdateDimensionLines(svgContainer);
      this.UpdateCoordinateLines(svgContainer);

      new SelectionAttr();
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
      points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

      const deltaX = points[0].x - points[1].x;
      const deltaY = points[0].y - points[1].y;
      const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
      const deepCopiedEndPoint = Utils1.DeepCopy(this.EndPoint);

      UIUtil.UpdateDisplayCoordinates(this.Frame, deepCopiedEndPoint, CursorConstant.CursorTypes.Grow, this);

      if (
        (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) &&
        (deepCopiedEndPoint.x !== this.EndPoint.x || deepCopiedEndPoint.y !== this.EndPoint.y)
      ) {
        const error = new Error("bounds error");
        error.name = "1";
        throw error;
      }

      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(svgContainer, this, this.Frame);
      }
    }

    T3Util.Log("S.Connector - Output:", {
      shapeElement: svgContainer ? svgContainer.GetElementById(OptConstant.SVGElementClass.Shape) : null,
      slopElement: svgContainer ? svgContainer.GetElementById(OptConstant.SVGElementClass.Slop) : null
    });
  }

  Flip(flipFlags: number) {
    T3Util.Log('S.Line - Input:', { flipFlags });

    let temp;
    let swapped = false;

    if (T3Gv.opt.ob = Utils1.DeepCopy(this), flipFlags & OptConstant.ExtraFlags.FlipVert) {
      temp = this.StartPoint.y;
      this.StartPoint.y = this.EndPoint.y;
      this.EndPoint.y = temp;
      swapped = true;
    }

    if (flipFlags & OptConstant.ExtraFlags.FlipHoriz) {
      temp = this.StartPoint.x;
      this.StartPoint.x = this.EndPoint.x;
      this.EndPoint.x = temp;
      swapped = true;
    }

    if (swapped) {
      const shapeElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      this.UpdateDimensionLines(shapeElement);

      if (this.DataID !== -1) {
        this.LMResizeSVGTextObject(shapeElement, this, this.Frame);
      }

      if (T3Gv.opt.ob.Frame) {
        HookUtil.MaintainLink(
          this.BlockID,
          this,
          T3Gv.opt.ob,
          OptConstant.ActionTriggerType.Rotate
        );
      }

      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE);
    }

    T3Gv.opt.ob = {};
    T3Util.Log('S.Line - Output:', { swapped });
  }

  AddCorner(event, point) {
    T3Util.Log('S.Line - Input:', { event, point });

    let angle, rotatedPoints, newPoints = [], tempPoints = [], isStartPoint = false;
    T3Gv.opt.ob = Utils1.DeepCopy(this);

    newPoints = [
      { x: this.StartPoint.x, y: this.StartPoint.y },
      { x: this.EndPoint.x, y: this.EndPoint.y }
    ];
    newPoints.push(new Point(point.x, point.y));

    angle = 360 - Utils1.CalcAngleFromPoints(newPoints[0], newPoints[1]);
    if (angle >= 360) angle -= 360;

    const radians = 2 * Math.PI * (angle / 360);
    Utils3.RotatePointsAboutCenter(this.Frame, -radians, newPoints);

    if (Math.abs(newPoints[1].y - newPoints[2].y) <= this.StyleRecord.Line.Thickness) {
      // if (Collab.AllowMessage()) {
      //   Collab.BeginSecondaryEdit();
      //   const message = { BlockID: this.BlockID, point: { x: point.x, y: point.y } };
      // }

      newPoints[2].y = newPoints[0].y;
      if (Math.abs(newPoints[1].x - newPoints[2].x) > Math.abs(newPoints[0].x - newPoints[2].x)) {
        isStartPoint = true;
      }

      const offset = angle >= 0 && angle <= 180 ? 50 : -50;
      newPoints.push(new Point(newPoints[2].x, newPoints[2].y + offset));
      Utils3.RotatePointsAboutCenter(this.Frame, radians, newPoints);

      tempPoints.push(new Point(newPoints[2].x, newPoints[2].y));
      tempPoints.push(new Point(newPoints[3].x, newPoints[3].y));

      if (isStartPoint) {
        this.StartPoint.x = tempPoints[0].x;
        this.StartPoint.y = tempPoints[0].y;
      } else {
        this.EndPoint.x = tempPoints[0].x;
        this.EndPoint.y = tempPoints[0].y;
      }

      this.CalcFrame();
      HookUtil.MaintainLink(this.BlockID, this, T3Gv.opt.ob, OptConstant.ActionTriggerType.ModifyShape);
      OptCMUtil.SetLinkFlag(this.BlockID, DSConstant.LinkFlags.SED_L_MOVE | DSConstant.LinkFlags.SED_L_CHANGE);
      T3Gv.opt.UpdateLinks();

      const newLineData = {
        StartPoint: { x: tempPoints[0].x, y: tempPoints[0].y },
        EndPoint: { x: tempPoints[1].x, y: tempPoints[1].y },
        Dimensions: this.Dimensions,
        TextFlags: this.TextFlags,
        objecttype: this.objecttype,
        StyleRecord: Utils1.DeepCopy(this.StyleRecord)
      };

      const newLine = new Instance.Shape.Line(newLineData);
      const newBlockID = DrawUtil.AddNewObject(newLine, false, true);
      const joinID = isStartPoint
        ? PolyUtil.PolyLJoin(newBlockID, OptConstant.HookPts.KTL, this.BlockID, OptConstant.HookPts.KTL, false)
        : PolyUtil.PolyLJoin(newBlockID, OptConstant.HookPts.KTL, this.BlockID, OptConstant.HookPts.KTR, false);

      const joinedObject = DataUtil.GetObjectPtr(joinID, false);
      const joinedElement = T3Gv.opt.svgObjectLayer.GetElementById(joinID);

      let dimensionText = Number(T3Gv.docUtil.rulerConfig.majorScale).toString();
      switch (T3Gv.docUtil.rulerConfig.units) {
        case NvConstant.RulerUnit.Feet:
          if (this.Dimensions & NvConstant.DimensionFlags.ShowFeetAsInches) {
            dimensionText = `${12 * T3Gv.docUtil.rulerConfig.majorScale}"`;
          } else {
            dimensionText += "'";
          }
          break;
        case NvConstant.RulerUnit.Inches:
          dimensionText += '"';
          break;
      }

      joinedObject.UpdateDimensionFromText(joinedElement, dimensionText, { segment: 2 });
      DataUtil.AddToDirtyList(this.BlockID);

      // Collab.ClearCreateList();
      // Collab.AddToCreateList(joinID);

      // if (Collab.AllowMessage()) {
      //   if (Collab.IsSecondary() && Collab.CreateList.length) {
      //     message.CreateList = [joinID];
      //   }
      //   Collab.BuildMessage(NvConstant.CollabMessages.AddCorner, message, false);
      // }

      DrawUtil.CompleteOperation(null);
    }

    T3Util.Log('S.Line - Output:', { newPoints, tempPoints, isStartPoint });
  }

  UseEdges(enableX: boolean, enableY: boolean, alignX: boolean, alignY: boolean, startPoint: Point, endPoint: Point) {
    T3Util.Log('S.Line - Input:', { enableX, enableY, alignX, alignY, startPoint, endPoint });

    let offsetX = 0, offsetY = 0, newWidth = 0, newHeight = 0, deltaX = 0, deltaY = 0;
    let shouldAdjust = false;

    if (startPoint.x !== endPoint.x) {
      if (enableX && alignX) {
        if (Utils2.IsEqual(this.StartPoint.y, this.EndPoint.y)) {
          offsetX = endPoint.x - startPoint.x;
          shouldAdjust = true;
        }
      } else {
        const centerX = this.Frame.x + this.Frame.width / 2;
        if (Math.abs(centerX - startPoint.x / 2) < 100) {
          deltaX = (endPoint.x - startPoint.x) / 2;
          shouldAdjust = true;
        } else if (this.Frame.x > startPoint.x / 2) {
          deltaX = endPoint.x - startPoint.x;
          shouldAdjust = true;
        }
      }
    }

    if (startPoint.y !== endPoint.y) {
      if (enableY && alignY) {
        if (Utils2.IsEqual(this.StartPoint.x, this.EndPoint.x)) {
          offsetY = endPoint.y - startPoint.y;
          shouldAdjust = true;
        }
      } else {
        const centerY = this.Frame.y + this.Frame.height / 2;
        if (Math.abs(centerY - startPoint.y / 2) < 100) {
          deltaY = (endPoint.y - startPoint.y) / 2;
          shouldAdjust = true;
        } else if (this.Frame.y > startPoint.y / 2) {
          deltaY = endPoint.y - startPoint.y;
          shouldAdjust = true;
        }
      }
    }

    if (shouldAdjust) {
      DataUtil.GetObjectPtr(this.BlockID, true);
      if (deltaX || deltaY) {
        this.OffsetShape(deltaX, deltaY);
      }
      if (offsetX || offsetY) {
        if (offsetX) newWidth = this.Frame.width + offsetX;
        if (offsetY) newHeight = this.Frame.height + offsetY;
        this.SetSize(newWidth, newHeight, 0);
      }
      DataUtil.AddToDirtyList(this.BlockID);
    }

    T3Util.Log('S.Line - Output:', { offsetX, offsetY, newWidth, newHeight, deltaX, deltaY, shouldAdjust });
    return shouldAdjust;
  }
}

export default Line;
