

import $ from 'jquery'
import T3Gv from '../Data/T3Gv'

/**
 * Style class for managing element styling and image dimensions in the T3000 HVAC system.
 *
 * This class provides utilities for:
 * - Color definition and manipulation
 * - Image dimension calculation and caching
 * - SVG and bitmap processing
 *
 * The class implements an efficient image size caching system to avoid redundant
 * calculations and network requests when the same image is used multiple times.
 *
 * @example
 * // Define a custom color
 * const purple = Style.DefineColor(128, 0, 255);
 * console.log(purple); // Outputs: #8000ff
 *
 * // Calculate image dimensions
 * Style.CalcImageSize('path/to/image.svg',
 *   (width, height, error, data) => {
 *     if (!error) {
 *       console.log(`Image dimensions: ${width}x${height}`);
 *       console.log(`Custom data:`, data);
 *     }
 *   },
 *   { id: 'myImage' }
 * );
 *
 * // Create a style instance for an element
 * const myElement = document.getElementById('hvacElement');
 * const elementStyle = new Style(myElement);
 */
class Style {

  public element: any;
  public width: number;
  public height: number;

  constructor(elementObject: any) {
    this.element = elementObject;
    this.width = 0;
    this.height = 0;
  }

  static imageSizeRequest: any;
  static imageSizeCache: any;

  /**
   * Creates a color string in hexadecimal format based on RGB values
   * @param red - Red component (0-255)
   * @param green - Green component (0-255)
   * @param blue - Blue component (0-255)
   * @returns Hexadecimal color string (e.g. "#FF00FF")
   */
  static DefineColor(red: number, green: number, blue: number): string {
    red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    blue = Math.min(255, Math.max(0, blue));

    return '#' + red.toString(16).padStart(2, '0') + green.toString(16).padStart(2, '0') + blue.toString(16).padStart(2, '0');
  }

  /**
   * Calculates dimensions of an image, using cache if available
   * @param imageUrl - URL of the image to measure
   * @param callback - Function to call with the resulting dimensions
   * @param callbackData - Additional data to pass to the callback
   * @param forceSvg - If true, treats the image as SVG regardless of extension
   */
  static CalcImageSize(
    imageUrl: string,
    callback: (width: number, height: number, error: any, data: any) => void,
    callbackData: any,
    forceSvg?: boolean
  ) {
    const svgDoc = T3Gv.docUtil ? T3Gv.docUtil.svgDoc : null;
    const cachedSize = Style.GetCachedImageSize(imageUrl);

    if (cachedSize) {
      if (svgDoc) {
        svgDoc.ImageLoadAddRef();
      }
      setTimeout(() => {
        callback(cachedSize.width, cachedSize.height, null, callbackData);
        if (svgDoc) {
          svgDoc.ImageLoadDecRef();
        }
      }, 0);
      return;
    }

    if (forceSvg === undefined) {
      forceSvg = imageUrl.slice(-3).toUpperCase() === 'SVG';
    }

    Style.imageSizeRequest = Style.imageSizeRequest || {};
    const requestKey = imageUrl.toUpperCase();

    if (Style.imageSizeRequest[requestKey]) {
      Style.imageSizeRequest[requestKey].push({ callback, data: callbackData });
    } else {
      Style.imageSizeRequest[requestKey] = [{ callback, data: callbackData }];
      if (forceSvg) {
        Style.GetSVGDimensions(imageUrl);
      } else {
        Style.GetBitmapDimensions(imageUrl, callback, callbackData);
      }
    }
  }

  /**
   * Stores image dimensions in the cache
   * @param imageUrl - URL of the image
   * @param width - Width of the image
   * @param height - Height of the image
   */
  static CacheImageSize(imageUrl: string, width: number, height: number): void {
    Style.imageSizeCache = Style.imageSizeCache || {};
    Style.imageSizeCache[imageUrl.toUpperCase()] = { width, height };
  }

  /**
   * Retrieves cached image dimensions if available
   * @param imageUrl - URL of the image to look up
   * @returns Object with width and height properties, or null if not cached
   */
  static GetCachedImageSize(imageUrl: string) {
    return (Style.imageSizeCache &&
      Style.imageSizeCache[imageUrl.toUpperCase()]) ||
      null;
  }

  /**
   * Processes all pending image size requests for a given URL
   * @param imageUrl - URL of the image
   * @param width - Width of the image
   * @param height - Height of the image
   * @param error - Error information, if any occurred
   */
  static ProcessImageSizeRequest(
    imageUrl: string,
    width: number,
    height: number,
    error: any
  ): void {
    if (Style.imageSizeRequest) {
      const requestKey = imageUrl.toUpperCase();
      const requests = Style.imageSizeRequest[requestKey];

      if (requests) {
        delete Style.imageSizeRequest[requestKey];

        for (let index = 0; index < requests.length; index++) {
          const request = requests[index];
          if (request && request.callback) {
            request.callback(width, height, error, request.data);
          }
        }
      }
    }
  }

  /**
   * Determines dimensions of a bitmap image by loading it
   * @param imageUrl - URL of the image
   * @param callback - Function to call with the resulting dimensions
   * @param callbackData - Additional data to pass to the callback
   */
  static GetBitmapDimensions(
    imageUrl: string,
    callback: (width: number, height: number, error: any, callbackData: any) => void,
    callbackData: any
  ) {
    const image = new Image();
    const svgDoc = T3Gv.docUtil ? T3Gv.docUtil.svgDoc : null;

    if (svgDoc) {
      svgDoc.ImageLoadAddRef();
    }

    image.onload = function () {
      if (this.width && this.height) {
        Style.CacheImageSize(imageUrl, this.width, this.height);
        Style.ProcessImageSizeRequest(imageUrl, this.width, this.height, null);
        if (callback) {
          callback(this.width, this.height, null, callbackData);
        }
      } else {
        if (svgDoc) {
          svgDoc.ImageLoadDecRef();
        }
        Style.GetSVGDimensions(imageUrl, callback, callbackData);
      }
      if (svgDoc) {
        svgDoc.ImageLoadDecRef();
      }
    };

    image.onerror = function (errorEvent) {
      Style.ProcessImageSizeRequest(imageUrl, 0, 0, { success: false });
      if (callback) {
        callback(0, 0, { success: false }, callbackData);
      }
      if (svgDoc) {
        svgDoc.ImageLoadDecRef();
      }
    };

    image.src = imageUrl;
  }

  /**
   * Fetches and determines dimensions of an SVG image
   * @param svgUrl - URL of the SVG image
   * @param callback - Function to call with the resulting dimensions
   * @param callbackData - Additional data to pass to the callback
   */
  static GetSVGDimensions(
    svgUrl: string,
    callback?: (width: number, height: number, error: any, callbackData: any) => void,
    callbackData?: any
  ): void {
    const svgDocumentHandler = T3Gv.docUtil ? T3Gv.docUtil.svgDoc : null;
    if (svgDocumentHandler) {
      svgDocumentHandler.ImageLoadAddRef();
    }

    $.ajax({
      type: 'GET',
      url: svgUrl,
      async: true,
      contentType: 'image/svg',
      dataType: 'text',
      success: function (responseText) {
        const svgSize = Style.ExtractSVGSize(responseText);
        Style.CacheImageSize(svgUrl, svgSize.width, svgSize.height);
        Style.ProcessImageSizeRequest(svgUrl, svgSize.width, svgSize.height, null);

        if (callback) {
          callback(svgSize.width, svgSize.height, null, callbackData);
        }

        if (svgDocumentHandler) {
          svgDocumentHandler.ImageLoadDecRef();
        }
      },
      error: function (errorEvent) {
        Style.ProcessImageSizeRequest(svgUrl, 0, 0, { success: false });

        if (callback) {
          callback(0, 0, { success: false }, callbackData);
        }

        if (svgDocumentHandler) {
          svgDocumentHandler.ImageLoadDecRef();
        }
      }
    });
  }

  /**
   * Extracts width and height information from SVG content
   * @param svgContent - String containing SVG XML content
   * @returns Object with width and height properties
   */
  static ExtractSVGSize(svgContent: string): { width: number; height: number } {
    const defaultSize = { width: 100, height: 100 };
    const svgTagMatch = svgContent.match(/<svg([\s\S]*?)>/i);
    if (!svgTagMatch || !svgTagMatch[1]) {
      return defaultSize;
    }

    const attributesText = svgTagMatch[1];
    let computedWidth = 0;
    let computedHeight = 0;

    /**
     * Converts a value from one unit to pixels
     * @param value - Numeric value to convert
     * @param unit - Unit of measurement (in, mm, cm, pt, pc, px)
     * @returns Value converted to pixels
     */
    function convertUnit(value: number, unit: string): number {
      let converted = 0;
      if (!unit || !value) return value;
      switch (unit) {
        case 'in':
          converted = 100 * value;
          break;
        case 'mm':
          converted = (100 * value) / 25.4;
          break;
        case 'cm':
          converted = (100 * value) / 2.54;
          break;
        case 'pt':
          converted = (100 * value) / 72;
          break;
        case 'pc':
          converted = (100 * value) / 6;
          break;
        case 'px':
        default:
          converted = value;
      }
      return converted;
    }

    const widthMatch = attributesText.match(/width=["'](\d*\.?\d+)(\w*)["']/i);
    if (widthMatch && widthMatch[1]) {
      computedWidth = convertUnit(parseFloat(widthMatch[1]), widthMatch[2]);
    }

    const heightMatch = attributesText.match(/height=["'](\d*\.?\d+)(\w*)["']/i);
    if (heightMatch && heightMatch[1]) {
      computedHeight = convertUnit(parseFloat(heightMatch[1]), heightMatch[2]);
    }

    if (!(computedWidth && computedHeight)) {
      const viewBoxMatch = attributesText.match(/viewbox=["'](\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)\s+(\d*\.?\d+)["']/i);
      if (viewBoxMatch && viewBoxMatch[3] && viewBoxMatch[4]) {
        computedWidth = parseFloat(viewBoxMatch[3]);
        computedHeight = parseFloat(viewBoxMatch[4]);
      }
    }

    return computedWidth && computedHeight ? { width: computedWidth, height: computedHeight } : defaultSize;
  }
}

export default Style
