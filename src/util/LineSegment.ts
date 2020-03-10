import Vector2 from './Vector2.js';
import Line from './Line.js';
import AABB from './AABB.js';

export default class LineSegment {
  static draw(a: Vector2, b: Vector2): void {
    if (!a || !b) return;
    line(a.x, a.y, b.x, b.y);
  }

  static getBoundingAABB(a: Vector2, b: Vector2): AABB {
    return new AABB(
      new Vector2(Math.min(a.x, b.x), Math.min(a.y, b.y)),
      new Vector2(Math.max(a.x, b.x), Math.max(a.y, b.y)),
    );
  }

  a: Vector2;
  b: Vector2;

  constructor(start: Vector2, end: Vector2) {
    this.a = start;
    this.b = end;
  }

  get AB(): Vector2 {
    return Vector2.subtract(this.b, this.a);
  }

  get BA(): Vector2 {
    return Vector2.subtract(this.a, this.b);
  }

  get length(): number {
    return Vector2.distance(this.a, this.b);
  }

  get midpoint(): Vector2 {
    return Vector2.midpoint(this.a, this.b);
  }

  get line(): Line {
    return new Line(this.a, this.b);
  }

  get boundingAABB(): AABB {
    return LineSegment.getBoundingAABB(this.a, this.b);
  }

  intersects(obj: LineSegment | AABB): boolean {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof LineSegment) {
      const aabbA = this.boundingAABB;
      const aabbB = obj.boundingAABB;
      if (!aabbA.intersects(aabbB)) return false;

      const ab = this.AB;
      const testAC = Vector2.cross(ab, Vector2.subtract(obj.a, this.a));
      const testAD = Vector2.cross(ab, Vector2.subtract(obj.b, this.a));
      if (Math.max(testAC, testAD) < 0) return false;
      if (Math.min(testAC, testAD) > 0) return false;

      const cd = obj.AB;
      const testCA = Vector2.cross(cd, Vector2.subtract(this.a, obj.a));
      const testCB = Vector2.cross(cd, Vector2.subtract(this.b, obj.a));
      if (Math.max(testCA, testCB) < 0) return false;
      if (Math.min(testCA, testCB) > 0) return false;

      return true;
    } else if (obj instanceof AABB) {
      return obj.intersects(this);
    } else throw new Error('not implemented yet');
  }

  draw(): void {
    LineSegment.draw(this.a, this.b);
  }
}
