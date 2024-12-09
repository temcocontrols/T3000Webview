
import PaintData from './PaintData'

class FillData {

  public Paint: PaintData;
  public Hatch: number;
  public FillEffect: number;
  public EffectColor: any;
  public WParam: number;
  public LParam: number;

  constructor() {
    this.Paint = new PaintData('#FFFFFF');
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
