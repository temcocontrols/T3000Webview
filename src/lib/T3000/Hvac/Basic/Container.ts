import Element from './Element';
import HvacSVG from '../Helper/Hvac.SVG';

class Container extends Element {
  constructor() {
    super()
  }

  ElementCount = () => {
    const childrenCount = this.svgObj.children().length;
    if (this.svgObj instanceof HvacSVG.Container) {
      return childrenCount - 1;
    }
    return childrenCount;
  }

  GetElementByIndex = (e) => {
    const children = this.svgObj.children();
    if (this.svgObj instanceof HvacSVG.Doc) {
      e++;
    }
    if (e < 0 || e >= children.length) {
      return null;
    }
    return children[e].SDGObj;
  }

  AddElement = (e: any, t: any) => {
    if (t !== undefined && this.svgObj instanceof HvacSVG.Container) {
      t++;
    }

    this.svgObj.add(e.svgObj, t);
    if (e.svgObj.parent === this.svgObj) {
      e.parent = this;
      e.RefreshPaint(true);
    }
  }

  RemoveElement = (e) => {
    if (e.svgObj.parent === this.svgObj) {
      this.svgObj.remove(e.svgObj);
      e.parent = null;
    }
  }

  GetElementIndex = (e) => {
    let index = this.svgObj.children().indexOf(e.svgObj);
    if (index > 0 && this.svgObj instanceof HvacSVG.Doc) {
      index--;
    }
    return index;
  }

  RemoveAll = () => {
    let startIndex = 0;
    const childrenCount = this.svgObj.children().length;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

    for (let i = startIndex; i < childrenCount; i++) {
      this.svgObj.removeAt(startIndex);
    }
  }
}

export default Container;
