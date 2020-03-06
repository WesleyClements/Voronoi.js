import Point from './util/Point.js';
import AABB from './util/AABB.js';
import Diagram from './Voronoi.js';
const pointCount = 20;
const maxPointCount = 400;
let points = [];
let diagram;
let width;
let height;
let bounds;
let frameCount = 0;
function updateDimensions() {
    width = windowWidth - 40;
    height = windowHeight - 40;
    bounds = new AABB(new Point(0, 0), new Point(width, height));
}
window.setup = () => {
    updateDimensions();
    createCanvas(width, height);
    for (let i = 0; i < pointCount; ++i) {
        const point = new Point(random() * width, random() * height);
        point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
        points.push(point);
    }
};
window.draw = () => {
    diagram = new Diagram(points);
    diagram.finish(bounds);
    diagram.cells.forEach(cell => { });
    background(150);
    strokeWeight(1);
    stroke(color(0, 0, 0));
    diagram.edges.forEach(edge => {
        let s = edge.start;
        let e = edge.end;
        if (!s || !e)
            return;
        line(s.x, s.y, e.x, e.y);
    });
    points.forEach((site) => {
        let { cell } = site;
        if (!cell)
            return;
        if (cell.edges.length < 3)
            return;
        strokeWeight(1);
        stroke(color(0, 0, 0));
        fill(site.color);
        beginShape();
        cell.edges.forEach((edge) => {
            const v = edge.end;
            if (!v)
                return;
            vertex(v.x, v.y);
        });
        endShape(CLOSE);
        cell.vertices.forEach((vertex) => {
            stroke(color(0, 0, 255));
            line(site.x, site.y, vertex.x, vertex.y);
        });
    });
    points = diagram.getRelaxedSites(0.02);
    if (points.length < maxPointCount && frameCount % 10 === 0) {
        const point = new Point(width / 2 + Math.random() - 0.5, height / 2 + Math.random() - 0.5);
        point.color = color(sqrt(random()) * 255, sqrt(random()) * 255, sqrt(random()) * 255);
        points.push(point);
    }
    frameCount++;
};
window.windowResized = () => {
    updateDimensions();
    resizeCanvas(width, height);
};
//# sourceMappingURL=sketch.js.map