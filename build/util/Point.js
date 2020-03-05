export default class Point {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    static clone(point) {
        return new Point(point.x, point.y);
    }
    static equal(a, b) {
        return a.x === b.x && a.y === b.y;
    }
    static compare(a, b, compareYFirst = true) {
        let diff = compareYFirst ? b.y - a.y : b.x - a.x;
        if (diff)
            return diff;
        else
            return compareYFirst ? b.x - a.x : b.y - a.y;
    }
    static distanceSquared(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        return dx * dx + dy * dy;
    }
    static distance(a, b) {
        return Math.sqrt(Point.distanceSquared(a, b));
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