

import T3Svg from "../Util/T3Svg"
import Group from "./B.Group"

class ShapeContainer extends Group {

  public shapeGroup: any;

  constructor() {
    super()
  }

  /**
   * Creates a new SVG element container
   * @param element - The element to create
   * @param type - The element type
   * @returns The created SVG object
   */
  CreateElement(element: any, type: any) {
    this.svgObj = new T3Svg.Container(T3Svg.create('g'));
    this.InitElement(element, type);
    this.shapeGroup = new Group();
    this.shapeGroup.CreateElement(element, type);
    super.AddElement(this.shapeGroup);
    return this.svgObj;
  }

  /**
   * Adds an element to the container
   * @param element - The element to add
   * @param type - The element type
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the add operation
   */
  AddElement(element: any, type: any, useSuper: boolean) {
    if (useSuper) {
      return super.AddElement(element, type);
    } else {
      return this.shapeGroup ? this.shapeGroup.AddElement(element, type) : undefined;
    }
  }

  /**
   * Removes an element from the container
   * @param element - The element to remove
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the remove operation
   */
  RemoveElement(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.RemoveElement(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.RemoveElement(element) : undefined;
    }
  }

  /**
   * Removes all elements from the container
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the remove all operation
   */
  RemoveAll(useSuper: boolean) {
    if (useSuper) {
      return super.RemoveAll();
    } else {
      return this.shapeGroup ? this.shapeGroup.RemoveAll() : undefined;
    }
  }

  /**
   * Removes element by its internal ID
   * @param internalID - The internal ID of the element to remove
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the remove operation
   */
  RemoveElementByInternalId(internalID: string, useSuper: boolean) {
    if (useSuper) {
      return super.RemoveElementByInternalId(internalID);
    } else {
      return this.shapeGroup ? this.shapeGroup.RemoveElementByInternalId(internalID) : undefined;
    }
  }

  /**
   * Returns the count of elements in the container
   * @param useSuper - Whether to use parent class implementation
   * @returns The number of elements
   */
  ElementCount(useSuper: boolean) {
    if (useSuper) {
      return super.ElementCount();
    } else {
      return this.shapeGroup ? this.shapeGroup.ElementCount() : 0;
    }
  }

  /**
   * Gets an element at the specified index
   * @param index - The index of the element to retrieve
   * @param useSuper - Whether to use parent class implementation
   * @returns The element at the specified index or null if not found
   */
  GetElementByIndex(index: number, useSuper: boolean) {
    if (useSuper) {
      return super.GetElementByIndex(index);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementByIndex(index) : null;
    }
  }

  /**
   * Finds an element by its ID
   * @param elementID - The ID of the element to find
   * @param useSuper - Whether to use parent class implementation
   * @param additionalParam - Additional parameters for the search
   * @returns The found element or null if not found
   */
  GetElementById(elementID: string, useSuper: boolean, additionalParam: any) {
    if (useSuper) {
      return super.GetElementById(elementID, additionalParam);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementById(elementID, additionalParam) : null;
    }
  }

  /**
   * Finds an element by its ID within the group
   * @param elementID - The ID of the element to find
   * @param useSuper - Whether to use parent class implementation
   * @returns The found element or null if not found
   */
  GetElementByIdInGroup(elementID: string, useSuper: boolean) {
    if (useSuper) {
      return super.GetElementByIdInGroup(elementID);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementByIdInGroup(elementID) : null;
    }
  }

  /**
   * Gets a list of elements with the given ID
   * @param elementID - The ID to search for
   * @param useSuper - Whether to use parent class implementation
   * @returns Array of elements matching the ID
   */
  GetElementListWithId(elementID: string, useSuper: boolean) {
    if (useSuper) {
      return super.GetElementListWithId(elementID);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementListWithId(elementID) : [];
    }
  }

  /**
   * Finds an element by its internal ID
   * @param internalID - The internal ID to search for
   * @param useSuper - Whether to use parent class implementation
   * @returns The found element or null if not found
   */
  GetElementByInternalId(internalID: string, useSuper: boolean) {
    if (useSuper) {
      return super.GetElementByInternalId(internalID);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementByInternalId(internalID) : null;
    }
  }

  /**
   * Finds an element in the container
   * @param element - The element to find
   * @param useSuper - Whether to use parent class implementation
   * @returns The found element or null if not found
   */
  FindElement(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.FindElement(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.FindElement(element) : null;
    }
  }

  /**
   * Finds an element by its DOM element
   * @param domElement - The DOM element to search for
   * @param useSuper - Whether to use parent class implementation
   * @returns The found element or null if not found
   */
  FindElementByDOMElement(domElement: any, useSuper: boolean) {
    if (useSuper) {
      return super.FindElementByDOMElement(domElement);
    } else {
      return this.shapeGroup ? this.shapeGroup.FindElementByDOMElement(domElement) : null;
    }
  }

  /**
   * Gets the index of an element in the container
   * @param element - The element to find the index for
   * @param useSuper - Whether to use parent class implementation
   * @returns The index of the element or -1 if not found
   */
  GetElementIndex(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.GetElementIndex(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.GetElementIndex(element) : -1;
    }
  }

  /**
   * Moves an element one position forward in the z-order
   * @param element - The element to move forward
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the move operation
   */
  MoveElementForward(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.MoveElementForward(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.MoveElementForward(element) : undefined;
    }
  }

  /**
   * Moves an element one position backward in the z-order
   * @param element - The element to move backward
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the move operation
   */
  MoveElementBackward(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.MoveElementBackward(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.MoveElementBackward(element) : undefined;
    }
  }

  /**
   * Moves an element to the front of the z-order
   * @param element - The element to move to front
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the move operation
   */
  MoveElementToFront(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.MoveElementToFront(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.MoveElementToFront(element) : undefined;
    }
  }

  /**
   * Moves an element to the back of the z-order
   * @param element - The element to move to back
   * @param useSuper - Whether to use parent class implementation
   * @returns The result of the move operation
   */
  MoveElementToBack(element: any, useSuper: boolean) {
    if (useSuper) {
      return super.MoveElementToBack(element);
    } else {
      return this.shapeGroup ? this.shapeGroup.MoveElementToBack(element) : undefined;
    }
  }

}

export default ShapeContainer
