

import $ from 'jquery';
import HvacSVG from "../Helper/SVG.t2"
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"
import GlobalData from '../Data/GlobalData';

class Style {

  public element: any;
  public width: number;
  public height: number;

  constructor(elementObject: any) {
    console.log('B.Element.Style: Initializing with element:', elementObject);
    this.element = elementObject;
    this.width = 0;
    this.height = 0;
    console.log('B.Element.Style: Constructor completed, initialized element object');
  }

  static imageSizeRequest: any;
  static imageSizeCache: any;

  static DefineColor(red: number, green: number, blue: number): string {
    console.log('B.Element.Style: defineColor called with red:', red, 'green:', green, 'blue:', blue);

    red = Math.min(255, Math.max(0, red));
    green = Math.min(255, Math.max(0, green));
    blue = Math.min(255, Math.max(0, blue));

    const color = '#' + red.toString(16).padStart(2, '0') + green.toString(16).padStart(2, '0') + blue.toString(16).padStart(2, '0');
    console.log('B.Element.Style: defineColor output:', color);

    return color;
  }

  static CalcImageSize(
    imageUrl: string,
    callback: (width: number, height: number, error: any, data: any) => void,
    callbackData: any,
    forceSvg?: boolean
  ) {
    console.log('B.Element.Style: CalcImageSize input:', { imageUrl, callbackData, forceSvg });

    const svgDoc = GlobalData.docHandler ? GlobalData.docHandler.svgDoc : null;
    const cachedSize = Style.GetCachedImageSize(imageUrl);

    if (cachedSize) {
      if (svgDoc) {
        svgDoc.ImageLoad_AddRef();
      }
      setTimeout(() => {
        callback(cachedSize.width, cachedSize.height, null, callbackData);
        console.log('B.Element.Style: CalcImageSize output from cache:', { width: cachedSize.width, height: cachedSize.height });
        if (svgDoc) {
          svgDoc.ImageLoad_DecRef();
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

    console.log('B.Element.Style: CalcImageSize processed request for imageUrl:', imageUrl);
  }

  static CacheImageSize(imageUrl: string, width: number, height: number): void {
    console.log('B.Element.Style: CacheImageSize called with imageUrl:', imageUrl, 'width:', width, 'height:', height);
    Style.imageSizeCache = Style.imageSizeCache || {};
    Style.imageSizeCache[imageUrl.toUpperCase()] = { width, height };
    console.log('B.Element.Style: CacheImageSize updated cache for imageUrl:', imageUrl, 'with dimensions:', { width, height });
  }

  static GetCachedImageSize(imageUrl: string) {
    console.log('B.Element.Style: GetCachedImageSize called with imageUrl:', imageUrl);
    const cachedSize =
      (Style.imageSizeCache &&
        Style.imageSizeCache[imageUrl.toUpperCase()]) ||
      null;
    console.log('B.Element.Style: GetCachedImageSize returning:', cachedSize);
    return cachedSize;
  }

  static ProcessImageSizeRequest(
    imageUrl: string,
    width: number,
    height: number,
    error: any
  ): void {
    console.log('B.Element.Style: processImageSizeRequest called with input:', {
      imageUrl,
      width,
      height,
      error
    });

    if (Style.imageSizeRequest) {
      const requestKey = imageUrl.toUpperCase();
      const requests = Style.imageSizeRequest[requestKey];

      if (requests) {
        // Remove the pending requests for the given imageUrl
        delete Style.imageSizeRequest[requestKey];

        for (let index = 0; index < requests.length; index++) {
          const request = requests[index];
          if (request && request.callback) {
            console.log('B.Element.Style: Calling callback for request:', {
              index,
              requestData: request.data
            });
            request.callback(width, height, error, request.data);
          }
        }
      }
    }

    console.log('B.Element.Style: processImageSizeRequest finished processing for imageUrl:', imageUrl);
  }

  static GetBitmapDimensions(
    imageUrl: string,
    callback: (width: number, height: number, error: any, callbackData: any) => void,
    callbackData: any
  ) {
    console.log('B.Element.Style: GetBitmapDimensions: Input parameters:', { imageUrl, callbackData });
    const image = new Image();
    const svgDoc = GlobalData.docHandler ? GlobalData.docHandler.svgDoc : null;

    if (svgDoc) {
      svgDoc.ImageLoad_AddRef();
    }

    image.onload = function () {
      console.log('B.Element.Style: GetBitmapDimensions: onload triggered for imageUrl:', imageUrl, 'with dimensions:', { width: this.width, height: this.height });
      if (this.width && this.height) {
        Style.CacheImageSize(imageUrl, this.width, this.height);
        Style.ProcessImageSizeRequest(imageUrl, this.width, this.height, null);
        if (callback) {
          callback(this.width, this.height, null, callbackData);
        }
      } else {
        if (svgDoc) {
          svgDoc.ImageLoad_DecRef();
        }
        console.log('B.Element.Style: GetBitmapDimensions: Invalid dimensions, falling back to GetSVGDimensions for imageUrl:', imageUrl);
        Style.GetSVGDimensions(imageUrl, callback, callbackData);
      }
      if (svgDoc) {
        svgDoc.ImageLoad_DecRef();
      }
      console.log('B.Element.Style: GetBitmapDimensions: onload completed for imageUrl:', imageUrl);
    };

    image.onerror = function (errorEvent) {
      console.log('B.Element.Style: GetBitmapDimensions: onerror triggered for imageUrl:', imageUrl, 'Error event:', errorEvent);
      Style.ProcessImageSizeRequest(imageUrl, 0, 0, { success: false });
      if (callback) {
        callback(0, 0, { success: false }, callbackData);
      }
      if (svgDoc) {
        svgDoc.ImageLoad_DecRef();
      }
      console.log('B.Element.Style: GetBitmapDimensions: onerror completed for imageUrl:', imageUrl);
    };

    image.src = imageUrl;
    console.log('B.Element.Style: GetBitmapDimensions: Image source set for imageUrl:', imageUrl);
  }

  static GetSVGDimensions(
    svgUrl: string,
    callback?: (width: number, height: number, error: any, callbackData: any) => void,
    callbackData?: any
  ): void {
    console.log('B.Element.Style: GetSVGDimensions called with svgUrl:', svgUrl, 'callbackData:', callbackData);

    const svgDocumentHandler = GlobalData.docHandler ? GlobalData.docHandler.svgDoc : null;
    if (svgDocumentHandler) {
      svgDocumentHandler.ImageLoad_AddRef();
    }

    $.ajax({
      type: 'GET',
      url: svgUrl,
      async: true,
      contentType: 'image/svg',
      dataType: 'text',
      success: function (responseText) {
        console.log('B.Element.Style: GetSVGDimensions AJAX success for svgUrl:', svgUrl);
        const svgSize = Style.ExtractSVGSize(responseText);
        Style.CacheImageSize(svgUrl, svgSize.width, svgSize.height);
        Style.ProcessImageSizeRequest(svgUrl, svgSize.width, svgSize.height, null);

        if (callback) {
          callback(svgSize.width, svgSize.height, null, callbackData);
        }

        if (svgDocumentHandler) {
          svgDocumentHandler.ImageLoad_DecRef();
        }

        console.log('B.Element.Style: GetSVGDimensions returning dimensions for svgUrl:', svgUrl, svgSize);
      },
      error: function (errorEvent) {
        console.log('B.Element.Style: GetSVGDimensions AJAX error for svgUrl:', svgUrl, 'Error:', errorEvent);
        Style.ProcessImageSizeRequest(svgUrl, 0, 0, { success: false });

        if (callback) {
          callback(0, 0, { success: false }, callbackData);
        }

        if (svgDocumentHandler) {
          svgDocumentHandler.ImageLoad_DecRef();
        }

        console.log('B.Element.Style: GetSVGDimensions returning error for svgUrl:', svgUrl);
      }
    });
  }

  static ExtractSVGSize(svgContent: string): { width: number; height: number } {
    console.log('B.Element.Style: ExtractSVGSize input: svgContent:', svgContent);

    const defaultSize = { width: 100, height: 100 };
    const svgTagMatch = svgContent.match(/<svg([\s\S]*?)>/i);
    if (!svgTagMatch || !svgTagMatch[1]) {
      console.log('B.Element.Style: ExtractSVGSize output: defaultSize:', defaultSize);
      return defaultSize;
    }

    const attributesText = svgTagMatch[1];
    let computedWidth = 0;
    let computedHeight = 0;

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

    const resultSize = computedWidth && computedHeight ? { width: computedWidth, height: computedHeight } : defaultSize;
    console.log('B.Element.Style: ExtractSVGSize output: resultSize:', resultSize);
    return resultSize;
  }

}

export default Style
