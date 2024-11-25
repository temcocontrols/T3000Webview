import Container from "./Container";
import * as SVG from '@svgdotjs/svg.js';

class Layer extends Container {
  public scaleOKFlag = true;
  public dpiScaleOnlyFlag = false;

  CreateElement = (element, parent) => {
    this.svgObj = new SVG.Container().add(SVG.create('g'));
    this.InitElement(element, parent);
    return this.svgObj;
  }

  AllowScaling = (e) => {
    this.scaleOKFlag = e;
    if (e) {
      this.dpiScaleOnlyFlag = false;
    }
  }

  AllowDpiScalingOnly = (e) => {
    this.dpiScaleOnlyFlag = e;
    if (e) {
      this.scaleOKFlag = false;
    }
  }

  IsScalingAllowed = () => {
    return this.scaleOKFlag;
  }

  IsDpiScalingAllowed = () => {
    return this.dpiScaleOnlyFlag;
  }
}

export default Layer;
