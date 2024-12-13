
import FillData from './FillData'
import LineData from './LineData'
import OutsideEffectData from './OutsideEffectData'
import TextFormatData from './TextFormatData'

class QuickStyle {

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

export default QuickStyle


