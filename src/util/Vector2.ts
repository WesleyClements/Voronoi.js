import { equalWithEpsilon } from './FloatUtil';

export default class Vector2 {
  static get zero(): Vector2 {
    return new Vector2();
  }
  static get up(): Vector2 {
    return new Vector2(0, 1);
  }
  static get down(): Vector2 {
    return new Vector2(0, -1);
  }
  static get right(): Vector2 {
    return new Vector2(1, 0);
  }
  static get left(): Vector2 {
    return new Vector2(-1, 0);
  }
  static get infinity(): Vector2 {
    return new Vector2(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  }

  static clone(point: Vector2) {
    return new Vector2(point.x, point.y);
  }

  static equal(a: Vector2, b: Vector2): boolean {
    if (!a || !b) return false;
    return a.x === b.x && a.y === b.y;
  }
  static equalApproximate(a: Vector2, b: Vector2): boolean {
    if (!a || !b) return false;
    return equalWithEpsilon(a.x, b.x) && equalWithEpsilon(a.y, b.y);
  }

  static compareY(a: Vector2, b: Vector2): number {
    let diff: number = b.y - a.y;
    if (diff) return diff;
    else return b.x - a.x;
  }
  static compareX(a: Vector2, b: Vector2): number {
    let diff: number = b.x - a.x;
    if (diff) return diff;
    else return b.y - a.y;
  }

  static dot(a: Vector2, b: Vector2): number {
    return a.x * b.x + a.y * b.y;
  }

  static cross(a: Vector2, b: Vector2): number {
    return a.x * b.y - a.y * b.x;
  }

  static distanceSquared(a: Vector2, b: Vector2): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
  }
  static distance(a: Vector2, b: Vector2): number {
    return Math.sqrt(Vector2.distanceSquared(a, b));
  }

  static midpoint(a: Vector2, b: Vector2): Vector2 {
    return new Vector2((a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  static centroid(...points: Vector2[]): Vector2 {
    if (!points) return null;
    const centroid = points.reduce((sum, point) => sum.add(point), new Vector2());
    centroid.x /= points.length;
    centroid.y /= points.length;
    return centroid;
  }

  static add(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x + b.x, a.y + b.y);
  }
  static subtract(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static scale(point: Vector2, scalar: number): Vector2 {
    return new Vector2(point.x * scalar, point.y * scalar);
  }

  static lerp(from: Vector2, to: Vector2, t: number) {
    const tMinus = 1 - t;
    return new Vector2(from.x * tMinus + to.x * t, from.y * tMinus + to.y * t);
  }

  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
  }

  get lengthSquared(): number {
    return this.x * this.x + this.y * this.y;
  }
  get length(): number {
    return Math.sqrt(this.lengthSquared);
  }

  get normalized(): Vector2 {
    const length = this.length;
    if (equalWithEpsilon(length, 0)) return null;
    return new Vector2(this.x / length, this.y / length);
  }

  get perpendicular(): Vector2 {
    return new Vector2(this.y, -this.x);
  }

  negate(): Vector2 {
    this.x = -this.x;
    this.y = -this.y;
    return this;
  }

  add?(other: Vector2): Vector2 {
    this.x += other.x;
    this.y += other.y;
    return this;
  }
  subtract?(other: Vector2): Vector2 {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }

  scale?(scalar: number): Vector2 {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
}
