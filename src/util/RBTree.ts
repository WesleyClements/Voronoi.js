// ---------------------------------------------------------------------------
// Red-Black tree code (based on C version of "rbtree" by Franck Bui-Huu
// https://github.com/fbuihuu/libtree/blob/master/rb.c

export interface RBTreeNode<T> {
  rbParent?: T & RBTreeNode<T>;
  rbPrevious?: T & RBTreeNode<T>;
  rbNext?: T & RBTreeNode<T>;
  rbLeft?: T & RBTreeNode<T>;
  rbRight?: T & RBTreeNode<T>;
  rbRed?: boolean;
}

// Fixup the modified tree by recoloring nodes and performing
// rotations (2 at most) hence the red-black tree properties are
// preserved.
function balanceTree<T>(tree: RBTree<T>, node: T & RBTreeNode<T>) {
  let parent = node.rbParent;
  while (parent && parent.rbRed) {
    const grandpa = parent.rbParent;

    const isLeft = parent === grandpa.rbLeft;

    const uncle = isLeft ? grandpa.rbRight : grandpa.rbLeft;

    if (uncle && uncle.rbRed) {
      parent.rbRed = uncle.rbRed = false;
      grandpa.rbRed = true;
      node = grandpa;
    } else {
      if (isLeft ? node === parent.rbRight : node === parent.rbLeft) {
        if (isLeft) rotateLeft(tree, parent);
        else rotateRight(tree, parent);
        node = parent;
        parent = node.rbParent;
      }
      parent.rbRed = false;
      grandpa.rbRed = true;
      if (isLeft) rotateRight(tree, grandpa);
      else rotateLeft(tree, grandpa);
    }
    parent = node.rbParent;
  }
}
function rotateLeft<T>(tree: RBTree<T>, node: T & RBTreeNode<T>) {
  const { rbRight: right, rbParent: parent } = node;
  if (parent) {
    if (parent.rbLeft === node) parent.rbLeft = right;
    else parent.rbRight = right;
  } else tree.root = right;

  right.rbParent = parent;

  node.rbParent = right;
  node.rbRight = right.rbLeft;
  if (node.rbRight) node.rbRight.rbParent = node;
  right.rbLeft = node;
}
function rotateRight<T>(tree: RBTree<T>, node: T & RBTreeNode<T>) {
  const { rbLeft: left, rbParent: parent } = node;
  if (parent) {
    if (parent.rbLeft === node) parent.rbLeft = left;
    else parent.rbRight = left;
  } else tree.root = left;

  left.rbParent = parent;

  node.rbParent = left;
  node.rbLeft = left.rbRight;
  if (node.rbLeft) node.rbLeft.rbParent = node;
  left.rbRight = node;
}

export default class RBTree<T> {
  static getFirst<T>(node: T): T & RBTreeNode<T>;
  static getFirst<T>(node: T & RBTreeNode<T>): T & RBTreeNode<T> {
    while (node.rbLeft) node = node.rbLeft;
    return node;
  }
  static getLast<T>(node: T): T & RBTreeNode<T>;
  static getLast<T>(node: T & RBTreeNode<T>): T & RBTreeNode<T> {
    while (node.rbRight) node = node.rbRight;
    return node;
  }

  root: T & RBTreeNode<T>;

  constructor() {
    this.root = null;
  }

  insertSuccessor(node: T, successor: T): void;
  insertSuccessor(node: T & RBTreeNode<T>, successor: T & RBTreeNode<T>): void {
    let parent;
    if (node) {
      // >>> rhill 2011-05-27: Performance: cache previous/next nodes
      successor.rbPrevious = node;
      successor.rbNext = node.rbNext;
      if (node.rbNext) node.rbNext.rbPrevious = successor;
      node.rbNext = successor;
      // <<<
      if (node.rbRight) {
        node = RBTree.getFirst(node.rbRight);
        node.rbLeft = successor;
      } else node.rbRight = successor;

      parent = node;
    }
    // rhill 2011-06-07: if node is null, successor must be inserted
    // to the left-most part of the tree
    else if (this.root) {
      node = RBTree.getFirst(this.root);
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

    balanceTree(this, successor);

    this.root.rbRed = false;
  }
  removeNode(node: T): void;
  removeNode(node: T & RBTreeNode<T>): void {
    // >>> rhill 2011-05-27: Performance: cache previous/next nodes
    if (node.rbNext) node.rbNext.rbPrevious = node.rbPrevious;
    if (node.rbPrevious) node.rbPrevious.rbNext = node.rbNext;
    node.rbNext = node.rbPrevious = null;
    // <<<
    let { rbParent: parent, rbLeft: left, rbRight: right } = node;
    let next = !left ? right : !right ? left : RBTree.getFirst(right);
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
          rotateLeft(this, parent);
          sibling = parent.rbRight;
        }
        if ((sibling.rbLeft && sibling.rbLeft.rbRed) || (sibling.rbRight && sibling.rbRight.rbRed)) {
          if (!sibling.rbRight || !sibling.rbRight.rbRed) {
            sibling.rbLeft.rbRed = false;
            sibling.rbRed = true;
            rotateRight(this, sibling);
            sibling = parent.rbRight;
          }
          sibling.rbRed = parent.rbRed;
          parent.rbRed = sibling.rbRight.rbRed = false;
          rotateLeft(this, parent);
          node = this.root;
          break;
        }
      } else {
        sibling = parent.rbLeft;
        if (sibling.rbRed) {
          sibling.rbRed = false;
          parent.rbRed = true;
          rotateRight(this, parent);
          sibling = parent.rbLeft;
        }
        if ((sibling.rbLeft && sibling.rbLeft.rbRed) || (sibling.rbRight && sibling.rbRight.rbRed)) {
          if (!sibling.rbLeft || !sibling.rbLeft.rbRed) {
            sibling.rbRight.rbRed = false;
            sibling.rbRed = true;
            rotateLeft(this, sibling);
            sibling = parent.rbLeft;
          }
          sibling.rbRed = parent.rbRed;
          parent.rbRed = sibling.rbLeft.rbRed = false;
          rotateRight(this, parent);
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
}
