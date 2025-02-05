

import HvacSVG from "../Helper/SVG.t2"
import Container from "./Basic.Container"
// import Global from "./Basic.Global"
import Utils1 from "../Helper/Utils1"

class Group extends Container {

  public clipElem: any;

  constructor() {
    super()
  }

  CreateElement(attributes, options) {
    this.svgObj = new HvacSVG.Container(HvacSVG.create('g'));
    this.clipElem = null;
    this.InitElement(attributes, options);
    return this.svgObj;
  }

  GetGeometryBBox() {
    if (this.geometryBBox.width < 0 || this.geometryBBox.height < 0) {
      let boundingBox,
        docCoords,
        loopIndex,
        formattingLayer = this.doc.GetFormattingLayer(),
        removedNodes: Array<{ node: any; parent: any; sibling: any }> = [],
        originalTranslation = {
          x: this.svgObj.trans.x,
          y: this.svgObj.trans.y
        },
        originalRotation = this.svgObj.trans.rotation,
        parentContainer = this.svgObj.parent,
        positionIndex = 0;

      if (parentContainer) {
        positionIndex = this.svgObj.position();
        parentContainer.remove(this.svgObj);
      }

      const collectAndRemoveNodes = (node: any, removedNodesArray: Array<{ node: any; parent: any; sibling: any }>) => {
        let childIndex,
          parentNode = node.parentNode;
        if (
          node.hasAttribute &&
          node.removeAttribute &&
          node.nodeType === 'ELEMENT_NODE'
        ) {
          if (node.hasAttribute('no-export') || node.hasAttribute('sfx')) {
            removedNodesArray.push({
              node: node,
              parent: parentNode,
              sibling: node.nextSibling
            });
            parentNode.removeChild(node);
            return;
          }
          if (node.nodeName === 'pattern') {
            removedNodesArray.push({
              node: node,
              parent: parentNode,
              sibling: node.nextSibling
            });
            parentNode.removeChild(node);
            return;
          }
          for (childIndex = node.childNodes.length - 1; childIndex >= 0; childIndex--) {
            collectAndRemoveNodes(node.childNodes[childIndex], removedNodesArray);
          }
        }
      };

      collectAndRemoveNodes(this.svgObj.node, removedNodes);
      formattingLayer.svgObj.add(this.svgObj);
      this.svgObj.transform({
        x: 0,
        y: 0,
        rotation: 0
      });
      boundingBox = this.svgObj.rbox();
      formattingLayer.svgObj.remove(this.svgObj);
      docCoords = this.doc.ConvertWindowToDocCoords(boundingBox.x, boundingBox.y);
      this.geometryBBox.x = docCoords.x;
      this.geometryBBox.y = docCoords.y;
      this.geometryBBox.width = boundingBox.width;
      this.geometryBBox.height = boundingBox.height;
      this.svgObj.transform({
        x: originalTranslation.x,
        y: originalTranslation.y,
        rotation: originalRotation
      });
      for (loopIndex = 0; loopIndex < removedNodes.length; loopIndex++) {
        removedNodes[loopIndex].parent.insertBefore(removedNodes[loopIndex].node, removedNodes[loopIndex].sibling);
      }
      if (parentContainer) {
        parentContainer.add(this.svgObj, positionIndex);
      }
      this.UpdateTransform();
    }
    return this.geometryBBox;
  }

  SetClipRect(x: number, y: number, width: number, height: number) {
    this.ClearClipRect();

    if (width && height) {
      const clipPathId = Utils1.MakeGuid();
      const clipPathContainer = new HvacSVG.Container(HvacSVG.create('clipPath'));
      clipPathContainer.attr('id', clipPathId);

      const rect = new HvacSVG.Rect();
      rect.transform({
        x: Global.RoundCoord(x),
        y: Global.RoundCoord(y)
      });
      rect.size(
        Global.RoundCoord(width),
        Global.RoundCoord(height)
      );

      clipPathContainer.add(rect);
      this.svgObj.add(clipPathContainer);
      this.svgObj.attr('clip-path', `url(#${clipPathId})`);
      this.clipElem = clipPathContainer;
    }
  }

  ClearClipRect(): void {
    if (this.clipElem) {
      this.svgObj.remove(this.clipElem);
      this.svgObj.node.removeAttribute('clip-path');
      this.clipElem = null;
    }
  }

  GetTargetForEvent(event: any) {
    console.log('Element.GetTargetForEvent', event);

    if (!(event && this instanceof Container)) return this;

    const rootDomElement = this.DOMElement();
    let currentTarget = event.target || event.srcElement;

    if (!currentTarget || currentTarget === rootDomElement) return this;

    let targetElement = this.FindElementByDOMElement(currentTarget);

    while (currentTarget && !targetElement) {
      currentTarget = currentTarget.parentNode;
      targetElement =
        currentTarget === rootDomElement
          ? this
          : this.FindElementByDOMElement(currentTarget);
    }

    return targetElement || this;
  }

  RefreshPaint(event: any) {
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
        const childElement = this.GetElementByIndex(index);
        if (childElement) {
          childElement.RefreshPaint(event);
        }
      }
    }
  }
}

export default Group
