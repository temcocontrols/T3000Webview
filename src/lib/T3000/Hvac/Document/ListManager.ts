
enum Defines {
  MaxWorkDimX = 32e4,
  MaxWorkDimY = 32e4,
}

class Point {
  public x: number;
  public y: number;

  constructor(e, t) {
    this.x = e || 0;
    this.y = t || 0;
  }
}

class PageRecord {

  public papersize: any;
  public minsize: any;
  public margins: any;
  public printflags: any;
  public printscale: any;
  public landscape: any;

  constructor() {
    this.papersize = {
      x: 1100,
      y: 850
    },
      this.minsize = {
        x: 1e3,
        y: 750
      },
      this.margins = {
        left: 50,
        top: 50,
        right: 50,
        bottom: 50
      },
      this.printflags = '',
      this.printscale = 0,
      this.landscape = !0
  }
}

class ContentHeader {

  public Page: PageRecord;
  public MaxWorkDim: Point;
  public DimensionFont: any;
  public DimensionFontStyle: any;
  public flags: any;
  public BusinessModule: string;
  public dateformat: number;
  public smarthelpname: string;
  public smartpanelname: string;
  public originaltemplate: string;

  constructor() {
    this.Initialize();
  }

  Initialize = () => {
    this.Page = new PageRecord();
    this.MaxWorkDim = new Point(Defines.MaxWorkDimX, Defines.MaxWorkDimY);
    this.flags = "";
    this.BusinessModule = "";
    this.dateformat = -1;
    this.smarthelpname = "";
    this.smartpanelname = "";
    this.originaltemplate = "";
  }
}

class ListManager {

  public theContentHeader: ContentHeader;

  constructor() {
    this.Initialize();
  }

  Initialize = () => {
    this.theContentHeader = new ContentHeader();
  }
}

export default ListManager;
