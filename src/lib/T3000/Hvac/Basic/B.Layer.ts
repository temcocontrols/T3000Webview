

import T3Svg from "../Util/T3Svg"
import Container from "./B.Container"

class Layer extends Container {

  public scaleOKFlag: boolean;
  public dpiScaleOnlyFlag: boolean;

  constructor() {
    super()
    this.scaleOKFlag = true;
    this.dpiScaleOnlyFlag = false;
  }

  /**
   * Creates an SVG element and initializes it with the given parameters
   * @param element - The element to create
   * @param options - Configuration options for the element
   * @returns The created SVG object
   */
  CreateElement(element, options) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.InitElement(element, options);
    return this.svgObj;
  }

  /**
   * Sets whether scaling is allowed for this layer
   * @param isAllowedScaling - Boolean indicating if scaling should be allowed
   */
  AllowScaling(isAllowedScaling: boolean) {
    this.scaleOKFlag = isAllowedScaling;
    if (isAllowedScaling) {
      this.dpiScaleOnlyFlag = false;
    }
  }

  /**
   * Sets whether only DPI scaling is allowed for this layer
   * @param isAllowedDpiScaling - Boolean indicating if only DPI scaling should be allowed
   */
  AllowDpiScalingOnly(isAllowedDpiScaling: boolean) {
    this.dpiScaleOnlyFlag = isAllowedDpiScaling;
    if (isAllowedDpiScaling) {
      this.scaleOKFlag = false;
    }
  }

  /**
   * Checks if scaling is allowed for this layer
   * @returns Boolean indicating if scaling is allowed
   */
  IsScalingAllowed() {
    return this.scaleOKFlag;
  }

  /**
   * Checks if DPI scaling is allowed for this layer
   * @returns Boolean indicating if DPI scaling is allowed
   */
  IsDpiScalingAllowed() {
    return this.dpiScaleOnlyFlag;
  }

}

export default Layer
