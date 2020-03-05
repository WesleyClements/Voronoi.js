import Diagram from './Voronoi.js';
import Point from './util/Point.js';
const pointCount = 20;
let points = [];
let diagram;
let width;
let height;
let bounds;
let addPoint = false;
function updateDimensions() {
    width = windowWidth - 40;
    height = windowHeight - 40;
    bounds = {
        xl: 0,
        xr: width,
        yb: 0,
        yt: height,
    };
}
window.setup = () => {
    updateDimensions();
    createCanvas(width, height);
    for (let i = 0; i < pointCount; ++i) {
        const point = new Point(random() * width, random() * height);
        point.color = color(random() * 255, random() * 255, random() * 255);
        points.push(point);
    }
};
window.draw = () => {
    diagram = new Diagram(points);
    diagram.finish(bounds);
    console.log(diagram.execTime);
    background(150);
    stroke(color(0, 0, 0));
    points.forEach((site) => {
        if (diagram) {
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
        }
        strokeWeight(5);
        point(site.x, site.y);
    });
    if (diagram) {
        points = diagram.getRelaxedSites(0.1);
    }
    if (addPoint) {
        const point = new Point(random() * width, random() * height);
        point.color = color(random() * 255, random() * 255, random() * 255);
        points.push(point);
        addPoint = false;
    }
};
window.windowResized = () => {
    updateDimensions();
    resizeCanvas(width, height);
};
window.mousePressed = () => {
    addPoint = true;
};
//# sourceMappingURL=sketch.js.map