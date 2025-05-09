

import BaseSymbol from '../Basic/B.Symbol';
import T3Gv from '../Data/T3Gv'
import NvConstant from '../Data/Constant/NvConstant'
import Instance from '../Data/Instance/Instance';
import ShapeUtil from '../Opt/Shape/ShapeUtil';
import DSConstant from '../Opt/DS/DSConstant';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import ObjectUtil from '../Opt/Data/ObjectUtil';
import TextUtil from '../Opt/Opt/TextUtil';

/**
 * A specialized symbol class for rendering 3D symbols in T3000 applications.
 *
 * The D3Symbol extends BaseSymbol to provide 3D visualization capabilities with
 * modular code libraries, data binding, and interactive visual properties.
 * D3Symbol supports dynamic resizing, field data mapping, and custom rendering.
 *
 * @class D3Symbol
 * @extends {BaseSymbol}
 *
 * @property {Object} d3Settings - Configuration settings for the 3D symbol
 * @property {string} codeLibID - ID of the currently loaded code library
 * @property {Object} codeLib - Reference to the loaded code library
 * @property {boolean} bMultiDataRecsAllowed - Whether multiple data records are allowed
 * @property {boolean} ResizeAspectConstrain - Whether to maintain aspect ratio during resize
 *
 * @example
 * // Create a new D3Symbol instance
 * const symbolOptions = {
 *   d3Settings: {
 *     moduleID: "fan_symbol",
 *     renderSettings: {
 *       fillColor: { value: "#4287f5" },
 *       strokeColor: { value: "#1a3c70" },
 *       strokeWidth: { value: 2 },
 *       rotationSpeed: { value: 5 }
 *     },
 *     publicAttributes: ["fillColor", "strokeColor", "strokeWidth", "rotationSpeed"]
 *   },
 *   TextFlags: NvConstant.TextFlags.AttachB
 * };
 *
 * const fanSymbol = new D3Symbol(symbolOptions);
 *
 * // Create shape in SVG document
 * const svgDoc = T3Gv.opt.svgDoc;
 * const shape = fanSymbol.CreateShape(svgDoc, true);
 *
 * // Map data from external source
 * fanSymbol.SetDataMap("rotationSpeed", "speed_value:0:all");
 *
 * // Update a parameter value
 * fanSymbol.SetParamValue("fillColor", "#FF0000");
 *
 * // Resize the symbol
 * const newSize = { width: 100, height: 100 };
 * fanSymbol.Resize(shape, newSize);
 */
class D3Symbol extends BaseSymbol {

  constructor(options) {
    options = options || {};
    T3Util.Log("S.D3Symbol: Input options:", options);

    options.ShapeType = OptConstant.ShapeType.D3Symbol;
    options.objecttype = NvConstant.FNObjectTypes.D3Symbol;
    options.TextFlags = options.TextFlags || NvConstant.TextFlags.AttachB;

    super();

    this.SetD3Settings(options.d3Settings);

    T3Util.Log("S.D3Symbol: Output options after initialization:", options);
  }

  CreateShape(svgDocument, applyHiddenEventBehavior) {
    T3Util.Log("S.D3Symbol: Enter CreateShape with parameters:", { svgDocument, applyHiddenEventBehavior });

    if (this.flags & NvConstant.ObjFlags.NotVisible) {
      T3Util.Log("S.D3Symbol: Object not visible, exiting CreateShape.");
      return null;
    }

    const shapeContainer = svgDocument.CreateShape(OptConstant.CSType.ShapeContainer);
    const frame = this.Frame;

    this.TextFlags = NvConstant.TextFlags.AttachB;
    shapeContainer.SetSize(frame.width, frame.height);
    shapeContainer.SetPos(frame.x, frame.y);
    shapeContainer.isShape = true;

    const groupShape = svgDocument.CreateShape(OptConstant.CSType.Group);
    groupShape.SetSize(frame.width, frame.height);
    groupShape.SetID(OptConstant.SVGElementClass.Shape);

    const transparentRect = svgDocument.CreateShape(OptConstant.CSType.Rect);
    transparentRect.SetStrokeColor('white');
    transparentRect.SetFillColor('none');
    transparentRect.SetOpacity(0);
    transparentRect.SetStrokeWidth(0);

    if (applyHiddenEventBehavior) {
      transparentRect.SetEventBehavior(OptConstant.EventBehavior.HiddenAll);
    } else {
      transparentRect.SetEventBehavior(OptConstant.EventBehavior.None);
    }

    transparentRect.SetID(OptConstant.SVGElementClass.Slop);
    transparentRect.ExcludeFromExport(true);
    transparentRect.SetSize(frame.width, frame.height);

    shapeContainer.AddElement(transparentRect);
    shapeContainer.AddElement(groupShape);

    this.RenderControl(svgDocument, shapeContainer);

    if (this.DataID !== -1) {
      this.LMAddSVGTextObject(svgDocument, shapeContainer);
    }

    const flipHorizontally = (this.extraflags & OptConstant.ExtraFlags.FlipHoriz) > 0;
    const flipVertically = (this.extraflags & OptConstant.ExtraFlags.FlipVert) > 0;

    if (flipHorizontally) {
      groupShape.SetMirror(flipHorizontally);
    }

    if (flipVertically) {
      groupShape.SetFlip(flipVertically);
    }

    if (T3Gv.opt.bDrawEffects) {
      this.SetEffects(groupShape, false, false);
    }

    T3Util.Log("S.D3Symbol: Exit CreateShape with shapeContainer:", shapeContainer);
    return shapeContainer;
  }

  MapData(mappedData: any): void {
    T3Util.Log("S.D3Symbol: MapData - Input:", mappedData);

    const publicParams = this.GetPublicParams();
    if (!mappedData || publicParams.length === 0 || !this.HasFieldData()) {
      T3Util.Log("S.D3Symbol: MapData - No mapping performed (missing data, public params or field data).");
      return;
    }

    const fieldList = TODO.STData.FieldedDataGetFieldList(this.fieldDataTableID, true);

    // Parse a dataMap string like "fieldName:start:flags" into an object
    const parseDataMapString = (dataMapString: string): { name: string; start: number; flags: string | null } => {
      const parts = (dataMapString || '').split(':');
      const result = {
        name: parts[0].toLowerCase(),
        start: 0,
        flags: null as string | null
      };
      for (let idx = 1; idx < parts.length; idx++) {
        const part = parts[idx];
        if (isNaN(parseInt(part, 10))) {
          result.flags = part.toLowerCase();
        } else {
          result.start = parseInt(part, 10);
        }
      }
      return result;
    };

    // Find field indices in fieldList based on expected criteria.
    const findFieldIndices = (
      fieldName: string,
      startIndex: number,
      expectedType: string,
      isArray: boolean
    ): number | number[] | null => {
      if (!fieldName || !expectedType) {
        return null;
      }
      expectedType = expectedType.toLowerCase();

      // Check whether a field type matches the expected type.
      const typeMatches = (fieldType: any, expected: string): boolean => {
        return (
          expected === "string" && fieldType === "string" ||
          fieldType === "number" && (expected === "int" || expected === "float") ||
          fieldName === "*" || fieldName === "?" || fieldType === expected
        );
      };

      let foundIndex: number | number[] | null = null;
      startIndex = startIndex || 0;
      for (let idx = startIndex; idx < fieldList.length; idx++) {
        const field = fieldList[idx];
        if (typeMatches(field.type, expectedType) && (fieldName === "*" || fieldName === "?" || field.name.toLowerCase() === fieldName)) {
          if (!isArray) {
            foundIndex = idx;
            break;
          }
          if (foundIndex === null) {
            foundIndex = [];
          }
          (foundIndex as number[]).push(idx);
          if (fieldName === "?") {
            break;
          }
        }
      }
      return foundIndex;
    };

    // Collect element IDs from fieldDataTable rows (starting from index 3)
    const elementIDs: any[] = [];

    // Loop through each public parameter and map data if possible.
    publicParams.forEach((paramName: string) => {
      const paramData = mappedData[paramName];
      if (paramData && paramData.dataMap) {
        const parsedMap = parseDataMapString(paramData.dataMap);
        const fieldIndex = findFieldIndices(parsedMap.name, parsedMap.start, paramData.type, paramData.isArray);
        if (fieldIndex !== null) {
          let collectedValue: any = null;
          let targetElementIDs: any[] = [];

          // Determine target elements based on fieldDataElemID and flags.
          if (this.fieldDataElemID < 0) {
            if (parsedMap.flags === "all") {
              targetElementIDs = elementIDs;
              collectedValue = [];
            } else {
              targetElementIDs = [elementIDs[0]];
            }
          } else {
            targetElementIDs = [this.fieldDataElemID];
          }

          // Loop through target elements and populate value(s)
          targetElementIDs.forEach((elementID) => {
            let valueForField = null;
            if (paramData.isArray) {
              valueForField = [];
              // fieldIndex is expected to be an array when isArray equals true.
              (fieldIndex as number[]).forEach((idx) => {
                const field = fieldList[idx];
                const value = parsedMap.flags === "label"
                  ? field.name
                  : TODO.STData.FieldedDataGetFieldValue(this.fieldDataTableID, elementID, field.fieldID);
                if (typeof value !== "undefined") {
                  valueForField.push(value);
                }
              });
            } else {
              // single value expected
              const field = fieldList[fieldIndex as number];
              const value = parsedMap.flags === "label"
                ? field.name
                : TODO.STData.FieldedDataGetFieldValue(this.fieldDataTableID, elementID, field.fieldID);
              if (typeof value !== "undefined") {
                valueForField = value;
              }
            }

            if (valueForField !== null) {
              if (collectedValue) {
                if (Array.isArray(collectedValue)) {
                  collectedValue.push(valueForField);
                } else {
                  collectedValue = [collectedValue, valueForField];
                }
              } else {
                collectedValue = valueForField;
              }
            }
          });

          // Set the mapped value to paramData if available
          if (collectedValue !== null) {
            paramData.value = collectedValue;
          }
        }
      }
    });

    T3Util.Log("S.D3Symbol: MapData - Output (mapped data updated in object).");
  }

  SetParamValue(paramName, paramValue) {
    T3Util.Log("S.D3Symbol: SetParamValue - Input:", { paramName, paramValue });

    const renderSettings = this.d3Settings ? this.d3Settings.renderSettings : null;
    if (renderSettings && renderSettings[paramName]) {
      ObjectUtil.GetObjectPtr(this.BlockID, true);
      renderSettings[paramName].value = paramValue;
      renderSettings[paramName].dataMap = null;
      this.UpdateSizeFromSettings();
      ObjectUtil.AddToDirtyList(this.BlockID);
    }

    T3Util.Log("S.D3Symbol: SetParamValue - Updated renderSettings:", renderSettings);
  }

  UpdateSizeFromSettings() {

  }

  GetRenderParams() {
    T3Util.Log("S.D3Symbol: GetRenderParams - Start");

    const frame = this.Frame;
    const renderSettings = this.d3Settings ? this.d3Settings.renderSettings : null;

    if (renderSettings) {
      const params = $.extend(true, {}, renderSettings);
      params.width = params.width || {};
      params.height = params.height || {};
      params.width.value = frame.width;
      params.height.value = frame.height;

      const applyFieldDataStyleOverride = (params) => {
        const styleOverride = this.GetFieldDataStyleOverride();
        const strokeColor = styleOverride && styleOverride.strokeColor ? styleOverride.strokeColor : null;
        const fillColor = styleOverride && styleOverride.fillColor ? styleOverride.fillColor : null;
        const textColor = styleOverride && styleOverride.textColor ? styleOverride.textColor : null;

        let fillPaintColor = this.StyleRecord.Fill.Paint.Color;
        let linePaintColor = this.StyleRecord.Line.Paint.Color;
        let textPaintColor = this.StyleRecord.Text.Paint.Color;

        if (this.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Transparent) {
          fillPaintColor = 'none';
        } else if (this.StyleRecord.Fill.Paint.FillType !== NvConstant.FillTypes.Solid &&
          this.StyleRecord.Fill.Paint.FillType !== NvConstant.FillTypes.Gradient) {
          fillPaintColor = null;
        }

        if (this.StyleRecord.Line.Paint.FillType === NvConstant.FillTypes.Transparent) {
          linePaintColor = 'none';
        } else if (this.StyleRecord.Line.Paint.FillType !== NvConstant.FillTypes.Solid &&
          this.StyleRecord.Line.Paint.FillType !== NvConstant.FillTypes.Gradient) {
          linePaintColor = null;
        }

        const finalFillColor = fillColor || fillPaintColor;
        const finalStrokeColor = strokeColor || linePaintColor;
        const finalStrokeWidth = this.StyleRecord.Line.Thickness;
        const finalTextColor = textColor || textPaintColor;

        if (finalFillColor && params.fillColor) {
          params.fillColor.value = finalFillColor;
        }
        if (finalStrokeColor && params.strokeColor) {
          params.strokeColor.value = finalStrokeColor;
        }
        if (params.strokeWidth) {
          params.strokeWidth.value = finalStrokeWidth;
        }
        if (finalTextColor && params.textColor) {
          params.textColor.value = finalTextColor;
        }

        if (fillPaintColor && renderSettings.fillColor) {
          renderSettings.fillColor.value = fillPaintColor;
        }
        if (linePaintColor && renderSettings.strokeColor) {
          renderSettings.strokeColor.value = linePaintColor;
        }
        if (renderSettings.strokeWidth) {
          renderSettings.strokeWidth.value = finalStrokeWidth;
        }
        if (textPaintColor && renderSettings.textColor) {
          renderSettings.textColor.value = textPaintColor;
        }
      };

      applyFieldDataStyleOverride(params);
      this.MapData(params);

      T3Util.Log("S.D3Symbol: GetRenderParams - Output:", params);
      return params;
    }

    T3Util.Log("S.D3Symbol: GetRenderParams - No renderSettings found.");
    return null;
  }

  SetDataMap(paramName, dataMap) {
    T3Util.Log("S.D3Symbol: SetDataMap - Input:", { paramName, dataMap });

    const renderSettings = this.d3Settings ? this.d3Settings.renderSettings : null;
    if (renderSettings && renderSettings[paramName]) {
      ObjectUtil.GetObjectPtr(this.BlockID, true);
      renderSettings[paramName].dataMap = dataMap;
      this.UpdateSizeFromSettings();
      ObjectUtil.AddToDirtyList(this.BlockID);
    }

    T3Util.Log("S.D3Symbol: SetDataMap - Updated renderSettings:", renderSettings);
  }

  GetPublicParams() {
    T3Util.Log("S.D3Symbol: GetPublicParams - Start");

    const publicAttributes = this.d3Settings ? this.d3Settings.publicAttributes : null;
    const result = [];

    if (!publicAttributes) {
      T3Util.Log("S.D3Symbol: GetPublicParams - No public attributes found.");
      return result;
    }

    publicAttributes.forEach(attribute => {
      if (Instance.Shape.D3Symbol.DefaultStyleParams.indexOf(attribute) < 0) {
        result.push(attribute);
      }
    });

    T3Util.Log("S.D3Symbol: GetPublicParams - Output:", result);
    return result;
  }

  ExportD3Settings() {
    T3Util.Log("S.D3Symbol: ExportD3Settings - Start");

    let settingsString = '';
    if (this.d3Settings) {
      settingsString = JSON.stringify(this.d3Settings);
    }

    T3Util.Log("S.D3Symbol: ExportD3Settings - Output:", settingsString);
    return settingsString;
  }

  ImportD3Settings(settingsString) {
    T3Util.Log("S.D3Symbol: ImportD3Settings - Input:", settingsString);

    let parsedSettings = null;
    try {
      parsedSettings = JSON.parse(settingsString);
    } catch (error) {
      T3Util.LogError("S.D3Symbol: ImportD3Settings - Error parsing settings:", error);
      throw error;
    }

    if (parsedSettings) {
      this.SetD3Settings(parsedSettings);
    }

    T3Util.Log("S.D3Symbol: ImportD3Settings - Output settings applied.");
  }

  SetD3Settings(settings) {

  }

  Resize(svgElement, newSize, additionalParams) {

  }

  ChangeTextAttributes(newText, newFont, newSize, newColor, newAlignment, newWeight, newStyle, newDecoration) {
    T3Util.Log("S.D3Symbol: ChangeTextAttributes - Input:", { newText, newFont, newSize, newColor, newAlignment, newWeight, newStyle, newDecoration });

    if (TextUtil.GetActiveTextEdit() === this.BlockID) {
      newFont = null;
    } else {
      newText = null;
    }

    Instance.Shape.BaseDrawObject.prototype.ChangeTextAttributes.call(this, newText, newFont, newSize, newColor, newAlignment, newWeight, newStyle, newDecoration);
    ObjectUtil.AddToDirtyList(this.BlockID);

    T3Util.Log("S.D3Symbol: ChangeTextAttributes - Completed");
  }

  CreateActionTriggers(event, triggerType, action, response) {
    T3Util.Log("S.D3Symbol: CreateActionTriggers - Input parameters:", { event, triggerType, action, response });

    const result = Instance.Shape.BaseShape.prototype.CreateActionTriggers.apply(this, [
      event,
      triggerType,
      action,
      response
    ]);

    T3Util.Log("S.D3Symbol: CreateActionTriggers - Output result:", result);
    return result;
  }

  RefreshFromFieldData(fieldDataTableID) {
    T3Util.Log("S.D3Symbol: RefreshFromFieldData - Input:", fieldDataTableID);

    if (!fieldDataTableID || this.fieldDataTableID === fieldDataTableID) {
      Instance.Shape.BaseDrawObject.prototype.RefreshFromFieldData.call(this, fieldDataTableID);
      this.UpdateSizeFromSettings();
      ObjectUtil.AddToDirtyList(this.BlockID);

      T3Util.Log("S.D3Symbol: RefreshFromFieldData - Output: true");
      return true;
    }

    T3Util.Log("S.D3Symbol: RefreshFromFieldData - Output: false");
    return false;
  }

  static DefaultD3Settings(inputSettings) {
    T3Util.Log("S.D3Symbol: Input settings:", inputSettings);

    let defaultSettings = {
      moduleID: null,
      renderSettings: {},
      publicAttributes: []
    };

    if (inputSettings) {
      defaultSettings = $.extend(true, defaultSettings, inputSettings);
    }

    T3Util.Log("S.D3Symbol: Output settings:", defaultSettings);
    return defaultSettings;
  }

  static DefaultStyleParams = [
    'fillColor',
    'strokeColor',
    'strokeWidth',
    'textColor'
  ]
}

export default D3Symbol


