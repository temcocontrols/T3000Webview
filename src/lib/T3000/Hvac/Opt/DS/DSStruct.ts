import DSConstant from "./DSConstant";
import DSUtil from "./DSUtil";


/**
 * A class for defining structured binary data parsers for Shape Description Records (SDR).
 *
 * This class provides standardized parsing structures for T3000 SDR file formats.
 * It contains definitions that map binary data into structured JavaScript objects,
 * enabling systematic parsing of different SDR document components.
 *
 * The class provides two main parser structures:
 * - T3Struct: For complete SDR document parsing
 * - T3HeaderOnlyStruct: For lightweight parsing of just the header information
 *
 * @example
 * // Parse a complete SDR document
 * import { DSStruct, DataStream } from './T3000/Hvac/Opt/DS';
 *
 * const dataStream = new DataStream(fileBuffer);
 * const parser = new BinaryParser(DSStruct.T3Struct);
 * const parsedDocument = parser.parse(dataStream);
 *
 * // Header-only parsing for quick metadata access
 * const headerParser = new BinaryParser(DSStruct.T3HeaderOnlyStruct);
 * const documentMetadata = headerParser.parse(dataStream);
 * console.log(documentMetadata.codes.find(c => c.code === DSConstant.OpNameCode.cVersion)?.data);
 */
class DSStruct {

  /**
   * Parser structure definition for Shape Description Records (SDR)
   * Used to parse the complete structure of SDR documents
   */
  static T3Struct = [
    "start",
    /**
     * Reads the file signature and validates it against the expected signature
     * @param dataStream - The data stream to read from
     * @returns The signature if valid, null otherwise
     */
    function (dataStream) {
      const signature = dataStream.readString(8);
      // Check if signature matches expected value
      const validSignature = signature == DSConstant.Signature ? signature : null;
      // Default to Unicode mode
      DSConstant.ReadUnicode = true;
      return validSignature;
    },
    "codes",
    ["[]", [
      "code",
      "uint16",
      "codeName",
      /**
       * Maps numeric operation code to its string name
       * @param stream - The data stream (unused)
       * @param codeData - The code data object containing the numeric code
       * @returns String name of the operation code or "Unknown" if not found
       */
      function (stream, codeData) {
        return DSConstant.OpCodeName[codeData.code] || "Unknown";
      },
      "length",
      /**
       * Reads the length of data for this operation code
       * @param stream - The data stream to read from
       * @param codeData - The code data object
       * @returns Length of the data block, or 0 if this is a control code (bit 0x4000 set)
       */
      function (stream, codeData) {
        return (codeData.code & 0x4000) ? 0 : stream.readUint32();
      },
      "data",
      {
        /**
         * Reads and parses operation data based on operation code
         * @param stream - The data stream to read from
         * @param codeData - The code data object containing code and length
         * @returns Parsed data object or string representation
         */
        get: function (stream, codeData) {
          // Skip control codes (bit 0x4000 set)
          if (codeData.code & 0x4000) {
            return 0;
          }

          let parsedData: any;

          switch (codeData.code) {
            case DSConstant.OpNameCode.cVersion:
              parsedData = DSUtil.parseVersion(stream.mapUint8Array(codeData.length));

              // Determine if we should use Unicode based on version information
              if (codeData.length < 18) {
                parsedData.Unicode = 0;
                DSConstant.ReadUnicode = false;
              } else {
                DSConstant.ReadUnicode = parsedData.Unicode;
              }

              return parsedData;

            case DSConstant.OpNameCode.cHeader:
              if (codeData.length === 28) {
                parsedData = DSUtil.parseHeader(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 26) {
                parsedData = DSUtil.parseHeader810(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 22) {
                parsedData = DSUtil.parseHeader22(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 14) {
                parsedData = DSUtil.parseHeader14(stream.mapUint8Array(codeData.length));
              }

              return parsedData;

            case DSConstant.OpNameCode.cHeadUiInfo:
              return DSUtil.parseUIInfo(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cPage:
              if (codeData.length === 30) {
                parsedData = DSUtil.parsePage30(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 34) {
                parsedData = DSUtil.parsePage34(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 62) {
                parsedData = DSUtil.parsePage62(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 126) {
                parsedData = DSUtil.parsePage126(stream.mapUint8Array(codeData.length));
              }

              return parsedData;

            case DSConstant.OpNameCode.cLibList:
              return DSUtil.parseLibList(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.oTextureExtra:
              return DSUtil.parseTextureExtra(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cFontName12:
              return DSUtil.parseFontName12(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cFontName:
              return DSUtil.parseFontName(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cFontName15:
              return DSUtil.parseFontName15(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDimFont:
              return DSUtil.parseDimFont(stream.mapUint8Array(codeData.length, DSConstant.ReadUnicode));

            case DSConstant.OpNameCode.cBeginTheme12:
              return DSUtil.parseBeginTheme12(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cThemeCat:
              return DSUtil.parseThemeCat(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cThemeColor:
              return DSUtil.parse_SDF_THEME_COLOR(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cThemeFont12:
              return DSUtil.parseThemeFont12(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cBeginTextf:
              return DSUtil.parseBeginTextf(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDraw12:
              /**
               * Parses Draw12 format data based on structure size
               * Different structure sizes represent different versions or variations
               * @param buffer - The binary buffer containing drawing data
               * @param size - The size of the structure to determine which parser to use
               * @returns A structured object containing the parsed drawing data
               */
              let parsedDrawing = null;
              switch (codeData.length) {
                case 440:
                  parsedDrawing = DSUtil.parseDraw12440(stream.mapUint8Array(codeData.length));
                  break;
                case 420:
                  parsedDrawing = DSUtil.parseDraw12420(stream.mapUint8Array(codeData.length));
                  break;
                case 364:
                  parsedDrawing = DSUtil.parseDraw12364(stream.mapUint8Array(codeData.length));
                  break;
                case 360:
                  parsedDrawing = DSUtil.parseDraw12360(stream.mapUint8Array(codeData.length));
                  break;
                case 356:
                  parsedDrawing = DSUtil.parseDraw12356(stream.mapUint8Array(codeData.length));
                  break;
                case 352:
                  parsedDrawing = DSUtil.parseDraw12352(stream.mapUint8Array(codeData.length));
                  break;
                case 348:
                  parsedDrawing = DSUtil.parseDraw12348(stream.mapUint8Array(codeData.length));
                  break;
                case 344:
                  parsedDrawing = DSUtil.parseDraw12344(stream.mapUint8Array(codeData.length));
                  break;
                case 340:
                  parsedDrawing = DSUtil.parseDraw12340(stream.mapUint8Array(codeData.length));
                  break;
                case 336:
                  parsedDrawing = DSUtil.parseDraw12336(stream.mapUint8Array(codeData.length));
                  break;
              }
              return parsedDrawing;

            case DSConstant.OpNameCode.cDraw8:
              /**
               * Parses Draw8 format data based on structure size
               * Older version of drawing data with different memory layouts
               * @param buffer - The binary buffer containing drawing data
               * @param size - The size of the structure to determine which parser to use
               * @returns A structured object containing the parsed drawing data
               */
              let parsedDraw8 = null;
              if (codeData.length === 272) {
                parsedDraw8 = DSUtil.parseDraw8272(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 264) {
                parsedDraw8 = DSUtil.parseDraw8264(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 228) {
                parsedDraw8 = DSUtil.parseDraw8228(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 224) {
                parsedDraw8 = DSUtil.parseDraw8224(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 216) {
                parsedDraw8 = DSUtil.parseDraw8216(stream.mapUint8Array(codeData.length));
              }
              return parsedDraw8;

            case DSConstant.OpNameCode.cDraw:
              /**
               * Parses standard Draw format data based on structure size
               * Base drawing data format used across different versions
               * @param buffer - The binary buffer containing drawing data
               * @param size - The size of the structure to determine which parser to use
               * @returns A structured object containing the parsed drawing data
               */
              let parsedBasicDraw = null;
              if (codeData.length === 236) {
                parsedBasicDraw = DSUtil.parseDraw236(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 252) {
                parsedBasicDraw = DSUtil.parseDraw252(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 268) {
                parsedBasicDraw = DSUtil.parseDraw268(stream.mapUint8Array(codeData.length));
              }
              return parsedBasicDraw;

            case DSConstant.OpNameCode.cDraw7:
              /**
               * Parses Draw7 format data based on structure size
               * Version 7 specific drawing data format
               * @param buffer - The binary buffer containing drawing data
               * @param size - The size of the structure to determine which parser to use
               * @returns A structured object containing the parsed drawing data
               */
              let parsedDraw7 = null;
              if (codeData.length === 48) {
                parsedDraw7 = DSUtil.parseDraw748(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 52) {
                parsedDraw7 = DSUtil.parseDraw752(stream.mapUint8Array(codeData.length));
              }
              return parsedDraw7;

            case DSConstant.OpNameCode.cDrawExtra:
              /**
               * Parses extra drawing data information
               * Contains supplementary information for drawing objects
               * @param buffer - The binary buffer containing extra drawing data
               * @param size - The size of the structure to validate
               * @returns A structured object containing the parsed extra drawing data
               */
              let parsedDrawExtra = null;
              if (codeData.length === 14) {
                parsedDrawExtra = DSUtil.parseDrawExtra14(stream.mapUint8Array(codeData.length));
              }
              return parsedDrawExtra;

            case DSConstant.OpNameCode.cDrawObj5:
              /**
               * Parses DrawObj5 format data for version 5 drawing objects
               * Early version of drawing object data
               * @param buffer - The binary buffer containing drawing object data
               * @param size - The size of the structure to validate
               * @returns A structured object containing the parsed drawing object data
               */
              let parsedDrawObj5 = null;
              if (codeData.length === 60) {
                parsedDrawObj5 = DSUtil.parseDrawObj560(stream.mapUint8Array(codeData.length));
              }
              return parsedDrawObj5;

            case DSConstant.OpNameCode.cDrawObj8:
              /**
               * Parses DrawObj8 format data based on structure size
               * Version 8 specific drawing object data with multiple formats
               * @param buffer - The binary buffer containing drawing object data
               * @param size - The size of the structure to determine which parser to use
               * @returns A structured object containing the parsed drawing object data
               */
              let parsedDrawObj8 = null;
              if (codeData.length === 448) {
                parsedDrawObj8 = DSUtil.parseDrawObj8448(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 316) {
                parsedDrawObj8 = DSUtil.parseDrawObj8316(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 312) {
                parsedDrawObj8 = DSUtil.parseDrawObj8312(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 308) {
                parsedDrawObj8 = DSUtil.parseDrawObj8848(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 304) {
                parsedDrawObj8 = DSUtil.parseDrawObj8847(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 300) {
                parsedDrawObj8 = DSUtil.parseDrawObj8837(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 296) {
                parsedDrawObj8 = DSUtil.parseDrawObj8830(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 288) {
                parsedDrawObj8 = DSUtil.parseDrawObj8824(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 280) {
                parsedDrawObj8 = DSUtil.parseDrawObj8814(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 252) {
                parsedDrawObj8 = DSUtil.parseDrawObj8810(stream.mapUint8Array(codeData.length));
              }
              return parsedDrawObj8;

            case DSConstant.OpNameCode.cDrawObj:
              /**
               * Parses standard DrawObj format data
               * Generic drawing object data format used across multiple versions
               * @param buffer - The binary buffer containing drawing object data
               * @param size - The size of the structure to pass to the parser
               * @returns A structured object containing the parsed drawing object data
               */
              return DSUtil.parseDrawObj(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableVp:
            //   /**
            //    * Parses table viewport data
            //    * Contains information about table display and presentation
            //    * @param buffer - The binary buffer containing table viewport data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed table viewport data
            //    */
            //   return DSConstant.parse_SDF_TABLE(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTable:
            //   /**
            //    * Parses table data in short format
            //    * Contains basic table definition information
            //    * @param buffer - The binary buffer containing table data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed table data
            //    */
            //   return DSConstant.parse_SDF_TABLE_Short(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableCell8:
            //   /**
            //    * Parses version 8 table cell data
            //    * Contains information about individual cells in a table
            //    * @param buffer - The binary buffer containing table cell data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed table cell data
            //    */
            //   return DSConstant.parse_SDF_TABLE_CELL(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableCell:
            //   /**
            //    * Parses version 7 table cell data
            //    * Contains information about individual cells in a version 7 table
            //    * @param buffer - The binary buffer containing table cell data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed table cell data
            //    */
            //   return DSConstant.parse_SDF_TABLE_CELL7(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableCellExtRaold:
            //   /**
            //    * Parses legacy extra table cell data
            //    * Contains extended information for table cells in older formats
            //    * @param buffer - The binary buffer containing extra cell data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed extra cell data
            //    */
            //   return DSConstant.parse_SDF_TABLE_CELLEXTRAOLD(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableCellExtra:
            //   /**
            //    * Parses extra table cell data
            //    * Contains extended information for table cells
            //    * @param buffer - The binary buffer containing extra cell data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed extra cell data
            //    */
            //   return DSConstant.parse_SDF_TABLE_CELLEXTRA(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableCellProp:
            //   /**
            //    * Parses table cell property data
            //    * Contains styling and formatting properties for table cells
            //    * @param buffer - The binary buffer containing cell property data
            //    * @param size - The size of the structure to pass to the parser
            //    * @returns A structured object containing the parsed cell property data
            //    */
            //   return DSConstant.parse_SDF_TABLE_CELLPROP(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableRowVp:
            //   /**
            //    * Parses table row viewport data from a binary buffer
            //    * @param buffer - The binary buffer containing table row data
            //    * @param structSize - The size of the structure in bytes
            //    * @returns A structured object with table row viewport properties
            //    */
            //   return DSConstant.parse_SDF_TABLE_ROW(stream.mapUint8Array(codeData.length), codeData.length);

            // case DSConstant.OpNameCode.cTableRow:
            //   /**
            //    * Parses short table row data from a binary buffer
            //    * @param buffer - The binary buffer containing short table row data
            //    * @param structSize - The size of the structure in bytes
            //    * @returns A structured object with short table row properties
            //    */
            //   return DSConstant.parse_SDF_TABLE_ROW_Short(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraph:
              /**
               * Parses graph data from a binary buffer
               * @param buffer - The binary buffer containing graph data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph configuration properties
               */
              return DSUtil.parseGraph(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraphAxis:
              /**
               * Parses graph axis data from a binary buffer
               * @param buffer - The binary buffer containing graph axis data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph axis properties
               */
              return DSUtil.parseGraphAxis(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraphPoint:
              /**
               * Parses graph point data from a binary buffer
               * @param buffer - The binary buffer containing graph point data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph point properties
               */
              return DSUtil.parseGraphPoint(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraphTitle:
              /**
               * Parses graph title data from a binary buffer
               * @param buffer - The binary buffer containing graph title data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph title properties
               */
              return DSUtil.parseGraphTitle(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraphLabel:
              /**
               * Parses graph axis label data from a binary buffer
               * @param buffer - The binary buffer containing graph axis label data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph axis label properties
               */
              return DSUtil.parseGraphAxisLabel(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cGraphLegend:
              /**
               * Parses graph legend entry data from a binary buffer
               * @param buffer - The binary buffer containing graph legend entry data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with graph legend entry properties
               */
              return DSUtil.parseGraphLegendEntry(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cDrawText:
              /**
               * Parses drawing text data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing drawing text data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with drawing text properties
               */
              let parsedDrawText;

              if (codeData.length === 182) {
                parsedDrawText = DSUtil.parseDrawText182(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 110) {
                parsedDrawText = DSUtil.parseDrawText110(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 106) {
                parsedDrawText = DSUtil.parseDrawText106(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 94) {
                parsedDrawText = DSUtil.parseDrawText94(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 90) {
                parsedDrawText = DSUtil.parseDrawText(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 88) {
                parsedDrawText = DSUtil.parseDrawText88(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 72) {
                parsedDrawText = DSUtil.parseDrawText72(stream.mapUint8Array(codeData.length));
              }

              return parsedDrawText;

            case DSConstant.OpNameCode.cBeginPaint:
              /**
               * Parses paint data from a binary buffer
               * @param buffer - The binary buffer containing paint data
               * @returns A structured object with paint properties including fill type and color
               */
              return DSUtil.parseSDPaint(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawPoly:
              /**
               * Parses polygon drawing data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing polygon data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with polygon drawing properties
               */
              let parsedPolyList;

              if (codeData.length === 8) {
                parsedPolyList = DSUtil.parsePolyList8(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 12) {
                parsedPolyList = DSUtil.parsePolyList12(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 20) {
                parsedPolyList = DSUtil.parsePolyList20(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 24) {
                parsedPolyList = DSUtil.parsePolyList24(stream.mapUint8Array(codeData.length));
              }

              return parsedPolyList;

            case DSConstant.OpNameCode.cDrawPolySeg:
              /**
               * Parses polygon segment drawing data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing polygon segment data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with polygon segment drawing properties
               */
              let parsedPolySeg;

              if (codeData.length === 18) {
                parsedPolySeg = DSUtil.parsePolySeg18(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 28) {
                parsedPolySeg = DSUtil.parsePolySeg(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 26) {
                parsedPolySeg = DSUtil.parsePolySeg26(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 32) {
                parsedPolySeg = DSUtil.parsePolySeg32(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 40) {
                parsedPolySeg = DSUtil.parsePolySeg40(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 50) {
                parsedPolySeg = DSUtil.parsePolySeg50(stream.mapUint8Array(codeData.length));
              }

              return parsedPolySeg;

            case DSConstant.OpNameCode.cPolySegExplicitPoints:
              /**
               * Parses explicit points for polygon segments from a binary buffer
               * @param buffer - The binary buffer containing explicit polygon point data
               * @returns A structured object with explicit polygon point properties
               */
              return DSUtil.parsePolySegExplicitPoints(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawLink:
              /**
               * Parses link list data from a binary buffer
               * @param buffer - The binary buffer containing link list data
               * @returns A structured object with link list properties for shape connections
               */
              return DSUtil.parseLinkList(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawLink6:
              /**
               * Parses version 6 link list data from a binary buffer
               * @param buffer - The binary buffer containing version 6 link list data
               * @returns A structured object with link list properties specific to version 6
               */
              return DSUtil.parseLinkList6(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawArrayText:
              /**
               * Parses array hook text data from a binary buffer
               * @param buffer - The binary buffer containing array hook text data
               * @returns A structured object with array hook text properties for shape arrays
               */
              return DSUtil.parseArrayHookText(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cObjData:
              /**
               * Parses object data from a binary buffer
               * @param buffer - The binary buffer containing object data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with properties for embedded objects
               */
              return DSUtil.parseObjData(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.oRuler:
              /**
               * Parses ruler data from a binary buffer
               * @param buffer - The binary buffer containing ruler data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with ruler properties including units and scale
               */
              return DSUtil.parseRuler(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cLineDrawList:
              /**
               * Parses line draw list data from a binary buffer
               * @param buffer - The binary buffer containing line draw list data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with line draw list properties
               */
              return DSUtil.parseLineDrawList(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cBeginLine:
            case DSConstant.OpNameCode.cBeginHLine:
            case DSConstant.OpNameCode.cBeginVLine:
              /**
               * Parses line data (standard, horizontal, or vertical) from a binary buffer
               * @param buffer - The binary buffer containing line data
               * @param structSize - The size of the structure in bytes
               * @returns A structured object with line properties including thickness and pattern
               */
              return DSUtil.parseBeginLine(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cFilledLine:
              /**
               * Parses filled line data from a binary buffer
               * @param buffer - The binary buffer containing filled line data
               * @returns A structured object with filled line properties including thickness and color
               */
              return DSUtil.parseFilledLine(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cOutSide:
              /**
               * Parses outside effect data from a binary buffer
               * @param buffer - The binary buffer containing outside effect data
               * @returns A structured object with outside effect properties including type, extent, and color
               */
              return DSUtil.parseOutSide(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cInsideEffect:
              /**
               * Parses inside effect data from a binary buffer
               * @param buffer - The binary buffer containing inside effect data
               * @returns A structured object with inside effect properties including effect type and color
               */
              return DSUtil.parseInsideEffect(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cEffect:
              /**
               * Parses effect data from a binary buffer
               * @param buffer - The binary buffer containing effect data
               * @returns A structured object with effect properties including type, color, and parameters
               */
              return DSUtil.parseEffect(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cTexture:
              /**
               * Parses texture data from a binary buffer
               * @param buffer - The binary buffer containing texture data
               * @returns A structured object with texture properties including dimensions and image type
               */
              return DSUtil.parseTexture(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cHatch:
              /**
               * Parses hatch pattern data from a binary buffer
               * @param buffer - The binary buffer containing hatch pattern data
               * @returns A structured object with hatch pattern properties for shape fills
               */
              return DSUtil.parseHatch(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cGradient:
              /**
               * Parses gradient data from a binary buffer
               * @param buffer - The binary buffer containing gradient data
               * @returns A structured object with gradient properties including flags and end color
               */
              return DSUtil.parseGradient(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cRichGradient:
              /**
               * Parses rich gradient data from a binary buffer
               * @param buffer - The binary buffer containing rich gradient data
               * @returns A structured object with rich gradient properties including type, angle, and stop count
               */
              return DSUtil.parseRichGradient(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cRichGradientStop:
              /**
               * Parses rich gradient stop data from a binary buffer
               * @param buffer - The binary buffer containing gradient stop data
               * @returns A structured object with gradient stop properties including color and position
               */
              return DSUtil.parseRichGradientStop(stream.mapUint8Array(codeData.length));

            // case DSConstant.OpNameCode.cThemeGradient:
            //   /**
            //    * Parses theme gradient data from a binary buffer
            //    * @param buffer - The binary buffer containing theme gradient data
            //    * @returns A structured object containing the parsed theme gradient data
            //    */
            //   return DSConstant.parse_SDF_THEMEGRADIENT(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cBeginStyle:
              /**
               * Parses style data from a binary buffer
               * @param buffer - The binary buffer containing style data
               * @returns A structured object containing the parsed style data with a stylename property
               */
              return DSUtil.parseBeginStyle(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawArrow:
              /**
               * Parses arrow drawing data from a binary buffer
               * @param buffer - The binary buffer containing arrow drawing data
               * @returns A structured object containing arrow size, start/end arrow types, and arrow IDs
               */
              return DSUtil.parseDrawArrow(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawHook:
              /**
               * Parses hook drawing data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing hook drawing data
               * @returns A structured object containing object ID, index, connection points and other hook properties
               */
              if (codeData.length === 22) {
              } else if (codeData.length === 10) {
                return DSUtil.parseDrawHook10(stream.mapUint8Array(codeData.length));
              } else {
                return DSUtil.parseDrawHook(stream.mapUint8Array(codeData.length));
              }

            case DSConstant.OpNameCode.cDrawBorder:
              /**
               * Parses border drawing data from a binary buffer
               * @param buffer - The binary buffer containing border drawing data
               * @returns A structured object containing border width, pattern index, and color
               */
              return DSUtil.parseDrawBorder(stream.mapUint8Array(codeData.length));


            case DSConstant.OpNameCode.cDrawLine:
              /**
               * Parses line drawing data from a binary buffer
               * @param buffer - The binary buffer containing line drawing data
               * @returns A structured object containing line border, pattern, color, and arrow information
               */
              return DSUtil.parseDrawLine(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawFill:
              /**
               * Parses fill drawing data from a binary buffer
               * @param buffer - The binary buffer containing fill drawing data
               * @returns A structured object containing fill pattern index, color, and additional properties
               */
              if (codeData.length === 6) {
                return DSUtil.parseDrawFill6(stream.mapUint8Array(codeData.length));
              } else {
                return DSUtil.parseDrawFill(stream.mapUint8Array(codeData.length));
              }

            case DSConstant.OpNameCode.cDrawObj7:
              /**
               * Parses drawing object data (version 7) from a binary buffer
               * @param buffer - The binary buffer containing drawing object data
               * @param structSize - The size of the structure to be parsed
               * @returns A structured object containing the parsed drawing object data
               */
              return DSUtil.parseDrawObj7(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cDrawObj6:
              /**
               * Parses drawing object data (version 6) from a binary buffer
               * @param buffer - The binary buffer containing drawing object data
               * @param structSize - The size of the structure to be parsed
               * @returns A structured object containing the parsed drawing object data
               */
              return DSUtil.parseDrawObj6(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cConnectPoint:
              /**
               * Parses connection point data from a binary buffer
               * @param buffer - The binary buffer containing connection point data
               * @returns A structured object containing connection point information
               */
              return DSUtil.parseConnectPoint(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cLongText8:
              /**
               * Parses long text data (version 8) from a binary buffer
               * @param buffer - The binary buffer containing long text data
               * @returns A structured object containing text metadata including runs, styles, and character counts
               */
              if (codeData.length === 8) {
                return DSUtil.parseLongText88(stream.mapUint8Array(codeData.length));
              } else {
                return DSUtil.parseLongText8(stream.mapUint8Array(codeData.length));
              }

            case DSConstant.OpNameCode.cText:
              /**
               * Parses text data from a binary buffer
               * @param buffer - The binary buffer containing text data
               * @returns A structured object containing text metadata and formatting information
               */
              return DSUtil.parseText(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cLongText:
              /**
               * Parses long text data from a binary buffer
               * @param buffer - The binary buffer containing long text data
               * @returns A structured object containing text metadata, formatting information, and shadow effects
               */
              return DSUtil.parseLongText(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cTextChar:
              /**
               * Parses text character data from a binary buffer
               * @param buffer - The binary buffer containing text character data
               * @returns A structured object containing the text as a string
               */
              let textCharData;
              if (codeData.length) {
                if (DSConstant.ReadUnicode) {
                  textCharData = DSUtil.parseTextChar(stream.mapUint8Array(codeData.length));
                } else {
                  textCharData = DSUtil.parseTextChar8(stream.mapUint8Array(codeData.length));
                }
              }
              return textCharData;

            case DSConstant.OpNameCode.cTextRun:
              /**
               * Parses text runs data from a binary buffer
               * @param buffer - The binary buffer containing text runs data
               * @returns A structured object containing text run information including formatting codes
               */
              return DSUtil.parseTextRuns(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cTextStyle:
              /**
               * Parses text style data from a binary buffer
               * @param buffer - The binary buffer containing text style data
               * @returns A structured object containing text style index, code count, and style codes
               */
              return DSUtil.parseTextStyle(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cTextLink:
              /**
               * Parses text link data from a binary buffer
               * @param buffer - The binary buffer containing text link data
               * @returns A structured object with index, type, and path properties
               */
              return DSUtil.parseTextLink(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cTextData:
              /**
               * Parses text data from a binary buffer
               * @param buffer - The binary buffer containing text data
               * @returns A structured object with index and dataField properties
               */
              return DSUtil.parseTextData(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cD3Settings:
              /**
               * Parses 3D settings from a binary buffer
               * @param buffer - The binary buffer containing 3D settings data
               * @returns An object containing 3D settings as a string
               */
              return DSUtil.parseD3Settings(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cDrawSegl:
              /**
               * Parses segment line data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing segment line data
               * @returns A structured object containing segment line information
               */
              let segLineData;
              if (codeData.length === 58) {
                segLineData = DSUtil.parseSegLine58(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 158) {
                segLineData = DSUtil.parseSegLine(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 208) {
                segLineData = DSUtil.parseSegLine208(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 210) {
                segLineData = DSUtil.parseSegLine210(stream.mapUint8Array(codeData.length));
              }
              return segLineData;

            case DSConstant.OpNameCode.cDrawArray:
              /**
               * Parses array data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing array data
               * @returns A structured object containing array information
               */
              let arrayData;
              if (codeData.length === 34) {
                arrayData = DSUtil.parseArray34(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 30) {
                arrayData = DSUtil.parseArray30(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 42) {
                arrayData = DSUtil.parseArray(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 38) {
                arrayData = DSUtil.parseArray38(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 14) {
                arrayData = DSUtil.parseArray14(stream.mapUint8Array(codeData.length));
              }
              return arrayData;

            case DSConstant.OpNameCode.cDrawArrayHook:
              /**
               * Parses array hook data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing array hook data
               * @returns A structured object containing array hook information
               */
              let arrayHookData;
              if (codeData.length === 14) {
                arrayHookData = DSUtil.parseArrayHook14(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 18) {
                arrayHookData = DSUtil.parseArrayHook18(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 38) {
                arrayHookData = DSUtil.parseArrayHook38(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 50) {
                arrayHookData = DSUtil.parseArrayHook50(stream.mapUint8Array(codeData.length));
              }
              return arrayHookData;

            case DSConstant.OpNameCode.cDrawContainer:
              /**
               * Parses container list data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing container list data
               * @returns A structured object containing container list information
               */
              let containerData;
              if (codeData.length === 92) {
                containerData = DSUtil.parseContainerList92(stream.mapUint8Array(codeData.length));
              } else if (codeData.length === 100) {
                containerData = DSUtil.parseContainerList100(stream.mapUint8Array(codeData.length));
              }
              return containerData;

            case DSConstant.OpNameCode.cDrawContainerHook:
              /**
               * Parses container hook data from a binary buffer based on structure size
               * @param buffer - The binary buffer containing container hook data
               * @returns A structured object containing container hook information
               */
              if (codeData.length === 20) {
                return DSUtil.parseContainerHook20(stream.mapUint8Array(codeData.length));
              } else {
                return DSUtil.parseContainerHook28(stream.mapUint8Array(codeData.length));
              }

            case DSConstant.OpNameCode.cPrintErst:
            case DSConstant.OpNameCode.cLibListPath:
            case DSConstant.OpNameCode.cLibListGuid:
            case DSConstant.OpNameCode.cParentPageId:
            case DSConstant.OpNameCode.cOrigTemplate:
            case DSConstant.OpNameCode.cGuide:
            case DSConstant.OpNameCode.cExportPath:
            case DSConstant.OpNameCode.cDefaultLibs:
            // case DSConstant.OpNameCode.SDF_C_PRESENTATION_BACKGROUND:
            // case DSConstant.OpNameCode.SDF_C_PRESENTATION_NAME:
            // case DSConstant.OpNameCode.SDF_C_IMPORT_SOURCE_PATH:
            case DSConstant.OpNameCode.cTaskPanel:
            case DSConstant.OpNameCode.cOrgChartTable:
            // case DSConstant.OpNameCode.SDF_C_KANBAN_PC_TITLE:
            // case DSConstant.OpNameCode.SDF_C_KANBAN_ASSIGN_TITLE:
            case DSConstant.OpNameCode.cThemeTexture:
            case DSConstant.OpNameCode.cDefaultLibs:
            case DSConstant.OpNameCode.cCellStyleName:
            case DSConstant.OpNameCode.oTextureName:
            case DSConstant.OpNameCode.oTextureCatName:
            case DSConstant.OpNameCode.cDrawJump:
            case DSConstant.OpNameCode.cImageUrl:
            case DSConstant.OpNameCode.cBusinessModule:
            case DSConstant.OpNameCode.cSymbolSearchString:
            case DSConstant.OpNameCode.cSearchLib:
            case DSConstant.OpNameCode.cSearchLibName:
            case DSConstant.OpNameCode.cSearchLibSymbolId:
            case DSConstant.OpNameCode.cSearchLibSymbolName:
            case DSConstant.OpNameCode.cCurrentSymbolId:
            case DSConstant.OpNameCode.cLibListSearchResultId:
            case DSConstant.OpNameCode.cRecentSymbolId:
            case DSConstant.OpNameCode.cRecentSymbolName:
            case DSConstant.OpNameCode.cRecentSymbolNoMenu:
            case DSConstant.OpNameCode.cToolPalettesName:
            case DSConstant.OpNameCode.cBusinessNameStr:
              /**
               * Parses string data from a binary buffer with appropriate encoding
               * @param buffer - The binary buffer containing template data
               * @returns An object with template name and length fields
               */
              if (DSConstant.ReadUnicode) {
                return DSUtil.parseOrigTemplate(stream.mapUint8Array(codeData.length));
              } else {
                return DSUtil.parseOrigTemplate8(stream.mapUint8Array(codeData.length));
              }

            case DSConstant.OpNameCode.cEmfHash:
              /**
               * Parses EMF hash data from a binary buffer
               * @param buffer - The binary buffer containing EMF hash data
               * @returns An object with hash information in 8-bit encoding
               */
              return DSUtil.parseOrigTemplate8(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cSvgFragmentId:
            case DSConstant.OpNameCode.cSvgImageId:
              /**
               * Parses SVG fragment or image ID data from a binary buffer
               * @param buffer - The binary buffer containing SVG reference data
               * @returns A structured object containing SVG identifier information
               */
              return DSUtil.parseOrigTemplate(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cLeftPanelInfo:
            case DSConstant.OpNameCode.cLibListEntry:
            case DSConstant.OpNameCode.cLibCollapsed:
            case DSConstant.OpNameCode.cSearchLibCollapsed:
            case DSConstant.OpNameCode.cSearchLibHidden:
            case DSConstant.OpNameCode.cHiliteList:
              /**
               * Parses long value data for various UI state and library entries
               * @param buffer - The binary buffer containing the long value data
               * @returns A structured object containing value information
               */
              return DSUtil.parseLongValue(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cHilite:
              /**
               * Parses highlight data from a binary buffer
               * @param buffer - The binary buffer containing highlight information
               * @returns A structured object containing highlight properties
               */
              return DSUtil.parseHighlight(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cCThumbnail:
              /**
               * Parses thumbnail image data from a binary buffer
               * @param buffer - The binary buffer containing PNG thumbnail data
               * @returns Object containing the image as URL, Blob, and raw bytes
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/png");

            case DSConstant.OpNameCode.cDrawImage8:
              /**
               * Parses version 8 image data from a binary buffer
               * @param buffer - The binary buffer containing image data
               * @param size - The size of the data structure in bytes
               * @returns A structured object containing the parsed image data
               */
              return DSUtil.parseDrawImage8(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cDrawMeta:
              /**
               * Parses Windows Metafile (WMF) image data from a binary buffer
               * @param buffer - The binary buffer containing WMF image data
               * @returns Object containing the image as URL, Blob, and raw bytes
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/wmf");

            case DSConstant.OpNameCode.cDrawPng:
            case DSConstant.OpNameCode.cDrawPreviewPng:
              /**
               * Parses PNG image data from a binary buffer
               * @param buffer - The binary buffer containing PNG image data
               * @returns Object containing the image as URL, Blob, and raw bytes
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/png");

            case DSConstant.OpNameCode.cDrawJpg:
              /**
               * Parses JPEG image data from a binary buffer
               * @param buffer - The binary buffer containing JPEG image data
               * @returns Object containing the image as URL, Blob, and raw bytes
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/jpeg");

            case DSConstant.OpNameCode.cDrawSvg:
              /**
               * Parses SVG image data from a binary buffer
               * @param buffer - The binary buffer containing SVG image data
               * @returns Object containing the image as URL, Blob, and raw bytes
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/svg+xml");

            case DSConstant.OpNameCode.cOleHeader:
              /**
               * Parses OLE (Object Linking and Embedding) header data from a binary buffer
               * @param buffer - The binary buffer containing OLE header data
               * @param size - The size of the data in bytes
               * @returns A structured object containing OLE header information
               */
              return DSUtil.parseCOleHeader(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cOleStorage:
              /**
               * Parses OLE storage data from a binary buffer
               * @param buffer - The binary buffer containing OLE storage data
               * @returns Object containing the OLE storage as raw data
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), "image/store");

            case DSConstant.OpNameCode.cNativeStorage:
              /**
               * Parses native storage buffer from binary data
               * @param buffer - The binary buffer containing native storage data
               * @returns Object containing the parsed data and byte array
               */
              return DSUtil.parseNativeBuffer(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cSdData64:
            case DSConstant.OpNameCode.cSdData64c:
              /**
               * Parses 64-bit SD data from a binary buffer
               * @param buffer - The binary buffer containing SD data
               * @returns Object containing SD data ID, directory, and binary data
               */
              return DSUtil.parseCSdData(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cLayerFlags:
              /**
               * Parses layer flags from binary data with appropriate structure
               * @param buffer - The binary buffer containing layer flags
               * @param size - The size of the data to determine format (2 or 4 bytes)
               * @returns Object containing layer flags
               */
              return codeData.length === 2
                ? DSUtil.parseCLayerFlags2(stream.mapUint8Array(codeData.length), codeData.length)
                : DSUtil.parseCLayerFlags4(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cLayerName:
              /**
               * Parses layer name from binary data with appropriate encoding
               * @param buffer - The binary buffer containing layer name
               * @returns Object containing layer name with proper character encoding
               */
              return DSConstant.ReadUnicode
                ? DSUtil.parseOrigTemplate(stream.mapUint8Array(codeData.length))
                : DSUtil.parseOrigTemplate8(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cLayerType:
              /**
               * Parses layer type from binary data
               * @param buffer - The binary buffer containing layer type
               * @param size - The size of the data in bytes
               * @returns Object containing layer type information
               */
              return DSUtil.parseCLayerType(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cLayerList:
              /**
               * Parses layer list from binary data
               * @param buffer - The binary buffer containing layer list
               * @param size - The size of the data in bytes
               * @returns Structured object containing layer list information
               */
              return DSUtil.parseCLayerList(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cNativeId:
              /**
               * Parses native ID from binary data
               * @param buffer - The binary buffer containing native ID
               * @param size - The size of the data in bytes
               * @returns Object containing native ID information
               */
              return DSUtil.parseCNativeId(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cToolPalettesCollapsed:
              /**
               * Parses tool palettes collapsed state from binary data
               * @param buffer - The binary buffer containing collapsed state
               * @param size - The size of the data in bytes
               * @returns Object containing collapsed state information
               */
              return DSUtil.parseCToolPalettesCollapsed(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cImageId:
            case DSConstant.OpNameCode.cEmfId:
            case DSConstant.OpNameCode.cOleStorageId:
              /**
               * Parses image ID and directory from binary data
               * @param buffer - The binary buffer containing image information
               * @param size - The size of the data in bytes
               * @returns Object containing blob bytes ID and image directory
               */
              return DSUtil.parseCImageId(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.cNativeBlock:
            case DSConstant.OpNameCode.cNativeWinBlock:
              /**
               * Parses a native block from binary data
               * @param buffer - The binary buffer containing native block data
               * @returns Object containing the parsed data, byte array, and native ID
               */
              return DSUtil.parseCNativeBlock(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cImageBlock:
            case DSConstant.OpNameCode.cEmfBlock:
              /**
               * Parses image block data from a binary buffer
               * @param buffer - The binary buffer containing image block data
               * @returns Object containing image ID, directory, and binary data
               */
              return DSUtil.parseCImageLock(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cExpandedViewBlock:
            // case DSConstant.OpNameCode.cTableBlock:
            //   /**
            //    * Parses expanded view or table block data from a binary buffer
            //    * @param buffer - The binary buffer containing block data
            //    * @returns Object containing value information for the block
            //    */
            //   return DSConstant.parseLongValue(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cCloudCommentBlock:
              /**
               * Parses cloud comment data from a binary buffer
               * @param buffer - The binary buffer containing comment data
               * @returns A structured object with ObjectID, UserID, timestamp, and comment text
               */
              return DSUtil.parseComment(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cGraphBlock:
              /**
               * Parses graph block data from a binary buffer
               * @param buffer - The binary buffer containing graph block data
               * @returns Object containing value information for the graph block
               */
              return DSUtil.parseLongValue(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cExpandedView:
              /**
               * Parses expanded view SVG data from a binary buffer
               * @param buffer - The binary buffer containing SVG data
               * @returns A structured object containing the parsed SVG data with an svg property
               */
              return DSUtil.parseExpandedView(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cGanttInfoBlock:
            case DSConstant.OpNameCode.cGraphId:
            case DSConstant.OpNameCode.cTableId:
            case DSConstant.OpNameCode.cGanttInfoId:
            case DSConstant.OpNameCode.cNoteId:
            case DSConstant.OpNameCode.cExpandedViewId:
              /**
               * Parses ID values from a binary buffer
               * @param buffer - The binary buffer containing ID data
               * @returns Object containing value information for the ID
               */
              return DSUtil.parseLongValue(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.oTextureList:
              /**
               * Parses texture list data from a binary buffer
               * @param buffer - The binary buffer containing texture list data
               * @param size - The size of the data in bytes
               * @returns Object containing texture list type information
               */
              return DSUtil.parseCLayerType(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.oTexture:
              /**
               * Parses texture data from binary buffer and sets the appropriate texture format
               * @param buffer - The binary buffer containing texture data
               * @param size - The size of the data in bytes
               * @returns Structured object containing texture information
               */
              return DSUtil.parseOTexture(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.SDF_O_TEXTUREEXT:
              /**
               * Parses extended texture data from binary buffer
               * @param buffer - The binary buffer containing extended texture data
               * @param size - The size of the data in bytes
               * @returns Structured object containing extended texture information
               */
              return DSUtil.parseOTextureExt(stream.mapUint8Array(codeData.length), codeData.length);

            case DSConstant.OpNameCode.oTextureData:
              /**
               * Parses texture image data from a binary buffer using current texture format
               * @param buffer - The binary buffer containing texture image data
               * @returns Object containing the image data in the detected texture format
               */
              return DSUtil.parse_image(stream.mapUint8Array(codeData.length), DSConstant.TextureFormat);

            case DSConstant.OpNameCode.cComment:
              /**
               * Parses comment data from a binary buffer
               * @param buffer - The binary buffer containing comment data
               * @returns Structured object with text information or instance ID and style count
               */
              return codeData.length === 8
                ? DSUtil.parseLongText88(stream.mapUint8Array(codeData.length))
                : DSUtil.parseLongText8(stream.mapUint8Array(codeData.length));

            case DSConstant.OpNameCode.cFreeHandLine:
              /**
               * Parses freehand line data from binary buffer
               * @param buffer - The binary buffer containing freehand line data
               * @returns Structured object containing freehand line information
               */
              return DSUtil.parseFreehandLineStruct(stream.mapUint8Array(codeData.length));









            default:
              const dataLength = stream.mapUint8Array(codeData.length).length;
              return `data[${dataLength}]`;
          }
        }
      }
    ], "*"]
  ]

  /**
   * Parser structure definition for SDR (Shape Description Record) headers only
   * Used to parse header information without processing the complete document content
   * This lighter version only processes version information to determine encoding
   */
  static T3HeaderOnlyStruct = [
    "start",
    function (dataStream) {
      const signature = dataStream.readString(8);
      // Check if signature matches expected value
      const validSignature = signature == DSConstant.Signature ? signature : null;
      // Default to Unicode mode
      DSConstant.ReadUnicode = true;
      return validSignature;
    },
    "codes",
    ["[]", [
      "code",
      "uint16",
      "codeName",
      /**
       * Maps numeric operation code to its string name
       * @param stream - The data stream (unused)
       * @param codeData - The code data object containing the numeric code
       * @returns String name of the operation code or "Unknown" if not found
       */
      function (stream, codeData) {
        return DSConstant.OpCodeName[codeData.code] || "Unknown";
      },
      "length",
      /**
       * Reads the length of data for this operation code
       * @param stream - The data stream to read from
       * @param codeData - The code data object
       * @returns Length of the data block, or 0 if this is a control code (bit 0x4000 set)
       */
      function (stream, codeData) {
        return (codeData.code & 0x4000) ? 0 : stream.readUint32();
      },
      "data",
      {
        /**
         * Reads and parses operation data based on operation code
         * For header-only parsing, only processes version information
         * @param stream - The data stream to read from
         * @param codeData - The code data object containing code and length
         * @returns Parsed data object for version information, or undefined for other codes
         */
        get: function (stream, codeData) {
          // Skip control codes (bit 0x4000 set)
          if (codeData.code & 0x4000) {
            return 0;
          }

          let parsedData = {};

          // Only process version information in this lightweight parser
          if (codeData.code === DSConstant.OpNameCode.cVersion) {
            parsedData = DSUtil.parseVersion(stream.mapUint8Array(codeData.length));

            // Determine if we should use Unicode based on version information
            if (codeData.length < 18) {
              parsedData.Unicode = 0;
              DSConstant.ReadUnicode = false;
            } else {
              DSConstant.ReadUnicode = parsedData.Unicode;
            }

            return parsedData;
          }

          // Ignore all other operation codes in header-only mode
          return undefined;
        }
      }
    ], "*"]
  ]

}

export default DSStruct


