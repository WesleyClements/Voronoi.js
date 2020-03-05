import { Color } from 'p5';

import Point from './util/Point.js';
import AABB from './util/AABB.js';
import Diagram from './Voronoi.js';

declare global {
  interface Window {
    setup: () => void;
    draw: () => void;
    windowResized: () => void;
    mousePressed: () => void;
  }
}

interface ColoredPoint extends Point {
  color?: Color;
}

const pointCount: number = 20;
const maxPointCount: number = 400;
let points: ColoredPoint[] = [];

let diagram: Diagram;

let width: number;
let height: number;

let bounds: AABB;

let frameCount: number = 0;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Point(0, 0), new Point(width, height));
}

window.setup = () => {
  updateDimensions();
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    const point: ColoredPoint = new Point(random() * width, random() * height);
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point as Point);
  }
};
window.draw = () => {
  diagram = new Diagram(points);
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
  });

  diagram.vertices.forEach(p => {
    strokeWeight(10);
    stroke(color(0, 0, 255));
    point(p.x, p.y);
  });

  if (diagram) {
    points = diagram.getRelaxedSites(0.02);
  }
  if (points.length < maxPointCount && frameCount % 10 === 0) {
    const point: ColoredPoint = new Point(width / 2 + Math.random() - 0.5, height / 2 + Math.random() - 0.5);
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point as Point);
  }
  frameCount++;
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};
