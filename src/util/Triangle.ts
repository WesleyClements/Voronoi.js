import Point from './Point.js';
import Line from './Line.js';
export default class Triangle {
  a: Point;
  b: Point;
  c: Point;

  constructor(a: Point, b: Point, c: Point) {
    if (a == null) throw new Error('a is null');
    if (b == null) throw new Error('b is null');
    if (c == null) throw new Error('c is null');

    this.a = a;
    this.b = b;
    this.c = c;
  }

  //#region side length
  get ABLength(): number {
    const x: number = this.a.x - this.b.x;
    const y: number = this.a.y - this.b.y;
    return Math.sqrt(x * x + y * y);
  }
  get ACLength(): number {
    const x: number = this.a.x - this.c.x;
    const y: number = this.a.y - this.c.y;
    return Math.sqrt(x * x + y * y);
  }
  get BCLength(): number {
    const x: number = this.b.x - this.c.x;
    const y: number = this.b.y - this.c.y;
    return Math.sqrt(x * x + y * y);
  }
  //#endregion

  get perimeter(): number {
    return this.ABLength + this.ACLength + this.BCLength;
  }
  get semiperimeter(): number {
    return this.perimeter / 2;
  }

  get area(): number {
    const ab: number = this.ABLength;
    const ac: number = this.ACLength;
    const bc: number = this.BCLength;
    const semi: number = this.semiperimeter;

    const sidesAreNotZero = () => ab !== 0 && ac !== 0 && bc !== 0;
    const sidesAreNotInLine = () => semi !== ab && semi !== ac && semi !== bc;
    if (sidesAreNotZero() && sidesAreNotInLine()) return sqrt(semi * (semi - ab) * (semi - ac) * (semi - bc));
    else return 0;
  }
  get circumcenter(): Point {
    return Line.getIntersection(
      Line.getPerpendicularBisector(this.a, this.b),
      Line.getPerpendicularBisector(this.a, this.c),
    );
  }
}
