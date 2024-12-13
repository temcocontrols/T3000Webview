
import PaintData from './PaintData';

class LineData {

  public Paint: PaintData;
  public Hatch: number;
  public LineEffect: number;
  public Thickness: number;
  public LinePattern: number;
  public BThick: number;
  public EdgeColor: any;
  public LParam: number;
  public WParam: number;

  constructor() {
    this.Paint = new PaintData('#000000');
    this.Hatch = 0;
    this.LineEffect = 0;
    this.Thickness = 1;
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
