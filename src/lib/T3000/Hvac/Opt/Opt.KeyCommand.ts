
// import Data from '../Data/Data'
import { insertT3EntryDialog } from '../Data/Data';

class KeyCommand {

  public insertT3EntryDialog: { active: boolean, data: {} }

  constructor() {
    // this.insertT3EntryDialog = Data.insertT3EntryDialog.value;
    this.insertT3EntryDialog = insertT3EntryDialog.value;
  }

  // InitKeyCommand(data) {
  //   this.insertT3EntryDialog = data;
  // }

  InsertT3EntryDialog() {
    console.log('KeyCommand: The insert key has been pressed')
    console.log('KeyCommand: The insertT3EntryDialog data been initial with value', this.insertT3EntryDialog)

    // Set the t3 insert dialog state to open
    this.insertT3EntryDialog.active = true;
    // Data.insertT3EntryDialog.active = true;

    // console.log('KeyCommand: The Global data Data.insertT3EntryDialog value', Data.insertT3EntryDialog.value)
  }

  CloseT3EntryDialog() {
    this.insertT3EntryDialog.active = false;
  }

  InsertT3EntrySelect(value) {
    console.log('=== InsertT3EntrySelect value', value)
  }
}

export default KeyCommand
