
import T3Svg from '../Util/T3Svg';
import Container from './B.Container';
import Group from "./B.Group";
import Element from './B.Element';
// import { useQuasar } from 'quasar';
// Placeholder: Quasar not used in React
const useQuasar: any = () => ({ notify: () => {}, dialog: {} });
import T3Util from '../Util/T3Util';

/**
 * Represents an SVG foreignObject element that can contain HTML content, including Vue components.
 * SECURITY: Implements secure HTML content handling to prevent XSS attacks.
 *
 * ForeignObject allows embedding HTML content within SVG, providing a bridge between
 * vector graphics and HTML/CSS layout. This is particularly useful for integrating
 * Vue components directly into the SVG drawing.
 */
class ForeignObject extends Element {
  public vueInstance: any = null;
  public shapeGroup: any;
  public svgObj;
  public foreignObj;

  CreateElement(element: any, type: any) {
    /*
    this.svgObj = new T3Svg.Container(T3Svg.create('foreignObject'));
    this.InitElement(element, type);
    this.shapeGroup = new Group();
    this.shapeGroup.CreateElement(element, type);
    super.AddElement(this.shapeGroup);
    return this.svgObj;
    */

    this.svgObj = new T3Svg.Container(T3Svg.create('foreignObject'));
    this.InitElement(element, type);
    return this.svgObj;
  }

  /**
   * Sets the size of this foreignObject
   * @param width - Width to set
   * @param height - Height to set
   * @returns This object for method chaining
   */
  SetSize(width: number, height: number) {
    this.svgObj.size(width, height);
    return this;
  }

  /**
   * Sets the position of this foreignObject
   * @param x - X coordinate
   * @param y - Y coordinate
   * @returns This object for method chaining
   */
  SetPosition(x: number, y: number) {
    this.svgObj.move(x, y);
    return this;
  }

  /**
   * Mounts a Vue component inside this foreignObject
   * @param vueComponent - Vue component constructor
   * @param props - Props to pass to the component
   * @returns This object for method chaining
   */
  MountVueComponent(vueComponent: any, props: any = {}) {
    try {
      // Import Vue and Quasar dynamically to avoid direct dependency
      Promise.all([import('vue'), import('quasar')]).then(([Vue, Quasar]) => {
        // Create container for Vue component
        const mountPoint = document.createElement('div');
        mountPoint.style.width = '100%';
        mountPoint.style.height = '100%';

        // Add to foreignObject
        this.svgObj.node.appendChild(mountPoint);

        // Create and mount Vue instance - handle different module formats
        // Check for Vue 3 first, as it's the most likely version
        if (Vue.createApp) {
          // Vue 3
          this.vueInstance = Vue.createApp(vueComponent, props);
          // Install Quasar plugin for Vue 3
          const quasarModule = Quasar.default || Quasar;
          this.vueInstance.use(quasarModule.Quasar || quasarModule, {
            config: {},
            plugins: {},
          });
          this.vueInstance.mount(mountPoint);
        } else if (Vue.default && typeof (Vue.default as any).extend === 'function') {
          // Vue with default export (Vue 2)
          // Install Quasar plugin
          (Vue.default as any).use(Quasar.default || Quasar);
          const ComponentClass = (Vue.default as any).extend(vueComponent);
          this.vueInstance = new ComponentClass({
            propsData: props
          });
          this.vueInstance.$mount(mountPoint);
        } else if (typeof (Vue as any).extend === 'function') {
          // Direct Vue export (Vue 2)
          // Install Quasar plugin
          (Vue as any).use(Quasar.default || Quasar);
          const ComponentClass = (Vue as any).extend(vueComponent);
          this.vueInstance = new ComponentClass({
            propsData: props
          });
          this.vueInstance.$mount(mountPoint);
        } else {
          // Vue 3
          this.vueInstance = Vue.createApp(vueComponent, props);
          // Install Quasar plugin
          this.vueInstance.use(Quasar.default || Quasar);
          this.vueInstance.mount(mountPoint);
        }
      });
    } catch (error) {
      T3Util.Error('= b.ForeignObject: MountVueComponent/ Failed to mount Vue component:', error);
    }

    return this;
  }

  /**
   * Sets HTML content inside this foreignObject
   * @param content - HTML content as string or element
   * @returns This object for method chaining
   */
  SetHtmlContent(content: string | HTMLElement) {
    this.svgObj.html(content);
    return this;
  }

  /**
   * Destroys the Vue component if one is mounted
   * SECURITY: Safely clears innerHTML to prevent XSS
   */
  DestroyVueComponent() {
    if (this.vueInstance) {
      this.vueInstance.$destroy();
      this.vueInstance = null;
      // SECURITY: Safe innerHTML clearing
      this.svgObj.node.textContent = '';
    }
  }

  /**
   * Securely set HTML content in the foreign object
   * @param content HTML content to set (will be sanitized)
   */
  setSecureHTML(content: string) {
    // Dynamic import to avoid circular dependencies
    import('../Security/T3SecurityUtil').then(({ T3Security }) => {
      const sanitizedContent = T3Security.sanitizeHTML(content, true);
      this.svgObj.node.innerHTML = sanitizedContent;
    }).catch(() => {
      // Fallback: Use textContent for security
      this.svgObj.node.textContent = content;
    });
  }

  /**
   * Clean up resources when element is removed
   */
  RemoveElement() {
    this.DestroyVueComponent();
    super.RemoveElement();
  }
}

export default ForeignObject;
