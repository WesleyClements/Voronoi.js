import Vector2 from '../util/Vector2';

import Site from './Site';
import Vertex from './Vertex';
import Edge from './Edge';

export default class CellEdge {
  site: Site;
  sharedEdge: Edge;
  angle: number;

  constructor(site: Site, sharedEdge: Edge, other?: Site) {
    this.site = site;
    this.sharedEdge = sharedEdge;

    if (other) this.angle = Math.atan2(other.y - site.y, other.x - site.x);
    else {
      const alongEdge = Vector2.subtract(this.end, this.start);
      this.angle = Math.atan2(alongEdge.x, -alongEdge.y);
    }
  }

  get length(): number {
    return this.sharedEdge.length;
  }

  get start(): Vertex {
    return this.sharedEdge.left === this.site ? this.sharedEdge.a : this.sharedEdge.b;
  }
  get end(): Vertex {
    return this.sharedEdge.left === this.site ? this.sharedEdge.b : this.sharedEdge.a;
  }
}
