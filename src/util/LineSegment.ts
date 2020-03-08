import Vector2 from './Vector2.js';
export default class LineSegment {
  start: Vector2;
  end: Vector2;

  constructor(start: Vector2, end: Vector2) {
    this.start = start;
    this.end = end;
  }

  get length() {
    return Vector2.distance(this.start, this.end);
  }

  get midpoint() {
    return Vector2.midpoint(this.start, this.end);
  }
}
