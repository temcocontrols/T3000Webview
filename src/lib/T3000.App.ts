import Models from "./T3000.Models";
import Utils from "./T3000.Utils";
import { cloneDeep } from "lodash";
import SDJS from "./SDJS";

const ResetLeftPanel = (isLocked) => {
  // Hide or show the left panel based on the isLocked flag
  const leftPanel = document.getElementById(
    Models.DocumentAreaModel.LEFT_PANEL_ID
  );
  const newWidth = isLocked ? 0 : Models.DocumentAreaModel.LEFT_PANEL_WIDTH;

  leftPanel.setAttribute("style", `width: ${newWidth}px`);

  // Expand the document area to fill the space
  const workArea = document.getElementById(
    Models.DocumentAreaModel.WORK_AREA_ID
  );
  const newPaddingLeft = isLocked
    ? 0
    : Models.DocumentAreaModel.WORK_AREA_PADDING_LEFT;
  workArea.setAttribute("style", `padding-left: ${newPaddingLeft}px`);

  Utils.Log(
    "ResetLeftPanel=>",
    `isLocked=${isLocked}`,
    `newWidth=${newWidth}`,
    `newPaddingLeft=${newPaddingLeft}`
  );
};

const ResetZoom = () => {
  Utils.Log("ResetZoom=>");
};

const UpdateExteriorWallStroke = (appState, itemIndex, resizedHeight) => {
  if (!appState) {
    return;
  }

  const newStrokeWidth = GetExteriorWallStrokeWidth(resizedHeight);
  appState.value.items[itemIndex].settings.strokeWidth = newStrokeWidth;

  // HvacLog("UpdateExteriorWallStroke=>", `newStrokeWidth=${newStrokeWidth}`);
};

// Reset the height base on stroke width for exterior wall, to make the selecto outer box cover the stroke width
const GetExteriorWallHeight = (newStrokeWidth) => {
  // Default height and stroke width are 10, 19.5
  const defaultHeight = 10;
  const defaultStrokeWidth = 19.5;
  const ratio = defaultHeight / defaultStrokeWidth;
  return newStrokeWidth * ratio;
};

const GetExteriorWallStrokeWidth = (newHeight) => {
  // Default height and stroke width are 10, 19.5
  const defaultHeight = 10;
  const defaultStrokeWidth = 19.5;
  const ratio = defaultStrokeWidth / defaultHeight;
  return newHeight * ratio;
};

// Clear appState items with width === 0
const ClearItemsWithZeroWidth = (appState) => {
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
const SetWallDimensionsVisible = (type, isDrawing, appState, isShow) => {
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
const WorkAreaMouseWheel = (e) => {
  Utils.Log("WorkAreaMouseWheel=>", e);
  SDJS.App.SDJS_LM_WorkAreaMouseWheel(e);
};

// Bottom toolbar silder event handler
const BottomSliderbarEvent = (type, value) => {
  Utils.Log("BottomSliderbarEvent=>", type, value);
};

export default {
  ResetLeftPanel,
  ResetZoom,
  UpdateExteriorWallStroke,
  GetExteriorWallHeight,
  GetExteriorWallStrokeWidth,
  ClearItemsWithZeroWidth,
  SetWallDimensionsVisible,
  WorkAreaMouseWheel,
  BottomSliderbarEvent,
};
