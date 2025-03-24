
import { Type } from 'class-transformer'
import 'reflect-metadata'
import CRect from './CRect'
import NvConstant from '../Data/Constant/NvConstant'
import OptConstant from '../Data/Constant/OptConstant';

/**
 * Represents a hook connection utilized in the HVAC system, defining spatial positions and
 * various configuration parameters to establish relationships between different components.
 *
 * This hook model encapsulates the starting point and endpoint coordinates, along with a set of
 * properties that include unique identifiers, spacing parameters, and a rendering rectangle.
 * The class constructor initializes all properties with their default values, ensuring a
 * predictable and reliable state upon instantiation.
 *
 * @example
 * // Creating and configuring a SDHook instance
 * const hook = new SDHook();
 * hook.startpoint = { h: 10, v: 20 };
 * hook.endpoint = { h: 100, v: 200 };
 * hook.id = 1;
 * hook.textid = 50;
 * hook.tuniqueid = 999;
 * hook.gap = 15;
 * hook.ogap = 0;
 * hook.extra = 0;
 * hook.comanagerht = 0;
 * hook.isasst = false;
 * hook.pr = new CRect(0, 0, 50, 50);
 * hook.sequence = 1;
 * hook.steps.push({ step: 'initialize', status: 'pending' });
 *
 * // This instance can then be used in further HVAC control logic
 * processHook(hook);
 *
 * @remarks
 * The SDHook class provides a structured approach to manage hook connections by bundling
 * various related parameters. Its comprehensive default initialization simplifies the use of the
 * class by avoiding the need for explicit property setup post-instantiation.
 */
class SDHook {

  public startpoint: any;
  public endpoint: any;
  public id: number;
  public textid: number;
  public tuniqueid: number;
  public gap: number;
  public ogap: number;
  public extra: number;
  public comanagerht: number;
  public isasst: boolean;

  @Type(() => CRect)
  public pr: CRect;

  public sequence: number;
  public steps: any[];

  constructor() {
    this.startpoint = { h: 0, v: 0 };
    this.endpoint = { h: 0, v: 0 };
    this.id = - 1;
    this.textid = - 1;
    this.tuniqueid = - 1;
    this.gap = OptConstant.ConnectorDefines.DefaultWd;
    this.ogap = 0;
    this.extra = 0;
    this.comanagerht = 0;
    this.isasst = !1;
    this.pr = new CRect(0, 0, 0, 0);
    this.sequence = 0;
    this.steps = [];
  }
}

export default SDHook
