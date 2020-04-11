import Vector2 from './Vector2';
export default class Line {
  static getIntersection(a: Line, b: Line): Vector2 {
    let det = a.dy * b.dx - b.dy * a.dx;
    if (!det) return undefined;
    return {
      x: (b.dx * a.intercept - a.dx * b.intercept) / det,
      y: (a.dy * b.intercept - b.dy * a.intercept) / det,
    } as Vector2;
  }

  static getPerpendicularBisector(a: Vector2, b: Vector2): Line {
    return new Line(a, b).getPerpendicular(Vector2.midpoint(a, b));
  }

  dy: number;
  dx: number;
  intercept: number;

  constructor();
  constructor(a: Vector2, b: Vector2);
  constructor(a: number, b: number, c: number);
  constructor(a?: Vector2 | number, b?: Vector2 | number, c?: number) {
    if (a == null) return;
    if (b == null) return;

    if (typeof a === 'object') {
      a = a as Vector2;
      b = b as Vector2;

      this.dy = b.y - a.y;
      this.dx = a.x - b.x;
      this.intercept = this.dy * a.x + this.dx * b.y;
    } else if (typeof a === 'number') {
      a = a as number;
      b = b as number;

      this.dy = a;
      this.dx = b;
      this.intercept = c;
    }
  }

  getPerpendicular(point: Vector2): Line {
    return new Line(-this.dx, this.dy, -this.dx * point.x + this.dy * point.y);
  }

  getY(x: number): number {
    if (!this.dx) return undefined;
    return (this.intercept - this.dy * x) / this.dx;
  }
  getX(y: number): number {
    if (!this.dy) return undefined;
    return (this.intercept - this.dx * y) / this.dy;
  }
}
