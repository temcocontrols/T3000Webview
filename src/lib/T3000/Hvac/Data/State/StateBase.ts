
import T3Gv from "../T3Gv"

class StateBase {

  /** State identifier */
  public ID: number;

  /** User or process that created this state */
  public CreatedBy: string;

  /** Type identifier for this state */
  public StateType: number;

  /** Whether this state is currently open */
  public IsOpen: boolean;

  /** Current object sequence identifier */
  public currentObjSeqId: number;

  /**
   * Creates a new state instance
   * @param stateId - Unique identifier for the state
   * @param creatorName - Name of user or process that created this state
   * @param stateTypeId - Type identifier for this state
   * @param isStateOpen - Whether this state is open (defaults to true)
   */
  constructor(stateId?: number, creatorName?: string, stateTypeId?: number, isStateOpen?: boolean) {
    this.ID = stateId != null ? stateId : -1;
    this.CreatedBy = creatorName || null;
    this.StateType = stateTypeId || null;
    this.IsOpen = isStateOpen != null ? isStateOpen : true;
    this.currentObjSeqId = T3Gv.currentObjSeqId;
  }
}

export default StateBase
