

import PageRecord from './PageRecord'
import Point from './Point'

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

export default ContentHeader