import Point from './Point.js';
export default class Line {
  static getIntersection(a: Line, b: Line): Point {
    let det = a.dy * b.dx - b.dy * a.dx;
    if (!det) return undefined;
    return {
      x: (b.dx * a.intercept - a.dx * b.intercept) / det,
      y: (a.dy * b.intercept - b.dy * a.intercept) / det,
    } as Point;
  }

  static getPerpendicularBisector(a: Point, b: Point): Line {
    return new Line(a, b).getPerpendicular(Point.midpoint(a, b));
  }

  dy: number;
  dx: number;
  intercept: number;

  constructor();
  constructor(a: Point, b: Point);
  constructor(a: number, b: number, c: number);
  constructor(a?: Point | number, b?: Point | number, c?: number) {
    if (a == null) return;
    if (b == null) return;

    if (typeof a === 'object') {
      a = a as Point;
      b = b as Point;

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

  getPerpendicular(point: Point): Line {
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
