
import { insertT3EntryDialog } from "../../Data/Data";
import T3Util from "../../Util/T3Util";

class KeyInsertOpt {

  public insertT3EntryDialog: { active: boolean, data: {} }

  constructor() {
    this.insertT3EntryDialog = insertT3EntryDialog.value;
  }

  InsertT3EntryDialog() {
    T3Util.Log('= O.KeyInsertOpt InsertT3EntryDialog: The insert key has been pressed')
    T3Util.Log('= O.KeyInsertOpt InsertT3EntryDialog: The insertT3EntryDialog data been initial with value', this.insertT3EntryDialog)

    // Set the t3 insert dialog state to open
    this.insertT3EntryDialog.active = true;
  }

  CloseT3EntryDialog() {
    this.insertT3EntryDialog.active = false;
  }

  InsertT3EntrySelect(value) {
    T3Util.Log('= O.KeyInsertOpt InsertT3EntryDialog: value', value)
  }
}

export default KeyInsertOpt
