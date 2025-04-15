
import { Type } from 'class-transformer'
import 'reflect-metadata'
import Layer from './Layer'
import StateConstant from '../Data/State/StateConstant';

/**
 * Manages and stores multiple HVAC layers.
 *
 * The LayersManager class is responsible for handling a collection of layers in an HVAC system.
 * It tracks the total number of layers (nlayers), stores an array of Layer objects with proper type transformation,
 * maintains an index that indicates the active layer (activelayer), and holds additional lane information in swimlanelist.
 *
 * @remarks
 * - The layers property is decorated with a type transformation to ensure that each object is correctly
 *   instantiated as a Layer.
 * - The activelayer property indicates which layer in the array is currently active.
 * - The swimlanelist property can hold any additional information linked to the layers, particularly for
 *   specialized processing or display configurations.
 *
 * @example
 * Here's how you might use the LayersManager:
 * ```typescript
 * // Create an instance of LayersManager
 * const manager = new LayersManager();
 *
 * // Add a new layer assuming you have a Layer instance
 * const newLayer = new Layer(| parameters if any |);
 * manager.layers.push(newLayer);
 *
 * // Update the total number of layers
 * manager.nlayers = manager.layers.length;
 *
 * // Set the active layer to the first one in the list
 * manager.activelayer = 0;
 *
 * // Optionally work with the swimlanelist for additional configurations
 * manager.swimlanelist.push({ id: 1, description: 'Main Swimming Lane' });
 *
 * console.log(manager);
 * ```
 *
 * @public
 */
class LayersManager {
  public Type: string;
  public nlayers: number;

  @Type(() => Layer)
  public layers: Layer[];

  public activelayer: number;

  // Double ===
  public swimlanelist: any[];

  constructor() {
    this.Type = StateConstant.StoredObjectType.LayersManagerObject;
    this.nlayers = 0;
    this.layers = new Array<Layer>();
    this.activelayer = 0;
    this.swimlanelist = [];
  }
}

export default LayersManager
