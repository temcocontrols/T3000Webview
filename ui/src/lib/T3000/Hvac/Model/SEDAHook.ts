
import { Type } from 'class-transformer'
import 'reflect-metadata'

import CRect from './CRect'
import ConstantData from '../Data/ConstantData'

class SEDAHook {

  public startpoint: any;
  public endpoint: any;
  public id: number;
  public textid: number;
  public tuniqueid: number;
  public gap: number;
  public ogap: number;
  public extra: number;
  public comanagerht: number;
  public isasst: boolean;

  @Type(() => CRect)
  public pr: CRect;

  public sequence: number;
  public steps: any[];

  constructor() {
    this.startpoint = { h: 0, v: 0 };
    this.endpoint = { h: 0, v: 0 };
    this.id = - 1;
    this.textid = - 1;
    this.tuniqueid = - 1;
    this.gap = ConstantData.ConnectorDefines.DefaultWd;
    this.ogap = 0;
    this.extra = 0;
    this.comanagerht = 0;
    this.isasst = !1;
    this.pr = new CRect(0, 0, 0, 0);
    this.sequence = 0;
    this.steps = [];
  }
}

export default SEDAHook
