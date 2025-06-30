/**
 * Test for Node Error Handling
 * Tests the enhanced error handling for "node is undefined" errors
 */

import { ErrorHandler } from '../../../T3000/Hvac/Util/ErrorHandler';
import { SvgNodeManager } from '../../../T3000/Hvac/Util/SvgNodeManager';
import { NodeDebugger } from '../../../debug/NodeDebugger';

describe('Node Error Handling', () => {
  let errorHandler;

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearHistory();
  });

  describe('ErrorHandler', () => {
    it('should handle undefined node errors gracefully', () => {
      const mockElement = {
        node: undefined
      };

      const result = ErrorHandler.safeNodeAccess(
        () => mockElement.node.getAttribute('id'),
        { component: 'Test', function: 'testUndefinedNode' }
      );

      expect(result).toBeNull();
      expect(errorHandler.getErrorHistory()).toHaveLength(1);
      expect(errorHandler.getErrorHistory()[0].context.nodeRelated).toBe(undefined);
    });

    it('should handle null node errors gracefully', () => {
      const mockElement = {
        node: null
      };

      const result = ErrorHandler.safeNodeAccess(
        () => mockElement.node.getAttribute('id'),
        { component: 'Test', function: 'testNullNode' }
      );

      expect(result).toBeNull();
      expect(errorHandler.getErrorHistory()).toHaveLength(1);
    });

    it('should handle promise rejections with node errors', () => {
      const mockPromise = Promise.reject(new Error('node is undefined'));

      // This would be caught by the global unhandledrejection handler
      window.dispatchEvent(new PromiseRejectionEvent('unhandledrejection', {
        promise: mockPromise,
        reason: new Error('node is undefined')
      }));

      // Wait for event to be processed
      return new Promise(resolve => {
        setTimeout(() => {
          const history = errorHandler.getErrorHistory();
          expect(history.length).toBeGreaterThan(0);
          const nodeError = history.find(err => err.context.nodeRelated === true);
          expect(nodeError).toBeTruthy();
          resolve();
        }, 10);
      });
    });
  });

  describe('SvgNodeManager', () => {
    it('should safely access node properties', () => {
      const mockElement = {
        node: undefined
      };

      const result = SvgNodeManager.safeNodeProperty(mockElement, 'nodeName', 'fallback');
      expect(result).toBe('fallback');
    });

    it('should safely call node methods', () => {
      const mockElement = {
        node: undefined
      };

      const result = SvgNodeManager.safeNodeMethod(mockElement, 'getBBox', [], { x: 0, y: 0 });
      expect(result).toEqual({ x: 0, y: 0 });
    });

    it('should return safe bounding box for invalid nodes', () => {
      const mockElement = {
        node: undefined
      };

      const bbox = SvgNodeManager.safeBBox(mockElement);
      expect(bbox).toEqual({
        x: 0,
        y: 0,
        width: 0,
        height: 0
      });
    });

    it('should validate nodes correctly', () => {
      const validElement = {
        node: {
          nodeType: 1,
          nodeName: 'rect'
        }
      };

      const invalidElement = {
        node: undefined
      };

      expect(SvgNodeManager.isValidNode(validElement)).toBe(true);
      expect(SvgNodeManager.isValidNode(invalidElement)).toBe(false);
    });

    it('should provide detailed node information', () => {
      const invalidElement = {
        node: undefined
      };

      const info = SvgNodeManager.getNodeInfo(invalidElement);
      expect(info.exists).toBe(false);
      expect(info.error).toBe('Node property is null/undefined');
    });
  });

  describe('NodeDebugger', () => {
    it('should safely query elements', () => {
      // Mock document.querySelector to return null
      const originalQuerySelector = document.querySelector;
      document.querySelector = jest.fn().mockReturnValue(null);

      const result = NodeDebugger.safeQuery('#non-existent');
      expect(result).toBeNull();

      // Restore original method
      document.querySelector = originalQuerySelector;
    });

    it('should safely access element properties', () => {
      const result = NodeDebugger.safeAccess(null, 'nodeName', 'fallback');
      expect(result).toBe('fallback');
    });
  });

  describe('Integration Tests', () => {
    it('should handle SVG manipulation errors in real scenarios', async () => {
      // Simulate a real SVG manipulation that might fail
      const svgElement = {
        node: undefined,
        attrs: {}
      };

      // This should not throw an error
      expect(() => {
        SvgNodeManager.safeSetAttribute(svgElement, 'fill', 'red');
        SvgNodeManager.safeStyle(svgElement, 'display', 'block');
        SvgNodeManager.safeBBox(svgElement);
      }).not.toThrow();

      // Check that errors were properly logged
      const errors = errorHandler.getErrorHistory();
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.every(err => err.context.nodeRelated === true)).toBe(true);
    });

    it('should handle T3Svg operations safely', () => {
      // Mock T3Svg element with undefined node
      const t3Element = {
        node: undefined,
        attrs: {},
        trans: { x: 0, y: 0 }
      };

      // These operations should be safe now
      expect(() => {
        // Simulate bbox call
        SvgNodeManager.safeBBox(t3Element);

        // Simulate attribute setting
        SvgNodeManager.safeSetAttribute(t3Element, 'x', '10');

        // Simulate style manipulation
        SvgNodeManager.safeStyle(t3Element, 'visibility', 'hidden');
      }).not.toThrow();
    });
  });
});
