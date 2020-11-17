import { screen } from '@testing-library/react';

export function configureMockForPopper() {
    global.document.createRange = () => ({
        setStart: () => {
        },
        setEnd: () => {
        },
        commonAncestorContainer: {
            nodeName: 'BODY',
            ownerDocument: document
        }
    });
}

export function patchGraphViewBox() {
    const graph = screen.getByLabelText('graph');
    const viewBoxValues = graph.getAttribute('viewBox').split(' ');
    graph.viewBox = {
        baseVal: { x: viewBoxValues[0], y: viewBoxValues[1], width: viewBoxValues[2], height: viewBoxValues[3] }
    };
}