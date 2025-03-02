

import BaseSymbol from './Shape.BaseSymbol'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/GlobalData'
import DefaultEvt from "../Event/DefaultEvt";
import Element from "../Basic/Basic.Element";
import ConstantData from '../Data/ConstantData'
import $ from 'jquery';

class SVGFragmentSymbol extends BaseSymbol {

  constructor(options: any) {
    console.log("= S.SVGFragmentSymbol | Constructor Input:", options);
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.SVGFRAGMENTSYMBOL;
    super(options);
    console.log("= S.SVGFragmentSymbol | Constructor Output:", this);
  }

  CreateShape(svgDoc: any, useEvent: any) {
    console.log("= S.SVGFragmentSymbol | CreateShape Input:", { svgDoc, useEvent });

    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      return null;
    }

    // Create container and symbol shapes
    const container = svgDoc.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const symbol = svgDoc.CreateShape(ConstantData.CreateShapeType.SYMBOL);

    // Set up symbol properties
    symbol.SetSymbolSource(this.SVGFragment);
    symbol.SetID(ConstantData.SVGElementClass.SHAPE);

    const frame = this.Frame;
    const styleRecord = this.StyleRecord;
    let lineColor = styleRecord.Line.Paint.Color;
    const lineThickness = styleRecord.Line.Thickness;

    // Override with field data style if available
    const fieldStyle = this.GetFieldDataStyleOverride();
    if (fieldStyle && fieldStyle.strokeColor) {
      lineColor = fieldStyle.strokeColor;
    }

    // Set stroke color and width based on color changes flags
    if (fieldStyle || (this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_LINE | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE))) {
      symbol.SetStrokeColor(lineColor);
    }

    if (this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_LINETHICK | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE)) {
      symbol.SetStrokeWidth(lineThickness);
    }

    // Set fill and stroke opacities
    symbol.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
    symbol.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);

    // Update container and symbol sizes/positions
    const width = frame.width;
    const height = frame.height;

    container.SetSize(width, height);
    container.SetPos(frame.x, frame.y);

    symbol.SetSize(width, height);
    symbol.SetScale(width / this.InitialGroupBounds.width, height / this.InitialGroupBounds.height);

    // Apply mirror/flip effects if needed
    const flipHoriz = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) > 0;
    const flipVert = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) > 0;
    if (flipHoriz) {
      symbol.SetMirror(flipHoriz);
    }
    if (flipVert) {
      symbol.SetFlip(flipVert);
    }

    container.AddElement(symbol);
    this.ApplyStyles(symbol, styleRecord);
    this.ApplyEffects(container, false, false);

    // Create a slop shape for event handling
    const slopShape = svgDoc.CreateShape(ConstantData.CreateShapeType.RECT);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(0);
    if (useEvent) {
      slopShape.SetEventBehavior(ConstantData.EventBehavior.HIDDEN_ALL);
    } else {
      slopShape.SetEventBehavior(ConstantData.EventBehavior.NONE);
    }
    slopShape.SetID(ConstantData.SVGElementClass.SLOP);
    slopShape.ExcludeFromExport(true);
    slopShape.SetSize(width, height);

    container.AddElement(slopShape);
    container.isShape = true;

    // Add SVG text object if applicable
    if (this.DataID !== -1) {
      this.LM_AddSVGTextObject(svgDoc, container);
    }

    console.log("= S.SVGFragmentSymbol | CreateShape Output:", container);
    return container;
  }

  ApplyStyles(e, styleRecord) {
    console.log("= S.SVGFragmentSymbol | ApplyStyles Input:", { targetShape: e, styleRecord });

    const fieldDataStyle = this.GetFieldDataStyleOverride();
    const overrideFillColor = fieldDataStyle && fieldDataStyle.fillColor;

    if (
      overrideFillColor ||
      this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_FILL | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE)
    ) {
      let fillType = styleRecord.Fill.Paint.FillType;
      let fillColor = styleRecord.Fill.Paint.Color;

      // Override fill color if field data style provides an override
      if (overrideFillColor) {
        fillType = ConstantData.FillTypes.SDFILL_SOLID;
        fillColor = fieldDataStyle.fillColor;
      }

      if (fillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
        e.SetFillColor(styleRecord.Fill.Paint.Color);
        e.SetGradientFill(
          this.CreateGradientRecord(
            styleRecord.Fill.Paint.GradientFlags,
            fillColor,
            styleRecord.Fill.Paint.Opacity,
            styleRecord.Fill.Paint.EndColor,
            styleRecord.Fill.Paint.EndOpacity
          )
        );
        e.fillPaintType = fillType;
      } else if (fillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
        const texture = styleRecord.Fill.Paint.Texture;
        const textureData = GlobalData.optManager.TextureList.Textures[texture];
        if (textureData) {
          const textureFill = {
            url: textureData.ImageURL || (Constants.FilePath_CMSRoot + Constants.FilePath_Textures + textureData.filename),
            scale: GlobalData.optManager.CalcTextureScale(styleRecord.Fill.Paint.TextureScale, textureData.dim.x),
            alignment: styleRecord.Fill.Paint.TextureScale.AlignmentScalar,
            dim: textureData.dim
          };
          // Update scale inside styleRecord for consistency
          styleRecord.Fill.Paint.TextureScale.Scale = textureFill.scale;
          e.SetTextureFill(textureFill);
        }
      } else if (fillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
        e.SetFillColor('none');
      } else {
        e.SetFillColor(fillColor);
        e.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      }
    }

    console.log("= S.SVGFragmentSymbol | ApplyStyles Output:", { targetShape: e });
  }

  Resize(shapeElement, newBBox, eventInfo) {
    console.log("= S.SVGFragmentSymbol | Resize Input:", {
      shapeElement,
      newBBox,
      eventInfo
    });

    // Get the current rotation, previous bounding box and calculate offset for rotation.
    const rotation = shapeElement.GetRotation();
    const prevBBox = $.extend(true, {}, this.prevBBox);
    const updatedBBox = $.extend(true, {}, newBBox);
    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(prevBBox, updatedBBox, rotation);

    // Update the main shape size and position.
    shapeElement.SetSize(updatedBBox.width, updatedBBox.height);
    shapeElement.SetPos(updatedBBox.x + offset.x, updatedBBox.y + offset.y);

    // Update the inner shape content.
    const shapeContent = shapeElement.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    shapeContent.SetSize(updatedBBox.width, updatedBBox.height);
    shapeContent.SetScale(
      updatedBBox.width / this.InitialGroupBounds.width,
      updatedBBox.height / this.InitialGroupBounds.height
    );

    // Update the "slop" element, if present.
    const slopElement = shapeElement.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopElement) {
      slopElement.SetSize(updatedBBox.width, updatedBBox.height);
    }

    // Resize the SVG text object.
    this.LM_ResizeSVGTextObject(shapeElement, eventInfo, updatedBBox);

    // Reset rotation and update dimension lines.
    shapeElement.SetRotation(rotation);
    this.UpdateDimensionLines(shapeElement);

    console.log("= S.SVGFragmentSymbol | Resize Output:", {
      offset,
      shapeElement
    });
    return offset;
  }

  ResizeInTextEdit(shapeElement, newBBox) {
    console.log("= S.SVGFragmentSymbol | ResizeInTextEdit Input:", { shapeElement, newBBox });

    if (shapeElement) {
      const shapeID = shapeElement.GetID();
      if (shapeID >= 0) {
        const shapeObject = GlobalData.optManager.GetObjectPtr(shapeID, false);
        this.prevBBox = $.extend(true, {}, this.Frame);
        const offset = this.Resize(shapeElement, newBBox, shapeObject);
        console.log("= S.SVGFragmentSymbol | ResizeInTextEdit Output:", { offset });
        return offset;
      }
    }

    const defaultOffset = { x: 0, y: 0 };
    console.log("= S.SVGFragmentSymbol | ResizeInTextEdit Output:", { offset: defaultOffset });
    return defaultOffset;
  }

  CreateActionTriggers(svgDoc: any, triggerType: any, action: any, extraParams: any) {
    console.log("= S.SVGFragmentSymbol | CreateActionTriggers Input:", { svgDoc, triggerType, action, extraParams });
    const result = super.CreateActionTriggers2(svgDoc, triggerType, action, extraParams);
    console.log("= S.SVGFragmentSymbol | CreateActionTriggers Output:", result);
    return result;
  }

  BaseShape_CreateActionTriggers(svgDoc: any, triggerId: any, shape: any, additionalParams: any) {
    console.log("= S.SVGFragmentSymbol | BaseShape_CreateActionTriggers Input:", { svgDoc, triggerId, shape, additionalParams });

    const cursors = [
      Element.CursorType.RESIZE_LT,
      Element.CursorType.RESIZE_T,
      Element.CursorType.RESIZE_RT,
      Element.CursorType.RESIZE_R,
      Element.CursorType.RESIZE_RB,
      Element.CursorType.RESIZE_B,
      Element.CursorType.RESIZE_LB,
      Element.CursorType.RESIZE_L,
    ];

    if (GlobalData.optManager.Table_GetActiveID() === this.BlockID) {
      console.log("= S.SVGFragmentSymbol | BaseShape_CreateActionTriggers Output:", null);
      return null;
    }

    let connectorData,
      knobIcon,
      groupShape = svgDoc.CreateShape(ConstantData.CreateShapeType.GROUP),
      knobSize = ConstantData.Defines.SED_KnobSize,
      rKnobSize = ConstantData.Defines.SED_RKnobSize,
      sideKnobs = ((this.extraflags & ConstantData.ExtraFlags.SEDE_SideKnobs &&
        this.dataclass === ConstantData.SDRShapeTypes.SED_S_Poly) > 0),
      minSidePointLength = ConstantData.Defines.MinSidePointLength,
      docToScreenScale = svgDoc.docInfo.docToScreenScale;

    if (svgDoc.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }

    const adjustedKnobSize = knobSize / docToScreenScale,
      adjustedRKnobSize = rKnobSize / docToScreenScale,
      fillColor = 'black';
    let { x, y, width, height } = this.Frame;

    width += adjustedKnobSize;
    height += adjustedKnobSize;

    const pos = $.extend(true, {}, this.Frame);
    pos.x -= adjustedKnobSize / 2;
    pos.y -= adjustedKnobSize / 2;
    pos.width += adjustedKnobSize;
    pos.height += adjustedKnobSize;

    let rotation = shape.GetRotation() + 22.5;
    if (rotation >= 360) {
      rotation = 0;
    }

    const rotationIndex = Math.floor(rotation / 45);
    let rotatedCursors = cursors.slice(rotationIndex).concat(cursors.slice(0, rotationIndex));
    let allowProportional = true, allowHorizontal = !sideKnobs, allowVertical = !sideKnobs;

    switch (this.ObjGrow) {
      case ConstantData.GrowBehavior.HCONSTRAIN:
        allowProportional = false;
        allowVertical = false;
        break;
      case ConstantData.GrowBehavior.VCONSTRAIN:
        allowProportional = false;
        allowHorizontal = false;
        break;
      case ConstantData.GrowBehavior.PROPORTIONAL:
        allowProportional = true;
        allowHorizontal = false;
        allowVertical = false;
        break;
    }

    const knobConfig: any = {
      svgDoc: svgDoc,
      shapeType: ConstantData.CreateShapeType.RECT,
      x: 0,
      y: 0,
      knobSize: adjustedKnobSize,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false
    };

    if (triggerId !== additionalParams) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = 0.0;
    }

    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
      sideKnobs = false;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      sideKnobs = false;
      knobConfig.strokeColor = 'red';
      rotatedCursors = [
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
        Element.CursorType.DEFAULT,
      ];
    }

    // Proportional knobs (corners)
    if (allowProportional) {
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPLEFT;
      knobConfig.cursorType = rotatedCursors[0];
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursors[2];
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPRIGHT;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[4];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMRIGHT;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = 0;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[6];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMLEFT;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Vertical side knobs (top and bottom centers)
    if (allowVertical) {
      knobConfig.x = width / 2 - adjustedKnobSize / 2;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursors[1];
      knobConfig.knobID = ConstantData.ActionTriggerType.TOPCENTER;
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width / 2 - adjustedKnobSize / 2;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[5];
      knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMCENTER;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Horizontal side knobs (left and right centers)
    if (allowHorizontal) {
      knobConfig.x = 0;
      knobConfig.y = height / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = rotatedCursors[7];
      knobConfig.knobID = ConstantData.ActionTriggerType.CENTERLEFT;
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = height / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = rotatedCursors[3];
      knobConfig.knobID = ConstantData.ActionTriggerType.CENTERRIGHT;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Connector knob/icon if applicable
    connectorData = (function (obj: any) {
      let hook, result = null;
      if (obj.hooks.length) {
        hook = GlobalData.optManager.GetObjectPtr(obj.hooks[0].objid, false);
        if (hook && hook.DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR) {
          result = hook.Pr_GetShapeConnectorInfo(obj.hooks[0]);
        } else if (hook && hook instanceof Instance.Shape.ShapeContainer) {
          result = hook.Pr_GetShapeConnectorInfo(obj.hooks[0]);
        }
      }
      return result;
    })(this);

    if (connectorData && connectorData.length) {
      const iconConfig: any = {
        svgDoc: svgDoc,
        iconSize: 14,
        imageURL: null,
        iconID: 0,
        userData: 0,
        cursorType: 0
      };

      for (let w = connectorData.length, index = 0; index < w; index++) {
        if (connectorData[index].position === 'right') {
          iconConfig.x = width - 14 - 1 - adjustedKnobSize;
        } else if (connectorData[index].position === 'bottom') {
          iconConfig.y = height - 14 - 1 - adjustedKnobSize;
        } else {
          iconConfig.x = adjustedKnobSize + 1;
          iconConfig.y = adjustedKnobSize + 1;
        }
        iconConfig.cursorType = connectorData[index].cursorType;
        iconConfig.iconID = connectorData[index].knobID;
        iconConfig.imageURL = connectorData[index].polyType === 'vertical'
          ? ConstantData.Defines.Connector_Move_Vertical_Path
          : ConstantData.Defines.Connector_Move_Horizontal_Path;
        iconConfig.userData = connectorData[index].knobData;

        knobIcon = this.GenericIcon(iconConfig);
        groupShape.AddElement(knobIcon);

        iconConfig.x += 16;
      }
    }

    // Side knobs for poly shape
    if (sideKnobs) {
      const sideObj = Utils1.DeepCopy(this);
      sideObj.inside = $.extend(true, {}, sideObj.Frame);
      const polyPoints = GlobalData.optManager
        .ShapeToPolyLine(this.BlockID, false, true, sideObj)
        .GetPolyPoints(ConstantData.Defines.NPOLYPTS, true, true, false, []);

      if (polyPoints) {
        for (let i = 1, len = polyPoints.length; i < len; i++) {
          const diffX = polyPoints[i].x - polyPoints[i - 1].x,
            diffY = polyPoints[i].y - polyPoints[i - 1].y;
          if (Utils2.sqrt(diffX * diffX + diffY * diffY) > minSidePointLength) {
            knobConfig.cursorType = (diffX * diffX > diffY * diffY) ? Element.CursorType.RESIZE_TB : Element.CursorType.RESIZE_LR;
            knobConfig.x = polyPoints[i - 1].x + diffX / 2;
            knobConfig.y = polyPoints[i - 1].y + diffY / 2;
            const knob = this.GenericKnob(knobConfig);
            knob.SetUserData(i);
            groupShape.AddElement(knob);
          }
        }
      }
    }

    // Check conditions for rotation knob
    const smallWidth = this.Frame.width < 44,
      hasHooks = this.hooks.length > 0 &&
        (GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false) ?
          GlobalData.optManager.GetObjectPtr(this.hooks[0].objid, false).DrawingObjectBaseClass === ConstantData.DrawingObjectBaseClass.CONNECTOR
          : false);
    if (
      !(
        this.NoRotate() ||
        this.NoGrow() ||
        GlobalData.optManager.bTouchInitiated ||
        knobConfig.locked ||
        smallWidth ||
        hasHooks
      )
    ) {
      const isTextGrowHorizontal = this.TextGrow === ConstantData.TextGrowBehavior.HORIZONTAL &&
        (this.flags & ConstantData.ObjFlags.SEDO_TextOnly) &&
        SDF.TextAlignToWin(this.TextAlign).just === FileParser.TextJust.TA_LEFT;
      knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
      knobConfig.x = isTextGrowHorizontal ? width + adjustedRKnobSize : width - 3 * adjustedRKnobSize;
      knobConfig.y = height / 2 - adjustedRKnobSize / 2;
      knobConfig.cursorType = Element.CursorType.ROTATE;
      knobConfig.knobID = ConstantData.ActionTriggerType.ROTATE;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = 'black';
      const knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Create dimension adjustment knobs if applicable
    if ((this.Dimensions & ConstantData.DimensionFlags.SED_DF_Standoff) && this.CanUseStandOffDimensionLines()) {
      const svgObj = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(groupShape, svgObj, knobConfig);
    }

    groupShape.SetSize(width, height);
    groupShape.SetPos(pos.x, pos.y);
    groupShape.isShape = true;
    groupShape.SetID(ConstantData.Defines.Action + triggerId);

    console.log("= S.SVGFragmentSymbol | BaseShape_CreateActionTriggers Output:", groupShape);
    return groupShape;
  }

}

export default SVGFragmentSymbol
