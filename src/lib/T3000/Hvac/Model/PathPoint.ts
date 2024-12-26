

class PathPoint {

  public x: number;
  public y: number;
  public moveto: boolean;
  public arrowhead: boolean;
  public curvex: number;
  public curvey: number;

  constructor(x?: number, y?: number, moveto?: boolean, arrowhead?: boolean, curvex?: number, curvey?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.moveto = moveto || false;
    this.arrowhead = arrowhead || false;
    this.curvex = curvex || 0;
    this.curvey = curvey || 0;
  }
}

export default PathPoint
