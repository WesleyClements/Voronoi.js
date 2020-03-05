import Point from './Point.js';
export default class Line {
    constructor(a, b, c) {
        if (a == null)
            return;
        if (b == null)
            return;
        if (typeof a === 'object') {
            a = a;
            b = b;
            this.dy = b.y - a.y;
            this.dx = a.x - b.x;
            this.intercept = this.dy * a.x + this.dx * b.y;
        }
        else if (typeof a === 'number') {
            a = a;
            b = b;
            this.dy = a;
            this.dx = b;
            this.intercept = c;
        }
    }
    static getIntersection(a, b) {
        let det = a.dy * b.dx - b.dy * a.dx;
        if (!det)
            return;
        return {
            x: (b.dx * a.intercept - a.dx * b.intercept) / det,
            y: (a.dy * b.intercept - b.dy * a.intercept) / det,
        };
    }
    static getPerpendicularBisector(a, b) {
        return new Line(a, b).getPerpendicular(Point.midpoint(a, b));
    }
    getPerpendicular(point) {
        return new Line(-this.dx, this.dy, -this.dx * point.x + this.dy * point.y);
    }
    getY(x) {
        if (!this.dx)
            return;
        return (this.intercept - this.dy * x) / this.dx;
    }
    getX(y) {
        if (!this.dy)
            return;
        return (this.intercept - this.dx * y) / this.dy;
    }
}
//# sourceMappingURL=Line.js.map