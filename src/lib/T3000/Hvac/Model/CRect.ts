

class CRect {

  public h: number;
  public v: number;
  public hdist: number;
  public vdist: number;

  constructor(h: number, v: number, hdist: number, vdist: number) {
    this.h = h || 0;
    this.v = v || 0;
    this.hdist = hdist || 0;
    this.vdist = vdist || 0;
  }
}

export default CRect
