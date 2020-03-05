import compute from './Voronoi.js';

import Point from './util/Point.js';
import { Color } from 'p5';
import Triangle from './util/Triangle.js';

declare global {
  interface Window {
    setup: () => void;
    draw: () => void;
    windowResized: () => void;
    mousePressed: () => void;
  }
}

const pointCount: number = 200;
let points: Point[] = [];

let diagram: any;

let width: number;
let height: number;

let bounds: { xl: number; xr: number; yb: number; yt: number };
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
    const point: { [key: string]: any } = new Point(random() * width, random() * height);
    point.color = color(random() * 255, random() * 255, random() * 255);
    points.push(point as Point);
  }
};

window.draw = () => {
  diagram = compute(points as Point[]);
  diagram.finish(bounds);

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
  points.forEach((site: Point & { cell?: any; color: Color }) => {
    if (diagram) {
      let { cell } = site;
      if (!cell) return;
      if (cell.edges.length < 3) return;
      strokeWeight(1);
      stroke(color(0, 0, 0));
      fill(site.color);
      beginShape();
      cell.edges.forEach((edge: { [key: string]: any }) => {
        const v = edge.end;
        if (!v) return;
        vertex(v.x, v.y);
      });
      endShape(CLOSE);
    }
    strokeWeight(5);
    point(site.x, site.y);
  });

  if (diagram) {
    points = diagram.relaxedSites;
  }
  if (addPoint) {
    const point: { [key: string]: any } = new Point(random() * width, random() * height);
    point.color = color(random() * 255, random() * 255, random() * 255);
    points.push(point as Point);
    addPoint = false;
  }
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};

window.mousePressed = () => {
  addPoint = true;
};
