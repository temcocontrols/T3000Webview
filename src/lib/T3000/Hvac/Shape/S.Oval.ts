

import BaseShape from './S.BaseShape'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import Utils3 from "../Util/Utils3";
import GlobalData from '../Data/T3Gv'
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element';
import $ from 'jquery'
import Point from '../Model/Point'
import ConstantData from '../Data/ConstantData'

class Oval extends BaseShape {

  constructor(options) {
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.OVAL;
    options.Frame;

    console.log('S.Oval: Input options:', options);

    super(options);

    this.dataclass = this.ObjGrow === ConstantData.GrowBehavior.PROPORTIONAL
      ? ConstantData.SDRShapeTypes.SED_S_Circ
      : ConstantData.SDRShapeTypes.SED_S_Oval;

    console.log('S.Oval: Output dataclass:', this.dataclass);
  }

  CreateShape(renderer, isHidden) {
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;

    console.log('S.Oval: Input renderer:', renderer, 'isHidden:', isHidden);

    const shapeContainer = renderer.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const frameCopy = $.extend(true, {}, this.Frame);
    const style = this.StyleRecord;

    if (style.Line.BThick) {
      Utils2.InflateRect(frameCopy, style.Line.BThick, style.Line.BThick);
    }

    const strokeColor = style.Line.Paint.Color;
    const strokeWidth = style.Line.Thickness;
    const strokePattern = style.Line.LinePattern;
    const width = frameCopy.width;
    const height = frameCopy.height;

    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(frameCopy.x, frameCopy.y);

    const ovalShape = renderer.CreateShape(ConstantData.CreateShapeType.OVAL);
    ovalShape.SetSize(width, height);
    ovalShape.SetStrokeColor(strokeColor);
    ovalShape.SetStrokeWidth(strokeWidth);

    if (strokePattern !== 0) {
      ovalShape.SetStrokePattern(strokePattern);
    }

    ovalShape.SetID(ConstantData.SVGElementClass.SHAPE);
    shapeContainer.AddElement(ovalShape);

    this.ApplyStyles(ovalShape, style);
    this.ApplyEffects(shapeContainer, false, false);

    const slopShape = renderer.CreateShape(ConstantData.CreateShapeType.OVAL);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(strokeWidth + ConstantData.Defines.SED_Slop);

    if (isHidden) {
      slopShape.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT);
    } else {
      slopShape.SetEventBehavior(Element.EventBehavior.NONE);
    }

    slopShape.SetID(ConstantData.SVGElementClass.SLOP);
    slopShape.ExcludeFromExport(true);
    slopShape.SetSize(width, height);
    shapeContainer.AddElement(slopShape);

    const hatchFill = style.Fill.Hatch;
    if (hatchFill && hatchFill !== 0) {
      const hatchShape = renderer.CreateShape(ConstantData.CreateShapeType.OVAL);
      hatchShape.SetID(ConstantData.SVGElementClass.HATCH);
      hatchShape.SetSize(width, height);
      hatchShape.SetStrokeWidth(0);
      this.SetFillHatch(hatchShape, hatchFill);
      shapeContainer.AddElement(hatchShape);
    }

    shapeContainer.isShape = true;

    const table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.LM_AddSVGTableObject(this, renderer, shapeContainer, table);
    }

    if (this.DataID >= 0) {
      this.LM_AddSVGTextObject(renderer, shapeContainer);
    }

    console.log('S.Oval: Output shapeContainer:', shapeContainer);

    return shapeContainer;
  }

  GetPolyPoints(curveType, frame, inflate, isClosed, isReversed) {
    console.log('S.Oval: Input parameters:', { curveType, frame, inflate, isClosed, isReversed });

    let points = [];
    let frameCopy = {};
    let halfThickness = this.StyleRecord.Line.Thickness / 2;

    Utils2.CopyRect(frameCopy, this.Frame);

    if (inflate) {
      Utils2.InflateRect(frameCopy, halfThickness, halfThickness);
    }

    let topHalf = {
      x: frameCopy.width / 2,
      y: 0,
      width: frameCopy.width / 2,
      height: frameCopy.height
    };

    GlobalData.optManager.PolyYCurve(points, topHalf, curveType, 0, 0, 0, 0, false);
    points.pop();

    let bottomHalf = {
      x: 0,
      y: frameCopy.height,
      width: frameCopy.width / 2,
      height: -frameCopy.height
    };

    GlobalData.optManager.PolyYCurve(points, bottomHalf, curveType, 0, 0, 0, 0, true);
    points.pop();

    if (!frame) {
      for (let i = 0; i < points.length; i++) {
        points[i].x += frameCopy.x;
        points[i].y += frameCopy.y;
      }
    }

    console.log('S.Oval: Output points:', points);
    return points;
  }

  ExtendLines() {
    console.log('S.Oval: ExtendLines called');

    const table = this.GetTable(false);
    if (table) {
      console.log('S.Oval: Input table:', table);
      GlobalData.optManager.Table_ExtendLines(this, table);
      console.log('S.Oval: Table lines extended');
    }
  }

  ExtendCell(cellIndex, rowIndex, columnIndex) {
    console.log('S.Oval: Input parameters:', { cellIndex, rowIndex, columnIndex });

    const table = this.GetTable(false);
    if (table) {
      const extendedCells = GlobalData.optManager.Table_ExtendCell(this, table, cellIndex, rowIndex, columnIndex);
      if (extendedCells) {
        const svgFrame = this.GetSVGFrame(this.Frame);
        const offsetX = this.inside.x - svgFrame.x;
        const offsetY = this.inside.y - svgFrame.y;

        if (offsetX || offsetY) {
          for (let i = 0; i < extendedCells.length; i++) {
            extendedCells[i].x += offsetX;
            extendedCells[i].y += offsetY;
          }
        }

        console.log('S.Oval: Output extendedCells:', extendedCells);
        return extendedCells;
      }
    }

    console.log('S.Oval: No table found or no cells extended');
    return null;
  }

  GetPerimeterPoints(event, points, hookType, isClosed, tableIndex, isReversed) {
    console.log('S.Oval: Input parameters:', { event, points, hookType, isClosed, tableIndex, isReversed });

    let perimeterPoints = [];
    let frameWidth = this.Frame.width;
    let frameHeight = this.Frame.height;
    let halfWidth = frameWidth / 2;
    let halfHeight = frameHeight / 2;
    let dimension = ConstantData.Defines.SED_CDim;

    if (points.length === 1 && points[0].y === -ConstantData.SEDA_Styles.SEDA_CoManager && this.IsCoManager({})) {
      perimeterPoints.push(new Point(this.Frame.x, this.Frame.y));
      if (points[0].id != null) {
        perimeterPoints[0].id = points[0].id;
      }
      console.log('S.Oval: Output perimeterPoints:', perimeterPoints);
      return perimeterPoints;
    }

    if (hookType === ConstantData.HookPts.SED_KAT) {
      perimeterPoints = this.BaseDrawingObject_GetPerimPts(event, points, hookType, false, tableIndex, isReversed);
      console.log('S.Oval: Output perimeterPoints:', perimeterPoints);
      return perimeterPoints;
    }

    let table = this.GetTable(false);
    if (tableIndex != null && table) {
      let tablePerimeterPoints = GlobalData.optManager.Table_GetPerimPts(this, table, tableIndex, points);
      if (tablePerimeterPoints) {
        perimeterPoints = tablePerimeterPoints;
        if (!isClosed) {
          let rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
          Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, perimeterPoints);
        }
        console.log('S.Oval: Output perimeterPoints:', perimeterPoints);
        return perimeterPoints;
      }
    }

    let useConnect = this.flags & ConstantData.ObjFlags.SEDO_UseConnect;
    let useTableRows = this.hookflags & ConstantData.HookFlags.SED_LC_TableRows && table;

    if (useConnect || useTableRows) {
      for (let i = 0; i < points.length; i++) {
        perimeterPoints[i] = {
          x: points[i].x / dimension * frameWidth + this.Frame.x,
          y: points[i].y / dimension * frameHeight + this.Frame.y,
          id: points[i].id || 0
        };
      }
    } else {
      for (let i = 0; i < points.length; i++) {
        let x = frameWidth * (points[i].x - dimension / 2) / dimension;
        let y = frameHeight * (points[i].y - dimension / 2) / dimension;
        if (x !== 0 && y !== 0) {
          let slope = y < 0 ? -1 : 1;
          let factor = 1 / ((x / y) * (x / y) / (halfWidth * halfWidth) + 1 / (halfHeight * halfHeight));
          x = (x / y) * (y = Math.sqrt(factor) * slope);
        }
        perimeterPoints.push(new Point(
          x + (this.Frame.x + this.Frame.x + frameWidth) / 2,
          y + (this.Frame.y + this.Frame.y + frameHeight) / 2
        ));
        if (points[i].id != null) {
          perimeterPoints[i].id = points[i].id;
        }
      }
    }

    if (!isClosed) {
      let rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, perimeterPoints);
    }

    console.log('S.Oval: Output perimeterPoints:', perimeterPoints);
    return perimeterPoints;
  }

  BaseDrawingObject_GetPerimPts(event, points, hookType, isClosed, tableIndex, isReversed) {
    console.log('S.Oval: Input parameters:', { event, points, hookType, isClosed, tableIndex, isReversed });

    const perimeterPoints = [];
    const numPoints = points.length;
    const triangleShapeType = ConstantData.SDRShapeTypes.SED_S_Tri;
    const dimension = ConstantData.Defines.SED_CDim;

    for (let i = 0; i < numPoints; i++) {
      const point = {
        x: points[i].x / dimension * this.Frame.width + this.Frame.x,
        y: (this.dataclass === triangleShapeType ? dimension - points[i].y : points[i].y) / dimension * this.Frame.height + this.Frame.y,
        id: points[i].id || 0
      };
      perimeterPoints.push(point);
    }

    if (!isClosed) {
      const rotationAngle = -this.RotationAngle / (180 / ConstantData.Geometry.PI);
      Utils3.RotatePointsAboutCenter(this.Frame, rotationAngle, perimeterPoints);
    }

    console.log('S.Oval: Output perimeterPoints:', perimeterPoints);
    return perimeterPoints;
  }

  SetShapeIndent(isIndented) {
    console.log('S.Oval: Input isIndented:', isIndented);

    const roundFactor = ConstantData.Defines.SED_RoundFactor / 2;
    const width = this.inside.width;
    const height = this.inside.height;

    this.leftIndent = roundFactor;
    this.topIndent = roundFactor;
    this.rightIndent = roundFactor;
    this.bottomIndent = roundFactor;

    let leftFactor = 1;
    let topFactor = 1;
    let rightFactor = 1;
    let bottomFactor = 1;

    if (isIndented) {
      leftFactor = rightFactor = 1 - 2 * this.leftIndent;
      topFactor = bottomFactor = leftFactor;
    }

    this.tindent.left = this.leftIndent * width / leftFactor;
    this.tindent.top = this.topIndent * height / topFactor;
    this.tindent.right = this.rightIndent * width / rightFactor;
    this.tindent.bottom = this.bottomIndent * height / bottomFactor;

    console.log('S.Oval: Output tindent:', this.tindent);
  }

}

export default Oval;
