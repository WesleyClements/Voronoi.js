import Point from './Point.js';
export default class LineSegment {
    constructor(start, end) {
        this.start = start;
        this.end = end;
    }
    get length() {
        return Point.distance(this.start, this.end);
    }
    get midpoint() {
        return Point.midpoint(this.start, this.end);
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTGluZVNlZ21lbnQuanMiLCJzb3VyY2VSb290IjoiLi9zcmMvIiwic291cmNlcyI6WyJ1dGlsL0xpbmVTZWdtZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxNQUFNLFlBQVksQ0FBQztBQUMvQixNQUFNLENBQUMsT0FBTyxPQUFPLFdBQVc7SUFHOUIsWUFBWSxLQUFZLEVBQUUsR0FBVTtRQUNsQyxJQUFJLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQztRQUNuQixJQUFJLENBQUMsR0FBRyxHQUFHLEdBQUcsQ0FBQztJQUNqQixDQUFDO0lBRUQsSUFBSSxNQUFNO1FBQ1IsT0FBTyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0lBQzlDLENBQUM7SUFFRCxJQUFJLFFBQVE7UUFDVixPQUFPLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7SUFDOUMsQ0FBQztDQUNGIn0=