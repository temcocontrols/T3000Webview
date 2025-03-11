

import BaseLine from './Shape.BaseLine'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/T3Gv';
import Point from '../Model/Point'
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element'
import ConstantData from '../Data/ConstantData'
import PolySeg from '../Model/PolySeg'
import SelectionAttributes from '../Model/SelectionAttributes'
import ConstantData2 from '../Data/ConstantData2'
import Instance from '../Data/Instance/Instance';

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
    lineParam.LineType = ConstantData.LineType.LINE;

    super(lineParam);

    this.StartPoint = lineParam.StartPoint || { x: 0, y: 0 };
    this.EndPoint = lineParam.EndPoint || { x: 0, y: 0 };
    this.FixedPoint = lineParam.FixedPoint || [0, 0];
    this.LineOrientation = lineParam.LineOrientation || ConstantData.LineOrientation.NONE;
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
    console.log('S.Line - Input:', { numPoints, adjustForFrame });

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
      case ConstantData2.LineTypes.SED_LS_MeasuringTape:
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

    console.log('S.Line - Output:', points);
    return points;
  }

  CreateShape(svgContainer, isHidden) {
    console.log('S.Line - Input:', { svgContainer, isHidden });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;

    let shapeContainer = svgContainer.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    let shapeElement = null;
    let shortRef = this.ShortRef;
    let lineColor = '#000000';
    let lineThickness = 1;
    let lineOpacity = 1;
    let linePattern = 0;

    if (this.shapeparam < 0.01) {
      shortRef = 0;
    }

    let isSimpleLine = (shortRef === 0 || shortRef == ConstantData2.LineTypes.SED_LS_MeasuringTape) && this.hoplist.nhops === 0;

    shapeElement = isSimpleLine ? svgContainer.CreateShape(ConstantData.CreateShapeType.LINE) : svgContainer.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    shapeElement.SetID(ConstantData.SVGElementClass.SHAPE);

    let slopElement = isSimpleLine ? svgContainer.CreateShape(ConstantData.CreateShapeType.LINE) : svgContainer.CreateShape(ConstantData.CreateShapeType.POLYLINE);
    slopElement.SetID(ConstantData.SVGElementClass.SLOP);
    slopElement.ExcludeFromExport(true);

    this.CalcFrame();
    let frame = this.Frame;
    let styleRecord = this.StyleRecord;

    if (styleRecord == null) {
      let sessionBlock = GlobalData.optManager.GetObjectPtr(GlobalData.optManager.theSEDSessionBlockID, false);
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
      points = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
      if (this.hoplist.nhops !== 0) {
        let hopResult = GlobalData.optManager.InsertHops(this, points, points.length);
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
      slopElement.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      slopElement.SetEventBehavior(Element.EventBehavior.NONE);
    }
    slopElement.SetStrokeWidth(lineThickness + ConstantData.Defines.SED_Slop);

    shapeContainer.AddElement(shapeElement);
    shapeContainer.AddElement(slopElement);

    this.ApplyStyles(shapeElement, styleRecord);
    this.ApplyEffects(shapeContainer, false, true);

    if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_GANTT_BAR) {
      GlobalData.optManager.GanttSetPercentCompleteEffectOnBar(this, shapeElement, styleRecord);
    }

    shapeContainer.isShape = true;
    this.AddIcons(svgContainer, shapeContainer);

    console.log('S.Line - Output:', shapeContainer);
    return shapeContainer;
  }

  SetCursors() {
    console.log('S.Line - Input:', { currentModalOperation: GlobalData.optManager.currentModalOperation });

    let shapeElement;
    const shapeContainer = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    if (GlobalData.optManager.currentModalOperation === Instance.Shape.ModalOperations.ADDCORNER) {
      shapeElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
      if (shapeElement) {
        shapeElement.SetCursor(Element.CursorType.CROSSHAIR);
      }
    } else {
      this.BaseDrawingObject_SetCursors();
    }

    console.log('S.Line - Output:', { shapeElement });
  }

  BaseDrawingObject_SetCursors() {
    console.log('S.Line - Input:', { BlockID: this.BlockID, flags: this.flags });

    const shapeContainer = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
    let isDimensionTextActive = false;

    if (!(this.flags & ConstantData.ObjFlags.SEDO_Lock) && shapeContainer) {
      if (GlobalData.optManager.GetEditMode() === ConstantData.EditState.DEFAULT) {
        const shapeElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
        if (shapeElement) {
          if (this.objecttype === ConstantData.ObjectTypes.SD_OBJT_FRAME_CONTAINER) {
            shapeElement.SetCursor(Element.CursorType.DEFAULT);
          } else {
            shapeElement.SetCursor(Element.CursorType.ADD);
          }
        }

        const hyperlinkIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.HYPERLINK);
        if (hyperlinkIcon) hyperlinkIcon.SetCursor(Element.CursorType.POINTER);

        const trelloLinkIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.TRELLOLINK);
        if (trelloLinkIcon) trelloLinkIcon.SetCursor(Element.CursorType.POINTER);

        const notesIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.NOTES);
        if (notesIcon) notesIcon.SetCursor(Element.CursorType.POINTER);

        const expandedViewIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.EXPANDEDVIEW);
        if (expandedViewIcon) expandedViewIcon.SetCursor(Element.CursorType.POINTER);

        const commentIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.COMMENT);
        if (commentIcon) commentIcon.SetCursor(Element.CursorType.POINTER);

        const attachmentIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.ATTACHMENT);
        if (attachmentIcon) attachmentIcon.SetCursor(Element.CursorType.POINTER);

        const fieldDataIcon = shapeContainer.GetElementByID(ConstantData.ShapeIconType.FIELDDATA);
        if (fieldDataIcon) fieldDataIcon.SetCursor(Element.CursorType.POINTER);

        const slopElement = shapeContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
        if (slopElement) slopElement.SetCursor(Element.CursorType.ADD);

        const activeEditElement = GlobalData.optManager.svgDoc.GetActiveEdit();
        if (this.DataID && this.DataID >= 0 && shapeContainer.textElem) {
          if (shapeContainer.textElem === activeEditElement) {
            shapeElement.SetCursor(Element.CursorType.TEXT);
            shapeContainer.textElem.SetCursorState(ConstantData.CursorState.EDITLINK);
          } else {
            shapeContainer.textElem.SetCursorState(ConstantData.CursorState.LINKONLY);
          }
        }

        if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Always ||
          (this.Dimensions & ConstantData.DimensionFlags.SED_DF_Select && this.IsSelected())) {
          const dimensionTextElements = shapeContainer.GetElementListWithID(ConstantData.SVGElementClass.DIMENSIONTEXT);
          for (let i = 0; i < dimensionTextElements.length; i++) {
            dimensionTextElements[i].SetCursorState(ConstantData.CursorState.EDITONLY);
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

    console.log('S.Line - Output:', { shapeContainer, isDimensionTextActive });
  }

  AdjustLineStart(svgContainer, startX, startY, endX, endY, enforceMinimum) {
    console.log('S.Line - Input:', { svgContainer, startX, startY, endX, endY, enforceMinimum });

    let points = [];
    let shapeElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    let slopElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);

    this.StartPoint.x = startX;
    this.StartPoint.y = startY;

    if (!enforceMinimum) {
      this.EnforceMinimum(true);
    }

    let adjustForLineAngleSnap = false;
    if (GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0) {
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
    let isSimpleLine = (this.ShortRef === 0 || this.ShortRef == ConstantData2.LineTypes.SED_LS_MeasuringTape) && this.hoplist.nhops === 0;

    if (isSimpleLine) {
      shapeElement.SetPoints(
        this.StartPoint.x - this.Frame.x,
        this.StartPoint.y - this.Frame.y,
        this.EndPoint.x - this.Frame.x,
        this.EndPoint.y - this.Frame.y
      );
    } else {
      polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
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
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
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
      polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
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

    new SelectionAttributes();
    let rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
    points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
    points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

    let deltaX = points[0].x - points[1].x;
    let deltaY = points[0].y - points[1].y;
    Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);

    GlobalData.optManager.UpdateDisplayCoordinates(this.Frame, this.StartPoint, ConstantData.CursorTypes.Grow, this);

    if (this.DataID !== -1) {
      this.LM_ResizeSVGTextObject(svgContainer, this, this.Frame);
    }

    console.log('S.Line - Output:', { shapeElement, slopElement, points });
  }

  AdjustLineEnd(svgContainer, newEndPointX, newEndPointY, unusedParam, forceAngleSnap) {
    console.log("S.Connector - Input:", { svgContainer, newEndPointX, newEndPointY, unusedParam, forceAngleSnap });

    let points = [];
    let shapeElement, slopElement;
    if (svgContainer) {
      shapeElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE);
      slopElement = svgContainer.GetElementByID(ConstantData.SVGElementClass.SLOP);
    }

    // Update endpoint and enforce minimum constraints
    this.EndPoint.x = newEndPointX;
    this.EndPoint.y = newEndPointY;
    this.EnforceMinimum(false);

    // Determine if line angle snap adjustment is needed
    const linkParamsExist = GlobalData.optManager.LinkParams && GlobalData.optManager.LinkParams.ConnectIndex >= 0;
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
          this.ShortRef === ConstantData2.LineTypes.SED_LS_MeasuringTape) &&
        this.hoplist.nhops === 0;

      if (isSimpleLine) {
        shapeElement.SetPoints(
          this.StartPoint.x - this.Frame.x,
          this.StartPoint.y - this.Frame.y,
          this.EndPoint.x - this.Frame.x,
          this.EndPoint.y - this.Frame.y
        );
      } else {
        polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
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
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
        this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
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
        polyPoints = this.GetLineShapePolyPoints(ConstantData.Defines.NPOLYPTS, true);
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

      new SelectionAttributes();
      const rect = Utils2.Pt2Rect(this.StartPoint, this.EndPoint);
      points.push(new Point(this.StartPoint.x - rect.x, this.StartPoint.y - rect.y));
      points.push(new Point(this.EndPoint.x - rect.x, this.EndPoint.y - rect.y));

      const deltaX = points[0].x - points[1].x;
      const deltaY = points[0].y - points[1].y;
      const distance = Utils2.sqrt(deltaX * deltaX + deltaY * deltaY);
      const deepCopiedEndPoint = Utils1.DeepCopy(this.EndPoint);

      GlobalData.optManager.UpdateDisplayCoordinates(this.Frame, deepCopiedEndPoint, ConstantData.CursorTypes.Grow, this);

      if (
        (GlobalData.optManager.theContentHeader.flags & ConstantData.ContentHeaderFlags.CT_DA_NoAuto) &&
        (deepCopiedEndPoint.x !== this.EndPoint.x || deepCopiedEndPoint.y !== this.EndPoint.y)
      ) {
        const error = new Error(Resources.Strings.Error_Bounds);
        error.name = "1";
        throw error;
      }

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(svgContainer, this, this.Frame);
      }
    }

    console.log("S.Connector - Output:", {
      shapeElement: svgContainer ? svgContainer.GetElementByID(ConstantData.SVGElementClass.SHAPE) : null,
      slopElement: svgContainer ? svgContainer.GetElementByID(ConstantData.SVGElementClass.SLOP) : null
    });
  }

  Flip(flipFlags: number) {
    console.log('S.Line - Input:', { flipFlags });

    let temp;
    let swapped = false;

    if (GlobalData.optManager.ob = Utils1.DeepCopy(this), flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      temp = this.StartPoint.y;
      this.StartPoint.y = this.EndPoint.y;
      this.EndPoint.y = temp;
      swapped = true;
    }

    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      temp = this.StartPoint.x;
      this.StartPoint.x = this.EndPoint.x;
      this.EndPoint.x = temp;
      swapped = true;
    }

    if (swapped) {
      const shapeElement = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      this.UpdateDimensionLines(shapeElement);

      if (this.DataID !== -1) {
        this.LM_ResizeSVGTextObject(shapeElement, this, this.Frame);
      }

      if (GlobalData.optManager.ob.Frame) {
        GlobalData.optManager.MaintainLink(
          this.BlockID,
          this,
          GlobalData.optManager.ob,
          ConstantData.ActionTriggerType.ROTATE
        );
      }

      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE);
    }

    GlobalData.optManager.ob = {};
    console.log('S.Line - Output:', { swapped });
  }

  AddCorner(event, point) {
    console.log('S.Line - Input:', { event, point });

    let angle, rotatedPoints, newPoints = [], tempPoints = [], isStartPoint = false;
    GlobalData.optManager.ob = Utils1.DeepCopy(this);

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
      if (Collab.AllowMessage()) {
        Collab.BeginSecondaryEdit();
        const message = { BlockID: this.BlockID, point: { x: point.x, y: point.y } };
      }

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
      GlobalData.optManager.MaintainLink(this.BlockID, this, GlobalData.optManager.ob, ConstantData.ActionTriggerType.MODIFYSHAPE);
      GlobalData.optManager.SetLinkFlag(this.BlockID, ConstantData.LinkFlags.SED_L_MOVE | ConstantData.LinkFlags.SED_L_CHANGE);
      GlobalData.optManager.UpdateLinks();

      const newLineData = {
        StartPoint: { x: tempPoints[0].x, y: tempPoints[0].y },
        EndPoint: { x: tempPoints[1].x, y: tempPoints[1].y },
        Dimensions: this.Dimensions,
        TextFlags: this.TextFlags,
        objecttype: this.objecttype,
        StyleRecord: Utils1.DeepCopy(this.StyleRecord)
      };

      const newLine = new Instance.Shape.Line(newLineData);
      const newBlockID = GlobalData.optManager.AddNewObject(newLine, false, true);
      const joinID = isStartPoint
        ? GlobalData.optManager.PolyLJoin(newBlockID, ConstantData.HookPts.SED_KTL, this.BlockID, ConstantData.HookPts.SED_KTL, false)
        : GlobalData.optManager.PolyLJoin(newBlockID, ConstantData.HookPts.SED_KTL, this.BlockID, ConstantData.HookPts.SED_KTR, false);

      const joinedObject = GlobalData.optManager.GetObjectPtr(joinID, false);
      const joinedElement = GlobalData.optManager.svgObjectLayer.GetElementByID(joinID);

      let dimensionText = Number(GlobalData.docHandler.rulerSettings.majorScale).toString();
      switch (GlobalData.docHandler.rulerSettings.units) {
        case ConstantData.RulerUnits.SED_Feet:
          if (this.Dimensions & ConstantData.DimensionFlags.SED_DF_ShowFeetAsInches) {
            dimensionText = `${12 * GlobalData.docHandler.rulerSettings.majorScale}"`;
          } else {
            dimensionText += "'";
          }
          break;
        case ConstantData.RulerUnits.SED_Inches:
          dimensionText += '"';
          break;
      }

      joinedObject.UpdateDimensionFromText(joinedElement, dimensionText, { segment: 2 });
      GlobalData.optManager.AddToDirtyList(this.BlockID);

      Collab.ClearCreateList();
      Collab.AddToCreateList(joinID);

      if (Collab.AllowMessage()) {
        if (Collab.IsSecondary() && Collab.CreateList.length) {
          message.CreateList = [joinID];
        }
        Collab.BuildMessage(ConstantData.CollabMessages.AddCorner, message, false);
      }

      GlobalData.optManager.CompleteOperation(null);
    }

    console.log('S.Line - Output:', { newPoints, tempPoints, isStartPoint });
  }

  UseEdges(enableX: boolean, enableY: boolean, alignX: boolean, alignY: boolean, startPoint: Point, endPoint: Point) {
    console.log('S.Line - Input:', { enableX, enableY, alignX, alignY, startPoint, endPoint });

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
      GlobalData.optManager.GetObjectPtr(this.BlockID, true);
      if (deltaX || deltaY) {
        this.OffsetShape(deltaX, deltaY);
      }
      if (offsetX || offsetY) {
        if (offsetX) newWidth = this.Frame.width + offsetX;
        if (offsetY) newHeight = this.Frame.height + offsetY;
        this.SetSize(newWidth, newHeight, 0);
      }
      GlobalData.optManager.AddToDirtyList(this.BlockID);
    }

    console.log('S.Line - Output:', { offsetX, offsetY, newWidth, newHeight, deltaX, deltaY, shouldAdjust });
    return shouldAdjust;
  }
}

export default Line
