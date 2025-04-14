
import DataStore from './DataStore'

/**
 * Factory class to create and manage object stores.
 *
 * This class provides a method to create a new object store that can be initialized with an optional
 * array of objects. The store comes with three primary methods:
 *
 * - Set: Updates the store with a new array of objects. This method ensures that the provided value is a valid array,
 *   throwing errors for invalid input (null or non-array).
 * - Get: Retrieves the current list of objects stored.
 * - Clear: Empties the store by setting its contents to an empty array.
 *
 * @remarks
 * The design encapsulates the store variable inside the factory method, exposing only the methods to manipulate the
 * store (Set, Get, and Clear), thus promoting controlled access to the stored objects.
 *
 * @example
 * const factory = new DataStoreFactory();
 *
 * // Creating a store with initial objects
 * const store = factory.Create([{ id: 1, name: "Object 1" }, { id: 2, name: "Object 2" }]);
 *
 * // Retrieving objects from the store
 * console.log(store.Get()); // Output: [{ id: 1, name: "Object 1" }, { id: 2, name: "Object 2" }]
 *
 * // Updating the store with a new set of objects
 * store.Set([{ id: 3, name: "Object 3" }]);
 *
 * // Clearing the store
 * store.Clear();
 * console.log(store.Get()); // Output: []
 *
 * @public
 */
class DataStoreFactory {
  /**
   * Creates a new object store with optional initial objects
   * @param initialObjects - Optional array of initial objects to store
   * @returns Object with methods to manipulate the store
   */
  Create(initialObjects?: any[]) {
    let store = new DataStore();

    if (Array.isArray(initialObjects)) {
      store.storedObjects = initialObjects;
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
        store.storedObjects = objects;
      },

      /**
       * Gets all stored objects
       * @returns Array of stored objects
       */
      Get: function () {
        return store.storedObjects;
      },

      /**
       * Clears all objects from the store
       */
      Clear: function () {
        store.storedObjects = [];
      }
    };
  }
}

export default DataStoreFactory


