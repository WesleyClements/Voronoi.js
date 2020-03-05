// import Point from './Point.js';
// export default class Line {
//   constructor(a, b, c) {
//     if (typeof a === 'object' && typeof b === 'object') {
//       const dy = b.y - a.y;
//       const dx = a.x - b.x;
//       this.a = dy;
//       this.b = dx;
//       this.c = dy * a.x + dx * b.y;
//     } else if (typeof a === 'number' && typeof b === 'number' && typeof c === 'number') {
//       this.a = a;
//       this.b = b;
//       this.c = c;
//     } else throw Error('invalid arguments');
//   }
//   static getIntersection(lineA, lineB) {
//     let det = lineA.a * lineB.b - lineB.a * lineA.b;
//     if (!det) return;
//     return {
//       x: (lineB.b * lineA.c - lineA.b * lineB.c) / det,
//       y: (lineA.a * lineB.c - lineB.a * lineA.c) / det,
//     };
//   }
//   static getPerpendicularBisector(a, b) {
//     const midPoint = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
//     return new Line(a, b).getPerpendicular(midPoint);
//   }

//   getPerpendicular(point) {
//     return new Line(-this.b, this.a, -this.b * point.x + this.a * point.y);
//   }
//   evaluateX(x) {
//     if (!this.b) return;
//     return (this.c - this.a * x) / this.b;
//   }
//   evaluateY(y) {
//     if (!this.a) return;
//     return (this.c - this.b * y) / this.y;
//   }
// }
