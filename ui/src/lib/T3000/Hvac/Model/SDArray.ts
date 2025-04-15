

import { Type } from 'class-transformer'
import 'reflect-metadata'
import CRect from './CRect'

/**
 * Represents a configuration array for HVAC-related style and structural parameters.
 *
 * This class encapsulates various numeric properties that define the layout, orientation, and
 * additional flags for a HVAC model. It includes properties for dimensions, angles, and a set of
 * custom flags. The `profile` and `coprofile` properties, both instances of the `CRect` class,
 * define rectangular areas possibly used for graphical representations or boundary definitions
 * in the HVAC domain.
 *
 * @remarks
 * The default constructor initializes all numeric properties to zero except for `lasttexthook`,
 * which is set to -1. Both `profile` and `coprofile` are initialized as new instances of `CRect`
 * with zero dimensions, and the arrays `steps` and `hook` are created as empty arrays.
 *
 * @example
 * An example of how to create and use a SDArray instance:
 * ```typescript
 * // Create a new SDArray instance
 * const SDArray = new SDArray();
 *
 * // Output initial style flags (default is 0)
 * console.log(sdArray.styleflags); // 0
 *
 * // Modify properties as needed
 * sdArray.tilt = 45;
 * sdArray.angle = 90;
 * sdArray.ht = 150;
 * sdArray.wd = 200;
 *
 * // Display updated values
 * console.log(`Tilt: ${sdArray.tilt}, Angle: ${sdArray.angle}, Height: ${sdArray.ht}, Width: ${sdArray.wd}`);
 * ```
 *
 * @public
 */
class SDArray {

  public styleflags: number;
  public tilt: number;
  public angle: number;
  public ht: number;
  public wd: number;
  public flags: number;
  public matchsizelen: number;
  public lasttexthook: number;
  public curveparam: number;

  @Type(() => CRect)
  public profile: CRect;

  @Type(() => CRect)
  public coprofile: CRect;

  public steps: any[];
  public hook: any[];

  constructor() {
    this.styleflags = 0;
    this.tilt = 0;
    this.angle = 0;
    this.ht = 0;
    this.wd = 0;
    this.flags = 0;
    this.matchsizelen = 0;
    this.lasttexthook = -1;
    this.curveparam = 0;
    this.profile = new CRect(0, 0, 0, 0);
    this.coprofile = new CRect(0, 0, 0, 0);
    this.steps = [];
    this.hook = [];
  }
}

export default SDArray
