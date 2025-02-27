
import ObjectStore from './ObjectStore'

class ObjectStoreFactory {

  Create(stdObjs?: any) {

    var obj = new ObjectStore();

    if (null != stdObjs || stdObjs instanceof Array) {
      obj.StoredObjects = stdObjs;
    }

    return {
      Set: function (stdObjs) {
        if (null == stdObjs) throw new Error('Stored objects cannot be null');
        if (!(stdObjs instanceof Array)) throw new Error('Stored objects is not an array');
        obj.StoredObjects = stdObjs
      },
      Get: function () {
        return obj.StoredObjects
      },
      Clear: function () {
        obj.StoredObjects = []
      }
    }
  }
}

export default ObjectStoreFactory


