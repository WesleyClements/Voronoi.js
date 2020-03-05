import Point from './Point.js';
import Line from './Line.js';
export default class Triangle {
  constructor(a, b, c) {
    this.a = a;
    this.b = b;
    this.c = c;
    // this._AB = undefined;
    // this._AC = undefined;
    // this._BC = undefined;
    // this._perimeter = undefined;
    // this._area = undefined;
    // this._circumcenter = undefined;
  }
  get AB() {
    if (this._AB == null) {
      const x = this.a.x - this.b.x;
      const y = this.a.y - this.b.y;
      this._AB = Math.sqrt(x * x + y * y);
    }
    return this._AB;
  }
  get AC() {
    if (this._AC == null) {
      const x = this.a.x - this.c.x;
      const y = this.a.y - this.c.y;
      this._AC = Math.sqrt(x * x + y * y);
    }
    return this._AC;
  }
  get BC() {
    if (this._BC == null) {
      const x = this.b.x - this.c.x;
      const y = this.b.y - this.c.y;
      this._BC = Math.sqrt(x * x + y * y);
    }
    return this._BC;
  }
  get perimeter() {
    if (this._perimeter == null) {
      this._perimeter = this.AB + this.AC + this.BC;
    }
    return this._perimeter;
  }
  get area() {
    if (this._area == null) {
      const semi = this.perimeter / 2;
      const sidesAreNotZero = () => this.AB !== 0 && this.AC !== 0 && this.BC !== 0;
      const sidesAreNotInLine = () => semi !== this.AB && semi !== this.AC && semi !== this.BC;
      if (sidesAreNotZero() && sidesAreNotInLine())
        this._area = sqrt(semi * (semi - this.AB) * (semi - this.AC) * (semi - this.BC));
      else this._area = 0;
    }
    return this._area;
  }
  get circumcenter() {
    if (this._circumcenter == null) {
      const intersection = Line.intersection(
        Line.getPerpendicularBisector(this.a, this.b),
        Line.getPerpendicularBisector(this.a, this.c),
      );
      if (intersection) this._circumcenter = intersection;
      else this._circumcenter = false;
    }
    if (this._circumcenter) return Point.from(this._circumcenter);
    else return this._circumcenter;
  }
}
