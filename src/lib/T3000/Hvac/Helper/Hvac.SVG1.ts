

import { SVG, Element, Rect, Container, extend } from '@svgdotjs/svg.js';

extend(Element, {
  test: function () {
    console.log('Hvac.SVG1.Element.test --------------------');
    return this;
  },
  constructor: {

  }
});

extend(Rect, {
  rectTest: function () {
    console.log('Hvac.SVG1.Rect.rectTest --------------------');
    return this;
  },
});

class HvacElement extends Element {
  constructor() {
    super();
  }

  // add = (e, t) => {
  //   console.log('HvacContainer.add --------------------');
  // }
}

export * from '@svgdotjs/svg.js';
export { HvacElement };
