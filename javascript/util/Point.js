export default class Point {
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
