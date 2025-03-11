

import BaseShape from './S.BaseShape'
import Utils1 from '../Helper/Utils1';
import Utils2 from "../Helper/Utils2";
import Utils3 from "../Helper/Utils3";
import GlobalData from '../Data/T3Gv'
import Document from '../Basic/B.Document'
import Element from '../Basic/B.Element';
import ConstantData from '../Data/ConstantData'
import $ from 'jquery';

class BaseSymbol extends BaseShape {

  constructor(options: any) {
    // Log input parameters
    console.log("S.BaseSymbol - Constructor input:", options);

    // Ensure options is initialized and set readable property names
    options = options || {};
    options.ObjGrow = ConstantData.GrowBehavior.PROPORTIONAL;
    options.ResizeAspectConstrain = true;

    // Call the parent constructor with the modified options
    super(options);

    // Assign additional properties with defaults
    this.nativeDataArrayBuffer = options.nativeDataArrayBuffer || null;
    this.SymbolData = options.SymbolData || null;

    // Log the state after construction
    console.log("S.BaseSymbol - Constructor output:", this);
  }

  CreateActionTriggers2(svgDocument: any, triggerId: any, actionHandler: any, releaseHandler: any) {
    console.log("S.BaseSymbol - CreateActionTriggers2 input:", { svgDocument, triggerId, actionHandler, releaseHandler });
    const result = super.CreateActionTriggers(svgDocument, triggerId, actionHandler, releaseHandler);
    console.log("S.BaseSymbol - CreateActionTriggers2 output:", result);
    return result;
  }

  CreateActionTriggers(svgDocument, triggerId, actionHandler, releaseHandler) {
    console.log("S.BaseSymbol - CreateActionTriggers input:", { svgDocument, triggerId, actionHandler, releaseHandler });

    // List of cursor types for resize handles
    const resizeCursorTypes = [
      Element.CursorType.RESIZE_LT,
      Element.CursorType.RESIZE_T,
      Element.CursorType.RESIZE_RT,
      Element.CursorType.RESIZE_R,
      Element.CursorType.RESIZE_RB,
      Element.CursorType.RESIZE_B,
      Element.CursorType.RESIZE_LB,
      Element.CursorType.RESIZE_L
    ];

    // Create a group shape to hold all knob elements
    const knobGroup = svgDocument.CreateShape(ConstantData.CreateShapeType.GROUP);

    const knobSize = ConstantData.Defines.SED_KnobSize;
    const rotatedKnobSize = ConstantData.Defines.SED_RKnobSize;
    let docToScreenScale = svgDocument.docInfo.docToScreenScale;
    if (svgDocument.docInfo.docScale <= 0.5) {
      docToScreenScale *= 2;
    }

    const scaleKnobSize = knobSize / docToScreenScale;
    const scaleRotatedKnobSize = rotatedKnobSize / docToScreenScale;

    const frame = this.Frame;
    let frameWidth = frame.width;
    let frameHeight = frame.height;

    // Increase frame size to account for knob rendering
    frameWidth += scaleKnobSize;
    frameHeight += scaleKnobSize;

    // Adjust the frame boundaries
    const adjustedFrame = $.extend(true, {}, frame);
    adjustedFrame.x -= scaleKnobSize / 2;
    adjustedFrame.y -= scaleKnobSize / 2;
    adjustedFrame.width += scaleKnobSize;
    adjustedFrame.height += scaleKnobSize;

    // Calculate rotation adjustment for proper knob positioning
    let rotationAngle = actionHandler.GetRotation() + 22.5;
    if (rotationAngle >= 360) {
      rotationAngle = 0;
    }
    const quadrantIndex = Math.floor(rotationAngle / 45);
    const adjustedCursorTypes = resizeCursorTypes.slice(quadrantIndex).concat(resizeCursorTypes.slice(0, quadrantIndex));

    // Default configuration for knob creation
    const knobConfig = {
      svgDoc: svgDocument,
      shapeType: ConstantData.CreateShapeType.RECT,
      x: 0,
      y: 0,
      knobSize: scaleKnobSize,
      fillColor: 'black',
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false
    };

    // Adjust knob configuration based on trigger and release handler comparison
    if (triggerId !== releaseHandler) {
      knobConfig.fillColor = 'white';
      knobConfig.strokeSize = 1;
      knobConfig.strokeColor = 'black';
      knobConfig.fillOpacity = 0;
    }

    // Check if the symbol is locked or not growable
    if (this.flags & ConstantData.ObjFlags.SEDO_Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      knobConfig.strokeColor = 'red';
      // Override all cursor types if shape cannot grow
      for (let index = 0; index < 8; index++) {
        adjustedCursorTypes[index] = Element.CursorType.DEFAULT;
      }
    }

    // Create top-left knob
    knobConfig.knobID = ConstantData.ActionTriggerType.TOPLEFT;
    knobConfig.cursorType = adjustedCursorTypes[0];
    let knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create top-right knob
    knobConfig.x = frameWidth - scaleKnobSize;
    knobConfig.y = 0;
    knobConfig.cursorType = adjustedCursorTypes[2];
    knobConfig.knobID = ConstantData.ActionTriggerType.TOPRIGHT;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create bottom-right knob
    knobConfig.x = frameWidth - scaleKnobSize;
    knobConfig.y = frameHeight - scaleKnobSize;
    knobConfig.cursorType = adjustedCursorTypes[4];
    knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMRIGHT;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create bottom-left knob
    knobConfig.x = 0;
    knobConfig.y = frameHeight - scaleKnobSize;
    knobConfig.cursorType = adjustedCursorTypes[6];
    knobConfig.knobID = ConstantData.ActionTriggerType.BOTTOMLEFT;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Conditionally create the rotate knob if allowed
    if (!GlobalData.optManager.bTouchInitiated && !knobConfig.locked && !this.NoGrow()) {
      knobConfig.shapeType = ConstantData.CreateShapeType.OVAL;
      knobConfig.x = frameWidth - 3 * scaleRotatedKnobSize;
      knobConfig.y = frameHeight / 2 - scaleRotatedKnobSize / 2;
      knobConfig.cursorType = Element.CursorType.ROTATE;
      knobConfig.knobID = ConstantData.ActionTriggerType.ROTATE;
      knobConfig.fillColor = 'white';
      knobConfig.fillOpacity = 0.001;
      knobConfig.strokeSize = 1.5;
      knobConfig.strokeColor = '#555555';
      knobElement = this.GenericKnob(knobConfig);
      knobGroup.AddElement(knobElement);
    }

    // Finalize the knob group configuration
    knobGroup.SetSize(frameWidth, frameHeight);
    knobGroup.SetPos(adjustedFrame.x, adjustedFrame.y);
    knobGroup.isShape = true;
    knobGroup.SetID(ConstantData.Defines.Action + triggerId);

    console.log("S.BaseSymbol - CreateActionTriggers output:", knobGroup);
    return knobGroup;
  }

  ChangeShape(event: any, targetElement: any, newProperties: any, previousState: any, additionalData: any): boolean {
    console.log("S.BaseSymbol - ChangeShape input:", { event, targetElement, newProperties, previousState, additionalData });
    const result = false;
    console.log("S.BaseSymbol - ChangeShape output:", result);
    return result;
  }

  Flip(flipFlags: number) {
    console.log("S.BaseSymbol - Flip input:", flipFlags);

    // Retrieve the element by block ID (for potential further operations)
    GlobalData.optManager.svgObjectLayer.GetElementByID(this.BlockID);

    // Process horizontal flip if the corresponding flag is set in the input parameter
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipHoriz) {
      const isCurrentlyFlippedHoriz = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipHoriz) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipHoriz,
        !isCurrentlyFlippedHoriz
      );
    }

    // Process vertical flip if the corresponding flag is set in the input parameter
    if (flipFlags & ConstantData.ExtraFlags.SEDE_FlipVert) {
      const isCurrentlyFlippedVert = (this.extraflags & ConstantData.ExtraFlags.SEDE_FlipVert) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        ConstantData.ExtraFlags.SEDE_FlipVert,
        !isCurrentlyFlippedVert
      );
    }

    console.log("S.BaseSymbol - Flip output:", this.extraflags);
  }

  LM_ActionPreTrack(event: any, trigger: any): void {
    console.log("S.BaseSymbol - LM_ActionPreTrack input:", { event, trigger });

    if (this.DataID !== -1) {
      if (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA ||
        this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB) {
        GlobalData.optManager.theActionSVGObject.textElem.SetVisible(false);
      }
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, ConstantData.FloatingPointDim.SD_FP_Height, false);
    }

    console.log("S.BaseSymbol - LM_ActionPreTrack output: completed");
  }

  LM_ActionPostRelease(event: any): void {
    console.log("S.BaseSymbol - LM_ActionPostRelease input:", event);

    if (this.DataID !== -1) {
      if (
        (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachA) ||
        (this.TextFlags & ConstantData.TextFlags.SED_TF_AttachB)
      ) {
        GlobalData.optManager.theActionSVGObject.textElem.SetVisible(true);
      }
    }

    GlobalData.optManager.SetEditMode(ConstantData.EditState.DEFAULT);
    GlobalData.optManager.UpdateLinks();
    GlobalData.optManager.LinkParams = null;

    this.sizedim.width = this.Frame.width;
    this.sizedim.height = this.Frame.height;

    console.log("S.BaseSymbol - LM_ActionPostRelease output: completed");
  }

}

export default BaseSymbol


