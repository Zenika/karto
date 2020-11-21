import { fireEvent, screen, waitFor } from '@testing-library/react';

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

export function getItemPosition(item) {
    const transformAttr = item.getAttribute('transform');
    const matches = /.*translate\(([^,]+),([^)]+)\).*/.exec(transformAttr);
    if (matches == null) {
        return null;
    }
    return { clientX: parseFloat(matches[1]), clientY: parseFloat(matches[2]) };
}

export function getLinkPosition(link) {
    const x1 = link.getAttribute('x1');
    const y1 = link.getAttribute('y1');
    const x2 = link.getAttribute('x2');
    const y2 = link.getAttribute('y2');
    if (x1 == null || y1 == null || x2 == null || y2 == null) {
        return null;
    }
    return { clientX: (parseFloat(x1) + parseFloat(x2)) / 2, clientY: (parseFloat(y1) + parseFloat(y2)) / 2 };
}

export function getScale(element) {
    const transformAttr = element.getAttribute('transform');
    const matches = /.*scale\((-?\d+\.?\d*)\).*/.exec(transformAttr);
    if (matches == null) {
        return null;
    }
    return parseFloat(matches[1]);
}

export function waitForItemPositionStable(item, timeout) {
    let previousPosition = null;
    return waitFor(() => {
        let isStable = false;
        const currentPosition = getItemPosition(item);
        if (currentPosition != null) {
            if (previousPosition != null) {
                isStable = Math.abs(previousPosition.clientX - currentPosition.clientX) < 0.1
                    && Math.abs(previousPosition.clientY - currentPosition.clientY) < 0.1;
            }
            previousPosition = currentPosition;
        }
        return new Promise((resolve, reject) => isStable ? resolve() : setTimeout(reject, 200));
    }, { timeout });
}

export function hoverLink(link) {
    fireEvent.mouseMove(screen.getByLabelText('graph'), getLinkPosition(link));
}

export function hoverItem(item) {
    fireEvent.mouseMove(screen.getByLabelText('graph'), getItemPosition(item));
}

export function hoverAway() {
    fireEvent.mouseMove(screen.getByLabelText('graph'), { clientX: 1000, clientY: 1000 });
}

export function dragAndDropItem(item, targetPosition) {
    hoverItem(item);
    fireEvent.mouseDown(item, { view: global.window });
    fireEvent.mouseMove(screen.getByLabelText('graph'), targetPosition);
    fireEvent.mouseUp(item, { view: global.window });
}

export function scrollDown() {
    const layersContainer = screen.getByLabelText('layers container');
    fireEvent.wheel(layersContainer, { deltaY: -100 });
}
