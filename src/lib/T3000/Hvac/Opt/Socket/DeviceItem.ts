
import PanelInfo from "./PanelInfo"

class DeviceItem {

  public id?: number;
  public label?: number;
  public icon?: string;
  public children?: DeviceItem[];
  public pl?: PanelInfo;

  initData(id, label, icon, children, pl) {
    this.id = id;
    this.label = label;
    this.icon = icon;
    this.children = children;
    this.pl = pl;
  }
}

export default DeviceItem
