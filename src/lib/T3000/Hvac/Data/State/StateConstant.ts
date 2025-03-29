


/**
 * Represents a collection of constant values for state operations and stored object types.
 *
 * This class contains two key sets of constants:
 *
 * - StateOperationType: Enumerates the operation types for managing state entries.
 *   It includes:
 *   - CREATE: Indicates creation of a new state entry.
 *   - UPDATE: Indicates updating an existing state entry.
 *   - DELETE: Indicates deletion of a state entry.
 *
 * - StoredObjectType: Defines unique identifiers for different object types that can be stored and managed
 *   within the system. These identifiers serve as keys for accessing and manipulating various data objects
 *   (e.g., BaseDrawObject, TextObject, NotesObject, etc.).
 *
 * @example
 * // Example: Using the state operation type to handle creation of a new state entry.
 * if (operation === StateConstant.StateOperationType.CREATE) {
 *   // Code to create a new state entry
 * }
 *
 * @example
 * // Example: Retrieving a stored object type identifier for a text object.
 * const objectType = StateConstant.StoredObjectType.TextObject;
 * console.log(objectType); // Outputs: "TextObject"
 *
 * @remarks
 * The constants in this class are defined using the "as const" assertion, making them immutable. This ensures
 * that the operation types and object identifiers remain consistent throughout the application, reducing the risk
 * of accidental modifications.
 */
class StateConstant {
  /**
   * Defines types of operations that can be performed on state
   * @property {number} CREATE - Create a new state entry (value: 1)
   * @property {number} UPDATE - Update an existing state entry (value: 2)
   * @property {number} DELETE - Delete a state entry (value: 3)
   */
  static readonly StateOperationType = {
    CREATE: 1,
    UPDATE: 2,
    DELETE: 3
  } as const;

  /**
   * Defines the types of objects that can be stored in the application state
   * Each value represents a unique object type identifier used for storage and retrieval
   */
  /**
   * Defines the types of objects that can be stored in the application state
   * Each constant represents a unique identifier for different object types in the system
   * @property {string} BaseDrawObject - Base drawing object type
   * @property {string} TextObject - Text element object type
   * @property {string} NotesObject - Notes object type
   * @property {string} SDDataObject - SDData data object type
   * @property {string} TEDataObject - TEData data object type
   * @property {string} SelectedListObject - Selected items list object type
   * @property {string} LinkListObject - Links collection object type
   * @property {string} LayersManagerObject - Layers management object type
   * @property {string} HNativeObject - Native handler object type
   * @property {string} HNativeWinObject - Native Windows handler object type
   * @property {string} BlobBytesObject - Binary large object data type
   * @property {string} STDataObject - Structured data object type
   * @property {string} ExpandedViewObject - Expanded view state object type
   * @property {string} CommentBlock - Comment block object type
   * @property {string} CommentThread - Comment thread object type
   * @property {string} CommentList - List of comments object type
   */
  static readonly StoredObjectType = {
    BaseDrawObject: 'BaseDrawObject',
    TextObject: 'TextObject',
    NotesObject: 'NotesObject',
    SDDataObject: 'SDData',
    TEDataObject: 'TEData',
    SelectedListObject: 'SelectedList',
    LinkListObject: 'Links',
    LayersManagerObject: 'LayersManager',
    HNativeObject: 'hNative',
    HNativeWinObject: 'hNativeWindows',
    BlobBytesObject: 'BlobBytes',
    // GraphObject: 'Graph',
    STDataObject: 'STData',
    ExpandedViewObject: 'ExpandedView',
    CommentBlock: 'CommentBlock',
    CommentThread: 'CommentThread',
    CommentList: 'CommentList'
  } as const;
}

export default StateConstant;
