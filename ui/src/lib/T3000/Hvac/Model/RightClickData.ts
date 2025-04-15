

class RightClickData {

  public TargetID: number;
  public segment: number;
  public HitPt: { x: number, y: number };
  public Locked: boolean;
  public Context: number;

  constructor() {
    this.TargetID = -1;
    this.segment = -1;
    this.HitPt = { x: 0, y: 0 };
    this.Locked = false;
    this.Context = 0;
  }
}

export default RightClickData
