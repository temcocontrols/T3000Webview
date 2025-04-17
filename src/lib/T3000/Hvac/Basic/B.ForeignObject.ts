
import Container from './B.Container';

/**
 * Represents an SVG foreignObject element that can contain HTML content, including Vue components.
 *
 * ForeignObject allows embedding HTML content within SVG, providing a bridge between
 * vector graphics and HTML/CSS layout. This is particularly useful for integrating
 * Vue components directly into the SVG drawing.
 */
class ForeignObject extends Container {
  public vueInstance: any = null;

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
      // Import Vue dynamically to avoid direct dependency
      import('vue').then(Vue => {
        // Create container for Vue component
        const mountPoint = document.createElement('div');
        mountPoint.style.width = '100%';
        mountPoint.style.height = '100%';

        // Add to foreignObject
        this.svgObj.node.appendChild(mountPoint);

        // Create and mount Vue instance
        const ComponentClass = Vue.default.extend(vueComponent);
        this.vueInstance = new ComponentClass({
          propsData: props
        });

        this.vueInstance.$mount(mountPoint);
      });
    } catch (error) {
      console.error('Failed to mount Vue component:', error);
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
   */
  DestroyVueComponent() {
    if (this.vueInstance) {
      this.vueInstance.$destroy();
      this.vueInstance = null;
      this.svgObj.node.innerHTML = '';
    }
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
