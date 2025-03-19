

import T3Svg from "../Util/T3Svg"
import OptConstant from '../Data/Constant/OptConstant'
import BoundInfo from '../Model/BoundInfo'
import BConstant from "./B.Constant"

/**
 * Handles visual effects for SVG elements in the T3000 HVAC system.
 * This class provides methods to apply, customize, and manage various visual effects
 * such as drop shadows, glows, bevels, and reflections on SVG elements.
 *
 * The Effects class manages both primary effects (applied directly to the element)
 * and secondary effects (which may create additional elements).
 *
 * @remarks
 * Effects are applied through SVG filters and are rendered based on the element's bounds.
 * The class automatically handles filter sizing constraints to ensure compatibility
 * across different browsers and screen sizes.
 *
 * @example
 * // Create an effects instance for an SVG element
 * const elementEffects = new Effects(svgElement);
 *
 * // Apply a drop shadow effect
 * elementEffects.SetEffects([{
 *   type: BConstant.EffectType.DROPSHADOW,
 *   params: {
 *     xOff: 5,
 *     yOff: 5,
 *     size: 2,
 *     color: '#000000'
 *   }
 * }]);
 *
 * @example
 * // Apply multiple effects together
 * elementEffects.SetEffects([
 *   {
 *     type: BConstant.EffectType.GLOW,
 *     params: {
 *       size: 3,
 *       color: '#ff0000'
 *     }
 *   },
 *   {
 *     type: BConstant.EffectType.BEVEL,
 *     params: {
 *       size: 2,
 *       dir: BConstant.FilterDirection.LEFTTOP,
 *       type: BConstant.BevelType.SOFT
 *     }
 *   }
 * ]);
 *
 * @example
 * // Clear all effects from an element
 * elementEffects.ClearEffects();
 */
class Effects {

  /**
   * Reference to the element to which visual effects are applied
   * Typically an SVG element that can have filters applied
   */
  public element: any;

  /**
   * Current bounds of the element in the format {x, y, width, height}
   * Used for calculating effect parameters relative to element size
   */
  public curBounds: BoundInfo;

  /**
   * Constructor for the Effects class that handles SVG visual effects
   * @param element - The element to apply effects to, typically an SVG element
   */
  constructor(element) {
    this.element = element;
    this.curBounds = new BoundInfo();
  }

  /**
   * Applies visual effects to an element based on provided effect settings
   * @param effectsList - Array of effect objects to apply to the element
   * @param elementBounds - The bounding box dimensions where effects should be applied
   */
  SetEffects(effectsList?, elementBounds?) {
    let effectsId = this.GetEffectsID(effectsList, false);
    let secondaryEffects = [];
    let widthSize = BConstant.EffectSize.Default;
    let heightSize = BConstant.EffectSize.Default;
    let skipMainFilter = false;
    let primaryEffectsCount = 0;
    let effectsLength = 0;

    if (effectsList) {
      effectsLength = effectsList.length || 0;
    }

    elementBounds = elementBounds || this.curBounds;
    this.curBounds = elementBounds;

    if (elementBounds) {
      widthSize = elementBounds.width < 500 ? BConstant.EffectSize.Small :
        elementBounds.width < 1500 ? BConstant.EffectSize.Medium :
          elementBounds.width < 3000 ? BConstant.EffectSize.Large :
            BConstant.EffectSize.Giant;

      heightSize = elementBounds.height < 500 ? BConstant.EffectSize.Small :
        elementBounds.height < 1500 ? BConstant.EffectSize.Medium :
          elementBounds.height < 3000 ? BConstant.EffectSize.Large :
            BConstant.EffectSize.Giant;
    }

    // Separate primary and secondary effects
    for (let i = 0; i < effectsLength; i++) {
      if (Effects.IsSecondaryEffect(effectsList[i])) {
        secondaryEffects.push(effectsList[i]);
      } else {
        primaryEffectsCount++;
      }
    }

    // Handle filter limit constraints
    if (primaryEffectsCount && !this.FilterLimitNeeded(elementBounds, widthSize, heightSize)) {
      // Continue with filters
    } else {
      this.element.svgObj.node.removeAttribute('filter');
      if (this.element.svgObj.attr.filter) {
        delete this.element.svgObj.filter;
      }
      skipMainFilter = true;
    }

    // Clean up existing external effects if no new secondary effects
    if (!secondaryEffects.length && this.element.externalEffects) {
      for (let i = 0; i < this.element.externalEffects.length; i++) {
        this.element.parent.RemoveElement(this.element.externalEffects[i], true);
      }
      this.element.externalEffects = null;
    }

    if (!skipMainFilter || secondaryEffects.length) {
      // Handle primary effects
      if (!skipMainFilter) {
        effectsId += widthSize.id + heightSize.id;

        if (!this.element.doc.DefExists(effectsId)) {
          let filterContainer = new T3Svg.Container(T3Svg.create('filter'));
          let sourceInput = 'SourceGraphic';
          let outputEffects = [];
          let extraEffect;

          filterContainer.attr('id', effectsId);
          filterContainer.attr('x', -widthSize.percentage);
          filterContainer.attr('y', -heightSize.percentage);
          filterContainer.attr('width', 1 + 2 * widthSize.percentage);
          filterContainer.attr('height', 1 + 2 * heightSize.percentage);

          // Apply inside effects
          for (let i = 0; i < effectsLength; i++) {
            if (effectsList[i].type.inside) {
              if (this.DefineEffect(filterContainer, effectsList[i].type, effectsList[i].params, sourceInput, 'sourceEffect')) {
                sourceInput = 'sourceEffect';
              }
            }
          }

          // Apply outside effects
          for (let i = 0; i < effectsLength; i++) {
            if (effectsList[i].type.outside) {
              if (effectsList[i].type.id == BConstant.EffectType.CASTSHADOW.id ||
                effectsList[i].type.id == BConstant.EffectType.REFLECT.id) {
                extraEffect = effectsList[i];
              } else {
                let effectOutput = 'oEffect' + i;
                if (this.DefineEffect(filterContainer, effectsList[i].type, effectsList[i].params, sourceInput, effectOutput)) {
                  outputEffects.push(effectOutput);
                }
              }
            }
          }

          // Merge all effects
          let mergeContainer = new T3Svg.Container(T3Svg.create('feMerge'));
          let effectsCount = outputEffects.length;

          for (let i = 0; i < effectsCount; i++) {
            let mergeNode = new T3Svg.Element(T3Svg.create('feMergeNode'));
            mergeNode.attr('in', outputEffects[i]);
            mergeContainer.add(mergeNode);
          }

          let mergeNode = new T3Svg.Element(T3Svg.create('feMergeNode'));
          mergeNode.attr('in', sourceInput);
          mergeContainer.add(mergeNode);
          filterContainer.add(mergeContainer);
          this.element.doc.Defs().add(filterContainer);
        }

        this.element.SetEffect(effectsId);
      }

      // Handle secondary effects
      if (secondaryEffects.length) {
        // Assign IDs to secondary effects
        for (let i = 0; i < secondaryEffects.length; i++) {
          let effect = secondaryEffects[i];
          effect.effectID = this.GetEffectsID([effect], true);
        }

        // Clean up existing external effects
        if (this.element.externalEffects) {
          for (let i = this.element.externalEffects.length - 1; i >= 0; i--) {
            let effectElement = this.element.externalEffects[i];
            let elementId = effectElement.GetID();

            // Match existing elements with new effects
            for (let j = 0; j < secondaryEffects.length; j++) {
              let effect = secondaryEffects[j];
              if (elementId == effect.effectID) {
                effect.elem = effectElement;
                break;
              }
            }

            this.element.parent.RemoveElement(this.element.externalEffects[i], true);
          }
        }

        this.element.externalEffects = [];

        // Create new secondary effect elements
        for (let i = 0; i < secondaryEffects.length; i++) {
          let effect = secondaryEffects[i];
          let effectElement = effect.elem;

          if (!effectElement) {
            effectElement = this.CreateSecondaryEffectElement(effect, elementBounds, widthSize, heightSize);
            effectElement.SetID(effect.effectID);
          }

          if (effectElement) {
            this.element.externalEffects.push(effectElement);
            this.element.parent.AddElement(effectElement, i, true);
          }
        }
      }
    }
  }

  /**
   * Creates a secondary effect element based on the provided effect parameters
   * @param effect - The effect object containing type and parameters
   * @param elementBounds - The bounding dimensions of the element
   * @param widthSize - Width sizing information for the effect
   * @param heightSize - Height sizing information for the effect
   * @returns A new element with the secondary effect applied
   */
  CreateSecondaryEffectElement(effect, elementBounds, widthSize, heightSize) {
    let elementCopy;

    if (Effects.IsSecondaryEffect(effect)) {
      elementCopy = this.element.doc.CreateShape(OptConstant.CSType.ShapeCopy);

      if (elementCopy) {
        elementCopy.SetElementSource(this.element);
        elementCopy.Effects().SetSecondaryEffect(effect, elementBounds, widthSize, heightSize);
        elementCopy.svgObj.attr('sfx', 1);
      }
    }

    return elementCopy;
  }

  /**
   * Applies a secondary effect to an element and configures its appearance
   * @param effect - The effect object containing type and parameters
   * @param elementBounds - The bounding dimensions of the element
   * @param widthSize - Width sizing information for the effect
   * @param heightSize - Height sizing information for the effect
   */
  SetSecondaryEffect(effect, elementBounds, widthSize, heightSize) {
    let verticalOffset, verticalRatio, offsetY, offsetX, angle, horizontalOffset;
    let effectsId = 's' + this.GetEffectsID([effect], true);

    if (Effects.IsSecondaryEffect(effect)) {
      if (effect.type.id === BConstant.EffectType.REFLECT.id ||
        effect.type.id === BConstant.EffectType.CASTSHADOW.id) {

        verticalOffset = Math.abs(effect.params.yOff);
        verticalRatio = verticalOffset / elementBounds.height;

        if (effect.params.yOff > 0) {
          verticalRatio = -verticalRatio;
          offsetY = elementBounds.height + verticalOffset;
        } else {
          offsetY = elementBounds.height - verticalOffset;
        }

        offsetX = Math.max(-verticalOffset, 2 * effect.params.xOff);
        offsetX = Math.min(offsetX, verticalOffset);
        angle = (offsetX / verticalOffset) * 45;
        horizontalOffset = verticalOffset / Math.tan((90 - angle) * Math.PI / 180);

        this.element.svgObj.size(elementBounds.width, elementBounds.height);
        let transform = `translate(${horizontalOffset},${offsetY}) skewX(${angle}) scale(1,${verticalRatio})`;
        this.element.svgObj.attr('transform', transform);

        if (effect.type.id === BConstant.EffectType.REFLECT.id) {
          this.element.svgObj.attr('opacity', 0.4);
          return;
        }
      }

      effectsId += widthSize.id + heightSize.id;

      if (!this.element.doc.DefExists(effectsId)) {
        let filterContainer = new T3Svg.Container(T3Svg.create('filter'));
        filterContainer.attr('id', effectsId);
        filterContainer.attr('x', -widthSize.pct);
        filterContainer.attr('y', -heightSize.pct);
        filterContainer.attr('width', 1 + 2 * widthSize.pct);
        filterContainer.attr('height', 1 + 2 * heightSize.pct);

        this.curBounds = elementBounds;

        if (effect.type.id === BConstant.EffectType.CASTSHADOW.id) {
          this.DefineCastShadow(filterContainer, effect.params, 'SourceAlpha', '');
        } else if (effect.type.id === BConstant.EffectType.REFLECT.id) {
          this.DefineReflect(filterContainer, effect.params, 'SourceGraphic', '');
        } else if (effect.type.id === BConstant.EffectType.DROPSHADOW.id) {
          this.DefineDropShadow(filterContainer, effect.params, 'SourceAlpha', '');
        } else if (effect.type.id === BConstant.EffectType.GLOW.id) {
          this.DefineGlow(filterContainer, effect.params, 'SourceAlpha', '');
        }

        this.element.doc.Defs().add(filterContainer);
      }

      this.element.SetEffect(effectsId);
    }
  }

  /**
   * Clears all visual effects from the element
   */
  ClearEffects() {
    this.SetEffects();
  }

  /**
   * Determines if a filter size limit is needed based on browser constraints
   * @param elementBounds - The bounding dimensions of the element
   * @param widthSizeInfo - Width sizing information for the effect
   * @param heightSizeInfo - Height sizing information for the effect
   * @returns Boolean indicating whether filter limits should be applied
   */
  FilterLimitNeeded(elementBounds, widthSizeInfo, heightSizeInfo) {
    if (!elementBounds) {
      return false;
    }

    let workArea = this.element.doc.GetWorkArea();
    let widthRatio = 1 + 2 * widthSizeInfo.pct;
    let heightRatio = 1 + 2 * heightSizeInfo.pct;
    let scaledWidth = elementBounds.width * workArea.docToScreenScale * widthRatio;
    let scaledHeight = elementBounds.height * workArea.docToScreenScale * heightRatio;

    return scaledWidth > 4096 || scaledHeight > 4096;
  }

  /**
   * Generates a unique identifier for a set of effects
   * @param effectsList - Array of effect objects
   * @param isSecondary - Boolean indicating if generating ID for secondary effects
   * @returns String identifier for the effects combination
   */
  GetEffectsID(effectsList, isSecondary) {
    let effectsId = 'FX';
    let outsideEffectsCount = 0;
    let insideEffectsCount = 0;
    let effectsLength = effectsList && effectsList.length || 0;

    if (!effectsLength) {
      return effectsId + '_NONE';
    }

    isSecondary = isSecondary || false;

    for (let i = 0; i < effectsLength; i++) {
      if (effectsList[i].type.outside) {
        if (Effects.IsSecondaryEffect(effectsList[i]) !== isSecondary) continue;

        effectsId += '_' + effectsList[i].type.id;

        if (effectsList[i].params.xOff !== undefined) {
          effectsId += '.' + effectsList[i].params.xOff;
        }

        if (effectsList[i].params.yOff !== undefined) {
          effectsId += '.' + effectsList[i].params.yOff;
        }

        if (effectsList[i].params.size !== undefined) {
          effectsId += '.' + effectsList[i].params.size;
        }

        if (effectsList[i].params.color !== undefined) {
          effectsId += effectsList[i].params.color;
        }

        outsideEffectsCount++;
      }
    }

    for (let i = 0; i < effectsLength; i++) {
      if (effectsList[i].type.inside) {
        effectsId += '_' + effectsList[i].type.id;

        if (effectsList[i].params.size !== undefined) {
          effectsId += '.' + effectsList[i].params.size;
        }

        if (effectsList[i].params.type !== undefined) {
          effectsId += '.' + effectsList[i].params.type;
        }

        if (effectsList[i].params.dir !== undefined) {
          effectsId += '.' + effectsList[i].params.dir;
        }

        if (effectsList[i].params.color !== undefined) {
          effectsId += effectsList[i].params.color;
        }

        insideEffectsCount++;
      }
    }

    if (!outsideEffectsCount && !insideEffectsCount) {
      effectsId += '_NONE';
    }

    return effectsId;
  }

  /**
   * Creates the appropriate SVG filter effect based on effect type
   * @param containerElement - The SVG container element to add the filter to
   * @param effectType - The type of effect to define
   * @param effectParams - Parameters for configuring the effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   * @returns Boolean indicating whether the effect was successfully defined
   */
  DefineEffect(containerElement, effectType, effectParams, sourceInput, outputId) {
    let success = true;

    switch (effectType.id) {
      case BConstant.EffectType.DROPSHADOW.id:
        this.DefineDropShadow(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.CASTSHADOW.id:
        this.DefineCastShadow(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.REFLECT.id:
        this.DefineReflect(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.GLOW.id:
        this.DefineGlow(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.BEVEL.id:
        this.DefineBevel(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.GLOSS.id:
        this.DefineGloss(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.INNERGLOW.id:
        this.DefineInnerGlow(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.INNERSHADOW.id:
        this.DefineInnerShadow(containerElement, effectParams, sourceInput, outputId);
        break;
      case BConstant.EffectType.RECOLOR.id:
        this.DefineRecolor(containerElement, effectParams, sourceInput, outputId);
        break;
      default:
        success = false;
    }

    return success;
  }

  /**
   * Creates a drop shadow filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param effectParameters - Parameters for configuring the drop shadow effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineDropShadow(container, effectParameters, sourceInput, outputId) {
    let element;
    let horizontalOffset = effectParameters.xOff || 0;
    let verticalOffset = effectParameters.yOff || 0;
    let shadowColor = effectParameters.color || '#000';
    let blurSize = effectParameters.size || 2;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', shadowColor);
    element.attr('flood-opacity', 0.3);
    element.attr('result', 'flood');
    container.add(element);

    // Create composite element
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr('in', 'flood');
    element.attr('in2', 'SourceAlpha');
    element.attr('operator', 'in');
    element.attr('result', 'mask');
    container.add(element);

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr('in', 'mask');
    element.attr('stdDeviation', blurSize);
    container.add(element);

    // Create offset element
    element = new T3Svg.Element(T3Svg.create('feOffset'));
    element.attr('dx', horizontalOffset);
    element.attr('dy', verticalOffset);
    element.attr('result', outputId);
    container.add(element);
  }

  /**
   * Creates a cast shadow filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param effectParameters - Parameters for configuring the cast shadow effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineCastShadow(container, effectParameters, sourceInput, outputId) {
    let element;
    let blurSize = effectParameters.size || 2;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', '#FFF');
    element.attr('flood-opacity', 0.3);
    element.attr('result', 'flood');
    container.add(element);

    // Create composite element
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr('in2', 'flood');
    element.attr('in', 'SourceAlpha');
    element.attr('operator', 'in');
    element.attr('result', 'mask');
    container.add(element);

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr('in', 'mask');
    element.attr('stdDeviation', blurSize);
    container.add(element);
  }

  /**
   * Creates a reflection filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param effectParameters - Parameters for configuring the reflection effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineReflect(container, effectParameters, sourceInput, outputId) {
    let element;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', '#FFF');
    element.attr('flood-opacity', 0.3);
    element.attr('result', 'flood');
    container.add(element);

    // Create composite element
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr('in2', 'flood');
    element.attr('in', sourceInput);
    element.attr('operator', 'in');
    element.attr('result', 'mask');

    if (outputId) {
      element.attr('result', outputId);
    }

    container.add(element);
  }

  /**
   * Creates a glow filter effect around an SVG element
   * @param container - SVG container element to add the filter to
   * @param effectParameters - Parameters for configuring the glow effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineGlow(container, effectParameters, sourceInput, outputId) {
    let element;
    let glowColor = effectParameters.color || '#fff';
    let blurSize = effectParameters.size || 2;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', glowColor);
    element.attr('result', 'flood');
    container.add(element);

    // Create composite element
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr('in', 'flood');
    element.attr('in2', 'SourceAlpha');
    element.attr('operator', 'in');
    element.attr('result', 'mask');
    container.add(element);

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr('in', 'mask');
    element.attr('stdDeviation', blurSize);
    element.attr('result', outputId);
    container.add(element);
  }

  /**
   * Creates a bevel filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param effectParameters - Parameters for configuring the bevel effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineBevel(container, effectParameters, sourceInput, outputId) {
    let element;
    let lightElement;
    let bevelSize = effectParameters.size || 1;
    let surfaceScale = 6;
    let azimuth = 0;

    switch (effectParameters.dir || BConstant.FilterDirection.LEFTTOP) {
      case BConstant.FilterDirection.RIGHT:
        azimuth = 0;
        break;
      case BConstant.FilterDirection.RIGHTBOTTOM:
        azimuth = 45;
        break;
      case BConstant.FilterDirection.BOTTOM:
        azimuth = 90;
        break;
      case BConstant.FilterDirection.LEFTBOTTOM:
        azimuth = 135;
        break;
      case BConstant.FilterDirection.LEFT:
        azimuth = 180;
        break;
      case BConstant.FilterDirection.LEFTTOP:
        azimuth = 225;
        break;
      case BConstant.FilterDirection.TOP:
        azimuth = 270;
        break;
      case BConstant.FilterDirection.RIGHTTOP:
        azimuth = 315;
    }

    if (effectParameters.type == BConstant.BevelType.HARD) {
      surfaceScale = 20;
    }

    if (effectParameters.type == BConstant.BevelType.BUMP) {
      // Create morphology element for erosion
      element = new T3Svg.Element(T3Svg.create('feMorphology'));
      element.attr({
        in: 'SourceAlpha',
        operator: 'erode',
        radius: bevelSize
      });
      container.add(element);

      // Create blur element
      element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
      element.attr({
        stdDeviation: bevelSize,
        result: 'blur'
      });
      container.add(element);

      // Create composite for inner area
      element = new T3Svg.Element(T3Svg.create('feComposite'));
      element.attr({
        in: 'blur',
        in2: 'SourceAlpha',
        operator: 'arithmetic',
        k2: '-1',
        k3: '1',
        result: 'inner'
      });
      container.add(element);

      // Create composite to intersect blur with inner
      element = new T3Svg.Element(T3Svg.create('feComposite'));
      element.attr({
        in: 'blur',
        in2: 'inner',
        operator: 'in'
      });
      container.add(element);
    } else {
      // Create blur element
      element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
      element.attr({
        in: 'SourceAlpha',
        stdDeviation: bevelSize
      });
      container.add(element);

      // Create composite to mask with source alpha
      element = new T3Svg.Element(T3Svg.create('feComposite'));
      element.attr({
        in2: 'SourceAlpha',
        operator: 'in'
      });
      container.add(element);
    }

    // Create diffuse lighting element
    element = new T3Svg.Container(T3Svg.create('feDiffuseLighting'));
    element.attr({
      surfaceScale: surfaceScale,
      'lighting-color': 'white',
      diffuseConstant: '1',
      result: 'hilite'
    });

    // Add distant light to lighting element
    lightElement = new T3Svg.Element(T3Svg.create('feDistantLight'));
    lightElement.attr({
      azimuth: azimuth,
      elevation: '40'
    });
    element.add(lightElement);
    container.add(element);

    // Create final composite
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in: sourceInput,
      in2: 'hilite',
      k1: 1.5,
      operator: 'arithmetic',
      result: outputId
    });
    container.add(element);
  }

  /**
   * Creates a glossy effect filter for an SVG element
   * @param container - SVG container element to add the filter to
   * @param parameters - Configuration parameters for the gloss effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineGloss(container, parameters, sourceInput, outputId) {
    let element;
    let lightElement;
    let effectSize = parameters.size || 2;
    let effectDirection = parameters.dir || BConstant.FilterDirection.LEFTTOP;
    let glossType = parameters.type || BConstant.GlossType.Soft;
    let glossColor = parameters.color || '#ffffff';
    let specularConstant = 1;
    let azimuth = 0;

    switch (effectDirection) {
      case BConstant.FilterDirection.RIGHT:
        azimuth = 0;
        break;
      case BConstant.FilterDirection.RIGHTBOTTOM:
        azimuth = 45;
        break;
      case BConstant.FilterDirection.BOTTOM:
        azimuth = 90;
        break;
      case BConstant.FilterDirection.LEFTBOTTOM:
        azimuth = 135;
        break;
      case BConstant.FilterDirection.LEFT:
        azimuth = 180;
        break;
      case BConstant.FilterDirection.LEFTTOP:
        azimuth = 225;
        break;
      case BConstant.FilterDirection.TOP:
        azimuth = 270;
        break;
      case BConstant.FilterDirection.RIGHTTOP:
        azimuth = 315;
    }

    if (glossType == BConstant.GlossType.Hard) {
      specularConstant = 1.2;
    }

    // Adjust size
    effectSize /= 4;
    effectSize = Math.max(Math.min(effectSize, 20), 2);

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: effectSize
    });
    container.add(element);

    // Create composite to mask with source alpha
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'SourceAlpha',
      operator: 'in'
    });
    container.add(element);

    // Create specular lighting element
    element = new T3Svg.Container(T3Svg.create('feSpecularLighting'));
    element.attr({
      surfaceScale: 20,
      'lighting-color': 'white',
      specularConstant: specularConstant,
      specularExponent: 2,
      result: 'hilite'
    });

    // Add distant light to lighting element
    lightElement = new T3Svg.Element(T3Svg.create('feDistantLight'));
    lightElement.attr({
      azimuth: azimuth,
      elevation: '40'
    });
    element.add(lightElement);
    container.add(element);

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr({
      'flood-color': glossColor,
      'flood-opacity': 0.7
    });
    container.add(element);

    // Create composite to mask flood with source alpha
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'SourceAlpha',
      operator: 'in',
      result: 'flood'
    });
    container.add(element);

    // Create composite to combine hilite and flood
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in: 'hilite',
      in2: 'flood',
      k1: 1.5,
      operator: 'arithmetic'
    });
    container.add(element);

    // Create blend for final output
    element = new T3Svg.Element(T3Svg.create('feBlend'));
    element.attr({
      in2: sourceInput,
      mode: 'lighten',
      result: outputId
    });
    container.add(element);
  }

  /**
   * Creates an inner glow filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param parameters - Configuration parameters for the inner glow effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineInnerGlow(container, parameters, sourceInput, outputId) {
    let element;
    let glowColor = parameters.color || '#fff';
    let blurSize = parameters.size || 0;

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: blurSize
    });
    container.add(element);

    // Create composite for shadow difference
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'SourceAlpha',
      operator: 'arithmetic',
      k2: '-1',
      k3: '1',
      result: 'shadowdiff'
    });
    container.add(element);

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr({
      'flood-color': glowColor,
      'flood-opacity': 1
    });
    container.add(element);

    // Create composite to mask with shadow difference
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'shadowdiff',
      operator: 'in'
    });
    container.add(element);

    // Create final composite
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: sourceInput,
      operator: 'over',
      result: outputId
    });
    container.add(element);
  }

  /**
   * Creates an inner shadow filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param parameters - Configuration parameters for the inner shadow effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineInnerShadow(container, parameters, sourceInput, outputId) {
    let element;
    let shadowDirection = parameters.dir || BConstant.FilterDirection.LEFTTOP;
    let shadowSize = parameters.size || 0;
    let offsetX = 0;
    let offsetY = 0;

    switch (shadowDirection) {
      case BConstant.FilterDirection.RIGHT:
        offsetX = -shadowSize;
        offsetY = 0;
        break;
      case BConstant.FilterDirection.RIGHTBOTTOM:
        offsetX = -shadowSize;
        offsetY = -shadowSize;
        break;
      case BConstant.FilterDirection.BOTTOM:
        offsetX = 0;
        offsetY = -shadowSize;
        break;
      case BConstant.FilterDirection.LEFTBOTTOM:
        offsetX = shadowSize;
        offsetY = -shadowSize;
        break;
      case BConstant.FilterDirection.LEFT:
        offsetX = shadowSize;
        offsetY = 0;
        break;
      case BConstant.FilterDirection.LEFTTOP:
        offsetX = shadowSize;
        offsetY = shadowSize;
        break;
      case BConstant.FilterDirection.TOP:
        offsetX = 0;
        offsetY = shadowSize;
        break;
      case BConstant.FilterDirection.RIGHTTOP:
        offsetX = -shadowSize;
        offsetY = shadowSize;
    }

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: shadowSize
    });
    container.add(element);

    // Create offset element
    element = new T3Svg.Element(T3Svg.create('feOffset'));
    element.attr({
      dx: offsetX,
      dy: offsetY
    });
    container.add(element);

    // Create composite for shadow difference
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'SourceAlpha',
      operator: 'arithmetic',
      k2: '-1',
      k3: '1',
      result: 'shadowdiff'
    });
    container.add(element);

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr({
      'flood-color': 'black',
      'flood-opacity': 1
    });
    container.add(element);

    // Create composite to mask with shadow difference
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'shadowdiff',
      operator: 'in'
    });
    container.add(element);

    // Create final composite
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: sourceInput,
      operator: 'over',
      result: outputId
    });
    container.add(element);
  }

  /**
   * Creates a recolor filter effect for an SVG element
   * @param container - SVG container element to add the filter to
   * @param parameters - Configuration parameters for the recolor effect
   * @param sourceInput - Input source for the filter effect
   * @param outputId - ID for the filter output
   */
  DefineRecolor(container, parameters, sourceInput, outputId) {
    let element;
    let recolorValue = parameters.color || '#000000';

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr({
      'flood-color': recolorValue,
      'flood-opacity': 1
    });
    container.add(element);

    // Create composite element
    element = new T3Svg.Element(T3Svg.create('feComposite'));
    element.attr({
      in2: 'SourceAlpha',
      operator: 'in',
      result: outputId
    });
    container.add(element);
  }


  /**
   * Calculates the horizontal offset for a secondary effect based on vertical and horizontal offsets
   * @param horizontalOffset - The original horizontal offset value
   * @param verticalOffset - The vertical offset value
   * @returns Calculated horizontal offset for the effect
   */
  static CalcSecondaryEffectOffset(horizontalOffset, verticalOffset) {
    let absoluteVerticalOffset = Math.abs(verticalOffset);
    let adjustedHorizontalOffset = Math.max(-absoluteVerticalOffset, 2 * horizontalOffset);
    adjustedHorizontalOffset = Math.min(adjustedHorizontalOffset, absoluteVerticalOffset);

    let angle = (adjustedHorizontalOffset / absoluteVerticalOffset) * 45;
    let result = absoluteVerticalOffset / Math.tan((90 - angle) * Math.PI / 180);

    return result;
  }

  /**
   * Determines if an effect is considered a secondary effect
   * @param effect - The effect object to evaluate
   * @returns Boolean indicating whether the effect is a secondary effect
   */
  static IsSecondaryEffect(effect) {
    return !(!effect || !effect.type) && (
      effect.params.asSecondary ||
      effect.type.id === BConstant.EffectType.CASTSHADOW.id ||
      effect.type.id === BConstant.EffectType.REFLECT.id
    );
  }

}

export default Effects
