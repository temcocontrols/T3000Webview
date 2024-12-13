
class DefaultStyle {

  public font: string;
  public type: string;
  public size: number;
  public weight: string;
  public style: string;
  public baseOffset: string;
  public decoration: string;
  public color: string;
  public colorTrans: number;
  public spError: boolean;
  public dataField: any;
  public hyperlink: number;

  constructor() {
    this.font = 'Arial';
    this.type = 'sanserif';
    this.size = 10;
    this.weight = 'normal';
    this.style = 'normal';
    this.baseOffset = 'none';
    this.decoration = 'none';
    this.color = '#000000';
    this.colorTrans = 1;
    this.spError = false;
    this.dataField = null;
    this.hyperlink = -1;
  }
}

export default DefaultStyle;
