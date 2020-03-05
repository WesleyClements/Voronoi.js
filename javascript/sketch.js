import compute from './Voronoi.js';

import Point from './util/Point.js';

const pointCount = 200;
let points = [];

let diagram;

let width;
let height;

let bounds;
let addPoint = false;

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

window.setup = () => {
  updateDimensions();
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    const point = new Point(random() * width, random() * height);
    point.color = color(random() * 255, random() * 255, random() * 255);
    points.push(point);
  }
};

window.draw = () => {
  background(150);

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
      let { cell } = site;
      if (!cell) return;
      if (cell.halfedges.length < 3) return;
      strokeWeight(1);
      stroke(color(0, 0, 0));
      fill(site.color);
      beginShape();
      cell.halfedges.forEach(he => {
        const v = he.end;
        if (!v) return;
        vertex(v.x, v.y);
      });
      endShape(CLOSE);
    }
    strokeWeight(5);
    //stroke(site.color);
    point(site.x, site.y);
  });

  if (diagram) {
    points = diagram.relaxedSites;
  }
  if (addPoint) {
    const point = new Point(random() * width, random() * height);
    point.color = color(random() * 255, random() * 255, random() * 255);
    points.push(point);
    addPoint = false;
  }
  diagram = compute(points);
  diagram.finish(bounds);
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};

window.mousePressed = () => {
  addPoint = true;
};
