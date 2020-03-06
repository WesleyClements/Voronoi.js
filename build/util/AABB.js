import Point from './Point.js';
export default class AABB {
    constructor(min, max) {
        this.min = min;
        this.max = max;
    }
    get width() {
        return this.max.x - this.min.x;
    }
    get height() {
        return this.max.y - this.min.y;
    }
    get center() {
        return Point.midpoint(this.min, this.max);
    }
    contains(obj) {
        if (obj instanceof Point) {
            if (obj.x < this.min.x)
                return false;
            if (obj.x > this.max.x)
                return false;
            if (obj.y < this.min.y)
                return false;
            if (obj.y > this.max.y)
                return false;
            return true;
        }
        else if (obj instanceof AABB) {
            if (!this.contains(obj.min))
                return false;
            if (!this.contains(obj.max))
                return false;
            return true;
        }
    }
    intersects(obj) {
        if (obj instanceof AABB) {
            if (obj.max.x < this.min.x)
                return false;
            if (obj.min.x > this.max.x)
                return false;
            if (obj.max.y < this.min.y)
                return false;
            if (obj.min.y > this.max.y)
                return false;
            return true;
        }
    }
}
//# sourceMappingURL=AABB.js.map