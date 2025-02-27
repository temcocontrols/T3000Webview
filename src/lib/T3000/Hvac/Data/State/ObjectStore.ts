

import Globals from "../Globals"
import GlobalData from "../GlobalData"
import Utils1 from "../../Helper/Utils1"
import StoredObject from "./StoredObject"

class ObjectStore {

  public ID: number;
  public Type: string;
  public StateOperationTypeID: number;
  public StoredObjects: ObjectStore[];

  constructor() {
    this.StoredObjects = [];
  }

  SaveObject(object: any, addToState?: boolean): number {
    if (object == null) throw new Error('storedObject is null');
    if (object.Type == null) throw new Error('storedObject type is null');

    let isAddToState = addToState === undefined || addToState;

    try {
      if (object.ID !== -1) {
        const existingObject = this.GetObject(object.ID);
        if (existingObject !== null) {
          existingObject.Type = object.Type;
          existingObject.Data = object.Data;
          existingObject.Dirty = true;
          existingObject.StateOperationTypeID = object.StateOperationTypeID;
          object = existingObject;
        } else {
          object.Dirty = true;
          this.StoredObjects.push(object);
        }
      } else {
        object.ID = this.StoredObjects.length > 0 ? Utils1.GenerateObjectID() : 0;
        if (object.Data && Utils1.isObject(object.Data)) {
          object.Data.BlockID = object.ID;
        }
        this.StoredObjects.push(object);
      }

      if (isAddToState) {
        GlobalData.stateManager.AddToCurrentState(object);
      }

      return object.ID;
    } catch (error) {
      throw error
    }
  }

  GetObject(objectId: number): any {
    if (objectId == null) return null;

    for (let t = 0; t < this.StoredObjects.length; t++) {
      if (this.StoredObjects[t].ID === objectId) {
        return this.StoredObjects[t];
      }
    }

    return null;
  }

  GetObjects(objectType: any): any[] {
    if (objectType != null) {
      return this.StoredObjects.filter(t => t.Type === objectType);
    } else {
      return this.StoredObjects;
    }
  }

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
        deleteObject.StateOperationTypeID = Globals.StateOperationType.DELETE;
        if (needAddToCurrent) {
          GlobalData.stateManager.AddToCurrentState(deleteObject);
        }
        this.StoredObjects.splice(deleteIndex, 1);
      }
    } catch (error) {
      throw error
    }
  }

  PreserveBlock(id: any): any {
    return new StoredObject(id, null, null, null, null, true);
  }

  CreateBlock(type: any, data: any): any {
    return new StoredObject(-1, type, data, true, true, true);
  }

  SetStoredObjects(stdObjects: any[]): void {
    if (stdObjects == null) throw new Error('Stored objects is null');
    if (!(stdObjects instanceof Array)) throw new Error('Stored objects is not an array');

    this.StoredObjects = stdObjects;
  }

  DumpStoredObjects(): void {
  }
}

export default ObjectStore
