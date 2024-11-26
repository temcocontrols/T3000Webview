import Element from './Element';
// import * as SVG from '@svgdotjs/svg.js';
import SVG from '../HvacSVG';

class Container extends Element {
  constructor() {
    super()
  }

  ElementCount = () => {
    const childrenCount = this.svgObj.children().length;
    if (this.svgObj instanceof /*SVG.Doc*/SVG.Container) {
      return childrenCount - 1;
    }
    return childrenCount;
  }

  GetElementByIndex = (e) => {
    const children = this.svgObj.children();
    if (this.svgObj instanceof SVG.Doc) {
      e++;
    }
    if (e < 0 || e >= children.length) {
      return null;
    }
    return children[e].SDGObj;
  }

  AddElement = (e: any, t: any) => {
    console.log('Container.AddElement e1 1', e.svgObj, t);


    if (t !== undefined && this.svgObj instanceof SVG.Container) {
      t++;
    }

    console.log('Container.AddElement e1 2', e.svgObj, t);
    console.log('Container.AddElement e1 3', this.svgObj);

    // debugger;
    this.svgObj.add(e.svgObj, t);

    console.log('Container.AddElement e1 4', this.svgObj);

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
    if (index > 0 && this.svgObj instanceof SVG.Doc) {
      index--;
    }
    return index;
  }

  RemoveAll = () => {
    let startIndex = 0;
    const childrenCount = this.svgObj.children().length;

    if (this.svgObj instanceof SVG.Doc) {
      startIndex++;
    }

    for (let i = startIndex; i < childrenCount; i++) {
      this.svgObj.removeAt(startIndex);
    }
  }
}

export default Container;
