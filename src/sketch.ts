import { Color } from 'p5';

import Vector2 from './util/Vector2.js';
import LineSegment from './util/LineSegment.js';
import Polygon from './util/Polygon.js';
import AABB from './util/AABB.js';

import { AABBQuadTree } from './util/QuadTree.js';

import Diagram, { Cell } from './Voronoi.js';

declare global {
  interface Window {
    lerpT: number;
    setup: () => void;
    windowResized: () => void;
    keyPressed: () => void;
    mousePressed: () => void;
    draw: () => void;
  }
}

interface ColoredPoint extends Vector2 {
  color?: Color;
}

interface CellAABB extends AABB {
  cell?: Cell;
  polygon?: Polygon;
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

let drawEdges: boolean = false;
let drawCellAABB: boolean = false;
let drawQuadTree: boolean = false;
let drawCenterLine: boolean = false;

function getMouseLocation() {
  return new Vector2(mouseX, height - mouseY);
}

function getRandomColor() {
  const min = 1;
  let r = random();
  let g = random();
  let b = random();
  let missing = 1 - r - g - b;
  while (missing > 0) {
    const amount = Math.min(missing, 0.05);
    const i = floor(random(3));
    switch (i) {
      case 0:
        r += amount;
        break;
      case 1:
        g += amount;
        break;
      case 2:
        b += amount;
        break;
    }
    missing -= amount;
  }
  r = Math.min(Math.sqrt(r) * 256, 255);
  g = Math.min(Math.sqrt(g) * 256, 255);
  b = Math.min(Math.sqrt(b) * 256, 255);
  return color(r, g, b);
}

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Vector2(0, 0), new Vector2(width, height));
  if (generationPoint && !bounds.contains(generationPoint)) {
    bounds.clamp(generationPoint);
    generationPoint.x -= 0.5;
  }
}

function updateDiagram() {
  diagram = new Diagram(points);
  diagram.finish(bounds);

  quadTree = new AABBQuadTree<CellAABB>(
    new AABB(Vector2.subtract(bounds.min, new Vector2(10, 10)), Vector2.add(bounds.max, new Vector2(10, 10))),
    20,
    10,
  );
  diagram.cells.forEach(cell => {
    const polygon = cell.polygon;
    let cellAABB: CellAABB = polygon.boundingAABB;
    cellAABB.cell = cell;
    cellAABB.polygon = polygon;
    quadTree.insert(cellAABB);
  });
}

function updatePoints() {
  points = diagram.getRelaxedSites(window.lerpT);

  if (mouseIsPressed) {
    const mouse = getMouseLocation();
    generationPoint = new Vector2(min(max(0, mouse.x), width), min(max(0, mouse.y), height));
  }
  if (points.length < maxPointCount && frameCount % 10 === 0) {
    const point: ColoredPoint = Vector2.add(generationPoint, new Vector2(random(-0.5, 0.5), random(-0.5, 0.5)));
    point.color = getRandomColor();
    points.push(point as Vector2);
  }
}

window.setup = () => {
  window.lerpT = 0.02;
  updateDimensions();
  generationPoint = new Vector2(width / 2, height / 2);
  createCanvas(width, height);
  for (let i = 0; i < pointCount; ++i) {
    const point: ColoredPoint = new Vector2(random(width), random(height));
    point.color = getRandomColor();
    points.push(point);
  }
  updateDiagram();
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};

window.keyPressed = () => {
  if (key.toLowerCase() === 'c') {
    drawCenterLine = !drawCenterLine;
  }
  if (key.toLowerCase() === 'e') {
    drawEdges = !drawEdges;
  }
  if (key.toLowerCase() === 'q') {
    drawQuadTree = !drawQuadTree;
  }
  if (key.toLowerCase() === 'b') {
    drawCellAABB = !drawCellAABB;
  }
};

window.draw = () => {
  scale(1, -1);
  translate(0, -height);

  let highCell: Cell;
  const mouse = getMouseLocation();
  quadTree.retrieve(mouse).forEach(cellAABB => {
    if (cellAABB.polygon.contains(mouse)) highCell = cellAABB.cell;
  });

  const centerLine = new LineSegment(new Vector2(width / 2, height / 2), getMouseLocation());

  background(150);

  strokeWeight(2);
  diagram.cells.forEach(cell => {
    if (cell.edges.length < 3) return;
    if (drawCenterLine) strokeWeight(1);
    if (cell === highCell) fill(color(255, 0, 0));
    else fill((cell.site as ColoredPoint).color);

    stroke(color(0));
    cell.polygon.draw();

    stroke(color(0, 0, 255));
    cell.vertices.forEach(vertex => {
      const line = new LineSegment(cell.site, vertex);
      if (drawCenterLine) {
        if (line.intersects(centerLine)) {
          strokeWeight(3);
          stroke(color(0, 255, 255));
        } else {
          strokeWeight(2);
          stroke(color(0, 0, 255));
        }
      }
      line.draw();
    });
  });

  if (drawEdges) {
    strokeWeight(4);
    stroke(color(0));
    diagram.edges.forEach(edge => edge.draw());
  }

  if (drawCellAABB) {
    strokeWeight(2);
    diagram.cells.forEach(cell => {
      const aabb = cell.polygon.boundingAABB;
      if (cell === highCell) {
        if (drawCenterLine) strokeWeight(2);
        stroke(color(255, 0, 0));
      } else if (drawCenterLine && aabb.intersects(centerLine)) {
        strokeWeight(3);
        stroke(color(255, 0, 255));
      } else {
        if (drawCenterLine) strokeWeight(2);
        stroke(color(255, 255, 0));
      }
      aabb.draw();
    });
  }
  if (drawQuadTree) {
    strokeWeight(2);
    stroke(color(0));
    quadTree.draw();
  }
  if (drawCenterLine) {
    strokeWeight(2);
    stroke(color(0));
    centerLine.draw();
  }

  updatePoints();
  updateDiagram();
};
