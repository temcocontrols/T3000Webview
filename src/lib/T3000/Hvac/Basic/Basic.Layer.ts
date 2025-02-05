

import HvacSVG from "../Helper/SVG.t2"
import Container from "./Basic.Container"

class Layer extends Container {
  public scaleOKFlag: boolean;
  public dpiScaleOnlyFlag: boolean;

  constructor() {
    super()
    this.scaleOKFlag = true;
    this.dpiScaleOnlyFlag = false;
  }

  CreateElement(element: any, attributes: any) {
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.initElement(element, attributes);
    return this.svgObj;
  }

  allowScaling(isScalingEnabled: boolean) {
    this.scaleOKFlag = isScalingEnabled;
    if (isScalingEnabled) {
      this.dpiScaleOnlyFlag = false;
    }
  }

  allowDpiScalingOnly(enableDpiScaling: boolean): void {
    this.dpiScaleOnlyFlag = enableDpiScaling;
    if (enableDpiScaling) {
      this.scaleOKFlag = false;
    }
  }

  isScalingEnabled(): boolean {
    return this.scaleOKFlag;
  }

  isDpiScalingEnabled(): boolean {
    return this.dpiScaleOnlyFlag;
  }
}

export default Layer
