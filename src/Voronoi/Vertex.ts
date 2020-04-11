import Vector2 from '../util/Vector2';

import Edge from './Edge';
import Cell from './Cell';

export default class Vertex extends Vector2 {
  edges: Set<Edge>;
  constructor(x: number, y: number) {
    super(x, y);
    this.edges = new Set();
  }

  get neighbors(): Vertex[] {
    const neighbors: Set<Vertex> = new Set();
    this.edges.forEach((edge) => {
      if (edge.a) neighbors.add(edge.a);
      if (edge.b) neighbors.add(edge.b);
    });
    neighbors.delete(this);
    return [...neighbors];
  }

  get cells(): Cell[] {
    const cells: Set<Cell> = new Set();
    this.edges.forEach((edge) => {
      if (edge.left) cells.add(edge.left.cell);
      if (edge.right) cells.add(edge.right.cell);
    });
    return [...cells];
  }
}
