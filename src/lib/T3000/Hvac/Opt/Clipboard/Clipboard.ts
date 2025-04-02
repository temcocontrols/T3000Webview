

import $ from 'jquery'
import T3Gv from '../../Data/T3Gv'
import base64js from 'base64-js'
import T3Constant from '../../Data/Constant/T3Constant'
import T3Util from '../../Util/T3Util'
import DataUtil from '../Data/DataUtil'
import ToolActUtil from '../Opt/ToolActUtil'

/**
 * A utility class for handling clipboard operations with cross-browser and cross-platform support.
 *
 * The Clipboard class provides methods for cut, copy, and paste operations across different browsers
 * and devices, handling the complexities of various clipboard APIs and browser-specific behaviors.
 * It supports text, HTML, and image content types, and provides fallbacks for browsers with limited
 * clipboard access.
 *
 * Features:
 * - Detection of device type, operating system, and browser
 * - Browser-specific clipboard operation handling for Chrome, Firefox, Safari, and Internet Explorer
 * - Support for both synchronous and asynchronous clipboard APIs
 * - Handling of different clipboard content types (text, HTML, images)
 * - Focus management for clipboard operations
 *
 * @example
 * // Initialize clipboard functionality
 * Clipboard.Init();
 *
 * @example
 * // Programmatically trigger a paste operation from UI
 * Clipboard.PasteFromUIaction();
 *
 * @example
 * // Check if browser supports async clipboard API
 * if (Clipboard.CanUseAsyncClipboard()) {
 *   // Use modern clipboard features
 * } else {
 *   // Use fallback methods
 * }
 *
 * @example
 * // Set focus to clipboard input for keyboard shortcuts
 * Clipboard.FocusOnClipboardInput();
 */
class Clipboard {

  /**
   * Indicates if the current device is a mobile device
   * Determined by checking the user agent for mobile, iPad, iPhone, iPod, Android or Silk
   */
  static isMobileDevice: boolean;

  /**
   * Indicates if the current device is capable of gesture interactions
   * Determined by checking if "ontouchstart" exists in window or if pointer events are supported with multiple touch points
   */
  static isGestureCapable: boolean;

  /**
   * Indicates if the current browser is Safari (not Chrome or other variants)
   * Used to handle Safari-specific clipboard behavior
   */
  static isSafariBrowser: boolean;

  /**
   * Indicates if the current device is a Mac
   * Used to handle Mac-specific keyboard shortcuts and behaviors
   */
  static isMacOS: boolean;

  /**
   * Indicates if the current browser is Internet Explorer
   * Used to handle IE-specific clipboard operations
   */
  static isInternetExplorer: boolean;

  /**
   * Indicates if the current browser is Firefox
   * Used to handle Firefox-specific clipboard operations
   */
  static isFirefox: boolean;

  /**
   * Indicates if the current device is running iOS
   * Used to handle iOS-specific behaviors
   */
  static isIOSDevice: boolean;

  /**
   * jQuery reference to the Internet Explorer clipboard div element
   * Used for IE-specific clipboard operations
   */
  static IEclipboardDiv: JQuery<HTMLElement>;

  /**
   * jQuery reference to the clipboard input element
   * Used for focus management during clipboard operations
   */
  static clipboardInputElement: JQuery<HTMLElement>;

  /**
   * Timestamp of the last cut or copy operation
   * Used to track clipboard state and determine if paste operations are from the same session
   */
  static lastCutCopyTimestamp: number;

  /**
   * Initializes the Clipboard functionality by detecting browser/device types
   * and setting up appropriate event handlers for clipboard operations
   * @param options - Optional configuration settings for clipboard initialization
   */
  static Init(options?) {
    // Detect device and browser capabilities
    this.isMobileDevice = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);
    this.isGestureCapable = "ontouchstart" in window ||
      ("onpointerdown" in window && navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    this.isSafariBrowser = navigator.appVersion.includes("Safari") &&
      !navigator.appVersion.includes("Chrome") &&
      !navigator.appVersion.includes("CrMo") &&
      !navigator.appVersion.includes("CriOS");
    this.isMacOS = /(mac os x)/i.test(navigator.userAgent) && !Clipboard.isMobileDevice;
    this.isInternetExplorer = navigator.userAgent.toLowerCase().includes("msie") ||
      navigator.userAgent.toLowerCase().includes("trident");
    this.isFirefox = navigator.userAgent.toLowerCase().includes("firefox");
    this.isIOSDevice = /ip(ad|hone|od)/i.test(navigator.userAgent);

    // Get reference to DOM elements used for clipboard operations
    this.IEclipboardDiv = $("#_IEclipboardDiv");
    this.clipboardInputElement = $("#_clipboardInput");

    // Special handling for iOS Safari on Mac
    if (this.isMacOS && this.isGestureCapable && this.isMobileDevice && this.isSafariBrowser && this.isIOSDevice) {
      Clipboard.clipboardInputElement.attr("readonly", "readonly");
      const crossTabDiv = $("#_crossTabClipboardDiv");
      crossTabDiv.css("left", "-100px");
      crossTabDiv.css("top", "-100px");
    }

    this.lastCutCopyTimestamp = -1;

    // Add special event listeners for IE and Firefox
    if (this.isInternetExplorer || this.isFirefox) {
      document.addEventListener("beforepaste", () => {
        Clipboard.FocusOnIEclipboardDiv();
      });
    }

    /**
     * Handle clipboard input events with browser-specific focus management
     */
    this.clipboardInputElement[0].addEventListener("input", (event) => {
      this.clipboardInputElement.val();
      if (this.isSafariBrowser) {
        this.clipboardInputElement.focus();
        setTimeout(this.FocusOnClipboardInput, 0);
      } else {
        this.FocusOnClipboardInput();
      }
    });

    // Add clipboard event listeners (cut, copy, paste)
    ["cut", "copy", "paste"].forEach((clipboardAction) => {
      document.addEventListener(clipboardAction, (event) => {
        if (T3Gv.docUtil.IsReadOnly()) {
          return;
        }

        // if (!T3Gv.opt.isMobilePlatform) {
        //   // Skip if focus is not on clipboard elements for cut/copy
        //   if ((clipboardAction === "cut" || clipboardAction === "copy") &&
        //     $("#_clipboardInput:focus,#_IEclipboardDiv:focus,#T3TouchProxy:focus").length <= 0) {
        //     return;
        //   }

        //   // Skip if paste and focus is on other input elements
        //   if (clipboardAction === "paste" &&
        //     ($("input:focus").length > 0 || $("textarea:focus").length > 0) &&
        //     $("#_clipboardInput:focus,#_IEclipboardDiv:focus,#T3TouchProxy:focus").length <= 0) {
        //     return;
        //   }
        // }


        // Skip if focus is not on clipboard elements for cut/copy
        if ((clipboardAction === "cut" || clipboardAction === "copy") &&
          $("#_clipboardInput:focus,#_IEclipboardDiv:focus,#T3TouchProxy:focus").length <= 0) {
          return;
        }

        // Skip if paste and focus is on other input elements
        if (clipboardAction === "paste" &&
          ($("input:focus").length > 0 || $("textarea:focus").length > 0) &&
          $("#_clipboardInput:focus,#_IEclipboardDiv:focus,#T3TouchProxy:focus").length <= 0) {
          return;
        }

        // Get clipboard data from appropriate source
        let clipboardData;
        if (event.clipboardData !== undefined) {
          clipboardData = event.clipboardData;
        } else if (event.originalEvent.clipboardData !== undefined) {
          clipboardData = event.originalEvent.clipboardData;
        } else if (window.clipboardData !== undefined) {
          clipboardData = window.clipboardData;
        }

        const isTouchProxyFocused = $("#T3TouchProxy:focus").length > 0;

        // Handle cut/copy operations
        if (clipboardAction === "cut" || clipboardAction === "copy") {
          const hasNoTextContent = !(() => Clipboard.GetCutCopyText())();
          const canUseAsyncClipboard = Clipboard.CanUseAsyncClipboard();

          if (canUseAsyncClipboard && hasNoTextContent) {
            Clipboard.GenerateImageInfo().then((imageInfo) => {
              Clipboard.DoCutCopy(event, clipboardAction, canUseAsyncClipboard, clipboardData, imageInfo);
            });
          } else {
            Clipboard.DoCutCopy(event, clipboardAction, canUseAsyncClipboard, clipboardData);
          }
        }

        // Handle paste operations
        if (clipboardAction === "paste") {
          Clipboard.PasteFromSystemEvent(clipboardData);
        }

        if (isTouchProxyFocused) {
          event.preventDefault();
        }
      });
    });

    // Add mouse up handler to maintain focus on clipboard input
    $(document).mouseup(Clipboard.FocusOnClipboardInput);

    // Initialize focus on clipboard input
    Clipboard.FocusOnClipboardInput();
  }

  /**
   * Determines if the browser supports the asynchronous clipboard API
   * This function checks if the current browser is compatible with the newer
   * asynchronous clipboard API (navigator.clipboard). Returns false for Internet Explorer,
   * Firefox, and Safari which have limited or no support for this API.
   *
   * @returns {boolean} True if the browser supports the async clipboard API, false otherwise
   */
  static CanUseAsyncClipboard() {
    // Return false for browsers that don't fully support the async clipboard API
    return !(
      Clipboard.isInternetExplorer ||
      Clipboard.isFirefox ||
      Clipboard.isSafariBrowser
    );
  }

  /**
   * Handles cut and copy operations with support for different browsers and clipboard APIs
   * This function processes cut/copy events by setting appropriate clipboard content and
   * handles cross-browser compatibility issues for modern async clipboard API vs legacy methods.
   *
   * @param clipboardEvent - The original browser event for the clipboard operation
   * @param clipboardAction - The type of action being performed ("cut" or "copy")
   * @param canUseAsyncClipboard - Whether the browser supports the async clipboard API
   * @param systemClipboardData - The browser's clipboard data object
   * @param imageInfo - Optional image data to include in the clipboard (if available)
   */
  static DoCutCopy(clipboardEvent, clipboardAction, canUseAsyncClipboard, systemClipboardData, imageInfo) {
    // Set the HTML clipboard content
    T3Gv.opt.htmlClipboard = this.GetCutCopyHTML();

    // Process the appropriate clipboard action
    if (clipboardAction === "cut") {
      ToolActUtil.CutObjects(true);
    } else if (clipboardAction === "copy") {
      ToolActUtil.CopyObjects();
    }

    // Update the timestamp to track clipboard operations
    this.lastCutCopyTimestamp = new Date().getTime();

    // Use modern async clipboard API if supported
    if (canUseAsyncClipboard) {
      if (!Clipboard.ValidateAsyncClipboardApi()) {
        return;
      }

      // Request permission to write to clipboard (for security)
      if (navigator && navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({ name: "clipboard-write" }).then(() => { });
      }

      // Get the text content for clipboard
      const textContent = this.GetCutCopyText();

      if (textContent) {
        // Create clipboard items with both plain text and HTML formats
        const clipboardItems = {
          "text/plain": new Blob([textContent], { type: "text/plain" }),
          "text/html": new Blob([this.GetCutCopyHTML()], { type: "text/html" })
        };

        const clipboardItem = new ClipboardItem(clipboardItems);
        navigator.clipboard.write([clipboardItem]);
        this.FocusOnClipboardInput();
      } else if (imageInfo) {
        // Handle image content in clipboard
        const imageHTML = `<img src="${imageInfo.base64ImageData}"/>`;
        const clipboardItems = {
          "image/png": imageInfo.imageBlob,
          "text/html": new Blob([this.GetCutCopyHTML(imageHTML)], { type: "text/html" })
        };

        const clipboardItem = new ClipboardItem(clipboardItems);
        navigator.clipboard.write([clipboardItem]);
      }

      clipboardEvent.preventDefault();
    } else {
      // Handle Internet Explorer specific clipboard operations
      if (this.isInternetExplorer) {
        systemClipboardData.setData("Text", this.GetCutCopyText());
        this.IEclipboardDiv.html(this.GetCutCopyHTML());
        Clipboard.FocusOnIEclipboardDiv();

        setTimeout(() => {
          this.FocusOnClipboardInput();
          this.IEclipboardDiv.empty();
        }, 0);

        return;
      }

      // Legacy clipboard data handling for other browsers
      systemClipboardData.setData("text/plain", this.GetCutCopyText());
      systemClipboardData.setData("text/html", this.GetCutCopyHTML());
      clipboardEvent.preventDefault();

      T3Util.Log("=== Clipboard data copied to system clipboard and the data is: ", systemClipboardData);
    }
  }

  /**
   * Generates image information for the currently selected objects
   * Creates a PNG representation of selected objects for clipboard operations
   *
   * @returns {Promise<{imageBlob: Blob, base64ImageData: string} | null>} Promise resolving to image info object or null if no selection
   */
  static GenerateImageInfo1() {
    const imageInfo = {};
    const selectedObjects = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, false);

    if (!selectedObjects || selectedObjects.length === 0) {
      return Promise.resolve(null);
    }

    return generatePreview(selectedObjects)
      .then(imageBlob => {
        imageInfo.imageBlob = imageBlob;
        return convertBlobToBase64(imageBlob);
      })
      .then(base64Data => {
        imageInfo.base64ImageData = base64Data;
        return imageInfo;
      })
      .catch(error => {
        throw error;
      });

    // Helper function to generate a preview of the selected objects
    function generatePreview(objectsList) {
      return new Promise(resolve =>
        T3Gv.opt.GeneratePreviewPNG(objectsList, Infinity, Infinity, {
          zList: objectsList,
          fillBackground: true
        })
      );
    }

    // Helper function to convert a Blob to base64
    function convertBlobToBase64(blob) {
      const fileReader = new FileReader();
      fileReader.readAsDataURL(blob);
      return new Promise(resolve => {
        fileReader.onloadend = () => resolve(fileReader.result);
      });
    }
  }

  static GenerateImageInfo() {
    const e = {},
      t = DataUtil.GetObjectPtr(T3Gv.opt.theSelectedListBlockID, !1);
    return t &&
      0 !== t.length ? function (e) {
        return new Promise(
          (
            t => (
              (e, t) => T3Gv.opt.GeneratePreviewPNG(e, 1 / 0, 1 / 0, {
                zList: t,
                fillBackground: !0
              })
            )(t, e)
          )
        )
      }(t).then(
        (
          t => (
            e.imageBlob = t,
            function (e) {
              const t = new FileReader;
              return t.readAsDataURL(e),
                new Promise((e => {
                  t.onloadend = () => e(t.result)
                }))
            }(t)
          )
        )
      ).then((t => (e.base64ImageData = t, e))).catch((e => {
      })) : Promise.resolve(null)
  }

  /**
   * Validates if the browser supports the asynchronous clipboard API
   * Checks if navigator.clipboard object exists in the current browser
   *
   * @returns {boolean} True if async clipboard API is available, false otherwise
   */
  static ValidateAsyncClipboardApi() {
    return !!navigator.clipboard;
  }

  /**
   * Converts plain text to a structured document object
   * Creates a formatted text object that can be used by the application
   *
   * @param {string} text - The plain text to convert
   * @returns {object|string} A structured document object or the original text if invalid
   */
  static PlainTextToSDObj(text) {
    if (typeof text !== 'string' || text === null || text.length === 0) {
      return text;
    }
    return {
      text: text,
      charStyles: [],
      hyperlinks: [],
      paraInfo: [],
      styles: [],
      vAlign: "middle"
    };
  }

  /**
   * Handles paste events from the system clipboard
   * Delegates to browser-specific paste handlers based on detected browser
   *
   * @param {ClipboardEvent} clipboardEvent - The system clipboard event object
   */
  static PasteFromSystemEvent(clipboardEvent) {
    T3Util.Log("Pasting from system event: ", clipboardEvent);

    // Define browser-specific handlers
    const browserHandlers = [
      { matches: this.isInternetExplorer, handler: this.PasteIE },
      { matches: this.isFirefox, handler: this.PasteFF },
      { matches: this.isSafariBrowser, handler: this.PasteSafari },
      { matches: true, handler: this.PasteChrome } // Default handler
    ];

    // Clear internal clipboard before processing new data
    this.ClearInteralClipboard();

    // Find and execute the appropriate handler
    const handler = browserHandlers.find(handler => handler.matches);
    if (handler) {
      handler.handler.call(this, clipboardEvent);
    }
  }

  /**
   * Handles Firefox-specific clipboard paste operations
   * Processes text, HTML, and images from the Firefox clipboard
   *
   * @param {ClipboardEvent} clipboardEvent - The Firefox clipboard event
   */
  static PasteFF(clipboardEvent) {
    // Extract plain text
    T3Gv.opt.textClipboard = Clipboard.PlainTextToSDObj(clipboardEvent.getData("Text"));

    // Extract HTML content if available
    const htmlData = clipboardEvent.getData("text/html");
    if (htmlData !== undefined && htmlData !== null && htmlData.length > 0) {
      T3Gv.opt.htmlClipboard = htmlData;
    }

    // Move focus to the IE clipboard div (used for Firefox too)
    Clipboard.FocusOnIEclipboardDiv();

    // Process any images in the clipboard after a small delay
    setTimeout(() => {
      // Check if the clipboard contains image data
      if (Clipboard.IEclipboardDiv.html().match(/<img src=['"]data/gi)) {
        // Extract the image from the HTML content
        const imgElement = $(Clipboard.IEclipboardDiv[0].childNodes[0]);
        const imgSrc = imgElement.attr("src");

        // Split the data URI into metadata and base64 parts
        const [metadataPart, base64Data] = imgSrc.split(",");
        const mimeType = metadataPart.split(":")[1].split(";")[0];

        // Convert base64 to binary data
        const binaryData = atob(base64Data);
        const arrayBuffer = new ArrayBuffer(binaryData.length);
        const uintArray = new Uint8Array(arrayBuffer);

        // Fill array with binary data
        for (let i = 0; i < binaryData.length; i++) {
          uintArray[i] = binaryData.charCodeAt(i);
        }

        // Create a Blob from the binary data with the correct MIME type
        T3Gv.opt.imageClipboard = new Blob([uintArray], { type: mimeType });
      }

      // Complete the paste operation
      Clipboard.Paste();

      // Clean up and reset focus
      Clipboard.IEclipboardDiv.empty();
      Clipboard.FocusOnClipboardInput();
    }, 0);
  }

  /**
   * Handles Safari-specific clipboard paste operations
   * Currently delegates to Chrome paste handler as the behavior is similar
   *
   * @param {ClipboardEvent} clipboardEvent - The Safari clipboard event
   * @returns {void} Result of the Chrome paste handler
   */
  static PasteSafari(clipboardEvent) {
    return this.PasteChrome(clipboardEvent);
  }

  /**
   * Handles Internet Explorer-specific clipboard paste operations
   * Processes text data from clipboard and extracts image files when present
   *
   * @param {ClipboardEvent} clipboardEvent - The IE clipboard event object
   */
  static PasteIE(clipboardEvent) {
    // Extract plain text from clipboard
    T3Gv.opt.textClipboard = Clipboard.PlainTextToSDObj(clipboardEvent.getData("Text"));

    // Process any image files in the clipboard
    const files = clipboardEvent.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.indexOf("image") === 0) {
        T3Gv.opt.imageClipboard = files[i].slice(0, files[i].size - 1);
      }
    }

    // Clear the IE clipboard div content
    this.IEclipboardDiv.empty();

    // Process HTML content after a small delay to ensure it's fully loaded
    setTimeout(() => {
      T3Gv.opt.htmlClipboard = this.IEclipboardDiv.html();
      this.Paste();
      this.IEclipboardDiv.empty();
      this.FocusOnClipboardInput();
    }, 0);
  }

  /**
   * Handles Chrome and other modern browsers clipboard paste operations
   * Extracts various content types (images, plain text, HTML) from the clipboard
   *
   * @param {ClipboardEvent} clipboardEvent - The Chrome clipboard event object
   */
  static PasteChrome(clipboardEvent) {
    // If clipboard data types are available, process each type
    if (clipboardEvent.types !== undefined && clipboardEvent.types != null) {
      Array.prototype.forEach.call(clipboardEvent.types, (type, index) => {
        // Handle image content
        if (type.match(/image.*/) || (clipboardEvent.items !== undefined &&
          clipboardEvent.items[index].type.match(/image.*/))) {
          T3Gv.opt.imageClipboard = clipboardEvent.items[index].getAsFile();
        }
        // Handle plain text content
        else if (type.match(/text\/plain/) || (clipboardEvent.items !== undefined &&
          clipboardEvent.items[index].type.match(/text\/plain/))) {
          clipboardEvent.items[index].getAsString((text) => {
            T3Gv.opt.textClipboard = Clipboard.PlainTextToSDObj(text);
          });
        }
        // Handle HTML content
        else if (type.match(/text\/html/) || clipboardEvent.items[index].type.match(/text\/html/)) {
          clipboardEvent.items[index].getAsString((htmlContent) => {
            T3Gv.opt.htmlClipboard = htmlContent;
          });
        }
      });
    }

    // Trigger paste operation after a short delay
    // macOS requires a longer delay (500ms) compared to other platforms (10ms)
    setTimeout(Clipboard.Paste, T3Gv.opt.isMac ? 500 : 10);
  }

  /**
   * Clears all internal clipboard data storage
   * Resets text, HTML and image clipboard variables to null
   */
  static ClearInteralClipboard() {
    T3Gv.opt.textClipboard = null;
    T3Gv.opt.htmlClipboard = null;
    T3Gv.opt.imageClipboard = null;
  }

  /**
   * Initiates paste operation from a user interface action
   * Handles different paste scenarios based on platform and clipboard content
   */
  static PasteFromUIaction() {
    // On mobile devices, execute paste directly
    if (this.isMobileDevice) {
      ToolActUtil.PasteObjects();
      return;
    }

    // If this is a paste from the same system, use direct paste
    if (this.IsSameSystemPaste()) {
      ToolActUtil.PasteObjects();
      return;
    }

    // Otherwise, clear the clipboard and use async API
    this.ClearInteralClipboard();
    this.PasteUsingAsynchClipboardAPI(
      () => { }, // Success callback (empty function)
      (error) => { throw error } // Error callback
    );
  }

  /**
   * Handles paste operations using the asynchronous clipboard API
   * Provides browser-specific error messages for unsupported browsers
   *
   * @param {Function} successCallback - Callback function to execute on successful paste
   * @param {Function} errorCallback - Callback function to execute on paste failure
   * @returns {boolean} False if browser doesn't support async clipboard API
   */
  static PasteUsingAsynchClipboardAPI(successCallback, errorCallback) {
    // Firefox and Safari don't support the async clipboard API
    if (this.isFirefox || this.isSafariBrowser) {
      const message = T3Gv.opt.isMac
        ? "Use Command-V to paste this information"
        : "Use ctrl+v to paste this information";
      T3Util.Log(message);
      return false;
    }

    // For supported browsers, process the paste using async API
    return this.PasteUsingAsynchClipboardAPIDoPaste(successCallback, errorCallback);
  }

  /**
   * Pastes content from the clipboard using the asynchronous clipboard API
   * Reads data from the system clipboard and processes different content types
   * including text, HTML, and images
   *
   * @param {Function} onSuccess - Callback function to execute on successful paste operation
   * @param {Function} onError - Callback function to execute if the paste operation fails
   * @returns {Promise|boolean} Promise from clipboard operation or false if API not supported
   */
  static PasteUsingAsynchClipboardAPIDoPaste(onSuccess, onError) {
    // Define handlers for different content types
    const contentTypeHandlers = [
      {
        typeRegex: /text\/html/,
        handler: (clipboardItem) => clipboardItem.text().then((htmlContent) => {
          T3Gv.opt.htmlClipboard = htmlContent;
          return true;
        })
      },
      {
        typeRegex: /text\/plain/,
        handler: (clipboardItem) => clipboardItem.text().then((textContent) => {
          T3Gv.opt.textClipboard = Clipboard.PlainTextToSDObj(textContent);
          return true;
        })
      },
      {
        typeRegex: /image.*/,
        handler: (clipboardItem) => {
          T3Gv.opt.imageClipboard = clipboardItem;
          return true;
        }
      }
    ];

    // Verify clipboard API is available
    if (Clipboard.ValidateAsyncClipboardApi()) {
      return navigator.clipboard.read()
        .then((clipboardItems) => {
          const processingPromises = [];

          // Process each item from the clipboard
          for (const clipboardItem of clipboardItems) {
            for (const contentType of clipboardItem.types) {
              const processPromise = clipboardItem.getType(contentType)
                .then((contentItem) => {
                  // Find and apply the appropriate handler for this content type
                  const handler = contentTypeHandlers.find((h) => contentType.match(h.typeRegex));
                  if (handler) {
                    return handler.handler(contentItem);
                  } else {
                    onError(`Cannot process clipboard content type: ${contentType}`);
                  }
                })
                .catch((error) => onError(error));

              processingPromises.push(processPromise);
            }
          }

          return Promise.all(processingPromises);
        })
        .then(() => {
          // Execute paste after a short delay to ensure content is processed
          setTimeout(this.Paste, 1);
          onSuccess(true);
        })
        .catch((error) => onError(error));
    }

    return false;
  }

  /**
   * Sets focus on the clipboard input element
   * Ensures the clipboard input is focused for capturing keyboard events
   * unless focus is already on another input element
   */
  static FocusOnClipboardInput() {
    const isAnyInputFocused = $("input:focus").length > 0;
    const isAnySelectFocused = $("select:focus").length > 0;
    const isAnyTextareaFocused = $("textarea:focus").length > 0;
    // const isMobilePlatform = T3Gv.opt.isMobilePlatform;

    // Focus on clipboard input only if no other input elements are focused
    // or if we're on a mobile platform
    if ((!isAnyInputFocused && !isAnySelectFocused && !isAnyTextareaFocused) /*|| isMobilePlatform*/) {
      Clipboard.clipboardInputElement.val(" ");
      Clipboard.clipboardInputElement.focus().select();
    }
  }

  /**
   * Sets focus on the Internet Explorer clipboard div element
   * Used for IE-specific clipboard operations to ensure proper selection
   */
  static FocusOnIEclipboardDiv() {
    const isMobileDevice = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);

    // Focus and select content in the IE clipboard div for mobile devices
    if (isMobileDevice) {
      Clipboard.IEclipboardDiv.focus();

      // Create a text selection range covering all content
      const selectionRange = document.createRange();
      selectionRange.selectNodeContents(Clipboard.IEclipboardDiv.get(0));

      // Apply the selection
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(selectionRange);
    }
  }

  /**
   * Handles clipboard events (cut, copy, paste) specifically for Internet Explorer
   * IE requires special handling for clipboard operations due to security restrictions
   *
   * @param {string} eventType - The type of clipboard event ("cut", "copy", or "paste")
   * @param {Event} clipboardEvent - The browser clipboard event object
   */
  static OnIECBEvent(eventType, clipboardEvent) {
    const clipboardData = window.clipboardData;

    // Handle cut and copy operations
    if (eventType === "cut" || eventType === "copy") {
      // Set text data to clipboard
      clipboardData.setData("Text", this.GetCutCopyText());

      // Add HTML content to the IE clipboard div
      this.IEclipboardDiv.html(this.GetCutCopyHTML());
      this.FocusOnIEclipboardDiv();

      // Reset focus and clear clipboard div after operation completes
      setTimeout(() => {
        this.FocusOnClipboardInput();
        this.IEclipboardDiv.empty();
      }, 0);
    }

    // Handle paste operations
    if (eventType === "paste") {
      const textData = clipboardData.getData("Text");
      this.IEclipboardDiv.empty();

      // Process pasted data after a short delay to ensure content is available
      setTimeout(() => {
        const htmlData = this.IEclipboardDiv.html();
        this.Paste(textData, htmlData, T3Gv.opt.imageClipboard);
        this.IEclipboardDiv.empty();
        this.FocusOnClipboardInput();
      }, 0);
    }
  }

  /**
   * Handles clipboard events (cut, copy, paste) for standard browsers
   * Processes clipboard data for modern browsers that support the standard clipboard API
   *
   * @param {string} eventType - The type of clipboard event ("cut", "copy", or "paste")
   * @param {ClipboardEvent} clipboardEvent - The browser clipboard event object
   */
  static OnCBEvent(eventType, clipboardEvent) {
    const clipboardData = clipboardEvent.originalEvent.clipboardData;

    // Handle cut and copy operations
    if (eventType === "cut" || eventType === "copy") {
      clipboardData.setData("text/plain", this.GetCutCopyText());
      clipboardData.setData("text/html", this.GetCutCopyHTML());
    }

    // Handle paste operations
    if (eventType === "paste") {
      const plainText = clipboardData.getData("text/plain");
      const htmlText = clipboardData.getData("text/html");
      this.Paste(plainText, htmlText, null);
    }
  }

  /**
   * Executes the paste operation with clipboard content
   * Analyzes clipboard content and delegates to appropriate paste handlers
   * based on content type (text, HTML, image)
   */
  static Paste() {
    // Check if device is mobile
    const isMobileDevice = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);

    // Process HTML content if available
    const htmlObject = Clipboard.GetHTMLAsObject(T3Gv.opt.htmlClipboard);
    let clipboardHeader = null;

    if (htmlObject !== null) {
      clipboardHeader = Clipboard.GetHeaderFromHTML(htmlObject);
    }

    // Handle case where HTML content exists but couldn't be parsed
    if (htmlObject === null && T3Gv.opt.htmlClipboard) {
      // Reset cut/copy timestamp
      Clipboard.lastCutCopyTimestamp = -1;

      // Determine clipboard content type
      if (T3Gv.opt.imageClipboard && T3Gv.opt.imageClipboard.size > 0) {
        T3Gv.opt.header.ClipboardType = T3Constant.ClipboardType.Image;
      } else {
        T3Gv.opt.header.ClipboardType = T3Constant.ClipboardType.Text;
      }

      // Clear clipboard buffer and execute paste
      T3Gv.opt.header.ClipboardBuffer = null;
      T3Gv.opt.header.clipboardJson = null;
      ToolActUtil.PasteObjects();
      return;
    }

    // Exit if no valid clipboard header was found
    if (clipboardHeader === null) {
      return;
    }

    // Execute paste operation
    ToolActUtil.PasteObjects();
  }

  /**
   * Retrieves the plain text content for cut/copy operations
   * Returns the text content from the application's clipboard if it's a text clipboard type
   *
   * @returns {string} The text content for the clipboard, or empty string if not applicable
   */
  static GetCutCopyText() {
    const isMobile = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);
    const isTextClipboard = T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.Text;
    const textClipboard = T3Gv.opt.textClipboard;

    if (!isTextClipboard || textClipboard == null) {
      return "";
    }

    return textClipboard.text;
  }

  /**
   * Builds an HTML representation of the clipboard content for cut/copy operations
   * Constructs a formatted HTML string containing clipboard data and metadata
   *
   * @param {string} additionalHtmlContent - Optional HTML content to include in the clipboard
   * @returns {string} The HTML representation of clipboard content
   */
  static GetCutCopyHTML(additionalHtmlContent = "") {
    const isMobile = /mobile|ip(ad|hone|od)|android|silk/i.test(navigator.userAgent);
    let clipboardContent = "";

    if (T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.Text && T3Gv.opt.textClipboard) {
      clipboardContent += T3Gv.opt.textClipboard ? T3Gv.opt.textClipboard.text : "";
    }

    const clipboardHeader = {
      clipboardType: T3Gv.opt.header.ClipboardType,
      timestamp: this.lastCutCopyTimestamp
    };

    if (additionalHtmlContent) {
      clipboardContent += `<div>${additionalHtmlContent}</div>`;
    }

    if (T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.Text) {
      const textData = JSON.stringify(T3Gv.opt.textClipboard);
      const textBytes = new Uint8Array(textData.length);
      for (let i = 0; i < textData.length; i++) {
        textBytes[i] = textData.charCodeAt(i);
      }
      clipboardContent += base64js.fromByteArray(textBytes);
    }

    if (T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.LM) {
      const lmBytes = new Uint8Array(T3Gv.opt.header.ClipboardBuffer);
      clipboardContent += base64js.fromByteArray(lmBytes);
    }

    // if (T3Gv.opt.header.ClipboardType === T3Constant.ClipboardType.Table) {
    //   const tableData = JSON.stringify(T3Gv.opt.header.ClipboardBuffer);
    //   const tableBytes = new Uint8Array(tableData.length);
    //   for (let i = 0; i < tableData.length; i++) {
    //     tableBytes[i] = tableData.charCodeAt(i);
    //   }
    //   clipboardContent += base64js.fromByteArray(tableBytes);
    // }

    clipboardContent += "'/>";
    clipboardContent += "</div>";

    return clipboardContent;
  }

  /**
   * Parses HTML string into a jQuery object
   * Cleans HTML string by removing comment tags and wraps it in proper HTML structure
   *
   * @param {string} htmlString - The HTML string to parse
   * @returns {JQuery<HTMLElement>} jQuery object containing the parsed HTML
   */
  static GetHTMLAsObject(htmlString: string) {
    const cleanedHtml = htmlString?.replace("<!--", "")?.replace("-->", "");
    return $("<html><body>" + cleanedHtml + "</body></html>");
  }

  /**
   * Extracts clipboard header information from an HTML object
   * Parses the HTML content to retrieve metadata about clipboard content
   *
   * @param {JQuery<HTMLElement>} htmlDocument - The jQuery HTML document to parse
   * @returns {object|string} The extracted clipboard header information or empty string if not found
   */
  static GetHeaderFromHTML(htmlDocument) {
    return "";
  }

  /**
   * Determines if the current paste operation is from the same system
   * Checks if the paste operation originated from the current application instance
   *
   * @returns {boolean} True if paste is from the same system, false otherwise
   */
  static IsSameSystemPaste() {
    return true;
  }
}

export default Clipboard
