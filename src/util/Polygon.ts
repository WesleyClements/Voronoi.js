import Vector2 from './Vector2';
import LineSegment from './LineSegment';
import Triangle from './Triangle';
import AABB from './AABB';

function getRawArea(...points: Vector2[]): number {
  return (
    points.reduce((sum, vertex, i, vertices): number => {
      const nextVertex = vertices[(i + 1) % vertices.length];
      return sum + Vector2.cross(vertex, nextVertex);
    }, 0) / 2
  );
}

export default class Polygon {
  static draw(...points: Vector2[]): void {
    if (!points) return;
    beginShape();
    points.forEach((point) => {
      vertex(point.x, point.y);
    });
    endShape();
  }

  static getBoundingAABB(...points: Vector2[]): AABB {
    const aabb = new AABB(Vector2.infinity, Vector2.infinity.negate());
    points.forEach((point) => {
      if (point.x < aabb.min.x) aabb.min.x = point.x;
      else if (point.x > aabb.max.x) aabb.max.x = point.x;
      if (point.y < aabb.min.y) aabb.min.y = point.y;
      else if (point.y > aabb.max.y) aabb.max.y = point.y;
    });
    return aabb;
  }

  vertices: Vector2[];

  constructor(...points: Vector2[]) {
    if (points) this.vertices = points;
    else this.vertices = [];
  }

  get perimeter(): number {
    if (this.vertices.length < 3) return NaN;
    return this.vertices.reduce((sum, vertex, i, vertices): number => {
      const nextVertex = vertices[(i + 1) % vertices.length];
      return sum + Vector2.distance(vertex, nextVertex);
    }, 0);
  }

  get area(): number {
    if (this.vertices.length < 3) return NaN;
    return Math.abs(getRawArea(...this.vertices));
  }

  get centroid(): Vector2 {
    if (this.vertices.length < 3) return null;
    const centroid = new Vector2();
    const totalArea = this.vertices.reduce((sum, vertex, i, vertices): number => {
      const nextVertex = vertices[(i + 1) % vertices.length];
      const area = Vector2.cross(vertex, nextVertex);
      centroid.x += area * (vertex.x + nextVertex.x);
      centroid.y += area * (vertex.y + nextVertex.y);
      return sum + area;
    }, 0);
    // if totalArea < 0 then polygon is wrapped clockwise and centroid needs to be negated
    if (totalArea < 0) centroid.scale(-1);
    const divisor = Math.abs(totalArea) * 3;
    centroid.x /= divisor;
    centroid.y /= divisor;
    return centroid;
  }

  get edges(): LineSegment[] {
    if (this.vertices.length < 2) return [];
    const edges: LineSegment[] = [];
    this.vertices.forEach((vertex, i, vertices) => {
      const nextVertex = vertices[(i + 1) % vertices.length];
      edges.push(new LineSegment(vertex, nextVertex));
    }, []);
    return edges;
  }

  get triangles(): Triangle[] {
    return null;
    // TODO handle getting triangles
  }

  get boundingAABB(): AABB {
    return Polygon.getBoundingAABB(...this.vertices);
  }

  contains(point: Vector2): boolean {
    if (this.vertices.length < 3) return false;
    const crossSignSum = new Vector2();
    const isOnEdge = !this.vertices.every((vertex, i, vertices): boolean => {
      const nextVertex = vertices[(i + 1) % vertices.length];

      const xWithinRange = !(point.x < Math.min(vertex.x, nextVertex.x) || point.x > Math.max(vertex.x, nextVertex.x));
      const yWithinRange = !(point.y < Math.min(vertex.y, nextVertex.y) || point.y > Math.max(vertex.y, nextVertex.y));

      if (!xWithinRange && !yWithinRange) return true;

      const alongEdge = Vector2.subtract(nextVertex, vertex);
      const toPoint = Vector2.subtract(point, vertex);
      const cross = Vector2.cross(alongEdge, toPoint);

      if (xWithinRange && yWithinRange && cross === 0) return false;
      if (xWithinRange) crossSignSum.x += Math.sign(cross);
      if (yWithinRange) crossSignSum.y += Math.sign(cross);
      return true;
    });
    if (isOnEdge) return false;
    return crossSignSum.x !== 0 && crossSignSum.y !== 0;
  }

  draw(): void {
    Polygon.draw(...this.vertices);
  }
}
