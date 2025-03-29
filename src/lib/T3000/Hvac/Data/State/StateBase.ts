
import T3Gv from "../T3Gv"

/**
 * Represents the base state of a system element, encapsulating common properties such as a unique identifier,
 * the creator's identity, state type, and open/closed status.
 *
 * @remarks
 * - The state is initialized with default values if parameters are not provided:
 *   - ID defaults to -1.
 *   - CreatedBy defaults to null.
 *   - StateType defaults to null.
 *   - IsOpen defaults to true.
 * - The current object sequence identifier (currentObjSeqId) is automatically set using the global variable T3Gv.currentObjSeqId.
 *
 * @example
 * ```typescript
 * // Create a new state with specific values:
 * const state = new StateBase(1, "UserA", 100, false);
 *
 * // Alternatively, create a state using default values:
 * const defaultState = new StateBase();
 *
 * console.log(`State ID: ${state.ID}, Open: ${state.IsOpen}`);
 * ```
 */
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
    this.IsOpen = false;// isStateOpen != null ? isStateOpen : true;
    this.currentObjSeqId = T3Gv.currentObjSeqId;
  }
}

export default StateBase
