
import { Type } from 'class-transformer'
import 'reflect-metadata'
import PolySeg from './PolySeg'

class PolyList {

  public dim: { x: number, y: number };
  public offset: { x: number, y: number };
  public flags: number;
  public closed: number;
  public wasline: boolean;
  public Shape_Rotation: number;
  public Shape_DataID: number;
  public Shape_TableID: number;

  @Type(() => PolySeg)
  public segs: PolySeg[];

  constructor() {

    this.dim = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0 };
    this.flags = 0;
    this.closed = 0;
    this.wasline = true;
    this.Shape_Rotation = 0;
    this.Shape_DataID = - 1;
    this.Shape_TableID = - 1;
    this.segs = [];
  }
}

export default PolyList
