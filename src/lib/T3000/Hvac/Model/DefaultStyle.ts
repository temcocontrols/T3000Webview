
import FillData from './FillData';
import LineData from './LineData';
import OutsideEffectData from './OutsideEffectData';
import TextFormatData from './TextFormatData';
import PaintData from './PaintData';

class DefaultStyle {
  public Name: string;
  public Fill: FillData;
  public Border: LineData;
  public OutsideEffect: OutsideEffectData;
  public Text: TextFormatData;
  public Line: LineData;

  constructor() {
    this.Name = 'default';
    this.Fill = new FillData();
    this.Border = new LineData();
    this.OutsideEffect = new OutsideEffectData();
    this.Text = new TextFormatData();
    this.Line = new LineData();
  }
}

var df = new DefaultStyle();

/*
var df = new FillData();
df.SetPaint(new PaintData('#000000'));
*/

df.Border = new LineData().SetPaint(new PaintData('#7F7F7F'));
df.Fill = new FillData().SetPaint(new PaintData('#FFFFFF'));
df.Line = new LineData().SetPaint(new PaintData('#545454'));
df.Text = new TextFormatData().SetPaint(new PaintData('#333333'));

export default DefaultStyle;


