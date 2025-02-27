
import StateBase from './StateBase'
import Utils1 from '../../Helper/Utils1'
import ObjectStore from './ObjectStore'

class State extends StateBase {

  public StoredObjects: ObjectStore[];

  constructor(id?: number, name?: string, storedObjects?: ObjectStore[], rank?: number, isActive?: boolean) {
    super(id, name, rank, isActive);
    this.StoredObjects = storedObjects || [];
  }

  AddStoredObject(storedObject: any) {
    if (storedObject == null) throw new Error('Stored objects is null');
    if (storedObject.Type == null) throw new Error('Stored object type is null');
    this.StoredObjects.push(Utils1.CloneBlock(storedObject));
  }

  SetStoredObjects(storedObjects: any[]) {
    if (storedObjects == null) throw new Error('Stored objects is null');
    const clonedObjects = storedObjects.map(item => Utils1.CloneBlock(item));
    this.StoredObjects = clonedObjects;
  }

  GetStoredObjects() {
    return this.StoredObjects.map(item => Utils1.CloneBlock(item));
  }
}

export default State
