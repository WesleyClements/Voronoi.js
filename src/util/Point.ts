export default class Point {
  x: number;
  y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
  static clone(point: Point) {
    return new Point(point.x, point.y);
  }
  static equal(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  static midpoint(a: Point, b: Point): Point {
    return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
  }

  static add(a: Point, b: Point): Point {
    return new Point(a.x + b.x, a.y + b.y);
  }
  static subtract(a: Point, b: Point): Point {
    return new Point(a.x - b.x, a.y - b.y);
  }

  static scale(point: Point, scalar: number): Point {
    return new Point(point.x * scalar, point.y * scalar);
  }

  add?(other: Point): Point {
    this.x += other.x;
    this.y += other.y;
    return this;
  }
  subtract?(other: Point): Point {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  scale?(scalar: number): Point {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
}
