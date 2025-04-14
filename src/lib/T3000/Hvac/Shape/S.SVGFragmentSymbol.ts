import BaseSymbol from './S.BaseSymbol'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import $ from 'jquery';
import ShapeUtil from '../Opt/Shape/ShapeUtil';
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import TextConstant from '../Data/Constant/TextConstant';
import StyleConstant from '../Data/Constant/StyleConstant';
import T3Util from '../Util/T3Util';
import Instance from '../Data/Instance/Instance';
import DataUtil from '../Opt/Data/DataUtil';

/**
 * Represents an SVG Fragment Symbol that can be inserted into documents as a reusable graphical element.
 *
 * SVGFragmentSymbol manages external SVG content as a shape element with extensive styling and
 * transformation capabilities. It handles rendering, positioning, resizing, styling, and interactive
 * behaviors for SVG fragments.
 *
 * Key features:
 * - Renders SVG fragments with configurable styling (fill colors, stroke colors, opacity)
 * - Supports transformations including scaling, rotation, and flipping
 * - Handles field data style overrides to dynamically change appearance
 * - Provides interactive resize handles and rotation controls
 * - Supports text integration with the SVG content
 * - Manages proportional, horizontal-only, or vertical-only resizing behaviors
 * - Supports connector attachment points for linking with other objects
 *
 * The symbol maintains its source SVG properties while allowing integration with the T3000
 * object system, including event handling, dimension lines, and style application.
 *
 * @extends BaseSymbol
 */
class SVGFragmentSymbol extends BaseSymbol {

  /**
   * Creates a new SVG Fragment Symbol instance
   * @param options - Configuration options for the symbol including dimensions, styling, and behavior
   */
  constructor(options: any) {
    T3Util.Log("= S.SVGFragmentSymbol | Constructor Input:", options);
    options = options || {};
    options.ShapeType = OptConstant.ShapeType.SVGFragmentSymbol;
    super(options);
    T3Util.Log("= S.SVGFragmentSymbol | Constructor Output:", this);
  }

  /**
   * Creates an SVG shape representation of this symbol
   * @param svgDocument - The SVG document where the shape will be created
   * @param enableEvents - Whether to enable event handling on the created shape
   * @returns The created SVG shape container element, or null if the shape is not visible
   */
  CreateShape(svgDocument: any, enableEvents: any) {
    T3Util.Log("= S.SVGFragmentSymbol | CreateShape Input:", { svgDocument, enableEvents });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      return null;
    }

    // Create container and symbol shapes
    const container = svgDocument.CreateShape(OptConstant.CSType.ShapeContainer);
    const symbol = svgDocument.CreateShape(OptConstant.CSType.Symbol);

    // Set up symbol properties
    symbol.SetSymbolSource(this.SVGFragment);
    symbol.SetID(OptConstant.SVGElementClass.Shape);

    const frame = this.Frame;
    const styleRecord = this.StyleRecord;
    let lineColor = styleRecord.Line.Paint.Color;
    const lineThickness = styleRecord.Line.Thickness;

    // Override with field data style if available
    let fieldDataStyle = this.GetFieldDataStyleOverride();
    if (fieldDataStyle && fieldDataStyle.strokeColor) {
      lineColor = fieldDataStyle.strokeColor;
    }

    // Set stroke color and width based on color changes flags
    if (fieldDataStyle || (this.colorchanges & (StyleConstant.ColorFilters.NCLine | StyleConstant.ColorFilters.NCStyle))) {
      symbol.SetStrokeColor(lineColor);
    }

    if (this.colorchanges & (StyleConstant.ColorFilters.NCLineThick | StyleConstant.ColorFilters.NCStyle)) {
      symbol.SetStrokeWidth(lineThickness);
    }

    // Set fill and stroke opacities
    symbol.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
    symbol.SetStrokeOpacity(styleRecord.Line.Paint.Opacity);

    // Update container and symbol sizes/positions
    const width = frame.width;
    const height = frame.height;

    symbol.SetSize(width, height);
    symbol.SetScale(width / this.InitialGroupBounds.width, height / this.InitialGroupBounds.height);

    container.SetSize(width, height);
    container.SetPos(frame.x, frame.y);

    // Apply mirror/flip effects if needed
    const flipHorizontal = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) > 0;
    const flipVertical = (this.extraflags & OptConstant.ExtraFlags.FlipVert) > 0;

    if (flipHorizontal) {
      symbol.SetMirror(flipHorizontal);
    }

    if (flipVertical) {
      symbol.SetFlip(flipVertical);
    }

    container.AddElement(symbol);
    this.ApplyStyles(symbol, styleRecord);
    this.ApplyEffects(container, false, false);

    // Create a slop shape for event handling
    const slopShape = svgDocument.CreateShape(OptConstant.CSType.Rect);
    slopShape.SetStrokeColor('white');
    slopShape.SetFillColor('none');
    slopShape.SetOpacity(0);
    slopShape.SetStrokeWidth(0);

    if (enableEvents) {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.HiddenAll);
    } else {
      slopShape.SetEventBehavior(OptConstant.EventBehavior.None);
    }

    slopShape.SetID(OptConstant.SVGElementClass.Slop);
    slopShape.ExcludeFromExport(true);
    slopShape.SetSize(width, height);

    container.AddElement(slopShape);
    container.isShape = true;

    // Add SVG text object if applicable
    if (this.DataID !== -1) {
      this.LMAddSVGTextObject(svgDocument, container);
    }

    T3Util.Log("= S.SVGFragmentSymbol | CreateShape Output:", container);
    return container;
  }

  /**
   * Applies visual styling (fill colors, gradients, textures) to an SVG fragment symbol
   * @param shapeElement - The target SVG element to apply styles to
   * @param styleRecord - The style record containing appearance information
   */
  ApplyStyles(shapeElement, styleRecord) {
    T3Util.Log("S.SVGFragmentSymbol | ApplyStyles Input:", { shapeElement, styleRecord });

    const fieldDataStyle = this.GetFieldDataStyleOverride();
    const overrideFillColor = fieldDataStyle && fieldDataStyle.fillColor;

    if (
      overrideFillColor ||
      this.colorchanges & (StyleConstant.ColorFilters.NCFill | StyleConstant.ColorFilters.NCStyle)
    ) {
      let fillType = styleRecord.Fill.Paint.FillType;
      let fillColor = styleRecord.Fill.Paint.Color;

      // Override fill color if field data style provides an override
      if (overrideFillColor) {
        fillType = NvConstant.FillTypes.Solid;
        fillColor = fieldDataStyle.fillColor;
      }

      if (fillType === NvConstant.FillTypes.Gradient) {
        shapeElement.SetFillColor(styleRecord.Fill.Paint.Color);
        shapeElement.SetGradientFill(
          this.CreateGradientRecord(
            styleRecord.Fill.Paint.GradientFlags,
            fillColor,
            styleRecord.Fill.Paint.Opacity,
            styleRecord.Fill.Paint.EndColor,
            styleRecord.Fill.Paint.EndOpacity
          )
        );
        shapeElement.fillPaintType = fillType;
      } else if (fillType === NvConstant.FillTypes.Transparent) {
        shapeElement.SetFillColor('none');
      } else {
        shapeElement.SetFillColor(fillColor);
        shapeElement.SetFillOpacity(styleRecord.Fill.Paint.Opacity);
      }
    }

    T3Util.Log("S.SVGFragmentSymbol | ApplyStyles Output:", { shapeElement });
  }

  /**
   * Resizes the SVG fragment symbol to the new dimensions
   * @param shapeElement - The SVG element representing the shape to resize
   * @param newBoundingBox - The new bounding box dimensions and position
   * @param eventInfo - Additional information about the event that triggered the resize
   * @returns Offset object with x and y values for position adjustment
   */
  Resize(shapeElement, newBoundingBox, eventInfo) {
    T3Util.Log("= S.SVGFragmentSymbol | Resize Input:", {
      shapeElement,
      newBoundingBox,
      eventInfo
    });

    // Get the current rotation, previous bounding box and calculate offset for rotation.
    const rotation = shapeElement.GetRotation();
    const previousBoundingBox = $.extend(true, {}, this.prevBBox);
    const updatedBoundingBox = $.extend(true, {}, newBoundingBox);
    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(previousBoundingBox, updatedBoundingBox, rotation);

    // Update the main shape size and position.
    shapeElement.SetSize(updatedBoundingBox.width, updatedBoundingBox.height);
    shapeElement.SetPos(updatedBoundingBox.x + offset.x, updatedBoundingBox.y + offset.y);

    // Update the inner shape content.
    const shapeContent = shapeElement.GetElementById(OptConstant.SVGElementClass.Shape);
    shapeContent.SetSize(updatedBoundingBox.width, updatedBoundingBox.height);
    shapeContent.SetScale(
      updatedBoundingBox.width / this.InitialGroupBounds.width,
      updatedBoundingBox.height / this.InitialGroupBounds.height
    );

    // Update the "slop" element, if present.
    const slopElement = shapeElement.GetElementById(OptConstant.SVGElementClass.Slop);
    if (slopElement) {
      slopElement.SetSize(updatedBoundingBox.width, updatedBoundingBox.height);
    }

    // Resize the SVG text object.
    this.LMResizeSVGTextObject(shapeElement, eventInfo, updatedBoundingBox);

    // Reset rotation and update dimension lines.
    shapeElement.SetRotation(rotation);
    this.UpdateDimensionLines(shapeElement);

    T3Util.Log("= S.SVGFragmentSymbol | Resize Output:", {
      offset,
      shapeElement
    });
    return offset;
  }

  /**
   * Handles resizing of the SVG fragment during text editing operations
   * @param shapeElement - The SVG element representing the shape to resize
   * @param newBoundingBox - The new bounding box dimensions and position
   * @returns Offset object with x and y values for position adjustment
   */
  ResizeInTextEdit(shapeElement, newBoundingBox) {
    T3Util.Log("= S.SVGFragmentSymbol | ResizeInTextEdit Input:", { shapeElement, newBoundingBox });

    if (shapeElement) {
      const shapeID = shapeElement.GetID();
      if (shapeID >= 0) {
        const shapeObject = DataUtil.GetObjectPtr(shapeID, false);
        this.prevBBox = $.extend(true, {}, this.Frame);
        const offset = this.Resize(shapeElement, newBoundingBox, shapeObject);
        T3Util.Log("= S.SVGFragmentSymbol | ResizeInTextEdit Output:", { offset });
        return offset;
      }
    }

    const defaultOffset = { x: 0, y: 0 };
    T3Util.Log("= S.SVGFragmentSymbol | ResizeInTextEdit Output:", { offset: defaultOffset });
    return defaultOffset;
  }

  /**
   * Creates interactive trigger elements for the SVG fragment symbol
   * @param svgDocument - The SVG document where the triggers will be created
   * @param triggerType - The type of trigger to create
   * @param actionHandler - The handler that processes actions when triggers are activated
   * @param additionalParameters - Additional parameters for configuring the triggers
   * @returns The created trigger elements
   */
  CreateActionTriggers(svgDocument, triggerType, actionHandler, additionalParameters) {
    T3Util.Log("= S.SVGFragmentSymbol | CreateActionTriggers Input:", {
      svgDocument,
      triggerType,
      actionHandler,
      additionalParameters
    });
    const result = super.CreateActionTriggers2(svgDocument, triggerType, actionHandler, additionalParameters);
    T3Util.Log("= S.SVGFragmentSymbol | CreateActionTriggers Output:", result);
    return result;
  }

  /**
   * Creates action triggers (resize handles, rotate knob, etc.) for the SVG fragment symbol
   * @param svgDoc - The SVG document where the triggers will be created
   * @param triggerId - The ID for the trigger element
   * @param shape - The shape element to add triggers to
   * @param additionalParams - Additional parameters for configuring the triggers
   * @returns The group shape containing all trigger elements
   */
  BaseShapeCreateActionTriggers(svgDoc: any, triggerId: any, shape: any, additionalParams: any) {
    T3Util.Log("= S.SVGFragmentSymbol | BaseShapeCreateActionTriggers Input:", { svgDoc, triggerId, shape, additionalParams });

    const cursors = [
      CursorConstant.CursorType.ResizeLT,
      CursorConstant.CursorType.ResizeT,
      CursorConstant.CursorType.ResizeRT,
      CursorConstant.CursorType.ResizeR,
      CursorConstant.CursorType.ResizeRB,
      CursorConstant.CursorType.ResizeB,
      CursorConstant.CursorType.ResizeLB,
      CursorConstant.CursorType.ResizeL,
    ];

    let connectorData,
      knobIcon,
      groupShape = svgDoc.CreateShape(OptConstant.CSType.Group),
      knobSize = OptConstant.Common.KnobSize,
      rKnobSize = OptConstant.Common.RKnobSize,
      hasSideKnobs = (this.extraflags & OptConstant.ExtraFlags.SideKnobs &&
        this.dataclass === PolygonConstant.ShapeTypes.POLYGON),
      minSidePointLength = OptConstant.Common.MinSidePointLength,
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

    const position = $.extend(true, {}, this.Frame);
    position.x -= adjustedKnobSize / 2;
    position.y -= adjustedKnobSize / 2;
    position.width += adjustedKnobSize;
    position.height += adjustedKnobSize;

    // Calculate cursor orientation based on rotation
    let rotation = shape.GetRotation() + 22.5;
    if (rotation >= 360) {
      rotation = 0;
    }

    const rotationIndex = Math.floor(rotation / 45);
    let rotatedCursors = cursors.slice(rotationIndex).concat(cursors.slice(0, rotationIndex));
    let allowProportional = true, allowHorizontal = !hasSideKnobs, allowVertical = !hasSideKnobs;

    // Determine allowed resize behaviors based on object growth properties
    switch (this.ObjGrow) {
      case OptConstant.GrowBehavior.Horiz:
        allowProportional = false;
        allowVertical = false;
        break;
      case OptConstant.GrowBehavior.Vertical:
        allowProportional = false;
        allowHorizontal = false;
        break;
      case OptConstant.GrowBehavior.ProPortional:
        allowProportional = true;
        allowHorizontal = false;
        allowVertical = false;
        break;
    }

    // Configure basic knob appearance and behavior
    const knobConfig: any = {
      svgDoc: svgDoc,
      shapeType: OptConstant.CSType.Rect,
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

    // Adjust knob appearance for locked or non-resizable shapes
    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
      hasSideKnobs = false;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      hasSideKnobs = false;
      knobConfig.strokeColor = 'red';
      rotatedCursors = [
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
        CursorConstant.CursorType.Default,
      ];
    }

    // Create proportional knobs (corners)
    if (allowProportional) {
      knobConfig.knobID = OptConstant.ActionTriggerType.TopLeft;
      knobConfig.cursorType = rotatedCursors[0];
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursors[2];
      knobConfig.knobID = OptConstant.ActionTriggerType.TopRight;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[4];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomRight;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = 0;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[6];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomLeft;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Create vertical side knobs (top and bottom centers)
    if (allowVertical) {
      knobConfig.x = width / 2 - adjustedKnobSize / 2;
      knobConfig.y = 0;
      knobConfig.cursorType = rotatedCursors[1];
      knobConfig.knobID = OptConstant.ActionTriggerType.TopCenter;
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width / 2 - adjustedKnobSize / 2;
      knobConfig.y = height - adjustedKnobSize;
      knobConfig.cursorType = rotatedCursors[5];
      knobConfig.knobID = OptConstant.ActionTriggerType.BottomCenter;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Create horizontal side knobs (left and right centers)
    if (allowHorizontal) {
      knobConfig.x = 0;
      knobConfig.y = height / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = rotatedCursors[7];
      knobConfig.knobID = OptConstant.ActionTriggerType.CenterLeft;
      let knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);

      knobConfig.x = width - adjustedKnobSize;
      knobConfig.y = height / 2 - adjustedKnobSize / 2;
      knobConfig.cursorType = rotatedCursors[3];
      knobConfig.knobID = OptConstant.ActionTriggerType.CenterRight;
      knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Get connector information if applicable
    connectorData = (function (obj: any) {
      let hook, result = null;
      if (obj.hooks.length) {
        hook = DataUtil.GetObjectPtr(obj.hooks[0].objid, false);
        if (hook && hook.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
          result = hook.PrGetShapeConnectorInfo(obj.hooks[0]);
        } else if (hook && hook instanceof Instance.Shape.ShapeContainer) {
          result = hook.PrGetShapeConnectorInfo(obj.hooks[0]);
        }
      }
      return result;
    })(this);

    // Create connector icons if connectors exist
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
          ? OptConstant.Common.ConMoveVerticalPath
          : OptConstant.Common.ConMoveHorizontalPath;
        iconConfig.userData = connectorData[index].knobData;

        knobIcon = this.GenericIcon(iconConfig);
        groupShape.AddElement(knobIcon);

        iconConfig.x += 16;
      }
    }

    // Create side knobs for polygon shapes
    if (hasSideKnobs) {
      const sideObj = Utils1.DeepCopy(this);
      sideObj.inside = $.extend(true, {}, sideObj.Frame);
      const polyPoints = T3Gv.opt
        .ShapeToPolyLine(this.BlockID, false, true, sideObj)
        .GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, []);

      if (polyPoints) {
        for (let i = 1, len = polyPoints.length; i < len; i++) {
          const diffX = polyPoints[i].x - polyPoints[i - 1].x,
            diffY = polyPoints[i].y - polyPoints[i - 1].y;
          if (Utils2.sqrt(diffX * diffX + diffY * diffY) > minSidePointLength) {
            knobConfig.cursorType = (diffX * diffX > diffY * diffY) ? CursorConstant.CursorType.ResizeTB : CursorConstant.CursorType.ResizeLR;
            knobConfig.x = polyPoints[i - 1].x + diffX / 2;
            knobConfig.y = polyPoints[i - 1].y + diffY / 2;
            const knob = this.GenericKnob(knobConfig);
            knob.SetUserData(i);
            groupShape.AddElement(knob);
          }
        }
      }
    }

    // Check conditions for adding rotation knob
    const tooSmallForRotation = this.Frame.width < 44,
      hasConnectorHooks = this.hooks.length > 0 &&
        (DataUtil.GetObjectPtr(this.hooks[0].objid, false) ?
          DataUtil.GetObjectPtr(this.hooks[0].objid, false).DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector
          : false);

    if (
      !(
        this.NoRotate() ||
        this.NoGrow() ||
        T3Gv.opt.touchInitiated ||
        knobConfig.locked ||
        tooSmallForRotation ||
        hasConnectorHooks
      )
    ) {
      const isTextGrowHorizontal = this.TextGrow === NvConstant.TextGrowBehavior.Horizontal &&
        (this.flags & NvConstant.ObjFlags.TextOnly) &&
        ShapeUtil.TextAlignToWin(this.TextAlign).just === TextConstant.TextJust.Left;

      knobConfig.shapeType = OptConstant.CSType.Oval;
      knobConfig.x = isTextGrowHorizontal ? width + adjustedRKnobSize : width - 3 * adjustedRKnobSize;
      knobConfig.y = height / 2 - adjustedRKnobSize / 2;
      knobConfig.cursorType = CursorConstant.CursorType.Rotate;
      knobConfig.knobID = OptConstant.ActionTriggerType.Rotate;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = 'black';
      const knob = this.GenericKnob(knobConfig);
      groupShape.AddElement(knob);
    }

    // Create dimension adjustment knobs if applicable
    if ((this.Dimensions & NvConstant.DimensionFlags.Standoff) && this.CanUseStandOffDimensionLines()) {
      const svgObj = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID.toString());
      this.CreateDimensionAdjustmentKnobs(groupShape, svgObj, knobConfig);
    }

    // Set final group properties
    groupShape.SetSize(width, height);
    groupShape.SetPos(position.x, position.y);
    groupShape.isShape = true;
    groupShape.SetID(OptConstant.Common.Action + triggerId);

    T3Util.Log("= S.SVGFragmentSymbol | BaseShapeCreateActionTriggers Output:", groupShape);
    return groupShape;
  }
}

export default SVGFragmentSymbol
