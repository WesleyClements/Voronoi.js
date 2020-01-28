class VParabola {
  constructor(site) {
    this.site = site;

    this.parent = null;
    this._left = null;
    this._right = null;

    this.cirleEvent = null;

    this.isLeaf = this.site != null;

    //this.edge = null;
  }

  get left() {
    return this._left;
  }
  set left(p) {
    this._left = p;
    p.parent = this;
  }

  get right() {
    return this._right;
  }
  set right(p) {
    this._right = p;
    p.parent = this;
  }

  get leftLeaf() {
    let par = this.left;
    while (!par.isLeaf) par = par.right;
    return par;
  }

  get rightLeaf() {
    let par = this.right;
    while (!par.isLeaf) par = par.left;
    return par;
  }

  get leftBranchRoot() {
    let parent = this.parent;
    let child = this;
    while (parent.left == child) {
      if (!parent.parent) return null;
      child = parent;
      parent = parent.parent;
    }
    return parent;
  }

  get rightBranchRoot() {
    let parent = this.parent;
    let child = this;
    while (parent.right == child) {
      if (!parent.parent) return null;
      child = parent;
      parent = parent.parent;
    }
    return parent;
  }

  getCoefficients(y0) {
    let p = this.site;
    let dp = 2 * (p.y - y0);
    let a = 1 / dp;
    let b = (-2 * p.x) / dp;
    let c = y0 + dp * 0.25 + sq(p.x) / dp;
    return [a, b, c];
  }

  evaluateAt(x, y0) {
    let [a, b, c] = this.getCoefficients(y0);
    return a * sq(x) + b * x + c;
  }

  getChildIntersectionX(y0) {
    let left = this.leftLeaf;
    let right = this.rightLeaf;

    let [a1, b1, c1] = left.getCoefficients(y0);
    let [a2, b2, c2] = right.getCoefficients(y0);

    let a = a1 - a2;
    let b = b1 - b2;
    let c = c1 - c2;

    // if a is 0 then function is linear
    if (a === 0) return -c / b;

    let disc = sq(b) - 4 * a * c;
    let x1 = (-b + sqrt(disc)) / (2 * a);
    let x2 = (-b - sqrt(disc)) / (2 * a);

    return left.site.y < right.site.y ? max(x1, x2) : min(x1, x2);
  }
}
