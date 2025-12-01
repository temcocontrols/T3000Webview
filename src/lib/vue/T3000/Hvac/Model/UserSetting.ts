

import T3Constant from "../Data/Constant/T3Constant";

/**
 * Represents user-specific settings for the HVAC system interface.
 * This class stores preferences and configurations that customize the user experience.
 *
 * @class UserSetting
 * @example
 * // Create a new user setting instance
 * const userSetting = new UserSetting();
 *
 * // Customize settings
 * userSetting.UserID = 123;
 * userSetting.ShowGrid = true;
 * userSetting.Metric = true;
 * userSetting.RecentColors = ['#FF0000', '#00FF00', '#0000FF'];
 */
class UserSetting {

  public UserID: number;
  public DateChanged: Date;
  public ShowGrid: boolean;
  public RecentColors: string[];
  public PaperSize: number;
  public Metric: boolean;
  public DisableCtrlArrowShapeInsert: boolean;
  public CursorDisplayMode: number;

  constructor() {
    this.UserID = -1;
    this.DateChanged = null;
    this.ShowGrid = false;
    this.RecentColors = [];
    this.PaperSize = 0;
    this.Metric = false;
    this.DisableCtrlArrowShapeInsert = false;
    this.CursorDisplayMode = T3Constant.CursorDisplayMode.Show;
  }
}

export default UserSetting
