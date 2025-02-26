

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import Element from './Basic.Element'
import ConstantData from "../Data/ConstantData"
import BasicConstants from './Basic.Constants'
import Instance from '../Data/Instance/Instance';

class Symbol extends Element {

  public shapeElem: any;
  public fillColors: any;
  public lineColors: any;
  public lineWidths: any;
  public solidFills: any;
  public fillTrans: any;
  public lineTrans: any;
  public srcSymbolSVG: any;

  constructor() {
    super()
  }

  CreateElement(element, type) {
    console.log("= B.Symbol CreateElement input:", { element, type });

    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.shapeElem = new HvacSVG.Container(HvacSVG.create('g'));
    this.svgObj.add(this.shapeElem);
    this.InitElement(element, type);
    this.fillColors = [];
    this.lineColors = [];
    this.lineWidths = [];
    this.solidFills = [];
    this.fillTrans = [];
    this.lineTrans = [];
    this.srcSymbolSVG = '';

    console.log("= B.Symbol CreateElement output:", this.svgObj);
    return this.svgObj;
  }

  SetSymbolSource(source: string) {
    console.log("= B.Symbol SetSymbolSource input:", { source });

    this.srcSymbolSVG = source;
    this.fillColors = Symbol.GetPlaceholders(BasicConstants.Placeholder.FillColor, source);
    this.lineColors = Symbol.GetPlaceholders(BasicConstants.Placeholder.LineColor, source);
    this.lineWidths = Symbol.GetPlaceholders(BasicConstants.Placeholder.LineThick, source);
    this.solidFills = Symbol.GetPlaceholders(BasicConstants.Placeholder.SolidFill, source);
    this.fillTrans = Symbol.GetPlaceholders(BasicConstants.Placeholder.FillTrans, source);
    this.lineTrans = Symbol.GetPlaceholders(BasicConstants.Placeholder.LineTrans, source);

    if (source) {
      source = source.replace(/fill-opacity="[\d.]*"/g, '').replace(/stroke-opacity="[\d.]*"/g, '');

      const fillTransPlaceholder = Symbol.CreatePlaceholder(
        BasicConstants.Placeholder.FillTrans,
        BasicConstants.PlaceholderDefaults[BasicConstants.Placeholder.FillTrans]
      );
      source = source.replace(
        new RegExp('fill="##FILLCOLOR', 'g'),
        'fill-opacity="' + fillTransPlaceholder + '" fill="##FILLCOLOR'
      );
      this.fillTrans = Symbol.GetPlaceholders(BasicConstants.Placeholder.FillTrans, source);

      const lineTransPlaceholder = Symbol.CreatePlaceholder(
        BasicConstants.Placeholder.LineTrans,
        BasicConstants.PlaceholderDefaults[BasicConstants.Placeholder.LineTrans]
      );
      source = source.replace(
        new RegExp('stroke="##LINECOLOR', 'g'),
        'stroke-opacity="' + lineTransPlaceholder + '" stroke="##LINECOLOR'
      ).replace(
        new RegExp('fill="##LINECOLOR', 'g'),
        'fill-opacity="' + lineTransPlaceholder + '" fill="##LINECOLOR'
      );
      this.lineTrans = Symbol.GetPlaceholders(BasicConstants.Placeholder.LineTrans, source);

      this.srcSymbolSVG = source;
    }

    this.RebuildSymbol();
    console.log("= B.Symbol SetSymbolSource output:", { srcSymbolSVG: this.srcSymbolSVG });
  }

  RebuildSymbol() {
    console.log("= B.Symbol RebuildSymbol input:", {
      srcSymbolSVG: this.srcSymbolSVG,
      fillColors: this.fillColors,
      lineColors: this.lineColors,
      lineWidths: this.lineWidths,
      solidFills: this.solidFills,
      fillTrans: this.fillTrans,
      lineTrans: this.lineTrans
    });

    let svgContent = `<svg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'>${this.srcSymbolSVG}</svg>`;
    const parser = new DOMParser();

    this.shapeElem.clear();
    this.svgObj.clear();
    this.svgObj.add(this.shapeElem);

    svgContent = Symbol.ReplacePlaceholder(this.fillColors, svgContent);
    svgContent = Symbol.ReplacePlaceholder(this.lineColors, svgContent);
    svgContent = Symbol.ReplacePlaceholder(this.lineWidths, svgContent);
    svgContent = Symbol.ReplacePlaceholder(this.solidFills, svgContent);
    svgContent = Symbol.ReplacePlaceholder(this.fillTrans, svgContent);
    svgContent = Symbol.ReplacePlaceholder(this.lineTrans, svgContent);

    parser.async = false;
    let element = parser.parseFromString(svgContent, 'text/xml').documentElement.firstChild;

    while (element) {
      this.shapeElem.node.appendChild(this.svgObj.node.ownerDocument.importNode(element, true));
      element = element.nextSibling;
    }

    console.log("= B.Symbol RebuildSymbol output:", {
      shapeElem: this.shapeElem,
      svgObj: this.svgObj
    });
  }

  GetScaleElement() {
    console.log("= B.Symbol GetScaleElement input:", {});
    const result = this.shapeElem;
    console.log("= B.Symbol GetScaleElement output:", { result });
    return result;
  }

  SetFillColor(color: string, skipClear: boolean) {
    console.log("= B.Symbol SetFillColor input:", { color, skipClear });

    let updated = false;

    if (!skipClear) {
      this.ClearColorData(true);
    }

    for (let i = 0; i < this.fillColors.length; i++) {
      this.fillColors[i].val = color;
      updated = true;
    }

    if (color.startsWith('#')) {
      for (let i = 0; i < this.solidFills.length; i++) {
        this.solidFills[i].val = color;
        updated = true;
      }
    }

    if (updated) {
      this.RebuildSymbol();
    }

    console.log("= B.Symbol SetFillColor output:", { fillColors: this.fillColors, solidFills: this.solidFills });
  }

  SetTextureFill(patternData) {
    console.log("= B.Symbol SetTextureFill input:", { patternData });

    Instance.Basic.Element.SetTextureFill.call(this, patternData);
    const currentFill = this.svgObj.attr('fill');
    this.svgObj.attr('fill', '');

    if (this.fillPatternData && this.fillPatternData.patternElem) {
      this.svgObj.remove(this.fillPatternData.patternElem);
      this.SetFillColor(currentFill, true);
      this.svgObj.add(this.fillPatternData.patternElem, 0);
    }

    console.log("= B.Symbol SetTextureFill output:", {
      fillPatternData: this.fillPatternData,
      currentFill
    });
  }

  SetGradientFill(gradientData) {
    console.log("= B.Symbol SetGradientFill input:", { gradientData });

    Instance.Basic.Element.SetGradientFill.call(this, gradientData);
    const currentFill = this.svgObj.attr('fill');
    this.svgObj.attr('fill', '');

    if (this.fillGradientData && this.fillGradientData.gradientElem) {
      this.svgObj.remove(this.fillGradientData.gradientElem);
      this.SetFillColor(currentFill, true);
      this.svgObj.add(this.fillGradientData.gradientElem, 0);
    }

    console.log("= B.Symbol SetGradientFill output:", {
      fillGradientData: this.fillGradientData,
      currentFill
    });
  }

  SetStrokeColor(color: string, skipClear: boolean) {
    console.log("= B.Symbol SetStrokeColor input:", { color, skipClear });

    if (!skipClear) {
      this.ClearColorData(false);
    }

    for (let i = 0; i < this.lineColors.length; i++) {
      this.lineColors[i].val = color;
    }

    if (this.lineColors.length) {
      this.RebuildSymbol();
    }

    console.log("= B.Symbol SetStrokeColor output:", { lineColors: this.lineColors });
  }

  SetTextureStroke(patternData) {
    console.log("= B.Symbol SetTextureStroke input:", { patternData });

    Instance.Basic.Element.SetTextureStroke.call(this, patternData);
    const currentStroke = this.svgObj.attr('stroke');
    this.svgObj.attr('stroke', '');

    if (this.strokePatternData && this.strokePatternData.patternElem) {
      this.svgObj.remove(this.strokePatternData.patternElem);
      this.SetStrokeColor(currentStroke, true);
      this.svgObj.add(this.strokePatternData.patternElem, 0);
    }

    console.log("= B.Symbol SetTextureStroke output:", {
      strokePatternData: this.strokePatternData,
      currentStroke
    });
  }

  SetGradientStroke(gradientData) {
    console.log("= B.Symbol SetGradientStroke input:", { gradientData });

    Instance.Basic.Element.SetGradientStroke.call(this, gradientData);
    const currentStroke = this.svgObj.attr('stroke');
    this.svgObj.attr('stroke', '');

    if (this.strokeGradientData && this.strokeGradientData.gradientElem) {
      this.svgObj.remove(this.strokeGradientData.gradientElem);
      this.SetStrokeColor(currentStroke, true);
      this.svgObj.add(this.strokeGradientData.gradientElem, 0);
    }

    console.log("= B.Symbol SetGradientStroke output:", {
      strokeGradientData: this.strokeGradientData,
      currentStroke
    });
  }

  SetStrokeWidth(width: string | number) {
    console.log("= B.Symbol SetStrokeWidth input:", { width });

    if (isNaN(Number(width))) {
      width = Number(Symbol.ParsePlaceholder(width as string, BasicConstants.Placeholder.LineThick));
    }

    for (let i = 0; i < this.lineWidths.length; i++) {
      this.lineWidths[i].val = width;
    }

    if (this.lineWidths.length) {
      this.RebuildSymbol();
    }

    console.log("= B.Symbol SetStrokeWidth output:", { lineWidths: this.lineWidths });
  }

  SetFillOpacity(opacity: number) {
    console.log("= B.Symbol SetFillOpacity input:", { opacity });

    for (let i = 0; i < this.fillTrans.length; i++) {
      this.fillTrans[i].val = opacity;
    }

    if (this.fillTrans.length) {
      this.RebuildSymbol();
    }

    console.log("= B.Symbol SetFillOpacity output:", { fillTrans: this.fillTrans });
  }

  SetStrokeOpacity(opacity: number) {
    console.log("= B.Symbol SetStrokeOpacity input:", { opacity });

    for (let i = 0; i < this.lineTrans.length; i++) {
      this.lineTrans[i].val = opacity;
    }

    if (this.lineTrans.length) {
      this.RebuildSymbol();
    }

    console.log("= B.Symbol SetStrokeOpacity output:", { lineTrans: this.lineTrans });
  }

  SetStrokePattern(event) {
  }

  static CreatePlaceholder(placeholderType: string, defaultValue: string = ''): string {
    console.log("= B.Symbol CreatePlaceholder input:", { placeholderType, defaultValue });

    const placeholder = `${placeholderType}=${defaultValue}${BasicConstants.Placeholder.Terminator}`;

    console.log("= B.Symbol CreatePlaceholder output:", { placeholder });
    return placeholder;
  }

  static ParsePlaceholder(placeholder: string, placeholderType: string): string {
    console.log("= B.Symbol ParsePlaceholder input:", { placeholder, placeholderType });

    const startIndex = placeholder.indexOf('=') + 1;
    const endIndex = placeholder.lastIndexOf(BasicConstants.Placeholder.Terminator);
    let defaultValue = BasicConstants.PlaceholderDefaults[placeholderType];

    if (startIndex > 0 && endIndex > startIndex) {
      defaultValue = placeholder.slice(startIndex, endIndex);
    }

    console.log("= B.Symbol ParsePlaceholder output:", { defaultValue });
    return defaultValue;
  }

  static GetPlaceholders(placeholderType: string, source: string) {
    console.log("= B.Symbol GetPlaceholders input:", { placeholderType, source });

    const placeholders = [];
    if (!source) return placeholders;

    try {
      const matches = source.match(new RegExp(`${placeholderType}.*?##`, 'g'));
      if (matches) {
        for (let i = 0; i < matches.length; i++) {
          placeholders.push({
            placeholder: matches[i],
            val: Symbol.ParsePlaceholder(matches[i], placeholderType)
          });
        }
      }
    }
    catch (e) {
      console.error("= B.Symbol GetPlaceholders error:", e);
    }

    console.log("= B.Symbol GetPlaceholders output:", { placeholders });
    return placeholders;
  }

  static ReplacePlaceholder(placeholders, source) {
    console.log("= B.Symbol ReplacePlaceholder input:", { placeholders, source });

    let result = source;
    if (!source) return result;

    for (let i = 0; i < placeholders.length; i++) {
      result = result.replace(new RegExp(placeholders[i].placeholder, 'g'), placeholders[i].val);
    }

    console.log("= B.Symbol ReplacePlaceholder output:", { result });
    return result;
  }

}

export default Symbol
