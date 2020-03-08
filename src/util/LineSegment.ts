import Vector2 from './Vector2.js';
export default class LineSegment {
  static draw(a: Vector2, b: Vector2): void {
    if (!a || !b) return;
    line(a.x, a.y, b.x, b.y);
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

  draw(): void {
    LineSegment.draw(this.a, this.b);
  }
}
