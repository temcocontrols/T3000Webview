
import PaintData from './PaintData';
import OutsideEffectData from './OutsideEffectData';

class TextFormatData {
  public Paint: PaintData;
  public FontName: string;
  public FontType: string;
  public FontId: number;
  public FontSize: number;
  public Face: number;
  public Effect: OutsideEffectData;

  constructor() {
    this.Paint = new PaintData('#000000');
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

export default TextFormatData;
