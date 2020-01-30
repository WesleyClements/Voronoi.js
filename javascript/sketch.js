const pointCount = 200;
const points = [];

function Point(x, y) {
  return { x, y, color: color(random() * 255, random() * 255, random() * 255) };
}

const v = new Voronoi();

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

function windowResized() {
  updateDimensions();
  resizeCanvas(width, height);
}

let drawn = false;
function draw() {
  // if (drawn) return;
  // drawn = true;
  background(250);

  let diagram = v.compute(points, bounds);
  //console.log(diagram.execTime);

  strokeWeight(1);
  stroke(color(0, 0, 0));
  diagram.edges.forEach(edge => {
    let s = edge.va;
    let e = edge.vb;
    if (!s || !e) return;
    line(s.x, s.y, e.x, e.y);
  });

  stroke(color(0, 0, 0));
  points.forEach(site => {
    // const cell = diagram.cells[site.cellId];
    // if (!cell) return;
    // if (cell.halfedges.length < 3) return;

    // strokeWeight(1);
    // stroke(color(0, 0, 0));
    // fill(site.color);
    // beginShape();
    // cell.halfedges.forEach(halfedge => {
    //   let v = halfedge.getEndpoint();
    //   vertex(v.x, v.y);
    // });
    // endShape(CLOSE);
    strokeWeight(5);
    stroke(site.color);
    point(site.x, site.y);
  });
}

function getMouseX() {
  return constrain(mouseX, 0, width);
}
function getMouseY() {
  return constrain(mouseY, 0, height);
}

function mouseMoved() {
  let last = points[points.length - 1];
  last.x = getMouseX();
  last.y = getMouseY();
}

function mousePressed() {
  points.push(Point(getMouseX(), getMouseY()));
}
