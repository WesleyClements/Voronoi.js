class Voronoi {
  constructor() {
    this.root = null;

    this.places = null;
    this.edges = null;
    this.queue = new VQueue();

    this.width = 0;
    this.heght = 0;
    this.ly = 0;
  }

  get polygons() {
    if (!this.places) return [];
    return this.places.map(place => place.polygon);
  }

  compute(p, width, height) {
    this.root = null;

    this.places = p;
    this.edges = [];

    this.queue.clear();

    this.width = width;
    this.height = height;

    this.ly = 0;

    if (p.length < 2) return;

    let bounds = new AABB(0, 0, this.width, this.height);

    for (let i = 0; i < this.places.length; i++) {
      this.queue.enqueue(new VEvent(this.places[i], true));
    }

    while (!this.queue.isEmpty) {
      let e = this.queue.dequeue();
      this.ly = e.point.y;
      if (e.isPointEvent) this.insertParabola(e.point);
      else this.removeParabola(e);
    }

    let finishEdge = n => {
      const edge = n.edge;
      let mx =
        edge.direction.x > 0.0
          ? max(this.width, edge.start.x + 10)
          : min(0.0, edge.start.x - 10);
      edge.end = new Point(mx, edge.f * mx + edge.g);

      if (!n.left.isLeaf) finishEdge(n.left);
      if (!n.right.isLeaf) finishEdge(n.right);
    };
    finishEdge(this.root);

    this.edges.forEach(edge => {
      if (edge.neighbour) {
        edge.start = edge.neighbour.end;
        edge.neighbour.isTrash = true;
      }
      if (!bounds.contains(edge)) edge.isTrash = true;
    });
    this.edges = this.edges.filter(edge => !edge.isTrash);

    this.edges.forEach(edge => bounds.constrain(edge));
  }

  insertParabola(point) {
    if (!this.root) {
      this.root = new VParabola(point);
      return;
    }
    // first two places at basically the same height
    if (this.root.isLeaf && this.root.site.y - point.y < 0.01) {
      let firstPoint = this.root.site;
      this.root.isLeaf = false;
      this.root.left = new VParabola(firstPoint);
      this.root.right = new VParabola(point);

      let start = new Point((point.x + firstPoint.x) / 2, this.height);
      this.root.edge =
        point.x > firstPoint.x
          ? new VEdge(start, firstPoint, point)
          : new VEdge(start, point, firstPoint);
      this.edges.push(this.root.edge);
      return;
    }

    let par = this.getParabolaByX(point.x);
    if (par.cirleEvent) {
      this.queue.remove(par.cirleEvent);
      par.cirleEvent = null;
    }

    par.right = new VParabola(par.site);
    par.left = new VParabola();
    par.left.left = new VParabola(par.site);
    par.left.right = new VParabola(point);
    par.isLeaf = false;

    // add edges
    {
      let start = new Point(point.x, par.evaluateAt(point.x, this.ly));

      let rightEdge = new VEdge(start, point, par.site);
      let leftEdge = new VEdge(start, par.site, point);
      leftEdge.neighbour = rightEdge;

      par.edge = rightEdge;
      par.left.edge = leftEdge;

      this.edges.push(leftEdge);
    }

    this.checkCircle(par.left.left);
    this.checkCircle(par.right);
  }
  removeParabola(e) {
    let p1 = e.arch;

    let xl = p1.leftBranchRoot;
    let xr = p1.rightBranchRoot;

    let p0 = xl ? xl.leftLeaf : null;
    let p2 = xr ? xr.rightLeaf : null;

    if (p0.cirleEvent) {
      this.queue.remove(p0.cirleEvent);
      p0.cirleEvent = null;
    }
    if (p2.cirleEvent) {
      this.queue.remove(p2.cirleEvent);
      p2.cirleEvent = null;
    }

    let point = new Point(e.point.x, p1.evaluateAt(e.point.x, this.ly));

    xl.edge.end = point;
    xr.edge.end = point;

    let higher;
    let parent = p1.parent;
    while (parent != null) {
      if (parent == xl) higher = xl;
      if (parent == xr) higher = xr;
      parent = parent.parent;
    }

    higher.edge = new VEdge(point, p0.site, p2.site);
    this.edges.push(higher.edge);

    let gparent = p1.parent.parent;
    if (p1.parent.left == p1) {
      if (gparent.left == p1.parent) gparent.left = p1.parent.right;
      else gparent.right = p1.parent.right;
    } else {
      if (gparent.left == p1.parent) gparent.left = p1.parent.left;
      else gparent.right = p1.parent.left;
    }

    this.checkCircle(p0);
    this.checkCircle(p2);
  }
  getParabolaByX(x) {
    let par = this.root;
    while (!par.isLeaf) {
      par = par.getChildIntersectionX(this.ly) > x ? par.left : par.right;
    }
    return par;
  }
  checkCircle(par) {
    let lp = par.leftBranchRoot;
    let rp = par.rightBranchRoot;

    let a = lp ? lp.leftLeaf : null;
    let c = rp ? rp.rightLeaf : null;

    if (!a || !c || a.site == c.site) return;

    let point = VEdge.getIntersection(lp.edge, rp.edge);
    if (!point) return;

    let d = a.site.distanceTo(point);
    if (point.y - d >= this.ly) return;

    let e = new VEvent(new Point(point.x, point.y - d), false);
    par.cirleEvent = e;
    e.arch = par;

    this.queue.enqueue(e);
  }
}
