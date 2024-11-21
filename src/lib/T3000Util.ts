import { cloneDeep } from "lodash";
import { T3000 } from "./T3000";
import { is } from "quasar";

const HvacLog = (e, ...t) => {
  if ("prd" !== T3000.Default.Environment.toLowerCase()) {
    if (t == null || t.length === 0) {
      T3000.Default.HvacLog.apply(console, [e]);
    } else {
      T3000.Default.HvacLog.apply(console, [e].concat(t));
    }
  }
};

const ResetLeftPanel = (isLocked) => {
  // Hide or show the left panel based on the isLocked flag
  const leftPanel = document.getElementById(
    T3000.DocumentAreaModel.LEFT_PANEL_ID
  );
  const newWidth = isLocked ? 0 : T3000.DocumentAreaModel.LEFT_PANEL_WIDTH;

  leftPanel.setAttribute("style", `width: ${newWidth}px`);

  // Expand the document area to fill the space
  const workArea = document.getElementById(
    T3000.DocumentAreaModel.WORK_AREA_ID
  );
  const newPaddingLeft = isLocked
    ? 0
    : T3000.DocumentAreaModel.WORK_AREA_PADDING_LEFT;
  workArea.setAttribute("style", `padding-left: ${newPaddingLeft}px`);

  HvacLog(
    "ResetLeftPanel=>",
    `isLocked=${isLocked}`,
    `newWidth=${newWidth}`,
    `newPaddingLeft=${newPaddingLeft}`
  );
};

const ResetZoom = () => {
  HvacLog("ResetZoom=>");
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

export const T3000Util = {
  HvacLog: HvacLog,
  ResetLeftPanel: ResetLeftPanel,
  ResetZoom: ResetZoom,
  UpdateExteriorWallStroke: UpdateExteriorWallStroke,
  GetExteriorWallHeight: GetExteriorWallHeight,
  GetExteriorWallStrokeWidth: GetExteriorWallStrokeWidth,
  ClearItemsWithZeroWidth: ClearItemsWithZeroWidth,
  SetWallDimensionsVisible: SetWallDimensionsVisible,
};
