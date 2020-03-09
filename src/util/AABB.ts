import Vector2 from './Vector2.js';

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

  get width(): number {
    return this.max.x - this.min.x;
  }
  get height(): number {
    return this.max.y - this.min.y;
  }

  get center(): Vector2 {
    return Vector2.midpoint(this.min, this.max);
  }

  contains(obj: Vector2 | AABB): boolean {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof Vector2) {
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
    throw new Error('not implemented yet');
  }

  intersects(obj: AABB): boolean {
    if (obj == null) throw new Error('obj is null');
    if (obj instanceof AABB) {
      if (obj.max.x < this.min.x) return false;
      if (obj.min.x > this.max.x) return false;
      if (obj.max.y < this.min.y) return false;
      if (obj.min.y > this.max.y) return false;
      return true;
    }
    throw new Error('not implemented yet');
  }

  draw(): void {
    AABB.draw(this.min, this.max);
  }
}
