import Point from './Point.js';
import AABB from './AABB.js';
const BOTTOM_LEFT = 0;
const TOP_RIGHT = 1;
const TOP_LEFT = 2;
const BOTTOM_RIGHT = 3;
function getIndex(point, center) {
    const right = point.x > center.x;
    const top = point.y > center.y;
    return top ? (right ? TOP_RIGHT : TOP_LEFT) : right ? BOTTOM_RIGHT : BOTTOM_LEFT;
}
function getSubBounds(bounds) {
    const center = bounds.center;
    return [
        new AABB(bounds.min, center),
        new AABB(center, bounds.max),
        new AABB(new Point(bounds.min.x, center.y), new Point(center.x, bounds.max.y)),
        new AABB(new Point(center.x, bounds.min.y), new Point(bounds.max.x, center.y)),
    ];
}
class PointQuadTreeNode {
    constructor(quadTree, bounds, depth) {
        this.quadTree = quadTree;
        this.bounds = bounds;
        this.depth = depth;
        this.children = [];
    }
    getNode(item) {
        if (!this.nodes)
            return;
        return this.nodes[getIndex(item, this.bounds.center)];
    }
    insert(item) {
        if (!item)
            return false;
        if (this.nodes) {
            return this.getNode(item).insert(item);
        }
        else {
            this.children.push(item);
            if (this.depth >= this.quadTree.maxDepth)
                return true;
            if (this.children.length < this.quadTree.maxChildren)
                return true;
            this.nodes = getSubBounds(this.bounds).map(aabb => new PointQuadTreeNode(this.quadTree, aabb, this.depth + 1));
            this.children.forEach(child => this.insert(child));
            delete this.children;
            return true;
        }
    }
    retrieve(item) {
        if (this.nodes)
            this.getNode(item).retrieve(item);
        else
            return Array.from(this.children);
    }
    clear() {
        if (this.children)
            delete this.children;
        if (this.nodes) {
            this.nodes.forEach(node => node.clear());
            delete this.nodes;
        }
    }
}
class AABBQuadTreeNode {
    constructor(quadTree, bounds, depth) {
        this.quadTree = quadTree;
        this.bounds = bounds;
        this.depth = depth;
        this.children = [];
    }
    getNode(item) {
        if (!this.nodes)
            return;
        return this.nodes[getIndex(item.center, this.bounds.center)];
    }
    insert(item) {
        if (!item)
            return false;
        if (this.nodes) {
            if (!this.getNode(item).insert(item))
                this.children.push(item);
        }
        else {
            if (!this.bounds.contains(item))
                return false;
            this.children.push(item);
            if (this.depth >= this.quadTree.maxDepth)
                return true;
            if (this.children.length < this.quadTree.maxChildren)
                return true;
            this.nodes = getSubBounds(this.bounds).map(aabb => new AABBQuadTreeNode(this.quadTree, aabb, this.depth + 1));
            this.children = this.children.filter(child => this.insert(child));
            return true;
        }
    }
    retrieve(item) {
        if (this.nodes) {
            return Array.from([...this.children, ...this.getNode(item).retrieve(item)]);
        }
        else
            return Array.from(this.children);
    }
    clear() {
        if (this.children)
            delete this.children;
        if (this.nodes) {
            this.nodes.forEach(node => node.clear());
            delete this.nodes;
        }
    }
}
export class PointQuadTree {
    constructor(bounds, maxChildren, maxDepth = 4) {
        this.root = new PointQuadTreeNode(this, bounds, 0);
        this.maxChildren = maxChildren;
        this.maxDepth = maxDepth;
    }
    insert(...items) {
        items.forEach((item, i) => {
            if (!item)
                throw new Error(`item at ${i} is null`);
            this.root.insert(item);
        });
    }
    retrieve(item) {
        return Array.from(this.root.retrieve(item));
    }
    clear() {
        this.root.clear();
    }
}
export class AABBQuadTree {
    constructor(bounds, maxChildren, maxDepth = 4) {
        this.root = new AABBQuadTreeNode(this, bounds, 0);
        this.maxChildren = maxChildren;
        this.maxDepth = maxDepth;
        this.children = [];
    }
    insert(...items) {
        items.forEach((item, i) => {
            if (!item)
                throw new Error(`item at ${i} is null`);
            if (!this.root.insert(item))
                this.children.push(item);
        });
    }
    retrieve(item) {
        return Array.from([...this.children, ...this.root.retrieve(item)]);
    }
    clear() {
        this.root.clear();
        this.children = [];
    }
}
//# sourceMappingURL=QuadTree.js.map