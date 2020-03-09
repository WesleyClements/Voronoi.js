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
let drawQuadTree: boolean = false;
let drawCellAABB: boolean = false;

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Vector2(0, 0), new Vector2(width, height));
  if (generationPoint && !bounds.contains(generationPoint)) {
    generationPoint = new Vector2(width / 2, height / 2);
  }
}
function getMouseLocation() {
  return new Vector2(mouseX, height - mouseY);
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

window.keyPressed = () => {
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

  let highCell: Cell;
  const mouse = getMouseLocation();
  quadTree.retrieve(mouse).forEach(cellAABB => {
    if (cellAABB.polygon.contains(mouse)) highCell = cellAABB.cell;
  });

  background(150);

  strokeWeight(1);
  diagram.cells.forEach(cell => {
    if (cell.edges.length < 3) return;
    if (cell === highCell) fill(color(255, 0, 0));
    else fill((cell.site as ColoredPoint).color);

    stroke(color(0, 0, 0));
    cell.polygon.draw();

    stroke(color(0, 0, 255));
    cell.vertices.forEach(vertex => LineSegment.draw(cell.site, vertex));
  });

  if (drawEdges) {
    strokeWeight(2);
    stroke(color(0, 0, 0));
    diagram.edges.forEach(edge => edge.draw());
  }

  if (drawCellAABB) {
    strokeWeight(2);
    diagram.cells.forEach(cell => {
      if (cell === highCell) stroke(color(255, 0, 0));
      else stroke(color(255, 255, 0));
      cell.polygon.boundingAABB.draw();
    });
  }
  if (drawQuadTree) {
    strokeWeight(2);
    stroke(color(0, 0, 0));
    quadTree.draw();
  }

  points = diagram.getRelaxedSites(window.lerpT);

  if (mouseIsPressed) {
    const mouse = getMouseLocation();
    generationPoint = new Vector2(min(max(0, mouse.x), width), min(max(0, mouse.y), height));
  }
  if (points.length < maxPointCount && frameCount % 10 === 0) {
    const point: ColoredPoint = Vector2.add(generationPoint, new Vector2(random() - 0.5, random() - 0.5));
    point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
    points.push(point as Vector2);
  }
};
