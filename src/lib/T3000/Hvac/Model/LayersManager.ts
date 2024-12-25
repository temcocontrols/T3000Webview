
import { Type } from 'class-transformer'
import 'reflect-metadata'

import ConstantData from "../Data/ConstantData"
import Layer from './Layer'

class LayersManager {
  public Type: number;
  public nlayers: number;

  @Type(() => Layer)
  public layers: Layer[];

  public activelayer: number;

  // Double ===
  public swimlanelist: any[];

  constructor() {
    this.Type = ConstantData.StoredObjectType.LAYERS_MANAGER_OBJECT;
    this.nlayers = 0;
    this.layers = new Array<Layer>();
    this.activelayer = 0;
    this.swimlanelist = [];
  }
}

export default LayersManager
