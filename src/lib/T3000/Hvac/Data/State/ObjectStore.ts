

import StateConstant from "./StateConstant"
import T3Gv from "../T3Gv"
import Utils1 from "../../Util/Utils1"
import StoredObject from "./StoredObject"

class ObjectStore {

  /** Object ID */
  public ID: number;

  /** Type of stored object */
  public Type: string;

  /** State operation type identifier */
  public StateOperationTypeID: number;

  /** Collection of stored objects */
  public StoredObjects: ObjectStore[];

  public Data: any;

  /**
   * Initializes a new instance of ObjectStore
   */
  constructor() {
    this.StoredObjects = [];
  }

  /**
   * Saves an object to the store
   * @param storedObject - The object to be saved
   * @param addToState - Whether to add the object to the current state (defaults to true)
   * @returns The ID of the saved object
   * @throws Error if storedObject is null or has no Type property
   */
  SaveObject(storedObject: any, addToState?: boolean): number {
    if (storedObject == null) throw new Error('storedObject is null');
    if (storedObject.Type == null) throw new Error('storedObject type is null');

    let isAddToState = addToState === undefined || addToState;

    try {
      if (storedObject.ID !== -1) {
        const existingObject = this.GetObject(storedObject.ID);
        if (existingObject !== null) {
          existingObject.Type = storedObject.Type;
          existingObject.Data = storedObject.Data;
          existingObject.Dirty = true;
          existingObject.StateOperationTypeID = storedObject.StateOperationTypeID;
          storedObject = existingObject;
        } else {
          storedObject.Dirty = true;
          this.StoredObjects.push(storedObject);
        }
      } else {
        storedObject.ID = this.StoredObjects.length > 0 ? Utils1.GenerateObjectID() : 0;
        if (storedObject.Data && Utils1.isObject(storedObject.Data)) {
          storedObject.Data.BlockID = storedObject.ID;
        }
        this.StoredObjects.push(storedObject);
      }

      if (isAddToState) {
        T3Gv.state.AddToCurrentState(storedObject);
      }

      return storedObject.ID;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Gets an object by its ID
   * @param objectId - The ID of the object to retrieve
   * @returns The found object or null if not found
   */
  GetObject(objectId: number): any {
    if (objectId == null) return null;

    for (let t = 0; t < this.StoredObjects.length; t++) {
      if (this.StoredObjects[t].ID === objectId) {
        return this.StoredObjects[t];
      }
    }

    return null;
  }

  /**
   * Gets objects by type or returns all objects
   * @param objectType - The type of objects to retrieve (optional)
   * @returns Array of objects matching the specified type or all objects if no type provided
   */
  GetObjects(objectType: any): any[] {
    if (objectType != null) {
      return this.StoredObjects.filter(t => t.Type === objectType);
    } else {
      return this.StoredObjects;
    }
  }

  /**
   * Deletes an object from the store
   * @param objectId - The ID of the object to delete
   * @param isAddToState - Whether to add the deletion to the current state (defaults to true)
   * @throws Error if objectId is null
   */
  DeleteObject(objectId: number, isAddToState?: boolean): void {
    if (objectId == null) throw new Error('Object ID is null');

    const needAddToCurrent = isAddToState === undefined || isAddToState;
    let deleteIndex = -1;

    try {
      this.StoredObjects.forEach((obj, index) => {
        if (obj.ID === objectId) {
          deleteIndex = index;
          return false;
        }
      });

      if (deleteIndex >= 0) {
        const deleteObject = this.GetObject(objectId);
        deleteObject.StateOperationTypeID = StateConstant.StateOperationType.DELETE;
        if (needAddToCurrent) {
          T3Gv.state.AddToCurrentState(deleteObject);
        }
        this.StoredObjects.splice(deleteIndex, 1);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Creates a preserved block with an existing ID
   * @param blockId - The ID to preserve
   * @returns New StoredObject instance with preserved properties
   */
  PreserveBlock(blockId: any): any {
    return new StoredObject(blockId, null, null, null, null, true);
  }

  /**
   * Creates a new block with specified type and data
   * @param blockType - The type of block to create
   * @param data - The data for the new block
   * @returns New StoredObject instance
   */
  CreateBlock(blockType: any, data: any): any {
    return new StoredObject(-1, blockType, data, true, true, true);
  }

  /**
   * Sets the stored objects collection
   * @param storedObjectsArray - Array of objects to set as the stored objects
   * @throws Error if input is null or not an array
   */
  SetStoredObjects(storedObjectsArray: any[]): void {
    if (storedObjectsArray == null) throw new Error('Stored objects is null');
    if (!(storedObjectsArray instanceof Array)) throw new Error('Stored objects is not an array');

    this.StoredObjects = storedObjectsArray;
  }
}

export default ObjectStore
