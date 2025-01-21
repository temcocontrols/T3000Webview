
import ObjectStore from './ObjectStore'

class ObjectStoreFactory {
  Create(e?: any) {
    var t = new ObjectStore();

    if (null != e || e instanceof Array) {
      t.StoredObjects = e;

      return {
        Set: function (e) {
          if (null == e) throw new Error('storedObjects cannot be null');

          if (!(e instanceof Array)) throw new Error('storedObjects must be an array');
          t.StoredObjects = e
        },
        Get: function () {
          return t.StoredObjects
        },
        Clear: function () {
          t.StoredObjects = []
        }
      }
    }
  }
}

export default ObjectStoreFactory

