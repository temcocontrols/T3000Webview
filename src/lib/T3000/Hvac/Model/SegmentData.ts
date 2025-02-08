


class SegmentData {

  public angle: number;
  public origSeg: { start: { x: number, y: number }, end: { x: number, y: number } };
  public clipSeg: { start: { x: number, y: number }, end: { x: number, y: number } };
  public extSeg: { startRay: { x: number, y: number }, startExt: { x: number, y: number }, start: { x: number, y: number }, end: { x: number, y: number }, endExt: { x: number, y: number }, endRay: { x: number, y: number } };

  constructor() {
    this.angle = 0;
    this.origSeg = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    this.clipSeg = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    this.extSeg = {
      startRay: { x: 0, y: 0 },
      startExt: { x: 0, y: 0 },
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      endExt: { x: 0, y: 0 },
      endRay: { x: 0, y: 0 }
    }
  }
}

export default SegmentData
