
import ConstantData from "../Data/ConstantData"

class Layer {

  public name: string;
  public flags: number;
  public n: number;
  public index: number;
  public layertype: number;
  public zList: any[];

  constructor() {
    this.name = '';
    this.flags = ConstantData.LayerFlags.SDLF_Visible;
    this.n = 0;
    this.index = 0;
    this.layertype = ConstantData.LayerTypes.SD_LAYERT_NONE;
    this.zList = [];
  }
}

export default Layer
