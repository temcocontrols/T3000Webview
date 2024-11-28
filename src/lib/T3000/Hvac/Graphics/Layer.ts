import Container from "./Container";
import HvacSVG from '../Hvac.SVG';

class Layer extends Container {
  public scaleOKFlag = true;
  public dpiScaleOnlyFlag = false;

  CreateElement = (element, parent) => {
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.InitElement(element, parent);
    return this.svgObj;
  }

  AllowScaling = (isAllowed: boolean): void => {
    this.scaleOKFlag = isAllowed;
    if (isAllowed) {
      this.dpiScaleOnlyFlag = false;
    }
  }

  AllowDpiScalingOnly = (isAllowed: boolean): void => {
    this.dpiScaleOnlyFlag = isAllowed;
    if (isAllowed) {
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
