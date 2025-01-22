
class Link {
  public targetid: number;
  public hookid: number;
  public flags: number;
  public cellid: number;

  constructor(targetid: number, hookid: number, cellid: number) {
    this.targetid = targetid || 0;
    this.hookid = hookid || 0;
    this.flags = 0;
    this.cellid = cellid;
  }
}

export default Link
