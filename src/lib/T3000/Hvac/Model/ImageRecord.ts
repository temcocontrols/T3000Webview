

import NvConstant from "../Data/Constant/NvConstant";

class ImageRecord {
  mr: {
    x: number;
    y: number;
    width: number;
    height: number;
  };

  croprect: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };

  imageflags: any; // Replace with proper type if known
  scale: number;
  iconid: number;

  constructor() {
    this.mr = {
      x: 0,
      y: 0,
      width: 0,
      height: 0
    };

    this.croprect = {
      left: 0,
      top: 0,
      right: 0,
      bottom: 0
    };

    this.imageflags = NvConstant.ImageScales.CropToFit;
    this.scale = 1;
    this.iconid = 0;
  }
}

export default ImageRecord
