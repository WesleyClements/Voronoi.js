export default class Point {
  static clone(point: Point) {
    return new Point(point.x, point.y);
  }
  static equal(a: Point, b: Point): boolean {
    return a.x === b.x && a.y === b.y;
  }

  static compare(a: Point, b: Point, compareYFirst: boolean = true): number {
    let diff: number = compareYFirst ? b.y - a.y : b.x - a.x;
    if (diff) return diff;
    else return compareYFirst ? b.x - a.x : b.y - a.y;
  }

  static distanceSquared(a: Point, b: Point): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
  static distance(a: Point, b: Point): number {
    return Math.sqrt(Point.distanceSquared(a, b));
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

  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
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
