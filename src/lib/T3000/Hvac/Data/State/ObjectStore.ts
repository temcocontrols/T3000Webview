

import Globals from "../Globals"
import GPP from "../GlobalData"
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
        GPP.stateManager.AddToCurrentState(object);
      }

      return object.ID;
    } catch (error) {
      throw error
    }
  }

  GetObject(e: number): any {
    if (e == null) return null;

    for (let t = 0; t < this.StoredObjects.length; t++) {
      if (this.StoredObjects[t].ID === e) {
        return this.StoredObjects[t];
      }
    }

    return null;
  }

  GetObjects(e: any): any[] {
    if (e != null) {
      return this.StoredObjects.filter(t => t.Type === e);
    } else {
      return this.StoredObjects;
    }
  }

  DeleteObject(e: number, t?: boolean): void {
    if (e == null) throw new Error('storedObjectID is null');

    const a = t === undefined || t;
    let r = -1;

    try {
      this.StoredObjects.forEach((obj, index) => {
        if (obj.ID === e) {
          r = index;
          return false;
        }
      });

      if (r >= 0) {
        const i = this.GetObject(e);
        i.StateOperationTypeID = Globals.StateOperationType.DELETE;
        if (a) {
          GPP.stateManager.AddToCurrentState(i);
        }
        this.StoredObjects.splice(r, 1);
      }
    } catch (error) {
      // throw new Error(error.message);
      throw error
    }
  }

  PreserveBlock(e: any): any {
    console.log('===ObjectStore.PreserveBlock e', e);
    return new StoredObject(e, null, null, null, null, true);
  }

  CreateBlock(e: any, t: any): any {
    console.log('===ObjectStore.CreateBlock e,t', e, t);
    return new StoredObject(-1, e, t, true, true, true);
  }

  SetStoredObjects(e: any[]): void {
    if (e == null) throw new Error('storedObjects is null');
    if (!(e instanceof Array)) throw new Error('storedObjects must be an array');

    this.StoredObjects = e;
  }

  DumpStoredObjects(): void {
    for (let e = 0; e < this.StoredObjects.length; ++e);
  }
}

export default ObjectStore
