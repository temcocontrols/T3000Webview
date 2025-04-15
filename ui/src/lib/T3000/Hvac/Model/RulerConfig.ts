
import NvConstant from '../Data/Constant/NvConstant'
import OptConstant from '../Data/Constant/OptConstant';

/**
 * Represents the configuration settings for a ruler used in HVAC control models.
 *
 * This class initializes default values that configure the appearance and measurement properties for a ruler.
 * These settings include unit selection (inches or metric), scaling factors for major divisions,
 * tic counts, grid divisions, and display details (such as decimal precision and pixel visibility).
 *
 * Properties:
 * - useInches: Determines if the ruler uses inches (true) or metric units (false).
 * - majorScale: The scaling factor for major divisions on the ruler.
 * - units: Specifies the unit type for the ruler, initialized from a constant (e.g., NvConstant.RulerUnit.Inches).
 * - nTics: The number of tic marks displayed along the ruler.
 * - nMid: The number of mid divisions between the primary tic marks.
 * - nGrid: The number of grid lines or segments, providing further division on the ruler.
 * - originx: The x-coordinate of the ruler's origin.
 * - originy: The y-coordinate of the ruler's origin.
 * - major: Defines the major tick settings, typically referenced from a common constant.
 * - metricConv: Contains conversion factor(s) for metric units, defined by common constants.
 * - dp: The number of decimal places used when displaying measurements.
 * - showpixels: A flag that indicates whether pixel measurements should be shown alongside standard units.
 * - fractionaldenominator: Denotes the denominator used to represent fractional measurements.
 *
 * @example
 * // Creating an instance of RulerConfig and modifying its properties:
 * const rulerConfig = new RulerConfig();
 * console.log('Using inches:', rulerConfig.useInches);
 *
 * // To switch to metric units:
 * rulerConfig.useInches = false;
 * rulerConfig.units = 'Metric'; // You would typically set this using a relevant constant.
 * console.log('Updated Units:', rulerConfig.units);
 */
class RulerConfig {

  public useInches: boolean;
  public majorScale: number;
  public units: any;
  public nTics: number;
  public nMid: number;
  public nGrid: number;
  public originx: number;
  public originy: number;
  public major: any;
  public metricConv: any;
  public dp: number;
  public showpixels: boolean;
  public fractionaldenominator: number;

  constructor() {

    this.useInches = true;
    this.majorScale = 1;
    this.units = NvConstant.RulerUnit.Inches;
    this.nTics = 12;
    this.nMid = 1;
    this.nGrid = 12;
    this.originx = 0;
    this.originy = 0;
    this.major = OptConstant.Common.DefaultRulerMajor;
    this.metricConv = OptConstant.Common.MetricConv;
    this.dp = 2;
    this.showpixels = false;
    this.fractionaldenominator = 1;

  }
}

export default RulerConfig
