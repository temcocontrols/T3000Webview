

import $ from 'jquery';
import T3Svg from "../Helper/T3Svg"
import Document from "./B.Document";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class Effects {

  public element: any;
  public curBounds: any;

  constructor(element) {
    console.log("B.Element.Effect: constructor called with element", element);
    this.element = element;
    this.curBounds = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };
    console.log("B.Element.Effect: constructor finished");
  }

  SetEffects(effects, bounds) {
    console.log("B.Element.Effect: SetEffects called with", { effects, bounds });

    let i;
    let effectsId = this.GetEffectsID(effects, false);
    let secondaryEffects = [];
    let widthSize = Effects.EffectSize.DEFAULT;
    let heightSize = Effects.EffectSize.DEFAULT;
    let skipMainFilter = false;
    let primaryEffectsCount = 0;
    let effectsLength = 0;

    if (effects) {
      effectsLength = effects.length || 0;
    }

    bounds = bounds || this.curBounds;
    this.curBounds = bounds;

    if (bounds) {
      widthSize = bounds.width < 500 ? Effects.EffectSize.SMALL :
        bounds.width < 1500 ? Effects.EffectSize.MEDIUM :
          bounds.width < 3000 ? Effects.EffectSize.LARGE :
            Effects.EffectSize.GIANT;

      heightSize = bounds.height < 500 ? Effects.EffectSize.SMALL :
        bounds.height < 1500 ? Effects.EffectSize.MEDIUM :
          bounds.height < 3000 ? Effects.EffectSize.LARGE :
            Effects.EffectSize.GIANT;
    }

    for (i = 0; i < effectsLength; i++) {
      if (Effects.IsSecondaryEffect(effects[i])) {
        secondaryEffects.push(effects[i]);
      } else {
        primaryEffectsCount++;
      }
    }

    if (primaryEffectsCount && !this.FilterLimitNeeded(bounds, widthSize, heightSize)) {
      // Continue with filters
    } else {
      this.element.svgObj.node.removeAttribute('filter');
      if (this.element.svgObj.attr.filter) {
        delete this.element.svgObj.filter;
      }
      skipMainFilter = true;
    }

    if (!secondaryEffects.length && this.element.externalEffects) {
      for (i = 0; i < this.element.externalEffects.length; i++) {
        this.element.parent.RemoveElement(this.element.externalEffects[i], true);
      }
      this.element.externalEffects = null;
    }

    if (!skipMainFilter || secondaryEffects.length) {
      if (!skipMainFilter) {
        effectsId += widthSize.id + heightSize.id;

        if (!this.element.doc.DefExists(effectsId)) {
          let effect, mergeNode;
          let filterContainer = new T3Svg.Container(T3Svg.create('filter'));
          let sourceInput = 'SourceGraphic';
          let outputEffects = [];
          let extraEffect;

          filterContainer.attr('id', effectsId);
          filterContainer.attr('x', -widthSize.pct);
          filterContainer.attr('y', -heightSize.pct);
          filterContainer.attr('width', 1 + 2 * widthSize.pct);
          filterContainer.attr('height', 1 + 2 * heightSize.pct);

          for (i = 0; i < effectsLength; i++) {
            if (effects[i].type.inside) {
              if (this.DefineEffect(filterContainer, effects[i].type, effects[i].params, sourceInput, 'sourceEffect')) {
                sourceInput = 'sourceEffect';
              }
            }
          }

          for (i = 0; i < effectsLength; i++) {
            if (effects[i].type.outside) {
              if (effects[i].type.id == Effects.EffectType.CASTSHADOW.id ||
                effects[i].type.id == Effects.EffectType.REFLECT.id) {
                extraEffect = effects[i];
              } else {
                let effectOutput = 'oEffect' + i;
                if (this.DefineEffect(filterContainer, effects[i].type, effects[i].params, sourceInput, effectOutput)) {
                  outputEffects.push(effectOutput);
                }
              }
            }
          }

          let mergeContainer = new T3Svg.Container(T3Svg.create('feMerge'));
          effectsLength = outputEffects.length;

          for (i = 0; i < effectsLength; i++) {
            mergeNode = new T3Svg.Element(T3Svg.create('feMergeNode'));
            mergeNode.attr('in', outputEffects[i]);
            mergeContainer.add(mergeNode);
          }

          mergeNode = new T3Svg.Element(T3Svg.create('feMergeNode'));
          mergeNode.attr('in', sourceInput);
          mergeContainer.add(mergeNode);
          filterContainer.add(mergeContainer);
          this.element.doc.Defs().add(filterContainer);
        }

        this.element.SetEffect(effectsId);
      }

      if (secondaryEffects.length) {
        let effect, effectElement;

        for (i = 0; i < secondaryEffects.length; i++) {
          effect = secondaryEffects[i];
          effect.effectID = this.GetEffectsID([effect], true);
        }

        if (this.element.externalEffects) {
          for (i = this.element.externalEffects.length - 1; i >= 0; i--) {
            effectElement = this.element.externalEffects[i];
            effectsId = effectElement.GetID();

            for (let j = 0; j < secondaryEffects.length; j++) {
              effect = secondaryEffects[j];
              if (effectsId == effect.effectID) {
                effect.elem = effectElement;
                break;
              }
            }

            this.element.parent.RemoveElement(this.element.externalEffects[i], true);
          }
        }

        this.element.externalEffects = [];

        for (i = 0; i < secondaryEffects.length; i++) {
          effect = secondaryEffects[i];
          effectElement = effect.elem;

          if (!effectElement) {
            effectElement = this.CreateSecondaryEffectElement(effect, bounds, widthSize, heightSize);
            effectElement.SetID(effect.effectID);
          }

          if (effectElement) {
            this.element.externalEffects.push(effectElement);
            this.element.parent.AddElement(effectElement, i, true);
          }
        }
      }
    }

    console.log("B.Element.Effect: SetEffects finished with effectsId", effectsId);
  }

  CreateSecondaryEffectElement(effect, bounds, widthSize, heightSize) {
    console.log("B.Element.Effect: CreateSecondaryEffectElement called", { effect, bounds, widthSize, heightSize });

    let elementCopy;

    if (Effects.IsSecondaryEffect(effect)) {
      elementCopy = this.element.doc.CreateShape(ConstantData.CreateShapeType.SHAPECOPY);

      if (elementCopy) {
        elementCopy.SetElementSource(this.element);
        elementCopy.Effects().SetSecondaryEffect(effect, bounds, widthSize, heightSize);
        elementCopy.svgObj.attr('sfx', 1);
      }
    }

    console.log("B.Element.Effect: CreateSecondaryEffectElement returned", elementCopy);
    return elementCopy;
  }

  SetSecondaryEffect(effect, bounds, widthSize, heightSize) {
    console.log("B.Element.Effect: SetSecondaryEffect called with", { effect, bounds, widthSize, heightSize });

    let yOffset, yRatio, offsetY, offsetX, angle, xOffset;
    let effectsId = 's' + this.GetEffectsID([effect], true);

    if (Effects.IsSecondaryEffect(effect)) {
      if (effect.type.id === Effects.EffectType.REFLECT.id ||
        effect.type.id === Effects.EffectType.CASTSHADOW.id) {

        yOffset = Math.abs(effect.params.yOff);
        yRatio = yOffset / bounds.height;

        if (effect.params.yOff > 0) {
          yRatio = -yRatio;
          offsetY = bounds.height + yOffset;
        } else {
          offsetY = bounds.height - yOffset;
        }

        offsetX = Math.max(-yOffset, 2 * effect.params.xOff);
        offsetX = Math.min(offsetX, yOffset);
        angle = (offsetX / yOffset) * 45;
        xOffset = yOffset / Math.tan((90 - angle) * Math.PI / 180);

        this.element.svgObj.size(bounds.width, bounds.height);
        let transform = `translate(${xOffset},${offsetY}) skewX(${angle}) scale(1,${yRatio})`;
        this.element.svgObj.attr('transform', transform);

        if (effect.type.id === Effects.EffectType.REFLECT.id) {
          this.element.svgObj.attr('opacity', 0.4);
          console.log("B.Element.Effect: SetSecondaryEffect applied reflect effect");
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

        this.curBounds = bounds;

        if (effect.type.id === Effects.EffectType.CASTSHADOW.id) {
          this.DefineCastShadow(filterContainer, effect.params, 'SourceAlpha', '');
        } else if (effect.type.id === Effects.EffectType.REFLECT.id) {
          this.DefineReflect(filterContainer, effect.params, 'SourceGraphic', '');
        } else if (effect.type.id === Effects.EffectType.DROPSHADOW.id) {
          this.DefineDropShadow(filterContainer, effect.params, 'SourceAlpha', '');
        } else if (effect.type.id === Effects.EffectType.GLOW.id) {
          this.DefineGlow(filterContainer, effect.params, 'SourceAlpha', '');
        }

        this.element.doc.Defs().add(filterContainer);
      }

      this.element.SetEffect(effectsId);
    }

    console.log("B.Element.Effect: SetSecondaryEffect finished with effectsId", effectsId);
  }

  static CalcSecondaryEffectOffset(xOffset, yOffset) {
    console.log("B.Element.Effect: CalcSecondaryEffectOffset called with", { xOffset, yOffset });

    let absYOffset = Math.abs(yOffset);
    let adjustedXOffset = Math.max(-absYOffset, 2 * xOffset);
    adjustedXOffset = Math.min(adjustedXOffset, absYOffset);

    let angle = (adjustedXOffset / absYOffset) * 45;
    let result = absYOffset / Math.tan((90 - angle) * Math.PI / 180);

    console.log("B.Element.Effect: CalcSecondaryEffectOffset returned", result);
    return result;
  }

  ClearEffects() {
    console.log("B.Element.Effect: ClearEffects called");
    this.SetEffects();
    console.log("B.Element.Effect: ClearEffects completed");
  }

  FilterLimitNeeded(bounds, widthSize, heightSize) {
    console.log("B.Element.Effect: FilterLimitNeeded called with", { bounds, widthSize, heightSize });

    if (!bounds || Utils2.BrowserDetect.browser !== 'Safari') {
      console.log("B.Element.Effect: FilterLimitNeeded returned false (not Safari or no bounds)");
      return false;
    }

    let workArea = this.element.doc.GetWorkArea();
    let widthRatio = 1 + 2 * widthSize.pct;
    let heightRatio = 1 + 2 * heightSize.pct;
    let scaledWidth = bounds.width * workArea.docToScreenScale * widthRatio;
    let scaledHeight = bounds.height * workArea.docToScreenScale * heightRatio;

    let result = scaledWidth > 4096 || scaledHeight > 4096;
    console.log("B.Element.Effect: FilterLimitNeeded returned", result);
    return result;
  }

  static IsSecondaryEffect(effect) {
    console.log("B.Element.Effect: IsSecondaryEffect called with", effect);

    let result = !(!effect || !effect.type) && (
      effect.params.asSecondary ||
      effect.type.id === Effects.EffectType.CASTSHADOW.id ||
      effect.type.id === Effects.EffectType.REFLECT.id
    );

    console.log("B.Element.Effect: IsSecondaryEffect returned", result);
    return result;
  }

  GetEffectsID(effects, isSecondary) {
    console.log("B.Element.Effect: GetEffectsID called with", { effects, isSecondary });

    let effectsId = 'FX';
    let outsideEffectsCount = 0;
    let insideEffectsCount = 0;
    let effectsLength = effects && effects.length || 0;

    if (!effectsLength) {
      effectsId += '_NONE';
      console.log("B.Element.Effect: GetEffectsID returned", effectsId);
      return effectsId;
    }

    isSecondary = isSecondary || false;

    for (let i = 0; i < effectsLength; i++) {
      if (effects[i].type.outside) {
        if (Effects.IsSecondaryEffect(effects[i]) !== isSecondary) continue;

        effectsId += '_' + effects[i].type.id;

        if (effects[i].params.xOff !== undefined) {
          effectsId += '.' + effects[i].params.xOff;
        }

        if (effects[i].params.yOff !== undefined) {
          effectsId += '.' + effects[i].params.yOff;
        }

        if (effects[i].params.size !== undefined) {
          effectsId += '.' + effects[i].params.size;
        }

        if (effects[i].params.color !== undefined) {
          effectsId += effects[i].params.color;
        }

        outsideEffectsCount++;
      }
    }

    for (let i = 0; i < effectsLength; i++) {
      if (effects[i].type.inside) {
        effectsId += '_' + effects[i].type.id;

        if (effects[i].params.size !== undefined) {
          effectsId += '.' + effects[i].params.size;
        }

        if (effects[i].params.type !== undefined) {
          effectsId += '.' + effects[i].params.type;
        }

        if (effects[i].params.dir !== undefined) {
          effectsId += '.' + effects[i].params.dir;
        }

        if (effects[i].params.color !== undefined) {
          effectsId += effects[i].params.color;
        }

        insideEffectsCount++;
      }
    }

    if (!outsideEffectsCount && !insideEffectsCount) {
      effectsId += '_NONE';
    }

    console.log("B.Element.Effect: GetEffectsID returned", effectsId);
    return effectsId;
  }

  DefineEffect(container, effectType, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineEffect called with", {
      effectTypeId: effectType.id,
      params,
      sourceInput,
      outputId
    });

    let success = true;

    switch (effectType.id) {
      case Effects.EffectType.DROPSHADOW.id:
        this.DefineDropShadow(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.CASTSHADOW.id:
        this.DefineCastShadow(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.REFLECT.id:
        this.DefineReflect(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.GLOW.id:
        this.DefineGlow(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.BEVEL.id:
        this.DefineBevel(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.GLOSS.id:
        this.DefineGloss(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.INNERGLOW.id:
        this.DefineInnerGlow(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.INNERSHADOW.id:
        this.DefineInnerShadow(container, params, sourceInput, outputId);
        break;
      case Effects.EffectType.RECOLOR.id:
        this.DefineRecolor(container, params, sourceInput, outputId);
        break;
      default:
        success = false;
    }

    console.log("B.Element.Effect: DefineEffect finished with success =", success);
    return success;
  }

  DefineDropShadow(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineDropShadow called with", { params, sourceInput, outputId });

    let element;
    let xOffset = params.xOff || 0;
    let yOffset = params.yOff || 0;
    let color = params.color || '#000';
    let size = params.size || 2;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', color);
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
    element.attr('stdDeviation', size);
    container.add(element);

    // Create offset element
    element = new T3Svg.Element(T3Svg.create('feOffset'));
    element.attr('dx', xOffset);
    element.attr('dy', yOffset);
    element.attr('result', outputId);
    container.add(element);

    console.log("B.Element.Effect: DefineDropShadow completed");
  }

  DefineCastShadow(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineCastShadow called with", { params, sourceInput, outputId });

    let element;
    let size = params.size || 2;

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
    element.attr('stdDeviation', size);
    container.add(element);

    console.log("B.Element.Effect: DefineCastShadow completed");
  }

  DefineReflect(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineReflect called with", { params, sourceInput, outputId });

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

    console.log("B.Element.Effect: DefineReflect completed");
  }

  DefineGlow(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineGlow called with", { params, sourceInput, outputId });

    let element;
    let color = params.color || '#fff';
    let size = params.size || 2;

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr('flood-color', color);
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
    element.attr('stdDeviation', size);
    element.attr('result', outputId);
    container.add(element);

    console.log("B.Element.Effect: DefineGlow completed");
  }

  DefineBevel(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineBevel called with", { params, sourceInput, outputId });

    let element;
    let lightElement;
    let size = params.size || 1;
    let surfaceScale = 6;
    let azimuth = 0;

    switch (params.dir || Effects.FilterDirection.LEFTTOP) {
      case Effects.FilterDirection.RIGHT:
        azimuth = 0;
        break;
      case Effects.FilterDirection.RIGHTBOTTOM:
        azimuth = 45;
        break;
      case Effects.FilterDirection.BOTTOM:
        azimuth = 90;
        break;
      case Effects.FilterDirection.LEFTBOTTOM:
        azimuth = 135;
        break;
      case Effects.FilterDirection.LEFT:
        azimuth = 180;
        break;
      case Effects.FilterDirection.LEFTTOP:
        azimuth = 225;
        break;
      case Effects.FilterDirection.TOP:
        azimuth = 270;
        break;
      case Effects.FilterDirection.RIGHTTOP:
        azimuth = 315;
    }

    if (params.type == Effects.BevelType.HARD) {
      surfaceScale = 20;
    }

    if (params.type == Effects.BevelType.BUMP) {
      // Create morphology element for erosion
      element = new T3Svg.Element(T3Svg.create('feMorphology'));
      element.attr({
        in: 'SourceAlpha',
        operator: 'erode',
        radius: size
      });
      container.add(element);

      // Create blur element
      element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
      element.attr({
        stdDeviation: size,
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
        stdDeviation: size
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

    console.log("B.Element.Effect: DefineBevel completed");
  }

  DefineGloss(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineGloss called with", { params, sourceInput, outputId });

    let element;
    let lightElement;
    let size = params.size || 2;
    let direction = params.dir || Effects.FilterDirection.LEFTTOP;
    let glossType = params.type || Effects.GlossType.SOFT;
    let color = params.color || '#ffffff';
    let specularConstant = 1;
    let azimuth = 0;

    switch (direction) {
      case Effects.FilterDirection.RIGHT:
        azimuth = 0;
        break;
      case Effects.FilterDirection.RIGHTBOTTOM:
        azimuth = 45;
        break;
      case Effects.FilterDirection.BOTTOM:
        azimuth = 90;
        break;
      case Effects.FilterDirection.LEFTBOTTOM:
        azimuth = 135;
        break;
      case Effects.FilterDirection.LEFT:
        azimuth = 180;
        break;
      case Effects.FilterDirection.LEFTTOP:
        azimuth = 225;
        break;
      case Effects.FilterDirection.TOP:
        azimuth = 270;
        break;
      case Effects.FilterDirection.RIGHTTOP:
        azimuth = 315;
    }

    if (glossType == Effects.GlossType.HARD) {
      specularConstant = 1.2;
    }

    // Adjust size
    size /= 4;
    size = Math.max(Math.min(size, 20), 2);

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: size
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
      'flood-color': color,
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

    console.log("B.Element.Effect: DefineGloss completed");
  }

  DefineInnerGlow(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineInnerGlow called with", { params, sourceInput, outputId });

    let element;
    let color = params.color || '#fff';
    let size = params.size || 0;

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: size
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
      'flood-color': color,
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

    console.log("B.Element.Effect: DefineInnerGlow completed");
  }

  DefineInnerShadow(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineInnerShadow called with", { params, sourceInput, outputId });

    let element;
    let direction = params.dir || Effects.FilterDirection.LEFTTOP;
    let size = params.size || 0;
    let offsetX = 0;
    let offsetY = 0;

    switch (direction) {
      case Effects.FilterDirection.RIGHT:
        offsetX = -size;
        offsetY = 0;
        break;
      case Effects.FilterDirection.RIGHTBOTTOM:
        offsetX = -size;
        offsetY = -size;
        break;
      case Effects.FilterDirection.BOTTOM:
        offsetX = 0;
        offsetY = -size;
        break;
      case Effects.FilterDirection.LEFTBOTTOM:
        offsetX = size;
        offsetY = -size;
        break;
      case Effects.FilterDirection.LEFT:
        offsetX = size;
        offsetY = 0;
        break;
      case Effects.FilterDirection.LEFTTOP:
        offsetX = size;
        offsetY = size;
        break;
      case Effects.FilterDirection.TOP:
        offsetX = 0;
        offsetY = size;
        break;
      case Effects.FilterDirection.RIGHTTOP:
        offsetX = -size;
        offsetY = size;
    }

    // Create blur element
    element = new T3Svg.Element(T3Svg.create('feGaussianBlur'));
    element.attr({
      in: 'SourceAlpha',
      stdDeviation: size
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

    console.log("B.Element.Effect: DefineInnerShadow completed");
  }

  DefineRecolor(container, params, sourceInput, outputId) {
    console.log("B.Element.Effect: DefineRecolor called with", { params, sourceInput, outputId });

    let element;
    let color = params.color || '#000000';

    // Create flood element
    element = new T3Svg.Element(T3Svg.create('feFlood'));
    element.attr({
      'flood-color': color,
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

    console.log("B.Element.Effect: DefineRecolor completed");
  }

  static EffectType = {
    DROPSHADOW: {
      id: 'SHD',
      outside: true
    },
    CASTSHADOW: {
      id: 'SHC',
      outside: true
    },
    GLOW: {
      id: 'GLW',
      outside: true
    },
    REFLECT: {
      id: 'REFL',
      outside: true
    },
    BEVEL: {
      id: 'BVL',
      inside: true
    },
    GLOSS: {
      id: 'GLOSS',
      inside: true
    },
    INNERGLOW: {
      id: 'IGLW',
      inside: true
    },
    INNERSHADOW: {
      id: 'ISHD',
      inside: true
    },
    RECOLOR: {
      id: 'RCLR',
      inside: true
    }
  }

  static FilterDirection = {
    LEFT: 'L',
    LEFTTOP: 'LT',
    TOP: 'T',
    RIGHTTOP: 'RT',
    RIGHT: 'R',
    RIGHTBOTTOM: 'RB',
    BOTTOM: 'B',
    LEFTBOTTOM: 'LB',
    CENTER: 'C'
  }

  static BevelType = {
    HARD: 'H',
    SOFT: 'S',
    BUMP: 'B'
  }

  static GlossType = {
    HARD: 'H',
    SOFT: 'S'
  }

  static EffectSize = {
    DEFAULT: {
      id: 'D',
      pct: 0.1
    },
    SMALL: {
      id: 'S',
      pct: 0.5
    },
    MEDIUM: {
      id: 'M',
      pct: 0.25
    },
    LARGE: {
      id: 'L',
      pct: 0.1
    },
    GIANT: {
      id: 'G',
      pct: 0.05
    }
  }
}

export default Effects
