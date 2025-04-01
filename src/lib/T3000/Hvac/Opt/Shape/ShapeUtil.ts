

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
import T3DataStream from '../../Util/T3DataStream'
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
   * Writes a code to a data stream and reserves space for length
   * @param dataStream - The data stream to write to
   * @param codeValue - The code value to write to the stream
   * @returns The position where length will be written later
   */
  static WriteCode(dataStream, codeValue) {
    dataStream.writeUint16(codeValue);
    const lengthPosition = dataStream.position;
    dataStream.writeUint32(0); // Reserve space for length
    return lengthPosition;
  }

  /**
   * Writes the length of a block to a data stream at a previously stored position
   * @param dataStream - The data stream to write to
   * @param lengthPosition - The position where the length should be written
   */
  static WriteLength(dataStream, lengthPosition) {
    const currentPosition = dataStream.position;
    dataStream.position = lengthPosition;
    const blockLength = currentPosition - (lengthPosition + 4);
    dataStream.writeUint32(blockLength);
    dataStream.position = currentPosition;
  }

  /**
   * Converts an angle to the Windows angle format (tenths of a degree)
   * @param angle - The angle to convert (in degrees)
   * @returns The converted angle in Windows format (tenths of a degree)
   */
  static ToWinAngle(angle) {
    let winAngle = 10 * angle; // Convert to tenths of a degree

    if (winAngle < 1800) {
      winAngle = -winAngle; // Negative for angles less than 180 degrees
    } else if (winAngle > 1800) {
      winAngle = 3600 - winAngle; // Normalize angles greater than 180 degrees
    }

    return winAngle;
  }

  /**
   * Converts a rectangle to Windows coordinate system
   * @param rect - The rectangle to convert
   * @param scaleFactor - The scale factor to apply
   * @param offset - Optional offset to apply to coordinates
   * @returns A rectangle in Windows coordinate format
   */
  static ToSDWinRect(rect, scaleFactor, offset) {
    const winRect = { left: 0, top: 0, right: 0, bottom: 0 };
    let x = rect.x;
    let y = rect.y;

    // Apply offset if provided
    if (offset) {
      x += offset.x;
      y += offset.y;
    }

    // Apply scale factor if greater than 1, otherwise use direct values
    if (scaleFactor > 1) {
      winRect.left = Math.round(x * scaleFactor);
      winRect.top = Math.round(y * scaleFactor);
      winRect.right = Math.round((x + rect.width) * scaleFactor);
      winRect.bottom = Math.round((y + rect.height) * scaleFactor);
    } else {
      winRect.left = x;
      winRect.top = y;
      winRect.right = x + rect.width;
      winRect.bottom = y + rect.height;
    }

    return winRect;
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

  /**
     * Writes text parameters to a data stream for saving to a file
     * @param dataStream - The data stream to write to
     * @param drawingObject - The drawing object containing text parameters
     * @param textId - The ID of the text block
     * @param options - Configuration options for writing
     */
  static WriteTextParams(dataStream, drawingObject, textId, options) {
    // Use the original object or create a modified version if needed
    let objectToWrite = drawingObject;

    // For shapes with border thickness, create a copy with adjusted frame
    if (
      drawingObject.StyleRecord.Line.BThick &&
      drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape
    ) {
      // Create a deep copy of the frame
      const adjustedFrame = $.extend(true, {}, drawingObject.Frame);

      // Create a deep copy of the drawing object
      objectToWrite = Utils1.DeepCopy(drawingObject);

      // Set line thickness to 0 for the copy
      objectToWrite.StyleRecord.Line.Thickness = 0;

      // Adjust frame dimensions by border thickness
      Utils2.InflateRect(adjustedFrame, -drawingObject.StyleRecord.Line.BThick, -drawingObject.StyleRecord.Line.BThick);

      // Update the frame of the copy
      objectToWrite.UpdateFrame(adjustedFrame);
    }

    // Convert text rectangle to Windows coordinate system
    const winRect = ShapeUtil.ToSDWinRect(objectToWrite.trect, options.coordScaleFactor, options.GroupOffset);

    // Convert text alignment to Windows format
    const winJustification = ShapeUtil.TextAlignToWin(drawingObject.TextAlign);

    // Calculate text wrap width if specified
    let textWrapWidth = 0;
    if (drawingObject.TextWrapWidth > 0) {
      textWrapWidth = ShapeUtil.ToSDWinCoords(drawingObject.TextWrapWidth, options.coordScaleFactor);
    }

    // Write the text code and reserve space for length
    const lengthPosition = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDrawText);

    // Determine which struct format to write based on options
    if (options.WriteWin32) {
      // Create text parameters object for Win32/Visio format
      const textParams = {
        trect: {
          left: 0,
          top: 0,
          right: 0,
          bottom: 0
        },
        left_sindent: drawingObject.left_sindent,
        top_sindent: drawingObject.top_sindent,
        right_sindent: drawingObject.right_sindent,
        bottom_sindent: drawingObject.bottom_sindent,
        tindent: {
          left: ShapeUtil.ToSDWinCoords(drawingObject.tindent.left, options.coordScaleFactor),
          top: ShapeUtil.ToSDWinCoords(drawingObject.tindent.top, options.coordScaleFactor),
          right: ShapeUtil.ToSDWinCoords(drawingObject.tindent.right, options.coordScaleFactor),
          bottom: ShapeUtil.ToSDWinCoords(drawingObject.tindent.bottom, options.coordScaleFactor)
        },
        tmargin: {
          left: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.left, options.coordScaleFactor),
          top: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.top, options.coordScaleFactor),
          right: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.right, options.coordScaleFactor),
          bottom: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.bottom, options.coordScaleFactor)
        },
        textid: textId,
        textflags: drawingObject.TextFlags,
        ascent: 0,
        vjust: winJustification.vjust,
        just: winJustification.just,
        textgrow: drawingObject.TextGrow,
        tangle: ShapeUtil.ToWinAngle(drawingObject.RotationAngle),
        gtangle: 0,
        ltrect: {
          left: winRect.left,
          top: winRect.top,
          right: winRect.right,
          bottom: winRect.bottom
        },
        commentid: drawingObject.NoteID,
        textwrapwidth: textWrapWidth,
        linetextx: drawingObject.LineTextX,
        linetexty: ShapeUtil.ToSDWinCoords(drawingObject.LineTextY, options.coordScaleFactor),
        visiorotationdiff: 10 * drawingObject.VisioRotationDiff
      };

      // Write the parameters using the Win32/Visio struct format
      dataStream.writeStruct(DSConstant.DrawTextStruct110, textParams);
    } else {
      // Create text parameters object for default format
      const textParams = {
        left_sindent: drawingObject.left_sindent,
        top_sindent: drawingObject.top_sindent,
        right_sindent: drawingObject.right_sindent,
        bottom_sindent: drawingObject.bottom_sindent,
        tindent: {
          left: ShapeUtil.ToSDWinCoords(drawingObject.tindent.left, options.coordScaleFactor),
          top: ShapeUtil.ToSDWinCoords(drawingObject.tindent.top, options.coordScaleFactor),
          right: ShapeUtil.ToSDWinCoords(drawingObject.tindent.right, options.coordScaleFactor),
          bottom: ShapeUtil.ToSDWinCoords(drawingObject.tindent.bottom, options.coordScaleFactor)
        },
        tmargin: {
          left: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.left, options.coordScaleFactor),
          top: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.top, options.coordScaleFactor),
          right: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.right, options.coordScaleFactor),
          bottom: ShapeUtil.ToSDWinCoords(drawingObject.TMargins.bottom, options.coordScaleFactor)
        },
        textid: textId,
        textflags: drawingObject.TextFlags,
        ascent: 0,
        vjust: winJustification.vjust,
        just: winJustification.just,
        textgrow: drawingObject.TextGrow,
        tangle: ShapeUtil.ToWinAngle(drawingObject.RotationAngle),
        ltrect: {
          left: winRect.left,
          top: winRect.top,
          right: winRect.right,
          bottom: winRect.bottom
        },
        commentid: drawingObject.NoteID,
        textwrapwidth: textWrapWidth,
        linetextx: drawingObject.LineTextX,
        linetexty: drawingObject.LineTextY,
        visiorotationdiff: 10 * drawingObject.VisioRotationDiff
      };

      // Write the parameters using the default struct format
      dataStream.writeStruct(DSConstant.DrawTextStruct182, textParams);
    }

    // Write the length of the text data block
    ShapeUtil.WriteLength(dataStream, lengthPosition);
  }

  static Result = function () {
    this.error = 0,
      this.ConvertOnSave = !1,
      this.isTemplate = !1,
      this.isSymbol = !1,
      this.IgnoreHeader = !1,
      this.PVersion = 0,
      this.FVersion = 0,
      this.coordScaleFactor = 1,
      this.sdp = null,
      this.GroupOffset = {
        x: 0,
        y: 0
      },
      this.ReadingGroup = !1,
      this.WinSetting = new WinSetting(),
      this.DefTStyle = {},
      this.DefRun = {},
      this.DefFSize = 10,
      this.DefLine = {},
      this.DefBorder = {},
      this.DefFill = {},
      this.fontlist = [],
      this.zList = [],
      this.lpStyles = [],
      this.links = [],
      this.IDMap = [],
      this.textids = [],
      this.usedtextids = [],
      this.noteids = [],
      this.usednoteids = [],
      this.nativeids = [],
      this.imageids = [],
      this.usedimageids = [],
      this.tableids = [],
      this.usedtableids = [],
      this.graphids = [],
      this.usedgraphids = [],
      this.expandedviewids = [],
      this.usedexpandedviewids = [],
      this.Threads = [],
      this.ThreadIDs = [],
      this.objectcount = 0,
      this.textonline = - 1,
      this.textonlineid = - 1,
      this.lineswithtext = [],
      this.SymbolPosition = {
        x: 100,
        y: 100
      },
      this.SetSymbolOrigin = !1,
      this.WarnMeta = !1,
      this.gHash = null,
      this.AddEMFHash = !1,
      this.AllowAddEMFHash = !1,
      this.ValidateHashesAsync = !1,
      this.shapetoolindex = null,
      this.linetoolindex = null,
      this.swimlaneformat = null,
      this.autocontainer = null,
      this.actascontainer = null,
      this.swimlanenlanes = null,
      this.swimlanenvlanes = null,
      this.swimlanerotate = null,
      this.swimlanetitle = null,
      this.collapsetools = null,
      this.TextureList = new TextureList(),
      this.NoTextBlocks = !1,
      this.ReadBlocks = !1,
      this.ReadGroupBlock = !1,
      this.tLMB = null,
      this.BlockzList = [],
      this.DeleteList = [],
      this.richGradients = [],
      this.hasBlockDirectory = !1,
      this.updatetext = !1,
      this.LibraryPathTarget = '',
      this.SetColorChanges = !1,
      this.ColorFilter = 0,
      this.HashRecords = [],
      this.PaperType = 'letter',
      this.IsVisio = !1,
      this.IsLucid = !1,
      this.VisioFileVersion = !1,
      this.ReadTexture = - 1,
      this.STData = null,
      this.FromWindows = !1,
      this.SearchLibs = [],
      this.CurrentSymbol = null,
      this.SearchResults = [],
      this.LoadBlockList = !1,
      // this.RecentSymbols = [],
      this.PaletteStatus = {}
  }

  static Errors = {
    WaitingForCallBack: - 2,
    NoError: 0,
    UnknownFile: 1,
    Version: 2,
    BadFormat: 3,
    MinVersion: 4,
    GroupVersion: 5,
    UnsupportedPanel: 6,
    NoShapesinGroup: 7,
    WarnMeta: 9,
    TooBig: 11,
    MinVersionProjectChart: 12
  }

  static Signature = '00000000'

  static UnsupportedTypes = []

  static ReadSymbolFromJson(buffer, jsonData, positionX, positionY, offset, ignoreErrors, renderObjects,
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

    let errorCode = ShapeUtil.ReadJson(buffer, jsonData, result, offset, false, ShapeUtil.ReadSymbolFromJsonComplete);


    // let errorCode = {};
    // if (errorCode && errorCode != ShapeUtil.Errors.WaitingForCallBack) {
    //   return ignoreErrors ? result.error : errorCode;
    // }

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

        // if (object.objecttype === NvConstant.FNObjectTypes.SD_OBJT_BPMN_POOL) {
        //   DSUtil.ConvertBPMNPool(object);
        // }

        let tableID = -1;
        if (object.datasetID >= 0) {
          tableID = TODO.STData.GetTableID(object.datasetID, TODO.DataTableNames.PLANNING_TASKS);
        }

        let targetLayer;
        if (isPlanningDocument && object.Layer != null &&
          (tableID >= 0 /*|| object.objecttype === NvConstant.FNObjectTypes.SD_OBJT_MINDMAP_CONNECTOR*/)) {
          targetLayer = layersManager.layers[object.Layer].zList;
        } else {
          targetLayer = layersManager.layers[layersManager.activelayer].zList;
          object.Layer = layersManager.activelayer;
        }

        targetLayer.push(result.zList[index]);

        // if (result.IsVisio && object && object.ShapeType === OptConstant.ShapeType.GroupSymbol &&
        //   object.InitialGroupBounds.x < 0) {
        //   object.InitialGroupBounds.x = 1;
        // }

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

        // if (object.objecttype === NvConstant.FNObjectTypes.SD_OBJT_BPMN_POOL) {
        //   DSUtil.ConvertBPMNPool(object);
        // }

        let tableID = -1;
        if (object.datasetID >= 0) {
          tableID = TODO.STData.GetTableID(object.datasetID, TODO.DataTableNames.PLANNING_TASKS);
        }

        let targetLayer;
        if (isPlanningDocument && object.Layer != null &&
          (tableID >= 0 /*|| object.objecttype === NvConstant.FNObjectTypes.SD_OBJT_MINDMAP_CONNECTOR*/)) {
          targetLayer = layersManager.layers[object.Layer].zList;
        } else {
          targetLayer = layersManager.layers[layersManager.activelayer].zList;
          object.Layer = layersManager.activelayer;
        }

        targetLayer.push(result.zList[index]);

        // if (result.IsVisio && object && object.ShapeType === OptConstant.ShapeType.GroupSymbol &&
        //   object.InitialGroupBounds.x < 0) {
        //   object.InitialGroupBounds.x = 1;
        // }

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
        if (storageKeyOrData.startsWith('T3_draw')) {
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

    // Set platform information
    if (jsonData.platform) {
      if (jsonData.platform === "VISIO") {
        result.IsVisio = true;
      } else if (jsonData.platform === "VISIOLUCID") {
        result.IsVisio = true;
        result.IsLucid = true;
      }
    }

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
          if (jsonData.data.header.smartpanelname) {
            T3Gv.opt.header.smartpanelname = jsonData.data.header.smartpanelname;
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
          if (result.IsVisio) {
            // Handle Visio text specifics
            object.StyleRecord.name = OptConstant.Common.TextBlockStyle;

            if (object.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioText && !result.ReadingGroup) {
              object.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
              object.StyleRecord.Line.Thickness = 0;

              // Handle parent-text relationships
              // (simplified from original for clarity)
            }
          }

          // Render and resize text
          SvgUtil.AddSVGObject(null, objectId, true, false);
          T3Gv.opt.TextResizeCommon(objectId, false, true);
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
   * Converts an angle from Windows format (tenths of degrees) to document format (degrees)
   * @param winAngle - The angle in Windows format (tenths of degrees)
   * @returns The normalized angle in degrees, between 0 and 360
   */
  static ToSDJSAngle(winAngle) {
    // Normalize to 0-3600 range (tenths of degrees)
    let normalizedAngle = winAngle % 3600;

    // Apply angle conversion formula
    if (normalizedAngle <= 0) {
      normalizedAngle = normalizedAngle > -1800 ? -normalizedAngle : 3600 + normalizedAngle;
    } else {
      normalizedAngle = 3600 - normalizedAngle;
    }

    normalizedAngle = normalizedAngle % 3600;

    // Convert from tenths of degrees to degrees
    return normalizedAngle / 10;
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

    // /**
    //  * Updates container references in table cells
    //  *
    //  * @param table - The table object containing cells
    //  */
    // const updateTableContainers = function (table) {
    //   let cellIndex;
    //   let currentCell;
    //   let cellCount = table.cells.length;

    //   for (cellIndex = 0; cellIndex < cellCount; cellIndex++) {
    //     currentCell = table.cells[cellIndex];
    //     if (currentCell.childcontainer >= 0) {
    //       currentCell.childcontainer = idMap[currentCell.childcontainer];
    //     }
    //   }
    // };

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

              // Special handling for Visio segmented lines
              if (resultObject.IsVisio &&
                currentObject &&
                currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
                currentObject.LineType === OptConstant.LineType.SEGLINE &&
                currentObject.segl) {

                targetObject = DataUtil.GetObjectPtr(currentObject.hooks[currentHook].objid, false);

                // Adjust connection point for rotated objects
                if (targetObject.RotationAngle) {
                  rotationRect = {
                    x: 0,
                    y: 0,
                    width: coordinateDimension,
                    height: coordinateDimension
                  };

                  rotationAngle = targetObject.RotationAngle / (180 / NvConstant.Geometry.PI);
                  rotatedPoints = [];
                  rotatedPoints.push(currentObject.hooks[currentHook].connect);
                  Utils3.RotatePointsAboutCenter(rotationRect, rotationAngle, rotatedPoints);
                }

                // Handle edge connections for shapes
                if (targetObject &&
                  targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
                  ShapeUtil.ConnectedToEdge(currentObject.hooks[currentHook].connect)) {

                  if (currentObject.hooks[currentHook].hookpt === OptConstant.HookPts.KTL) {
                    currentObject.segl.firstdir = targetObject.GetSegLFace(
                      currentObject.hooks[currentHook].connect,
                      currentObject.StartPoint,
                      currentObject.StartPoint
                    );
                  } else {
                    currentObject.segl.lastdir = targetObject.GetSegLFace(
                      currentObject.hooks[currentHook].connect,
                      currentObject.EndPoint,
                      currentObject.EndPoint
                    );
                  }
                }
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

        // // Update container references in tables
        // if (currentObject &&
        //   currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
        //   currentObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_TABLE_WITH_SHAPECONTAINER &&
        //   (tableObject = currentObject.GetTable(false))) {

        //   updateTableContainers(tableObject);
        // }

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

  /**
   * Converts coordinates from Windows format to document format with proper scaling
   *
   * This function applies scaling to coordinate values to convert them between
   * different coordinate systems. It handles special cases where scaling might
   * result in zero values when the original value is non-zero.
   *
   * @param coordinateValue - The coordinate value to be converted
   * @param scaleFactor - The scaling factor to apply
   * @returns The converted coordinate value with proper scaling applied
   */
  static ToSDJSCoords(coordinateValue, scaleFactor, isExtra?) {
    let convertedValue = scaleFactor * coordinateValue;

    // Handle case where scaling results in zero, but original value isn't zero
    if (convertedValue === 0 && coordinateValue !== 0) {
      convertedValue = scaleFactor * coordinateValue; // Recalculate to avoid precision loss
    }

    return convertedValue;
  }

  /**
   * Converts a rectangle from Windows coordinate system to document coordinate system
   * @param winRect - The rectangle in Windows format with left, top, right, bottom properties
   * @param scaleFactor - The scale factor to apply to the coordinates
   * @returns A rectangle object with x, y, width, and height properties
   */
  static ToSDJSRect(winRect, scaleFactor) {
    let rect: any = {};

    // Convert position
    rect.x = winRect.left * scaleFactor;
    rect.y = winRect.top * scaleFactor;

    // Calculate and convert dimensions
    const width = winRect.right - winRect.left;
    const height = winRect.bottom - winRect.top;

    rect.width = width * scaleFactor;
    rect.height = height * scaleFactor;

    return rect;
  }

  /**
   * Converts a Windows color value to HTML hexadecimal color format
   * @param colorValue - The Windows color value in ABGR format (0xAARRGGBB)
   * @returns A string representing the color in HTML hex format (#RRGGBB)
   */
  static WinColorToHTML(colorValue) {
    // Extract RGB components from the color value
    const red = colorValue & 0xFF;                    // Extract red (lowest byte)
    const green = (colorValue & 0xFF00) >>> 8;        // Extract green (second byte)
    const blue = (colorValue & 0xFF0000) >>> 16;      // Extract blue (third byte)

    // Convert each component to hex and concatenate to form the HTML color string
    return '#' +
      DSUtil.decimalToHex(red, 2, true) +
      DSUtil.decimalToHex(green, 2, true) +
      DSUtil.decimalToHex(blue, 2, true);
  }

  /**
   * Extracts the alpha channel from a Windows 32-bit color value and converts it to a 0-1 opacity value
   *
   * This function takes a Windows format color value (0xAARRGGBB) and extracts the alpha channel,
   * which uses 0 for fully opaque and 255 for fully transparent. It then converts this to the standard
   * web opacity format where 0 is fully transparent and 1 is fully opaque.
   *
   * @param colorValue - The Windows 32-bit color value with alpha channel in the high byte
   * @returns A value between 0 and 1 representing the opacity (1 = opaque, 0 = transparent)
   */
  static WinColorToAlpha(colorValue) {
    // Extract alpha value from the high byte and convert from Windows format (0=opaque, 255=transparent)
    // to standard web format (0=transparent, 1=opaque)
    return (255 - ((colorValue & 0xFF000000) >>> 24)) / 255;
  }

  /**
   * Reads outside effect data from the input object and creates an OutsideEffectData instance
   * @param outsideData - The source data containing outside effect properties
   * @param isVisio - Flag indicating whether the source is from Visio format
   * @returns A new OutsideEffectData object with properties set from the source
   */
  static ReadOutSide(outsideData, isVisio) {
    const effectData = new OutsideEffectData();

    // Set the type of outside effect (shadow, glow, etc.)
    effectData.OutsideType = outsideData.outsidetype;

    // Set the extent values for each side, ensuring they are valid numbers
    effectData.OutsideExtent_Right = isValidValue(outsideData.extent.right) ? outsideData.extent.right : 0;
    effectData.OutsideExtent_Left = isValidValue(outsideData.extent.left) ? outsideData.extent.left : 0;
    effectData.OutsideExtent_Top = isValidValue(outsideData.extent.top) ? outsideData.extent.top : 0;
    effectData.OutsideExtent_Bottom = isValidValue(outsideData.extent.bottom) ? outsideData.extent.bottom : 0;

    // Convert Windows color format to HTML color format
    effectData.Color = ShapeUtil.WinColorToHTML(outsideData.color);

    // Set additional effect parameters
    effectData.LParam = outsideData.lparam;
    effectData.WParam = outsideData.wparam;

    return effectData;

    /**
     * Checks if a value is a valid number considering Visio format requirements
     * @param value - The value to validate
     * @returns True if the value is valid, false otherwise
     */
    function isValidValue(value) {
      return (value !== Infinity && !isNaN(value));
    }
  }

  /**
   * Reads fill data properties from the input structure and populates the fill object
   * @param fillObject - The destination fill object that will be populated with properties
   * @param codeData - The code data structure containing fill information
   * @param codeIndex - The current index/position in the code structure
   * @param resultObject - The result object containing global state and settings
   * @param opCodes - Object containing operation code constants and references
   * @returns Updated code index position after processing
   */
  static ReadSDFill(fillObject, codeData, codeIndex, resultObject, opCodes) {
    // Move past the BEGIN_FILL code
    codeIndex++;

    // Initialize fill properties with default values
    fillObject.Hatch = 0;
    fillObject.FillEffect = 0;
    fillObject.EffectColor = NvConstant.Colors.White;
    fillObject.LParam = 0;
    fillObject.WParam = 0;

    // Process fill properties until we reach the END_FILL code
    while (codeData.codes[codeIndex].code != opCodes.cEndFill) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cBeginPaint:
          // Process paint information (color, pattern, etc.)
          codeIndex = ShapeUtil.ReadPaint(fillObject.Paint, codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cHatch:
          // Set hatch pattern if it's a valid hatch style
          if (codeData.codes[codeIndex].data.hatch >= 0 &&
            codeData.codes[codeIndex].data.hatch < DSConstant.SDGHatchStyleTotal) {
            fillObject.Hatch = codeData.codes[codeIndex].data.hatch;
          }
          break;

        case opCodes.cEffect:
          // Set fill effect properties
          fillObject.FillEffect = codeData.codes[codeIndex].data.effecttype;
          fillObject.EffectColor = ShapeUtil.WinColorToHTML(codeData.codes[codeIndex].data.effectcolor);
          fillObject.LParam = codeData.codes[codeIndex].data.lparam;
          fillObject.WParam = codeData.codes[codeIndex].data.wparam;
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              codeData.codes[codeIndex].code & DSConstant.SDF_MASK | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Reads line style data from a code structure and populates a line style object
   * @param lineStyleObject - The destination line style object to be populated
   * @param codeData - The code data structure containing line style information
   * @param codeIndex - The current index in the code structure
   * @param resultObject - Object containing parsing results and global settings
   * @param opCodes - Object containing operation code constants
   * @returns Updated code index position after processing
   */
  static ReadSDLine(lineStyleObject, codeData, codeIndex, resultObject, opCodes) {
    const linePatterns = DSConstant.WinLinePatterns;
    let linePattern, colorValue;

    // Process line thickness with scale factor
    lineStyleObject.Thickness = ShapeUtil.ToSDJSCoords(
      codeData.codes[codeIndex].data.thickness,
      resultObject.coordScaleFactor
    );

    // Fix Visio-specific thickness issues
    if (lineStyleObject.Thickness !== 0 &&
      lineStyleObject.Thickness < 0.333 &&
      resultObject.IsVisio) {
      lineStyleObject.Thickness = 0.333;
    }

    // Handle case when source thickness is positive but scaled thickness is zero
    if (codeData.codes[codeIndex].data.thickness > 0 &&
      lineStyleObject.Thickness === 0) {
      lineStyleObject.Thickness = 1;
    }

    // Initialize border thickness
    lineStyleObject.BThick = 0;

    // Store pattern for later use
    linePattern = codeData.codes[codeIndex].data.pattern;

    // Process line pattern
    switch (linePattern) {
      case linePatterns.SEP_None:
        // No line
        lineStyleObject.Thickness = 0;
        lineStyleObject.LinePattern = 0;
        break;
      case linePatterns.SEP_Dotted:
      case linePatterns.SEP_Dashed:
      case linePatterns.SEP_DDashed:
      case linePatterns.SEP_DDDashed:
        // Use predefined pattern data
        lineStyleObject.LinePattern = DSConstant.LinePatternData[
          linePattern - linePatterns.SEP_Solid
        ];
        break;
      default:
        // Solid line
        lineStyleObject.LinePattern = 0;
    }

    // Initialize additional line properties
    lineStyleObject.Hatch = 0;
    lineStyleObject.LineEffect = 0;
    lineStyleObject.LParam = 0;
    lineStyleObject.WParam = 0;

    // Move to next code
    codeIndex++;

    // Process line properties until end marker is reached
    while (codeData.codes[codeIndex].code != opCodes.cEndLine) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cBeginPaint:
          // Read paint information (color, pattern, etc.)
          codeIndex = ShapeUtil.ReadPaint(
            lineStyleObject.Paint,
            codeData,
            codeIndex,
            resultObject,
            opCodes
          );
          break;

        case opCodes.cHatch:
          // Set hatch pattern
          lineStyleObject.Hatch = codeData.codes[codeIndex].data.hatch;
          break;

        case opCodes.cEffect:
          // Set line effect properties
          lineStyleObject.LineEffect = codeData.codes[codeIndex].data.effecttype;
          lineStyleObject.LParam = codeData.codes[codeIndex].data.lparam;
          lineStyleObject.WParam = codeData.codes[codeIndex].data.wparam;
          break;

        case opCodes.cFilledLine:
          // Process filled line properties
          if (codeData.codes[codeIndex].data.bthick == 0) break;

          switch (linePattern) {
            case linePatterns.SEP_None:
            case linePatterns.SEP_Solid:
            case linePatterns.SEP_Dotted:
            case linePatterns.SEP_Dashed:
            case linePatterns.SEP_DDashed:
            case linePatterns.SEP_DDDashed:
            case linePatterns.SEP_FilledLine:
              // Store original thickness
              const originalThickness = lineStyleObject.Thickness;

              // Calculate new thickness based on border thickness
              lineStyleObject.Thickness = ShapeUtil.ToSDJSCoords(
                2 * codeData.codes[codeIndex].data.bthick,
                resultObject.coordScaleFactor
              );

              // Clear pattern for filled lines
              if (linePattern === linePatterns.SEP_FilledLine) {
                lineStyleObject.LinePattern = 0;
              }

              // Set border thickness to half of line thickness
              lineStyleObject.BThick = lineStyleObject.Thickness / 2;

              // Update color if needed
              if (lineStyleObject.Paint.Color === NvConstant.Colors.White &&
                originalThickness > 0) {
                colorValue = ShapeUtil.WinColorToHTML(codeData.codes[codeIndex].data.color);
                if (colorValue != NvConstant.Colors.White) {
                  lineStyleObject.Paint.Color = colorValue;
                  lineStyleObject.Paint.Opacity = ShapeUtil.WinColorToAlpha(
                    codeData.codes[codeIndex].data.color
                  );
                }
              }
              break;

            case linePatterns.SEP_DoubleLine:
              // Process double line
              lineStyleObject.Thickness = ShapeUtil.ToSDJSCoords(
                2 * codeData.codes[codeIndex].data.bthick,
                resultObject.coordScaleFactor
              );
              lineStyleObject.LinePattern = 0;
              lineStyleObject.BThick = lineStyleObject.Thickness / 2;
              break;
          }
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              codeData.codes[codeIndex].code & DSConstant.SDF_MASK | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Reads paint properties from a code structure and populates a paint data object
   * @param paintObject - The destination paint object to populate with properties
   * @param codeData - The source data structure containing paint information
   * @param codeIndex - The current position in the code structure
   * @param resultObject - Object containing parsing results and global settings
   * @param opCodes - Object containing operation code constants and references
   * @returns Updated code index after processing the paint information
   */
  static ReadPaint(paintObject, codeData, codeIndex, resultObject, opCodes) {
    let richGradient;
    let gradientStop;
    let stopColor;
    let stopOpacity;

    // Initialize paint properties with source data
    paintObject.FillType = codeData.codes[codeIndex].data.filltype;
    paintObject.Color = ShapeUtil.WinColorToHTML(codeData.codes[codeIndex].data.color);
    paintObject.Opacity = ShapeUtil.WinColorToAlpha(codeData.codes[codeIndex].data.color);

    // Set default values for other properties
    paintObject.EndColor = NvConstant.Colors.White;
    paintObject.GradientFlags = 0;
    paintObject.Texture = 0;
    paintObject.TextureScale = new TextureScale();
    paintObject.EndOpacity = 1;

    // Fix fully opaque colors (remove alpha channel)
    if ((paintObject.Color & 0xFF000000) === 0xFF000000) {
      paintObject.Color = paintObject.Color & 0xFFFFFF;
      paintObject.Opacity = 1;
    }

    // Move past the PAINT code
    codeIndex++;

    // Process all paint properties until END_PAINT code
    while (codeData.codes[codeIndex].code != opCodes.cEndPaint) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cGradient:
          // Process gradient information
          paintObject.EndColor = ShapeUtil.WinColorToHTML(codeData.codes[codeIndex].data.ecolor);
          paintObject.GradientFlags = codeData.codes[codeIndex].data.gradientflags;
          paintObject.EndOpacity = ShapeUtil.WinColorToAlpha(codeData.codes[codeIndex].data.ecolor);

          // Fix fully opaque end colors
          if ((paintObject.EndColor & 0xFF000000) === 0xFF000000) {
            paintObject.EndColor = paintObject.EndColor & 0xFFFFFF;
            paintObject.EndOpacity = 1;
          }
          break;

        case opCodes.cRichGradient:
          // Create a rich gradient with specified type and angle
          richGradient = new DSUtil.SDRichGradient(
            codeData.codes[codeIndex].data.gradienttype,
            codeData.codes[codeIndex].data.angle
          );
          break;

        case opCodes.cRichGradientStop:
          // Add a gradient stop if a rich gradient exists
          if (richGradient !== undefined) {
            stopColor = ShapeUtil.WinColorToHTML(codeData.codes[codeIndex].data.color);
            stopOpacity = ShapeUtil.WinColorToAlpha(codeData.codes[codeIndex].data.color);

            gradientStop = new DSUtil.SDRichGradientStop(
              stopColor,
              stopOpacity,
              codeData.codes[codeIndex].data.stop
            );

            richGradient.stops.push(gradientStop);
          }
          break;

        case opCodes.cTexture:
          // Handle texture index references
          if (resultObject.ReadBlocks) {
            paintObject.Texture = codeData.codes[codeIndex].data.textureindex;
          } else if (resultObject.TextureList.Textures[codeData.codes[codeIndex].data.textureindex]) {
            paintObject.Texture = resultObject.TextureList.Textures[codeData.codes[codeIndex].data.textureindex].index;
          } else {
            resultObject.ReadTexture = codeData.codes[codeIndex].data.textureindex;
            paintObject.Texture = undefined;
          }
          break;

        case opCodes.cThemeTexture:
          // Theme textures handled elsewhere
          break;

        case opCodes.oTextureExtra:
          // Set texture scale and alignment properties
          paintObject.TextureScale.Units = codeData.codes[codeIndex].data.units;
          paintObject.TextureScale.Scale = codeData.codes[codeIndex].data.scale;
          paintObject.TextureScale.RWidth = codeData.codes[codeIndex].data.rwidth;
          paintObject.TextureScale.AlignmentScalar = codeData.codes[codeIndex].data.alignment;
          paintObject.TextureScale.Flags = codeData.codes[codeIndex].data.flags;
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    // If a rich gradient was defined, add it to the rich gradients collection
    if (richGradient !== undefined) {
      paintObject.GradientFlags = T3Gv.opt.SD_AddRichGradient(
        resultObject.richGradients,
        richGradient
      );
    }

    return codeIndex;
  }

  /**
   * Reads text formatting properties and populates a text format object
   * @param textFormatObject - The destination text format object to populate
   * @param codeData - The source data structure containing text format information
   * @param codeIndex - The current position in the code structure
   * @param resultObject - Object containing parsing results and global settings
   * @param opCodes - Object containing operation code constants and references
   * @returns Updated code index after processing text format information
   */
  static ReadSDTxf(textFormatObject, codeData, codeIndex, resultObject, opCodes) {
    // Handle font information from font list or direct ID
    if (resultObject.fontlist.length) {
      const fontRecord = ShapeUtil.FontIDtoFontRec(codeData.codes[codeIndex].data.fontid, resultObject);
      textFormatObject.FontName = fontRecord.fontName;
    } else {
      textFormatObject.FontId = codeData.codes[codeIndex].data.fontid;

      if (textFormatObject.FontId >= 0 && textFormatObject.FontId < resultObject.fontlist.length) {
        textFormatObject.FontName = resultObject.fontlist[textFormatObject.FontId].fontName;
      }
    }

    // Set basic text properties
    textFormatObject.FontSize = codeData.codes[codeIndex].data.fsize;
    textFormatObject.Face = codeData.codes[codeIndex].data.face;

    // Move past the TEXTF code
    codeIndex++;

    // Process all text format properties until END_TEXTF code
    while (codeData.codes[codeIndex].code != opCodes.cEndTextf) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cBeginPaint:
          // Process paint information for text
          codeIndex = ShapeUtil.ReadPaint(
            textFormatObject.Paint,
            codeData,
            codeIndex,
            resultObject,
            opCodes
          );
          break;

        case opCodes.cThemeFont12:
          // Set font name from theme
          textFormatObject.FontName = codeData.codes[codeIndex].data.fontname;
          break;

        case opCodes.cOutSide:
          // Process outside effects for text (shadows, outlines, etc.)
          textFormatObject.Effect = ShapeUtil.ReadOutSide(
            codeData.codes[codeIndex].data,
            resultObject.IsVisio
          );
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    // Reset font ID after processing (font name takes precedence)
    textFormatObject.FontId = -1;

    return codeIndex;
  }

  /**
   * Reads style information from a code structure and populates a style object
   * @param styleObject - The destination style object to be populated with properties
   * @param codeData - The code data structure containing style information
   * @param codeIndex - The current index in the code structure
   * @param resultObject - Object containing parsing results and global settings
   * @param opCodes - Object containing operation code constants
   * @returns Updated code index position after processing
   */
  static ReadStyle(styleObject, codeData, codeIndex, resultObject, opCodes) {
    // Set the style name from the data
    styleObject.Name = codeData.codes[codeIndex].data.stylename;

    // Move past the BEGIN_STYLE code
    codeIndex++;

    // Process all style properties until END_STYLE code is reached
    while (codeData.codes[codeIndex].code != opCodes.cEndStyle) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cBeginFill:
          // Process fill properties (color, pattern, etc.)
          codeIndex = ShapeUtil.ReadSDFill(styleObject.Fill, codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cBeginLine:
          // Process both border and line properties
          ShapeUtil.ReadSDLine(styleObject.Border, codeData, codeIndex, resultObject, opCodes);
          codeIndex = ShapeUtil.ReadSDLine(styleObject.Line, codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cBeginTextf:
          // Process text formatting properties
          codeIndex = ShapeUtil.ReadSDTxf(styleObject.Text, codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cOutSide:
          // Process outside effects (shadows, outlines, etc.)
          styleObject.OutsideEffect = ShapeUtil.ReadOutSide(codeData.codes[codeIndex].data, resultObject.IsVisio);
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Reads a list of styles from the data structure and populates a style array
   * @param styleArray - The array to populate with style objects
   * @param codeData - The code data structure containing style information
   * @param codeIndex - The current index in the code structure
   * @param resultObject - Object containing parsing results and global settings
   * @param opCodes - Object containing operation code constants
   * @returns Updated code index position after processing
   */
  static ReadStyleList(styleArray, codeData, codeIndex, resultObject, opCodes) {
    let styleObject;

    // Move past the BEGIN_STYLELIST code
    codeIndex++;

    // Process all styles until END_STYLELIST code is reached
    while (codeData.codes[codeIndex].code != opCodes.cEndStyleList) {
      if (codeData.codes[codeIndex].code === opCodes.cBeginStyle) {
        // Create a new style object and read its properties
        styleObject = new QuickStyle();
        codeIndex = ShapeUtil.ReadStyle(styleObject, codeData, codeIndex, resultObject, opCodes);
        styleArray.push(styleObject);
      } else if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
        // Handle nested structures by recursively reading frames
        codeIndex = ShapeUtil.ReadFrame(
          codeData,
          codeIndex,
          (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
        );
      }
      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Fixes session flag defaults based on document type and context
   * @param sessionObject - The session object to modify
   * @param resultObject - Object containing parsing results and global settings
   */
  static FixDefaults(sessionObject, resultObject) {
    const sessionFlags = OptConstant.SessionFlags;

    // Special handling for Genograms panel if not a symbol
    if (!resultObject.isSymbol &&
      T3Gv.opt.header.smartpanelname === 'Genograms') {
      // Enable linking lines
      sessionObject.flags = Utils2.SetFlag(sessionObject.flags, sessionFlags.SEDS_LLink, true);
      // Hide connector expansion handles
      sessionObject.flags = Utils2.SetFlag(sessionObject.flags, sessionFlags.SEDS_HideConnExpand, true);
    }
  }

  /**
   * Sets default curvature parameters for templates and builder documents
   * @param sessionObject - The session object to modify
   * @param resultObject - Object containing parsing results and global settings
   */
  static SetCurvatureDefaults(sessionObject, resultObject) {
    // Apply curvature defaults for older documents in template mode or builder
    if (!resultObject.isSymbol &&
      (resultObject.isTemplate || SDUI.Builder) &&
      resultObject.PVersion < ShapeUtil.SDF_PVERSION864) {

      // Define fixed round rectangle parameter
      const roundRectParam = OptConstant.Common.DefFixedRRect;

      // Set curvature parameter (scaled by 100)
      sessionObject.def.curveparam = 100 * roundRectParam;

      // Set round rectangle parameter
      sessionObject.def.rrectparam = roundRectParam;
    }
  }

  static TextFaceToWeight(e) {
    var t = 'normal';
    return e & TextConstant.TextFace.Bold &&
      (t = 'bold'),
      t
  }

  static TextFaceToStyle(e) {
    var t = 'normal';
    return e & TextConstant.TextFace.Italic &&
      (t = 'italic'),
      t
  }

  static TextExtraToBaseLine(e) {
    var t = 'none';
    return e > 100000 &&
      (e = DSUtil.ToInt32(e)),
      e > 0 ? t = 'super' : e < 0 &&
        (t = 'sub'),
      t
  }

  static TextFaceToDecoration(e) {
    var t = 'none';
    return e & TextConstant.TextFace.Under ? t = 'underline' : e & TextConstant.TextFace.Strike &&
      (t = 'line-through'),
      t
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

  static FontIDtoFontRec(e, t) {
    var a,
      r;
    for (r = t.fontlist.length, a = 0; a < r; a++) if (t.fontlist[a].fontID == e) return t.fontlist[a];
    return 0 === r ? t.DefFont : t.fontlist[0]
  }

  static ReadRuns(e, t, a, r, i, n, o) {
    var s,
      l,
      S,
      c,
      u,
      p,
      d,
      D,
      g = e.GetTextLength();
    for (S = t.runs.length, l = 0; l < S; l++) {
      var h,
        m,
        C;
      if (h = t.runs[l].offset, m = l < S - 1 ? t.runs[l + 1].offset : g, !(h >= g)) {
        for (C = !1, c = t.runs[l].op.length, s = 0; s < c; s++) {
          var y = t.runs[l].op[s];
          switch (y.code) {
            case TextConstant.TextStyleCodes.Font:
              u = ShapeUtil.FontIDtoFontRec(y.value, a),
                r.font = u.fontName,
                r.type = u.fontType,
                C = !0;
              break;
            case TextConstant.TextStyleCodes.Size:
              r.size = ShapeUtil.PointSizeToFontSize(y.value),
                C = !0;
              break;
            case TextConstant.TextStyleCodes.SizeFloat:
              r.size = y.value,
                C = !0;
              break;
            case TextConstant.TextStyleCodes.Face:
              r.weight = ShapeUtil.TextFaceToWeight(y.value),
                r.style = ShapeUtil.TextFaceToStyle(y.value),
                r.decoration = ShapeUtil.TextFaceToDecoration(y.value),
                C = !0;
              break;
            case TextConstant.TextStyleCodes.Extra:
              r.baseOffset = ShapeUtil.TextExtraToBaseLine(y.value),
                C = !0;
              break;
            case TextConstant.TextStyleCodes.Color:
              r.color = ShapeUtil.WinColorToHTML(y.value),
                r.colorTrans = ShapeUtil.WinColorToAlpha(y.value),
                C = !0;
              break;
            case TextConstant.TextStyleCodes.Flags:
              r.spError = 0 != (y.value & TextConstant.TextFlags.BadSpell),
                C = !0;
              break;
            case TextConstant.TextStyleCodes.StyleId:
              i.push({
                offset: h,
                pStyleIndex: y.value
              });
              break;
            case TextConstant.TextStyleCodes.LinkId:
              p = DSUtil.ToInt32(y.value),
                D = null,
                n.curLinkIndex >= 0 &&
                (D = n.run[n.run.length - 1]),
                D &&
                p != D.linkIndex &&
                (D.length = h - D.offset, D = null),
                !D &&
                p >= 0 &&
                n.run.push({
                  linkIndex: p,
                  offset: h,
                  length: g - h
                }),
                n.curLinkIndex = p;
              break;
            case TextConstant.TextStyleCodes.DataId:
              d = DSUtil.ToInt32(y.value),
                D = null,
                o.length > 0 &&
                (D = o[o.length - 1]),
                D &&
                  d == D.index ? D.length = m - D.offset : o.push({
                    index: d,
                    offset: h,
                    length: m - h
                  })
          }
        }
        C &&
          e.SetFormat(r, h)
      }
    }
  }

  static W32BulletToJS(e) {
    var t = 'none';
    switch (e) {
      case 1:
        t = 'hround';
        break;
      case 2:
        t = 'sround';
        break;
      case 3:
        t = 'hsquare';
        break;
      case 4:
        t = 'ssquare';
        break;
      case 5:
        t = 'diamond';
        break;
      case 6:
        t = 'chevron';
        break;
      case 7:
        t = 'check';
        break;
      case 8:
        t = 'plus'
    }
    return t
  }

  static ReadTextStyle(e, t, a) {
    var r,
      i,
      n = StyleConstant.ParaStyleCodes;
    for (i = t.codes.length, r = 0; r < i; r++) switch (t.codes[r].code) {
      case n.Just:
        e.just = ShapeUtil.W32JustToJS(t.codes[r].value, !1);
        break;
      case n.Leading:
        e.leading = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Spacing:
        t.codes[r].value < 0 ? e.spacing = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor) : e.spacing = t.codes[r].value / 100;
        break;
      case n.Tracking:
        e.tracking = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Lindent:
        e.lindent = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Rindent:
        e.rindent = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Pindent:
        e.pindent = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Bindent:
        e.bindent = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Bullet:
        e.bullet = ShapeUtil.W32BulletToJS(t.codes[r].value);
        break;
      case n.TabSpace:
        e.tabspace = ShapeUtil.ToSDJSCoords(t.codes[r].value, a.coordScaleFactor);
        break;
      case n.Hyphen:
        e.hyphen = t.codes[r].value
    }
  }

  /**
   * Reads and processes text data from a code structure to create formatted text content
   *
   * This function handles parsing and processing of text content from the file format, including
   * formatting properties like font, style, alignment, hyperlinks, and data fields. It applies
   * these properties to either a new or existing text object, and can process both standard text
   * and comments/notes. The function manages text runs, paragraph styles, and special formatting
   * like hyperlinks, building a complete text representation that can be attached to drawing objects.
   *
   * @param targetObject - The drawing object that will receive the text (can be null)
   * @param containerObject - The container object if different from target (can be null)
   * @param textBlock - The text block object to populate (can be null, will create new if needed)
   * @param codeData - The source code data structure containing text information
   * @param codeIndex - The current position in the code structure
   * @param resultObject - The object containing results, context and default text properties
   * @param opCodes - The operation codes for the file format
   * @param isComment - Flag indicating whether this is a comment/note
   * @param endCodeMarker - The code that marks the end of the text section
   * @returns The updated code index position after processing text
   */
  static ReadText(targetObject, containerObject, textBlock, codeData, codeIndex, resultObject, opCodes, isComment, endCodeMarker) {
    console.log("U.Util1 ReadText input:", {
      targetObject, containerObject, textBlock,
      codeIndex, isComment, endCodeMarker
    });

    // Create text formatting object if it doesn't exist
    if (!T3Gv.gFmtTextObj) {
      T3Gv.gFmtTextObj = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text);
    }

    // Initialize variables
    let styleCount;
    let styleIndex;
    let textStyleIndex;
    let paragraphCount;
    let paragraphIndex;
    let dataFieldIndex;
    let currentParagraph;
    let hyperlink;
    let alignment;
    let textContent;
    let defaultAlignment;
    let currentTextFormat = {};
    let paragraphStyleChanges = [];
    let paragraphStyles = [];
    let hyperlinkPaths = [];
    let linkRuns = [];
    let dataFields = [];
    let currentStyleIndex = 0;
    let textJust = {};

    // Initialize text format with default values
    currentTextFormat.font = resultObject.DefRun.fontrec.fontName;
    currentTextFormat.type = resultObject.DefRun.fontrec.fontType;
    currentTextFormat.size = ShapeUtil.PointSizeToFontSize(resultObject.DefRun.fontrec.fontSize);
    currentTextFormat.weight = ShapeUtil.TextFaceToWeight(resultObject.DefRun.fontrec.face);
    currentTextFormat.style = ShapeUtil.TextFaceToStyle(resultObject.DefRun.fontrec.face);
    currentTextFormat.baseOffset = ShapeUtil.TextExtraToBaseLine(resultObject.DefRun.extra);
    currentTextFormat.decoration = ShapeUtil.TextFaceToDecoration(resultObject.DefRun.fontrec.face);
    currentTextFormat.color = resultObject.DefRun.paint.Color;
    currentTextFormat.colorTrans = resultObject.DefRun.paint.Opacity;
    currentTextFormat.spError = false;

    // Disable rendering and prepare text formatter
    T3Gv.gFmtTextObj.SetRenderingEnabled(false);
    T3Gv.gFmtTextObj.SetText('');
    T3Gv.gFmtTextObj.SetVerticalAlignment('middle');

    // Get the number of styles from the code data
    styleCount = codeData.codes[codeIndex].data.nstyles;

    // Initialize default alignment from result object
    defaultAlignment = resultObject.DefTStyle.just;

    // Use target object's alignment if available
    if (targetObject) {
      textJust = isComment
        ? ShapeUtil.TextAlignToJust(TextConstant.TextAlign.Left)
        : ShapeUtil.TextAlignToJust(targetObject.TextAlign);

      defaultAlignment = textJust.just;
      T3Gv.gFmtTextObj.SetVerticalAlignment(textJust.vjust);
    }

    // Register text block ID in appropriate collection
    if (textBlock) {
      if (isComment) {
        resultObject.noteids[codeData.codes[codeIndex].data.InstID] = textBlock.BlockID;
      } else {
        resultObject.textids[codeData.codes[codeIndex].data.InstID] = textBlock.BlockID;
      }
    }

    // Initialize paragraph styles array with default style
    for (styleIndex = 0; styleIndex < styleCount; styleIndex++) {
      let paragraphStyle = $.extend(true, {}, resultObject.DefTStyle);
      paragraphStyle.just = defaultAlignment;
      paragraphStyles.push(paragraphStyle);
    }

    // Move past the header code
    codeIndex++;

    // Initialize link tracking structure
    let linkInfo = {
      curLinkIndex: -1,
      run: []
    };

    // Process text data until we reach the end marker
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.SDF_C_OUTSIDE:
          // Read outside effect data
          ShapeUtil.ReadOutSide(codeData.codes[codeIndex].data, resultObject.IsVisio);
          break;

        case opCodes.SDF_C_TEXTCHAR:
          // Read text content
          textContent = codeData.codes[codeIndex].data.text ? codeData.codes[codeIndex].data.text : ' ';
          T3Gv.gFmtTextObj.SetText(textContent, currentTextFormat);
          T3Gv.gFmtTextObj.SetParagraphAlignment(defaultAlignment);

          // Handle empty text case
          if (!codeData.codes[codeIndex].data.text) {
            T3Gv.gFmtTextObj.SetText('');
          }
          break;

        case opCodes.SDF_C_TEXTRUN:
          // Process text runs with formatting
          ShapeUtil.ReadRuns(
            T3Gv.gFmtTextObj,
            codeData.codes[codeIndex].data,
            resultObject,
            currentTextFormat,
            paragraphStyleChanges,
            linkInfo,
            dataFields
          );
          break;

        case opCodes.SDF_C_TEXTSTYLE:
          // Process paragraph style changes
          currentStyleIndex = codeData.codes[codeIndex].data.index;

          if (currentStyleIndex < styleCount) {
            // Read style information into the current style
            ShapeUtil.ReadTextStyle(paragraphStyles[currentStyleIndex], codeData.codes[codeIndex].data, resultObject);

            // Clone the style for subsequent styles
            let clonedStyle = $.extend(true, {}, paragraphStyles[currentStyleIndex]);

            // Apply this style to all subsequent styles
            for (textStyleIndex = currentStyleIndex; textStyleIndex < styleCount; textStyleIndex++) {
              paragraphStyles[textStyleIndex] = $.extend(true, {}, clonedStyle);
            }
          }
          break;

        case opCodes.SDF_C_TEXTLINK:
          // Store hyperlink path
          hyperlinkPaths.push(codeData.codes[codeIndex].data.path);
          break;

        case opCodes.SDF_C_TEXTDATA:
          // Store data field
          dataFields.push(codeData.codes[codeIndex].data.dataField);
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
            );
          }
      }
      codeIndex++;
    }

    // Apply paragraph styles to the text
    if (styleCount) {
      // If no paragraph style changes at offset 0, insert one
      if (!paragraphStyleChanges.length || paragraphStyleChanges[0].offset > 0) {
        paragraphStyleChanges.splice(0, 0, {
          pStyleIndex: 0,
          offset: 0
        });
      }

      // Apply each paragraph style change
      paragraphCount = paragraphStyleChanges.length;
      for (paragraphIndex = 0; paragraphIndex < paragraphCount; paragraphIndex++) {
        currentParagraph = paragraphStyleChanges[paragraphIndex];
        dataFieldIndex = currentParagraph.pStyleIndex;

        // Apply the style if within range
        if (dataFieldIndex >= 0 && dataFieldIndex < styleCount) {
          T3Gv.gFmtTextObj.SetParagraphStyle(paragraphStyles[dataFieldIndex], currentParagraph.offset);
        }
      }
    }

    // Apply hyperlinks to the text
    for (paragraphIndex = 0; paragraphIndex < linkInfo.run.length; paragraphIndex++) {
      hyperlink = linkInfo.run[paragraphIndex];

      if (hyperlink.linkIndex >= 0 && hyperlink.linkIndex < hyperlinkPaths.length) {
        T3Gv.gFmtTextObj.SetHyperlink(
          hyperlinkPaths[hyperlink.linkIndex],
          hyperlink.offset,
          hyperlink.length
        );
      }
    }

    // Apply data fields to the text
    for (paragraphIndex = 0; paragraphIndex < dataFields.length; paragraphIndex++) {
      currentParagraph = dataFields[paragraphIndex];

      if (currentParagraph.index >= 0 && currentParagraph.index < dataFields.length) {
        T3Gv.gFmtTextObj.SetFormat(
          { dataField: dataFields[currentParagraph.index] },
          currentParagraph.offset,
          currentParagraph.length
        );
      }
    }

    // Re-enable rendering
    T3Gv.gFmtTextObj.SetRenderingEnabled(true);

    // Get the processed text content
    let processedText = T3Gv.gFmtTextObj.GetRuntimeText();

    // Clean up if we have link runs
    if (linkInfo.run.length) {
      T3Gv.gFmtTextObj = null;
    }

    // Apply the text to the appropriate object if not skipping text blocks
    if (!resultObject.NoTextBlocks) {
      if (containerObject) {
        // Create a new base drawing object for the text
        let textObject = new Instance.Shape.BaseDrawObject();

        if (isComment) {
          textObject.SetNoteContent(processedText);
          containerObject.NoteID = textObject.NoteID;
        } else {
          textObject.SetTextContent(processedText);
          containerObject.DataID = textObject.DataID;
        }
      } else if (targetObject) {
        // Apply text directly to target object
        if (isComment) {
          targetObject.SetNoteContent(processedText);
        } else {
          targetObject.SetTextContent(processedText);
        }
      } else if (textBlock) {
        // Store text in the text block
        textBlock.runtimeText = processedText;
      }
    }

    console.log("U.Util1 ReadText output:", {
      updatedCodeIndex: codeIndex,
      processedText: processedText
    });

    return codeIndex;
  }

  static ReadTextBlock(e, t, a, r, i) {
    var n,
      o;
    e.codes[t].data.InstID,
      o = i ? r.SDF_C_COMMENT_END : r.SDF_C_TEXT_END;
    return n = new TextObject({
    }),
      i ? T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.NotesObject, n) : T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.TextObject, n),
      t = ShapeUtil.ReadText(null, null, n, e, t, a, r, i, o)
  }

  /**
   * Reads and processes drawing configuration data from a code structure
   * @param codeData - The source data structure containing drawing information
   * @param codeIndex - The current index in the code structure
   * @param resultObject - Object containing parsing results and settings
   * @param opCodes - Object containing operation code constants
   * @param endCodeMarker - The code marker that indicates the end of the drawing section
   * @returns The updated code index position after processing
   */
  static ReadDraw(codeData, codeIndex, resultObject, opCodes, endCodeMarker) {
    let styleCount = 0;
    let imageRecord = null;
    let graphBlock = null;
    let ganttInfoBlock = null;
    let expandedViewBlock = null;
    let tableBlock = null;
    const sessionData = resultObject.sdp;
    const layerManager = resultObject.tLMB;

    // Initialize session data based on file format version
    if (endCodeMarker != opCodes.cDrawEnd) {
      // Modern format - read session data directly
      ShapeUtil.ReadDrawSession(sessionData, layerManager, codeData.codes[codeIndex].data, resultObject);

      // Apply special handling for Visio imports
      if (resultObject.IsVisio) {
        ShapeUtil.SetDefaults(sessionData, resultObject);
      }
    } else {
      // Legacy format (version 6) - read and convert session data
      ShapeUtil.SetDefaults(sessionData, resultObject);
      ShapeUtil.ReadDrawSession6(sessionData, codeData.codes[codeIndex].data, resultObject);
      ShapeUtil.SetDefaults(sessionData, resultObject);
    }

    // Apply additional defaults and fixes
    ShapeUtil.FixDefaults(sessionData, resultObject);
    ShapeUtil.SetCurvatureDefaults(sessionData, resultObject);

    // Move past the header code
    codeIndex++;

    // Process all drawing components until end marker is reached
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cDraw7:
          // Process version 7 drawing data
          ShapeUtil.ReadDraw7(sessionData, layerManager, codeData.codes[codeIndex].data, resultObject);
          break;

        case opCodes.cDrawExtra:
          // Process extended drawing properties
          ShapeUtil.ReadDrawExtra(sessionData, codeData.codes[codeIndex].data, resultObject);
          break;

        case opCodes.cSdData64c:
          // Load structured data sets
          TODO.STData.LoadDataSets(codeData.codes[codeIndex].data.bytes, true, true, resultObject);
          break;

        case opCodes.cBeginStyle:
          // Process style information
          if (styleCount === 0) {
            // First style is the default style for session
            codeIndex = ShapeUtil.ReadStyle(sessionData.def.style, codeData, codeIndex, resultObject, opCodes);
            ShapeUtil.SetDefaults(sessionData, resultObject);
          } else {
            // Additional styles
            let newStyle = new QuickStyle();
            codeIndex = ShapeUtil.ReadStyle(newStyle, codeData, codeIndex, resultObject, opCodes);
          }
          styleCount++;
          break;

        case opCodes.cBeginFill:
          // Process background fill properties
          codeIndex = ShapeUtil.ReadSDFill(sessionData.background, codeData, codeIndex, resultObject, opCodes);

          // Fix texture references if needed
          if (resultObject.sdp.background.Paint.FillType === NvConstant.FillTypes.Texture &&
            resultObject.sdp.background.Paint.Texture == null) {
            resultObject.sdp.background.Paint.Texture = resultObject.ReadTexture;
          }
          break;

        case opCodes.cBeginLine:
          // Process line style properties
          codeIndex = ShapeUtil.ReadSDLine(sessionData.def.style.Line, codeData, codeIndex, resultObject, opCodes);
          ShapeUtil.SetDefaults(sessionData, resultObject);
          break;

        case opCodes.cBeginStyleList:
          // Process list of styles
          codeIndex = ShapeUtil.ReadStyleList(resultObject.lpStyles, codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cDrawLink:
        case opCodes.cDrawLink6:
          // Process object links
          ShapeUtil.ReadLinkList(resultObject.links, codeData.codes[codeIndex].data);
          break;

        case opCodes.cDrawGroup:
          // Group definition (handled elsewhere)
          break;

        case opCodes.cDrawObj8:
          // Process version 8 drawing object
          codeIndex = ShapeUtil.ReadObject(codeData, codeIndex, resultObject, opCodes,
            DSConstant.OpNameCode.cDrawObj8End);

          if (codeIndex < 0) {
            return -1; // Error occurred while reading object
          }
          break;

        case opCodes.cDrawObj:
          // Process standard drawing object
          codeIndex = ShapeUtil.ReadObject(codeData, codeIndex, resultObject, opCodes,
            DSConstant.OpNameCode.cDrawObjEnd);

          if (codeIndex < 0) {
            return -1; // Error occurred while reading object
          }
          break;

        // case opCodes.cTableBlock:
        //   // Process table block
        //   tableBlock = ShapeUtil.ReadTableBlock(codeData, codeIndex, resultObject);
        //   break;

        // case opCodes.cGraphBlock:
        //   // Process graph block
        //   graphBlock = ShapeUtil.ReadGraphBlock(codeData, codeIndex, resultObject);
        //   break;

        // case opCodes.cGraph:
        //   // Process graph data
        //   if (graphBlock == null) {
        //     graphBlock = new Instance.Shape.Graph();
        //   }
        //   codeIndex = ShapeUtil.ReadGraph(graphBlock, codeData, codeIndex, resultObject, opCodes, opCodes.cGraphEnd);
        //   break;

        // case opCodes.cExpandedViewBlock:
        //   // Process expanded view block
        //   expandedViewBlock = ShapeUtil.ReadExpandedViewBlock(codeData, codeIndex, resultObject);
        //   break;

        case opCodes.cExpandedView:
          // Process expanded view SVG data
          if (expandedViewBlock) {
            expandedViewBlock.Data = codeData.codes[codeIndex].data.svg;
          }
          break;

        case opCodes.cGanttInfoBlock:
          // Process Gantt chart info block
          ganttInfoBlock = ShapeUtil.ReadGanttInfoBlock(codeData, codeIndex, resultObject);
          break;

        case opCodes.cCloudCommentBlock:
          // Process cloud comment block
          ShapeUtil.ReadCommentBlock(codeData, codeIndex, resultObject);
          break;

        case opCodes.cGanttInfo:
          // Process Gantt chart information
          if (ganttInfoBlock == null) {
            ganttInfoBlock = new TODO.Table.GanttInfo();
          }
          ShapeUtil.ReadGanttInfo(ganttInfoBlock, codeData.codes[codeIndex].data, resultObject);
          break;

        case opCodes.cLongText8:
          // Process text block
          codeIndex = ShapeUtil.ReadTextBlock(codeData, codeIndex, resultObject, opCodes, false);
          break;

        case opCodes.cComment:
          // Process comment text
          codeIndex = ShapeUtil.ReadTextBlock(codeData, codeIndex, resultObject, opCodes, true);
          break;

        case opCodes.cImageBlock:
          // Process image block
          ShapeUtil.ReadImageBlock(codeData, codeIndex, resultObject, opCodes, true);
          break;

        case opCodes.cNativeBlock:
          // Process native format block
          codeIndex = ShapeUtil.ReadNativeBlock(codeData, codeIndex, resultObject, opCodes, true);
          break;

        case opCodes.cNativeWinBlock:
          // Process native Windows format block
          codeIndex = ShapeUtil.ReadNativeBlock(codeData, codeIndex, resultObject, opCodes, false);
          break;

        case opCodes.oRuler:
          // Process ruler configuration
          resultObject.rulerConfig = new RulerConfig();
          ShapeUtil.ReadRulers(codeData.codes[codeIndex].data, resultObject);
          break;

        case opCodes.cLineDrawList:
          // Process line drawing list
          ShapeUtil.ReadLineDrawList(codeData.codes[codeIndex].data, resultObject);
          break;

        case opCodes.cRecentSymbolsBegin:
          // Process recent symbols list
          codeIndex = ShapeUtil.ReadRecentSymbols(codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cBeginLayer:
          // Process layer definitions
          codeIndex = ShapeUtil.ReadLayers(codeData, codeIndex, resultObject, opCodes);
          break;

        case opCodes.cDrawImage8:
          // Process image record data
          imageRecord = new ImageRecord();
          imageRecord.croprect = codeData.codes[codeIndex].data.croprect;
          imageRecord.scale = codeData.codes[codeIndex].data.scale;
          imageRecord.imageflags = codeData.codes[codeIndex].data.imageflags;
          imageRecord.iconid = 0;

          // Handle icon IDs in newer file versions
          if (resultObject.PVersion >= ShapeUtil.SDF_PVERSION838 &&
            codeData.codes[codeIndex].data.iconid) {
            imageRecord.iconid = codeData.codes[codeIndex].data.iconid;
          }
          break;

        case opCodes.cDrawPng:
        case opCodes.cDrawJpg:
        case opCodes.cDrawMeta:
          // Image data (handled elsewhere)
          break;

        case opCodes.oTextureList:
          // Process texture list
          codeIndex = ShapeUtil.ReadTextureList(codeData, codeIndex, resultObject, opCodes, false);
          break;

        case opCodes.cDeftxScale:
        case opCodes.cDefLbtxScale:
        case opCodes.cDefSbtxScale:
          // Texture scale settings (handled elsewhere)
          break;

        default:
          // Handle nested structures by recursively reading frames
          if (codeData.codes[codeIndex].code & ShapeUtil.SDF_BEGIN) {
            codeIndex = ShapeUtil.ReadFrame(
              codeData,
              codeIndex,
              (codeData.codes[codeIndex].code & ShapeUtil.SDF_MASK) | ShapeUtil.SDF_END
            );
          }
      }
      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Converts Windows text justification constants to JavaScript/CSS alignment format
   *
   * This function translates numeric Windows justification codes to corresponding
   * CSS-style alignment strings for both horizontal and vertical text alignment.
   *
   * @param winJustification - The Windows justification constant (0=left/top, 2=right, 6=center/middle, 8=bottom)
   * @param isVertical - Flag indicating whether to return vertical alignment values (true) or horizontal (false)
   * @returns Text alignment value in CSS format ('left', 'right', 'center', 'top', 'middle', 'bottom')
   */
  static W32JustToJS(winJustification, isVertical) {
    let alignment = 'center';

    switch (winJustification) {
      case 0:
        alignment = isVertical ? 'top' : 'left';
        break;
      case 2:
        alignment = 'right';
        break;
      case 6:
        alignment = isVertical ? 'middle' : 'center';
        break;
      case 8:
        alignment = 'bottom';
    }

    return alignment;
  }

  /**
   * Converts Windows text justification values to internal text alignment constants
   *
   * This function maps horizontal and vertical text justification values from Windows format
   * to the application's internal TextAlign constants. It handles nine possible combinations:
   * top-left, top-center, top-right, middle-left, middle-center, middle-right,
   * bottom-left, bottom-center, and bottom-right.
   *
   * @param horizontalAlignment - The horizontal alignment value from Windows (Left, Right, etc.)
   * @param verticalAlignment - The vertical alignment value from Windows (Top, Bottom, etc.)
   * @returns A combined text alignment constant from TextConstant.TextAlign
   */
  static W32JustToTextAlign(horizontalAlignment, verticalAlignment) {
    let textAlignment = TextConstant.TextAlign.Center;

    switch (verticalAlignment) {
      case TextConstant.TextJust.Top:
        // Handle top alignment combined with horizontal alignment
        switch (horizontalAlignment) {
          case TextConstant.TextJust.Left:
            textAlignment = TextConstant.TextAlign.TopLeft;
            break;
          case TextConstant.TextJust.Right:
            textAlignment = TextConstant.TextAlign.TopRight;
            break;
          default:
            textAlignment = TextConstant.TextAlign.TopCenter;
        }
        break;

      case TextConstant.TextJust.Bottom:
        // Handle bottom alignment combined with horizontal alignment
        switch (horizontalAlignment) {
          case TextConstant.TextJust.Left:
            textAlignment = TextConstant.TextAlign.BottomLeft;
            break;
          case TextConstant.TextJust.Right:
            textAlignment = TextConstant.TextAlign.BottomRight;
            break;
          default:
            textAlignment = TextConstant.TextAlign.BottomCenter;
        }
        break;

      default:
        // Handle middle vertical alignment (default) with horizontal alignment
        switch (horizontalAlignment) {
          case TextConstant.TextJust.Left:
            textAlignment = TextConstant.TextAlign.Left;
            break;
          case TextConstant.TextJust.Right:
            textAlignment = TextConstant.TextAlign.Right;
            break;
          default:
            textAlignment = TextConstant.TextAlign.Center;
        }
    }

    return textAlignment;
  }

  /**
   * Reads drawing session data from a source object and populates the destination session object with properly scaled values
   *
   * This function translates drawing session information from source data format to the application's internal format,
   * handling coordinate scaling, text alignment, arrow properties, and various drawing preferences.
   *
   * @param sessionObject - The destination session object to be populated with drawing settings
   * @param layerManager - The layer manager object that manages drawing layers
   * @param sourceData - The source data containing drawing session information
   * @param resultObject - Object containing scaling factors and processing settings
   * @returns The populated session object with all properties set
   */
  static ReadDrawSession(sessionObject, layerManager, sourceData, resultObject) {
    // Handle displacement and dimensions, preferring "l" prefixed properties if available
    const displacement = sourceData.ldupdisp ? sourceData.ldupdisp : sourceData.dupdisp;
    const dimensions = sourceData.ldim ? sourceData.ldim : sourceData.dim;

    // Set dimensions with minimum defaults
    sessionObject.dim.x = ShapeUtil.ToSDJSCoords(dimensions.x, resultObject.coordScaleFactor);
    sessionObject.dim.y = ShapeUtil.ToSDJSCoords(dimensions.y, resultObject.coordScaleFactor);
    if (sessionObject.dim.x <= 0) {
      sessionObject.dim.x = 400;
    }
    if (sessionObject.dim.y <= 0) {
      sessionObject.dim.y = 400;
    }

    // Initialize comment IDs
    sessionObject.CommentListID = -1;
    sessionObject.CommentID = -1;

    // Copy basic properties
    sessionObject.flags = sourceData.flags;
    sessionObject.tselect = sourceData.tselect;

    // Set duplication displacement
    sessionObject.dupdisp.x = ShapeUtil.ToSDJSCoords(displacement.x, resultObject.coordScaleFactor);
    sessionObject.dupdisp.y = ShapeUtil.ToSDJSCoords(displacement.y, resultObject.coordScaleFactor);

    // Process arrow properties
    sessionObject.d_sarrow = sourceData.d_sarrow & DSConstant.ArrowMasks.ARROW_T_MASK;
    sessionObject.d_sarrowdisp = !!(sourceData.d_sarrow & DSConstant.ArrowMasks.ARROW_DISP);
    sessionObject.d_arrowsize = sourceData.d_arrowsize;
    sessionObject.d_earrow = sourceData.d_earrow & DSConstant.ArrowMasks.ARROW_T_MASK;
    sessionObject.d_earrowdisp = !!(sourceData.d_earrow & DSConstant.ArrowMasks.ARROW_DISP);

    // Set text justification/alignment
    sessionObject.def.just = ShapeUtil.W32JustToJS(sourceData.just, false);
    sessionObject.def.vjust = ShapeUtil.W32JustToJS(sourceData.vjust, true);

    // Set snap alignment
    sessionObject.centersnapalign = sourceData.snapalign ? true : false;

    // Set hop style and dimensions for line crossing
    sessionObject.hopstyle = sourceData.hopstyle;
    sessionObject.hopdim.x = ShapeUtil.ToSDJSCoords(sourceData.hopdim.x, resultObject.coordScaleFactor);
    sessionObject.hopdim.y = ShapeUtil.ToSDJSCoords(sourceData.hopdim.y, resultObject.coordScaleFactor);

    // Set dimension flags
    sessionObject.dimensions = sourceData.dimensions;
    sessionObject.shapedimensions = sourceData.shapedimensions;

    // Set active layer
    layerManager.activelayer = sourceData.activelayer;

    // Set default flags and text margins
    sessionObject.def.flags = sourceData.defflags;
    sessionObject.def.tmargins.left = ShapeUtil.ToSDJSCoords(sourceData.tmargins.left, resultObject.coordScaleFactor);
    sessionObject.def.tmargins.top = ShapeUtil.ToSDJSCoords(sourceData.tmargins.top, resultObject.coordScaleFactor);
    sessionObject.def.tmargins.right = ShapeUtil.ToSDJSCoords(sourceData.tmargins.right, resultObject.coordScaleFactor);
    sessionObject.def.tmargins.bottom = ShapeUtil.ToSDJSCoords(sourceData.tmargins.bottom, resultObject.coordScaleFactor);

    // Set text properties
    sessionObject.def.textgrow = sourceData.textgrow;
    sessionObject.def.textflags = sourceData.textflags;
    sessionObject.def.fsize_min = sourceData.fsize_min;
    sessionObject.def.lastcommand = sourceData.lastcommand;

    // Set array dimensions if available
    if (sourceData.h_arraywidth) {
      sessionObject.def.h_arraywidth = ShapeUtil.ToSDJSCoords(sourceData.h_arraywidth, resultObject.coordScaleFactor);
      sessionObject.def.v_arraywidth = ShapeUtil.ToSDJSCoords(sourceData.v_arraywidth, resultObject.coordScaleFactor);
    }

    if (sourceData.arrayht) {
      sessionObject.def.arraywd = ShapeUtil.ToSDJSCoords(sourceData.arraywd, resultObject.coordScaleFactor);
      sessionObject.def.arrayht = ShapeUtil.ToSDJSCoords(sourceData.arrayht, resultObject.coordScaleFactor);
    }

    // Set optional flags if available
    if (sourceData.sequenceflags) {
      sessionObject.sequenceflags = sourceData.sequenceflags;
    }

    if (sourceData.chartdirection) {
      sessionObject.chartdirection = sourceData.chartdirection;
    }

    if (sourceData.copyPasteTrialVers) {
      sessionObject.copyPasteTrialVers = sourceData.copyPasteTrialVers;
    }

    if (sourceData.taskmanagementflags) {
      sessionObject.taskmanagementflags = sourceData.taskmanagementflags;
    }

    if (sourceData.taskdays) {
      sessionObject.taskdays = sourceData.taskdays;
    }

    // Set more flags with defaults
    sessionObject.moreflags = sourceData.moreflags ? sourceData.moreflags : 0;
    // sessionObject.moreflags = Utils2.SetFlag(
    //   sessionObject.moreflags,
    //   NvConstant.SessionMoreFlags.SEDSM_Swimlane_Rows,
    //   true
    // );
    // sessionObject.moreflags = Utils2.SetFlag(
    //   sessionObject.moreflags,
    //   NvConstant.SessionMoreFlags.SwimlaneCols,
    //   true
    // );

    // Set field mask
    sessionObject.fieldmask = sourceData.fieldmask ? sourceData.fieldmask : 0;

    // Set wall thickness for architectural drawings
    sessionObject.def.wallThickness = sourceData.wallThickness ? sourceData.wallThickness : 0;

    // Set curve parameters for rounded shapes
    sessionObject.def.curveparam = (sourceData.curveparam != null) ? sourceData.curveparam : 0;
    sessionObject.def.rrectparam = (sourceData.rrectparam != null) ? sourceData.rrectparam : OptConstant.Common.DefFixedRRect;

    return sessionObject;
  }

  /**
   * Sets default style properties for drawing objects in a session
   *
   * This function configures default values for borders, lines, fills, and text styles
   * that will be used when creating new objects in the drawing session.
   *
   * @param session - The drawing session containing default style definitions
   * @param defaults - The object to be populated with default values
   */
  static SetDefaults(session, defaults) {
    // Set border defaults
    defaults.DefBorder.bord = session.def.style.Border.Thickness;
    defaults.DefBorder.color = session.def.style.Border.Paint.Color;
    defaults.DefBorder.patindex = 0;

    // Set line defaults
    defaults.DefLine.bord = session.def.style.Line.Thickness;
    defaults.DefLine.color = session.def.style.Line.Paint.Color;
    defaults.DefLine.patindex = 0;
    defaults.DefLine.arrowsize = 0;
    defaults.DefLine.sarrow = 0;
    defaults.DefLine.earrow = 0;

    // Set fill defaults
    defaults.DefFill.Hatch = 0;
    defaults.DefFill.color = session.def.style.Fill.Paint.Color;
    defaults.DefFill.ecolor = session.def.style.Fill.Paint.EndColor;
    defaults.DefFill.gradientflags = session.def.style.Fill.Paint.GradientFlags;

    // Set text defaults
    ShapeUtil.DefaultText(session, defaults);
  }

  /**
   * Sets default text properties for drawing objects
   *
   * This function configures default values for text formatting including
   * font, size, alignment, indentation, and other text styling properties.
   *
   * @param session - The drawing session containing default text style definitions (can be null)
   * @param defaults - The object to be populated with default text values
   */
  static DefaultText(session, defaults) {
    if (session) {
      // Copy values from the session
      defaults.DefFont = $.extend(true, {}, session.def.lf);
      defaults.SDF_DefFSize = session.def.style.Text.FontSize;
      defaults.DefRun.fontrec = $.extend(true, {}, session.def.lf);
      defaults.DefRun.fontrec.fontSize = session.def.style.Text.FontSize;
      defaults.DefRun.fontrec.face = session.def.style.Text.Face;
      defaults.DefRun.paint = $.extend(true, {}, session.def.style.Text.Paint);
    } else {
      // Create new default objects
      defaults.DefRun.fontrec = new FontRecord();
      defaults.DefFont = new FontRecord();
      defaults.DefRun.paint = new PaintData(NvConstant.Colors.Black);
    }

    // Set text run properties
    defaults.DefRun.styleid = 0;
    defaults.DefRun.linkid = -1;
    defaults.DefRun.flags = 0;
    defaults.DefRun.orient = 0;
    defaults.DefRun.start = 0;
    defaults.DefRun.nchar = 0;
    defaults.DefRun.fonth = 0;
    defaults.DefRun.extra = 0;
    defaults.DefRun.hyph = 0;

    // Set text style properties
    defaults.DefTStyle.tracking = 0;
    defaults.DefTStyle.spacing = 0;
    defaults.DefTStyle.just = 'left';
    defaults.DefTStyle.leading = 0;
    defaults.DefTStyle.lindent = 0;
    defaults.DefTStyle.bindent = 20;
    defaults.DefTStyle.hyphen = 1;
    defaults.DefTStyle.rindent = 0;
    defaults.DefTStyle.pindent = 0;
    defaults.DefTStyle.tabspace = 6;
    defaults.DefTStyle.bullet = 'none';
  }

  /**
   * Reads ruler configuration data and populates a ruler config object
   *
   * This function processes ruler settings from a data source and sets up the
   * ruler configuration including units, scales, grid settings, and display options.
   *
   * @param rulerData - The source data containing ruler settings
   * @param resultObject - The result object containing the ruler configuration and scaling factors
   */
  static ReadRulers(rulerData, resultObject) {
    resultObject.rulerConfig = new RulerConfig();

    // Set basic ruler properties
    resultObject.rulerConfig.useInches = rulerData.inches;
    resultObject.rulerConfig.major = ShapeUtil.ToSDJSCoords(rulerData.Major, resultObject.coordScaleFactor);

    // Handle version-specific scaling
    if (resultObject.PVersion < ShapeUtil.SDF_POVERSION801) {
      resultObject.rulerConfig.major *= 6;
    }

    // Set ruler scale and units
    resultObject.rulerConfig.majorScale = rulerData.MajorScale;
    resultObject.rulerConfig.units = rulerData.units;

    // Set tick marks and grid settings
    resultObject.rulerConfig.nTics = rulerData.MinorDenom;
    resultObject.rulerConfig.nMid = rulerData.MinorDenom != 5 ? 1 : 0;
    resultObject.rulerConfig.nGrid = rulerData.MinorDenom;

    // Set decimal places if provided
    if (rulerData.dp != null) {
      resultObject.rulerConfig.dp = rulerData.dp;
    }

    // Set ruler origin
    if (rulerData.originx != null) {
      resultObject.rulerConfig.originx = rulerData.originx;
      resultObject.rulerConfig.originy = rulerData.originy;
    } else {
      resultObject.rulerConfig.originx = 0;
      resultObject.rulerConfig.originy = 0;
    }

    // Set visibility options
    resultObject.rulerConfig.showpixels = false;
    resultObject.rulerConfig.show = rulerData.show ? true : false;

    if (rulerData.showpixels) {
      resultObject.rulerConfig.showpixels = true;
    }

    // Set fractional denominator
    resultObject.rulerConfig.fractionaldenominator = rulerData.fractionaldenominator ||
      T3Gv.docUtil.rulerConfig.fractionaldenominator;
  }

  /**
   * Determines if an object is a group by examining its properties in the code structure
   *
   * This function analyzes the object data to determine if it represents a group,
   * checking for various indicators like group code lists, SVG fragments, and object class types.
   * It supports both synchronous checks and asynchronous validation.
   *
   * @param resultObject - Object containing processing results and state
   * @param codeData - The code data structure containing object information
   * @param codeIndex - The current position in the code structure
   * @param opCodes - Object containing operation code constants and references
   * @param endCodeMarker - The code that marks the end of the object definition
   * @returns True if the object is a group, false otherwise
   */
  static ObjectIsGroup(resultObject, codeData, codeIndex, opCodes, endCodeMarker) {
    let hasMeta = false;
    let hashValue;
    let isGroup = false;

    // For async validation, check group code list directly
    if (resultObject.ValidateHashesAsync) {
      return !codeData.codes[codeIndex].data.HasSVG &&
        !codeData.codes[codeIndex].data.UsePNG &&
        !!codeData.codes[codeIndex].data.groupcodelist;
    }

    // If object class is directly defined, check if it's a group symbol
    if (codeData.codes[codeIndex].data.objclass) {
      return codeData.codes[codeIndex].data.objclass === NvConstant.ShapeClass.GroupSymbol;
    }

    // Search through object properties for group indicators
    codeIndex++;
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cTableVp:
        case opCodes.cTableId:
          // These indicate a different object type, not a group
          return isGroup;

        case opCodes.cEmfHash:
          // Store hash for enhanced metafile
          if (resultObject.AddEMFHash) {
            hashValue = codeData.codes[codeIndex].data.name;
          } else {
            hasMeta = true;
          }
          break;

        case opCodes.cNativeStorage:
          // Native storage indicates a group, unless it has metadata
          if (hasMeta) return false;
          if (!resultObject.AddEMFHash) return true;
          isGroup = true;
          break;

        case opCodes.cNativeId:
          // If there's a native ID without metadata, it's a group
          return !hasMeta;

        case opCodes.cDrawMeta:
          // Process drawing metadata
          if (resultObject.AddEMFHash && !hasMeta) {
            if (hashValue === undefined) {
              hashValue = resultObject.gHash.GetHash(codeData.codes[codeIndex].data.BlobBytes);
            }

            // Check if hash exists in content system
            const foundHash = null != SDUI.CMSContent.GetSymbolSVGByHash(SDUI.AppSettings.ContentSource, hashValue);

            if (hasMeta) {
              codeData.codes[codeIndex].data.EMFHash = hashValue;
              return false;
            }
          }
          break;
      }
      codeIndex++;
    }

    return isGroup;
  }

  /**
   * Determines if an object is a symbol by examining its properties in the code structure
   *
   * This function analyzes the object data to determine if it represents a symbol,
   * checking for SVG fragments, EMF hashes, and other symbol indicators.
   * It supports both synchronous checks and asynchronous validation.
   *
   * @param resultObject - Object containing processing results and state
   * @param codeData - The code data structure containing object information
   * @param codeIndex - The current position in the code structure
   * @param opCodes - Object containing operation code constants and references
   * @param endCodeMarker - The code that marks the end of the object definition
   * @returns True if the object is a symbol, false otherwise
   */
  static ObjectIsSymbol(resultObject, codeData, codeIndex, opCodes, endCodeMarker) {
    // For async validation, check for color SVG directly
    if (resultObject.ValidateHashesAsync) {
      return !!codeData.codes[codeIndex].data.HasColorSVG;
    }

    // If object class is directly defined, check if it's an SVG fragment symbol
    if (codeData.codes[codeIndex].data.objclass) {
      return codeData.codes[codeIndex].data.objclass === NvConstant.ShapeClass.SvgFragmentSymbol;
    }

    // Move past initial code
    codeIndex++;

    // Search through object properties for symbol indicators
    let hasMeta = false;
    let hashValue;
    let isSymbol = false;

    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cSvgFragmentId:
          // SVG fragment ID indicates it's a symbol
          isSymbol = true;
          break;

        case opCodes.cEmfHash:
          // EMF hash handling
          if (resultObject.AddEMFHash) {
            hashValue = codeData.codes[codeIndex].data.name;
          } else {
            hasMeta = true;
          }
          isSymbol = true;
          break;

        case opCodes.cDrawMeta:
          // Process drawing metadata
          if (resultObject.AddEMFHash && !hasMeta) {
            if (hashValue === undefined) {
              hashValue = resultObject.gHash.GetHash(codeData.codes[codeIndex].data.BlobBytes);
            }

            // Check if hash exists in content system
            hasMeta = null != SDUI.CMSContent.GetSymbolSVGColorByHash(SDUI.AppSettings.ContentSource, hashValue);

            if (hasMeta) {
              isSymbol = true;
            }
          }
        /* falls through */
        case opCodes.cNativeStorage:
        case opCodes.cNativeId:
          return !!isSymbol;
      }
      codeIndex++;
    }

    return false;
  }

  /**
   * Determines if an object is a text label connected to a connector object
   *
   * This function examines the object structure to identify if it's a text label
   * specifically attached to a connector object, checking for hook points and text content.
   *
   * @param codeData - The code data structure containing object information
   * @param codeIndex - The current position in the code structure
   * @param opCodes - Object containing operation code constants and references
   * @param endCodeMarker - The code that marks the end of the object definition
   * @returns True if the object is a connector text label, false otherwise
   */
  static ObjectIsConnectorTextLabel(codeData, codeIndex, opCodes, endCodeMarker) {
    const objectData = codeData.codes[codeIndex].data;
    codeIndex++;

    let hookData;
    let associatedObjectId;
    let hasHook = false;
    let hasText = false;

    // Search through object properties for connector text label indicators
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cDrawHook:
          // Check if the hook point is at the bottom (connecty = 1)
          hookData = codeData.codes[codeIndex].data;
          if (hookData.connecty === 1) {
            hasHook = true;
            associatedObjectId = hookData.objid;
          }
          break;

        case opCodes.cLongText8:
        case opCodes.cLongText:
          // Indicates this object has text content
          hasText = true;
          break;
      }

      codeIndex++;

      // Exit early if we've found text
      if (hasText) break;
    }

    // If both conditions are met, set association flags
    if (hasHook && hasText) {
      objectData.associd = associatedObjectId;
      objectData.flags = Utils2.SetFlag(objectData.flags, NvConstant.ObjFlags.Assoc, true);
    }

    return hasHook && hasText;
  }

  /**
   * Determines if an object is an external text label connected to another object
   *
   * This function examines the object structure to identify if it's a standalone text label
   * that is associated with another object through hook points. It checks various
   * connection points and text content to make the determination.
   *
   * @param codeData - The code data structure containing object information
   * @param codeIndex - The current position in the code structure
   * @param opCodes - Object containing operation code constants and references
   * @param endCodeMarker - The code that marks the end of the object definition
   * @param resultObject - Object containing processing results and state
   * @returns True if the object is an external text label, false otherwise
   */
  static ObjectIsExternalTextLabel(codeData, codeIndex, opCodes, endCodeMarker, resultObject) {
    const objectData = codeData.codes[codeIndex].data;
    const coordinateDimension = OptConstant.Common.DimMax;

    codeIndex++;

    let hookData;
    let isVisioCallout = false;
    let hasValidHook = false;
    let hasText = false;

    // Search through object properties for external text label indicators
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cDrawHook:
          hookData = codeData.codes[codeIndex].data;

          // Check if this is a Visio callout
          if (objectData.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioCallOut) {
            isVisioCallout = true;
          }

          // Check for specific attachment point (tied directly)
          if (hookData.hookpt === OptConstant.HookPts.KATD) {
            hasValidHook = true;

            // If not a Visio callout, perform additional check
            if (!isVisioCallout) {
              const targetObject = DataUtil.GetObjectPtr(
                resultObject.IDMap[hookData.objid],
                false
              );

              // If the target is a line, this isn't an external text label
              if (targetObject &&
                targetObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
                return false;
              }
            }
          }
          // Check for corner connection points
          else if (hookData.connecty === 0 && hookData.connectx === 0) {
            if (hookData.hookpt === OptConstant.HookPts.KCR ||
              hookData.hookpt === OptConstant.HookPts.KCB ||
              isVisioCallout) {
              hasValidHook = true;
              hasText = true;
            }
          }
          // Check for opposite corner connection points
          else if (hookData.connecty === coordinateDimension &&
            hookData.connectx === coordinateDimension) {
            if (hookData.hookpt === OptConstant.HookPts.KCL ||
              hookData.hookpt === OptConstant.HookPts.KCT ||
              isVisioCallout) {
              hasValidHook = true;
              hasText = true;
            }
          }
          break;

        case opCodes.cDrawText:
          // Check for text ID reference
          if (codeData.codes[codeIndex].data.textid >= 0) {
            hasText = true;
          }
          break;

        case opCodes.cLongText8:
        case opCodes.cLongText:
          // Indicates this object has text content
          hasText = true;
          break;
      }

      codeIndex++;

      // Exit early if we've found text
      if (hasText) break;
    }

    return hasValidHook && hasText;
  }

  /**
   * Reads arrow properties from a source object and applies them to a drawing object
   *
   * This function processes arrow head definitions for lines and connectors, assigning the
   * appropriate arrow types, display flags, and size settings. It handles special cases like
   * arrow reversal for segmented lines, and ensures arrow ID values are within valid ranges.
   *
   * @param drawingObject - The drawing object to apply arrow properties to
   * @param arrowData - The source data containing arrow properties
   * @returns 0 if successful
   */
  static ReadArrow(drawingObject, arrowData) {
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line ||
      drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {

      let tempArrowId, tempArrowDisp;
      const arrowTableLength = T3Gv.ArrowheadLookupTable.length;

      // Process start arrow properties
      drawingObject.StartArrowID = arrowData.sarrow & DSConstant.ArrowMasks.ARROW_T_MASK;
      drawingObject.StartArrowDisp = !!(arrowData.sarrow & DSConstant.ArrowMasks.ARROW_DISP);

      // Reset invalid arrow IDs to default (0)
      if (drawingObject.StartArrowID === 24 || drawingObject.StartArrowID >= arrowTableLength) {
        drawingObject.StartArrowID = 0;
        drawingObject.StartArrowDisp = false;
      }

      // Process end arrow properties
      drawingObject.EndArrowID = arrowData.earrow & DSConstant.ArrowMasks.ARROW_T_MASK;
      drawingObject.EndArrowDisp = !!(arrowData.earrow & DSConstant.ArrowMasks.ARROW_DISP);

      // Reset invalid arrow IDs to default (0)
      if (drawingObject.EndArrowID === 24 || drawingObject.EndArrowID >= arrowTableLength) {
        drawingObject.EndArrowID = 0;
        drawingObject.EndArrowDisp = false;
      }

      // Swap start and end arrows if segmented line has reverse arrows flag set
      if (drawingObject.segl && drawingObject.segl.reversearrows) {
        tempArrowId = drawingObject.EndArrowID;
        tempArrowDisp = drawingObject.EndArrowDisp;
        drawingObject.EndArrowID = drawingObject.StartArrowID;
        drawingObject.EndArrowDisp = drawingObject.StartArrowDisp;
        drawingObject.StartArrowID = tempArrowId;
        drawingObject.StartArrowDisp = tempArrowDisp;
      }

      // Set arrow size index
      drawingObject.ArrowSizeIndex = arrowData.arrowsize;
      return 0;
    }
    return 0;
  }

  /**
   * Creates a line object based on configuration parameters
   *
   * This function creates the appropriate type of line object (straight line, diagonal line,
   * or arc line) based on input configuration. It handles coordinate calculation with proper
   * scaling, sets start and end points, and applies special properties like curve adjustments
   * for arc lines. The function supports different line orientations (horizontal, vertical, diagonal)
   * and properly processes group offsets.
   *
   * @param configObject - Configuration object containing frame dimensions and other properties
   * @param sourceData - Source data containing line class, fixed point, and other line specifications
   * @param resultObject - Object containing coordinate scale factors and group offsets
   * @returns A line object of the appropriate type based on the configuration
   */
  static CreateLineObject(configObject, sourceData, resultObject) {
    let lineObject;
    let fixedPoint;

    // Initialize start and end points
    configObject.StartPoint = {};
    configObject.EndPoint = {};

    // Get fixed point with proper scaling, using long format if available
    fixedPoint = sourceData.lfixedpoint
      ? ShapeUtil.ToSDJSCoords(sourceData.lfixedpoint, resultObject.coordScaleFactor)
      : ShapeUtil.ToSDJSCoords(sourceData.fixedpoint, resultObject.coordScaleFactor);

    // Set coordinates based on line class (horizontal, diagonal, or vertical)
    switch (sourceData.dataclass) {
      case OptConstant.LineSubclass.LCH:  // Horizontal line
        // Adjust for group offset if present
        if (resultObject.GroupOffset.y) {
          fixedPoint += resultObject.GroupOffset.y;
        }
        // Set start and end points for horizontal line
        configObject.StartPoint.x = configObject.Frame.x;
        configObject.StartPoint.y = fixedPoint;
        configObject.EndPoint.x = configObject.Frame.x + configObject.Frame.width;
        configObject.EndPoint.y = fixedPoint;
        break;

      case OptConstant.LineSubclass.LCD:  // Diagonal line
        if (sourceData.flags & NvConstant.ObjFlags.Obj1) {
          // Bottom-left to top-right diagonal
          configObject.StartPoint.x = configObject.Frame.x;
          configObject.StartPoint.y = configObject.Frame.y + configObject.Frame.height;
          configObject.EndPoint.x = configObject.Frame.x + configObject.Frame.width;
          configObject.EndPoint.y = configObject.Frame.y;
          // Clear the flag after processing
          sourceData.flags = Utils2.SetFlag(sourceData.flags, NvConstant.ObjFlags.Obj1, false);
        } else {
          // Top-left to bottom-right diagonal
          configObject.StartPoint.x = configObject.Frame.x;
          configObject.StartPoint.y = configObject.Frame.y;
          configObject.EndPoint.x = configObject.Frame.x + configObject.Frame.width;
          configObject.EndPoint.y = configObject.Frame.y + configObject.Frame.height;
        }
        break;

      case OptConstant.LineSubclass.LCV:  // Vertical line
        // Adjust for group offset if present
        if (resultObject.GroupOffset.x) {
          fixedPoint += resultObject.GroupOffset.x;
        }
        // Set start and end points for vertical line
        configObject.StartPoint.y = configObject.Frame.y;
        configObject.StartPoint.x = fixedPoint;
        configObject.EndPoint.y = configObject.Frame.y + configObject.Frame.height;
        configObject.EndPoint.x = fixedPoint;
        break;
    }

    // Create appropriate line object based on line type (straight or arc)
    switch (sourceData.ShortRef) {
      case OptConstant.LineTypes.LsNone:
      case OptConstant.LineTypes.LsComm:
      case OptConstant.LineTypes.LsDigi:
      case OptConstant.LineTypes.LsWall:
      case OptConstant.LineTypes.LsMeasuringTape:
        // Standard line types
        configObject.ShortRef = sourceData.ShortRef;
        lineObject = new Instance.Shape.Line(configObject);
        break;

      case OptConstant.LineTypes.LsChord:
        // Arc line with curve adjustment
        configObject.CurveAdjust = ShapeUtil.ToSDJSCoords(configObject.shapeparam, resultObject.coordScaleFactor);

        // Invert curve adjustment for vertical lines
        if (sourceData.dataclass === OptConstant.LineSubclass.LCV) {
          configObject.CurveAdjust = -configObject.CurveAdjust;
        }

        // Handle reversed arcs
        if (configObject.CurveAdjust < 0) {
          configObject.IsReversed = true;
          configObject.CurveAdjust = -configObject.CurveAdjust;
        }

        lineObject = new Instance.Shape.ArcLine(configObject);
        break;
    }

    return lineObject;
  }

  static ReadObject(e, t, a, r, i) {
    var n,
      o,
      s,
      l,
      S,
      c,
      u,
      p,
      d,
      D,
      g,
      h,
      m,
      C,
      y,
      f,
      L,
      I,
      T,
      b,
      M,
      P,
      R,
      A = !1,
      _ = !0,
      E = !1,
      w = a.sdp,
      F = a.tLMB,
      v = !1,
      G = !1;
    if (
      a.ValidateHashesAsync &&
      (
        e.codes[t].data.UsePNG &&
        (A = !0),
        e.codes[t].data.HasSVG ||
        (_ = !1),
        u = e.codes[t].data.EMFHash
      ),
      e.codes[t].data.objclass === NvConstant.ShapeClass.MissingMf &&
      (E = !0),
      o = ShapeUtil.ObjectIsGroup(a, e, t, r, i),
      p = (
        e.codes[t].data.colorfilter & StyleConstant.ColorFilters.NCAll
      ) === StyleConstant.ColorFilters.NCAll,
      o ||
      p ||
      A ||
      (d = ShapeUtil.ObjectIsSymbol(a, e, t, r, i)),
      e.codes[t].data.otype === ShapeConstant.ObjectTypes.Shape &&
      (
        0 == (
          e.codes[t].data.moreflags & OptConstant.ObjMoreFlags.ContainerChild
        ) &&
        ShapeUtil.ObjectIsConnectorTextLabel(e, t, r, i) ||
        (
          e.codes[t].data.objecttype === NvConstant.FNObjectTypes.NgEventLabel ||
            e.codes[t].data.objecttype === NvConstant.FNObjectTypes.Multiplicity /*||
            e.codes[t].data.objecttype === NvConstant.FNObjectTypes.SD_OBJT_MANUAL_EVENT_LABEL*/ ? m = !0 : (m = ShapeUtil.ObjectIsExternalTextLabel(e, t, r, i, a)) &&
            0 === e.codes[t].data.objecttype
          /*&&
          (
            e.codes[t].data.objecttype = NvConstant.FNObjectTypes.SD_OBJT_MANUAL_EVENT_LABEL
          )*/
        )
      ),
      !(
        n = ShapeUtil.ReadObjectHeader(
          w,
          F,
          e.codes[t].data,
          a,
          o,
          d,
          m,
          i != DSConstant.OpNameCode.cDrawObjEnd
        )
      )
    ) {
      for (

        SDUI.Builder.gInTemplateValidator &&
        SDUI.Builder.gTemplateValidatorReadError(
          'static      ReadObject static      ReadObjectHeader returned a null obj'
        );
        e.codes[++t].code != i;
      );
      return t
    }
    if (a.LineTextObject) {
      if (a.textonline < 0) return - 1;
      a.objectcount = e.codes[t].data.uniqueid,
        a.IDMap[e.codes[t].data.uniqueid] = - 2,
        a.LineTextObject = !1
    } else {
      if (!a.ReadBlocks || a.BlockzList.indexOf(n.UniqueID) >= 0) {
        var N = T3Gv.stdObj.CreateBlock(StateConstant.StoredObjectType.BaseDrawObject, n);
        n = N.Data,
          a.zList.push(N.ID),
          a.objectcount = n.UniqueID,
          a.IDMap[n.UniqueID] = N.ID
      }
      n.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
        (
          b = {},
          (c = ShapeUtil.GetLineText(a, a.objectcount, null, b)) >= 0 &&
          (
            n.DataID = c,
            a.IsVisio &&
            (n.TextAlign = b.TextAlign, n.just = b.just, n.vjust = b.vjust),
            b.TextGrow === NvConstant.TextGrowBehavior.Vertical &&
            (n.TextGrow = b.TextGrow, n.TextWrapWidth = b.TextWrapWidth),
            b.Paint &&
            (n.StyleRecord.Fill.Paint = b.Paint)
          )
        )
    }
    for (t++, n && u && (n.EMFHash = u); e.codes[t].code != i;) {
      switch (e.codes[t].code) {
        case r.SDF_C_SDDATABLOCK:
        case r.cSdData64:
          break;
        case r.cDrawSegl:
          if (ShapeUtil.ReadSegl(n, e.codes[t].data, a)) return - 1;
          break;
        case r.cDrawPoly:
          if ((t = ShapeUtil.ReadPolyLine(n, e, t, a, r)) < 0) return t;
          break;
        case r.cFreeHandLine:
          if (ShapeUtil.ReadFreehand(n, e.codes[t].data, a)) return - 1;
          break;
        case r.cDrawArray:
          if ((t = ShapeUtil.ReadArrayList(n, e, t, a, r)) < 0) return t;
          break;
        case r.cDrawContainer:
          if ((t = ShapeUtil.ReadContainerList(n, e, t, a, r)) < 0) return t;
          break;
        case r.cDrawHook:
          ShapeUtil.ReadHook(n, e.codes[t].data, a);
          break;
        case r.cBeginStyle:
          t = ShapeUtil.ReadStyle(n.StyleRecord, e, t, a, r);
          break;
        case r.cBeginLine:
          t = ShapeUtil.ReadSDLine(n.StyleRecord.Line, e, t, a, r);
          break;
        case r.cBeginFill:
          t = ShapeUtil.ReadSDFill(n.StyleRecord.Fill, e, t, a, r);
          break;
        case r.cBeginTextf:
          t = ShapeUtil.ReadSDTxf(n.StyleRecord.Text, e, t, a, r);
          break;
        case r.cOutSide:
          n.StyleRecord.OutsideEffect = ShapeUtil.ReadOutSide(e.codes[t].data, a.IsVisio);
          break;
        case r.cDrawArrow:
          if (a.error = ShapeUtil.ReadArrow(n, e.codes[t].data), a.error) return - 1;
          break;
        case r.cConnectPoint:
          ShapeUtil.ReadConnectPoints(n, e.codes[t].data);
          break;
        case r.cDrawText:
          ShapeUtil.ReadTextParams(n, e.codes[t].data, a),
            n.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Line &&
            n.DrawingObjectBaseClass !== OptConstant.DrawObjectBaseClass.Connector ||
            (
              n.TextDirection = 0 == (n.TextFlags & NvConstant.TextFlags.HorizText),
              b &&
              b.TextGrow &&
              (n.TextGrow = b.TextGrow, n.TextWrapWidth = b.TextWrapWidth)
            );
          break;
        case r.cLongText8:
        case r.cLongText:
        case r.cText:
          if (a.textonline >= 0) if (a.textonline < a.objectcount) {
            if ((S = a.IDMap[a.textonline]) >= 0) if (
              (l = DataUtil.GetObjectPtr(S, !1)) &&
              l.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector
            ) l = n;
            else {
              if (
                l &&
                l.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line
              ) {
                if (
                  a.IsVisio &&
                  (
                    l.vjust = n.vjust,
                    l.just = n.just,
                    l.TextAlign = n.TextAlign,
                    0 == (
                      n.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioDefaultText
                    ) &&
                    l.CalcTextPosition(n)
                  ),
                  l.StyleRecord.Fill.Paint = $.extend(!0, {
                  }, n.StyleRecord.Fill.Paint),
                  l.TextDirection = 0 == (l.TextFlags & NvConstant.TextFlags.HorizText),
                  a.IsVisio &&
                  l.TextDirection
                ) {
                  var k = l.GetAngle(null);
                  l.LineType === OptConstant.LineType.LINE ? (
                    l.VisioRotationDiff = n.RotationAngle,
                    n.RotationAngle = k + l.VisioRotationDiff
                  ) : l.VisioRotationDiff = k - n.RotationAngle,
                    0 != n.RotationAngle ||
                    Utils2.IsEqual(k, 0) ||
                    (
                      l.TextFlags = Utils2.SetFlag(l.TextFlags, NvConstant.TextFlags.HorizText, !0),
                      l.TextDirection = !1
                    ),
                    l.VisioRotationDiff %= 180,
                    Math.abs(l.VisioRotationDiff) < 1 &&
                    (l.VisioRotationDiff = 0)
                }
                if (n.TextGrow === NvConstant.TextGrowBehavior.Vertical) if (l.LineTextX) l.TextGrow = NvConstant.TextGrowBehavior.Vertical,
                  l.trect = $.extend(!0, {
                  }, n.trect);
                else {
                  l.TextGrow = NvConstant.TextGrowBehavior.Vertical,
                    l.TextWrapWidth = n.trect.width,
                    M = l.Frame.width,
                    P = l.Frame.height;
                  var U = Utils2.sqrt(M * M + P * P) - 40;
                  U < OptConstant.Common.MinDim &&
                    (U = OptConstant.Common.MinDim),
                    l.TextWrapWidth > U &&
                    (l.TextWrapWidth = U),
                    a.IsVisio &&
                    n.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioDefaultText &&
                    (l.TextWrapWidth = U)
                } else l.TextGrow = NvConstant.TextGrowBehavior.Horizontal
              }
              a.textonline = - 1
            }
          } else l = n;
          else l = n;
          t = ShapeUtil.ReadText(l, null, null, e, t, a, r, !1, r.cTextEnd),
            a.textonline >= 0 &&
            (
              a.lineswithtext.push({
                x: a.textonline,
                y: n.DataID,
                z: a.textonlineid,
                TextGrow: n.TextGrow,
                TextWrapWidth: n.trect.width,
                just: n.just,
                vjust: n.vjust,
                TextAlign: n.TextAlign,
                RotationAngle: n.RotationAngle,
                Paint: $.extend(!0, {
                }, n.StyleRecord.Fill.Paint)
              }),
              a.textonline = - 1,
              a.textonlineid = - 1
            ),
            n.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
            (
              n.TextFlags & NvConstant.TextFlags.AttachB &&
              (
                n.TextFlags = Utils2.SetFlag(n.TextFlags, NvConstant.TextFlags.AttachB, !1),
                n.TextFlags = Utils2.SetFlag(n.TextFlags, NvConstant.TextFlags.None, !0)
              ),
              n.TextFlags & NvConstant.TextFlags.AttachA &&
              (
                n.TextFlags = Utils2.SetFlag(n.TextFlags, NvConstant.TextFlags.AttachA, !1),
                n.TextFlags = Utils2.SetFlag(n.TextFlags, NvConstant.TextFlags.None, !0)
              )
            );
          break;
        case r.cNativeStorage:
          if (o) {
            if (ShapeUtil.ReadGroup(n, e.codes[t].data, a)) return - 1
          } else if (G) break;
          break;
        case r.cNativeId:
          (D = e.codes[t].data.nativeid) >= 0 &&
            (a.nativeids[D] = n.BlockID);
          break;
        case r.cTableId:
          (y = e.codes[t].data.value) >= 0 &&
            (
              n.TableID = a.tableids[y],
              a.usedtableids[y] = !0,
              null == n.TableID &&
              (n.TableID = - 1),
              n.TableID >= 0 &&
              (n.DataID = - 1)
            );
          break;
        case r.cGraphId:
          (f = e.codes[t].data.value) >= 0 &&
            (
              n.GraphID = a.graphids[f],
              a.usedgraphids[f] = !0,
              null == n.GraphID &&
              (n.GraphID = - 1),
              n.GraphID >= 0 &&
              (n.DataID = - 1)
            );
          break;
        case r.cExpandedViewId:
          (I = e.codes[t].data.value) >= 0 &&
            (
              n.ExpandedViewID = a.expandedviewids[I],
              a.expandedviewids[I] = !0,
              null == n.ExpandedViewID &&
              (n.ExpandedViewID = - 1)
            );
          break;
        case r.cGanttInfoId:
          (L = e.codes[t].data.value) >= 0 &&
            (
              n.GanttInfoID = a.ganttids[L],
              a.usedganttids[L] = !0,
              null == n.GanttInfoID &&
              (n.GanttInfoID = - 1),
              n.GanttInfoID >= 0 &&
              (n.DataID = - 1)
            );
          break;
        case r.cObjData:
          n.datasetType = e.codes[t].data.datasetType,
            n.datasetID = e.codes[t].data.datasetID,
            n.datasetTableID = e.codes[t].data.datasetTableID,
            n.datasetElemID = e.codes[t].data.datasetElemID,
            void 0 !== e.codes[t].data.fieldDataElemID ? (
              n.fieldDataElemID = e.codes[t].data.fieldDataElemID,
              n.fieldDataTableID = e.codes[t].data.fieldDataTableID,
              n.fieldDataDatasetID = e.codes[t].data.fieldDataDatasetID
            ) : n.datasetType == TODO.DataSetNameListIndexes.DATASET_FIELDEDDATA ? (
              n.fieldDataElemID = n.datasetElemID,
              n.fieldDataTableID = n.datasetTableID,
              n.fieldDataDatasetID = n.datasetID,
              n.datasetType = - 1,
              n.datasetID = - 1,
              n.datasetTableID = - 1,
              n.datasetElemID = - 1
            ) : (
              n.fieldDataElemID = - 1,
              n.fieldDataTableID = - 1,
              n.fieldDataDatasetID = - 1
            );
          break;
        case r.cDrawJump:
          n.HyperlinkText = e.codes[t].data.name;
          break;
        case r.cBusinessNameStr:
          n.BusinessName = e.codes[t].data.name;
          break;
        case r.cImageUrl:
          n.ImageURL = e.codes[t].data.name;
          break;
        case r.cDrawImage8:
          (s = new ImageRecord()).mr = e.codes[t].data.mr,
            s.croprect = e.codes[t].data.croprect,
            s.scale = e.codes[t].data.scale,
            s.imageflags = e.codes[t].data.imageflags,
            e.codes[t].data.iconid &&
            (s.iconid = e.codes[t].data.iconid),
            n.ImageHeader = s;
          break;
        case r.cOleHeader:
          (C = new TODO.OleHeader).dva = e.codes[t].data.dva,
            C.linked = e.codes[t].data.linked,
            C.scale = e.codes[t].data.scale,
            n.OleHeader = C;
          break;
        case r.cEmfId:
        case r.cImageId:
        case r.cOleStorageId:
          ShapeUtil.ReadImageID(n, null, e.codes[t].data, a, E);
          break;
        case r.cSvgFragmentId:
          n.SVGFragment = e.codes[t].data.name;
          break;
        case r.cSvgImageId:
          n.ImageID = e.codes[t].data.name,
            n.ImageDir = StyleConstant.Image_Dir.dir_svg,
            n.ImageURL = Constants.FilePath_SymbolSVG + n.ImageID + '.svg';
          break;
        case r.cEmfHash:
          n.EMFHash = e.codes[t].data.name,
            n.ShapeType === OptConstant.ShapeType.SVGFragmentSymbol &&
              null == n.SVGFragment ? ShapeUtil.GetSVGFragment(a, n, n.EMFHash) : (
              n.SymbolURL = Constants.FilePath_HashSVG + n.EMFHash,
              n.SymbolURL = n.SymbolURL + '.svg'
            );
          break;
        case r.cDrawJpg:
          n.ImageURL = e.codes[t].data.URL,
            n.SetBlobBytes(e.codes[t].data.BlobBytes, DSConstant.Image_Dir.dir_jpg);
          break;
        case r.cDrawPng:
        case r.cDrawPreviewPng:
          n.ImageURL = e.codes[t].data.URL,
            n.SetBlobBytes(e.codes[t].data.BlobBytes, DSConstant.Image_Dir.dir_png);
          break;
        case r.cOleStorage:
          n.SetOleBlobBytes(
            e.codes[t].data.BlobBytes,
            DSConstant.Image_Dir.dir_store
          );
          break;
        case r.cDrawSvg:
          n.ImageURL = e.codes[t].data.URL;
          var J = e.codes[t].data.BlobBytes;
          n.SetBlobBytes(J, DSConstant.Image_Dir.dir_svg),
            n.SVGDim = Utils2.ParseSVGDimensions(J);
          break;
        case r.cDrawMeta:
          if (!o) {
            if (!a.AddEMFHash || A || a.ValidateHashesAsync) A &&
              null == (T = n.EMFHash) &&
              (T = e.codes[t].data.EMFHash);
            else if (null == (T = n.EMFHash) && (T = e.codes[t].data.EMFHash), T) {
              Constants.FilePath_FindHashPNG;
              A = null != SDUI.CMSContent.GetSymbolPNGByHash(SDUI.AppSettings.ContentSource, T)
            }
            if (A && T) {
              n.ImageURL = Constants.FilePath_HashPNG + T + '.png',
                G = !0,
                ShapeUtil.GetPNG(a, n, T);
              break
            }
            null == n.EMFHash &&
              a.AddEMFHash &&
              e.codes[t].data.EMFHash &&
              (n.EMFHash = e.codes[t].data.EMFHash, v = !0),
              n.EMFHash &&
              n.EMFHash.length &&
              (
                n.ShapeType === OptConstant.ShapeType.SVGFragmentSymbol ? null == n.SVGFragment &&
                  v &&
                  ShapeUtil.GetSVGFragment(a, n, n.EMFHash) : _ ? (
                    n.SymbolURL = Constants.FilePath_HashSVG + n.EMFHash,
                    n.SymbolURL = n.SymbolURL + '.svg'
                  ) : (
                  n.ImageURL = Constants.FilePath_RSRC + Constants.MissingImage,
                  n.ImageURL = n.ImageURL + '.svg',
                  n.SVGDim.width = Constants.MissingImageDim.width,
                  n.SVGDim.height = Constants.MissingImageDim.height
                ),

                (
                  SDUI.Builder.bBuilderRunning ? n.ShapeType != OptConstant.ShapeType.SVGFragmentSymbol ? SDUI.Builder.CheckSymbolURL('\\Symbols\\Hashes\\SVG\\' + n.EMFHash.toUpperCase() + '.svg') : SDUI.Builder.CheckSymbolURL(
                    '\\Symbols\\Hashes\\SVGColor\\' + n.EMFHash.toUpperCase() + '.svg'
                  ) : SDUI.Builder.gInTemplateValidator &&
                  n.ShapeType != OptConstant.ShapeType.SVGFragmentSymbol &&
                  SDUI.Builder.gCheckSymbolURL('\\Symbols\\Hashes\\SVG\\' + n.EMFHash.toUpperCase() + '.svg')
                )
              )
          }
          break;
        case r.cComment:
          a.ReadBlocks ||
            a.ReadGroupBlock ? t++ : t = ShapeUtil.ReadText(n, null, null, e, t, a, r, !0, r.cCommentEnd);
          break;
        case r.cNativeEmbedStorage:
        case r.cMarkUp:
          break;
        case r.cDrawObj5:
          ShapeUtil.ReadObj5(n, e.codes[t].data, a);
          break;
        case r.cDrawObj6:
          ShapeUtil.ReadDraw6(n, e.codes[t].data, a);
          break;
        case r.cDrawObj7:
          ShapeUtil.ReadObj7(n, e.codes[t].data, a);
          break;
        case r.cDrawBorder:
          ShapeUtil.ReadBorder(n, e.codes[t].data, a);
          break;
        case r.cDrawLine:
          ShapeUtil.Readv6Line(n, e.codes[t].data, a);
          break;
        case r.cDrawFill:
          ShapeUtil.Readv6Fill(n, e.codes[t].data);
          break;
        // case r.cGraph:
        //   h = new Instance.Shape.Graph,
        //     n.SetGraph(h),
        //     t = ShapeUtil.ReadGraph(h, e, t, a, r, r.cGraphEnd);
        //   break;
        case r.cExpandedView:
          R = T3Gv.stdObj.CreateBlock(
            StateConstant.StoredObjectType.ExpandedViewObject,
            e.codes[t].data.svg
          ),
            n.ExpandedViewID = R.ID;
          break;
        case r.cGanttInfo:
          theGanttInfo = new TODO.Table.GanttInfo,
            n.SetGanttInfo(theGanttInfo),
            ShapeUtil.ReadGanttInfo(theGanttInfo, e.codes[t].data, a);
          break;
        case r.cD3Settings:
          n.ImportD3Settings &&
            n.ImportD3Settings(e.codes[t].data.settings);
          break;
        default:
          e.codes[t].code & ShapeUtil.SDF_BEGIN &&
            (
              t = ShapeUtil.ReadFrame(e, t, e.codes[t].code & ShapeUtil.SDF_MASK | ShapeUtil.SDF_END)
            )
      }
      t++
    }
    return n.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
      (
        n.TextFlags & NvConstant.TextFlags.AttachB ||
        n.TextFlags & NvConstant.TextFlags.AttachA
      ) &&
      (c = ShapeUtil.GetLineText(a, a.objectcount, null, null)) >= 0 &&
      (n.DataID = c),
      t
  }

  /**
   * Sets the curvature parameters for shapes based on document version and type
   *
   * This function applies appropriate curvature settings for rounded rectangles and
   * other shapes with curved edges based on the document version and template status.
   *
   * @param resultObject - Object containing document properties and processing settings
   * @param targetObject - The target object to set curvature parameters on
   * @param isLineObject - Flag indicating if the object is a line (true) or a shape (false)
   */
  static SetCurvature(resultObject, targetObject, isLineObject) {
    // Apply only for non-symbol objects in template mode or builder with older versions
    if (!resultObject.isSymbol &&
      (resultObject.isTemplate || SDUI.Builder) &&
      resultObject.PVersion < ShapeUtil.SDF_PVERSION864) {

      if (isLineObject) {
        // For lines, set curve parameter directly
        targetObject.curveparam = 100 * OptConstant.Common.DefFixedRRect;
      } else {
        // For shapes, set shape parameter and fixed rounded rectangle flag
        targetObject.shapeparam = OptConstant.Common.DefFixedRRect;
        targetObject.moreflags = Utils2.SetFlag(
          targetObject.moreflags,
          OptConstant.ObjMoreFlags.FixedRR,
          true
        );
      }
    }
  }

  /**
   * Applies default properties to a drawing object from session defaults
   *
   * This function initializes a new object with default style, text alignment,
   * growth behavior, and other standard properties from the drawing session.
   *
   * @param sessionObject - The drawing session containing default properties
   * @param targetObject - The object to initialize with default properties
   */
  static DefaultObject(sessionObject, targetObject) {
    // Initialize with default style
    targetObject.StyleRecord = new QuickStyle();

    // Copy text alignment from session defaults
    targetObject.just = sessionObject.def.just;
    targetObject.vjust = sessionObject.def.vjust;

    // Set text growth behavior
    targetObject.TextGrow = sessionObject.def.textgrow;
    targetObject.ObjGrow = OptConstant.GrowBehavior.All;

    // Set text direction (left-to-right)
    targetObject.TextDirection = true;

    // Initialize text flags
    targetObject.TextFlags = 0;

    // Set form carriage return flag if present in session defaults
    targetObject.TextFlags = Utils2.SetFlag(
      targetObject.TextFlags,
      NvConstant.TextFlags.FormCR,
      (sessionObject.def.textflags & NvConstant.TextFlags.FormCR) > 0
    );

    // Copy text margins from session defaults
    targetObject.TMargins = $.extend(true, {}, sessionObject.def.tmargins);
  }

  /**
   * Reads text parameters from a source object and applies them to a target object
   *
   * This function processes text-related parameters from a source data structure
   * and sets them on a target object with proper scaling. It handles text rectangle
   * dimensions, margins, indentation, alignment, rotation, and text behavior settings.
   * It also manages text content references through IDs for blocks and groups.
   *
   * @param targetObject - The target object to populate with text parameters
   * @param sourceData - The source data containing text parameter information
   * @param resultObject - Object containing scaling factors and processing context
   */
  static ReadTextParams(targetObject, sourceData, resultObject) {
    // Get text rectangle (prefer 'ltrect' if available, otherwise use 'trect')
    const textRect = sourceData.ltrect ? sourceData.ltrect : sourceData.trect;

    // Convert the rectangle with proper scaling and offset
    targetObject.trect = ShapeUtil.ToSDJSRect(textRect, resultObject.coordScaleFactor);
    targetObject.trect.x += resultObject.GroupOffset.x;
    targetObject.trect.y += resultObject.GroupOffset.y;

    // Set text indentation values with proper scaling
    targetObject.tindent.left = ShapeUtil.ToSDJSCoords(sourceData.tindent.left, resultObject.coordScaleFactor);
    targetObject.tindent.top = ShapeUtil.ToSDJSCoords(sourceData.tindent.top, resultObject.coordScaleFactor);
    targetObject.tindent.right = ShapeUtil.ToSDJSCoords(sourceData.tindent.right, resultObject.coordScaleFactor);
    targetObject.tindent.bottom = ShapeUtil.ToSDJSCoords(sourceData.tindent.bottom, resultObject.coordScaleFactor);

    // Set text margins with proper scaling
    targetObject.TMargins.left = ShapeUtil.ToSDJSCoords(sourceData.tmargin.left, resultObject.coordScaleFactor);
    targetObject.TMargins.top = ShapeUtil.ToSDJSCoords(sourceData.tmargin.top, resultObject.coordScaleFactor);
    targetObject.TMargins.right = ShapeUtil.ToSDJSCoords(sourceData.tmargin.right, resultObject.coordScaleFactor);
    targetObject.TMargins.bottom = ShapeUtil.ToSDJSCoords(sourceData.tmargin.bottom, resultObject.coordScaleFactor);

    // Set shape indentation values
    targetObject.left_sindent = sourceData.left_sindent;
    targetObject.top_sindent = sourceData.top_sindent;
    targetObject.right_sindent = sourceData.right_sindent;
    targetObject.bottom_sindent = sourceData.bottom_sindent;

    // Set text alignment and flags
    targetObject.TextAlign = ShapeUtil.W32JustToTextAlign(sourceData.just, sourceData.vjust);
    targetObject.TextFlags = sourceData.textflags;

    // Special handling for floor plan wall objects
    if (targetObject.objecttype === NvConstant.FNObjectTypes.FlWall) {
      targetObject.TextFlags = Utils2.SetFlag(
        targetObject.TextFlags,
        NvConstant.TextFlags.HorizText,
        true
      );
    }

    // Set text growth behavior
    targetObject.TextGrow = sourceData.textgrow;

    // Set text wrap width if available
    if (sourceData.textwrapwidth > 0) {
      targetObject.TextWrapWidth = ShapeUtil.ToSDJSCoords(sourceData.textwrapwidth, resultObject.coordScaleFactor);
    }

    // Set line text positioning if available
    if (sourceData.linetextx !== undefined) {
      targetObject.LineTextX = sourceData.linetextx;
    }

    if (sourceData.linetexty !== undefined) {
      targetObject.LineTextY = ShapeUtil.ToSDJSCoords(sourceData.linetexty, resultObject.coordScaleFactor);
    }

    // Set Visio rotation difference if available
    if (sourceData.visiorotationdiff !== undefined) {
      targetObject.VisioRotationDiff = sourceData.visiorotationdiff / 10;
    }

    // Set rotation angle with special handling for Visio line text labels
    if (targetObject.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioLineTextLabel && resultObject.IsVisio) {
      targetObject.RotationAngle = sourceData.tangle / 10;
    } else {
      targetObject.RotationAngle = ShapeUtil.ToSDJSAngle(sourceData.tangle);
    }

    // Handle block and group content references
    if (resultObject.ReadBlocks || resultObject.ReadGroupBlock) {
      let objectWithData, objectPtr;

      // Handle text content ID
      if (sourceData.textid >= 0) {
        // Set the text data ID and mark it as used
        targetObject.DataID = resultObject.textids[sourceData.textid];
        resultObject.usedtextids[sourceData.textid] = true;

        // Special handling for text on lines
        if (resultObject.textonline >= 0 &&
          resultObject.textonline < resultObject.objectcount &&
          (objectWithData = resultObject.IDMap[resultObject.textonline]) >= 0 &&
          (objectPtr = DataUtil.GetObjectPtr(objectWithData, false))) {

          // Handle different object types differently
          switch (objectPtr.DrawingObjectBaseClass) {
            case OptConstant.DrawObjectBaseClass.Connector:
              // No special handling for connectors
              break;

            case OptConstant.DrawObjectBaseClass.Shape:
              // Transfer the text to the shape and clear it from the current object
              objectPtr.DataID = targetObject.DataID;
              targetObject.DataID = -1;
              targetObject = objectPtr;
              resultObject.textonline = -1;
              break;

            default:
              // Default transfer behavior
              objectPtr.DataID = targetObject.DataID;
              targetObject.DataID = -1;
              targetObject = objectPtr;
              objectPtr.TextDirection = (objectPtr.TextFlags & NvConstant.TextFlags.HorizText) == 0;
              resultObject.textonline = -1;
          }
        }

        // Apply text alignment to the referenced text object
        const textObject = DataUtil.GetObjectPtr(targetObject.DataID, false);
        if (textObject) {
          const textAlignment = ShapeUtil.TextAlignToJust(targetObject.TextAlign);
          T3Gv.opt.SetTextAlignment(textObject, textAlignment.vjust, null);
        }
      }

      // Handle comment/note ID
      if (sourceData.commentid >= 0) {
        targetObject.NoteID = resultObject.noteids[sourceData.commentid];
        resultObject.usednoteids[sourceData.commentid] = true;
      }
    }
  }

  /**
   * Converts internal line type constants to Windows 32-bit format object type information
   *
   * This function translates the application's internal line type constants into the
   * corresponding Windows format object type information used by the file parser.
   * For each line type, it sets the appropriate object type, data class, reference value,
   * parameter value, and weight based on the input line type.
   *
   * @param lineType - The internal line type constant from OptConstant.LineType
   * @param dataClass - The data class for the line
   * @param shortReference - The short reference value
   * @param paramValue - The parameter value that may need coordinate scaling
   * @param weightValue - The weight value for the line
   * @param resultObject - Object containing coordinate scale factors and other context
   * @returns Object containing Windows format object type information
   */
  static LineTypeToWin32Type(lineType, dataClass, shortReference, paramValue, weightValue, resultObject) {
    // Initialize with default object type of a direct line
    const win32TypeInfo = {
      otype: ShapeConstant.ObjectTypes.LineD,
      dataClass: dataClass,
      shortReference: shortReference,
      param: paramValue,
      weight: weightValue
    };

    // Set specific object type properties based on the input line type
    switch (lineType) {
      case OptConstant.LineType.ARCLINE:
        // Arc line is a special type of chord
        win32TypeInfo.shortReference = OptConstant.LineTypes.LsChord;
        win32TypeInfo.param = ShapeUtil.ToSDJSCoords(paramValue, resultObject.coordScaleFactor);
        break;

      case OptConstant.LineType.SEGLINE:
        // Segmented straight line
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.SegL;
        win32TypeInfo.dataClass = OptConstant.SeglTypes.Line;
        break;

      case OptConstant.LineType.ARCSEGLINE:
        // Segmented arc line
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.SegL;
        win32TypeInfo.dataClass = OptConstant.SeglTypes.Arc;
        break;

      case OptConstant.LineType.PARABOLA:
        // Parabolic curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.PolyL;
        win32TypeInfo.param = ShapeUtil.ToSDJSCoords(paramValue, resultObject.coordScaleFactor);
        win32TypeInfo.shortReference = ShapeUtil.ToSDJSCoords(shortReference, resultObject.coordScaleFactor);
        break;

      case OptConstant.LineType.NURBS:
        // Non-Uniform Rational B-Spline
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.Nurbs;
        break;

      case OptConstant.LineType.NURBSSEG:
        // Segmented NURBS
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.NurbsSeg;
        break;

      case OptConstant.LineType.ELLIPSE:
        // Elliptical curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.Ellipse;
        break;

      case OptConstant.LineType.ELLIPSEEND:
        // End segment of elliptical curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.EllipseEnd;
        break;

      case OptConstant.LineType.QUADBEZ:
        // Quadratic Bezier curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.Quadbez;
        break;

      case OptConstant.LineType.QUADBEZCON:
        // Connected quadratic Bezier curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.QuadbezCon;
        break;

      case OptConstant.LineType.CUBEBEZ:
        // Cubic Bezier curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.Cubebez;
        break;

      case OptConstant.LineType.CUBEBEZCON:
        // Connected cubic Bezier curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.CubebezCon;
        break;

      case OptConstant.LineType.SPLINE:
        // Spline curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.Spline;
        break;

      case OptConstant.LineType.SPLINECON:
        // Connected spline curve
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.SplineCon;
        break;

      case OptConstant.LineType.MOVETO:
        // Move to point (without drawing)
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.MoveTo;
        break;

      case OptConstant.LineType.MOVETO_NEWPOLY:
        // Move to point and start a new polygon
        win32TypeInfo.otype = ShapeConstant.ObjectTypes.MoveToNewPoly;
        break;
    }

    return win32TypeInfo;
  }

  /**
   * Creates a shape object of the appropriate type based on input parameters
   *
   * This function generates different shapes based on the provided shape type (dataclass).
   * It handles geometry creation, parameter scaling, and returns the appropriate shape instance.
   * For polygon shapes, it creates vertex arrays using the PolygonShapeGenerator.
   *
   * @param shapeConfig - Configuration containing frame dimensions and shape parameters
   * @param shapeData - Data containing the shape type (dataclass) and other properties
   * @param resultObject - Object containing coordinate scaling factors and other context
   * @param extraFlags - Flags controlling special behaviors like flipping
   * @returns Instance of the appropriate shape object (Rect, RRect, Oval, or Polygon)
   */
  static CreateShapeObject(shapeConfig, shapeData, resultObject, extraFlags) {
    let shapeType;
    let vertexArray;
    let scale;
    let minDimension;
    let shapeParam;
    let width;
    let height;
    let scaleFactor;
    let outputShape;

    // Extract shape parameters and dimensions
    shapeParam = shapeConfig.shapeparam;
    width = shapeConfig.Frame.width;
    height = shapeConfig.Frame.height;

    // Determine shape type and create appropriate vertex arrays for polygons
    switch (shapeData.dataclass) {
      case PolygonConstant.ShapeTypes.RECTANGLE:
        ShapeUtil.SetCurvature(resultObject, shapeConfig, false);
      // fall through

      case PolygonConstant.ShapeTypes.OVAL:
      case PolygonConstant.ShapeTypes.CIRCLE:
      case PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE:
        shapeType = shapeData.dataclass;
        break;

      case PolygonConstant.ShapeTypes.POLYGON:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        break;

      case PolygonConstant.ShapeTypes.DIAMOND:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        vertexArray = PolygonShapeGenerator.generateDiamond(shapeConfig.Frame, 0);
        break;

      case PolygonConstant.ShapeTypes.TRIANGLE:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        vertexArray = PolygonShapeGenerator.generateTriangle(shapeConfig.Frame, 0);
        break;

      case PolygonConstant.ShapeTypes.TRIANGLE_BOTTOM:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        vertexArray = PolygonShapeGenerator.generateTriangleDown(shapeConfig.Frame, 0);
        break;

      case PolygonConstant.ShapeTypes.PARALLELOGRAM:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateParallelogram(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.PENTAGON:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        minDimension = width / 2;
        if (minDimension) {
          shapeParam = width / 2 * (shapeParam / minDimension);
        }
        vertexArray = PolygonShapeGenerator.generatePentagon(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.PENTAGON_LEFT:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        minDimension = height / 2;
        if (minDimension) {
          shapeParam = height / 2 * (shapeParam / minDimension);
        }
        vertexArray = PolygonShapeGenerator.generatePentagonLeft(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.HEXAGON:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        minDimension = height / 2;
        if (minDimension) {
          shapeParam = height / 2 * (shapeParam / minDimension);
        }
        vertexArray = PolygonShapeGenerator.generateHexagon(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.OCTAGON:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        scale = shapeParam * height;
        scaleFactor = shapeParam * width;
        if (scale < scaleFactor) {
          scaleFactor = scale;
        }
        if (height) {
          scaleFactor = height * (scaleFactor / height);
        }
        shapeConfig.shapeparam = shapeParam;
        shapeParam = scaleFactor / width;
        scale = scaleFactor / height;
        vertexArray = PolygonShapeGenerator.generateOctagon(shapeConfig.Frame, shapeParam, scale);
        break;

      case PolygonConstant.ShapeTypes.ARROW_RIGHT:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateRightArrow(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.ARROW_LEFT:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateLeftArrow(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.ARROW_TOP:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateTopArrow(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.ARROW_BOTTOM:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateBottomArrow(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.TRAPEZOID:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateTrapezoid(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.TRAPEZOID_BOTTOM:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateTrapezoidDown(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.INPUT:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        shapeParam = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = shapeParam;
        vertexArray = PolygonShapeGenerator.generateInput(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.TERMINAL:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        vertexArray = PolygonShapeGenerator.generateTerminal(shapeConfig.Frame, shapeParam);
        break;

      case PolygonConstant.ShapeTypes.STORAGE:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        scaleFactor = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = scaleFactor;
        vertexArray = PolygonShapeGenerator.generateStorage(shapeConfig.Frame, shapeConfig.shapeparam, scaleFactor);
        break;

      case PolygonConstant.ShapeTypes.DOCUMENT:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        scaleFactor = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = scaleFactor;
        vertexArray = PolygonShapeGenerator.generateDocument(shapeConfig.Frame, scaleFactor);
        break;

      case PolygonConstant.ShapeTypes.DELAY:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        scaleFactor = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = scaleFactor;
        vertexArray = PolygonShapeGenerator.generateDelay(shapeConfig.Frame, scaleFactor);
        break;

      case PolygonConstant.ShapeTypes.DISPLAY:
        shapeType = PolygonConstant.ShapeTypes.POLYGON;
        scaleFactor = ShapeUtil.ToSDJSCoords(shapeConfig.shapeparam, resultObject.coordScaleFactor);
        shapeConfig.shapeparam = scaleFactor;
        vertexArray = PolygonShapeGenerator.generateDisplay(shapeConfig.Frame, scaleFactor);
        break;
    }

    // Apply flipping to vertex array if needed
    const flipFlags = OptConstant.ExtraFlags.FlipHoriz | OptConstant.ExtraFlags.FlipVert;
    if ((extraFlags & flipFlags) && vertexArray) {
      vertexArray = ToolActUtil.FlipVertexArray(vertexArray, extraFlags);
    }

    // Create and return the appropriate shape instance
    switch (shapeType) {
      case PolygonConstant.ShapeTypes.RECTANGLE:
        outputShape = new Instance.Shape.Rect(shapeConfig);
        break;

      case PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE:
        outputShape = new Instance.Shape.RRect(shapeConfig);
        break;

      case PolygonConstant.ShapeTypes.OVAL:
      case PolygonConstant.ShapeTypes.CIRCLE:
        outputShape = new Instance.Shape.Oval(shapeConfig);
        outputShape.dataclass = shapeType;
        break;

      default:
        shapeConfig.VertexArray = vertexArray;
        outputShape = new Instance.Shape.Polygon(shapeConfig);
        outputShape.dataclass = shapeType;
    }

    return outputShape;
  }

  /**
   * Reads object header information and creates the appropriate shape instance
   *
   * This function processes object header data from the file format and creates the
   * corresponding shape instance based on the object type. It handles coordinate
   * scaling, offset application, and various property assignments. It supports shapes,
   * lines, connectors, polylines, and other object types.
   *
   * @param sessionObject - The drawing session object containing default properties
   * @param layerManager - The layer management object containing layer definitions
   * @param sourceData - Source data containing object header information from the file
   * @param resultObject - Object containing coordinate scale factors and processing context
   * @param isGroup - Flag indicating if the object is a group
   * @param isSymbol - Flag indicating if the object is a symbol
   * @param skipAssociationCheck - Flag to skip text association checking
   * @param applyStyles - Flag to apply style information
   * @returns The created shape instance with properties initialized from the source data
   */
  static ReadObjectHeader(sessionObject, layerManager, sourceData, resultObject, isGroup, isSymbol, skipAssociationCheck, applyStyles) {
    let shapeInstance;
    let stylesheetCount;
    let frame;
    let rect;
    let insideRect;
    let sizeDimensions;
    let destinationID;
    let targetObject;
    let skipTextLink;
    let groupBounds;
    let objectConfig = { Frame: {}, r: {}, originalr: {}, originalframe: {}, inside: {} };
    let initialBounds = {};

    // Get rectangle data (prefer long versions if available)
    if (sourceData.lr) {
      rect = sourceData.lr;
      frame = sourceData.lframe;
      insideRect = sourceData.linside;
      sizeDimensions = sourceData.lsizedim;
    } else {
      rect = sourceData.r;
      frame = sourceData.frame;
      insideRect = sourceData.inside;
      sizeDimensions = sourceData.sizedim;
    }

    // Convert coordinates to drawing space
    objectConfig.Frame = ShapeUtil.ToSDJSRect(frame, resultObject.coordScaleFactor);
    objectConfig.r = ShapeUtil.ToSDJSRect(rect, resultObject.coordScaleFactor);

    // Store original rectangle data
    objectConfig.originalr = ShapeUtil.ToSDJSRect(rect, resultObject.coordScaleFactor);
    objectConfig.originalframe = ShapeUtil.ToSDJSRect(frame, resultObject.coordScaleFactor);

    objectConfig.inside = ShapeUtil.ToSDJSRect(insideRect, resultObject.coordScaleFactor);

    // Set symbol origin if needed
    if (resultObject.isSymbol && resultObject.SetSymbolOrigin === false) {
      resultObject.GroupOffset.x = resultObject.SymbolPosition.x - objectConfig.Frame.x;
      resultObject.GroupOffset.y = resultObject.SymbolPosition.y - objectConfig.Frame.y;
      resultObject.SetSymbolOrigin = true;
    }

    // Mark as Visio file if needed
    if (sourceData.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioText) {
      resultObject.VisioFileVersion = true;
    }

    // Handle text on line objects
    if (!skipAssociationCheck &&
      sourceData.associd >= 0 &&
      sourceData.flags & NvConstant.ObjFlags.Assoc &&
      sourceData.otype === ShapeConstant.ObjectTypes.Shape &&
      (sourceData.moreflags & OptConstant.ObjMoreFlags.SED_MF_VisioText) == 0) {

      skipTextLink = true;

      if ((destinationID = resultObject.IDMap[sourceData.associd]) >= 0) {
        targetObject = DataUtil.GetObjectPtr(destinationID, false);

        if (targetObject && targetObject.DataID >= 0) {
          skipTextLink = false;
        }
      }

      if (skipTextLink) {
        resultObject.textonline = sourceData.associd;
        resultObject.textonlineid = sourceData.uniqueid;
        resultObject.LineTextObject = true;
      } else {
        resultObject.LineTextObject = false;
      }
    } else {
      resultObject.LineTextObject = false;
    }

    // Apply group offsets if needed
    if (resultObject.GroupOffset.x || resultObject.GroupOffset.y) {
      objectConfig.Frame.x += resultObject.GroupOffset.x;
      objectConfig.Frame.y += resultObject.GroupOffset.y;
      objectConfig.r.x += resultObject.GroupOffset.x;
      objectConfig.r.y += resultObject.GroupOffset.y;

      objectConfig.originalr.x += resultObject.GroupOffset.x;
      objectConfig.originalr.y += resultObject.GroupOffset.y;
      objectConfig.originalframe.x += resultObject.GroupOffset.x;
      objectConfig.originalframe.y += resultObject.GroupOffset.y;

      objectConfig.inside.x += resultObject.GroupOffset.x;
      objectConfig.inside.y += resultObject.GroupOffset.y;
    }

    // Set additional properties
    objectConfig.shapeparam = sourceData.shapeparam;
    objectConfig.objecttype = sourceData.objecttype;
    objectConfig.UniqueID = sourceData.uniqueid;

    // Check for unsupported object types
    if (ShapeUtil.UnsupportedTypes.indexOf(sourceData.objecttype) >= 0) {
      resultObject.error = ShapeUtil.Errors.UnsupportedPanel;
      const error = new Error("read error");
      error.name = '1';
      throw error;
    }

    objectConfig.ObjGrow = sourceData.objgrow;

    // Create appropriate shape instance based on object type
    switch (sourceData.otype) {
      case ShapeConstant.ObjectTypes.Shape:
        // Handle shape objects (rectangle, oval, polygon, etc.)
        initialBounds = sourceData.hgframe ?
          ShapeUtil.ToSDJSRect(sourceData.hgframe, resultObject.coordScaleFactor) :
          ShapeUtil.ToSDJSRect(frame, resultObject.coordScaleFactor);

        objectConfig.InitialGroupBounds = {};
        objectConfig.InitialGroupBounds.width = initialBounds.width;
        objectConfig.InitialGroupBounds.height = initialBounds.height;
        objectConfig.InitialGroupBounds.x = initialBounds.x;
        objectConfig.InitialGroupBounds.y = initialBounds.y;

        // Create appropriate shape instance based on object type
        if (isGroup) {
          shapeInstance = new Instance.Shape.GroupSymbol(objectConfig);
        } else if (objectConfig.objecttype === NvConstant.FNObjectTypes.FlWall) {
          shapeInstance = new Instance.Shape.PolyLineContainer(objectConfig);
        } else if (isSymbol) {
          shapeInstance = new Instance.Shape.SVGFragmentSymbol(objectConfig);
        } else if (objectConfig.objecttype === NvConstant.FNObjectTypes.D3Symbol) {
          shapeInstance = new Instance.Shape.D3Symbol(objectConfig);
        } else if (objectConfig.objecttype === NvConstant.FNObjectTypes.ShapeContainer) {
          shapeInstance = new Instance.Shape.ShapeContainer(objectConfig);
        } else {
          shapeInstance = ShapeUtil.CreateShapeObject(objectConfig, sourceData, resultObject, sourceData.extraflags);
        }

        shapeInstance.ResizeAspectConstrain = sourceData.objgrow === OptConstant.GrowBehavior.ProPortional;
        break;

      case ShapeConstant.ObjectTypes.LineD:
        // Handle direct line objects
        shapeInstance = ShapeUtil.CreateLineObject(objectConfig, sourceData, resultObject);
        break;

      case ShapeConstant.ObjectTypes.SegL:
        // Handle segmented line objects
        shapeInstance = sourceData.dataclass === OptConstant.SeglTypes.Arc ?
          new Instance.Shape.ArcSegmentedLine(objectConfig) :
          new Instance.Shape.SegmentedLine(objectConfig);
        break;

      case ShapeConstant.ObjectTypes.Array:
        // Handle connector array objects
        objectConfig.fixedpoint = sourceData.lfixedpoint ?
          ShapeUtil.ToSDJSCoords(sourceData.lfixedpoint, resultObject.coordScaleFactor) :
          ShapeUtil.ToSDJSCoords(sourceData.fixedpoint, resultObject.coordScaleFactor);

        objectConfig.StartPoint = {};
        objectConfig.EndPoint = {};

        if (sourceData.dataclass === OptConstant.LineSubclass.LCV) {
          // Vertical connector
          if (resultObject.GroupOffset.x) {
            objectConfig.fixedpoint += resultObject.GroupOffset.x;
          }

          objectConfig.vertical = true;
          objectConfig.StartPoint.x = objectConfig.fixedpoint;
          objectConfig.StartPoint.y = objectConfig.Frame.y;
          objectConfig.EndPoint.x = objectConfig.fixedpoint;
          objectConfig.EndPoint.y = objectConfig.Frame.y;
        } else {
          // Horizontal connector
          objectConfig.vertical = false;

          if (resultObject.GroupOffset.y) {
            objectConfig.fixedpoint += resultObject.GroupOffset.y;
          }

          objectConfig.StartPoint.y = objectConfig.fixedpoint;
          objectConfig.StartPoint.x = objectConfig.Frame.x;
          objectConfig.EndPoint.y = objectConfig.fixedpoint;
          objectConfig.EndPoint.x = objectConfig.Frame.x;
        }

        shapeInstance = new Instance.Shape.Connector(objectConfig);
        break;

      case ShapeConstant.ObjectTypes.PolyL:
        // Handle polyline objects
        shapeInstance = objectConfig.objecttype === NvConstant.FNObjectTypes.FlWall ?
          new Instance.Shape.PolyLineContainer(objectConfig) :
          new Instance.Shape.PolyLine(objectConfig);
        break;

      case ShapeConstant.ObjectTypes.Freehand:
        // Handle freehand line objects
        shapeInstance = new Instance.Shape.FreehandLine(objectConfig);
        break;
    }

    // Apply common properties to the created shape
    if (shapeInstance) {
      // Set default properties from session
      ShapeUtil.DefaultObject(sessionObject, shapeInstance);

      // Store original rectangle data
      if (objectConfig.originalr) {
        shapeInstance.originalr = {
          x: objectConfig.originalr.x,
          y: objectConfig.originalr.y,
          width: objectConfig.originalr.width,
          height: objectConfig.originalr.height
        };
      }

      if (objectConfig.originalframe) {
        shapeInstance.originalframe = {
          x: objectConfig.originalframe.x,
          y: objectConfig.originalframe.y,
          width: objectConfig.originalframe.width,
          height: objectConfig.originalframe.height
        };
      }

      // Set common shape properties
      shapeInstance.dataclass = sourceData.dataclass;
      shapeInstance.flags = sourceData.flags;

      // Handle flags for older file versions
      if (resultObject.PVersion < ShapeUtil.SDF_PVERSION849) {
        shapeInstance.flags = Utils2.SetFlag(shapeInstance.flags, NvConstant.ObjFlags.NoTableLink, false);
      }

      shapeInstance.extraflags = sourceData.extraflags;
      shapeInstance.sizedim.width = ShapeUtil.ToSDJSCoords(sizeDimensions.x, resultObject.coordScaleFactor);
      shapeInstance.sizedim.height = ShapeUtil.ToSDJSCoords(sizeDimensions.y, resultObject.coordScaleFactor);
      shapeInstance.ObjGrow = sourceData.objgrow;

      // Set hook properties for non-array objects
      if (sourceData.otype !== ShapeConstant.ObjectTypes.Array) {
        shapeInstance.hookflags = sourceData.hookflags;
        shapeInstance.targflags = sourceData.targflags;
      }

      shapeInstance.maxhooks = sourceData.maxhooks;
      shapeInstance.associd = sourceData.associd;
      shapeInstance.ShortRef = sourceData.ShortRef;

      // Mark as being in a group if reading a group
      if (resultObject.ReadingGroup) {
        shapeInstance.bInGroup = true;
      }

      // Apply advanced style properties if requested
      if (applyStyles) {
        // Set attachment point properties
        shapeInstance.attachpoint.x = sourceData.attachpoint_x;
        shapeInstance.attachpoint.y = sourceData.attachpoint_y;
        shapeInstance.rleft = sourceData.rleft;
        shapeInstance.rtop = sourceData.rtop;
        shapeInstance.rright = sourceData.rright;
        shapeInstance.rbottom = sourceData.rbottom;
        shapeInstance.rwd = sourceData.rwd;
        shapeInstance.rht = sourceData.rht;
        shapeInstance.rflags = sourceData.rflags;

        // Set layer information
        shapeInstance.Layer = sourceData.layer;
        if (shapeInstance.Layer < 0 || shapeInstance.Layer > layerManager.nlayers - 1) {
          shapeInstance.Layer = 0;
        }

        // Set dimension flags
        shapeInstance.Dimensions = sourceData.dimensions;
        if (shapeInstance.Dimensions & NvConstant.DimensionFlags.Always &&
          shapeInstance.Dimensions & NvConstant.DimensionFlags.Select) {
          shapeInstance.Dimensions = Utils2.SetFlag(
            shapeInstance.Dimensions,
            NvConstant.DimensionFlags.Select,
            false
          );
        }

        // Set style index and object type
        shapeInstance.tstyleindex = sourceData.styleindex;
        shapeInstance.objecttype = sourceData.objecttype;

        // Apply special handling for specific object types
        if (shapeInstance.objecttype) {
          switch (shapeInstance.objecttype) {
            // case NvConstant.FNObjectTypes.SwimLaneRows:
            // case NvConstant.FNObjectTypes.SD_OBJT_SWIMLANE_COLS:
            //   // Set auto container flag for older file versions
            //   if (resultObject.PVersion < ShapeUtil.SDF_PVERSION864) {
            //     shapeInstance.moreflags = Utils2.SetFlag(
            //       shapeInstance.moreflags,
            //       OptConstant.ObjMoreFlags.AutoContainer,
            //       true
            //     );
            //   }
            //   break;
          }
        }

        // Set color properties
        shapeInstance.colorfilter = sourceData.colorfilter;
        if (sourceData.colorchanges !== undefined) {
          shapeInstance.colorchanges = sourceData.colorchanges;
        } else {
          shapeInstance.colorchanges = 0;
          ShapeUtil.BuildColorChanges(shapeInstance, resultObject);
        }

        // Set additional flags
        if (sourceData.moreflags) {
          shapeInstance.moreflags = sourceData.moreflags;
        }

        // Set sequence and dimension properties
        shapeInstance.sequence = sourceData.sequence;
        shapeInstance.dimensionDeflectionH = ShapeUtil.ToSDJSCoords(sourceData.dimensionDeflectionH, resultObject.coordScaleFactor);
        shapeInstance.dimensionDeflectionV = ShapeUtil.ToSDJSCoords(sourceData.dimensionDeflectionV, resultObject.coordScaleFactor);

        // Set hook displacement
        if (sourceData.hookdisp_x || sourceData.hookdisp_y) {
          shapeInstance.hookdisp.x = ShapeUtil.ToSDJSCoords(sourceData.hookdisp_x, resultObject.coordScaleFactor);
          shapeInstance.hookdisp.y = ShapeUtil.ToSDJSCoords(sourceData.hookdisp_y, resultObject.coordScaleFactor);
        } else {
          shapeInstance.hookdisp.x = 0;
          shapeInstance.hookdisp.y = 0;
        }

        // Set presentation and subtype properties
        shapeInstance.pptLayout = sourceData.pptLayout ? sourceData.pptLayout : 0;
        shapeInstance.subtype = sourceData.subtype ? sourceData.subtype : 0;

        // Apply style from style library if available
        stylesheetCount = resultObject.lpStyles.length;
        if (shapeInstance.tstyleindex >= 0 && shapeInstance.tstyleindex < stylesheetCount) {
          shapeInstance.StyleRecord = Utils1.DeepCopy(resultObject.lpStyles[shapeInstance.tstyleindex]);
        } else if (stylesheetCount) {
          shapeInstance.tstyleindex = 0;
          shapeInstance.StyleRecord = Utils1.DeepCopy(resultObject.lpStyles[shapeInstance.tstyleindex]);
        }
      } else {
        // Apply default style when not using style library
        shapeInstance.StyleRecord = Utils1.DeepCopy(resultObject.sdp.def.style);

        // For shape objects, copy border style to line style
        if (sourceData.otype === ShapeConstant.ObjectTypes.Shape) {
          shapeInstance.StyleRecord.Line = Utils1.DeepCopy(resultObject.sdp.def.style.Border);
        }
      }
    }

    return shapeInstance;
  }

  /**
   * Reads layer information from a code structure and populates the layer manager
   *
   * This function processes layer definitions from a data source and populates the layer
   * manager with layer information including flags, names, types, and object lists.
   * It handles the tracking of layer counts and ensures proper default layer naming.
   *
   * @param codeData - The source data containing layer information and codes
   * @param codeIndex - The current position in the code structure
   * @param resultObject - Object containing the layer manager to be populated
   * @param opCodes - Object containing operation code constants and references
   * @returns The updated code index position after processing layers
   */
  static ReadLayers(codeData, codeIndex, resultObject, opCodes) {
    let currentLayerIndex = -1;

    // Move past the layer begin marker
    codeIndex++;

    // Initialize layers array
    resultObject.tLMB.layers = [];

    // Process layer data until we reach the end marker
    while (codeData.codes[codeIndex].code != DSConstant.OpNameCode.cEndLayer) {
      switch (codeData.codes[codeIndex].code) {
        case opCodes.cLayerFlags:
          // Create a new layer when we encounter layer flags
          currentLayerIndex++;
          resultObject.tLMB.layers.push(new Layer());
          resultObject.tLMB.layers[currentLayerIndex].flags = codeData.codes[codeIndex].data.flags;
          break;

        case opCodes.cLayerName:
          // Set the layer name if we have a valid layer
          if (currentLayerIndex >= 0) {
            resultObject.tLMB.layers[currentLayerIndex].name = codeData.codes[codeIndex].data.name;
          }
          break;

        case opCodes.cLayerType:
          // Set the layer type if we have a valid layer
          if (currentLayerIndex >= 0) {
            resultObject.tLMB.layers[currentLayerIndex].layertype = codeData.codes[codeIndex].data.type;
          }
          break;

        case opCodes.cLayerList:
          // Add objects to the layer and to the block list
          if (currentLayerIndex >= 0) {
            resultObject.tLMB.layers[currentLayerIndex].zList = codeData.codes[codeIndex].data.zList;
            resultObject.BlockzList = resultObject.BlockzList.concat(codeData.codes[codeIndex].data.zList);
          }
          break;
      }

      codeIndex++;
    }

    // Set total layer count
    resultObject.tLMB.nlayers = currentLayerIndex + 1;

    // Reset active layer if out of bounds
    if (resultObject.tLMB.activelayer >= resultObject.tLMB.nlayers) {
      resultObject.tLMB.activelayer = 0;
    }

    // Rename default layer to use proper constant name
    if (resultObject.tLMB.nlayers === 1 && resultObject.tLMB.layers[0].name === 'Default') {
      resultObject.tLMB.layers[0].name = OptConstant.Common.DefaultLayerName;
    }

    return codeIndex;
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
          smartpanelname: T3Gv.opt.header.smartpanelname,
          importSourcePath: T3Gv.opt.header.importSourcePath,
          BusinessModule: T3Gv.opt.header.BusinessModule,
          SymbolSearchString: T3Gv.opt.header.SymbolSearchString,
          orgcharttable: T3Gv.opt.header.orgcharttable,
          smarthelpname: T3Gv.opt.header.smarthelpname,
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
      const storageKey = "t3_draw";

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
   * Converts an HTML color string to a Windows 32-bit color value
   *
   * This function takes an HTML color code (with or without the # prefix) and
   * converts it to a 32-bit integer value suitable for Windows color representation.
   * It also handles opacity/transparency as the alpha channel in the resulting value.
   *
   * @param htmlColor - The HTML color string to convert (e.g. '#FF0000' or 'FF0000')
   * @param opacity - Optional opacity value between 0-1 (default: 1 = fully opaque)
   * @returns 32-bit integer representation of the color with alpha channel
   */
  static HTMLColorToWin(htmlColor, opacity) {
    // Remove # prefix if present and ensure color string is at least 6 characters
    let colorString = htmlColor.replace('#', '');
    while (colorString.length < 6) {
      colorString += colorString[0];
    }

    // Convert RGB hex components to a 32-bit integer (0x00RRGGBB format)
    let colorValue = parseInt(colorString.slice(0, 2), 16) +
      (parseInt(colorString.slice(2, 4), 16) << 8) +
      (parseInt(colorString.slice(4, 6), 16) << 16);

    // Apply opacity as alpha channel if provided
    if (opacity === undefined) {
      opacity = 1;
    }

    // Convert opacity to alpha (0 = opaque, 255 = transparent in this implementation)
    let alpha = 1 - opacity;
    alpha = Math.round(255 * alpha);

    // Add alpha channel to the color value if it's not fully opaque
    if (alpha) {
      colorValue |= alpha << 24;
    }

    return colorValue;
  }

  /**
   * Maps a block ID to a unique identifier in the file format
   *
   * This function translates internal block IDs to sequential unique identifiers
   * for the  format. When writing blocks, it uses the original ID;
   * otherwise, it looks up the position in the UniqueMap array and adds 1.
   *
   * @param blockId - The internal block identifier to convert
   * @param resultObject - Object containing mapping information and writing context
   * @returns A unique identifier suitable for the file format
   */
  static BlockIDtoUniqueID(blockId, resultObject) {
    if (resultObject.WriteBlocks) {
      return blockId;
    } else {
      return resultObject.UniqueMap.indexOf(blockId) + 1;
    }
  }

  /**
   * Writes version information to the data stream
   *
   * This function writes the SDF version struct to the data stream, including file format version,
   * platform information, resolution settings, and encoding format flags. It provides compatibility
   * information for applications reading the file.
   *
   * @param dataStream - The data stream to write to
   * @param platform - The platform identifier for the file format
   * @param fileVersion - The version number of the file format
   */
  static WriteCVersion(dataStream, platform, fileVersion) {
    // Create version information structure
    const versionInfo = {
      FVersion: fileVersion,
      PVersion: ShapeUtil.SDF_PVERSION,
      Platform: platform,
      MinVer: fileVersion,
      printres: ShapeUtil.PRINTRES,
      drawres: ShapeUtil.DRAWRES,
      LongFormat: 1,
      TrialVersion: 0,
      Unicode: 1
    };

    // Write version code to the data stream
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cVersion);

    // Write the version structure and its length
    dataStream.writeStruct(DSConstant.VersionStruct, versionInfo);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes header information to the data stream for a document in
   *
   * This function writes all necessary header information to identify the document,
   * including page settings, import paths, operation module information,
   * symbol search strings, and organization chart configurations.
   *
   * @param dataStream - The data stream to write header information to
   * @param resultObject - Object containing document properties and metadata
   * @param skipCodes - Array of codes to skip during header writing (optional)
   */
  static WriteHeader(dataStream, resultObject, skipCodes) {
    const opCodes = DSConstant.OpNameCode;
    const exportPath = "";

    // Write basic header information
    ShapeUtil.WriteCHeader(dataStream, resultObject);
    ShapeUtil.WriteCPage(dataStream, resultObject);

    // Write import source path if not in block-writing mode
    if (skipCodes == null) {
      if (!resultObject.WriteBlocks) {
        ShapeUtil.WriteString(
          dataStream,
          T3Gv.opt.header.importSourcePath,
          opCodes.SDF_C_IMPORT_SOURCE_PATH,
          resultObject
        );
      }
      ShapeUtil.WriteString(dataStream, exportPath, opCodes.cExportPath, resultObject);
    }

    // Write operation module information if not explicitly skipped
    if (skipCodes == null || skipCodes.indexOf(opCodes.cBusinessModule) == -1) {
      ShapeUtil.WriteString(
        dataStream,
        T3Gv.opt.header.BusinessModule,
        opCodes.cBusinessModule,
        resultObject
      );
    }

    // Write symbol search string if not explicitly skipped
    if (skipCodes == null || skipCodes.indexOf(opCodes.cSymbolSearchString) == -1) {
      ShapeUtil.WriteString(
        dataStream,
        T3Gv.opt.header.SymbolSearchString,
        opCodes.cSymbolSearchString,
        resultObject
      );
    }

    // Write organization chart table information if not explicitly skipped
    if (skipCodes == null || skipCodes.indexOf(opCodes.cOrgChartTable) == -1) {
      // if (T3Gv.opt.header.orgcharttable.length) {
      //   let tableIndex = TODO.OrgChartTables.indexOf(T3Gv.opt.header.orgcharttable);

      //   if (tableIndex >= 0) {
      //     // Write standard org chart table
      //     ShapeUtil.WriteString(
      //       dataStream,
      //       TODO.WinOrgChartTables[tableIndex],
      //       opCodes.cOrgChartTable,
      //       resultObject
      //     );
      //   } else {
      //     // Check if it's a mind map table
      //     // tableIndex = TODO.MindMapTables.indexOf(T3Gv.opt.header.orgcharttable);

      //     // if (tableIndex >= 0) {
      //     //   ShapeUtil.WriteString(
      //     //     dataStream,
      //     //     TODO.WinMindMapTables[tableIndex],
      //     //     opCodes.cOrgChartTable,
      //     //     resultObject
      //     //   );
      //     // }
      //   }

      //   // Write custom table name if not found in standard tables
      //   if (tableIndex < 0) {
      //     ShapeUtil.WriteString(
      //       dataStream,
      //       T3Gv.opt.header.orgcharttable,
      //       opCodes.cOrgChartTable,
      //       resultObject
      //     );
      //   }
      // }
    }

    // Write smart help name if not in skipped codes mode
    if (skipCodes == null) {
      ShapeUtil.WriteString(
        dataStream,
        T3Gv.opt.header.smarthelpname,
        opCodes.cGuide,
        resultObject
      );

      // Write parent page ID if available
      if (T3Gv.opt.header.ParentPageID.length) {
        ShapeUtil.WriteString(
          dataStream,
          T3Gv.opt.header.ParentPageID,
          opCodes.cParentPageId,
          resultObject
        );
      }
    }

    // Write end of header marker
    dataStream.writeUint16(opCodes.cHeaderEnd);
  }

  /**
   * Writes a Unicode string to the data stream with proper formatting
   *
   * This function writes a UCS-2 encoded string to the data stream with
   * the appropriate opcode and length information. It handles null check
   * and only writes non-empty strings.
   *
   * @param dataStream - The data stream to write the string to
   * @param stringValue - The string to be written
   * @param opCode - The operation code indicating the string type
   * @param resultObject - Object containing context information
   */
  static WriteString(dataStream, stringValue, opCode, resultObject) {
    if (stringValue != null && stringValue.length) {
      const codeOffset = ShapeUtil.WriteCode(dataStream, opCode);
      dataStream.writeUCS2String(stringValue, T3DataStream.LITTLE_ENDIAN, stringValue.length + 1);
      ShapeUtil.WriteLength(dataStream, codeOffset);
    }
  }

  /**
   * Writes an ASCII string to the data stream with proper formatting
   *
   * This function writes an ASCII encoded string to the data stream with
   * the appropriate opcode and length information. It only writes non-empty strings.
   *
   * @param dataStream - The data stream to write the string to
   * @param stringValue - The ASCII string to be written
   * @param opCode - The operation code indicating the string type
   * @param resultObject - Object containing context information
   */
  static WriteString8(dataStream, stringValue, opCode, resultObject) {
    if (stringValue.length) {
      const codeOffset = ShapeUtil.WriteCode(dataStream, opCode);
      dataStream.writeString(stringValue, 'ASCII', stringValue.length + 1);
      ShapeUtil.WriteLength(dataStream, codeOffset);
    }
  }

  /**
   * Writes minimal header information for selection operations
   *
   * This function writes a minimal header for clipboard operations or
   * when only a selection of objects is being written, not a full document.
   * It simply writes the header end marker if we're not writing a group block.
   *
   * @param dataStream - The data stream to write the header end marker to
   * @param resultObject - Object containing context information and flags
   */
  static WriteSelectHeader(dataStream, resultObject) {
    if (!resultObject.WriteGroupBlock) {
      dataStream.writeUint16(DSConstant.OpNameCode.cHeaderEnd);
    }
  }

  /**
   * Writes the SDF header information to the data stream
   *
   * This function writes header metadata for the  format, including window
   * settings, origin coordinates, scaling factors, flags and date format settings.
   * The header provides essential document configuration information.
   *
   * @param dataStream - The data stream to write the header data to
   * @param resultObject - The object containing window settings and configuration data
   */
  static WriteCHeader(dataStream, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cHeader);

    const headerData = {
      flags: 0,
      worigin: {
        x: 0,
        y: 0
      },
      wscale: resultObject.WinSetting.wscale,
      wflags: resultObject.WinSetting.wflags,
      oleback: -1,
      lworigin: {
        x: resultObject.WinSetting.worigin.x,
        y: resultObject.WinSetting.worigin.y
      },
      longflags: resultObject.ctp.flags,
      dateformat: resultObject.ctp.dateformat
    };

    dataStream.writeStruct(DSConstant.HeaderStruct, headerData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes page configuration information to the data stream
   *
   * This function serializes page settings including paper size, margins, orientation,
   * print flags, minimum dimensions, and scaling factors. It handles different format
   * versions (Windows vs. standard) by using the appropriate structure definition.
   *
   * @param dataStream - The data stream to write the page settings to
   * @param resultObject - The object containing page configuration and document settings
   */
  static WriteCPage(dataStream, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cPage);

    // Calculate minimum size dimensions
    const minSizeDimensions = {
      x: resultObject.ctp.Page.papersize.x - 2 * OptConstant.Common.DefMargin,
      y: resultObject.ctp.Page.papersize.y - 2 * OptConstant.Common.DefMargin
    };

    // Use actual minimum size if defined
    minSizeDimensions.x = resultObject.ctp.Page.minsize.x;
    minSizeDimensions.y = resultObject.ctp.Page.minsize.y;

    // Create full page data structure (used for Windows/Visio formats)
    const fullPageData = {
      PadDim: {
        x: 0,
        y: 0
      },
      papersize: {
        x: 0,
        y: 0
      },
      margins: {
        left: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.left, resultObject.coordScaleFactor),
        right: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.right, resultObject.coordScaleFactor),
        top: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.top, resultObject.coordScaleFactor),
        bottom: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.bottom, resultObject.coordScaleFactor)
      },
      minmarg: {
        left: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        right: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        top: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        bottom: OptConstant.Common.DefMargin * resultObject.coordScaleFactor
      },
      landscape: resultObject.ctp.Page.landscape,
      wpapersize: 1,
      overlap: 0,
      printflags: resultObject.ctp.Page.printflags,
      lPadDim: {
        x: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.y, resultObject.coordScaleFactor)
      },
      lpapersize: {
        x: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.papersize.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.papersize.y, resultObject.coordScaleFactor)
      },
      MinSize: {
        x: ShapeUtil.ToSDWinCoords(minSizeDimensions.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(minSizeDimensions.y, resultObject.coordScaleFactor)
      },
      printscale: resultObject.ctp.Page.printscale
    };

    // Create standard page data structure (used for standard format)
    const standardPageData = {
      margins: {
        left: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.left, resultObject.coordScaleFactor),
        right: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.right, resultObject.coordScaleFactor),
        top: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.top, resultObject.coordScaleFactor),
        bottom: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.margins.bottom, resultObject.coordScaleFactor)
      },
      minmarg: {
        left: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        right: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        top: OptConstant.Common.DefMargin * resultObject.coordScaleFactor,
        bottom: OptConstant.Common.DefMargin * resultObject.coordScaleFactor
      },
      landscape: resultObject.ctp.Page.landscape,
      printflags: resultObject.ctp.Page.printflags,
      lPadDim: {
        x: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.y, resultObject.coordScaleFactor)
      },
      lpapersize: {
        x: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.papersize.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.ctp.Page.papersize.y, resultObject.coordScaleFactor)
      },
      MinSize: {
        x: ShapeUtil.ToSDWinCoords(minSizeDimensions.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(minSizeDimensions.y, resultObject.coordScaleFactor)
      },
      printscale: resultObject.ctp.Page.printscale
    };

    // Write appropriate structure based on format
    if (resultObject.WriteWin32) {
      dataStream.writeStruct(DSConstant.PageStruct62, fullPageData);
    } else {
      dataStream.writeStruct(DSConstant.PageStruct126, standardPageData);
    }

    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Converts a JavaScript line tool identifier to Windows platform line tool index
   *
   * This function maps the JavaScript line tool identifiers to their corresponding
   * Windows platform indices for file format compatibility. It includes special handling
   * for the PolyLine tool, incrementing its index to maintain proper mapping.
   *
   * @param lineToolId - The JavaScript line tool identifier to convert
   * @returns The corresponding Windows platform line tool index
   */
  static JStoWinLineTool(lineToolId) {
    let windowsLineIndex = SDUI.WindowsLineTools.indexOf(lineToolId);

    // Set default index if not found
    if (windowsLineIndex < 0) {
      windowsLineIndex = 0;
    }

    // Special handling for PolyLine tool
    if (windowsLineIndex === SDUI.WindowsLineTools.indexOf(DSConstant.LineToolTypes.PolyLine)) {
      windowsLineIndex++;
    }

    return windowsLineIndex;
  }

  /**
   * Converts a JavaScript shape tool identifier to Windows platform shape tool index
   *
   * This function maps JavaScript shape tool identifiers to their corresponding
   * Windows platform indices for file format compatibility.
   *
   * @param shapeToolId - The JavaScript shape tool identifier to convert
   * @returns The corresponding Windows platform shape tool index
   */
  static JStoWinShapeTool(shapeToolId) {
    let windowsShapeIndex = SDUI.WindowsShapeTools.indexOf(shapeToolId);

    // Set default index if not found
    if (windowsShapeIndex < 0) {
      windowsShapeIndex = 0;
    }

    return windowsShapeIndex;
  }

  /**
   * Writes user interface configuration information to the data stream
   *
   * This function writes UI state information including selected tools, container behaviors,
   * swimlane configuration, and other display preferences to the  format.
   * When called with no data stream, it only returns the UI configuration object.
   *
   * @param dataStream - The data stream to write UI information to (optional)
   * @param resultObject - Object containing context information (unused)
   * @returns The UI configuration object if no dataStream is provided
   */
  static WriteUIInfo(dataStream, resultObject) {
    let codeOffset;
    if (dataStream) {
      codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cHeadUiInfo);
    }

    // Initialize flags
    let autoContainer = 0;
    let actAsContainer = 0;
    let swimlaneRotate = 0;
    let swimlaneTitle = 0;
    let collapseTools = 0;

    // Set flags based on document context
    if (NvConstant.DocumentContext.CollapseTools) {
      collapseTools = 1;
    }
    if (NvConstant.DocumentContext.AutoContainer) {
      autoContainer = 1;
    }
    if (NvConstant.DocumentContext.ActAsContainer) {
      actAsContainer = 1;
    }
    if (NvConstant.DocumentContext.SwimlaneRotate) {
      swimlaneRotate = 1;
    }
    if (NvConstant.DocumentContext.SwimlaneTitle) {
      swimlaneTitle = 1;
    }

    // Create UI info structure
    const uiInfoData = {
      linetoolindex: ShapeUtil.JStoWinLineTool(NvConstant.DocumentContext.LineTool),
      shapetoolindex: NvConstant.DocumentContext.ShapeTool,
      datetime2007: 0,
      holidaymask: T3Gv.opt.header.holidaymask,
      datetime1: 0,
      datetime2: 0,
      // nonworkingdays: T3Gv.opt.header.nonworkingdays,
      swimlaneformat: NvConstant.DocumentContext.SwimlaneFormat,
      autocontainer: autoContainer,
      actascontainer: actAsContainer,
      swimlanenlanes: NvConstant.DocumentContext.SwimlaneNLanes,
      swimlanenvlanes: NvConstant.DocumentContext.SwimlaneNVLanes,
      swimlanerotate: swimlaneRotate,
      swimlanetitle: swimlaneTitle,
      collapsetools: collapseTools
    };

    // If no dataStream provided, just return the UI info data
    if (!dataStream) {
      return uiInfoData;
    }

    // Write UI info data to the stream
    dataStream.writeStruct(DSConstant.UIInfoStruct60, uiInfoData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes search result library information to the data stream
   *
   * This function serializes a search result library and its symbols to the data stream,
   * including IDs and content titles for both the library and its contained items.
   * It helps preserve search result references in saved documents.
   *
   * @param dataStream - The data stream to write library information to
   * @param resultObject - Object containing context information
   * @param library - The search result library to write
   */
  static WriteSearchResultLibrary(dataStream, resultObject, library) {
    let itemIndex;
    let itemCount;
    let currentItem;

    // Get total number of items in the library
    itemCount = library.Items.length;

    // Write library ID and title
    ShapeUtil.WriteString(
      dataStream,
      library.ItemId,
      DSConstant.OpNameCode.cSearchLib,
      resultObject
    );

    ShapeUtil.WriteString(
      dataStream,
      library.ContentTitle,
      DSConstant.OpNameCode.cSearchLibName,
      resultObject
    );

    // Write each symbol in the library
    for (itemIndex = 0; itemIndex < itemCount; itemIndex++) {
      currentItem = library.Items[itemIndex];

      ShapeUtil.WriteString(
        dataStream,
        currentItem.ItemId,
        DSConstant.OpNameCode.cSearchLibSymbolId,
        resultObject
      );

      ShapeUtil.WriteString(
        dataStream,
        currentItem.ContentTitle,
        DSConstant.OpNameCode.cSearchLibSymbolName,
        resultObject
      );
    }

    // Write library end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cSearchLibEnd);
  }

  /**
   * Writes a native object identifier to the data stream
   *
   * This function serializes a native object identifier to the data stream using
   * the cNativeId opcode. Native IDs are used to identify platform-specific
   * or native format components within the file.
   *
   * @param dataStream - The data stream to write the native ID to
   * @param nativeId - The native object identifier to write
   * @param resultObject - Object containing context information for serialization
   */
  static WriteNativeID(dataStream, nativeId, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cNativeId);
    const nativeIdData = {
      value: nativeId
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, nativeIdData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  // /**
  //  * Writes a table identifier to the data stream
  //  *
  //  * This function serializes a table identifier to the data stream using
  //  * the cTableId opcode. Table IDs reference tabular data structures
  //  * within the document, allowing objects to display and interact with
  //  * structured information.
  //  *
  //  * @param dataStream - The data stream to write the table ID to
  //  * @param tableId - The table identifier to write
  //  * @param resultObject - Object containing context information for serialization
  //  */
  // static WriteTableID(dataStream, tableId, resultObject) {
  //   const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTableId);
  //   const tableIdData = {
  //     value: tableId
  //   };
  //   dataStream.writeStruct(DSConstant.LongValueStruct, tableIdData);
  //   ShapeUtil.WriteLength(dataStream, codeOffset);
  // }

  /**
   * Writes a 32-bit integer value to the data stream with a specified opcode
   *
   * This function is a generic serializer for 32-bit integer values, allowing
   * the caller to specify which operation code should be used. It's used for
   * various numeric properties throughout the file format.
   *
   * @param dataStream - The data stream to write the value to
   * @param operationCode - The operation code indicating the value type
   * @param longValue - The 32-bit integer value to write
   * @param resultObject - Object containing context information for serialization
   */
  static WriteLongValue(dataStream, operationCode, longValue, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, operationCode);
    const longValueData = {
      value: longValue
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, longValueData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  // /**
  //  * Writes a graph identifier to the data stream
  //  *
  //  * This function serializes a graph identifier to the data stream using
  //  * the cGraphId opcode. Graph IDs reference chart and graph data
  //  * structures within the document.
  //  *
  //  * @param dataStream - The data stream to write the graph ID to
  //  * @param graphId - The graph identifier to write
  //  * @param resultObject - Object containing context information for serialization
  //  */
  // static WriteGraphID(dataStream, graphId, resultObject) {
  //   const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cGraphId);
  //   const graphIdData = {
  //     value: graphId
  //   };
  //   dataStream.writeStruct(DSConstant.LongValueStruct, graphIdData);
  //   ShapeUtil.WriteLength(dataStream, codeOffset);
  // }

  /**
   * Writes an expanded view identifier to the data stream
   *
   * This function serializes an expanded view identifier to the data stream using
   * the cExpandedViewId opcode. Expanded view IDs reference detailed or
   * expanded visualizations of objects within the document.
   *
   * @param dataStream - The data stream to write the expanded view ID to
   * @param expandedViewId - The expanded view identifier to write
   * @param resultObject - Object containing context information for serialization
   */
  static WriteExpandedViewID(dataStream, expandedViewId, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cExpandedViewId);
    const expandedViewData = {
      value: expandedViewId
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, expandedViewData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes a Gantt information identifier to the data stream
   *
   * This function serializes a Gantt chart information identifier to the data stream
   * using the cGanttInfoId opcode. Gantt info IDs reference project scheduling
   * and timeline data within the document.
   *
   * @param dataStream - The data stream to write the Gantt info ID to
   * @param ganttInfoId - The Gantt information identifier to write
   * @param resultObject - Object containing context information for serialization
   */
  static WriteGanttInfoID(dataStream, ganttInfoId, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cGanttInfoId);
    const ganttInfoData = {
      value: ganttInfoId
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, ganttInfoData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes a cell note identifier to the data stream
   *
   * This function serializes a cell note identifier to the data stream using
   * the cNoteId opcode. Cell note IDs reference annotations or comments
   * attached to cells in tables or grids.
   *
   * @param dataStream - The data stream to write the cell note ID to
   * @param cellNoteId - The cell note identifier to write
   * @param resultObject - Object containing context information for serialization
   */
  static WriteCellNoteID(dataStream, cellNoteId, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cNoteId);
    const cellNoteData = {
      value: cellNoteId
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, cellNoteData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes a blob bytes identifier and type to the data stream
   *
   * This function serializes a binary large object (blob) identifier and its type
   * to the data stream using the cImageId opcode. Blob bytes typically
   * represent embedded images or other binary data in the document.
   *
   * @param dataStream - The data stream to write the blob bytes ID to
   * @param blobBytesId - The blob bytes identifier to write
   * @param blobType - The type of blob data
   * @param resultObject - Object containing context information for serialization
   */
  static WriteBlobBytesID(dataStream, blobBytesId, blobType, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cImageId);
    const blobBytesData = {
      value: blobBytesId,
      type: blobType
    };
    dataStream.writeStruct(DSConstant.LongValue2Struct, blobBytesData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes an EMF blob bytes identifier and type to the data stream
   *
   * This function serializes an Enhanced Metafile Format (EMF) blob identifier and its type
   * to the data stream using the cEmfId opcode. EMF blobs contain vector graphics
   * in the Windows Enhanced Metafile format.
   *
   * @param dataStream - The data stream to write the EMF blob bytes ID to
   * @param emfBlobBytesId - The EMF blob bytes identifier to write
   * @param emfBlobType - The type of EMF blob data
   * @param resultObject - Object containing context information for serialization
   */
  static WriteEMFBlobBytesID(dataStream, emfBlobBytesId, emfBlobType, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cEmfId);
    const emfBlobData = {
      value: emfBlobBytesId,
      type: emfBlobType
    };
    dataStream.writeStruct(DSConstant.LongValue2Struct, emfBlobData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes an OLE blob bytes identifier and type to the data stream
   *
   * This function serializes an Object Linking and Embedding (OLE) blob identifier
   * and its type to the data stream using the cOleStorageId opcode. OLE blobs
   * contain embedded OLE objects from Windows applications.
   *
   * @param dataStream - The data stream to write the OLE blob bytes ID to
   * @param oleBlobBytesId - The OLE blob bytes identifier to write
   * @param oleBlobType - The type of OLE blob data
   * @param resultObject - Object containing context information for serialization
   */
  static WriteOleBlobBytesID(dataStream, oleBlobBytesId, oleBlobType, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cOleStorageId);
    const oleBlobData = {
      value: oleBlobBytesId,
      type: oleBlobType
    };
    dataStream.writeStruct(DSConstant.LongValue2Struct, oleBlobData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Gets the index of a font in a font list by name
   *
   * This function searches through a font list to find a font with the specified name
   * and returns its index. If the font is not found, it returns the default font index (0).
   * The index is used when referencing fonts in the file format.
   *
   * @param fontName - The name of the font to find
   * @param fontList - The array of fonts to search through
   * @returns The index of the font in the list, or 0 if not found
   */
  static GetFontID(fontName, fontList) {
    const fontCount = fontList.length;

    for (let fontIndex = 0; fontIndex < fontCount; fontIndex++) {
      if (fontName === fontList[fontIndex].fontName) {
        return fontIndex;
      }
    }

    return 0; // Return default font if not found
  }

  /**
   * Builds a font list for blocks from web fonts
   *
   * This function populates the font list in the result object with font records
   * created from the application's web fonts resource. Each font record includes
   * the font's ID, name, and category. This list is used to reference fonts in
   * blocks and throughout the document.
   *
   * @param resultObject - The result object whose fontlist will be populated
   */
  static BuildBlockFontList(resultObject) {
    const fontCount = DSConstant.WebFonts.length;

    for (let fontIndex = 0; fontIndex < fontCount; fontIndex++) {
      const fontRecord = new ShapeUtil.FontRecord(
        fontIndex,
        DSConstant.WebFonts[fontIndex].Name,
        DSConstant.WebFonts[fontIndex].Category
      );

      resultObject.fontlist.push(fontRecord);
    }
  }

  /**
   * Converts a font record to a Windows logical font structure
   *
   * This function translates an internal font record object into a Windows logical font
   * structure that can be used in file formats. It maps font types to Windows font family
   * constants, calculates height values based on font size, and applies text styling
   * attributes like bold and italic.
   *
   * @param fontRecord - The font record containing font name, type, size and face attributes
   * @param fontIndex - The index of the font in the font list
   * @param resultObject - Object containing coordinate scale factors and other context
   * @returns A Windows logical font structure ready for serialization
   */
  static FontRecToLogFont(fontRecord, fontIndex, resultObject) {
    let fontFamilyValue = 0;

    // Map font type to Windows font family constants
    switch (fontRecord.fontType) {
      case 'serif':
        fontFamilyValue = DSConstant.FontFamily.FF_ROMAN;
        break;
      case 'sanserif':
        fontFamilyValue = DSConstant.FontFamily.FF_SWISS;
        break;
      case 'fixed':
        fontFamilyValue = DSConstant.FontFamily.FF_MODERN;
        break;
      case 'script':
        fontFamilyValue = DSConstant.FontFamily.FF_SCRIPT;
        break;
      case 'decorative':
        fontFamilyValue = DSConstant.FontFamily.FF_DECORATIVE;
        break;
    }

    // Create logical font structure with default values
    const logicalFont = {
      id: fontIndex,
      lfCharSet: 0,
      lfFaceName: fontRecord.fontName,
      lfHeight: -36,                 // Default height value
      lfWidth: 0,                    // Auto-calculated width
      lfEscapement: 0,               // No rotation
      lfOrientation: 0,              // No character rotation
      lfWeight: 400,                 // Normal weight
      lfItalic: 0,                   // No italic
      lfUnderline: 0,                // No underline
      lfStrikeOut: 0,                // No strikeout
      lfOutPrecision: 3,             // DEFAULT_PRECIS
      lfClipPrecision: 2,            // DEFAULT_CLIPPREC
      lfQuality: 1,                  // DRAFT_QUALITY
      lfPitchAndFamily: fontFamilyValue,
      dummy: 0                        // Padding value
    };

    // Apply font size if specified
    if (fontRecord.fontSize) {
      // Convert point size to logical units based on coordinate scale factor
      logicalFont.lfHeight = 100 * fontRecord.fontSize * resultObject.coordScaleFactor / 72;
    }

    // Apply text style attributes (bold, italic) if specified
    if (fontRecord.face) {
      if (fontRecord.face & TextConstant.TextFace.Italic) {
        logicalFont.lfItalic = 1;
      }
      if (fontRecord.face & TextConstant.TextFace.Bold) {
        logicalFont.lfWeight = 700;  // FW_BOLD value
      }
    }

    return logicalFont;
  }

  /**
   * Converts JavaScript text justification values to Windows format constants
   *
   * This function maps the text alignment values used in the JavaScript application
   * to their corresponding Windows text alignment constants used in the file format.
   * It handles horizontal ('left', 'right') and vertical ('top', 'bottom') alignments,
   * with 'center' as the default when no match is found.
   *
   * @param justificationValue - The JavaScript justification value to convert
   * @returns The corresponding Windows text justification constant
   */
  static JSJustToWin(justificationValue) {
    let windowsJustValue;

    switch (justificationValue) {
      case 'top':
        windowsJustValue = TextConstant.TextJust.Top;
        break;
      case 'left':
        windowsJustValue = TextConstant.TextJust.Left;
        break;
      case 'bottom':
        windowsJustValue = TextConstant.TextJust.Bottom;
        break;
      case 'right':
        windowsJustValue = TextConstant.TextJust.Right;
        break;
      default:
        windowsJustValue = TextConstant.TextJust.Center;
    }

    return windowsJustValue;
  }

  /**
   * Writes texture information to the data stream in
   *
   * This function serializes texture definitions and their categories to the data stream.
   * It manages texture categories, dimensions, margins, scaling properties, and embedded
   * image data. For custom (non-standard) textures, it also writes the associated binary
   * blob data to the stream.
   *
   * @param dataStream - The data stream to write texture information to
   * @param textureContainer - Object containing texture definitions and category mappings
   * @param resultObject - Object containing coordinate scale factors and context information
   */
  static WriteTextureList(dataStream, textureContainer, resultObject) {
    // Only proceed if there are textures to write
    if (resultObject.TextureList.length === 0) {
      return;
    }

    const opCodes = DSConstant.OpNameCode;

    // Write texture list header
    const listCodeOffset = ShapeUtil.WriteCode(dataStream, opCodes.oTextureList);
    dataStream.writeUint32(0);
    ShapeUtil.WriteLength(dataStream, listCodeOffset);

    // Collect unique categories used by the textures
    const uniqueCategories = [];
    const textureCount = resultObject.TextureList.length;

    // Find all unique category indices
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
      const texture = textureContainer.Textures[resultObject.TextureList[textureIndex]];
      const categoryIndex = texture.categoryindex;

      if (uniqueCategories.indexOf(categoryIndex) === -1) {
        uniqueCategories.push(categoryIndex);
      }
    }

    // Write category names
    const categoryCount = uniqueCategories.length;
    for (let catIndex = 0; catIndex < categoryCount; catIndex++) {
      ShapeUtil.WriteString(
        dataStream,
        textureContainer.Categories[uniqueCategories[catIndex]],
        opCodes.oTextureCatName,
        resultObject
      );
    }

    // Write each texture definition
    for (let textureIndex = 0; textureIndex < textureCount; textureIndex++) {
      const texture = textureContainer.Textures[resultObject.TextureList[textureIndex]];
      const mappedCategoryIndex = uniqueCategories.indexOf(texture.categoryindex);

      // Create and write texture structure
      const textureData = {
        dim: {
          x: ShapeUtil.ToSDWinCoords(texture.dim.x, resultObject.coordScaleFactor),
          y: ShapeUtil.ToSDWinCoords(texture.dim.y, resultObject.coordScaleFactor)
        },
        mr: {
          left: texture.mr.left,
          top: texture.mr.top,
          right: texture.mr.right,
          bottom: texture.mr.bottom
        },
        imagetype: texture.imagetype,
        flags: texture.flags
      };

      // Write texture properties
      let codeOffset = ShapeUtil.WriteCode(dataStream, opCodes.oTexture);
      dataStream.writeStruct(DSConstant.TextureStruct, textureData);
      ShapeUtil.WriteLength(dataStream, codeOffset);

      // Write texture scaling information
      const textureScaleData = {
        categoryindex: mappedCategoryIndex,
        units: texture.TextureScale.Units,
        scale: texture.TextureScale.Scale,
        rwidth: texture.TextureScale.RWidth,
        alignment: texture.TextureScale.AlignmentScalar,
        flags: texture.TextureScale.Flags
      };

      codeOffset = ShapeUtil.WriteCode(dataStream, opCodes.oTextureExtra);
      dataStream.writeStruct(DSConstant.TextureExtraStruct, textureScaleData);
      ShapeUtil.WriteLength(dataStream, codeOffset);

      // Write texture name
      ShapeUtil.WriteString(dataStream, texture.name, opCodes.oTextureName, resultObject);

      // Write binary data for custom textures
      if (!(texture.flags & DSConstant.TextureFlags.SD_Tx_Std) && texture.BlobBytes) {
        ShapeUtil.WriteBlob(dataStream, texture.BlobBytes, opCodes.oTextureData);
      }
    }

    // Write end marker
    dataStream.writeUint16(opCodes.oTextureListEnd);
  }

  /**
   * Writes drawing objects and their properties to a data stream in
   *
   * This function serializes a complete drawing to the data stream, including styles,
   * layers, text objects, connectors, and all visual elements. It handles the proper
   * sequence of operations needed to create a valid  file structure, and
   * processes object relationships such as attachments and connections.
   *
   * @param dataStream - The data stream to write drawing content to
   * @param resultObject - Object containing the objects to write and context information
   */
  static WriteDraw(dataStream, resultObject) {
    let sessionData;
    let uniqueMapLength;
    let uniqueMapIndex;
    let currentObject;
    let connectorObject;
    let textAlign;
    let hookData;
    let hookIndex;
    let connectorHookCount;
    let connectorHook;
    let lastConnectorIndex = -1;
    let connectorBlockId = -1;
    let textObject = {};
    let skipCount = OptConstant.ConnectorDefines.NSkip;

    // Build style list for all objects to be written
    ShapeUtil.BuildStyleList(resultObject);

    // Get session data reference
    sessionData = resultObject.sdp;

    // Write primary drawing structure and elements
    ShapeUtil.WriteCDraw12(dataStream, resultObject);
    ShapeUtil.WriteStyle(dataStream, sessionData.def.style, true, resultObject, null);
    ShapeUtil.WriteSDLine(
      dataStream,
      sessionData.def.style.Line,
      resultObject,
      DSConstant.OpNameCode.cBeginLine,
      null
    );
    ShapeUtil.WriteSDFill(dataStream, sessionData.background, resultObject);
    ShapeUtil.WriteRulers(dataStream, resultObject);
    ShapeUtil.WriteRecentList(dataStream, resultObject);
    ShapeUtil.WriteLayers(dataStream, resultObject);
    ShapeUtil.WriteLinks(dataStream, resultObject);
    ShapeUtil.WriteTextureList(dataStream, T3Gv.opt.TextureList, resultObject);
    ShapeUtil.WriteStyleList(dataStream, resultObject.lpStyles, false, resultObject);

    // Create text object template if text style index is defined
    if (resultObject.TextStyleIndex >= 0) {
      textObject.Frame = {
        x: 0,
        y: 0,
        width: 100,
        height: 30
      };

      let rectObject = new Instance.Shape.Rect(textObject);
      rectObject.tstyleindex = resultObject.TextStyleIndex;
      rectObject.flags = Utils2.SetFlag(rectObject.flags, NvConstant.ObjFlags.Assoc, true);
      rectObject.flags = Utils2.SetFlag(rectObject.flags, NvConstant.ObjFlags.TextOnly, true);
      rectObject.TextGrow = NvConstant.TextGrowBehavior.Horizontal;
      rectObject.hooks.push(new Hook(0, null, -1, 0, {
        x: 0,
        y: 0
      }));
      rectObject.StyleRecord = Utils1.DeepCopy(resultObject.lpStyles[resultObject.TextStyleIndex]);
    }

    // Process each object in the unique map
    uniqueMapLength = resultObject.UniqueMap.length;
    for (uniqueMapIndex = 0; uniqueMapIndex < uniqueMapLength; uniqueMapIndex++) {
      let objectId = resultObject.UniqueMap[uniqueMapIndex];

      // Handle text objects (negative IDs represent text objects)
      if (objectId < 0) {
        rectObject.DataID = -objectId;
        rectObject.TextFlags = 0;
        rectObject.associd = connectorBlockId;
        rectObject.TextGrow = NvConstant.TextGrowBehavior.Horizontal;
        rectObject.Frame.width = 100;
        rectObject.inside.width = 100;
        rectObject.trect.width = 100;
        rectObject.r.width = 100;

        if (lastConnectorIndex >= 0) {
          // Process connector text
          rectObject.associd = connectorBlockId;
          connectorObject = DataUtil.GetObjectPtr(resultObject.UniqueMap[lastConnectorIndex], false);

          let isLinearConnector = connectorObject.arraylist.styleflags & OptConstant.AStyles.Linear;
          textAlign = ShapeUtil.TextAlignToWin(connectorObject.TextAlign);
          hookData = ShapeUtil.SetHookByJust(textAlign.just, textAlign.vjust, rectObject.hooks[0].connect);

          rectObject.hooks[0].hookpt = hookData.hookpt;
          rectObject.hooks[0].objid = resultObject.UniqueMap[lastConnectorIndex];

          let textId = -objectId;
          connectorHookCount = connectorObject.arraylist.hook.length;
          rectObject.hooks[0].connect.y = 1;

          // Find the hook with matching text ID
          for (hookIndex = 0; hookIndex < connectorHookCount; hookIndex++) {
            connectorHook = connectorObject.arraylist.hook[hookIndex];

            if (isLinearConnector && hookIndex >= skipCount) {
              if (!(hookIndex < connectorHookCount - 1)) break;
              connectorHook = connectorObject.arraylist.hook[hookIndex + 1];
            }

            if (connectorHook.textid === textId) {
              rectObject.hooks[0].connect.x = hookIndex >= skipCount ? hookIndex - skipCount : -hookIndex;
              break;
            }
          }

          // Set fill type based on vertical justification
          if (textAlign.vjust === TextConstant.TextJust.Center) {
            rectObject.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Solid;
          } else {
            rectObject.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
          }
        } else {
          // Handle text for non-connector objects
          currentObject = DataUtil.GetObjectPtr(resultObject.UniqueMap[uniqueMapIndex - 1], false);

          if (currentObject && currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
            // Handle line text
            textAlign = ShapeUtil.TextAlignToWin(currentObject.TextAlign);
            hookData = ShapeUtil.SetHookByJust(textAlign.just, textAlign.vjust, rectObject.hooks[0].connect);
            rectObject.hooks[0].hookpt = hookData.hookpt;
            rectObject.hooks[0].objid = resultObject.UniqueMap[uniqueMapIndex - 1];
            rectObject.StyleRecord.Fill.Paint = $.extend(true, {}, currentObject.StyleRecord.Fill.Paint);

            if (currentObject.TextGrow === NvConstant.TextGrowBehavior.Vertical) {
              rectObject.TextGrow = currentObject.TextGrow;
              rectObject.Frame.width = currentObject.TextWrapWidth;
              rectObject.inside.width = currentObject.TextWrapWidth;
              rectObject.trect.width = currentObject.TextWrapWidth;
              rectObject.r.width = currentObject.TextWrapWidth;
            }
          } else if (currentObject && currentObject.TextFlags & NvConstant.TextFlags.AttachB) {
            // Handle bottom-attached text
            rectObject.hooks[0].hookpt = OptConstant.HookPts.KTC;
            rectObject.hooks[0].connect = new Point(
              OptConstant.Common.DimMax / 2,
              OptConstant.Common.DimMax
            );
            rectObject.hooks[0].objid = resultObject.UniqueMap[uniqueMapIndex - 1];
            rectObject.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
          } else if (currentObject && currentObject.TextFlags & NvConstant.TextFlags.AttachA) {
            // Handle top-attached text
            rectObject.hooks[0].hookpt = OptConstant.HookPts.KBC;
            rectObject.hooks[0].connect = new Point(OptConstant.Common.DimMax / 2, 0);
            rectObject.hooks[0].objid = resultObject.UniqueMap[uniqueMapIndex - 1];
            rectObject.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent;
          }

          currentObject = rectObject;
        }
      } else {
        // Handle regular objects
        currentObject = DataUtil.GetObjectPtr(objectId, false);

        if (currentObject) {
          if (currentObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
            lastConnectorIndex = uniqueMapIndex;
            connectorBlockId = currentObject.BlockID;
          } else {
            lastConnectorIndex = -1;
            connectorBlockId = currentObject.BlockID;
          }
        }
      }

      // Write the object to the data stream
      if (currentObject) {
        ShapeUtil.WriteObject(dataStream, uniqueMapIndex, currentObject, resultObject);
      }
    }

    // If not writing blocks or selections, additional processing could be done here
    if (resultObject.WriteBlocks == 0 && resultObject.selectonly == 0) {
      // Additional processing (commented in original)
    }

    // Write the drawing end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cDraw12End);
  }

  /**
   * Writes ruler configuration information to the data stream
   *
   * This function serializes ruler settings including units, scale, grid intervals,
   * and display preferences to the  format. The ruler configuration controls
   * how measurement guides and grid lines appear in the document.
   *
   * @param dataStream - The data stream to write ruler information to
   * @param resultObject - Object containing ruler configuration and coordinate scale factors
   */
  static WriteRulers(dataStream, resultObject) {
    const rulerData = {
      show: resultObject.rulerConfig.show,
      inches: resultObject.rulerConfig.useInches,
      Major: ShapeUtil.ToSDWinCoords(resultObject.rulerConfig.major, resultObject.coordScaleFactor),
      MajorScale: resultObject.rulerConfig.majorScale,
      MinorDenom: resultObject.rulerConfig.nTics,
      units: resultObject.rulerConfig.units,
      dp: resultObject.rulerConfig.dp,
      originx: resultObject.rulerConfig.originx,
      originy: resultObject.rulerConfig.originy,
      showpixels: resultObject.rulerConfig.showpixels,
      fractionaldenominator: resultObject.rulerConfig.fractionaldenominator
    };

    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.oRuler);
    dataStream.writeStruct(DSConstant.RulerStruct52, rulerData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes recently used symbols list to the data stream
   *
   * This function serializes the list of recently used symbols to the  format.
   * Each symbol record includes its ID, display settings (menu visibility), and content title.
   * This allows applications to maintain a history of frequently accessed symbols.
   *
   * @param dataStream - The data stream to write recent symbols list to
   * @param resultObject - Object containing session data with recent symbols information
   */
  static WriteRecentList(dataStream, resultObject) {
    // Only write recent symbols if they exist and we're not writing a group block
    if (
      resultObject.sdp.RecentSymbols &&
      resultObject.sdp.RecentSymbols.length > 0 &&
      resultObject.WriteGroupBlock === 0
    ) {
      // Write list begin marker
      const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cRecentSymbolsBegin);
      ShapeUtil.WriteLength(dataStream, codeOffset);

      const symbolCount = resultObject.sdp.RecentSymbols.length;

      // Write each recent symbol entry
      for (let symbolIndex = 0; symbolIndex < symbolCount; symbolIndex++) {
        const symbolItem = resultObject.sdp.RecentSymbols[symbolIndex];

        // Write symbol identifier
        ShapeUtil.WriteString(
          dataStream,
          symbolItem.ItemId,
          DSConstant.OpNameCode.cRecentSymbolId,
          resultObject
        );

        // Write menu visibility setting
        const menuVisibilitySetting = symbolItem.NoMenu ? '1' : '0';
        ShapeUtil.WriteString(
          dataStream,
          menuVisibilitySetting,
          DSConstant.OpNameCode.cRecentSymbolNoMenu,
          resultObject
        );

        // Write symbol title
        ShapeUtil.WriteString(
          dataStream,
          symbolItem.ContentTitle,
          DSConstant.OpNameCode.cRecentSymbolName,
          resultObject
        );
      }

      // Write list end marker
      dataStream.writeUint16(DSConstant.OpNameCode.cRecentSymbolsEnd);
    }
  }

  /**
   * Writes layer information to a data stream in
   *
   * This function serializes layer definitions to the data stream, including
   * layer flags, names, types, and object lists. It creates a structured
   * representation of all drawing layers with their properties.
   *
   * @param dataStream - The data stream to write layer information to
   * @param resultObject - Object containing the layer manager and context information
   */
  static WriteLayers(dataStream, resultObject) {
    const layerCount = resultObject.tLMB.nlayers;
    const layerArray = resultObject.tLMB.layers;
    let currentLayer = null;
    const layerListData = {
      n: 0,
      zList: []
    };

    // Write layer begin marker
    const beginCodeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginLayer);
    ShapeUtil.WriteLength(dataStream, beginCodeOffset);

    // Write each layer definition
    for (let layerIndex = 0; layerIndex < layerCount; ++layerIndex) {
      currentLayer = layerArray[layerIndex];

      // Write layer flags
      const flagsCodeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cLayerFlags);
      dataStream.writeUint32(currentLayer.flags);
      ShapeUtil.WriteLength(dataStream, flagsCodeOffset);

      // Write layer name
      ShapeUtil.WriteString(
        dataStream,
        currentLayer.name,
        DSConstant.OpNameCode.cLayerName,
        resultObject
      );

      // Write layer type
      const typeCodeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cLayerType);
      dataStream.writeUint32(currentLayer.layertype);
      ShapeUtil.WriteLength(dataStream, typeCodeOffset);

      // Write layer object list when writing blocks
      if (resultObject.WriteBlocks) {
        layerListData.n = currentLayer?.zList?.length ?? 0;
        layerListData.zList = currentLayer?.zList ?? [];

        const listCodeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cLayerList);
        dataStream.writeStruct(DSConstant.LayerListStruct, layerListData);
        ShapeUtil.WriteLength(dataStream, listCodeOffset);
      }
    }

    // Write layer end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndLayer);
  }

  /**
   * Writes link information to a data stream in
   *
   * This function serializes connection links between objects to the data stream,
   * including both standard object links and text-specific links. For each link,
   * it writes the source and target object IDs, connection flags, and cell ID if applicable.
   * The links define relationships and connections between objects in the document.
   *
   * @param dataStream - The data stream to write link information to
   * @param resultObject - Object containing links array and context information
   */
  static WriteLinks(dataStream, resultObject) {
    // Get links from the result object
    const standardLinks = resultObject.links;
    const textLinks = resultObject.textlinks;
    const standardLinkCount = standardLinks.length;
    const textLinkCount = textLinks.length;
    let linkListData = {};
    let cellId;
    let linkData;

    // Only write links if there are some or we're writing blocks format
    if (standardLinkCount || textLinkCount || resultObject.WriteBlocks) {
      // Create link list structure with total count and link array
      linkListData = {
        n: standardLinkCount + textLinkCount,
        size: 14,
        links: []
      };

      // Process standard object links
      for (let linkIndex = 0; linkIndex < standardLinkCount; linkIndex++) {
        // Use SED_DNULL if cellId is null
        cellId = standardLinks[linkIndex].cellid;
        if (cellId == null) {
          cellId = OptConstant.Common.DNull;
        }

        // Create link data structure for this link
        linkData = {
          targetid: ShapeUtil.BlockIDtoUniqueID(standardLinks[linkIndex].targetid, resultObject),
          tindex: -1,
          hookid: ShapeUtil.BlockIDtoUniqueID(standardLinks[linkIndex].hookid, resultObject),
          hindex: -1,
          flags: standardLinks[linkIndex].flags,
          cellid: cellId
        };

        // Add link to the collection
        linkListData.links.push(linkData);
      }

      // Process text links
      for (let linkIndex = 0; linkIndex < textLinkCount; linkIndex++) {
        // Text links always use SED_DNULL for cellId
        cellId = OptConstant.Common.DNull;

        // Create link data structure for this text link
        linkData = {
          targetid: textLinks[linkIndex].targetid,
          tindex: -1,
          hookid: textLinks[linkIndex].hookid,
          hindex: -1,
          flags: 0,
          cellid: cellId
        };

        // Add text link to the collection
        linkListData.links.push(linkData);
      }

      // Write the links to the data stream
      const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDrawLink);
      dataStream.writeStruct(DSConstant.LinkListStruct, linkListData);
      ShapeUtil.WriteLength(dataStream, codeOffset);
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

      // Handle table cell styles if this object has a table
      // tableObject = currentObject.GetTable(false);
      // if (tableObject) {
      //   cellCount = tableObject.cells.length;

      //   // Process each cell's style
      //   for (cellIndex = 0; cellIndex < cellCount; cellIndex++) {
      //     currentCell = tableObject.cells[cellIndex];

      //     // Create style from cell properties
      //     tableCellStyle.Name = currentCell.stylename;
      //     tableCellStyle.Fill = Utils1.DeepCopy(currentCell.fill);
      //     tableCellStyle.Line = Utils1.DeepCopy(currentCell.hline);
      //     tableCellStyle.Text = Utils1.DeepCopy(currentCell.Text);

      //     // Add cell's style to the style list
      //     currentCell.tstyleindex = addUniqueStyle(tableCellStyle);
      //   }
      // }

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
   * Writes a drawing document structure to a data stream in
   *
   * This function serializes the core drawing document structure including dimensions,
   * default styles, object counts, text properties, and drawing settings. It creates
   * the main container that holds all graphical elements, styles, and relationships
   * between objects.
   *
   * @param dataStream - The data stream to write the drawing structure to
   * @param resultObject - Object containing drawing properties, style information, and serialization context
   */
  static WriteCDraw12(dataStream, resultObject) {
    // Calculate sizes and reference document components
    const objectCount = resultObject.UniqueMap.length;
    const linkCount = resultObject.links.length + resultObject.textlinks.length;
    const sessionData = resultObject.sdp;
    const layerManager = resultObject.tLMB;

    // Get selected object ID, converting if writing blocks
    const selectedObjectId = sessionData.tselect >= 0
      ? (resultObject.WriteBlocks ? sessionData.tselect : ShapeUtil.BlockIDtoUniqueID(sessionData.tselect, resultObject))
      : -1;

    // Convert snap alignment flag to numeric value
    const snapAlignFlag = sessionData.centersnapalign ? 1 : 0;

    // Prepare font information
    const fontList = [];
    fontList.push(sessionData.def.lf);
    const logicalFont = ShapeUtil.FontRecToLogFont(fontList[0], 0, resultObject);

    // Process arrow styles and flags
    let startArrow = sessionData.d_sarrow;
    if (sessionData.d_sarrowdisp) {
      startArrow += DSConstant.ArrowMasks.ARROW_DISP;
    }

    let endArrow = sessionData.d_earrow;
    if (sessionData.d_earrowdisp) {
      endArrow += DSConstant.ArrowMasks.ARROW_DISP;
    }

    // Create default graph settings
    const defaultGraph = new SDGraphDefault();

    // Create the drawing structure with all properties
    const drawingData = {
      nobjects: objectCount,
      ngroups: 0,
      nlinks: linkCount,
      dim: {
        x: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.sdp.dim.y, resultObject.coordScaleFactor)
      },
      flags: resultObject.sdp.flags,
      tselect: selectedObjectId,
      unique: objectCount,
      dupdisp: {
        x: ShapeUtil.ToSDWinCoords(resultObject.sdp.dupdisp.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.sdp.dupdisp.y, resultObject.coordScaleFactor)
      },
      just: ShapeUtil.JSJustToWin(sessionData.def.just),
      vjust: ShapeUtil.JSJustToWin(sessionData.def.vjust),
      d_sarrow: startArrow,
      d_earrow: endArrow,
      d_arrowsize: sessionData.d_arrowsize,
      snapalign: snapAlignFlag,
      lf: logicalFont,
      hopstyle: sessionData.hopstyle,
      hopdim: {
        x: ShapeUtil.ToSDWinCoords(resultObject.sdp.hopdim.x, resultObject.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(resultObject.sdp.hopdim.y, resultObject.coordScaleFactor)
      },
      defflags: sessionData.def.flags,
      dimensions: sessionData.dimensions,
      shapedimensions: sessionData.shapedimensions,
      activelayer: layerManager.activelayer,
      tmargins: {
        left: ShapeUtil.ToSDWinCoords(sessionData.def.tmargins.left, resultObject.coordScaleFactor),
        right: ShapeUtil.ToSDWinCoords(sessionData.def.tmargins.right, resultObject.coordScaleFactor),
        top: ShapeUtil.ToSDWinCoords(sessionData.def.tmargins.top, resultObject.coordScaleFactor),
        bottom: ShapeUtil.ToSDWinCoords(sessionData.def.tmargins.bottom, resultObject.coordScaleFactor)
      },
      textgrow: sessionData.def.textgrow,
      textflags: sessionData.def.textflags,
      fsize_min: sessionData.def.fsize_min,
      styleindex: -1,
      h_arraywidth: ShapeUtil.ToSDWinCoords(sessionData.def.h_arraywidth, resultObject.coordScaleFactor),
      v_arraywidth: ShapeUtil.ToSDWinCoords(sessionData.def.v_arraywidth, resultObject.coordScaleFactor),
      lastcommand: sessionData.def.lastcommand,
      graphtype: defaultGraph.type,
      graphflags: defaultGraph.flags,
      graphpointflags: defaultGraph.pointflags,
      graphcataxisflags: defaultGraph.catAxisflags,
      graphmagaxisflags: defaultGraph.magAxisflags,
      graphlegendtype: defaultGraph.legendType,
      graphlegendlayoutflags: defaultGraph.legendlayoutflags,
      graphimagevaluerep: defaultGraph.imagevaluerep,
      graphquadrant: defaultGraph.quadrant,
      arraywd: ShapeUtil.ToSDWinCoords(sessionData.def.arraywd, resultObject.coordScaleFactor),
      arrayht: ShapeUtil.ToSDWinCoords(sessionData.def.arrayht, resultObject.coordScaleFactor),
      sequenceflags: sessionData.sequenceflags,
      chartdirection: sessionData.chartdirection,
      copyPasteTrialVers: sessionData.copyPasteTrialVers,
      taskmanagementflags: sessionData.taskmanagementflags,
      taskdays: sessionData.taskdays,
      moreflags: sessionData.moreflags,
      fieldmask: sessionData.fieldmask,
      wallThickness: sessionData.def.wallThickness,
      curveparam: sessionData.def.curveparam,
      rrectparam: sessionData.def.rrectparam
    };

    // Write appropriate structure based on format
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDraw12);
    if (resultObject.WriteWin32) {
      dataStream.writeStruct(DSConstant.CDraw12Struct364, drawingData);
    } else {
      dataStream.writeStruct(DSConstant.CDraw12Struct440, drawingData);
    }

    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes style information to a data stream in
   *
   * This function serializes style definitions including name, fill properties,
   * line properties, text formatting, and visual effects. It organizes the style
   * components in the proper sequence for the file format, handling both standard
   * and border style variants.
   *
   * @param dataStream - The data stream to write the style information to
   * @param styleRecord - The style record containing properties to serialize
   * @param useBorder - Flag indicating whether to use Border or Line properties
   * @param resultObject - Object containing coordinate scale factors and context information
   * @param styleObject - Optional object associated with the style (used for special formatting)
   */
  static WriteStyle(dataStream, styleRecord, useBorder, resultObject, styleObject) {
    // Write style begin code and name
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginStyle);
    dataStream.writeUCS2String(styleRecord.Name, T3DataStream.LITTLE_ENDIAN, styleRecord.Name.length + 1);
    ShapeUtil.WriteLength(dataStream, codeOffset);

    // Write fill information if present
    if (styleRecord.Fill) {
      ShapeUtil.WriteSDFill(dataStream, styleRecord.Fill, resultObject);
    }

    // Write line or border information based on useBorder flag
    if (useBorder) {
      ShapeUtil.WriteSDLine(
        dataStream,
        styleRecord.Border,
        resultObject,
        DSConstant.OpNameCode.cBeginLine,
        styleObject
      );
    } else {
      ShapeUtil.WriteSDLine(
        dataStream,
        styleRecord.Line,
        resultObject,
        DSConstant.OpNameCode.cBeginLine,
        styleObject
      );
    }

    // Write text formatting information
    ShapeUtil.WriteSDTxf(dataStream, styleRecord.Text, resultObject);

    // Write outside effect information
    ShapeUtil.WriteOutside(dataStream, styleRecord.OutsideEffect);

    // Write style end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndStyle);
  }

  /**
   * Writes a list of styles to the data stream in
   *
   * This function serializes an array of style definitions to the data stream,
   * writing each style in sequence with proper begin/end markers. Styles define
   * the visual appearance of objects including fills, lines, and text formatting.
   *
   * @param dataStream - The data stream to write the style list to
   * @param styleArray - Array of style objects to be written
   * @param useBorder - Flag indicating whether to use Border or Line properties
   * @param resultObject - Object containing context information for serialization
   */
  static WriteStyleList(dataStream, styleArray, useBorder, resultObject) {
    let styleCount;
    let styleIndex;

    // Write style list begin marker
    ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginStyleList);

    // Write each style in the array
    styleCount = styleArray.length;
    for (styleIndex = 0; styleIndex < styleCount; styleIndex++) {
      ShapeUtil.WriteStyle(dataStream, styleArray[styleIndex], useBorder, resultObject, null);
    }

    // Write style list end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndStyleList);
  }

  /**
   * Writes fill information to a data stream in
   *
   * This function serializes fill properties including fill type, color, pattern,
   * and special effects. It handles solid fills, gradients, textures, and hatching
   * patterns that define how shapes are filled.
   *
   * @param dataStream - The data stream to write the fill information to
   * @param fillData - The fill data containing paint properties and effects
   * @param resultObject - Object containing context information and color mappings
   */
  static WriteSDFill(dataStream, fillData, resultObject) {
    // Write fill begin marker
    ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginFill);

    // Write paint properties with white as default color
    ShapeUtil.WritePaint(dataStream, fillData.Paint, NvConstant.Colors.White, resultObject);

    // Write hatch pattern if present
    if (fillData.Hatch) {
      const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cHatch);
      dataStream.writeUint32(fillData.Hatch);
      ShapeUtil.WriteLength(dataStream, codeOffset);
    }

    // Write fill effect if present
    if (fillData.FillEffect) {
      ShapeUtil.WriteEffect(dataStream, fillData, fillData.FillEffect);
    }

    // Write fill end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndFill);
  }

  /**
   * Writes line information to a data stream in
   *
   * This function serializes line properties including thickness, pattern, color,
   * and special effects. It handles different line types, including filled lines
   * for special object types like Gantt bars and floor plan walls. It applies
   * appropriate scaling to coordinate values.
   *
   * @param dataStream - The data stream to write the line information to
   * @param lineData - The line data containing style properties
   * @param resultObject - Object containing coordinate scale factors and context information
   * @param opCode - The operation code for the line type
   * @param styleObject - Optional object associated with the style (for special formatting)
   */
  static WriteSDLine(dataStream, lineData, resultObject, opCode, styleObject) {
    let linePattern;
    let lineThickness;
    let fillLineThickness = 0;

    // Write line begin marker with the specified opcode
    const codeOffset = ShapeUtil.WriteCode(dataStream, opCode);

    // Scale line thickness using coordinate scale factor
    lineThickness = ShapeUtil.ToSDWinCoords(lineData.Thickness, resultObject.coordScaleFactor);

    // Ensure minimum thickness for visible lines
    if (lineThickness === 0 && lineData.Thickness > 0) {
      lineThickness = 1;
    }

    // Special handling for Gantt bars - use filled line
    if (styleObject && styleObject.objecttype === NvConstant.FNObjectTypes.SD_OBJT_GANTT_BAR) {
      fillLineThickness = lineThickness / 2;
      lineThickness = 0;
      linePattern = resultObject.WriteWin32
        ? DSConstant.WinLinePatterns.SEP_FilledLine
        : DSConstant.LinePatternData.indexOf(lineData.LinePattern) + 1;
    }
    // Normal line pattern handling
    else {
      linePattern = DSConstant.LinePatternData.indexOf(lineData.LinePattern) + 1;
      if (linePattern < 1) {
        linePattern = 1;  // Default to solid line if pattern not found
      }
    }

    // Special handling for floor plan walls
    if (styleObject && styleObject.objecttype === NvConstant.FNObjectTypes.FlWall &&
      fillLineThickness === 0 &&
      (styleObject.StyleRecord.Line.LinePattern === DSConstant.WinLinePatterns.SEP_Solid ||
        styleObject.StyleRecord.Line.LinePattern === DSConstant.WinLinePatterns.SEP_None)) {
      fillLineThickness = lineThickness / 2;
      lineThickness = 0;
      linePattern = resultObject.WriteWin32
        ? DSConstant.WinLinePatterns.SEP_FilledLine
        : DSConstant.LinePatternData.indexOf(lineData.LinePattern) + 1;
    }

    // Create and write line data structure
    const lineStruct = {
      thickness: lineThickness,
      pattern: linePattern
    };

    // Write appropriate structure based on format
    if (resultObject.WriteWin32) {
      dataStream.writeStruct(DSConstant.BeginLineStruct8, lineStruct);
    } else {
      dataStream.writeStruct(DSConstant.BeginLineStruct14, lineStruct);
    }

    ShapeUtil.WriteLength(dataStream, codeOffset);

    // Write line paint properties with black as default color
    ShapeUtil.WritePaint(dataStream, lineData.Paint, NvConstant.Colors.Black, resultObject);

    // Write filled line data if thickness is specified
    if (fillLineThickness) {
      const filledLineData = {
        bthick: fillLineThickness,
        color: ShapeUtil.HTMLColorToWin(lineData.Paint.Color)
      };

      const filledLineOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cFilledLine);
      dataStream.writeStruct(DSConstant.FilledLineStruct, filledLineData);
      ShapeUtil.WriteLength(dataStream, filledLineOffset);
    }

    // Write hatch pattern if present
    if (lineData.Hatch) {
      const hatchOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cHatch);
      dataStream.writeUint32(lineData.Hatch);
      ShapeUtil.WriteLength(dataStream, hatchOffset);
    }

    // Write line effect if present
    if (lineData.LineEffect) {
      ShapeUtil.WriteEffect(dataStream, lineData, lineData.LineEffect);
    }

    // Write line end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndLine);
  }

  /**
   * Writes text formatting information to a data stream in
   *
   * This function serializes text formatting properties including font, size, style,
   * and color effects to the data stream. It handles the writing of font ID references,
   * text sizes, style attributes (bold, italic, etc.), and any special text effects.
   *
   * @param dataStream - The data stream to write text formatting information to
   * @param textFormatting - The text formatting properties to serialize
   * @param resultObject - Object containing font lists, coordinate scale factors, and context information
   */
  static WriteSDTxf(dataStream, textFormatting, resultObject) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginTextf);

    const textFormattingData = {
      fontid: ShapeUtil.GetFontID(textFormatting.FontName, resultObject.fontlist),
      fsize: textFormatting.FontSize,
      face: textFormatting.Face
    };

    dataStream.writeStruct(DSConstant.BeginTextfStruct, textFormattingData);
    ShapeUtil.WriteLength(dataStream, codeOffset);

    // Write text color properties
    ShapeUtil.WritePaint(dataStream, textFormatting.Paint, NvConstant.Colors.Black, resultObject);

    // Write text effects if present
    if (textFormatting.Effect.OutsideType) {
      ShapeUtil.WriteOutside(dataStream, textFormatting.Effect);
    }

    // Write text formatting end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndTextf);
  }

  /**
   * Writes outside effect information to a data stream in
   *
   * This function serializes outside effects such as shadows, glows, or outlines to the data stream.
   * It handles effect type, extent dimensions, colors, and effect-specific parameters.
   * Outside effects provide visual enhancements to text and shape objects.
   *
   * @param dataStream - The data stream to write the outside effect information to
   * @param outsideEffect - The outside effect properties to serialize
   */
  static WriteOutside(dataStream, outsideEffect) {
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cOutSide);

    // Ensure color is properly formatted
    if (typeof outsideEffect.Color !== 'string') {
      outsideEffect.Color = null;
    }

    // Get color value, using black as default if no color specified
    const colorValue = outsideEffect.Color
      ? ShapeUtil.HTMLColorToWin(outsideEffect.Color)
      : ShapeUtil.HTMLColorToWin(NvConstant.Colors.Black);

    // Create outside effect data structure
    const outsideEffectData = {
      outsidetype: outsideEffect.OutsideType,
      extent: {
        left: outsideEffect.OutsideExtent_Left,
        top: outsideEffect.OutsideExtent_Top,
        right: outsideEffect.OutsideExtent_Right,
        bottom: outsideEffect.OutsideExtent_Bottom
      },
      color: colorValue,
      lparam: outsideEffect.LParam,
      wparam: outsideEffect.WParam
    };

    // Write the effect data and length
    dataStream.writeStruct(DSConstant.OutSideEffectStruct, outsideEffectData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes paint information to a data stream in
   *
   * This function serializes paint properties including fill type, color, gradient information,
   * and textures to the data stream. It handles solid colors, gradients, rich gradients
   * (with multiple color stops), and texture fills with proper opacity handling.
   *
   * @param dataStream - The data stream to write paint information to
   * @param paintData - The paint data containing fill type, colors, and other properties
   * @param defaultColor - Default color to use if no color is specified
   * @param resultObject - Object containing texture lists, gradient definitions, and context info
   */
  static WritePaint(dataStream, paintData, defaultColor, resultObject) {
    // Write paint begin marker
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cBeginPaint);

    // Use default color if none provided
    if (paintData.Color == null) {
      paintData.Color = defaultColor;
    }

    // Create basic paint properties structure
    const paintStruct = {
      filltype: paintData.FillType,
      color: ShapeUtil.HTMLColorToWin(paintData.Color, paintData.Opacity)
    };

    // Write paint properties and length
    dataStream.writeStruct(DSConstant.BeginPaintStruct, paintStruct);
    ShapeUtil.WriteLength(dataStream, codeOffset);

    // Set default end color if none provided
    if (paintData.EndColor == null) {
      paintData.EndColor = NvConstant.Colors.White;
    }

    // Write additional information based on fill type
    switch (paintData.FillType) {
      case NvConstant.FillTypes.Gradient:
        // Write standard two-color gradient
        const gradientData = {
          ecolor: ShapeUtil.HTMLColorToWin(paintData.EndColor, paintData.EndOpacity),
          gradientflags: paintData.GradientFlags
        };

        const gradientOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cGradient);
        dataStream.writeStruct(DSConstant.GradientStruct, gradientData);
        ShapeUtil.WriteLength(dataStream, gradientOffset);
        break;

      case NvConstant.FillTypes.RichGradient:
        // Write multi-stop rich gradient
        const richGradient = resultObject.richGradients[paintData.GradientFlags];

        if (richGradient) {
          const stopCount = richGradient.stops.length;

          // Write rich gradient header
          const richGradientData = {
            gradienttype: richGradient.gradienttype,
            angle: richGradient.angle,
            nstops: stopCount
          };

          const richGradientOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cRichGradient);
          dataStream.writeStruct(DSConstant.RichGradientStruct, richGradientData);
          ShapeUtil.WriteLength(dataStream, richGradientOffset);

          // Write each gradient stop
          for (let stopIndex = 0; stopIndex < stopCount; stopIndex++) {
            const stopData = {
              color: ShapeUtil.HTMLColorToWin(richGradient.stops[stopIndex].color, richGradient.stops[stopIndex].opacity),
              stop: richGradient.stops[stopIndex].stop
            };

            const stopOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cRichGradientStop);
            dataStream.writeStruct(DSConstant.RichGradientStopStruct, stopData);
            ShapeUtil.WriteLength(dataStream, stopOffset);
          }
        }
        break;

      case NvConstant.FillTypes.Texture:
        // Write texture fill
        const textureOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTexture);
        let textureId = paintData.Texture;

        // Convert texture name to index if not in block-writing mode
        if (!resultObject.WriteBlocks) {
          textureId = resultObject.TextureList.indexOf(textureId);
          if (textureId < 0) {
            textureId = 0; // Use default texture if not found
          }
        }

        dataStream.writeUint32(textureId);
        ShapeUtil.WriteLength(dataStream, textureOffset);
        break;
    }

    // Write paint end marker
    dataStream.writeUint16(DSConstant.OpNameCode.cEndPaint);
  }

  /**
   * Converts shape-specific parameters to  values with proper scaling
   *
   * This function handles the conversion of shape parameters to the appropriate  values,
   * applying coordinate scaling based on the shape type. Different shapes may require
   * different parameter transformations to ensure correct rendering in the file format.
   *
   * @param shapeData - Object containing shape information including dataclass (shape type) and shapeparam
   * @param resultObject - Object containing coordinate scale factors and context information
   * @returns The shape parameter value appropriately scaled for  format
   */
  static ShapeParamToSDR(shapeData, resultObject) {
    let convertedParam = 0;
    const shapeTypes = PolygonConstant.ShapeTypes;

    switch (shapeData.dataclass) {
      // Multi-sided polygons that need coordinate scaling
      case shapeTypes.PARALLELOGRAM:
      case shapeTypes.PENTAGON:
      case shapeTypes.PENTAGON_LEFT:
      case shapeTypes.HEXAGON:
        convertedParam = ShapeUtil.ToSDWinCoords(shapeData.shapeparam, resultObject.coordScaleFactor);
        break;

      // Octagon uses raw parameter without scaling
      case shapeTypes.OCTAGON:
        convertedParam = shapeData.shapeparam;
        break;

      // Directional and special shapes requiring coordinate scaling
      case shapeTypes.ARROW_LEFT:
      case shapeTypes.ARROW_RIGHT:
      case shapeTypes.ARROW_TOP:
      case shapeTypes.ARROW_BOTTOM:
      case shapeTypes.TRAPEZOID_BOTTOM:
      case shapeTypes.TRAPEZOID:
      case shapeTypes.INPUT:
      case shapeTypes.DOCUMENT:
      case shapeTypes.STORAGE:
      case shapeTypes.DELAY:
      case shapeTypes.DISPLAY:
        convertedParam = ShapeUtil.ToSDWinCoords(shapeData.shapeparam, resultObject.coordScaleFactor);
    }

    return convertedParam;
  }

  /**
   * Writes a drawing object to a data stream in SDF format
   *
   * This function serializes drawing objects (shapes, lines, connectors) to a binary data stream
   * following the SmartDraw Format specification. It handles different object types with their
   * specific properties, correctly formats coordinates with proper scaling, and writes all object
   * metadata needed for later reconstruction. The function translates internal object representations
   * to the file format's structure, handling special cases and transformations.
   *
   * @param dataStream - The data stream to write the object to
   * @param objectIndex - The index of this object in the object list
   * @param drawingObject - The object to be serialized
   * @param resultObject - Object containing coordinate scale factors and serialization context
   */
  static WriteObject(e, t, a, r) {
    var i,
      n,
      o,
      s,
      l,
      S,
      c,
      u,
      p,
      d = 0,
      D = 1,
      g = 0,
      h = {
        x: 0,
        y: 0
      },
      m = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      C = {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      },
      y = ShapeUtil.WriteCode(e, DSConstant.OpNameCode.cDrawObj8),
      f = - 1,
      L = DSConstant.OpNameCode,
      I = NvConstant.ShapeClass,
      T = I.PLAIN;
    switch (
    i = a.ShortRef,
    n = a.shapeparam ||
    0,
    o = a.flags,
    s = a.Frame,
    u = a,
    a.associd > 0 &&
    (f = ShapeUtil.BlockIDtoUniqueID(a.associd, r)),
    l = r.WriteBlocks ? a.BlockID : t + 1,
    S = a.DrawingObjectBaseClass,
    c = a.ShapeType,
    a.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
    a.LineType === OptConstant.LineType.POLYLINE &&
    a.polylist.closed &&
    (
      S = OptConstant.DrawObjectBaseClass.Shape,
      c = 'CLOSEDPOLY'
    ),
    a.objecttype === NvConstant.FNObjectTypes.SD_OBJT_GANTT_BAR &&
    a.flags & NvConstant.ObjFlags.NotVisible &&
    (
      o = Utils2.SetFlag(o, NvConstant.ObjFlags.NotVisible, !1)
    ),
    S
    ) {
      case OptConstant.DrawObjectBaseClass.Line:
        switch (a.DataID >= 0 && !r.WriteBlocks && (f = t + 2), a.LineType) {
          case OptConstant.LineType.ARCLINE:
          case OptConstant.LineType.LINE:
            a.LineType == OptConstant.LineType.ARCLINE &&
              (
                s = Utils2.Pt2Rect(a.EndPoint, a.StartPoint),
                i = OptConstant.LineTypes.LsChord,
                n = ShapeUtil.ToSDWinCoords(a.CurveAdjust, r.coordScaleFactor),
                a.IsReversed &&
                (n = - n),
                (
                  Math.abs(a.EndPoint.x - s.x) < 0.01 &&
                  Math.abs(a.EndPoint.y - s.y) < 0.01 ||
                  Math.abs(a.EndPoint.x - s.x) < 0.01 &&
                  Math.abs(a.EndPoint.y - (s.y + s.height)) < 0.01
                ) &&
                (n = - n)
              ),
              s = Utils2.Pt2Rect(a.EndPoint, a.StartPoint),
              g = ShapeConstant.ObjectTypes.LineD,
              Math.abs(a.StartPoint.x - a.EndPoint.x) < OptConstant.Common.MinLineDisDeterminOri ? (
                d = ShapeUtil.ToSDWinCoords(a.StartPoint.x + r.GroupOffset.x, r.coordScaleFactor),
                D = OptConstant.LineSubclass.LCV
              ) : Math.abs(a.StartPoint.y - a.EndPoint.y) < OptConstant.Common.MinLineDisDeterminOri ? (
                d = ShapeUtil.ToSDWinCoords(a.StartPoint.y + r.GroupOffset.y, r.coordScaleFactor),
                D = OptConstant.LineSubclass.LCH
              ) : (
                D = OptConstant.LineSubclass.LCD,
                (
                  Math.abs(a.StartPoint.x - (s.x + s.width)) < 0.01 &&
                  Math.abs(a.StartPoint.y - s.y) < 0.01 ||
                  Math.abs(a.StartPoint.y - (s.y + s.height)) < 0.01 &&
                  Math.abs(a.StartPoint.x - s.x) < 0.01
                ) &&
                (
                  o = Utils2.SetFlag(o, NvConstant.ObjFlags.Obj1, !0)
                )
              );
            break;
          case OptConstant.LineType.ARCSEGLINE:
            g = ShapeConstant.ObjectTypes.SegL,
              D = OptConstant.SeglTypes.Arc;
            break;
          case OptConstant.LineType.SEGLINE:
            g = ShapeConstant.ObjectTypes.SegL,
              D = OptConstant.SeglTypes.Line;
            break;
          case OptConstant.LineType.POLYLINE:
            g = ShapeConstant.ObjectTypes.PolyL,
              D = PolygonConstant.ShapeTypes.POLYGON;
            break;
          case OptConstant.LineType.FREEHAND:
            g = ShapeConstant.ObjectTypes.Freehand
        }
        break;
      case OptConstant.DrawObjectBaseClass.Shape:
        if (
          g = ShapeConstant.ObjectTypes.Shape,
          (
            a.TextFlags & NvConstant.TextFlags.AttachB ||
            a.TextFlags & NvConstant.TextFlags.AttachA
          ) &&
          a.DataID >= 0 &&
          !r.WriteBlocks &&
          (f = t + 2),
          !r.WriteVisio &&
          a.StyleRecord.Line.BThick &&
          a.polylist &&
          a.polylist.closed &&
          a.polylist.segs &&
          a.polylist.segs.length
        ) {
          if (u = Utils1.DeepCopy(a), 'CLOSEDPOLY' != c) s = $.extend(!0, {
          }, a.Frame),
            u = Utils1.DeepCopy(a),
            Utils2.InflateRect(s, - a.StyleRecord.Line.BThick, - a.StyleRecord.Line.BThick);
          else {
            var b = [],
              M = [],
              P = [];
            if (
              b = u.GetPolyPoints(OptConstant.Common.MaxPolyPoints, !1, !1, !1, P),
              P.length > 0
            ) for (
                M.push(new Point(b[0].x, b[0].y)),
                p = 0;
                p < P.length;
                p++
              ) M.push(new Point(b[P[p]].x, b[P[p]].y));
            else M = Utils1.DeepCopy(b);
            b = T3Gv.opt.InflateLine(M, u.StyleRecord.Line.BThick, !0, !1),
              u.StartPoint = Utils1.DeepCopy(b[0]),
              u.EndPoint = Utils1.DeepCopy(b[b.length - 1]);
            var R = Utils1.DeepCopy(u.polylist.segs);
            for (u.polylist.segs = [], p = 0; p < b.length; p++) u.polylist.segs.push(
              new PolySeg(1, b[p].x - u.StartPoint.x, b[p].y - u.StartPoint.y)
            ),
              p < R.length &&
              (
                u.polylist.segs[p].LineType = R[p].LineType,
                u.polylist.segs[p].ShortRef = R[p].ShortRef,
                u.polylist.segs[p].dataclass = R[p].dataclass,
                u.polylist.segs[p].dimDeflection = R[p].dimDeflection,
                u.polylist.segs[p].flags = R[p].flags,
                u.polylist.segs[p].param = R[p].param,
                u.polylist.segs[p].weight = R[p].weight
              );
            u.CalcFrame(),
              s = Utils1.DeepCopy(u.Frame)
          }
          u.StyleRecord.Line.Thickness = 0,
            u.UpdateFrame(s)
        }
        switch (
        m.x = a.InitialGroupBounds.x,
        m.y = a.InitialGroupBounds.y,
        m.width = a.InitialGroupBounds.width,
        m.height = a.InitialGroupBounds.height,
        C = ShapeUtil.ToSDWinRect(m, r.coordScaleFactor, {
          x: 0,
          y: 0
        }),
        a.ShapeType === OptConstant.ShapeType.GroupSymbol &&
        (
          a.InitialGroupBounds.x > 0 ||
          a.InitialGroupBounds.y > 0 ||
          r.WriteVisio &&
          (r.GroupOffset.x > 0 || r.GroupOffset.y > 0)
        ) &&
        (
          m.x = a.Frame.x,
          m.y = a.Frame.y,
          C = ShapeUtil.ToSDWinRect(m, r.coordScaleFactor, r.GroupOffset)
        ),
        a.SymbolURL.length ? 'SVG' === a.SymbolURL.slice(- 3).toUpperCase() &&
          (T = I.SVGSYMBOL) : a.ImageURL.length &&
          'SVG' === a.ImageURL.slice(- 3).toUpperCase() &&
        (T = I.MISSINGEMF),
        c
        ) {
          case OptConstant.ShapeType.Rect:
            D = PolygonConstant.ShapeTypes.RECTANGLE;
            break;
          case OptConstant.ShapeType.RRect:
            D = PolygonConstant.ShapeTypes.ROUNDED_RECTANGLE;
            break;
          case OptConstant.ShapeType.Oval:
            D = Math.abs(a.Frame.x - a.Frame.y) < 0.2 &&
              a.ObjGrow === OptConstant.GrowBehavior.ProPortional ? PolygonConstant.ShapeTypes.CIRCLE : PolygonConstant.ShapeTypes.OVAL;
            break;
          case OptConstant.ShapeType.Polygon:
            a.dataclass ? (D = a.dataclass, n = ShapeUtil.ShapeParamToSDR(a, r)) : (
              a.dataclass = PolygonConstant.ShapeTypes.POLYGON,
              D = a.dataclass
            );
            break;
          case 'CLOSEDPOLY':
            D = PolygonConstant.ShapeTypes.POLYGON;
            break;
          case OptConstant.ShapeType.GroupSymbol:
            D = PolygonConstant.ShapeTypes.RECTANGLE,
              T = I.GROUPSYMBOL;
            break;
          case OptConstant.ShapeType.SVGFragmentSymbol:
            D = PolygonConstant.ShapeTypes.RECTANGLE,
              T = I.SVGFRAGMENTSYMBOL;
            break;
          default:
            D = PolygonConstant.ShapeTypes.RECTANGLE
        }
        break;
      case OptConstant.DrawObjectBaseClass.Connector:
        g = ShapeConstant.ObjectTypes.Array,
          a.vertical ? (
            d = ShapeUtil.ToSDWinCoords(a.StartPoint.x + r.GroupOffset.x, r.coordScaleFactor),
            D = OptConstant.LineSubclass.LCV
          ) : (
            d = ShapeUtil.ToSDWinCoords(a.StartPoint.y + r.GroupOffset.y, r.coordScaleFactor),
            D = OptConstant.LineSubclass.LCH
          )
    }
    a.attachpoint &&
      (h.x = a.attachpoint.x, h.y = a.attachpoint.y);
    var A = a.extraflags;
    r.selectonly &&
      (
        A = Utils2.SetFlag(A, OptConstant.ExtraFlags.NoDelete, !1)
      );
    var _ = {
      otype: g,
      r: ShapeUtil.ToSDWinRect(u.r, r.coordScaleFactor, r.GroupOffset),
      frame: ShapeUtil.ToSDWinRect(s, r.coordScaleFactor, r.GroupOffset),
      inside: ShapeUtil.ToSDWinRect(u.inside, r.coordScaleFactor, r.GroupOffset),
      dataclass: D,
      flags: o,
      extraflags: A,
      fixedpoint: d,
      shapeparam: n,
      objgrow: a.ObjGrow,
      sizedim: {
        x: ShapeUtil.ToSDWinCoords(a.sizedim.width, r.coordScaleFactor),
        y: ShapeUtil.ToSDWinCoords(a.sizedim.height, r.coordScaleFactor)
      },
      hookflags: a.hookflags,
      targflags: a.targflags,
      maxhooks: a.maxhooks,
      associd: f,
      associndex: - 1,
      uniqueid: l,
      ShortRef: i,
      gframe: {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      },
      gflags: 0,
      attachpoint_x: h.x,
      attachpoint_y: h.y,
      rleft: a.rleft ||
        0,
      rtop: a.rtop ||
        0,
      rright: a.rright ||
        0,
      rbottom: a.rbottom ||
        0,
      rwd: a.rwd ||
        0,
      rht: a.rht ||
        0,
      rflags: a.rflags,
      hgframe: C,
      layer: a.Layer,
      breverse: 0,
      dimensions: a.Dimensions,
      hiliter: ShapeUtil.ToSDWinRect(a.Frame, r.coordScaleFactor, r.GroupOffset),
      styleindex: a.tstyleindex,
      objecttype: a.objecttype,
      colorfilter: a.colorfilter,
      perspective: 0,
      extendedSnapRect: ShapeUtil.ToSDWinRect(a.Frame, r.coordScaleFactor, r.GroupOffset),
      dimensionDeflectionH: a.dimensionDeflectionH ? ShapeUtil.ToSDWinCoords(a.dimensionDeflectionH, r.coordScaleFactor) : 0,
      dimensionDeflectionV: a.dimensionDeflectionV ? ShapeUtil.ToSDWinCoords(a.dimensionDeflectionV, r.coordScaleFactor) : 0,
      commentdir: DSConstant.SDWFileDir.dir_text,
      sequence: 0,
      hookdisp_x: ShapeUtil.ToSDWinCoords(a.hookdisp.x, r.coordScaleFactor),
      hookdisp_y: ShapeUtil.ToSDWinCoords(a.hookdisp.y, r.coordScaleFactor),
      pptLayout: 0,
      subtype: a.subtype,
      colorchanges: a.colorchanges,
      moreflags: a.moreflags,
      objclass: T
    };
    if (
      r.WriteVisio ||
        r.WriteWin32 ? e.writeStruct(DSConstant.DrawObj8Struct316, _) : e.writeStruct(DSConstant.DrawObj8Struct448, _),
      ShapeUtil.WriteLength(e, y),
      ShapeUtil.WriteHooks(e, a, r),
      ShapeUtil.WriteObjData(e, a, r),
      a.HyperlinkText &&
      ShapeUtil.WriteString(e, a.HyperlinkText, L.cDrawJump, r),
      r.WriteBlocks ||
      r.WriteGroupBlock ||
      ShapeUtil.WriteNotes(e, a, r),
      a.flags & NvConstant.ObjFlags.UseConnect &&
      ShapeUtil.WriteConnectPoints(e, a),
      a.StyleRecord
    ) {
      var E = a.StyleRecord.Fill.Paint.FillType;
      r.WriteVisio &&
        a.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
        (
          a.StyleRecord.Fill.Paint.FillType = NvConstant.FillTypes.Transparent
        ),
        ShapeUtil.WriteStyleOverrides(e, a, r),
        a.StyleRecord.Fill.Paint.FillType = E
    }
    a.BusinessName &&
      ShapeUtil.WriteString(e, a.BusinessName, L.cBusinessNameStr, r),
      a.WriteShapeData(e, r),
      e.writeUint16(DSConstant.OpNameCode.cDrawObj8End)
  }

  /**
   * Writes notes associated with an object to the data stream in
   *
   * This function checks if the object has associated notes (via NoteID) and writes
   * them to the data stream. Notes provide additional textual information attached
   * to drawing objects that can be displayed separately from the object itself.
   *
   * @param dataStream - The data stream to write the notes to
   * @param drawingObject - The object that may have associated notes
   * @param resultObject - Object containing context information for serialization
   */
  static WriteNotes(dataStream, drawingObject, resultObject) {
    if (drawingObject.NoteID !== -1) {
      ShapeUtil.WriteText(dataStream, drawingObject, null, null, true, resultObject);
    }
  }

  /**
   * Writes hook information to a data stream in
   *
   * This function serializes connection hooks between objects, handling direction
   * reversal for lines and connectors. Hooks define how objects connect to each other,
   * including connection points, cell attachments, and connection geometry.
   *
   * @param dataStream - The data stream to write hook information to
   * @param drawingObject - The object containing hooks to be written
   * @param resultObject - Object containing context information and unique mapping
   */
  static WriteHooks(dataStream, drawingObject, resultObject) {
    let hookCount;
    let hookIndex;
    let codeOffset;
    let cellId;
    let hookPoint;
    let targetObject;
    let hookData = {};
    let isLineReversed = false;
    let connectPoint = {};
    let isReverseColumn = false;
    const centerDimension = OptConstant.Common.DimMax;

    // Check if the line or connector is reversed (affects hook point direction)
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line) {
      isLineReversed = ShapeUtil.LineIsReversed(drawingObject, resultObject, false);
    } else if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Connector) {
      isReverseColumn = (drawingObject.arraylist.styleflags & OptConstant.AStyles.ReverseCol) &&
        drawingObject.vertical;
    }

    // Process all hooks on the drawing object
    hookCount = drawingObject.hooks.length;
    if (hookCount) {
      for (hookIndex = 0; hookIndex < hookCount; hookIndex++) {
        // Get hook point and adjust for reversal if needed
        hookPoint = drawingObject.hooks[hookIndex].hookpt;

        if (isLineReversed) {
          // Adjust hook points for reversed lines
          switch (hookPoint) {
            case OptConstant.HookPts.KTL:
              hookPoint = OptConstant.HookPts.KTR;
              break;
            case OptConstant.HookPts.KTR:
              hookPoint = OptConstant.HookPts.KTL;
              break;
          }
        } else if (isReverseColumn) {
          // Adjust hook points for reversed columns
          switch (hookPoint) {
            case OptConstant.HookPts.LL:
              hookPoint = OptConstant.HookPts.LR;
              break;
            case OptConstant.HookPts.LT:
              hookPoint = OptConstant.HookPts.LB;
              break;
          }
        }

        // Get connection point coordinates
        connectPoint.x = drawingObject.hooks[hookIndex].connect.x;
        connectPoint.y = drawingObject.hooks[hookIndex].connect.y;

        // Get target object and adjust connection point if it's reversed
        targetObject = DataUtil.GetObjectPtr(drawingObject.hooks[hookIndex].objid, false);
        if (ShapeUtil.LineIsReversed(targetObject, resultObject, true)) {
          connectPoint.x = centerDimension - connectPoint.x;
          connectPoint.y = centerDimension - connectPoint.y;
        }

        // Get cell ID or use default if null
        cellId = (drawingObject.hooks[hookIndex].cellid == null) ?
          OptConstant.Common.DNull :
          drawingObject.hooks[hookIndex].cellid;

        // Write hook data to stream
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDrawHook);
        hookData = {
          objid: ShapeUtil.BlockIDtoUniqueID(drawingObject.hooks[hookIndex].objid, resultObject),
          index: -1,
          connectx: connectPoint.x,
          connecty: connectPoint.y,
          hookpt: hookPoint,
          cellid: cellId
        };

        dataStream.writeStruct(DSConstant.DrawHookStruct, hookData);
        ShapeUtil.WriteLength(dataStream, codeOffset);
      }
    }
  }

  /**
   * Writes object data information to the data stream in
   *
   * This function serializes data binding information for an object, including dataset
   * references, element IDs, and field mappings. It ensures data integrity by validating
   * table references before writing them to the stream, resetting invalid references to
   * prevent errors when loading the document later.
   *
   * @param dataStream - The data stream to write object data to
   * @param drawingObject - The object containing data binding information
   * @param resultObject - Object containing context information for serialization
   */
  static WriteObjData(dataStream, drawingObject, resultObject) {
    // Create object data structure with default values for null/undefined fields
    const objectDataInfo = {
      datasetID: drawingObject.datasetID ? drawingObject.datasetID : -1,
      datasetType: drawingObject.datasetType ? drawingObject.datasetType : -1,
      datasetElemID: drawingObject.datasetElemID ? drawingObject.datasetElemID : -1,
      datasetTableID: drawingObject.datasetTableID ? drawingObject.datasetTableID : -1,
      fieldDataElemID: drawingObject.fieldDataElemID ? drawingObject.fieldDataElemID : -1,
      fieldDataTableID: drawingObject.fieldDataTableID ? drawingObject.fieldDataTableID : -1,
      fieldDataDatasetID: drawingObject.fieldDataDatasetID ? drawingObject.fieldDataDatasetID : -1
    };

    // // Validate table references - if table doesn't exist, reset all table references
    // if (drawingObject.datasetTableID >= 0 &&
    //   !TODO.STData.GetTable(drawingObject.datasetTableID)) {
    //   objectDataInfo.datasetID = -1;
    //   objectDataInfo.datasetType = -1;
    //   objectDataInfo.datasetElemID = -1;
    //   objectDataInfo.datasetTableID = -1;
    // }

    // Write object data structure to stream
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cObjData);
    dataStream.writeStruct(DSConstant.ObjDataStruct32, objectDataInfo);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  /**
   * Writes style overrides to the data stream in
   *
   * This function serializes style overrides for objects that have customized styling
   * different from their base style. It efficiently handles the differences by comparing
   * the object's style to its reference style and only writing the modified components
   * (fill, line, text, effects) to minimize file size and processing time.
   *
   * @param dataStream - The data stream to write style override information to
   * @param drawingObject - The object containing style overrides
   * @param resultObject - Object containing style list references and context information
   */
  static WriteStyleOverrides(dataStream, drawingObject, resultObject) {
    const matchFlags = DSConstant.MatchFlags;
    const styleCount = resultObject.lpStyles.length;

    // For other formats, check if the object has a valid style index and isn't a floor plan wall
    if (drawingObject.tstyleindex >= 0 &&
      drawingObject.tstyleindex < styleCount &&
      drawingObject.objecttype !== NvConstant.FNObjectTypes.FlWall) {

      // Compare the object's style to the reference style to find differences
      // const styleDifferences = DSConstant.SD_CompareStyles(
      //   drawingObject.StyleRecord,
      //   resultObject.lpStyles[drawingObject.tstyleindex],
      //   true
      // );

      const styleDifferences = false;

      // // Only write fill if it differs from the reference style
      // if (styleDifferences & matchFlags.SDSTYLE_NOMATCH_FILL) {
      //   ShapeUtil.WriteSDFill(dataStream, drawingObject.StyleRecord.Fill, resultObject);
      // }

      // // Only write line properties if any line attribute differs
      // if (styleDifferences & (
      //   matchFlags.SDSTYLE_NOMATCH_LINETHICK |
      //   matchFlags.SDSTYLE_NOMATCH_LINEPAT |
      //   matchFlags.SDSTYLE_NOMATCH_LINEFILL
      // )) {
      //   ShapeUtil.WriteSDLine(
      //     dataStream,
      //     drawingObject.StyleRecord.Line,
      //     resultObject,
      //     DSConstant.OpNameCode.cBeginLine,
      //     drawingObject
      //   );
      // }

      // // Only write text properties if any text attribute differs
      // if (styleDifferences & (
      //   matchFlags.SDSTYLE_NOMATCH_TEXTFONT |
      //   matchFlags.SDSTYLE_NOMATCH_TEXTSIZE |
      //   matchFlags.SDSTYLE_NOMATCH_TEXTFACE |
      //   matchFlags.SDSTYLE_NOMATCH_TEXTFILL
      // )) {
      //   ShapeUtil.WriteSDTxf(dataStream, drawingObject.StyleRecord.Text, resultObject);
      // }

      // // Only write outside effects if they differ
      // if (styleDifferences & matchFlags.SDSTYLE_NOMATCH_OUTSIDE) {
      //   ShapeUtil.WriteOutside(dataStream, drawingObject.StyleRecord.OutsideEffect);
      // }

    }
    // If no valid style reference exists, write the complete style
    else {
      ShapeUtil.WriteStyle(dataStream, drawingObject.StyleRecord, false, resultObject, drawingObject);
    }
  }

  /**
   * Writes arrowhead information to the data stream in
   *
   * This function serializes arrowhead properties for the start and end of lines or connectors.
   * It handles display flags, arrow type IDs, size information, and special cases for reversed
   * lines where the start and end arrowheads need to be swapped. Arrow display flags indicate
   * whether arrowheads should be visible.
   *
   * @param dataStream - The data stream to write arrowhead information to
   * @param resultObject - Object containing context information for serialization
   * @param drawingObject - The object containing arrowhead properties
   */
  static WriteArrowheads(dataStream, resultObject, drawingObject) {
    // Get arrow identifiers from the drawing object
    let startArrowId = drawingObject.StartArrowID;
    let endArrowId = drawingObject.EndArrowID;

    // Add display flags to arrows if they should be displayed
    if (drawingObject.StartArrowDisp) {
      startArrowId += DSConstant.ArrowMasks.ARROW_DISP;
    }

    if (drawingObject.EndArrowDisp) {
      endArrowId += DSConstant.ArrowMasks.ARROW_DISP;
    }

    // For reversed lines, swap start and end arrowheads
    if (ShapeUtil.LineIsReversed(drawingObject, resultObject, false)) {
      const tempArrowId = endArrowId;
      endArrowId = startArrowId;
      startArrowId = tempArrowId;
    }

    // Create arrowhead data structure
    const arrowheadData = {
      arrowsize: drawingObject.ArrowSizeIndex,
      sarrow: startArrowId,
      earrow: endArrowId,
      sarrowid: 0,
      earrowid: 0
    };

    // Write the arrow data to the stream
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDrawArrow);
    dataStream.writeStruct(DSConstant.DrawArrowStruct, arrowheadData);
    ShapeUtil.WriteLength(dataStream, codeOffset);
  }

  static BlockNames = {
    Version: 'Version.sdr',
    Header: 'Header.sdr',
    Header2: 'Header2.sdr',
    sdp: 'SDP.sdr',
    STData: 'STData.',
    Layers: 'Layers.sdr',
    Links: 'Links.sdr',
    Image: 'Image.',
    Text: 'Text.',
    // Graph: 'Graph.',
    Table: 'Table.',
    GanttInfo: 'GanttInfo',
    LMObject: 'Obj.',
    Native: 'Native.',
    ExpandedView: 'ExpandedView',
    Comment: 'Comment'
  }

  static BlockIDs = {
    Version: 1,
    Header: 2,
    Header2: 3,
    sdp: 4,
    STData: 5,
    Layers: 6,
    Links: 7,
    Image: 8,
    Text: 9,
    ExpandedView: 10,
    // Graph: 11,
    Table: 12,
    GanttInfo: 13,
    LMObject: 14,
    Native: 15,
    Manifest: 16,
    Command: 17,
    SVG: 18,
    Metadata: 19,
    Comment: 20
  }

  static BlockActions = {
    Normal: 0,
    NewDoc: 1,
    Delete: 2,
    UnDelete: 3,
    PartialBlock: 4,
    PartialBlockEnd: 5,
    AddPage: 6,
    ChangePage: 7,
    ClosePage: 8,
    CurrentPage: 9,
    RenamePage: 10,
    DeletePage: 11,
    ReorderPages: 12,
    SaveAs: 13
  }

  static SaveAllBlocks(stateId?, deltaState?) {
    return;
  }

  /**
   * Saves all blocks to the storage format
   *
   * This function coordinates the complete serialization of all document blocks
   * when a full save is required. It manages the saving process, resets header filters,
   * and handles any socket actions that might be pending for the save operation.
   *
   * @param stateId - The state identifier to save from
   * @param deltaState - The delta state information
   */
  static SaveAllBlocks1(stateId?, deltaState?) {

    console.log("=U.ShapeUtil.SaveAllBlocks", stateId, deltaState);
    return;
    if (true) {
      if (false) {
        const pendingActionCount = T3Gv.opt.socketAction.length;
        const socketActions = TODO.SocketActions;

        if (pendingActionCount) {
          const saveContext = {
            state: 0,
            delta: 0,
            nblocks: 1
          };

          for (let actionIndex = 0; actionIndex < pendingActionCount; actionIndex++) {
            switch (T3Gv.opt.socketAction[actionIndex]) {
              case socketActions.SaveAllBlocks:
                ShapeUtil.WriteAllBlocks();
                ShapeUtil.HeaderFilters = [];
                ShapeUtil.Header2Count = 0;
                break;
            }
          }

          T3Gv.opt.socketAction = [];
        } else {
          ShapeUtil.WriteAllBlocks();
          ShapeUtil.HeaderFilters = [];
          ShapeUtil.Header2Count = 0;
        }
      }
    }
  }

  /**
   * Gets the block name for a specified object type
   *
   * This function determines the appropriate file block name for a given object type,
   * which is used in the block serialization process. It also optionally populates
   * block metadata including the block ID and type in the provided container.
   *
   * @param storedObject - The object for which to get the block name
   * @param skipSystemObjects - Flag indicating whether to skip system objects
   * @param blockMetadata - Optional container to receive block metadata
   * @returns The block name string, or null if the object should be skipped
   */
  static GetBlockName(storedObject, skipSystemObjects, blockMetadata) {
    let blockName;
    const objectTypes = StateConstant.StoredObjectType;

    switch (storedObject.Type) {
      case objectTypes.BaseDrawObject:
        blockName = ShapeUtil.BlockNames.LMObject + storedObject.ID;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.LMObject;
        }
        break;

      case objectTypes.TextObject:
      case objectTypes.NotesObject:
        blockName = ShapeUtil.BlockNames.Text + storedObject.ID;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Text;
        }
        break;

      // case objectTypes.TABLE_OBJECT:
      //   blockName = ShapeUtil.BlockNames.Table + storedObject.ID;
      //   if (blockMetadata) {
      //     blockMetadata.id = storedObject.ID;
      //     blockMetadata.type = ShapeUtil.BlockIDs.Table;
      //   }
      //   break;

      // case objectTypes.GraphObject:
      //   blockName = ShapeUtil.BlockNames.Graph + storedObject.ID;
      //   if (blockMetadata) {
      //     blockMetadata.id = storedObject.ID;
      //     blockMetadata.type = ShapeUtil.BlockIDs.Graph;
      //   }
      //   break;

      // case objectTypes.ExpandedViewObject:
      //   blockName = ShapeUtil.BlockNames.ExpandedView + storedObject.ID;
      //   if (blockMetadata) {
      //     blockMetadata.id = storedObject.ID;
      //     blockMetadata.type = ShapeUtil.BlockIDs.ExpandedView;
      //   }
      //   break;

      case objectTypes.CommentBlock:
        blockName = ShapeUtil.BlockNames.Comment + storedObject.ID;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Comment;
        }
        break;

      case objectTypes.HNativeObject:
      case objectTypes.HNativeWinObject:
        blockName = ShapeUtil.BlockNames.Native + storedObject.ID;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Native;
        }
        break;

      case objectTypes.BlobBytesObject:
        blockName = ShapeUtil.BlockNames.Image + storedObject.ID;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Image;
        }
        break;

      case objectTypes.SDDataObject:
        if (skipSystemObjects) return null;
        blockName = ShapeUtil.BlockNames.sdp;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.sdp;
        }
        break;

      case objectTypes.LayersManagerObject:
        if (skipSystemObjects) return null;
        blockName = ShapeUtil.BlockNames.Layers;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Layers;
        }
        break;

      case objectTypes.STDataObject:
        if (skipSystemObjects) return null;
        blockName = ShapeUtil.BlockNames.STData;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.STData;
        }
        break;

      case objectTypes.LinkListObject:
        if (skipSystemObjects) return null;
        blockName = ShapeUtil.BlockNames.Links;
        if (blockMetadata) {
          blockMetadata.id = storedObject.ID;
          blockMetadata.type = ShapeUtil.BlockIDs.Links;
        }
    }

    return blockName;
  }

  /**
   * Builds a serialized object block for storage or transmission
   *
   * This function creates a serialized representation of a stored object based on its type,
   * handling various object types like drawing objects, text, tables, graphs, etc.
   * It either checks if the object can be serialized (when countOnly is true) or
   * performs the actual serialization by calling the appropriate writer function.
   *
   * @param storedObject - The object to be serialized
   * @param resultObject - The context object containing serialization settings and references
   * @param countOnly - When true, only checks if object can be serialized without writing it
   * @param blockIndex - The index of the block in the serialization sequence
   * @returns True if countOnly is true and object can be serialized, otherwise the serialized block
   */
  static BuildObjectBlock(storedObject, resultObject, countOnly, blockIndex) {
    let objectInstance;
    let serializedBlock;
    const objectTypes = StateConstant.StoredObjectType;

    switch (storedObject.Type) {
      case objectTypes.BaseDrawObject:
        // Handle base drawing objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance && !objectInstance.Data.bInGroup) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteOBJBlock(objectInstance.Data, resultObject, blockIndex);
        }
        break;

      case objectTypes.TextObject:
        // Handle text objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteTextBlock(objectInstance, resultObject, false, blockIndex);
        }
        break;

      case objectTypes.NotesObject:
        // Handle note objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteTextBlock(objectInstance, resultObject, true, blockIndex);
        }
        break;

      // case objectTypes.TABLE_OBJECT:
      //   // Handle table objects
      //   objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
      //   if (objectInstance) {
      //     if (countOnly) return true;
      //     serializedBlock = ShapeUtil.WriteTableBlock(objectInstance, resultObject, blockIndex);
      //   }
      //   break;

      case objectTypes.GraphObject:
        // Handle graph objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteGraphBlock(objectInstance, resultObject, blockIndex);
        }
        break;

      case objectTypes.ExpandedViewObject:
        // Handle expanded view objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteExpandedViewBlock(objectInstance, resultObject, blockIndex);
        }
        break;

      case objectTypes.CommentBlock:
        // Handle comment block objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteCommentBlock(objectInstance, resultObject, blockIndex);
        }
        break;

      case objectTypes.BlobBytesObject:
        // Handle binary blob objects (images, etc.)
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteImageBlock(objectInstance, resultObject, blockIndex);
        }
        break;

      case objectTypes.HNativeObject:
        // Handle native objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteNativeBlock(
            objectInstance,
            DSConstant.OpNameCode.cNativeBlock,
            resultObject,
            blockIndex
          );
        }
        break;

      case objectTypes.HNativeWinObject:
        // Handle Windows-specific native objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteNativeBlock(
            objectInstance,
            DSConstant.OpNameCode.cNativeWinBlock,
            resultObject,
            blockIndex
          );
        }
        break;

      case objectTypes.STDataObject:
        // Handle session objects
        if (countOnly) return true;
        serializedBlock = ShapeUtil.WriteSDPBlock(resultObject, blockIndex);
        break;

      case objectTypes.STDataObject:
        // Handle data objects
        if (countOnly) return true;
        if (T3Gv.opt.header.STDataID >= 0) {
          //from SDDataBlock
          serializedBlock = ShapeUtil.WriteSTDataBlock(resultObject, blockIndex);
        }
        break;

      case objectTypes.LayersManagerObject:
        // Handle layer manager objects
        if (countOnly) return true;
        serializedBlock = ShapeUtil.WriteLayersBlock(resultObject.tLMB, resultObject, blockIndex);
        break;

      case objectTypes.LinkListObject:
        // Handle link list objects
        objectInstance = T3Gv.stdObj.GetObject(storedObject.ID);
        if (objectInstance) {
          if (countOnly) return true;
          serializedBlock = ShapeUtil.WriteLinksBlock(objectInstance.Data, resultObject, blockIndex);
        }
        break;
    }

    return serializedBlock;
  }

  static SaveChangedBlocks(stateId, deltaState, targetStateId?, customStoredObjects?) {
    return;
  }

  /**
   * Saves blocks that have changed between states to the storage format
   *
   * This function analyzes changes between states in a document and serializes
   * the modified objects. It handles object creation, deletion, and modification
   * by comparing state information and generating appropriate block data for storage
   * or transmission. It maintains document consistency by tracking objects across
   * state transitions.
   *
   * @param stateId - The source state identifier to compare from
   * @param deltaState - Change in state value (negative for reverse changes)
   * @param targetStateId - Optional target state ID (defaults to source state if not provided)
   * @param customStoredObjects - Optional specific objects to save instead of all from the state
   */
  static SaveChangedBlocks1(stateId, deltaState, targetStateId?, customStoredObjects?) {

    console.log('=U.ShapeUtil SaveChangedBlocks', stateId, deltaState, targetStateId, customStoredObjects);
    return;

    try {

      // Prepare result object and track deleted objects
      const resultObject = new WResult();
      const deletedObjectIds = [];
      const blockMetadata = {};

      // Use source state as target if not specified
      if (targetStateId == null) {
        targetStateId = stateId;
      }

      // Get objects from the state
      const stateObjects = T3Gv.state.states[stateId].storedObjects;
      const objectCount = stateObjects.length;

      // Initialize result object with document context
      resultObject.sdp = DataUtil.GetObjectPtr(T3Gv.opt.sdDataBlockId, false);
      resultObject.ctp = T3Gv.opt.header;
      resultObject.tLMB = DataUtil.GetObjectPtr(T3Gv.opt.layersManagerBlockId, false);
      resultObject.fontlist = T3Gv.opt.header.FontList;
      resultObject.richGradients = T3Gv.opt.richGradients;
      resultObject.WriteBlocks = true;

      // Get current view settings from the work area
      const workArea = T3Gv.docUtil.svgDoc.GetWorkArea();
      resultObject.WinSetting.wscale = T3Gv.docUtil.GetZoomFactor();
      resultObject.WinSetting.worigin.x = workArea.scrollX;
      resultObject.WinSetting.worigin.y = workArea.scrollY;
      resultObject.WinSetting.wflags = 0;

      // Set appropriate view flags based on current state
      if (T3Gv.docUtil.scaleToFit) {
        resultObject.WinSetting.wflags = TODO.WFlags.W_Stf;
      } else if (T3Gv.docUtil.scaleToPage) {
        resultObject.WinSetting.wflags = TODO.WFlags.W_Page;
      }

      // Store document resolution
      resultObject.docDpi = T3Gv.docUtil.svgDoc.docInfo.docDpi;

      // Handle zoom scaling
      if (resultObject.WinSetting.wscale === 1) {
        resultObject.WinSetting.wscale = 0;
      } else {
        resultObject.WinSetting.wscale *= 1000;
      }

      // Update content header flags with current configuration
      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.ShowGrid,
        T3Gv.docUtil.docConfig.showGrid
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.ShowRulers,
        T3Gv.docUtil.docConfig.showRulers
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.SnapToGridC,
        T3Gv.docUtil.docConfig.centerSnap && T3Gv.docUtil.docConfig.enableSnap
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.SnapToGridTL,
        !T3Gv.docUtil.docConfig.centerSnap && T3Gv.docUtil.docConfig.enableSnap
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.ShowPageDividers,
        T3Gv.docUtil.docConfig.showPageDivider
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.SnapToShapesOff,
        T3Gv.docUtil.docConfig.snapToShapes == 0
      );

      T3Gv.opt.header.flags = Utils2.SetFlag(
        T3Gv.opt.header.flags,
        OptConstant.CntHeaderFlags.ShowRulers,
        T3Gv.docUtil.docConfig.showRulers
      );

      // Configure ruler settings
      resultObject.rulerConfig = T3Gv.docUtil.rulerConfig;
      resultObject.rulerConfig.show = T3Gv.docUtil.docConfig.showRulers;

      // Start counting blocks with header
      let blockCount = 1;
      let blockIndex = 0;
      let serializedBlock;

      // Process objects from next state if delta is negative (undoing changes)
      if (deltaState < 0 && stateId + 1 < T3Gv.state.States.length) {
        const nextStateObjects = T3Gv.state.states[stateId + 1].storedObjects;
        const nextStateObjectCount = nextStateObjects.length;

        for (let objIndex = 0; objIndex < nextStateObjectCount; objIndex++) {
          const currentObject = nextStateObjects[objIndex];

          // Handle created objects in the next state
          if (currentObject.stateOptTypeId === StateConstant.StateOperationType.CREATE) {
            if (ShapeUtil.GetBlockName(currentObject, true)) {
              blockCount++;
            }
          }
          // Handle deleted objects in the next state
          else if (currentObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
            if (ShapeUtil.GetBlockName(currentObject, true)) {
              if (ShapeUtil.BuildObjectBlock(currentObject, resultObject, true, 0)) {
                blockCount++;
                deletedObjectIds.push(currentObject.ID);
              }
            }
          }
          // Handle modified objects
          else {
            let foundInCurrentState = false;

            // Check if this object exists in the current state
            for (let currentStateIndex = 0; currentStateIndex < objectCount; currentStateIndex++) {
              if (stateObjects[currentStateIndex].ID === currentObject.ID) {
                foundInCurrentState = true;
                break;
              }
            }

            // If not in current state, count it
            if (!foundInCurrentState) {
              if (ShapeUtil.BuildObjectBlock(currentObject, resultObject, true, 0)) {
                blockCount++;
              }
            }
          }
        }
      }

      // Process objects from the current state
      const objectsToProcess = customStoredObjects || stateObjects;
      const processCount = objectsToProcess.length;

      for (let objIndex = 0; objIndex < processCount; objIndex++) {
        const currentObject = objectsToProcess[objIndex];

        // Handle deleted objects
        if (currentObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
          if (ShapeUtil.GetBlockName(currentObject, true)) {
            blockCount++;
          }
        }
        // Handle other objects not already processed
        else if (deletedObjectIds.indexOf(currentObject.ID) === -1) {
          if (ShapeUtil.BuildObjectBlock(currentObject, resultObject, true, 0)) {
            blockCount++;
          }
        }
      }

      // Set block count and operation properties
      resultObject.nblocks = blockCount;
      resultObject.BlockAction = ShapeUtil.BlockActions.Normal;
      resultObject.state = targetStateId + T3Gv.state.droppedStates;

      // Adjust delta state
      if (deltaState === 1) {
        deltaState = 0;
      }
      resultObject.delta = deltaState;

      // Reset deleted object tracking
      deletedObjectIds.length = 0;

      // Write header block
      serializedBlock = ShapeUtil.WriteHeaderBlock(resultObject, blockIndex, ShapeUtil.HeaderFilters);
      blockIndex++;

      // Process objects from the next state if working with negative delta
      if (deltaState < 0 && stateId + 1 < T3Gv.state.States.length) {
        const nextStateObjects = T3Gv.state.states[stateId + 1].storedObjects;
        const nextStateObjectCount = nextStateObjects.length;

        for (let objIndex = 0; objIndex < nextStateObjectCount; objIndex++) {
          const currentObject = nextStateObjects[objIndex];

          // Handle created objects in next state - mark for deletion
          if (currentObject.stateOptTypeId === StateConstant.StateOperationType.CREATE) {
            if (ShapeUtil.GetBlockName(currentObject, true, blockMetadata)) {
              serializedBlock = ShapeUtil.WriteActionBlock(
                resultObject,
                blockMetadata.type,
                blockMetadata.id,
                ShapeUtil.BlockActions.Delete,
                blockIndex
              );
              blockIndex++;
            }
          }
          // Handle deleted objects in next state
          else if (currentObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
            const objectInstance = T3Gv.stdObj.GetObject(currentObject.ID);
            serializedBlock = ShapeUtil.BuildObjectBlock(objectInstance, resultObject, false, blockIndex);
            // Increment handled in BuildObjectBlock
          }
          // Handle modified objects
          else {
            let foundInCurrentState = false;

            // Check if object exists in current state
            for (let currentStateIndex = 0; currentStateIndex < objectCount; currentStateIndex++) {
              if (stateObjects[currentStateIndex].ID === currentObject.ID) {
                foundInCurrentState = true;
                break;
              }
            }

            // If not in current state, build object block
            if (!foundInCurrentState) {
              const objectInstance = T3Gv.stdObj.GetObject(currentObject.ID);
              serializedBlock = ShapeUtil.BuildObjectBlock(objectInstance, resultObject, false, blockIndex);
              // Increment handled in BuildObjectBlock
            }
          }
        }
      }

      // Process objects from the current state
      for (let objIndex = 0; objIndex < processCount; objIndex++) {
        const currentObject = objectsToProcess[objIndex];

        // Handle deleted objects
        if (currentObject.stateOptTypeId === StateConstant.StateOperationType.DELETE) {
          if (ShapeUtil.GetBlockName(currentObject, true, blockMetadata)) {
            serializedBlock = ShapeUtil.WriteActionBlock(
              resultObject,
              blockMetadata.type,
              blockMetadata.id,
              ShapeUtil.BlockActions.Delete,
              blockIndex
            );
            blockIndex++;
          }
        }
        // Handle other objects not already processed
        else if (deletedObjectIds.indexOf(currentObject.ID) === -1) {
          serializedBlock = ShapeUtil.BuildObjectBlock(currentObject, resultObject, false, blockIndex);
          // Increment handled in BuildObjectBlock
        }
      }
    } catch (error) {
      ExportUtil.ExportExceptionCleanup(error);
    }
  }

  /**
   * Writes a block header to a data stream in
   *
   * This function writes block wrapper information to the data stream that identifies
   * and describes the block structure. It includes state information, block type,
   * identification, indexing, and action flags that determine how the block
   * should be processed when loaded.
   *
   * @param dataStream - The data stream to write block header information to
   * @param stateId - The state identifier for document history tracking
   * @param delta - The state delta value (change increment)
   * @param blockType - The type of block being written
   * @param blockId - The identifier for this specific block
   * @param blockIndex - The index of this block in the sequence
   * @param totalBlocks - The total number of blocks in the document
   * @param actionType - The action to perform with this block (create, delete, etc.)
   */
  static WriteBlockWrapper(dataStream, stateId, delta, blockType, blockId, blockIndex, totalBlocks, actionType) {
    const blockHeader = new BlockHeader(stateId, delta, blockType, blockId, blockIndex, totalBlocks);
    blockHeader.action = actionType;
    dataStream.writeStruct(DSConstant.BlockHeaderStruct, blockHeader);
  }

  /**
   * Creates an action block for command operations in
   *
   * This function creates a standalone block that represents a command or action
   * to be performed when the document is loaded. These blocks can trigger operations
   * like page changes, document operations, or state transitions without containing
   * actual document content.
   *
   * @param resultObject - Object containing state information and context
   * @param blockType - The type of action block to create
   * @param blockId - The identifier for this specific action block
   * @param actionType - The specific action to perform
   * @param blockIndex - The index of this block in the sequence
   * @returns A buffer containing the serialized action block
   */
  static WriteActionBlock(resultObject, blockType, blockId, actionType, blockIndex) {
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      blockType,
      blockId,
      blockIndex,
      resultObject.nblocks,
      actionType
    );

    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes the session data properties block to the
   *
   * This function serializes the core document session data (SDP) including drawing properties,
   * styles, background settings, textures, rulers, and recent items. The SDP block contains
   * fundamental document configuration that applies to the entire file.
   *
   * @param resultObject - Object containing session data and document context
   * @param blockIndex - The index of this block in the document sequence
   * @returns A buffer containing the serialized session data properties
   */
  static WriteSDPBlock(resultObject, blockIndex) {
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Write block header
    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.sdp,
      0,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    // Write drawing structure
    ShapeUtil.WriteCDraw12(dataStream, resultObject);

    // Write style information
    ShapeUtil.WriteStyle(dataStream, resultObject.sdp.def.style, true, resultObject, null);

    // Write line properties
    ShapeUtil.WriteSDLine(
      dataStream,
      resultObject.sdp.def.style.Line,
      resultObject,
      DSConstant.OpNameCode.cBeginLine,
      null
    );

    // Write background fill if not transparent
    if (resultObject.sdp.background.Paint.FillType !== NvConstant.FillTypes.Transparent) {
      ShapeUtil.WriteSDFill(dataStream, resultObject.sdp.background, resultObject);
    }

    // Write custom textures (non-standard ones)
    const textureCount = T3Gv.opt.TextureList.Textures.length;
    const standardTextureCount = T3Gv.opt.nStdTextures;

    if (textureCount > standardTextureCount) {
      for (let textureIndex = standardTextureCount; textureIndex < textureCount; textureIndex++) {
        resultObject.TextureList.push(textureIndex);
      }
      ShapeUtil.WriteTextureList(dataStream, T3Gv.opt.TextureList, resultObject);
    }

    // Write rulers and recent items
    ShapeUtil.WriteRulers(dataStream, resultObject);
    ShapeUtil.WriteRecentList(dataStream, resultObject);

    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes a drawing object to a block in
   *
   * This function serializes a drawing object to an SDF block structure,
   * writing all properties, styles, and relationships to the block. The object
   * is identified by its unique block ID and properly wrapped with block header
   * information for storage or transmission.
   *
   * @param drawingObject - The drawing object to serialize
   * @param resultObject - Object containing context information and serialization settings
   * @param blockIndex - The index of this block in the sequence
   * @returns A buffer containing the serialized drawing object block
   */
  static WriteOBJBlock(drawingObject, resultObject, blockIndex) {
    // Create a buffer and data stream for serialization
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Reset style index to force full style serialization
    drawingObject.tstyleindex = -1;

    // Write the block header with document state information
    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.LMObject,
      drawingObject.BlockID,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    // Write the object content to the block
    ShapeUtil.WriteObject(dataStream, 0, drawingObject, resultObject);

    // Return the serialized block data
    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes link information to a block in
   *
   * This function serializes connection links between objects into an SDF block structure.
   * Links define relationships between objects in the drawing, such as connector
   * attachments and object associations. The block includes proper header information
   * for identification during loading.
   *
   * @param linksObject - The links data object containing connection information
   * @param resultObject - Object containing context information and serialization settings
   * @param blockIndex - The index of this block in the sequence
   * @returns A buffer containing the serialized links block
   */
  static WriteLinksBlock(linksObject, resultObject, blockIndex) {
    // Create a buffer and data stream for serialization
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Store links in the result object for access during serialization
    resultObject.links = linksObject;

    // Write the block header with document state information
    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.Links,
      0,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    // Write the links content to the block
    ShapeUtil.WriteLinks(dataStream, resultObject);

    // Return the serialized block data
    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes layer information to a block in
   *
   * This function serializes layer definitions into an SDF block structure.
   * Layers organize drawing objects into manageable groups with visibility
   * and selection properties. The block includes layer names, flags, relationships,
   * and proper header information for identification during loading.
   *
   * @param layerManagerObject - The layer manager object containing layer definitions
   * @param resultObject - Object containing context information and serialization settings
   * @param blockIndex - The index of this block in the sequence
   * @returns A buffer containing the serialized layers block
   */
  static WriteLayersBlock(layerManagerObject, resultObject, blockIndex) {
    // Create a buffer and data stream for serialization
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Store layer manager in the result object for access during serialization
    resultObject.tLMB = layerManagerObject;

    // Write the block header with document state information
    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.Layers,
      0,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    // Write the layers content to the block
    ShapeUtil.WriteLayers(dataStream, resultObject);

    // Return the serialized block data
    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes a native object to a block in
   *
   * This function serializes a native object (platform-specific data) into an SDF block
   * structure. Native objects contain binary data that may be specific to particular
   * platforms or applications. The block includes header information and the native
   * binary content, properly formatted for storage and later retrieval.
   *
   * @param nativeObject - The native object to serialize
   * @param opCode - The operation code indicating the native block type
   * @param resultObject - Object containing context information and serialization settings
   * @param blockIndex - The index of this block in the sequence
   * @returns A buffer containing the serialized native object block
   */
  static WriteNativeBlock(nativeObject, opCode, resultObject, blockIndex) {
    // Create a buffer and data stream for serialization
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Write the block header with document state information
    ShapeUtil.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.Native,
      nativeObject.ID,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    // Write operation code for this native block type
    const codeOffset = ShapeUtil.WriteCode(dataStream, opCode);

    // Write native object ID
    const idData = {
      value: nativeObject.ID
    };
    dataStream.writeStruct(DSConstant.LongValueStruct, idData);

    // Write native binary data to the block
    DSUtil.writeNativeByteArray(dataStream, nativeObject.Data);

    // Finalize the block
    ShapeUtil.WriteLength(dataStream, codeOffset);

    // Return the serialized block data
    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes the document header information to an  block
   *
   * This function serializes the document header information into a structured SDF block.
   * It includes document metadata, view settings, and configuration information needed
   * when the document is loaded. The function can create either standard headers (Header)
   * or specialized headers (Header2) with filtered information.
   *
   * @param resultObject - The object containing document properties and serialization context
   * @param blockIndex - The index of this block in the document block sequence
   * @param headerFilters - Optional array of codes to filter from the header (for Header2)
   * @returns A Uint8Array containing the serialized header block
   */
  static WriteHeaderBlock(resultObject, blockIndex, headerFilters) {
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);
    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    // Decide whether to write a standard header or a specialized Header2
    if (headerFilters == null) {
      // Write a standard header block
      ShapeUtil.WriteBlockWrapper(
        dataStream,
        resultObject.state,
        resultObject.delta,
        ShapeUtil.BlockIDs.Header,
        0,
        blockIndex,
        resultObject.nblocks,
        resultObject.BlockAction
      );
    } else {
      // Write a specialized Header2 block with filtered information
      ShapeUtil.WriteBlockWrapper(
        dataStream,
        resultObject.state,
        resultObject.delta,
        ShapeUtil.BlockIDs.Header2,
        ShapeUtil.Header2Count++,
        blockIndex,
        resultObject.nblocks,
        resultObject.BlockAction
      );
    }

    // Write the actual header content
    ShapeUtil.WriteHeader(dataStream, resultObject, headerFilters);

    // Reset the header filters for subsequent operations
    ShapeUtil.HeaderFilters = [];

    // Return the serialized header block
    return new Uint8Array(dataStream.buffer);
  }

  /**
   * Writes binary data to a data stream in  format
   *
   * This function serializes binary data (blobs) to a data stream with proper
   * operation code markers. It handles the writing of binary content with
   * appropriate length information, ensuring the data can be correctly
   * reconstructed when reading the file format.
   *
   * @param dataStream - The data stream to write the binary data to
   * @param binaryData - The binary data to write
   * @param operationCode - The operation code indicating the type of binary data
   */
  static WriteBlob(dataStream, binaryData, operationCode) {
    // Write operation code and reserve space for length
    const lengthPosition = ShapeUtil.WriteCode(dataStream, operationCode);

    // Write the actual binary data
    dataStream.writeUint8Array(binaryData);

    // Write the length information at the reserved position
    ShapeUtil.WriteLength(dataStream, lengthPosition);
  }

  /**
   * Writes image header information to a data stream in SDF format
   *
   * This function serializes image-related properties including measurements, cropping rectangle,
   * scaling, and display flags to the data stream. It handles both cases where image header
   * information is already available in the drawing object and where default values need to be used.
   * The function supports writing in multiple formats (standard, Visio, or Win32) based on context.
   *
   * @param dataStream - The data stream to write the image header information to
   * @param drawingObject - The drawing object containing image properties
   * @param resultObject - Object containing coordinate scale factors and format settings
   */
  static WriteImageHeader(dataStream, drawingObject, resultObject) {
    let measurementRect;
    let cropRect;
    let scaleValue;
    let imageFlags;
    let iconId = 0;

    // Get image header information if available, otherwise use default values
    if (drawingObject.ImageHeader) {
      measurementRect = drawingObject.ImageHeader.mr;
      cropRect = drawingObject.ImageHeader.croprect;
      scaleValue = drawingObject.ImageHeader.scale;
      imageFlags = drawingObject.ImageHeader.imageflags;
      iconId = drawingObject.ImageHeader.iconid;
    } else {
      // Use defaults if no image header is present
      measurementRect = ShapeUtil.ToSDWinRect(drawingObject.Frame, resultObject.coordScaleFactor, null);
      cropRect = {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0
      };
      scaleValue = 1;
      imageFlags = NvConstant.ImageScales.AlwaysFit;
    }

    // Create the image header structure
    const imageHeaderData = {
      mr: measurementRect,
      croprect: cropRect,
      imageflags: imageFlags,
      scale: scaleValue,
      uniqueid: 0,
      iconid: iconId
    };

    // Write image header to the data stream
    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cDrawImage8);

    // Write the appropriate structure based on format settings
    if (resultObject.WriteWin32) {
      dataStream.writeStruct(DSConstant.DrawImage8Struct50, imageHeaderData);
    } else {
      dataStream.writeStruct(DSConstant.DrawImage8Struct82, imageHeaderData);
    }

    ShapeUtil.WriteLength(dataStream, codeOffset);
  }


  /**
   * Reads polyline data from a code structure and builds a polyline object
   *
   * This function processes polyline information from a code structure, creating segments
   * and handling different line types (straight lines, arcs, curves, etc). It supports
   * both simple polylines and complex geometries like polygons with holes. The function
   * properly scales coordinates, handles flipping operations, and manages special cases
   * for different file formats including Visio.
   *
   * @param drawingObject - The object to populate with polyline data
   * @param codeData - The code data structure containing polyline information
   * @param codeIndex - The current position in the code structure
   * @param resultObject - Object containing coordinate scale factors and processing context
   * @param opCodes - Object containing operation code constants and references
   * @returns Updated code index after processing, or -1 if an error occurred
   */
  static ReadPolyLine(drawingObject, codeData, codeIndex, resultObject, opCodes) {
    let xCoordinate, yCoordinate, polySegment, segmentData;
    let segmentCount, offsetX, offsetY, segmentIndex;
    let isFirstPoint = true;
    let isPolygon = false;
    let isConvertedLine = false;

    // Starting and ending points of the polyline
    let startPoint = {
      x: 0,
      y: 0
    };

    let endPoint = {
      x: 0,
      y: 0
    };

    // Special handling for Visio files
    if (resultObject.IsVisio) {
      drawingObject.inside = Utils1.DeepCopy(drawingObject.Frame);
    }

    // Initialize polylist for different object types if needed
    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
      drawingObject.LineType !== OptConstant.LineType.POLYLINE) {
      isConvertedLine = true;

      if (drawingObject.polylist == null) {
        drawingObject.polylist = new Instance.Shape.PolyList();
      }
    }

    if (drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Shape &&
      drawingObject.ShapeType === OptConstant.ShapeType.Polygon) {
      isPolygon = true;

      if (drawingObject.polylist == null) {
        drawingObject.polylist = new Instance.Shape.PolyList();
      }
    }

    // Process polyline data if object has a polylist
    if ((drawingObject.DrawingObjectBaseClass === OptConstant.DrawObjectBaseClass.Line &&
      drawingObject.LineType === OptConstant.LineType.POLYLINE ||
      isPolygon ||
      isConvertedLine) &&
      drawingObject.polylist) {

      // Set polylist flags from data or default to 0
      drawingObject.polylist.flags = codeData.codes[codeIndex].data.flags || 0;

      // Set polylist dimensions, preferring long format if available
      if (codeData.codes[codeIndex].data.ldim) {
        drawingObject.polylist.dim.x = ShapeUtil.ToSDJSCoords(
          codeData.codes[codeIndex].data.ldim.x,
          resultObject.coordScaleFactor
        );
        drawingObject.polylist.dim.y = ShapeUtil.ToSDJSCoords(
          codeData.codes[codeIndex].data.ldim.y,
          resultObject.coordScaleFactor
        );
      } else {
        drawingObject.polylist.dim.x = ShapeUtil.ToSDJSCoords(
          codeData.codes[codeIndex].data.dim.x,
          resultObject.coordScaleFactor
        );
        drawingObject.polylist.dim.y = ShapeUtil.ToSDJSCoords(
          codeData.codes[codeIndex].data.dim.y,
          resultObject.coordScaleFactor
        );
      }

      // Move to the next code
      codeIndex++;

      // Process all polyline segments until we reach the end marker
      while (codeData.codes[codeIndex].code != DSConstant.OpNameCode.cDrawPolyEnd) {
        switch (codeData.codes[codeIndex].code) {
          case opCodes.cDrawPolySeg://SDF_C_DRAWPOLYSEG:
            // Process a single polyline segment
            segmentData = codeData.codes[codeIndex].data;

            // Convert coordinates with proper scaling
            xCoordinate = ShapeUtil.ToSDJSCoords(segmentData.lpt.x, resultObject.coordScaleFactor, true);
            yCoordinate = ShapeUtil.ToSDJSCoords(segmentData.lpt.y, resultObject.coordScaleFactor, true);

            // Handle first point specially
            if (isFirstPoint) {
              startPoint.x = xCoordinate + drawingObject.Frame.x;
              startPoint.y = yCoordinate + drawingObject.Frame.y;
              xCoordinate = 0;
              yCoordinate = 0;
              isFirstPoint = false;
              offsetX = startPoint.x - drawingObject.Frame.x;
              offsetY = startPoint.y - drawingObject.Frame.y;
            } else {
              // Adjust coordinates relative to offset
              xCoordinate -= offsetX;
              yCoordinate -= offsetY;
            }

            // Update end point
            endPoint.x = xCoordinate + startPoint.x;
            endPoint.y = yCoordinate + startPoint.y;

            // Create a new segment with converted line type
            polySegment = new PolySeg(
              ShapeUtil.OTypeToLineType(
                segmentData.otype,
                segmentData.dataclass,
                segmentData.ShortRef
              ),
              xCoordinate,
              yCoordinate
            );

            polySegment.dataclass = segmentData.dataclass;

            // First segment in a polyline is always a straight line
            segmentCount = drawingObject.polylist.segs.length;
            if (segmentCount === 0) {
              polySegment.LineType = OptConstant.LineType.LINE;
            }

            // Apply specific properties based on line type
            switch (polySegment.LineType) {
              case OptConstant.LineType.PARABOLA:
                polySegment.param = ShapeUtil.ToSDJSCoords(segmentData.param, resultObject.coordScaleFactor, true);
                polySegment.ShortRef = ShapeUtil.ToSDJSCoords(segmentData.ShortRef, resultObject.coordScaleFactor, true);
                break;

              case OptConstant.LineType.NURBS:
              case OptConstant.LineType.NURBSSEG:
              case OptConstant.LineType.ELLIPSE:
              case OptConstant.LineType.ELLIPSEEND:
              case OptConstant.LineType.QUADBEZ:
              case OptConstant.LineType.QUADBEZCON:
              case OptConstant.LineType.CUBEBEZ:
              case OptConstant.LineType.CUBEBEZCON:
              case OptConstant.LineType.SPLINE:
              case OptConstant.LineType.SPLINECON:
                polySegment.param = segmentData.param;
                polySegment.ShortRef = segmentData.ShortRef;
                polySegment.weight = segmentData.weight;
                polySegment.dataclass = segmentData.dataclass;
                resultObject.VisioFileVersion = true;
                break;

              case OptConstant.LineType.ARCLINE:
                polySegment.param = ShapeUtil.ToSDJSCoords(segmentData.param, resultObject.coordScaleFactor, true);
                polySegment.ShortRef = segmentData.ShortRef;

                // Fix arc orientation for horizontal arcs
                segmentCount = drawingObject.polylist.segs.length;
                if (Math.abs(polySegment.pt.y - drawingObject.polylist.segs[segmentCount - 1].pt.y) < 1 / 6 &&
                  polySegment.pt.x < drawingObject.polylist.segs[segmentCount - 1].pt.x) {
                  polySegment.param = -polySegment.param;
                }
                break;

              case OptConstant.LineType.MOVETO:
                drawingObject.polylist.flags = Utils2.SetFlag(
                  drawingObject.polylist.flags,
                  DSConstant.PolyListFlags.HasMoveTo,
                  true
                );
                polySegment.param = segmentData.param;
                polySegment.ShortRef = segmentData.ShortRef;
                resultObject.VisioFileVersion = true;
                break;

              case OptConstant.LineType.MOVETO_NEWPOLY:
                drawingObject.polylist.flags = Utils2.SetFlag(
                  drawingObject.polylist.flags,
                  DSConstant.PolyListFlags.HasPolyPoly,
                  true
                );
                polySegment.param = segmentData.param;
                polySegment.ShortRef = segmentData.ShortRef;
                isPolygon = true;
                resultObject.VisioFileVersion = true;
                break;

              default:
                polySegment.param = segmentData.param;
                polySegment.ShortRef = segmentData.ShortRef;
            }

            // Set dimension deflection and flags
            polySegment.dimDeflection = ShapeUtil.ToSDJSCoords(
              segmentData.dimDeflection,
              resultObject.coordScaleFactor,
              true
            );
            polySegment.flags = segmentData.flags || 0;

            // Add segment to polylist
            drawingObject.polylist.segs.push(polySegment);
            break;

          case opCodes.SDF_C_POLYSEGEXPLICITPOINTS:
            // Process explicit point lists for polylines
            segmentData = codeData.codes[codeIndex].data;

            // Mark polylist as using explicit points
            drawingObject.polylist.flags = Utils2.SetFlag(
              drawingObject.polylist.flags,
              DSConstant.PolyListFlags.WasExplict,
              true
            );

            // Process each point in the explicit list
            for (segmentIndex = 0; segmentIndex < segmentData.npts; segmentIndex++) {
              xCoordinate = ShapeUtil.ToSDJSCoords(segmentData.pt[segmentIndex].x, resultObject.coordScaleFactor, true);
              yCoordinate = ShapeUtil.ToSDJSCoords(segmentData.pt[segmentIndex].y, resultObject.coordScaleFactor, true);

              // Handle first point specially
              if (isFirstPoint) {
                startPoint.x = xCoordinate + drawingObject.Frame.x;
                startPoint.y = yCoordinate + drawingObject.Frame.y;
                xCoordinate = 0;
                yCoordinate = 0;
                isFirstPoint = false;
                offsetX = startPoint.x - drawingObject.Frame.x;
                offsetY = startPoint.y - drawingObject.Frame.y;
              } else {
                // Adjust coordinates relative to offset
                xCoordinate -= offsetX;
                yCoordinate -= offsetY;
              }

              // Update end point
              endPoint.x = xCoordinate + startPoint.x;
              endPoint.y = yCoordinate + startPoint.y;

              // Create a simple line segment for each point
              polySegment = new PolySeg(OptConstant.LineType.LINE, xCoordinate, yCoordinate);
              polySegment.dataclass = 0;
              polySegment.ShortRef = 0;
              polySegment.param = 0;
              polySegment.dimDeflection = 0;
              polySegment.flags = 0;

              drawingObject.polylist.segs.push(polySegment);
            }
            break;

          default:
            // Handle nested structures by recursively reading frames
            if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
              codeIndex = ShapeUtil.ReadFrame(
                codeData,
                codeIndex,
                (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
              );
            }
        }

        codeIndex++;
      }

      // Convert polyline format if needed
      if ((drawingObject.polylist.flags & DSConstant.PolyListFlags.FreeHand) === 0) {
        ShapeUtil.ConvertToPolyL(drawingObject);
      }

      // Check if polyline is closed (forms a loop)
      if (isPolygon || (Math.abs(startPoint.x - endPoint.x) < 0.001 && Math.abs(startPoint.y - endPoint.y) < 0.001)) {
        drawingObject.polylist.closed = true;
      }

      // Special handling for Visio files
      if (resultObject.IsVisio) {
        const flipFlags = OptConstant.ExtraFlags;

        // Handle flipping operations
        if (drawingObject.extraflags & (flipFlags.FlipHoriz | flipFlags.FlipVert)) {
          if (isPolygon) {
            drawingObject.StartPoint = startPoint;
            drawingObject.EndPoint = endPoint;
            drawingObject.polylist.offset.x = startPoint.x - drawingObject.Frame.x;
            drawingObject.polylist.offset.y = startPoint.y - drawingObject.Frame.y;
            drawingObject.Flip(drawingObject.extraflags, true);
            startPoint = drawingObject.StartPoint;
            endPoint = drawingObject.EndPoint;
          } else {
            drawingObject.StartPoint = startPoint;
            drawingObject.EndPoint = endPoint;
            drawingObject.Flip(drawingObject.extraflags, true);
            startPoint = drawingObject.StartPoint;
            endPoint = drawingObject.EndPoint;
          }

          // Clear flip flags after applying
          drawingObject.extraflags = Utils2.SetFlag(drawingObject.extraflags, flipFlags.FlipHoriz, false);
          drawingObject.extraflags = Utils2.SetFlag(drawingObject.extraflags, flipFlags.FlipVert, false);
        }

        // Update start and end points
        drawingObject.StartPoint = startPoint;
        drawingObject.EndPoint = endPoint;

        if (isPolygon) {
          drawingObject.polylist.offset.x = startPoint.x - drawingObject.Frame.x;
          drawingObject.polylist.offset.y = startPoint.y - drawingObject.Frame.y;
        }

        startPoint = drawingObject.StartPoint;
        endPoint = drawingObject.EndPoint;
      }

      // Final processing based on shape type
      if (isPolygon) {
        // Build polygon shape from polyline
        ShapeUtil.BuildPolygonShape(drawingObject, startPoint, endPoint, resultObject.IsVisio);
        drawingObject.StartPoint = startPoint;
        drawingObject.EndPoint = endPoint;
        drawingObject.polylist.offset.x = startPoint.x - drawingObject.Frame.x;
        drawingObject.polylist.offset.y = startPoint.y - drawingObject.Frame.y;
      } else {
        // Set start and end points for regular polylines
        drawingObject.StartPoint = startPoint;
        drawingObject.EndPoint = endPoint;
      }
    } else {
      // Handle error case when polylist is missing
      resultObject.error = "BadFormat";
      codeIndex = -1;
    }

    return codeIndex;
  }

  /**
   * Converts an object type to a line type based on object classification
   *
   * This function maps object types from the file format to internal line type constants.
   * It handles various line and curve representations including arcs, bezier curves,
   * ellipses, splines, and special segment types like move-to operations.
   *
   * @param objectType - The object type identifier from the file structure
   * @param dataClass - The data class of the object (often represents subtype information)
   * @param shortReference - A reference value that provides additional type information
   * @returns The appropriate internal line type constant for the given object
   */
  static OTypeToLineType(objectType, dataClass, shortReference) {
    let lineType = OptConstant.LineType.LINE;

    switch (objectType) {
      case ShapeConstant.ObjectTypes.LineD:
        // Direct line: either straight line or arc chord
        lineType = shortReference === OptConstant.LineTypes.LsChord
          ? OptConstant.LineType.ARCLINE
          : OptConstant.LineType.LINE;
        break;

      case ShapeConstant.ObjectTypes.SegL:
        // Segmented line (typically arc segments)
        lineType = OptConstant.LineType.ARCSEGLINE;
        break;

      case ShapeConstant.ObjectTypes.PolyL:
        // Polyline with parabola segments
        lineType = OptConstant.LineType.PARABOLA;
        break;

      case ShapeConstant.ObjectTypes.Nurbs:
        // Non-Uniform Rational B-Spline
        lineType = OptConstant.LineType.NURBS;
        break;

      case ShapeConstant.ObjectTypes.NurbsSeg:
        // Segmented NURBS curve
        lineType = OptConstant.LineType.NURBSSEG;
        break;

      case ShapeConstant.ObjectTypes.Ellipse:
        // Elliptical arc
        lineType = OptConstant.LineType.ELLIPSE;
        break;

      case ShapeConstant.ObjectTypes.EllipseEnd:
        // End of elliptical arc
        lineType = OptConstant.LineType.ELLIPSEEND;
        break;

      case ShapeConstant.ObjectTypes.Quadbez:
        // Quadratic Bezier curve
        lineType = OptConstant.LineType.QUADBEZ;
        break;

      case ShapeConstant.ObjectTypes.QuadbezCon:
        // Connected quadratic Bezier curve
        lineType = OptConstant.LineType.QUADBEZCON;
        break;

      case ShapeConstant.ObjectTypes.Cubebez:
        // Cubic Bezier curve
        lineType = OptConstant.LineType.CUBEBEZ;
        break;

      case ShapeConstant.ObjectTypes.CubebezCon:
        // Connected cubic Bezier curve
        lineType = OptConstant.LineType.CUBEBEZCON;
        break;

      case ShapeConstant.ObjectTypes.Spline:
        // Spline curve
        lineType = OptConstant.LineType.SPLINE;
        break;

      case ShapeConstant.ObjectTypes.SplineCon:
        // Connected spline curve
        lineType = OptConstant.LineType.SPLINECON;
        break;

      case ShapeConstant.ObjectTypes.MoveTo:
        // Move operation without drawing
        lineType = OptConstant.LineType.MOVETO;
        break;

      case ShapeConstant.ObjectTypes.MoveToNewPoly:
        // Move operation that starts a new polygon
        lineType = OptConstant.LineType.MOVETO_NEWPOLY;
    }

    return lineType;
  }

  /**
   * Reads a frame structure from a data stream by skipping nested codes
   *
   * This function processes a frame structure by skipping over all contained
   * codes until it reaches the specified end marker. It handles special cases
   * for certain code types that require remapping to standard end markers, and
   * recursively processes nested frames that may be contained within the current frame.
   *
   * @param codeData - The code data structure containing all operation codes
   * @param codeIndex - The current position in the code structure
   * @param endCodeMarker - The operation code that marks the end of this frame
   * @returns The updated code index position after processing the frame
   */
  static ReadFrame(codeData, codeIndex, endCodeMarker) {
    // Move past the frame's begin code
    codeIndex++;

    // Map special end markers to standard ones for consistency
    switch (endCodeMarker) {
      case DSConstant.OpNameCode.cLongText8End:
        endCodeMarker = DSConstant.OpNameCode.cTextEnd;
        break;

      case 16565:
      case 16566:
        endCodeMarker = DSConstant.OpNameCode.cEndLine;
        break;

      case 16567:
        endCodeMarker = DSConstant.OpNameCode.cEndTextf;
        break;

      case 18550:
        endCodeMarker = 17526;
    }

    // Process all codes until we reach the end marker
    while (codeData.codes[codeIndex].code != endCodeMarker) {
      // If this is the beginning of a nested frame, process it recursively
      if (codeData.codes[codeIndex].code & DSConstant.SDF_BEGIN) {
        codeIndex = ShapeUtil.ReadFrame(
          codeData,
          codeIndex,
          (codeData.codes[codeIndex].code & DSConstant.SDF_MASK) | DSConstant.SDF_END
        );
      }

      codeIndex++;
    }

    return codeIndex;
  }

  /**
   * Converts a polyline object to the proper format by adjusting parameters
   *
   * This function processes segments in the polyline to ensure they have the correct
   * parameters based on their type and position. It specifically handles arc segments
   * that require special parameter adjustments based on their orientation and position
   * relative to adjacent segments. The function marks the polyline as processed
   * to prevent repeated conversions.
   *
   * @param drawingObject - The drawing object containing the polyline to convert
   */
  static ConvertToPolyL(drawingObject) {
    if (drawingObject.polylist &&
      (drawingObject.polylist.flags & DSConstant.PolyListFlags.FreeHand) === 0) {

      const lineTypes = OptConstant.LineType;
      const arcQuadrants = OptConstant.ArcQuad;
      const PI = Math.PI;
      const segmentCount = drawingObject.polylist.segs.length;

      for (let segmentIndex = 0; segmentIndex < segmentCount; segmentIndex++) {
        const currentSegment = drawingObject.polylist.segs[segmentIndex];
        const previousSegment = drawingObject.polylist.segs[segmentIndex - 1];

        switch (currentSegment.LineType) {
          case lineTypes.ARCLINE:
            // Invert arc direction for chord lines
            if (currentSegment.ShortRef === OptConstant.LineTypes.LsChord) {
              currentSegment.param = -currentSegment.param;
            }
            break;

          case lineTypes.ARCSEGLINE:
            // Adjust arc parameters based on relative positions
            if (segmentIndex > 0) {
              switch (currentSegment.ShortRef) {
                case arcQuadrants.SD_PLA_TR: // Top-right quadrant
                  if (currentSegment.pt.x > previousSegment.pt.x) {
                    currentSegment.param = PI / 2;
                    currentSegment.ShortRef = arcQuadrants.SD_PLA_TL;
                  }
                  break;

                case arcQuadrants.SD_PLA_BR: // Bottom-right quadrant
                  if (currentSegment.pt.x > previousSegment.pt.x) {
                    currentSegment.param = -PI / 2;
                  }
                  break;

                case arcQuadrants.SD_PLA_TL: // Top-left quadrant
                  if (currentSegment.pt.x < previousSegment.pt.x) {
                    currentSegment.param = -PI / 2;
                  }
                  break;

                case arcQuadrants.SD_PLA_BL: // Bottom-left quadrant
                  if (currentSegment.pt.x < previousSegment.pt.x) {
                    currentSegment.param = PI / 2;
                  }
                  break;
              }
            }
            break;
        }
      }

      // Mark polyline as processed with freehand flag
      drawingObject.polylist.flag = Utils2.SetFlag(
        drawingObject.polylist.flags,
        DSConstant.PolyListFlags.FreeHand,
        true
      );
    }
  }

  /**
   * Builds a polygon shape from polyline data
   *
   * This function transforms a polyline into a polygon shape by calculating vertices
   * based on the polyline segments. It handles both simple polygons and complex
   * geometries with holes or multiple parts (via MOVETO operations). The function
   * scales vertices appropriately, manages special cases for Visio imports, and
   * creates geometry models that describe the polygon's structure.
   *
   * @param drawingObject - The drawing object to convert into a polygon
   * @param startPoint - The starting point of the polyline
   * @param endPoint - The ending point of the polyline
   * @param isVisioFormat - Flag indicating whether this is a Visio format import
   */
  static BuildPolygonShape(drawingObject, startPoint, endPoint, isVisioFormat) {
    let polyLineConfig = { Frame: drawingObject.Frame, inside: drawingObject.inside };
    let vertices = [];
    let pointsCount, segmentIndex, boundingBox, scaleWidth, scaleHeight;
    let segmentMarkers = [];
    let polyLine, currentSegment, initialSegment;

    // Initialize polyline configuration
    polyLineConfig.Frame = drawingObject.Frame;
    polyLineConfig.inside = drawingObject.inside;

    // Create a temporary polyline to use for calculations
    polyLine = new Instance.Shape.PolyLine(polyLineConfig);
    polyLine.polylist = drawingObject.polylist;
    polyLine.StartPoint = startPoint;
    polyLine.EndPoint = endPoint;

    // Track segment markers for complex polygons
    let hasComplexGeometry = false;
    const visioPolyFlag = OptConstant.ObjMoreFlags.SED_MF_VisioPoly;

    // Special handling for Visio polygons
    if (drawingObject.moreflags & visioPolyFlag) {
      isVisioFormat = true;
    }

    // Handle non-Visio formats with zero border thickness differently
    if (!isVisioFormat && drawingObject.StyleRecord.Line.BThick === 0) {
      polyLine.inside = polyLine.Frame;
    }

    // Get the points from the polyline
    let polyPoints = polyLine.GetPolyPoints(OptConstant.Common.MaxPolyPoints, true, false, false, segmentMarkers);
    pointsCount = polyPoints.length;

    // Handle complex geometry with holes or multiple parts
    let geometryModels = [];
    let currentGeometry, geometryStartSegment;
    const polyFlags = DSConstant.PolyListFlags;
    const segmentFlags = DSConstant.PolySegFlags;
    const lineTypeEnum = OptConstant.LineType;

    if (drawingObject.polylist.flags & polyFlags.HasMoveTo ||
      drawingObject.polylist.flags & polyFlags.HasPolyPoly) {

      const segmentCount = drawingObject.polylist.segs.length;
      hasComplexGeometry = true;

      // Get initial segment and create first geometry model
      currentSegment = drawingObject.polylist.segs[0];
      currentGeometry = new PolyGeomMd(
        (currentSegment.flags & segmentFlags.NoFill) > 0,
        (currentSegment.flags & segmentFlags.NoLine) > 0,
        false,
        0,
        0
      );
      geometryStartSegment = drawingObject.polylist.segs[0];

      // Process all segments to build geometry models
      for (segmentIndex = 1; segmentIndex < segmentCount; segmentIndex++) {
        currentSegment = drawingObject.polylist.segs[segmentIndex];

        switch (currentSegment.LineType) {
          case lineTypeEnum.MOVETO_NEWPOLY:
            // Finish current geometry and start a new one
            currentGeometry.NPoints = segmentMarkers[segmentIndex - 1] - currentGeometry.Offset;
            currentGeometry.Closed = Utils2.EqualPt(
              drawingObject.polylist.segs[segmentIndex - 1].pt,
              geometryStartSegment.pt
            );
            geometryModels.push(currentGeometry);

            // Create new geometry
            currentGeometry = new PolyGeomMd(
              (currentSegment.flags & segmentFlags.NoFill) > 0,
              (currentSegment.flags & segmentFlags.NoLine) > 0,
              false,
              segmentMarkers[segmentIndex - 1],
              0
            );
            geometryStartSegment = currentSegment;
            break;

          case lineTypeEnum.MOVETO:
            // Record move-to points for interior holes
            currentGeometry.MoveTo.push(segmentMarkers[segmentIndex - 1] - currentGeometry.Offset);

            if (segmentIndex < segmentCount - 1) {
              currentGeometry.MoveTo.push(segmentMarkers[segmentIndex] - currentGeometry.Offset);
            } else {
              currentGeometry.MoveTo.push(pointsCount - currentGeometry.Offset);
            }
            break;
        }
      }

      // Finalize last geometry model
      currentSegment = drawingObject.polylist.segs[segmentCount - 1];
      currentGeometry.NPoints = pointsCount - currentGeometry.Offset;
      currentGeometry.Closed = Utils2.EqualPt(currentSegment.pt, geometryStartSegment.pt);
      geometryModels.push(currentGeometry);

      // Store geometry models in the drawing object
      drawingObject.Geometries = geometryModels;
    }

    // Calculate scaling factors
    scaleWidth = drawingObject.Frame.width;
    if (scaleWidth < 0.1) scaleWidth = 1;

    scaleHeight = drawingObject.Frame.height;
    if (scaleHeight < 0.1) scaleHeight = 1;

    // Get bounding box for the polygon
    boundingBox = {};
    Utils2.GetPolyRect(boundingBox, polyPoints);

    // Special handling for Visio format
    if (isVisioFormat) {
      if (boundingBox.x < 0) boundingBox.x = 0;
      if (boundingBox.y < 0) boundingBox.y = 0;
      boundingBox.x = 0;
      boundingBox.y = 0;
      drawingObject.moreflags = Utils2.SetFlag(drawingObject.moreflags, visioPolyFlag, true);
    }

    // Create normalized vertices
    for (segmentIndex = 0; segmentIndex < pointsCount; segmentIndex++) {
      // Skip duplicate points except for complex geometries
      if (segmentIndex > 0 && !hasComplexGeometry &&
        polyPoints[segmentIndex].x === polyPoints[segmentIndex - 1].x &&
        polyPoints[segmentIndex].y === polyPoints[segmentIndex - 1].y) {
        continue;
      }

      // Normalize coordinates relative to bounding box and scale
      polyPoints[segmentIndex].x -= boundingBox.x;
      polyPoints[segmentIndex].y -= boundingBox.y;

      const normalizedPoint = new Point(
        polyPoints[segmentIndex].x / scaleWidth,
        polyPoints[segmentIndex].y / scaleHeight
      );
      vertices.push(normalizedPoint);
    }

    // Assign the final vertex array to the drawing object
    drawingObject.VertexArray = vertices;
  }

  static PointSizeToFontSize(e) {
    return e * T3Gv.opt.svgDoc.GetWorkArea().docDpi / 72
  }

  static WriteTextBlock(e, t, a, r) {
    var i = new ArrayBuffer(10)
      , n = new T3DataStream(i);
    return n.endianness = T3DataStream.LITTLE_ENDIAN,
      ShapeUtil.WriteBlockWrapper(n, t.state, t.delta, ShapeUtil.BlockIDs.Text, e.ID, r, t.nblocks, t.BlockAction),
      ShapeUtil.WriteText(n, null, null, e, a, t),
      new Uint8Array(n.buffer)
  }

  /**
   * Writes text content to a data stream in SDF format
   *
   * This function serializes text content with formatting to a binary data stream.
   * It handles character styles, paragraph formatting, hyperlinks, and data fields.
   * The function supports both standard text and comments/notes, applying appropriate
   * encoding and structure based on the document format (standard, Visio, or Windows).
   *
   * @param dataStream - The data stream to write the text content to
   * @param drawingObject - The drawing object that may contain text (optional)
   * @param containerObject - The container object that may contain text (optional)
   * @param textBlock - The text block object containing text content (optional)
   * @param isComment - Flag indicating whether this is a comment/note
   * @param resultObject - Object containing formatting context and serialization settings
   */
  static WriteText(dataStream, drawingObject, containerObject, textBlock, isComment, resultObject) {
    // Determine the text source object and its ID
    let textSourceObject, textSourceId;

    if (textBlock) {
      // Use provided text block directly
      textSourceObject = textBlock;
      textSourceId = textBlock.ID;
    } else if (isComment) {
      // Get comment/note text
      if (drawingObject) {
        textSourceObject = T3Gv.stdObj.GetObject(drawingObject.NoteID);
        textSourceId = drawingObject.NoteID;
      } else if (containerObject) {
        textSourceObject = T3Gv.stdObj.GetObject(containerObject.NoteID);
        textSourceId = containerObject.NoteID;
      }
    } else {
      // Get regular text data
      if (drawingObject) {
        textSourceObject = T3Gv.stdObj.GetObject(drawingObject.DataID);
        textSourceId = drawingObject.DataID;
      } else if (containerObject) {
        textSourceObject = T3Gv.stdObj.GetObject(containerObject.DataID);
        textSourceId = containerObject.DataID;
      }
    }

    // Only proceed if we have a valid text source
    if (textSourceObject != null) {
      let styleIndex, paraIndex, charStyleCount, currStyle, currParaStyle;
      let styleOffset, stylePosition, styleBucketIndex, charStyle, paraStyle;
      let runtimeText = textSourceObject.Data.runtimeText;
      let paragraphStyles = [];
      let dataFields = [];

      // Create default text if not provided
      if (!runtimeText) {
        if (!textBlock) {
          return;
        }
        runtimeText = T3Gv.opt.svgDoc.CreateShape(OptConstant.CSType.Text).GetRuntimeText();
      }

      // Create style mapping arrays
      let styleOffsets = [];
      // let stylePosition = 0;
      charStyleCount = runtimeText.charStyles.length;
      styleOffsets = new Array(charStyleCount);

      // Initialize style offsets for each character
      for (styleIndex = 0; styleIndex < charStyleCount; styleIndex++) {
        styleOffsets[styleIndex] = stylePosition;
      }

      // Map paragraph styles to characters
      for (paraIndex = 0; paraIndex < runtimeText.paraInfo.length; paraIndex++) {
        stylePosition = ShapeUtil.PStyleListAdd(paragraphStyles, runtimeText.paraInfo[paraIndex].pStyle);

        // Apply this paragraph style to all characters in the paragraph
        for (styleIndex = runtimeText.paraInfo[paraIndex].offset; styleIndex < charStyleCount; styleIndex++) {
          styleOffsets[styleIndex] = stylePosition;
        }
      }

      // Build style change records by finding transitions
      let styleChanges = [];
      let currentCharStyle = -1;
      let currentParaStyle = -1;

      // Handle empty text case
      if (charStyleCount === 0) {
        currentCharStyle = 0;
        currentParaStyle = runtimeText.paraInfo[0];
        styleChanges.push({
          style: 0,
          para: currentParaStyle,
          offset: 0
        });
      } else {
        // Record style changes at each transition point
        for (styleIndex = 0; styleIndex < charStyleCount; styleIndex++) {
          if (currentCharStyle != runtimeText.charStyles[styleIndex] ||
            currentParaStyle != styleOffsets[styleIndex]) {

            currentCharStyle = runtimeText.charStyles[styleIndex];
            currentParaStyle = styleOffsets[styleIndex];
            styleChanges.push({
              style: currentCharStyle,
              para: currentParaStyle,
              offset: styleIndex
            });
          }
        }
      }

      // Create text header structure based on format
      let textHeader;
      let headerStruct;

      if (resultObject.WriteVisio || resultObject.WriteWin32) {
        // Windows/Visio format with expanded header
        textHeader = {
          InstID: textSourceId,
          nruns: styleChanges.length,
          nstyles: paragraphStyles.length,
          nchar: runtimeText.text.length,
          flags: 2,
          margins: {
            left: 0,
            top: 0,
            right: 0,
            bottom: 0
          },
          nlinks: 0,
          nlinkchar: 0,
          markupobjid: -1
        };
        headerStruct = DSConstant.LongText8Struct;

        // Count hyperlinks and their character lengths
        textHeader.nlinks = runtimeText.hyperlinks.length;
        for (styleIndex = 0; styleIndex < runtimeText.hyperlinks.length; styleIndex++) {
          textHeader.nlinkchar += runtimeText.hyperlinks[styleIndex].length + 1;
        }
      } else {
        // Standard format with compact header
        textHeader = {
          InstID: textSourceId,
          nstyles: paragraphStyles.length
        };
        headerStruct = DSConstant.SDF_LONGTEXT8_Struct_8;
      }

      // Write appropriate header based on content type
      let codeOffset;
      if (isComment) {
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cComment);
        dataStream.writeStruct(headerStruct, textHeader);
        ShapeUtil.WriteLength(dataStream, codeOffset);
      } else {
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cLongText8);
        dataStream.writeStruct(headerStruct, textHeader);
        ShapeUtil.WriteLength(dataStream, codeOffset);
      }

      // Write text content with CR line endings
      codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTextChar);
      let textContent = String(runtimeText.text).replace(/\n/g, "\r");
      dataStream.writeUCS2String(textContent, T3DataStream.LITTLE_ENDIAN);
      ShapeUtil.WriteLength(dataStream, codeOffset);

      // Write text runs header
      codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTextRun);
      let runsHeader = {
        nruns: styleChanges.length
      };
      dataStream.writeStruct(DSConstant.SDF_TEXTRUNS_Header, runsHeader);

      // Write each text run with its styles
      for (styleIndex = 0; styleIndex < styleChanges.length; styleIndex++) {
        let runHeader = {
          ncodes: 9, // Base number of style codes
          offset: styleChanges[styleIndex].offset
        };

        // Get character and paragraph style for this run
        currStyle = runtimeText.styles[styleChanges[styleIndex].style];
        currParaStyle = styleChanges[styleIndex].para;

        // Add data field if present
        if (currStyle.dataField) {
          runHeader.ncodes++;
        }

        // Write run header
        dataStream.writeStruct(DSConstant.TextChangeHeader, runHeader);

        // Write font ID
        let styleCode = {
          code: TextConstant.TextStyleCodes.Font,
          value: ShapeUtil.GetFontID(currStyle.font, resultObject.fontlist)
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write font size (different formats for Visio vs standard)
        if (resultObject.WriteVisio || resultObject.WriteWin32) {
          styleCode = {
            code: TextConstant.TextStyleCodes.Size,
            value: ShapeUtil.TextSizeToPointSize(currStyle.size, resultObject)
          };
          dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);
        } else {
          styleCode = {
            code: TextConstant.TextStyleCodes.SizeFloat,
            value: currStyle.size
          };
          dataStream.writeStruct(DSConstant.TextCodeStructFloat, styleCode);
        }

        // Write font face attributes (bold, italic, underline, strikethrough)
        styleCode = {
          code: TextConstant.TextStyleCodes.Face,
          value: 0
        };

        if (currStyle.weight == "bold") {
          styleCode.value += TextConstant.TextFace.Bold;
        }

        if (currStyle.style == "italic") {
          styleCode.value += TextConstant.TextFace.Italic;
        }

        if (currStyle.decoration == "underline") {
          styleCode.value += TextConstant.TextFace.Under;
        } else if (currStyle.decoration == "line-through") {
          styleCode.value += TextConstant.TextFace.Strike;
        }

        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write baseline offset (subscript/superscript)
        styleCode = {
          code: TextConstant.TextStyleCodes.Extra,
          value: 0
        };

        if (currStyle.baseOffset == "sub") {
          styleCode.value = DSConstant.ToUInt32(-1);
        } else if (currStyle.baseOffset == "super") {
          styleCode.value = 1;
        }

        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write paint type (always solid color for now)
        styleCode = {
          code: TextConstant.TextStyleCodes.PaintType,
          value: 1
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write color with transparency
        styleCode = {
          code: TextConstant.TextStyleCodes.Color,
          value: ShapeUtil.HTMLColorToWin(currStyle.color, currStyle.colorTrans)
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write text flags (spell check errors)
        styleCode = {
          code: TextConstant.TextStyleCodes.Flags,
          value: currStyle.spError ? TextConstant.TextFlags.BadSpell : 0
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write style ID reference
        styleCode = {
          code: TextConstant.TextStyleCodes.StyleId,
          value: currParaStyle
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write hyperlink ID reference
        styleCode = {
          code: TextConstant.TextStyleCodes.LinkId,
          value: ShapeUtil.ToUInt32(currStyle.hyperlink)
        };
        dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);

        // Write data field reference if present
        if (currStyle.dataField) {
          let dataFieldIndex = dataFields.indexOf(currStyle.dataField);

          if (dataFieldIndex < 0) {
            dataFieldIndex = dataFields.length;
            dataFields.push(currStyle.dataField);
          }

          styleCode = {
            code: TextConstant.TextStyleCodes.DataId,
            value: dataFieldIndex
          };
          dataStream.writeStruct(DSConstant.TextCodeStruct, styleCode);
        }
      }

      ShapeUtil.WriteLength(dataStream, codeOffset);

      // Write paragraph styles
      for (styleIndex = 0; styleIndex < paragraphStyles.length; styleIndex++) {
        // Begin style definition
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTextStyle);

        let styleHeader = {
          index: styleIndex,
          ncodes: 7 // Number of style properties
        };
        dataStream.writeStruct(DSConstant.SDF_TEXTSTYLE_Header, styleHeader);

        // Write justification/alignment
        let styleProperty = {
          code: StyleConstant.ParaStyleCodes.Just,
          value: 0
        };

        switch (paragraphStyles[styleIndex].just) {
          case "left":
            styleProperty.value = TextConstant.TextJust.Left;
            break;
          case "right":
            styleProperty.value = TextConstant.TextJust.Right;
            break;
          default:
            styleProperty.value = TextConstant.TextJust.Center;
        }
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);

        // Write bullet style
        styleProperty.code = StyleConstant.ParaStyleCodes.Bullet;

        switch (paragraphStyles[styleIndex].bullet) {
          case "hround":
            styleProperty.value = 1;
            break;
          case "sround":
            styleProperty.value = 2;
            break;
          case "hsquare":
            styleProperty.value = 3;
            break;
          case "ssquare":
            styleProperty.value = 4;
            break;
          case "diamond":
            styleProperty.value = 5;
            break;
          case "chevron":
            styleProperty.value = 6;
            break;
          case "check":
            styleProperty.value = 7;
            break;
          case "plus":
            styleProperty.value = 8;
            break;
          default:
            styleProperty.value = 0;
        }
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);

        // Write line spacing
        styleProperty.code = StyleConstant.ParaStyleCodes.Spacing;

        if (paragraphStyles[styleIndex].spacing < 0) {
          styleProperty.value = ShapeUtil.ToSDWinCoords(
            paragraphStyles[styleIndex].spacing,
            resultObject.coordScaleFactor
          );
        } else {
          styleProperty.value = Math.round(100 * paragraphStyles[styleIndex].spacing);
        }
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);

        // Write paragraph indentation
        styleProperty.code = StyleConstant.ParaStyleCodes.Pindent;
        styleProperty.value = ShapeUtil.ToSDWinCoords(
          paragraphStyles[styleIndex].pindent,
          resultObject.coordScaleFactor
        );
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);
        ShapeUtil.WriteLength(dataStream, codeOffset);

        // Write left indentation (or bullet indentation)
        styleProperty.code = StyleConstant.ParaStyleCodes.Lindent;
        styleProperty.value = ShapeUtil.ToSDWinCoords(
          paragraphStyles[styleIndex].bindent ?
            paragraphStyles[styleIndex].bindent :
            paragraphStyles[styleIndex].lindent,
          resultObject.coordScaleFactor
        );
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);
        ShapeUtil.WriteLength(dataStream, codeOffset);

        // Write right indentation
        styleProperty.code = StyleConstant.ParaStyleCodes.Rindent;
        styleProperty.value = ShapeUtil.ToSDWinCoords(
          paragraphStyles[styleIndex].rindent,
          resultObject.coordScaleFactor
        );
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);
        ShapeUtil.WriteLength(dataStream, codeOffset);

        // Write tab spacing
        styleProperty.code = StyleConstant.ParaStyleCodes.TabSpace;
        styleProperty.value = ShapeUtil.ToSDWinCoords(
          paragraphStyles[styleIndex].tabspace,
          resultObject.coordScaleFactor
        );
        dataStream.writeStruct(DSConstant.StyleCodeStruct, styleProperty);
        ShapeUtil.WriteLength(dataStream, codeOffset);
      }

      // Write hyperlinks
      for (styleIndex = 0; styleIndex < runtimeText.hyperlinks.length; styleIndex++) {
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTextLink);
        dataStream.writeUint16(styleIndex);
        dataStream.writeUint16(2); // Link type (standard URL)
        dataStream.writeUCS2String(
          runtimeText.hyperlinks[styleIndex],
          T3DataStream.LITTLE_ENDIAN,
          runtimeText.hyperlinks[styleIndex].length + 1
        );
        ShapeUtil.WriteLength(dataStream, codeOffset);
      }

      // Write data fields
      for (styleIndex = 0; styleIndex < dataFields.length; styleIndex++) {
        codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cTextData);
        dataStream.writeUint16(styleIndex);
        dataStream.writeUCS2String(
          dataFields[styleIndex],
          T3DataStream.LITTLE_ENDIAN,
          dataFields[styleIndex].length + 1
        );
        ShapeUtil.WriteLength(dataStream, codeOffset);
      }

      // Write appropriate end marker
      if (isComment) {
        dataStream.writeUint16(DSConstant.OpNameCode.cCommentEnd);
      } else {
        dataStream.writeUint16(DSConstant.OpNameCode.cTextEnd);
      }
    }
  }

  /**
   * Converts a font size from device pixels to typographic point size
   *
   * This function converts a font size expressed in device-independent units (based on the
   * document DPI) to a standard typographic point size (72 points per inch). It properly
   * handles the scaling based on the current document resolution to ensure consistent
   * text appearance across different display environments.
   *
   * @param fontSize - The font size in device-independent units
   * @param resultObject - Object containing document DPI information (optional)
   * @returns The font size in points (rounded to the nearest integer)
   */
  static TextSizeToPointSize(fontSize, resultObject) {
    let documentDpi = 0;

    if (resultObject) {
      documentDpi = resultObject.docDpi;
    } else {
      documentDpi = T3Gv.opt.svgDoc.GetWorkArea().docDpi;
    }

    return Math.round(72 * fontSize / documentDpi);
  }

  /**
   * Converts a value to an unsigned 32-bit integer
   *
   * This function performs a zero-fill right shift operation to ensure the value
   * is treated as an unsigned 32-bit integer. This is important for file format
   * compatibility where certain values must be represented as unsigned integers.
   *
   * @param value - The value to convert to an unsigned 32-bit integer
   * @returns The value as an unsigned 32-bit integer
   */
  static ToUInt32(value) {
    return value >>> 0;
  }

  /**
   * Adds a paragraph style to a style list if it doesn't already exist
   *
   * This function checks if a paragraph style with identical properties already exists
   * in the style list. If found, it returns the index of the matching style.
   * If not found, it adds the new style to the list and returns its index.
   * This prevents duplicate styles and maintains a clean style list.
   *
   * @param styleList - The list of paragraph styles to check and potentially modify
   * @param newStyle - The paragraph style to add if not already present
   * @returns The index of the style in the list (either existing or newly added)
   */
  static PStyleListAdd(styleList, newStyle) {
    let styleIndex, styleCount;

    styleCount = styleList.length;
    for (styleIndex = 0; styleIndex < styleCount; styleIndex++) {
      if (styleList[styleIndex].just == newStyle.just &&
        styleList[styleIndex].bullet == newStyle.bullet &&
        styleList[styleIndex].spacing == newStyle.spacing &&
        styleList[styleIndex].pindent == newStyle.pindent &&
        styleList[styleIndex].lindent == newStyle.lindent &&
        styleList[styleIndex].rindent == newStyle.rindent &&
        styleList[styleIndex].bindent == newStyle.bindent &&
        styleList[styleIndex].tabspace == newStyle.tabspace) {
        return styleIndex;
      }
    }

    styleList.push(newStyle);
    return styleCount;
  }

  /**
   * Writes an image block to a buffer in SDF format
   *
   * This function serializes image data into a structured block with proper headers
   * and metadata. It includes the image's identifier, type information, and binary
   * content. The function creates a complete image block that can be embedded in
   * an SDF document or used standalone.
   *
   * @param imageObject - The image object containing the binary data and metadata
   * @param resultObject - Object containing serialization context and state information
   * @param blockIndex - The index of this block in the document sequence
   * @returns A Uint8Array containing the serialized image block
   */
  static WriteImageBlock(imageObject, resultObject, blockIndex) {
    const buffer = new ArrayBuffer(10);
    const dataStream = new T3DataStream(buffer);

    dataStream.endianness = T3DataStream.LITTLE_ENDIAN;

    this.WriteBlockWrapper(
      dataStream,
      resultObject.state,
      resultObject.delta,
      ShapeUtil.BlockIDs.Image,
      imageObject.ID,
      blockIndex,
      resultObject.nblocks,
      resultObject.BlockAction
    );

    const codeOffset = ShapeUtil.WriteCode(dataStream, DSConstant.OpNameCode.cImageBlock);

    const imageMetadata = {
      value: imageObject.ID,
      type: imageObject.Data.ImageDir
    };

    dataStream.writeStruct(DSConstant.LONGVALUE2_Struct, imageMetadata);
    DSUtil.writeNativeByteArray(dataStream, imageObject.Data.Bytes);

    this.WriteLength(dataStream, codeOffset);

    return new Uint8Array(dataStream.buffer);
  }
}

export default ShapeUtil
