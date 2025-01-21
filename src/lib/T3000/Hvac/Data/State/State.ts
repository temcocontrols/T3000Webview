
import StateBase from './StateBase'
import Utils1 from '../../Helper/Utils1'
import ObjectStore from './ObjectStore'

class State extends StateBase {

  public StoredObjects: ObjectStore[];

  constructor(e?: number, t?: string, a?: ObjectStore[], r?: number, i?: boolean) {
    super(e, t, r, i);
    this.StoredObjects = a || [];
  }

  AddStoredObject(e: any) {
    if (e == null) throw new Error('storedObject is null');
    if (e.Type == null) throw new Error('storedObject type is null');
    this.StoredObjects.push(Utils1.CloneBlock(e));
  }

  SetStoredObjects(e: any[]) {
    if (e == null) throw new Error('storedObjects is null');
    const t = e.map(item => Utils1.CloneBlock(item));
    this.StoredObjects = t;
  }

  GetStoredObjects() {
    return this.StoredObjects.map(item => Utils1.CloneBlock(item));
  }
}

export default State
