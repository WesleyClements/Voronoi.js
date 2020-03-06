/*
	The MIT License

	Copyright (c) 2011 Mike Chambers

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
*/

/**
 * A QuadTree implementation in JavaScript, a 2d spatial subdivision algorithm.
 * @module QuadTree
 **/

import Point from './Point.js';
import AABB from './AABB.js';

//#region QuadTreeNodes
const BOTTOM_LEFT = 0;
const TOP_RIGHT = 1;
const TOP_LEFT = 2;
const BOTTOM_RIGHT = 3;

function getIndex(point: Point, center: Point): number {
  const right = point.x > center.x;
  const top = point.y > center.y;
  return top ? (right ? TOP_RIGHT : TOP_LEFT) : right ? BOTTOM_RIGHT : BOTTOM_LEFT;
}

function getSubBounds(bounds: AABB): AABB[] {
  const center = bounds.center;
  return [
    new AABB(bounds.min, center), // BOTTOM_LEFT
    new AABB(center, bounds.max), // TOP_RIGHT
    new AABB(new Point(bounds.min.x, center.y), new Point(center.x, bounds.max.y)), // TOP_LEFT
    new AABB(new Point(center.x, bounds.min.y), new Point(bounds.max.x, center.y)), // BOTTOM_RIGHT
  ];
}

interface QuadTreeNode<T> {
  quadTree: QuadTree<T>;
  bounds: AABB;
  depth: number;

  nodes: QuadTreeNode<T>[];
  children: T[];

  getNode: (item: T) => QuadTreeNode<T>;

  insert: (...item: T[]) => boolean;
  retrieve: (item: T) => T[];

  clear: () => void;
}

/************** PointQuadTreeNode ********************/

class PointQuadTreeNode<T extends Point> implements QuadTreeNode<T> {
  quadTree: QuadTree<T>;
  bounds: AABB;
  depth: number;

  nodes: PointQuadTreeNode<T>[];
  children: T[];

  constructor(quadTree: PointQuadTree<T>, bounds: AABB, depth: number) {
    this.quadTree = quadTree;
    this.bounds = bounds;
    this.depth = depth;

    this.children = [];
  }

  getNode(item: T): PointQuadTreeNode<T> {
    if (!this.nodes) return undefined;
    return this.nodes[getIndex(item, this.bounds.center)];
  }

  insert(item: T): boolean {
    if (!item) return false;
    if (this.nodes) {
      return this.getNode(item).insert(item);
    } else {
      this.children.push(item);

      if (this.depth >= this.quadTree.maxDepth) return true;
      if (this.children.length < this.quadTree.maxChildren) return true;

      this.nodes = getSubBounds(this.bounds).map(aabb => new PointQuadTreeNode<T>(this.quadTree, aabb, this.depth + 1));

      this.children.forEach(child => this.insert(child));
      delete this.children;
      return true;
    }
  }

  retrieve(item: T): T[] {
    if (this.nodes) return this.getNode(item).retrieve(item);
    else return Array.from(this.children);
  }

  clear(): void {
    if (this.children) delete this.children;

    if (this.nodes) {
      this.nodes.forEach(node => node.clear());
      delete this.nodes;
    }
  }
}

/************** AABBQuadTreeNode ********************/

class AABBQuadTreeNode<T extends AABB> implements QuadTreeNode<T> {
  quadTree: AABBQuadTree<T>;
  bounds: AABB;
  depth: number;

  nodes: AABBQuadTreeNode<T>[];
  children: T[];

  constructor(quadTree: AABBQuadTree<T>, bounds: AABB, depth: number) {
    this.quadTree = quadTree;
    this.bounds = bounds;
    this.depth = depth;

    this.children = [];
  }

  getNode(item: T): AABBQuadTreeNode<T> {
    if (!this.nodes) return undefined;
    return this.nodes[getIndex(item.center, this.bounds.center)];
  }

  insert(item: T): boolean {
    if (!item) return false;
    if (this.nodes) {
      if (!this.getNode(item).insert(item)) this.children.push(item);
    } else {
      if (!this.bounds.contains(item)) return false;

      this.children.push(item);

      if (this.depth >= this.quadTree.maxDepth) return true;
      if (this.children.length < this.quadTree.maxChildren) return true;

      this.nodes = getSubBounds(this.bounds).map(aabb => new AABBQuadTreeNode<T>(this.quadTree, aabb, this.depth + 1));

      this.children = this.children.filter(child => this.insert(child));
    }
    return true;
  }

  retrieve(item: T): T[] {
    if (this.nodes) {
      return Array.from([...this.children, ...this.getNode(item).retrieve(item)]);
    } else return Array.from(this.children);
  }

  clear(): void {
    if (this.children) delete this.children;

    if (this.nodes) {
      this.nodes.forEach(node => node.clear());
      delete this.nodes;
    }
  }
}
//#endregion

//#region QuadTrees

interface QuadTree<T> {
  /**
   * The root node of the QuadTree which covers the entire area being segmented.
   * @property root
   * @type Node
   **/
  root: QuadTreeNode<T>;
  maxChildren: number;
  maxDepth: number;

  /**
   * Inserts an item into the QuadTree.
   * @method insert
   * @param {Object|Array} item The item or Array of items to be inserted into the QuadTree. The item should expose x, y
   * properties that represents its position in 2D space.
   **/
  insert: (...items: T[]) => void;
  /**
   * Retrieves all items / points in the same node as the specified item / point. If the specified item
   * overlaps the bounds of a node, then all children in both nodes will be returned.
   * @method retrieve
   * @param {Object} item An object representing a 2D coordinate point (with x, y properties), or a shape
   * with dimensions (x, y, width, height) properties.
   **/
  retrieve: (item: T) => T[];
  /**
   * Clears all nodes and children from the QuadTree
   * @method clear
   **/
  clear: () => void;
}

/****************** PointQuadTree ****************/

/**
 * PointQuadTree data structure.
 * @class PointQuadTree<T extends Point>
 * @constructor
 * @param {Object} An object representing the bounds of the top level of the QuadTree. The object
 * should contain the following properties : x, y, width, height
 * @param {Number} maxChildren The maximum number of children that a node can contain before it is split into sub-nodes.
 * @param {Number} maxDepth The maximum number of levels that the quadtree will create. Default is 4.
 **/
export class PointQuadTree<T extends Point> implements QuadTree<T> {
  root: PointQuadTreeNode<T>;
  maxChildren: number;
  maxDepth: number;

  constructor(bounds: AABB, maxChildren: number, maxDepth: number = 4) {
    this.root = new PointQuadTreeNode(this, bounds, 0);
    this.maxChildren = maxChildren;
    this.maxDepth = maxDepth;
  }

  insert(...items: T[]): void {
    items.forEach((item, i) => {
      if (!item) throw new Error(`item at ${i} is null`);
      this.root.insert(item);
    });
  }

  retrieve(item: T): T[] {
    return Array.from(this.root.retrieve(item));
  }

  clear(): void {
    this.root.clear();
  }
}

/******************** AABBQuadTree ****************/

/**
 * AABBQuadTree data structure.
 * @class AABBQuadTree<T extends AABB>
 * @constructor
 * @param {Object} An object representing the bounds of the top level of the QuadTree. The object
 * should contain the following properties : x, y, width, height
 * @param {Number} maxChildren The maximum number of children that a node can contain before it is split into sub-nodes.
 * @param {Number} maxDepth The maximum number of levels that the quadtree will create. Default is 4.
 **/
export class AABBQuadTree<T extends AABB> implements QuadTree<T> {
  root: AABBQuadTreeNode<T>;
  maxChildren: number;
  maxDepth: number;

  children: T[];

  constructor(bounds: AABB, maxChildren: number, maxDepth: number = 4) {
    this.root = new AABBQuadTreeNode(this, bounds, 0);
    this.maxChildren = maxChildren;
    this.maxDepth = maxDepth;

    this.children = [];
  }

  insert(...items: T[]): void {
    items.forEach((item, i) => {
      if (!item) throw new Error(`item at ${i} is null`);
      if (!this.root.insert(item)) this.children.push(item);
    });
  }

  retrieve(item: T): T[] {
    return Array.from([...this.children, ...this.root.retrieve(item)]);
  }

  clear(): void {
    this.root.clear();
    this.children = [];
  }
}

//#endregion
