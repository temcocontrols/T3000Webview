

class HitResult {

  public objectid: number;
  public hitcode: number;
  public cellid: number;
  public segment: number;
  public pt: { x: number, y: number };

  constructor(e: number, t: number, a: number) {

    this.objectid = e || 0;
    this.hitcode = t || 0;
    this.cellid = a || 0;
    this.segment = - 1;
    this.pt = { x: 0, y: 0 };
  }
}

export default HitResult
