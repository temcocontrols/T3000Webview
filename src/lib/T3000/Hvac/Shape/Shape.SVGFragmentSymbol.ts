


import BaseSymbol from './Shape.BaseShape'
import GlobalData from '../Data/GlobalData'
import Element from "../Basic/Basic.Element"
import ConstantData from '../Data/ConstantData'

class SVGFragmentSymbol extends BaseSymbol {

  constructor(options: any) {
    console.log("= S.SVGFragmentSymbol: constructor input:", options);

    // Ensure the options object is defined and set the shape type.
    options = options || {};
    options.ShapeType = ConstantData.ShapeType.SVGFRAGMENTSYMBOL;

    // Call the base class constructor.
    super(options);

    console.log("= S.SVGFragmentSymbol: constructor output:", this);
  }

  CreateShape(shapeCreator, eventToggle) {
    console.log("= S.SVGFragmentSymbol: CreateShape input:", { shapeCreator, eventToggle });

    // Return null if shape is not visible
    if (this.flags & ConstantData.ObjFlags.SEDO_NotVisible) {
      console.log("= S.SVGFragmentSymbol: CreateShape not visible, returning null");
      return null;
    }

    // Create container and symbol shapes
    const shapeContainer = shapeCreator.CreateShape(ConstantData.CreateShapeType.SHAPECONTAINER);
    const symbolShape = shapeCreator.CreateShape(ConstantData.CreateShapeType.SYMBOL);

    // Setup symbol properties
    symbolShape.SetSymbolSource(this.SVGFragment);
    symbolShape.SetID(ConstantData.SVGElementClass.SHAPE);

    // Retrieve frame and style information
    const frame = this.Frame;
    const styleRecord = this.StyleRecord;
    let lineColor = styleRecord.Line.Paint.Color;
    const lineThickness = styleRecord.Line.Thickness;
    const fieldStyleOverride = this.GetFieldDataStyleOverride();
    const strokeColorOverride = fieldStyleOverride && fieldStyleOverride.strokeColor;

    if (strokeColorOverride) {
      lineColor = strokeColorOverride;
    }

    // Apply stroke color if needed
    if (
      strokeColorOverride ||
      (this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_LINE | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE))
    ) {
      symbolShape.SetStrokeColor(lineColor);
    }

    // Apply stroke width if needed
    if (this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_LINETHICK | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE)) {
      symbolShape.SetStrokeWidth(lineThickness);
    }

    // Set opacities for fill and stroke
    symbolShape.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
    symbolShape.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);

    // Set container and symbol sizes and positions
    const width = frame.width;
    const height = frame.height;
    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(frame.x, frame.y);
    symbolShape.SetSize(width, height);
    symbolShape.SetScale(width / this.InitialGroupBounds.width, height / this.InitialGroupBounds.height);

    // Apply flipping if required
    const isFlipHoriz = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) > 0;
    const isFlipVert = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) > 0;
    if (isFlipHoriz) {
      symbolShape.SetMirror(true);
    }
    if (isFlipVert) {
      symbolShape.SetFlip(true);
    }

    // Add symbol shape to container and apply extra styles/effects
    shapeContainer.AddElement(symbolShape);
    this.ApplyStyles(symbolShape, styleRecord);
    this.ApplyEffects(shapeContainer, false, false);

    // Create an invisible "slop" shape for event handling
    const slopShape = shapeCreator.CreateShape(ConstantData.CreateShapeType.RECT);
    slopShape.SetStrokeColor("white");
    slopShape.SetFillColor("none");
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(0);
    if (eventToggle) {
      slopShape.SetEventBehavior(ConstantData.EventBehavior.HIDDEN_ALL);
    } else {
      slopShape.SetEventBehavior(ConstantData.EventBehavior.NONE);
    }
    slopShape.SetID(ConstantData.SVGElementClass.SLOP);
    slopShape.ExcludeFromExport(true);
    slopShape.SetSize(width, height);
    shapeContainer.AddElement(slopShape);

    shapeContainer.isShape = true;

    // Add text object if applicable
    if (this.DataID !== -1) {
      this.LM_AddSVGTextObject(shapeCreator, shapeContainer);
    }

    console.log("= S.SVGFragmentSymbol: CreateShape output:", shapeContainer);
    return shapeContainer;
  }

  ApplyStyles(element, styleRecord) {
    console.log("= S.SVGFragmentSymbol: ApplyStyles input:", { element, styleRecord });

    const fieldStyleOverride = this.GetFieldDataStyleOverride();
    const overrideFillColor = fieldStyleOverride && fieldStyleOverride.fillColor;

    if (
      overrideFillColor ||
      this.colorchanges & (FileParser.SDRColorFilters.SD_NOCOLOR_FILL | FileParser.SDRColorFilters.SD_NOCOLOR_STYLE)
    ) {
      let fillType = styleRecord.Fill.Paint.FillType;
      let fillColor = styleRecord.Fill.Paint.Color;

      if (overrideFillColor) {
        fillType = ConstantData.FillTypes.SDFILL_SOLID;
        fillColor = overrideFillColor;
      }

      if (fillType === ConstantData.FillTypes.SDFILL_GRADIENT) {
        element.SetFillColor(styleRecord.Fill.Paint.Color);
        element.SetGradientFill(
          this.CreateGradientRecord(
            styleRecord.Fill.Paint.GradientFlags,
            fillColor,
            styleRecord.Fill.Paint.Opacity,
            styleRecord.Fill.Paint.EndColor,
            styleRecord.Fill.Paint.EndOpacity
          )
        );
        element.fillPaintType = fillType;
      } else if (fillType === ConstantData.FillTypes.SDFILL_TEXTURE) {
        const texture = styleRecord.Fill.Paint.Texture;
        const textureData = GlobalData.optManager.TextureList.Textures[texture];

        if (textureData) {
          const textureOptions = {
            url:
              textureData.ImageURL ||
              Constants.FilePath_CMSRoot + Constants.FilePath_Textures + textureData.filename,
            scale: GlobalData.optManager.CalcTextureScale(styleRecord.Fill.Paint.TextureScale, textureData.dim.x),
            alignment: styleRecord.Fill.Paint.TextureScale.AlignmentScalar,
            dim: textureData.dim
          };
          styleRecord.Fill.Paint.TextureScale.Scale = textureOptions.scale;
          element.SetTextureFill(textureOptions);
        }
      } else if (fillType === ConstantData.FillTypes.SDFILL_TRANSPARENT) {
        element.SetFillColor("none");
      } else {
        element.SetFillColor(fillColor);
        element.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      }
    }

    console.log("= S.SVGFragmentSymbol: ApplyStyles output:", { element });
  }

  Resize(element, newSize, target) {
    console.log("= S.SVGFragmentSymbol: Resize input:", { element, newSize, target });

    // Get the current rotation and copy previous bounding box and new size objects
    const rotation = element.GetRotation();
    const previousBBox = $.extend(true, {}, this.prevBBox);
    const currentSize = $.extend(true, {}, newSize);

    // Calculate the offset required due to rotation while resizing
    const offset = GlobalData.optManager.svgDoc.CalculateRotatedOffsetForResize(previousBBox, currentSize, rotation);

    // Update the main element size and position using the calculated offset
    element.SetSize(newSize.width, newSize.height);
    element.SetPos(newSize.x + offset.x, newSize.y + offset.y);

    // Update the inner shape element's size and scaling
    const shape = element.GetElementByID(ConstantData.SVGElementClass.SHAPE);
    shape.SetSize(newSize.width, newSize.height);
    shape.SetScale(
      newSize.width / this.InitialGroupBounds.width,
      newSize.height / this.InitialGroupBounds.height
    );

    // Update the invisible "slop" shape used for event handling
    const slopElement = element.GetElementByID(ConstantData.SVGElementClass.SLOP);
    if (slopElement) {
      slopElement.SetSize(newSize.width, newSize.height);
    }

    // Resize and reposition the text object (if exists)
    this.LM_ResizeSVGTextObject(element, target, newSize);

    // Restore the element's rotation and update dimension lines
    element.SetRotation(rotation);
    this.UpdateDimensionLines(element);

    console.log("= S.SVGFragmentSymbol: Resize output:", { offset });
    return offset;
  }

  ResizeInTextEdit(element, newSize) {
    console.log("= S.SVGFragmentSymbol: ResizeInTextEdit input:", { element, newSize });

    if (element) {
      const elementId = element.GetID();
      if (elementId >= 0) {
        const targetObject = GlobalData.optManager.GetObjectPtr(elementId, false);
        this.prevBBox = $.extend(true, {}, this.Frame);
        const offset = this.Resize(element, newSize, targetObject);
        console.log("= S.SVGFragmentSymbol: ResizeInTextEdit output:", { offset });
        return offset;
      }
    }

    const defaultOffset = { x: 0, y: 0 };
    console.log("= S.SVGFragmentSymbol: ResizeInTextEdit output:", { defaultOffset });
    return defaultOffset;
  }

  CreateActionTriggers(triggerEvent, triggerType, triggerAction, response) {
    console.log("= S.SVGFragmentSymbol: CreateActionTriggers input:", {
      triggerEvent,
      triggerType,
      triggerAction,
      response
    });
  }
}

export default SVGFragmentSymbol


