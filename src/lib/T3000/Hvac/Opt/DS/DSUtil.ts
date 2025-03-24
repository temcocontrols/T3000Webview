

import StyleConstant from "../../Data/Constant/StyleConstant"
import TextConstant from "../../Data/Constant/TextConstant"
import T3DataStream from "../../Util/T3DataStream"
import DSConstant from "./DSConstant";

/**
 * Utility class providing binary data parsing functionality for the T3000 HVAC system.
 *
 * This class contains static methods that parse various types of binary data structures
 * into JavaScript objects. It supports parsing of images, drawing objects, text, fonts,
 * UI components, and other elements used in the T3000 visualization system.
 *
 * The parsing methods use the T3DataStream utility to read structured binary data
 * with proper endianness handling.
 *
 * Key features:
 * - Image data format conversion (MIME types, directory codes)
 * - Hexadecimal conversion utilities
 * - Integer type conversion (signed/unsigned)
 * - Parsing of drawing objects, text, fonts, and visual elements
 * - Connection point and layout parsing
 * - Theme and style data extraction
 *
 * @example
 * // Converting a MIME type to directory code
 * const dirCode = DSUtil.GetImageDir('image/jpeg');
 * // Returns StyleConstant.ImageDir.Jpg
 *
 * @example
 * // Converting a directory code back to MIME type
 * const mimeType = DSUtil.GetImageBlobType(StyleConstant.ImageDir.Png);
 * // Returns 'image/png'
 *
 * @example
 * // Converting decimal to hex
 * const hexValue = DSUtil.decimalToHex(255, 4, false);
 * // Returns '0x00FF'
 *
 * @example
 * // Parsing binary image data
 * const imageBuffer = new ArrayBuffer(| image data |);
 * const imageData = DSUtil.parseImage(imageBuffer, 'image/png');
 * // Returns object with URL, Blob and BlobBytes
 *
 * @example
  * // Parsing font data
 * const fontBuffer = new ArrayBuffer(| font data |);
 * const fontData = DSUtil.parseFontName(fontBuffer);
 * // Returns font object with cleaned lfFaceName
 */
class DSUtil {

  static GetImageDir(fileType) {
    /**
     * Determines the image directory code based on the MIME type
     * @param fileType - The MIME type of the image
     * @returns The directory code for the image type
     */
    var dirCode = 0;
    switch (fileType) {
      case 'image/jpeg':
        dirCode = StyleConstant.ImageDir.Jpg;
        break;
      case 'image/png':
        dirCode = StyleConstant.ImageDir.Png;
        break;
      case 'image/svg+xml':
        dirCode = StyleConstant.ImageDir.Svg;
        break;
      case 'image/wmf':
        dirCode = StyleConstant.ImageDir.Meta;
    }
    return dirCode;
  }

  static GetImageBlobType(dirCode) {
    /**
     * Converts an image directory code to its corresponding MIME type
     * @param dirCode - The directory code for the image type
     * @returns The MIME type string for the image
     */
    var mimeType = '';
    switch (dirCode) {
      case StyleConstant.ImageDir.Jpg:
        mimeType = 'image/jpeg';
        break;
      case StyleConstant.ImageDir.Png:
        mimeType = 'image/png';
        break;
      case StyleConstant.ImageDir.Svg:
        mimeType = 'image/svg+xml';
        break;
      case StyleConstant.ImageDir.Meta:
        mimeType = 'image/wmf';
    }
    return mimeType;
  }

  static GetImageBlobTypeFromExt(fileExtension) {
    /**
     * Determines the MIME type based on the file extension
     * @param fileExtension - The file extension including the dot (e.g., '.jpg')
     * @returns The corresponding MIME type string
     */
    var mimeType = '';
    switch (fileExtension) {
      case '.jpg':
      case '.jpeg':
      default:
        mimeType = 'image/jpeg';
        break;
      case '.png':
        mimeType = 'image/png';
        break;
      case '.svg':
        mimeType = 'image/svg+xml';
        break;
      case '.emf':
        mimeType = 'image/wmf';
    }
    return mimeType;
  }

  static decimalToHex(value, padLength, omitPrefix) {
    /**
     * Converts a decimal number to its hexadecimal representation
     * @param value - The decimal number to convert
     * @param padLength - The minimum length of the resulting hex string (default: 2)
     * @param omitPrefix - If true, returns the hex without '0x' prefix
     * @returns The hexadecimal string representation
     */
    var hexString = Number(value).toString(16).toUpperCase();
    for (padLength = padLength == null ? 2 : padLength; hexString.length < padLength;) hexString = '0' + hexString;
    return omitPrefix ? hexString : '0x' + hexString;
  }

  static ToInt32(value) {
    /**
     * Converts a value to a signed 32-bit integer using bitwise right shift
     * @param value - The value to convert
     * @returns The value as a signed 32-bit integer
     */
    return value >> 0;
  }

  static ToUInt32(value) {
    /**
     * Converts a value to an unsigned 32-bit integer using unsigned bitwise right shift
     * @param value - The value to convert
     * @returns The value as an unsigned 32-bit integer
     */
    return value >>> 0;
  }

  static parseVersion(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.VersionStruct)
  }

  static parseHeader(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.HeaderStruct)
  }

  static parseHeader810(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.HeaderStruct810)
  }

  static parseHeader22(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.HeaderStruct22)
  }

  static parseHeader14(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.HeaderStruct14)
  }

  static parseUIInfo(e, t) {
    return 60 === t ? new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.UIInfoStruct60) : 56 === t ? new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.UIInfoStruct56) : 52 === t ? new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.UIInfoStruct52) : 40 === t ? new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.UIInfoStruct40) : 36 === t ? new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.UIInfoStruct36) : new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.UIInfoStruct)
  }

  static parseLibList(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.LibListStruct)
  }

  static parseTextureExtra(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.TextureExtraStruct)
  }

  static parsePage126(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.PageStruct126)
  }

  static parsePage62(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.PageStruct62)
  }

  static parsePage34(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.PageStruct34)
  }

  static parsePage30(e) {
    return new T3DataStream(e, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.PageStruct30)
  }

  /**
   * Parses original template data from a binary buffer
   * @param buffer - The binary buffer containing template data
   * @returns An object with template name and length fields
   */
  static parseOrigTemplate(buffer) {
    const structDefinition = [
      'name',
      'u16stringle:' + (buffer.length / 2 - 1),
      'length',
      'u16stringle:1'
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses original template data (version 8) from a binary buffer
   * @param buffer - The binary buffer containing template data with 8-bit character encoding
   * @returns An object with template name and length fields
   */
  static parseOrigTemplate8(buffer) {
    const structDefinition = [
      'name',
      'string:' + (buffer.length - 1),
      'length',
      'string:1'
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses a LONGVALUE structure from binary data
   * @param buffer - The binary buffer containing LONGVALUE data
   * @returns A structured object containing the parsed LONGVALUE data
   */
  static parseLongValue(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.LongValueStruct)
  }

  /**
   * Parses a highlight structure from binary data
   * @param buffer - The binary buffer containing highlight data
   * @returns A structured object containing folder type, spare value, and path information
   */
  static parseHighlight(buffer) {
    const structDefinition = [
      'folderType',
      'int32',
      'spareValue',
      'int32',
      'path',
      'u16stringle:' + (buffer.length - 8) / 2
    ];

    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses text link data from a binary buffer
   * @param buffer - The binary buffer containing text link data
   * @returns A structured object with index, type, and path properties
   */
  static parseTextLink(buffer) {
    const structDefinition = [
      'index',
      'uint16',
      'type',
      'uint16',
      'path',
      'u16stringle:' + (buffer.length - 4) / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses comment data from a binary buffer
   * @param buffer - The binary buffer containing comment data
   * @returns A structured object with ObjectID, UserID, timestamp, and comment text
   */
  static parseComment(buffer) {
    const structDefinition = [
      'ObjectID',
      'int32',
      'UserID',
      'uint32',
      'timestamp',
      'float64',
      'comment',
      'u16stringle:' + (buffer.length - 16) / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses text data from a binary buffer
   * @param buffer - The binary buffer containing text data
   * @returns A structured object with index and dataField properties
   */
  static parseTextData(buffer) {
    const structDefinition = [
      'index',
      'uint16',
      'dataField',
      'u16stringle:' + (buffer.length - 2) / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Parses 3D settings from a binary buffer
   * @param buffer - The binary buffer containing 3D settings data
   * @returns An object containing 3D settings as a string
   */
  static parseD3Settings(buffer) {
    const structDefinition = [
      'settings',
      'u16stringle:' + buffer.length / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }

  /**
   * Cleans a font face name by removing invalid characters
   * @param fontObject - The font object containing an lfFaceName property to clean
   */
  static CleanlfFaceName(fontObject) {
    const nameLength = fontObject.lfFaceName.length;
    let cleanedName = '';

    for (let i = 0; i < nameLength && Number(fontObject.lfFaceName.charCodeAt(i)) > 0; i++) {
      cleanedName += fontObject.lfFaceName[i];
    }

    fontObject.lfFaceName = cleanedName;
  }

  /**
   * Parses dimension font data from a binary buffer
   * @param buffer - The binary buffer containing font data
   * @param size - The size of the font data (not used in function body)
   * @returns A structured object containing the parsed font data
   */
  static parseDimFont(buffer, size) {
    if (DSConstant.ReadUnicode) {
      return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.LOGFontStruct);
    } else {
      return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.LOGFontStructPreV1);
    }
  }

  /**
   * Parses font name data (v12 format) from a binary buffer
   * @param buffer - The binary buffer containing font name data
   * @returns A structured object containing the parsed and cleaned font name data
   */
  static parseFontName12(buffer) {
    const fontData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSConstant.FontName12Struct);
    DSUtil.CleanlfFaceName(fontData);
    return fontData;
  }

  /**
   * Parses font name data from a binary buffer
   * @param buffer - The binary buffer containing font name data
   * @returns A structured object containing the parsed and cleaned font name data
   */
  static parseFontName(buffer) {
    const fontData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.FontNameStruct);
    DSUtil.CleanlfFaceName(fontData);
    return fontData;
  }

  /**
   * Parses font name data (v15 format) from a binary buffer
   * @param buffer - The binary buffer containing font name data
   * @returns A structured object containing the parsed and cleaned font name data
   */
  static parseFontName15(buffer) {
    const fontData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.FontName15Struct);
    DSUtil.CleanlfFaceName(fontData);
    return fontData;
  }

  /**
   * Parses drawing data (356-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12356(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct356);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (420-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12420(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct420);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (440-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12440(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct440);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (364-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12364(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct364);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (360-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12360(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct847);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (352-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12352(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct842);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (348-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12348(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct841);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (344-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12344(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct836);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (340-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12340(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct835);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (336-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw12336(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw12Struct835);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (272-byte structure, version 8 format) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw8272(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw8Struct);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (264-byte structure, version 8 format) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw8264(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw8Struct825);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (228-byte structure, version 8 format) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw8228(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw8Struct810);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (224-byte structure, version 8 format) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw8224(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw8Struct224);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (216-byte structure, version 8 format) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw8216(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw8Struct800);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data (252-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw252(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDrawStruct252);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data from a 236-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw236(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDrawStruct236);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing data from a 52-byte structure (version 7 format) binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data
   */
  static parseDraw752(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw7Struct52);
  }

  /**
   * Parses drawing data from a 48-byte structure (version 7 format) binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data
   */
  static parseDraw748(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDraw7Struct48);
  }

  /**
   * Parses extra drawing data from a 14-byte structure binary buffer
   * @param buffer - The binary buffer containing extra drawing data
   * @returns A structured object containing the parsed extra drawing data
   */
  static parseDrawExtra14(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDrawExtraStruct14);
  }

  /**
   * Parses drawing object data (version 5) from a 60-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj560(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDrawObj5Struct60);
  }

  /**
   * Parses drawing data from a 268-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing data
   * @returns A structured object containing the parsed drawing data with cleaned font information
   */
  static parseDraw268(buffer) {
    const drawData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.CDrawStruct268);
    DSUtil.CleanlfFaceName(drawData.lf);
    return drawData;
  }

  /**
   * Parses drawing object data (version 8, 848-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8848(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct848);
  }

  /**
   * Parses drawing object data (version 8, 312-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8312(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct312);
  }

  /**
   * Parses drawing object data (version 8, 316-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8316(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct316);
  }

  /**
   * Parses drawing object data (version 8, 448-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8448(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct448);
  }

  /**
   * Parses drawing object data (version 8, 847-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8847(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct);
  }

  /**
   * Parses drawing object data (version 8, 837-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8837(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct837);
  }

  /**
   * Parses drawing object data (version 8, 830-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8830(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct830);
  }

  /**
   * Parses drawing object data (version 8, 810-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8810(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct810);
  }

  /**
   * Parses drawing object data (version 8, 824-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8824(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct824);
  }

  /**
   * Parses drawing object data (version 8, 814-byte structure) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj8814(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawObj8Struct814);
  }

  /**
   * Parses drawing object data based on the provided size
   * @param buffer - The binary buffer containing drawing object data
   * @param size - The size of the data structure to read (in bytes)
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj(buffer, size) {
    if (size === 148) {
      return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.DrawObjStruct148);
    } else {
      return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.DrawObjStruct);
    }
  }

  /**
   * Parses drawing text data from a binary buffer using the standard structure
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct);
  }

  /**
   * Parses drawing text data from a 182-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText182(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct182);
  }

  /**
   * Parses drawing text data from a 110-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText110(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct110);
  }

  /**
   * Parses drawing text data from a 106-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText106(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct106);
  }

  /**
   * Parses drawing text data from a 94-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText94(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct94);
  }

  /**
   * Parses drawing text data from an 88-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText88(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct810);
  }

  /**
   * Parses drawing text data from a 72-byte structure binary buffer
   * @param buffer - The binary buffer containing drawing text data
   * @returns A structured object containing the parsed drawing text data
   */
  static parseDrawText72(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawTextStruct300);
  }

  /**
   * Parses paint data from binary buffer
   * @param buffer - The binary buffer containing paint data
   * @returns A structured object containing fill type and color information
   */
  static parseSDPaint(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'filltype',
      'uint32',
      'color',
      'uint32'
    ]);
  }

  /**
   * Parses 24-byte polygon list data from binary buffer
   * @param buffer - The binary buffer containing polygon list data
   * @returns A structured object containing polygon points and metadata
   */
  static parsePolyList24(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolyListStruct24);
  }

  /**
   * Parses 20-byte polygon list data from binary buffer
   * @param buffer - The binary buffer containing polygon list data
   * @returns A structured object containing polygon points and metadata
   */
  static parsePolyList20(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolyListStruct20);
  }

  /**
   * Parses 8-byte polygon list data from binary buffer
   * @param buffer - The binary buffer containing polygon list data
   * @returns A structured object containing polygon points and metadata
   */
  static parsePolyList8(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolyListStruct8);
  }

  /**
   * Parses 12-byte polygon list data from binary buffer
   * @param buffer - The binary buffer containing polygon list data
   * @returns A structured object containing polygon points and metadata
   */
  static parsePolyList12(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolyListStruct12);
  }

  /**
   * Parses polygon segment data from binary buffer
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct);
  }

  /**
   * Parses 26-byte polygon segment data from binary buffer
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg26(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct26);
  }

  /**
   * Parses 18-byte polygon segment data from binary buffer
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg18(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct18);
  }

  /**
   * Parses 32-byte polygon segment data from binary buffer (version 847)
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg32(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct847);
  }

  /**
   * Parses 40-byte polygon segment data from binary buffer
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg40(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct40);
  }

  /**
   * Parses 50-byte polygon segment data from binary buffer
   * @param buffer - The binary buffer containing polygon segment data
   * @returns A structured object containing polygon segment information
   */
  static parsePolySeg50(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegStruct50);
  }

  /**
   * Parses explicit points for polygon segments from binary buffer
   * @param buffer - The binary buffer containing explicit point data
   * @returns A structured object containing explicit point information
   */
  static parsePolySegExplicitPoints(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.PolySegExplicitPointStruct);
  }

  /**
   * Parses freehand line data from binary buffer
   * @param buffer - The binary buffer containing freehand line data
   * @returns A structured object containing freehand line information
   */
  static parseFreehandLineStruct(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.FreehandLineStruct);
  }

  /**
   * Parses link list data from binary buffer
   * @param buffer - The binary buffer containing link list data
   * @returns A structured object containing link list information
   */
  static parseLinkList(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LinkListStruct);
  }

  /**
   * Parses version 6 link list data from binary buffer
   * @param buffer - The binary buffer containing link list data
   * @returns A structured object containing link list information
   */
  static parseLinkList6(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LinkList6Struct);
  }

  /**
   * Parses array hook text data from binary buffer
   * @param buffer - The binary buffer containing array hook text data
   * @returns A structured object containing array hook text information
   */
  static parseArrayHookText(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayHookTextStruct);
  }

  /**
   * Parses 208-byte segment line data from binary buffer
   * @param buffer - The binary buffer containing segment line data
   * @returns A structured object containing segment line information
   */
  static parseSegLine208(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.SegLineStruct208);
  }

  /**
   * Parses 210-byte segment line data from binary buffer
   * @param buffer - The binary buffer containing segment line data
   * @returns A structured object containing segment line information
   */
  static parseSegLine210(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.SegLineStruct210);
  }

  /**
   * Parses standard segment line data from binary buffer
   * @param buffer - The binary buffer containing segment line data
   * @returns A structured object containing segment line information
   */
  static parseSegLine(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.SegLineStruct);
  }

  /**
   * Parses 58-byte segment line data from binary buffer
   * @param buffer - The binary buffer containing segment line data
   * @returns A structured object containing segment line information
   */
  static parseSegLine58(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.SegLineStruct58);
  }

  /**
   * Parses 30-byte array data from binary buffer
   * @param buffer - The binary buffer containing array data
   * @returns A structured object containing array information
   */
  static parseArray30(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayStruct30);
  }

  /**
   * Parses 34-byte array data from binary buffer
   * @param buffer - The binary buffer containing array data
   * @returns A structured object containing array information
   */
  static parseArray34(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayStruct34);
  }

  /**
   * Parses standard array data from binary buffer
   * @param buffer - The binary buffer containing array data
   * @returns A structured object containing array information
   */
  static parseArray(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayStruct);
  }

  /**
   * Parses 38-byte array data from binary buffer
   * @param buffer - The binary buffer containing array data
   * @returns A structured object containing array information
   */
  static parseArray38(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayStruct38);
  }

  /**
   * Parses 14-byte array data from binary buffer
   * @param buffer - The binary buffer containing array data
   * @returns A structured object containing array information
   */
  static parseArray14(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayStruct14);
  }

  /**
   * Parses 50-byte array hook data from binary buffer
   * @param buffer - The binary buffer containing array hook data
   * @returns A structured object containing array hook information
   */
  static parseArrayHook50(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayHookStruct50);
  }

  /**
   * Parses 38-byte array hook data from binary buffer
   * @param buffer - The binary buffer containing array hook data
   * @returns A structured object containing array hook information
   */
  static parseArrayHook38(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayHookStruct38);
  }

  /**
   * Parses 18-byte array hook data from binary buffer
   * @param buffer - The binary buffer containing array hook data
   * @returns A structured object containing array hook information
   */
  static parseArrayHook18(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayHookStruct18);
  }

  /**
   * Parses 14-byte array hook data from binary buffer
   * @param buffer - The binary buffer containing array hook data
   * @returns A structured object containing array hook information
   */
  static parseArrayHook14(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ArrayHookStruct14);
  }

  /**
   * Parses 100-byte container list data from binary buffer
   * @param buffer - The binary buffer containing container list data
   * @returns A structured object containing container list information
   */
  static parseContainerList100(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ContainerListStruct100);
  }

  /**
   * Parses 92-byte container list data from binary buffer
   * @param buffer - The binary buffer containing container list data
   * @returns A structured object containing container list information
   */
  static parseContainerList92(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ContainerListStruct92);
  }

  /**
   * Parses 20-byte container hook data from binary buffer
   * @param buffer - The binary buffer containing container hook data
   * @returns A structured object containing container hook information
   */
  static parseContainerHook20(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ContainerHookStruct20);
  }

  /**
   * Parses 28-byte container hook data from binary buffer
   * @param buffer - The binary buffer containing container hook data
   * @returns A structured object containing container hook information
   */
  static parseContainerHook28(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ContainerHookStruct28);
  }

  /**
   * Parses object data from binary buffer
   * @param buffer - The binary buffer containing object data
   * @param size - The size of the data structure in bytes
   * @returns A structured object containing object data information
   */
  static parseObjData(buffer, size) {
    let parsedData;

    if (size === 32) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.ObjDataStruct32);
    } else {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.ObjDataStruct16);
    }

    return parsedData;
  }

  /**
   * Parses image data from a binary buffer based on the structure size
   * @param buffer - The binary buffer containing image data
   * @param structSize - The size of the structure to be parsed
   * @returns A structured object containing the parsed image data
   */
  static parseDrawImage8(buffer, structSize) {
    let parsedData;

    if (structSize === 48) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.DrawImage8Struct48);
    } else if (structSize === 50) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.DrawImage8Struct50);
    } else if (structSize === 82) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.DrawImage8Struct82);
    }

    return parsedData;
  }

  /**
   * Parses ruler data from a binary buffer based on the structure size
   * @param buffer - The binary buffer containing ruler data
   * @param structSize - The size of the structure to be parsed
   * @returns A structured object containing the parsed ruler data
   */
  static parseRuler(buffer, structSize) {
    let parsedData;

    if (structSize === 52) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.RulerStruct52);
    } else if (structSize === 48) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.RulerStruct48);
    } else if (structSize === 24) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.RulerStruct24);
    } else {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.RulerStruct);
    }

    return parsedData;
  }

  /**
   * Parses line draw list data from a binary buffer
   * @param buffer - The binary buffer containing line draw list data
   * @param structSize - The size of the structure to be parsed (not used in function body)
   * @returns A structured object containing the parsed line draw list data
   */
  static parseLineDrawList(buffer, structSize) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LineDrawListStruct6);
  }

  /**
   * Parses theme data (version 12) from a binary buffer
   * @param buffer - The binary buffer containing theme data
   * @returns A structured object containing the parsed theme data
   */
  static parseBeginTheme12(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.BeginTheme12Struct);
  }

  /**
   * Parses theme category data from a binary buffer
   * @param buffer - The binary buffer containing theme category data
   * @returns A structured object containing the parsed theme category data with a name property
   */
  static parseThemeCat(buffer) {
    const structDefinition = [
      'name',
      'u16stringle:' + buffer.length / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses text font data from a binary buffer
   * @param buffer - The binary buffer containing text font data
   * @returns A structured object containing the parsed text font data
   */
  static parseBeginTextf(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.BeginTextfStruct);
  }

  /**
   * Parses theme font data (version 12) from a binary buffer
   * @param buffer - The binary buffer containing theme font data
   * @returns A structured object containing the parsed theme font data
   */
  static parseThemeFont12(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ThemeFont12Struct);
  }

  /**
   * Parses line data from a binary buffer based on the structure size
   * @param buffer - The binary buffer containing line data
   * @param structSize - The size of the structure to be parsed
   * @returns A structured object containing the parsed line data
   */
  static parseBeginLine(buffer, structSize) {
    let parsedData;

    if (structSize === 8) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.BeginLineStruct8);
    } else if (structSize === 12) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.BeginLineStruct12);
    } else if (structSize === 14) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.BeginLineStruct14);
    }

    return parsedData;
  }

  /**
   * Parses filled line data from a binary buffer
   * @param buffer - The binary buffer containing filled line data
   * @returns A structured object containing the parsed filled line data
   */
  static parseFilledLine(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.FilledLineStruct);
  }

  /**
   * Parses outside effect data from a binary buffer
   * @param buffer - The binary buffer containing outside effect data
   * @returns A structured object containing the parsed outside effect data
   */
  static parseOutSide(buffer) {
    const structDefinition = [
      'outsidetype',
      'int32',
      'extent',
      function (stream) {
        return stream.readStruct(DSConstant.DRectStruct);
      },
      'color',
      'uint32',
      'lparam',
      'uint32',
      'wparam',
      'uint32'
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses inside effect data from a binary buffer
   * @param buffer - The binary buffer containing inside effect data
   * @returns A structured object containing the parsed inside effect data
   */
  static parseInsideEffect(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct([
        'effect',
        'int32',
        'effectcolor',
        'uint32',
        'lparam',
        'uint32',
        'wparam',
        'uint32'
      ]);
  }

  /**
   * Parses gradient data from a binary buffer
   * @param buffer - The binary buffer containing gradient data
   * @returns A structured object containing the parsed gradient data
   */
  static parseGradient(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct([
        'gradientflags',
        'uint32',
        'ecolor',
        'uint32'
      ]);
  }

  /**
   * Parses rich gradient data from a binary buffer
   * @param buffer - The binary buffer containing rich gradient data
   * @returns A structured object containing the parsed rich gradient data
   */
  static parseRichGradient(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct([
        'gradienttype',
        'uint32',
        'angle',
        'uint32',
        'nstops',
        'uint32'
      ]);
  }

  /**
   * Parses rich gradient stop data from a binary buffer
   * @param buffer - The binary buffer containing gradient stop data
   * @returns A structured object containing the parsed gradient stop data
   */
  static parseRichGradientStop(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct([
        'color',
        'uint32',
        'stop',
        'uint32'
      ]);
  }

  /**
   * Parses effect data from a binary buffer
   * @param buffer - The binary buffer containing effect data
   * @returns A structured object containing the parsed effect data
   */
  static parseEffect(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct([
        'effecttype',
        'int32',
        'effectcolor',
        'uint32',
        'wparam',
        'uint32',
        'lparam',
        'uint32'
      ]);
  }

  /**
   * Parses texture data from a binary buffer
   * @param buffer - The binary buffer containing texture data
   * @returns A structured object containing the parsed texture data
   */
  static parseTexture(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.TextureStruct);
  }

  /**
   * Parses hatch pattern data from a binary buffer
   * @param buffer - The binary buffer containing hatch pattern data
   * @returns A structured object containing the parsed hatch pattern data
   */
  static parseHatch(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.HatchStruct);
  }

  /**
   * Parses style data from a binary buffer
   * @param buffer - The binary buffer containing style data
   * @returns A structured object containing the parsed style data with a stylename property
   */
  static parseBeginStyle(buffer) {
    if (buffer.length === 0) {
      return { stylename: '' };
    }

    const structDefinition = [
      'stylename',
      'u16stringle:' + buffer.length / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses expanded view SVG data from a binary buffer
   * @param buffer - The binary buffer containing SVG data
   * @returns A structured object containing the parsed SVG data with an svg property
   */
  static parseExpandedView(buffer) {
    if (buffer.length === 0) {
      return { svg: '' };
    }

    const structDefinition = [
      'svg',
      'u16stringle:' + buffer.length / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses arrow drawing data from a binary buffer
   * @param buffer - The binary buffer containing arrow drawing data
   * @returns A structured object containing arrow size, start/end arrow types, and arrow IDs
   */
  static parseDrawArrow(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawArrowStruct);
  }

  /**
   * Parses hook drawing data from a binary buffer
   * @param buffer - The binary buffer containing hook drawing data
   * @returns A structured object containing object ID, index, connection points and cell ID
   */
  static parseDrawHook(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawHookStruct);
  }

  /**
   * Parses 10-byte hook drawing data from a binary buffer
   * @param buffer - The binary buffer containing hook drawing data (10-byte structure)
   * @returns A structured object containing object ID, index, and connection points
   */
  static parseDrawHook10(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawHookStruct10);
  }

  /**
   * Parses border drawing data from a binary buffer
   * @param buffer - The binary buffer containing border drawing data
   * @returns A structured object containing border width, pattern index, and color
   */
  static parseDrawBorder(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawBOrderStruct);
  }

  /**
   * Parses line drawing data from a binary buffer
   * @param buffer - The binary buffer containing line drawing data
   * @returns A structured object containing line border, pattern, color, and arrow information
   */
  static parseDrawLine(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawLineStruct);
  }

  /**
   * Parses fill drawing data from a binary buffer
   * @param buffer - The binary buffer containing fill drawing data
   * @returns A structured object containing fill pattern index, color, gradient flags, and end color
   */
  static parseDrawFill(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawFillStruct);
  }

  /**
   * Parses 6-byte fill drawing data from a binary buffer
   * @param buffer - The binary buffer containing 6-byte fill drawing data
   * @returns A structured object containing fill pattern index and color
   */
  static parseDrawFill6(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.DrawFillStruct6);
  }

  /**
   * Parses drawing object data (version 7) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @param structSize - The size of the structure to be parsed (20 or 48 bytes)
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj7(buffer, structSize) {
    return 20 === structSize
      ? new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.DrawObj7Struct20)
      : new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.DrawObj7Struct48);
  }

  /**
   * Parses drawing object data (version 6) from a binary buffer
   * @param buffer - The binary buffer containing drawing object data
   * @param structSize - The size of the structure to be parsed (20 bytes or standard size)
   * @returns A structured object containing the parsed drawing object data
   */
  static parseDrawObj6(buffer, structSize) {
    return 20 === structSize
      ? new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.DrawObj6Struct20)
      : new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(DSUtil.DrawObj6Struct);
  }

  /**
   * Parses connection point data from a binary buffer
   * @param buffer - The binary buffer containing connection point data
   * @returns A structured object containing connection point information
   */
  static parseConnectPoint(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.ConnectPointStruct);
  }

  /**
   * Parses 8-byte long text data (version 8) from a binary buffer
   * @param buffer - The binary buffer containing 8-byte long text data
   * @returns A structured object containing instance ID and style count
   */
  static parseLongText88(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LonText8Struct8);
  }

  /**
   * Parses long text data (version 8) from a binary buffer
   * @param buffer - The binary buffer containing long text data
   * @returns A structured object containing text metadata including runs, styles, and character counts
   */
  static parseLongText8(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LongText8Struct);
  }

  /**
   * Parses text data from a binary buffer
   * @param buffer - The binary buffer containing text data
   * @returns A structured object containing text metadata and formatting information
   */
  static parseText(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.TextStruct);
  }

  /**
   * Parses long text data from a binary buffer
   * @param buffer - The binary buffer containing long text data
   * @returns A structured object containing text metadata, formatting information, and shadow effects
   */
  static parseLongText(buffer) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LongTextStruct);
  }

  /**
   * Parses text character data from a binary buffer (Unicode format)
   * @param buffer - The binary buffer containing text character data
   * @returns A structured object containing the text as a Unicode string
   */
  static parseTextChar(buffer) {
    const structDefinition = [
      'text',
      'u16stringle:' + buffer.length / 2
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses text character data from a binary buffer (8-bit format)
   * @param buffer - The binary buffer containing text character data
   * @returns A structured object containing the text as an 8-bit ASCII string
   */
  static parseTextChar8(buffer) {
    const structDefinition = [
      'text',
      'string:' + buffer.length
    ];
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses text runs data from a binary buffer
   * @param buffer - The binary buffer containing text runs data
   * @returns A structured object containing text run information including formatting codes
   */
  static parseTextRuns(buffer) {
    const structDefinition = [
      'nruns',
      'uint16',
      'runs',
      function (stream, data) {
        const runStruct = [
          'ncodes',
          'uint16',
          'offset',
          'uint32',
          'op',
          function (stream, runData) {
            const operations = [];

            for (let i = 0; i < runData.ncodes; i++) {
              const codeData = stream.readStruct(DSConstant.TextCodeStructCode);

              // Handle float values specially
              const valueData = codeData.code === TextConstant.TextStyleCodes.SizeFloat
                ? stream.readStruct(DSConstant.TextCodeStructValueFloat)
                : stream.readStruct(DSConstant.TextCodeStructValue);

              codeData.value = valueData.value;
              operations.push(codeData);
            }

            return operations;
          }
        ];

        const runs = [];
        for (let i = 0; i < data.nruns; i++) {
          runs.push(stream.readStruct(runStruct));
        }

        return runs;
      }
    ];

    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses text style data from a binary buffer
   * @param buffer - The binary buffer containing text style data
   * @returns A structured object containing text style index, code count, and style codes
   */
  static parseTextStyle(buffer) {
    const structDefinition = [
      'index',
      'uint16',
      'ncodes',
      'uint16',
      'codes',
      function (stream, data) {
        const styleCodes = [];

        for (let i = 0; i < data.ncodes; i++) {
          styleCodes.push(stream.readStruct(DSConstant.StyleCodeStruct));
        }

        return styleCodes;
      }
    ];

    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(structDefinition);
  }

  /**
   * Parses graph data from a binary buffer
   * @param buffer - The binary buffer containing graph data
   * @param structSize - The size of the structure to be parsed
   * @returns A structured object containing graph configuration and display properties
   */
  static parseGraph(buffer, structSize) {
    if (structSize === 52) {
      return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphStruct);
    }

    throw new Error('Invalid graph structure size');
  }

  /**
   * Parses graph axis data from a binary buffer
   * @param buffer - The binary buffer containing graph axis data
   * @param structSize - The size of the structure in bytes
   * @returns A structured object with graph axis properties
   */
  static parseGraphAxis(buffer, structSize) {
    let parsedData;

    if (structSize === 106) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphAxisStruct);
    } else {
      console.error('Invalid graph axis structure size');
    }

    return parsedData;
  }

  /**
   * Parses graph point data from a binary buffer
   * @param buffer - The binary buffer containing graph point data
   * @param structSize - The size of the structure in bytes
   * @returns A structured object with graph point properties
   */
  static parseGraphPoint(buffer, structSize) {
    let parsedData;

    if (structSize === 64) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphPointStruct);
    } else {
      console.error('Invalid graph point structure size');
    }

    return parsedData;
  }

  /**
   * Parses graph title data from a binary buffer
   * @param buffer - The binary buffer containing graph title data
   * @param structSize - The size of the structure in bytes
   * @returns A structured object with graph title properties
   */
  static parseGraphTitle(buffer, structSize) {
    let parsedData;

    if (structSize === 28) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphAxisTitleStruct);
    } else {
      console.error('Invalid graph title structure size');
    }

    return parsedData;
  }

  /**
   * Parses graph axis label data from a binary buffer
   * @param buffer - The binary buffer containing graph axis label data
   * @param structSize - The size of the structure in bytes
   * @returns A structured object with graph axis label properties
   */
  static parseGraphAxisLabel(buffer, structSize) {
    let parsedData;

    if (structSize === 24) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphAxisLabelStruct);
    } else {
      console.error('Invalid graph label structure size');
    }

    return parsedData;
  }

  /**
   * Parses graph legend entry data from a binary buffer
   * @param buffer - The binary buffer containing graph legend entry data
   * @param structSize - The size of the structure in bytes
   * @returns A structured object with graph legend entry properties
   */
  static parseGraphLegendEntry(buffer, structSize) {
    let parsedData;

    if (structSize === 26) {
      parsedData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
        .readStruct(DSConstant.GraphLegendEntryStruct);
    } else {
      console.error('Invalid graph legend entry structure size');
    }

    return parsedData;
  }

  /**
   * Provides a polyfill for ArrayBuffer.prototype.slice if not available
   * Ensures compatibility across different browsers and environments
   */
  static PatchArrayBufferSlice() {
    if (!ArrayBuffer.prototype.slice) {
      ArrayBuffer.prototype.slice = function (start, end) {
        const sourceArray = new Uint8Array(this);

        if (end === undefined) {
          end = sourceArray.length;
        }

        const resultBuffer = new ArrayBuffer(end - start);
        const resultArray = new Uint8Array(resultBuffer);

        for (let i = 0; i < resultArray.length; i++) {
          resultArray[i] = sourceArray[i + start];
        }

        return resultBuffer;
      };
    }
  }

  /**
   * Parses image data from a binary buffer and creates blob URLs
   * @param buffer - The binary buffer containing image data
   * @param mimeType - The MIME type of the image
   * @returns Object containing the image as URL, Blob, and raw bytes
   */
  static parseImage(buffer, mimeType) {
    DSUtil.PatchArrayBufferSlice();

    const stream = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN);
    let bufferData = stream.buffer;
    bufferData = bufferData.slice(stream.byteOffset);

    const imageBytes = new Uint8Array(bufferData);
    const imageBlob = new Blob([bufferData], { type: mimeType });
    const urlCreator = window.URL || window.webkitURL;
    let imageUrl = '';

    if (urlCreator &&
      urlCreator.createObjectURL &&
      mimeType !== 'image/wmf' &&
      mimeType !== 'image/store') {
      imageUrl = urlCreator.createObjectURL(imageBlob);
    }

    return {
      URL: imageUrl,
      Blob: imageBlob,
      BlobBytes: imageBytes
    };
  }

  /**
   * Parses image block data from a binary buffer
   * @param buffer - The binary buffer containing image block data
   * @returns Object containing image ID, directory, and binary data
   */
  static parseCImageLock(buffer) {
    const stream = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN);
    const bufferData = stream.buffer;
    const headerData = stream.readStruct(DSConstant.LongValue2Struct);

    DSUtil.PatchArrayBufferSlice();

    const imageData = bufferData.slice(stream.byteOffset + 8);
    const imageBytes = new Uint8Array(imageData);

    return {
      data: imageData,
      bytes: imageBytes,
      imageid: headerData.value,
      imagedir: headerData.type
    };
  }

  /**
   * Parses SD data from a binary buffer
   * @param buffer - The binary buffer containing SD data
   * @returns Object containing SD data ID, directory, and binary data
   */
  static parseCSdData(buffer) {
    const stream = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN);
    const bufferData = stream.buffer;
    const headerData = stream.readStruct(DSConstant.LongValue2Struct);

    DSUtil.PatchArrayBufferSlice();

    const sdData = bufferData.slice(stream.byteOffset);
    const sdBytes = new Uint16Array(sdData);

    return {
      data: sdData,
      bytes: sdBytes,
      imageid: headerData.value,
      imagedir: headerData.type
    };
  }

  /**
   * Parses a native buffer from binary data
   * @param buffer - The binary buffer to parse
   * @returns Object containing the parsed data and byte array
   */
  static parseNativeBuffer(buffer) {
    const dataStream = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN);
    const bufferData = dataStream.buffer;
    DSUtil.PatchArrayBufferSlice();

    const slicedData = bufferData.slice(dataStream.byteOffset + 4);
    const byteArray = new Uint8Array(slicedData);

    const result = {
      data: slicedData,
      bytes: byteArray
    };

    return result;
  }

  /**
   * Parses a native block from SDF format
   * @param buffer - The binary buffer containing native block data
   * @returns Object containing the parsed data, byte array, and native ID
   */
  static parseCNativeBlock(buffer) {
    const dataStream = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN);
    const bufferData = dataStream.buffer;
    const headerData = dataStream.readStruct(DSConstant.LongValueStruct);

    DSUtil.PatchArrayBufferSlice();

    const slicedData = bufferData.slice(dataStream.byteOffset + 4);
    const byteArray = new Uint8Array(slicedData);

    const result = {
      data: slicedData,
      bytes: byteArray,
      nativeid: headerData.value
    };

    return result;
  }

  /**
   * Writes a native buffer to a data stream
   * @param dataStream - The target data stream
   * @param dataBuffer - The buffer to write
   */
  static writeNativeBuffer(dataStream, dataBuffer) {
    const bufferData = new T3DataStream(dataBuffer, null, T3DataStream.LITTLE_ENDIAN).buffer;
    const byteArray = new Uint8Array(bufferData);
    const dataLength = byteArray.length;

    dataStream.writeUint32(dataLength + 4);
    dataStream.writeUint8Array(byteArray);
  }

  /**
   * Writes a native SDF buffer to a data stream
   * @param dataStream - The target data stream
   * @param byteArray - The byte array to write
   */
  static writeNativeSdfBuffer(dataStream, byteArray) {
    const dataLength = byteArray.length;

    dataStream.writeUint32(dataLength + 4);
    dataStream.writeUint8Array(byteArray);
  }

  /**
   * Writes a native byte array to a data stream
   * @param dataStream - The target data stream
   * @param byteArray - The byte array to write
   */
  static writeNativeByteArray(dataStream, byteArray) {
    dataStream.writeUint8Array(byteArray);
  }

  /**
   * Parses 4-byte layer flags from binary data
   * @param buffer - The binary buffer containing layer flags
   * @param size - The size of the data (not used in function body)
   * @returns Object containing layer flags
   */
  static parseCLayerFlags4(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'flags',
      'uint32'
    ]);
  }

  /**
   * Parses 2-byte layer flags from binary data
   * @param buffer - The binary buffer containing layer flags
   * @param size - The size of the data (not used in function body)
   * @returns Object containing layer flags
   */
  static parseCLayerFlags2(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'flags',
      'uint16'
    ]);
  }

  /**
   * Parses layer type from binary data
   * @param buffer - The binary buffer containing layer type
   * @param size - The size of the data (not used in function body)
   * @returns Object containing layer type
   */
  static parseCLayerType(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'type',
      'uint32'
    ]);
  }

  /**
   * Parses native ID from binary data
   * @param buffer - The binary buffer containing native ID
   * @param size - The size of the data (not used in function body)
   * @returns Object containing native ID
   */
  static parseCNativeId(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'nativeid',
      'uint32'
    ]);
  }

  /**
   * Parses tool palettes collapsed state from binary data
   * @param buffer - The binary buffer containing collapsed state
   * @param size - The size of the data (not used in function body)
   * @returns Object containing collapsed state
   */
  static parseCToolPalettesCollapsed(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'collapsed',
      'uint32'
    ]);
  }

  /**
   * Parses image ID and directory from binary data
   * @param buffer - The binary buffer containing image information
   * @param size - The size of the data (not used in function body)
   * @returns Object containing blob bytes ID and image directory
   */
  static parseCImageId(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'blobbytesid',
      'uint32',
      'imagedir',
      'uint32'
    ]);
  }

  /**
   * Parses layer list from binary data
   * @param buffer - The binary buffer containing layer list
   * @param size - The size of the data (not used in function body)
   * @returns Structured object containing layer list information
   */
  static parseCLayerList(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.LayerListStruct);
  }

  /**
   * Parses OLE header from binary data
   * @param buffer - The binary buffer containing OLE header
   * @param size - The size of the data (not used in function body)
   * @returns Structured object containing OLE header information
   */
  static parseCOleHeader(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.OleHeaderStruct);
  }

  /**
   * Parses texture data from binary buffer and sets the appropriate texture format
   * @param buffer - The binary buffer containing texture data
   * @param size - The size of the data (not used in function body)
   * @returns Structured object containing texture information
   */
  static parseOTexture(buffer, size) {
    const textureData = new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN)
      .readStruct(DSConstant.TextureStruct);

    switch (textureData.imagetype) {
      case StyleConstant.ImageDir.Meta:
        DSConstant.TextureFormat = 'image/meta';
        break;
      case StyleConstant.ImageDir.Jpg:
        DSConstant.TextureFormat = 'image/jpeg';
        break;
      case StyleConstant.ImageDir.Png:
        DSConstant.TextureFormat = 'image/png';
        break;
    }

    return textureData;
  }

  /**
   * Parses extended texture data from binary buffer
   * @param buffer - The binary buffer containing extended texture data
   * @param size - The size of the data (not used in function body)
   * @returns Structured object containing extended texture information
   */
  static parseOTextureExt(buffer, size) {
    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct([
      'categoryindex',
      'int32',
      'units',
      'int32',
      'scale',
      'float64',
      'rwidth',
      'float64',
      'alignment',
      'int32',
      'flags',
      'int32'
    ]);
  }

  /**
   * Parses unknown data format from binary buffer
   * @param buffer - The binary buffer containing unknown data
   * @returns Object containing raw data as string
   */
  static parseUnknown(buffer) {
    const structDefinition = [
      'data',
      'string:' + buffer.length
    ];

    return new T3DataStream(buffer, null, T3DataStream.LITTLE_ENDIAN).readStruct(structDefinition);
  }
}

export default DSUtil
