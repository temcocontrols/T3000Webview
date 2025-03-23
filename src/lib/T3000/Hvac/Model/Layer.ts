
import NvConstant from "../Data/Constant/NvConstant"

/**
 * Represents a layer used in the HVAC system model.
 *
 * This class encapsulates the properties needed for identifying and managing a layer within the
 * HVAC control interface. It includes basic properties such as:
 * - name: The label of the layer.
 * - flags: An indicator (using NvConstant.LayerFlags) to determine the layer's state (e.g., visibility).
 * - n: A numeric property, purpose defined based on context.
 * - index: The order or position of the layer.
 * - layertype: The type of the layer, based on NvConstant.LayerTypes.
 * - zList: A collection of related objects or elements associated with this layer.
 *
 * @example
 * // Create and configure a new Layer instance
 * const layer = new Layer();
 * layer.name = 'Main Floor';
 * layer.flags = NvConstant.LayerFlags.Visible;
 * layer.n = 0;
 * layer.index = 1;
 * layer.layertype = NvConstant.LayerTypes.None;
 * layer.zList.push({ id: 101, description: 'Zone A' });
 *
 * console.log(layer);
 *
 * @remarks
 * Typically, instances of Layer are used as part of a larger system where each layer helps manage
 * different sections or functionalities of the HVAC controls.
 */
class Layer {

  public name: string;
  public flags: number;
  public n: number;
  public index: number;
  public layertype: number;
  public zList: any[];

  constructor() {
    this.name = '';
    this.flags = NvConstant.LayerFlags.Visible;
    this.n = 0;
    this.index = 0;
    this.layertype = NvConstant.LayerTypes.None;
    this.zList = [];
  }
}

export default Layer
