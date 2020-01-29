class VPolygon {
  constructor() {
    this.vertices = [];
  }

  get size() {
    return this.vertices.length;
  }

  get first() {
    if (this.size < 1) return;
    return this.vertices[0];
  }

  get last() {
    if (this.size < 1) return;
    return this.vertices[this.size - 1];
  }

  get center() {
    if (this.size < 1) return;
    let center = new Point(0, 0);
    this.vertices.forEach(vertex => {
      center.x += vertex.x;
      center.y += vertex.y;
    });
    center.x /= this.size;
    center.y /= this.size;
    return center;
  }

  add(p) {
    if (this.vertices.every(v => !v.equals(p))) this.vertices.push(p);
  }

  sort() {
    const center = this.center;
    this.vertices.sort((a, b) => {
      const ax = a.x - center.x;
      const ay = a.y - center.y;
      const bx = b.x - center.x;
      const by = b.y - center.y;
      if (ax >= 0 && bx < 0) return 1;
      if (ax < 0 && bx >= 0) return -1;
      if (ax == 0 && bx == 0) return ay >= 0 || by >= 0 ? (a.y > b.y ? 1 : -1) : a.y < b.y ? 1 : -1;

      // compute the cross product of vectors (center -> a) x (center -> b)
      let det = ax * by - bx * ay;
      if (det !== 0) return det < 0 ? 1 : -1;

      // points a and b are on the same line from the center
      // check which point is closer to the center
      return sq(ax) + sq(ay) > sq(bx) + sq(by) ? 1 : -1;
    });
  }

  draw() {
    beginShape();
    this.vertices.forEach(v => vertex(v.x, v.y));
    endShape(CLOSE);
  }
}
