

/**
 * Represents a shape container for HVAC configurations.
 *
 * This class encapsulates information for a container element used in HVAC systems.
 * It consists of the following properties:
 * - id: A numeric identifier for the container. It is initialized to -1.
 * - pt: An object containing x and y coordinates representing the container's position. It is initialized to { x: 0, y: 0 }.
 * - extra: A numerical property for storing additional information. It is initialized to 0.
 *
 * @example
 * // Create and configure a ContainerListShape instance
 * const container = new ContainerListShape();
 * container.id = 1;
 * container.pt = { x: 150, y: 75 };
 * container.extra = 5;
 *
 * console.log(`Container ID: ${container.id}, Position: (${container.pt.x}, ${container.pt.y}), Extra: ${container.extra}`);
 */
class ContainerListShape {

  public id: number;
  public pt: { x: number, y: number };
  public extra: number;

  constructor() {
    this.id = -1;
    this.pt = { x: 0, y: 0 };
    this.extra = 0;
  }
}

export default ContainerListShape
