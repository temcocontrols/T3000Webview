

/**
 * Represents a collection of dynamic guide positions for HVAC models.
 *
 * @remarks
 * The DynamicGuides class is used to maintain a set of guide properties that represent various positional anchors
 * such as corners, centers, and wall boundaries. Each property is initially set to null and is expected to be assigned
 * with configuration objects representing specific guide points.
 *
 * @example
 * Here's how you might instantiate and utilize the DynamicGuides class:
 *
 * ```typescript
 * const guides = new DynamicGuides();
 *
 * // Assign positioning data to each guide
 * guides.above_left = { x: 10, y: 0 };
 * guides.below_left = { x: 10, y: 100 };
 * guides.above_right = { x: 90, y: 0 };
 * guides.below_right = { x: 90, y: 100 };
 *
 * // When configuring your HVAC layout, these guide points can help align components.
 * console.log('Left-Top Guide:', guides.left_top);
 * ```
 */
class DynamicGuides {

  public above_left: any;
  public below_left: any;
  public above_right: any;
  public below_right: any;
  public left_top: any;
  public right_top: any;
  public left_bottom: any;
  public right_bottom: any;
  public above_center: any;
  public below_center: any;
  public left_center: any;
  public right_center: any;
  public wall_left: any;
  public wall_right: any;
  public wall_top: any;
  public wall_bottom: any;

  constructor() {
    this.above_left = null;
    this.below_left = null;
    this.above_right = null;
    this.below_right = null;
    this.left_top = null;
    this.right_top = null;
    this.left_bottom = null;
    this.right_bottom = null;
    this.above_center = null;
    this.below_center = null;
    this.left_center = null;
    this.right_center = null;
    this.wall_left = null;
    this.wall_right = null;
    this.wall_top = null;
    this.wall_bottom = null;
  }
}

export default DynamicGuides
