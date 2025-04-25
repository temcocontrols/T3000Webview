import { isBuiltInEdge, T3_Types } from "../../Data/T3Data";
import Hvac from "../../Hvac";
import IdxUtils from "./IdxUtils";


class IdxPage2 {

  private webview = (window as any).chrome?.webview;

  // Access Quasar framework instance
  public $q: any;

  initPage() {
    Hvac.WebClient.initMessageHandler();
    //  this.initGlobalNav();
    //  this.isLoggedIn();
    //  this.restoreAppState();
    //  this.setDocMarginOffset();
    //  this.initPanzoom();
    //  this.initMessageClient();
    //  this.initScorller();
    //  this.initAutoSaveInterval();
    //  this.initWindowListener();
    //  this.refreshMoveableGuides();
    //  this.resetPanzoom();
  }

  initQuasar(quasar) {
    this.$q = quasar;
    Hvac.WebClient.initQuasar(this.$q);
    Hvac.QuasarUtil.initQuasar(this.$q);
  }

  // Toggles the auto/manual mode of an item
  static autoManualToggle(item) {
    console.log('5555555 IndexPage2.vue->autoManualToggle->item, locked value', item);

    // if (!locked.value) return;
    item.t3Entry.auto_manual = item.t3Entry.auto_manual ? 0 : 1;
    this.T3UpdateEntryField("auto_manual", item);
  }

  // Update a T3 entry field for an object
  static T3UpdateEntryField(key, obj) {
    if (!obj.t3Entry) return;
    let fieldVal = obj.t3Entry[key];

    const tempFieldBefore = fieldVal;

    if (Math.abs(fieldVal) >= 1000) {
      fieldVal = fieldVal / 1000;
    }

    if (key === "value" || key === "control") {
      IdxUtils.refreshObjectStatus(obj);
    }

    const msgData = {
      action: 3, // UPDATE_ENTRY
      field: key,
      value: fieldVal,
      panelId: obj.t3Entry.pid,
      entryIndex: obj.t3Entry.index,
      entryType: T3_Types[obj.t3Entry.type],
    };

    if (isBuiltInEdge.value) {
      Hvac.WebClient.UpdateEntry(msgData);
    }
    else {
      Hvac.WsClient.UpdateEntry(msgData);
    }

    console.log('= Idx T3UpdateEntryField to T3 before, after', tempFieldBefore, fieldVal);
  }
}

export default IdxPage2;
