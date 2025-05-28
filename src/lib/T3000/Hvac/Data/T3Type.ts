

/**
 * Interface representing an operation action for selected objects in the HVAC editor
 * Used to track and manage selected items and their properties for various operations
 */
export interface IOptAction {
  /** Array of IDs for currently selected objects */
  selectedList?: string[];

  /** The type of shape that is currently selected (e.g., "wall", "text", "image") */
  selectedShapeType?: string;

  /** Identifier for a group when performing operations on grouped objects */
  groupId?: string;

  /** Optional clipboard data for copy-paste operations */
  clipboardData?: string;

  /** Array of IDs for currently locked objects */
  lockedList?: string[];
}
