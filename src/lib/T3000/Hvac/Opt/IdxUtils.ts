
import { appState } from '../Data/T3Data'
import { toRaw } from 'vue'

class IdxUtils {

  // Get all items linked to a T3 entry
  static getLinkedEntries() {
    const items = appState.value.items;
    if (items.length === 0) return [];
    return toRaw(appState.value).items.filter((i) => i.t3Entry);
  }

  // Refreshes the guidelines for the moveable elements
  static refreshMoveableGuides() {
    appState.value.elementGuidelines = [];
    const lines = document.querySelectorAll(
      `.moveable-item-wrapper:not(moveable-item-index-${appState.value.activeItemIndex}) .moveable-item`
    );
    Array.from(lines).forEach(function (el) {
      appState.value.elementGuidelines.push(el);
    });
  }
}

export default IdxUtils
