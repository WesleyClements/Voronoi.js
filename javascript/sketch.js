const pointCount = 20;
const points = [];
const pointColors = [];

const v = new Voronoi();

let width;
let height;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
}

function randomColor() {
  return color(random() * 255, random() * 255, random() * 255);
}

function setup() {
  updateDimensions();
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    let [x, y] = [random() * width, random() * height];
    points.push(new Point(x, y));
    pointColors.push(randomColor());
  }
}

function windowResized() {
  updateDimensions();
  resizeCanvas(width, height);
}

function draw() {
  background(250);

  v.compute(points, width, height);

  strokeWeight(2.5);

  if (v.edges) {
    stroke(color(0, 0, 0));
    v.edges.forEach(edge => edge.draw());
  }

  strokeWeight(10);
  points.forEach((point, i) => {
    stroke(pointColors[i]);
    point.draw();
  });
  drawn = true;
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
  var last = points[points.length - 1];
  last.x += random();
  last.y += random();
  points.push(new Point(getMouseX(), getMouseY()));
  pointColors.push(randomColor());
}
