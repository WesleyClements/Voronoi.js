import { Color } from 'p5';

import Vector2 from './util/Vector2';
import AABB from './util/AABB';

import Voronoi, { Diagram, Cell, Site } from './Voronoi';

declare global {
  interface Window {
    setup: () => void;
    windowResized: () => void;
    keyPressed: () => void;
    mousePressed: () => void;
    draw: () => void;
  }
}

interface ColoredPoint extends Vector2 {
  cell?: Cell;
  color?: Color;
  plate?: Plate;
  previousArea?: number;
}

class Plate {
  id: number;
  color: Color;
  sites: Site[];
  velocity: Vector2;
  constructor(id: number, color: Color) {
    this.id = id;
    this.color = color;
    this.sites = [];
    let angle = random(0, TWO_PI);
    this.velocity = new Vector2(cos(angle), sin(angle));
  }
}

enum State {
  GeneratingPoints,
  Finished,
}

const maxPointCount: number = 1000;
const pointsGenerationCount: number = 2;

let points: ColoredPoint[] = [];

let diagram: Diagram;

let width: number;
let height: number;

let bounds: AABB;

let state: State;

function getMouseLocation() {
  return new Vector2(mouseX, height - mouseY);
}

function getRandomColor() {
  const hue = random(6);
  const saturation = random(0.25, 1);
  const brightness = random(0.75, 1);

  const c = brightness * saturation;
  const x = c * (1 - Math.abs((hue % 2) - 1));
  const m = brightness - c;

  let r: number, g: number, b: number;
  switch (true) {
    case hue < 1:
      [r, g, b] = [c + m, x + m, m];
      break;
    case hue < 2:
      [r, g, b] = [x + m, c + m, m];
      break;
    case hue < 3:
      [r, g, b] = [m, c + m, x + m];
      break;
    case hue < 4:
      [r, g, b] = [m, x + m, c + m];
      break;
    case hue < 5:
      [r, g, b] = [x + m, m, c + m];
      break;
    default:
      [r, g, b] = [c + m, m, x + m];
      break;
  }
  return color(r * 255, g * 255, b * 255);
}

function updateDimensions() {
  width = windowWidth - 40;
  height = windowHeight - 40;
  bounds = new AABB(new Vector2(0, 0), new Vector2(width, height));
}

function updateDiagram() {
  diagram = Voronoi.compute(bounds, ...points);
}

window.setup = () => {
  updateDimensions();
  createCanvas(width, height);
  state = State.GeneratingPoints;
};

window.windowResized = () => {
  updateDimensions();
  resizeCanvas(width, height);
};

window.keyPressed = () => {};

window.mousePressed = () => {
  const handle = setInterval(() => {
    const point: ColoredPoint = getMouseLocation();
    point.color = getRandomColor();
    points.push(point);
    updateDiagram();
  }, 100);
  const onMouseUp = () => {
    window.removeEventListener('mouseup', onMouseUp);
    clearInterval(handle);
  };
  window.addEventListener('mouseup', onMouseUp);
};

window.draw = () => {
  if (diagram) {
    points = diagram.cells.map((cell) => {
      const newPoint: ColoredPoint = Vector2.lerp(cell.site, cell.polygon.centroid, 0.01);
      newPoint.color = (cell.site as ColoredPoint).color;
      return newPoint;
    });
  }
  switch (state) {
    case State.GeneratingPoints:
      for (let i = 0; i < pointsGenerationCount && points.length < maxPointCount; ++i) {
        console.log(i);
        const point: ColoredPoint = new Vector2(random(width), random(height));
        point.color = getRandomColor();
        points.push(point);
      }
      if (points.length >= maxPointCount) {
        state = State.Finished;
      }
      break;
    case State.Finished:
      break;
  }

  updateDiagram();

  scale(1, -1);
  translate(0, -height);
  background(150);

  strokeWeight(2);
  diagram.cells.forEach((cell) => {
    if (cell.edges.length < 3) return;
    const site = cell.site as ColoredPoint;
    if (site.plate) fill(site.plate.color);
    else fill(site.color);

    stroke(0);
    cell.polygon.draw();
  });
};
