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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiUkJUcmVlLmpzIiwic291cmNlUm9vdCI6Ii4vc3JjLyIsInNvdXJjZXMiOlsidXRpbC9SQlRyZWUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBZ0JBLFNBQVMsV0FBVyxDQUFJLElBQWUsRUFBRSxJQUF1QjtJQUM5RCxJQUFJLE1BQU0sR0FBRyxJQUFJLENBQUMsUUFBUSxDQUFDO0lBQzNCLE9BQU8sTUFBTSxJQUFJLE1BQU0sQ0FBQyxLQUFLLEVBQUU7UUFDN0IsTUFBTSxPQUFPLEdBQUcsTUFBTSxDQUFDLFFBQVEsQ0FBQztRQUVoQyxNQUFNLE1BQU0sR0FBRyxNQUFNLEtBQUssT0FBTyxDQUFDLE1BQU0sQ0FBQztRQUV6QyxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUM7UUFFeEQsSUFBSSxLQUFLLElBQUksS0FBSyxDQUFDLEtBQUssRUFBRTtZQUN4QixNQUFNLENBQUMsS0FBSyxHQUFHLEtBQUssQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ25DLE9BQU8sQ0FBQyxLQUFLLEdBQUcsSUFBSSxDQUFDO1lBQ3JCLElBQUksR0FBRyxPQUFPLENBQUM7U0FDaEI7YUFBTTtZQUNMLElBQUksTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLEtBQUssTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxLQUFLLE1BQU0sQ0FBQyxNQUFNLEVBQUU7Z0JBQzdELElBQUksTUFBTTtvQkFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDOztvQkFDaEMsV0FBVyxDQUFDLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQztnQkFDL0IsSUFBSSxHQUFHLE1BQU0sQ0FBQztnQkFDZCxNQUFNLEdBQUcsSUFBSSxDQUFDLFFBQVEsQ0FBQzthQUN4QjtZQUNELE1BQU0sQ0FBQyxLQUFLLEdBQUcsS0FBSyxDQUFDO1lBQ3JCLE9BQU8sQ0FBQyxL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