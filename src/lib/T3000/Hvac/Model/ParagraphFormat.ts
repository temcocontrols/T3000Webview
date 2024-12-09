


class ParagraphFormat {

  public just: string;
  public bullet: string;
  public spacing: number;
  public lindent: number;
  public rindent: number;
  public pindent: number;
  public tabspace: number;
  public vjust: string;

  constructor() {
    this.just = 'center';
    this.bullet = 'none';
    this.spacing = 0;
    this.lindent = 0;
    this.rindent = 0;
    this.pindent = 0;
    this.tabspace = 0;
    this.vjust = 'middle';
  }
}

export default ParagraphFormat
