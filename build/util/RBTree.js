function balanceTree(tree, node) {
    let parent = node.rbParent;
    while (parent && parent.rbRed) {
        const grandpa = parent.rbParent;
        const isLeft = parent === grandpa.rbLeft;
        const uncle = isLeft ? grandpa.rbRight : grandpa.rbLeft;
        if (uncle && uncle.rbRed) {
            parent.rbRed = uncle.rbRed = false;
            grandpa.rbRed = true;
            node = grandpa;
        }
        else {
            if (isLeft ? node === parent.rbRight : node === parent.rbLeft) {
                if (isLeft)
                    rotateLeft(tree, parent);
                else
                    rotateRight(tree, parent);
                node = parent;
                parent = node.rbParent;
            }
            parent.rbRed = false;
            grandpa.rbRed = true;
            if (isLeft)
                rotateRight(tree, grandpa);
            else
                rotateLeft(tree, grandpa);
        }
        parent = node.rbParent;
    }
}
function rotateLeft(tree, node) {
    const { rbRight: right, rbParent: parent } = node;
    if (parent) {
        if (parent.rbLeft === node)
            parent.rbLeft = right;
        else
            parent.rbRight = right;
    }
    else
        tree.root = right;
    right.rbParent = parent;
    node.rbParent = right;
    node.rbRight = right.rbLeft;
    if (node.rbRight)
        node.rbRight.rbParent = node;
    right.rbLeft = node;
}
function rotateRight(tree, node) {
    const { rbLeft: left, rbParent: parent } = node;
    if (parent) {
        if (parent.rbLeft === node)
            parent.rbLeft = left;
        else
            parent.rbRight = left;
    }
    else
        tree.root = left;
    left.rbParent = parent;
    node.rbParent = left;
    node.rbLeft = left.rbRight;
    if (node.rbLeft)
        node.rbLeft.rbParent = node;
    left.rbRight = node;
}
export class RBTree {
    constructor() {
        this.root = null;
    }
    static getFirst(node) {
        while (node.rbLeft)
            node = node.rbLeft;
        return node;
    }
    static getLast(node) {
        while (node.rbRight)
            node = node.rbRight;
        return node;
    }
    insertSuccessor(node, successor) {
        let parent;
        if (node) {
            successor.rbPrevious = node;
            successor.rbNext = node.rbNext;
            if (node.rbNext)
                node.rbNext.rbPrevious = successor;
            node.rbNext = successor;
            if (node.rbRight) {
                node = RBTree.getFirst(node.rbRight);
                node.rbLeft = successor;
            }
            else
                node.rbRight = successor;
            parent = node;
        }
        else if (this.root) {
            node = RBTree.getFirst(this.root);
            successor.rbPrevious = null;
            successor.rbNext = node;
            node.rbPrevious = successor;
            node.rbLeft = successor;
            parent = node;
        }
        else {
            successor.rbPrevious = successor.rbNext = null;
            this.root = successor;
            parent = null;
        }
        successor.rbLeft = successor.rbRight = null;
        successor.rbParent = parent;
        successor.rbRed = true;
        balanceTree(this, successor);
        this.root.rbRed = false;
    }
    removeNode(node) {
        if (node.rbNext)
            node.rbNext.rbPrevious = node.rbPrevious;
        if (node.rbPrevious)
            node.rbPrevious.rbNext = node.rbNext;
        node.rbNext = node.rbPrevious = null;
        let { rbParent: parent, rbLeft: left, rbRight: right } = node;
        let next = !left ? right : !right ? left : RBTree.getFirst(right);
        if (parent) {
            if (parent.rbLeft === node)
                parent.rbLeft = next;
            else
                parent.rbRight = next;
        }
        else
            this.root = next;
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
            }
            else {
                next.rbParent = parent;
                parent = next;
                node = next.rbRight;
            }
        }
        else {
            isRed = node.rbRed;
            node = next;
        }
        if (node)
            node.rbParent = parent;
        if (isRed)
            return;
        if (node && node.rbRed) {
            node.rbRed = false;
            return;
        }
        let sibling;
        do {
            if (node === this.root)
                break;
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
            }
            else {
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
        if (node)
            node.rbRed = false;
    }
}
//# sourceMappingURL=RBTree.js.map