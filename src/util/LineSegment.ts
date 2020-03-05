import Point from './Point.js';
export default class LineSegment {
  start: Point;
  end: Point;
  constructor(start: Point, end: Point) {
    this.start = start;
    this.end = end;
  }

  get length() {
    return Point.distance(this.start, this.end);
  }

  get midpoint() {
    return Point.midpoint(this.start, this.end);
  }
}
