

class Rectangle {

  public x: number;
  public y: number;
  public width: number;
  public height: number;

  constructor(x?: number, y?: number, width?: number, height?: number) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
  }
}

export default Rectangle
