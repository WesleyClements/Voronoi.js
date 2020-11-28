import Site from './Site';
import Vertex from './Vertex';
import Edge from './Edge';
import Cell from './Cell';

export default class Diagram {
  edges: Edge[];
  cells: Cell[];

  execTime: number;

  constructor() {
    this.edges = [];
    this.cells = [];
  }

  get sites(): Site[] {
    return this.cells.map((cell) => cell.site);
  }

  get vertices(): Vertex[] {
    return [
      ...this.edges.reduce((vertices, edge) => {
        if (edge.a) vertices.add(edge.a);
        if (edge.b) vertices.add(edge.b);
        return vertices;
      }, new Set<Vertex>()),
    ];
  }

  get edgeCells(): Cell[] {
    return this.cells.filter((cell) => cell.isOnEdge);
  }
}
