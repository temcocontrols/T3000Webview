
import Container from './Container';
import SVG from '../HvacSVG';

class Group extends Container {

  constructor() {
    super();
  }

  public clipElem: any;

  CreateElement = (element, parent) => {
    this.svgObj = new SVG.Container().add(SVG.create('g'));
    this.clipElem = null;
    this.InitElement(element, parent);
    return this.svgObj;
  }
}

export default Group;
