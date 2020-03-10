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
import { EPSILON, equalWithEpsilon } from './util/FloatUtil.js';
import Vector2 from './util/Vector2.js';
import RBTree from './util/RBTree.js';
import Site from './Voronoi/Site.js';
import Vertex from './Voronoi/Vertex.js';
import Edge from './Voronoi/Edge.js';
import Cell from './Voronoi/Cell.js';
import CellEdge from './Voronoi/CellEdge.js';
import Diagram from './Voronoi/Diagram.js';
export { Site, Vertex, Edge, Cell, CellEdge, Diagram };
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
export default class Voronoi {
    static compute(sites) {
        if (!sites || sites.length < 1)
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
        return result;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiVm9yb25vaS5qcyIsInNvdXJjZVJvb3QiOiIuL3NyYy8iLCJzb3VyY2VzIjpbIlZvcm9ub2kudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7RUEySUU7QUFFRixPQUFPLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLE1BQU0scUJBQXFCLENBQUM7QUFFaEUsT0FBTyxPQUFPLE1BQU0sbUJBQW1CLENBQUM7QUFFeEMsT0FBTyxNQUFzQixNQUFNLGtCQUFrQixDQUFDO0FBRXRELE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sTUFBTSxNQUFNLHFCQUFxQixDQUFDO0FBQ3pDLE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sSUFBSSxNQUFNLG1CQUFtQixDQUFDO0FBQ3JDLE9BQU8sUUFBUSxNQUFNLHVCQUF1QixDQUFDO0FBQzdDLE9BQU8sT0FBTyxNQUFNLHNCQUFzQixDQUFDO0FBRTNDLE9BQU8sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLE9BQU8sRUFBRSxDQUFDO0FBRXZELE1BQU0sWUFBWTtDQUlqQjtBQUVELE1BQU0sV0FBWSxTQUFRLE9BQU87SUFLL0IsWUFBWSxDQUFTLEVBQUUsQ0FBUztRQUM5QixLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0lBQ2QsQ0FBQztDQUNGO0FBRUQsTUFBTSxXQUFXO0lBT2Y7UUFDRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksT0FBTyxFQUFFLENBQUM7UUFDN0IsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLE1BQU0sRUFBZ0IsQ0FBQztRQUM1QyxJ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TyxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNuRCxNQUFNLENBQUMsR0FBRyxFQUFFLENBQUMsRUFBRSxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQy9DLE1BQU0sQ0FBQyxHQUFHLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztRQUNqRSxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7UUFFdEMsTUFBTSxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNqQyxNQUFNLEVBQUUsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBRWpDLE1BQU0sTUFBTSxHQUFHLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxFQUFFLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsRUFBRSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUc1RixZQUFZLENBQUMsUUFBUSxD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