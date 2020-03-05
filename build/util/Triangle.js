import Line from './Line.js';
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
    get ABLength() {
        const x = this.a.x - this.b.x;
        const y = this.a.y - this.b.y;
        return Math.sqrt(x * x + y * y);
    }
    get ACLength() {
        const x = this.a.x - this.c.x;
        const y = this.a.y - this.c.y;
        return Math.sqrt(x * x + y * y);
    }
    get BCLength() {
        const x = this.b.x - this.c.x;
        const y = this.b.y - this.c.y;
        return Math.sqrt(x * x + y * y);
    }
    get perimeter() {
        return this.ABLength + this.ACLength + this.BCLength;
    }
    get semiperimeter() {
        return this.perimeter / 2;
    }
    get area() {
        const ab = this.ABLength;
        const ac = this.ACLength;
        const bc = this.BCLength;
        const semi = this.semiperimeter;
        const sidesAreNotZero = () => ab !== 0 && ac !== 0 && bc !== 0;
        const sidesAreNotInLine = () => semi !== ab && semi !== ac && semi !== bc;
        if (sidesAreNotZero() && sidesAreNotInLine())
            return sqrt(semi * (semi - ab) * (semi - ac) * (semi - bc));
        else
            return 0;
    }
    get circumcenter() {
        return Line.getIntersection(Line.getPerpendicularBisector(this.a, this.b), Line.getPerpendicularBisector(this.a, this.c));
    }
}
//# sourceMappingURL=Triangle.js.map