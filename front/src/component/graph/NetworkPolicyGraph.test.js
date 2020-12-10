import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import NetworkPolicyGraph from './NetworkPolicyGraph';
import {
    dragAndDropItem,
    getItemPosition,
    getScale,
    hoverAway,
    hoverItem,
    hoverLink,
    patchGraphViewBox,
    patchLayersContainerBBox,
    scrollDown,
    waitForItemPositionStable,
    waitForTime
} from '../utils/testutils';

describe('NetworkPolicyGraph component', () => {

    const testTimeout = 10000;
    const waitTimeout = 5000;

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
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText(pod1.displayName)).toBeInTheDocument();
        expect(screen.queryByText(pod2.displayName)).toBeInTheDocument();
    });

    it('displays allowed routes', () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);

        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('calls handler on pod focus', async () => {
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyGraph onPodFocus={mockFocusHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(pod1);
    }, testTimeout);

    it('calls handler on allowed route focus', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={mockFocusHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(mockFocusHandler).toHaveBeenCalledWith(allowedRoute1_2);
    }, testTimeout);

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
            <NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}
                                autoZoom={false}/>
        );
        rerender(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}
                                     autoZoom={false}/>);

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
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-highlight');
    });

    it('focused pods have a different appearance', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, testTimeout);

    it('focused highlighted pods have a different appearance', async () => {
        const pod2Highlighted = { ...pod2, highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2Highlighted],
            allowedRoutes: []
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded-highlight');
    }, testTimeout);

    it('focused allowed routes have a different appearance', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing a pod also focuses connected pods and allowed routes', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3, pod4],
            allowedRoutes: [allowedRoute1_2, allowedRoute3_1, allowedRoute3_4]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[3]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[2]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('focusing an allowed route also focuses source and target pods', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2, allowedRoute2_3]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    }, testTimeout);

    it('unfocusing an element should unfocus all', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[2]);
        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
    }, testTimeout);

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
            <NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}
                                autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);
        rerender(
            <NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}
                                autoZoom={false}/>
        );

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, testTimeout);

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
            <NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}
                                autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], waitTimeout);

        dragAndDropItem(screen.getAllByLabelText('pod')[0], { clientX: 20, clientY: 20 });
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], waitTimeout);
        const oldPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);
        const oldPod2Position = getItemPosition(screen.getAllByLabelText('pod')[1]);
        rerender(
            <NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}
                                autoZoom={false}/>
        );
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[1], waitTimeout);
        const newPod1Position = getItemPosition(screen.getAllByLabelText('pod')[0]);
        const newPod2Position = getItemPosition(screen.getAllByLabelText('pod')[1]);

        expect(newPod1Position).toEqual(oldPod1Position);
        expect(newPod2Position).not.toEqual(oldPod2Position);
    }, testTimeout);

    it('pods and their labels keep same apparent size despite zoom', async () => {
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
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

    it('allowed routes keep same apparent size despite zoom', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        const oldWidth = parseFloat(screen.getAllByLabelText('allowed route')[0].getAttribute('stroke-width'));

        scrollDown();
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const newWidth = parseFloat(screen.getAllByLabelText('allowed route')[0].getAttribute('stroke-width'));
        const strokeScale = newWidth / oldWidth;

        expect(containerScale).toBeGreaterThan(1);
        expect(strokeScale).toEqual(1 / containerScale);
    });

    it('zooms to fit displayed elements with autoZoom', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={true}/>);
        patchGraphViewBox();
        patchLayersContainerBBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        await waitForTime(550);

        const containerScale = getScale(screen.queryByLabelText('layers container'));
        expect(containerScale).not.toEqual(1);
    });

    it('does not zoom to fit displayed elements without autoZoom', async () => {
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1_2]
        };
        render(<NetworkPolicyGraph onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}
                                   autoZoom={false}/>);
        patchGraphViewBox();
        patchLayersContainerBBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], waitTimeout);
        await waitForTime(550);

        const containerScale = getScale(screen.queryByLabelText('layers container'));
        expect(containerScale).toEqual(1);
    });
});
