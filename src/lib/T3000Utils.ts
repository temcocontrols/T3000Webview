import { T3000, DocumentAreaModel } from "./T3000";

export const HvacLog = (e, ...t) => {
  if ("prd" !== T3000.Environment.toLowerCase()) {
    if (t == null || t.length === 0) {
      T3000.HvacLog.apply(console, [e]);
    } else {
      T3000.HvacLog.apply(console, [e].concat(t));
    }
  }
};

export function ResetLeftPanel(isLocked) {
  // Hide or show the left panel based on the isLocked flag
  const leftPanel = document.getElementById(DocumentAreaModel.LEFT_PANEL_ID);
  const newWidth = isLocked ? 0 : DocumentAreaModel.LEFT_PANEL_WIDTH;

  leftPanel.setAttribute("style", `width: ${newWidth}px`);

  // Expand the document area to fill the space
  const workArea = document.getElementById(DocumentAreaModel.WORK_AREA_ID);
  const newPaddingLeft = isLocked
    ? 0
    : DocumentAreaModel.WORK_AREA_PADDING_LEFT;
  workArea.setAttribute("style", `padding-left: ${newPaddingLeft}px`);

  HvacLog(
    "ResetLeftPanel=>",
    `isLocked=${isLocked}`,
    `newWidth=${newWidth}`,
    `newPaddingLeft=${newPaddingLeft}`
  );
}

export function ResetZoom() {
  HvacLog("ResetZoom=>");
}
