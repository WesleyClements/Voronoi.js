class VEvent {
  constructor(point, pe) {
    this.point = point;
    this.isPointEvent = pe;
    this.y = point.y;

    //this.arch = null;
    this.valid = true;
  }

  static compare(a, b) {
    return a.y > b.y ? 1 : -1;
  }
}
