/**
 * SVG Node Manager - Safe SVG DOM operations
 * Provides safe wrappers for SVG node operations to prevent "node is undefined" errors
 */

import { ErrorHandler, safeNodeAccess } from './ErrorHandler';

export class SvgNodeManager {
  /**
   * Safely access SVG node properties
   * @param {object} svgElement - The SVG element wrapper
   * @param {string} property - The property to access
   * @param {any} fallback - Fallback value if access fails
   * @returns {any} The property value or fallback
   */
  static safeNodeProperty(svgElement, property, fallback = null) {
    return safeNodeAccess(
      () => svgElement.node[property],
      {
        component: 'SvgNodeManager',
        function: 'safeNodeProperty',
        nodeRelated: true
      },
      fallback
    );
  }

  /**
   * Safely call SVG node methods
   * @param {object} svgElement - The SVG element wrapper
   * @param {string} method - The method to call
   * @param {array} args - Arguments to pass to the method
   * @param {any} fallback - Fallback value if call fails
   * @returns {any} The method result or fallback
   */
  static safeNodeMethod(svgElement, method, args = [], fallback = null) {
    return safeNodeAccess(
      () => {
        const node = svgElement.node;
        if (!node || typeof node[method] !== 'function') {
          throw new Error(`Method ${method} is not available on node`);
        }
        return node[method](...args);
      },
      {
        component: 'SvgNodeManager',
        function: 'safeNodeMethod',
        nodeRelated: true,
        parameters: [method, args]
      },
      fallback
    );
  }

  /**
   * Safely get element bounding box
   * @param {object} svgElement - The SVG element wrapper
   * @returns {object} Bounding box or default values
   */
  static safeBBox(svgElement) {
    const bbox = this.safeNodeMethod(svgElement, 'getBBox', [], null);

    if (!bbox) {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0
      };
    }

    return bbox;
  }

  /**
   * Safely get element client rectangle
   * @param {object} svgElement - The SVG element wrapper
   * @returns {object} Client rectangle or default values
   */
  static safeClientRect(svgElement) {
    const rect = this.safeNodeMethod(svgElement, 'getBoundingClientRect', [], null);

    if (!rect) {
      return {
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        width: 0,
        height: 0
      };
    }

    return rect;
  }

  /**
   * Safely set element attribute
   * @param {object} svgElement - The SVG element wrapper
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   * @param {string} namespace - Optional namespace
   * @returns {boolean} Success status
   */
  static safeSetAttribute(svgElement, name, value, namespace = null) {
    return safeNodeAccess(
      () => {
        const node = svgElement.node;
        if (!node) {
          throw new Error('Node is not available');
        }

        if (namespace) {
          node.setAttributeNS(namespace, name, value);
        } else {
          node.setAttribute(name, value);
        }
        return true;
      },
      {
        component: 'SvgNodeManager',
        function: 'safeSetAttribute',
        nodeRelated: true,
        parameters: [name, value, namespace]
      },
      false
    );
  }

  /**
   * Safely get element attribute
   * @param {object} svgElement - The SVG element wrapper
   * @param {string} name - Attribute name
   * @param {string} namespace - Optional namespace
   * @returns {string|null} Attribute value or null
   */
  static safeGetAttribute(svgElement, name, namespace = null) {
    return safeNodeAccess(
      () => {
        const node = svgElement.node;
        if (!node) {
          throw new Error('Node is not available');
        }

        return namespace ? node.getAttributeNS(namespace, name) : node.getAttribute(name);
      },
      {
        component: 'SvgNodeManager',
        function: 'safeGetAttribute',
        nodeRelated: true,
        parameters: [name, namespace]
      },
      null
    );
  }

  /**
   * Safely manipulate element style
   * @param {object} svgElement - The SVG element wrapper
   * @param {string} property - Style property name
   * @param {string} value - Style value (undefined to get)
   * @returns {string|boolean} Style value or success status
   */
  static safeStyle(svgElement, property, value) {
    if (value === undefined) {
      // Get style
      return safeNodeAccess(
        () => svgElement.node.style[property],
        {
          component: 'SvgNodeManager',
          function: 'safeStyle',
          nodeRelated: true,
          parameters: [property]
        },
        ''
      );
    } else {
      // Set style
      return safeNodeAccess(
        () => {
          const node = svgElement.node;
          if (!node || !node.style) {
            throw new Error('Node style is not available');
          }
          node.style[property] = value;
          return true;
        },
        {
          component: 'SvgNodeManager',
          function: 'safeStyle',
          nodeRelated: true,
          parameters: [property, value]
        },
        false
      );
    }
  }

  /**
   * Safely append child element
   * @param {object} parentElement - The parent SVG element wrapper
   * @param {object} childElement - The child SVG element wrapper
   * @returns {boolean} Success status
   */
  static safeAppendChild(parentElement, childElement) {
    return safeNodeAccess(
      () => {
        const parentNode = parentElement.node;
        const childNode = childElement.node;

        if (!parentNode || !childNode) {
          throw new Error('Parent or child node is not available');
        }

        parentNode.appendChild(childNode);
        return true;
      },
      {
        component: 'SvgNodeManager',
        function: 'safeAppendChild',
        nodeRelated: true
      },
      false
    );
  }

  /**
   * Safely remove child element
   * @param {object} parentElement - The parent SVG element wrapper
   * @param {object} childElement - The child SVG element wrapper
   * @returns {boolean} Success status
   */
  static safeRemoveChild(parentElement, childElement) {
    return safeNodeAccess(
      () => {
        const parentNode = parentElement.node;
        const childNode = childElement.node;

        if (!parentNode || !childNode) {
          throw new Error('Parent or child node is not available');
        }

        parentNode.removeChild(childNode);
        return true;
      },
      {
        component: 'SvgNodeManager',
        function: 'safeRemoveChild',
        nodeRelated: true
      },
      false
    );
  }

  /**
   * Safely insert child element before another element
   * @param {object} parentElement - The parent SVG element wrapper
   * @param {object} childElement - The child SVG element wrapper
   * @param {object} referenceElement - The reference SVG element wrapper
   * @returns {boolean} Success status
   */
  static safeInsertBefore(parentElement, childElement, referenceElement) {
    return safeNodeAccess(
      () => {
        const parentNode = parentElement.node;
        const childNode = childElement.node;
        const refNode = referenceElement ? referenceElement.node : null;

        if (!parentNode || !childNode) {
          throw new Error('Parent or child node is not available');
        }

        parentNode.insertBefore(childNode, refNode);
        return true;
      },
      {
        component: 'SvgNodeManager',
        function: 'safeInsertBefore',
        nodeRelated: true
      },
      false
    );
  }

  /**
   * Validate SVG element has valid node
   * @param {object} svgElement - The SVG element wrapper
   * @returns {boolean} True if node is valid
   */
  static isValidNode(svgElement) {
    return !!(svgElement && svgElement.node && svgElement.node.nodeType);
  }

  /**
   * Get safe node information for debugging
   * @param {object} svgElement - The SVG element wrapper
   * @returns {object} Node information
   */
  static getNodeInfo(svgElement) {
    if (!svgElement) {
      return { exists: false, error: 'SVG element is null/undefined' };
    }

    const node = svgElement.node;
    if (!node) {
      return { exists: false, error: 'Node property is null/undefined' };
    }

    try {
      return {
        exists: true,
        nodeType: node.nodeType,
        nodeName: node.nodeName,
        tagName: node.tagName,
        id: node.id,
        className: node.className,
        isConnected: node.isConnected,
        hasParent: !!node.parentNode,
        hasChildren: node.hasChildNodes(),
        childCount: node.childNodes.length
      };
    } catch (error) {
      return {
        exists: false,
        error: error.message,
        nodePresent: !!node
      };
    }
  }
}

export default SvgNodeManager;
