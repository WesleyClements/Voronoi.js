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
import Vector2 from './util/Vector2.js';
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
        const siteEvents = Array.from(sites).sort(Vector2.compareY);
        let site = siteEvents.pop();
        let circle;
        const lastSite = Vector2.infinity.negate();
        while (site || circle) {
            circle = this.firstCircleEvent;
            if (site && (!circle || Vector2.compareY(site, circle) > 0)) {
                if (!Vector2.equal(site, lastSite)) {
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
        this.diagram.edges.forEach(edge => {
            if (edge.a)
                edge.a.edges.add(edge);
            if (edge.b)
                edge.b.edges.add(edge);
        });
        this.diagram.cells.forEach(cell => {
            cell.edges.sort(compareCellEdges);
            cell.isClosed = true;
        });
        this.diagram.execTime = Date.now() - startTime.getTime();
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
        const vertex = new Vertex(x, y);
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
            const vertex = new Vertex((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y);
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
        let circleEvent = new CircleEvent(x + bx, ycenter + Math.sqrt(x * x + y * y));
        circleEvent.ycenter = ycenter;
        circleEvent.site = center;
        circleEvent.arc = arc;
        arc.circleEvent = circleEvent;
        let predecessor = null;
        let node = this.circleEvents.root;
        while (node) {
            if (Vector2.compareY(circleEvent, node) > 0) {
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
class BeachSection {
}
class CircleEvent extends Vector2 {
    constructor(x, y) {
        super(x, y);
    }
}
export class Vertex extends Vector2 {
    constructor(x, y) {
        super(x, y);
        this.edges = new Set();
    }
    get neighbors() {
        const neighbors = new Set();
        this.edges.forEach(edge => {
            if (edge.a)
                neighbors.add(edge.a);
            if (edge.b)
                neighbors.add(edge.b);
        });
        neighbors.delete(this);
        return [...neighbors];
    }
    get cells() {
        const cells = new Set();
        this.edges.forEach(edge => {
            if (edge.left)
                cells.add(edge.left.cell);
            if (edge.right)
                cells.add(edge.right.cell);
        });
        return [...cells];
    }
}
export class Edge extends LineSegment {
    constructor(left, right, start, end) {
        super(start, end);
        this.left = left;
        this.right = right;
    }
}
function setEdgeStart(edge, left, right, vertex) {
    if (edge.a || edge.b) {
        if (edge.left === right)
            edge.b = vertex;
        else
            edge.a = vertex;
    }
    else {
        edge.a = vertex;
        edge.left = left;
        edge.right = right;
    }
}
function setEdgeEnd(edge, left, right, vertex) {
    setEdgeStart(edge, right, left, vertex);
}
function connectEdgeToBounds(edge, aabb) {
    if (edge.b)
        return true;
    if (edge.left)
        edge.left.cell.isClosed = false;
    if (edge.right)
        edge.right.cell.isClosed = false;
    const { min, max } = aabb;
    const { left, right } = edge;
    const midpoint = Vector2.midpoint(left, right);
    if (equalWithEpsilon(right.y, left.y)) {
        if (midpoint.x < min.x || midpoint.x >= max.x)
            return false;
        if (left.x > right.x) {
            if (!edge.a)
                edge.a = new Vertex(midpoint.x, min.y);
            else if (edge.a.y >= max.y)
                return false;
            edge.b = new Vertex(midpoint.x, max.y);
        }
        else {
            if (!edge.a)
                edge.a = new Vertex(midpoint.x, max.y);
            else if (edge.a.y < min.y)
                return false;
            edge.b = new Vertex(midpoint.x, min.y);
        }
    }
    else {
        const slope = (left.x - right.x) / (right.y - left.y);
        const intercept = midpoint.y - slope * midpoint.x;
        if (slope < -1 || slope > 1) {
            if (left.x > right.x) {
                if (!edge.a)
                    edge.a = new Vertex((min.y - intercept) / slope, min.y);
                else if (edge.a.y >= max.y)
                    return false;
                edge.b = new Vertex((max.y - intercept) / slope, max.y);
            }
            else {
                if (!edge.a)
                    edge.a = new Vertex((max.y - intercept) / slope, max.y);
                else if (edge.a.y < min.y)
                    return false;
                edge.b = new Vertex((min.y - intercept) / slope, min.y);
            }
        }
        else {
            if (left.y < right.y) {
                if (!edge.a)
                    edge.a = new Vertex(min.x, slope * min.x + intercept);
                else if (edge.a.x >= max.x)
                    return false;
                edge.b = new Vertex(max.x, slope * max.x + intercept);
            }
            else {
                if (!edge.a)
                    edge.a = new Vertex(max.x, slope * max.x + intercept);
                else if (edge.a.x < min.x)
                    return false;
                edge.b = new Vertex(min.x, slope * min.x + intercept);
            }
        }
    }
    return true;
}
function clipEdgeToBounds(edge, aabb) {
    const { min, max } = aabb;
    const delta = Vector2.subtract(edge.b, edge.a);
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
    if (!edgeIsInBounds(-delta.x, -(min.x - edge.a.x)))
        return false;
    if (!edgeIsInBounds(delta.x, max.x - edge.a.x))
        return false;
    if (!edgeIsInBounds(-delta.y, -(min.y - edge.a.y)))
        return false;
    if (!edgeIsInBounds(delta.y, max.y - edge.a.y))
        return false;
    if (t0 > 0) {
        edge.a = new Vertex(edge.a.x + t0 * delta.x, edge.a.y + t0 * delta.y);
    }
    if (t1 < 1) {
        edge.b = new Vertex(edge.a.x + t1 * delta.x, edge.a.y + t1 * delta.y);
    }
    if (t0 > 0 || t1 < 1) {
        if (edge.left)
            edge.left.cell.isClosed = false;
        if (edge.right)
            edge.right.cell.isClosed = false;
    }
    return true;
}
function shouldKeepEdge(edge, aabb) {
    if (!connectEdgeToBounds(edge, aabb))
        return false;
    if (!clipEdgeToBounds(edge, aabb))
        return false;
    if (Vector2.equalApproximate(edge.a, edge.b))
        return false;
    return true;
}
function clipEdge(edge, aabb) {
    if (shouldKeepEdge(edge, aabb)) {
        return true;
    }
    else {
        if (edge.a)
            edge.a.edges.delete(edge);
        if (edge.b)
            edge.b.edges.delete(edge);
        edge.a = undefined;
        edge.b = undefined;
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
            const alongEdge = Vector2.subtract(this.end, this.start);
            this.angle = Math.atan2(alongEdge.x, -alongEdge.y);
        }
    }
    get length() {
        return this.sharedEdge.length;
    }
    get start() {
        return this.sharedEdge.left === this.site ? this.sharedEdge.a : this.sharedEdge.b;
    }
    get end() {
        return this.sharedEdge.left === this.site ? this.sharedEdge.b : this.sharedEdge.a;
    }
}
function compareCellEdges(a, b) {
    if (!a)
        return -1;
    if (!b)
        return 1;
    return b.angle - a.angle;
}
export class Cell {
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
        const centroid = this.triangles.reduce((sum, tri) => {
            const centroid = tri.centroid;
            const area = tri.area;
            sum.x += centroid.x * area;
            sum.y += centroid.y * area;
            return sum;
        }, new Vector2(0, 0));
        const totalArea = this.area;
        centroid.x /= totalArea;
        centroid.y /= totalArea;
        return centroid;
    }
    get vertices() {
        const vertices = new Set();
        this.edges.forEach(edge => {
            if (edge.start)
                vertices.add(edge.start);
            if (edge.end)
                vertices.add(edge.end);
        });
        return [...vertices];
    }
    get neighbors() {
        return this.edges
            .map(edge => {
            if (edge.sharedEdge.left === this.site && edge.sharedEdge.right)
                return edge.sharedEdge.right.cell;
            else if (edge.sharedEdge.left)
                return edge.sharedEdge.left.cell;
            return null;
        })
            .filter(neighbor => neighbor);
    }
    get boundingAABB() {
        return this.edges.reduce((aabb, edge) => {
            if (edge.start) {
                const start = edge.start;
                if (start.x < aabb.min.x)
                    aabb.min.x = start.x;
                else if (start.x > aabb.max.x)
                    aabb.max.x = start.x;
                if (start.y < aabb.min.y)
                    aabb.min.y = start.y;
                else if (start.y > aabb.max.y)
                    aabb.max.y = start.y;
            }
            return aabb;
        }, new AABB(Vector2.infinity, Vector2.infinity.negate()));
    }
    contains(point) {
        for (const edge of this.edges) {
            if (!edge.start || !edge.end)
                continue;
            const alongEdge = Vector2.subtract(edge.end, edge.start);
            const toPoint = Vector2.subtract(point, edge.start);
            if (Vector2.cross(alongEdge, toPoint) >= 0)
                return false;
        }
        return true;
    }
}
function closeCell(diagram, cell, aabb) {
    const { min, max } = aabb;
    for (let i = 0; i < cell.edges.length; ++i) {
        if (i > 20) {
            console.log('!!!');
            return false;
        }
        const { end } = cell.edges[i];
        const { start } = cell.edges[(i + 1) % cell.edges.length];
        if (Vector2.equalApproximate(end, start))
            continue;
        let newEnd;
        if (equalWithEpsilon(end.x, min.x) && lessThanWithEpsilon(end.y, max.y)) {
            newEnd = new Vertex(min.x, equalWithEpsilon(start.x, min.x) ? start.y : max.y);
        }
        else if (equalWithEpsilon(end.y, max.y) && lessThanWithEpsilon(end.x, max.x)) {
            newEnd = new Vertex(equalWithEpsilon(start.y, max.y) ? start.x : max.x, max.y);
        }
        else if (equalWithEpsilon(end.x, max.x) && greaterThanWithEpsilon(end.y, min.y)) {
            newEnd = new Vertex(max.x, equalWithEpsilon(start.x, max.x) ? start.y : min.y);
        }
        else if (equalWithEpsilon(end.y, min.y) && greaterThanWithEpsilon(end.x, min.x)) {
            newEnd = new Vertex(equalWithEpsilon(start.y, min.y) ? start.x : min.x, min.y);
        }
        else
            return false;
        const edge = new Edge(cell.site, null, end, newEnd);
        edge.a.edges.add(edge);
        edge.b.edges.add(edge);
        diagram.edges.push(edge);
        cell.edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
    }
    cell.isClosed = true;
    return true;
}
export default class Diagram {
    constructor(sites) {
        this.edges = [];
        this.cells = [];
        new VoronoiGenerator().compute(sites, this);
    }
    get sites() {
        return this.cells.map(cell => cell.site);
    }
    get vertices() {
        const vertices = new Set();
        this.edges.forEach(edge => {
            if (edge.a)
                vertices.add(edge.a);
            if (edge.b)
                vertices.add(edge.b);
        });
        return [...vertices];
    }
    getRelaxedSites(t = 1) {
        return this.cells.map(cell => {
            const newPoint = Vector2.lerp(cell.site, cell.centroid, t);
            return Object.assign(Object.assign({}, cell.site), { x: newPoint.x, y: newPoint.y });
        });
    }
    finish(aabb) {
        aabb = AABB.clone(aabb);
        this.edges = this.edges.filter(edge => clipEdge(edge, aabb));
        this.cells = this.cells.filter(cell => {
            cell.edges = cell.edges.filter(edge => edge.start && edge.end && clipEdge(edge.sharedEdge, aabb));
            if (!cell.edges.length)
                return false;
            if (!cell.isClosed) {
                cell.edges.sort(compareCellEdges);
                if (!closeCell(this, cell, aabb))
                    return false;
            }
            return true;
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVm9yb25vaS5qcyIsInNvdXJjZVJvb3QiOiIuL3NyYy8iLCJzb3VyY2VzIjpbIlZvcm9ub2kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEySUU7QUFFRixPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0csT0FBTyxFQUFFLE1BQU0sRUFBYyxNQUFNLGtCQUFrQixDQUFDO0FBRXRELE9BQU8sT0FBTyxNQUFNLG1CQUFtQixDQUFDO0FBQ3hDLE9BQU8sV0FBVyxNQUFNLHVCQUF1QixDQUFDO0FBQ2hELE9BQU8sUUFBUSxNQUFNLG9CQUFvQixDQUFDO0FBRTFDLE9BQU8sSUFBSSxNQUFNLGdCQUFnQixDQUFDO0FBRWxDLE1BQU0sZ0JBQWdCO0lBVXBCLE9BQU8sQ0FBQyxLQUFnQixFQUFFLE9BQWdCO1FBQ3hDLElBQUksQ0FBQyxLQUFLLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQUUsTUFBTSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUVqRSxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRzdCLElBQUksQ0FBQyxTQUFTLEdBQUcsSUFBSSxNQUFNLEVBQUUsQ0FBQztRQUM5QixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksTUFBTSxFQUFFLENBQUM7UUFDakMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFHdkIsTUFBTSxVQUFVLEdBQUcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxD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QUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7WUFDakUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBRXRDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUVqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFHNUYsWUFBWSxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1lBR2pFLE1BQU0sQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxTQUFTLEVBQUUsTUFBTSxDQUFDLENBQUM7WUFDckUsUUFBUSxDQUFDLElBQUksR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxNQUFNLENBQUMsQ0FBQztZQUl4RSxJQUFJLENBQUMsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDaEMsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsQ0FBQyxDQUFDO1NBQ2xDO0lBQ0gsQ0FBQztJQUlELGlCQUFpQixDQUFDLEdBQTRDO1FBQzVELElBQUksQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU07WUFBRSxPQUFPO1FBQzNDLE1BQU0sSUFBSSxHQUFHLEdBQUcsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO1FBQ2pDLE1BQU0sTUFBTSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDeEIsTUFBTSxLQUFLLEdBQUcsR0FBRyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUM7UUFJOUIsSUFBSSxJQUFJLEtBQUssS0FBSztZQUFFLE9BQU87UUFZM0IsTUFBTSxFQUFFLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQztRQUNwQixNQUFNLEVBQUUsR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDO1FBQ3BCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLElBQUksQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3ZCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLE1BQU0sRUFBRSxHQUFHLEtBQUssQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBUXhCLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxDQUFDO1FBQ2xDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSztZQUFFLE9BQU87UUFFeEIsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxDQUFDO1FBQzdCLE1BQU0sRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQztRQUM3QixNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxNQUFNLENBQUMsR0FBRyxDQUFDLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztRQUNsQyxNQUFNLE9BQU8sR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO1FBTXZCLElBQUksV0FBVyxHQUFnQixJQUFJLFdBQVcsQ0FBQyxDQUFDLEdBQUcsRUFBRSxFQUFFLE9BQU8sR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDM0YsV0FBVyxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDOUIsV0FBVyxDQUFDLElBQUksR0FBRyxNQUFNLENBQUM7UUFDMUIsV0FBVyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7UUFFdEIsR0FBRyxDQUFDLFdBQVcsR0FBRyxXQUFXLENBQUM7UUFJOUIsSUFBSSxXQUFXLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO1FBQ2xDLE9BQU8sSUFBSSxFQUFFO1lBQ1gsSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUU7Z0JBQzNDLElBQUksSUFBSSxDQUFDLE1BQU07b0JBQUUsSUFBSSxHQUFHLElBQUksQ0FBQyxNQUFNLENBQUM7cUJBQy9CO29CQUNILFdBQVcsR0FBRyxJQUFJLENBQUMsVUFBVSxDQUFDO29CQUM5QixNQUFNO2lCQUNQO2FBQ0Y7aUJBQU07Z0JBQ0wsSUFBSSxJQUFJLENBQUMsT0FBTztvQkFBRSxJQUFJLEdBQUcsSUFBSSxDQUFDLE9BQU8sQ0FBQztxQkFDakM7b0JBQ0gsV0FBVyxHQUFHLElBQUksQ0FBQztvQkFDbkIsTUFBTTtpQkFDUDthQUNGO1NBQ0Y7UUFDRCxJQUFJLENBQUMsWUFBWSxDQUFDLGVBQWUsQ0FBQyxXQUFXLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDNUQsSUFBSSxDQUFDLFdBQVc7WUFBRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsV0FBVyxDQUFDO0lBQ3hELENBQUM7SUFDRCxpQkFBaUIsQ0FBQyxHQUE0QztRQUM1RCxNQUFNLE1BQU0sR0FBMEMsR0FBRyxDQUFDLFdBQVcsQ0FBQztRQUN0RSxJQUFJLENBQUMsTUFBTTtZQUFFLE9BQU87UUFFcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVO1lBQUUsSUFBSSxDQUFDLGdCQUFnQixHQUFHLE1BQU0sQ0FBQyxNQUFNLENBQUM7UUFDOUQsSUFBSSxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUM7UUFDckMsR0FBRyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7SUFDekIsQ0FBQztDQUNGO0FBRUQsTUFBTSxZQUFZO0NBSWpCO0FBRUQsTUFBTSxXQUFZLFNBQVEsT0FBTztJQUsvQixZQUFZLENBQVMsRUFBRSxDQUFTO1FBQzlCLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7SUFDZCxDQUFDO0NBQ0Y7QUFNRCxNQUFNLE9BQU8sTUFBTyxTQUFRLE9BQU87SUFFakMsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO1FBQ1osSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBQ3pCLENBQUM7SUFFRCxJQUFJLFNBQVM7UUFDWCxNQUFNLFNBQVMsR0FBZ0IsSUFBSSxHQUFHLEVBQUUsQ0FBQztRQUN6QyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUN4QixJQUFJLElBQUksQ0FBQyxDQUFDO2dCQUFFLFNBQVMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO1lBQ2xDLElBQUksSUFBSSxDQUFDLENBQUM7Z0JBQUUsU0FBUyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDcEMsQ0FBQyxDQUFDLENBQUM7UUFDSCxTQUFTLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3ZCLE9BQU8sQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO0lBQ3hCLENBQUM7SUFFRCxJQUFJLEtBQUs7UUFDUCxNQUFNLEtBQUssR0FBYyxJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ25DLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hCLElBQUksSUFBSSxDQUFDLElBQUk7Z0JBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQ3pDLElBQUksSUFBSSxDQUFDLEtBQUs7Z0JBQUUsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQzdDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUM7SUFDcEIsQ0FBQztDQUNGO0FBS0QsTUFBTSxPQUFPLElBQUssU0FBUSxXQUFXO0lBT25DLFlBQVksSUFBVSxFQUFFLEtBQVcsRUFBRSxLQUFjLEVBQUUsR0FBWTtRQUMvRCxLQUFLLENBQUMsS0FBSyxFQUFFLEdBQUcsQ0FBQyxDQUFDO1FBQ2xCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0lBQ3JCLENBQUM7Q0FDRjtBQUdELFNBQVMsWUFBWSxDQUFDLElBQVUsRUFBRSxJQUFVLEVBQUUsS0FBVyxFQUFFLE1BQWM7SUFDdkUsSUFBSSxJQUFJLENBQUMsQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLEVBQUU7UUFDcEIsSUFBSSxJQUFJLENBQUMsSUFBSSxLQUFLLEtBQUs7WUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLE1BQU0sQ0FBQzs7WUFDcEMsSUFBSSxDQUFDLENBQUMsR0FBRyxNQUFNLENBQUM7S0FDdEI7U0FBTTtRQUNMLElBQUksQ0FBQyxDQUFDLEdBQUcsTUFBTSxDQUFDO1FBQ2hCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO0tBQ3BCO0FBQ0gsQ0FBQztBQUNELFNBQVMsVUFBVSxDQUFDLElBQVUsRUFBRSxJQUFVLEVBQUUsS0FBVyxFQUFFLE1BQWM7SUFDckUsWUFBWSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0FBQzFDLENBQUM7QUFPRCxTQUFTLG1CQUFtQixDQUFDLElBQVUsRUFBRSxJQUFVO0lBRWpELElBQUksSUFBSSxDQUFDLENBQUM7UUFBRSxPQUFPLElBQUksQ0FBQztJQUV4QixJQUFJLElBQUksQ0FBQyxJQUFJO1FBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUMvQyxJQUFJLElBQUksQ0FBQyxLQUFLO1FBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztJQUVqRCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztJQUcxQixNQUFNLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQztJQUM3QixNQUFNLFFBQVEsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxLQUFLLENBQUMsQ0FBQztJQWUvQyxJQUFJLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFO1FBRXJDLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLElBQUksR0FBRyxDQUFDLENBQUM7WUFBRSxPQUFPLEtBQUssQ0FBQztRQUc1RCxJQUFJLElBQUksQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsRUFBRTtZQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDL0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxHQUFHLENBQUMsQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUV6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hDO2FBRUk7WUFDSCxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7Z0JBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztpQkFDL0MsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztZQUV4QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3hDO0tBQ0Y7U0FBTTtRQUVMLE1BQU0sS0FBSyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUN0RCxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsQ0FBQyxHQUFHLEtBQUssR0FBRyxRQUFRLENBQUMsQ0FBQyxDQUFDO1FBR2xELElBQUksS0FBSyxHQUFHLENBQUMsQ0FBQyxJQUFJLEtBQUssR0FBRyxDQUFDLEVBQUU7WUFFM0IsSUFBSSxJQUFJLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNoRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUFFLE9BQU8sS0FBSyxDQUFDO2dCQUV6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO2lCQUVJO2dCQUNILElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztvQkFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO3FCQUNoRSxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEdBQUcsQ0FBQyxDQUFDO29CQUFFLE9BQU8sS0FBSyxDQUFDO2dCQUV4QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsR0FBRyxLQUFLLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO2FBQ3pEO1NBQ0Y7YUFHSTtZQUVILElBQUksSUFBSSxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFO2dCQUNwQixJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO3FCQUM5RCxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxDQUFDO29CQUFFLE9BQU8sS0FBSyxDQUFDO2dCQUV6QyxJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsS0FBSyxHQUFHLEdBQUcsQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDLENBQUM7YUFDdkQ7aUJBRUk7Z0JBQ0gsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDO29CQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxLQUFLLEdBQUcsR0FBRyxDQUFDLENBQUMsR0FBRyxTQUFTLENBQUMsQ0FBQztxQkFDOUQsSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQztvQkFBRSxPQUFPLEtBQUssQ0FBQztnQkFFeEMsSUFBSSxDQUFDLENBQUMsR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLEtBQUssR0FBRyxHQUFHLENBQUMsQ0FBQyxHQUFHLFNBQVMsQ0FBQyxDQUFDO2FBQ3ZEO1NBQ0Y7S0FDRjtJQUNELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQU9ELFNBQVMsZ0JBQWdCLENBQUMsSUFBVSxFQUFFLElBQVU7SUFDOUMsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxJQUFJLENBQUM7SUFFMUIsTUFBTSxLQUFLLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMvQyxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFDWCxJQUFJLEVBQUUsR0FBRyxDQUFDLENBQUM7SUFJWCxTQUFTLGNBQWMsQ0FBQyxLQUFhLEVBQUUsb0JBQTRCO1FBRWpFLElBQUksS0FBSyxLQUFLLENBQUMsSUFBSSxvQkFBb0IsR0FBRyxDQUFDO1lBQUUsT0FBTyxLQUFLLENBQUM7UUFFMUQsTUFBTSxDQUFDLEdBQUcsb0JBQW9CLEdBQUcsS0FBSyxDQUFDO1FBQ3ZDLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtZQUNiLElBQUksQ0FBQyxHQUFHLEVBQUUsRUFBRTtnQkFFVixPQUFPLEtBQUssQ0FBQzthQUNkO2lCQUFNLElBQUksQ0FBQyxHQUFHLEVBQUU7Z0JBQUUsRUFBRSxHQUFHLENBQUMsQ0FBQztTQUMzQjthQUVJLElBQUksS0FBSyxHQUFHLENBQUMsRUFBRTtZQUVsQixJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUFFLE9BQU8sS0FBSyxDQUFDO2lCQUNwQixJQUFJLENBQUMsR0FBRyxFQUFFO2dCQUFFLEVBQUUsR0FBRyxDQUFDLENBQUM7U0FDekI7UUFFRCxPQUFPLElBQUksQ0FBQztJQUNkLENBQUM7SUFFRCxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFakUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUU3RCxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFFakUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUs3RCxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7SUFHRCxJQUFJLEVBQUUsR0FBRyxDQUFDLEVBQUU7UUFDVixJQUFJLENBQUMsQ0FBQyxHQUFHLElBQUksTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7S0FDdkU7SUFFRCxJQUFJLEVBQUUsR0FBRyxDQUFDLElBQUksRUFBRSxHQUFHLENBQUMsRUFBRTtRQUNwQixJQUFJLElBQUksQ0FBQyxJQUFJO1lBQUUsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztRQUMvQyxJQUFJLElBQUksQ0FBQyxLQUFLO1lBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsUUFBUSxHQUFHLEtBQUssQ0FBQztLQUNsRDtJQUVELE9BQU8sSUFBSSxDQUFDO0FBQ2QsQ0FBQztBQUlELFNBQVMsY0FBYyxDQUFDLElBQVUsRUFBRSxJQUFVO0lBQzVDLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDO1FBQUUsT0FBTyxLQUFLLENBQUM7SUFDbkQsSUFBSSxDQUFDLGdCQUFnQixDQUFDLElBQUksRUFBRSxJQUFJLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUNoRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFBRSxPQUFPLEtBQUssQ0FBQztJQUMzRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFDRCxTQUFTLFFBQVEsQ0FBQyxJQUFVLEVBQUUsSUFBVTtJQUN0QyxJQUFJLGNBQWMsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEVBQUU7UUFDOUIsT0FBTyxJQUFJLENBQUM7S0FDYjtTQUFNO1FBQ0wsSUFBSSxJQUFJLENBQUMsQ0FBQztZQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN0QyxJQUFJLElBQUksQ0FBQyxDQUFDO1lBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDO1FBQ3RDLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBQ25CLElBQUksQ0FBQyxDQUFDLEdBQUcsU0FBUyxDQUFDO1FBRW5CLE9BQU8sS0FBSyxDQUFDO0tBQ2Q7QUFDSCxDQUFDO0FBR0QsTUFBTSxRQUFRO0lBS1osWUFBWSxJQUFVLEVBQUUsVUFBZ0IsRUFBRSxLQUFZO1FBQ3BELElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxDQUFDO1FBQ2pCLElBQUksQ0FBQyxVQUFVLEdBQUcsVUFBVSxDQUFDO1FBUzdCLElBQUksS0FBSztZQUFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxDQUFDLEVBQUUsS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7YUFDbEU7WUFDSCxNQUFNLFNBQVMsR0FBRyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3pELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO1NBQ3BEO0lBQ0gsQ0FBQztJQUVELElBQUksTUFBTTtRQUNSLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUM7SUFDaEMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEtBQUssSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDO0lBQ3BGLENBQUM7SUFDRCxJQUFJLEdBQUc7UUFDTCxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztJQUNwRixDQUFDO0NBQ0Y7QUFHRCxTQUFTLGdCQUFnQixDQUFDLENBQVcsRUFBRSxDQUFXO0lBQ2hELElBQUksQ0FBQyxDQUFDO1FBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQztJQUNsQixJQUFJLENBQUMsQ0FBQztRQUFFLE9BQU8sQ0FBQyxDQUFDO0lBQ2pCLE9BQU8sQ0FBQyxDQUFDLEtBQUssR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzNCLENBQUM7QUFHRCxNQUFNLE9BQU8sSUFBSTtJQU1mLFlBQVksSUFBVTtRQUNwQixJQUFJLENBQUMsSUFBSSxHQUFHLElBQUksQ0FBQztRQUNqQixJQUFJLENBQUMsS0FBSyxHQUFHLEVBQUUsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssRUFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztJQUMvRSxDQUFDO0lBRUQsSUFBSSxTQUFTO1FBQ1gsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsRUFBRTtZQUN0QyxPQUFPLElBQUksR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQzVCLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNSLENBQUM7SUFDRCxJQUFJLElBQUk7UUFDTixPQUFPLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxFQUFFLEdBQUcsRUFBRSxFQUFFO1lBQ3pDLE9BQU8sSUFBSSxHQUFHLEdBQUcsQ0FBQyxJQUFJLENBQUM7UUFDekIsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ1IsQ0FBQztJQUNELElBQUksUUFBUTtRQUNWLE1BQU0sUUFBUSxHQUFZLElBQUksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBWSxFQUFFLEdBQWEsRUFBVyxFQUFFO1lBQ3ZGLE1BQU0sUUFBUSxHQUFHLEdBQUcsQ0FBQyxRQUFRLENBQUM7WUFDOUIsTUFBTSxJQUFJLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQztZQUN0QixHQUFHLENBQUMsQ0FBQyxJQUFJLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDO1lBQzNCLEdBQUcsQ0FBQyxDQUFDLElBQUksUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUM7WUFDM0IsT0FBTyxHQUFHLENBQUM7UUFDYixDQUFDLEVBQUUsSUFBSSxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDdEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQztRQUM1QixRQUFRLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztRQUN4QixRQUFRLENBQUMsQ0FBQyxJQUFJLFNBQVMsQ0FBQztRQUN4QixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQsSUFBSSxRQUFRO1FBQ1YsTUFBTSxRQUFRLEdBQWdCLElBQUksR0FBRyxFQUFFLENBQUM7UUFDeEMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDeEIsSUFBSSxJQUFJLENBQUMsS0FBSztnQkFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUN6QyxJQUFJLElBQUksQ0FBQyxHQUFHO2dCQUFFLFFBQVEsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO1FBQ3ZDLENBQUMsQ0FBQyxDQUFDO1FBQ0gsT0FBTyxDQUFDLEdBQUcsUUFBUSxDQUFDLENBQUM7SUFDdkIsQ0FBQztJQUVELElBQUksU0FBUztRQUNYLE9BQU8sSUFBSSxDQUFDLEtBQUs7YUFDZCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDVixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxLQUFLLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLO2dCQUFFLE9BQU8sSUFBSSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDO2lCQUM5RixJQUFJLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSTtnQkFBRSxPQUFPLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztZQUNoRSxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQzthQUNELE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLFFBQVEsQ0FBQyxDQUFDO0lBQ2xDLENBQUM7SUFFRCxJQUFJLFlBQVk7UUFDZCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBVSxFQUFFLElBQWMsRUFBUSxFQUFFO1lBQzVELElBQUksSUFBSSxDQUFDLEtBQUssRUFBRTtnQkFDZCxNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDO2dCQUN6QixJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7cUJBQzFDLElBQUksS0FBSyxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7b0JBQUUsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsS0FBSyxDQUFDLENBQUMsQ0FBQztnQkFDcEQsSUFBSSxLQUFLLENBQUMsQ0FBQyxHQUFHLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztvQkFBRSxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxLQUFLLENBQUMsQ0FBQyxDQUFDO3FCQUMxQyxJQUFJLEtBQUssQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDO29CQUFFLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLEtBQUssQ0FBQyxDQUFDLENBQUM7YUFDckQ7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsRUFBRSxJQUFJLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7SUFFRCxRQUFRLENBQUMsS0FBYztRQUNyQixLQUFLLE1BQU0sSUFBSSxJQUFJLElBQUksQ0FBQyxLQUFLLEVBQUU7WUFDN0IsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRztnQkFBRSxTQUFTO1lBQ3ZDLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDekQsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDO1lBQ3BELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxTQUFTLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUMxRDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBSUQsU0FBUyxTQUFTLENBQUMsT0FBZ0IsRUFBRSxJQUFVLEVBQUUsSUFBVTtJQUN6RCxNQUFNLEVBQUUsR0FBRyxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQztJQU8xQixLQUFLLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDLEVBQUU7UUFDMUMsSUFBSSxDQUFDLEdBQUcsRUFBRSxFQUFFO1lBQ1YsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQztZQUNuQixPQUFPLEtBQUssQ0FBQztTQUNkO1FBQ0QsTUFBTSxFQUFFLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDOUIsTUFBTSxFQUFFLEtBQUssRUFBRSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUUxRCxJQUFJLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxHQUFHLEVBQUUsS0FBSyxDQUFDO1lBQUUsU0FBUztRQUtuRCxJQUFJLE1BQWMsQ0FBQztRQUNuQixJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3ZFLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7YUFFSSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLG1CQUFtQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQzVFLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7YUFFSSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9FLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7YUFFSSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9FLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7O1lBQU0sT0FBTyxLQUFLLENBQUM7UUFFcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQzVEO0lBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDckIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBR0QsTUFBTSxDQUFDLE9BQU8sT0FBTyxPQUFPO0lBTTFCLFlBQVksS0FBaUI7UUFDM0IsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxDQUFDLEtBQUssR0FBRyxFQUFFLENBQUM7UUFDaEIsSUFBSSxnQkFBZ0IsRUFBRSxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDOUMsQ0FBQztJQUVELElBQUksS0FBSztRQUNQLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVELElBQUksUUFBUTtRQUNWLE1BQU0sUUFBUSxHQUFnQixJQUFJLEdBQUcsRUFBRSxDQUFDO1FBQ3hDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFO1lBQ3hCLElBQUksSUFBSSxDQUFDLENBQUM7Z0JBQUUsUUFBUSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7WUFDakMsSUFBSSxJQUFJLENBQUMsQ0FBQztnQkFBRSxRQUFRLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQyxDQUFDLENBQUMsQ0FBQztRQUNILE9BQU8sQ0FBQyxHQUFHLFFBQVEsQ0FBQyxDQUFDO0lBQ3ZCLENBQUM7SUFFRCxlQUFlLENBQUMsSUFBWSxDQUFDO1FBQzNCLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDM0IsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDLENBQUM7WUFDM0QsT0FBTyxnQ0FBSyxJQUFJLENBQUMsSUFBSSxLQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsQ0FBQyxHQUFVLENBQUM7UUFDaEUsQ0FBQyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBTUQsTUFBTSxDQUFDLElBQVU7UUFDZixJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUV4QixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1FBRTdELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDcEMsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxLQUFLLElBQUksSUFBSSxDQUFDLEdBQUcsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO1lBQ2xHLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU07Z0JBQUUsT0FBTyxLQUFLLENBQUM7WUFDckMsSUFBSSxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUU7Z0JBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7Z0JBQ2xDLElBQUksQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLElBQUksRUFBRSxJQUFJLENBQUM7b0JBQUUsT0FBTyxLQUFLLENBQUM7YUFDaEQ7WUFDRCxPQUFPLElBQUksQ0FBQztRQUNkLENBQUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGIn0=