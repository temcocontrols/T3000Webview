
import ConstantData from "../Data/ConstantData"

class PolySeg {

  public LineType: any;
  public dataclass: number;
  public ShortRef: number;
  public param: number;
  public weight: number;
  public dimDeflection: number;
  public flags: number;
  public pt: any;
  public UserData: any;

  constructor(lineType: any, ptx: any, pty: any) {

    this.LineType = lineType || ConstantData.LineType.LINE;
    this.dataclass = 0;
    this.ShortRef = 0;
    this.param = 0;
    this.weight = 0;
    this.dimDeflection = 0;
    this.flags = 0;
    this.pt = { x: 0, y: 0 };
    this.UserData = null;
    if (ptx) { this.pt.x = ptx; }
    if (pty) { this.pt.y = pty; }
  }
}

export default PolySeg
