import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import NetworkPolicyMap from './NetworkPolicyMap';
import {
    dragAndDropItem,
    getItemPosition,
    getScale,
    hoverAway,
    hoverItem,
    hoverLink,
    patchGraphViewBox,
    waitForItemPositionStable
} from '../utils/testutils';

describe('NetworkPolicyMap component', () => {

    const timeout = 10000;

    const noOpHandler = () => null;
    let mockFocusHandler;
    let pod1, pod2, pod3, pod4;
    let allowedRoute1_2, allowedRoute2_3, allowedRoute3_1, allowedRoute3_4;

    beforeEach(() => {
        mockFocusHandler = jest.fn();
        pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        pod4 = { namespace: 'ns', name: 'pod4', displayName: 'ns/pod4' };
        allowedRoute1_2 = {
            sourcePod: { namespace: 'ns', name: 'pod1' }, targetPod: { namespace: 'ns', name: 'pod2' }
        };
        allowedRoute2_3 = {
            sourcePod: { namespace: 'ns', name: 'pod2' }, targetPod: { namespace: 'ns', name: 'pod3' }
        };
        allowedRoute3_1 = {
            sourcePod: { namespace: 'ns', name: 'pod3' }, targetPod: { namespace: 'ns', name: 'pod1' }
        };
        allowedRoute3_4 = {
            sourcePod: { namespace: 'ns', name: 'pod3' }, targetPod: { namespace: 'ns', name: 'pod4' }
        };
    });

    it('displays pods and their labels', () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText(pod1.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).toBeInTheDocument();
    });

    it('displays allowed routes', () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('calls handler on pod focus', async () => {
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={mockFocusHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(pod1);
    }, timeout);

    it('calls handler on allowed route focus', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={mockFocusHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(allowedRoute1_2);
    }, timeout);

    it('updates local state properly', () => {
        const dataSet1 = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        const pod1WithoutNamespaceDisplay = { ...pod1, displayName: 'pod1' };
        const pod2WithoutNamespaceDisplay = { ...pod2, displayName: 'pod2' };
        const pod3WithoutNamespaceDisplay = { ...pod3, displayName: 'pod3' };
        const dataSet2 = {
            podIsolations: [pod1WithoutNamespaceDisplay, pod2WithoutNamespaceDisplay, pod3WithoutNamespaceDisplay],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };

        const { rerender } = render(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}/>
        );
        rerender(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(3);
        expect(screen.queryByText(pod1.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).not.toBeInTheDocument();
        expect(screen.queryByText(pod1WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod3WithoutNamespaceDisplay.displayName)).toBeInTheDocument();
        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('highlighted pods have a different appearance', () => {
        const pod2Highlighted = { ...pod2, highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2Highlighted],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-highlight');
    });

    it('focused pods have a different appearance', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, timeout);

    it('focused highlighted pods have a different appearance', async () => {
        const pod2Highlighted = { ...pod2, highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2Highlighted],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded-highlight');
    }, timeout);

    it('focused allowed routes have a different appearance', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a pod also focuses connected pods and allowed routes', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3, pod4],
            allowedRoutes: [allowedRoute1_2, allowedRoute3_1, allowedRoute3_4]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[3]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[2]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing an allowed route also focuses source and target pods', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('unfocusing an element should unfocus all', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[2]);
        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
    }, timeout);

    it('focused element should stay focused after component update', async () => {
        const dataSet1 = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        const dataSet2 = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: []
        };
        const { rerender } = render(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);
        rerender(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}/>
        );

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, timeout);

    it('drag and dropped pods do not move anymore', async () => {
        const dataSet1 = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        const dataSet2 = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: []
        };
        const { rerender } = render(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], timeout);

        dragAndDropItem(screen.getAllByLabelText('pod')[0], { clientX: 20, clientY: 20 });
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], timeout);
        const oldPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);
        const oldPod2Position = getItemPosition(screen.getAllByLabelText('pod')[1]);
        rerender(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], timeout);
        const newPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);
        const newPod2Position = getItemPosition(screen.getAllByLabelText('pod')[1]);

        expect(newPod1Position).toEqual(oldPod1Position);
        expect(newPod2Position).not.toEqual(oldPod2Position);
    }, timeout);

    it('pods and their labels keep same apparent size despite zoom', async () => {
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);
        const oldFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));

        fireEvent.wheel(screen.getByLabelText('layers container'), { deltaY: -100 }); // scroll down
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const podScale = getScale(screen.getAllByLabelText('pod')[0]);
        const newFontSize = parseFloat(screen.getByText(pod1.displayName).getAttribute('font-size'));
        const fontScale = newFontSize / oldFontSize;

        expect(containerScale).toBeGreaterThan(1);
        expect(podScale).toEqual(1 / containerScale);
        expect(fontScale).toEqual(1 / containerScale);
    });

    it('allowed routes keep same apparent size despite zoom', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);
        const oldWidth = parseFloat(screen.getAllByLabelText('allowed route')[0].getAttribute('stroke-width'));

        fireEvent.wheel(screen.getByLabelText('layers container'), { deltaY: -100 }); // scroll down
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const newWidth = parseFloat(screen.getAllByLabelText('allowed route')[0].getAttribute('stroke-width'));
        const strokeScale = newWidth / oldWidth;

        expect(containerScale).toBeGreaterThan(1);
        expect(strokeScale).toEqual(1 / containerScale);
    });
});
