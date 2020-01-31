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
    const point = new Point(random() * width, random() * height);
    point.color = color(random() * 255, random() * 255, random() * 255);
    points.push(point);
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
      if (!cell.halfedges.length) return;
      const { circum, area } = cell.halfedges.reduce(
        (result, halfedge) => {
          const tri = new Triangle(site, halfedge.edge.va, halfedge.edge.vb);
          if (!tri.circumcenter) return result;
          result.circum.add(tri.circumcenter.scale(tri.area));
          result.area += tri.area;
          return result;
        },
        { circum: new Point(0, 0), area: 0 },
      );
      const delta = Point.subtract(circum.scale(1 / area), site).scale(moveScale);
      site.x += delta.x;
      site.y += delta.y;
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
  const point = new Point(getMouseX(), etMouseY());
  point.color = color(random() * 255, random() * 255, random() * 255);
  points.push(point);
}

function getMouseX() {
  return constrain(mouseX, 0, width);
}
function getMouseY() {
  return constrain(mouseY, 0, height);
}
