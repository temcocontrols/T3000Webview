

import T3Svg from "../Util/T3Svg"
import Element from "./B.Element"

/**
 * A container class that manages a collection of elements within an SVG structure.
 * Container extends Element and provides methods for adding, removing, finding,
 * and manipulating the z-order of child elements.
 *
 * This class serves as a base for any component that needs to contain and manage
 * multiple SVG elements in a parent-child relationship.
 *
 * @extends Element
 *
 * @example
 * // Create a new container
 * const container = new Container();
 *
 * // Create and add elements to the container
 * const circle = new Circle();
 * const rect = new Rectangle();
 * container.AddElement(circle);
 * container.AddElement(rect, 0); // Add at specific index
 *
 * // Find elements
 * const foundElement = container.GetElementById("myElementId");
 * const elementAtIndex = container.GetElementByIndex(0);
 *
 * // Remove elements
 * container.RemoveElement(circle);
 * container.RemoveElementByInternalId("internalId123");
 *
 * // Manipulate z-order
 * container.MoveElementToFront(rect);
 * container.MoveElementBackward(anotherElement);
 *
 * // Get information
 * const count = container.ElementCount();
 * const index = container.GetElementIndex(rect);
 *
 * // Remove all elements
 * container.RemoveAll();
 */
class Container extends Element {

  /**
   * Container class constructor
   */
  constructor() {
    super();
  }

  /**
   * Adds an element to this container
   * @param element - The element to add
   * @param index - Optional index where to insert the element
   */
  AddElement(element, index?) {
    if (index !== undefined && this.svgObj instanceof T3Svg.Doc) {
      index++;
    }
    this.svgObj.add(element.svgObj, index);

    if (element.svgObj.parent === this.svgObj) {
      element.parent = this;
      element.RefreshPaint(true);
    }
  }

  /**
   * Removes an element from this container
   * @param element - The element to remove
   */
  RemoveElement(element) {
    if (!element) { return; }

    if (element.svgObj.parent === this.svgObj) {
      this.svgObj.remove(element.svgObj);
      element.parent = null;
    }
  }

  /**
   * Removes all elements from this container
   */
  RemoveAll() {
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;
    let childrenCount = this.svgObj.children().length;

    for (let i = startIndex; i < childrenCount; i++) {
      this.svgObj.removeAt(startIndex);
    }
  }

  /**
   * Removes an element by its internal ID
   * @param internalID - The internal ID of the element to remove
   */
  RemoveElementByInternalId(internalID) {
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.internalID === internalID) {
        this.svgObj.removeAt(i);
        break;
      }
    }
  }

  /**
   * Gets the number of elements in this container
   * @returns Number of elements
   */
  ElementCount() {
    let count = this.svgObj.children().length;
    if (this.svgObj instanceof T3Svg.Doc) {
      count--;
    }
    return count;
  }

  /**
   * Gets an element by its index in the container
   * @param index - The index of the element
   * @returns The element at the specified index or null if not found
   */
  GetElementByIndex(index: number) {
    const children = this.svgObj.children();

    if (this.svgObj instanceof T3Svg.Doc) {
      index++;
    }

    if (index < 0 || index >= children.length) {
      return null;
    }

    return children[index].SDGObj;
  }

  /**
   * Gets an element by its ID
   * @param id - The ID of the element to find
   * @param userData - Optional user data to match
   * @returns The element with the specified ID or null if not found
   */
  GetElementById(id: string, userData?: any) {
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.ID === id) {
        if (userData && child.userData !== userData) continue;
        return child;
      }
    }
    return null;
  }

  /**
   * Gets an element by its ID recursively within groups
   * @param id - The ID of the element to find
   * @returns The element with the specified ID or null if not found
   */
  GetElementByIdInGroup(id: string) {
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
          return child;
        }
        const foundElement = findElementByID(child);
        if (foundElement) {
          return foundElement;
        }
      }
    }

    return null;
  }

  /**
   * Gets a list of all elements with the specified ID
   * @param id - The ID to search for
   * @returns Array of elements with the specified ID
   */
  GetElementListWithId(id: string) {
    const children = this.svgObj.children();
    const result = [];
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.ID === id) {
        result.push(child);
      }
    }

    return result;
  }

  /**
   * Gets an element by its internal ID
   * @param internalID - The internal ID to search for
   * @returns The element with the specified internal ID or null if not found
   */
  GetElementByInternalId(internalID: string) {
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child && child.internalID === internalID) {
        return child;
      }
    }

    return null;
  }

  /**
   * Finds an element by its ID recursively in the container hierarchy
   * @param id - The ID to search for
   * @returns The element with the specified ID or null if not found
   */
  FindElement(id: string) {
    const children = this.svgObj.children();

    for (let i = 0; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child) {
        if (child.ID === id) {
          return child;
        }
        if (child instanceof Container) {
          const foundElement = child.FindElement(id);
          if (foundElement) {
            return foundElement;
          }
        }
      }
    }

    return null;
  }

  /**
   * Finds an element by its DOM element
   * @param domElement - The DOM element to search for
   * @returns The element with the specified DOM element or null if not found
   */
  FindElementByDOMElement(domElement: HTMLElement) {
    const children = this.svgObj.children();
    let startIndex = this.svgObj instanceof T3Svg.Doc ? 1 : 0;

    for (let i = startIndex; i < children.length; i++) {
      const child = children[i].SDGObj;
      if (child) {
        if (child.DOMElement() === domElement) {
          return child;
        }
        if (child instanceof Container) {
          const foundElement = child.FindElementByDOMElement(domElement);
          if (foundElement) {
            return foundElement;
          }
        }
      }
    }

    return null;
  }

  /**
   * Gets the index of an element in this container
   * @param element - The element to find
   * @returns The index of the element or -1 if not found
   */
  GetElementIndex(element) {
    let index = this.svgObj.children().indexOf(element.svgObj);
    if (index > 0 && this.svgObj instanceof T3Svg.Doc) {
      index--;
    }
    return index;
  }

  /**
   * Moves an element one level forward in the z-order
   * @param element - The element to move forward
   */
  MoveElementForward(element) {
    if (this.GetElementIndex(element) < this.ElementCount() - 1) {
      element.svgObj.forward();
    }
  }

  /**
   * Moves an element one level backward in the z-order
   * @param element - The element to move backward
   */
  MoveElementBackward(element) {
    if (this.GetElementIndex(element) > 0) {
      element.svgObj.backward();
    }
  }

  /**
   * Moves an element to the front (top) of the z-order
   * @param element - The element to move to front
   */
  MoveElementToFront(element) {
    element.svgObj.front();
  }

  /**
   * Moves an element to the back (bottom) of the z-order
   * @param element - The element to move to back
   */
  MoveElementToBack(element) {
    element.svgObj.back();
    element.svgObj.level();
  }
}

export default Container
