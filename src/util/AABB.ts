import { constrain, isBetween } from './FloatUtil';

import Vector2 from './Vector2';
import LineSegment from './LineSegment';

export default class AABB {
  static clone(aabb: AABB): AABB {
    return new AABB(Vector2.clone(aabb.min), Vector2.clone(aabb.max));
  }

  static draw(min: Vector2, max: Vector2): void {
    if (!min || !max) return;
    noFill();
    rect(min.x, min.y, max.x - min.x, max.y - min.y);
  }

  min: Vector2;
  max: Vector2;

  constructor(min: Vector2, max: Vector2) {
    this.min = min;
    this.max = max;
  }

  get center(): Vector2 {
    return Vector2.midpoint(this.min, this.max);
  }

  get width(): number {
    return this.max.x - this.min.x;
  }
  get height(): number {
    return this.max.y - this.min.y;
  }

  get top(): LineSegment {
    return new LineSegment(new Vector2(this.min.x, this.max.y), Vector2.clone(this.max));
  }
  get bottom(): LineSegment {
    return new LineSegment(Vector2.clone(this.min), new Vector2(this.max.x, this.min.y));
  }
  get left(): LineSegment {
    return new LineSegment(Vector2.clone(this.min), new Vector2(this.min.x, this.max.y));
  }
  get right(): LineSegment {
    return new LineSegment(new Vector2(this.max.x, this.min.y), Vector2.clone(this.max));
  }

  contains(obj: Vector2): boolean;
  contains(obj: LineSegment): boolean;
  contains(obj: AABB): boolean;
  contains(obj: Vector2 | LineSegment | AABB): boolean {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof Vector2) {
      return isBetween(obj.x, this.min.x, this.max.x) && isBetween(obj.y, this.min.y, this.max.y);
    } else if (obj instanceof LineSegment) {
      return this.contains(obj.a) && this.contains(obj.b);
    } else if (obj instanceof AABB) {
      return this.contains(obj.min) && this.contains(obj.max);
    } else throw new Error('not implemented yet');
  }

  intersects(obj: LineSegment): boolean;
  intersects(obj: AABB): boolean;
  intersects(obj: LineSegment | AABB): boolean {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof LineSegment) {
      if (this.contains(obj)) return true;
      if (Math.max(obj.a.x, obj.b.x) < this.min.x) return false;
      if (Math.min(obj.a.x, obj.b.x) > this.max.x) return false;
      if (Math.max(obj.a.y, obj.b.y) < this.min.y) return false;
      if (Math.min(obj.a.y, obj.b.y) > this.max.y) return false;
      if (isBetween(obj.a.x, this.min.x, this.max.x) && isBetween(obj.b.x, this.min.x, this.max.x)) return true;
      if (isBetween(obj.a.y, this.min.y, this.max.y) && isBetween(obj.b.y, this.min.y, this.max.y)) return true;
      if (this.top.intersects(obj)) return true;
      if (this.bottom.intersects(obj)) return true;
      if (this.left.intersects(obj)) return true;
      if (this.right.intersects(obj)) return true;
      return false;
    }
    if (obj instanceof AABB) {
      if (obj.max.x < this.min.x) return false;
      if (obj.min.x > this.max.x) return false;
      if (obj.max.y < this.min.y) return false;
      if (obj.min.y > this.max.y) return false;
      return true;
    } else throw new Error('not implemented yet');
  }

  clamp(obj: Vector2): Vector2;
  clamp(obj: LineSegment): LineSegment;
  clamp(obj: Vector2 | LineSegment): Vector2 | LineSegment {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof Vector2) {
      return new Vector2(constrain(obj.x, this.min.x, this.max.x), constrain(obj.y, this.min.y, this.max.y));
    } else if (obj instanceof LineSegment) {
      if (Math.max(obj.a.x, obj.b.x) < this.min.x) return null;
      if (Math.min(obj.a.x, obj.b.x) > this.max.x) return null;
      if (Math.max(obj.a.y, obj.b.y) < this.min.y) return null;
      if (Math.min(obj.a.y, obj.b.y) > this.max.y) return null;

      const delta = obj.AB;
      const clamped = new LineSegment(obj.a, obj.b);

      let t = { 0: 0, 1: 1 };
      // left
      {
        const r = (this.min.x - obj.a.x) / delta.x;
        if (delta.x < 0 && r < t[1]) t[1] = r;
        else if (delta.x > 0 && r > t[0]) t[0] = r;
      }
      // right
      {
        const r = (this.max.x - obj.a.x) / delta.x;
        if (delta.x > 0 && r < t[1]) t[1] = r;
        else if (delta.x < 0 && r > t[0]) t[0] = r;
      }
      // bottom
      {
        const r = (this.min.y - obj.a.y) / delta.y;
        if (delta.y < 0 && r < t[1]) t[1] = r;
        else if (delta.y > 0 && r > t[0]) t[0] = r;
      }
      // top
      {
        const r = (this.max.y - obj.a.y) / delta.y;
        if (delta.y > 0 && r < t[1]) t[1] = r;
        else if (delta.y < 0 && r > t[0]) t[0] = r;
      }

      // if t0 > 0, a needs to change
      if (t[0] > 0) clamped.a = new Vector2(obj.a.x + t[0] * delta.x, obj.a.y + t[0] * delta.y);
      // if t1 < 1, b needs to change
      if (t[1] < 1) clamped.b = new Vector2(obj.a.x + t[1] * delta.x, obj.a.y + t[1] * delta.y);
      return clamped;
    } else throw new Error('not implemented yet');
  }

  draw(): void {
    AABB.draw(this.min, this.max);
  }
}
