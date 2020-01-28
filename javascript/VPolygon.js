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
    this.vertices.push(p);
  }

  sort() {
    console.log('Sorting...');
    const before = Array.from(this.vertices);
    const center = this.center;
    this.vertices.sort((a, b) => {
      if (a.x - center.x >= 0 && b.x - center.x < 0) return 1;
      if (a.x - center.x < 0 && b.x - center.x >= 0) return -1;
      if (a.x - center.x == 0 && b.x - center.x == 0) {
        let bool = a.y - center.y >= 0 || b.y - center.y >= 0;
        return bool ? (a.y > b.y ? 1 : -1) : a.y < b.y ? 1 : -1;
      }

      // compute the cross product of vectors (center -> a) x (center -> b)
      let det =
        (a.x - center.x) * (b.y - center.y) -
        (b.x - center.x) * (a.y - center.y);
      if (det < 0) return 1;
      if (det > 0) return -1;

      // points a and b are on the same line from the center
      // check which point is closer to the center
      let d1 =
        (a.x - center.x) * (a.x - center.x) +
        (a.y - center.y) * (a.y - center.y);
      let d2 =
        (b.x - center.x) * (b.x - center.x) +
        (b.y - center.y) * (b.y - center.y);
      return d1 > d2 ? 1 : -1;
    });
    let changed = false;
    for (let i = 0; i < this.size; ++i) {
      if (before[i] != this.vertices[i]) {
        changed = true;
        break;
      }
    }
    if (changed) {
      console.log('Changed');
      this.changed = true;
      for (let i = 0; i < this.size; ++i) {
        console.log(before[i], ' | ', this.vertices[i]);
      }
    }
  }

  draw() {
    if (this.changed) stroke(color(255, 0, 0));
    beginShape();
    this.vertices.forEach(v => vertex(v.x, v.y));
    endShape(CLOSE);
  }
}
