
import { Type } from 'class-transformer'
import 'reflect-metadata'

import FillData from './FillData'
import LineData from './LineData'
import OutsideEffectData from './OutsideEffectData'
import TextFormatData from './TextFormatData'

class QuickStyle {
  public Name: string;

  @Type(() => LineData)
  public Border: LineData;

  @Type(() => FillData)
  public Fill: FillData;

  @Type(() => LineData)
  public Line: LineData;

  @Type(() => OutsideEffectData)
  public OutsideEffect: OutsideEffectData;

  @Type(() => TextFormatData)
  public Text: TextFormatData;

  constructor() {
    this.Name = 'Style7';
    this.Fill = new FillData();
    this.Border = new LineData();
    this.OutsideEffect = new OutsideEffectData();
    this.Text = new TextFormatData();
    this.Line = new LineData();
  }
}

// var df = new QuickStyle();

// /*
// var df = new FillData();
// df.SetPaint(new PaintData('#000000'));
// */

// df.Border = new LineData().SetPaint(new PaintData('#7F7F7F'));
// df.Fill = new FillData().SetPaint(new PaintData('#FFFFFF'));
// df.Line = new LineData().SetPaint(new PaintData('#545454'));
// df.Text = new TextFormatData().SetPaint(new PaintData('#333333'));

export default QuickStyle


