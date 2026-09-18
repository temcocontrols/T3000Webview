
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
 * LogUtil.Debug(`State ID: ${state.ID}, Open: ${state.IsOpen}`);
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
    /*
     * The parameter used to be commented out (`this.IsOpen = false;`), which made every state permanently
     * *closed*. `Utils1.IsStateOpen()` then always returned false, and `StateOpt.AddToCurrentState` — whose
     * merge branch requires `IsOpen === true` — never merged a change into the open state: every single
     * stored-object write (`DataStore.ts:100`, `ObjectStore.ts:97`, and both delete paths) pushed a fresh
     * state. One user edit that touches N objects therefore cost N undo steps, and because
     * `ObjectUtil.PreserveUndoState` tests the same flag, `UIUtil.SetDocDirtyState(true)` was unreachable,
     * so an edit never marked the document dirty either.
     *
     * Measured before the fix: a brand-new, *empty* drawing already sat at `{states: 25, currentStateId: 24}`
     * — the 25-entry ring (`T3Gv.maxUndo`) was saturated by the object writes of the load alone.
     */
    this.IsOpen = isStateOpen != null ? isStateOpen : true;
    this.currentObjSeqId = T3Gv.currentObjSeqId;
  }
}

export default StateBase
