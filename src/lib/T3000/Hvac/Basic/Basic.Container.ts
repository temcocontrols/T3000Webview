

import HvacSVG from "../Helper/SVG.t2"
import Element from "./Basic.Element"

class Container extends Element {

  constructor() {
    super();
  }

  AddElement(element, insertionIndex) {
    console.log('= B.Container AddElement input element, insertionIndex', element, insertionIndex);

    if (insertionIndex !== undefined && this.svgObj instanceof HvacSVG.Doc) {
      insertionIndex++;
    }
    this.svgObj.add(element.svgObj, insertionIndex);

    if (element.svgObj.parent === this.svgObj) {
      element.parent = this;
      element.RefreshPaint(true);
    }

    console.log('= B.Container AddElement output element', element);
  }

  RemoveElement(elementToRemove) {
    console.log('= B.Container RemoveElement input', elementToRemove);

    if (elementToRemove.svgObj.parent === this.svgObj) {
      this.svgObj.remove(elementToRemove.svgObj);
      elementToRemove.parent = null;
    }

    console.log('= B.Container RemoveElement output', elementToRemove);
  }

  RemoveAll() {
    console.log('= B.Container RemoveAll input');
    let startIndex = 0;
    let totalChildren = this.svgObj.children().length;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

    for (let currentIndex = startIndex; currentIndex < totalChildren; currentIndex++) {
      this.svgObj.removeAt(startIndex);
    }

    console.log('= B.Container RemoveAll output');
  }

  RemoveElementByInternalID(internalID) {
    console.log('= B.Container RemoveElementByInternalID input internalID', internalID);

    const elements = this.svgObj.children();
    let startIndex = 0;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

    for (let i = startIndex; i < elements.length; i++) {
      const child = elements[i].SDGObj;
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
    let totalElements = this.svgObj.children().length;

    if (this.svgObj instanceof HvacSVG.Doc) {
      totalElements--;
    }

    console.log('= B.Container ElementCount output totalElements', totalElements);
    return totalElements;
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
    console.log('= B.Container GetElementByIndex output', children[index].SDGObj);
    return children[index].SDGObj;
  }

  GetElementByID(elementID: string, requiredUserData?: any) {
    console.log('= B.Container GetElementByID input elementID, requiredUserData', elementID, requiredUserData);
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof HvacSVG.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.ID === elementID) {
        if (requiredUserData && child.userData !== requiredUserData) {
          continue;
        }
        console.log('= B.Container GetElementByID output', child);
        return child;
      }
    }
    console.log('= B.Container GetElementByID output', null);
    return null;
  }

  GetElementByIDInGroup(targetID) {
    console.log('= B.Container GetElementByIDInGroup input targetID', targetID);

    function searchByID(container) {
      const childNodes = container.svgObj.children();
      let found = null;

      for (let i = 0; i < childNodes.length; i++) {
        const child = childNodes[i].SDGObj;
        if (!child) continue;
        if (child.ID === targetID) {
          found = child;
          break;
        }
        found = searchByID(child);
        if (found) break;
      }
      return found;
    }

    const topLevelChildren = this.svgObj.children();
    for (let i = 0; i < topLevelChildren.length; i++) {
      const child = topLevelChildren[i].SDGObj;
      if (!child) continue;
      if (child.ID === targetID) {
        console.log('= B.Container GetElementByIDInGroup output child', child);
        return child;
      }
      const result = searchByID(child);
      if (result) {
        console.log('= B.Container GetElementByIDInGroup output result', result);
        return result;
      }
    }

    console.log('= B.Container GetElementByIDInGroup output', null);
    return null;
  }

  GetElementListWithID(elementID: string) {
    console.log('= B.Container GetElementListWithID input elementID', elementID);

    const children = this.svgObj.children();
    const resultList = [];
    let startIndex = 0;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

    for (let index = startIndex; index < children.length; index++) {
      const childObj = children[index].SDGObj;
      if (childObj && childObj.ID === elementID) {
        resultList.push(childObj);
      }
    }

    console.log('= B.Container GetElementListWithID output resultList', resultList);
    return resultList;
  }

  GetElementByInternalID(internalID) {
    console.log('= B.Container GetElementByInternalID input internalID', internalID);
    const children = this.svgObj.children();
    let startIndex = 0;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

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

  FindElement(elementId: string) {
    console.log('= B.Container FindElement input elementId', elementId);
    const children = this.svgObj.children();

    for (let index = 0; index < children.length; index++) {
      const childElement = children[index].SDGObj;
      if (!childElement) {
        continue;
      }
      if (childElement.ID === elementId) {
        console.log('= B.Container FindElement output', childElement);
        return childElement;
      }
      if (childElement instanceof Container) {
        const foundElement = childElement.FindElement(elementId);
        if (foundElement) {
          console.log('= B.Container FindElement output', foundElement);
          return foundElement;
        }
      }
    }

    console.log('= B.Container FindElement output', null);
    return null;
  }

  FindElementByDOMElement(domElement: HTMLElement) {
    console.log('= B.Container FindElementByDOMElement input', domElement);
    let foundElement;
    const children = this.svgObj.children();
    let startIndex = 0;

    if (this.svgObj instanceof HvacSVG.Doc) {
      startIndex++;
    }

    for (let index = startIndex; index < children.length; index++) {
      const childObject = children[index].SDGObj;
      if (childObject) {
        if (childObject.DOMElement() === domElement) {
          console.log('= B.Container FindElementByDOMElement output', childObject);
          return childObject;
        }
        if (childObject instanceof Container) {
          foundElement = childObject.FindElementByDOMElement(domElement);
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
    let elementIndex = this.svgObj.children().indexOf(element.svgObj);
    if (elementIndex > 0 && this.svgObj instanceof HvacSVG.Doc) {
      elementIndex--;
    }
    console.log('= B.Container GetElementIndex output elementIndex', elementIndex);
    return elementIndex;
  }

  MoveElementForward(element) {
    console.log('= B.Container MoveElementForward input element', element);
    if (this.GetElementIndex(element) < this.ElementCount()) {
      element.svgObj.forward();
    }
    console.log('= B.Container MoveElementForward output element', element);
  }

  MoveElementBackward(element: Element) {
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
