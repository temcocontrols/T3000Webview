

class DefaultFmtText {

  public width: number;
  public height: number;
  public fmtWidth: number;
  public text: string;
  public paragraphs: any[];
  public styles: any[];
  public hyperlinks: any[];

  constructor() {
    this.width = 0;
    this.height = 0;
    this.fmtWidth = 0;
    this.text = '';
    this.paragraphs = [];
    this.styles = [];
    this.hyperlinks = [];
  }
}

export default DefaultFmtText
