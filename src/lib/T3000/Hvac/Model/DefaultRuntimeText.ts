

import DefaultStyle from './DefaultStyle'

class DefaultRuntimeText {

  public text: string;
  public charStyles: any[];
  public styleRuns: any[];
  public styles: any[];
  public hyperlinks: any[];

  constructor() {
    this.text = '';
    this.charStyles = [];
    this.styleRuns = [];
    this.styles = [new DefaultStyle()];
    this.hyperlinks = [];
  }
}

export default DefaultRuntimeText
