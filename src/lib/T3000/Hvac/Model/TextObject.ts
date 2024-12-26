
import ConstantData from "../Data/ConstantData"

class TextObject {

  public Type: number;
  public runtimeText: string;
  public selrange: { start: number; end: number; line: number; };

  constructor(txtObj: any) {
    txtObj = txtObj || {};
    this.Type = ConstantData.StoredObjectType.LM_TEXT_OBJECT;
    this.runtimeText = txtObj.runtimeText || null;
    this.selrange = txtObj.selrange || { start: 0, end: 0, line: 0 };
  }
}

export default TextObject
