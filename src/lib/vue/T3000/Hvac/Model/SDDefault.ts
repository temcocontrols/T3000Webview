
import { Type } from 'class-transformer'
import 'reflect-metadata'
import NvConstant from "../Data/Constant/NvConstant"
import FontRecord from "./FontRecord"
import QuickStyle from './QuickStyle'
import OptConstant from '../Data/Constant/OptConstant'

/**
 * Represents the default settings for an HVAC element, encapsulating style,
 * text formatting, margins, and various graphical dimension properties.
 *
 * @remarks
 * This class provides a collection of default configuration values that are used to initialize
 * an HVAC model element. These include visual styling through the QuickStyle and FontRecord objects,
 * text alignment properties, text growth behavior, fixed margins, and parameters for drawing arrays
 * and rectangles. The class is designed to supply a standardized configuration which can be easily
 * modified to suit different visual or spatial requirements.
 *
 * @example
 * // Create an instance with default settings
 * const sdDefault = new SDDefault();
 *
 * // Access and modify some properties
 * sdDefault.just = 'left';
 * sdDefault.tmargins.left = 10;
 * sdDefault.textgrow = NvConstant.TextGrowBehavior.Flexible;
 * sdDefault.rrectparam = SomeOtherConstant;
 *
 * // Use the updated sdDefault instance for further processing in the HVAC control system.
 *
 * @public
 */
class SDDefault {

  @Type(() => QuickStyle)
  public style: QuickStyle;
  public just: string;
  public vjust: string;

  @Type(() => FontRecord)
  public lf: FontRecord;

  public textflags: number;
  public textgrow: number;
  public fsize_min: number;
  public tmargins: { left: number, top: number, right: number, bottom: number };
  public flags: number;
  public h_arraywidth: number;
  public v_arraywidth: number;
  public lastcommand: number;
  public arrayht: number;
  public arraywd: number;
  public wallThickness: number;
  public curveparam: number;
  public rrectparam: number;
  public pen: {};
  public highlighter: {};

  constructor() {
    this.style = new QuickStyle();
    this.just = 'center';
    this.vjust = 'center';
    this.lf = new FontRecord();
    this.textflags = 0;
    this.textgrow = NvConstant.TextGrowBehavior.ProPortional;
    this.fsize_min = 8;
    this.tmargins = { left: OptConstant.Common.DefTextMargin, top: OptConstant.Common.DefTextMargin, right: OptConstant.Common.DefTextMargin, bottom: OptConstant.Common.DefTextMargin };
    this.flags = 0;
    this.h_arraywidth = 50;
    this.v_arraywidth = 50;
    this.lastcommand = 0;
    this.arrayht = 25;
    this.arraywd = 25;
    this.wallThickness = 0;
    this.curveparam = 0;
    this.rrectparam = OptConstant.Common.DefFixedRRect;
    this.pen = {};
    this.highlighter = {};
  }
}

export default SDDefault
