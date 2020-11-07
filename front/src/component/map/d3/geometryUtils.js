export function closestPointTo(target, points, upperBound) {
    return closestTo(target, points, distanceBetweenPoints, upperBound);
}

export function closestSegmentTo(target, segments, upperBound) {
    return closestTo(target, segments, distancePointToSegment, upperBound);
}

function closestTo(target, geometries, distanceFunction, upperBound) {
    let closest = null;
    let distanceToClosest = upperBound;
    for (const geometry of geometries) {
        const distance = distanceFunction(target, geometry);
        if (distance < distanceToClosest) {
            closest = geometry;
            distanceToClosest = distance;
        }
    }
    return closest;
}

function distanceBetweenPoints(point1, point2) {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function distancePointToSegment(point, segment) {
    // https://stackoverflow.com/questions/849211/shortest-distance-between-a-point-and-a-line-segment#answer-6853926
    const { x, y } = point;
    const { x1, x2, y1, y2 } = segment;
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const len_sq = C * C + D * D;
    let param = -1;
    if (len_sq !== 0) //in case of 0 length line
        param = dot / len_sq;
    let xx, yy;
    if (param < 0) {
        xx = x1;
        yy = y1;
    } else if (param > 1) {
        xx = x2;
        yy = y2;
    } else {
        xx = x1 + param * C;
        yy = y1 + param * D;
    }
    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
}
