class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;

    this.polygon = null;
  }
  static distance(a, b) {
    return sqrt(sq(b.x - a.x) + sq(b.y - a.y));
  }
  distanceTo(other) {
    return Point.distance(this, other);
  }
  draw(color) {
    if (color) stroke(color);
    point(this.x, this.y);
  }
}
