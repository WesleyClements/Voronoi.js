class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static from(other) {
    return new Point(other.x, other.y);
  }
  static equal(a, b) {
    return a.x === b.x && a.y === b.y;
  }
  static add(a, b) {
    return new Point(a.x + b.x, a.y + b.y);
  }
  static subtract(a, b) {
    return new Point(a.x - b.x, a.y - b.y);
  }
  add(other) {
    this.x += other.x;
    this.y += other.y;
    return this;
  }
  subtract(other) {
    this.x -= other.x;
    this.y -= other.y;
    return this;
  }
  scale(scalar) {
    this.x *= scalar;
    this.y *= scalar;
    return this;
  }
}

class Line {
  constructor(a, b, c) {
    if (typeof a === 'object' && typeof b === 'object') {
      const dy = b.y - a.y;
      const dx = a.x - b.x;
      this.a = dy;
      this.b = dx;
      this.c = dy * a.x + dx * b.y;
    } else if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') {
      this.a = a;
      this.b = b;
      this.c = c;
    } else throw Error('invalid arguments');
  }
  static intersection(lineA, lineB) {
    let det = lineA.a * lineB.b - lineB.a * lineA.b;
    if (!det) return;
    return {
      x: (lineB.b * lineA.c - lineA.b * lineB.c) / det,
      y: (lineA.a * lineB.c - lineB.a * lineA.c) / det,
    };
  }
  static getPerpendicularBisector(a, b) {
    const midPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    return new Line(a, b).getPerpendicular(midPoint);
  }
  getPerpendicular(point) {
    return new Line(-this.b, this.a, -this.b * point.x + this.a * point.y);
  }
  evaluateX(x) {
    if (!this.b) return;
    return (this.c - this.a * x) / this.b;
  }
  evaluateY(y) {
    if (!this.a) return;
    return (this.c - this.b * y) / this.y;
  }
}

class Triangle {
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
