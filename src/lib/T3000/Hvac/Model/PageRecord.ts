
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

export default PageRecord
