

import T3Svg from "../Util/T3Svg"
import Container from "./B.Container"
import Utils1 from "../Util/Utils1"

/**
 * Represents an SVG group container that encapsulates and manages a collection of SVG elements.
 *
 * This class extends the Container functionality to support operations such as creating the SVG group,
 * calculating the bounding box geometry, applying clipping rectangles, handling event targeting, and
 * refreshing paint properties (such as fill and stroke patterns or gradients) on child elements.
 *
 * @remarks
 * The Group class is designed to work with the T3Svg library and integrates with document coordinate conversion,
 * formatting layers, and transformation restoration. It also supports the removal and restoration of DOM nodes
 * for proper geometry calculation.
 *
 * @example
 * Here's an example demonstrating how to create an SVG group, set a clipping rectangle, calculate its bounding box,
 * and trigger a repaint:
 *
 * ```typescript
 * // Creating a new Group instance
 * const group = new Group();
 *
 * // Create the SVG group element with input data and configuration
 * const svgGroupElement = group.CreateElement(inputData, config);
 *
 * // Set a clipping rectangle on the group to constrain its render area
 * group.SetClipRect(10, 10, 200, 100);
 *
 * // Retrieve the bounding box geometry of the group
 * const bbox = group.GetGeometryBBox();
 * console.log('Bounding Box:', bbox);
 *
 * // Trigger an update of paint properties (fill, stroke) for the group and its children
 * group.RefreshPaint(event);
 * ```
 *
 * @public
 */
class Group extends Container {

  public clipElem: any;

  constructor() {
    super()
  }

  /**
   * Creates an SVG group element based on provided data and configuration
   * @param inputData - The data used to create the element
   * @param config - Configuration options for the element
   * @returns The created SVG container object
   */
  CreateElement(inputData: any, config: any) {
    this.svgObj = new T3Svg.Container(T3Svg.create("g"));
    this.clipElem = null;

    this.InitElement(inputData, config);

    return this.svgObj;
  }

  /**
   * Calculates the bounding box geometry for the group
   * @returns The geometry bounding box of the group
   */
  GetGeometryBBox() {
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      let computedBBox: any;
      let convertedPoint: any;
      let formattingLayer = this.doc.GetFormattingLayer();
      let removedNodes: Array<any> = [];
      let originalTransform = {
        x: this.svgObj.trans.x,
        y: this.svgObj.trans.y
      };
      let originalRotation = this.svgObj.trans.rotation;
      let parentContainer = this.svgObj.parent;
      let originalPosition = 0;

      if (parentContainer) {
        originalPosition = this.svgObj.position();
        parentContainer.remove(this.svgObj);
      }

      this.RemoveNodesRecursively(this.svgObj.node, removedNodes);

      // Add the svgObj to the formatting layer temporarily
      formattingLayer.svgObj.add(this.svgObj);

      // Reset transformation
      this.svgObj.transform({
        x: 0,
        y: 0,
        rotation: 0
      });

      // Compute bounding box
      computedBBox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);

      // Convert the top-left coordinates
      convertedPoint = this.doc.ConvertWindowToDocCoords(computedBBox.x, computedBBox.y);
      this.geometryBBox.x = convertedPoint.x;
      this.geometryBBox.y = convertedPoint.y;
      this.geometryBBox.width = computedBBox.width;
      this.geometryBBox.height = computedBBox.height;

      // Restore the original transformation
      this.svgObj.transform({
        x: originalTransform.x,
        y: originalTransform.y,
        rotation: originalRotation
      });

      // Restore the removed nodes
      for (let index = 0; index < removedNodes.length; index++) {
        let removed = removedNodes[index];
        removed.parent.insertBefore(removed.node, removed.sibling);
      }

      // Restore svgObj to its parent if needed
      if (parentContainer) {
        parentContainer.add(this.svgObj, originalPosition);
      }

      this.UpdateTransform();
    }

    return this.geometryBBox;
  }

  /**
   * Recursively removes unwanted nodes and stores them for later restoration
   * @param node - The DOM node to process
   * @param removedList - Array to store removed nodes
   */
  RemoveNodesRecursively(node: any, removedList: Array<any>) {
    const parentNode = node.parentNode;
    if (
      node.hasAttribute &&
      node.removeAttribute &&
      node.nodeType === 'ELEMENT_NODE'
    ) {
      if (node.hasAttribute('no-export') || node.hasAttribute('sfx')) {
        removedList.push({
          node: node,
          parent: parentNode,
          sibling: node.nextSibling
        });
        parentNode.removeChild(node);
        return;
      }
      if (node.nodeName === 'pattern') {
        removedList.push({
          node: node,
          parent: parentNode,
          sibling: node.nextSibling
        });
        parentNode.removeChild(node);
        return;
      }
      for (let idx = node.childNodes.length - 1; idx >= 0; idx--) {
        this.RemoveNodesRecursively(node.childNodes[idx], removedList);
      }
    }
  }

  /**
   * Sets a clipping rectangle for the group
   * @param x - X coordinate of the clipping rectangle
   * @param y - Y coordinate of the clipping rectangle
   * @param width - Width of the clipping rectangle
   * @param height - Height of the clipping rectangle
   */
  SetClipRect(x: number, y: number, width: number, height: number): void {
    // Clear any previous clipping path
    this.ClearClipRect();

    if (width && height) {
      const clipId = Utils1.MakeGuid();
      const clipContainer = new T3Svg.Container(T3Svg.create("clipPath"));
      clipContainer.attr("id", clipId);

      const rect = new T3Svg.Rect();
      rect.transform({
        x: Utils1.RoundCoord(x),
        y: Utils1.RoundCoord(y)
      });
      rect.size(
        Utils1.RoundCoord(width),
        Utils1.RoundCoord(height)
      );

      clipContainer.add(rect);
      this.svgObj.add(clipContainer);
      this.svgObj.attr("clip-path", "url(#" + clipId + ")");
      this.clipElem = clipContainer;
    }
  }

  /**
   * Clears any existing clipping rectangle from the group
   */
  ClearClipRect() {
    if (this.clipElem) {
      this.svgObj.remove(this.clipElem);
      this.svgObj.node.removeAttribute("clip-path");
      this.clipElem = null;
    }
  }

  /**
   * Finds the target element for a given event
   * @param event - The event to process
   * @returns The target element for the event
   */
  GetTargetForEvent(event: any): any {
    // If the event or container is not valid, return the container itself
    if (!(event && this instanceof Container)) {
      return this;
    }

    let target: any = event.target || event.srcElement;
    const rootElement: any = this.DOMElement();

    if (!target || target === rootElement) {
      return this;
    }

    let element: any = this.FindElementByDOMElement(target);

    // Traverse up the DOM tree to find a matching element
    while (target && !element) {
      target = target.parentNode;
      element = (target === rootElement) ? this : this.FindElementByDOMElement(target);
    }

    return element || this;
  }

  /**
   * Updates the fill and stroke patterns or gradients for this group and its child elements
   * @param event - The event that triggered the refresh
   */
  RefreshPaint(event: any): void {
    // Update fill pattern or gradient if available
    if (this.fillPatternData) {
      this.UpdatePattern(this.fillPatternData.ID, true);
    } else if (this.fillGradientData) {
      this.UpdateGradient(this.fillGradientData.ID, true);
    }

    if (this.strokePatternData) {
      this.UpdatePattern(this.strokePatternData.ID, false);
    } else if (this.strokeGradientData) {
      this.UpdateGradient(this.strokeGradientData.ID, false);
    }

    if (event && this instanceof Group) {
      const elementCount = this.ElementCount();

      for (let index = 0; index < elementCount; index++) {
        const element = this.GetElementByIndex(index);
        if (element) {
          element.RefreshPaint(event);
        }
      }
    }
  }
}

export default Group
