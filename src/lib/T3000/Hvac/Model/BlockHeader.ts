

/**
 * Represents the header section for a block in an HVAC control system.
 *
 * @remarks
 * This class is responsible for storing metadata about a block, such as its current state,
 * adjustment (delta) value, type, and identification. It is used to structure information for blocks
 * in multi-block configurations, where each block’s identity and order are important.
 *
 * @property state - The current state of the block.
 * @property delta - The delta adjustment value for the block.
 * @property action - An action value initialized to 0, representing an internal operation mode.
 * @property blocktype - The type of the block, indicating its category or functionality.
 * @property blockid - The unique identifier for the block.
 * @property index - The sequential index of the block within a larger configuration.
 * @property nblocks - The total number of blocks in the configuration.
 *
 * @example
 * ```typescript
 * // Creating a new BlockHeader instance with sample values:
 * const header = new BlockHeader(1, 0.5, 2, 1001, 0, 5);
 *
 * console.log(header);
 * // Expected output:
 * // BlockHeader {
 * //   state: 1,
 * //   delta: 0.5,
 * //   action: 0,
 * //   blocktype: 2,
 * //   blockid: 1001,
 * //   index: 0,
 * //   nblocks: 5
 * // }
 * ```
 */
class BlockHeader {

  public state: number;
  public delta: number;
  public action: number;
  public blocktype: number;
  public blockid: number;
  public index: number;
  public nblocks: number;

  /**
   * Creates a new BlockHeader instance
   * @param state - The state of the block
   * @param delta - The delta value for the block
   * @param blockType - The type of the block
   * @param blockId - The ID of the block
   * @param index - The index of the block
   * @param numberOfBlocks - The total number of blocks
   */
  constructor(
    state: number,
    delta: number,
    blockType: number,
    blockId: number,
    index: number,
    numberOfBlocks: number
  ) {
    this.state = state;
    this.delta = delta;
    this.action = 0;
    this.blocktype = blockType;
    this.blockid = blockId;
    this.index = index;
    this.nblocks = numberOfBlocks;
  }
}

export default BlockHeader
