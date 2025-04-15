

import T3Svg from "../Util/T3Svg"
import Element from './B.Element'
import BConstant from './B.Constant'
import Instance from '../Data/Instance/Instance'
import $ from 'jquery'

/**
 * Represents an SVG symbol element that supports dynamic modification and placeholder replacement.
 *
 * This class provides methods to create an SVG container element (including its shape element),
 * dynamically update the symbol's appearance by setting its fill and stroke properties (colors, opacities,
 * gradients, textures, etc.), and rebuild the symbol based on predefined placeholders in an SVG source.
 *
 * @remarks
 * The class works by first creating an SVG element via the CreateElement method, setting an SVG source
 * with placeholders via SetSymbolSource, and then updating these placeholders with concrete values using
 * various setter methods (e.g., SetFillColor, SetStrokeColor, SetStrokeWidth, etc.). The placeholders are
 * formatted strings that tie into default and dynamic values to ensure consistent, customizable rendering.
 *
 * @example
 * ```typescript
 * // Create an instance of Symbol and initialize with an SVG container element
 * const symbol = new Symbol();
 * const svgContainer = symbol.CreateElement({  element data  }, 'customType');
 *
 * // Set an SVG source containing placeholders for fill and stroke colors
 * const svgSource = `<g>
 *   <rect x="0" y="0" width="100" height="100" fill="##FillColor" stroke="##LineColor" stroke-width="##LineThick"/>
 * </g>`;
 * symbol.SetSymbolSource(svgSource);
 *
 * // Update the symbol's fill and stroke properties
 * symbol.SetFillColor('#FF5733', false);
 * symbol.SetStrokeColor('#3333FF', false);
 * symbol.SetStrokeWidth(3);
 *
 * // Optionally set transparency settings
 * symbol.SetFillOpacity(0.7);
 * symbol.SetStrokeOpacity(0.9);
 *
 * // The symbol is now updated and can be added to the DOM accordingly
 * ```
 *
 * @public
 */
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

  /**
   * Creates a new SVG element for the symbol
   * @param element - The element to create
   * @param type - The element type
   * @returns The created SVG object
   */
  CreateElement(element, type) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.shapeElem = new T3Svg.Container(T3Svg.create('g'));
    this.svgObj.add(this.shapeElem);
    this.InitElement(element, type);
    this.fillColors = [];
    this.lineColors = [];
    this.lineWidths = [];
    this.solidFills = [];
    this.fillTrans = [];
    this.lineTrans = [];
    this.srcSymbolSVG = '';

    return this.svgObj;
  }

  /**
   * Sets the SVG source for the symbol and processes placeholders
   * @param source - The SVG source string
   */
  SetSymbolSource(source: string) {
    this.srcSymbolSVG = source;
    this.fillColors = Symbol.GetPlaceholders(BConstant.Placeholder.FillColor, source);
    this.lineColors = Symbol.GetPlaceholders(BConstant.Placeholder.LineColor, source);
    this.lineWidths = Symbol.GetPlaceholders(BConstant.Placeholder.LineThick, source);
    this.solidFills = Symbol.GetPlaceholders(BConstant.Placeholder.SolidFill, source);
    this.fillTrans = Symbol.GetPlaceholders(BConstant.Placeholder.FillTrans, source);
    this.lineTrans = Symbol.GetPlaceholders(BConstant.Placeholder.LineTrans, source);

    if (source) {
      source = source.replace(/fill-opacity="[\d.]*"/g, '').replace(/stroke-opacity="[\d.]*"/g, '');

      const fillTransPlaceholder = Symbol.CreatePlaceholder(
        BConstant.Placeholder.FillTrans,
        BConstant.PlaceholderDefault[BConstant.Placeholder.FillTrans]
      );
      source = source.replace(
        new RegExp('fill="##FillColor', 'g'),
        'fill-opacity="' + fillTransPlaceholder + '" fill="##FillColor'
      );
      this.fillTrans = Symbol.GetPlaceholders(BConstant.Placeholder.FillTrans, source);

      const lineTransPlaceholder = Symbol.CreatePlaceholder(
        BConstant.Placeholder.LineTrans,
        BConstant.PlaceholderDefault[BConstant.Placeholder.LineTrans]
      );
      source = source.replace(
        new RegExp('stroke="##LineColor', 'g'),
        'stroke-opacity="' + lineTransPlaceholder + '" stroke="##LineColor'
      ).replace(
        new RegExp('fill="##LineColor', 'g'),
        'fill-opacity="' + lineTransPlaceholder + '" fill="##LineColor'
      );
      this.lineTrans = Symbol.GetPlaceholders(BConstant.Placeholder.LineTrans, source);

      this.srcSymbolSVG = source;
    }

    this.RebuildSymbol();
  }

  /**
   * Rebuilds the symbol with current properties by replacing placeholders
   * in the SVG source and adding the elements to the DOM
   */
  RebuildSymbol() {
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
  }

  /**
   * Returns the element to be scaled
   * @returns The shape element for scaling
   */
  GetScaleElement() {
    return this.shapeElem;
  }

  /**
   * Sets the fill color for all fill placeholders in the symbol
   * @param color - The fill color to set
   * @param skipClear - Whether to skip clearing existing color data
   */
  SetFillColor(color: string, skipClear: boolean) {
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
  }

  /**
   * Sets a texture fill for the symbol
   * @param patternData - The pattern data for the texture fill
   */
  SetTextureFill(patternData) {
    Instance.Basic.Element.SetTextureFill.call(this, patternData);
    const currentFill = this.svgObj.attr('fill');
    this.svgObj.attr('fill', '');

    if (this.fillPatternData && this.fillPatternData.patternElem) {
      this.svgObj.remove(this.fillPatternData.patternElem);
      this.SetFillColor(currentFill, true);
      this.svgObj.add(this.fillPatternData.patternElem, 0);
    }
  }

  /**
   * Sets a gradient fill for the symbol
   * @param gradientData - The gradient data for the fill
   */
  SetGradientFill(gradientData) {
    Instance.Basic.Element.SetGradientFill.call(this, gradientData);
    const currentFill = this.svgObj.attr('fill');
    this.svgObj.attr('fill', '');

    if (this.fillGradientData && this.fillGradientData.gradientElem) {
      this.svgObj.remove(this.fillGradientData.gradientElem);
      this.SetFillColor(currentFill, true);
      this.svgObj.add(this.fillGradientData.gradientElem, 0);
    }
  }

  /**
   * Sets the stroke color for all line placeholders in the symbol
   * @param color - The stroke color to set
   * @param skipClear - Whether to skip clearing existing color data
   */
  SetStrokeColor(color: string, skipClear: boolean) {
    if (!skipClear) {
      this.ClearColorData(false);
    }

    for (let i = 0; i < this.lineColors.length; i++) {
      this.lineColors[i].val = color;
    }

    if (this.lineColors.length) {
      this.RebuildSymbol();
    }
  }

  /**
   * Sets a texture stroke for the symbol
   * @param patternData - The pattern data for the texture stroke
   */
  SetTextureStroke(patternData) {
    Instance.Basic.Element.SetTextureStroke.call(this, patternData);
    const currentStroke = this.svgObj.attr('stroke');
    this.svgObj.attr('stroke', '');

    if (this.strokePatternData && this.strokePatternData.patternElem) {
      this.svgObj.remove(this.strokePatternData.patternElem);
      this.SetStrokeColor(currentStroke, true);
      this.svgObj.add(this.strokePatternData.patternElem, 0);
    }
  }

  /**
   * Sets a gradient stroke for the symbol
   * @param gradientData - The gradient data for the stroke
   */
  SetGradientStroke(gradientData) {
    Instance.Basic.Element.SetGradientStroke.call(this, gradientData);
    const currentStroke = this.svgObj.attr('stroke');
    this.svgObj.attr('stroke', '');

    if (this.strokeGradientData && this.strokeGradientData.gradientElem) {
      this.svgObj.remove(this.strokeGradientData.gradientElem);
      this.SetStrokeColor(currentStroke, true);
      this.svgObj.add(this.strokeGradientData.gradientElem, 0);
    }
  }

  /**
   * Sets the stroke width for all line width placeholders in the symbol
   * @param width - The stroke width to set
   */
  SetStrokeWidth(width: string | number) {
    if (isNaN(Number(width))) {
      width = Number(Symbol.ParsePlaceholder(width as string, BConstant.Placeholder.LineThick));
    }

    for (let i = 0; i < this.lineWidths.length; i++) {
      this.lineWidths[i].val = width;
    }

    if (this.lineWidths.length) {
      this.RebuildSymbol();
    }
  }

  /**
   * Sets the fill opacity for all fill transparency placeholders in the symbol
   * @param opacity - The fill opacity to set (0-1)
   */
  SetFillOpacity(opacity: number) {
    for (let i = 0; i < this.fillTrans.length; i++) {
      this.fillTrans[i].val = opacity;
    }

    if (this.fillTrans.length) {
      this.RebuildSymbol();
    }
  }

  /**
   * Sets the stroke opacity for all line transparency placeholders in the symbol
   * @param opacity - The stroke opacity to set (0-1)
   */
  SetStrokeOpacity(opacity: number) {
    for (let i = 0; i < this.lineTrans.length; i++) {
      this.lineTrans[i].val = opacity;
    }

    if (this.lineTrans.length) {
      this.RebuildSymbol();
    }
  }

  /**
   * Sets the stroke pattern
   * @param event - The event data for the stroke pattern
   */
  SetStrokePattern(event) {
  }

  /**
   * Creates a placeholder string with the specified type and default value
   * @param placeholderType - The type of placeholder
   * @param defaultValue - The default value for the placeholder
   * @returns The created placeholder string
   */
  static CreatePlaceholder(placeholderType: string, defaultValue: string = ''): string {
    return `${placeholderType}=${defaultValue}${BConstant.Placeholder.Terminator}`;
  }

  /**
   * Parses the value from a placeholder string
   * @param placeholder - The placeholder string to parse
   * @param placeholderType - The type of placeholder
   * @returns The parsed value from the placeholder
   */
  static ParsePlaceholder(placeholder: string, placeholderType: string): string {
    const startIndex = placeholder.indexOf('=') + 1;
    const endIndex = placeholder.lastIndexOf(BConstant.Placeholder.Terminator);
    let defaultValue = BConstant.PlaceholderDefault[placeholderType];

    if (startIndex > 0 && endIndex > startIndex) {
      defaultValue = placeholder.slice(startIndex, endIndex);
    }

    return defaultValue;
  }

  /**
   * Gets all placeholders of a specific type from a source string
   * @param placeholderType - The type of placeholder to search for
   * @param source - The source string to search in
   * @returns Array of placeholders with their values
   */
  static GetPlaceholders(placeholderType: string, source: string) {
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
      console.error("Error getting placeholders:", e);
    }

    return placeholders;
  }

  /**
   * Replaces all placeholders in the source string with their values
   * @param placeholders - Array of placeholders with their values
   * @param source - The source string with placeholders
   * @returns The source string with placeholders replaced by their values
   */
  static ReplacePlaceholder(placeholders, source) {
    let result = source;
    if (!source) return result;

    for (let i = 0; i < placeholders.length; i++) {
      result = result.replace(new RegExp(placeholders[i].placeholder, 'g'), placeholders[i].val);
    }

    return result;
  }
}

export default Symbol
