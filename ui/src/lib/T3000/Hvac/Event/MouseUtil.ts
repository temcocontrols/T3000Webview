

import T3Util from "../Util/T3Util";

class MouseUtil {

  /**
     * Determines whether an event was triggered by a right mouse click
     * This function examines the event object to determine if it represents a right-click action.
     * It handles both regular MouseEvent objects and PointerEvent objects for cross-browser
     * compatibility. It also detects Ctrl+Meta key combinations, which are sometimes used as
     * a right-click equivalent.
     *
     * @param event - The mouse or pointer event to check
     * @returns True if the event was a right-click or equivalent, false otherwise
     */
  static IsRightClick(event) {
    T3Util.Log('O.Opt IsRightClick - Input:', event);

    let isRightClick = false;

    // Extract the source event if this is a Hammer.js gesture event
    if (event.gesture) {
      event = event.gesture.srcEvent;
    }

    // Check for right click in standard MouseEvent
    if (event instanceof MouseEvent) {
      // Button 3 is right click, or Ctrl+Meta key combination (which some systems use as right-click equivalent)
      isRightClick = (event.which === 3 || (event.ctrlKey && event.metaKey));
    }
    // Check for right click in PointerEvent (modern browsers)
    else if ('onpointerdown' in window && event instanceof PointerEvent) {
      isRightClick = (event.which === 3);
    }

    T3Util.Log('O.Opt IsRightClick - Output:', isRightClick);
    return isRightClick;
  }
}

export default MouseUtil
