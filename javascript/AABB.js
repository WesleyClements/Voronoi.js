class AABB {
  constructor(x0, y0, x1, y1) {
    this.x0 = x0;
    this.y0 = y0;
    this.x1 = x1;
    this.y1 = y1;
    this._contains = (v, min, max) => !(v < min || v > max);
  }

  containsY(y) {
    return !(y < this.y0 || y > this.y1);
  }
  containsX(x) {
    return !(x < this.x0 || x > this.x1);
  }

  contains(other) {
    if (other instanceof Point) {
      return this.containsY(other.y) && this.containsX(other.x);
    }
    if (other instanceof VEdge) {
      let s = other.start;
      let e = other.end;
      if (this.contains(s) || this.contains(e)) return true;

      if (this.containsY(s.y) && this.containsY(e.y)) return true;
      if (this.containsX(s.x) && this.containsX(e.x)) return true;

      if (s.y < this.y0 && e.y < this.y0) return false;
      if (s.y > this.y1 && e.y > this.y1) return false;

      if (s.x < this.x0 && e.x < this.x0) return false;
      if (s.x > this.x1 && e.x > this.x1) return false;

      let p00 = new Point(this.x0, this.y0);
      let p01 = new Point(this.x0, this.y1);
      let p10 = new Point(this.x1, this.y0);
      let p11 = new Point(this.x1, this.y1);

      let top = getLineIntersection(s, e, p01, p11);
      let bottom = getLineIntersection(s, e, p00, p10);
      let left = getLineIntersection(s, e, p00, p01);
      let right = getLineIntersection(s, e, p10, p11);

      if (this.contains(top)) return true;
      if (this.contains(bottom)) return true;
      if (this.contains(left)) return true;
      if (this.contains(right)) return true;

      return false;
    }
    throw Error('not implemented');
  }

  constrain(other) {
    if (other instanceof Point) {
      other.x = constrain(other.x, this.x0, this.x1);
      other.y = constrain(other.y, this.y0, this.y1);
    } else if (other instanceof VEdge) {
      if (other.start.y < this.y0) {
        other.start = getLineIntersection(other.start, other.end, new Point(0, this.y0), new Point(1, this.y0));
      } else if (other.start.y > this.y1) {
        other.start = getLineIntersection(other.start, other.end, new Point(0, this.y1), new Point(1, this.y1));
      }
      if (other.start.x < this.x0) {
        other.start = getLineIntersection(other.start, other.end, new Point(this.x0, 0), new Point(this.x0, 1));
      } else if (other.start.x > this.x1) {
        other.start = getLineIntersection(other.start, other.end, new Point(this.x1, 0), new Point(this.x1, 1));
      }
      if (other.end.y < this.y0) {
        other.end = getLineIntersection(other.start, other.end, new Point(0, this.y0), new Point(1, this.y0));
      } else if (other.end.y > this.y1) {
        other.end = getLineIntersection(other.start, other.end, new Point(0, this.y1), new Point(1, this.y1));
      }
      if (other.end.x < this.x0) {
        other.end = getLineIntersection(other.start, other.end, new Point(this.x0, 0), new Point(this.x0, 1));
      } else if (other.end.x > this.x1) {
        other.end = getLineIntersection(other.start, other.end, new Point(this.x1, 0), new Point(this.x1, 1));
      }
    } else throw Error('not implemented');
  }
}
