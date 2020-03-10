import Polygon from '../util/Polygon.js';

import Site from './Site.js';
import Vertex from './Vertex.js';
import CellEdge from './CellEdge.js';

export default class Cell {
  site: Site;
  edges: CellEdge[];

  isClosed: boolean;

  constructor(site: Site) {
    this.site = site;
    this.edges = [];
  }

  get isOnEdge() {
    return !this.edges.every(edge => edge.sharedEdge.left && edge.sharedEdge.right);
  }

  get vertices(): Vertex[] {
    const vertices: Set<Vertex> = new Set();
    this.edges.forEach(edge => {
      if (edge.start) vertices.add(edge.start);
      if (edge.end) vertices.add(edge.end);
    });
    return [...vertices];
  }

  get neighbors(): Cell[] {
    return this.edges
      .map(edge => {
        if (edge.sharedEdge.left === this.site && edge.sharedEdge.right) return edge.sharedEdge.right.cell;
        else if (edge.sharedEdge.left) return edge.sharedEdge.left.cell;
        return null;
      })
      .filter(neighbor => neighbor);
  }

  get polygon(): Polygon {
    return new Polygon(...this.vertices);
  }
}
