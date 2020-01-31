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
  lSite: the Voronoi site object at the left of this Voronoi.Edge object.
  rSite: the Voronoi site object at the right of this Voronoi.Edge object (can be null).
  va: an object with an 'x' and a 'y' property defining the start point
    (relative to the Voronoi site on the left) of this Voronoi.Edge object.
  vb: an object with an 'x' and a 'y' property defining the end point
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

TODO: Identify opportunities for performance improvement.
TODO: Let the user close the Voronoi cells, do not do it automatically. Not only let
      him close the cells, but also allow him to close more than once using a different
      bounding box for the same Voronoi diagram.
*/

/*global Math */

class Voronoi {
  constructor() {
    this.diagram = null;
    this.beachsectionJunkyard = [];
    this.circleEventJunkyard = [];
  }

  static equalWithEpsilon(a, b) {
    return Math.abs(a - b) < Voronoi.EPSILON;
  }
  static greaterThanWithEpsilon(a, b) {
    return a - b > Voronoi.EPSILON;
  }
  static greaterThanOrEqualWithEpsilon(a, b) {
    return b - a < Voronoi.EPSILON;
  }
  static lessThanOrEqualWithEpsilon(a, b) {
    return a - b < Voronoi.EPSILON;
  }
  static lessThanWithEpsilon(a, b) {
    return b - a > Voronoi.EPSILON;
  }

  reset() {
    if (!this.beachline) this.beachline = new Voronoi.RBTree();
    // Move leftover beachsections to the beachsection junkyard.
    if (this.beachline.root) {
      let beachsection = this.beachline.getFirst(this.beachline.root);
      while (beachsection) {
        this.beachsectionJunkyard.push(beachsection); // mark for reuse
        beachsection = beachsection.rbNext;
      }
    }
    this.beachline.root = null;
    if (!this.circleEvents) this.circleEvents = new Voronoi.RBTree();
    this.circleEvents.root = this.firstCircleEvent = null;
    this.diagram = new Voronoi.Diagram();
  }

  // this create and add an edge to internal collection, and also create
  // two halfedges which are added to each site's counterclockwise array
  // of halfedges.
  createEdge(left, right, vertexA, vertexB) {
    const edge = new Voronoi.Edge(left, right);
    this.diagram.edges.push(edge);
    if (vertexA) Voronoi.Edge.setStartpoint(edge, left, right, vertexA);
    if (vertexB) Voronoi.Edge.setEndpoint(edge, left, right, vertexB);
    this.diagram.cells[left.cellId].halfedges.push(new Voronoi.Halfedge(edge, left, right));
    this.diagram.cells[right.cellId].halfedges.push(new Voronoi.Halfedge(edge, right, left));
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
  createBeachsection(site) {
    let beachsection = this.beachsectionJunkyard.pop();
    if (!beachsection) beachsection = new Voronoi.Beachsection();
    beachsection.site = site;
    return beachsection;
  }

  // calculate the left break point of a particular beach section,
  // given a particular sweep line
  leftBreakPoint(arc, directrix) {
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
  rightBreakPoint(arc, directrix) {
    if (arc.rbNext) return this.leftBreakPoint(arc.rbNext, directrix);
    return arc.site.y === directrix ? arc.site.x : Infinity;
  }
  detachBeachsection(beachsection) {
    this.detachCircleEvent(beachsection); // detach potentially attached circle event
    this.beachline.rbRemoveNode(beachsection); // remove from RB-tree
    this.beachsectionJunkyard.push(beachsection); // mark for reuse
  }
  removeBeachsection(beachsection) {
    const { x, ycenter: y } = beachsection.circleEvent;
    const vertex = new Voronoi.Vertex(x, y);
    const disappearingTransitions = [beachsection];
    let previous = beachsection.rbPrevious;
    let next = beachsection.rbNext;

    // remove collapsed beachsection from beachline
    this.detachBeachsection(beachsection);

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
      Voronoi.equalWithEpsilon(x, lArc.circleEvent.x) &&
      Voronoi.equalWithEpsilon(y, lArc.circleEvent.ycenter)
    ) {
      previous = lArc.rbPrevious;
      disappearingTransitions.unshift(lArc);
      this.detachBeachsection(lArc); // mark for reuse
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
      Voronoi.equalWithEpsilon(x, rArc.circleEvent.x) &&
      Voronoi.equalWithEpsilon(y, rArc.circleEvent.ycenter)
    ) {
      next = rArc.rbNext;
      disappearingTransitions.push(rArc);
      this.detachBeachsection(rArc); // mark for reuse
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
      Voronoi.Edge.setStartpoint(rArc.edge, lArc.site, rArc.site, vertex);
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
  addBeachsection(site) {
    const { x, y: directrix } = site;

    // find the left and right beach sections which will surround the newly
    // created beach section.
    // rhill 2011-06-01: This loop is one of the most often executed,
    // hence we expand in-place the comparison-against-epsilon calls.
    let leftArc, rightArc;
    let node = this.beachline.root;
    while (node) {
      const dxl = this.leftBreakPoint(node, directrix) - x;
      // x lessThanWithEpsilon xl => falls somewhere before the left edge of the beachsection
      if (dxl > 1e-9) {
        // this case should never happen
        // if (!node.rbLeft) {
        //	rArc = node.rbLeft;
        //	break;
        //	}
        node = node.rbLeft;
      } else {
        const dxr = x - this.rightBreakPoint(node, directrix);
        // x greaterThanWithEpsilon xr => falls somewhere after the right edge of the beachsection
        if (dxr > 1e-9) {
          if (!node.rbRight) {
            leftArc = node;
            break;
          }
          node = node.rbRight;
        } else {
          // x equalWithEpsilon xl => falls exactly on the left edge of the beachsection
          if (dxl > -1e-9) {
            leftArc = node.rbPrevious;
            rightArc = node;
          }
          // x equalWithEpsilon xr => falls exactly on the right edge of the beachsection
          else if (dxr > -1e-9) {
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
    const newArc = this.createBeachsection(site);
    this.beachline.rbInsertSuccessor(leftArc, newArc);

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
      rightArc = this.createBeachsection(leftArc.site);
      this.beachline.rbInsertSuccessor(newArc, rightArc);

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

      b.h = b.x * b.x + b.y * b.y;
      c.h = c.x * c.x + c.y * c.y;

      const vertex = new Voronoi.Vertex((c.y * b.h - b.y * c.h) / d + a.x, (b.x * c.h - c.x * b.h) / d + a.y);

      // one transition disappear
      Voronoi.Edge.setStartpoint(rightArc.edge, leftArc.site, rightArc.site, vertex);

      // two new transitions appear at the new vertex location
      newArc.edge = this.createEdge(leftArc.site, site, undefined, vertex);
      rightArc.edge = this.createEdge(site, rightArc.site, undefined, vertex);

      // check whether the left and right beach sections are collapsing
      // and if so create circle events, to handle the point of collapse.
      this.attachCircleEvent(leftArc);
      this.attachCircleEvent(rightArc);
      return;
    }
  }

  // ---------------------------------------------------------------------------
  // Circle event methods
  attachCircleEvent(arc) {
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
    let circleEvent = this.circleEventJunkyard.pop();
    if (!circleEvent) circleEvent = new Voronoi.CircleEvent();
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
      if (Voronoi.Vertex.compare(circleEvent, node) > 0) {
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
    this.circleEvents.rbInsertSuccessor(predecessor, circleEvent);
    if (!predecessor) this.firstCircleEvent = circleEvent;
  }
  detachCircleEvent(arc) {
    const circle = arc.circleEvent;
    if (circle) {
      if (!circle.rbPrevious) this.firstCircleEvent = circle.rbNext;
      this.circleEvents.rbRemoveNode(circle); // remove from RB-tree
      this.circleEventJunkyard.push(circle);
      arc.circleEvent = null;
    }
  }

  // ---------------------------------------------------------------------------
  // Top-level Fortune loop
  compute(sites) {
    if (!sites || sites.length < 1) throw Error('no sites provided');
    // to measure execution time
    const startTime = new Date();

    // init internal state
    this.reset();

    // Initialize site event queue
    const siteEvents = Array.from(sites).sort(Voronoi.Vertex.compare);

    // process queue
    let site = siteEvents.pop();
    let circle;
    // to avoid duplicate sites
    const lastSite = {
      x: Number.NEGATIVE_INFINITY,
      y: Number.NEGATIVE_INFINITY,
    };
    let siteid = 0;
    // main loop
    while (site || circle) {
      // we need to figure whether we handle a site or circle event
      // for this we find out if there is a site event and it is
      // 'earlier' than the circle event
      circle = this.firstCircleEvent;

      // add beach section
      if (site && (!circle || Voronoi.Vertex.compare(site, circle) > 0)) {
        // only if site is not a duplicate
        if (!Voronoi.Vertex.equal(site, lastSite)) {
          // first create cell for new site
          this.diagram.cells[siteid] = new Voronoi.Cell(site);
          site.cellId = siteid++;
          // then create a beachsection for that site
          this.addBeachsection(site);
          // remember last site coords to detect duplicate
          lastSite.y = site.y;
          lastSite.x = site.x;
        }
        site = siteEvents.pop();
      }
      // remove beach section
      else if (circle) {
        this.removeBeachsection(circle.arc);
      }
    }

    this.diagram.execTime = Date.now() - startTime.getTime();
    // prepare return values
    const result = this.diagram;

    // clean up
    this.reset();

    return result;
  }
}
Voronoi.EPSILON = 1e-9;

// ---------------------------------------------------------------------------
// Red-Black tree code (based on C version of "rbtree" by Franck Bui-Huu
// https://github.com/fbuihuu/libtree/blob/master/rb.c

// rhill 2011-05-19:
//   Voronoi sites are kept client-side now, to allow
//   user to freely modify content. At compute time,
//   *references* to sites are copied locally.

Voronoi.RBTree = class {
  constructor() {
    this.root = null;
  }
  rbInsertSuccessor(node, successor) {
    let parent;
    if (node) {
      // >>> rhill 2011-05-27: Performance: cache previous/next nodes
      successor.rbPrevious = node;
      successor.rbNext = node.rbNext;
      if (node.rbNext) node.rbNext.rbPrevious = successor;
      node.rbNext = successor;
      // <<<
      if (node.rbRight) {
        // in-place expansion of node.rbRight.getFirst();
        node = node.rbRight;
        while (node.rbLeft) node = node.rbLeft;
        node.rbLeft = successor;
      } else node.rbRight = successor;
      parent = node;
    }
    // rhill 2011-06-07: if node is null, successor must be inserted
    // to the left-most part of the tree
    else if (this.root) {
      node = this.getFirst(this.root);
      // >>> Performance: cache previous/next nodes
      successor.rbPrevious = null;
      successor.rbNext = node;
      node.rbPrevious = successor;
      // <<<
      node.rbLeft = successor;
      parent = node;
    } else {
      // >>> Performance: cache previous/next nodes
      successor.rbPrevious = successor.rbNext = null;
      // <<<
      this.root = successor;
      parent = null;
    }
    successor.rbLeft = successor.rbRight = null;
    successor.rbParent = parent;
    successor.rbRed = true;
    // Fixup the modified tree by recoloring nodes and performing
    // rotations (2 at most) hence the red-black tree properties are
    // preserved.
    node = successor;
    while (parent && parent.rbRed) {
      const grandpa = parent.rbParent;
      if (parent === grandpa.rbLeft) {
        const uncle = grandpa.rbRight;
        if (uncle && uncle.rbRed) {
          parent.rbRed = uncle.rbRed = false;
          grandpa.rbRed = true;
          node = grandpa;
        } else {
          if (node === parent.rbRight) {
            this.rbRotateLeft(parent);
            node = parent;
            parent = node.rbParent;
          }
          parent.rbRed = false;
          grandpa.rbRed = true;
          this.rbRotateRight(grandpa);
        }
      } else {
        const uncle = grandpa.rbLeft;
        if (uncle && uncle.rbRed) {
          parent.rbRed = uncle.rbRed = false;
          grandpa.rbRed = true;
          node = grandpa;
        } else {
          if (node === parent.rbLeft) {
            this.rbRotateRight(parent);
            node = parent;
            parent = node.rbParent;
          }
          parent.rbRed = false;
          grandpa.rbRed = true;
          this.rbRotateLeft(grandpa);
        }
      }
      parent = node.rbParent;
    }
    this.root.rbRed = false;
  }
  rbRemoveNode(node) {
    // >>> rhill 2011-05-27: Performance: cache previous/next nodes
    if (node.rbNext) node.rbNext.rbPrevious = node.rbPrevious;
    if (node.rbPrevious) node.rbPrevious.rbNext = node.rbNext;
    node.rbNext = node.rbPrevious = null;
    // <<<
    let { rbParent: parent, rbLeft: left, rbRight: right } = node;
    let next = !left ? right : !right ? left : this.getFirst(right);
    if (parent) {
      if (parent.rbLeft === node) parent.rbLeft = next;
      else parent.rbRight = next;
    } else this.root = next;

    // enforce red-black rules
    let isRed;
    if (left && right) {
      isRed = next.rbRed;
      next.rbRed = node.rbRed;
      next.rbLeft = left;
      left.rbParent = next;
      if (next !== right) {
        parent = next.rbParent;
        next.rbParent = node.rbParent;
        node = next.rbRight;
        parent.rbLeft = node;
        next.rbRight = right;
        right.rbParent = next;
      } else {
        next.rbParent = parent;
        parent = next;
        node = next.rbRight;
      }
    } else {
      isRed = node.rbRed;
      node = next;
    }
    // 'node' is now the sole successor's child and 'parent' its
    // new parent (since the successor can have been moved)
    if (node) node.rbParent = parent;
    // the 'easy' cases
    if (isRed) return;
    if (node && node.rbRed) {
      node.rbRed = false;
      return;
    }
    // the other cases
    let sibling;
    do {
      if (node === this.root) break;
      if (node === parent.rbLeft) {
        sibling = parent.rbRight;
        if (sibling.rbRed) {
          sibling.rbRed = false;
          parent.rbRed = true;
          this.rbRotateLeft(parent);
          sibling = parent.rbRight;
        }
        if ((sibling.rbLeft && sibling.rbLeft.rbRed) || (sibling.rbRight && sibling.rbRight.rbRed)) {
          if (!sibling.rbRight || !sibling.rbRight.rbRed) {
            sibling.rbLeft.rbRed = false;
            sibling.rbRed = true;
            this.rbRotateRight(sibling);
            sibling = parent.rbRight;
          }
          sibling.rbRed = parent.rbRed;
          parent.rbRed = sibling.rbRight.rbRed = false;
          this.rbRotateLeft(parent);
          node = this.root;
          break;
        }
      } else {
        sibling = parent.rbLeft;
        if (sibling.rbRed) {
          sibling.rbRed = false;
          parent.rbRed = true;
          this.rbRotateRight(parent);
          sibling = parent.rbLeft;
        }
        if ((sibling.rbLeft && sibling.rbLeft.rbRed) || (sibling.rbRight && sibling.rbRight.rbRed)) {
          if (!sibling.rbLeft || !sibling.rbLeft.rbRed) {
            sibling.rbRight.rbRed = false;
            sibling.rbRed = true;
            this.rbRotateLeft(sibling);
            sibling = parent.rbLeft;
          }
          sibling.rbRed = parent.rbRed;
          parent.rbRed = sibling.rbLeft.rbRed = false;
          this.rbRotateRight(parent);
          node = this.root;
          break;
        }
      }
      sibling.rbRed = true;
      node = parent;
      parent = parent.rbParent;
    } while (!node.rbRed);
    if (node) node.rbRed = false;
  }
  rbRotateLeft(node) {
    const p = node;
    const { rbRight: q, rbParent: parent } = node;
    if (parent) {
      if (parent.rbLeft === p) parent.rbLeft = q;
      else parent.rbRight = q;
    } else this.root = q;
    q.rbParent = parent;
    p.rbParent = q;
    p.rbRight = q.rbLeft;
    if (p.rbRight) p.rbRight.rbParent = p;
    q.rbLeft = p;
  }
  rbRotateRight(node) {
    const p = node;
    const { rbLeft: q, rbParent: parent } = node;
    if (parent) {
      if (parent.rbLeft === p) parent.rbLeft = q;
      else parent.rbRight = q;
    } else this.root = q;
    q.rbParent = parent;
    p.rbParent = q;
    p.rbLeft = q.rbRight;
    if (p.rbLeft) p.rbLeft.rbParent = p;
    q.rbRight = p;
  }
  getFirst(node) {
    while (node.rbLeft) node = node.rbLeft;
    return node;
  }
  getLast(node) {
    while (node.rbRight) node = node.rbRight;
    return node;
  }
};

// ---------------------------------------------------------------------------
// Diagram methods

Voronoi.Diagram = class {
  constructor() {
    // this.sites = undefined
    this.edges = [];
    this.cells = [];
  }
  get relaxedSites() {
    return this.cells.map(cell => ({ ...cell.site, x: cell.centroid.x, y: cell.centroid.y }));
  }

  // Connect/cut edges at bounding box and close the cells.
  // The cells are bound by the supplied bounding box.
  // Each cell refers to its associated site, and a list
  // of halfedges ordered counterclockwise.
  finish(bbox) {
    const { xl, xr, yb, yt } = bbox;
    // connect all dangling edges to bounding box
    // or get rid of them if it can't be done
    this.edges = this.edges.filter(edge => {
      // edge is removed if:
      //   it is wholly outside the bounding box
      //   it is actually a point rather than a line
      if (Voronoi.Edge.connectToBounds(edge, bbox) && Voronoi.Edge.clipToBounds(edge, bbox))
        if (!Voronoi.Vertex.equalWithEpsilon(edge.vertexA, edge.vertexB)) return true;
      delete edge.vertexA;
      delete edge.vertexB;
      return false;
    });

    // prune, order halfedges, then add missing ones
    // required to close cells

    this.cells = this.cells.filter(cell => {
      // trim non fully-defined halfedges and sort them counterclockwise
      cell.halfedges = cell.halfedges.filter(he => he.edge.vertexA || he.edge.vertexB);
      cell.halfedges.sort(Voronoi.Halfedge.compare);
      let hedges = cell.halfedges;
      if (!hedges.length) return false;
      // close open cells
      // step 1: find first 'unclosed' point, if any.
      // an 'unclosed' point will be the end point of a halfedge which
      // does not match the start point of the following halfedge
      // special case: only one site, in which case, the viewport is the cell
      // ...
      // all other cases
      for (let i = 0; i < hedges.length; ++i) {
        let end = hedges[i].end;
        let start = hedges[(i + 1) % hedges.length].start;
        // if end point is not equal to start point, we need to add the missing
        // halfedge(s) to close the cell
        if (Voronoi.Vertex.equalWithEpsilon(start, end)) continue;
        // if we reach this point, cell needs to be closed by walking
        // counterclockwise along the bounding box until it connects
        // to next halfedge in the list
        const edge = new Voronoi.Edge(cell.site, null);
        edge.vertexA = end;
        this.edges.push(edge);
        // walk downward along left side
        if (Voronoi.equalWithEpsilon(end.x, xl) && Voronoi.lessThanWithEpsilon(end.y, yt)) {
          edge.vertexB = new Voronoi.Vertex(xl, Voronoi.equalWithEpsilon(start.x, xl) ? start.y : yt);
        }
        // walk rightward along bottom side
        else if (Voronoi.equalWithEpsilon(end.y, yt) && Voronoi.lessThanWithEpsilon(end.x, xr)) {
          edge.vertexB = new Voronoi.Vertex(Voronoi.equalWithEpsilon(start.y, yt) ? start.x : xr, yt);
        }
        // walk upward along right side
        else if (Voronoi.equalWithEpsilon(end.x, xr) && Voronoi.greaterThanWithEpsilon(end.y, yb)) {
          edge.vertexB = new Voronoi.Vertex(xr, Voronoi.equalWithEpsilon(start.x, xr) ? start.y : yb);
        }
        // walk leftward along top side
        else if (Voronoi.equalWithEpsilon(end.y, yb) && Voronoi.greaterThanWithEpsilon(end.x, xl)) {
          edge.vertexB = new Voronoi.Vertex(Voronoi.equalWithEpsilon(start.y, yb) ? start.x : xl, yb);
        }
        hedges.splice(i + 1, 0, new Voronoi.Halfedge(edge, cell.site, null));
      }
      return true;
    });
    this.sites = this.cells.map(cell => cell.site);
  }
};

// ---------------------------------------------------------------------------
// Cell methods

Voronoi.Cell = class {
  constructor(site) {
    this.site = site;
    this.halfedges = [];
    //this._triangles = undefined;
    // this._perimeter = undefined;
    // this._area = undefined;
    // this._centroid = undefined;
  }
  get triangles() {
    if (this._triangles == null) {
      this._triangles = this.halfedges.map(he => new Triangle(this.site, he.edge.vertexA, he.edge.vertexB));
    }
    return this._triangles;
  }
  get perimeter() {
    if (this._perimeter == null) {
      this._perimeter = this.halfedges.reduce((area, he) => {
        return area + he.edge.length;
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
      const circum = new Voronoi.Vertex(0, 0);
      this.triangles.forEach(tri => {
        if (!tri.circumcenter) return;
        circum.x += tri.circumcenter.x * tri.area;
        circum.y += tri.circumcenter.y * tri.area;
      });
      this._centroid = new Voronoi.Vertex(circum.x / this.area, circum.y / this.area);
    }
    return this._centroid;
  }
};

// ---------------------------------------------------------------------------
// Edge methods
//

Voronoi.Vertex = class {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  static compare(a, b) {
    let r = b.y - a.y;
    if (r) return r;
    return b.x - a.x;
  }
  static equal(a, b) {
    return a.x === b.x && a.y === b.y;
  }
  static equalWithEpsilon(a, b) {
    return Voronoi.equalWithEpsilon(a.x, b.x) && Voronoi.equalWithEpsilon(a.y, b.y);
  }
};

Voronoi.Edge = class {
  constructor(left, right) {
    this.left = left;
    this.right = right;
    this.vertexA = undefined;
    this.vertexB = undefined;
  }
  get length() {
    if (!this.vertexA || !this.vertexB) return;
    const x = this.vertexA.x - this.vertexB.x;
    const y = this.vertexA.y - this.vertexB.y;
    return Math.sqrt(x * x + y * y);
  }
  static setStartpoint(edge, left, right, vertex) {
    if (!edge.vertexA && !edge.vertexB) {
      edge.vertexA = vertex;
      edge.left = left;
      edge.right = right;
    } else if (edge.left === right) edge.vertexB = vertex;
    else edge.vertexA = vertex;
  }
  static setEndpoint(edge, left, right, vertex) {
    this.setStartpoint(edge, right, left, vertex);
  }

  // connect dangling edges (not if a cursory test tells us
  // it is not going to be visible.
  // return value:
  //   false: the dangling endpoint couldn't be connected
  //   true: the dangling endpoint could be connected
  static connectToBounds(edge, bbox) {
    // skip if end point already connected
    if (edge.vertexB) return true;

    const { xl, xr, yb, yt } = bbox;

    // make local copy for performance purpose
    const { left, right } = edge;
    const avg = { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 };

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
      if (avg.x < xl || avg.x >= xr) return false;

      // downward
      if (left.x > right.x) {
        if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex(avg.x, yb);
        else if (edge.vertexA.y >= yt) return false;

        edge.vertexB = new Voronoi.Vertex(avg.x, yt);
      }
      // upward
      else {
        if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex(avg.x, yt);
        else if (edge.vertexA.y < yb) return false;

        edge.vertexB = new Voronoi.Vertex(avg.x, yb);
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
          if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex((yb - fb) / fm, yb);
          else if (edge.vertexA.y >= yt) return false;

          edge.vertexB = new Voronoi.Vertex((yt - fb) / fm, yt);
        }
        // upward
        else {
          if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex((yt - fb) / fm, yt);
          else if (edge.vertexA.y < yb) return false;

          edge.vertexB = new Voronoi.Vertex((yb - fb) / fm, yb);
        }
      }
      // closer to horizontal than vertical, connect start point to the
      // left or right side of the bounding box
      else {
        // rightward
        if (left.y < right.y) {
          if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex(xl, fm * xl + fb);
          else if (edge.vertexA.x >= xr) return false;

          edge.vertexB = new Voronoi.Vertex(xr, fm * xr + fb);
        }
        // leftward
        else {
          if (!edge.vertexA) edge.vertexA = new Voronoi.Vertex(xr, fm * xr + fb);
          else if (edge.vertexA.x < xl) return false;

          edge.vertexB = new Voronoi.Vertex(xl, fm * xl + fb);
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
  static clipToBounds(edge, bbox) {
    const { xl, xr, yb, yt } = bbox;

    const {
      vertexA: { x: ax, y: ay },
      vertexB: { x: bx, y: by },
    } = edge;
    const delta = { x: bx - ax, y: by - ay };
    let t0 = 0;
    let t1 = 1;

    const edgeIsInBounds = (p, q) => {
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
    if (!edgeIsInBounds(-delta.x, ax - xl)) return false;
    // right
    if (!edgeIsInBounds(delta.x, xr - ax)) return false;
    // bottom
    if (!edgeIsInBounds(-delta.y, ay - yb)) return false;
    // top
    if (!edgeIsInBounds(delta.y, yt - ay)) return false;

    // if we reach this point, Voronoi edge is within bbox

    // if t0 > 0, va needs to change
    // rhill 2011-06-03: we need to create a new vertex rather
    // than modifying the existing one, since the existing
    // one is likely shared with at least another edge
    if (t0 > 0) edge.vertexA = new Voronoi.Vertex(ax + t0 * delta.x, ay + t0 * delta.y);

    // if t1 < 1, vb needs to change
    // rhill 2011-06-03: we need to create a new vertex rather
    // than modifying the existing one, since the existing
    // one is likely shared with at least another edge
    if (t1 < 1) edge.vertexB = new Voronoi.Vertex(ax + t1 * delta.x, ay + t1 * delta.y);

    return true;
  }
};

Voronoi.Halfedge = class {
  constructor(edge, left, right) {
    this.site = left;
    this._edge = edge;

    // this._start = undefined;
    // this._end = undefined;

    // 'angle' is a value to be used for properly sorting the
    // halfsegments counterclockwise. By convention, we will
    // use the angle of the line defined by the 'site to the left'
    // to the 'site to the right'.
    // However, border edges have no 'site to the right': thus we
    // use the angle of line perpendicular to the halfsegment (the
    // edge should have both end points defined in such case.)
    if (right) this.angle = Math.atan2(right.y - left.y, right.x - left.x);
    else {
      const { vertexA, vertexB } = edge;
      // rhill 2011-05-31: used to call getStartpoint()/getEndpoint(),
      // but for performance purpose, these are expanded in place here.
      if (edge.left === left) this.angle = Math.atan2(vertexB.x - vertexA.x, vertexA.y - vertexB.y);
      else this.angle = Math.atan2(vertexA.x - vertexB.x, vertexB.y - vertexA.y);
    }
  }
  static compare(a, b) {
    return b.angle - a.angle;
  }
  get edge() {
    return this._edge;
  }
  get start() {
    if (this._start == null) {
      if (this.edge.left === this.site) this._start = this.edge.vertexA;
      else this._start = this.edge.vertexB;
    }
    return this._start;
  }
  get end() {
    if (this._end == null) {
      if (this.edge.left === this.site) this._end = this.edge.vertexB;
      else this._end = this.edge.vertexA;
    }
    return this._end;
  }
};

// rhill 2011-06-07: For some reasons, performance suffers significantly
// when instanciating a literal object instead of an empty ctor
Voronoi.Beachsection = class {};

// rhill 2011-06-07: For some reasons, performance suffers significantly
// when instanciating a literal object instead of an empty ctor
Voronoi.CircleEvent = class {};
