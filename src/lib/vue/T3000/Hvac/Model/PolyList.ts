
import { Type } from 'class-transformer'
import 'reflect-metadata'
import PolySeg from './PolySeg'

/**
 * Represents a polygon list with dimensions, offsets, flags, and shape-related properties.
 *
 * @remarks
 * The PolyList class is used to model a collection of polygon segments (PolySeg) along with
 * metadata about the overall polygon such as its dimensions, positional offset, and various flags.
 * It also includes properties related to shape rotation and table identifiers which might be
 * used for aligning or referencing geometric data within a larger application context.
 *
 * The constructor initializes the polygon dimensions and offset to zero, sets default values
 * for flags and closed indicators, and creates an empty array for polygon segments.
 * The 'wasline' flag indicates the polygon's previous state, likely tying into
 * application-specific logic regarding polygon behavior.
 *
 * @example
 * // Creating a new instance of PolyList and setting its properties:
 * const polyList = new PolyList();
 * polyList.dim = { x: 200, y: 150 };
 * polyList.offset = { x: 10, y: 20 };
 * polyList.flags = 3;
 * polyList.closed = 1;
 * polyList.wasline = false;
 * polyList.Shape_Rotation = 45;
 * polyList.Shape_DataID = 100;
 * polyList.Shape_TableID = 200;
 *
 * // Assuming PolySeg is defined elsewhere, add segments to the polygon:
 * polyList.segs.push(new PolySeg(| segment initialization data |));
 *
 * @public
  */
class PolyList {

  public dim: { x: number, y: number };
  public offset: { x: number, y: number };
  public flags: number;
  public closed: number;
  public wasline: boolean;
  public Shape_Rotation: number;
  public Shape_DataID: number;
  public Shape_TableID: number;

  @Type(() => PolySeg)
  public segs: PolySeg[];

  constructor() {

    this.dim = { x: 0, y: 0 };
    this.offset = { x: 0, y: 0 };
    this.flags = 0;
    this.closed = 0;
    this.wasline = true;
    this.Shape_Rotation = 0;
    this.Shape_DataID = - 1;
    this.Shape_TableID = - 1;
    this.segs = [];
  }
}

export default PolyList
