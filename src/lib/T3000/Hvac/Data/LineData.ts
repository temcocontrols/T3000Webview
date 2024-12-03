

class LineData {
  Hatch: number;
  LineEffect: number;
  Thickness: number;
  LinePattern: number;
  BThick: number;
  EdgeColor: any;
  LParam: number;
  WParam: number;

  constructor() {
    this.Hatch = 0;
    this.LineEffect = 0;
    this.Thickness = 1;
    this.LinePattern = 0;
    this.BThick = 0;
    this.EdgeColor = null;
    this.LParam = 0;
    this.WParam = 0;
  }
}

export default LineData;
