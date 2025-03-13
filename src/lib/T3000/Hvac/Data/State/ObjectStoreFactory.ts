
import ObjectStore from './ObjectStore'

class ObjectStoreFactory {
  /**
   * Creates a new object store with optional initial objects
   * @param initialObjects - Optional array of initial objects to store
   * @returns Object with methods to manipulate the store
   */
  Create(initialObjects?: any[]) {
    let store = new ObjectStore();

    if (Array.isArray(initialObjects)) {
      store.StoredObjects = initialObjects;
    }

    return {
      /**
       * Sets objects in the store
       * @param objects - Array of objects to store
       * @throws Error if objects is null or not an array
       */
      Set: function (objects: any[]) {
        if (objects === null) throw new Error('Stored objects cannot be null');
        if (!Array.isArray(objects)) throw new Error('Stored objects is not an array');
        store.StoredObjects = objects;
      },

      /**
       * Gets all stored objects
       * @returns Array of stored objects
       */
      Get: function () {
        return store.StoredObjects;
      },

      /**
       * Clears all objects from the store
       */
      Clear: function () {
        store.StoredObjects = [];
      }
    };
  }
}

export default ObjectStoreFactory


