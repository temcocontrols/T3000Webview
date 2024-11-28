
class Point {
  public x: number;
  public y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }
}

class PageRecord {

  public papersize: any;
  public minsize: any;
  public margins: any;

  constructor() {
    this.papersize = { x: 1100, y: 850 };
    this.minsize = { x: 1e3, y: 750 };
    this.margins = { left: 50, top: 50, right: 50, bottom: 50 };
  }
}

class ContentHeader {
  public Page: PageRecord;
  public MaxWorkDim: Point;

  constructor() {
    this.Initialize();
  }

  Initialize = () => {
    this.Page = new PageRecord();
    this.MaxWorkDim = new Point(32e4, 32e4);
  }
}

export default ContentHeader;
