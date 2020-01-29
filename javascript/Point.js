class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    //this.polygon = null;
  }

  static distance(a, b) {
    return sqrt(sq(b.x - a.x) + sq(b.y - a.y));
  }

  distanceTo(other) {
    return Point.distance(this, other);
  }

  equals(other) {
    if (other instanceof Point) return this.x === other.x && this.y === other.y;
    return true;
  }

  draw() {
    point(this.x, this.y);
  }
}
