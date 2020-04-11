import LineSegment from '../util/LineSegment';
import Site from './Site';
import Vertex from './Vertex';

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
