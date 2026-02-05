
import { appState, T3000_Data, ranges, library, savedNotify, isBuiltInEdge, appStateV2 } from '../../Data/T3Data'
// import { toRaw } from 'vue'
// Placeholder: Vue toRaw - returns raw object
const toRaw = (val: any) => val;
import T3Util from '../../Util/T3Util';
import LogUtil from '../../Util/LogUtil';

class IdxUtils {

  // Dependency injection properties
  private static webClient: any;
  private static deviceOpt: any;
  private static wsClient: any;

  // Set dependencies to avoid circular imports
  static setDependencies(webClient: any, deviceOpt: any, wsClient: any) {
    IdxUtils.webClient = webClient;
    IdxUtils.deviceOpt = deviceOpt;
    IdxUtils.wsClient = wsClient;
  }

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

  // Define a function to get the entry range based on the item
  static getEntryRange(item) {
    // Check if the item has a range
    if (item?.range) {
      // Determine the range type based on the item type
      const rangeType = item.type.toLowerCase();
      // Find the range based on the item's range ID
      let range = !item.digital_analog
        ? ranges.digital.find((i) => i.id === item.range)
        : ranges.analog[rangeType].find((i) => i.id === item.range);

      // If the range is not found, check for custom ranges
      if (!range) {
        const customRanges = T3000_Data.value.panelsRanges.filter(
          (i) => i.pid === item.pid
        );
        range = !item.digital_analog
          ? customRanges.find(
            (i) => i.type === "digital" && i.index === item.range
          )
          : customRanges.find(
            (i) => i.type === "analog" && i.index === item.range
          );

        // If the range is still not found and the range ID is greater than 100, assume it is a custom range
        if (!range && item.range > 100) {
          range = customRanges.find(
            (i) => i.type === "MSV" && i.index === item.range
          );
        }
      }

      // Return the range if found
      if (range) return range;
    }

    // Return a default range if no range is found
    return { label: "Unused", unit: "" };
  }

  // Define a function to get the active value of an object based on its settings and T3 entry
  static getObjectActiveValue(item) {
    // Initialize the active value to false
    let active = false;

    // Check if the item has a T3 entry and its settings have an active property
    if (!item.t3Entry || item.settings?.active === undefined) return false;

    // Check if the item is an output with a hardware switch status
    if (item.t3Entry.type === "OUTPUT" && item.t3Entry.hw_switch_status === 1) {
      active = !!item.t3Entry.hw_switch_status;
    }
    // Check if the item has a range
    else if (item.t3Entry.range) {
      const analog = item.t3Entry.digital_analog;
      const range = IdxUtils.getEntryRange(item.t3Entry);
      if (range) {
        // Determine the active value based on the item's type and value
        active =
          (!analog &&
            ((item.t3Entry?.control === 1 && !range.direct) ||
              (item.t3Entry?.control === 0 && range.direct))) ||
            (analog && item.t3Entry?.value > 0)
            ? true
            : false;
      }
    }
    // Check if the item is a program
    else if (item.t3Entry.type === "PROGRAM") {
      active = !!item.t3Entry.status;
    }
    // Check if the item is a schedule
    else if (item.t3Entry.type === "SCHEDULE") {
      active = !!item.t3Entry.output;
    }
    // Check if the item is a holiday
    else if (item.t3Entry.type === "HOLIDAY") {
      active = !!item.t3Entry.value;
    }

    // Return the active value
    return active;
  }

  // Refresh linked entries with updated panel data

  /*
  static refreshLinkedEntries(panelData) {
    appState.value.items
      .filter((i) => i.t3Entry?.type)
      .forEach((item) => {
        const linkedEntry = panelData.find(
          (ii) =>
            ii.index === item.t3Entry.index &&
            ii.type === item.t3Entry.type &&
            ii.pid === item.t3Entry.pid
        );
        if (linkedEntry && linkedEntry.id) {

          const tempBefore = linkedEntry.value;

          let newLkValue = linkedEntry.value >= 1000 ? linkedEntry.value / 1000 : linkedEntry.value;
          linkedEntry.value = newLkValue;
          item.t3Entry = linkedEntry;
          IdxUtils.refreshObjectStatus(item);
        }
      });
  }
  */
  static refreshLinkedEntries(panelData) {

    const trlEntry = panelData.find((entry) => entry.label === 'TRL11111');
    if (trlEntry) {
      // LogUtil.Debug('[refreshLinkedEntries] Found TRL11111:', trlEntry);
    } else {
      // LogUtil.Debug('[refreshLinkedEntries] TRL11111 not found in panelData.');
    }

    // LogUtil.Debug('[refreshLinkedEntries] Types in appState.value.items:', appState.value.items.map(item => item.t3Entry?.type));

    appState.value.items
      .filter((i) => i.t3Entry?.type)
      .forEach((item, idx) => {
        const linkedEntry = panelData.find(
          (ii) =>
            ii.index === item.t3Entry.index &&
            ii.type === item.t3Entry.type &&
            ii.pid === item.t3Entry.pid
        );
        if (linkedEntry && linkedEntry.id) {
          const tempBefore = linkedEntry.value;
          let newLkValue = linkedEntry.value >= 1000 ? linkedEntry.value / 1000 : linkedEntry.value;
          // LogUtil.Debug(`[refreshLinkedEntries] Item #${idx}:`, {
          //   itemIndex: item.t3Entry.index,
          //   itemType: item.t3Entry.type,
          //   itemPid: item.t3Entry.pid,
          //   valueBefore: tempBefore,
          //   valueAfter: newLkValue,
          //   linkedEntry: linkedEntry
          // });
          linkedEntry.value = newLkValue;
          item.t3Entry = linkedEntry;
          IdxUtils.refreshObjectStatus(item);
        } else {
          // LogUtil.Debug(`[refreshLinkedEntries] No linked entry found for item #${idx}:`, {
          //   itemIndex: item.t3Entry.index,
          //   itemType: item.t3Entry.type,
          //   itemPid: item.t3Entry.pid
          // });
        }
      });
  }

  // Refresh linked entries with updated panel data for app state v2
  static refreshLinkedEntries2(panelData) {
    appStateV2.value.items
      .filter((i) => i.t3Entry?.type)
      .forEach((item) => {
        const linkedEntry = panelData.find(
          (ii) =>
            ii.index === item.t3Entry.index &&
            ii.type === item.t3Entry.type &&
            ii.pid === item.t3Entry.pid
        );
        if (linkedEntry && linkedEntry.id) {
          // const tempBefore = linkedEntry.value;
          let newLkValue = linkedEntry.value >= 1000 ? linkedEntry.value / 1000 : linkedEntry.value;
          linkedEntry.value = newLkValue;
          item.t3Entry = linkedEntry;
          IdxUtils.refreshObjectStatus(item);
        }
      });
  }

  // Refresh the status of an object based on its T3 entry
  static refreshObjectStatus(item) {
    if (item.t3Entry && item.settings?.active !== undefined) {
      item.settings.active = IdxUtils.getObjectActiveValue(item);
    }

    if (
      item.t3Entry &&
      item.t3Entry.decom !== undefined &&
      item.settings?.inAlarm !== undefined
    ) {
      item.settings.inAlarm = !!item.t3Entry.decom;
    }
  }

  // Saves the library data to the webview
  static saveLib() {
    // Filter out online images and objects from the library
    const libImages = toRaw(library.value.images.filter((item) => !item.online));
    const libObjects = toRaw(library.value.objLib.filter((item) => !item.online));

    // Post a message to the webview with the saved data
    // window.chrome?.webview?.postMessage({
    //   action: 10, // SAVE_LIBRARY_DATA
    //   data: { ...toRaw(library.value), images: libImages, objLib: libObjects },
    // });

    if (isBuiltInEdge.value) {
      IdxUtils.webClient.SaveLibraryData(null, null, { ...toRaw(library.value), images: libImages, objLib: libObjects });
    }
    else {
      const currentDevice = IdxUtils.deviceOpt.getCurrentDevice();
      const panelId = currentDevice?.panelId;
      const graphicId = currentDevice?.graphicId;
      IdxUtils.wsClient.SaveLibraryData(panelId, graphicId, { ...toRaw(library.value), images: libImages, objLib: libObjects });
    }
  }

  // new function to save t3 library data
  static saveNewLib() {
    // Filter out online images and objects from the library
    const libImages = toRaw(library.value.images.filter((item) => !item.online));
    const libObjects = toRaw(library.value.objLib.filter((item) => !item.online));

    // Post a message to the webview with the saved data
    // window.chrome?.webview?.postMessage({
    //   action: 14, // SAVE_NEW_LIBRARY_DATA
    //   data: { ...toRaw(library.value), images: libImages, objLib: libObjects },
    // });

    if (isBuiltInEdge.value) {
      IdxUtils.webClient.SaveNewLibraryData(null, null, { ...toRaw(library.value), images: libImages, objLib: libObjects });
    }
    else {
      const currentDevice = IdxUtils.deviceOpt.getCurrentDevice();
      const panelId = currentDevice?.panelId;
      const graphicId = currentDevice?.graphicId;
      IdxUtils.wsClient.SaveNewLibraryData(panelId, graphicId, { ...toRaw(library.value), images: libImages, objLib: libObjects });
    }
  }

  static saveGraphicData(msgData, $q) {
    if (msgData.data?.status === true) {
      if (!savedNotify.value) return;
      // $q.notify({
      //   message: "Saved successfully.",
      //   color: "primary",
      //   icon: "check_circle",
      //   actions: [
      //     {
      //       label: "Dismiss",
      //       color: "white",
      //       handler: () => {
      //         /* ... */
      //       },
      //     },
      //   ],
      // });

      LogUtil.Debug('= IdxUtils Saved successfully.');

      // Refresh right-side panel info after successful save
      IdxUtils.deviceOpt?.refreshCurrentDevice();
      IdxUtils.deviceOpt?.refreshCurrentDeviceCount();

    } else {
      $q.notify({
        message: "Error, not saved!",
        color: "negative",
        icon: "error",
        actions: [
          {
            label: "Dismiss",
            color: "white",
            handler: () => {
              /* ... */
            },
          },
        ],
      });
    }
  }

  static getUnitText(t3Entry) {
    const range = IdxUtils.getEntryRange(t3Entry);
    let unitText = "";

    if (t3Entry.range > 100) {
      const rangeValue = range.options?.find(
        (item) => item.value === t3Entry.value
      )
      unitText = rangeValue?.name || "";
    }
    else if (t3Entry.digital_analog === 1) {
      unitText = range?.unit || "";
    } else if (t3Entry.digital_analog === 0) {
      if (t3Entry.control) {
        unitText = range?.on || "";
      } else {
        unitText = range?.off || "";
      }
    }

    return unitText;
  }
}

export default IdxUtils
