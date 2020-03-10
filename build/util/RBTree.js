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
export default class RBTree {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUkJUcmVlLmpzIiwic291cmNlUm9vdCI6Ii4vc3JjLyIsInNvdXJjZXMiOlsidXRpbC9SQlRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JBLFNBQVMsV0FBVyxDQUFJLElBQWUsRUFBRSxJQUF1QjtJQUM5RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQzNCLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUVoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUV6QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFFeEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtZQUN4QixNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksR0FBRyxPQUFPLENBQUM7U0FDaEI7YUFBTTtZQUNMLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQzdELElBQUksTUFBTTtvQkFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDOztvQkFDaEMsV0FBVyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQztnQkFDZCxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUN4QjtZQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxL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