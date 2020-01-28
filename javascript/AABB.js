class AABB {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
  }

  contains(other) {
    if (other instanceof Point) {
      return !(
        other.x < this.x0 ||
        other.x > this.x1 ||
        other.y < this.y0 ||
        other.y > this.y1
      );
    }
    if (other instanceof VEdge) {
      return this.contains(other.start) || this.contains(other.end);
    }
    throw Error('not implemented');
  }

  constrain(other) {
    if (other instanceof Point) {
      other.x = constrain(other.x, this.x0, this.x1);
      other.y = constrain(other.y, this.y0, this.y1);
    } else if (other instanceof VEdge) {
      if (other.start.y < this.y0) {
        other.start = getLineIntersection(
          other.start,
          other.end,
          new Point(0, this.y0),
          new Point(1, this.y0),
        );
      } else if (other.start.y > this.y1) {
        other.start = getLineIntersection(
          other.start,
          other.end,
          new Point(0, this.y1),
          new Point(1, this.y1),
        );
      }
      if (other.start.x < this.x0) {
        other.start = getLineIntersection(
          other.start,
          other.end,
          new Point(this.x0, 0),
          new Point(this.x0, 1),
        );
      } else if (other.start.x > this.x1) {
        other.start = getLineIntersection(
          other.start,
          other.end,
          new Point(this.x1, 0),
          new Point(this.x1, 1),
        );
      }
      if (other.end.y < this.y0) {
        other.end = getLineIntersection(
          other.start,
          other.end,
          new Point(0, this.y0),
          new Point(1, this.y0),
        );
      } else if (other.end.y > this.y1) {
        other.end = getLineIntersection(
          other.start,
          other.end,
          new Point(0, this.y1),
          new Point(1, this.y1),
        );
      }
      if (other.end.x < this.x0) {
        other.end = getLineIntersection(
          other.start,
          other.end,
          new Point(this.x0, 0),
          new Point(this.x0, 1),
        );
      } else if (other.end.x > this.x1) {
        other.end = getLineIntersection(
          other.start,
          other.end,
          new Point(this.x1, 0),
          new Point(this.x1, 1),
        );
      }
    } else throw Error('not implemented');
  }
}
