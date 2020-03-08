import Vector2 from './Vector2.js';
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
        return new Vector2((this.a.x + this.b.x + this.c.x) / 3, (this.a.y + this.b.y + this.c.y) / 3);
    }
    get circumcenter() {
        return Line.getIntersection(Line.getPerpendicularBisector(this.a, this.b), Line.getPerpendicularBisector(this.a, this.c));
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVHJpYW5nbGUuanMiLCJzb3VyY2VSb290IjoiLi9zcmMvIiwic291cmNlcyI6WyJ1dGlsL1RyaWFuZ2xlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sT0FBTyxNQUFNLGNBQWMsQ0FBQztBQUNuQyxPQUFPLElBQUksTUFBTSxXQUFXLENBQUM7QUFDN0IsT0FBTyxXQUFXLE1BQU0sa0JBQWtCLENBQUM7QUFFM0MsTUFBTSxDQUFDLE9BQU8sT0FBTyxRQUFRO0lBSzNCLFlBQVksQ0FBVSxFQUFFLENBQVUsRUFBRSxDQUFVO1FBQzVDLElBQUksQ0FBQyxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzVDLElBQUksQ0FBQyxJQUFJLElBQUk7WUFBRSxNQUFNLElBQUksS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBRTVDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ1gsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDWCxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNiLENBQUM7SUFFRCxJQUFJLEVBQUU7UUFDSixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxJQUFJLEVBQUU7UUFDSixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFDRCxJQUFJLEVBQUU7UUFDSixPQUFPLElBQUksV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWCxPQUFPLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxHQUFHLElBQUksQ0FBQyxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQzFELENBQUM7SUFDRCxJQUFJLGFBQWE7UUFDZixPQUFPLElBQUksQ0FBQyxTQUFTLEdBQUcsQ0FBQyxDQUFDO0lBQzVCLENBQUM7SUFFRCxJQUFJLElBQUk7UUFDTixNQUFNLEVBQUUsR0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNsQyxNQUFNLEVBQUUsR0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNsQyxNQUFNLEVBQUUsR0FBVyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQztRQUNsQyxNQUFNLElBQUksR0FBVyxJQUFJLENBQUMsYUFBYSxDQUFDO1FBRXhDLE1BQU0sZUFBZSxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9ELE1BQU0saUJBQWlCLEdBQUcsR0FBRyxFQUFFLENBQUMsSUFBSSxLQUFLLEVBQUUsSUFBSSxJQUFJLEtBQUssRUFBRSxJQUFJLElBQUksS0FBSyxFQUFFLENBQUM7UUFDMUUsSUFBSSxlQUFlLEVBQUUsSUFBSSxpQkFBaUIsRUFBRTtZQUFFLE9BQU8sSUFBSSxDQUFDLElBQUksR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksR0FBRyxFQUFFLENBQUMsQ0FBQyxDQUFDOztZQUNyRyxPQUFPLENBQUMsQ0FBQztJQUNoQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsT0FBTyxJQUFJLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUNqRyxDQUFDO0lBRUQsSUFBSSxZQUFZO1FBQ2QsT0FBTyxJQUFJLENBQUMsZUFBZSxDQUN6QixJQUFJLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQzdDLElBQUksQ0FBQyx3QkFBd0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FDOUMsQ0FBQztJQUNKLENBQUM7Q0FDRiJ9