import { Color } from 'p5';

import Vector2 from './util/Vector2.js';
import AABB from './util/AABB.js';
import Diagram, { Cell } from './Voronoi.js';
import { AABBQuadTree } from './util/QuadTree.js';

declare global {
  interface Window {
    lerpT: number;
    defectiveCell: Cell;
    setup: () => void;
    draw: () => void;
    windowResized: () => void;
    mousePressed: () => void;
  }
}

interface ColoredPoint extends Vector2 {
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

let generationPoint: Vector2;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Vector2(0, 0), new Vector2(width, height));
  if (generationPoint && !bounds.contains(generationPoint)) {
    generationPoint = new Vector2(width / 2, height / 2);
  }
}

window.setup = () => {
  window.lerpT = 0.02;
  updateDimensions();
  generationPoint = new Vector2(width / 2, height / 2);
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    const point: ColoredPoint = new Vector2(random() * width, random() * height);
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point);
  }
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};

window.draw = () => {
  diagram = new Diagram(points);
  diagram.finish(bounds);

  quadTree = new AABBQuadTree<CellAABB>(
    new AABB(Vector2.subtract(bounds.min, new Vector2(10, 10)), Vector2.add(bounds.max, new Vector2(10, 10))),
    20,
    10,
  );
  diagram.cells.forEach(cell => {
    let cellAABB: CellAABB = cell.boundingAABB;
    cellAABB.cell = cell;
    quadTree.insert(cellAABB);
  });

  const mousePoint = new Vector2(mouseX, mouseY);
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
  points.forEach((site: ColoredPoint & { cell?: any }) => {
    let { cell } = site;
    if (!cell) return;
    if (cell.edges.length < 3) return;
    if (cell === highCell) fill(color(255, 0, 0));
    else fill(site.color);
    stroke(color(0, 0, 0));
    drawCell(cell);
    stroke(color(0, 0, 255));
    cell.vertices.forEach((vertex: any) => {
      line(cell.site.x, cell.site.y, vertex.x, vertex.y);
    });
  });

  points = diagram.getRelaxedSites(window.lerpT);

  if (mouseIsPressed) {
    generationPoint = new Vector2(min(max(0, mouseX), width), min(max(0, mouseY), height));
  }
  if (points.length < maxPointCount && frameCount % 10 === 0) {
    const point: ColoredPoint = Vector2.add(generationPoint, new Vector2(random() - 0.5, random() - 0.5));
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point as Vector2);
  }
};

function drawCell(cell: Cell) {
  beginShape();
  cell.edges.forEach((edge: any) => {
    const v = edge.end;
    if (!v) return;
    vertex(v.x, v.y);
  });
  endShape(CLOSE);
}
