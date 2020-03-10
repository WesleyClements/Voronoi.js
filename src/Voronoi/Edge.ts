import LineSegment from '../util/LineSegment.js';
import Site from './Site.js';
import Vertex from './Vertex.js';

export default class Edge extends LineSegment {
  left: Site;
  right: Site;

  a: Vertex;
  b: Vertex;

  constructor(left: Site, right: Site, start?: Vertex, end?: Vertex) {
    super(start, end);
    this.left = left;
    this.right = right;
  }
}
