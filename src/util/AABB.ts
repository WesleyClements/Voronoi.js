import Point from './Point.js';

export default class AABB {
  static clone(aabb: AABB): AABB {
    return new AABB(Point.clone(aabb.min), Point.clone(aabb.max));
  }

  min: Point;
  max: Point;

  constructor(min: Point, max: Point) {
    this.min = min;
    this.max = max;
  }

  get width(): number {
    return this.max.x - this.min.x;
  }
  get height(): number {
    return this.max.y - this.min.y;
  }

  get center(): Point {
    return Point.midpoint(this.min, this.max);
  }

  contains(obj: Point | AABB): boolean {
    if (obj instanceof Point) {
      if (obj.x < this.min.x) return false;
      if (obj.x > this.max.x) return false;
      if (obj.y < this.min.y) return false;
      if (obj.y > this.max.y) return false;
      return true;
    } else if (obj instanceof AABB) {
      if (!this.contains(obj.min)) return false;
      if (!this.contains(obj.max)) return false;
      return true;
    }
  }

  intersects(obj: AABB): boolean {
    if (obj instanceof AABB) {
      if (obj.max.x < this.min.x) return false;
      if (obj.min.x > this.max.x) return false;
      if (obj.max.y < this.min.y) return false;
      if (obj.min.y > this.max.y) return false;
      return true;
    }
  }
}
