import Point from './Point.js';
import Line from './Line.js';
import LineSegment from './LineSegment.js';
export default class Triangle {
    constructor(a, b, c) {
        if (a == null)
            throw new Error('a is null');
        if (b == null)
            throw new Error('b is null');
        if (c == null)
            throw new Error('c is null');
        this.a = a;
        this.b = b;
        this.c = c;
    }
    get AB() {
        return new LineSegment(this.a, this.b);
    }
    get AC() {
        return new LineSegment(this.a, this.c);
    }
    get BC() {
        return new LineSegment(this.b, this.c);
    }
    get perimeter() {
        return this.AB.length + this.AC.length + this.BC.length;
    }
    get semiperimeter() {
        return this.perimeter / 2;
    }
    get area() {
        const ab = this.AB.length;
        const ac = this.AC.length;
        const bc = this.BC.length;
        const semi = this.semiperimeter;
        const sidesAreNotZero = () => ab !== 0 && ac !== 0 && bc !== 0;
        const sidesAreNotInLine = () => semi !== ab && semi !== ac && semi !== bc;
        if (sidesAreNotZero() && sidesAreNotInLine())
            return sqrt(semi * (semi - ab) * (semi - ac) * (semi - bc));
        else
            return 0;
    }
    get centroid() {
        return new Point((this.a.x + this.b.x + this.c.x) / 3, (this.a.y + this.b.y + this.c.y) / 3);
    }
    get circumcenter() {
        return Line.getIntersection(Line.getPerpendicularBisector(this.a, this.b), Line.getPerpendicularBisector(this.a, this.c));
    }
}
//# sourceMappingURL=Triangle.js.map