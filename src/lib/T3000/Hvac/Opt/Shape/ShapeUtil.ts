

import $ from 'jquery'
import NvConstant from '../../Data/Constant/NvConstant'
import OptConstant from '../../Data/Constant/OptConstant'
import ShapeConstant from '../../Data/Constant/ShapeConstant'
import StyleConstant from '../../Data/Constant/StyleConstant'
import TextConstant from '../../Data/Constant/TextConstant'
import Instance from '../../Data/Instance/Instance'
import StateConstant from '../../Data/State/StateConstant'
import T3Gv from '../../Data/T3Gv'
import BlockHeader from '../../Model/BlockHeader'
import FontRecord from '../../Model/FontRecord'
import Hook from '../../Model/Hook'
import Layer from '../../Model/Layer'
import LayersManager from '../../Model/LayersManager'
import Link from '../../Model/Link'
import OutsideEffectData from '../../Model/OutsideEffectData'
import PaintData from '../../Model/PaintData'
import Point from '../../Model/Point'
import PolyGeomMd from '../../Model/PolyGeomMd'
import PolySeg from '../../Model/PolySeg'
import QuickStyle from '../../Model/QuickStyle'
import Rectangle from '../../Model/Rectangle'
import RulerConfig from '../../Model/RulerConfig'
import SDData from '../../Model/SDData'
import SDGraphDefault from '../../Model/SDGraphDefault'
import TextObject from '../../Model/TextObject'
import TextureList from '../../Model/TextureList'
import TextureScale from '../../Model/TextureScale'
import WinSetting from '../../Model/WinSetting'
import WResult from '../../Model/WResult'
import Utils1 from '../../Util/Utils1'
import Utils2 from '../../Util/Utils2'
import Utils3 from '../../Util/Utils3'
import DataUtil from '../Data/DataUtil'
import DSConstant from '../DS/DSConstant'
import DSStruct from '../DS/DSStruct'
import DSUtil from '../DS/DSUtil'
import SvgUtil from '../Opt/SvgUtil'
import PolygonConstant from '../Polygon/PolygonConstant'
import PolygonShapeGenerator from "../Polygon/PolygonUtil"
import LayerUtil from '../Opt/LayerUtil'
import UIUtil from '../UI/UIUtil'
import ToolActUtil from '../Opt/ToolActUtil'
import ExportUtil from '../Opt/ExportUtil'
import ImageRecord from '../../Model/ImageRecord'
import DataOpt from '../Data/DataOpt'
import TextUtil from '../Opt/TextUtil'

class ShapeUtil {

  /**
   * Determines if a line is displayed in reverse direction based on its coordinates
   * @param drawingObject - The object containing line properties and coordinates
   * @param drawOptions - Options that control drawing behavior
   * @param ignoreSegments - Whether to ignore segment direction checks
   * @returns True if the line is reversed, false otherwise
   */
  static LineIsReversed(drawingObject, drawOptions, ignoreSegments) {
    if (drawingObject == null) return false;

    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
      switch (drawingObject.LineType) {
        case OptConstant.LineType.ARCLINE:
        case OptConstant.LineType.LINE:
          // Check if line is vertical
          if (Math.abs(drawingObject.EndPoint.x - drawingObject.StartPoint.x) < 0.01) {
            return drawingObject.EndPoint.y < drawingObject.StartPoint.y;
          }

          // Check if line is reversed by comparing endpoints
          const rect = Utils2.Pt2Rect(drawingObject.EndPoint, drawingObject.StartPoint);
          if (
            (Math.abs(drawingObject.EndPoint.x - rect.x) < 0.01 && Math.abs(drawingObject.EndPoint.y - rect.y) < 0.01) ||
            (Math.abs(drawingObject.EndPoint.x - rect.x) < 0.01 && Math.abs(drawingObject.EndPoint.y - (rect.y + rect.height)) < 0.01)
          ) {
            return true;
          }
          break;

        case OptConstant.LineType.SEGLINE:
        case OptConstant.LineType.ARCSEGLINE:
          if (ignoreSegments) break;
          if (drawOptions && drawOptions.KeepSegDir) return false;

          // Check if segmented line is reversed based on start and end points
          if (Math.abs(drawingObject.StartPoint.x - drawingObject.EndPoint.x) <= 1) {
            if (drawingObject.StartPoint.y > drawingObject.EndPoint.y) return true;
          } else if (drawingObject.StartPoint.x > drawingObject.EndPoint.x) {
            return true;
          }
      }
    }
    return false;
  }

  /**
   * Converts text alignment constants to Windows text justification format
   * @param textAlign - The text alignment value to convert
   * @returns Object containing horizontal (just) and vertical (vjust) justification values
   */
  static TextAlignToWin(textAlign) {
    const winJustification = {
      just: TextConstant.TextJust.Center,
      vjust: TextConstant.TextJust.Center
    };

    switch (textAlign) {
      case TextConstant.TextAlign.Left:
        winJustification.just = TextConstant.TextJust.Left;
        break;
      case TextConstant.TextAlign.Right:
        winJustification.just = TextConstant.TextJust.Right;
        break;
      case TextConstant.TextAlign.TopLeft:
        winJustification.just = TextConstant.TextJust.Left;
        winJustification.vjust = TextConstant.TextJust.Top;
        break;
      case TextConstant.TextAlign.TopCenter:
        winJustification.vjust = TextConstant.TextJust.Top;
        break;
      case TextConstant.TextAlign.TopRight:
        winJustification.just = TextConstant.TextJust.Right;
        winJustification.vjust = TextConstant.TextJust.Top;
        break;
      case TextConstant.TextAlign.BottomLeft:
        winJustification.just = TextConstant.TextJust.Left;
        winJustification.vjust = TextConstant.TextJust.Bottom;
        break;
      case TextConstant.TextAlign.BottomCenter:
        winJustification.vjust = TextConstant.TextJust.Bottom;
        break;
      case TextConstant.TextAlign.BottomRight:
        winJustification.just = TextConstant.TextJust.Right;
        winJustification.vjust = TextConstant.TextJust.Bottom;
    }

    return winJustification;
  }

  /**
   * Converts coordinates based on the provided scale factor
   * @param coordinate - The coordinate value to convert
   * @param scaleFactor - The scale factor to apply to the coordinate
   * @returns The converted coordinate value
   */
  static ToSDWinCoords(coordinate, scaleFactor) {
    return scaleFactor > 1 ? Math.round(scaleFactor * coordinate) : coordinate;
  }

  /**
   * Retrieves text associated with a line object from the result object's storage
   *
   * This function searches through the stored line-text associations in the result object
   * to find text that belongs to a specific line. When found, it can optionally copy
   * text formatting properties (growth behavior, wrapping width, alignment, etc.) to
   * an output object and removes the entry from the associations list to prevent
   * duplicate processing.
   *
   * @param resultObject - The result object containing line-text associations
   * @param lineUniqueId - The unique identifier of the line to find text for
   * @param specificTextId - Optional specific text ID to match (when a line has multiple texts)
   * @param outputProperties - Optional object to receive text formatting properties
   * @returns The ID of the text object associated with the line, or -1 if not found
   */
  static GetLineText(resultObject, lineUniqueId, specificTextId, outputProperties) {
    let index;
    let associationCount;
    let textId = -1;

    associationCount = resultObject.lineswithtext.length;

    for (index = 0; index < associationCount; index++) {
      if (lineUniqueId === resultObject.lineswithtext[index].x &&
        (!specificTextId || specificTextId === resultObject.lineswithtext[index].z)) {

        // Get the text ID
        textId = resultObject.lineswithtext[index].y;

        // Copy text properties to output object if provided
        if (outputProperties) {
          outputProperties.TextGrow = resultObject.lineswithtext[index].TextGrow;
          outputProperties.TextWrapWidth = resultObject.lineswithtext[index].TextWrapWidth;
          outputProperties.TextAlign = resultObject.lineswithtext[index].TextAlign;
          outputProperties.just = resultObject.lineswithtext[index].just;
          outputProperties.vjust = resultObject.lineswithtext[index].vjust;
          outputProperties.Paint = resultObject.lineswithtext[index].Paint;
        }

        // Remove this association from the list to prevent duplicates
        resultObject.lineswithtext.splice(index, 1);

        return textId;
      }
    }

    return -1;
  }

  static Result = function () {
    this.error = 0;
    this.ConvertOnSave = !1;
    this.isTemplate = !1;
    this.isSymbol = !1;
    this.IgnoreHeader = !1;
    this.PVersion = 0;
    this.FVersion = 0;
    this.coordScaleFactor = 1;
    this.sdp = null;
    this.GroupOffset = { x: 0, y: 0 };
    this.ReadingGroup = !1;
    this.WinSetting = new WinSetting();
    this.DefTStyle = {};
    this.DefRun = {};
    this.DefFSize = 10;
    this.DefLine = {};
    this.DefBorder = {};
    this.DefFill = {};
    this.fontlist = [];
    this.zList = [];
    this.lpStyles = [];
    this.links = [];
    this.IDMap = [];
    this.textids = [];
    this.usedtextids = [];
    this.noteids = [];
    this.usednoteids = [];
    this.nativeids = [];
    this.imageids = [];
    this.usedimageids = [];
    this.tableids = [];
    this.usedtableids = [];
    this.graphids = [];
    this.usedgraphids = [];
    this.expandedviewids = [];
    this.usedexpandedviewids = [];
    this.Threads = [];
    this.ThreadIDs = [];
    this.objectcount = 0;
    this.textonline = - 1;
    this.textonlineid = - 1;
    this.lineswithtext = [];
    this.SymbolPosition = { x: 100, y: 100 };
    this.SetSymbolOrigin = !1;
    this.WarnMeta = !1;
    this.gHash = null;
    this.AddEMFHash = !1;
    this.AllowAddEMFHash = !1;
    this.ValidateHashesAsync = !1;
    this.shapetoolindex = null;
    this.linetoolindex = null;
    this.swimlaneformat = null;
    this.autocontainer = null;
    this.actascontainer = null;
    this.swimlanenlanes = null;
    this.swimlanenvlanes = null;
    this.swimlanerotate = null;
    this.swimlanetitle = null;
    this.collapsetools = null;
    this.TextureList = new TextureList();
    this.NoTextBlocks = !1;
    this.ReadBlocks = !1;
    this.ReadGroupBlock = !1;
    this.tLMB = null;
    this.BlockzList = [];
    this.DeleteList = [];
    this.richGradients = [];
    this.hasBlockDirectory = !1;
    this.updatetext = !1;
    this.LibraryPathTarget = '';
    this.SetColorChanges = !1;
    this.ColorFilter = 0;
    this.HashRecords = [];
    this.PaperType = 'letter';
    this.ReadTexture = - 1;
    this.STData = null;
    this.FromWindows = !1;
    this.SearchLibs = [];
    this.CurrentSymbol = null;
    this.SearchResults = [];
    this.LoadBlockList = !1;
    this.PaletteStatus = {};
  }

  static Errors = {
    WaitingForCallBack: - 2,
    WarnMeta: 9,
    BadFormat: 3,
    UnknownFile: 1,
    Version: 2,
  }

  static Signature = '00000000'

  /**
   * Reads a symbol from a buffer and creates objects in the document
   * @param buffer - The source buffer containing symbol data
   * @param positionX - X position for the symbol placement
   * @param positionY - Y position for the symbol placement
   * @param offset - Buffer offset value
   * @param ignoreErrors - Whether to ignore read errors
   * @param renderObjects - Whether to render objects after creation
   * @param selectedObjects - Object containing array to store selected object IDs
   * @param adjustPosition - Whether to adjust position based on document boundaries
   * @param skipLinks - Whether to skip link creation
   * @param noTextBlocks - Whether to skip text block creation
   * @param libraryFlags - Library flags for symbol customization
   * @param allowAddEMFHash - Whether to allow adding EMF hash
   * @param outputDimensions - Object to receive the dimensions of the symbol
   * @param isSymbolFlag - Flag indicating whether the data represents a symbol
   * @returns Error code if an error occurred, 0 otherwise
   */
  static ReadSymbolFromBuffer(buffer, positionX, positionY, offset, ignoreErrors, renderObjects,
    selectedObjects, adjustPosition, skipLinks, noTextBlocks,
    libraryFlags, allowAddEMFHash, outputDimensions, isSymbolFlag) {
    let objectsToDelete;
    let objectCount;
    let index;
    let linksCount;
    let object;
    let boundingRect;
    let offsetX;
    let offsetY;
    let newWidth;
    let newHeight;
    let changedObject;
    let applyColorChanges = false;
    let result = new ShapeUtil.Result();

    let formattedTextObject = null;
    let sessionBlock = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, true);
    let objectsToRemove = [];

    result.isTemplate = false;
    result.IgnoreHeader = true;
    result.sdp = new SDData();
    result.sdp.def.style = Utils1.DeepCopy(sessionBlock.def.style);
    result.isSymbol = isSymbolFlag !== 0;
    // result.gHash = new HashController();
    result.tLMB = new LayersManager();
    result.AllowAddEMFHash = allowAddEMFHash;
    ShapeUtil.FragmentLoad_RefCount = 0;

    if (libraryFlags) {
      if ((libraryFlags.ObjectAttributeFlags & DSConstant.LibraryFlags.SEDL_NoColor) === 0) {
        result.SetColorChanges = true;
        result.ColorFilter = libraryFlags.ColorFilter;
      }
      applyColorChanges = true;
    }

    if (noTextBlocks) {
      result.NoTextBlocks = true;
    }

    if (positionX != null) {
      result.SymbolPosition.x = positionX;
    }

    if (positionY != null) {
      result.SymbolPosition.y = positionY;
    }

    let errorCode = ShapeUtil.ReadBuffer(buffer, result, offset, false, ShapeUtil.ReadSymbolFromBufferComplete);
    if (errorCode && errorCode != ShapeUtil.Errors.WaitingForCallBack) {
      return ignoreErrors ? result.error : errorCode;
    }

    if (result.WarnMeta) {
      if (ignoreErrors) return ShapeUtil.Errors.WarnMeta;
      alert('Metafile not read');
    }

    if (outputDimensions && errorCode !== ShapeUtil.Errors.WaitingForCallBack) {
      outputDimensions.x = result.sdp.dim.x;
      outputDimensions.y = result.sdp.dim.y;
    }

    if (errorCode !== ShapeUtil.Errors.WaitingForCallBack) {
      const isPlanningDocument = UIUtil.IsPlanningDocument();
      const layersManager = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, true);

      objectCount = result.zList.length;
      for (index = 0; index < objectCount; index++) {
        object = DataUtil.GetObjectPtr(result.zList[index], false);

        let targetLayer;

        targetLayer = layersManager.layers[layersManager.activelayer].zList;
        object.Layer = layersManager.activelayer;

        targetLayer.push(result.zList[index]);

        DataUtil.AddToDirtyList(result.zList[index]);

        if (object && (object.flags & NvConstant.ObjFlags.NotVisible) === 0) {
          selectedObjects.selectedList.push(result.zList[index]);
        }

        if (result.STData == null) {
          object.datasetTableID = -1;
          object.datasetElemID = -1;
          object.datasetID = -1;
          object.datasetType = -1;
          object.dataStyleOverride = null;
        }
      }

      if (objectsToRemove.length) {
        DataUtil.DeleteObjects(objectsToRemove);
      }

      // FROM SDData_Transfer
      if (result.STData && T3Gv.opt.STData_Transfer) {
        T3Gv.opt.STData_Transfer(result.zList, result.STData, applyColorChanges);
      }

      linksCount = result.links.length;
      if (!skipLinks && linksCount > 0) {
        let linksBlock = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);
        for (index = 0; index < linksCount; index++) {
          linksBlock.push(result.links[index]);
        }

        linksBlock.sort(function (a, b) {
          return a.targetid - b.targetid;
        });
      }

      // Calculate bounding rectangle for all objects
      let objectWithBoundsCount = 0;
      for (index = 0; index < objectCount; index++) {
        object = DataUtil.GetObjectPtr(result.zList[index], false);
        if (object && (object.flags & NvConstant.ObjFlags.NotVisible) === 0) {
          if (objectWithBoundsCount === 0) {
            boundingRect = new Rectangle(object.r.x, object.r.y, object.r.width, object.r.height);
          } else {
            Utils2.UnionRect(object.r, boundingRect, boundingRect);
          }
          objectWithBoundsCount++;
        }
      }

      if (boundingRect) {
        if (adjustPosition) {
          offsetX = boundingRect.x < 0 ? -boundingRect.x : 0;
          offsetY = boundingRect.y < 0 ? -boundingRect.y : 0;
        } else {
          offsetX = 0;
          offsetY = 0;
        }

        // Apply offset if needed
        if (offsetX || offsetY) {
          for (index = 0; index < objectCount; index++) {
            object = DataUtil.GetObjectPtr(result.zList[index], false);
            if (object && (object.flags & NvConstant.ObjFlags.NotVisible) === 0) {
              object.OffsetShape(offsetX, offsetY);
            }
          }
        }

        if (adjustPosition) {
          boundingRect.x += offsetX;
          boundingRect.y += offsetY;
          offsetX = 0;
          offsetY = 0;
          newWidth = 0;
          newHeight = 0;

          const originalDimensions = {
            x: sessionBlock.dim.x,
            y: sessionBlock.dim.y
          };

          // Check if we need to adjust document size
          if (boundingRect.x + boundingRect.width > sessionBlock.dim.x) {
            if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
              offsetX = boundingRect.x + boundingRect.width - sessionBlock.dim.x;
              newWidth = 0;
            } else {
              newWidth = boundingRect.x + boundingRect.width;
              sessionBlock.dim.x = newWidth;
            }
          }

          if (boundingRect.y + boundingRect.height > sessionBlock.dim.y) {
            if (T3Gv.opt.header.flags & OptConstant.CntHeaderFlags.NoAuto) {
              offsetY = boundingRect.y + boundingRect.height - sessionBlock.dim.y;
            } else {
              newHeight = boundingRect.y + boundingRect.height;
              sessionBlock.dim.y = newHeight;
            }
          }

          if (newWidth || newHeight) {
            const layersManagerBlock = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
            const layerCount = layersManagerBlock.nlayers;
            let activeLayerUsesEdges = false;
            let anyVisibleLayerUsesEdges = false;

            if (layersManagerBlock.layers[layersManagerBlock.activelayer].flags & NvConstant.LayerFlags.UseEdges) {
              activeLayerUsesEdges = true;
            }

            for (index = 0; index < layerCount; index++) {
              if ((layersManagerBlock.layers[index].flags & NvConstant.LayerFlags.UseEdges) &&
                (layersManagerBlock.layers[index].flags & NvConstant.LayerFlags.Visible) ||
                activeLayerUsesEdges) {
                anyVisibleLayerUsesEdges = true;
                break;
              }
            }

            if (anyVisibleLayerUsesEdges) {
              T3Gv.opt.UpdateEdgeLayers([], originalDimensions, sessionBlock.dim);
            }

            T3Gv.docUtil.ResizeDocument(sessionBlock.dim.x, sessionBlock.dim.y);
          } else if (offsetX || offsetY) {
            // If we need to shift objects to stay within bounds
            for (index = 0; index < objectCount; index++) {
              object = DataUtil.GetObjectPtr(result.zList[index], false);
              if (object && (object.flags & NvConstant.ObjFlags.NotVisible) === 0) {
                object.OffsetShape(-offsetX, -offsetY);
              }
            }
          }
        }
      }

      if (!skipLinks && adjustPosition) {
        T3Gv.opt.UpdateLinks();
      }

      if (renderObjects) {
        SvgUtil.RenderDirtySVGObjects();
      } else if (objectCount === 1) {
        T3Gv.opt.RenderDirtySVGObjectsNoSetMouse();
      }

      return result.error;
    }
  }

  /**
   * Reads data from a buffer and parses it into structured format
   * @param buffer - The source buffer containing data to parse
   * @param result - The object where parsing results will be stored
   * @param offset - Buffer offset to start reading from
   * @param ignoreErrors - Whether to ignore certain error types
   * @param callback - Optional callback function for async operations
   * @returns Error code if an error occurred, or ShapeUtil.Errors.WaitingForCallBack for async operations
   */
  static ReadBuffer(storageKeyOrData, result, offset, ignoreErrors, callback) {
    const opCodes = DSConstant.OpNameCode;

    // Determine if input is a storage key or direct JSON data
    let jsonData = null;

    try {
      if (typeof storageKeyOrData === 'string') {
        // Check if it's a storage key
        if (storageKeyOrData.startsWith('T3.draw')) {
          // Retrieve data from localStorage
          const storedData = localStorage.getItem(storageKeyOrData);
          if (storedData) {
            jsonData = JSON.parse(storedData);
          }
        } else {
          // Try to parse as direct JSON string
          jsonData = JSON.parse(storageKeyOrData);
        }
      } else if (typeof storageKeyOrData === 'object') {
        // Already a JSON object
        jsonData = storageKeyOrData;
      }
    } catch (error) {
      console.error("Error parsing JSON data:", error);
      result.error = ShapeUtil.Errors.UnknownFile;
      return result.error;
    }

    // Validate that we have valid JSON data
    if (!jsonData || !jsonData.signature || jsonData.signature !== ShapeUtil.Signature) {
      result.error = ShapeUtil.Errors.UnknownFile;
      return result.error;
    }

    // Set up result object properties based on JSON metadata
    result.PVersion = jsonData.version || DSConstant.SDF_FVERSION2022;
    result.FVersion = jsonData.version || DSConstant.SDF_FVERSION2022;
    result.coordScaleFactor = 1; // Modern JSON format uses 1:1 coordinates
    result.updatetext = true;

    // Set up ruler configuration if present
    if (jsonData.rulerConfig) {
      result.rulerConfig = jsonData.rulerConfig;
    }

    // Process whether this is blocks data
    if (jsonData.isBlockFormat) {
      result.ReadBlocks = true;
    }

    // If we have a callback and need async processing
    if (callback && result.ValidateHashesAsync) {
      return ShapeUtil.Errors.WaitingForCallBack;
    } else {
      // Process synchronously
      ShapeUtil.ReadSymbolFromBufferComplete(jsonData, result, ignoreErrors);
      return result.error;
    }
  }

  /**
   * Processes parsed JSON data and creates drawing objects from it
   * @param jsonData - The parsed JSON data containing drawing information
   * @param result - Object containing processing results and generated content
   * @param ignoreErrors - Whether to ignore certain types of errors during processing
   * @returns Error code if an error occurred, 0 otherwise
   */
  static ReadSymbolFromBufferComplete(jsonData, result, ignoreErrors) {
    try {
      const CDim = OptConstant.Common.DimMax;
      const minConnectorSegments = OptConstant.ConnectorDefines.NSkip;
      let objectCount, objectIndex, segmentIndex, objectId, object;
      let hookLength, hookCount, textParent, svgElement;

      // Process header information if available
      if (jsonData.data && jsonData.data.header) {
        // Set document properties from header
        if (jsonData.data.header.type === "fullDocument") {
          if (jsonData.data.header.panelName) {
            T3Gv.opt.header.panelName = jsonData.data.header.panelName;
          }
          if (jsonData.data.header.importSourcePath) {
            T3Gv.opt.header.importSourcePath = jsonData.data.header.importSourcePath;
          }
          // Copy other header properties as needed
        }
      }

      // Process structured data if available
      if (jsonData.data && jsonData.data.structuredData) {
        result.STData = jsonData.data.structuredData;
      }

      // Process drawing content
      if (jsonData.data && jsonData.data.drawing) {
        // Process styles
        if (jsonData.data.drawing.styles && jsonData.data.drawing.styles.length > 0) {
          result.lpStyles = jsonData.data.drawing.styles.map(style => {
            return new QuickStyle(style);
          });
        }

        // Process layers
        if (jsonData.data.drawing.layers && jsonData.data.drawing.layers.length > 0) {
          result.tLMB.layers = jsonData.data.drawing.layers;
          result.tLMB.nlayers = jsonData.data.drawing.layers.length;
          result.tLMB.activelayer = jsonData.data.drawing.activeLayer || 0;
        }

        // Process objects
        if (jsonData.data.drawing.objects && jsonData.data.drawing.objects.length > 0) {
          // Create objects from JSON
          jsonData.data.drawing.objects.forEach(objData => {

            const shapeData = DataOpt.ConvertPlanObjectToShape(objData);

            // Create appropriate object based on type
            const newBlock = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.BaseDrawObject, shapeData);

            // Copy properties from JSON to the new object
            // Object.assign(newBlock.Data, objData);


            newBlock.Data = Utils1.DeepCopy(newBlock.Data);

            // Add to result list
            result.zList.push(newBlock.ID);
            result.IDMap[objData.UniqueID] = newBlock.ID;
          });
        }
      }

      // Remap links if no errors so far and we have links to process
      if (result.error === 0 && result.links && result.links.length > 0) {
        ShapeUtil.ReMapLinks(result.IDMap, result.links, result, ignoreErrors);
      }

      // Process all objects in the list
      objectCount = result.zList.length;
      for (objectIndex = 0; objectIndex < objectCount; objectIndex++) {
        objectId = result.zList[objectIndex];
        object = DataUtil.GetObjectPtr(objectId, false);

        if (!object) continue;

        // Fix texture fill type if needed
        if (object.StyleRecord.Fill.Paint.FillType === NvConstant.FillTypes.Texture &&
          object.StyleRecord.Fill.Paint.Texture === undefined) {
          object.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
        }

        // Determine object base class, handling special case for closed polylines
        let baseClass = object.DrawingObjectBaseClass;
        if (baseClass === OptConstant.DrawObjectBaseClass.Line &&
          object.LineType === OptConstant.LineType.POLYLINE &&
          object.polylist && object.polylist.closed) {
          baseClass = OptConstant.DrawObjectBaseClass.Shape;
        }

        // Process objects based on their base class
        switch (baseClass) {
          case OptConstant.DrawObjectBaseClass.Line:
            // Handle different line types
            switch (object.LineType) {
              case OptConstant.LineType.SEGLINE:
              case OptConstant.LineType.ARCSEGLINE:
                // Format segmented lines
                const originalOrigin = {
                  x: object.Frame.x,
                  y: object.Frame.y
                };

                if (originalOrigin.x < 0 || originalOrigin.y < 0) {
                  object.SetShapeOrigin(30000, 30000);
                }

                object.SegLFormat(
                  object.EndPoint,
                  OptConstant.ActionTriggerType.SeglPreserve,
                  0
                );

                object.CalcFrame();

                if (originalOrigin.x < 0 || originalOrigin.y < 0) {
                  object.SetShapeOrigin(originalOrigin.x, originalOrigin.y);
                }
                break;
            }
            break;

          case OptConstant.DrawObjectBaseClass.Connector:
            // Clean up empty connectors
            if (object.hooks.length === 0 && object.arraylist && object.arraylist.hook) {
              hookLength = object.arraylist.hook.length;
              hookCount = hookLength - minConnectorSegments;

              if (hookCount < 0) {
                hookCount = 0;
              }

              if (hookLength >= minConnectorSegments) {
                for (segmentIndex = 1; segmentIndex < minConnectorSegments; segmentIndex++) {
                  if (object.arraylist.hook[segmentIndex].id >= 0) {
                    hookCount++;
                  }
                }
              }

              if (hookCount === 0) {
                result.DeleteList.push(objectId);
              }
            }
            break;

          // Process other shape types as needed

          case OptConstant.DrawObjectBaseClass.Shape:
            // Handle shapes with line thickness (border)
            if (object.StyleRecord.Line.BThick &&
              object.polylist &&
              object.polylist.closed &&
              object.polylist.segs &&
              object.polylist.segs.length) {

              let polygonLine;
              let vertices = [];
              const borderThickness = object.StyleRecord.Line.Thickness / 2;

              // Handle different shape types
              if (object instanceof Instance.Shape.Polygon && objectId.polylist) {
                const polygonData = {
                  Frame: object.Frame,
                  inside: object.inside
                };

                polygonLine = new Instance.Shape.PolyLine(polygonData);
                polygonLine.polylist = object.polylist;
                polygonLine.StartPoint = object.StartPoint;
                polygonLine.EndPoint = object.EndPoint;
              } else {
                polygonLine = object;
              }

              const points = polygonLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, false, true, false, vertices);
              let polyPoints = [];

              // Extract vertices from points
              if (vertices.length > 0) {
                polyPoints.push(new Point(points[0].x, points[0].y));
                for (segmentIndex = 0; segmentIndex < vertices.length; segmentIndex++) {
                  polyPoints.push(new Point(points[vertices[segmentIndex]].x, points[vertices[segmentIndex]].y));
                }
              } else {
                polyPoints = Utils1.DeepCopy(points);
              }

              // Inflate the line to create border
              const inflatedPoints = T3Gv.opt.InflateLine(polyPoints, borderThickness, true, true);
              if (!inflatedPoints || inflatedPoints.length === 0) break;

              // Update start and end points
              object.StartPoint.x = inflatedPoints[0].x;
              object.StartPoint.y = inflatedPoints[0].y;
              object.EndPoint.x = inflatedPoints[inflatedPoints.length - 1].x;
              object.EndPoint.y = inflatedPoints[inflatedPoints.length - 1].y;

              // Copy and update segment data
              const originalSegments = Utils1.DeepCopy(object.polylist.segs);
              object.polylist.segs = [];

              for (segmentIndex = 0; segmentIndex < points.length; segmentIndex++) {
                object.polylist.segs.push(
                  new PolySeg(1,
                    inflatedPoints[segmentIndex].x - object.StartPoint.x,
                    inflatedPoints[segmentIndex].y - object.StartPoint.y
                  )
                );

                // Copy properties from original segments if available
                if (segmentIndex < originalSegments.length) {
                  object.polylist.segs[segmentIndex].LineType = originalSegments[segmentIndex].LineType;
                  object.polylist.segs[segmentIndex].ShortRef = originalSegments[segmentIndex].ShortRef;
                  object.polylist.segs[segmentIndex].dataclass = originalSegments[segmentIndex].dataclass;
                  object.polylist.segs[segmentIndex].dimDeflection = originalSegments[segmentIndex].dimDeflection;
                  object.polylist.segs[segmentIndex].flags = originalSegments[segmentIndex].flags;
                  object.polylist.segs[segmentIndex].param = originalSegments[segmentIndex].param;
                  object.polylist.segs[segmentIndex].weight = originalSegments[segmentIndex].weight;
                }
              }

              // Recalculate frame for BaseLine objects
              if (object instanceof Instance.Shape.BaseLine) {
                object.CalcFrame();
              }
              // Scale and adjust polygon shapes
              else if (object instanceof Instance.Shape.Polygon && object.polylist) {
                const thickness = object.StyleRecord.Line.BThick;
                let width = object.Frame.width;

                if (width <= 0) {
                  width = 1;
                }

                const scaleX = (width + 2 * thickness) / width;

                let height = object.Frame.height;
                if (height <= 0) {
                  height = 1;
                }

                const scaleY = (height + 2 * thickness) / height;
                const offsetX = -(object.Frame.x * scaleX - object.Frame.x + thickness);
                const offsetY = -(object.Frame.y * scaleY - object.Frame.y + thickness);

                object.ScaleObject(offsetX, offsetY, null, 0, scaleX, scaleY, false);
                T3Gv.opt.CalcPolyVertices(object);
              }
            } else if (result.AddEMFHash || result.isTemplate || result.isSymbol) {
              object.UpdateFrame(object.Frame);
            }
        }

        // Process text for Visio objects and resize as needed
        if (object.DataID >= 0 && result.updatetext) {

          // Render and resize text
          SvgUtil.AddSVGObject(null, objectId, true, false);
          TextUtil.TextResizeCommon(objectId, false, true);
          svgElement = T3Gv.opt.svgObjectLayer.GetElementById(objectId);

          if (svgElement) {
            // Clean up SVG element after processing
            T3Gv.opt.svgObjectLayer.RemoveElement(svgElement);
          }
        }
      }

      return result.error;
    } catch (error) {
      console.error("Error processing JSON data:", error);
      result.error = ShapeUtil.Errors.BadFormat;
      return result.error;
    }
  }

  /**
   * Remaps object links in a document by updating their IDs and connections
   *
   * This function processes all links in a document, updating object references to
   * use new IDs from the ID map. It handles special cases for different object types
   * including connectors, shapes, and container objects. It also manages hooks between
   * objects and handles connection geometry for segmented lines and connectors.
   *
   * @param idMap - Mapping from original IDs to new IDs
   * @param links - Array of links between objects to be remapped
   * @param resultObject - Object containing processing results and context
   * @param ignoreErrors - Whether to ignore errors during link remapping
   */
  static ReMapLinks(idMap, links, resultObject, ignoreErrors) {
    let idMapLength;
    let linkIndex;
    let currentObject;
    let objectId;
    let hookCount;
    let currentHook;
    let targetObject;
    let rotationRect;
    let rotationAngle;
    let rotatedPoints;
    let linksBlock;
    let tableObject;
    let connectorsToProcess = [];
    let linkFlags = DSConstant.LinkFlags.Move;
    let skipCount = OptConstant.ConnectorDefines.NSkip;
    let textData = {};
    let coordinateDimension = OptConstant.Common.DimMax;
    idMapLength = idMap.length;

    // Remove invalid links (where either end has a negative ID)
    for (linkIndex = links.length - 1; linkIndex >= 0; linkIndex--) {
      if (idMap[links[linkIndex].hookid] < 0 || idMap[links[linkIndex].targetid] < 0) {
        links.splice(linkIndex, 1);
      }
    }

    // Process all objects in the ID map
    for (let idIndex = 0; idIndex < idMapLength; idIndex++) {
      if (idMap[idIndex]) {
        objectId = idMap[idIndex];
        currentObject = DataUtil.GetObjectPtr(objectId, false);

        // Process hooks for each object
        if (currentObject && currentObject.hooks) {
          hookCount = currentObject.hooks.length;

          // Process each hook, working backwards to allow safe removal
          for (currentHook = hookCount - 1; currentHook >= 0; currentHook--) {
            if (idMap[currentObject.hooks[currentHook].objid] &&
              idMap[currentObject.hooks[currentHook].objid] > 0) {

              // Update hook's object ID reference
              currentObject.hooks[currentHook].objid = idMap[currentObject.hooks[currentHook].objid];

              // Insert link if needed
              if (links.length === 0 && !ignoreErrors) {
                if (linksBlock == null) {
                  linksBlock = DataUtil.GetObjectPtr(T3Gv.opt.linksBlockId, true);
                }
                T3Gv.opt.InsertLink(linksBlock, objectId, currentHook, DSConstant.LinkFlags.Move);
              }
            } else {
              // Remove invalid hooks and clear container child flag
              currentObject.hooks.splice(currentHook, 1);
              currentObject.moreflags = Utils2.SetFlag(
                currentObject.moreflags,
                OptConstant.ObjMoreFlags.ContainerChild,
                false
              );
            }
          }
        }

        // Update associated object reference
        if (currentObject && currentObject.associd >= 0) {
          if (idMap[currentObject.associd] && idMap[currentObject.associd] > 0) {
            currentObject.associd = idMap[currentObject.associd];
          } else {
            currentObject.associd = -1;
          }
        }

        // Process connector objects
        if (currentObject &&
          currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector &&
          currentObject.arraylist) {

          hookCount = currentObject.arraylist.hook.length;
          let isLinearConnector = currentObject.arraylist.styleflags & OptConstant.AStyles.Linear;
          skipCount = OptConstant.ConnectorDefines.NSkip;

          // For linear connectors, shift text IDs
          if (isLinearConnector) {
            for (currentHook = hookCount - 1; currentHook > skipCount; currentHook--) {
              currentObject.arraylist.hook[currentHook].textid = currentObject.arraylist.hook[currentHook - 1].textid;
              currentObject.arraylist.hook[currentHook - 1].textid = -1;
            }
          }

          // Process hook IDs and text IDs
          for (currentHook = 0; currentHook < hookCount; currentHook++) {
            // Update hook ID
            if (currentObject.arraylist.hook[currentHook].id === 65535) {
              currentObject.arraylist.hook[currentHook].id = -1;
            } else if (currentObject.arraylist.hook[currentHook].id >= 0) {
              currentObject.arraylist.hook[currentHook].id = idMap[currentObject.arraylist.hook[currentHook].id];
            }

            // Process text on connector
            if (currentObject.arraylist.hook[currentHook].textid >= 0) {
              if (!resultObject.ReadBlocks && !resultObject.ReadGroupBlock) {
                currentObject.arraylist.hook[currentHook].textid = ShapeUtil.GetLineText(
                  resultObject,
                  idIndex,
                  currentObject.arraylist.hook[currentHook].textid,
                  textData
                );

                if (textData.Paint) {
                  currentObject.StyleRecord.Fill.Paint = textData.Paint;
                }
              }
            }
          }

          // Queue connector for formatting if not ignoring errors
          if (!ignoreErrors) {
            connectorsToProcess.push(currentObject);
            currentObject.flags = Utils2.SetFlag(currentObject.flags, NvConstant.ObjFlags.Obj1, true);
          }
        }

        // Update container list references
        if (currentObject &&
          currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
          currentObject.ContainerList) {

          hookCount = currentObject.ContainerList.List.length;
          const containerItems = currentObject.ContainerList.List;

          for (currentHook = 0; currentHook < hookCount; currentHook++) {
            if (containerItems[currentHook].id == null) {
              containerItems[currentHook].id = -1;
            }

            if (containerItems[currentHook].id >= 0) {
              containerItems[currentHook].id = idMap[containerItems[currentHook].id];
            }
          }
        }
      }
    }

    // Update all links with new IDs
    for (linkIndex = 0; linkIndex < links.length; linkIndex++) {
      links[linkIndex].targetid = idMap[links[linkIndex].targetid];
      links[linkIndex].hookid = idMap[links[linkIndex].hookid];
      links[linkIndex].flags = linkFlags;
    }

    // Sort links by target ID for efficient lookup
    links.sort(function (firstLink, secondLink) {
      return firstLink.targetid - secondLink.targetid;
    });

    // Format all connector objects if not ignoring errors
    if (!ignoreErrors) {
      const connectorCount = connectorsToProcess.length;

      for (linkIndex = 0; linkIndex < connectorCount; linkIndex++) {
        currentObject = connectorsToProcess[linkIndex];
        hookCount = currentObject.arraylist.hook.length;

        if (hookCount < skipCount) {
          currentObject.PrFormat(currentObject.BlockID);
        }
      }
    }
  }

  static TextAlignToJust(e) {
    var t = {
      just: 'center',
      vjust: 'middle'
    };
    switch (e) {
      case TextConstant.TextAlign.Left:
        t.just = 'left';
        break;
      case TextConstant.TextAlign.Right:
        t.just = 'right';
        break;
      case TextConstant.TextAlign.TopLeft:
        t.just = 'left',
          t.vjust = 'top';
        break;
      case TextConstant.TextAlign.TopCenter:
        t.vjust = 'top';
        break;
      case TextConstant.TextAlign.TopRight:
        t.just = 'right',
          t.vjust = 'top';
        break;
      case TextConstant.TextAlign.BottomLeft:
        t.just = 'left',
          t.vjust = 'bottom';
        break;
      case TextConstant.TextAlign.BottomCenter:
        t.vjust = 'bottom';
        break;
      case TextConstant.TextAlign.BottomRight:
        t.just = 'right',
          t.vjust = 'bottom'
    }
    return t
  }

  /**
   * Writes selected objects to a buffer in the  format
   *
   * This function serializes the selected objects to a buffer that can be used
   * for clipboard operations, file saving, or other data transfer needs. It captures
   * the current state of the objects including their properties, styles, and layer information.
   *
   * @param selectedObjects - Array of objects to be written to the buffer
   * @param skipTables - Flag indicating whether to skip table data
   * @param unused - Unused parameter (maintained for compatibility)
   * @param preserveSegmentDirection - Flag to preserve the direction of segments
   * @param ignoreDataCheck - Flag to ignore data validation checks
   * @returns Buffer containing the serialized objects in
   */
  static WriteSelect(selectedObjects, skipTables, unused, preserveSegmentDirection, ignoreDataCheck) {
    // Create a new write result object to hold serialization state
    const result = new WResult();

    // Get current session, layer manager and content header
    result.sdp = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
    result.tLMB = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
    result.ctp = T3Gv.opt.header;

    // Mark as selection-only operation
    result.selectonly = true;

    // Preserve segment direction if requested
    if (preserveSegmentDirection) {
      result.KeepSegDir = true;
    }

    // Get work area information (unused result)
    T3Gv.docUtil.svgDoc.GetWorkArea();

    // Configure result with current document settings
    result.docDpi = T3Gv.docUtil.svgDoc.docInfo.docDpi;
    result.zList = selectedObjects;
    result.noTables = skipTables;
    result.richGradients = T3Gv.opt.richGradients;

    // Update layer information for selected objects
    LayerUtil.UpdateObjectLayerIndices(result);

    console.log("=U.ShapeUtil WriteSelect result=", result);

    // Write objects to localStorage with selection-only flag
    return ShapeUtil.WriteBuffer(result, true, true, ignoreDataCheck);
  }

  /**
   * Serializes drawing data to a JSON format and stores it in localStorage
   *
   * This function creates a JSON representation of the drawing data, containing all
   * necessary document information including objects, styles, layers, and metadata.
   * It can produce either a complete document or just selected objects for clipboard/drag operations.
   *
   * @param resultObject - Object containing document data, styling, and processing context
   * @param isSelectOnly - Flag indicating if only selected objects should be written
   * @param returnRawData - Flag indicating if raw JSON should be returned instead of storage key
   * @param ignoreDataCheck - Flag to ignore data validation checks
   * @returns JSON string or storage key containing the serialized document, or null if an error occurred
   */
  static WriteBuffer(resultObject, isSelectOnly, returnRawData, ignoreDataCheck) {
    try {
      // Create JSON structure to hold serialized data
      const jsonData = {
        signature: ShapeUtil.Signature,
        version: resultObject.WriteWin32 ? ShapeUtil.FVERSION2015 : T3Gv.opt.FileVersion,
        platform: "JSON",
        timestamp: new Date().getTime(),
        isSelectOnly: isSelectOnly,
        data: {}
      };

      // Set coordinate scale factor
      resultObject.coordScaleFactor = resultObject.WriteWin32 ?
        (ShapeUtil.DRAWRES / T3Gv.docUtil.svgDoc.docInfo.docDpi) : 1;

      // Set ruler configuration
      jsonData.rulerConfig = {
        ...T3Gv.docUtil.rulerConfig,
        show: T3Gv.docUtil.docConfig.showRulers
      };
      resultObject.rulerConfig = jsonData.rulerConfig;

      // Add header information based on operation mode
      if (isSelectOnly) {
        jsonData.data.header = { type: "selectOnly" };
      } else {
        jsonData.data.header = {
          type: "fullDocument",
          panelName: T3Gv.opt.header.panelName,
          importSourcePath: T3Gv.opt.header.importSourcePath,
          BusinessModule: T3Gv.opt.header.BusinessModule,
          SymbolSearchString: T3Gv.opt.header.SymbolSearchString,
          orgcharttable: T3Gv.opt.header.orgcharttable,
          lpName: T3Gv.opt.header.lpName,
          ParentPageID: T3Gv.opt.header.ParentPageID
        };
      }

      // Add structured data if available and not ignored
      if (T3Gv.opt.header.STDataID >= 0 && !ignoreDataCheck) {
        const stData = DataUtil.GetObjectPtr(T3Gv.opt.header.STDataID, false);
        jsonData.data.structuredData = stData ? JSON.parse(JSON.stringify(stData)) : null;
      }

      // Process and add drawing content
      const drawingData = {
        objects: [],
        styles: [],
        layers: []
      };

      // Add styles
      ShapeUtil.BuildStyleList(resultObject);
      drawingData.styles = resultObject.lpStyles.map(style => JSON.parse(JSON.stringify(style)));

      // Add layers
      if (resultObject.tLMB && resultObject.tLMB.layers) {
        drawingData.layers = resultObject.tLMB.layers.map(layer => ({
          name: layer.name,
          flags: layer.flags,
          layertype: layer.layertype,
          zList: layer.zList ? [...layer.zList] : []
        }));
        drawingData.activeLayer = resultObject.tLMB.activelayer;
      }

      // Process objects
      const objectCount = resultObject.zList.length;
      for (let i = 0; i < objectCount; i++) {
        const objectId = resultObject.zList[i];
        const drawingObject = DataUtil.GetObjectPtr(objectId, false);

        if (drawingObject) {
          const serializedObject = JSON.parse(JSON.stringify(drawingObject));

          // Handle special properties that need custom serialization
          if (drawingObject.DataID > 0) {
            const textObject = DataUtil.GetObjectPtr(drawingObject.DataID, false);
            if (textObject) {
              serializedObject.textContent = textObject.runtimeText || "";
            }
          }

          drawingData.objects.push(serializedObject);
        }
      }

      // Add drawing data to JSON structure
      jsonData.data.drawing = drawingData;

      // Convert to JSON string
      const jsonString = JSON.stringify(jsonData);

      // Generate a unique storage key
      // const storageKey = `T3000_Drawing_${new Date().getTime()}`;
      const storageKey = "t3.draw";

      // Store in localStorage
      localStorage.setItem(storageKey, jsonString);

      // Return raw data or storage key based on parameters
      return (isSelectOnly || returnRawData) ? jsonString : storageKey;

    } catch (error) {
      console.error("Error serializing drawing to JSON:", error);
      return null;
    }
  }

  /**
   * Builds a list of styles used by objects in the document
   *
   * This function creates a comprehensive list of all styles used throughout the document,
   * including object styles, table cell styles, and text styles. It identifies unique styles,
   * creates a mapping between objects and their styles, and establishes relationships between
   * text objects and their containing elements. The function populates the styles array in the
   * result object for later serialization to the file format.
   *
   * @param resultObject - Object containing document properties and the styles collection to populate
   */
  static BuildStyleList(resultObject) {
    let objectCount;
    let currentObject;
    let childTextCount;
    let index;
    let objectsProcessed;
    let linkObject;
    let tableObject;
    let cellCount;
    let uniqueStyleIndex;
    let cellIndex;
    let currentCell;
    let styleObject;

    /**
     * Adds a style to the style list if it's not already present
     * @param style - The style to add to the list
     * @returns Index of the style in the style list
     */
    function addUniqueStyle(style) {
      let styleIndex;
      let styleCount;
      let styleCopy;

      // Check if the style already exists in the list
      styleCount = resultObject.lpStyles.length;
      for (styleIndex = 0; styleIndex < styleCount; styleIndex++) {
        if (style.Name === resultObject.lpStyles[styleIndex].Name) {
          return styleIndex;
        }
      }

      // Create a deep copy of the style and add to the list
      styleCopy = Utils1.DeepCopy(style);
      resultObject.lpStyles.push(styleCopy);
      return styleCount;
    }

    // Get object list and count
    objectCount = resultObject.zList.length;

    // Get default text block style and create variants for text objects
    const defaultTextStyle = new QuickStyle();//DSConstant.FindStyle(OptConstant.Common.TextBlockStyle);
    const transparentTextStyle = Utils1.DeepCopy(defaultTextStyle);
    const tableCellStyle = Utils1.DeepCopy(defaultTextStyle);

    // Ensure the styles have line properties
    if (defaultTextStyle.Line == null) {
      transparentTextStyle.Line = Utils1.DeepCopy(defaultTextStyle.Border);
      tableCellStyle.Line = Utils1.DeepCopy(defaultTextStyle.Border);
    }

    // Configure transparent text style for line labels
    transparentTextStyle.Line.Thickness = 0;
    transparentTextStyle.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
    transparentTextStyle.Fill.Paint.Color = resultObject.sdp.background.Paint.Color;

    // Process each object in the list
    objectsProcessed = 0;
    for (index = 0; index < objectCount; index++) {
      // Get object and add its style to the style list
      currentObject = DataUtil.GetObjectPtr(resultObject.zList[index], false);
      currentObject.tstyleindex = addUniqueStyle(currentObject.StyleRecord);

      // Add object to the unique map and increment counter
      resultObject.UniqueMap.push(resultObject.zList[index]);
      objectsProcessed++;

      // Handle text objects associated with lines or with attachment points
      if ((currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line ||
        currentObject.TextFlags & NvConstant.TextFlags.AttachB ||
        currentObject.TextFlags & NvConstant.TextFlags.AttachA) &&
        currentObject.DataID > 0) {

        // Add text object ID (negative to indicate it's a text object)
        resultObject.UniqueMap.push(-currentObject.DataID);
        objectsProcessed++;

        // Use transparent text style for text objects
        if (resultObject.TextStyleIndex == null) {
          resultObject.TextStyleIndex = addUniqueStyle(transparentTextStyle);
        }

        // Create link between line and text object
        linkObject = new Link(objectsProcessed - 1, objectsProcessed, null);
        resultObject.textlinks.push(linkObject);
      }

      // Handle additional text objects when not in Visio format
      const textIdArray = currentObject.GetTextIDs();
      childTextCount = textIdArray.length;
      uniqueStyleIndex = objectsProcessed;

      // Process each text ID
      for (styleObject = 0; styleObject < childTextCount; styleObject++) {
        resultObject.UniqueMap.push(-textIdArray[styleObject]);
        objectsProcessed++;

        // Use transparent text style for text objects
        if (resultObject.TextStyleIndex == null) {
          resultObject.TextStyleIndex = addUniqueStyle(transparentTextStyle);
        }

        // Create link between container and text object
        linkObject = new Link(uniqueStyleIndex, objectsProcessed, null);
        resultObject.textlinks.push(linkObject);
      }

    }
  }

  /**
   * Converts point size to font size in pixels
   *
   * This function takes a font size in points (1/72 of an inch) and converts it
   * to pixels based on the document's current DPI (dots per inch) setting.
   * The standard calculation divides by 72 (points per inch) to get the proper
   * display size across different screen resolutions.
   *
   * @param pointSize - The size of the font in points
   * @returns The equivalent size of the font in pixels based on the document's DPI
   */
  static PointSizeToFontSize(pointSize) {
    return pointSize * T3Gv.opt.svgDoc.GetWorkArea().docDpi / 72;
  }
}

export default ShapeUtil
