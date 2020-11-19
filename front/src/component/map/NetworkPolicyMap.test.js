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

    it('displays pods and their labels', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText('ns/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns/pod2')).toBeInTheDocument();
    });

    it('displays allowed routes', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const allowedRoute2 = {
            sourcePod: { namespace: 'ns', name: 'pod2' },
            targetPod: { namespace: 'ns', name: 'pod3' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1, allowedRoute2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('calls handler on pod focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={focusHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(focusHandler).toHaveBeenCalledWith(pod1);
    }, timeout);

    it('calls handler on allowed route focus', async () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const allowedRoute = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={focusHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(focusHandler).toHaveBeenCalledWith(allowedRoute);
    }, timeout);

    it('updates local state properly', () => {
        const dataSet1 = {
            podIsolations: [
                { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' },
                { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' }
            ],
            allowedRoutes: [
                { sourcePod: { namespace: 'ns', name: 'pod1' }, targetPod: { namespace: 'ns', name: 'pod2' } }
            ]
        };
        const dataSet2 = {
            podIsolations: [
                { namespace: 'ns', name: 'pod1', displayName: 'pod1' },
                { namespace: 'ns', name: 'pod2', displayName: 'pod2' },
                { namespace: 'ns', name: 'pod3', displayName: 'pod3' }
            ],
            allowedRoutes: [
                { sourcePod: { namespace: 'ns', name: 'pod1' }, targetPod: { namespace: 'ns', name: 'pod2' } },
                { sourcePod: { namespace: 'ns', name: 'pod2' }, targetPod: { namespace: 'ns', name: 'pod3' } }
            ]
        };

        const { rerender } = render(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet1}/>
        );

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText('ns/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns/pod2')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(1);

        rerender(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(3);
        expect(screen.queryByText('ns/pod1')).not.toBeInTheDocument();
        expect(screen.queryByText('ns/pod2')).not.toBeInTheDocument();
        expect(screen.queryByText('pod1')).toBeInTheDocument();
        expect(screen.queryByText('pod2')).toBeInTheDocument();
        expect(screen.queryByText('pod3')).toBeInTheDocument();
        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('highlighted pods have a different appearance', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2', highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-highlight');
    });

    it('focused pods have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
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
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2', highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded-highlight');
    }, timeout);

    it('focused allowed routes have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const allowedRoute2 = {
            sourcePod: { namespace: 'ns', name: 'pod2' },
            targetPod: { namespace: 'ns', name: 'pod3' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1, allowedRoute2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverLink(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    }, timeout);

    it('focusing a pod also focuses connected pods and allowed routes', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const pod4 = { namespace: 'ns', name: 'pod4', displayName: 'ns/pod4' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const allowedRoute2 = {
            sourcePod: { namespace: 'ns', name: 'pod3' },
            targetPod: { namespace: 'ns', name: 'pod1' }
        };
        const allowedRoute3 = {
            sourcePod: { namespace: 'ns', name: 'pod3' },
            targetPod: { namespace: 'ns', name: 'pod4' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2, pod3, pod4],
            allowedRoutes: [allowedRoute1, allowedRoute2, allowedRoute3]
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
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const allowedRoute2 = {
            sourcePod: { namespace: 'ns', name: 'pod2' },
            targetPod: { namespace: 'ns', name: 'pod3' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1, allowedRoute2]
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
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2, pod3],
            allowedRoutes: [allowedRoute1]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);

        hoverItem(screen.getAllByLabelText('pod')[2]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link-faded');

        hoverAway();

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[2]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
    }, timeout);

    it('focused element should stay focused after component update', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
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

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');

        rerender(
            <NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet2}/>
        );

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    }, timeout);

    it('drag and dropped pods do not move anymore', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const pod3 = { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' };
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
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        patchGraphViewBox();
        await waitForItemPositionStable(screen.getAllByLabelText('pod')[0], timeout);
        const oldFontSize = parseFloat(screen.getByText('ns/pod1').getAttribute('font-size'));

        fireEvent.wheel(screen.getByLabelText('layers container'), { deltaY: -100 }); // scroll down
        const containerScale = getScale(screen.queryByLabelText('layers container'));
        const podScale = getScale(screen.getAllByLabelText('pod')[0]);
        const newFontSize = parseFloat(screen.getByText('ns/pod1').getAttribute('font-size'));
        const fontScale = newFontSize / oldFontSize;

        expect(containerScale).toBeGreaterThan(1);
        expect(podScale).toEqual(1 / containerScale);
        expect(fontScale).toEqual(1 / containerScale);
    });

    it('allowed routes keep same apparent size despite zoom', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1]
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
