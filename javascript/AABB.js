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
    } else throw Error('not implemented');
  }
}
