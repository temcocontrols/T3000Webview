

class ContainerListShape {

  public id: number;
  public pt: { x: number, y: number };
  public extra: number;

  constructor() {
    this.id = -1;
    this.pt = { x: 0, y: 0 };
    this.extra = 0;
  }
}

export default ContainerListShape
