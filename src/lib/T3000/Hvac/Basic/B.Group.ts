

import T3Svg from "../Helper/T3Svg"
import $ from "jquery";
import Container from "./B.Container";
import Utils1 from "../Helper/Utils1"
import Utils2 from "../Helper/Utils2"
import Utils3 from "../Helper/Utils3"
import ConstantData from "../Data/ConstantData"

class Group extends Container {

  public clipElem: any;

  constructor() {
    super()
  }

  CreateElement(inputData: any, config: any) {
    console.log("= B.Group CreateElement called with:", inputData, config);

    this.svgObj = new T3Svg.Container(T3Svg.create("g"));
    this.clipElem = null;

    this.InitElement(inputData, config);

    console.log("= B.Group CreateElement returning:", this.svgObj);
    return this.svgObj;
  }

  GetGeometryBBox() {
    console.log("= B.Group GetGeometryBBox called");

    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      let computedBBox: any;
      let convertedPoint: any;
      let unusedVar: any;
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

      // Add the svgObj to the formatting layer temporarily.
      formattingLayer.svgObj.add(this.svgObj);

      // Reset transformation.
      this.svgObj.transform({
        x: 0,
        y: 0,
        rotation: 0
      });

      // Compute bounding box.
      computedBBox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);

      // Convert the top-left coordinates.
      convertedPoint = this.doc.ConvertWindowToDocCoords(computedBBox.x, computedBBox.y);
      this.geometryBBox.x = convertedPoint.x;
      this.geometryBBox.y = convertedPoint.y;
      this.geometryBBox.width = computedBBox.width;
      this.geometryBBox.height = computedBBox.height;

      // Restore the original transformation.
      this.svgObj.transform({
        x: originalTransform.x,
        y: originalTransform.y,
        rotation: originalRotation
      });

      // Restore the removed nodes.
      for (let index = 0; index < removedNodes.length; index++) {
        let removed = removedNodes[index];
        removed.parent.insertBefore(removed.node, removed.sibling);
      }

      // Restore svgObj to its parent if needed.
      if (parentContainer) {
        parentContainer.add(this.svgObj, originalPosition);
      }

      this.UpdateTransform();
    }

    console.log("= B.Group GetGeometryBBox returning:", this.geometryBBox);
    return this.geometryBBox;
  }

  // Recursively remove unwanted nodes and store for restoration.
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

  SetClipRect(x: number, y: number, width: number, height: number): void {
    console.log("= B.Group SetClipRect called with:", { x, y, width, height });

    // Clear any previous clipping path.
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

      console.log("= B.Group SetClipRect output:", { clipContainer, clipId });
    } else {
      console.log("= B.Group SetClipRect: width or height not provided. No clip path created.");
    }
  }

  ClearClipRect() {
    console.log("= B.Group ClearClipRect called");

    if (this.clipElem) {
      console.log("= B.Group ClearClipRect input: clipElem exists");
      this.svgObj.remove(this.clipElem);
      this.svgObj.node.removeAttribute("clip-path");
      this.clipElem = null;
      console.log("= B.Group ClearClipRect output: clipElem cleared");
    } else {
      console.log("= B.Group ClearClipRect input: no clipElem to clear");
    }
  }

  GetTargetForEvent(event: any): any {
    console.log("= B.Group GetTargetForEvent called with input:", { event });

    // If the event or container is not valid, return the container itself.
    if (!(event && this instanceof Container)) {
      console.log("= B.Group GetTargetForEvent early exit: invalid event or container, returning current instance");
      return this;
    }

    let target: any = event.target || event.srcElement;
    const rootElement: any = this.DOMElement();

    if (!target || target === rootElement) {
      console.log("= B.Group GetTargetForEvent: target is root element or undefined, returning current instance");
      return this;
    }

    let element: any = this.FindElementByDOMElement(target);

    // Traverse up the DOM tree to find a matching element.
    while (target && !element) {
      target = target.parentNode;
      element = (target === rootElement) ? this : this.FindElementByDOMElement(target);
    }

    const result = element || this;
    console.log("= B.Group GetTargetForEvent returning:", { result });
    return result;
  }

  RefreshPaint(event: any): void {
    console.log("= B.Group RefreshPaint called with input:", { event });

    // Update fill pattern or gradient if available
    if (
      this.fillPatternData
        ? this.UpdatePattern(this.fillPatternData.ID, true)
        : this.fillGradientData && this.UpdateGradient(this.fillGradientData.ID, true),
      this.strokePatternData
        ? this.UpdatePattern(this.strokePatternData.ID, false)
        : this.strokeGradientData && this.UpdateGradient(this.strokeGradientData.ID, false),
      event && this instanceof Group
    ) {
      const elementCount = this.ElementCount();
      console.log("= B.Group RefreshPaint processing elements:", { elementCount });

      for (let index = 0; index < elementCount; index++) {
        const element = this.GetElementByIndex(index);
        if (element) {
          console.log("= B.Group RefreshPaint processing element at index:", { index });
          element.RefreshPaint(event);
        }
      }
    }

    console.log("= B.Group RefreshPaint completed for input:", { event });
  }
}

export default Group
