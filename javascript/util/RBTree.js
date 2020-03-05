// ---------------------------------------------------------------------------
// Red-Black tree code (based on C version of "rbtree" by Franck Bui-Huu
// https://github.com/fbuihuu/libtree/blob/master/rb.c

// rhill 2011-05-19:
//   Voronoi sites are kept client-side now, to allow
//   user to freely modify content. At compute time,
//   *references* to sites are copied locally.

export default class RBTree {
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
        node = this.getFirst(node.rbRight);
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

    this.rbBalanceTree(successor);

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

  rbBalanceTree(node) {
    // Fixup the modified tree by recoloring nodes and performing
    // rotations (2 at most) hence the red-black tree properties are
    // preserved.
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
          if (isLeft) this.rbRotateLeft(parent);
          else this.rbRotateRight(parent);
          node = parent;
          parent = node.rbParent;
        }
        parent.rbRed = false;
        grandpa.rbRed = true;
        if (isLeft) this.rbRotateRight(grandpa);
        else this.rbRotateLeft(grandpa);
      }
      parent = node.rbParent;
    }
  }
  rbRotateLeft(node) {
    const { rbRight: right, rbParent: parent } = node;
    if (parent) {
      if (parent.rbLeft === node) parent.rbLeft = right;
      else parent.rbRight = right;
    } else this.root = right;

    right.rbParent = parent;

    node.rbParent = right;
    node.rbRight = right.rbLeft;
    if (node.rbRight) node.rbRight.rbParent = node;
    right.rbLeft = node;
  }
  rbRotateRight(node) {
    const { rbLeft: left, rbParent: parent } = node;
    if (parent) {
      if (parent.rbLeft === node) parent.rbLeft = left;
      else parent.rbRight = left;
    } else this.root = left;

    left.rbParent = parent;

    node.rbParent = left;
    node.rbLeft = left.rbRight;
    if (node.rbLeft) node.rbLeft.rbParent = node;
    left.rbRight = node;
  }
  getFirst(node) {
    while (node.rbLeft) node = node.rbLeft;
    return node;
  }
  getLast(node) {
    while (node.rbRight) node = node.rbRight;
    return node;
  }
}
