import { EPSILON, equalWithEpsilon, lessThanWithEpsilon, greaterThanWithEpsilon } from './util/FloatUtil.js';
import { RBTree } from './util/RBTree.js';
import Point from './util/Point.js';
import Triangle from './util/Triangle.js';
function comparePoints(a, b) {
    let r = b.y - a.y;
    if (r)
        return r;
    return b.x - a.x;
}
function pointsEqualWithEpsilon(a, b) {
    return equalWithEpsilon(a.x, b.x) && equalWithEpsilon(a.y, b.y);
}
class BeachSection {
}
class CircleEvent {
}
class Edge {
    constructor(left, right) {
        this.left = left;
        this.right = right;
    }
    get length() {
        if (this._length == null) {
            if (!this.vertexA || !this.vertexB)
                return;
            const x = this.vertexA.x - this.vertexB.x;
            const y = this.vertexA.y - this.vertexB.y;
            this._length = Math.sqrt(x * x + y * y);
        }
        return this._length;
    }
}
function setEdgeStart(edge, left, right, vertex) {
    if (!edge.vertexA && !edge.vertexB) {
        edge.vertexA = vertex;
        edge.left = left;
        edge.right = right;
    }
    else if (edge.left === right)
        edge.vertexB = vertex;
    else
        edge.vertexA = vertex;
}
function setEdgeEnd(edge, left, right, vertex) {
    setEdgeStart(edge, right, left, vertex);
}
function connectEdgeToBounds(edge, bbox) {
    if (edge.vertexB)
        return true;
    const { xl, xr, yb, yt } = bbox;
    const { left, right } = edge;
    const avg = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    if (right.y === left.y) {
        if (avg.x < xl || avg.x >= xr)
            return false;
        if (left.x > right.x) {
            if (!edge.vertexA)
                edge.vertexA = new Point(avg.x, yb);
            else if (edge.vertexA.y >= yt)
                return false;
            edge.vertexB = new Point(avg.x, yt);
        }
        else {
            if (!edge.vertexA)
                edge.vertexA = new Point(avg.x, yt);
            else if (edge.vertexA.y < yb)
                return false;
            edge.vertexB = new Point(avg.x, yb);
        }
    }
    else {
        const fm = (left.x - right.x) / (right.y - left.y);
        const fb = avg.y - fm * avg.x;
        if (fm < -1 || fm > 1) {
            if (left.x > right.x) {
                if (!edge.vertexA)
                    edge.vertexA = new Point((yb - fb) / fm, yb);
                else if (edge.vertexA.y >= yt)
                    return false;
                edge.vertexB = new Point((yt - fb) / fm, yt);
            }
            else {
                if (!edge.vertexA)
                    edge.vertexA = new Point((yt - fb) / fm, yt);
                else if (edge.vertexA.y < yb)
                    return false;
                edge.vertexB = new Point((yb - fb) / fm, yb);
            }
        }
        else {
            if (left.y < right.y) {
                if (!edge.vertexA)
                    edge.vertexA = new Point(xl, fm * xl + fb);
                else if (edge.vertexA.x >= xr)
                    return false;
                edge.vertexB = new Point(xr, fm * xr + fb);
            }
            else {
                if (!edge.vertexA)
                    edge.vertexA = new Point(xr, fm * xr + fb);
                else if (edge.vertexA.x < xl)
                    return false;
                edge.vertexB = new Point(xl, fm * xl + fb);
            }
        }
    }
    return true;
}
function clipEdgeToBounds(edge, bbox) {
    const { xl, xr, yb, yt } = bbox;
    const { vertexA: { x: ax, y: ay }, vertexB: { x: bx, y: by }, } = edge;
    const delta = { x: bx - ax, y: by - ay };
    let t0 = 0;
    let t1 = 1;
    const edgeIsInBounds = (p, q) => {
        if (p === 0 && q < 0)
            return false;
        let r = q / p;
        if (p < 0) {
            if (r > t1)
                return false;
            else if (r > t0)
                t0 = r;
        }
        else if (p > 0) {
            if (r < t0)
                return false;
            else if (r < t1)
                t1 = r;
        }
        return true;
    };
    if (!edgeIsInBounds(-delta.x, ax - xl))
        return false;
    if (!edgeIsInBounds(delta.x, xr - ax))
        return false;
    if (!edgeIsInBounds(-delta.y, ay - yb))
        return false;
    if (!edgeIsInBounds(delta.y, yt - ay))
        return false;
    if (t0 > 0)
        edge.vertexA = new Point(ax + t0 * delta.x, ay + t0 * delta.y);
    if (t1 < 1)
        edge.vertexB = new Point(ax + t1 * delta.x, ay + t1 * delta.y);
    return true;
}
class CellEdge {
    constructor(site, sharedEdge, other) {
        this.site = site;
        this.sharedEdge = sharedEdge;
        if (other)
            this.angle = Math.atan2(other.y - site.y, other.x - site.x);
        else {
            const { vertexA, vertexB } = sharedEdge;
            if (sharedEdge.left === site)
                this.angle = Math.atan2(vertexB.x - vertexA.x, vertexA.y - vertexB.y);
            else
                this.angle = Math.atan2(vertexA.x - vertexB.x, vertexB.y - vertexA.y);
        }
    }
    get start() {
        if (this._start == null) {
            if (this.sharedEdge.left === this.site)
                this._start = this.sharedEdge.vertexA;
            else
                this._start = this.sharedEdge.vertexB;
        }
        return this._start;
    }
    get end() {
        if (this._end == null) {
            if (this.sharedEdge.left === this.site)
                this._end = this.sharedEdge.vertexB;
            else
                this._end = this.sharedEdge.vertexA;
        }
        return this._end;
    }
}
function compareCellEdges(a, b) {
    return b.angle - a.angle;
}
class Cell {
    constructor(site) {
        this.site = site;
        this.edges = [];
    }
    get triangles() {
        if (this._triangles == null) {
            this._triangles = this.edges.map(edge => new Triangle(this.site, edge.start, edge.end));
        }
        return this._triangles;
    }
    get perimeter() {
        if (this._perimeter == null) {
            this._perimeter = this.edges.reduce((area, he) => {
                return area + he.sharedEdge.length;
            }, 0);
        }
        return this._perimeter;
    }
    get area() {
        if (this._area == null) {
            this._area = this.triangles.reduce((area, tri) => {
                return area + tri.area;
            }, 0);
        }
        return this._area;
    }
    get centroid() {
        if (this._centroid == null) {
            const circum = new Point(0, 0);
            this.triangles.forEach(tri => {
                let triCircum = tri.circumcenter;
                if (!triCircum)
                    return;
                circum.x += triCircum.x * tri.area;
                circum.y += triCircum.y * tri.area;
            });
            this._centroid = new Point(circum.x / this.area, circum.y / this.area);
        }
        return this._centroid;
    }
}
class Diagram {
    constructor() {
        this.edges = [];
        this.cells = [];
    }
    get relaxedSites() {
        if (!this._finished)
            return;
        return this.cells.map(cell => (Object.assign(Object.assign({}, cell.site), { x: cell.centroid.x, y: cell.centroid.y })));
    }
    finish(bbox) {
        const { xl, xr, yb, yt } = bbox;
        this.edges = this.edges.filter(edge => {
            if (connectEdgeToBounds(edge, bbox) && clipEdgeToBounds(edge, bbox))
                if (!pointsEqualWithEpsilon(edge.vertexA, edge.vertexB))
                    return true;
            delete edge.vertexA;
            delete edge.vertexB;
            return false;
        });
        this.cells = this.cells.filter(cell => {
            cell.edges = cell.edges.filter(he => he.sharedEdge.vertexA || he.sharedEdge.vertexB);
            cell.edges.sort(compareCellEdges);
            let edges = cell.edges;
            if (!edges.length) {
                cell.site.cell = undefined;
                return false;
            }
            for (let i = 0; i < edges.length; ++i) {
                let end = edges[i].end;
                let start = edges[(i + 1) % edges.length].start;
                if (pointsEqualWithEpsilon(start, end))
                    continue;
                const edge = new Edge(cell.site, null);
                edge.vertexA = end;
                this.edges.push(edge);
                if (equalWithEpsilon(end.x, xl) && lessThanWithEpsilon(end.y, yt)) {
                    edge.vertexB = new Point(xl, equalWithEpsilon(start.x, xl) ? start.y : yt);
                }
                else if (equalWithEpsilon(end.y, yt) && lessThanWithEpsilon(end.x, xr)) {
                    edge.vertexB = new Point(equalWithEpsilon(start.y, yt) ? start.x : xr, yt);
                }
                else if (equalWithEpsilon(end.x, xr) && greaterThanWithEpsilon(end.y, yb)) {
                    edge.vertexB = new Point(xr, equalWithEpsilon(start.x, xr) ? start.y : yb);
                }
                else if (equalWithEpsilon(end.y, yb) && greaterThanWithEpsilon(end.x, xl)) {
                    edge.vertexB = new Point(equalWithEpsilon(start.y, yb) ? start.x : xl, yb);
                }
                edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
            }
            return true;
        });
        this.sites = this.cells.map(cell => cell.site);
        this._finished = true;
    }
}
let diagram;
let beachline;
let circleEvents;
let beachSectionJunkyard = [];
let circleEventJunkyard = [];
let firstCircleEvent;
function reset() {
    if (!beachline)
        beachline = new RBTree();
    if (beachline.root) {
        let beachSection = RBTree.getFirst(beachline.root);
        while (beachSection) {
            beachSectionJunkyard.push(beachSection);
            beachSection = beachSection.rbNext;
        }
    }
    beachline.root = null;
    if (!circleEvents)
        circleEvents = new RBTree();
    circleEvents.root = firstCircleEvent = null;
    diagram = new Diagram();
}
function createEdge(left, right, vertexA, vertexB) {
    const edge = new Edge(left, right);
    diagram.edges.push(edge);
    if (vertexA)
        setEdgeStart(edge, left, right, vertexA);
    if (vertexB)
        setEdgeEnd(edge, left, right, vertexB);
    left.cell.edges.push(new CellEdge(left, edge, right));
    right.cell.edges.push(new CellEdge(right, edge, left));
    return edge;
}
function createBeachSection(site) {
    let beachSection = beachSectionJunkyard.pop();
    if (!beachSection)
        beachSection = new BeachSection();
    beachSection.site = site;
    return beachSection;
}
function leftBreakPoint(arc, directrix) {
    const { x: rfocx, y: rfocy } = arc.site;
    const pby2 = rfocy - directrix;
    if (!pby2)
        return rfocx;
    if (!arc.rbPrevious)
        return Number.NEGATIVE_INFINITY;
    const { x: lfocx, y: lfocy } = arc.rbPrevious.site;
    const plby2 = lfocy - directrix;
    if (!plby2)
        return lfocx;
    const aby2 = 1 / pby2 - 1 / plby2;
    if (aby2) {
        const hl = lfocx - rfocx;
        const b = hl / plby2;
        const disc = b * b - 2 * aby2 * ((hl * hl) / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2);
        return (-b + Math.sqrt(disc)) / aby2 + rfocx;
    }
    return (rfocx + lfocx) / 2;
}
function rightBreakPoint(arc, directrix) {
    if (arc.rbNext)
        return leftBreakPoint(arc.rbNext, directrix);
    return arc.site.y === directrix ? arc.site.x : Infinity;
}
function detachBeachSection(beachSection) {
    detachCircleEvent(beachSection);
    beachline.removeNode(beachSection);
    beachSectionJunkyard.push(beachSection);
}
function removeBeachSection(beachSection) {
    const { x, ycenter: y } = beachSection.circleEvent;
    const vertex = new Point(x, y);
    const disappearingTransitions = [beachSection];
    let previous = beachSection.rbPrevious;
    let next = beachSection.rbNext;
    detachBeachSection(beachSection);
    let lArc = previous;
    while (lArc.circleEvent && equalWithEpsilon(x, lArc.circleEvent.x) && equalWithEpsilon(y, lArc.circleEvent.ycenter)) {
        previous = lArc.rbPrevious;
        disappearingTransitions.unshift(lArc);
        detachBeachSection(lArc);
        lArc = previous;
    }
    disappearingTransitions.unshift(lArc);
    detachCircleEvent(lArc);
    let rArc = next;
    while (rArc.circleEvent && equalWithEpsilon(x, rArc.circleEvent.x) && equalWithEpsilon(y, rArc.circleEvent.ycenter)) {
        next = rArc.rbNext;
        disappearingTransitions.push(rArc);
        detachBeachSection(rArc);
        rArc = next;
    }
    disappearingTransitions.push(rArc);
    detachCircleEvent(rArc);
    let nArcs = disappearingTransitions.length, iArc;
    for (iArc = 1; iArc < nArcs; iArc++) {
        rArc = disappearingTransitions[iArc];
        lArc = disappearingTransitions[iArc - 1];
        setEdgeStart(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearingTransitions[0];
    rArc = disappearingTransitions[nArcs - 1];
    rArc.edge = createEdge(lArc.site, rArc.site, undefined, vertex);
    attachCircleEvent(lArc);
    attachCircleEvent(rArc);
}
function addBeachSection(site) {
    const { x, y: directrix } = site;
    let leftArc;
    let rightArc;
    let node = beachline.root;
    while (node) {
        const dxl = leftBreakPoint(node, directrix) - x;
        if (dxl > EPSILON) {
            node = node.rbLeft;
        }
        else {
            const dxr = x - rightBreakPoint(node, directrix);
            if (dxr > EPSILON) {
                if (!node.rbRight) {
                    leftArc = node;
                    break;
                }
                node = node.rbRight;
            }
            else {
                if (dxl > -EPSILON) {
                    leftArc = node.rbPrevious;
                    rightArc = node;
                }
                else if (dxr > -EPSILON) {
                    leftArc = node;
                    rightArc = node.rbNext;
                }
                else
                    leftArc = rightArc = node;
                break;
            }
        }
    }
    const newArc = createBeachSection(site);
    beachline.insertSuccessor(leftArc, newArc);
    if (!leftArc && !rightArc)
        return;
    if (leftArc === rightArc) {
        detachCircleEvent(leftArc);
        rightArc = createBeachSection(leftArc.site);
        beachline.insertSuccessor(newArc, rightArc);
        newArc.edge = rightArc.edge = createEdge(leftArc.site, newArc.site);
        attachCircleEvent(leftArc);
        attachCircleEvent(rightArc);
        return;
    }
    if (leftArc && !rightArc) {
        newArc.edge = createEdge(leftArc.site, newArc.site);
        return;
    }
    if (leftArc !== rightArc) {
        detachCircleEvent(leftArc);
        detachCircleEvent(rightArc);
        const a = { x: leftArc.site.x, y: leftArc.site.y };
        const b = { x: site.x - a.x, y: site.y - a.y };
        const c = { x: rightArc.site.x - a.x, y: rightArc.site.y - a.y };
        const d = 2 * (b.x * c.y - b.y * c.x);
        const bh = b.x * b.x + b.y * b.y;
        const ch = c.x * c.x + c.y * c.y;
        const vertex = new Point((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y);
        setEdgeStart(rightArc.edge, leftArc.site, rightArc.site, vertex);
        newArc.edge = createEdge(leftArc.site, site, undefined, vertex);
        rightArc.edge = createEdge(site, rightArc.site, undefined, vertex);
        attachCircleEvent(leftArc);
        attachCircleEvent(rightArc);
    }
}
function attachCircleEvent(arc) {
    if (!arc.rbPrevious || !arc.rbNext)
        return;
    const left = arc.rbPrevious.site;
    const center = arc.site;
    const right = arc.rbNext.site;
    if (left === right)
        return;
    const bx = center.x;
    const by = center.y;
    const ax = left.x - bx;
    const ay = left.y - by;
    const cx = right.x - bx;
    const cy = right.y - by;
    const d = 2 * (ax * cy - ay * cx);
    if (d >= -2e-12)
        return;
    const ha = ax * ax + ay * ay;
    const hc = cx * cx + cy * cy;
    const x = (cy * ha - ay * hc) / d;
    const y = (ax * hc - cx * ha) / d;
    const ycenter = y + by;
    let circleEvent = circleEventJunkyard.pop();
    if (!circleEvent)
        circleEvent = new CircleEvent();
    circleEvent.arc = arc;
    circleEvent.site = center;
    circleEvent.x = x + bx;
    circleEvent.y = ycenter + Math.sqrt(x * x + y * y);
    circleEvent.ycenter = ycenter;
    arc.circleEvent = circleEvent;
    let predecessor = null;
    let node = circleEvents.root;
    while (node) {
        if (comparePoints(circleEvent, node) > 0) {
            if (node.rbLeft)
                node = node.rbLeft;
            else {
                predecessor = node.rbPrevious;
                break;
            }
        }
        else {
            if (node.rbRight)
                node = node.rbRight;
            else {
                predecessor = node;
                break;
            }
        }
    }
    circleEvents.insertSuccessor(predecessor, circleEvent);
    if (!predecessor)
        firstCircleEvent = circleEvent;
}
function detachCircleEvent(arc) {
    const circle = arc.circleEvent;
    if (!circle)
        return;
    if (!circle.rbPrevious)
        firstCircleEvent = circle.rbNext;
    circleEvents.removeNode(circle);
    circleEventJunkyard.push(circle);
    arc.circleEvent = null;
}
export default function compute(sites) {
    if (!sites || sites.length < 1)
        throw Error('no sites provided');
    const startTime = new Date();
    reset();
    const siteEvents = Array.from(sites).sort(comparePoints);
    let site = siteEvents.pop();
    let circle;
    const lastSite = {
        x: Number.NEGATIVE_INFINITY,
        y: Number.NEGATIVE_INFINITY,
    };
    while (site || circle) {
        circle = firstCircleEvent;
        if (site && (!circle || comparePoints(site, circle) > 0)) {
            if (!Point.equal(site, lastSite)) {
                site.cell = new Cell(site);
                diagram.cells.push(site.cell);
                addBeachSection(site);
                lastSite.y = site.y;
                lastSite.x = site.x;
            }
            site = siteEvents.pop();
        }
        else if (circle) {
            removeBeachSection(circle.arc);
        }
    }
    diagram.execTime = Date.now() - startTime.getTime();
    const result = diagram;
    reset();
    return result;
}
//# sourceMappingURL=Voronoi.js.map