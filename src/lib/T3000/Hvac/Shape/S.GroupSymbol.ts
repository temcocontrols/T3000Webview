

import BaseSymbol from './S.BaseSymbol'
import Utils1 from '../Util/Utils1';
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import WResult from '../Model/WResult'
import ShapeUtil from '../Opt/Shape/ShapeUtil'
import $ from 'jquery'
import Instance from '../Data/Instance/Instance'
import NvConstant from '../Data/Constant/NvConstant'
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import BConstant from '../Basic/B.Constant';
import StateConstant from '../Data/State/StateConstant';
import CursorConstant from '../Data/Constant/CursorConstant';
import TextConstant from '../Data/Constant/TextConstant';
import StyleConstant from '../Data/Constant/StyleConstant';
import T3Util from '../Util/T3Util';
import DSUtil from '../Opt/DS/DSUtil';
import DataUtil from '../Opt/Data/DataUtil';
import OptCMUtil from '../Opt/Opt/OptCMUtil';

/**
 * Represents a group symbol that contains multiple shapes treated as a single entity.
 *
 * The GroupSymbol class provides functionality to manage, render, and manipulate a collection
 * of shapes as one cohesive unit. It handles group-specific behaviors including:
 * - SVG rendering and shape creation
 * - Group transformation (resizing, rotation, flipping)
 * - Event handling and action triggers
 * - Style application
 * - Field data operations
 * - Collaboration features (glow effects)
 *
 * @extends BaseSymbol
 *
 * @example
 * ```typescript
 * // Create a new group symbol
 * const groupOptions = {
 *   Frame: { x: 100, y: 100, width: 200, height: 150 },
 *   Layer: 0
 * };
 *
 * const groupSymbol = new GroupSymbol(groupOptions);
 *
 * // Add shapes to the group
 * groupSymbol.ShapesInGroup = [shape1.BlockID, shape2.BlockID, shape3.BlockID];
 *
 * // Set initial group bounds for proper scaling
 * groupSymbol.InitialGroupBounds = {
 *   x: 0, y: 0, width: 200, height: 150
 * };
 *
 * // Create visual representation
 * const svgElement = groupSymbol.CreateShape(svgDocument);
 * svgObjectLayer.AddElement(svgElement);
 *
 * // Apply collaboration glow effect
 * groupSymbol.collabGlowColor = '#FF5733';
 * groupSymbol.ApplyEffects(svgElement, false, null);
 * ```
 *
 * @property {string} collabGlowColor - The color to use for collaboration highlighting
 * @property {Array<number>} ShapesInGroup - Array of BlockIDs for shapes contained in this group
 * @property {Object} InitialGroupBounds - The original dimensions used for scaling calculations
 */
class GroupSymbol extends BaseSymbol {

  public collabGlowColor: string;

  constructor(options) {
    options = options || {};
    options.ShapeType = OptConstant.ShapeType.GroupSymbol;
    options.flags = NvConstant.ObjFlags.ImageOnly;
    T3Util.Log('S.GroupSymbol - Input options:', options);
    super(options);
    T3Util.Log('S.GroupSymbol - GroupSymbol created');
  }

  CreateShape(svgDocument, shapeOptions) {
    T3Util.Log("S.GroupSymbol - CreateShape input:", { svgDocument, shapeOptions });
    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("S.GroupSymbol - CreateShape output:", null);
      return null;
    }
    // Retrieve any style override if present
    this.GetFieldDataStyleOverride();
    const shapeContainer = svgDocument.CreateShape(OptConstant.CSType.ShapeContainer);
    T3Util.Log("S.GroupSymbol - CreateShape output:", shapeContainer);
    return shapeContainer;
  }

  PostCreateShapeCallback(svgDocument, groupElement, eventSettings, extraFlags) {
    T3Util.Log("S.GroupSymbol - PostCreateShapeCallback input:", {
      svgDocument,
      groupElement,
      eventSettings,
      extraFlags
    });

    if (!(this.flags & NvConstant.ObjFlags.NotVisible)) {
      let groupContainer = svgDocument.CreateShape(OptConstant.CSType.Group);
      groupContainer.SetID(OptConstant.SVGElementClass.Shape);
      groupElement.AddElement(groupContainer);

      let currentFrame = this.Frame;
      let width = currentFrame.width;
      let height = currentFrame.height;
      groupElement.SetSize(width, height);
      groupElement.SetPos(currentFrame.x, currentFrame.y);

      let shapeObj, totalShapes = this.ShapesInGroup.length;
      let originalDimensions = null, currentShapeInstance = null, rotationAngle = 0, textElement = null;
      let isFlipHorizontally = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) > 0;
      let isFlipVertically = (this.extraflags & OptConstant.ExtraFlags.FlipVert) > 0;
      let updatedFlipHoriz = isFlipHorizontally, updatedFlipVert = isFlipVertically;
      let flagValue = 0;

      if (extraFlags != null) {
        if ((extraFlags & OptConstant.ExtraFlags.FlipHoriz) > 0) {
          updatedFlipHoriz = !updatedFlipHoriz;
        }
        if ((extraFlags & OptConstant.ExtraFlags.FlipVert) > 0) {
          updatedFlipVert = !updatedFlipVert;
        }
      }
      flagValue = Utils2.SetFlag(flagValue, OptConstant.ExtraFlags.FlipHoriz, updatedFlipHoriz);
      flagValue = Utils2.SetFlag(flagValue, OptConstant.ExtraFlags.FlipVert, updatedFlipVert);

      for (let idx = 0; idx < totalShapes; ++idx) {
        let shapeId = this.ShapesInGroup[idx];
        shapeObj = DataUtil.GetObjectPtr(shapeId, false);
        originalDimensions = shapeObj.Dimensions;
        shapeObj.Dimensions = 0;

        currentShapeInstance = shapeObj.CreateShape(svgDocument);
        if (currentShapeInstance) {
          currentShapeInstance.SetID(shapeId);
          groupContainer.AddElement(currentShapeInstance);
          shapeObj.PostCreateShapeCallback(svgDocument, currentShapeInstance, null, flagValue);
        }
        shapeObj.Dimensions = originalDimensions;
        rotationAngle = shapeObj.RotationAngle;

        if (shapeObj instanceof Instance.Shape.BaseShape) {
          if (rotationAngle !== 0) {
            currentShapeInstance.SetRotation(rotationAngle);
          }
          if (shapeObj.DataID >= 0 && (updatedFlipHoriz || updatedFlipVert)) {
            textElement = currentShapeInstance.GetElementById(OptConstant.SVGElementClass.Text);
            if (textElement) {
              if (updatedFlipHoriz) {
                textElement.SetMirror(updatedFlipHoriz);
              }
              if (updatedFlipVert) {
                textElement.SetFlip(updatedFlipVert);
              }
            }
          }
        }
      }

      groupContainer.SetSize(width, height);
      groupElement.isShape = true;

      let slopRect = svgDocument.CreateShape(OptConstant.CSType.Rect);
      slopRect.SetStrokeColor('white');
      slopRect.SetFillColor('none');
      slopRect.SetOpacity(0);
      slopRect.SetStrokeWidth(5);

      if (eventSettings) {
        slopRect.SetEventBehavior(OptConstant.EventBehavior.HiddenAll);
      } else {
        slopRect.SetEventBehavior(OptConstant.EventBehavior.None);
      }

      groupElement.AddElement(slopRect);
      slopRect.SetID(OptConstant.SVGElementClass.Slop);
      slopRect.ExcludeFromExport(true);
      slopRect.SetSize(width, height);
      groupContainer.SetScale(
        width / this.InitialGroupBounds.width,
        height / this.InitialGroupBounds.height
      );
      if (isFlipHorizontally) {
        groupContainer.SetMirror(isFlipHorizontally);
      }
      if (isFlipVertically) {
        groupContainer.SetFlip(isFlipVertically);
      }
      if (this.DataID !== -1) {
        this.LMAddSVGTextObject(svgDocument, groupElement);
      }
      this.UpdateDimensionLines(groupElement);
      this.AddIcons(svgDocument, groupElement);
      this.ApplyEffects(groupElement, false, false);
    }
    T3Util.Log("S.GroupSymbol - PostCreateShapeCallback output executed");
  }

  SetObjectStyle(styleOptions: any) {
    T3Util.Log("S.GroupSymbol - SetObjectStyle input:", styleOptions);
    if (!styleOptions.ImageURL || styleOptions.ImageURL === '') {
      const filteredStyle = T3Gv.opt.ApplyColorFilter(styleOptions, this, this.StyleRecord, this.colorfilter);
      T3Gv.opt.ApplyGroupProperties(filteredStyle, this);
      T3Util.Log("S.GroupSymbol - SetObjectStyle output: Applied color filter and group properties");
    } else {
      T3Util.Log("S.GroupSymbol - SetObjectStyle output: No changes applied since ImageURL exists");
    }
  }

  ChangeTextAttributes(
    textContent: any,
    styleOptions: any,
    textAlignment: any,
    textRotation: any,
    textMargin: any,
    textPadding: any,
    parentElementOverride: any,
    forceUpdate: any
  ) {
    T3Util.Log("S.GroupSymbol - ChangeTextAttributes input:", {
      textContent,
      styleOptions,
      textAlignment,
      textRotation,
      textMargin,
      textPadding,
      parentElementOverride,
      forceUpdate
    });

    let shapeHeightBefore: any;
    let shapeWidthBefore: any;
    const shapesGroup = this.ShapesInGroup;
    const shapesCount = shapesGroup.length;
    let frameSizeChanged = false;

    if (shapesCount !== 0) {
      let svgElement;
      if (parentElementOverride) {
        svgElement = parentElementOverride;
      } else {
        svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      }

      let shapeElement;
      if (svgElement) {
        shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
      }
      if (shapeElement != null) {
        // If text editing is allowed, call the base ChangeTextAttributes function
        if (this.AllowTextEdit()) {
          Instance.Shape.BaseSymbol.prototype.ChangeTextAttributes.call(
            this,
            textContent,
            styleOptions,
            textAlignment,
            textRotation,
            textMargin,
            textPadding,
            shapeElement,
            forceUpdate
          );
        }

        if (styleOptions) {
          if (styleOptions.FontName !== undefined) {
            this.StyleRecord.Text.FontName = styleOptions.FontName;
          }
          if (styleOptions.FontId !== undefined) {
            this.StyleRecord.Text.FontId = styleOptions.FontId;
          }
          if (styleOptions.FontSize !== undefined) {
            this.StyleRecord.Text.FontSize = styleOptions.FontSize;
          }
          if (styleOptions.Face !== undefined) {
            this.StyleRecord.Text.Face = styleOptions.Face;
          }
          if (styleOptions.Color !== undefined) {
            this.StyleRecord.Text.Paint.Color = styleOptions.Color;
          }
          if (styleOptions.Opacity !== undefined) {
            this.StyleRecord.Text.Paint.Opacity = styleOptions.Opacity;
          }
        }

        for (let index = 0; index < shapesCount; ++index) {
          let shapeObject = DataUtil.GetObjectPtr(shapesGroup[index], true);
          if (shapeObject && (shapeObject.colorfilter & StyleConstant.ColorFilters.NCText) === 0) {
            let childShapeElement = shapeElement.GetElementById(shapeObject.BlockID);
            // Remember current dimensions to check for changes after update
            shapeHeightBefore = shapeObject.Frame.height;
            shapeWidthBefore = shapeObject.Frame.width;

            shapeObject.ChangeTextAttributes(
              textContent,
              styleOptions,
              textAlignment,
              textRotation,
              textMargin,
              textPadding,
              childShapeElement,
              forceUpdate
            );

            if (shapeObject.Frame.width !== shapeWidthBefore || shapeObject.Frame.height !== shapeHeightBefore) {
              frameSizeChanged = true;
            }
          }
        }

        if (frameSizeChanged) {
          DataUtil.AddToDirtyList(this.BlockID);
          const scaleWidth = this.Frame.width / this.InitialGroupBounds.width;
          const scaleHeight = this.Frame.height / this.InitialGroupBounds.height;
          if (!isNaN(scaleWidth) && !isNaN(scaleHeight)) {
            const newFrame = Utils1.DeepCopy(this.Frame);
            newFrame.width = scaleWidth * this.InitialGroupBounds.width;
            newFrame.height = scaleHeight * this.InitialGroupBounds.height;
            this.UpdateFrame(newFrame);
          }
        }
        this.ConvertToNative(T3Gv.opt.richGradients, false);
      }
    }
    T3Util.Log("S.GroupSymbol - ChangeTextAttributes output executed");
  }

  GetTextures(textureList: any): void {
    T3Util.Log("S.GroupSymbol - GetTextures input:", textureList);
    const totalShapes = this.ShapesInGroup.length;
    for (let index = 0; index < totalShapes; index++) {
      const shapeObject = DataUtil.GetObjectPtr(this.ShapesInGroup[index], false);
      if (shapeObject) {
        shapeObject.GetTextures(textureList);
      }
    }
    T3Util.Log("S.GroupSymbol - GetTextures output executed");
  }

  Resize(svgElement, newDimensions, resizeInfo) {
    T3Util.Log("S.GroupSymbol - Resize input:", { svgElement, newDimensions, resizeInfo });

    const rotation = svgElement.GetRotation();
    const previousBoundingBox = $.extend(true, {}, this.prevBBox);
    const newBoundingBox = $.extend(true, {}, newDimensions);
    const offset = T3Gv.opt.svgDoc.CalculateRotatedOffsetForResize(previousBoundingBox, newBoundingBox, rotation);

    svgElement.SetSize(newDimensions.width, newDimensions.height);
    svgElement.SetPos(newDimensions.x + offset.x, newDimensions.y + offset.y);

    const shapeElement = svgElement.GetElementById(OptConstant.SVGElementClass.Shape);
    shapeElement.SetSize(newDimensions.width, newDimensions.height);
    shapeElement.SetScale(
      newDimensions.width / this.InitialGroupBounds.width,
      newDimensions.height / this.InitialGroupBounds.height
    );

    const slopElement = svgElement.GetElementById(OptConstant.SVGElementClass.Slop);
    slopElement.SetSize(newDimensions.width, newDimensions.height);

    this.LMResizeSVGTextObject(svgElement, resizeInfo, newDimensions);

    svgElement.SetRotation(rotation);
    this.UpdateDimensionLines(svgElement);

    T3Util.Log("S.GroupSymbol - Resize output:", offset);
    return offset;
  }

  CreateActionTriggers(svgDocument, triggerType, shapeOptions, actionRequest) {
    T3Util.Log("S.GroupSymbol - CreateActionTriggers input:", { svgDocument, triggerType, shapeOptions, actionRequest });
    const actionTriggers = this.BaseShapeCreateActionTriggers(svgDocument, triggerType, shapeOptions, actionRequest);
    T3Util.Log("S.GroupSymbol - CreateActionTriggers output:", actionTriggers);
    return actionTriggers;
  }

  BaseShapeCreateActionTriggers(svgDocument, triggerType, shapeOptions, actionRequest) {
    T3Util.Log("S.GroupSymbol - BaseShapeCreateActionTriggers input:", { svgDocument, triggerType, shapeOptions, actionRequest });

    // Define the list of resize cursors in a clockwise order starting from the top-left
    const resizeCursorList = [
      CursorConstant.CursorType.RESIZE_LT,
      CursorConstant.CursorType.RESIZE_T,
      CursorConstant.CursorType.RESIZE_RT,
      CursorConstant.CursorType.RESIZE_R,
      CursorConstant.CursorType.RESIZE_RB,
      CursorConstant.CursorType.RESIZE_B,
      CursorConstant.CursorType.RESIZE_LB,
      CursorConstant.CursorType.RESIZE_L
    ];

    // if (T3Gv.opt.Table_GetActiveID() === this.BlockID) {
    //   T3Util.Log("S.GroupSymbol - BaseShapeCreateActionTriggers output:", null);
    //   return null;
    // }

    let actionTriggerGroup = svgDocument.CreateShape(OptConstant.CSType.Group);
    const knobSize = OptConstant.Common.KnobSize;
    const smallKnobSize = OptConstant.Common.RKnobSize;
    let useSideKnobs = (this.extraflags & OptConstant.ExtraFlags.SideKnobs &&
      this.dataclass === PolygonConstant.ShapeTypes.POLYGON);
    const minSidePointLength = OptConstant.Common.MinSidePointLength;
    let docScale = svgDocument.docInfo.docToScreenScale;
    if (svgDocument.docInfo.docScale <= 0.5) {
      docScale *= 2;
    }
    const adjustedKnobSize = knobSize / docScale;
    const adjustedSmallKnobSize = smallKnobSize / docScale;
    let fillColor = 'black';
    const frame = this.Frame;
    let frameWidth = frame.width;
    let frameHeight = frame.height;
    frameWidth += adjustedKnobSize;
    frameHeight += adjustedKnobSize;

    // Calculate the group position by enlarging the frame by the knob size offset
    let groupPosition = $.extend(true, {}, frame);
    groupPosition.x -= adjustedKnobSize / 2;
    groupPosition.y -= adjustedKnobSize / 2;
    groupPosition.width += adjustedKnobSize;
    groupPosition.height += adjustedKnobSize;

    let rotationAngle = shapeOptions.GetRotation() + 22.5;
    if (rotationAngle >= 360) {
      rotationAngle = 0;
    }
    const rotationSector = Math.floor(rotationAngle / 45);
    let orderedCursorList = resizeCursorList.slice(rotationSector).concat(resizeCursorList.slice(0, rotationSector));

    // Determine which knobs should be enabled based on the object's grow behavior
    let allowGrow = true;
    let allowHorizontal = !useSideKnobs;
    let allowVertical = !useSideKnobs;
    switch (this.ObjGrow) {
      case OptConstant.GrowBehavior.Horiz:
        allowGrow = false;
        allowVertical = false;
        break;
      case OptConstant.GrowBehavior.Vertical:
        allowGrow = false;
        allowHorizontal = false;
        break;
      case OptConstant.GrowBehavior.ProPortional:
        allowGrow = true;
        allowHorizontal = false;
        allowVertical = false;
    }

    let knobProps = {
      svgDoc: svgDocument,
      shapeType: OptConstant.CSType.Rect,
      x: 0,
      y: 0,
      knobSize: adjustedKnobSize,
      fillColor: fillColor,
      fillOpacity: 1,
      strokeSize: 1,
      strokeColor: '#777777',
      locked: false,
      knobID: 0,
      cursorType: ""
    };

    if (triggerType !== actionRequest) {
      knobProps.fillColor = 'white';
      knobProps.strokeSize = 1;
      knobProps.strokeColor = 'black';
      knobProps.fillOpacity = 0.0;
    }

    if (this.flags & NvConstant.ObjFlags.Lock) {
      knobProps.fillColor = 'gray';
      knobProps.locked = true;
      useSideKnobs = false;
    } else if (this.NoGrow()) {
      knobProps.fillColor = 'red';
      useSideKnobs = false;
      knobProps.strokeColor = 'red';
      orderedCursorList = [
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT,
        CursorConstant.CursorType.DEFAULT
      ];
    }

    // Add corner knobs if growing is allowed
    if (allowGrow) {
      knobProps.knobID = OptConstant.ActionTriggerType.TopLeft;
      knobProps.cursorType = orderedCursorList[0];
      let newKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(newKnob);

      knobProps.x = frameWidth - adjustedKnobSize;
      knobProps.y = 0;
      knobProps.cursorType = orderedCursorList[2];
      knobProps.knobID = OptConstant.ActionTriggerType.TopRight;
      newKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(newKnob);

      knobProps.x = frameWidth - adjustedKnobSize;
      knobProps.y = frameHeight - adjustedKnobSize;
      knobProps.cursorType = orderedCursorList[4];
      knobProps.knobID = OptConstant.ActionTriggerType.BottomRight;
      newKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(newKnob);

      knobProps.x = 0;
      knobProps.y = frameHeight - adjustedKnobSize;
      knobProps.cursorType = orderedCursorList[6];
      knobProps.knobID = OptConstant.ActionTriggerType.BottomLeft;
      newKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(newKnob);
    }

    // Add center top and bottom knobs if vertical growth is allowed
    if (allowVertical) {
      knobProps.x = frameWidth / 2 - adjustedKnobSize / 2;
      knobProps.y = 0;
      knobProps.cursorType = orderedCursorList[1];
      knobProps.knobID = OptConstant.ActionTriggerType.TopCenter;
      let centerKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(centerKnob);

      knobProps.x = frameWidth / 2 - adjustedKnobSize / 2;
      knobProps.y = frameHeight - adjustedKnobSize;
      knobProps.cursorType = orderedCursorList[5];
      knobProps.knobID = OptConstant.ActionTriggerType.BottomCenter;
      centerKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(centerKnob);
    }

    // Add left and right side knobs if horizontal growth is allowed
    if (allowHorizontal) {
      knobProps.x = 0;
      knobProps.y = frameHeight / 2 - adjustedKnobSize / 2;
      knobProps.cursorType = orderedCursorList[7];
      knobProps.knobID = OptConstant.ActionTriggerType.CenterLeft;
      let sideKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(sideKnob);

      knobProps.x = frameWidth - adjustedKnobSize;
      knobProps.y = frameHeight / 2 - adjustedKnobSize / 2;
      knobProps.cursorType = orderedCursorList[3];
      knobProps.knobID = OptConstant.ActionTriggerType.CenterRight;
      sideKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(sideKnob);
    }

    // Check for connector hook information and add icon if available
    const connectorInfo = (function (currentObject) {
      let hookInfo = null;
      if (currentObject.hooks.length) {
        const hookTarget = DataUtil.GetObjectPtr(currentObject.hooks[0].objid, false);
        if ((hookTarget && hookTarget.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) ||
          (hookTarget && hookTarget instanceof Instance.Shape.ShapeContainer)) {
          hookInfo = hookTarget.PrGetShapeConnectorInfo(currentObject.hooks[0]);
        }
      }
      return hookInfo;
    })(this);

    if (connectorInfo && connectorInfo.length) {
      const iconProps = {
        svgDoc: svgDocument,
        iconSize: 14,
        imageURL: null,
        iconID: 0,
        userData: 0,
        cursorType: 0,
        x: 0,
        y: 0
      };
      for (let i = 0, len = connectorInfo.length; i < len; i++) {
        if (connectorInfo[i].position === 'right') {
          iconProps.x = frameWidth - 14 - 1 - adjustedKnobSize;
        } else if (connectorInfo[i].position === 'bottom') {
          iconProps.y = frameHeight - 14 - 1 - adjustedKnobSize;
        } else {
          iconProps.x = adjustedKnobSize + 1;
          iconProps.y = adjustedKnobSize + 1;
        }
        iconProps.cursorType = connectorInfo[i].cursorType;
        iconProps.iconID = connectorInfo[i].knobID;
        iconProps.imageURL = connectorInfo[i].polyType === 'vertical' ?
          OptConstant.Common.ConMoveVerticalPath :
          OptConstant.Common.ConMoveHorizontalPath;
        iconProps.userData = connectorInfo[i].knobData;
        let newIcon = this.GenericIcon(iconProps);
        actionTriggerGroup.AddElement(newIcon);
        iconProps.x += 16;
      }
    }

    // If side knobs are enabled, add additional knobs along the polyline of the shape
    if (useSideKnobs) {
      let copyOfThis = Utils1.DeepCopy(this);
      copyOfThis.inside = $.extend(true, {}, copyOfThis.Frame);
      let polyPoints = T3Gv.opt.ShapeToPolyLine(this.BlockID, false, true, copyOfThis)
        .GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, true, false, []);
      if (polyPoints) {
        for (let k = 1, len = polyPoints.length; k < len; k++) {
          const deltaX = polyPoints[k].x - polyPoints[k - 1].x;
          const deltaY = polyPoints[k].y - polyPoints[k - 1].y;
          if (Utils2.sqrt(deltaX * deltaX + deltaY * deltaY) > minSidePointLength) {
            knobProps.cursorType = deltaX * deltaX > deltaY * deltaY ? CursorConstant.CursorType.RESIZE_TB : CursorConstant.CursorType.RESIZE_LR;
            knobProps.x = polyPoints[k - 1].x + deltaX / 2;
            knobProps.y = polyPoints[k - 1].y + deltaY / 2;
            let polyKnob = this.GenericKnob(knobProps);
            polyKnob.SetUserData(k);
            actionTriggerGroup.AddElement(polyKnob);
          }
        }
      }
    }

    // Add the rotate knob if rotation is enabled
    const disableRotation = this.NoRotate() || this.NoGrow() || T3Gv.opt.touchInitiated || knobProps.locked;
    const isNarrow = frame.width < 44;
    let hasConnectorHook = this.hooks.length > 0;
    if (hasConnectorHook) {
      const hookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (hookObject && hookObject.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Connector) {
        hasConnectorHook = false;
      }
    }

    if (!disableRotation && !isNarrow && !hasConnectorHook) {
      const isTextGrowHorizontal = this.TextGrow === NvConstant.TextGrowBehavior.Horizontal &&
        (this.flags & NvConstant.ObjFlags.TextOnly) &&
        ShapeUtil.TextAlignToWin(this.TextAlign).just === TextConstant.TextJust.Left;
      knobProps.shapeType = OptConstant.CSType.Oval;
      knobProps.x = isTextGrowHorizontal ? frameWidth + adjustedSmallKnobSize : frameWidth - 3 * adjustedSmallKnobSize;
      knobProps.y = frameHeight / 2 - adjustedSmallKnobSize / 2;
      knobProps.cursorType = CursorConstant.CursorType.ROTATE;
      knobProps.knobID = OptConstant.ActionTriggerType.Rotate;
      knobProps.fillColor = 'white';
      knobProps.fillOpacity = 0.001;
      knobProps.strokeSize = 1.5;
      knobProps.strokeColor = 'black';
      let rotateKnob = this.GenericKnob(knobProps);
      actionTriggerGroup.AddElement(rotateKnob);
    }

    // Create dimension adjustment knobs if applicable
    if (this.Dimensions & NvConstant.DimensionFlags.Standoff && this.CanUseStandOffDimensionLines()) {
      const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
      this.CreateDimensionAdjustmentKnobs(actionTriggerGroup, svgElement, knobProps);
    }

    actionTriggerGroup.SetSize(frameWidth, frameHeight);
    actionTriggerGroup.SetPos(groupPosition.x, groupPosition.y);
    actionTriggerGroup.isShape = true;
    actionTriggerGroup.SetID(OptConstant.Common.Action + triggerType);

    T3Util.Log("S.GroupSymbol - BaseShapeCreateActionTriggers output:", actionTriggerGroup);
    return actionTriggerGroup;
  }

  // InsertNewTable(e, t, a) {
  //   return !1
  // }

  ContainsText(): boolean {
    T3Util.Log("S.GroupSymbol - ContainsText input:", {
      DataID: this.DataID,
      BlockID: this.BlockID,
      ShapesCount: this.ShapesInGroup.length
    });

    if (this.DataID >= 0) {
      T3Util.Log("S.GroupSymbol - ContainsText output:", false);
      return false;
    }

    for (let index = 0; index < this.ShapesInGroup.length; index++) {
      const shapeObject = DataUtil.GetObjectPtr(this.ShapesInGroup[index], false);
      if (shapeObject.ContainsText()) {
        T3Util.Log("S.GroupSymbol - ContainsText output:", true);
        return true;
      }
    }

    T3Util.Log("S.GroupSymbol - ContainsText output:", false);
    return false;
  }

  ConvertToNative(richGradients: any, shouldReturnBuffer: boolean) {
    T3Util.Log('S.GroupSymbol - ConvertToNative input:', { richGradients, shouldReturnBuffer });

    let preservedBlock: any;
    const result = new WResult();
    result.richGradients = richGradients;

    const shapesCount = this.ShapesInGroup.length;
    if (shapesCount > 0) {
      for (let idx = 0; idx < shapesCount; idx++) {
        const shapeID = this.ShapesInGroup[idx];
        result.zList.push(shapeID);
        const shapeObj = DataUtil.GetObjectPtr(shapeID, false);
        shapeObj.layer = this.Layer;
        shapeObj.GetTextures(result.TextureList);
      }

      result.sdp = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      result.tLMB = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
      result.ctp = T3Gv.opt.contentHeader;
      result.GroupOffset.x = 0;
      result.GroupOffset.y = 0;
      result.WriteGroupBlock = true;
      result.fontlist = T3Gv.opt.contentHeader.FontList;

      T3Gv.docUtil.svgDoc.GetWorkArea();
      result.docDpi = T3Gv.docUtil.svgDoc.docInfo.docDpi;

      const buffer = ShapeUtil.WriteBuffer(result, true, true, true);
      if (shouldReturnBuffer === true) {
        T3Util.Log('S.GroupSymbol - ConvertToNative output:', buffer);
        return buffer;
      }

      let uint8Buffer: Uint8Array | null = null;
      if (buffer) {
        uint8Buffer = new Uint8Array(buffer);
        if (this.NativeID >= 0) {
          preservedBlock = T3Gv.stdObj.PreserveBlock(this.NativeID);
          if (preservedBlock) {
            preservedBlock.Data = uint8Buffer;
          }
        } else {
          preservedBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.HNativeObject, uint8Buffer);
          this.NativeID = preservedBlock.ID;
        }
      }
      T3Util.Log('S.GroupSymbol - ConvertToNative output:', { preservedBlock });
    } else {
      T3Util.Log('S.GroupSymbol - ConvertToNative output: No shapes in group');
    }
  }

  WriteShapeData(outputStream, writeOptions) {
    T3Util.Log("S.GroupSymbol - WriteShapeData input:", { outputStream, writeOptions });

    let numShapes: number, shapeObj: any, buffer: any, codeLength: any;
    let nativeStorageResult = new WResult();
    let dataId = this.DataID;

    // Modify dataId if text attachment flags are set and we are not writing blocks
    if ((this.TextFlags & NvConstant.TextFlags.AttachB ||
      this.TextFlags & NvConstant.TextFlags.AttachA) &&
      !writeOptions.WriteBlocks) {
      dataId = -1;
    }

    nativeStorageResult.richGradients = T3Gv.opt.richGradients;

    ShapeUtil.WriteTextParams(outputStream, this, dataId, writeOptions);

    if (writeOptions.WriteBlocks) {
      ShapeUtil.WriteNativeID(outputStream, this.NativeID, writeOptions);
    } else if (this.NativeID && (numShapes = this.ShapesInGroup.length)) {
      for (let i = 0; i < numShapes; i++) {
        const shapeId = this.ShapesInGroup[i];
        nativeStorageResult.zList.push(shapeId);
        shapeObj = DataUtil.GetObjectPtr(shapeId, false);
        shapeObj.layer = this.Layer;
        shapeObj.GetTextures(nativeStorageResult.TextureList);
      }

      nativeStorageResult.sdp = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      nativeStorageResult.tLMB = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
      nativeStorageResult.ctp = T3Gv.opt.contentHeader;

      if (this.InitialGroupBounds.x > 0 || this.InitialGroupBounds.y > 0) {
        nativeStorageResult.GroupOffset.x = this.Frame.x + writeOptions.GroupOffset.x;
        nativeStorageResult.GroupOffset.y = this.Frame.y + writeOptions.GroupOffset.y;
      } else {
        nativeStorageResult.GroupOffset.x = writeOptions.GroupOffset.x;
        nativeStorageResult.GroupOffset.y = writeOptions.GroupOffset.y;
      }

      nativeStorageResult.WriteGroupBlock = writeOptions.WriteGroupBlock;
      nativeStorageResult.WriteWin32 = writeOptions.WriteWin32;

      T3Gv.docUtil.svgDoc.GetWorkArea();
      nativeStorageResult.docDpi = T3Gv.docUtil.svgDoc.docInfo.docDpi;

      buffer = ShapeUtil.WriteBuffer(nativeStorageResult, true, true, true);
      codeLength = ShapeUtil.WriteCode(outputStream, DSConstant.OpNameCode.cNativeStorage);
      DSUtil.writeNativeBuffer(outputStream, buffer);
      ShapeUtil.WriteLength(outputStream, codeLength);
    }

    T3Util.Log("S.GroupSymbol - WriteShapeData output executed");
  }

  DeleteObject() {
    T3Util.Log("S.GroupSymbol - DeleteObject input: none");
    const shapesInGroup = this.ShapesInGroup;
    const count = shapesInGroup.length;
    for (let index = 0; index < count; index++) {
      const shapeObject = DataUtil.GetObjectPtr(shapesInGroup[index], false);
      if (shapeObject) {
        const storeObject = T3Gv.stdObj.GetObject(shapesInGroup[index]);
        shapeObject.DeleteObject();
        if (storeObject) {
          storeObject.Delete();
        }
      }
    }
    this.BaseDrawObjectDeleteObject();
    T3Util.Log("S.GroupSymbol - DeleteObject output: deleted");
  }

  BaseDrawObjectDeleteObject() {
    T3Util.Log("S.GroupSymbol - BaseDrawObjectDeleteObject input: none");

    let currentObject = null;
    let hookObject = null;
    let tempHookElement = null;
    let hooksBackup = [];

    // // Delete Table object if exists
    // if (this.TableID !== -1) {
    //   let tablePointer = DataUtil.GetObjectPtr(this.TableID, true);
    //   if (tablePointer) {
    //     T3Gv.opt.Table_DeleteObject(tablePointer);
    //   }
    //   currentObject = T3Gv.stdObj.GetObject(this.TableID);
    //   if (currentObject) {
    //     currentObject.Delete();
    //   }
    // }

    // Delete Data object if exists
    if (this.DataID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.DataID);
      if (currentObject) {
        currentObject.Delete();
      }
    }

    // Delete Note object if exists
    if (this.NoteID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.NoteID);
      if (currentObject) {
        currentObject.Delete();
      }
    }

    // Delete Native object if exists
    if (this.NativeID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.NativeID);
      if (currentObject) {
        currentObject.Delete();
      }
    }

    // Delete Blob bytes if exists and its URL if necessary
    if (this.BlobBytesID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.BlobBytesID);
      if (currentObject) {
        currentObject.Delete();
      }
      if (OptCMUtil.IsBlobURL(this.ImageURL)) {
        OptCMUtil.DeleteURL(this.ImageURL);
      }
    }

    // Delete EMF Blob bytes if exists
    if (this.EMFBlobBytesID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.EMFBlobBytesID);
      if (currentObject) {
        currentObject.Delete();
      }
    }

    // Delete Ole Blob bytes if exists
    if (this.OleBlobBytesID !== -1) {
      currentObject = T3Gv.stdObj.GetObject(this.OleBlobBytesID);
      if (currentObject) {
        currentObject.Delete();
      }
    }

    // Remove field data
    this.BaseDrawObjectRemoveFieldData(true);

    // Update hooked object's dimension lines if applicable
    if (this.hooks.length) {
      hookObject = DataUtil.GetObjectPtr(this.hooks[0].objid, false);
      if (hookObject && hookObject.objecttype === NvConstant.FNObjectTypes.FlWall && !(hookObject.Dimensions & NvConstant.DimensionFlags.HideHookedObjDimensions)) {
        hooksBackup = Utils1.DeepCopy(this.hooks);
        this.hooks = [];
        tempHookElement = T3Gv.opt.svgObjectLayer.GetElementById(hookObject.BlockID);
        hookObject.UpdateDimensionLines(tempHookElement);
        this.hooks = hooksBackup;
      }
    }

    // // Delete Comment object if exists
    // if (this.CommentID >= 0) {
    //   T3Gv.opt.CommentObjectDelete(this);
    // }

    T3Util.Log("S.GroupSymbol - BaseDrawObjectDeleteObject output: executed");
  }

  BaseDrawObjectRemoveFieldData(shouldRemove: boolean, fieldDataTableId?: number) {
    T3Util.Log("S.GroupSymbol - BaseDrawObjectRemoveFieldData input:", { shouldRemove, fieldDataTableId });

    if (this.HasFieldData() && (!fieldDataTableId || this.fieldDataTableID === fieldDataTableId)) {
      // Retrieve the object pointer for the current BlockID (forcing load)
      DataUtil.GetObjectPtr(this.BlockID, true);

      if (shouldRemove) {
        if (this.fieldDataElemID < 0) {
          TODO.STData.DeleteFieldedDataTable(this.fieldDataTableID);
        } else {
          TODO.STData.FieldedDataDelRecord(this.fieldDataTableID, this.fieldDataElemID);
        }
      }

      // Reset field data properties
      this.fieldDataDatasetID = -1;
      this.fieldDataTableID = -1;
      this.fieldDataElemID = -1;
      this.dataStyleOverride = null;

      // Mark the Block as dirty so it gets refreshed
      DataUtil.AddToDirtyList(this.BlockID);

      // Refresh from field data
      this.BaseDrawObjectRefreshFromFieldData();
    }

    T3Util.Log("S.GroupSymbol - BaseDrawObjectRemoveFieldData output executed");
  }

  BaseDrawObjectRefreshFromFieldData(tableId) {
    T3Util.Log('S.GroupSymbol - BaseDrawingObject_RefreshFromFieldData input:', { tableId });

    if (tableId && this.fieldDataTableID !== tableId) {
      T3Util.Log('S.GroupSymbol - BaseDrawingObject_RefreshFromFieldData output:', false);
      return false;
    }

    const hasFieldDataInText = this.HasFieldDataInText(tableId);
    const hasFieldDataRules = this.HasFieldDataRules(tableId);
    let needsRefresh = false;

    if (!hasFieldDataInText && !hasFieldDataRules) {
      T3Util.Log('S.GroupSymbol - BaseDrawingObject_RefreshFromFieldData output:', false);
      return false;
    }

    this.GetFieldDataStyleOverride();

    if (hasFieldDataInText) {
      this.ChangeTextAttributes(null, null, null, null, null, null, null, true);
      needsRefresh = true;
    }

    if (TODO.STData.FieldedDataHasRulesForRecord(this.fieldDataTableID, this.fieldDataElemID)) {
      DataUtil.AddToDirtyList(this.BlockID);
      needsRefresh = true;
    }

    T3Util.Log('S.GroupSymbol - BaseDrawingObject_RefreshFromFieldData output:', needsRefresh);
    return needsRefresh;
  }

  ApplyEffects(svgElement, isHighlighted, extraParam) {
    T3Util.Log("S.GroupSymbol - ApplyEffects input:", { svgElement, isHighlighted, extraParam });

    svgElement = svgElement || T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);
    if (!svgElement) {
      T3Util.Log("S.GroupSymbol - ApplyEffects output: No SVG element found");
      return;
    }

    if (!T3Gv.opt.bDrawEffects || T3Gv.opt.bTokenizeStyle) {
      T3Util.Log("S.GroupSymbol - ApplyEffects output: Global flags disable effects");
      return;
    }

    const targetElement = svgElement.shapeGroup || svgElement;
    const effectsList = [];
    let glowColor = null;
    let glowSize = 4;

    if (isHighlighted) {
      glowColor = '#FFD64A';
    } else if (this.collabGlowColor) {
      glowColor = this.collabGlowColor;
      glowSize = 6;
    } else if (this.dataStyleOverride && this.dataStyleOverride.glowColor) {
      glowColor = this.dataStyleOverride.glowColor;
    }

    if (glowColor) {
      effectsList.push({
        type: BConstant.EffectType.GLOW,
        params: {
          color: glowColor,
          size: glowSize,
          asSecondary: true
        }
      });
      targetElement.Effects().SetEffects(effectsList, this.Frame);
      T3Util.Log("S.GroupSymbol - ApplyEffects output:", "Effects applied with glowColor", glowColor);
    } else {
      T3Util.Log("S.GroupSymbol - ApplyEffects output: No glow color configured");
    }
  }

  AllowTextEdit(): boolean {
    T3Util.Log("S.GroupSymbol - AllowTextEdit input:", {});
    const canEdit = Boolean(
      (this.TextFlags & NvConstant.TextFlags.AttachB) ||
      (this.TextFlags & NvConstant.TextFlags.AttachA) ||
      (this.TextFlags & NvConstant.TextFlags.AttachD) ||
      (this.DataID >= 0)
    );
    T3Util.Log("S.GroupSymbol - AllowTextEdit output:", canEdit);
    return canEdit;
  }

  RemoveFieldData(fieldKey, fieldValue) {
    T3Util.Log("S.GroupSymbol - RemoveFieldData input:", { fieldKey, fieldValue });
    Instance.Shape.BaseSymbol.prototype.RemoveFieldData.call(this, fieldKey, fieldValue);
    const shapesList = this.ShapesInGroup;
    const totalShapes = shapesList.length;
    for (let i = 0; i < totalShapes; i++) {
      const shapeObject = DataUtil.GetObjectPtr(shapesList[i], false);
      if (shapeObject) {
        shapeObject.RemoveFieldData(fieldKey, fieldValue);
      }
    }
    T3Util.Log("S.GroupSymbol - RemoveFieldData output executed");
  }

  HasFieldDataInText(fieldData: any): boolean {
    T3Util.Log("S.GroupSymbol - HasFieldDataInText input:", { fieldData });

    const shapesInGroup = this.ShapesInGroup;
    const totalShapes = shapesInGroup.length;

    if (Instance.Shape.BaseSymbol.prototype.HasFieldDataInText.call(this, fieldData)) {
      T3Util.Log("S.GroupSymbol - HasFieldDataInText output:", true);
      return true;
    }

    for (let index = 0; index < totalShapes; ++index) {
      const shapeObject = DataUtil.GetObjectPtr(shapesInGroup[index], false);
      if (shapeObject && shapeObject.HasFieldDataInText(fieldData)) {
        T3Util.Log("S.GroupSymbol - HasFieldDataInText output:", true);
        return true;
      }
    }

    T3Util.Log("S.GroupSymbol - HasFieldDataInText output:", false);
    return false;
  }

  HasFieldDataRules(criteria: any): boolean {
    T3Util.Log("S.GroupSymbol - HasFieldDataRules input:", { criteria });

    const shapesInGroup = this.ShapesInGroup;
    const shapesCount = shapesInGroup.length;

    if (Instance.Shape.BaseSymbol.prototype.HasFieldDataRules.call(this, criteria)) {
      T3Util.Log("S.GroupSymbol - HasFieldDataRules output:", true);
      return true;
    }

    for (let index = 0; index < shapesCount; index++) {
      const shapeObject = DataUtil.GetObjectPtr(shapesInGroup[index], false);
      if (shapeObject && shapeObject.HasFieldDataRules(criteria)) {
        T3Util.Log("S.GroupSymbol - HasFieldDataRules output:", true);
        return true;
      }
    }

    T3Util.Log("S.GroupSymbol - HasFieldDataRules output:", false);
    return false;
  }

  HasFieldDataForTable(tableId: any): boolean {
    T3Util.Log("S.GroupSymbol - HasFieldDataForTable input:", { tableId });
    const groupShapes = this.ShapesInGroup;
    const totalShapes = groupShapes.length;

    // Check in base symbol first
    if (Instance.Shape.BaseSymbol.prototype.HasFieldDataForTable.call(this, tableId)) {
      T3Util.Log("S.GroupSymbol - HasFieldDataForTable output:", true);
      return true;
    }

    // Check each shape in the group
    for (let index = 0; index < totalShapes; index++) {
      const shapeObj = DataUtil.GetObjectPtr(groupShapes[index], false);
      if (shapeObj && shapeObj.HasFieldDataForTable(tableId)) {
        T3Util.Log("S.GroupSymbol - HasFieldDataForTable output:", true);
        return true;
      }
    }

    T3Util.Log("S.GroupSymbol - HasFieldDataForTable output:", false);
    return false;
  }

  HasFieldDataRecord(fieldKey, fieldValue, recordId) {
    T3Util.Log("S.GroupSymbol - HasFieldDataRecord input:", { fieldKey, fieldValue, recordId });
    const shapesInGroup = this.ShapesInGroup;
    const totalShapes = shapesInGroup.length;

    if (Instance.Shape.BaseSymbol.prototype.HasFieldDataRecord.call(this, fieldKey, fieldValue, recordId)) {
      T3Util.Log("S.GroupSymbol - HasFieldDataRecord output:", true);
      return true;
    }
    if (!recordId) {
      T3Util.Log("S.GroupSymbol - HasFieldDataRecord output:", false);
      return false;
    }
    for (let index = 0; index < totalShapes; ++index) {
      const shapeObject = DataUtil.GetObjectPtr(shapesInGroup[index], false);
      if (shapeObject && shapeObject.HasFieldDataRecord(fieldKey, fieldValue, recordId)) {
        T3Util.Log("S.GroupSymbol - HasFieldDataRecord output:", true);
        return true;
      }
    }
    T3Util.Log("S.GroupSymbol - HasFieldDataRecord output:", false);
    return false;
  }

  RefreshFromFieldData(fieldData) {
    T3Util.Log("S.GroupSymbol - refreshFromFieldData input:", fieldData);

    let needsRefresh = false;

    if (Instance.Shape.BaseSymbol.prototype.RefreshFromFieldData.call(this, fieldData)) {
      needsRefresh = true;
    }

    if (this.HasFieldDataInText(fieldData)) {
      this.GetFieldDataStyleOverride();
      this.ChangeTextAttributes(null, null, null, null, null, null, null, true);
      needsRefresh = true;
    }

    if (this.HasFieldDataRules(fieldData)) {
      DataUtil.AddToDirtyList(this.BlockID);
      needsRefresh = true;
    }

    T3Util.Log("S.GroupSymbol - refreshFromFieldData output:", needsRefresh);
    return needsRefresh;
  }

  RemapDataFields(fieldData) {
    T3Util.Log("S.GroupSymbol - remapDataFields input:", fieldData);

    Instance.Shape.BaseSymbol.prototype.RemapDataFields.call(this, fieldData);
    const shapesGroup = this.ShapesInGroup;
    for (let index = 0; index < shapesGroup.length; index++) {
      const shapeObject = DataUtil.GetObjectPtr(shapesGroup[index], false);
      if (shapeObject) {
        shapeObject.RemapDataFields(fieldData);
      }
    }

    T3Util.Log("S.GroupSymbol - remapDataFields output: completed");
  }
}

export default GroupSymbol;

