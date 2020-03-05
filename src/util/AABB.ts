import Point from './Point.js';

export default class AABB {
  min: Point;
  max: Point;

  constructor(min: Point, max: Point) {
    this.min = min;
    this.max = max;
  }
}
