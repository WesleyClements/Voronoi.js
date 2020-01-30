function Point(x, y) {
  return { x, y, color: color(random() * 255, random() * 255, random() * 255) };
}

function circumcenter(a, b, c) {
  function lineFromPoints(a, b) {
    const dy = b.y - a.y;
    const dx = a.x - b.x;
    return {
      a: dy,
      b: dx,
      c: dy * a.x + dx * b.y,
    };
  }
  function perpendicularLine(point, { a, b, c }) {
    return {
      a: -b,
      b: a,
      c: -b * point.x + a * point.y,
    };
  }
  function perpendicularBisector(a, b) {
    const midPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const coeff = lineFromPoints(a, b);
    return perpendicularLine(midPoint, coeff);
  }
  function lineIntersection({ a: a1, b: b1, c: c1 }, { a: a2, b: b2, c: c2 }) {
    let det = a1 * b2 - a2 * b1;
    if (!det) return null;
    return {
      x: (b2 * c1 - b1 * c2) / det,
      y: (a1 * c2 - a2 * c1) / det,
    };
  }

  const abBisector = perpendicularBisector(a, b);
  const acBisector = perpendicularBisector(a, c);

  return lineIntersection(abBisector, acBisector);
}

function area(a, b, c) {
  const AB = sqrt(sq(a.x - b.x) + sq(a.y - b.y));
  const AC = sqrt(sq(a.x - c.x) + sq(a.y - c.y));
  const BC = sqrt(sq(b.x - c.x) + sq(b.y - c.y));
  const semi = (AB + AC + BC) / 2;
  return sqrt(semi * (semi - AB) * (semi - AC) * (semi - BC));
}
const pointCount = 20;
const points = [];

const moveScale = 0.05;

const v = new Voronoi();
let diagram;

let width;
let height;

let bounds;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = {
    xl: 0,
    xr: width,
    yb: 0,
    yt: height,
  };
}

function setup() {
  updateDimensions();
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    let [x, y] = [random() * width, random() * height];
    points.push(Point(x, y));
  }
}

function draw() {
  background(250);

  // if (diagram) {
  //   strokeWeight(1);
  //   stroke(color(0, 0, 0));
  //   diagram.edges.forEach(edge => {
  //     let s = edge.va;
  //     let e = edge.vb;
  //     if (!s || !e) return;
  //     line(s.x, s.y, e.x, e.y);
  //   });
  // }

  stroke(color(0, 0, 0));
  points.forEach(site => {
    if (diagram) {
      const cell = diagram.cells[site.cellId];
      if (!cell) return;
      if (cell.halfedges.length < 3) return;
      strokeWeight(1);
      stroke(color(0, 0, 0));
      fill(site.color);
      beginShape();
      cell.halfedges.forEach(halfedge => {
        let v = halfedge.getEndpoint();
        vertex(v.x, v.y);
      });
      endShape(CLOSE);
    }
    strokeWeight(5);
    //stroke(site.color);
    point(site.x, site.y);
  });

  if (diagram) {
    points.forEach((site, i) => {
      if (i > points.length - 2) return;
      const cell = diagram.cells[site.cellId];
      if (!cell) return;
      const { x, y, a } = cell.halfedges.reduce(
        (result, halfedge) => {
          const {
            edge: { va, vb },
          } = halfedge;
          let c = circumcenter(site, va, vb);
          if (!c) return result;
          let a = area(site, va, vb);
          result.x += c.x * a;
          result.y += c.y * a;
          result.a += a;
          return result;
        },
        { x: 0, y: 0, a: 0 },
      );
      const dx = x / a - site.x;
      const dy = y / a - site.y;
      site.x += dx * moveScale;
      site.y += dy * moveScale;
    });
  }
  diagram = v.compute(points, bounds);
}

function windowResized() {
  updateDimensions();
  resizeCanvas(width, height);
}

function mouseMoved() {
  let last = points[points.length - 1];
  last.x = getMouseX();
  last.y = getMouseY();
}

function mousePressed() {
  points.push(Point(getMouseX(), getMouseY()));
}

function getMouseX() {
  return constrain(mouseX, 0, width);
}
function getMouseY() {
  return constrain(mouseY, 0, height);
}
