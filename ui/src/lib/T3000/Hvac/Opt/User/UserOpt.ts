

import UserSetting from "../../Model/UserSetting";
import T3Gv from "../../Data/T3Gv";

class UserOpt {

  public userSetting: UserSetting;

  constructor() {
    this.userSetting = new UserSetting();
  }

  /**
   * Initializes the user settings
   */
  Initialize() {
    T3Gv.userSetting = this.userSetting;
  }
}

export default UserOpt
