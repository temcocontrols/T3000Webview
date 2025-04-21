import { cloneDeep } from "lodash";
import T3Util from "../Util/T3Util";
import HvConstant from "../Data/Constant/HvConstant";

class PageMain {

  ResetLeftPanel = (isLocked) => {
    // Hide or show the left panel based on the isLocked flag
    const leftPanel = document.getElementById(HvConstant.DocumentAreaModel.LEFT_PANEL_ID);
    const newWidth = isLocked ? 0 : HvConstant.DocumentAreaModel.LEFT_PANEL_WIDTH;

    leftPanel.setAttribute("style", `width: ${newWidth}px`);

    // Expand the document area to fill the space
    const workArea = document.getElementById(HvConstant.DocumentAreaModel.WORK_AREA_ID);
    const newPaddingLeft = isLocked ? 0 : HvConstant.DocumentAreaModel.WORK_AREA_PADDING_LEFT;
    workArea.setAttribute("style", `padding-left: ${newPaddingLeft}px`);

    T3Util.Log("ResetLeftPanel=>", `isLocked=${isLocked}`, `newWidth=${newWidth}`, `newPaddingLeft=${newPaddingLeft}`);
  }

  ResetZoom = () => {
    T3Util.Log("ResetZoom=>");
  }

  UpdateExteriorWallStroke = (appState, itemIndex, resizedHeight) => {
    if (!appState) {
      return;
    }

    const newStrokeWidth = this.GetExteriorWallStrokeWidth(resizedHeight);
    appState.value.items[itemIndex].settings.strokeWidth = newStrokeWidth;
  }

  // Reset the height base on stroke width for exterior wall, to make the selecto outer box cover the stroke width
  GetExteriorWallHeight = (newStrokeWidth) => {
    // Default height and stroke width are 10, 19.5
    const defaultHeight = 10;
    const defaultStrokeWidth = 19.5;
    const ratio = defaultHeight / defaultStrokeWidth;
    return newStrokeWidth * ratio;
  }

  GetExteriorWallStrokeWidth = (newHeight) => {
    // Default height and stroke width are 10, 19.5
    const defaultHeight = 10;
    const defaultStrokeWidth = 19.5;
    const ratio = defaultStrokeWidth / defaultHeight;
    return newHeight * ratio;
  }

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
  }

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
  }

  GetPreviousItem = (appState) => {

    let previousItemIndex = appState.value.activeItemIndex - 1;

    while (previousItemIndex >= 0 && appState.value.items[previousItemIndex].width === 0) {
      previousItemIndex--;
    }

    if (previousItemIndex >= 0) {
      return previousItemIndex;
    } else {
      return -1;
    }
  }

  // Start auto join wall
  StartAutoJoinWall = (appState, pos) => {
    console.log("AutoJoinWall StartAutoJoinWall=>", appState.value.items, appState.value.activeItemIndex, pos);

    const currentItem = appState.value.items[appState.value.activeItemIndex];

    const previousItemIndex = this.GetPreviousItem(appState);
    const previousItem = appState.value.items[previousItemIndex];


    console.log("AutoJoinWall StartAutoJoinWall Current item:", currentItem);
    console.log("AutoJoinWall StartAutoJoinWall Previous item:", previousItem);

    if (previousItem !== null && previousItem !== undefined) {
      if (previousItem.joinWall) {
        previousItem.joinWall.push(cloneDeep(currentItem));
      } else {
        previousItem.joinWall = [cloneDeep(currentItem)];
      }
    }
  }

  // Auto Join the wall
  AutoJoinWall = (appState, mouseX, mouseY, rotate, width) => {
    console.log("AutoJoinWall=>", appState.value.items, appState.value.activeItemIndex, mouseX, mouseY, rotate, width);

    const previousItemIndex = this.GetPreviousItem(appState);
    const previousItem = appState.value.items[previousItemIndex];

    if (previousItem !== null && previousItem !== undefined) {
      // const currentItem = appState.value.items[appState.value.activeItemIndex];
      previousItem?.joinWall?.forEach((item) => {
        item.x = mouseX;
        item.y = mouseY;
        item.rotate = rotate;
        item.width = width;
      });
    }
  }
}

export default PageMain
