

import BaseShape from './S.BaseShape'
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import $ from 'jquery';
import OptConstant from '../Data/Constant/OptConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import T3Util from '../Util/T3Util';
import OptCMUtil from '../Opt/Opt/OptCMUtil';

/**
 * Represents a base symbol shape in the T3000 HVAC visualization system.
 * This class extends BaseShape to provide specialized symbol handling with
 * interactive manipulation capabilities including resizing, rotation, and flipping.
 *
 * BaseSymbol manages:
 * - Symbol data initialization and rendering
 * - Interactive control knobs for manipulation (resize, rotate)
 * - User interaction handling during symbol editing
 * - Visual state management including locked and growth constraints
 *
 * @extends BaseShape
 *
 * @example
 * ```typescript
 * // Create a new symbol with custom options
 * const symbolOptions = {
 *   nativeDataArrayBuffer: myDataBuffer,
 *   SymbolData: mySymbolData,
 *   // Other shape options like position, size, etc.
 *   x: 100,
 *   y: 100,
 *   width: 200,
 *   height: 150
 * };
 *
 * const mySymbol = new BaseSymbol(symbolOptions);
 *
 * // Add to a document
 * svgDocument.AddElement(mySymbol);
 *
 * // Flip the symbol horizontally
 * mySymbol.Flip(OptConstant.ExtraFlags.FlipHoriz);
 * ```
 */
class BaseSymbol extends BaseShape {

  constructor(options: any) {
    // Log input parameters
    T3Util.Log("S.BaseSymbol - Constructor input:", options);

    // Ensure options is initialized and set readable property names
    options = options || {};
    options.ObjGrow = OptConstant.GrowBehavior.ProPortional;
    options.ResizeAspectConstrain = true;

    // Call the parent constructor with the modified options
    super(options);

    // Assign additional properties with defaults
    this.nativeDataArrayBuffer = options.nativeDataArrayBuffer || null;
    this.SymbolData = options.SymbolData || null;

    // Log the state after construction
    T3Util.Log("S.BaseSymbol - Constructor output:", this);
  }

  CreateActionTriggers2(svgDocument: any, triggerId: any, actionHandler: any, releaseHandler: any) {
    T3Util.Log("S.BaseSymbol - CreateActionTriggers2 input:", { svgDocument, triggerId, actionHandler, releaseHandler });
    const result = super.CreateActionTriggers(svgDocument, triggerId, actionHandler, releaseHandler);
    T3Util.Log("S.BaseSymbol - CreateActionTriggers2 output:", result);
    return result;
  }

  CreateActionTriggers(svgDocument, triggerId, actionHandler, releaseHandler) {
    T3Util.Log("S.BaseSymbol - CreateActionTriggers input:", { svgDocument, triggerId, actionHandler, releaseHandler });

    // List of cursor types for resize handles
    const resizeCursorTypes = [
      CursorConstant.CursorType.RESIZE_LT,
      CursorConstant.CursorType.RESIZE_T,
      CursorConstant.CursorType.RESIZE_RT,
      CursorConstant.CursorType.RESIZE_R,
      CursorConstant.CursorType.RESIZE_RB,
      CursorConstant.CursorType.RESIZE_B,
      CursorConstant.CursorType.RESIZE_LB,
      CursorConstant.CursorType.RESIZE_L
    ];

    // Create a group shape to hold all knob elements
    const knobGroup = svgDocument.CreateShape(OptConstant.CSType.Group);

    const knobSize = OptConstant.Common.KnobSize;
    const rotatedKnobSize = OptConstant.Common.RKnobSize;
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
      shapeType: OptConstant.CSType.Rect,
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
    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobConfig.fillColor = 'gray';
      knobConfig.locked = true;
    } else if (this.NoGrow()) {
      knobConfig.fillColor = 'red';
      knobConfig.strokeColor = 'red';
      // Override all cursor types if shape cannot grow
      for (let index = 0; index < 8; index++) {
        adjustedCursorTypes[index] = CursorConstant.CursorType.DEFAULT;
      }
    }

    // Create top-left knob
    knobConfig.knobID = OptConstant.ActionTriggerType.TopLeft;
    knobConfig.cursorType = adjustedCursorTypes[0];
    let knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create top-right knob
    knobConfig.x = frameWidth - scaleKnobSize;
    knobConfig.y = 0;
    knobConfig.cursorType = adjustedCursorTypes[2];
    knobConfig.knobID = OptConstant.ActionTriggerType.TopRight;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create bottom-right knob
    knobConfig.x = frameWidth - scaleKnobSize;
    knobConfig.y = frameHeight - scaleKnobSize;
    knobConfig.cursorType = adjustedCursorTypes[4];
    knobConfig.knobID = OptConstant.ActionTriggerType.BottomRight;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Create bottom-left knob
    knobConfig.x = 0;
    knobConfig.y = frameHeight - scaleKnobSize;
    knobConfig.cursorType = adjustedCursorTypes[6];
    knobConfig.knobID = OptConstant.ActionTriggerType.BottomLeft;
    knobElement = this.GenericKnob(knobConfig);
    knobGroup.AddElement(knobElement);

    // Conditionally create the rotate knob if allowed
    if (!T3Gv.opt.touchInitiated && !knobConfig.locked && !this.NoGrow()) {
      knobConfig.shapeType = OptConstant.CSType.Oval;
      knobConfig.x = frameWidth - 3 * scaleRotatedKnobSize;
      knobConfig.y = frameHeight / 2 - scaleRotatedKnobSize / 2;
      knobConfig.cursorType = CursorConstant.CursorType.ROTATE;
      knobConfig.knobID = OptConstant.ActionTriggerType.Rotate;
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
    knobGroup.SetID(OptConstant.Common.Action + triggerId);

    T3Util.Log("S.BaseSymbol - CreateActionTriggers output:", knobGroup);
    return knobGroup;
  }

  ChangeShape(event: any, targetElement: any, newProperties: any, previousState: any, additionalData: any): boolean {
    T3Util.Log("S.BaseSymbol - ChangeShape input:", { event, targetElement, newProperties, previousState, additionalData });
    const result = false;
    T3Util.Log("S.BaseSymbol - ChangeShape output:", result);
    return result;
  }

  Flip(flipFlags: number) {
    T3Util.Log("S.BaseSymbol - Flip input:", flipFlags);

    // Retrieve the element by block ID (for potential further operations)
    T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

    // Process horizontal flip if the corresponding flag is set in the input parameter
    if (flipFlags & OptConstant.ExtraFlags.FlipHoriz) {
      const isCurrentlyFlippedHoriz = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        OptConstant.ExtraFlags.FlipHoriz,
        !isCurrentlyFlippedHoriz
      );
    }

    // Process vertical flip if the corresponding flag is set in the input parameter
    if (flipFlags & OptConstant.ExtraFlags.FlipVert) {
      const isCurrentlyFlippedVert = (this.extraflags & OptConstant.ExtraFlags.FlipVert) !== 0;
      this.extraflags = Utils2.SetFlag(
        this.extraflags,
        OptConstant.ExtraFlags.FlipVert,
        !isCurrentlyFlippedVert
      );
    }

    T3Util.Log("S.BaseSymbol - Flip output:", this.extraflags);
  }

  LMActionPreTrack(event: any, trigger: any): void {
    T3Util.Log("S.BaseSymbol - LMActionPreTrack input:", { event, trigger });

    if (this.DataID !== -1) {
      if (this.TextFlags & NvConstant.TextFlags.AttachA ||
        this.TextFlags & NvConstant.TextFlags.AttachB) {
        T3Gv.opt.actionSvgObject.textElem.SetVisible(false);
      }
    }

    if (this.rflags) {
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Width, false);
      this.rflags = Utils2.SetFlag(this.rflags, NvConstant.FloatingPointDim.Height, false);
    }

    T3Util.Log("S.BaseSymbol - LMActionPreTrack output: completed");
  }

  LMActionPostRelease(event: any): void {
    T3Util.Log("S.BaseSymbol - LMActionPostRelease input:", event);

    if (this.DataID !== -1) {
      if (
        (this.TextFlags & NvConstant.TextFlags.AttachA) ||
        (this.TextFlags & NvConstant.TextFlags.AttachB)
      ) {
        T3Gv.opt.actionSvgObject.textElem.SetVisible(true);
      }
    }

    OptCMUtil.SetEditMode(NvConstant.EditState.Default);
    T3Gv.opt.UpdateLinks();
    T3Gv.opt.linkParams = null;

    this.sizedim.width = this.Frame.width;
    this.sizedim.height = this.Frame.height;

    T3Util.Log("S.BaseSymbol - LMActionPostRelease output: completed");
  }
}

export default BaseSymbol


