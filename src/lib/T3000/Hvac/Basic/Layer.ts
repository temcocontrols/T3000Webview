import Container from "./Container";
import HvacSVG from '../Helper/Hvac.SVG';

class Layer extends Container {
  public scaleOKFlag = true;
  public dpiScaleOnlyFlag = false;

  CreateElement = (element, parent) => {

    console.log('Layer CreateElement 1 element,parent', element, parent);

    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));

    console.log('Layer CreateElement 2 this.svgObj', this.svgObj);

    this.InitElement(element, parent);

    console.log('Document CreateElement 3 this.svgObj', this.svgObj);

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
