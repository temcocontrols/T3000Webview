

import HvacSVG from "../Helper/SVG.t2"
import Element from "./Basic.Element"
import Utils1 from "../Helper/Utils1"
import ConstantData from "../Data/ConstantData"

class Container extends Element {

  constructor() {
    super();
  }

  AddElement(element, index?) {
    console.log('= B.Container AddElement input element, index', element, index);

    if (index !== undefined && this.svgObj instanceof HvacSVG.Doc) {
      index++;
    }
    this.svgObj.add(element.svgObj, index);

    if (element.svgObj.parent === this.svgObj) {
      element.parent = this;
      element.RefreshPaint(true);
    }

    console.log('= B.Container AddElement output element', element);
  }

  RemoveElement(element) {
    console.log('= B.Container RemoveElement input element', element);

    if (!element) { return }

    if (element.svgObj.parent === this.svgObj) {
      this.svgObj.remove(element.svgObj);
      element.parent = null;
    }

    console.log('= B.Container RemoveElement output element', element);
  }

  RemoveAll() {
    console.log('= B.Container RemoveAll input');
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;
    let childrenCount = this.svgObj.children().length;

    for (let i = startIndex; i < childrenCount; i++) {
      this.svgObj.removeAt(startIndex);
    }

    console.log('= B.Container RemoveAll output');
  }

  RemoveElementByInternalID(internalID) {
    console.log('= B.Container RemoveElementByInternalID input internalID', internalID);
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.internalID === internalID) {
        this.svgObj.removeAt(i);
        console.log('= B.Container RemoveElementByInternalID removed element at index', i);
        break;
      }
    }

    console.log('= B.Container RemoveElementByInternalID output');
  }

  ElementCount() {
    console.log('= B.Container ElementCount input');
    let count = this.svgObj.children().length;
    if (this.svgObj instanceof HvacSVG.Doc) {
      count--;
    }
    console.log('= B.Container ElementCount output count', count);
    return count;
  }

  GetElementByIndex(index: number) {
    console.log('= B.Container GetElementByIndex input index', index);
    const children = this.svgObj.children();

    if (this.svgObj instanceof HvacSVG.Doc) {
      index++;
    }

    if (index < 0 || index >= children.length) {
      console.log('= B.Container GetElementByIndex output', null);
      return null;
    }

    const result = children[index].SDGObj;
    console.log('= B.Container GetElementByIndex output', result);
    return result;
  }

  GetElementByID(id: string, userData?: any) {
    console.log('= B.Container GetElementByID input id, userData', id, userData);
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.ID === id) {
        if (userData && child.userData !== userData) continue;
        console.log('= B.Container GetElementByID output', child);
        return child;
      }
    }
    console.log('= B.Container GetElementByID output', null);
    return null;
  }

  GetElementByIDInGroup(id: string) {
    console.log('= B.Container GetElementByIDInGroup input id', id);

    function findElementByID(element) {
      const children = element.svgObj.children();
      let foundElement = null;

      for (let i = 0; i < children.length; i++) {
        const child = children[i].SDGObj;
        if (child) {
          if (child.ID === id) {
            foundElement = child;
            break;
          }
          foundElement = findElementByID(child);
          if (foundElement) break;
        }
      }
      return foundElement;
    }

    const children = this.svgObj.children();
    for (let i = 0; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child) {
        if (child.ID === id) {
          console.log('= B.Container GetElementByIDInGroup output child', child);
          return child;
        }
        const foundElement = findElementByID(child);
        if (foundElement) {
          console.log('= B.Container GetElementByIDInGroup output foundElement', foundElement);
          return foundElement;
        }
      }
    }

    console.log('= B.Container GetElementByIDInGroup output', null);
    return null;
  }

  GetElementListWithID(id: string) {
    console.log('= B.Container GetElementListWithID input id', id);

    const children = this.svgObj.children();
    const result = [];
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.ID === id) {
        result.push(child);
      }
    }

    console.log('= B.Container GetElementListWithID output result', result);
    return result;
  }

  GetElementByInternalID(internalID: string) {
    console.log('= B.Container GetElementByInternalID input internalID', internalID);
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.internalID === internalID) {
        console.log('= B.Container GetElementByInternalID output', child);
        return child;
      }
    }

    console.log('= B.Container GetElementByInternalID output', null);
    return null;
  }

  FindElement(id: string) {
    console.log('= B.Container FindElement input id', id);
    const children = this.svgObj.children();

    for (let i = 0; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child) {
        if (child.ID === id) {
          console.log('= B.Container FindElement output', child);
          return child;
        }
        if (child instanceof Container) {
          const foundElement = child.FindElement(id);
          if (foundElement) {
            console.log('= B.Container FindElement output', foundElement);
            return foundElement;
          }
        }
      }
    }

    console.log('= B.Container FindElement output', null);
    return null;
  }

  FindElementByDOMElement(domElement: HTMLElement) {
    console.log('= B.Container FindElementByDOMElement input domElement', domElement);
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child) {
        if (child.DOMElement() === domElement) {
          console.log('= B.Container FindElementByDOMElement output', child);
          return child;
        }
        if (child instanceof Container) {
          const foundElement = child.FindElementByDOMElement(domElement);
          if (foundElement) {
            console.log('= B.Container FindElementByDOMElement output', foundElement);
            return foundElement;
          }
        }
      }
    }

    console.log('= B.Container FindElementByDOMElement output', null);
    return null;
  }

  GetElementIndex(element) {
    console.log('= B.Container GetElementIndex input element', element);
    let index = this.svgObj.children().indexOf(element.svgObj);
    if (index > 0 && this.svgObj instanceof HvacSVG.Doc) {
      index--;
    }
    console.log('= B.Container GetElementIndex output index', index);
    return index;
  }

  MoveElementForward(element) {
    console.log('= B.Container MoveElementForward input element', element);
    if (this.GetElementIndex(element) < this.ElementCount() - 1) {
      element.svgObj.forward();
    }
    console.log('= B.Container MoveElementForward output element', element);
  }

  MoveElementBackward(element) {
    console.log('= B.Container MoveElementBackward input element', element);
    if (this.GetElementIndex(element) > 0) {
      element.svgObj.backward();
    }
    console.log('= B.Container MoveElementBackward output element', element);
  }

  MoveElementToFront(element) {
    console.log('= B.Container MoveElementToFront input element', element);
    element.svgObj.front();
    console.log('= B.Container MoveElementToFront output element', element);
  }

  MoveElementToBack(element) {
    console.log('= B.Container MoveElementToBack input element', element);
    element.svgObj.back();
    element.svgObj.level();
    console.log('= B.Container MoveElementToBack output element', element);
  }

}

export default Container
