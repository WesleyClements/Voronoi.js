import { Color } from 'p5';

import Point from './util/Point.js';
import AABB from './util/AABB.js';
import Diagram, { Cell } from './Voronoi.js';
import { AABBQuadTree } from './util/QuadTree.js';

declare global {
  interface Window {
    lerpT: number;
    setup: () => void;
    draw: () => void;
    windowResized: () => void;
    mousePressed: () => void;
  }
}

interface ColoredPoint extends Point {
  color?: Color;
}

interface CellAABB extends AABB {
  cell?: Cell;
}

const pointCount: number = 20;
const maxPointCount: number = 400;
let points: ColoredPoint[] = [];

let diagram: Diagram;
let quadTree: AABBQuadTree<CellAABB>;

let width: number;
let height: number;

let bounds: AABB;

let generationPoint: Point;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Point(0, 0), new Point(width, height));
  if (!bounds.contains(generationPoint)) {
    generationPoint = new Point(width / 2, height / 2);
  }
}

window.setup = () => {
  window.lerpT = 0.02;
  updateDimensions();
  generationPoint = new Point(width / 2, height / 2);
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

  quadTree = new AABBQuadTree<CellAABB>(
    new AABB(Point.subtract(bounds.min, new Point(10, 10)), Point.add(bounds.max, new Point(10, 10))),
    20,
  );
  diagram.cells.forEach(cell => {
    let cellAABB: CellAABB = cell.boundingAABB;
    cellAABB.cell = cell;
    quadTree.insert(cellAABB);
  });

  const mousePoint = new Point(mouseX, mouseY);
  let highCell: Cell;
  quadTree.retrieve(new AABB(mousePoint, mousePoint)).forEach(cellAABB => {
    if (cellAABB.cell.contains(mousePoint)) highCell = cellAABB.cell;
  });

  background(150);

  strokeWeight(1);
  stroke(color(0, 0, 0));
  diagram.edges.forEach(edge => {
    let s = edge.start;
    let e = edge.end;
    if (!s || !e) return;
    line(s.x, s.y, e.x, e.y);
  });
  points.forEach((site: Point & { cell?: any; color: Color }) => {
    let { cell } = site;
    if (!cell) return;
    if (cell.edges.length < 3) return;
    strokeWeight(1);
    stroke(color(0, 0, 0));
    if (cell === highCell) fill(color(255, 0, 0));
    else fill(site.color);
    beginShape();
    cell.edges.forEach((edge: any) => {
      const v = edge.end;
      if (!v) return;
      vertex(v.x, v.y);
    });
    endShape(CLOSE);
    cell.vertices.forEach((vertex: any) => {
      stroke(color(0, 0, 255));
      line(site.x, site.y, vertex.x, vertex.y);
    });
  });

  points = diagram.getRelaxedSites(window.lerpT);

  if (mouseIsPressed) {
    generationPoint = new Point(min(max(0, mouseX), width), min(max(0, mouseY), height));
  }
  if (points.length < maxPointCount && frameCount % 10 === 0) {
    const point: ColoredPoint = Point.add(generationPoint, new Point(random() - 0.5, random() - 0.5));
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point as Point);
  }
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};
