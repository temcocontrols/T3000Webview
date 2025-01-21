
import GPP from "../GlobalData"

class StateBase {

  public ID: number;
  public CreatedBy: string;
  public StateType: number;
  public IsOpen: boolean;
  public CURRENT_SEQ_OBJECT_ID: number;

  constructor(e?: number, t?: string, a?: number, r?: boolean) {
    this.ID = e != null ? e : -1;
    this.CreatedBy = t || null;
    this.StateType = a || null;
    this.IsOpen = r || true;
    this.CURRENT_SEQ_OBJECT_ID = GPP.CURRENT_SEQ_OBJECT_ID;
  }
}

export default StateBase
