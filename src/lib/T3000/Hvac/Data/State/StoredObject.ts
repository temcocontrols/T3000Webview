

import StateConstant from "./StateConstant"
import T3Gv from "../T3Gv"
import Utils1 from "../../Util/Utils1"

class StoredObject {

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
  public StateOperationTypeID: number;

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
    this.StateOperationTypeID = null;

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
            existingObject.StateOperationTypeID = StateConstant.StateOperationType.UPDATE;
            T3Gv.stdObj.SaveObject(existingObject);

            return existingObject;
          }
        }
      } else {
        this.StateOperationTypeID = StateConstant.StateOperationType.CREATE;
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

export default StoredObject
