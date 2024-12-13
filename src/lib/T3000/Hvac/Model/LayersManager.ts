


class LayersManager {

  public Type: string;
  public nlayers: number;
  public layers: any[];
  public activelayer: number;
  public swimlanelist: any[];

  constructor() {
    this.Type = 'LayersManagerObject';
    this.nlayers = 0;
    this.layers = [];
    this.activelayer = 0;
    this.swimlanelist = [];
  }

}

export default LayersManager
