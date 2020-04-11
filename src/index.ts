import { Color } from 'p5';

import Vector2 from './util/Vector2';
import LineSegment from './util/LineSegment';
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
  Relaxing,
  SeedPlates,
  GrowPlates,
  MovePlates,
  Finished,
}

const maxPointCount: number = 1000;
const pointsGenerationCount: number = 20;
const maxRelaxIterations: number = 2;
const plateCount: number = 12;
const plateMoveSteps: number = 200;

let points: ColoredPoint[] = [];

let diagram: Diagram;

let width: number;
let height: number;

let bounds: AABB;

let state: State;

//#region State Values
let relaxIterationCount: number;
let plates: Plate[];
let plateEdges: ColoredPoint[];
let plateMoveCount: number;
//#endregion

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

function relaxPoints() {
  points = diagram.cells.map((cell) => {
    const { x, y } = cell.polygon.centroid;
    cell.site.x = x;
    cell.site.y = y;
    return cell.site;
  });
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

window.draw = () => {
  switch (state) {
    case State.GeneratingPoints:
      for (let i = 0; i < pointsGenerationCount && points.length < maxPointCount; ++i) {
        const point: ColoredPoint = new Vector2(random(width), random(height));
        point.color = getRandomColor();
        points.push(point);
        console.log(point);
      }
      updateDiagram();
      if (points.length >= maxPointCount) {
        state = State.Relaxing;
        relaxIterationCount = 0;
        console.log('Changing to Relaxing');
      }
      break;
    case State.Relaxing:
      if (relaxIterationCount < maxRelaxIterations) {
        relaxPoints();
        updateDiagram();
        relaxIterationCount++;
      } else {
        state = State.SeedPlates;
        console.log('Changing to SeedPlates');
      }
      break;
    case State.SeedPlates:
      plates = [];
      const seeds = new Set<ColoredPoint>();
      while (seeds.size < plateCount) {
        let point: ColoredPoint = points[floor(random(points.length))];
        if (!seeds.has(point)) {
          const i = seeds.size;
          plates[i] = new Plate(seeds.size, point.color);
          plates[i].sites.push(point);
          point.plate = plates[seeds.size];
          seeds.add(point);
        }
      }
      plateEdges = [...seeds];
      state = State.GrowPlates;
      console.log('Changing to GrowPlates');
      break;
    case State.GrowPlates:
      if (plateEdges.length > 0) {
        plateEdges = plateEdges.reduce((newEdges, edge): ColoredPoint[] => {
          return [
            ...newEdges,
            ...edge.cell.neighbors
              .filter((cell) => {
                const site = cell.site as ColoredPoint;
                if (site.plate) return false;
                site.plate = edge.plate;
                edge.plate.sites.push(site);
                return true;
              })
              .map((cell) => cell.site),
          ];
        }, []);
      } else {
        state = State.MovePlates;
        plateMoveCount = 0;
        console.log('Changing to MovePlates');
      }
      break;
    case State.MovePlates:
      if (plateMoveCount < plateMoveSteps) {
        plates.forEach((plate) => {
          plate.sites.forEach((site) => {
            site.add(plate.velocity);
            if (site.x < 0) site.x += width;
            else if (site.x > width) site.x -= width;
            if (site.y < 0) site.y += height;
            else if (site.y > width) site.y -= height;
          });
        });
        updateDiagram();
        plateMoveCount++;
      } else {
        state = State.Finished;
        console.log('Changing to Finished');
      }
      break;
    case State.Finished:
      noLoop();
      break;
  }

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
