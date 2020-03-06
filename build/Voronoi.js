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
import AABB from './util/AABB.js';
class VoronoiGenerator {
    compute(sites, diagram) {
        if (!sites || sites.length < 1)
            throw Error('no sites provided');
        const startTime = new Date();
        this.beachline = new RBTree();
        this.circleEvents = new RBTree();
        this.diagram = diagram;
        const siteEvents = Array.from(sites).sort(Point.compare);
        let site = siteEvents.pop();
        let circle;
        const lastSite = {
            x: Number.NEGATIVE_INFINITY,
            y: Number.NEGATIVE_INFINITY,
        };
        while (site || circle) {
            circle = this.firstCircleEvent;
            if (site && (!circle || Point.compare(site, circle) > 0)) {
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
        const vertex = createVertex(x, y, this.diagram);
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
            const vertex = createVertex((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y, this.diagram);
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
            if (Point.compare(circleEvent, node) > 0) {
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
function pointsEqualWithEpsilon(a, b) {
    return equalWithEpsilon(a.x, b.x) && equalWithEpsilon(a.y, b.y);
}
class BeachSection {
}
export class Vertex extends Point {
    constructor(x, y) {
        super(x, y);
        this.edges = new Set();
        this.cells = [];
    }
    get neighbors() {
        const neighbors = [];
        for (const edge of this.edges) {
            if (this === edge.start)
                neighbors.push(edge.end);
            else
                neighbors.push(edge.start);
        }
        return neighbors;
    }
}
function createVertex(x, y, diagram, edge) {
    const vertex = new Vertex(x, y);
    diagram.vertices.push(vertex);
    if (edge)
        addVertex(vertex, edge);
    return vertex;
}
function addVertex(vertex, edge) {
    vertex.edges.add(edge);
    if (edge.left)
        edge.left.cell.vertices.push(vertex);
    if (edge.right)
        edge.right.cell.vertices.push(vertex);
}
function removeVertex(vertex, edge) {
    if (!vertex)
        return;
    vertex.edges.delete(edge);
}
export class Edge extends LineSegment {
    constructor(left, right, start, end) {
        super(start, end);
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
    addVertex(vertex, edge);
}
function setEdgeEnd(edge, left, right, vertex) {
    setEdgeStart(edge, right, left, vertex);
}
function connectEdgeToBounds(diagram, edge, aabb) {
    if (edge.end)
        return true;
    const { min, max } = aabb;
    const { left, right } = edge;
    const midpoint = Point.midpoint(left, right);
    if (equalWithEpsilon(right.y, left.y)) {
        if (midpoint.x < min.x || midpoint.x >= max.x)
            return false;
        if (left.x > right.x) {
            if (!edge.start)
                edge.start = createVertex(midpoint.x, min.y, diagram, edge);
            else if (edge.start.y >= max.y)
                return false;
            edge.end = createVertex(midpoint.x, max.y, diagram, edge);
        }
        else {
            if (!edge.start)
                edge.start = createVertex(midpoint.x, max.y, diagram, edge);
            else if (edge.start.y < min.y)
                return false;
            edge.end = createVertex(midpoint.x, min.y, diagram, edge);
        }
    }
    else {
        const slope = (left.x - right.x) / (right.y - left.y);
        const intercept = midpoint.y - slope * midpoint.x;
        if (slope < -1 || slope > 1) {
            if (left.x > right.x) {
                if (!edge.start)
                    edge.start = createVertex((min.y - intercept) / slope, min.y, diagram, edge);
                else if (edge.start.y >= max.y)
                    return false;
                edge.end = createVertex((max.y - intercept) / slope, max.y, diagram, edge);
            }
            else {
                if (!edge.start)
                    edge.start = createVertex((max.y - intercept) / slope, max.y, diagram, edge);
                else if (edge.start.y < min.y)
                    return false;
                edge.end = createVertex((min.y - intercept) / slope, min.y, diagram, edge);
            }
        }
        else {
            if (left.y < right.y) {
                if (!edge.start)
                    edge.start = createVertex(min.x, slope * min.x + intercept, diagram, edge);
                else if (edge.start.x >= max.x)
                    return false;
                edge.end = createVertex(max.x, slope * max.x + intercept, diagram, edge);
            }
            else {
                if (!edge.start)
                    edge.start = createVertex(max.x, slope * max.x + intercept, diagram, edge);
                else if (edge.start.x < min.x)
                    return false;
                edge.end = createVertex(min.x, slope * min.x + intercept, diagram, edge);
            }
        }
    }
    return true;
}
function clipEdgeToBounds(diagram, edge, aabb) {
    const { min, max } = aabb;
    const delta = Point.subtract(edge.end, edge.start);
    let t0 = 0;
    let t1 = 1;
    function edgeIsInBounds(delta, relativeWallPosition) {
        if (delta === 0 && relativeWallPosition < 0)
            return false;
        const r = relativeWallPosition / delta;
        if (delta > 0) {
            if (r < t0) {
                return false;
            }
            else if (r < t1)
                t1 = r;
        }
        else if (delta < 0) {
            if (r > t1)
                return false;
            else if (r > t0)
                t0 = r;
        }
        return true;
    }
    if (!edgeIsInBounds(-delta.x, -(min.x - edge.start.x)))
        return false;
    if (!edgeIsInBounds(delta.x, max.x - edge.start.x))
        return false;
    if (!edgeIsInBounds(-delta.y, -(min.y - edge.start.y)))
        return false;
    if (!edgeIsInBounds(delta.y, max.y - edge.start.y))
        return false;
    if (t0 > 0) {
        removeVertex(edge.start, edge);
        edge.start = createVertex(edge.start.x + t0 * delta.x, edge.start.y + t0 * delta.y, diagram, edge);
    }
    if (t1 < 1) {
        removeVertex(edge.end, edge);
        edge.end = createVertex(edge.start.x + t1 * delta.x, edge.start.y + t1 * delta.y, diagram, edge);
    }
    return true;
}
function shouldKeepEdge(diagram, edge, aabb) {
    if (!connectEdgeToBounds(diagram, edge, aabb))
        return false;
    if (!clipEdgeToBounds(diagram, edge, aabb))
        return false;
    if (pointsEqualWithEpsilon(edge.start, edge.end))
        return false;
    return true;
}
function clipEdge(diagram, edge, aabb) {
    if (shouldKeepEdge(diagram, edge, aabb)) {
        return true;
    }
    else {
        removeVertex(edge.start, edge);
        removeVertex(edge.end, edge);
        edge.start = undefined;
        edge.end = undefined;
        return false;
    }
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
    get length() {
        return this.sharedEdge.length;
    }
    get start() {
        return this.sharedEdge.left === this.site ? this.sharedEdge.start : this.sharedEdge.end;
    }
    get end() {
        return this.sharedEdge.left === this.site ? this.sharedEdge.end : this.sharedEdge.start;
    }
}
function compareCellEdges(a, b) {
    return b.angle - a.angle;
}
export class Cell {
    constructor(site) {
        this.site = site;
        this.edges = [];
        this.vertices = [];
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
    get neighbors() {
        return this.edges
            .map(edge => {
            if (edge.sharedEdge.left === this.site && edge.sharedEdge.right)
                return edge.sharedEdge.right.cell;
            else if (edge.sharedEdge.left)
                return edge.sharedEdge.left.cell;
        })
            .filter(neighbor => neighbor);
    }
    get boundingAABB() {
        const aabb = new AABB(new Point(Infinity, Infinity), new Point(Infinity, Infinity));
        this.edges.forEach(edge => {
            const start = edge.start;
            if (start.x < aabb.min.x)
                aabb.min.x = start.x;
            else if (start.x > aabb.max.x)
                aabb.max.x = start.x;
            if (start.y < aabb.min.y)
                aabb.min.y = start.y;
            else if (start.y > aabb.max.y)
                aabb.max.y = start.y;
        });
        return aabb;
    }
    contains(point) {
        for (let i = 0; i < this.edges.length; ++i) {
            const edge = this.edges[i];
            const start = edge.start;
            const end = edge.end;
            const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
            if (cross >= 0)
                return false;
        }
        return true;
    }
}
function closeCell(diagram, cell, aabb) {
    const { min, max } = aabb;
    let edge;
    for (let i = 0; i < cell.edges.length; ++i) {
        let end = cell.edges[i].end;
        let start = cell.edges[(i + 1) % cell.edges.length].start;
        if (pointsEqualWithEpsilon(end, start))
            continue;
        diagram.edges.push((edge = new Edge(cell.site, null, end)));
        if (equalWithEpsilon(end.x, min.x) && lessThanWithEpsilon(end.y, max.y)) {
            edge.end = createVertex(min.x, equalWithEpsilon(start.x, min.x) ? start.y : max.y, diagram, edge);
        }
        else if (equalWithEpsilon(end.y, max.y) && lessThanWithEpsilon(end.x, max.x)) {
            edge.end = createVertex(equalWithEpsilon(start.y, max.y) ? start.x : max.x, max.y, diagram, edge);
        }
        else if (equalWithEpsilon(end.x, max.x) && greaterThanWithEpsilon(end.y, min.y)) {
            edge.end = createVertex(max.x, equalWithEpsilon(start.x, max.x) ? start.y : min.y, diagram, edge);
        }
        else if (equalWithEpsilon(end.y, min.y) && greaterThanWithEpsilon(end.x, min.x)) {
            edge.end = createVertex(equalWithEpsilon(start.y, min.y) ? start.x : min.x, min.y, diagram, edge);
        }
        else
            return false;
        cell.edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
    }
    return true;
}
export default class Diagram {
    constructor(sites) {
        this.sites = [];
        this.vertices = [];
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
    finish(aabb) {
        aabb = AABB.clone(aabb);
        this.edges = this.edges.filter(edge => clipEdge(this, edge, aabb));
        this.cells = this.cells.filter(cell => {
            cell.edges = cell.edges.filter(edge => edge.start && edge.end && clipEdge(this, edge.sharedEdge, aabb));
            cell.edges.sort(compareCellEdges);
            if (cell.edges.length && closeCell(this, cell, aabb)) {
                cell.vertices = cell.vertices.filter(vertex => vertex.edges.size);
                cell.vertices.forEach(vertex => vertex.cells.push(cell));
                return true;
            }
            else
                return false;
        });
        this.sites = this.cells.map(cell => cell.site);
        this.vertices = this.vertices.filter(vertex => vertex.edges.size);
        this._finished = true;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVm9yb25vaS5qcyIsInNvdXJjZVJvb3QiOiIuL3NyYy8iLCJzb3VyY2VzIjpbIlZvcm9ub2kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEySUU7QUFFRixPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0csT0FBTyxFQUFFLE1BQU0sRUFBYyxNQUFNLGtCQUFrQixDQUFDO0FBRXRELE9BQU8sS0FBSyxNQUFNLGlCQUFpQixDQUFDO0FBQ3BDLE9BQU8sV0FBVyxNQUFNLHVCQUF1QixDQUFDO0FBQ2hELE9BQU8sUUFBUSxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sSUFBSSxNQUFNLGdCQUFnQixDQUFDO0FBRWxDLE1BQU0sZ0JBQWdCO0lBVXBCLE9BQU8sQ0FBQyxLQUFjLEVBQUUsT0FBZ0I7UUFDdEMsSUFBSSxDQUFDLEtBQUssSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUM7WUFBRSxNQUFNLEtBQUssQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRWpFLE1BQU0sU0FBUyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFHN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sRUFBRSxDQUFDO1FBQzlCLElBQUksQ0FBQyxZQUFZLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUNqQyxJQUFJLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQztRQUd2QixNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENB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