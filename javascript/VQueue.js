class VQueue {
  constructor() {
    this._q = [];
  }

  get isEmpty() {
    return this._q.length === 0;
  }

  enqueue(e) {
    this._q.push(e);
  }
  dequeue() {
    this._q.sort(VEvent.compare);
    return this._q.pop();
  }

  clear() {
    this._q = [];
  }
}
