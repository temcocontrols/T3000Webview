import { T3000 } from "./T3000";

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

export const T3000Util = {
  HvacLog: HvacLog,
  ResetLeftPanel: ResetLeftPanel,
  ResetZoom: ResetZoom,
  UpdateExteriorWallStroke: UpdateExteriorWallStroke,
  GetExteriorWallHeight: GetExteriorWallHeight,
  GetExteriorWallStrokeWidth: GetExteriorWallStrokeWidth,
};
