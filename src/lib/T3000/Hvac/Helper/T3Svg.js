

// import { SVG, Element, extend, create } from "@svgdotjs/svg.js";

/**
 * Creates and returns a new SVG document instance
 * @param {string|HTMLElement} container - The container element ID or DOM element where the SVG will be placed
 * @returns {SVG.Doc} A new SVG document instance
 */
var svg = function (container) {
  return new SVG.Doc(container);
};

/**
 * SVG namespace and utility object
 * Contains fundamental methods and properties for SVG manipulation
 */
var SVG = {
  /**
   * SVG XML namespace
   * Standard namespace for SVG elements
   * @type {string}
   */
  ns: "http://www.w3.org/2000/svg",

  /**
   * XLink XML namespace
   * Used for href attributes in SVG
   * @type {string}
   */
  xlink: "http://www.w3.org/1999/xlink",

  /**
   * Document identifier counter
   * Used to generate unique IDs for SVG elements
   * @type {number}
   */
  did: 0,

  /**
   * Creates a new SVG element with the correct namespace
   * @param {string} elementName - The name of the SVG element to create
   * @returns {SVGElement} The newly created SVG element
   */
  create: function (elementName) {
    return document.createElementNS(this.ns, elementName);
  },

  /**
   * Extends a target object's prototype with properties from a source object
   * Used for implementing inheritance between SVG element types
   * @param {Object} targetClass - The class to extend
   * @param {Object} sourceProps - Object containing properties to add to the target's prototype
   */
  extend: function (targetClass, sourceProps) {
    for (var propName in sourceProps) {
      targetClass.prototype[propName] = sourceProps[propName];
    }
  }
};

/*
SVG.ns = "http://www.w3.org/2000/svg";
SVG.xlink = "http://www.w3.org/1999/xlink";
SVG.did = 0;

SVG.create = create;
*/

/**
 * Creates a new SVG document/drawing surface in the specified container
 *
 * This is the main entry point to create an SVG drawing. It takes either
 * a DOM element or element ID string and returns a new SVG document instance
 * that can be used to create and manipulate SVG content.
 *
 * @param {string|HTMLElement} container - The container element ID or DOM element where the SVG will be placed
 * @returns {SVG.Doc} A new SVG document instance ready for drawing
 * @example
 * // Create SVG in element with ID "drawing"
 * var drawing = SVG.svg("drawing");
 * // Now you can add shapes: drawing.rect(100, 100).fill('#f06');
 */
SVG.svg = function (container) {
  return new SVG.Doc(container);
};

/**
 * Base constructor for all SVG elements
 * Creates a new SVG element with default attributes and transformation properties
 *
 * @param {SVGElement} element - The SVG DOM element to associate with this instance
 * @returns {SVG.Element} A new SVG element instance
 */
SVG.Element = function (element) {
  // Set the node and determine element type if element exists
  if (element) {
    this.node = element;
    this.type = element.nodeName;
  }

  // Initialize default attribute values for the element
  this.attrs = {
    'fill-opacity': 1,
    'stroke-opacity': 1,
    'stroke-width': 0,
    'fill': '#000',
    'stroke': '#000',
    'opacity': 1,
    'x': 0,
    'y': 0,
    'cx': 0,
    'cy': 0,
    'width': 0,
    'height': 0,
    'r': 0,
    'rx': 0,
    'ry': 0
  };

  // Initialize default transformation properties
  this.trans = {
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    skewX: 0,
    skewY: 0
  };
};

SVG.extend(SVG.Element, {
  /**
   * Moves an element to a specific position by setting its x and y attributes
   * @param {number} x - The x-coordinate to move to
   * @param {number} y - The y-coordinate to move to
   * @returns {SVG.Element} The element itself for method chaining
   */
  move: function (x, y) {
    return this.attr({
      x: x,
      y: y,
    });
  },

  /**
   * Centers an element at a specific position by calculating offsets based on element dimensions
   * @param {number} x - The x-coordinate of the center point
   * @param {number} y - The y-coordinate of the center point
   * @returns {SVG.Element} The element itself for method chaining
   */
  center: function (x, y) {
    var boundingBox = this.bbox();
    return this.move(x - boundingBox.width / 2, y - boundingBox.height / 2);
  },

  /**
   * Sets the width and height of an element
   * @param {number} width - The width to set
   * @param {number} height - The height to set
   * @returns {SVG.Element} The element itself for method chaining
   */
  size: function (width, height) {
    return this.attr({
      width: width,
      height: height,
    });
  },

  /**
   * Creates a copy of the element with the same attributes and transformations
   * @returns {SVG.Element} A new element with the same properties as the original
   */
  clone: function () {
    var clone;
    if (this instanceof SVG.Wrap) {
      clone = this.parent[this.child.node.nodeName]();
      clone.attrs = this.attrs;
      clone.child.trans = this.child.trans;
      clone.child.attr(this.child.attrs).transform({});

      if (clone.plot) {
        clone.plot(
          this.child.attrs[this.child instanceof SVG.Path ? "d" : "points"]
        );
      }
    } else {
      var nodeName = this.node.nodeName;

      if (nodeName == "rect") {
        clone = this.parent[nodeName](this.attrs.width, this.attrs.height);
      } else if (nodeName == "ellipse") {
        clone = this.parent[nodeName](2 * this.attrs.rx, 2 * this.attrs.ry);
      } else if (nodeName == "image") {
        clone = this.parent[nodeName](this.src);
      } else if (nodeName == "text") {
        clone = this.parent[nodeName](this.content);
      } else if (nodeName == "g") {
        clone = this.parent.group();
      } else {
        clone = this.parent[nodeName]();
      }

      clone.attr(this.attrs);
    }

    clone.trans = this.trans;
    clone.transform({});
    return clone;
  },

  /**
   * Removes the element from its parent
   * @returns {SVG.Element} The removed element
   */
  remove: function () {
    return this.parent != null ? this.parent.remove(this) : undefined;
  },

  /**
   * Gets the document containing the element
   * @returns {SVG.Doc} The SVG document
   */
  doc: function () {
    return this._parent(SVG.Doc);
  },

  /**
   * Gets the nearest nested SVG container
   * @returns {SVG.Nested} The nested SVG container
   */
  nested: function () {
    return this._parent(SVG.Nested);
  },

  /**
   * Gets or sets attributes of the element
   * @param {string|Object} name - The attribute name or an object with attribute key-value pairs
   * @param {*} [value] - The value to set for the attribute
   * @param {string} [namespace] - The namespace for the attribute
   * @returns {SVG.Element|*} The element itself when setting, or the attribute value when getting
   */
  attr: function (name, value, namespace) {
    if (arguments.length < 2) {
      if (typeof name != "object") {
        return this._isStyle(name)
          ? name == "text"
            ? this.content
            : name == "leading"
              ? this[name]
              : this.style[name]
          : this.attrs[name];
      }

      for (var key in name) {
        this.attr(key, name[key]);
      }
    } else {
      this.attrs[name] = value;

      if (name == "x" && this._isText()) {
        for (var i = this.lines.length - 1; i >= 0; i--) {
          this.lines[i].attr(name, value);
        }
      } else {
        namespace != null
          ? this.node.setAttributeNS(namespace, name, value)
          : this.node.setAttribute(name, value);
      }

      if (this._isStyle(name)) {
        if (name == "text") {
          this.text(value);
        } else if (name == "leading") {
          this[name] = value;
        } else {
          this.style[name] = value;
        }
        this.text(this.content);
      }
    }

    return this;
  },

  /**
   * Applies transformations to the element
   * @param {string|Object} transform - A transformation type to query, or an object with transformation values
   * @returns {SVG.Element|*} The element itself when setting, or the transformation value when getting
   */
  transform: function (transform) {
    if (typeof transform == "string") {
      return this.trans[transform];
    }

    var transformList = [];

    for (var type in transform) {
      if (transform[type] != null) {
        this.trans[type] = transform[type];
      }
    }

    transform = this.trans;

    if (transform.rotation != 0) {
      var boundingBox = this.bbox();
      transformList.push(
        "rotate(" +
        transform.rotation +
        "," +
        (transform.cx != null ? transform.cx : boundingBox.cx) +
        "," +
        (transform.cy != null ? transform.cy : boundingBox.cy) +
        ")"
      );
    }

    transformList.push("scale(" + transform.scaleX + "," + transform.scaleY + ")");

    if (transform.skewX != 0) {
      transformList.push("skewX(" + transform.skewX + ")");
    }

    if (transform.skewY != 0) {
      transformList.push("skewY(" + transform.skewY + ")");
    }

    transformList.push("translate(" + transform.x + "," + transform.y + ")");

    return this.attr("transform", transformList.join(" "));
  },

  /**
   * Sets or gets data attributes with JSON parsing/stringifying
   * @param {string} key - The data attribute key
   * @param {*} [value] - The value to set
   * @returns {SVG.Element|*} The element itself when setting, or the data value when getting
   */
  data: function (key, value) {
    console.log("USE HVAC SVG TO SET DATA", key, value);

    if (arguments.length < 2) {
      try {
        return JSON.parse(this.attr("data-" + key));
      } catch (error) {
        return this.attr("data-" + key);
      }
    } else {
      value === null
        ? this.node.removeAttribute("data-" + key)
        : this.attr("data-" + key, JSON.stringify(value));
    }

    return this;
  },

  /**
   * Gets the bounding box of the element
   * @returns {Object} Object with x, y, cx, cy, width, and height properties
   */
  bbox: function () {
    var box = this.node.getBBox();
    return {
      x: box.x + this.trans.x,
      y: box.y + this.trans.y,
      cx: box.x + this.trans.x + box.width / 2,
      cy: box.y + this.trans.y + box.height / 2,
      width: box.width,
      height: box.height,
    };
  },

  /**
   * Gets the bounding client rectangle of the element relative to the viewport
   * @returns {Object} Object with x, y, width, and height properties
   */
  rbox: function () {
    var rect = this.node.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    };
  },

  /**
   * Checks if a point is inside the element's bounding box
   * @param {number} x - The x-coordinate of the point
   * @param {number} y - The y-coordinate of the point
   * @returns {boolean} True if the point is inside the element
   */
  inside: function (x, y) {
    var boundingBox = this.bbox();
    return x > boundingBox.x &&
      y > boundingBox.y &&
      x < boundingBox.x + boundingBox.width &&
      y < boundingBox.y + boundingBox.height;
  },

  /**
   * Shows the element by setting its display style to empty
   * @returns {SVG.Element} The element itself for method chaining
   */
  show: function () {
    this.node.style.display = "";
    return this;
  },

  /**
   * Hides the element by setting its display style to 'none'
   * @returns {SVG.Element} The element itself for method chaining
   */
  hide: function () {
    this.node.style.display = "none";
    return this;
  },

  /**
   * Checks if the element is currently visible
   * @returns {boolean} True if the element is visible
   */
  visible: function () {
    return this.node.style.display != "none";
  },

  /**
   * Finds a parent element of a specific type
   * @param {Function} parentType - The constructor function of the parent type to find
   * @returns {SVG.Element} The found parent element
   * @private
   */
  _parent: function (parentType) {
    var current = this;
    while (current != null && !(current instanceof parentType)) {
      current = current.parent;
    }
    return current;
  },

  /**
   * Checks if an attribute is a style attribute for text elements
   * @param {string} name - The attribute name
   * @returns {boolean} True if the attribute is a style attribute
   * @private
   */
  _isStyle: function (name) {
    return (
      typeof name == "string" &&
      this._isText() &&
      /^font|text|leading/.test(name)
    );
  },

  /**
   * Checks if the element is a text element
   * @returns {boolean} True if the element is a text element
   * @private
   */
  _isText: function () {
    return this instanceof SVG.Text;
  },
});

/**
 * SVG Container constructor
 * Creates a container element that can hold other SVG elements
 *
 * The Container class serves as a base for elements like groups (g), nested SVG elements,
 * and the main document. It provides methods for adding, manipulating, and managing
 * child elements in the SVG structure.
 *
 * @param {SVGElement} element - The SVG DOM element to associate with this container
 * @returns {SVG.Container} A new SVG container instance
 * @example
 * // Creating a container is usually done through other methods
 * // For example, to create a group container:
 * var group = drawing.group(); // returns an SVG.Container instance
 */
SVG.Container = function (element) {
  this.constructor.call(this, element);
};

/**
 * Establishes prototype inheritance for SVG Container
 *
 * This sets up the inheritance chain so that SVG.Container inherits all properties and methods
 * from SVG.Element, creating the proper object hierarchy for the SVG manipulation library.
 * Container elements (like groups, documents, nested SVGs) need all the basic element
 * functionality plus the ability to manage child elements.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Container is set to be an instance of Element.
 */
SVG.Container.prototype = new SVG.Element();

SVG.extend(SVG.Container, {
  /**
   * Adds an SVG element to this container at the specified position
   * @param {SVG.Element} element - The SVG element to add
   * @param {number} [position] - The position to insert at (defaults to end of container)
   * @returns {SVG.Container} The container itself for method chaining
   */
  add: function (element, position) {
    if (!this.has(element)) {
      position = position == null ? this.children().length : position;
      this.children().splice(position, 0, element);
      this.node.insertBefore(element.node, this.node.childNodes[position] || null);
      element.parent = this;
    }
    return this;
  },

  /**
   * Adds an SVG element to this container and returns the element (convenience method)
   * @param {SVG.Element} element - The SVG element to add
   * @param {number} [position] - The position to insert at
   * @returns {SVG.Element} The added element
   */
  put: function (element, position) {
    return this.add(element, position), element;
  },

  /**
   * Checks if this container has the specified element as a child
   * @param {SVG.Element} element - The element to check for
   * @returns {boolean} True if the element is a child of this container
   */
  has: function (element) {
    return this.children().indexOf(element) >= 0;
  },

  /**
   * Gets the array of child elements in this container
   * @returns {Array<SVG.Element>} Array of child elements
   */
  children: function () {
    return this._children || (this._children = []);
  },

  /**
   * Executes a callback function for each shape element in the container
   * @param {Function} callback - The function to execute for each shape
   * @returns {SVG.Container} The container itself for method chaining
   */
  each: function (callback) {
    var index,
      childElements = this.children();
    for (index = 0, length = childElements.length; index < length; index++)
      if (childElements[index] instanceof SVG.Shape) {
        callback.apply(childElements[index], [index, childElements]);
      }
    return this;
  },

  /**
   * Removes a specific element from this container
   * @param {SVG.Element} element - The element to remove
   * @returns {SVG.Container} The container itself for method chaining
   */
  remove: function (element) {
    return this.removeAt(this.children().indexOf(element));
  },

  /**
   * Removes an element at the specified index from this container
   * @param {number} index - The index of the element to remove
   * @returns {SVG.Container} The container itself for method chaining
   */
  removeAt: function (index) {
    if (0 <= index && index < this.children().length) {
      var element = this.children()[index];
      this.children().splice(index, 1);
      this.node.removeChild(element.node);
      element.parent = null;
    }
    return this;
  },

  /**
   * Gets or creates a defs element for this container
   * @returns {SVG.Defs} The defs element
   */
  defs: function () {
    return this._defs || (this._defs = this.put(new SVG.Defs(), 0));
  },

  /**
   * Ensures the defs element is at the beginning of the container
   * @returns {SVG.Container} The container itself for method chaining
   */
  level: function () {
    return this.remove(this.defs()).put(this.defs(), 0);
  },

  /**
   * Creates and returns a new group (g) element within this container
   * @returns {SVG.G} The new group element
   */
  group: function () {
    return this.put(new SVG.G());
  },

  /**
   * Creates and returns a new rectangle element within this container
   * @param {number} width - The width of the rectangle
   * @param {number} height - The height of the rectangle
   * @returns {SVG.Rect} The new rectangle element
   */
  rect: function (width, height) {
    return this.put(new SVG.Rect().size(width, height));
  },

  /**
   * Creates and returns a new circle element within this container
   * @param {number} diameter - The diameter of the circle
   * @returns {SVG.Ellipse} The new circle element (implemented as ellipse)
   */
  circle: function (diameter) {
    return this.ellipse(diameter);
  },

  /**
   * Creates and returns a new ellipse element within this container
   * @param {number} width - The width of the ellipse
   * @param {number} [height] - The height of the ellipse (defaults to width if not specified)
   * @returns {SVG.Ellipse} The new ellipse element
   */
  ellipse: function (width, height) {
    return this.put(new SVG.Ellipse().size(width, height));
  },

  /**
   * Creates and returns a new polyline element within this container
   * @param {string} points - The points string for the polyline
   * @returns {SVG.Wrap} The wrapped polyline element
   */
  polyline: function (points) {
    return this.put(new SVG.Wrap(new SVG.Polyline())).plot(points);
  },

  /**
   * Creates and returns a new polygon element within this container
   * @param {string} points - The points string for the polygon
   * @returns {SVG.Wrap} The wrapped polygon element
   */
  polygon: function (points) {
    return this.put(new SVG.Wrap(new SVG.Polygon())).plot(points);
  },

  /**
   * Creates and returns a new path element within this container
   * @param {string} pathData - The SVG path data
   * @returns {SVG.Wrap} The wrapped path element
   */
  path: function (pathData) {
    return this.put(new SVG.Wrap(new SVG.Path())).plot(pathData);
  },

  /**
   * Creates and returns a new image element within this container
   * @param {string} href - The image URL
   * @param {number} [width=100] - The width of the image
   * @param {number} [height] - The height of the image (defaults to width if not specified)
   * @returns {SVG.Image} The new image element
   */
  image: function (href, width, height) {
    width = width != null ? width : 100;
    return this.put(new SVG.Image().load(href).size(width, height != null ? height : width));
  },

  /**
   * Creates and returns a new text element within this container
   * @param {string} content - The text content
   * @returns {SVG.Text} The new text element
   */
  text: function (content) {
    return this.put(new SVG.Text().text(content));
  },

  /**
   * Creates and returns a new nested SVG element within this container
   * @returns {SVG.Nested} The new nested SVG element
   */
  nested: function () {
    return this.put(new SVG.Nested());
  },

  /**
   * Creates a gradient in the defs section
   * @param {string} type - The gradient type ('linear' or 'radial')
   * @param {Function} callback - A callback function to configure the gradient
   * @returns {SVG.Gradient} The new gradient element
   */
  gradient: function (type, callback) {
    return this.defs().gradient(type, callback);
  },

  /**
   * Creates a pattern in the defs section
   * @param {number} width - The pattern width
   * @param {number} height - The pattern height
   * @param {Function} callback - A callback function to configure the pattern
   * @returns {SVG.Pattern} The new pattern element
   */
  pattern: function (width, height, callback) {
    return this.defs().pattern(width, height, callback);
  },

  /**
   * Creates and returns a new mask element in the defs section
   * @returns {SVG.Mask} The new mask element
   */
  mask: function () {
    return this.defs().put(new SVG.Mask());
  },

  /**
   * Gets the first non-defs child element in this container
   * @returns {SVG.Element} The first child element
   */
  first: function () {
    return this.children()[0] instanceof SVG.Defs
      ? this.children()[1]
      : this.children()[0];
  },

  /**
   * Gets the last child element in this container
   * @returns {SVG.Element} The last child element
   */
  last: function () {
    return this.children()[this.children().length - 1];
  },

  /**
   * Removes all child elements from this container
   * @returns {SVG.Container} The container itself for method chaining
   */
  clear: function () {
    this._children = [];
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }
    return this;
  },
});

/**
 * SVG.FX constructor - Creates an animation/effects controller for SVG elements
 *
 * This class provides the foundation for all SVG animations. It stores a reference
 * to the target element and provides methods for defining and controlling animations
 * including attribute changes, transformations, and movement over time with various
 * easing functions.
 *
 * @param {SVG.Element} element - The SVG element to apply animations/effects to
 * @returns {SVG.FX} A new animation controller for the target element
 * @example
 * // Create an animation controller for a rectangle
 * var animation = new SVG.FX(rect);
 * // Use it to animate properties
 * animation.animate(1000).move(100, 100);
 */
SVG.FX = function (element) {
  this.target = element;
};

SVG.extend(SVG.FX, {
  /**
   * Animates SVG element attributes and transformations over time with easing
   * @param {number} duration - Animation duration in milliseconds (default: 1000)
   * @param {string|Function} easing - Easing function to use (default: "<>", which is sine-in-out)
   * @returns {SVG.FX} The animation controller for chaining
   */
  animate: function (duration, easing) {
    duration = duration == null ? 1000 : duration;
    easing = easing || "<>";

    var attrNames,
      transNames,
      transObj,
      target = this.target,
      controller = this,
      startTime = new Date().getTime(),
      endTime = startTime + duration;

    this.interval = setInterval(function () {
      var currentTime = new Date().getTime();
      var progress = currentTime > endTime ? 1 : (currentTime - startTime) / duration;

      // Initialize attribute names array if not set
      if (attrNames == null) {
        attrNames = [];
        for (var attrName in controller.attrs) {
          attrNames.push(attrName);
        }
      }

      // Initialize transformation names array if not set
      if (transNames == null) {
        transNames = [];
        for (var transName in controller.trans) {
          transNames.push(transName);
        }
        transObj = {};
      }

      // Calculate eased progress based on easing type
      var easedProgress;
      if (easing === "<>") {
        // Sine in-out easing
        easedProgress = -Math.cos(progress * Math.PI) / 2 + 0.5;
      } else if (easing === ">") {
        // Sine in easing
        easedProgress = Math.sin((progress * Math.PI) / 2);
      } else if (easing === "<") {
        // Sine out easing
        easedProgress = 1 - Math.cos((progress * Math.PI) / 2);
      } else if (easing === "-") {
        // Linear easing
        easedProgress = progress;
      } else if (typeof easing === "function") {
        // Custom easing function
        easedProgress = easing(progress);
      } else {
        // Default to linear
        easedProgress = progress;
      }

      // Handle movement animation
      if (controller._move) {
        target.move(
          controller._at(controller._move.x, easedProgress),
          controller._at(controller._move.y, easedProgress)
        );
      } else if (controller._center) {
        target.move(
          controller._at(controller._center.x, easedProgress),
          controller._at(controller._center.y, easedProgress)
        );
      }

      // Handle size animation
      if (controller._size) {
        target.size(
          controller._at(controller._size.width, easedProgress),
          controller._at(controller._size.height, easedProgress)
        );
      }

      // Animate attributes
      for (var i = attrNames.length - 1; i >= 0; i--) {
        target.attr(attrNames[i], controller._at(controller.attrs[attrNames[i]], easedProgress));
      }

      // Animate transformations
      if (transNames.length > 0) {
        for (var i = transNames.length - 1; i >= 0; i--) {
          transObj[transNames[i]] = controller._at(controller.trans[transNames[i]], easedProgress);
        }
        target.transform(transObj);
      }

      // End animation when complete
      if (currentTime > endTime) {
        clearInterval(controller.interval);
        if (controller._after) {
          controller._after.apply(target, [controller]);
        } else {
          controller.stop();
        }
      }
    }, duration > 10 ? 10 : duration);

    return this;
  },

  /**
   * Sets attributes to animate from current value to target value
   * @param {string|Object} name - Attribute name or object containing attribute key-value pairs
   * @param {*} value - Target value for the attribute
   * @returns {SVG.FX} The animation controller for chaining
   */
  attr: function (name, value) {
    if (typeof name == "object") {
      for (var key in name) {
        this.attr(key, name[key]);
      }
    } else {
      this.attrs[name] = {
        from: this.target.attr(name),
        to: value
      };
    }
    return this;
  },

  /**
   * Sets transformations to animate from current values to target values
   * @param {Object} transforms - Object containing transformation key-value pairs
   * @returns {SVG.FX} The animation controller for chaining
   */
  transform: function (transforms) {
    for (var property in transforms) {
      this.trans[property] = {
        from: this.target.trans[property],
        to: transforms[property]
      };
    }
    return this;
  },

  /**
   * Animates element position to target coordinates
   * @param {number} x - Target x coordinate
   * @param {number} y - Target y coordinate
   * @returns {SVG.FX} The animation controller for chaining
   */
  move: function (x, y) {
    var bbox = this.target.bbox();
    this._move = {
      x: {
        from: bbox.x,
        to: x
      },
      y: {
        from: bbox.y,
        to: y
      }
    };
    return this;
  },

  /**
   * Animates element size to target dimensions
   * @param {number} width - Target width
   * @param {number} height - Target height
   * @returns {SVG.FX} The animation controller for chaining
   */
  size: function (width, height) {
    var bbox = this.target.bbox();
    this._size = {
      width: {
        from: bbox.width,
        to: width
      },
      height: {
        from: bbox.height,
        to: height
      }
    };
    return this;
  },

  /**
   * Animates element center position to target coordinates
   * @param {number} x - Target center x coordinate
   * @param {number} y - Target center y coordinate
   * @returns {SVG.FX} The animation controller for chaining
   */
  center: function (x, y) {
    var bbox = this.target.bbox();
    this._move = {
      x: {
        from: bbox.cx,
        to: x
      },
      y: {
        from: bbox.cy,
        to: y
      }
    };
    return this;
  },

  /**
   * Sets a callback function to run after animation completes
   * @param {Function} callback - Function to execute after animation
   * @returns {SVG.FX} The animation controller for chaining
   */
  after: function (callback) {
    this._after = callback;
    return this;
  },

  /**
   * Stops the current animation and resets animation properties
   * @returns {SVG.FX} The animation controller for chaining
   */
  stop: function () {
    clearInterval(this.interval);
    this.attrs = {};
    this.trans = {};
    this._move = null;
    this._size = null;
    this._after = null;
    return this;
  },

  /**
   * Calculates intermediate value at a specific progress point
   * @param {Object|number} prop - Property with from/to values or a direct number
   * @param {number} progress - Animation progress (0 to 1)
   * @returns {number|string} Interpolated value
   * @private
   */
  _at: function (prop, progress) {
    if (typeof prop.from === "number") {
      return prop.from + (prop.to - prop.from) * progress;
    } else if (prop.to.r || /^#/.test(prop.to)) {
      return this._color(prop, progress);
    } else {
      return progress < 1 ? prop.from : prop.to;
    }
  },

  /**
   * Interpolates between two colors at a specific progress point
   * @param {Object} colorObj - Object with from/to color values
   * @param {number} progress - Animation progress (0 to 1)
   * @returns {string} Interpolated hex color
   * @private
   */
  _color: function (colorObj, progress) {
    var fromColor = this._h2r(colorObj.from || "#000");
    var toColor = this._h2r(colorObj.to);

    return this._r2h({
      r: ~~(fromColor.r + (toColor.r - fromColor.r) * progress),
      g: ~~(fromColor.g + (toColor.g - fromColor.g) * progress),
      b: ~~(fromColor.b + (toColor.b - fromColor.b) * progress)
    });
  },

  /**
   * Converts hex color string to RGB object
   * @param {string} hex - Hex color string
   * @returns {Object} RGB color object with r, g, b properties
   * @private
   */
  _h2r: function (hex) {
    var match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(this._fh(hex));

    return match ? {
      r: parseInt(match[1], 16),
      g: parseInt(match[2], 16),
      b: parseInt(match[3], 16)
    } : {
      r: 0,
      g: 0,
      b: 0
    };
  },

  /**
   * Converts RGB object to hex color string
   * @param {Object} rgb - RGB color object with r, g, b properties
   * @returns {string} Hex color string
   * @private
   */
  _r2h: function (rgb) {
    return "#" + this._c2h(rgb.r) + this._c2h(rgb.g) + this._c2h(rgb.b);
  },

  /**
   * Converts a color component to two-character hex string
   * @param {number} component - RGB color component (0-255)
   * @returns {string} Two-character hex string
   * @private
   */
  _c2h: function (component) {
    var hex = component.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
  },

  /**
   * Formats hex colors to ensure 6 characters (expands shorthand)
   * @param {string} hex - Hex color string (can be 3 or 6 characters)
   * @returns {string} Standardized 6-character hex color
   * @private
   */
  _fh: function (hex) {
    // Convert 3-character hex (#RGB) to 6-character (#RRGGBB)
    return hex.length == 4 ?
      "#" + hex.substring(1, 2) + hex.substring(1, 2) +
      hex.substring(2, 3) + hex.substring(2, 3) +
      hex.substring(3, 4) + hex.substring(3, 4)
      : hex;
  }
});

SVG.extend(SVG.Element, {
  /**
   * Creates and starts an animation for this SVG element
   *
   * This method creates a new animation controller (SVG.FX) if one doesn't exist,
   * stops any current animation, and then starts a new animation with the specified
   * duration and easing. This provides a convenient way to animate SVG elements
   * without manually creating an SVG.FX instance.
   *
   * @param {number} duration - Animation duration in milliseconds
   * @param {string|Function} easing - Easing function name or custom easing function
   * @returns {SVG.FX} The animation controller for chaining
   * @example
   * // Animate an element to move to (100,100) over 1000ms with sine-in-out easing
   * element.animate(1000, '<>').move(100, 100);
   */
  animate: function (duration, easing) {
    // Create animation controller if it doesn't exist, then stop any current
    // animation and start a new one
    return (this._fx || (this._fx = new SVG.FX(this)))
      .stop()
      .animate(duration, easing);
  },

  /**
   * Stops the current animation for this element
   *
   * This method immediately halts any ongoing animation by calling the stop method
   * on the element's animation controller. It's useful when you need to cancel
   * animations before they complete naturally.
   *
   * @returns {SVG.Element} The element itself for method chaining
   * @example
   * // Stop any ongoing animation on this element
   * element.stop();
   */
  stop: function () {
    this._fx.stop();
    return this;
  }
});

/**
 * Adds an event listener to a DOM element with cross-browser support
 * @param {HTMLElement} element - The DOM element to attach the event to
 * @param {string} eventType - The event type (e.g., 'click', 'mouseover')
 * @param {Function} callback - The event handler function
 */
SVG.on = function (element, eventType, callback) {
  if (element.addEventListener) {
    element.addEventListener(eventType, callback, false);
  } else {
    element.attachEvent("on" + eventType, callback);
  }
};

/**
 * Removes an event listener from a DOM element with cross-browser support
 * @param {HTMLElement} element - The DOM element to remove the event from
 * @param {string} eventType - The event type (e.g., 'click', 'mouseover')
 * @param {Function} callback - The event handler function to remove
 */
SVG.off = function (element, eventType, callback) {
  if (element.removeEventListener) {
    element.removeEventListener(eventType, callback, false);
  } else {
    element.detachEvent("on" + eventType, callback);
  }
};

SVG.extend(SVG.Element, {
  /**
   * Attaches an event listener to this SVG element
   * @param {string} eventType - The event type to listen for
   * @param {Function} callback - The event handler function
   * @returns {SVG.Element} The element itself for method chaining
   */
  on: function (eventType, callback) {
    SVG.on(this.node, eventType, callback);
    return this;
  },

  /**
   * Removes an event listener from this SVG element
   * @param {string} eventType - The event type to remove
   * @param {Function} callback - The event handler function to remove
   * @returns {SVG.Element} The element itself for method chaining
   */
  off: function (eventType, callback) {
    SVG.off(this.node, eventType, callback);
    return this;
  }
});

/**
 * SVG Group constructor
 * Creates a new SVG group element that can contain other SVG elements
 * @returns {SVG.G} A new SVG group instance
 */
SVG.G = function () {
  this.constructor.call(this, SVG.create("g"));
};

SVG.G.prototype = new SVG.Container();

SVG.extend(SVG.G, {
  /**
   * Gets the defs element from the parent document
   * @returns {SVG.Defs} The document's defs element for defining reusable elements
   */
  defs: function () {
    return this.doc().defs();
  }
});

SVG.extend(SVG.Element, {
  /**
   * Gets all sibling elements of this element
   * @returns {Array<SVG.Element>} Array of sibling elements
   */
  siblings: function () {
    return this.parent.children();
  },

  /**
   * Gets the position of this element among its siblings
   * @returns {number} Zero-based index of the element in its parent's children
   */
  position: function () {
    return this.siblings().indexOf(this);
  },

  /**
   * Gets the next sibling element
   * @returns {SVG.Element|undefined} The next sibling element or undefined if none
   */
  next: function () {
    return this.siblings()[this.position() + 1];
  },

  /**
   * Gets the previous sibling element
   * @returns {SVG.Element|undefined} The previous sibling element or undefined if none
   */
  previous: function () {
    return this.siblings()[this.position() - 1];
  },

  /**
   * Moves the element one position forward in its parent's children
   * @returns {SVG.Element} The element itself for method chaining
   */
  forward: function () {
    return this.parent.remove(this).put(this, this.position() + 1);
  },

  /**
   * Moves the element one position backward in its parent's children
   * @returns {SVG.Element} The element itself for method chaining
   */
  backward: function () {
    let position;
    this.parent.level();
    position = this.position();

    if (position > 1) {
      this.parent.remove(this).add(this, position - 1);
    }

    return this;
  },

  /**
   * Brings the element to the front (as the last child of its parent)
   * @returns {SVG.Element} The element itself for method chaining
   */
  front: function () {
    return this.parent.remove(this).put(this);
  },

  /**
   * Sends the element to the back (as the first child of its parent)
   * @returns {SVG.Element} The element itself for method chaining
   */
  back: function () {
    this.parent.level();

    if (this.position() > 1) {
      this.parent.remove(this).add(this, 0);
    }

    return this;
  }
});

/**
 * SVG Definitions constructor
 * Creates a container for definitions (gradients, patterns, etc.) that can be referenced elsewhere
 * @returns {SVG.Defs} A new SVG definitions container
 */
SVG.Defs = function () {
  this.constructor.call(this, SVG.create("defs"));
};

SVG.Defs.prototype = new SVG.Container();

/**
 * SVG Mask constructor
 * Creates a mask element that can be used to hide parts of other elements
 * @returns {SVG.Mask} A new SVG mask element
 */
SVG.Mask = function () {
  this.constructor.call(this, SVG.create("mask"));
  this.attr("id", (this.id = "svgjs_element_" + SVG.did++));
};

SVG.Mask.prototype = new SVG.Container();

SVG.extend(SVG.Element, {
  /**
   * Applies a mask to this element
   * @param {SVG.Element|SVG.Mask} maskElement - The mask element or an element to be converted to a mask
   * @returns {SVG.Element} The element itself for method chaining
   */
  maskWith: function (maskElement) {
    // If maskElement isn't already a mask, add it to a new mask
    this.mask = maskElement instanceof SVG.Mask
      ? maskElement
      : this.parent.mask().add(maskElement);

    // Apply the mask using its ID
    return this.attr("mask", "url(#" + this.mask.id + ")");
  }
});

/**
 * SVG Pattern constructor
 * Creates a pattern element for repeatable fills in shapes
 * @returns {SVG.Pattern} A new SVG pattern element
 */
SVG.Pattern = function () {
  this.constructor.call(this, SVG.create("pattern"));
  this.attr("id", (this.id = "svgjs_element_" + SVG.did++));
};

SVG.Pattern.prototype = new SVG.Container();

SVG.extend(SVG.Pattern, {
  /**
   * Returns a URL reference to this pattern for use in fill attributes
   * @returns {string} URL reference string to this pattern
   */
  fill: function () {
    return "url(#" + this.id + ")";
  }
});

SVG.extend(SVG.Defs, {
  /**
   * Creates a new pattern in the defs section
   * @param {number} width - Width of the pattern
   * @param {number} height - Height of the pattern
   * @param {Function} configurator - Callback function to configure the pattern
   * @returns {SVG.Pattern} The newly created pattern
   */
  pattern: function (width, height, configurator) {
    var pattern = this.put(new SVG.Pattern());

    // Configure the pattern through the provided function
    configurator(pattern);

    // Set standard pattern attributes
    pattern.attr({
      x: 0,
      y: 0,
      width: width,
      height: height,
      patternUnits: "userSpaceOnUse"
    });

    return pattern;
  }
});

/**
 * SVG Gradient constructor
 * Creates a gradient element (linear or radial) for gradient fills
 * @param {string} gradientType - Type of gradient ('linear' or 'radial')
 * @returns {SVG.Gradient} A new SVG gradient element
 */
SVG.Gradient = function (gradientType) {
  this.constructor.call(this, SVG.create(gradientType + "Gradient"));
  this.attr("id", (this.id = "svgjs_element_" + SVG.did++));
  this.type = gradientType;
};

/**
 * Set up inheritance for Gradient from Container
 * This establishes the prototype chain for gradients
 */
SVG.Gradient.prototype = new SVG.Container();

SVG.extend(SVG.Gradient, {
  /**
   * Sets the starting point for the gradient
   * @param {number} xPercent - X coordinate in percent for gradient start
   * @param {number} yPercent - Y coordinate in percent for gradient start
   * @returns {SVG.Gradient} The gradient element for method chaining
   */
  from: function (xPercent, yPercent) {
    return "radial" == this.type
      ? this.attr({
        fx: xPercent + "%",
        fy: yPercent + "%",
      })
      : this.attr({
        x1: xPercent + "%",
        y1: yPercent + "%",
      });
  },

  /**
   * Sets the ending point for the gradient
   * @param {number} xPercent - X coordinate in percent for gradient end
   * @param {number} yPercent - Y coordinate in percent for gradient end
   * @returns {SVG.Gradient} The gradient element for method chaining
   */
  to: function (xPercent, yPercent) {
    return "radial" == this.type
      ? this.attr({
        cx: xPercent + "%",
        cy: yPercent + "%",
      })
      : this.attr({
        x2: xPercent + "%",
        y2: yPercent + "%",
      });
  },

  /**
   * Sets the radius for a radial gradient
   * @param {number} radiusPercent - Radius size in percent
   * @returns {SVG.Gradient} The gradient element for method chaining
   */
  radius: function (radiusPercent) {
    return "radial" == this.type
      ? this.attr({
        r: radiusPercent + "%",
      })
      : this;
  },

  /**
   * Creates and adds a color stop to the gradient
   * @param {Object} stopOptions - Options for the gradient stop including offset and color
   * @returns {SVG.Stop} The newly created stop element
   */
  at: function (stopOptions) {
    return this.put(new SVG.Stop(stopOptions));
  },

  /**
   * Updates the gradient by removing all stops and redefining them
   * @param {Function} configurator - Callback function that configures the gradient
   * @returns {SVG.Gradient} The gradient element for method chaining
   */
  update: function (configurator) {
    // Remove all child nodes (stops)
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }

    // Call the configurator function to set up new stops
    configurator(this);
    return this;
  },

  /**
   * Returns a URL reference to this gradient for use in fill attributes
   * @returns {string} URL reference string to this gradient
   */
  fill: function () {
    return "url(#" + this.id + ")";
  },
});

SVG.extend(SVG.Defs, {
  /**
   * Creates a new gradient in the defs section
   * @param {string} gradientType - Type of gradient ('linear' or 'radial')
   * @param {Function} configurator - Callback function to configure the gradient
   * @returns {SVG.Gradient} The newly created gradient
   */
  gradient: function (gradientType, configurator) {
    var gradient = this.put(new SVG.Gradient(gradientType));
    configurator(gradient);
    return gradient;
  },
});

/**
 * SVG Stop constructor
 * Creates a color stop element for use in gradients
 * @param {Object} stopOptions - Options for the gradient stop
 * @returns {SVG.Stop} A new SVG stop element
 */
SVG.Stop = function (stopOptions) {
  this.constructor.call(this, SVG.create("stop"));
  this.update(stopOptions);
};

SVG.Stop.prototype = new SVG.Element();

SVG.extend(SVG.Stop, {
  /**
   * Updates the properties of this stop element
   * @param {Object} stopOptions - Options including offset, opacity, and color
   * @returns {SVG.Stop} The stop element for method chaining
   */
  update: function (stopOptions) {
    var index,
      styleString = "",
      styleProps = ["opacity", "color"];

    // Build the style string from available properties
    for (index = styleProps.length - 1; index >= 0; index--) {
      if (stopOptions[styleProps[index]] != null) {
        styleString += "stop-" + styleProps[index] + ":" + stopOptions[styleProps[index]] + ";";
      }
    }

    // Set attributes for the stop
    return this.attr({
      offset: (stopOptions.offset != null ? stopOptions.offset : this.attrs.offset || 0) + "%",
      style: styleString,
    });
  },
});

/**
 * SVG Document constructor
 * Creates the main SVG document/drawing surface in the specified container
 * @param {string|HTMLElement} container - The container element ID or DOM element
 * @returns {SVG.Doc} A new SVG document instance
 */
SVG.Doc = function (container) {
  this.constructor.call(this, SVG.create("svg"));
  this.parent = typeof container == "string" ? document.getElementById(container) : container;

  // Set standard SVG attributes
  this.attr({
    xmlns: SVG.ns,
    version: "1.1",
    width: "100%",
    height: "100%"
  })
    .attr("xmlns:xlink", SVG.xlink)
    .attr("xlink", SVG.xlink, SVG.ns)
    .defs();

  // Initialize the stage
  this.stage();
};

/**
 * Inherit from SVG.Container for document functionality
 */
SVG.Doc.prototype = new SVG.Container();

/**
 * Sets up the SVG document staging environment
 *
 * This method prepares the SVG document by creating a proper container structure,
 * setting appropriate styles, and handling document readiness. It ensures the SVG
 * element is properly positioned and rendered within its parent container.
 *
 * @returns {SVG.Doc} The document instance for method chaining
 */
SVG.Doc.prototype.stage = function () {
  const parentElement = this.parent;
  const containerDiv = document.createElement("div");

  // Set the container style to be a relative positioned full-height element
  containerDiv.style.cssText = "position:relative;height:100%;";

  // Append the container to the parent element or create a new parent if needed
  if (parentElement) {
    parentElement.appendChild(containerDiv);
  } else {
    this.parent = document.createElement("div");
    this.parent.appendChild(containerDiv);
  }

  // Add the SVG node to the container
  containerDiv.appendChild(this.node);

  /**
   * Handles the document ready state and finalizes SVG positioning
   * Ensures proper rendering once the document is fully loaded
   */
  const handleReadyState = () => {
    if (document.readyState === "complete") {
      // Initially set absolute positioning for SVG element
      this.attr("style", "position:absolute;overflow:hidden;");

      // Use a timeout to change positioning and re-append the node for proper rendering
      setTimeout(() => {
        this.attr("style", "position:relative;overflow:hidden;");
        try {
          // Reconstruct the DOM structure to ensure proper rendering
          parentElement.removeChild(this.node.parentNode);
          this.node.parentNode.removeChild(this.node);
          parentElement.appendChild(this.node);
        } catch (error) {
          // Log any DOM manipulation errors
          console.error(error);
        }
      }, 5);
    } else {
      // If document not ready yet, check again soon
      setTimeout(handleReadyState, 10);
    }
  };

  // Start the ready state checking process
  handleReadyState();

  return this;
};

/**
 * SVG Shape constructor
 * Base class for all SVG shape elements like rectangles, circles, etc.
 *
 * @param {SVGElement} element - The SVG DOM element to associate with this shape
 * @returns {SVG.Shape} A new SVG shape instance
 */
SVG.Shape = function (element) {
  this.constructor.call(this, element);
};

/**
 * Establishes prototype inheritance for SVG Shape
 *
 * This sets up the inheritance chain so that SVG.Shape inherits all properties and methods
 * from SVG.Element, creating the proper object hierarchy for all SVG shape elements.
 * Basic shapes like rectangles, circles, and paths need this inheritance to gain access to
 * all element functionality while adding their own specialized shape-specific methods.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Shape is set to be an instance of Element, allowing shapes
 * to use Element methods like attr(), transform(), etc.
 */
SVG.Shape.prototype = new SVG.Element();

/**
 * SVG Wrap constructor
 * Creates a wrapper group (g) element that contains another SVG element
 * Used primarily for transformations and complex shape manipulations
 *
 * @param {SVG.Element} childElement - The SVG element to wrap
 * @returns {SVG.Wrap} A new SVG wrap instance containing the child element
 */
SVG.Wrap = function (childElement) {
  this.constructor.call(this, SVG.create("g"));
  this.node.insertBefore(childElement.node, null);
  this.child = childElement;
  this.type = childElement.node.nodeName;
};

/**
 * Establishes prototype inheritance for SVG Wrap
 *
 * This sets up the inheritance chain so that SVG.Wrap inherits all properties and methods
 * from SVG.Shape, creating the proper object hierarchy for the SVG wrapper elements.
 *
 * Wrapper elements are special container elements that wrap around other SVG elements
 * to provide additional functionality like complex transformations, grouping, and
 * simplified manipulation of nested structures.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Wrap is set to be an instance of Shape, allowing wrapped elements
 * to use Shape methods while adding their own specialized wrapper functionality.
 */
SVG.Wrap.prototype = new SVG.Shape();

SVG.extend(SVG.Wrap, {
  /**
   * Moves the wrapped element to a specific position using transformation
   * @param {number} x - The x-coordinate to move to
   * @param {number} y - The y-coordinate to move to
   * @returns {SVG.Wrap} The wrap element for method chaining
   */
  move: function (x, y) {
    return this.transform({
      x: x,
      y: y,
    });
  },

  /**
   * Resizes the wrapped element by applying scale transformations
   * @param {number} width - The target width to scale to
   * @param {number} height - The optional target height (if not specified, maintains aspect ratio)
   * @returns {SVG.Wrap} The wrap element for method chaining
   */
  size: function (width, height) {
    var scaleFactorX = width / this._b.width;
    return (
      this.child.transform({
        scaleX: scaleFactorX,
        scaleY: height != null ? height / this._b.height : scaleFactorX,
      }),
      this
    );
  },

  /**
   * Centers the wrapped element at specific coordinates, accounting for its scaled dimensions
   * @param {number} x - The x-coordinate of the center point
   * @param {number} y - The y-coordinate of the center point
   * @returns {SVG.Wrap} The wrap element for method chaining
   */
  center: function (x, y) {
    return this.move(
      x + (this._b.width * this.child.trans.scaleX) / -2,
      y + (this._b.height * this.child.trans.scaleY) / -2
    );
  },

  /**
   * Gets or sets attributes on the wrapped element or its child
   * @param {string|Object} name - The attribute name or an object with attribute key-value pairs
   * @param {*} [value] - The value to set for the attribute (if name is a string)
   * @param {string} [namespace] - The namespace for the attribute
   * @returns {SVG.Wrap|*} The wrap element for method chaining or the attribute value when getting
   */
  attr: function (name, value, namespace) {
    if ("object" == typeof name) {
      for (var key in name) {
        this.attr(key, name[key]);
      }
    } else {
      if (arguments.length < 2)
        return "transform" == name ? this.attrs[name] : this.child.attrs[name];

      if ("transform" == name) {
        this.attrs[name] = value;
        namespace != null
          ? this.node.setAttributeNS(namespace, name, value)
          : this.node.setAttribute(name, value);
      } else {
        this.child.attr(name, value, namespace);
      }
    }
    return this;
  },

  /**
   * Sets the plot points for the child element and adjusts transformations
   * @param {string} points - The points string for plotting (path data or point coordinates)
   * @returns {SVG.Wrap} The wrap element for method chaining
   */
  plot: function (points) {
    this.child.plot(points);
    this._b = this.child.bbox();
    this.child.transform({
      x: -this._b.x,
      y: -this._b.y,
    });
    return this;
  },
});

/**
 * SVG Rectangle constructor
 * Creates a new SVG rectangle element
 * @returns {SVG.Rect} A new SVG rectangle instance
 */
SVG.Rect = function () {
  this.constructor.call(this, SVG.create("rect"));
};

/**
 * Establishes prototype inheritance for SVG Rectangle
 *
 * This sets up the inheritance chain so that SVG.Rect inherits all properties and methods
 * from SVG.Shape, creating the proper object hierarchy for rectangle elements in the SVG system.
 * Rectangle elements need this inheritance to gain access to all basic shape functionality while
 * adding their own specialized rectangle-specific methods.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Rectangle is set to be an instance of Shape, allowing rectangles
 * to use Shape methods like attr(), transform(), etc.
 */
SVG.Rect.prototype = new SVG.Shape();

/**
 * Extends the SVG Rectangle prototype with rectangle-specific methods
 */
SVG.extend(SVG.Rect, {
  /**
   * Moves the rectangle to a specific position by setting its x and y attributes
   * @param {number} xPosition - The x-coordinate to move to
   * @param {number} yPosition - The y-coordinate to move to
   * @returns {SVG.Rect} The rectangle element for method chaining
   */
  move: function (xPosition, yPosition) {
    return this.attr({
      x: xPosition,
      y: yPosition
    });
  },

  /**
   * Sets the size of the rectangle
   * @param {number} width - The width to set
   * @param {number} height - The height to set
   * @returns {SVG.Rect} The rectangle element for method chaining
   */
  size: function (width, height) {
    return this.attr({
      width: width,
      height: height
    });
  },

  /**
   * Centers the rectangle at a specific position by calculating offsets
   * @param {number} xCenter - The x-coordinate of the center point
   * @param {number} yCenter - The y-coordinate of the center point
   * @returns {SVG.Rect} The rectangle element for method chaining
   */
  center: function (xCenter, yCenter) {
    return this.move(
      xCenter - this.attr('width') / 2,
      yCenter - this.attr('height') / 2
    );
  }
});

/**
 * SVG Ellipse constructor
 * Creates a new SVG ellipse element
 * @returns {SVG.Ellipse} A new SVG ellipse instance
 */
SVG.Ellipse = function () {
  this.constructor.call(this, SVG.create("ellipse"));
};

/**
 * Establishes prototype inheritance for SVG Ellipse
 *
 * This sets up the inheritance chain so that SVG.Ellipse inherits all properties and methods
 * from SVG.Shape, creating the proper object hierarchy for ellipse elements in the SVG system.
 * Ellipse elements need this inheritance to gain access to all basic shape functionality while
 * adding their own specialized ellipse-specific methods.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Ellipse is set to be an instance of Shape, allowing ellipses
 * to use Shape methods like attr(), transform(), etc.
 */
SVG.Ellipse.prototype = new SVG.Shape();

SVG.extend(SVG.Ellipse, {
  /**
   * Moves the ellipse to a specific position by setting its x and y attributes
   * @param {number} xPosition - The x-coordinate to move to
   * @param {number} yPosition - The y-coordinate to move to
   * @returns {SVG.Ellipse} The ellipse element for method chaining
   */
  move: function (xPosition, yPosition) {
    this.attrs.x = xPosition;
    this.attrs.y = yPosition;
    return this.center();
  },

  /**
   * Sets the size of the ellipse by adjusting its radius values
   * @param {number} width - The width of the ellipse
   * @param {number} [height] - The height of the ellipse (defaults to width if not specified)
   * @returns {SVG.Ellipse} The ellipse element for method chaining
   */
  size: function (width, height) {
    return this.attr({
      rx: width / 2,
      ry: (height != null ? height : width) / 2
    }).center();
  },

  /**
   * Centers the ellipse at a specific position or at its current position based on attributes
   * @param {number} [xCenter] - The x-coordinate of the center point
   * @param {number} [yCenter] - The y-coordinate of the center point
   * @returns {SVG.Ellipse} The ellipse element for method chaining
   */
  center: function (xCenter, yCenter) {
    return this.attr({
      cx: xCenter || (this.attrs.x || 0) + (this.attrs.rx || 0),
      cy: yCenter || (this.attrs.y || 0) + (this.attrs.ry || 0)
    });
  }
});

/**
 * SVG Line constructor
 * Creates a new SVG line element
 * @returns {SVG.Line} A new SVG line instance
 */
SVG.Line = function () {
  this.constructor.call(this, SVG.create("line"));
};

/**
 * Establishes prototype inheritance for SVG Line
 *
 * This sets up the inheritance chain so that SVG.Line inherits all properties and methods
 * from SVG.Shape, creating the proper object hierarchy for line elements in the SVG system.
 * Line elements need this inheritance to gain access to all basic shape functionality while
 * adding their own specialized line-specific methods.
 *
 * The inheritance pattern used here follows JavaScript's prototype-based inheritance model,
 * where the prototype of Line is set to be an instance of Shape, allowing lines
 * to use Shape methods like attr(), transform(), etc.
 */
SVG.Line.prototype = new SVG.Shape();

SVG.extend(SVG.Line, {
  /**
   * Moves the line to a specified position by adjusting all coordinates
   * This method translates the entire line by calculating the difference between
   * the current position and the new position, then updating all points accordingly.
   *
   * @param {number} x - The x-coordinate to move to
   * @param {number} y - The y-coordinate to move to
   * @returns {SVG.Line} The line element for method chaining
   */
  move: function (x, y) {
    var boundingBox = this.bbox();
    return this.attr({
      x1: this.attr("x1") - boundingBox.x + x,
      y1: this.attr("y1") - boundingBox.y + y,
      x2: this.attr("x2") - boundingBox.x + x,
      y2: this.attr("y2") - boundingBox.y + y
    });
  },

  /**
   * Centers the line at a specified position by calculating and applying offsets
   * This method positions the line so its center point aligns with the specified coordinates,
   * adjusting for the line's width and height.
   *
   * @param {number} x - The x-coordinate of the center point
   * @param {number} y - The y-coordinate of the center point
   * @returns {SVG.Line} The line element for method chaining
   */
  center: function (x, y) {
    var boundingBox = this.bbox();
    return this.move(x - boundingBox.width / 2, y - boundingBox.height / 2);
  },

  /**
   * Resizes the line to the specified dimensions by adjusting its endpoints
   * This method keeps the starting point fixed and moves the ending point
   * to achieve the desired width and height.
   *
   * @param {number} width - The target width for the line
   * @param {number} height - The target height for the line
   * @returns {SVG.Line} The line element for method chaining
   */
  size: function (width, height) {
    var boundingBox = this.bbox();

    // Determine which endpoint to move based on line direction
    this.attr(this.attr("x1") < this.attr("x2") ? "x2" : "x1", boundingBox.x + width);
    this.attr(this.attr("y1") < this.attr("y2") ? "y2" : "y1", boundingBox.y + height);

    return this;
  }
});

/**
 * Extends SVG.Container with methods for creating line elements
 */
SVG.extend(SVG.Container, {
  /**
   * Creates and returns a new line element within this container
   * @param {number} x1 - The x-coordinate of the starting point
   * @param {number} y1 - The y-coordinate of the starting point
   * @param {number} x2 - The x-coordinate of the ending point
   * @param {number} y2 - The y-coordinate of the ending point
   * @returns {SVG.Line} The new line element
   */
  line: function (x1, y1, x2, y2) {
    return this.put(
      new SVG.Line().attr({
        x1: x1,
        y1: y1,
        x2: x2,
        y2: y2,
      })
    );
  },
});

/**
 * SVG.Poly is a shared interface for polygon and polyline elements
 * Provides common methods for both types of poly elements
 */
SVG.Poly = {
  /**
   * Sets the points for a polygon or polyline element
   * @param {string} pointsString - SVG points string (e.g. "0,0 10,10 20,0")
   * @returns {SVG.Polygon|SVG.Polyline} The poly element for method chaining
   */
  plot: function (pointsString) {
    return this.attr("points", pointsString || "0,0"), this;
  },
};

/**
 * SVG Polyline constructor
 * Creates a new SVG polyline element for open multi-point shapes
 * @returns {SVG.Polyline} A new SVG polyline instance
 */
SVG.Polyline = function () {
  this.constructor.call(this, SVG.create("polyline"));
};

/**
 * Establishes prototype inheritance for SVG Polyline
 */
SVG.Polyline.prototype = new SVG.Shape();

/**
 * Extends SVG.Polyline with the Poly interface
 */
SVG.extend(SVG.Polyline, SVG.Poly);

/**
 * SVG Polygon constructor
 * Creates a new SVG polygon element for closed multi-point shapes
 * @returns {SVG.Polygon} A new SVG polygon instance
 */
SVG.Polygon = function () {
  this.constructor.call(this, SVG.create("polygon"));
};

/**
 * Establishes prototype inheritance for SVG Polygon
 */
SVG.Polygon.prototype = new SVG.Shape();

/**
 * Extends SVG.Polygon with the Poly interface
 */
SVG.extend(SVG.Polygon, SVG.Poly);

/**
 * SVG Path constructor
 * Creates a new SVG path element for complex shapes
 * @returns {SVG.Path} A new SVG path instance
 */
SVG.Path = function () {
  this.constructor.call(this, SVG.create("path"));
};

/**
 * Establishes prototype inheritance for SVG Path
 */
SVG.Path.prototype = new SVG.Shape();

/**
 * Extends SVG.Path with path-specific methods
 */
SVG.extend(SVG.Path, {
  /**
   * Moves the path to a specific position using transformation
   * @param {number} xPosition - The x-coordinate to move to
   * @param {number} yPosition - The y-coordinate to move to
   * @returns {SVG.Path} The path element for method chaining
   */
  move: function (xPosition, yPosition) {
    this.transform({
      x: xPosition,
      y: yPosition,
    });
  },

  /**
   * Sets the path data that defines the shape of the path
   * @param {string} pathData - SVG path data string (e.g. "M0,0 L10,10 Z")
   * @returns {SVG.Path} The path element for method chaining
   */
  plot: function (pathData) {
    return this.attr("d", pathData || "M0,0");
  },
});

/**
 * SVG Image constructor
 * Creates a new SVG image element for embedding raster images within SVG documents
 *
 * @returns {SVG.Image} A new SVG image instance
 */
SVG.Image = function () {
  this.constructor.call(this, SVG.create("image"));
};

/**
 * Establishes prototype inheritance for SVG Image
 * This sets up the inheritance chain so that SVG.Image inherits all properties
 * and methods from SVG.Shape, enabling image elements to have shape functionality
 */
SVG.Image.prototype = new SVG.Shape();

SVG.extend(SVG.Image, {
  /**
   * Loads an image from the specified URL by setting the xlink:href attribute
   *
   * This method stores the source URL and sets the appropriate attribute to make
   * the browser load the image. It uses the SVG xlink namespace which is required
   * for proper image referencing in SVG documents.
   *
   * @param {string} imageUrl - URL of the image to load
   * @returns {SVG.Image} The image element for method chaining
   */
  load: function (imageUrl) {
    this.src = imageUrl;
    return imageUrl ? this.attr("xlink:href", imageUrl, SVG.xlink) : this;
  }
});

/**
 * Array of font properties that can be set on text elements
 * Used to build CSS style strings for text rendering
 * @type {string[]}
 */
var fontProperties = ["size", "family", "weight", "stretch", "variant", "style"];

/**
 * SVG Text Span constructor
 * Creates a new SVG tspan element that can be used within text elements
 * @constructor
 * @returns {SVG.TSpan} A new SVG tspan instance
 */
function SVGTSpan() {
  this.constructor.call(this, SVG.create("tspan"));
}

/**
 * SVG Text constructor
 * Creates a new SVG text element with default styling
 * @constructor
 * @returns {SVG.Text} A new SVG text instance
 */
SVG.Text = function () {
  this.constructor.call(this, SVG.create("text"));

  // Set default text styling properties
  this.style = {
    "font-size": 16,
    "font-family": "Helvetica",
    "text-anchor": "start"
  };

  // Set default line height multiplier
  this.leading = 1.2;
};

/**
 * Establish prototype inheritance for SVG.Text from SVG.Shape
 */
SVG.Text.prototype = new SVG.Shape();

SVG.extend(SVG.Text, {
  /**
   * Sets the text content of this element and renders it
   * Splits multi-line text into separate tspan elements and applies styling
   *
   * @param {string} content - The text content to set (defaults to "text" if not provided)
   * @returns {SVG.Text} The text element itself for method chaining
   */
  text: function (content) {
    // Set default content and initialize lines array
    this.content = content = content || "text";
    this.lines = [];

    // Get the document and calculate styling
    var styleString = this._style();
    var doc = this.doc();
    var textLines = content.split("\n");
    var fontSize = this.style["font-size"];

    // Remove any existing child nodes
    while (this.node.hasChildNodes()) {
      this.node.removeChild(this.node.lastChild);
    }

    // Create tspan elements for each line of text
    for (var i = 0, numLines = textLines.length; i < numLines; i++) {
      // Create a new tspan with proper positioning and styling
      var tspan = new SVGTSpan().text(textLines[i]).attr({
        // Position subsequent lines with proper leading
        dy: fontSize * this.leading - (i === 0 ? 0.3 * fontSize : 0),
        x: this.attrs.x || 0,
        style: styleString
      });

      // Add the tspan to the text element
      this.node.appendChild(tspan.node);
      this.lines.push(tspan);
    }

    return this.attr("style", styleString);
  },

  /**
   * Generates a CSS style string from the element's font properties
   * Used internally to apply consistent styling to text and tspan elements
   *
   * @private
   * @returns {string} A CSS style string containing font properties
   */
  _style: function () {
    var styleString = "";

    // Add all font properties to the style string
    for (var i = fontProperties.length - 1; i >= 0; i--) {
      var property = fontProperties[i];
      if (this.style["font-" + property] != null) {
        styleString += "font-" + property + ":" + this.style["font-" + property] + ";";
      }
    }

    // Add text anchor property
    styleString += "text-anchor:" + this.style["text-anchor"] + ";";

    return styleString;
  }
});

/**
 * Establish prototype inheritance for SVG.TSpan from SVG.Shape
 */
SVGTSpan.prototype = new SVG.Shape();

SVG.extend(SVGTSpan, {
  /**
   * Sets the text content of this tspan element
   * Adds a text node to the tspan element with the specified content
   *
   * @param {string} content - The text content to set
   * @returns {SVG.TSpan} The tspan element itself for method chaining
   */
  text: function (content) {
    this.node.appendChild(document.createTextNode(content));
    return this;
  }
});

/**
 * SVG Nested constructor
 * Creates a new nested SVG element within an SVG document that can contain other SVG elements
 * Nested SVG elements allow for isolated coordinate systems and viewports within a parent SVG
 * @returns {SVG.Nested} A new SVG nested element instance with visible overflow
 */
SVG.Nested = function () {
  this.constructor.call(this, SVG.create("svg"));
  this.attr("overflow", "visible");
};

/**
 * Establishes prototype inheritance for SVG Nested
 * This sets up the inheritance chain so that SVG.Nested inherits all properties and methods
 * from SVG.Container, enabling nested SVG elements to function as containers for other elements
 */
SVG.Nested.prototype = new SVG.Container();

/**
 * Array of stroke attributes that can be applied to shapes
 * These properties control the appearance of shape outlines and are used by the stroke method
 * to handle property-specific styling through a simplified API
 * @type {Array<string>}
 */
SVG._stroke = [
  "color",
  "width",
  "opacity",
  "linecap",
  "linejoin",
  "miterlimit",
  "dasharray",
  "dashoffset",
];

/**
 * Array of fill attributes that can be applied to shapes
 * These properties control the interior appearance of shapes and are used by the fill method
 * to handle property-specific styling through a simplified API
 * @type {Array<string>}
 */
SVG._fill = ["color", "opacity", "rule"];

/**
 * Formats attribute names for fill and stroke properties
 *
 * This helper function determines the correct attribute name format based on the property type.
 * For the "color" property, it returns just the base attribute name (e.g., "fill" or "stroke").
 * For other properties, it combines the base name with the property name using a hyphen
 * (e.g., "fill-opacity", "stroke-width").
 *
 * @param {string} baseAttribute - The base attribute name ("fill" or "stroke")
 * @param {string} propertyName - The specific property name (e.g., "color", "opacity", "width")
 * @returns {string} The properly formatted attribute name
 * @private
 */
var formatAttributeName = function (baseAttribute, propertyName) {
  return propertyName === "color" ? baseAttribute : baseAttribute + "-" + propertyName;
};

/**
 * Add fill and stroke manipulation methods to SVG Shape elements
 *
 * This code extends SVG.Shape.prototype with fill() and stroke() methods that provide
 * a convenient way to set multiple fill/stroke related attributes with a single method call.
 * Each method accepts either a string (for simple color setting) or an object containing
 * multiple properties to apply simultaneously.
 */
["fill", "stroke"].forEach(function (attributeType) {
  /**
   * Sets fill or stroke attributes on an SVG shape element
   *
   * This method provides a flexible interface for styling shape elements:
   * - When passed a string, it sets the fill/stroke color directly
   * - When passed an object, it sets multiple related properties at once (color, opacity, width, etc.)
   *
   * @param {string|Object} value - Either a color string or an object with style properties
   * @returns {SVG.Shape} The shape element itself for method chaining
   * @example
   * // Set fill color directly
   * rect.fill("#f06");
   * // Set multiple fill properties
   * rect.fill({ color: "#f06", opacity: 0.5, rule: "evenodd" });
   * // Set stroke color directly
   * rect.stroke("#000");
   * // Set multiple stroke properties
   * rect.stroke({ color: "#000", width: 2, linecap: "round" });
   */
  SVG.Shape.prototype[attributeType] = function (value) {
    var propertyIndex;

    if (typeof value === "string") {
      // Simple case: set the color directly
      this.attr(attributeType, value);
    } else {
      // Complex case: set multiple properties from the provided object
      var propertyList = SVG["_" + attributeType];

      // Iterate through the possible properties for this attribute type
      for (propertyIndex = propertyList.length - 1; propertyIndex >= 0; propertyIndex--) {
        var propertyName = propertyList[propertyIndex];

        // Only set attributes for properties that are defined in the value object
        if (value[propertyName] != null) {
          this.attr(
            formatAttributeName(attributeType, propertyName),
            value[propertyName]
          );
        }
      }
    }

    return this;
  };
});

/**
 * Extends SVG.Element and SVG.FX prototypes with transformation methods
 *
 * This adds several convenience methods for common transformations to both
 * basic SVG elements and animation controllers, allowing for easier manipulation
 * of graphical properties through a consistent API.
 */
[SVG.Element, SVG.FX].forEach(function (constructor) {
  if (constructor) {
    SVG.extend(constructor, {
      /**
       * Applies a rotation transformation to the element
       * @param {number} angle - Rotation angle in degrees
       * @returns {SVG.Element|SVG.FX} The element or animation controller for chaining
       */
      rotate: function (angle) {
        return this.transform({
          rotation: angle || 0
        });
      },

      /**
       * Applies skew transformations along X and Y axes
       * @param {number} skewX - Horizontal skew angle in degrees
       * @param {number} skewY - Vertical skew angle in degrees
       * @returns {SVG.Element|SVG.FX} The element or animation controller for chaining
       */
      skew: function (skewX, skewY) {
        return this.transform({
          skewX: skewX || 0,
          skewY: skewY || 0
        });
      },

      /**
       * Applies scaling transformations to resize the element
       * @param {number} scaleX - Horizontal scaling factor
       * @param {number} [scaleY] - Vertical scaling factor (uses scaleX if not specified)
       * @returns {SVG.Element|SVG.FX} The element or animation controller for chaining
       */
      scale: function (scaleX, scaleY) {
        return this.transform({
          scaleX: scaleX,
          scaleY: scaleY == null ? scaleX : scaleY
        });
      },

      /**
       * Sets the opacity level of the element
       * @param {number} opacityValue - Opacity value between 0 (transparent) and 1 (opaque)
       * @returns {SVG.Element|SVG.FX} The element or animation controller for chaining
       */
      opacity: function (opacityValue) {
        return this.attr("opacity", opacityValue);
      }
    });
  }
});

/**
 * Extends SVG Group element with additional movement capability
 * Allows for direct movement of group elements using transform
 * This provides a consistent movement API across different SVG element types
 */
SVG.G &&
  SVG.extend(SVG.G, {
    /**
     * Moves the group element to a specific position using transformation
     * Unlike shape elements that can directly modify x/y attributes, groups
     * must use transforms to change position
     *
     * @param {number} xPosition - The x-coordinate to move to
     * @param {number} yPosition - The y-coordinate to move to
     * @returns {SVG.G} The group element for method chaining
     */
    move: function (xPosition, yPosition) {
      return this.transform({
        x: xPosition,
        y: yPosition,
      });
    },
  });

/**
 * Extends SVG Text element with enhanced font styling capabilities
 * Provides a simplified interface for setting multiple font properties at once
 */
SVG.Text &&
  SVG.extend(SVG.Text, {
    /**
     * Sets multiple font properties on the text element with a single method call
     * Handles special cases like text anchoring and line leading while mapping
     * standard font properties to their SVG attribute equivalents
     *
     * @param {Object} fontOptions - Object containing font properties to set
     * @param {string} [fontOptions.family] - Font family name
     * @param {number} [fontOptions.size] - Font size
     * @param {string} [fontOptions.weight] - Font weight (normal, bold, etc)
     * @param {string} [fontOptions.style] - Font style (normal, italic, etc)
     * @param {string} [fontOptions.anchor] - Text anchor position (start, middle, end)
     * @param {number} [fontOptions.leading] - Line height multiplier
     * @returns {SVG.Text} The text element for method chaining
     */
    font: function (fontOptions) {
      var propertyName,
        attributes = {};

      for (propertyName in fontOptions) {
        if (propertyName === "leading") {
          // Handle special leading property
          attributes[propertyName] = fontOptions[propertyName];
        } else if (propertyName === "anchor") {
          // Map anchor to text-anchor attribute
          attributes["text-anchor"] = fontOptions[propertyName];
        } else if (fontProperties.indexOf(propertyName) > -1) {
          // Map standard font properties to their SVG attribute names
          attributes["font-" + propertyName] = fontOptions[propertyName];
        }
      }

      // Apply all attributes and refresh the text content
      return this.attr(attributes).text(this.content);
    },
  });

/**
 * Adds event handler methods to SVG elements for common mouse and touch events
 *
 * This code adds methods to SVG.Element.prototype that allow for easily attaching
 * event handlers to SVG elements. For each supported event type, a corresponding
 * method is created with the same name as the event. When called, these methods
 * attach the provided handler function to the element's native event handler.
 *
 * @example
 * // Add a click handler to a rectangle
 * rect.click(function(event) {
 *   console.log('Rectangle was clicked!', event);
 * });
 */
[
  "click",
  "dblclick",
  "mousedown",
  "mouseup",
  "mouseover",
  "mouseout",
  "mousemove",
  "mouseenter",
  "mouseleave",
  "touchstart",
  "touchend",
  "touchmove",
  "touchcancel",
].forEach(function (eventType) {
  /**
   * Attaches an event handler for the specified event type to this SVG element
   *
   * This method provides a convenient way to attach native DOM event handlers
   * to SVG elements. When the event occurs, the handler is called with the
   * SVG element as 'this' context and any event arguments passed through.
   *
   * @param {Function|null} eventHandler - The function to execute when the event occurs,
   *                                      or null to remove the event handler
   * @returns {SVG.Element} The element itself for method chaining
   */
  SVG.Element.prototype[eventType] = function (eventHandler) {
    const element = this;

    // Set or clear the event handler on the DOM node
    this.node["on" + eventType] =
      typeof eventHandler === "function"
        ? function () {
          return eventHandler.apply(element, arguments);
        }
        : null;

    return this;
  };
});

/*
extend(Element.prototype, {});
extend(Element, {
  t1: function () {
    console.log(
      `Hvac.SVG.js extend svg.js Element ${this.type.toString()}---------------------------------------`,
      this
    );
  },
  // data: function () {
  //   console.log("extend Element data", this);
  // },
});
*/
const T3Svg = SVG;

export default T3Svg;
