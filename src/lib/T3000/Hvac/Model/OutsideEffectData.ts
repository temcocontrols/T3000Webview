
import ConstantData from '../Data/ConstantData'

class OutsideEffectData {

  public OutsideType: number;
  public OutsideExtent_Right: number;
  public OutsideExtent_Left: number;
  public OutsideExtent_Top: number;
  public OutsideExtent_Bottom: number;
  public Color: string;
  public LParam: number;
  public WParam: number;

  constructor() {
    this.OutsideType = 0;
    this.OutsideExtent_Right = 0;
    this.OutsideExtent_Left = 0;
    this.OutsideExtent_Top = 0;
    this.OutsideExtent_Bottom = 0;
    this.Color = ConstantData.Colors.Color_Black;
    this.LParam = 0;
    this.WParam = 0;
  }
}

export default OutsideEffectData
