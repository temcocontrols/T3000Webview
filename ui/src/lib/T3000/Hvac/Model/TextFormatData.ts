
import { Type } from 'class-transformer'
import 'reflect-metadata'

import PaintData from './PaintData'
import OutsideEffectData from './OutsideEffectData'
import ConstantData from '../Data/ConstantData'

class TextFormatData {

  @Type(() => PaintData)
  public Paint: PaintData;

  public FontName: string;
  public FontType: string;
  public FontId: number;
  public FontSize: number;
  public Face: number;

  @Type(() => OutsideEffectData)
  public Effect: OutsideEffectData;

  constructor() {

    this.Paint = new PaintData(ConstantData.Colors.Color_Black);
    this.FontName = 'Arial';
    this.FontType = 'sanserif';
    this.FontId = 1;
    this.FontSize = 10;
    this.Face = 0;
    this.Effect = new OutsideEffectData();
  }

  SetPaint = (paint: PaintData) => {
    this.Paint = paint;
    return this;
  }
}

export default TextFormatData
