import BaseShape from './S.BaseShape'
import Utils2 from "../Util/Utils2";
import T3Gv from '../Data/T3Gv'
import $ from 'jquery';
import Point from '../Model/Point'
import Instance from '../Data/Instance/Instance';
import NvConstant from '../Data/Constant/NvConstant'
import PolygonConstant from '../Opt/Polygon/PolygonConstant';
import OptConstant from '../Data/Constant/OptConstant';
import T3Util from '../Util/T3Util';
import LogUtil from '../Util/LogUtil';

/**
 * Represents an SVG foreignObject shape that can contain HTML content and Vue components.
 *
 * The ForeignObject class extends BaseShape to provide specialized functionality for
 * embedding HTML content and Vue components directly within the SVG drawing. This enables
 * complex interactive UI elements to be used as part of the HVAC visualization system.
 *
 * Key features include:
 * - HTML content embedding within SVG
 * - Vue component mounting and lifecycle management
 * - Interactive region handling
 * - Proper scaling and positioning within the document
 *
 * @extends BaseShape
 */
class ForeignObject extends BaseShape {
  // Properties for Vue integration
  public vueInstance: any = null;
  public htmlContent: string | HTMLElement | null = null;

  public vueComponent: any = null;
  public vueProps: any = {};

  /**
   * Constructor for the ForeignObject shape class
   * @param options - Configuration options for the foreign object
   */
  constructor(options: any) {
    LogUtil.Debug("= S.ForeignObject Input:", options);
    LogUtil.Debug("= S.ForeignObject Input:", options);
    options = options || {};
    options.ShapeType = OptConstant.ShapeType.ForeignObject;

    // Call parent constructor
    super(options);

    // Set default data class as RECTANGLE (can be changed if needed)
    this.dataclass = options.dataclass || PolygonConstant.ShapeTypes.RECTANGLE;

    // Initialize Vue-specific properties
    this.vueComponent = options.vueComponent || null;
    this.vueProps = options.vueProps || {};
    this.htmlContent = options.htmlContent || null;

    LogUtil.Debug("= S.ForeignObject Created instance:", this);
  }

  /**
   * Creates an SVG shape representation of the foreign object
   * @param renderer - The rendering engine to create SVG elements
   * @param enableEvents - Whether to enable event handling on the shape
   * @returns The created SVG shape container
   */
  CreateShape(renderer, enableEvents) {
    // Don't render if the shape is marked as not visible
    if (this.flags & NvConstant.ObjFlags.NotVisible) return null;

    // Create the main shape container
    const shapeContainer = renderer.CreateShape(OptConstant.CSType.ShapeContainer);

    // Clone the frame and apply necessary adjustments
    const adjustedFrame = $.extend(true, {}, this.Frame);
    const styleRecord = this.StyleRecord;

    // Process style attributes through any hooks
    const processedStyle = this.SVGTokenizerHook(styleRecord);

    // Extract styling properties
    const strokeColor = processedStyle.Line.Paint.Color;
    const strokeWidth = processedStyle.Line.Thickness;
    const strokePattern = processedStyle.Line.LinePattern;
    const opacity = processedStyle.Line.Paint.Opacity;
    const width = adjustedFrame.width;
    const height = adjustedFrame.height;

    // Set container dimensions and position
    shapeContainer.SetSize(width, height);
    shapeContainer.SetPos(adjustedFrame.x, adjustedFrame.y);

    // Create the foreign object element
    const foreignObject = renderer.CreateShape(OptConstant.CSType.ForeignObject);
    foreignObject.SetID(OptConstant.SVGElementClass.Shape);
    foreignObject.SetSize(width, height);

    // Apply stroke styling if needed
    foreignObject.SetStrokeColor(strokeColor);
    foreignObject.SetStrokeOpacity(opacity);
    foreignObject.SetStrokeWidth(strokeWidth);

    if (strokePattern !== 0) {
      foreignObject.SetStrokePattern(strokePattern);
    }

    // Add the foreign object to the container
    shapeContainer.AddElement(foreignObject);

    // Apply HTML content or Vue component if available
    if (this.htmlContent) {
      foreignObject.SetHtmlContent(this.htmlContent);
    } else if (this.vueComponent) {
      // First check if we have a string identifier or an actual component
      if (typeof this.vueComponent === 'string') {
        // This is likely a component name/path that was stored in localStorage
        // We need to dynamically import the actual component
        const componentName = this.vueComponent;

        // Create a component registry that maps names to their import functions
        const componentRegistry = {
          'ObjectType2.vue': () => import('../../../../components/NewUI/ObjectType2.vue'),
          // Add more components to the registry as needed
        };

        if (componentRegistry[componentName]) {
          // Dynamically import the component
          componentRegistry[componentName]()
            .then(module => {
              const component = module.default || module;
              // Mount the freshly imported component with the stored props
              foreignObject.MountVueComponent(component, this.vueProps);
            })
            .catch(err => {
              T3Util.Error(`= s.ForeignObject CreateShape Failed to load component: ${componentName}`, err);
            });
        } else {
          T3Util.Error(`= s.ForeignObject CreateShape Component not found in registry: ${componentName}`);
        }
      } else if (this.vueComponent && typeof this.vueComponent === 'object') {
        // Direct component reference - check if it has required methods
        if (typeof this.vueComponent.render === 'function' ||
          typeof this.vueComponent.setup === 'function') {
          // It appears to be a valid component
          foreignObject.MountVueComponent(this.vueComponent, this.vueProps);
        } else {
          // It's an object but missing render/setup - try to resolve from name property
          const componentName = this.vueComponent.name || this.vueComponent.__name;
          console.warn(`Component missing render/setup functions, attempting to reload: ${componentName}`);

          // Try to reload the component by name
          if (componentName) {
            LogUtil.Debug(`Attempting to load component by name: ${componentName}`);
            LogUtil.Debug(`this.vueProps:  `,this.vueProps);

            // You may need to implement a mapping from component names to import paths
            let possiblePath = `../../../../components/${componentName}.vue`;

            if (componentName === 'AntdTest') {
              possiblePath = `../../../../components/NewUI/${componentName}.vue`;
            }

            import(/* @vite-ignore */ possiblePath)
              .then(module => {
                const component = module.default || module;
                foreignObject.MountVueComponent(component, this.vueProps);
              })
              .catch(err => {
                T3Util.Error(`= s.ForeignObject CreateShape Failed to load component by name: ${componentName}`, err);
              });
          }
        }
      } else {
        T3Util.Error("= s.ForeignObject CreateShape Invalid vue component provided:", this.vueComponent);
      }
    }

    // Apply additional styles and effects
    this.ApplyStyles(foreignObject, processedStyle);
    this.ApplyEffects(shapeContainer, false, false);

    // Create interactive slop area for better user interaction
    if (!(this instanceof Instance.Shape.ShapeContainer)) {
      const slopSize = OptConstant.Common.Slop;
      const slopShape = renderer.CreateShape(OptConstant.CSType.Rect);

      // Configure slop area (invisible interactive area)
      slopShape.SetStrokeColor('white');
      slopShape.SetFillColor('none');
      slopShape.SetOpacity(0);
      slopShape.SetStrokeWidth(strokeWidth + slopSize);

      // Set event behavior based on conditions
      if (enableEvents) {
        slopShape.SetEventBehavior(OptConstant.EventBehavior.HiddenAll);
      } else {
        slopShape.SetEventBehavior(OptConstant.EventBehavior.None);
      }

      slopShape.SetID(OptConstant.SVGElementClass.Slop);
      slopShape.ExcludeFromExport(true);
      slopShape.SetSize(width || 1, height);
      shapeContainer.AddElement(slopShape);
    }

    // Mark as shape
    shapeContainer.isShape = true;

    // Add text if there's data
    if (this.DataID >= 0) {
      this.LMAddSVGTextObject(renderer, shapeContainer);
    }

    return shapeContainer;
  }

  /**
   * Gets polygon points defining the shape boundary
   * Uses rectangular boundary like Rect shape
   */
  GetPolyPoints(event, type, arg, rect, index) {
    LogUtil.Debug("= S.ForeignObject GetPolyPoints Input:", { event, type, arg, rect, index });

    // Use the same polygon points as a rectangle
    const points = [];
    let frameCopy = {};

    Utils2.CopyRect(frameCopy, this.Frame);
    const halfThickness = this.StyleRecord.Line.Thickness / 2;

    if (rect) {
      Utils2.InflateRect(frameCopy, halfThickness, halfThickness);
    }

    points.push(new Point(0, 0));
    points.push(new Point(frameCopy.width, 0));
    points.push(new Point(frameCopy.width, frameCopy.height));
    points.push(new Point(0, frameCopy.height));
    points.push(new Point(0, 0));

    if (!type) {
      for (let i = 0, len = points.length; i < len; i++) {
        points[i].x += frameCopy.x;
        points[i].y += frameCopy.y;
      }
    }

    LogUtil.Debug("= S.ForeignObject GetPolyPoints Output:", points);
    return points;
  }

  /**
   * Sets HTML content for this foreign object
   * @param content - HTML content as string or element
   */
  SetHtmlContent(content: string | HTMLElement) {
    LogUtil.Debug("= S.ForeignObject SetHtmlContent Input:", content);
    this.htmlContent = content;
    this.vueComponent = null;
    this.vueProps = {};
    this.vueInstance = null;
    LogUtil.Debug("= S.ForeignObject SetHtmlContent Output: Updated content");
    return true;
  }

  /**
   * Sets a Vue component to be mounted inside this foreign object
   * @param vueComponent - Vue component constructor
   * @param props - Props to pass to the component
   */
  SetVueComponent(vueComponent: any, props: any = {}) {
    LogUtil.Debug("= S.ForeignObject SetVueComponent Input:", { component: vueComponent, props });
    this.vueComponent = vueComponent;
    this.vueProps = props || {};
    this.htmlContent = null;
    LogUtil.Debug("= S.ForeignObject SetVueComponent Output: Updated component");
    return true;
  }

  /**
   * Override GetTextDefault to handle Vue components appropriately
   * @param eventData - Event data that may affect the default formatting
   */
  GetTextDefault(eventData: any): any {
    // If we have a Vue component or HTML content, we may want to customize the text behavior
    if (this.vueComponent || this.htmlContent) {
      // Provide specialized text defaults for foreign objects
      // const defaultText = super.GetTextDefault(eventData);
      // defaultText.TextAlign = NvConstant.TextAlign.Left; // Default to left alignment for HTML content
      const defaultText = {};
      return defaultText;
    }

    // Otherwise use the default implementation
    return super.GetTextDefault(eventData);
  }

  /**
   * Override SetShapeProperties to handle foreign object specific properties
   */
  SetShapeProperties(properties: any) {
    LogUtil.Debug("= S.ForeignObject SetShapeProperties Input:", properties);

    let updated = false;

    // Handle HTML content updates
    if (properties.htmlContent !== undefined &&
      properties.htmlContent !== this.htmlContent) {
      this.SetHtmlContent(properties.htmlContent);
      updated = true;
    }

    // Handle Vue component updates
    if (properties.vueComponent !== undefined &&
      properties.vueComponent !== this.vueComponent) {
      this.SetVueComponent(properties.vueComponent, properties.vueProps);
      updated = true;
    }

    // Call parent implementation for standard shape properties
    if (super.SetShapeProperties(properties)) {
      updated = true;
    }

    LogUtil.Debug("= S.ForeignObject SetShapeProperties Output:", updated);
    return updated;
  }

  /**
   * Clean up resources when element is removed or destroyed
   */
  RemoveElement() {
    LogUtil.Debug("= S.ForeignObject RemoveElement");

    // Clean up Vue instance if one exists
    if (this.vueInstance) {
      // Attempt to destroy Vue instance using appropriate method
      if (typeof this.vueInstance.unmount === 'function') {
        // Vue 3
        this.vueInstance.unmount();
      } else if (typeof this.vueInstance.$destroy === 'function') {
        // Vue 2
        this.vueInstance.$destroy();
      }
      this.vueInstance = null;
    }

    // Call parent implementation
    super.RemoveElement();
  }

  /**
   * Override LMActionPostRelease to handle Vue component refresh after resizing
   */
  LMActionPostRelease(objectId: number) {
    LogUtil.Debug("= S.ForeignObject LMActionPostRelease Input:", objectId);

    // Call parent implementation first
    super.LMActionPostRelease(objectId);

    // Special handling for foreign objects with Vue components
    if (this.vueComponent) {
      // Get SVG object for this shape
      const svgObj = T3Gv.opt.svgObjectLayer.GetElementById(this.BlockID);

      if (svgObj) {
        // Find the foreign object element
        const foreignObj = svgObj.GetElementById(OptConstant.SVGElementClass.Shape);

        if (foreignObj) {
          // Re-mount the Vue component with current props to refresh after resize
          foreignObj.MountVueComponent(this.vueComponent, this.vueProps);
          LogUtil.Debug("= S.ForeignObject LMActionPostRelease: Vue component refreshed");
        }
      }
    }

    LogUtil.Debug("= S.ForeignObject LMActionPostRelease Output: completed");
  }
}

export default ForeignObject;
