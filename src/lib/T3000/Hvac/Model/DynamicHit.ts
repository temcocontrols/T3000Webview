/**
 * Represents a dynamic hit point in the HVAC visualization system
 * Used for snap points, edge detection, and interactive elements
 */
class DynamicHit {
  /** Unique identifier for the hit point */
  ID: number;

  /** Snap priority or type */
  snap: number;

  /** Edge identifier or type */
  edge: number;

  /** Distance from reference point */
  distance: number;

  /** Positioning indicator for left-right axis (-1, 0, 1) */
  leftright: number;

  /** Positioning indicator for above-left axis */
  aboveleft: number;

  /** Display or identification label */
  label: string;

  /** Point coordinates or reference */
  pt: any;

  /** Collection of related hit points */
  otherhits: any[] = [];

  /**
   * Creates a new dynamic hit point
   * @param id - Unique identifier for the hit point
   * @param snapValue - Snap priority or type
   * @param edgeType - Edge identifier or type
   * @param distanceValue - Distance from reference point
   * @param horizontalPosition - Positioning indicator for left-right axis
   * @param verticalPosition - Positioning indicator for above-left axis
   * @param labelText - Display or identification label
   */
  constructor(
    id: number,
    snapValue: number,
    edgeType: number,
    distanceValue: number,
    horizontalPosition: number,
    verticalPosition: number,
    labelText: string
  ) {
    this.ID = id;
    this.snap = snapValue;
    this.edge = edgeType;
    this.distance = distanceValue;
    this.leftright = horizontalPosition;
    this.aboveleft = verticalPosition;
    this.label = labelText;
    this.pt = null;
    this.otherhits = [];
  }
}

export default DynamicHit
