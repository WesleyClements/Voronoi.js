import Vector2 from './Vector2.js';
import AABB from './AABB.js';

export default class LineSegment {
  static draw(a: Vector2, b: Vector2): void {
    if (!a || !b) return;
    line(a.x, a.y, b.x, b.y);
  }

  static getBoundingAABB(a: Vector2, b: Vector2): AABB {
    return new AABB(
      new Vector2(Math.min(a.x, b.x), Math.min(a.y, b.y)),
      new Vector2(Math.max(a.x, b.x), Math.max(a.y, b.y)),
    );
  }

  a: Vector2;
  b: Vector2;

  constructor(start: Vector2, end: Vector2) {
    this.a = start;
    this.b = end;
  }

  get length(): number {
    return Vector2.distance(this.a, this.b);
  }

  get midpoint(): Vector2 {
    return Vector2.midpoint(this.a, this.b);
  }

  get boundingAABB(): AABB {
    return LineSegment.getBoundingAABB(this.a, this.b);
  }

  draw(): void {
    LineSegment.draw(this.a, this.b);
  }
}
