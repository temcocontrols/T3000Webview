

import UserSettings from "../../Model/UserSetting";
import T3Gv from "../../Data/T3Gv";

class UserOpt {

  public userSettings: UserSettings;

  constructor() {
    this.userSettings = new UserSettings();
  }

  /**
   * Initializes the user settings
   */
  Initialize() {
    T3Gv.userSettings = this.userSettings;
  }
}

export default UserOpt
