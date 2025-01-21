

class Hook {

  public objid: number;
  public cellid: number;
  public cellindex: number;
  public hookpt: number;
  public connect: { x: number, y: number };

  constructor(objid: number, cellid: number, cellindex: number, hookpt: number, connect: { x: number, y: number }) {
    this.objid = objid || 0;
    this.cellid = cellid || null;
    this.cellindex = cellindex || 0;
    this.hookpt = hookpt || 0;
    this.connect = { x: 0, y: 0 };

    if (connect) {
      this.connect.x = connect.x || 0;
      this.connect.y = connect.y || 0;
    }
  }
}

export default Hook
