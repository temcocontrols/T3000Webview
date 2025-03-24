
import NvConstant from "../Data/Constant/NvConstant"
import StateConstant from "../Data/State/StateConstant";

/**
 * Represents a session for TED (presumably Text Editing/Display) within the HVAC control system.
 *
 * This class encapsulates the state of an editing session including active object identifiers for various
 * UI elements such as text edits, tables, outlines, and graphs. It also tracks the last operation performed
 * on a text element, whether the text element was resized or edited, and holds an editor identifier.
 *
 * @remarks
 * - The property Type is initialized to a constant that indicates the object type for a TED session.
 * - The active object IDs for text edits, tables, outlines, and graphs are set to -1 by default
 *   to indicate that no object is currently active.
 * - Flags such as theTEWasResized and theTEWasEdited are set to false, indicating no modifications have
 *   taken place at the session's initialization.
 * - The last text element operation is initialized using a constant from NvConstant.
 *
 * @example
 * Here's how you can instantiate and use the TEData class:
 *
 * ```typescript
 * // Creating a new TED session instance
 * const teData = new TEData();
 *
 * // Checking if there is an active text edit object
 * if (teData.theActiveTextEditObjectID === -1) {
 *   console.log("No active text edit object is selected.");
 * }
 *
 * // Updating the editor ID upon user interaction
 * teData.EditorID = 42;
 * console.log(`Editor ID updated to: ${teData.EditorID}`);
 * ```
 */
class TEData {

  public Type: string;
  public theActiveTextEditObjectID: number;
  public theTEWasResized: boolean;
  public theTEWasEdited: boolean;
  public theTELastOp: any;
  public theActiveTableObjectID: number;
  public theActiveTableObjectIndex: number;
  public theActiveOutlineObjectID: number;
  public theActiveGraphObjectID: number;
  public EditorID: number;

  constructor() {
    this.Type = StateConstant.StoredObjectType.TDataObject;
    this.theActiveTextEditObjectID = -1;
    this.theTEWasResized = false;
    this.theTEWasEdited = false;
    this.theTELastOp = NvConstant.TextElemLastOpt.Init;
    this.theActiveTableObjectID = -1;
    this.theActiveTableObjectIndex = -1;
    this.theActiveOutlineObjectID = -1;
    this.theActiveGraphObjectID = -1;
    this.EditorID = 0;
  }
}

export default TEData
