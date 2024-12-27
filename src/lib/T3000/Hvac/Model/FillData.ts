
import { Type } from 'class-transformer'
import 'reflect-metadata'

import PaintData from './PaintData'
import ConstantData from '../Data/ConstantData'

class FillData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public Hatch: number;
  public FillEffect: number;
  public EffectColor: any;
  public WParam: number;
  public LParam: number;

  // White: '#FFFFFF' Black: '#000000' Hilite: '#0099FF' Select: '#00FF00' Shade: '#F1F1F1' Gray: '#C0C0C0'
  constructor() {
    this.Paint = new PaintData(ConstantData.Colors.Color_White);
    this.Hatch = 0;
    this.FillEffect = 0;
    this.EffectColor = null;
    this.WParam = 0;
    this.LParam = 0;
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default FillData
