import HvacModels from "../Hvac.Models";
import * as Utils from '../Hvac.Utils';
import { cloneDeep } from "lodash";
import Doc from "../Document/DocumentHandler";

class App {

  ResetLeftPanel = (isLocked) => {
    // Hide or show the left panel based on the isLocked flag
    const leftPanel = document.getElementById(HvacModels.DocumentAreaModel.LEFT_PANEL_ID);
    const newWidth = isLocked ? 0 : HvacModels.DocumentAreaModel.LEFT_PANEL_WIDTH;

    leftPanel.setAttribute("style", `width: ${newWidth}px`);

    // Expand the document area to fill the space
    const workArea = document.getElementById(HvacModels.DocumentAreaModel.WORK_AREA_ID);
    const newPaddingLeft = isLocked ? 0 : HvacModels.DocumentAreaModel.WORK_AREA_PADDING_LEFT;
    workArea.setAttribute("style", `padding-left: ${newPaddingLeft}px`);

    Utils.Log("ResetLeftPanel=>", `isLocked=${isLocked}`, `newWidth=${newWidth}`, `newPaddingLeft=${newPaddingLeft}`);
  };

  ResetZoom = () => {
    Utils.Log("ResetZoom=>");
  };

  UpdateExteriorWallStroke = (appState, itemIndex, resizedHeight) => {
    if (!appState) {
      return;
    }

    const newStrokeWidth = this.GetExteriorWallStrokeWidth(resizedHeight);
    appState.value.items[itemIndex].settings.strokeWidth = newStrokeWidth;

    // HvacLog("UpdateExteriorWallStroke=>", `newStrokeWidth=${newStrokeWidth}`);
  };

  // Reset the height base on stroke width for exterior wall, to make the selecto outer box cover the stroke width
  GetExteriorWallHeight = (newStrokeWidth) => {
    // Default height and stroke width are 10, 19.5
    const defaultHeight = 10;
    const defaultStrokeWidth = 19.5;
    const ratio = defaultHeight / defaultStrokeWidth;
    return newStrokeWidth * ratio;
  };

  GetExteriorWallStrokeWidth = (newHeight) => {
    // Default height and stroke width are 10, 19.5
    const defaultHeight = 10;
    const defaultStrokeWidth = 19.5;
    const ratio = defaultStrokeWidth / defaultHeight;
    return newHeight * ratio;
  };

  // Clear appState items with width === 0
  ClearItemsWithZeroWidth = (appState) => {
    if (!appState) {
      return;
    }

    const newItems = appState.value.items.filter((item) => {
      return item.width !== 0;
    });

    appState.value.items = cloneDeep(newItems);

    if (appState.value.activeItemIndex != null) {
      appState.value.activeItemIndex = appState.value.items.length - 1;
    }
  };

  // Hide exterior wall guide line
  SetWallDimensionsVisible = (type, isDrawing, appState, isShow) => {
    if (type == "all") {
      appState.value.items.forEach((item) => {
        if (item.type === "Int_Ext_Wall") {
          item.showDimensions = isShow;
        }
      });
    }

    if (type === "select") {
      if (isDrawing) {
        return;
      } else {
        const selectedIndexes = appState.value.selectedTargets.map((target) => {
          return appState.value.items.findIndex(
            (item) =>
              `moveable-item-${item.id}` === target.id &&
              item.type === "Int_Ext_Wall"
          );
        });

        appState.value.items.forEach((item, index) => {
          if (item.type === "Int_Ext_Wall") {
            item.showDimensions = selectedIndexes.includes(index);
          }
        });
      }
    }
  };

  // Document onwheel event handler
  WorkAreaMouseWheel = (e) => {
    Utils.Log("WorkAreaMouseWheel=>", e);
    Utils.UtilsTest(1, 2);
    new Doc().SDJS_LM_WorkAreaMouseWheel(e);
  };

  // Bottom toolbar silder event handler
  BottomSliderbarEvent = (type, value) => {
    Utils.Log("BottomSliderbarEvent=>", type, value);
  };
}

export default App;
