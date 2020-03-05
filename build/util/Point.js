export default class Point {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    static clone(point) {
        return new Point(point.x, point.y);
    }
    static equal(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    static midpoint(a, b) {
        return new Point((a.x + b.x) / 2, (a.y + b.y) / 2);
    }
    static add(a, b) {
        return new Point(a.x + b.x, a.y + b.y);
    }
    static subtract(a, b) {
        return new Point(a.x - b.x, a.y - b.y);
    }
    static scale(point, scalar) {
        return new Point(point.x * scalar, point.y * scalar);
    }
    add(other) {
        this.x += other.x;
        this.y += other.y;
        return this;
    }
    subtract(other) {
        this.x -= other.x;
        this.y -= other.y;
        return this;
    }
    scale(scalar) {
        this.x *= scalar;
        this.y *= scalar;
        return this;
    }
}
//# sourceMappingURL=Point.js.map