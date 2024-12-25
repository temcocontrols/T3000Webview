
import { Type } from 'class-transformer'
import 'reflect-metadata'

import PaintData from './PaintData'
import ConstantData from '../Data/ConstantData'

class LineData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public Hatch: number;
  public LineEffect: number;
  public Thickness: number;
  public LinePattern: number;
  public BThick: number;
  public EdgeColor: string;
  public LParam: number;
  public WParam: number;

  constructor() {

    //'#00FF00'
    this.Paint = new PaintData(ConstantData.Colors.Color_Select);
    this.Hatch = 0;
    this.LineEffect = 0;

    //1
    this.Thickness = ConstantData.StyleDefaults.SDSTYLE_DEFTHICK;
    this.LinePattern = 0;
    this.BThick = 0;
    this.EdgeColor = null;
    this.LParam = 0;
    this.WParam = 0;
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default LineData
