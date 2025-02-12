


import Utils2 from "../Helper/Utils2"
import GlobalData from '../Data/GlobalData'
import Document from '../Basic/Basic.Document'
import Element from '../Basic/Basic.Element'
import ConstantData from '../Data/ConstantData'
import BaseShape from './Shape.BaseShape'

class BaseSymbol extends BaseShape {

  constructor(config: any) {
    // Log the input parameters
    console.log("= S.BaseSymbol Input:", config);

    config = config || {};
    config.ObjGrow = ConstantData.GrowBehavior.PROPORTIONAL;
    config.ResizeAspectConstrain = true;

    // Call the base class constructor with the updated config
    super(config);
    console.log("= S.BaseSymbol After super, config:", config);

    this.nativeDataArrayBuffer = config.nativeDataArrayBuffer || null;
    this.SymbolData = config.SymbolData || null;

    // Log the output state of the instance
    console.log("= S.BaseSymbol Instance created with nativeDataArrayBuffer:", this.nativeDataArrayBuffer, "and SymbolData:", this.SymbolData);
  }

  CreateActionTriggers(e: any, t: any, a: any, r: any) {
    console.log("= S.BaseSymbol CreateActionTriggers input:", { e, t, a, r });

    // Define cursors for all resize directions
    const cursors = [
      Element.CursorType.RESIZE_LT,
      Element.CursorType.RESIZE_T,
      Element.CursorType.RESIZE_RT,
      Element.CursorType.RESIZE_R,
      Element.CursorType.RESIZE_RB,
      Element.CursorType.RESIZE_B,
      Element.CursorType.RESIZE_LB,
      Element.CursorType.RESIZE_L
    ];

    // Create a group shape
    const groupShape = e.CreateShape(Document.CreateShapeType.GROUP);

    const knobSizeDefine = ConstantData.Defines.SED_KnobSize;
    const rKnobSizeDefine = ConstantData.Defines.SED_RKnobSize;
    let docScale = e.docInfo.docToScreenScale;

    if (e.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }

    const knobSize = knobSizeDefine / docScale;
    const rKnobSize = rKnobSizeDefine / docScale;

    // Obtain the current frame and adjust dimensions for knob size.
    const frame = this.Frame;
    const width = frame.width + knobSize;
    const height = frame.height + knobSize;

    // Adjust frame position to account for knob size.
    const adjustedFrame = $.extend(true, {}, frame);
    adjustedFrame.x -= knobSize / 2;
    adjustedFrame.y -= knobSize / 2;
    adjustedFrame.width += knobSize;
    adjustedFrame.height += knobSize;

    // Rotate and reorder cursor list.
    let rotation = a.GetRotation() + 22.5;
    if (rotation >= 360) {
      rotation = 0;
    }
    const section = Math.floor(rotation / 45);
    let orderedCursors = cursors.slice(section).concat(cursors.slice(0, section));

    // Build the initial knob configuration.
    const knobConfig: any = {
      svgDoc: e,
      shapeType: Document.CreateShapeType.RECT,
      x: 0,
      y: 0,
      knobSize: knobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false,
      knobID: ConstantData.ActionTriggerType.TOPLEFT,
      cursorType: orderedCursors[0]
    };

    // Adjust knob configuration if t and r are different.
    if (t !== r) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = 0;
    }

    // If shape is locked or cannot grow, update knob configuration.
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      knobConfig.strokeColor = 'red';
      // Use default cursors when growth is not allowed.
      orderedCursors = new Array(8).fill(Element.CursorType.DEFAULT);
    }

    // Create Top-Left knob.
    let knob = this.GenericKnob(knobConfig);
    groupShape.AddElement(knob);

    // Create Top-Right knob.
    knobConfig.x = width - knobSize;
    knobConfig.y = 0;
    knobConfig.cursorType = orderedCursors[2];
    knobConfig.knobID = ConstantData.ActionTriggerType.TOPRIGHT;
    knob = this.GenericKnob(knobConfig);
    groupShape.AddElement(knob);

    // Create Bottom-Right knob.
    knobConfig.x = width - knobSize;
    knobConfig.y = height - knobSize;
    knobConfig.cursorType = orderedCursors[4];
    knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMRIGHT;
    knob = this.GenericKnob(knobConfig);
    groupShape.AddElement(knob);

    // Create Bottom-Left knob.
    knobConfig.x = 0;
    knobConfig.y = height - knobSize;
    knobConfig.cursorType = orderedCursors[6];
    knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMLEFT;
    knob = this.GenericKnob(knobConfig);
    groupShape.AddElement(knob);

    // Finalize groupShape dimensions and position.
    groupShape.SetSize(width, height);
    groupShape.SetPos(adjustedFrame.x, adjustedFrame.y);
    groupShape.isShape = true;
    groupShape.SetID(ConstantData.Defines.Action + t);

    console.log("= S.BaseSymbol CreateActionTriggers output:", groupShape);
    return groupShape;
  }

  ChangeShape(e: any, t: any, a: any, r: any, i: any): boolean {
    console.log("= S.BaseSymbol ChangeShape input:", { e, t, a, r, i });

    // Add your shape change logic here. Currently, it returns false.
    const result = false;

    console.log("= S.BaseSymbol ChangeShape output:", result);
    return result;
  }

  Flip(flipFlags: number) {
    console.log("= S.BaseSymbol Flip input:", flipFlags);

    // Retrieve element by BlockID (result is not used further)
    const element = GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Flip horizontally if the flag is set
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      const isFlippedHorizontally = Boolean(this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz);
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipHoriz,
        !isFlippedHorizontally
      );
    }

    // Flip vertically if the flag is set
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      const isFlippedVertically = Boolean(this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert);
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipVert,
        !isFlippedVertically
      );
    }

    console.log("= S.BaseSymbol Flip output, new extraflags:", this.extraflags);
  }
}

export default BaseSymbol


