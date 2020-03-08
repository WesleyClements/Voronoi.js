import { equalWithEpsilon } from './FloatUtil.js';

export default class Vector2 {
  static clone(point: Vector2) {
    return new Vector2(point.x, point.y);
  }

  static equal(a: Vector2, b: Vector2): boolean {
    return a.x === b.x && a.y === b.y;
  }
  static equalApproximate(a: Vector2, b: Vector2): boolean {
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

  static add(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x + b.x, a.y + b.y);
  }
  static subtract(a: Vector2, b: Vector2): Vector2 {
    return new Vector2(a.x - b.x, a.y - b.y);
  }

  static scale(point: Vector2, scalar: number): Vector2 {
    return new Vector2(point.x * scalar, point.y * scalar);
  }

  x: number;
  y: number;

  constructor(x: number = 0, y: number = 0) {
    this.x = x;
    this.y = y;
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
