

import StyleConstant from "../../Data/Constant/StyleConstant";

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
}

export default DSUtil
