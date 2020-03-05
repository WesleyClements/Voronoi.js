/*!
Author: Raymond Hill (rhill@raymondhill.net)
File: rhill-voronoi-core.js
Version: 0.96
Date: May 26, 2011
Description: This is my personal Javascript implementation of
Steven Fortune's algorithm to compute Voronoi diagrams.

Copyright (C) 2010,2011 Raymond Hill
https://github.com/gorhill/Javascript-Voronoi

Licensed under The MIT License
http://en.wikipedia.org/wiki/MIT_License

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*****

Portions of this software use, depend, or was inspired by the work of:

  "Fortune's algorithm" by Steven J. Fortune: For his clever
  algorithm to compute Voronoi diagrams.
  http://ect.bell-labs.com/who/sjf/

  "The Liang-Barsky line clipping algorithm in a nutshell!" by Daniel White,
  to efficiently clip a line within a rectangle.
  http://www.skytopia.com/project/articles/compsci/clipping.html

  "rbtree" by Franck Bui-Huu
  https://github.com/fbuihuu/libtree/blob/master/rb.c
  I ported to Javascript the C code of a Red-Black tree implementation by
  Franck Bui-Huu, and further altered the code for Javascript efficiency
  and to very specifically fit the purpose of holding the beachline (the key
  is a variable range rather than an unmutable data point), and unused
  code paths have been removed. Each node in the tree is actually a beach
  section on the beachline. Using a tree structure for the beachline remove
  the need to lookup the beach section in the array at removal time, as
  now a circle event can safely hold a reference to its associated
  beach section (thus findDeletionPoint() is no longer needed). This
  finally take care of nagging finite arithmetic precision issues arising
  at lookup time, such that epsilon could be brought down to 1e-9 (from 1e-4).
  rhill 2011-05-27: added a 'previous' and 'next' members which keeps track
  of previous and next nodes, and remove the need for Beachsection.getPrevious()
  and Beachsection.getNext().

*****

History:

0.96 (26 May 2011):
  Returned diagram.cells is now an array, whereas the index of a cell
  matches the index of its associated site in the array of sites passed
  to Voronoi.compute(). This allowed some gain in performance. The
  'voronoiId' member is still used internally by the Voronoi object.
  The Voronoi.Cells object is no longer necessary and has been removed.

0.95 (19 May 2011):
  No longer using Javascript array to keep track of the beach sections of
  the beachline, now using Red-Black tree.

  The move to a binary tree was unavoidable, as I ran into finite precision
  arithmetic problems when I started to use sites with fractional values.
  The problem arose when the code had to find the arc associated with a
  triggered Fortune circle event: the collapsing arc was not always properly
  found due to finite precision arithmetic-related errors. Using a tree structure
  eliminate the need to look-up a beachsection in the array structure
  (findDeletionPoint()), and allowed to bring back epsilon down to 1e-9.

0.91(21 September 2010):
  Lower epsilon from 1e-5 to 1e-4, to fix problem reported at
  http://www.raymondhill.net/blog/?p=9#comment-1414

0.90 (21 September 2010):
  First version.

*****

Usage:

  var sites = [{x:300,y:300}, {x:100,y:100}, {x:200,y:500}, {x:250,y:450}, {x:600,y:150}];
  // xl, xr means x left, x right
  // yt, yb means y top, y bottom
  var bbox = {xl:0, xr:800, yt:0, yb:600};
  var voronoi = new Voronoi();
  // pass an object which exhibits xl, xr, yt, yb properties. The bounding
  // box will be used to connect unbound edges, and to close open cells
  result = voronoi.compute(sites, bbox);
  // render, further analyze, etc.

Return value:
  An object with the following properties:

  result.edges = an array of unordered, unique Voronoi.Edge objects making up the Voronoi diagram.
  result.cells = an array of Voronoi.Cell object making up the Voronoi diagram. A Cell object
    might have an empty array of halfedges, meaning no Voronoi cell could be computed for a
    particular cell.
  result.execTime = the time it took to compute the Voronoi diagram, in milliseconds.

Voronoi.Edge object:
  left: the Voronoi site object at the left of this Voronoi.Edge object.
  right: the Voronoi site object at the right of this Voronoi.Edge object (can be null).
  vertexA: an object with an 'x' and a 'y' property defining the start point
    (relative to the Voronoi site on the left) of this Voronoi.Edge object.
  vertexB: an object with an 'x' and a 'y' property defining the end point
    (relative to Voronoi site on the left) of this Voronoi.Edge object.

  For edges which are used to close open cells (using the supplied bounding box), the
  rSite property will be null.

Voronoi.Cell object:
  site: the Voronoi site object associated with the Voronoi cell.
  halfedges: an array of Voronoi.Halfedge objects, ordered counterclockwise, defining the
    polygon for this Voronoi cell.

Voronoi.Halfedge object:
  site: the Voronoi site object owning this Voronoi.Halfedge object.
  edge: a reference to the unique Voronoi.Edge object underlying this Voronoi.Halfedge object.
  getStartpoint(): a method returning an object with an 'x' and a 'y' property for
    the start point of this halfedge. Keep in mind halfedges are always countercockwise.
  getEndpoint(): a method returning an object with an 'x' and a 'y' property for
    the end point of this halfedge. Keep in mind halfedges are always countercockwise.

TODO: Identify opportunities for performance improvement.\
*/
import { EPSILON, equalWithEpsilon, lessThanWithEpsilon, greaterThanWithEpsilon } from './util/FloatUtil.js';
import { RBTree } from './util/RBTree.js';
import Point from './util/Point.js';
import LineSegment from './util/LineSegment.js';
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
class Edge extends LineSegment {
    constructor(left, right) {
        super(null, null);
        this.left = left;
        this.right = right;
    }
}
function setEdgeStart(edge, left, right, vertex) {
    if (edge.start || edge.end) {
        if (edge.left === right)
            edge.end = vertex;
        else
            edge.start = vertex;
    }
    else {
        edge.start = vertex;
        edge.left = left;
        edge.right = right;
    }
}
function setEdgeEnd(edge, left, right, vertex) {
    setEdgeStart(edge, right, left, vertex);
}
function connectEdgeToBounds(edge, bbox) {
    if (edge.end)
        return true;
    const { xl, xr, yb, yt } = bbox;
    const { left, right } = edge;
    const avg = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };
    if (right.y === left.y) {
        if (avg.x < xl || avg.x >= xr)
            return false;
        if (left.x > right.x) {
            if (!edge.start)
                edge.start = new Point(avg.x, yb);
            else if (edge.start.y >= yt)
                return false;
            edge.end = new Point(avg.x, yt);
        }
        else {
            if (!edge.start)
                edge.start = new Point(avg.x, yt);
            else if (edge.start.y < yb)
                return false;
            edge.end = new Point(avg.x, yb);
        }
    }
    else {
        const fm = (left.x - right.x) / (right.y - left.y);
        const fb = avg.y - fm * avg.x;
        if (fm < -1 || fm > 1) {
            if (left.x > right.x) {
                if (!edge.start)
                    edge.start = new Point((yb - fb) / fm, yb);
                else if (edge.start.y >= yt)
                    return false;
                edge.end = new Point((yt - fb) / fm, yt);
            }
            else {
                if (!edge.start)
                    edge.start = new Point((yt - fb) / fm, yt);
                else if (edge.start.y < yb)
                    return false;
                edge.end = new Point((yb - fb) / fm, yb);
            }
        }
        else {
            if (left.y < right.y) {
                if (!edge.start)
                    edge.start = new Point(xl, fm * xl + fb);
                else if (edge.start.x >= xr)
                    return false;
                edge.end = new Point(xr, fm * xr + fb);
            }
            else {
                if (!edge.start)
                    edge.start = new Point(xr, fm * xr + fb);
                else if (edge.start.x < xl)
                    return false;
                edge.end = new Point(xl, fm * xl + fb);
            }
        }
    }
    return true;
}
function clipEdgeToBounds(edge, bbox) {
    const { xl, xr, yb, yt } = bbox;
    const { start: { x: ax, y: ay }, end: { x: bx, y: by }, } = edge;
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
        edge.start = new Point(ax + t0 * delta.x, ay + t0 * delta.y);
    if (t1 < 1)
        edge.end = new Point(ax + t1 * delta.x, ay + t1 * delta.y);
    return true;
}
class CellEdge {
    constructor(site, sharedEdge, other) {
        this.site = site;
        this.sharedEdge = sharedEdge;
        if (other)
            this.angle = Math.atan2(other.y - site.y, other.x - site.x);
        else {
            const start = this.start;
            const end = this.end;
            this.angle = Math.atan2(end.x - start.x, start.y - end.y);
        }
    }
    get start() {
        if (this.sharedEdge.left === this.site)
            return this.sharedEdge.start;
        else
            return this.sharedEdge.end;
    }
    get end() {
        if (this.sharedEdge.left === this.site)
            return this.sharedEdge.end;
        else
            return this.sharedEdge.start;
    }
    get length() {
        return this.sharedEdge.length;
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
        return this.edges.map(edge => new Triangle(this.site, edge.start, edge.end));
    }
    get perimeter() {
        return this.edges.reduce((area, edge) => {
            return area + edge.length;
        }, 0);
    }
    get area() {
        return this.triangles.reduce((area, tri) => {
            return area + tri.area;
        }, 0);
    }
    get centroid() {
        const centroid = new Point(0, 0);
        this.triangles.forEach(tri => {
            let circum = tri.circumcenter;
            if (!circum)
                return;
            centroid.x += circum.x * tri.area;
            centroid.y += circum.y * tri.area;
        });
        centroid.x /= this.area;
        centroid.y /= this.area;
        return centroid;
    }
}
class VoronoiGenerator {
    compute(sites, diagram) {
        if (!sites || sites.length < 1)
            throw Error('no sites provided');
        const startTime = new Date();
        this.beachline = new RBTree();
        this.circleEvents = new RBTree();
        this.diagram = diagram;
        const siteEvents = Array.from(sites).sort(comparePoints);
        let site = siteEvents.pop();
        let circle;
        const lastSite = {
            x: Number.NEGATIVE_INFINITY,
            y: Number.NEGATIVE_INFINITY,
        };
        while (site || circle) {
            circle = this.firstCircleEvent;
            if (site && (!circle || comparePoints(site, circle) > 0)) {
                if (!Point.equal(site, lastSite)) {
                    this.diagram.sites.push(site);
                    site.cell = new Cell(site);
                    this.diagram.cells.push(site.cell);
                    this.addBeachSection(site);
                    lastSite.y = site.y;
                    lastSite.x = site.x;
                }
                site = siteEvents.pop();
            }
            else if (circle) {
                this.removeBeachSection(circle.arc);
            }
        }
        diagram.execTime = Date.now() - startTime.getTime();
    }
    createEdge(left, right, vertexA, vertexB) {
        const edge = new Edge(left, right);
        this.diagram.edges.push(edge);
        if (vertexA)
            setEdgeStart(edge, left, right, vertexA);
        if (vertexB)
            setEdgeEnd(edge, left, right, vertexB);
        left.cell.edges.push(new CellEdge(left, edge, right));
        right.cell.edges.push(new CellEdge(right, edge, left));
        return edge;
    }
    createBeachSection(site) {
        let beachSection = new BeachSection();
        beachSection.site = site;
        return beachSection;
    }
    leftBreakPoint(arc, directrix) {
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
    rightBreakPoint(arc, directrix) {
        if (arc.rbNext)
            return this.leftBreakPoint(arc.rbNext, directrix);
        return arc.site.y === directrix ? arc.site.x : Infinity;
    }
    detachBeachSection(beachSection) {
        this.detachCircleEvent(beachSection);
        this.beachline.removeNode(beachSection);
    }
    removeBeachSection(beachSection) {
        const { x, ycenter: y } = beachSection.circleEvent;
        const vertex = new Point(x, y);
        const disappearingTransitions = [beachSection];
        let previous = beachSection.rbPrevious;
        let next = beachSection.rbNext;
        this.detachBeachSection(beachSection);
        let lArc = previous;
        while (lArc.circleEvent &&
            equalWithEpsilon(x, lArc.circleEvent.x) &&
            equalWithEpsilon(y, lArc.circleEvent.ycenter)) {
            previous = lArc.rbPrevious;
            disappearingTransitions.unshift(lArc);
            this.detachBeachSection(lArc);
            lArc = previous;
        }
        disappearingTransitions.unshift(lArc);
        this.detachCircleEvent(lArc);
        let rArc = next;
        while (rArc.circleEvent &&
            equalWithEpsilon(x, rArc.circleEvent.x) &&
            equalWithEpsilon(y, rArc.circleEvent.ycenter)) {
            next = rArc.rbNext;
            disappearingTransitions.push(rArc);
            this.detachBeachSection(rArc);
            rArc = next;
        }
        disappearingTransitions.push(rArc);
        this.detachCircleEvent(rArc);
        let nArcs = disappearingTransitions.length, iArc;
        for (iArc = 1; iArc < nArcs; iArc++) {
            rArc = disappearingTransitions[iArc];
            lArc = disappearingTransitions[iArc - 1];
            setEdgeStart(rArc.edge, lArc.site, rArc.site, vertex);
        }
        lArc = disappearingTransitions[0];
        rArc = disappearingTransitions[nArcs - 1];
        rArc.edge = this.createEdge(lArc.site, rArc.site, undefined, vertex);
        this.attachCircleEvent(lArc);
        this.attachCircleEvent(rArc);
    }
    addBeachSection(site) {
        const { x, y: directrix } = site;
        let leftArc;
        let rightArc;
        let node = this.beachline.root;
        while (node) {
            const dxl = this.leftBreakPoint(node, directrix) - x;
            if (dxl > EPSILON) {
                node = node.rbLeft;
            }
            else {
                const dxr = x - this.rightBreakPoint(node, directrix);
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
        const newArc = this.createBeachSection(site);
        this.beachline.insertSuccessor(leftArc, newArc);
        if (!leftArc && !rightArc)
            return;
        if (leftArc === rightArc) {
            this.detachCircleEvent(leftArc);
            rightArc = this.createBeachSection(leftArc.site);
            this.beachline.insertSuccessor(newArc, rightArc);
            newArc.edge = rightArc.edge = this.createEdge(leftArc.site, newArc.site);
            this.attachCircleEvent(leftArc);
            this.attachCircleEvent(rightArc);
            return;
        }
        if (leftArc && !rightArc) {
            newArc.edge = this.createEdge(leftArc.site, newArc.site);
            return;
        }
        if (leftArc !== rightArc) {
            this.detachCircleEvent(leftArc);
            this.detachCircleEvent(rightArc);
            const a = { x: leftArc.site.x, y: leftArc.site.y };
            const b = { x: site.x - a.x, y: site.y - a.y };
            const c = { x: rightArc.site.x - a.x, y: rightArc.site.y - a.y };
            const d = 2 * (b.x * c.y - b.y * c.x);
            const bh = b.x * b.x + b.y * b.y;
            const ch = c.x * c.x + c.y * c.y;
            const vertex = new Point((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y);
            setEdgeStart(rightArc.edge, leftArc.site, rightArc.site, vertex);
            newArc.edge = this.createEdge(leftArc.site, site, undefined, vertex);
            rightArc.edge = this.createEdge(site, rightArc.site, undefined, vertex);
            this.attachCircleEvent(leftArc);
            this.attachCircleEvent(rightArc);
        }
    }
    attachCircleEvent(arc) {
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
        let circleEvent = {};
        circleEvent.arc = arc;
        circleEvent.site = center;
        circleEvent.x = x + bx;
        circleEvent.y = ycenter + Math.sqrt(x * x + y * y);
        circleEvent.ycenter = ycenter;
        arc.circleEvent = circleEvent;
        let predecessor = null;
        let node = this.circleEvents.root;
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
        this.circleEvents.insertSuccessor(predecessor, circleEvent);
        if (!predecessor)
            this.firstCircleEvent = circleEvent;
    }
    detachCircleEvent(arc) {
        const circle = arc.circleEvent;
        if (!circle)
            return;
        if (!circle.rbPrevious)
            this.firstCircleEvent = circle.rbNext;
        this.circleEvents.removeNode(circle);
        arc.circleEvent = null;
    }
}
export default class Diagram {
    constructor(sites) {
        this.sites = [];
        this.edges = [];
        this.cells = [];
        new VoronoiGenerator().compute(sites, this);
    }
    getRelaxedSites(t = 1) {
        if (!this._finished)
            return;
        return this.sites.map(site => {
            const newPoint = site.cell.centroid;
            const x = site.x * (1 - t) + newPoint.x * t;
            const y = site.y * (1 - t) + newPoint.y * t;
            return Object.assign(Object.assign({}, site), { x, y });
        });
    }
    finish(bbox) {
        const { xl, xr, yb, yt } = bbox;
        this.edges = this.edges.filter(edge => {
            if (connectEdgeToBounds(edge, bbox) && clipEdgeToBounds(edge, bbox))
                if (!pointsEqualWithEpsilon(edge.start, edge.end))
                    return true;
            delete edge.start;
            delete edge.end;
            return false;
        });
        this.cells = this.cells.filter(cell => {
            cell.edges = cell.edges.filter(he => he.sharedEdge.start || he.sharedEdge.end);
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
                edge.start = end;
                this.edges.push(edge);
                if (equalWithEpsilon(end.x, xl) && lessThanWithEpsilon(end.y, yt)) {
                    edge.end = new Point(xl, equalWithEpsilon(start.x, xl) ? start.y : yt);
                }
                else if (equalWithEpsilon(end.y, yt) && lessThanWithEpsilon(end.x, xr)) {
                    edge.end = new Point(equalWithEpsilon(start.y, yt) ? start.x : xr, yt);
                }
                else if (equalWithEpsilon(end.x, xr) && greaterThanWithEpsilon(end.y, yb)) {
                    edge.end = new Point(xr, equalWithEpsilon(start.x, xr) ? start.y : yb);
                }
                else if (equalWithEpsilon(end.y, yb) && greaterThanWithEpsilon(end.x, xl)) {
                    edge.end = new Point(equalWithEpsilon(start.y, yb) ? start.x : xl, yb);
                }
                edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
            }
            return true;
        });
        this.sites = this.cells.map(cell => cell.site);
        this._finished = true;
    }
}
//# sourceMappingURL=Voronoi.js.map