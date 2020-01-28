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

  addRight(p) {
    this.vertices.push(p);
  }
  addLeft(p) {
    this.vertices.unshift(p);
  }

  draw() {
    noFill();
    beginShape();
    this.vertices.forEach(v => vertex(v.x, v.y));
    endShape(CLOSE);
  }
}
