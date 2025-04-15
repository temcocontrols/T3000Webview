

/**
 * Represents an arrowhead record used to configure the visual representation and identifiers of arrowheads
 * in HVAC models. This class contains properties for the start and end arrow identifiers, display flags, and
 * an index indicating the arrow's size.
 *
 * @remarks
 * The ArrowheadRecord class is designed to encapsulate the configuration data for arrowheads. Each instance
 * holds the following properties:
 * - StartArrowID: A numeric identifier for the starting arrow.
 * - StartArrowDisp: A boolean flag indicating whether the starting arrow should be displayed.
 * - EndArrowID: A numeric identifier for the ending arrow.
 * - EndArrowDisp: A boolean flag indicating whether the ending arrow should be displayed.
 * - ArrowSizeIndex: A numeric index representing the size of the arrow.
 *
 * @example
 * Here's how you can create and utilize an ArrowheadRecord instance:
 *
 * const arrowRecord = new ArrowheadRecord();
 * arrowRecord.StartArrowID = 5;
 * arrowRecord.StartArrowDisp = true;
 * arrowRecord.EndArrowID = 10;
 * arrowRecord.EndArrowDisp = false;
 * arrowRecord.ArrowSizeIndex = 2;
 *
 * console.log(`Start Arrow: ID=${arrowRecord.StartArrowID}, Display=${arrowRecord.StartArrowDisp}`);
 * console.log(`End Arrow: ID=${arrowRecord.EndArrowID}, Display=${arrowRecord.EndArrowDisp}`);
 *
 * Use this class to simplify managing arrow configurations, which is especially helpful in scenarios involving the
 * dynamic rendering of HVAC control diagrams or simulations.
 */
class ArrowheadRecord {

  public StartArrowID: number;
  public StartArrowDisp: boolean;
  public EndArrowID: number;
  public EndArrowDisp: boolean;
  public ArrowSizeIndex: number;

  constructor() {
    this.StartArrowID = 0;
    this.StartArrowDisp = false;
    this.EndArrowID = 0;
    this.EndArrowDisp = false;
    this.ArrowSizeIndex = 1;
  }

}

export default ArrowheadRecord
