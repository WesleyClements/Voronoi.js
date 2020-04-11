import Vector2 from './Vector2';
import Line from './Line';
import LineSegment from './LineSegment';

export default class Triangle {
  a: Vector2;
  b: Vector2;
  c: Vector2;

  constructor(a: Vector2, b: Vector2, c: Vector2) {
    this.a = a;
    this.b = b;
    this.c = c;
  }

  get AB(): LineSegment {
    return new LineSegment(this.a, this.b);
  }
  get AC(): LineSegment {
    return new LineSegment(this.a, this.c);
  }
  get BC(): LineSegment {
    return new LineSegment(this.b, this.c);
  }

  get perimeter(): number {
    return this.AB.length + this.AC.length + this.BC.length;
  }
  get semiperimeter(): number {
    return this.perimeter / 2;
  }

  get area(): number {
    return Math.abs(Vector2.cross(this.a, this.b) + Vector2.cross(this.b, this.c) + Vector2.cross(this.c, this.a)) / 2;
  }

  get centroid(): Vector2 {
    return new Vector2((this.a.x + this.b.x + this.c.x) / 3, (this.a.y + this.b.y + this.c.y) / 3);
  }

  get circumcenter(): Vector2 {
    return Line.getIntersection(
      Line.getPerpendicularBisector(this.a, this.b),
      Line.getPerpendicularBisector(this.a, this.c),
    );
  }
}
