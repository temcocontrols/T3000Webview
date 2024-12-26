

class StepRect {

  public h: number;
  public v: number;
  public hend: number;
  public vend: number;

  constructor(e: number, t: number, a: number, r: number) {
    this.h = e || 0;
    this.v = t || 0;
    this.hend = a || 0;
    this.vend = r || 0;
  }
}

export default StepRect
