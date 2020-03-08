import Vector2 from './Vector2.js';
import Line from './Line.js';
import LineSegment from './LineSegment.js';

export default class Triangle {
  a: Vector2;
  b: Vector2;
  c: Vector2;

  constructor(a: Vector2, b: Vector2, c: Vector2) {
    if (a == null) throw new Error('a is null');
    if (b == null) throw new Error('b is null');
    if (c == null) throw new Error('c is null');

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
    const ab: number = this.AB.length;
    const ac: number = this.AC.length;
    const bc: number = this.BC.length;
    const semi: number = this.semiperimeter;

    const sidesAreNotZero = () => ab !== 0 && ac !== 0 && bc !== 0;
    const sidesAreNotInLine = () => semi !== ab && semi !== ac && semi !== bc;
    if (sidesAreNotZero() && sidesAreNotInLine()) return sqrt(semi * (semi - ab) * (semi - ac) * (semi - bc));
    else return 0;
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
