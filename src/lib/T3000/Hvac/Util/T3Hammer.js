(function (event, undefined) {

  /**
   * Creates a new Hammer instance for handling touch gestures
   * @param {HTMLElement} element - The DOM element to attach the touch handlers to
   * @param {Object} options - Configuration options for the Hammer instance
   * @returns {Hammer.Instance} A new Hammer instance for gesture recognition
   */
  var Hammer = function HammerConstructor(element, options) {
    return new HammerConstructor.Instance(element, options || {});
  };

  var drag = "drag";
  var isDragging = false;

  /**
   * Map of event type constants to actual DOM event names
   * Used to store the mapping between internal event type identifiers
   * and their corresponding DOM event strings for consistent event handling
   * across different pointer/touch input methods
   * @type {Object}
   */
  var eventTypeMap = {};

  /**
   * Constant representing downward direction for gesture recognition
   * Used to indicate movement from top to bottom in touch interactions
   * Referenced throughout the library for direction-specific handling of gestures
   * @type {string} -- o
   */
  var directionDown = (Hammer.DIRECTION_DOWN = "down");

  /**
   * Constant representing leftward direction for gesture recognition
   * Used to indicate movement from right to left in touch interactions
   * Referenced throughout the library for direction-specific handling of gestures
   * @type {string} -- r
   */
  var directionLeft = (Hammer.DIRECTION_LEFT = "left");

  /**
   * Constant representing upward direction for gesture recognition
   * Used to indicate movement from bottom to top in touch interactions
   * Referenced throughout the library for direction-specific handling of gestures
   * @type {string} -- a
   */
  var directionUp = (Hammer.DIRECTION_UP = "up");

  /**
   * Constant representing rightward direction for gesture recognition
   * Used to indicate movement from left to right in touch interactions
   * Referenced throughout the library for direction-specific handling of gestures
   * @type {string} -- s
   */
  var directionRight = (Hammer.DIRECTION_RIGHT = "right");

  /**
   * Constant representing mouse pointer type for gesture recognition
   * Used to identify mouse input events throughout the library
   * Referenced when determining pointer types and handling mouse-specific behaviors
   * @type {string} -- c
   */
  var pointerMouse = (Hammer.POINTER_MOUSE = "mouse");

  /**
   * Constant representing touch pointer type for gesture recognition
   * Used to identify touch input events throughout the library
   * Referenced when determining pointer types for touch-specific behaviors
   * @type {string} -- l
   */
  var pointerTouch = (Hammer.POINTER_TOUCH = "touch");

  /**
   * Constant representing pen/stylus pointer type for gesture recognition
   * Used to identify pen/stylus input events throughout the library
   * Referenced when determining pointer types and handling pen-specific behaviors
   * @type {string} -- u
   */
  var pointerPen = (Hammer.POINTER_PEN = "pen");

  /**
   * Constant representing the start of a touch interaction
   * Used to identify when a touch/pointer first contacts the surface
   * Triggers the beginning of gesture detection sequences
   * @type {string} -- p
   */
  var eventStart = (Hammer.EVENT_START = "start");

  /**
   * Constant representing movement during a touch interaction
   * Used to track ongoing touch/pointer movement across the surface
   * Essential for gesture recognition of drags, swipes, and transforms
   * @type {string} -- h
   */
  var eventMove = (Hammer.EVENT_MOVE = "move");

  /**
   * Constant representing the end of a touch interaction
   * Used to identify when a touch/pointer leaves the surface
   * Triggers completion of gesture detection sequences
   * @type {string} -- d
   */
  var eventEnd = (Hammer.EVENT_END = "end");

  /**
   * Constant representing release event for touch interactions
   * Used to identify when a specific touch point is released
   * Different from end which may still have active touch points
   * @type {string} -- m
   */
  var eventRelease = (Hammer.EVENT_RELEASE = "release");

  /**
   * Constant representing the initiation of touch contact
   * Used to identify the moment when touch is first detected
   * Occurs before gesture recognition begins processing
   * @type {string} -- f
   */
  var eventTouch = (Hammer.EVENT_TOUCH = "touch");

  /**
   * Default configuration options for Hammer instances
   * Controls touch behavior, selection, zooming, and other visual feedback during gesture detection
   */
  Hammer.defaults = {
    /**
     * Default behavior settings to apply to elements
     * These CSS properties help prevent unwanted browser behaviors during touch interactions
     */
    behavior: {
      /** Prevents text/element selection during gestures */
      userSelect: "none",

      /** Disables the callout that appears when you touch and hold on mobile devices */
      touchCallout: "none",

      /** Disables pinch-to-zoom functionality on the page */
      contentZooming: "none",

      /** Prevents native drag behavior on elements */
      userDrag: "none",

      /** Removes the highlight color that appears when tapping elements on mobile */
      tapHighlightColor: "rgba(0,0,0,0)"
    }
  };

  /**
   * Reference to the document object for DOM operations
   * Used throughout the library for attaching/detaching event handlers
   * and working with DOM elements
   */
  Hammer.DOCUMENT = document;

  /**
   * Time interval in milliseconds used for velocity calculations
   * Controls how frequently movement calculations are updated during gestures
   * Lower values increase accuracy but may impact performance
   */
  Hammer.CALCULATE_INTERVAL = 25;

  /**
   * Flag indicating if Hammer is ready for use
   * Controls initialization state to prevent multiple setups
   * Set to true once event handlers are properly configured
   */
  Hammer.READY = false;

  /**
   * Container for all registered gesture recognizers
   * Stores gesture handlers that will be used to detect user interactions
   * Each gesture is registered with a name and handling function
   */
  Hammer.gestures = Hammer.gestures || {};

  /**
   * Identifier for the main Hammer class
   * Used for type checking and debugging purposes
   * Helps identify Hammer instances throughout the application
   */
  Hammer.classType = "Hammer";

  /**
   * Utilities collection for Hammer.js
   * Provides helper functions for touch handling, DOM manipulation, and gesture detection
   */
  var v = Hammer.utils = {
    classType: "Utils",

    /**
     * Extends a target object with properties from a source object
     * @param {Object} target - The object to extend
     * @param {Object} source - The source object containing properties to add
     * @param {boolean} [overwrite=false] - Whether to overwrite existing properties
     * @returns {Object} The extended target object
     */
    extend: function (target, source, overwrite) {
      for (var prop in source) {
        if (!source.hasOwnProperty(prop)) continue;
        if (target[prop] !== undefined && !overwrite) continue;
        target[prop] = source[prop];
      }
      return target;
    },

    /**
     * Adds an event listener to a DOM element
     * @param {HTMLElement} element - The target element
     * @param {string} eventType - The event type to listen for
     * @param {Function} handler - The event handler function
     */
    on: function (element, eventType, handler) {
      element.addEventListener(eventType, handler, false);
    },

    /**
     * Removes an event listener from a DOM element
     * @param {HTMLElement} element - The target element
     * @param {string} eventType - The event type to remove
     * @param {Function} handler - The event handler function to remove
     */
    off: function (element, eventType, handler) {
      element.removeEventListener(eventType, handler, false);
    },

    /**
     * Iterates over arrays or objects and executes a callback for each item
     * @param {Array|Object} collection - The collection to iterate over
     * @param {Function} callback - The function to execute for each item
     * @param {Object} [context] - The context to use for the callback
     */
    each: function (collection, callback, context) {
      var index, length;
      if ("forEach" in collection) {
        collection.forEach(callback, context);
      } else if (collection.length !== undefined) {
        for (index = 0, length = collection.length; index < length; index++) {
          if (callback.call(context, collection[index], index, collection) === false) {
            return;
          }
        }
      } else {
        for (index in collection) {
          if (collection.hasOwnProperty(index) &&
            callback.call(context, collection[index], index, collection) === false) {
            return;
          }
        }
      }
    },

    /**
     * Checks if a string contains a substring
     * @param {string} string - The string to search in
     * @param {string} substring - The substring to search for
     * @returns {boolean} True if the substring is found
     */
    inStr: function (string, substring) {
      return string.indexOf(substring) > -1;
    },

    /**
     * Finds the index of an item in an array
     * @param {Array} array - The array to search in
     * @param {*} item - The item to search for
     * @returns {number|boolean} The index of the item or false if not found
     */
    inArray: function (array, item) {
      if (array.indexOf) {
        var index = array.indexOf(item);
        return index !== -1 ? index : false;
      }
      for (var i = 0, len = array.length; i < len; i++) {
        if (array[i] === item) return i;
      }
      return false;
    },

    /**
     * Finds a gesture in an array of gestures by name
     * @param {Array} gestures - Array of gesture objects
     * @param {Object} gesture - The gesture to find
     * @returns {number|boolean} The index of the gesture or false if not found
     */
    inGestureArray: function (gestures, gesture) {
      for (var i = 0, len = gestures.length; i < len; i++) {
        if (gestures[i].gesture == gesture.gesture) return i;
      }
      return false;
    },

    /**
     * Converts an array-like object to a real array
     * @param {Object} arrayLike - The array-like object to convert
     * @returns {Array} A real array with the same contents
     */
    toArray: function (arrayLike) {
      return Array.prototype.slice.call(arrayLike, 0);
    },

    /**
     * Checks if an element has a specific parent node
     * @param {HTMLElement} element - The element to check
     * @param {HTMLElement} parent - The potential parent element
     * @returns {boolean} True if the element has the given parent
     */
    hasParent: function (element, parent) {
      while (element) {
        if (element == parent) return true;
        element = element.parentNode;
      }
      return false;
    },

    /**
     * Calculates the center point of one or more touch points
     * @param {Array} touches - Array of touch points
     * @returns {Object} Object with pageX, pageY, clientX and clientY coordinates
     */
    getCenter: function (touches) {
      var pageXs = [];
      var pageYs = [];
      var clientXs = [];
      var clientYs = [];
      var min = Math.min;
      var max = Math.max;

      // Single touch - return the coordinates directly
      if (touches.length === 1) {
        return {
          pageX: touches[0].pageX,
          pageY: touches[0].pageY,
          clientX: touches[0].clientX,
          clientY: touches[0].clientY
        };
      }

      // Multiple touches - calculate the center point
      this.each(touches, function (touch) {
        pageXs.push(touch.pageX);
        pageYs.push(touch.pageY);
        clientXs.push(touch.clientX);
        clientYs.push(touch.clientY);
      });

      return {
        pageX: (min.apply(Math, pageXs) + max.apply(Math, pageXs)) / 2,
        pageY: (min.apply(Math, pageYs) + max.apply(Math, pageYs)) / 2,
        clientX: (min.apply(Math, clientXs) + max.apply(Math, clientXs)) / 2,
        clientY: (min.apply(Math, clientYs) + max.apply(Math, clientYs)) / 2
      };
    },

    /**
     * Calculates velocity based on distance and time
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @param {number} deltaX - Distance moved in the X direction
     * @param {number} deltaY - Distance moved in the Y direction
     * @returns {Object} Object with x and y velocity components
     */
    getVelocity: function (deltaTime, deltaX, deltaY) {
      return {
        x: Math.abs(deltaX / deltaTime) || 0,
        y: Math.abs(deltaY / deltaTime) || 0
      };
    },

    /**
     * Calculates the angle between two points in degrees
     * @param {Object} startPoint - The starting point with clientX and clientY
     * @param {Object} endPoint - The ending point with clientX and clientY
     * @returns {number} Angle in degrees
     */
    getAngle: function (startPoint, endPoint) {
      var deltaX = endPoint.clientX - startPoint.clientX;
      var deltaY = endPoint.clientY - startPoint.clientY;
      return (180 * Math.atan2(deltaY, deltaX)) / Math.PI;
    },

    /**
     * Determines the direction of movement between two points
     * @param {Object} startPoint - The starting point with clientX and clientY
     * @param {Object} endPoint - The ending point with clientX and clientY
     * @returns {string} Direction: 'left', 'right', 'up', or 'down'
     */
    getDirection: function (startPoint, endPoint) {
      var horizontalMovement = Math.abs(startPoint.clientX - endPoint.clientX);
      var verticalMovement = Math.abs(startPoint.clientY - endPoint.clientY);

      if (horizontalMovement >= verticalMovement) {
        return startPoint.clientX - endPoint.clientX > 0 ? directionLeft : directionRight; // left : right
      }
      return startPoint.clientY - endPoint.clientY > 0 ? directionUp : directionDown; // up : down
    },

    /**
     * Calculates the distance between two points
     * @param {Object} point1 - First point with clientX and clientY
     * @param {Object} point2 - Second point with clientX and clientY
     * @returns {number} Distance between the points
     */
    getDistance: function (point1, point2) {
      var deltaX = point2.clientX - point1.clientX;
      var deltaY = point2.clientY - point1.clientY;
      return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    },

    /**
     * Calculates the scale factor between two sets of touch points
     * @param {Array} startTouches - Starting touch points
     * @param {Array} endTouches - Ending touch points
     * @returns {number} Scale factor
     */
    getScale: function (startTouches, endTouches) {
      if (startTouches.length >= 2 && endTouches.length >= 2) {
        return this.getDistance(endTouches[0], endTouches[1]) /
          this.getDistance(startTouches[0], startTouches[1]);
      }
      return 1;
    },

    /**
     * Calculates the rotation angle between two sets of touch points
     * @param {Array} startTouches - Starting touch points
     * @param {Array} endTouches - Ending touch points
     * @returns {number} Rotation angle in degrees
     */
    getRotation: function (startTouches, endTouches) {
      if (startTouches.length >= 2 && endTouches.length >= 2) {
        return this.getAngle(endTouches[1], endTouches[0]) -
          this.getAngle(startTouches[1], startTouches[0]);
      }
      return 0;
    },

    /**
     * Checks if a direction is vertical (up or down)
     * @param {string} direction - Direction to check
     * @returns {boolean} True if the direction is vertical
     */
    isVertical: function (direction) {
      return direction == directionUp || direction == directionDown; // up or down
    },

    /**
     * Sets CSS properties with vendor prefixes if needed
     * @param {HTMLElement} element - The element to apply styles to
     * @param {string} property - The CSS property to set
     * @param {string} value - The value to apply
     * @param {boolean} [enabled=true] - Whether to apply or remove the style
     */
    setPrefixedCss: function (element, property, value, enabled) {
      var prefixes = [""];
      property = this.toCamelCase(property);

      for (var i = 0; i < prefixes.length; i++) {
        var prefixedProperty = property;

        if (prefixes[i]) {
          prefixedProperty = prefixes[i] + property.charAt(0).toUpperCase() + property.slice(1);
        }

        if (prefixedProperty in element.style) {
          element.style[prefixedProperty] = ((enabled === undefined || enabled) && value) || "";
          break;
        }
      }
    },

    /**
     * Toggles CSS behavior properties on an element
     * @param {HTMLElement} element - The element to modify
     * @param {Object} behaviors - Object with CSS properties to toggle
     * @param {boolean} enable - Whether to enable or disable the behaviors
     */
    toggleBehavior: function (element, behaviors, enable) {
      if (!behaviors || !element || !element.style) return;

      this.each(behaviors, function (value, property) {
        this.setPrefixedCss(element, property, value, enable);
      }, this);

      var preventDefaultHandler = enable && function (event) {
        var target = event.target || event.srcElement;
        return !(target && target.localName == "textarea");
      };

      if (behaviors.userSelect == "none") {
        element.onselectstart = preventDefaultHandler;
      }
      if (behaviors.userDrag == "none") {
        element.ondragstart = preventDefaultHandler;
      }
    },

    /**
     * Converts a hyphenated or underscored string to camelCase
     * @param {string} value - The string to convert
     * @returns {string} The camelCase string
     */
    toCamelCase: function (value) {
      return value.replace(/[_-]([a-z])/g, function (match) {
        return match[1].toUpperCase();
      });
    },

    /**
     * Checks if a touch event occurred in a scrollbar of the work area
     * @param {Event} event - The touch/mouse event to check
     * @returns {boolean} True if the event occurred in a scrollbar
     */
    inWksBar: function (event) {
      if (!window.docUtil) {
        return false;
      }

      var svgArea = document.getElementById('svg-area');
      var svgElement = svgArea[0];

      if (event.currentTarget == svgElement) {
        var overflowX = svgArea.css("overflow-x");
        var overflowY = svgArea.css("overflow-y");

        // Check if touch is in horizontal scrollbar
        if (overflowX === "scroll") {
          var offsetY = event.clientY - svgArea.offset().top;
          if (event.currentTarget.clientHeight - offsetY <= 0) {
            return true;
          }
        }

        // Check if touch is in vertical scrollbar
        if (overflowY === "scroll") {
          var offsetX = event.clientX - svgArea.offset().left;
          if (event.currentTarget.clientWidth - offsetX <= 0) {
            return true;
          }
        }
      }
      return false;
    }
  };

  /**
   * Event manager for Hammer.js touch interactions
   * Controls event binding, touch detection, and event data collection
   */
  var b = Hammer.event = {
    classType: "Event",
    started: false,
    shouldDetect: false,

    /**
     * Binds event listeners to an element for multiple event types
     * @param {HTMLElement} element - The DOM element to attach events to
     * @param {string} eventTypes - Space-separated list of event types to bind
     * @param {Function} handler - Event handler function to execute
     * @param {Function} [callback] - Optional callback that fires after each event type is bound
     */
    on: function (element, eventTypes, handler, callback) {
      var types = eventTypes.split(" ");
      v.each(types, function (eventType) {
        v.on(element, eventType, handler);
        if (callback) callback(eventType);
      });
    },

    /**
     * Removes event listeners from an element for multiple event types
     * @param {HTMLElement} element - The DOM element to detach events from
     * @param {string} eventTypes - Space-separated list of event types to unbind
     * @param {Function} handler - Event handler function to remove
     * @param {Function} [callback] - Optional callback that fires after each event type is unbound
     */
    off: function (element, eventTypes, handler, callback) {
      var types = eventTypes.split(" ");
      v.each(types, function (eventType) {
        v.off(element, eventType, handler);
        if (callback) callback(eventType);
      });
    },

    /**
     * Sets up touch event handlers for an element
     * @param {HTMLElement} element - The DOM element to attach touch events to
     * @param {string} eventName - The base event name (start, move, or end)
     * @param {Function} callback - The function to call when touch events occur
     * @returns {Function} The created event handler function
     */
    onTouch: function (element, eventName, callback) {
      var self = this;
      var touchHandler = function (event) {
        var result;

        // Skip if touch is in scrollbar area
        if (window.docUtil && eventName == eventStart && v.inWksBar(event)) {
          return;
        }

        // Begin detection on touch start
        if (eventName == eventStart) {
          self.shouldDetect = true;
        }

        // Update pointer tracking if not end event and should detect
        if (eventName != eventEnd && self.shouldDetect) {
          S.updatePointer(eventName, event);
        }

        // Process the touch event if detection is active
        if (self.shouldDetect) {
          result = self.doDetect.call(self, event, eventName, element, callback, 0);
        }

        // End detection if needed
        if (result == eventEnd) {
          self.shouldDetect = false;
          S.reset();
        }

        // Update pointer tracking on touch end
        if (eventName == eventEnd) {
          S.updatePointer(eventName, event);
        }
      };

      return this.on(element, eventTypeMap[eventName], touchHandler), touchHandler;
    },

    /**
     * Processes touch events and triggers appropriate callbacks
     * @param {Event} domEvent - The original DOM touch/pointer event
     * @param {string} eventName - The name of the event (start, move, or end)
     * @param {HTMLElement} element - The element that received the event
     * @param {Function} callback - The function to call with processed event data
     * @param {number} stackDepth - Tracks recursion depth to prevent infinite loops
     * @returns {string} The resulting event type after processing
     */
    doDetect: function (domEvent, eventName, element, callback, stackDepth) {
      var touchList = this.getTouchList(domEvent, eventName);
      var touchCount = touchList.length;
      var resultEventType = eventName;
      var triggerEvent = touchList.trigger;
      var changedLength = touchCount;

      // Determine the appropriate event type based on touch action
      if (eventName === eventStart) {
        triggerEvent = eventTouch;
      } else if (eventName === eventEnd) {
        triggerEvent = eventRelease;
        changedLength = touchList.length - (domEvent.changedTouches ? domEvent.changedTouches.length : 1);
      }

      // If touches changed during an active gesture, treat as move
      if (changedLength > 0 && this.started) {
        resultEventType = eventMove;
      }

      this.started = true;
      var eventData = this.collectEventData(element, resultEventType, touchList, domEvent);

      // Trigger detection for non-end events
      if (eventName !== eventEnd) {
        callback.call(w, eventData);
      }

      // Handle special trigger events (touch/release)
      if (triggerEvent) {
        eventData.changedLength = changedLength;
        eventData.eventType = triggerEvent;
        callback.call(w, eventData);
        eventData.eventType = resultEventType;
        delete eventData.changedLength;
      }

      // Clean up after end events
      if (resultEventType === eventEnd) {
        callback.call(w, eventData);
        this.started = false;
      }

      return resultEventType;
    },

    /**
     * Sets up event type mappings for pointer/touch events
     * @returns {Object} Mapping of event constants to actual event names
     */
    determineEventTypes: function () {
      var eventNames = [
        "pointerdown",
        "pointermove",
        "pointerup pointercancel lostpointercapture"
      ];

      eventTypeMap[eventStart] = eventNames[0];
      eventTypeMap[eventMove] = eventNames[1];
      eventTypeMap[eventEnd] = eventNames[2];

      return eventTypeMap;
    },

    /**
     * Gets the current list of active touch points
     * @param {Event} domEvent - The original DOM event
     * @param {string} eventName - The name of the event
     * @returns {Array} List of active touch points
     */
    getTouchList: function (domEvent, eventName) {
      return S.getTouchList();
    },

    /**
     * Creates a standardized event data object from DOM events
     * @param {HTMLElement} element - The element that received the event
     * @param {string} eventType - The type of event (start, move, end)
     * @param {Array} touches - The list of touch points
     * @param {Event} srcEvent - The original DOM event
     * @returns {Object} Normalized event data object
     */
    collectEventData: function (element, eventType, touches, srcEvent) {
      var pointerType = pointerTouch;

      // Determine pointer type based on event characteristics
      if (v.inStr(srcEvent.type, "mouse") || S.matchType(pointerMouse, srcEvent)) {
        pointerType = pointerMouse;
      } else if (S.matchType(pointerPen, srcEvent)) {
        pointerType = pointerPen;
      }

      return {
        center: v.getCenter(touches),
        timeStamp: Date.now(),
        target: srcEvent.target,
        touches: touches,
        eventType: eventType,
        pointerType: pointerType,
        srcEvent: srcEvent,

        /**
         * Prevents default action for the source event
         */
        preventDefault: function () {
          var event = this.srcEvent;
          if (event.preventManipulation) event.preventManipulation();
          if (event.preventDefault) event.preventDefault();
        },

        /**
         * Stops propagation of the source event
         */
        stopPropagation: function () {
          this.srcEvent.stopPropagation();
        },

        /**
         * Stops the gesture detection process
         * @returns {Object} Result of stopping detection
         */
        stopDetect: function () {
          return w.stopDetect();
        }
      };
    }
  };

  /**
   * Handles pointer event tracking and management for touch interactions
   * Contains functionality for tracking active pointers, retrieving touch lists,
   * and determining pointer types for gesture recognition
   */
  var S = Hammer.PointerEvent = {
    classType: "PointerEvent",

    /**
     * Storage for currently active pointers
     * Keys are pointer IDs and values are the pointer event objects
     */
    pointers: {},

    /**
     * Retrieves an array of all currently active touch points
     * Used by the event handler to process multi-touch gestures
     * @returns {Array} List of all currently active pointers
     */
    getTouchList: function () {
      var pointerList = [];
      v.each(this.pointers, function (pointer) {
        pointerList.push(pointer);
      });
      return pointerList;
    },

    /**
     * Updates the pointer registry when pointer events occur
     * Adds new pointers on start/move events and removes them on end events
     * @param {string} eventType - The type of event (start, move, or end)
     * @param {Object} pointerEvent - The pointer event object
     */
    updatePointer: function (eventType, pointerEvent) {
      if (eventType == eventEnd) {
        // Remove the pointer when it ends
        delete this.pointers[pointerEvent.pointerId];
      } else {
        // Add or update the pointer for other event types
        pointerEvent.identifier = pointerEvent.pointerId;
        this.pointers[pointerEvent.pointerId] = pointerEvent;
      }
    },

    /**
     * Checks if a pointer event matches a specific pointer type
     * Used to distinguish between mouse, touch, and pen inputs
     * @param {string} pointerTypeToMatch - The pointer type to check for
     * @param {Object} pointerEvent - The pointer event to check
     * @returns {boolean} True if the pointer event matches the specified type
     */
    matchType: function (pointerTypeToMatch, pointerEvent) {
      if (!pointerEvent.pointerType) return false;

      var pointerTypeValue = pointerEvent.pointerType;
      var pointerTypeMap = {};

      pointerTypeMap[pointerMouse] = pointerTypeValue === pointerMouse;
      pointerTypeMap[pointerTouch] = pointerTypeValue === pointerTouch;
      pointerTypeMap[pointerPen] = pointerTypeValue === pointerPen;

      return pointerTypeMap[pointerTypeToMatch];
    },

    /**
     * Resets the pointer tracking state
     * Clears all currently tracked pointers
     * Called when gesture detection ends or is canceled
     */
    reset: function () {
      this.pointers = {};
    }
  };

  /**
   * Detection manager for Hammer.js
   * Tracks and manages gesture recognition state and processes events
   */
  var w = Hammer.detection = {
    classType: "Detection",
    gestures: [],
    current: null,
    previous: null,
    stopped: false,

    /**
     * Initiates gesture detection for an element
     * @param {Hammer.Instance} hammerInstance - The Hammer instance for the element
     * @param {Object} eventData - Initial event data that triggered detection
     */
    startDetect: function (hammerInstance, eventData) {
      if (!this.current) {
        this.stopped = false;
        this.current = {
          inst: hammerInstance,
          startEvent: v.extend({}, eventData),
          lastEvent: false,
          lastCalcEvent: false,
          futureCalcEvent: false,
          lastCalcData: {},
          name: ""
        };
        this.detect(eventData);
      }
    },

    /**
     * Processes events and triggers appropriate gesture handlers
     * @param {Object} eventData - Event data to process
     * @returns {Object} Processed event data
     */
    detect: function (eventData) {
      if (!this.current || this.stopped) {
        return;
      }

      eventData = this.extendEventData(eventData);

      var hammerInstance = this.current.inst;
      var instanceOptions = hammerInstance.options;

      // Call gesture handlers in order of priority
      v.each(this.gestures, function (gesture) {
        if (!this.stopped &&
          hammerInstance.enabled &&
          instanceOptions[gesture.name]) {
          gesture.handler.call(gesture, eventData, hammerInstance);
        }
      }, this);

      if (this.current) {
        this.current.lastEvent = eventData;
      }

      if (eventData.eventType == eventEnd) {
        this.stopDetect();
      }

      return eventData;
    },

    /**
     * Stops the current detection process
     * Saves current state as previous and resets current detection
     */
    stopDetect: function () {
      this.previous = v.extend({}, this.current);
      this.current = null;
      this.stopped = true;
    },

    /**
     * Calculates velocity, angle, and direction data for events
     * @param {Object} eventData - Current event data
     * @param {Object} previousCenter - Previous touch center point
     * @param {number} timeDelta - Time difference between events
     * @param {number} deltaX - X-axis movement since last event
     * @param {number} deltaY - Y-axis movement since last event
     */
    getCalculatedData: function (eventData, previousCenter, timeDelta, deltaX, deltaY) {
      var currentState = this.current;
      var recalculate = false;
      var lastCalcEvent = currentState.lastCalcEvent;
      var lastCalcData = currentState.lastCalcData;

      // Check if we need to recalculate based on time interval
      if (lastCalcEvent &&
        eventData.timeStamp - lastCalcEvent.timeStamp > Hammer.CALCULATE_INTERVAL) {
        previousCenter = lastCalcEvent.center;
        timeDelta = eventData.timeStamp - lastCalcEvent.timeStamp;
        deltaX = eventData.center.clientX - lastCalcEvent.center.clientX;
        deltaY = eventData.center.clientY - lastCalcEvent.center.clientY;
        recalculate = true;
      }

      // Store event for future calculations
      if (eventData.eventType != eventTouch &&
        eventData.eventType != eventRelease) {
        currentState.futureCalcEvent = eventData;
      }

      // Calculate velocity, angle, and direction
      if (!currentState.lastCalcEvent || recalculate) {
        lastCalcData.velocity = v.getVelocity(timeDelta, deltaX, deltaY);
        lastCalcData.angle = v.getAngle(previousCenter, eventData.center);
        lastCalcData.direction = v.getDirection(previousCenter, eventData.center);

        currentState.lastCalcEvent = currentState.futureCalcEvent || eventData;
        currentState.futureCalcEvent = eventData;
      }

      // Add calculated properties to event data
      eventData.velocityX = lastCalcData.velocity.x;
      eventData.velocityY = lastCalcData.velocity.y;
      eventData.interimAngle = lastCalcData.angle;
      eventData.interimDirection = lastCalcData.direction;
    },

    /**
     * Extends event data with calculated properties
     * Adds delta values, distance, angle, direction, scale, and rotation
     * @param {Object} eventData - Raw event data to enhance
     * @returns {Object} Enhanced event data with calculated properties
     */
    extendEventData: function (eventData) {
      var currentState = this.current;
      var startEvent = currentState.startEvent;
      var lastEvent = currentState.lastEvent || startEvent;

      // Store touch points for multi-touch gestures
      if (eventData.eventType != eventTouch &&
        eventData.eventType != eventRelease) {
        startEvent.touches = [];
        v.each(eventData.touches, function (touch) {
          startEvent.touches.push({
            clientX: touch.clientX,
            clientY: touch.clientY
          });
        });
      }

      // Calculate time and position differences
      var timeDelta = eventData.timeStamp - startEvent.timeStamp;
      var deltaX = eventData.center.clientX - startEvent.center.clientX;
      var deltaY = eventData.center.clientY - startEvent.center.clientY;

      // Calculate movement and gesture data
      this.getCalculatedData(eventData, lastEvent.center, timeDelta, deltaX, deltaY);

      // Add all calculated properties to event data
      v.extend(eventData, {
        startEvent: startEvent,
        deltaTime: timeDelta,
        deltaX: deltaX,
        deltaY: deltaY,
        distance: v.getDistance(startEvent.center, eventData.center),
        angle: v.getAngle(startEvent.center, eventData.center),
        direction: v.getDirection(startEvent.center, eventData.center),
        scale: v.getScale(startEvent.touches, eventData.touches),
        rotation: v.getRotation(startEvent.touches, eventData.touches)
      });

      return eventData;
    },

    /**
     * Registers a new gesture handler
     * @param {Object} gestureHandler - The gesture handler to register
     * @returns {Array} Updated array of registered gestures
     */
    register: function (gestureHandler) {
      var defaultOptions = gestureHandler.defaults || {};

      // Enable the gesture by default if not specified
      if (defaultOptions[gestureHandler.name] === undefined) {
        defaultOptions[gestureHandler.name] = true;
      }

      // Add gesture defaults to global defaults
      v.extend(Hammer.defaults, defaultOptions, true);

      // Set default priority if not specified
      gestureHandler.index = gestureHandler.index || 1000;

      // Add gesture and sort by priority
      this.gestures.push(gestureHandler);
      this.gestures.sort(function (a, b) {
        return a.index < b.index ? -1 : a.index > b.index ? 1 : 0;
      });

      return this.gestures;
    }
  };

  /**
   * Hammer Instance constructor - creates a new instance of the Hammer touch library
   * @param {HTMLElement} element - The DOM element to attach touch recognition to
   * @param {Object} options - Configuration options to customize behavior
   * @returns {Hammer.Instance} A new Hammer instance for the specified element
   */
  Hammer.Instance = function (element, options) {
    var self = this;

    // Initialize Hammer globally if not already done
    if (!Hammer.READY) {
      // Set up event mappings
      b.determineEventTypes();

      // Register all available gestures with the detection engine
      v.each(Hammer.gestures, function (gesture) {
        w.register(gesture);
      });

      // Set up global touch event handlers for move and end events
      b.onTouch(Hammer.DOCUMENT, eventMove, w.detect); // h = EVENT_MOVE
      b.onTouch(Hammer.DOCUMENT, eventEnd, w.detect); // d = EVENT_END

      // Mark initialization as complete
      Hammer.READY = true;
    }

    // Configure this instance
    this.element = element;
    this.enabled = true;

    // Normalize option names to camelCase
    v.each(options, function (optionValue, optionName) {
      delete options[optionName];
      options[v.toCamelCase(optionName)] = optionValue;
    });

    // Merge default options with provided options
    this.options = v.extend(v.extend({}, Hammer.defaults), options || {});

    // Apply behavior modifications to the element if specified
    if (this.options.behavior) {
      v.toggleBehavior(this.element, this.options.behavior, true);
    }

    /**
     * Main touch event handler that initiates gesture detection on touch start
     * Attached to the element to detect the beginning of touch interactions
     */
    this.eventStartHandler = b.onTouch(element, eventStart, function (eventData) { // p = EVENT_START
      if (self.enabled && eventData.eventType == eventStart) {
        // Start gesture detection when touch begins and instance is enabled
        w.startDetect(self, eventData);
      } else if (eventData.eventType == eventTouch) { // f = EVENT_TOUCH
        // Process touch events even if not starting a new detection
        w.detect(eventData);
      }
    });

    /**
     * Storage for event handlers registered through this instance
     * Used to track and clean up event listeners when they're no longer needed
     */
    this.eventHandlers = [];
  };

  Hammer.Instance.prototype = {
    classType: "Hammer.Instance",

    /**
     * Registers an event handler for a specific gesture type
     * @param {string} gestureType - The type of gesture to listen for
     * @param {Function} handler - The callback function to execute when the gesture occurs
     * @returns {Hammer.Instance} The Hammer instance for chaining
     */
    on: function (gestureType, handler) {
      var index;
      var instance = this;
      var handlerCount = instance.eventHandlers.length;
      var existingHandler = null;

      // Check if we already have a handler for this gesture
      for (index = 0; index < handlerCount; ++index) {
        if (instance.eventHandlers[index].gesture === gestureType) {
          existingHandler = instance.eventHandlers[index].handler;
        }
      }

      // Remove existing handler if present
      if (existingHandler) {
        this.off(gestureType, existingHandler);
      }

      // Register new handler
      b.on(instance.element, gestureType, handler, function (registeredGesture) {
        instance.eventHandlers.push({
          gesture: registeredGesture,
          handler: handler
        });
      });

      return instance;
    },

    /**
     * Removes an event handler for a specific gesture type
     * @param {string} gestureType - The type of gesture to stop listening for
     * @param {Function} handler - The handler function to remove
     * @returns {Hammer.Instance} The Hammer instance for chaining
     */
    off: function (gestureType, handler) {
      var instance = this;
      var gestureTypes = gestureType.split(" ");

      v.each(gestureTypes, function (singleGestureType) {
        var index;
        var handlerCount = instance.eventHandlers.length;
        var existingHandler = null;

        // Find the handler for this gesture type
        for (index = 0; index < handlerCount; ++index) {
          if (instance.eventHandlers[index].gesture === singleGestureType) {
            existingHandler = instance.eventHandlers[index].handler;
            break;
          }
        }

        // Remove the handler if found
        if (existingHandler) {
          b.off(instance.element, singleGestureType, existingHandler, function (removedGesture) {
            var handlerIndex = v.inGestureArray(instance.eventHandlers, {
              gesture: removedGesture
            });

            if (handlerIndex !== false) {
              instance.eventHandlers.splice(handlerIndex, 1);
            }
          });
        }
      });

      return instance;
    },

    /**
     * Manually triggers a gesture event
     * @param {string} gestureType - The type of gesture event to trigger
     * @param {Object} eventData - Data to include with the gesture event
     * @returns {Hammer.Instance} The Hammer instance for chaining
     */
    trigger: function (gestureType, eventData) {
      // Create empty object if no eventData provided
      eventData = eventData || {};

      // Create and initialize the event
      var event = Hammer.DOCUMENT.createEvent("Event");
      event.initEvent(gestureType, true, true);
      event.gesture = eventData;

      // Determine the target element
      var targetElement = this.element;
      if (v.hasParent(eventData.target, targetElement)) {
        targetElement = eventData.target;
      }

      targetElement.dispatchEvent(event);
      return this;
    },

    /**
     * Enables or disables the Hammer instance
     * @param {boolean} isEnabled - Whether the instance should be enabled
     * @returns {Hammer.Instance} The Hammer instance for chaining
     */
    enable: function (isEnabled) {
      this.enabled = isEnabled;
      return this;
    },

    /**
     * Cleans up all event handlers and releases resources
     * Removes behavior modifications and event listeners from the element
     * @returns {null} Null to indicate the instance is disposed
     */
    dispose: function () {
      var index, handlerData;

      // Remove behavior modifications
      v.toggleBehavior(this.element, this.options.behavior, false);

      // Remove all registered event handlers
      for (index = -1; (handlerData = this.eventHandlers[++index]);) {
        v.off(this.element, handlerData.gesture, handlerData.handler);
      }

      // Clear event handlers array
      this.eventHandlers = [];

      // Remove the start event handler
      b.off(this.element, eventTypeMap[eventStart], this.eventStartHandler);

      return null;
    }
  };

  /**
   * Drag gesture recognizer for detecting drag operations
   * Handles horizontal and vertical drag motions with customizable thresholds
   */
  Hammer.gestures.Drag = {
    name: drag,
    index: 50,

    /**
     * Processes drag gesture events
     * @param {Object} eventData - Touch event data being processed
     * @param {Hammer.Instance} hammerInstance - The Hammer instance that triggered the event
     */
    handler: function (eventData, hammerInstance) {
      var currentDetection = w.current;

      // Check if too many touch points are active
      if (hammerInstance.options.dragMaxTouches > 0 &&
        eventData.touches.length > hammerInstance.options.dragMaxTouches) {
        isDragging = false;
        return;
      }

      switch (eventData.eventType) {
        case eventStart:
          // Begin a new drag operation if not already dragging
          if (!isDragging) {
            hammerInstance.trigger('dragstart', eventData);
            isDragging = true;
          }
          hammerInstance.trigger('drag', eventData);
          eventData.srcEvent.stopPropagation();
          eventData.srcEvent.preventDefault();
          break;

        case eventMove:
          // Always prevent default browser behavior during drag
          eventData.srcEvent.stopPropagation();
          eventData.srcEvent.preventDefault();

          // Check minimum distance requirement for drag recognition
          if (eventData.distance < hammerInstance.options.dragMinDistance &&
            currentDetection.name != 'drag') {
            eventData.srcEvent.preventDefault();
            return;
          }

          var startCenter = currentDetection.startEvent.center;

          // Initialize drag if not already in drag state
          if (currentDetection.name != 'drag') {
            currentDetection.name = 'drag';

            // Apply distance correction if enabled and movement detected
            if (hammerInstance.options.dragDistanceCorrection && eventData.distance > 0) {
              var correctionFactor = Math.abs(hammerInstance.options.dragMinDistance / eventData.distance);

              // Adjust the start position using the correction factor
              startCenter.pageX += eventData.deltaX * correctionFactor;
              startCenter.pageY += eventData.deltaY * correctionFactor;
              startCenter.clientX += eventData.deltaX * correctionFactor;
              startCenter.clientY += eventData.deltaY * correctionFactor;

              // Recalculate event data with corrected values
              eventData = w.extendEventData(eventData);
            }
          }

          hammerInstance.trigger('drag', eventData);
          break;

        case eventRelease:
          // End the drag operation if currently dragging and touch count is valid
          if (isDragging && eventData.changedLength <= hammerInstance.options.dragMaxTouches) {
            hammerInstance.trigger('dragend', eventData);
            isDragging = false;
          }
          break;
      }
    },

    /**
     * Default configuration options for drag gesture
     */
    defaults: {
      /**
       * Minimum distance in pixels required to recognize a drag
       * Controls how far user must move before drag is initiated
       */
      dragMinDistance: 1,

      /**
       * Whether to apply distance correction when drag begins
       * Smooths out initial movement by adjusting start position
       */
      dragDistanceCorrection: true,

      /**
       * Maximum number of touch points allowed for drag
       * Set to 1 for single finger drag, or higher for multi-touch drags
       */
      dragMaxTouches: 1
    }
  };

  (function (gestureName) {
    /**
     * Timer reference for the hold gesture recognition
     * Tracks the timeout that determines when a hold gesture is recognized
     * @type {number|null}
     */
    var holdTimer;

    /**
     * Hold gesture recognizer for detecting when a user holds their finger in place
     * Triggers when a user keeps their finger stationary for a specified time
     */
    Hammer.gestures.Hold = {
      /**
       * Name of the gesture for identification and event naming
       * @type {string}
       */
      name: gestureName,

      /**
       * Priority index of the gesture recognizer
       * Lower values have higher priority in the detection chain
       * @type {number}
       */
      index: 10,

      /**
       * Default configuration options for hold gesture
       * Controls timing and movement thresholds for recognition
       */
      defaults: {
        /**
         * Time in milliseconds the user must hold before the gesture is recognized
         * @type {number}
         */
        holdTimeout: 500,

        /**
         * Maximum movement in pixels allowed while holding
         * Movement above this threshold cancels the hold recognition
         * @type {number}
         */
        holdThreshold: 2
      },

      /**
       * Processes events to detect hold gestures
       * @param {Object} eventData - Touch event data being processed
       * @param {Hammer.Instance} hammerInstance - The Hammer instance that triggered the event
       */
      handler: function (eventData, hammerInstance) {
        var options = hammerInstance.options;
        var currentDetection = w.current;

        switch (eventData.eventType) {
          case eventStart: // EVENT_START
            // Reset any existing timer first
            clearTimeout(holdTimer);

            // Set current detection name to hold
            currentDetection.name = gestureName;

            // Start the hold timer
            holdTimer = setTimeout(function () {
              // Only trigger if still in hold or drag state
              if (currentDetection &&
                (currentDetection.name === gestureName ||
                  currentDetection.name === "drag")) {
                hammerInstance.trigger(gestureName, eventData);
              }
            }, options.holdTimeout);
            break;

          case eventMove: // EVENT_MOVE
            // Cancel the hold if the movement exceeds the threshold
            if (eventData.distance > options.holdThreshold) {
              clearTimeout(holdTimer);
            }
            break;

          case eventRelease: // EVENT_END
            // Always clear the timer when the touch ends
            clearTimeout(holdTimer);
            break;
        }
      }
    };
  })("hold");

  (function (gestureName) {
    /**
     * Flag indicating if the current touch exceeded the maximum tap distance
     * Used to track whether a tap should still be recognized or not
     * @type {boolean}
     */
    var tapCancelled = false;

    /**
     * Tap gesture recognizer for detecting tap and double-tap interactions
     * Handles both single tap and double tap recognition with configurable thresholds
     */
    Hammer.gestures.Tap = {
      /**
       * Name of the gesture for identification and event naming
       * @type {string}
       */
      name: gestureName,

      /**
       * Priority index of the gesture recognizer
       * Higher values have lower priority in the detection chain
       * @type {number}
       */
      index: 100,

      /**
       * Processes events to detect tap gestures
       * @param {Object} eventData - Touch event data being processed
       * @param {Hammer.Instance} hammerInstance - The Hammer instance that triggered the event
       */
      handler: function (eventData, hammerInstance) {
        var timeBetweenTaps;
        var isDoubleTap;
        var options = hammerInstance.options;
        var currentDetection = w.current;
        var previousDetection = w.previous;

        switch (eventData.eventType) {
          case eventStart: // EVENT_START
            // Reset tap cancelled flag on touch start
            tapCancelled = false;
            break;

          case eventMove: // EVENT_MOVE
            // Cancel tap if movement exceeds maximum allowed distance
            tapCancelled = tapCancelled || eventData.distance > options.tapMaxDistance;
            break;

          case eventEnd: // EVENT_END
            // Process tap if not cancelled and within time constraints
            if (!v.inStr(eventData.srcEvent.type, "cancel") &&
              eventData.deltaTime < options.tapMaxTime &&
              !tapCancelled) {

              // Calculate time between this tap and previous tap (if any)
              timeBetweenTaps = previousDetection &&
                previousDetection.lastEvent &&
                eventData.timeStamp - previousDetection.lastEvent.timeStamp;

              // Start with assumption that this is not a double tap
              isDoubleTap = false;

              // Check for double tap conditions
              if (previousDetection &&
                previousDetection.name == gestureName &&
                timeBetweenTaps &&
                timeBetweenTaps < options.doubleTapInterval &&
                eventData.distance < options.doubleTapDistance) {

                // This is a valid double tap
                hammerInstance.trigger("doubletap", eventData);
                isDoubleTap = true;
              }

              // Trigger single tap if double tap wasn't recognized
              // or if configured to always trigger taps
              if (!isDoubleTap || options.tapAlways) {
                currentDetection.name = gestureName;
                hammerInstance.trigger(currentDetection.name, eventData);
              }
            }
            break;
        }
      },

      /**
       * Default configuration options for tap gesture
       * Controls timing and distance thresholds for recognition
       */
      defaults: {
        /**
         * Maximum time in milliseconds a tap can take to be recognized
         * Longer interactions will not be recognized as taps
         * @type {number}
         */
        tapMaxTime: 250,

        /**
         * Maximum movement in pixels allowed during a tap
         * Movement beyond this threshold cancels tap recognition
         * @type {number}
         */
        tapMaxDistance: 10,

        /**
         * Whether to trigger tap events even when a double tap is detected
         * When false, single tap is not fired for the first tap of a double tap
         * @type {boolean}
         */
        tapAlways: false,

        /**
         * Maximum distance in pixels between two taps to recognize as double tap
         * Second tap beyond this distance from first tap location won't be recognized
         * @type {number}
         */
        doubleTapDistance: 20,

        /**
         * Maximum time interval in milliseconds between two taps to recognize as double tap
         * Two taps with larger time gap will be treated as separate taps
         * @type {number}
         */
        doubleTapInterval: 300
      }
    };
  })("tap");

  /**
   * Transform gesture recognizer for handling multi-touch transformations
   * Detects pinch and rotate gestures with configurable thresholds
   */
  (function (gestureName) {
    /**
     * Tracks whether a transform gesture is currently in progress
     * Used to fire start/end events at appropriate times
     * @type {boolean}
     */
    var isTransforming = false;

    /**
     * Transform gesture implementation for detecting pinch and rotation
     * Handles scale and rotation transformations with two or more fingers
     */
    Hammer.gestures.Transform = {
      /**
       * Name of the gesture for identification and event naming
       * @type {string}
       */
      name: gestureName,

      /**
       * Priority index of the gesture recognizer
       * Lower values have higher priority in the detection chain
       * @type {number}
       */
      index: 45,

      /**
       * Default configuration options for transform gesture
       * Controls minimum thresholds for scale and rotation recognition
       */
      defaults: {
        /**
         * Minimum scale difference required to recognize a pinch gesture
         * Scale changes smaller than this threshold will be ignored
         * @type {number}
         */
        transformMinScale: 0.01,

        /**
         * Minimum rotation in degrees required to recognize a rotation gesture
         * Rotation changes smaller than this threshold will be ignored
         * @type {number}
         */
        transformMinRotation: 1
      },

      /**
       * Processes events to detect transform gestures
       * @param {Object} eventData - Touch event data being processed
       * @param {Hammer.Instance} hammerInstance - The Hammer instance that triggered the event
       */
      handler: function (eventData, hammerInstance) {
        switch (eventData.eventType) {
          case eventStart:
            // Reset transform state on touch start
            isTransforming = false;
            break;

          case eventMove:
            // Require at least two touch points for transform gestures
            if (eventData.touches.length < 2) {
              return;
            }

            // Calculate scale and rotation deltas
            var scaleDelta = Math.abs(1 - eventData.scale);
            var rotationDelta = Math.abs(eventData.rotation);

            // Ignore small movements below thresholds
            if (scaleDelta < hammerInstance.options.transformMinScale &&
              rotationDelta < hammerInstance.options.transformMinRotation) {
              return;
            }

            // Set current detection name to transform
            w.current.name = gestureName;

            // Trigger start event if this is the beginning of a transform
            if (!isTransforming) {
              hammerInstance.trigger(gestureName + "start", eventData);
              isTransforming = true;
            }

            // Always trigger the main transform event
            hammerInstance.trigger(gestureName, eventData);

            // Trigger specific events for rotation
            if (rotationDelta > hammerInstance.options.transformMinRotation) {
              hammerInstance.trigger("rotate", eventData);
            }

            // Trigger specific events for pinch
            if (scaleDelta > hammerInstance.options.transformMinScale) {
              hammerInstance.trigger("pinch", eventData);
              // Trigger pinch-in or pinch-out based on scale direction
              hammerInstance.trigger("pinch" + (eventData.scale < 1 ? "in" : "out"), eventData);
            }
            break;

          case eventEnd:
            // End the transform if we were transforming and have fewer than 2 touch points
            if (isTransforming && eventData.changedLength < 2) {
              hammerInstance.trigger(gestureName + "end", eventData);
              isTransforming = false;
            }
            break;
        }
      }
    };
  })("transform");

  event.Hammer = Hammer;
})(window);
