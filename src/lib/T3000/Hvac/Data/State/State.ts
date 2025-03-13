
import StateBase from './StateBase'
import Utils1 from '../../Helper/Utils1'
import ObjectStore from './ObjectStore'

class State extends StateBase {

  /**
   * Collection of stored objects managed by this state
   */
  public StoredObjects: ObjectStore[];

  /**
   * Initializes a new instance of the State class
   * @param id - Unique identifier for the state
   * @param name - Display name for the state
   * @param storedObjects - Initial collection of objects to store
   * @param rank - Priority/order ranking of the state
   * @param isActive - Whether the state is currently active
   */
  constructor(id?: number, name?: string, storedObjects?: ObjectStore[], rank?: number, isActive?: boolean) {
    super(id, name, rank, isActive);
    this.StoredObjects = storedObjects || [];
  }

  /**
   * Adds a new object to the collection of stored objects
   * @param objectToStore - The object to add to the collection
   * @throws Error if the object or its type property is null
   */
  AddStoredObject(objectToStore: ObjectStore): void {
    if (objectToStore == null) throw new Error('Stored object is null');
    if (objectToStore.Type == null) throw new Error('Stored object type is null');
    this.StoredObjects.push(Utils1.CloneBlock(objectToStore));
  }

  /**
   * Replaces all stored objects with a new collection
   * @param objectsToStore - Array of objects to store
   * @throws Error if the objects array is null
   */
  SetStoredObjects(objectsToStore: ObjectStore[]): void {
    if (objectsToStore == null) throw new Error('Stored objects array is null');
    const clonedObjects = objectsToStore.map(item => Utils1.CloneBlock(item));
    this.StoredObjects = clonedObjects;
  }

  /**
   * Retrieves a copy of all stored objects
   * @returns Deep copy of all stored objects
   */
  GetStoredObjects(): ObjectStore[] {
    return this.StoredObjects.map(item => Utils1.CloneBlock(item));
  }
}

export default State
