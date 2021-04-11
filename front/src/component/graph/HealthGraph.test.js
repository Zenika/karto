import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import HealthGraph from './HealthGraph';
import {
    dragAndDropItem,
    getItemPosition,
    getScale, hoverAway,
    hoverItem,
    patchGraphViewBox,
    patchLayersContainerBBox,
    scrollDown,
    waitForItemPositionStable,
    waitForTime
} from '../utils/testutils';
import { ZOOM_ANIMATION_DELAY, ZOOM_ANIMATION_DURATION } from './d3/D3Constants';

describe('HealthGraph component', () => {

    const testTimeout = 10000;
    const waitTimeout = 5000;

    const noOpHandler = () => null;
    let mockFocusHandler;
    let pod1, pod2;

    beforeEach(() => {
        mockFocusHandler = jest.fn();
        pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
    });

    it('displays pods and their labels', () => {
        const dataSet = {
            podHealths: [pod1, pod2]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText(pod1.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).toBeInTheDocument();
    });

    it('calls handler on pod focus', async () => {
        const dataSet = {
            podHealths: [pod1]
        };
        render(<HealthGraph onPodFocus={mockFocusHandler} dataSet={dataSet} autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(pod1);
    }, testTimeout);

    it('updates local state properly', () => {
        const dataSet1 = {
            podHealths: [pod1]
        };
        const pod1WithoutNamespaceDisplay = { ...pod1, displayName: 'pod1' };
        const pod2WithoutNamespaceDisplay = { ...pod2, displayName: 'pod2' };
        const dataSet2 = {
            podHealths: [pod1WithoutNamespaceDisplay, pod2WithoutNamespaceDisplay]
        };

        const { rerender } = render(
            <HealthGraph onPodFocus={noOpHandler} dataSet={dataSet1} autoZoom={false}/>
        );
        rerender(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet2} autoZoom={false}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText(pod1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod1WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
    });

    it('highlighted pods have a different appearance', () => {
        const pod2Highlighted = { ...pod2, highlighted: true };
        const dataSet = {
            podHealths: [pod1, pod2Highlighted]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-highlight');
    });

    it('focused pods have a different appearance', async () => {
        const dataSet = {
            podHealths: [pod1, pod2]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, testTimeout);

    it('focused highlighted pods have a different appearance', async () => {
        const pod2Highlighted = { ...pod2, highlighted: true };
        const dataSet = {
            podHealths: [pod1, pod2Highlighted]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded-highlight');
    }, testTimeout);

    it('unfocusing an element should unfocus all', async () => {
        const dataSet = {
            podHealths: [pod1, pod2]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[1]);
        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
    }, testTimeout);

    it('focused element should stay focused after component update', async () => {
        const dataSet1 = {
            podHealths: [pod1]
        };
        const dataSet2 = {
            podHealths: [pod1, pod2]
        };
        const { rerender } = render(
            <HealthGraph onPodFocus={noOpHandler} dataSet={dataSet1} autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);
        rerender(
            <HealthGraph onPodFocus={noOpHandler} dataSet={dataSet2} autoZoom={false}/>
        );

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, testTimeout);

    it('drag and dropped pods do not move anymore', async () => {
        const dataSet1 = {
            podHealths: [pod1]
        };
        const dataSet2 = {
            podHealths: [pod1, pod2]
        };
        const { rerender } = render(
            <HealthGraph onPodFocus={noOpHandler} dataSet={dataSet1} autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('pod')[0], { clientX: 20, clientY: 20 });
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        const oldPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);
        rerender(
            <HealthGraph onPodFocus={noOpHandler} dataSet={dataSet2} autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        const newPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);

        expect(newPod1Position).toEqual(oldPod1Position);
    }, testTimeout);

    it('pods and their labels keep same apparent size despite zoom', async () => {
        const dataSet = {
            podHealths: [pod1]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        const oldFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));

        scrollDown();
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const podScale = getScale(screen.getAllByLabelText('pod')[0]);
        const newFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));
        const fontScale = newFontSize / oldFontSize;

        expect(containerScale).toBeGreaterThan(1);
        expect(podScale).toEqual(1 / containerScale);
        expect(fontScale).toEqual(1 / containerScale);
    });

    it('zooms to fit displayed elements with autoZoom', async () => {
        const dataSet = {
            podHealths: [pod1, pod2]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={true}/>);
        patchGraphViewBox();
        patchLayersContainerBBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        await waitForTime(ZOOM_ANIMATION_DELAY + ZOOM_ANIMATION_DURATION);

        const containerScale = getScale(screen.queryByLabelText('layers container'));
        expect(containerScale).not.toEqual(1);
    });

    it('does not zoom to fit displayed elements without autoZoom', async () => {
        const dataSet = {
            podHealths: [pod1, pod2]
        };
        render(<HealthGraph onPodFocus={noOpHandler} dataSet={dataSet} autoZoom={false}/>);
        patchGraphViewBox();
        patchLayersContainerBBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        await waitForTime(ZOOM_ANIMATION_DELAY + ZOOM_ANIMATION_DURATION);

        const containerScale = getScale(screen.queryByLabelText('layers container'));
        expect(containerScale).toEqual(1);
    });
});
