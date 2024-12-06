
import Path from './Basic.Path';

class Line extends Path {

  constructor() {
    super();
  }

  SetPoints(e: number, t: number, a: number, r: number): void {
    const path = this.PathCreator();
    path.BeginPath();
    path.MoveTo(e, t);
    path.LineTo(a, r);
    const pathString = path.ToString();
    this.SetPath(pathString, {
      x: Math.min(e, a),
      y: Math.min(t, r),
      width: Math.abs(a - e),
      height: Math.abs(r - t)
    });
  }
}

export default Line;
