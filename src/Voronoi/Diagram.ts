import { equalWithEpsilon, lessThanWithEpsilon, greaterThanWithEpsilon } from '../util/FloatUtil.js';

import Vector2 from '../util/Vector2.js';
import AABB from '../util/AABB.js';

import Site from './Site.js';
import Vertex from './Vertex.js';
import Edge from './Edge.js';
import Cell from './Cell.js';
import CellEdge from './CellEdge.js';

//#region Edge Functions
// connect dangling edges (not if a cursory test tells us
// it is not going to be visible.
// return value:
//   false: the dangling endpoint couldn't be connected
//   true: the dangling endpoint could be connected
function connectEdgeToBounds(edge: Edge, aabb: AABB): boolean {
  // skip if end point already connected
  if (edge.b) return true;

  if (edge.left) edge.left.cell.isClosed = false;
  if (edge.right) edge.right.cell.isClosed = false;

  const { min, max } = aabb;

  // make local copy for performance purpose
  const { left, right } = edge;
  const midpoint = Vector2.midpoint(left, right);

  // remember, direction of line (relative to left site):
  // upward: left.x < right.x
  // downward: left.x > right.x
  // horizontal: left.x == right.x
  // upward: left.x < right.x
  // rightward: left.y < right.y
  // leftward: left.y > right.y
  // vertical: left.y == right.y

  // depending on the direction, find the best side of the
  // bounding box to use to determine a reasonable start point

  // special case: vertical line
  if (equalWithEpsilon(right.y, left.y)) {
    // doesn't intersect with viewport
    if (midpoint.x < min.x || midpoint.x >= max.x) return false;

    // downward
    if (left.x > right.x) {
      if (!edge.a) edge.a = new Vertex(midpoint.x, min.y);
      else if (edge.a.y >= max.y) return false;

      edge.b = new Vertex(midpoint.x, max.y);
    }
    // upward
    else {
      if (!edge.a) edge.a = new Vertex(midpoint.x, max.y);
      else if (edge.a.y < min.y) return false;

      edge.b = new Vertex(midpoint.x, min.y);
    }
  } else {
    // get the line equation of the bisector
    const slope = (left.x - right.x) / (right.y - left.y);
    const intercept = midpoint.y - slope * midpoint.x;
    // closer to vertical than horizontal, connect start point to the
    // top or bottom side of the bounding box
    if (slope < -1 || slope > 1) {
      // downward
      if (left.x > right.x) {
        if (!edge.a) edge.a = new Vertex((min.y - intercept) / slope, min.y);
        else if (edge.a.y >= max.y) return false;

        edge.b = new Vertex((max.y - intercept) / slope, max.y);
      }
      // upward
      else {
        if (!edge.a) edge.a = new Vertex((max.y - intercept) / slope, max.y);
        else if (edge.a.y < min.y) return false;

        edge.b = new Vertex((min.y - intercept) / slope, min.y);
      }
    }
    // closer to horizontal than vertical, connect start point to the
    // left or right side of the bounding box
    else {
      // rightward
      if (left.y < right.y) {
        if (!edge.a) edge.a = new Vertex(min.x, slope * min.x + intercept);
        else if (edge.a.x >= max.x) return false;

        edge.b = new Vertex(max.x, slope * max.x + intercept);
      }
      // leftward
      else {
        if (!edge.a) edge.a = new Vertex(max.x, slope * max.x + intercept);
        else if (edge.a.x < min.x) return false;

        edge.b = new Vertex(min.x, slope * min.x + intercept);
      }
    }
  }
  return true;
}

// line-clipping code taken from:
//   Liang-Barsky function by Daniel White
//   http://www.skytopia.com/project/articles/compsci/clipping.html
// Thanks!
// A bit modified to minimize code paths
function clipEdgeToBounds(edge: Edge, aabb: AABB): boolean {
  const clamped = aabb.clamp(edge);

  if (!clamped) return false;
  const aChanged = clamped.a !== edge.a;
  const bChanged = clamped.b !== edge.b;
  if (aChanged) edge.a = new Vertex(clamped.a.x, clamped.a.y);
  if (bChanged) edge.b = new Vertex(clamped.b.x, clamped.b.y);

  if (aChanged || bChanged) {
    if (edge.left) edge.left.cell.isClosed = false;
    if (edge.right) edge.right.cell.isClosed = false;
  }

  return true;
}
// edge is removed if:
//   it is wholly outside the bounding box
//   it is actually a point rather than a line
function shouldKeepEdge(edge: Edge, aabb: AABB): boolean {
  if (!connectEdgeToBounds(edge, aabb)) return false;
  if (!clipEdgeToBounds(edge, aabb)) return false;
  if (Vector2.equalApproximate(edge.a, edge.b)) return false;
  return true;
}
function clipEdge(edge: Edge, aabb: AABB): boolean {
  if (shouldKeepEdge(edge, aabb)) {
    return true;
  } else {
    if (edge.a) edge.a.edges.delete(edge);
    if (edge.b) edge.b.edges.delete(edge);
    edge.a = undefined;
    edge.b = undefined;

    return false;
  }
}
//#endregion

//#region Cell Functions
function compareCellEdges(a: CellEdge, b: CellEdge): number {
  if (!a) return -1;
  if (!b) return 1;
  return b.angle - a.angle;
}
// close open cells
function closeCell(diagram: Diagram, cell: Cell, aabb: AABB): boolean {
  const { min, max } = aabb;
  // step 1: find first 'unclosed' point, if any.
  // an 'unclosed' point will be the end point of a halfedge which
  // does not match the start point of the following halfedge
  // special case: only one site, in which case, the viewport is the cell
  // ...
  // all other cases
  for (let i = 0; i < cell.edges.length; ++i) {
    if (i > 20) {
      console.log('!!!');
      return false;
    }
    const { end } = cell.edges[i];
    const { start } = cell.edges[(i + 1) % cell.edges.length];
    // if start point equals end point, we don't need to do anything
    if (Vector2.equalApproximate(end, start)) continue;
    // if we reach this point, cell needs to be closed by walking
    // counterclockwise along the bounding box until it connects
    // to next halfedge in the list
    // walk downward along left side
    let newEnd: Vertex;
    if (equalWithEpsilon(end.x, min.x) && lessThanWithEpsilon(end.y, max.y)) {
      newEnd = new Vertex(min.x, equalWithEpsilon(start.x, min.x) ? start.y : max.y);
    }
    // walk rightward along bottom side
    else if (equalWithEpsilon(end.y, max.y) && lessThanWithEpsilon(end.x, max.x)) {
      newEnd = new Vertex(equalWithEpsilon(start.y, max.y) ? start.x : max.x, max.y);
    }
    // walk upward along right side
    else if (equalWithEpsilon(end.x, max.x) && greaterThanWithEpsilon(end.y, min.y)) {
      newEnd = new Vertex(max.x, equalWithEpsilon(start.x, max.x) ? start.y : min.y);
    }
    // walk leftward along top side
    else if (equalWithEpsilon(end.y, min.y) && greaterThanWithEpsilon(end.x, min.x)) {
      newEnd = new Vertex(equalWithEpsilon(start.y, min.y) ? start.x : min.x, min.y);
    } else return false;

    const edge = new Edge(cell.site, null, end, newEnd);
    edge.a.edges.add(edge);
    edge.b.edges.add(edge);
    diagram.edges.push(edge);
    cell.edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
  }
  cell.isClosed = true;
  return true;
}
//#endregion

export default class Diagram {
  edges: Edge[];
  cells: Cell[];

  execTime: number;

  constructor() {
    this.edges = [];
    this.cells = [];
  }

  get sites(): Site[] {
    return this.cells.map(cell => cell.site);
  }

  get vertices(): Vertex[] {
    const vertices: Set<Vertex> = new Set();
    this.edges.forEach(edge => {
      if (edge.a) vertices.add(edge.a);
      if (edge.b) vertices.add(edge.b);
    });
    return [...vertices];
  }

  getRelaxedSites(t: number = 1): Site[] {
    return this.cells.map(cell => {
      const newPoint = Vector2.lerp(cell.site, cell.polygon.centroid, t);
      return { ...cell.site, x: newPoint.x, y: newPoint.y } as Site;
    });
  }

  // Connect/cut edges at bounding box and close the cells.
  // The cells are bound by the supplied bounding box.
  // Each cell refers to its associated site, and a list
  // of halfedges ordered counterclockwise.
  finish(aabb: AABB): void {
    aabb = AABB.clone(aabb);

    this.edges = this.edges.filter(edge => clipEdge(edge, aabb));

    this.cells = this.cells.filter(cell => {
      cell.edges = cell.edges.filter(edge => edge.start && edge.end && clipEdge(edge.sharedEdge, aabb));
      if (!cell.edges.length) return false;
      if (!cell.isClosed) {
        cell.edges.sort(compareCellEdges);
        if (!closeCell(this, cell, aabb)) return false;
      }
      return true;
    });
  }
}
