

class Layer {

  public name: string;
  public flags: number;
  public n: number;
  public index: number;
  public layertype: number;
  public zList: any[];

  constructor() {
    this.name = '';
    this.flags = 1;
    this.n = 0;
    this.index = 0;
    this.layertype = 0;
    this.zList = [];
  }
}

export default Layer
