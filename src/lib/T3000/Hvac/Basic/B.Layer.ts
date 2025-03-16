

import T3Svg from "../Util/T3Svg"
import $ from "jquery";
import Container from "./B.Container";
import Utils1 from "../Util/Utils1"
import Utils2 from "../Util/Utils2"
import Utils3 from "../Util/Utils3"
import ConstantData from "../Data/ConstantData"

class Layer extends Container {

  public scaleOKFlag: boolean;
  public dpiScaleOnlyFlag: boolean;

  constructor() {
    super()
    this.scaleOKFlag = true;
    this.dpiScaleOnlyFlag = false;
  }

  CreateElement(elementParam, optionsParam) {
    console.log('= B.Layer CreateElement input:', elementParam, optionsParam);
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.InitElement(elementParam, optionsParam);
    console.log('= B.Layer CreateElement output:', this.svgObj);
    return this.svgObj;
  }

  AllowScaling(isAllowedScaling: boolean) {
    console.log('= B.Layer AllowScaling input:', isAllowedScaling);
    this.scaleOKFlag = isAllowedScaling;
    if (isAllowedScaling) {
      this.dpiScaleOnlyFlag = false;
    }
    console.log('= B.Layer AllowScaling output:', {
      scaleOKFlag: this.scaleOKFlag,
      dpiScaleOnlyFlag: this.dpiScaleOnlyFlag
    });
  }

  AllowDpiScalingOnly(isAllowedDpiScaling: boolean) {
    console.log('= B.Layer AllowDpiScalingOnly input:', isAllowedDpiScaling);

    this.dpiScaleOnlyFlag = isAllowedDpiScaling;
    if (isAllowedDpiScaling) {
      this.scaleOKFlag = false;
    }

    console.log('= B.Layer AllowDpiScalingOnly output:', {
      scaleOKFlag: this.scaleOKFlag,
      dpiScaleOnlyFlag: this.dpiScaleOnlyFlag
    });
  }

  IsScalingAllowed() {
    console.log('= B.Layer IsScalingAllowed input: none');
    const result = this.scaleOKFlag;
    console.log('= B.Layer IsScalingAllowed output:', result);
    return result;
  }

  IsDpiScalingAllowed() {
    console.log('= B.Layer IsDpiScalingAllowed input: none');
    const result = this.dpiScaleOnlyFlag;
    console.log('= B.Layer IsDpiScalingAllowed output:', result);
    return result;
  }

}

export default Layer
