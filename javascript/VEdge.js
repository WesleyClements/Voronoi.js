class VEdge {
  constructor(start, left, right) {
    this.start = start; // start point
    this.end = undefined; // end point

    this.left = left; // point on left
    this.right = right; // point on right

    //this.neighbour = null;
    //this.isTrash = false;
  }

  static getIntersection(a, b) {
    let I = getLineIntersection(a.start, a.B, b.start, b.B);

    // wrong direction of edge
    let wd =
      (I.x - a.start.x) * a.direction.x < 0 ||
      (I.y - a.start.y) * a.direction.y < 0 ||
      (I.x - b.start.x) * b.direction.x < 0 ||
      (I.y - b.start.y) * b.direction.y < 0;

    if (wd) return null;
    return I;
  }

  get f() {
    let a = this.left;
    let b = this.right;
    return (b.x - a.x) / (a.y - b.y);
  }

  get g() {
    let s = this.start;
    return s.y - this.f * s.x;
  }

  get direction() {
    let a = this.left;
    let b = this.right;
    return new Point(b.y - a.y, -(b.x - a.x));
  }

  get B() {
    let s = this.start;
    return new Point(s.x + this.direction.x, s.y + this.direction.y);
  }

  draw() {
    let s = this.start;
    let e = this.end;
    if (!s || !e) return;
    strokeWeight(2.5);
    line(s.x, s.y, e.x, e.y);
    strokeWeight(10);
    point(s.x, s.y);
    point(e.x, e.y);
  }
}
