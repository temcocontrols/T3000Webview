

import { Type } from 'class-transformer'
import 'reflect-metadata'

import CRect from './CRect'

class SEDArray {

  public styleflags: number;
  public tilt: number;
  public angle: number;
  public ht: number;
  public wd: number;
  public flags: number;
  public matchsizelen: number;
  public lasttexthook: number;
  public curveparam: number;

  @Type(() => CRect)
  public profile: CRect;

  @Type(() => CRect)
  public coprofile: CRect;

  public steps: any[];
  public hook: any[];

  constructor() {
    this.styleflags = 0;
    this.tilt = 0;
    this.angle = 0;
    this.ht = 0;
    this.wd = 0;
    this.flags = 0;
    this.matchsizelen = 0;
    this.lasttexthook = -1;
    this.curveparam = 0;
    this.profile = new CRect(0, 0, 0, 0);
    this.coprofile = new CRect(0, 0, 0, 0);
    this.steps = [];
    this.hook = [];
  }
}

export default SEDArray
