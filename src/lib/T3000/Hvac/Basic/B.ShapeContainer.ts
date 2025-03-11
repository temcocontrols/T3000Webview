

import $ from 'jquery';
import T3Svg from "../Helper/T3Svg"
import Group from "./B.Group";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class ShapeContainer extends Group {

  public shapeGroup: any;

  constructor() {
    super()
  }

  CreateElement(element: any, type: any) {
    console.log("= B.ShapeContainer CreateElement input:", { element, type });
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.InitElement(element, type);
    this.shapeGroup = new Group();
    this.shapeGroup.CreateElement(element, type);
    super.AddElement(this.shapeGroup);
    console.log("= B.ShapeContainer CreateElement output:", this.svgObj);
    return this.svgObj;
  }

  AddElement(element: any, type: any, useSuper: boolean) {
    console.log("= B.ShapeContainer AddElement input:", { element, type, useSuper });
    let result;
    if (useSuper) {
      result = super.AddElement(element, type);
    } else {
      result = this.shapeGroup ? this.shapeGroup.AddElement(element, type) : void 0;
    }
    console.log("= B.ShapeContainer AddElement output:", result);
    return result;
  }

  RemoveElement(element: any, useSuper: boolean) {
    console.log("= B.ShapeContainer RemoveElement input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.RemoveElement(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.RemoveElement(element) : void 0;
    }
    console.log("= B.ShapeContainer RemoveElement output:", result);
    return result;
  }

  RemoveAll(useSuper: boolean) {
    console.log("= B.ShapeContainer RemoveAll input:", { useSuper });
    let result;
    if (useSuper) {
      result = super.RemoveAll();
    } else {
      result = this.shapeGroup ? this.shapeGroup.RemoveAll() : void 0;
    }
    console.log("= B.ShapeContainer RemoveAll output:", result);
    return result;
  }

  RemoveElementByInternalID(internalID: string, useSuper: boolean) {
    console.log("= B.ShapeContainer RemoveElementByInternalID input:", { internalID, useSuper });
    let result;
    if (useSuper) {
      result = super.RemoveElementByInternalID(internalID);
    } else {
      result = this.shapeGroup ? this.shapeGroup.RemoveElementByInternalID(internalID) : void 0;
    }
    console.log("= B.ShapeContainer RemoveElementByInternalID output:", result);
    return result;
  }

  ElementCount(useSuper: boolean) {
    console.log("= B.ShapeContainer ElementCount input:", { useSuper });
    let result;
    if (useSuper) {
      result = super.ElementCount();
    } else {
      result = this.shapeGroup ? this.shapeGroup.ElementCount() : 0;
    }
    console.log("= B.ShapeContainer ElementCount output:", result);
    return result;
  }

  GetElementByIndex(index: number, useSuper: boolean) {
    console.log("= B.ShapeContainer GetElementByIndex input:", { index, useSuper });
    let result;
    if (useSuper) {
      result = super.GetElementByIndex(index);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementByIndex(index) : null;
    }
    console.log("= B.ShapeContainer GetElementByIndex output:", result);
    return result;
  }

  GetElementByID(elementID: string, useSuper: boolean, additionalParam: any) {
    console.log("= B.ShapeContainer GetElementByID input:", { elementID, useSuper, additionalParam });
    let result;
    if (useSuper) {
      result = super.GetElementByID(elementID, additionalParam);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementByID(elementID, additionalParam) : null;
    }
    console.log("= B.ShapeContainer GetElementByID output:", result);
    return result;
  }

  GetElementByIDInGroup(elementID: string, useSuper: boolean) {
    console.log("= B.ShapeContainer GetElementByIDInGroup input:", { elementID, useSuper });
    let result;
    if (useSuper) {
      result = super.GetElementByIDInGroup(elementID);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementByIDInGroup(elementID) : null;
    }
    console.log("= B.ShapeContainer GetElementByIDInGroup output:", result);
    return result;
  }

  GetElementListWithID(elementID: string, useSuper: boolean) {
    console.log("= B.ShapeContainer GetElementListWithID input:", { elementID, useSuper });
    let result;
    if (useSuper) {
      result = super.GetElementListWithID(elementID);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementListWithID(elementID) : [];
    }
    console.log("= B.ShapeContainer GetElementListWithID output:", result);
    return result;
  }

  GetElementByInternalID(internalID: string, useSuper: boolean) {
    console.log("= B.ShapeContainer GetElementByInternalID input:", { internalID, useSuper });
    let result;
    if (useSuper) {
      result = super.GetElementByInternalID(internalID);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementByInternalID(internalID) : null;
    }
    console.log("= B.ShapeContainer GetElementByInternalID output:", result);
    return result;
  }

  FindElement(element, useSuper) {
    console.log("= B.ShapeContainer FindElement input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.FindElement(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.FindElement(element) : null;
    }
    console.log("= B.ShapeContainer FindElement output:", result);
    return result;
  }

  FindElementByDOMElement(domElement, useSuper) {
    console.log("= B.ShapeContainer FindElementByDOMElement input:", { domElement, useSuper });
    let result;
    if (useSuper) {
      result = super.FindElementByDOMElement(domElement);
    } else {
      result = this.shapeGroup ? this.shapeGroup.FindElementByDOMElement(domElement) : null;
    }
    console.log("= B.ShapeContainer FindElementByDOMElement output:", result);
    return result;
  }

  GetElementIndex(element, useSuper) {
    console.log("= B.ShapeContainer GetElementIndex input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.GetElementIndex(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.GetElementIndex(element) : -1;
    }
    console.log("= B.ShapeContainer GetElementIndex output:", result);
    return result;
  }

  MoveElementForward(element, useSuper) {
    console.log("= B.ShapeContainer MoveElementForward input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.MoveElementForward(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.MoveElementForward(element) : void 0;
    }
    console.log("= B.ShapeContainer MoveElementForward output:", result);
    return result;
  }

  MoveElementBackward(element, useSuper) {
    console.log("= B.ShapeContainer MoveElementBackward input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.MoveElementBackward(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.MoveElementBackward(element) : void 0;
    }
    console.log("= B.ShapeContainer MoveElementBackward output:", result);
    return result;
  }

  MoveElementToFront(element, useSuper) {
    console.log("= B.ShapeContainer MoveElementToFront input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.MoveElementToFront(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.MoveElementToFront(element) : void 0;
    }
    console.log("= B.ShapeContainer MoveElementToFront output:", result);
    return result;
  }

  MoveElementToBack(element, useSuper) {
    console.log("= B.ShapeContainer MoveElementToBack input:", { element, useSuper });
    let result;
    if (useSuper) {
      result = super.MoveElementToBack(element);
    } else {
      result = this.shapeGroup ? this.shapeGroup.MoveElementToBack(element) : void 0;
    }
    console.log("= B.ShapeContainer MoveElementToBack output:", result);
    return result;
  }

}

export default ShapeContainer
