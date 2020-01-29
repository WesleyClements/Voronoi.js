function Voronoi(points, width, height) {
  if (points.length < 2) return;

  const queue = new VQueue();
  const bounds = new AABB(0, 0, width, height);

  const places = points;
  let edges = [];

  let root = null;

  let ly = 0;

  function insertParabola(point) {
    if (!root) {
      root = new VParabola(point);
      return;
    }
    // first two places at basically the same height
    if (root.isLeaf && root.site.y - point.y < 0.01) {
      let firstPoint = root.site;
      root.isLeaf = false;
      root.left = new VParabola(firstPoint);
      root.right = new VParabola(point);

      let start = new Point((point.x + firstPoint.x) / 2, height);
      root.edge = point.x > firstPoint.x ? new VEdge(start, firstPoint, point) : new VEdge(start, point, firstPoint);
      edges.push(root.edge);
      return;
    }

    let par = getParabolaByX(point.x);
    if (par.cirleEvent) {
      par.cirleEvent.valid = false;
      par.cirleEvent = null;
    }

    par.right = new VParabola(par.site);
    par.left = new VParabola();
    par.left.left = new VParabola(par.site);
    par.left.right = new VParabola(point);
    par.isLeaf = false;

    {
      let start = new Point(point.x, par.evaluateAt(point.x, ly));

      let rightEdge = new VEdge(start, point, par.site);
      let leftEdge = new VEdge(start, par.site, point);
      leftEdge.neighbour = rightEdge;

      par.edge = rightEdge;
      par.left.edge = leftEdge;

      edges.push(leftEdge);
    }

    checkCircle(par.left.left);
    checkCircle(par.right);
  }
  function removeParabola(e) {
    let p1 = e.arch;

    let xl = p1.leftBranchRoot;
    let xr = p1.rightBranchRoot;

    let p0 = xl ? xl.leftLeaf : null;
    let p2 = xr ? xr.rightLeaf : null;

    if (p0.cirleEvent) {
      p0.cirleEvent.valid = false;
      p0.cirleEvent = null;
    }
    if (p2.cirleEvent) {
      p2.cirleEvent.valid = false;
      p2.cirleEvent = null;
    }

    let point = new Point(e.point.x, p1.evaluateAt(e.point.x, ly));

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
    edges.push(higher.edge);

    let gparent = p1.parent.parent;
    if (p1.parent.left == p1) {
      if (gparent.left == p1.parent) gparent.left = p1.parent.right;
      else gparent.right = p1.parent.right;
    } else {
      if (gparent.left == p1.parent) gparent.left = p1.parent.left;
      else gparent.right = p1.parent.left;
    }

    checkCircle(p0);
    checkCircle(p2);
  }
  function getParabolaByX(x) {
    let par = root;
    while (!par.isLeaf) {
      par = par.getChildIntersectionX(ly) > x ? par.left : par.right;
    }
    return par;
  }
  function checkCircle(par) {
    let lp = par.leftBranchRoot;
    let rp = par.rightBranchRoot;

    let a = lp ? lp.leftLeaf : null;
    let c = rp ? rp.rightLeaf : null;

    if (!a || !c || a.site == c.site) return;

    let point = VEdge.getIntersection(lp.edge, rp.edge);
    if (!point) return;

    let d = a.site.distanceTo(point);
    if (point.y - d >= ly) return;

    let e = new VEvent(new Point(point.x, point.y - d), false);
    par.cirleEvent = e;
    e.arch = par;

    queue.enqueue(e);
  }

  places.forEach(place => queue.enqueue(new VEvent(place, true)));

  while (!queue.isEmpty) {
    let e = queue.dequeue();
    if (!e.valid) continue;
    ly = e.point.y;
    if (e.isPointEvent) insertParabola(e.point);
    else removeParabola(e);
  }

  let finishEdge = n => {
    const edge = n.edge;
    let mx = edge.direction.x > 0.0 ? max(width, edge.start.x + 10) : min(0.0, edge.start.x - 10);
    edge.end = new Point(mx, edge.f * mx + edge.g);

    if (!n.left.isLeaf) finishEdge(n.left);
    if (!n.right.isLeaf) finishEdge(n.right);
  };
  finishEdge(root);

  // finish neighbors
  let neighbours = [];
  edges.forEach(edge => {
    let neighbour = edge.neighbour;
    if (neighbour) {
      edge.start = neighbour.end;
      const neighbourIndex = edges.findIndex(edge => edge == neighbour);
      if (neighbourIndex >= 0) neighbours.push(neighbourIndex);
    }
  });
  edges = edges.filter((_, i) => !neighbours.includes(i));

  // constrain edges
  edges = edges.filter(edge => {
    if (bounds.contains(edge)) {
      bounds.constrain(edge);
      return Point.distance(edge.start, edge.end) > 1;
    }
    return false;
  });

  // create polygons
  {
    places.forEach(place => (place.polygon = new VPolygon()));
    edges.forEach(edge => {
      edge.left.polygon.add(edge.start);
      edge.left.polygon.add(edge.end);
      edge.right.polygon.add(edge.start);
      edge.right.polygon.add(edge.end);
    });
    const findClosestPoint = (vertex, points) => {
      let closest = [];
      let minDistance = Number.POSITIVE_INFINITY;
      points.forEach(point => {
        let d = vertex.distanceTo(point);
        if (d > minDistance) return;
        if (d === minDistance) {
          closest.push(point);
        } else {
          closest = [point];
          minDistance = d;
        }
      });
      return closest;
    };
    findClosestPoint(new Point(0, 0), places).forEach(point => point.polygon.add(new Point(0, 0)));
    findClosestPoint(new Point(0, height), places).forEach(point => point.polygon.add(new Point(0, height)));
    findClosestPoint(new Point(width, 0), places).forEach(point => point.polygon.add(new Point(width, 0)));
    findClosestPoint(new Point(width, height), places).forEach(point => point.polygon.add(new Point(width, height)));
  }
  let polygons = places.map(place => {
    place.polygon.sort();
    return place.polygon;
  });

  return {
    places,
    edges,
    polygons,
  };
}
