
import StateBase from './StateBase'
import Utils1 from '../../Util/Utils1'
import DataStore from './DataStore'

/**
 * Represents the state of an HVAC system with mechanisms to manage a collection of stored objects.
 *
 * This class extends the base state functionality by integrating a prioritized list of objects, which
 * can be manipulated using deep cloning to ensure immutability outside the state instance. The class
 * provides methods to add a new stored object, replace all stored objects with a new collection, and
 * retrieve a deep copy of the current stored objects.
 *
 * @remarks
 * - When adding or setting stored objects, the methods perform deep clones of the objects using the
 *   utility function to prevent unintended side effects.
 * - Throws an error if any provided object or required properties (e.g., the object itself or its type)
 *   are null.
 *
 * @example
 * Here's an example demonstrating how to create and manipulate a State instance:
 *
 * ```typescript
 * // Assume DataStore and Utils1.CloneBlock are defined elsewhere
 *
 * // Initialize some DataStore items
 * const initialStoredObjects: DataStore[] = [
 *   { Type: 'TemperatureSensor', additional properties },
 * { Type: 'HumiditySensor',  additional properties }
  * ];
 *
 * // Create a new State instance
 * const hvacState = new State(1, 'HVAC Initial State', initialStoredObjects, 5, true);
 *
 * // Add a new stored object
 * const newObject: DataStore = { Type: 'PressureSensor',  additional properties };
 * hvacState.AddStoredObject(newObject);
 *
 * // Replace stored objects with a new array
 * const updatedObjects: DataStore[] = [
 * { Type: 'CO2Sensor',  additional properties }
  * ];
 * hvacState.SetStoredObjects(updatedObjects);
 *
 * // Retrieve a deep copy of the stored objects
 * const currentObjects = hvacState.GetStoredObjects();
 * LogUtil.Debug(currentObjects);
 * ```
 *
 * @public
 */
class State extends StateBase {

  /**
   * Collection of stored objects managed by this state
   */
  public storedObjects: DataStore[];

  /**
   * Initializes a new instance of the State class
   * @param id - Unique identifier for the state
   * @param name - Display name for the state
   * @param storedObjects - Initial collection of objects to store
   * @param rank - Priority/order ranking of the state
   * @param isActive - Whether the state is currently active
   */
  constructor(id?: number, name?: string, storedObjects?: DataStore[], rank?: number, isActive?: boolean) {
    super(id, name, rank, isActive);
    this.storedObjects = storedObjects || [];
  }

  /**
   * Adds a new object to the collection of stored objects
   * @param objectToStore - The object to add to the collection
   * @throws Error if the object or its type property is null
   */
  AddStoredObject(objectToStore: DataStore): void {
    if (objectToStore == null) throw new Error('Stored object is null');
    if (objectToStore.Type == null) throw new Error('Stored object type is null');
    this.storedObjects.push(Utils1.CloneBlock(objectToStore));
  }

  /**
   * Replaces all stored objects with a new collection
   * @param objectsToStore - Array of objects to store
   * @throws Error if the objects array is null
   */
  SetStoredObjects(objectsToStore: DataStore[]): void {
    if (objectsToStore == null) throw new Error('Stored objects array is null');
    const clonedObjects = objectsToStore.map(item => Utils1.CloneBlock(item));
    this.storedObjects = clonedObjects;
  }

  /**
   * Retrieves a copy of all stored objects
   * @returns Deep copy of all stored objects
   */
  GetStoredObjects(): DataStore[] {
    return this.storedObjects.map(item => Utils1.CloneBlock(item));
  }
}

export default State
