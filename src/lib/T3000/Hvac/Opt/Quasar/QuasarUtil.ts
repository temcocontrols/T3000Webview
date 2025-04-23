

import { cloneDeep } from "lodash";
import { contextMenuShow, currentObject, objectConfigShow } from "../../Data/Constant/RefConstant";
import { AllTool, appStateV2, globalMsg, linkT3EntryDialogV2, localSettings } from "../../Data/T3Data";
import T3Gv from "../../Data/T3Gv";
import GlobalMsgModel from "../../Model/GlobalMsgModel";
import T3Util from "../../Util/T3Util";
import IdxUtils from "../Common/IdxUtils";
import { toRaw } from "vue";
import SelectUtil from "../Opt/SelectUtil";
import DataUtil from "../Data/DataUtil";
import DataOpt from "../Data/DataOpt";

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
    // Clear the context menu
    contextMenuShow.value = show;
  }

  static ShowObjectConfig(show: boolean) {
    T3Gv.refreshPosition = true;
    this.SetSeletedTool();
    objectConfigShow.value = true;///show;
  }

  static SetCurrentObject(currentObj: any) {
    T3Gv.refreshPosition = true;
    currentObject.value = currentObj;
  }

  static UpdateCurrentObjectPos(newPosFrame: any) {
    if (newPosFrame) {
      currentObject.value.translate = newPosFrame.translate;
      currentObject.value.width = newPosFrame.width;
      currentObject.value.height = newPosFrame.height;
    }
  }

  static SetSeletedTool() {
    const defaultItem: any = {
      active: false,
      cat: "General",
      group: {},
      height: 60,
      id: 1,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: {
        bgColor: "inherit",
        fillColor: "#659dc5",
        fontSize: 16,
        textColor: "inherit",
        titleColor: "inherit",
        t3EntryDisplayField: "none",
        justifyContent: ''
      },
      showDimensions: true,
      t3Entry: null,
      title: null,
      translate: [217, 49],
      type: "G_Circle",
      width: 60,
      zindex: 1
    };

    this.SetCurrentObject(defaultItem);
  }




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

    T3Util.LogDev("= P.IDX2 linkT3EntryDialogAction", true, "close linkT3EntryDialog V2", appStateV2.value);
  }

  static AddCurrentObjectToAppState() {
    let targetSelectionId = SelectUtil.GetTargetSelect();
    var targetObject = DataUtil.GetObjectPtr(targetSelectionId, false);

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


  //onSelectoDragEnd
  static AddToAppStateV2(frame: any, tool: any) {
    // const size = { width: e.rect.width, height: e.rect.height };
    const size = { width: frame.width, height: frame.height };

    // const pos = {
    //   clientX: e.clientX,
    //   clientY: e.clientY,
    //   top: e.rect.top,
    //   left: e.rect.left,
    // };

    const pos = {
      clientX: frame.clientX,
      clientY: frame.clientY,
      top: frame.clientX,
      left: frame.clientY,
    }

    // if (
    //   (selectedTool.value.name === "Pointer" ||
    //     size.width < 20 ||
    //     size.height < 20) &&
    //   !continuesObjectTypes.includes(selectedTool.value.name)
    // ) {
    //   isDrawing.value = false;
    //   return;
    // }
    // if (
    //   continuesObjectTypes.includes(selectedTool.value.name) &&
    //   size.height < 20
    // ) {
    //   size.height = selectedTool.value.height;
    // }



    const item = this.drawObject(size, pos, tool);
    // if (item && continuesObjectTypes.includes(item.type)) {
    //   setTimeout(() => {
    //     isDrawing.value = true;
    //     appState.value.selectedTargets = [];
    //     appState.value.items[appState.value.activeItemIndex].rotate = 0;
    //     startTransform.value = cloneDeep(item.translate);
    //   }, 100);
    // }

    T3Util.LogDev("= U.QuasarUtil AddToAppStateV2 1", true, item);
    T3Util.LogDev("= U.QuasarUtil AddToAppStateV2 2", true, appStateV2.value);
  }


  // new draw logic
  static drawObject(size, pos, tool) {
    // tool = tool || selectedTool.value;

    // if (tool.type === "libItem") {
    //   addLibItem(tool.items, size, pos);
    //   return;
    // }
    const scalPercentage = 1 / appStateV2.value.viewportTransform.scale;

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
      // translate: [
      //   (pos.left - viewportMargins.left - appState.value.viewportTransform.x) *
      //   scalPercentage,
      //   (pos.top - viewportMargins.top - appState.value.viewportTransform.y) *
      //   scalPercentage,
      // ],

      translate: [
        pos.clientX, pos.clientY
      ],



      width: size.width * scalPercentage,
      height: size.height * scalPercentage,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
      settings: objectSettings,
      zindex: 1,
      t3Entry: null,
      showDimensions: true
    };

    // if (tool.type === "Image") {
    //   tempItem.image = tool;
    //   tempItem.type = tool.id;
    // }

    // copy the first category from tool.cat to item.cat
    // if (tool.cat) {
    //   const [first] = tool.cat;
    //   tempItem.cat = first;
    // }

    const item = this.addObject(tempItem);

    if (["Value", "Icon", "Switch"].includes(tool.name)) {
      linkT3EntryDialogV2.value.active = true;
    }

    // setTimeout(() => {
    //   if (locked.value) return;
    //   appState.value.activeItemIndex = appState.value.items.findIndex(
    //     (i) => i.id === item.id
    //   );
    // }, 10);
    // setTimeout(() => {
    //   if (locked.value) return;
    //   const target = document.querySelector(`#moveable-item-${item.id}`);
    //   appState.value.selectedTargets = [target];
    //   selecto.value.setSelectedTargets([target]);
    // }, 100);
    return item;
  }

  // Adds a new object to the app state and updates guidelines
  static addObject(item, group = undefined, addToHistory = true) {
    // if (addToHistory) {
    //   addActionToHistory(`Add ${item.type}`);
    // }
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
      item.settings.fontSize = 16;
    }
    appStateV2.value.items.push(item);
    // const lines = document.querySelectorAll(".moveable-item");
    appStateV2.value.elementGuidelines = [];
    // Array.from(lines).forEach(function (el) {
    //   appStateV2.value.elementGuidelines.push(el);
    // });
    return item;
  }

  static SetAppStateV2SelectIndex(tool: any) {
    let selectedUniType = "";

    if (tool) {
      selectedUniType = tool?.name ?? "";
    } else {
      // get current selected shape
      let targetSelectionId = SelectUtil.GetTargetSelect();
      var targetObject = DataUtil.GetObjectPtr(targetSelectionId, false);

      if (targetObject) {
        selectedUniType = targetObject?.uniType ?? "";
      }
    }

    appStateV2.value.activeItemIndex = appStateV2.value.items.findIndex(
      (item) => `${item.type}` === selectedUniType
    );

    T3Util.LogDev("= U.QuasarUtil SetAppStateV2SelectIndex", true, appStateV2.value);

  }
}

export default QuasarUtil
