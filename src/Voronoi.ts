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

import { RBTree, RBTreeNode } from './util/RBTree.js';

import Point from './util/Point.js';
import LineSegment from './util/LineSegment.js';
import Triangle from './util/Triangle.js';

import AABB from './util/AABB.js';

class VoronoiGenerator {
  diagram: Diagram;

  beachline: RBTree<BeachSection>;
  circleEvents: RBTree<CircleEvent>;

  firstCircleEvent: CircleEvent;

  // ---------------------------------------------------------------------------
  // Top-level Fortune loop
  compute(sites: Point[], diagram: Diagram): void {
    if (!sites || sites.length < 1) throw Error('no sites provided');
    // to measure execution time
    const startTime = new Date();

    // init internal state
    this.beachline = new RBTree();
    this.circleEvents = new RBTree();
    this.diagram = diagram;

    // Initialize site event queue
    const siteEvents = Array.from(sites).sort(Point.compare);

    // process queue
    let site: Site = siteEvents.pop();
    let circle;
    // to avoid duplicate sites
    const lastSite = {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
    };
    // main loop
    while (site || circle) {
      // we need to figure whether we handle a site or circle event
      // for this we find out if there is a site event and it is
      // 'earlier' than the circle event
      circle = this.firstCircleEvent;

      // add beach section
      if (site && (!circle || Point.compare(site, circle) > 0)) {
        // only if site is not a duplicate
        if (!Point.equal(site, lastSite)) {
          this.diagram.sites.push(site);
          site.cell = new Cell(site);
          // first create cell for new site
          this.diagram.cells.push(site.cell);
          // then create a beachsection for that site
          this.addBeachSection(site);
          // remember last site coords to detect duplicate
          lastSite.y = site.y;
          lastSite.x = site.x;
        }
        site = siteEvents.pop();
      }
      // remove beach section
      else if (circle) {
        this.removeBeachSection(circle.arc);
      }
    }

    // prepare return values
    diagram.execTime = Date.now() - startTime.getTime();
  }

  // this create and add an edge to internal collection, and also create
  createEdge(left: Site, right: Site, vertexA?: Vertex, vertexB?: Vertex): Edge {
    const edge = new Edge(left, right);
    this.diagram.edges.push(edge);
    if (vertexA) setEdgeStart(edge, left, right, vertexA);
    if (vertexB) setEdgeEnd(edge, left, right, vertexB);
    left.cell.edges.push(new CellEdge(left, edge, right));
    right.cell.edges.push(new CellEdge(right, edge, left));
    return edge;
  }

  // ---------------------------------------------------------------------------
  // Beachline methods

  // rhill 2011-06-02: A lot of Beachsection instanciations
  // occur during the computation of the Voronoi diagram,
  // somewhere between the number of sites and twice the
  // number of sites, while the number of Beachsections on the
  // beachline at any given time is comparatively low. For this
  // reason, we reuse already created Beachsections, in order
  // to avoid new memory allocation. This resulted in a measurable
  // performance gain.
  createBeachSection(site: Site): BeachSection {
    let beachSection = new BeachSection();
    beachSection.site = site;
    return beachSection;
  }

  // calculate the left break point of a particular beach section,
  // given a particular sweep line
  leftBreakPoint(arc: BeachSection & RBTreeNode<BeachSection>, directrix: number): number {
    // http://en.wikipedia.org/wiki/Parabola
    // http://en.wikipedia.org/wiki/Quadratic_equation
    // h1 = x1,
    // k1 = (y1+directrix)/2,
    // h2 = x2,
    // k2 = (y2+directrix)/2,
    // p1 = k1-directrix,
    // a1 = 1/(4*p1),
    // b1 = -h1/(2*p1),
    // c1 = h1*h1/(4*p1)+k1,
    // p2 = k2-directrix,
    // a2 = 1/(4*p2),
    // b2 = -h2/(2*p2),
    // c2 = h2*h2/(4*p2)+k2,
    // x = (-(b2-b1) + Math.sqrt((b2-b1)*(b2-b1) - 4*(a2-a1)*(c2-c1))) / (2*(a2-a1))
    // When x1 become the x-origin:
    // h1 = 0,
    // k1 = (y1+directrix)/2,
    // h2 = x2-x1,
    // k2 = (y2+directrix)/2,
    // p1 = k1-directrix,
    // a1 = 1/(4*p1),
    // b1 = 0,
    // c1 = k1,
    // p2 = k2-directrix,
    // a2 = 1/(4*p2),
    // b2 = -h2/(2*p2),
    // c2 = h2*h2/(4*p2)+k2,
    // x = (-b2 + Math.sqrt(b2*b2 - 4*(a2-a1)*(c2-k1))) / (2*(a2-a1)) + x1

    // change code below at your own risk: care has been taken to
    // reduce errors due to computers' finite arithmetic precision.
    // Maybe can still be improved, will see if any more of this
    // kind of errors pop up again.
    const { x: rfocx, y: rfocy } = arc.site;
    const pby2 = rfocy - directrix;
    // parabola in degenerate case where focus is on directrix
    if (!pby2) return rfocx;

    if (!arc.rbPrevious) return Number.NEGATIVE_INFINITY;

    const { x: lfocx, y: lfocy } = arc.rbPrevious.site;
    const plby2 = lfocy - directrix;
    // parabola in degenerate case where focus is on directrix
    if (!plby2) return lfocx;

    const aby2 = 1 / pby2 - 1 / plby2;
    if (aby2) {
      const hl = lfocx - rfocx;
      const b = hl / plby2;
      const disc = b * b - 2 * aby2 * ((hl * hl) / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2);
      return (-b + Math.sqrt(disc)) / aby2 + rfocx;
    }
    // both parabolas have same distance to directrix, thus break point is midway
    return (rfocx + lfocx) / 2;
  }

  // calculate the right break point of a particular beach section,
  // given a particular directrix
  rightBreakPoint(arc: BeachSection & RBTreeNode<BeachSection>, directrix: number): number {
    if (arc.rbNext) return this.leftBreakPoint(arc.rbNext, directrix);
    return arc.site.y === directrix ? arc.site.x : Infinity;
  }
  detachBeachSection(beachSection: BeachSection & RBTreeNode<BeachSection>): void {
    this.detachCircleEvent(beachSection); // detach potentially attached circle event
    this.beachline.removeNode(beachSection); // remove from RB-tree
  }
  removeBeachSection(beachSection: BeachSection & RBTreeNode<BeachSection>): void {
    const { x, ycenter: y } = beachSection.circleEvent;
    const vertex = createVertex(x, y, this.diagram);

    const disappearingTransitions = [beachSection];
    let previous = beachSection.rbPrevious;
    let next = beachSection.rbNext;

    // remove collapsed beachsection from beachline
    this.detachBeachSection(beachSection);

    // there could be more than one empty arc at the deletion point, this
    // happens when more than two edges are linked by the same vertex,
    // so we will collect all those edges by looking up both sides of
    // the deletion point.
    // by the way, there is *always* a predecessor/successor to any collapsed
    // beach section, it's just impossible to have a collapsing first/last
    // beach sections on the beachline, since they obviously are unconstrained
    // on their left/right side.

    // look left
    let lArc = previous;
    while (
      lArc.circleEvent &&
      equalWithEpsilon(x, lArc.circleEvent.x) &&
      equalWithEpsilon(y, lArc.circleEvent.ycenter)
    ) {
      previous = lArc.rbPrevious;
      disappearingTransitions.unshift(lArc);
      this.detachBeachSection(lArc); // mark for reuse
      lArc = previous;
    }
    // even though it is not disappearing, I will also add the beach section
    // immediately to the left of the left-most collapsed beach section, for
    // convenience, since we need to refer to it later as this beach section
    // is the 'left' site of an edge for which a start point is set.
    disappearingTransitions.unshift(lArc);
    this.detachCircleEvent(lArc);

    // look right
    let rArc = next;
    while (
      rArc.circleEvent &&
      equalWithEpsilon(x, rArc.circleEvent.x) &&
      equalWithEpsilon(y, rArc.circleEvent.ycenter)
    ) {
      next = rArc.rbNext;
      disappearingTransitions.push(rArc);
      this.detachBeachSection(rArc); // mark for reuse
      rArc = next;
    }
    // we also have to add the beach section immediately to the right of the
    // right-most collapsed beach section, since there is also a disappearing
    // transition representing an edge's start point on its left.
    disappearingTransitions.push(rArc);
    this.detachCircleEvent(rArc);

    // walk through all the disappearing transitions between beach sections and
    // set the start point of their (implied) edge.
    let nArcs = disappearingTransitions.length,
      iArc;
    for (iArc = 1; iArc < nArcs; iArc++) {
      rArc = disappearingTransitions[iArc];
      lArc = disappearingTransitions[iArc - 1];
      setEdgeStart(rArc.edge, lArc.site, rArc.site, vertex);
    }

    // create a new edge as we have now a new transition between
    // two beach sections which were previously not adjacent.
    // since this edge appears as a new vertex is defined, the vertex
    // actually define an end point of the edge (relative to the site
    // on the left)
    lArc = disappearingTransitions[0];
    rArc = disappearingTransitions[nArcs - 1];
    rArc.edge = this.createEdge(lArc.site, rArc.site, undefined, vertex);

    // create circle events if any for beach sections left in the beachline
    // adjacent to collapsed sections
    this.attachCircleEvent(lArc);
    this.attachCircleEvent(rArc);
  }
  addBeachSection(site: Point): void {
    const { x, y: directrix } = site;

    // find the left and right beach sections which will surround the newly
    // created beach section.
    // rhill 2011-06-01: This loop is one of the most often executed,
    // hence we expand in-place the comparison-against-epsilon calls.
    let leftArc: BeachSection & RBTreeNode<BeachSection>;
    let rightArc: BeachSection & RBTreeNode<BeachSection>;
    let node = this.beachline.root;
    while (node) {
      const dxl = this.leftBreakPoint(node, directrix) - x;
      // x lessThanWithEpsilon xl => falls somewhere before the left edge of the beachsection
      if (dxl > EPSILON) {
        // this case should never happen
        // if (!node.rbLeft) {
        //	rArc = node.rbLeft;
        //	break;
        //	}
        node = node.rbLeft;
      } else {
        const dxr = x - this.rightBreakPoint(node, directrix);
        // x greaterThanWithEpsilon xr => falls somewhere after the right edge of the beachsection
        if (dxr > EPSILON) {
          if (!node.rbRight) {
            leftArc = node;
            break;
          }
          node = node.rbRight;
        } else {
          // x equalWithEpsilon xl => falls exactly on the left edge of the beachsection
          if (dxl > -EPSILON) {
            leftArc = node.rbPrevious;
            rightArc = node;
          }
          // x equalWithEpsilon xr => falls exactly on the right edge of the beachsection
          else if (dxr > -EPSILON) {
            leftArc = node;
            rightArc = node.rbNext;
          }
          // falls exactly somewhere in the middle of the beachsection
          else leftArc = rightArc = node;
          break;
        }
      }
    }
    // at this point, keep in mind that lArc and/or rArc could be
    // undefined or null.

    // create a new beach section object for the site and add it to RB-tree
    const newArc: BeachSection & RBTreeNode<BeachSection> = this.createBeachSection(site);
    this.beachline.insertSuccessor(leftArc, newArc);

    // cases:
    //

    // [null,null]
    // least likely case: new beach section is the first beach section on the
    // beachline.
    // This case means:
    //   no new transition appears
    //   no collapsing beach section
    //   new beachsection become root of the RB-tree
    if (!leftArc && !rightArc) return;

    // [lArc,rArc] where lArc == rArc
    // most likely case: new beach section split an existing beach
    // section.
    // This case means:
    //   one new transition appears
    //   the left and right beach section might be collapsing as a result
    //   two new nodes added to the RB-tree
    if (leftArc === rightArc) {
      // invalidate circle event of split beach section
      this.detachCircleEvent(leftArc);

      // split the beach section into two separate beach sections
      rightArc = this.createBeachSection(leftArc.site);
      this.beachline.insertSuccessor(newArc, rightArc);

      // since we have a new transition between two beach sections,
      // a new edge is born
      newArc.edge = rightArc.edge = this.createEdge(leftArc.site, newArc.site);

      // check whether the left and right beach sections are collapsing
      // and if so create circle events, to be notified when the point of
      // collapse is reached.
      this.attachCircleEvent(leftArc);
      this.attachCircleEvent(rightArc);
      return;
    }

    // [lArc,null]
    // even less likely case: new beach section is the *last* beach section
    // on the beachline -- this can happen *only* if *all* the previous beach
    // sections currently on the beachline share the same y value as
    // the new beach section.
    // This case means:
    //   one new transition appears
    //   no collapsing beach section as a result
    //   new beach section become right-most node of the RB-tree
    if (leftArc && !rightArc) {
      newArc.edge = this.createEdge(leftArc.site, newArc.site);
      return;
    }

    // [null,rArc]
    // impossible case: because sites are strictly processed from top to bottom,
    // and left to right, which guarantees that there will always be a beach section
    // on the left -- except of course when there are no beach section at all on
    // the beach line, which case was handled above.
    // rhill 2011-06-02: No point testing in non-debug version
    //if (!lArc && rArc) {
    //	throw "Voronoi.addBeachsection(): What is this I don't even";
    //	}

    // [lArc,rArc] where lArc != rArc
    // somewhat less likely case: new beach section falls *exactly* in between two
    // existing beach sections
    // This case means:
    //   one transition disappears
    //   two new transitions appear
    //   the left and right beach section might be collapsing as a result
    //   only one new node added to the RB-tree
    if (leftArc !== rightArc) {
      // invalidate circle events of left and right sites
      this.detachCircleEvent(leftArc);
      this.detachCircleEvent(rightArc);

      // an existing transition disappears, meaning a vertex is defined at
      // the disappearance point.
      // since the disappearance is caused by the new beachsection, the
      // vertex is at the center of the circumscribed circle of the left,
      // new and right beachsections.
      // http://mathforum.org/library/drmath/view/55002.html
      // Except that I bring the origin at A to simplify
      // calculation
      const a = { x: leftArc.site.x, y: leftArc.site.y };
      const b = { x: site.x - a.x, y: site.y - a.y };
      const c = { x: rightArc.site.x - a.x, y: rightArc.site.y - a.y };
      const d = 2 * (b.x * c.y - b.y * c.x);

      const bh = b.x * b.x + b.y * b.y;
      const ch = c.x * c.x + c.y * c.y;

      const vertex = createVertex((c.y * bh - b.y * ch) / d + a.x, (b.x * ch - c.x * bh) / d + a.y, this.diagram);

      // one transition disappear
      setEdgeStart(rightArc.edge, leftArc.site, rightArc.site, vertex);

      // two new transitions appear at the new vertex location
      newArc.edge = this.createEdge(leftArc.site, site, undefined, vertex);
      rightArc.edge = this.createEdge(site, rightArc.site, undefined, vertex);

      // check whether the left and right beach sections are collapsing
      // and if so create circle events, to handle the point of collapse.
      this.attachCircleEvent(leftArc);
      this.attachCircleEvent(rightArc);
    }
  }

  // ---------------------------------------------------------------------------
  // Circle event methods
  attachCircleEvent(arc: BeachSection & RBTreeNode<BeachSection>): void {
    if (!arc.rbPrevious || !arc.rbNext) return; // does that ever happen?
    const left = arc.rbPrevious.site;
    const center = arc.site;
    const right = arc.rbNext.site;

    // If site of left beachsection is same as site of
    // right beachsection, there can't be convergence
    if (left === right) return;

    // Find the circumscribed circle for the three sites associated
    // with the beachsection triplet.
    // rhill 2011-05-26: It is more efficient to calculate in-place
    // rather than getting the resulting circumscribed circle from an
    // object returned by calling Voronoi.circumcircle()
    // http://mathforum.org/library/drmath/view/55002.html
    // Except that I bring the origin at cSite to simplify calculations.
    // The bottom-most part of the circumcircle is our Fortune 'circle
    // event', and its center is a vertex potentially part of the final
    // Voronoi diagram.
    const bx = center.x;
    const by = center.y;
    const ax = left.x - bx;
    const ay = left.y - by;
    const cx = right.x - bx;
    const cy = right.y - by;

    // If points l->c->r are clockwise, then center beach section does not
    // collapse, hence it can't end up as a vertex (we reuse 'd' here, which
    // sign is reverse of the orientation, hence we reverse the test.
    // http://en.wikipedia.org/wiki/Curve_orientation#Orientation_of_a_simple_polygon
    // rhill 2011-05-21: Nasty finite precision error which caused circumcircle() to
    // return infinites: 1e-12 seems to fix the problem.
    const d = 2 * (ax * cy - ay * cx);
    if (d >= -2e-12) return;

    const ha = ax * ax + ay * ay;
    const hc = cx * cx + cy * cy;
    const x = (cy * ha - ay * hc) / d;
    const y = (ax * hc - cx * ha) / d;
    const ycenter = y + by;

    // Important: ybottom should always be under or at sweep, so no need
    // to waste CPU cycles by checking

    // recycle circle event object if possible
    let circleEvent: CircleEvent = {} as Point;
    circleEvent.arc = arc;
    circleEvent.site = center;
    circleEvent.x = x + bx;
    circleEvent.y = ycenter + Math.sqrt(x * x + y * y); // y bottom
    circleEvent.ycenter = ycenter;
    arc.circleEvent = circleEvent;

    // find insertion point in RB-tree: circle events are ordered from
    // smallest to largest
    let predecessor = null;
    let node = this.circleEvents.root;
    while (node) {
      if (Point.compare(circleEvent, node) > 0) {
        if (node.rbLeft) node = node.rbLeft;
        else {
          predecessor = node.rbPrevious;
          break;
        }
      } else {
        if (node.rbRight) node = node.rbRight;
        else {
          predecessor = node;
          break;
        }
      }
    }
    this.circleEvents.insertSuccessor(predecessor, circleEvent);
    if (!predecessor) this.firstCircleEvent = circleEvent;
  }
  detachCircleEvent(arc: BeachSection & RBTreeNode<BeachSection>): void {
    const circle: CircleEvent & RBTreeNode<CircleEvent> = arc.circleEvent;
    if (!circle) return;

    if (!circle.rbPrevious) this.firstCircleEvent = circle.rbNext;
    this.circleEvents.removeNode(circle); // remove from RB-tree
    arc.circleEvent = null;
  }
}

//#region Point Functions
function pointsEqualWithEpsilon(a: Point, b: Point): boolean {
  return equalWithEpsilon(a.x, b.x) && equalWithEpsilon(a.y, b.y);
}
//#endregion

class BeachSection {
  site: Site;
  circleEvent: CircleEvent;
  edge: Edge;
}

interface CircleEvent extends Point {
  ycenter?: number;
  site?: Site;
  arc?: BeachSection & RBTreeNode<BeachSection>;
}

interface Site extends Point {
  cell?: Cell;
}

export class Vertex extends Point {
  edges: Set<Edge>;
  cells: Cell[];
  constructor(x: number, y: number) {
    super(x, y);
    this.edges = new Set();
    this.cells = [];
  }

  get neighbors(): Vertex[] {
    const neighbors: Vertex[] = [];
    for (const edge of this.edges) {
      if (this === edge.start) neighbors.push(edge.end);
      else neighbors.push(edge.start);
    }
    return neighbors;
  }
}

//#region Vertex Functions
function createVertex(x: number, y: number, diagram: Diagram, edge?: Edge): Vertex {
  const vertex = new Vertex(x, y);
  diagram.vertices.push(vertex);
  if (edge) addVertex(vertex, edge);
  return vertex;
}
function addVertex(vertex: Vertex, edge: Edge): void {
  vertex.edges.add(edge);
  if (edge.left) edge.left.cell.vertices.push(vertex);
  if (edge.right) edge.right.cell.vertices.push(vertex);
}
function removeVertex(vertex: Vertex, edge: Edge): void {
  if (!vertex) return;
  vertex.edges.delete(edge);
}
//#endregion

export class Edge extends LineSegment {
  left: Site;
  right: Site;

  start: Vertex;
  end: Vertex;

  constructor(left: Site, right: Site) {
    super(null, null);
    this.left = left;
    this.right = right;
  }
}

//#region Edge Functions
function setEdgeStart(edge: Edge, left: Site, right: Site, vertex: Vertex): void {
  if (edge.start || edge.end) {
    if (edge.left === right) edge.end = vertex;
    else edge.start = vertex;
  } else {
    edge.start = vertex;
    edge.left = left;
    edge.right = right;
  }
  addVertex(vertex, edge);
}
function setEdgeEnd(edge: Edge, left: Site, right: Site, vertex: Vertex): void {
  setEdgeStart(edge, right, left, vertex);
}

// connect dangling edges (not if a cursory test tells us
// it is not going to be visible.
// return value:
//   false: the dangling endpoint couldn't be connected
//   true: the dangling endpoint could be connected
function connectEdgeToBounds(diagram: Diagram, edge: Edge, aabb: AABB): boolean {
  // skip if end point already connected
  if (edge.end) return true;

  const { min, max } = aabb;

  // make local copy for performance purpose
  const { left, right } = edge;
  const avg = Point.midpoint(left, right);

  // remember, direction of line (relative to left site):
  // upward: left.x < right.x
  // downward: left.x > right.x
  // horizontal: left.x == right.x
  // upward: left.x < right.x
  // rightward: left.y < right.y
  // leftward: left.y > right.y
  // vertical: left.y == right.y

  // depending on the direction, find the best side of the
  // bounding box to use to determine a reasonable start point

  // special case: vertical line
  if (right.y === left.y) {
    // doesn't intersect with viewport
    if (avg.x < min.x || avg.x >= max.x) return false;

    // downward
    if (left.x > right.x) {
      if (!edge.start) edge.start = createVertex(avg.x, min.y, diagram, edge);
      else if (edge.start.y >= max.y) return false;

      edge.end = createVertex(avg.x, max.y, diagram, edge);
    }
    // upward
    else {
      if (!edge.start) edge.start = createVertex(avg.x, max.y, diagram, edge);
      else if (edge.start.y < min.y) return false;

      edge.end = createVertex(avg.x, min.y, diagram, edge);
    }
  } else {
    // get the line equation of the bisector
    const fm = (left.x - right.x) / (right.y - left.y);
    const fb = avg.y - fm * avg.x;
    // closer to vertical than horizontal, connect start point to the
    // top or bottom side of the bounding box
    if (fm < -1 || fm > 1) {
      // downward
      if (left.x > right.x) {
        if (!edge.start) edge.start = createVertex((min.y - fb) / fm, min.y, diagram, edge);
        else if (edge.start.y >= max.y) return false;

        edge.end = createVertex((max.y - fb) / fm, max.y, diagram, edge);
      }
      // upward
      else {
        if (!edge.start) edge.start = createVertex((max.y - fb) / fm, max.y, diagram, edge);
        else if (edge.start.y < min.y) return false;

        edge.end = createVertex((min.y - fb) / fm, min.y, diagram, edge);
      }
    }
    // closer to horizontal than vertical, connect start point to the
    // left or right side of the bounding box
    else {
      // rightward
      if (left.y < right.y) {
        if (!edge.start) edge.start = createVertex(min.x, fm * min.x + fb, diagram, edge);
        else if (edge.start.x >= max.x) return false;

        edge.end = createVertex(max.x, fm * max.x + fb, diagram, edge);
      }
      // leftward
      else {
        if (!edge.start) edge.start = createVertex(max.x, fm * max.x + fb, diagram, edge);
        else if (edge.start.x < min.x) return false;

        edge.end = createVertex(min.x, fm * min.x + fb, diagram, edge);
      }
    }
  }
  return true;
}

// line-clipping code taken from:
//   Liang-Barsky function by Daniel White
//   http://www.skytopia.com/project/articles/compsci/clipping.html
// Thanks!
// A bit modified to minimize code paths
function clipEdgeToBounds(diagram: Diagram, edge: Edge, aabb: AABB): boolean {
  const { min, max } = aabb;

  const delta = Point.subtract(edge.end, edge.start);
  let t0 = 0;
  let t1 = 1;

  const edgeIsInBounds = (p: number, q: number) => {
    if (p === 0 && q < 0) return false;

    let r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      else if (r > t0) t0 = r;
    } else if (p > 0) {
      if (r < t0) return false;
      else if (r < t1) t1 = r;
    }
    return true;
  };
  // left
  if (!edgeIsInBounds(-delta.x, edge.start.x - min.x)) return false;
  // right
  if (!edgeIsInBounds(delta.x, max.x - edge.start.x)) return false;
  // bottom
  if (!edgeIsInBounds(-delta.y, edge.start.y - min.y)) return false;
  // top
  if (!edgeIsInBounds(delta.y, max.y - edge.start.y)) return false;

  // if we reach this point, Voronoi edge is within bbox

  // if t0 > 0, va needs to change
  // rhill 2011-06-03: we need to create a new vertex rather
  // than modifying the existing one, since the existing
  // one is likely shared with at least another edge
  if (t0 > 0) {
    removeVertex(edge.start, edge);
    edge.start = createVertex(edge.start.x + t0 * delta.x, edge.start.y + t0 * delta.y, diagram, edge);
  }

  // if t1 < 1, vb needs to change
  // rhill 2011-06-03: we need to create a new vertex rather
  // than modifying the existing one, since the existing
  // one is likely shared with at least another edge
  if (t1 < 1) {
    removeVertex(edge.end, edge);
    edge.end = createVertex(edge.start.x + t1 * delta.x, edge.start.y + t1 * delta.y, diagram, edge);
  }

  return true;
}
//#endregion

class CellEdge {
  site: Site;
  sharedEdge: Edge;
  angle: number;

  constructor(site: Site, sharedEdge: Edge, other?: Site) {
    this.site = site;
    this.sharedEdge = sharedEdge;

    // 'angle' is a value to be used for properly sorting the
    // halfsegments counterclockwise. By convention, we will
    // use the angle of the line defined by the 'site to the left'
    // to the 'site to the right'.
    // However, border edges have no 'site to the right': thus we
    // use the angle of line perpendicular to the halfsegment (the
    // edge should have both end points defined in such case.)
    if (other) this.angle = Math.atan2(other.y - site.y, other.x - site.x);
    else {
      const start = this.start;
      const end = this.end;
      this.angle = Math.atan2(end.x - start.x, start.y - end.y);
    }
  }

  get length(): number {
    return this.sharedEdge.length;
  }

  get start(): Vertex {
    return this.sharedEdge.left === this.site ? this.sharedEdge.start : this.sharedEdge.end;
  }
  get end(): Vertex {
    return this.sharedEdge.left === this.site ? this.sharedEdge.end : this.sharedEdge.start;
  }
}

//#region CellEdge Functions
function compareCellEdges(a: CellEdge, b: CellEdge): number {
  return b.angle - a.angle;
}
//#endregion

export class Cell {
  site: Site;
  edges: CellEdge[];
  vertices: Vertex[];

  constructor(site: Site) {
    this.site = site;
    this.edges = [];
    this.vertices = [];
  }

  get triangles(): Triangle[] {
    return this.edges.map(edge => new Triangle(this.site, edge.start, edge.end));
  }

  get perimeter(): number {
    return this.edges.reduce((area, edge) => {
      return area + edge.length;
    }, 0);
  }
  get area(): number {
    return this.triangles.reduce((area, tri) => {
      return area + tri.area;
    }, 0);
  }
  get centroid(): Point {
    const centroid = new Point(0, 0);
    this.triangles.forEach(tri => {
      let circum = tri.circumcenter;
      if (!circum) return;
      centroid.x += circum.x * tri.area;
      centroid.y += circum.y * tri.area;
    });
    centroid.x /= this.area;
    centroid.y /= this.area;
    return centroid;
  }

  get neighbors(): Cell[] {
    return this.edges
      .map(edge => {
        if (edge.sharedEdge.left === this.site && edge.sharedEdge.right) return edge.sharedEdge.right.cell;
        else if (edge.sharedEdge.left) return edge.sharedEdge.left.cell;
      })
      .filter(neighbor => neighbor);
  }

  get boundingAABB(): AABB {
    const aabb = new AABB(new Point(Infinity, Infinity), new Point(Infinity, Infinity));
    this.edges.forEach(edge => {
      const start = edge.start;
      if (start.x < aabb.min.x) aabb.min.x = start.x;
      else if (start.x > aabb.max.x) aabb.max.x = start.x;
      if (start.y < aabb.min.y) aabb.min.y = start.y;
      else if (start.y > aabb.max.y) aabb.max.y = start.y;
    });
    return aabb;
  }

  contains(point: Point): boolean {
    for (let i = 0; i < this.edges.length; ++i) {
      const edge = this.edges[i];
      const start = edge.start;
      const end = edge.end;
      const cross = (point.y - start.y) * (end.x - start.x) - (point.x - start.x) * (end.y - start.y);
      if (cross >= 0) return false;
    }
    return true;
  }
}

export default class Diagram {
  sites: Site[];
  vertices: Vertex[];
  edges: Edge[];
  cells: Cell[];

  execTime: number;

  _finished: boolean;

  constructor(sites?: Point[]) {
    this.sites = [];
    this.vertices = [];
    this.edges = [];
    this.cells = [];
    new VoronoiGenerator().compute(sites, this);
  }

  getRelaxedSites(t: number = 1): Site[] {
    if (!this._finished) return;
    return this.sites.map(site => {
      const newPoint = site.cell.centroid;
      const x = site.x * (1 - t) + newPoint.x * t;
      const y = site.y * (1 - t) + newPoint.y * t;
      return { ...site, x, y } as Site;
    });
  }

  // Connect/cut edges at bounding box and close the cells.
  // The cells are bound by the supplied bounding box.
  // Each cell refers to its associated site, and a list
  // of halfedges ordered counterclockwise.
  finish(aabb: AABB): void {
    const { min, max } = aabb;
    // connect all dangling edges to bounding box
    // or get rid of them if it can't be done
    this.edges = this.edges.filter(edge => {
      // edge is removed if:
      //   it is wholly outside the bounding box
      //   it is actually a point rather than a line
      if (connectEdgeToBounds(this, edge, aabb) && clipEdgeToBounds(this, edge, aabb)) {
        if (!pointsEqualWithEpsilon(edge.start, edge.end)) return true;
      }
      removeVertex(edge.start, edge);
      removeVertex(edge.end, edge);
      delete edge.start;
      delete edge.end;
      return false;
    });

    // prune, order halfedges, then add missing ones
    // required to close cells

    this.cells = this.cells.filter(cell => {
      // trim non fully-defined halfedges and sort them counterclockwise
      cell.edges = cell.edges.filter(edge => edge.start && edge.end);
      cell.edges.sort(compareCellEdges);
      if (!cell.edges.length) {
        cell.site = undefined;
        return false;
      }
      // close open cells
      // step 1: find first 'unclosed' point, if any.
      // an 'unclosed' point will be the end point of a halfedge which
      // does not match the start point of the following halfedge
      // special case: only one site, in which case, the viewport is the cell
      // ...
      // all other cases
      for (let i = 0; i < cell.edges.length; ++i) {
        let end = cell.edges[i].end;
        let start = cell.edges[(i + 1) % cell.edges.length].start;
        // if start point equals end point, we don't need to do anything
        if (pointsEqualWithEpsilon(end, start)) continue;
        // if we reach this point, cell needs to be closed by walking
        // counterclockwise along the bounding box until it connects
        // to next halfedge in the list
        const edge = new Edge(cell.site, null);
        edge.start = end;
        this.edges.push(edge);
        // walk downward along left side
        if (equalWithEpsilon(end.x, min.x) && lessThanWithEpsilon(end.y, max.y)) {
          edge.end = createVertex(min.x, equalWithEpsilon(start.x, min.x) ? start.y : max.y, this, edge);
        }
        // walk rightward along bottom side
        else if (equalWithEpsilon(end.y, max.y) && lessThanWithEpsilon(end.x, max.x)) {
          edge.end = createVertex(equalWithEpsilon(start.y, max.y) ? start.x : max.x, max.y, this, edge);
        }
        // walk upward along right side
        else if (equalWithEpsilon(end.x, max.x) && greaterThanWithEpsilon(end.y, min.y)) {
          edge.end = createVertex(max.x, equalWithEpsilon(start.x, max.x) ? start.y : min.y, this, edge);
        }
        // walk leftward along top side
        else if (equalWithEpsilon(end.y, min.y) && greaterThanWithEpsilon(end.x, min.x)) {
          edge.end = createVertex(equalWithEpsilon(start.y, min.y) ? start.x : min.x, min.y, this, edge);
        } else return false;
        if (i > 1000) {
          console.log(cell.edges);
          return false;
        }
        cell.edges.splice(i + 1, 0, new CellEdge(cell.site, edge));
      }
      cell.vertices = cell.vertices.filter(vertex => vertex.edges.size);
      cell.vertices.forEach(vertex => vertex.cells.push(cell));
      return true;
    });
    this.sites = this.cells.map(cell => cell.site);
    this.vertices = this.vertices.filter(vertex => vertex.edges.size);
    this._finished = true;
  }
}
