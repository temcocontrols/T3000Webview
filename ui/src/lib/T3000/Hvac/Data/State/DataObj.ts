

import StateConstant from "./StateConstant"
import T3Gv from "../T3Gv"
import Utils1 from "../../Util/Utils1"

/**
 * Represents a stored object with associated metadata and persistence operations.
 *
 * @remarks
 * The DataModel class encapsulates data along with its identifier, type, and state flags.
 * It supports operations for creation and update based on its parameters, and conditionally adds the object
 * to a global storage for state management. When the object is persisted, further updates will modify the existing
 * stored instance.
 *
 * Features include:
 * - Unique identifier tracking
 * - Dirty flag management to mark unsaved changes
 * - Type validation and data encapsulation
 * - Conditional persistence to a global storage object provided by T3Gv.stdObj
 *
 * @example
 * Here's how you can instantiate and work with a DataModel:
 *
 * ```typescript
 * // Create a new stored object with ID 1, type 100, some data, marked as dirty, and persisted.
 * const myObject = new DataModel(1, 100, { value: 'example data' }, true, true, true);
 *
 * // Update an existing object: if an object with ID 1 is already persisted in global storage,
 * // the constructor will update its type, data, and dirty state.
 * const updatedObject = new DataModel(1, 200, { value: 'updated data' }, false, true, true);
 *
 * // Delete the object from persistence.
 * myObject.Delete();
 * ```
 *
 * @public
 */
class DataObj {

  /**
   * Unique identifier for the stored object
   */
  public ID: number;

  /**
   * Flag indicating if the object has unsaved changes
   */
  public Dirty: boolean;

  /**
   * Type identifier for the stored object
   */
  public Type: number;

  /**
   * The actual data contained in the stored object
   */
  public Data: any;

  /**
   * Flag indicating if the object is persisted in storage
   */
  public IsPersisted: boolean;

  /**
   * Identifier for the current state operation type
   */
  public stateOptTypeId: number;

  /**
   * Creates a new stored object instance or updates an existing one
   * @param objectId - The unique identifier for the object
   * @param objectType - The type identifier for the object
   * @param objectData - The actual data to be stored
   * @param isDirty - Flag indicating if the object has unsaved changes
   * @param isPersisted - Flag indicating if the object is persisted in storage
   * @param addToGlobal - Flag indicating if the object should be added to global storage
   * @returns The created or updated stored object
   */
  constructor(objectId, objectType, objectData, isDirty, isPersisted, addToGlobal?) {
    this.ID = objectId === parseInt(objectId, 10) && objectId >= 0 ? objectId : -1;
    this.Dirty = isDirty || false;
    this.Type = objectType || null;
    this.Data = objectData || null;
    this.IsPersisted = false !== isPersisted;
    this.stateOptTypeId = null;

    if (this.Data && Utils1.isObject(this.Data)) {
      this.Data.BlockID = objectId;
    }

    if (addToGlobal === undefined || addToGlobal === false || addToGlobal === null) {
      return this;
    }

    if (undefined !== T3Gv.stdObj && true === this.IsPersisted) {
      if (this.ID !== -1) {
        const existingObject = T3Gv.stdObj.GetObject(this.ID);

        if (undefined !== existingObject) {
          if (existingObject == null) {
            return null;
          } else {
            existingObject.Type = objectType ? this.Type : existingObject.Type;
            existingObject.Data = objectData ? this.Data : existingObject.Data;
            existingObject.Dirty = isDirty ? this.Dirty : existingObject.Dirty;
            existingObject.stateOptTypeId = StateConstant.StateOperationType.UPDATE;
            existingObject.IsPersisted = this.IsPersisted;
            existingObject.Delete = this.Delete;

            T3Gv.stdObj.SaveObject(existingObject);

            return existingObject;
          }
        }
      } else {
        this.stateOptTypeId = StateConstant.StateOperationType.CREATE;
        T3Gv.stdObj.SaveObject(this);
      }
    }
  }

  /**
   * Deletes the current object from storage
   */
  Delete = (): void => {
    T3Gv.stdObj.DeleteObject(this.ID);
  }
}

export default DataObj
