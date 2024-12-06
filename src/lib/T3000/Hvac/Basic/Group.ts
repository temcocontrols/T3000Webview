
import Container from './Container';
import HvacSVG from '../Helper/Hvac.SVG';

class Group extends Container {
  constructor() {
    super();
  }

  public clipElem: any;

  CreateElement = (element, parent) => {
    this.svgObj = new HvacSVG.Container().add(HvacSVG.create('g'));
    this.clipElem = null;
    this.InitElement(element, parent);
    return this.svgObj;
  }
}

export default Group;
