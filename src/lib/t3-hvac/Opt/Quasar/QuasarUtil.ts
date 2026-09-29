

import { cloneDeep, fill } from "lodash";
import { ctxMenuConfig, globalMsgShow, /*currentObject,*/ objectConfigShow } from "../../Data/Constant/RefConstant";
import { NewTool, appStateV2, globalMsg, linkT3EntryDialogV2, localSettings } from "../../Data/T3Data";
import T3Gv from "../../Data/T3Gv";
import GlobalMsgModel from "../../Model/GlobalMsgModel";
import LogUtil from "../../Util/LogUtil";
import IdxUtils from "../Common/IdxUtils";
// import { toRaw } from "vue";
// Placeholder: Vue toRaw - returns raw object
const toRaw = (val: any) => val;
import SelectUtil from "../Opt/SelectUtil";
import ObjectUtil from "../Data/ObjectUtil";
import DataOpt from "../Data/DataOpt";
import DrawUtil from "../Opt/DrawUtil";
import SvgUtil from "../Opt/SvgUtil";
import OptConstant from "../../Data/Constant/OptConstant";
import StorageKeys from "../../Data/Constant/StorageKeys";

class QuasarUtil {

  $q: any;
  static quasar: any;

  initQuasar(quasar: any) {
    this.$q = quasar;
  }

  /*
  {
    type: "error" | "warning" | "info" | "success"
    message:"Error message",
    isShow: true | false,
    msgType: ""
    extral:{}
  }
  */

  setGlobalMsg(type: string, message: string, isShow: boolean, msgType: string, extral?: {}) {
    const existMsgId = globalMsg.value.findIndex((msg: GlobalMsgModel) => msg.msgType === msgType);

    if (existMsgId !== -1) {
      globalMsg.value[existMsgId].type = type;
      globalMsg.value[existMsgId].message = message;
      globalMsg.value[existMsgId].isShow = isShow;
      globalMsg.value[existMsgId].msgType = msgType;
      globalMsg.value[existMsgId].extral = extral || {};
    } else {
      const gmm = new GlobalMsgModel();
      gmm.type = type || "info";
      gmm.message = message || "";
      gmm.isShow = isShow || false;
      gmm.msgType = msgType || "";
      gmm.extral = extral || {};
      globalMsg.value.push(gmm);
    }

    LogUtil.Debug("= U.QuasarUtil setGlobalMsg", { ...globalMsg.value });
  }

  clearGlobalMsg(msgType: string) {
    globalMsg.value = globalMsg.value.filter((msg: GlobalMsgModel) => msg.msgType !== msgType);
    LogUtil.Debug("= U.QuasarUtil clearGlobalMsg", { ...globalMsg.value });
  }

  clearAllGlobalMsg() {
    globalMsg.value = [];
  }

  ShowLOAD_GRAPHIC_ENTRY_RESSuccess() {
    // this.$q.notify({
    //   message: "Graphic loaded successfully",
    //   color: "positive",
    //   icon: "check",
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

    LogUtil.Debug('= U.QuasarUtil Graphic loaded successfully');
  }

  ShowGET_INITIAL_DATA_RESSuccess() {
    // this.$q.notify({
    //   message: "Initial data loaded successfully",
    //   color: "positive",
    //   icon: "check",
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

    LogUtil.Debug('= U.QuasarUtil Initial data loaded successfully');
  }

  ShowWebSocketError(errorMsg: string) {
    this.$q.notify({
      message: errorMsg,
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

  setLocalSettings(key: string, value: any) {
    localSettings.value[key] = value;
    localStorage.setItem(StorageKeys.LOCAL_SETTINGS, JSON.stringify(localSettings.value));
  }

  getLocalSettings(key: string) {
    const localSettings = localStorage.getItem(StorageKeys.LOCAL_SETTINGS);

    if (localSettings) {
      return JSON.parse(localSettings)[key];
    }
  }

  static ShowContextMenu(isShow: boolean, from: string, type: string) {
    LogUtil.Debug("= u.QuasarUtil ShowContextMenu/", "isShow,from,type,rClickParam=>", isShow, from, type, T3Gv.opt.rClickParam);
    ctxMenuConfig.value = { isShow, from, type };
    objectConfigShow.value = false;
    // globalMsgShow.value=true;
  }

  static ShowObjectConfig(show: boolean) {
    LogUtil.Debug("= U.QuasarUtil ShowObjectConfig", "show=>", show);
    // T3Gv.refreshPosition = true;
    // this.SetSeletedTool();
    objectConfigShow.value = show;
  }

  // static SetCurrentObject(currentObj: any) {
  //   T3Gv.refreshPosition = true;
  //   // currentObject.value = currentObj;
  // }

  static UpdateCurrentObjectPos(posFrame: any) {
    if (posFrame) {
      // Update the new pos frame to appStateV2
      const v2Index = appStateV2?.value?.activeItemIndex ?? "-1";

      if (v2Index !== "-1") {
        let currentItem = appStateV2.value.items[v2Index];
        if (currentItem !== undefined && currentItem != null) {
          appStateV2.value.items[v2Index].translate = [posFrame.x, posFrame.y];
          appStateV2.value.items[v2Index].width = posFrame.width;
          appStateV2.value.items[v2Index].height = posFrame.height;
          appStateV2.value.items[v2Index].rotate = posFrame.rotate;
        }
      }
    }
  }

  static LinkT3EntryDialogActionV2() {
    LogUtil.Debug("= U.QuasarUtil P.IDX2 linkT3EntryDialogAction", "open linkT3EntryDialog V2");
    linkT3EntryDialogV2.value.active = true;
    if (!appStateV2.value.items[appStateV2.value.activeItemIndex]?.t3Entry) return;
    linkT3EntryDialogV2.value.data = cloneDeep(appStateV2.value.items[appStateV2.value.activeItemIndex]?.t3Entry);
  }

  static LinkT3EntrySaveV2() {
    LogUtil.Debug('= U.QuasarUtil Idx linkT3EntrySave linkT3EntryDialog.value.data=', linkT3EntryDialogV2.value.data);
    // addActionToHistory("Link object to T3000 entry");

    if (!appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField) {
      if (appStateV2.value.items[appStateV2.value.activeItemIndex].label === undefined) {
        appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField = "description";
      } else {
        appStateV2.value.items[appStateV2.value.activeItemIndex].settings.t3EntryDisplayField = "label";
      }
    }

    // set the default to be divided by 1000
    const checkHasValue = linkT3EntryDialogV2.value.data.value !== undefined &&
      linkT3EntryDialogV2.value.data.value !== null &&
      linkT3EntryDialogV2.value.data.value >= 1000;
    if (checkHasValue) {
      linkT3EntryDialogV2.value.data.value = linkT3EntryDialogV2.value.data.value / 1000;
    }

    appStateV2.value.items[appStateV2.value.activeItemIndex].t3Entry = cloneDeep(toRaw(linkT3EntryDialogV2.value.data));

    // Change the icon based on the linked entry type
    if (appStateV2.value.items[appStateV2.value.activeItemIndex].type === "Icon") {
      let icon = "fa-solid fa-camera-retro";
      if (linkT3EntryDialogV2.value.data.type === "GRP") {
        icon = "fa-solid fa-camera-retro";
      } else if (linkT3EntryDialogV2.value.data.type === "SCHEDULE") {
        icon = "schedule";
      } else if (linkT3EntryDialogV2.value.data.type === "PROGRAM") {
        icon = "fa-solid fa-laptop-code";
      } else if (linkT3EntryDialogV2.value.data.type === "HOLIDAY") {
        icon = "calendar_month";
      }
      appStateV2.value.items[appStateV2.value.activeItemIndex].settings.icon = icon;
    }

    IdxUtils.refreshObjectStatus(appStateV2.value.items[appStateV2.value.activeItemIndex]);
    linkT3EntryDialogV2.value.data = null;
    linkT3EntryDialogV2.value.active = false;

    DataOpt.SaveAppStateV2();
    SvgUtil.RenderAllSVGObjects();
    LogUtil.Debug("= U.QuasarUtil P.IDX2 linkT3EntryDialogAction", "close linkT3EntryDialog V2", appStateV2.value);
  }

  static AddCurrentObjectToAppState() {
    let targetSelectId = SelectUtil.GetTargetSelect();
    var targetObject = ObjectUtil.GetObjectPtr(targetSelectId, false);

    LogUtil.Debug("= U.QuasarUtil AddCurrentObjectToAppState targetObject:", targetObject);
    var frame = {
      x: targetObject.Frame.x,
      y: targetObject.Frame.y,
      width: targetObject.Frame.width,
      height: targetObject.Frame.height,
    };

    var uniqueId = targetObject.uniqueId;
    var uniType = targetObject.uniType;

    LogUtil.Debug("= U.QuasarUtil AddCurrentObjectToAppState uniqueId:|uniType:", frame, uniqueId, uniType);

    //Oval Rect Polygon Temperature Boiler Heatpump Pump ValveThreeWay ValveTwoWay Duct Fan CoolingCoil HeatingCoil
    //Filter Humidifier Humidity Pressure Damper ThermalWheel Enthalpy Flow RoomHumidity RoomTemperature Gauge
    //Dial Value Wall G_Circle G_Rectangle g_arr_right Oval Switch LED Text Box Pointer Gauge IconBasic Icon Switch
    const tool = NewTool.find((item) => item.name === uniType);

    this.AddToAppStateV2(frame, tool, uniqueId);
    this.SetAppStateV2SelectIndex(tool);
    DataOpt.SaveAppStateV2();
  }

  static AddToAppStateV2(frame: any, tool: any, uniqueId) {
    const size = { width: frame.width, height: frame.height };

    const pos = {
      clientX: frame.x,
      clientY: frame.y,
      top: frame.x,
      left: frame.y,
    }

    const item = this.drawObject(size, pos, tool, uniqueId);
    LogUtil.Debug("= U.QuasarUtil AddToAppStateV2", item, appStateV2.value);
  }

  static drawObject(size, pos, tool, uniqueId) {
    const toolSettings = cloneDeep(NewTool.find((t) => t.name === tool?.name)?.settings) || {};
    const objectSettings = Object.keys(toolSettings).reduce((acc, key) => {
      acc[key] = toolSettings[key].value;
      return acc;
    }, {});

    const tempItem = {
      title: null,
      active: false,
      type: tool?.name,
      translate: [pos.clientX, pos.clientY],
      width: size.width,
      height: size.height,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: objectSettings,
      zindex: 1,
      t3Entry: null,
      showDimensions: true
    };

    const item = this.addObject(tempItem, uniqueId);

    // if (["Value", "Icon", "Switch"].includes(tool.name)) {
    //   linkT3EntryDialogV2.value.active = true;
    // }
    return item;
  }

  static addObject(item, uniqueId, group = undefined, addToHistory = true) {
    // Sync counter to max existing ID so a loaded state with high IDs never
    // produces a duplicate ID for a newly added item.
    const maxExistingId = appStateV2.value.items.length > 0
      ? Math.max(...appStateV2.value.items.map(i => i.id ?? 0))
      : 0;
    if (maxExistingId > appStateV2.value.itemsCount) {
      appStateV2.value.itemsCount = maxExistingId;
    }
    appStateV2.value.itemsCount++;
    item.id = appStateV2.value.itemsCount;
    item.uniqueId = uniqueId;
    item.group = group;
    item.settings.titleColor = item.settings.titleColor || "inherit";
    item.settings.bgColor = item.settings.bgColor || "inherit";
    item.settings.textColor = item.settings.textColor || "inherit";
    item.settings.fontSize = item.settings.fontSize || 13;

    appStateV2.value.items.push(item);
    appStateV2.value.elementGuidelines = [];
    return item;
  }

  static SetAppStateV2SelectIndex(tool: any) {
    let selectedUniqueId = "";

    if (tool) {
      selectedUniqueId = tool?.name ?? "";
    } else {
      // get current selected shape
      let targetSelectionId = SelectUtil.GetTargetSelect();
      var targetObject = ObjectUtil.GetObjectPtr(targetSelectionId, false);

      if (targetObject) {
        selectedUniqueId = targetObject?.uniqueId ?? "";
      }
    }

    appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
      (item) => `${item.uniqueId}` === selectedUniqueId
    );

    LogUtil.Debug("= U.QuasarUtil SetAppStateV2SelectIndex", appStateV2.value);
  }

  static GetItemFromAPSV2(shapeUniqueId: string) {
    let item = appStateV2.value.items.find((item) => item.uniqueId === shapeUniqueId);
    if (item) {
      return item;
    } else {
      LogUtil.Debug(`= U.QuasarUtil Item with id ${shapeUniqueId} not found in appStateV2`);
      return null;
    }
  }

  /**
   * Drops the app-layer records of the given engine objects.
   *
   * The mirror of `AddCurrentObjectToAppState`: the app layer keeps **one record per shape**, and a shape
   * that is deleted (or cut) must not leave its record behind — otherwise the properties panel and the
   * saved drawing keep a widget nothing on the canvas answers to.
   *
   * Call **before** the objects are removed from the store (`ObjectUtil.GetObjectPtr` is what maps an
   * object id to the shape's `uniqueId`, the key the records are filed under).
   */
  static RemoveObjectsFromAppState(objectIds: number[]): void {
    if (!Array.isArray(objectIds) || objectIds.length === 0) {
      return;
    }

    try {
      const uniqueIds = objectIds
        .map((objectId) => ObjectUtil.GetObjectPtr(objectId, false))
        .map((object) => (object as any)?.uniqueId)
        .filter((uniqueId): uniqueId is string => typeof uniqueId === 'string' && uniqueId.length > 0);

      if (uniqueIds.length === 0) {
        return;
      }

      const items = appStateV2.value.items;
      const kept = items.filter((item) => !uniqueIds.includes(item.uniqueId));
      if (kept.length === items.length) {
        return;
      }

      appStateV2.value.items = kept;

      // The index may point at (or past) a record that just disappeared; re-point it at whatever is
      // selected now, exactly as a selection change would.
      this.SetAppStateV2SelectIndex(null);
      DataOpt.SaveAppStateV2();

      LogUtil.Debug('= U.QuasarUtil RemoveObjectsFromAppState - removed records:', uniqueIds, appStateV2.value);
    } catch (error) {
      LogUtil.Error('= U.QuasarUtil RemoveObjectsFromAppState / failed:', error);
    }
  }

  // Update the settings of the selected SVG element like color, size, etc.
  static UpdateSvgElementSettings(key: string, value: any) {
    LogUtil.Debug("= U.QuasarUtil UpdateSvgElementSettings Input: key,value", key, value, T3Gv.stdObj);

    /*
    // T3Gv.opt.SetBackgroundColor("#2a2a2a");
    var selection = SelectUtil.GetSelectedObject();
    // shape.SetFillColor("#2a2a2a");
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(selection.selectedId);
    //OptConstant.SVGElementClass.for
    var element = svgElement.GetElementById(OptConstant.SVGElementClass.Shape)
    LogUtil.Debug("element", element);
    element.SetFillColor("red");
    // element.SetStrokeColor("black");

    element.SetAttributes("blue")
    LogUtil.Debug("= QuasarUtil UpdateSvgElementSettings 2", T3Gv.stdObj);
    */

    var selection = SelectUtil.GetSelectedObject();
    // selection.selectedObject.SetFillColor("#2a2a2a");

    var drawSetting = selection.selectedObject.GetDrawSetting();

    // If drawSetting is null or undefined, initialize as empty object
    drawSetting = drawSetting || {};

    // Set the key-value pair on the drawSetting object
    drawSetting[key] = value;

    LogUtil.Debug(`= U.QuasarUtil Updated drawSetting: ${key}=${value}`, drawSetting);
    selection.selectedObject.SetDrawSetting(drawSetting);

    var dynamicCss =
      `
.in-alarm .fan {
  animation: fan-alarm 1s infinite;
}

@keyframes fan-alarm {
  0% {
    fill: red;
  }

  50% {
    fill:#9230ae;
  }

  100% {
    fill: red;
  }
}

.active .fan .rotating-middle {
  animation: fan-spin 3s linear infinite;
}

.active:not(.in-alarm) .fan .fan-background {
  fill: #66c492;
}

@keyframes fan-spin {
  100% {
    transform: rotate(360deg);
  }
}
.object-svg {
  color:#d79927;
}
    `;

    // selection.selectedObject.AddDynamicCSS(dynamicCss);
  }
}

export default QuasarUtil
