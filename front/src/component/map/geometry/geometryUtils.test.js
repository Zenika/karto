import { closestPointTo, closestSegmentTo } from './geometryUtils';

describe('closestPointTo', () => {

    it('should find closest point', () => {
        const upperBound = 10000;
        const target = { x: 1, y: 1 };
        const points = [
            { x: -1, y: -1 },
            { x: 0, y: 5.1 },
            { x: 2, y: 1.3 }
        ];

        const actual = closestPointTo(target, points, upperBound);

        expect(actual).toEqual({ x: 2, y: 1.3 });
    });

    it('should return null when no points are provided', () => {
        const upperBound = 10000;
        const target = { x: 1, y: 1 };
        const points = [];

        const actual = closestPointTo(target, points, upperBound);

        expect(actual).toBeNull();
    });

    it('should ignore points further from target than upper bound', () => {
        const upperBound = 1;
        const target = { x: 0, y: 0 };
        const points = [
            { x: 2, y: 0 },
            { x: 0, y: 1.1 },
            { x: 1, y: 1 }
        ];

        const actual = closestPointTo(target, points, upperBound);

        expect(actual).toBeNull();
    });

    it('should preserve extra data in point objects', () => {
        const upperBound = 10000;
        const target = { x: 0, y: 0 };
        const points = [
            { x: 1, y: 1, anyKey: 'someValue' }
        ];

        const actual = closestPointTo(target, points, upperBound);

        expect(actual).toEqual({ x: 1, y: 1, anyKey: 'someValue' });
    });
});

describe('closestSegmentTo', () => {

    it('should find closest segment', () => {
        const upperBound = 10000;
        const target = { x: 1, y: 1 };
        const segments = [
            { x1: 0, y1: 0, x2: 0, y2: 2 },
            { x1: 1, y1: 0, x2: 0, y2: 3 }
        ];

        const actual = closestSegmentTo(target, segments, upperBound);

        expect(actual).toEqual({ x1: 1, y1: 0, x2: 0, y2: 3 });
    });

    it('should return null when no segments are provided', () => {
        const upperBound = 10000;
        const target = { x: 1, y: 1 };
        const segments = [];

        const actual = closestSegmentTo(target, segments, upperBound);

        expect(actual).toBeNull();
    });

    it('should ignore segments further from target than upper bound', () => {
        const upperBound = 1;
        const target = { x: 0, y: 0 };
        const segments = [
            { x1: 2, y1: -10, x2: 2, y2: 10 },
            { x1: -10, y1: 2, x2: 10, y2: 2 }
        ];

        const actual = closestSegmentTo(target, segments, upperBound);

        expect(actual).toBeNull();
    });

    it('should preserve extra data in segment objects', () => {
        const upperBound = 10000;
        const target = { x: 1, y: 1 };
        const segments = [
            { x1: 0, y1: 0, x2: 0, y2: 2, anyKey: 'someValue' }
        ];

        const actual = closestSegmentTo(target, segments, upperBound);

        expect(actual).toEqual({ x1: 0, y1: 0, x2: 0, y2: 2, anyKey: 'someValue' });
    });
});
