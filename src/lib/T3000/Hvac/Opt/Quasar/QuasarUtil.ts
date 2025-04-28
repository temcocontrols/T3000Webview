

import { cloneDeep, fill } from "lodash";
import { contextMenuShow, /*currentObject,*/ objectConfigShow } from "../../Data/Constant/RefConstant";
import { AllTool, appStateV2, globalMsg, linkT3EntryDialogV2, localSettings } from "../../Data/T3Data";
import T3Gv from "../../Data/T3Gv";
import GlobalMsgModel from "../../Model/GlobalMsgModel";
import T3Util from "../../Util/T3Util";
import IdxUtils from "../Common/IdxUtils";
import { toRaw } from "vue";
import SelectUtil from "../Opt/SelectUtil";
import ObjectUtil from "../Data/ObjectUtil";
import DataOpt from "../Data/DataOpt";
import DrawUtil from "../Opt/DrawUtil";
import SvgUtil from "../Opt/SvgUtil";
import OptConstant from "../../Data/Constant/OptConstant";

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

    console.log("= T3Util setGlobalMsg", { ...globalMsg.value });
  }

  clearGlobalMsg(msgType: string) {
    globalMsg.value = globalMsg.value.filter((msg: GlobalMsgModel) => msg.msgType !== msgType);
    console.log("= T3Util clearGlobalMsg", { ...globalMsg.value });
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

    console.log('= T3Utils Graphic loaded successfully');
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

    console.log('= T3Utils Initial data loaded successfully');
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
    localStorage.setItem("localSettings", JSON.stringify(localSettings.value));
  }

  getLocalSettings(key: string) {
    const localSettings = localStorage.getItem("localSettings");

    if (localSettings) {
      return JSON.parse(localSettings)[key];
    }
  }

  static ShowContextMenu(show: boolean) {
    contextMenuShow.value = show;
  }

  static ShowObjectConfig(show: boolean) {
    T3Util.LogDev("= U.QuasarUtil ShowObjectConfig", true, "show=>", show);
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

  // static SetSeletedTool() {
  //   const defaultItem: any = {
  //     active: false,
  //     cat: "General",
  //     group: {},
  //     height: 60,
  //     id: 1,
  //     rotate: 0,
  //     scaleX: 1,
  //     scaleY: 1,
  //     settings: {
  //       bgColor: "inherit",
  //       fillColor: "#659dc5",
  //       fontSize: 16,
  //       textColor: "inherit",
  //       titleColor: "inherit",
  //       t3EntryDisplayField: "none",
  //       justifyContent: ''
  //     },
  //     showDimensions: true,
  //     t3Entry: null,
  //     title: null,
  //     translate: [217, 49],
  //     type: "G_Circle",
  //     width: 60,
  //     zindex: 1
  //   };

  //   this.SetCurrentObject(defaultItem);
  // }




  static LinkT3EntryDialogActionV2() {
    T3Util.LogDev("= P.IDX2 linkT3EntryDialogAction", true, "open linkT3EntryDialog V2");
    linkT3EntryDialogV2.value.active = true;
    if (!appStateV2.value.items[appStateV2.value.activeItemIndex]?.t3Entry) return;
    linkT3EntryDialogV2.value.data = cloneDeep(appStateV2.value.items[appStateV2.value.activeItemIndex]?.t3Entry);
  }

  static LinkT3EntrySaveV2() {
    console.log('= Idx linkT3EntrySave linkT3EntryDialog.value.data=', linkT3EntryDialogV2.value.data);
    // console.log('linkT3EntrySave current values=', appState.value.items[appState.value.activeItemIndex].settings);
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
    T3Util.LogDev("= P.IDX2 linkT3EntryDialogAction", true, "close linkT3EntryDialog V2", appStateV2.value);
  }

  static AddCurrentObjectToAppState() {
    let targetSelectionId = SelectUtil.GetTargetSelect();
    var targetObject = ObjectUtil.GetObjectPtr(targetSelectionId, false);

    T3Util.LogDev("= U.QuasarUtil AddCurrentObjectToAppState", true, targetObject);
    var frame = {
      x: targetObject.Frame.x,
      y: targetObject.Frame.y,
      width: targetObject.Frame.width,
      height: targetObject.Frame.height,
    };

    var uniType = targetObject.uniType;

    //Oval Rect Polygon Temperature Boiler Heatpump Pump ValveThreeWay ValveTwoWay Duct Fan CoolingCoil HeatingCoil
    //Filter Humidifier Humidity Pressure Damper ThermalWheel Enthalpy Flow RoomHumidity RoomTemperature Gauge
    //Dial Value Wall G_Circle G_Rectangle g_arr_right Oval Switch LED Text Box Pointer Gauge IconBasic Icon Switch
    const tool = AllTool.find((item) => item.name === uniType);

    this.AddToAppStateV2(frame, tool);
    this.SetAppStateV2SelectIndex(tool);
    DataOpt.SaveAppStateV2();
  }

  static AddToAppStateV2(frame: any, tool: any) {
    const size = { width: frame.width, height: frame.height };

    const pos = {
      clientX: frame.x,
      clientY: frame.y,
      top: frame.x,
      left: frame.y,
    }

    const item = this.drawObject(size, pos, tool);
    T3Util.LogDev("= U.QuasarUtil AddToAppStateV2 1", true, item);
    T3Util.LogDev("= U.QuasarUtil AddToAppStateV2 2", true, appStateV2.value);
  }

  static drawObject(size, pos, tool) {

    const toolSettings =
      cloneDeep(AllTool.find((t) => t.name === tool.name)?.settings) || {};
    const objectSettings = Object.keys(toolSettings).reduce((acc, key) => {
      acc[key] = toolSettings[key].value;
      return acc;
    }, {});

    if (tool.name === "G_Rectangle") {
      size.width = 100;
    }

    const tempItem = {
      title: null,
      active: false,
      type: tool.name,
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

    const item = this.addObject(tempItem);

    if (["Value", "Icon", "Switch"].includes(tool.name)) {
      linkT3EntryDialogV2.value.active = true;
    }
    return item;
  }

  static addObject(item, group = undefined, addToHistory = true) {
    appStateV2.value.itemsCount++;
    item.id = appStateV2.value.itemsCount;
    item.group = group;
    if (!item.settings.titleColor) {
      item.settings.titleColor = "inherit";
    }
    if (!item.settings.bgColor) {
      item.settings.bgColor = "inherit";
    }
    if (!item.settings.textColor) {
      item.settings.textColor = "inherit";
    }
    if (!item.settings.fontSize) {
      item.settings.fontSize = 13;
    }
    appStateV2.value.items.push(item);
    appStateV2.value.elementGuidelines = [];
    return item;
  }

  static SetAppStateV2SelectIndex(tool: any) {
    let selectedUniType = "";

    if (tool) {
      selectedUniType = tool?.name ?? "";
    } else {
      // get current selected shape
      let targetSelectionId = SelectUtil.GetTargetSelect();
      var targetObject = ObjectUtil.GetObjectPtr(targetSelectionId, false);

      if (targetObject) {
        selectedUniType = targetObject?.uniType ?? "";
      }
    }

    appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
      (item) => `${item.type}` === selectedUniType
    );

    T3Util.LogDev("= U.QuasarUtil SetAppStateV2SelectIndex", true, appStateV2.value);
  }

  static GetItemFromAPSV2(shapeId: string) {
    let item = appStateV2.value.items.find((item) => item.type === shapeId);
    if (item) {
      return item;
    } else {
      console.error(`Item with id ${shapeId} not found in appStateV2`);
      return null;
    }
  }

  static UpdateSvgElementSettings(key: string, value: any) {

    console.log("= QuasarUtil UpdateSvgElementSettings 1", key, value, T3Gv.stdObj);

    /*
    // T3Gv.opt.SetBackgroundColor("#2a2a2a");
    var selection = SelectUtil.GetSelectedObject();
    // shape.SetFillColor("#2a2a2a");
    const svgElement = T3Gv.opt.svgObjectLayer.GetElementById(selection.selectedId);
    //OptConstant.SVGElementClass.for
    var element = svgElement.GetElementById(OptConstant.SVGElementClass.Shape)
    console.log("element", element);
    element.SetFillColor("red");
    // element.SetStrokeColor("black");

    element.SetAttributes("blue")

    console.log("= QuasarUtil UpdateSvgElementSettings 2", T3Gv.stdObj);
    */

    var selection = SelectUtil.GetSelectedObject();
    // selection.selectedObject.SetFillColor("#2a2a2a");

    var drawSetting = selection.selectedObject.GetDrawSetting();

    // If drawSetting is null or undefined, initialize as empty object
    drawSetting = drawSetting || {};

    // Set the key-value pair on the drawSetting object
    drawSetting[key] = value;

    console.log(`Updated drawSetting: ${key}=${value}`, drawSetting);
    selection.selectedObject.SetDrawSetting(drawSetting);

    var dynamicCss=
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
