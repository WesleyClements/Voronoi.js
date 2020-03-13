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
import Vector2 from './util/Vector2.js';
import AABB from './util/AABB.js';
import RBTree from './util/RBTree.js';
import Site from './Voronoi/Site.js';
import Vertex from './Voronoi/Vertex.js';
import Edge from './Voronoi/Edge.js';
import Cell from './Voronoi/Cell.js';
import CellEdge from './Voronoi/CellEdge.js';
import Diagram from './Voronoi/Diagram.js';
export { Site, Vertex, Edge, Cell, CellEdge, Diagram };
class ShadowSite extends Site {
}
class BeachSection {
}
class CircleEvent extends Vector2 {
    constructor(x, y) {
        super(x, y);
    }
}
class VoronoiData {
    constructor() {
        this.diagram = new Diagram();
        this.beachline = new RBTree();
        this.circleEvents = new RBTree();
    }
}
function compareCellEdges(a, b) {
    if (!a)
        return -1;
    if (!b)
        return 1;
    return b.angle - a.angle;
}
function createEdge(data, left, right, vertexA, vertexB) {
    const edge = new Edge(left, right);
    data.diagram.edges.push(edge);
    if (vertexA)
        setEdgeStart(edge, left, right, vertexA);
    if (vertexB)
        setEdgeEnd(edge, left, right, vertexB);
    left.cell.edges.push(new CellEdge(left, edge, right));
    right.cell.edges.push(new CellEdge(right, edge, left));
    return edge;
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
function createBeachSection(site) {
    let beachSection = new BeachSection();
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
function detachBeachSection(data, beachSection) {
    detachCircleEvent(data, beachSection);
    data.beachline.removeNode(beachSection);
}
function removeBeachSection(data, beachSection) {
    const { x, ycenter: y } = beachSection.circleEvent;
    const vertex = new Vertex(x, y);
    const disappearingTransitions = [beachSection];
    let previous = beachSection.rbPrevious;
    let next = beachSection.rbNext;
    detachBeachSection(data, beachSection);
    let lArc = previous;
    while (lArc.circleEvent && equalWithEpsilon(x, lArc.circleEvent.x) && equalWithEpsilon(y, lArc.circleEvent.ycenter)) {
        previous = lArc.rbPrevious;
        disappearingTransitions.unshift(lArc);
        detachBeachSection(data, lArc);
        lArc = previous;
    }
    disappearingTransitions.unshift(lArc);
    detachCircleEvent(data, lArc);
    let rArc = next;
    while (rArc.circleEvent && equalWithEpsilon(x, rArc.circleEvent.x) && equalWithEpsilon(y, rArc.circleEvent.ycenter)) {
        next = rArc.rbNext;
        disappearingTransitions.push(rArc);
        detachBeachSection(data, rArc);
        rArc = next;
    }
    disappearingTransitions.push(rArc);
    detachCircleEvent(data, rArc);
    let nArcs = disappearingTransitions.length, iArc;
    for (iArc = 1; iArc < nArcs; iArc++) {
        rArc = disappearingTransitions[iArc];
        lArc = disappearingTransitions[iArc - 1];
        setEdgeStart(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearingTransitions[0];
    rArc = disappearingTransitions[nArcs - 1];
    rArc.edge = createEdge(data, lArc.site, rArc.site, undefined, vertex);
    attachCircleEvent(data, lArc);
    attachCircleEvent(data, rArc);
}
function addBeachSection(data, site) {
    const { x, y: directrix } = site;
    let leftArc;
    let rightArc;
    let node = data.beachline.root;
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
    data.beachline.insertSuccessor(leftArc, newArc);
    if (!leftArc && !rightArc)
        return;
    if (leftArc === rightArc) {
        detachCircleEvent(data, leftArc);
        rightArc = createBeachSection(leftArc.site);
        data.beachline.insertSuccessor(newArc, rightArc);
        newArc.edge = rightArc.edge = createEdge(data, leftArc.site, newArc.site);
        attachCircleEvent(data, leftArc);
        attachCircleEvent(data, rightArc);
        return;
    }
    if (leftArc && !rightArc) {
        newArc.edge = createEdge(data, leftArc.site, newArc.site);
        return;
    }
    if (leftArc !== rightArc) {
        detachCircleEvent(data, leftArc);
        detachCircleEvent(data, rightArc);
        const a = { x: leftArc.site.x, y: leftArc.site.y };
        const b = { x: site.x - a.x, y: site.y - a.y };
        const c = { x: rightArc.site.x - a.x, y: rightArc.site.y - a.y };
        const d = 2 * (b.x * c.y - b.y * c.x);
        const bh = b.x * b.x + b.y * b.y;
        const ch = c.x * c.x + c.y * c.y;
        const vertex = new Vertex((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y);
        setEdgeStart(rightArc.edge, leftArc.site, rightArc.site, vertex);
        newArc.edge = createEdge(data, leftArc.site, site, undefined, vertex);
        rightArc.edge = createEdge(data, site, rightArc.site, undefined, vertex);
        attachCircleEvent(data, leftArc);
        attachCircleEvent(data, rightArc);
    }
}
function attachCircleEvent(data, arc) {
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
    let node = data.circleEvents.root;
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
    data.circleEvents.insertSuccessor(predecessor, circleEvent);
    if (!predecessor)
        data.firstCircleEvent = circleEvent;
}
function detachCircleEvent(data, arc) {
    const circle = arc.circleEvent;
    if (!circle)
        return;
    if (!circle.rbPrevious)
        data.firstCircleEvent = circle.rbNext;
    data.circleEvents.removeNode(circle);
    arc.circleEvent = null;
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
    const clamped = aabb.clamp(edge);
    if (!clamped)
        return false;
    const aChanged = clamped.a !== edge.a;
    const bChanged = clamped.b !== edge.b;
    if (aChanged)
        edge.a = new Vertex(clamped.a.x, clamped.a.y);
    if (bChanged)
        edge.b = new Vertex(clamped.b.x, clamped.b.y);
    if (aChanged || bChanged) {
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
function finish(diagram, aabb) {
    aabb = AABB.clone(aabb);
    diagram.edges = diagram.edges.filter(edge => clipEdge(edge, aabb));
    diagram.cells = diagram.cells.filter(cell => {
        cell.edges = cell.edges.filter(edge => edge.start && edge.end && clipEdge(edge.sharedEdge, aabb));
        if (!cell.edges.length)
            return false;
        if (!cell.isClosed) {
            cell.edges.sort(compareCellEdges);
            if (!closeCell(diagram, cell, aabb))
                return false;
        }
        return true;
    });
}
export default class Voronoi {
    static compute(aabb, ...sites) {
        if (!sites)
            throw Error('sites is undefined');
        if (sites.length < 1)
            throw Error('no sites provided');
        const startTime = new Date();
        const data = new VoronoiData();
        const siteEvents = Array.from(sites).sort(Vector2.compareY);
        let site = siteEvents.pop();
        let circle;
        const lastSite = Vector2.infinity.negate();
        while (site || circle) {
            circle = data.firstCircleEvent;
            if (site && (!circle || Vector2.compareY(site, circle) > 0)) {
                if (!Vector2.equal(site, lastSite)) {
                    data.diagram.sites.push(site);
                    site.cell = new Cell(site);
                    data.diagram.cells.push(site.cell);
                    addBeachSection(data, site);
                    lastSite.y = site.y;
                    lastSite.x = site.x;
                }
                site = siteEvents.pop();
            }
            else if (circle) {
                removeBeachSection(data, circle.arc);
            }
        }
        const result = data.diagram;
        result.edges.forEach(edge => {
            if (edge.a)
                edge.a.edges.add(edge);
            if (edge.b)
                edge.b.edges.add(edge);
        });
        result.cells.forEach(cell => {
            cell.edges.sort(compareCellEdges);
            cell.isClosed = true;
        });
        result.execTime = Date.now() - startTime.getTime();
        finish(result, aabb);
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVm9yb25vaS5qcyIsInNvdXJjZVJvb3QiOiIuL3NyYy8iLCJzb3VyY2VzIjpbIlZvcm9ub2kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEySUU7QUFFRixPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLG1CQUFtQixFQUFFLHNCQUFzQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFN0csT0FBTyxPQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFDeEMsT0FBTyxJQUFJLE1BQU0sZ0JBQWdCLENBQUM7QUFFbEMsT0FBTyxNQUFzQixNQUFNLGtCQUFrQixDQUFDO0FBRXRELE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sTUFBTSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pDLE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sUUFBUSxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sT0FBTyxNQUFNLHNCQUFzQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBRXZELE1BQU0sVUFBVyxTQUFRLElBQUk7Q0FFNUI7QUFFRCxNQUFNLFlBQVk7Q0FJakI7QUFFRCxNQUFNLFdBQVksU0FBUSxPQUFPO0lBSy9CLFlBQVksQ0FBUyxFQUFFLENBQVM7UUFDOUIsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztJQUNkLENBQUM7Q0FDRjtBQUVELE1BQU0sV0FBVztJQU9mO1FBQ0UsSUFBSSxD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QUFDLENBQUM7UUFVbEMsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkQsTUFBTSxDQUFDLEdBQUcsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUMvQyxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDakUsTUFBTSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRXRDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFDakMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUVqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLEVBQUUsR0FBRyxDQUFD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LENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7YUFFSSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9FLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7YUFFSSxJQUFJLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLHNCQUFzQixDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQy9FLE1BQU0sR0FBRyxJQUFJLE1BQU0sQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7U0FDaEY7O1lBQU0sT0FBTyxLQUFLLENBQUM7UUFFcEIsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLEVBQUUsR0FBRyxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBQ3BELElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUN2QixJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdkIsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDekIsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLEVBQUUsSUFBSSxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0tBQzVEO0lBQ0QsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUM7SUFDckIsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBTUQsU0FBUyxNQUFNLENBQUMsT0FBZ0IsRUFBRSxJQUFVO0lBQzFDLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDO0lBRXhCLE9BQU8sQ0FBQyxLQUFLLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxRQUFRLENBQUMsSUFBSSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFFbkUsT0FBTyxDQUFDLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsRUFBRTtRQUMxQyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssSUFBSSxJQUFJLENBQUMsR0FBRyxJQUFJLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7UUFDbEcsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTTtZQUFFLE9BQU8sS0FBSyxDQUFDO1FBQ3JDLElBQUksQ0FBQyxJQUFJLENBQUMsUUFBUSxFQUFFO1lBQ2xCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGdCQUFnQixDQUFDLENBQUM7WUFDbEMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxPQUFPLEVBQUUsSUFBSSxFQUFFLElBQUksQ0FBQztnQkFBRSxPQUFPLEtBQUssQ0FBQztTQUNuRDtRQUNELE9BQU8sSUFBSSxDQUFDO0lBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDO0FBRUQsTUFBTSxDQUFDLE9BQU8sT0FBTyxPQUFPO0lBQzFCLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBVSxFQUFFLEdBQUcsS0FBZ0I7UUFDNUMsSUFBSSxDQUFDLEtBQUs7WUFBRSxNQUFNLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO1FBQzlDLElBQUksS0FBSyxDQUFDLE1BQU0sR0FBRyxDQUFDO1lBQUUsTUFBTSxLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQztRQUV2RCxNQUFNLFNBQVMsR0FBRyxJQUFJLElBQUksRUFBRSxDQUFDO1FBRzdCLE1BQU0sSUFBSSxHQUFHLElBQUksV0FBVyxFQUFFLENBQUM7UUFHL0IsTUFBTSxVQUFVLEdBQVcsS0FBSyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBVyxDQUFDO1FBRzlFLElBQUksSUFBSSxHQUFTLFVBQVUsQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUNsQyxJQUFJLE1BQU0sQ0FBQztRQUVYLE1BQU0sUUFBUSxHQUFHLE9BQU8sQ0FBQyxRQUFRLENBQUMsTUFBTSxFQUFFLENBQUM7UUFFM0MsT0FBTyxJQUFJLElBQUksTUFBTSxFQUFFO1lBSXJCLE1BQU0sR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUM7WUFHL0IsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDLE1BQU0sSUFBSSxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRTtnQkFFM0QsSUFBSSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLFFBQVEsQ0FBQyxFQUFFO29CQUNsQyxJQUFJLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBQzlCLElBQUksQ0FBQyxJQUFJLEdBQUcsSUFBSSxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRTNCLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7b0JBRW5DLGVBQWUsQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLENBQUM7b0JBRTVCLFFBQVEsQ0FBQyxDQUFDLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQztvQkFDcEIsUUFBUSxDQUFDLENBQUMsR0FBRyxJQUFJLENBQUMsQ0FBQyxDQUFDO2lCQUNyQjtnQkFDRCxJQUFJLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDO2FBQ3pCO2lCQUVJLElBQUksTUFBTSxFQUFFO2dCQUNmLGtCQUFrQixDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUM7YUFDdEM7U0FDRjtRQUVELE1BQU0sTUFBTSxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUM7UUFFNUIsTUFBTSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDMUIsSUFBSSxJQUFJLENBQUMsQ0FBQztnQkFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDbkMsSUFBSSxJQUFJLENBQUMsQ0FBQztnQkFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDckMsQ0FBQyxDQUFDLENBQUM7UUFFSCxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsRUFBRTtZQUMxQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1lBQ2xDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBQ3ZCLENBQUMsQ0FBQyxDQUFDO1FBR0gsTUFBTSxDQUFDLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsU0FBUyxDQUFDLE9BQU8sRUFBRSxDQUFDO1FBQ25ELE1BQU0sQ0FBQyxNQUFNLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDckIsT0FBTyxNQUFNLENBQUM7SUFDaEIsQ0FBQztDQUNGIn0=