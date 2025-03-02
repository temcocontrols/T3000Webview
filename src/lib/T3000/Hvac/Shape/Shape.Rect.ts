

import BaseShape from './Shape.BaseShape'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import DefaultEvt from "../Event/DefaultEvt";
import RRect from './Shape.RRect'
import $ from 'jquery';
import Point from '../Model/Point'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element';
import Instance from '../Data/Instance/Instance';
import ConstantData from '../Data/ConstantData'

class Rect extends BaseShape {

  constructor(options: any) {
    console.log("= S.Rect Input:", options);
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.RECT;
    options.moreflags |= ConstantData.ObjMoreFlags.SED_MF_FixedRR;

    super(options);

    this.dataclass = options.dataclass || ConstantData.SDRShapeTypes.SED_S_Rect;
    this.nativeDataArrayBuffer = options.nativeDataArrayBuffer || null;
    this.SymbolData = options.SymbolData || null;

    console.log("= S.Rect Created instance:", this);
  }

  CreateShape(e, t) {
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) return null;
    var a = e.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER),
      r = $.extend(!0, {
      }, this.Frame),
      i = this.StyleRecord;
    i.Line.BThick &&
      null == this.polylist &&
      Utils2.InflateRect(r, i.Line.BThick, i.Line.BThick);
    var n = (i = this.SVGTokenizerHook(i)).Line.Paint.Color,
      o = i.Line.Thickness,
      s = i.Line.LinePattern,
      l = i.Line.Paint.Opacity,
      S = r.width,
      c = r.height;
    a.SetSize(S, c),
      a.SetPos(r.x, r.y);
    var u = this.RRect_GetCornerSize();
    if (this.SymbolURL) {
      var p = e.CreateShape(ConstantData.CreateShapeType.RECT);
      p.SetID(ConstantData.SVGElementClass.SHAPE),
        p.SetSize(S, c),
        p.SetImageFill(this.SymbolURL, {
          scaleType: 'NOPROP'
        });
      var d = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) > 0,
        D = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) > 0;
      d &&
        p.SetMirror(d),
        D &&
        p.SetFlip(D),
        a.AddElement(p),
        this.GetFieldDataStyleOverride()
    } else {
      if (u > 0) (g = e.CreateShape(ConstantData.CreateShapeType.RRECT)).SetRRectSize(S, c, u, u);
      else var g = e.CreateShape(ConstantData.CreateShapeType.RECT);
      g.SetStrokeColor(n),
        g.SetStrokeOpacity(l),
        g.SetStrokeWidth(o),
        0 !== s &&
        g.SetStrokePattern(s),
        g.SetID(ConstantData.SVGElementClass.SHAPE),
        g.SetSize(S, c),
        a.AddElement(g)
    }
    if (
      this.ApplyStyles(g, i),
      this.ApplyEffects(a, !1, !1),
      !(this instanceof Instance.Shape.ShapeContainer)
    ) {
      var h = ConstantData.Defines.SED_Slop,
        m = c,
        C = S;
      if (
        (
          this.IsSwimlane() ||
          this.objecttype === ConstantData.ObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER
        ) &&
        (h *= 3),
        u > 0
      ) (y = e.CreateShape(ConstantData.CreateShapeType.RRECT)).SetRRectSize(C, m, u, u);
      else var y = e.CreateShape(ConstantData.CreateShapeType.RECT);
      y.SetStrokeColor('white'),
        y.SetFillColor('none'),
        y.SetOpacity(0),
        y.SetStrokeWidth(o + h),
        t ? this.SymbolURL ||
          i.Fill.Paint.FillType == ConstantData.FillTypes.SDFILL_TRANSPARENT &&
          this.DataID >= 0 ? y.SetEventBehavior(Element.EventBehavior.HIDDEN_ALL) : y.SetEventBehavior(Element.EventBehavior.HIDDEN_OUT) : y.SetEventBehavior(Element.EventBehavior.NONE),
        y.SetID(ConstantData.SVGElementClass.SLOP),
        y.ExcludeFromExport(!0),
        y.SetSize(C || 1, m),
        a.AddElement(y)
    }
    var f = i.Fill.Hatch;
    if (f && 0 !== f) {
      if (u > 0) (L = e.CreateShape(ConstantData.CreateShapeType.RRECT)).SetRRectSize(S, c, u, u);
      else var L = e.CreateShape(ConstantData.CreateShapeType.RECT);
      L.SetID(ConstantData.SVGElementClass.HATCH),
        L.SetSize(S, c),
        L.SetStrokeWidth(0),
        this.SetFillHatch(L, f),
        a.AddElement(L)
    }
    a.isShape = !0;
    var I = this.GetTable(!1);
    I &&
      GlobalData.optManager.LM_AddSVGTableObject(this, e, a, I);
    var T = this.GetGraph(!1);
    return T &&
      GlobalData.optManager.LM_AddSVGGraphObject(this, e, a, T),
      this.DataID >= 0 &&
      this.LM_AddSVGTextObject(e, a),
      a
  }

  GetCornerSize(inputSize) {
    console.log("= S.Rect GetCornerSize Input:", inputSize);
    const cornerSize = this.RRect_GetCornerSize(inputSize);
    console.log("= S.Rect GetCornerSize Output:", cornerSize);
    return cornerSize;
  }

  RRect_GetCornerSize(inputSize) {
    console.log("= S.Rect RRect_GetCornerSize Input:", inputSize);

    let width = this.Frame.width;
    let height = this.Frame.height;
    let minDimension = width < height ? width : height;

    if (inputSize) {
      minDimension = inputSize;
    }

    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
      let fixedSize = ConstantData.Defines.RRectFixedDim * this.shapeparam;
      let maxSize = 0.4 * minDimension;
      if (fixedSize > maxSize) {
        fixedSize = maxSize;
      }
      console.log("= S.Rect RRect_GetCornerSize Output:", fixedSize);
      return fixedSize;
    }

    let cornerSize = minDimension * this.shapeparam;
    console.log("= S.Rect RRect_GetCornerSize Output:", cornerSize);
    return cornerSize;
  }

  GetPolyPoints(event, type, arg, rect, index) {
    console.log("= S.Rect GetPolyPoints Input:", { event, type, arg, rect, index });
    const cornerSize = this.RRect_GetCornerSize();
    let polyPoints;
    if (cornerSize > 0) {
      polyPoints = this.RRect_GetPolyPoints(event, type, arg, rect, index);
    } else {
      polyPoints = this.BaseDrawingObject_GetPolyPoints(event, type, arg, rect, index);
    }
    console.log("= S.Rect GetPolyPoints Output:", polyPoints);
    return polyPoints;
  }

  RRect_GetPolyPoints(event, type, arg, rect, index) {
    console.log("= S.Rect RRect_GetPolyPoints Input:", { event, type, arg, rect, index });

    let points = [];
    let frameCopy = {};
    let cornerRect = {};

    Utils2.CopyRect(frameCopy, this.Frame);
    let halfThickness = this.StyleRecord.Line.Thickness / 2;
    if (rect) {
      Utils2.InflateRect(frameCopy, halfThickness, halfThickness);
    }

    let cornerSize = this.GetCornerSize();

    cornerRect.x = 0;
    cornerRect.y = 0;
    cornerRect.width = cornerSize;
    cornerRect.height = 2 * cornerSize;
    GlobalData.optManager.PolyYCurve(points, cornerRect, event / 2, 0, 0, 0, cornerSize, true);

    cornerRect.x = 0;
    cornerRect.y = frameCopy.height - 2 * cornerSize;
    cornerRect.width = cornerSize;
    cornerRect.height = 2 * cornerSize;
    GlobalData.optManager.PolyYCurve(points, cornerRect, event / 2, 0, 0, cornerSize, 0, true);

    cornerRect.x = frameCopy.width - cornerSize;
    cornerRect.y = frameCopy.height;
    cornerRect.width = cornerSize;
    cornerRect.height = -2 * cornerSize;
    GlobalData.optManager.PolyYCurve(points, cornerRect, event / 2, 0, 0, 0, -cornerSize, false);

    cornerRect.x = frameCopy.width - cornerSize;
    cornerRect.y = 2 * cornerSize;
    cornerRect.width = cornerSize;
    cornerRect.height = -2 * cornerSize;
    GlobalData.optManager.PolyYCurve(points, cornerRect, event / 2, 0, 0, -cornerSize, 0, false);

    points.push(new Point(points[0].x, points[0].y));

    if (!type) {
      for (let i = 0, len = points.length; i < len; i++) {
        points[i].x += frameCopy.x;
        points[i].y += frameCopy.y;
      }
    }

    console.log("= S.Rect RRect_GetPolyPoints Output:", points);
    return points;
  }

  BaseDrawingObject_GetPolyPoints(event, type, arg, rect, index) {
    console.log("= S.Rect BaseDrawingObject_GetPolyPoints Input:", { event, type, arg, rect, index });

    let points = [];
    let frameCopy = {};

    Utils2.CopyRect(frameCopy, this.Frame);
    let halfThickness = this.StyleRecord.Line.Thickness / 2;

    if (rect) {
      Utils2.InflateRect(frameCopy, halfThickness, halfThickness);
    }

    points.push(new Point(0, 0));
    points.push(new Point(frameCopy.width, 0));
    points.push(new Point(frameCopy.width, frameCopy.height));
    points.push(new Point(0, frameCopy.height));
    points.push(new Point(0, 0));

    if (!type) {
      for (let i = 0, len = points.length; i < len; i++) {
        points[i].x += frameCopy.x;
        points[i].y += frameCopy.y;
      }
    }

    console.log("= S.Rect BaseDrawingObject_GetPolyPoints Output:", points);
    return points;
  }

  ExtendLines(extend) {
    console.log("= S.Rect ExtendLines Input:", extend);
    const cornerSize = this.RRect_GetCornerSize();
    if (cornerSize > 0 || extend) {
      this.RRect_ExtendLines();
    }
    console.log("= S.Rect ExtendLines Output");
  }

  RRect_ExtendLines() {
    console.log("= S.Rect RRect_ExtendLines Input");

    var table = this.GetTable(false);
    if (table) {
      GlobalData.optManager.Table_ExtendLines(this, table);
    }

    console.log("= S.Rect RRect_ExtendLines Output");
  }

  ExtendCell(event, type, arg) {
    console.log("= S.Rect ExtendCell Input:", { event, type, arg });
    const cornerSize = this.RRect_GetCornerSize();
    let result;
    if (cornerSize > 0) {
      result = this.RRect_ExtendCell(event, type, arg);
    }
    console.log("= S.Rect ExtendCell Output:", result);
    return result;
  }

  RRect_ExtendCell(event, type, arg) {
    console.log("= S.Rect RRect_ExtendCell Input:", { event, type, arg });

    var table = this.GetTable(false);
    let result = null;

    if (table) {
      result = GlobalData.optManager.Table_ExtendCell(this, table, event, type, arg);

      if (result) {
        var offsetX = this.inside.x - this.Frame.x;
        var offsetY = this.inside.y - this.Frame.y;

        if (offsetX || offsetY) {
          for (let i = 0; i < result.length; i++) {
            result[i].x += offsetX;
            result[i].y += offsetY;
          }
        }
      }
    }

    console.log("= S.Rect RRect_ExtendCell Output:", result);
    return result;
  }

  SetShapeIndent(indentOptions) {
    console.log("= S.Rect SetShapeIndent Input:", indentOptions);
    const cornerSize = this.RRect_GetCornerSize();
    let result;
    if (cornerSize > 0) {
      result = this.RRect_SetShapeIndent(indentOptions);
    } else {
      this.left_sindent = 0;
      this.right_sindent = 0;
      this.top_sindent = 0;
      this.bottom_sindent = 0;
      result = super.SetShapeIndent(indentOptions);
    }
    console.log("= S.Rect SetShapeIndent Output:", result);
    return result;
  }

  RRect_SetShapeIndent(indentOptions) {
    console.log("= S.Rect RRect_SetShapeIndent Input:", indentOptions);

    let width = this.inside.width;
    let height = this.inside.height;
    let minDimension = width < height ? width : height;
    let shapeParam = this.shapeparam;

    if (this.moreflags & ConstantData.ObjMoreFlags.SED_MF_FixedRR) {
      let adjustedDimension = minDimension;
      if (indentOptions) {
        adjustedDimension += 2 * (this.GetCornerSize() * ConstantData.Defines.SED_RoundFactor);
        adjustedDimension = minDimension + 2 * (this.GetCornerSize(adjustedDimension) * ConstantData.Defines.SED_RoundFactor);
      }
      shapeParam = this.GetCornerSize(adjustedDimension) / adjustedDimension;
    }

    this.left_sindent = shapeParam * ConstantData.Defines.SED_RoundFactor;
    this.top_sindent = this.left_sindent;
    this.right_sindent = this.left_sindent;
    this.bottom_sindent = this.left_sindent;

    let scaleX = 1, scaleY = 1, scaleRight = 1, scaleBottom = 1;
    if (indentOptions) {
      scaleX = scaleY = scaleRight = scaleBottom = 1 - 2 * this.left_sindent;
    }

    this.tindent.left = this.left_sindent * width / scaleX;
    this.tindent.top = this.top_sindent * height / scaleY;
    this.tindent.right = this.right_sindent * width / scaleRight;
    this.tindent.bottom = this.bottom_sindent * height / scaleBottom;

    console.log("= S.Rect RRect_SetShapeIndent Output:", {
      left_sindent: this.left_sindent,
      top_sindent: this.top_sindent,
      right_sindent: this.right_sindent,
      bottom_sindent: this.bottom_sindent,
      tindent: this.tindent
    });
  }

  SetShapeProperties(properties) {
    console.log("= S.Rect SetShapeProperties Input:", properties);
    let updated = false;
    const fixedRRectFlag = ConstantData.ObjMoreFlags.SED_MF_FixedRR;

    if (properties.hasrrectselected) {
      const isFixedRRectChanged = (this.moreflags & fixedRRectFlag) > 0 !== properties.rrectfixed;
      const isShapeParamChanged = properties.rrectparam !== this.shapeparam;

      if (isFixedRRectChanged || isShapeParamChanged) {
        this.moreflags = Utils2.SetFlag(this.moreflags, fixedRRectFlag, properties.rrectfixed);
        this.shapeparam = properties.rrectparam;
        this.GetTable(true);

        if (this.shapeparam === 0) {
          this.left_sindent = 0;
          this.top_sindent = 0;
          this.right_sindent = 0;
          this.bottom_sindent = 0;
          this.tindent.left = 0;
          this.tindent.top = 0;
          this.tindent.right = 0;
          this.tindent.bottom = 0;
        }

        this.SetSize(this.Frame.width, 0, ConstantData.ActionTriggerType.LINELENGTH);

        if (this.shapeparam === 0) {
          this.ExtendLines(true);
        }

        updated = true;
      }
    }

    if (Instance.Shape.BaseShape.prototype.SetShapeProperties.call(this, properties)) {
      updated = true;
    }

    console.log("= S.Rect SetShapeProperties Output:", updated);
    return updated;
  }

  ApplyCurvature(curvatureParam) {
    console.log("= S.Rect ApplyCurvature Input:", curvatureParam);

    var shapeProperties = {
      hasrrectselected: true,
      rrectfixed: true,
      rrectparam: curvatureParam
    };

    this.SetShapeProperties(shapeProperties);
    console.log("= S.Rect ApplyCurvature Output: Shape properties updated");
  }

}

export default Rect;
