
import ConstantData from '../Data/ConstantData'

class RulerSettings {

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
    this.units = ConstantData.RulerUnits.SED_Inches;
    this.nTics = 12;
    this.nMid = 1;
    this.nGrid = 12;
    this.originx = 0;
    this.originy = 0;
    this.major = ConstantData.Defines.DefaultRulerMajor;
    this.metricConv = ConstantData.Defines.MetricConv;
    this.dp = 2;
    this.showpixels = false;
    this.fractionaldenominator = 1;

  }
}

export default RulerSettings
