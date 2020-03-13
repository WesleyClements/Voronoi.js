import Site from './Site.js';
import Vertex from './Vertex.js';
import Edge from './Edge.js';
import Cell from './Cell.js';

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

  get edgeCells(): Cell[] {
    return this.cells.filter(cell => cell.isOnEdge);
  }
}
