


/**
 * Represents the geometric and angular properties of a segment.
 *
 * The SegmentData class encapsulates three different forms of segment representations:
 *
 * - "origSeg": The original segment defined by its start and end coordinates.
 * - "clipSeg": A clipped segment representation, useful for operations where the segment
 *    is trimmed or limited to a certain boundary.
 * - "extSeg": An extended segment structure that includes additional points:
 *    - startRay: Point representing the starting ray of the segment.
 *    - startExt: The extended starting point beyond the original segment.
 *    - start: The original starting point.
 *    - end: The original ending point.
 *    - endExt: The extended ending point beyond the original segment.
 *    - endRay: Point representing the ending ray of the segment.
 *
 * Additionally, the class stores an "angle" which likely indicates the orientation or
 * rotation of the segment, possibly used when aligning segments or performing geometric transformations.
 *
 * @example
 * const segment = new SegmentData();
 * segment.angle = 45;
 * segment.origSeg = { start: { x: 10, y: 20 }, end: { x: 30, y: 40 } };
 * // Setting additional segment details as needed
 * segment.clipSeg = { start: { x: 15, y: 25 }, end: { x: 25, y: 35 } };
 * segment.extSeg = {
 *   startRay: { x: 5, y: 15 },
 *   startExt: { x: 8, y: 18 },
 *   start: { x: 10, y: 20 },
 *   end: { x: 30, y: 40 },
 *   endExt: { x: 32, y: 42 },
 *   endRay: { x: 35, y: 45 }
 * };
 */
class SegmentData {

  public angle: number;
  public origSeg: { start: { x: number, y: number }, end: { x: number, y: number } };
  public clipSeg: { start: { x: number, y: number }, end: { x: number, y: number } };
  public extSeg: { startRay: { x: number, y: number }, startExt: { x: number, y: number }, start: { x: number, y: number }, end: { x: number, y: number }, endExt: { x: number, y: number }, endRay: { x: number, y: number } };

  constructor() {

    this.angle = 0;
    this.origSeg = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    this.clipSeg = { start: { x: 0, y: 0 }, end: { x: 0, y: 0 } };
    this.extSeg = {
      startRay: { x: 0, y: 0 },
      startExt: { x: 0, y: 0 },
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      endExt: { x: 0, y: 0 },
      endRay: { x: 0, y: 0 }
    }

  }
}

export default SegmentData
