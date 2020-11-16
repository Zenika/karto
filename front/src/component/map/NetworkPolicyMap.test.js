import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import NetworkPolicyMap from './NetworkPolicyMap';

describe('NetworkPolicyMap component', () => {

    const noOpHandler = () => null;

    function waitForSimulationStart() {
        return waitFor(() => expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('transform'));
    }

    function waitForSimulationEnd() {
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    it('displays pods and their labels', () => {
        const dataSet = {
            podIsolations: [
                { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' },
                { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' }
            ],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('pod')).toHaveLength(2);
        expect(screen.queryByText('ns/pod1')).toBeInTheDocument();
        expect(screen.queryByText('ns/pod2')).toBeInTheDocument();
    });

    it('displays allowed routes', () => {
        const dataSet = {
            podIsolations: [
                { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' },
                { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' },
                { namespace: 'ns', name: 'pod3', displayName: 'ns/pod3' }
            ],
            allowedRoutes: [
                { sourcePod: { namespace: 'ns', name: 'pod1' }, targetPod: { namespace: 'ns', name: 'pod2' } },
                { sourcePod: { namespace: 'ns', name: 'pod2' }, targetPod: { namespace: 'ns', name: 'pod3' } }
            ]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        expect(screen.queryAllByLabelText('allowed route')).toHaveLength(2);
    });

    it('calls handler on pod focus', () => {
        const focusHandler = jest.fn();
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const dataSet = {
            podIsolations: [pod1],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={focusHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        fireEvent.mouseMove(screen.getByLabelText('pod'));

        expect(focusHandler).toHaveBeenCalledWith(pod1);
    });

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
        await waitForSimulationStart();

        fireEvent.mouseMove(screen.getByLabelText('allowed route'));

        expect(focusHandler).toHaveBeenCalledWith(allowedRoute);
    });

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

    it('focused pods have a different appearance', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        fireEvent.mouseMove(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded');
    });

    it('focused highlighted pods have a different appearance', () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2', highlighted: true };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        waitForSimulationEnd();

        fireEvent.mouseMove(screen.getAllByLabelText('pod')[0]);

        expect(screen.getAllByLabelText('pod')[0]).toHaveAttribute('class', 'item');
        expect(screen.getAllByLabelText('pod')[1]).toHaveAttribute('class', 'item-faded-highlight');
    });

    it('focused allowed routes have a different appearance', async () => {
        const pod1 = { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' };
        const pod2 = { namespace: 'ns', name: 'pod2', displayName: 'ns/pod2' };
        const allowedRoute1 = {
            sourcePod: { namespace: 'ns', name: 'pod2' },
            targetPod: { namespace: 'ns', name: 'pod1' }
        };
        const allowedRoute2 = {
            sourcePod: { namespace: 'ns', name: 'pod1' },
            targetPod: { namespace: 'ns', name: 'pod2' }
        };
        const dataSet = {
            podIsolations: [pod1, pod2],
            allowedRoutes: [allowedRoute1, allowedRoute2]
        };
        render(<NetworkPolicyMap onPodFocus={noOpHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);
        await waitForSimulationEnd();

        fireEvent.mouseMove(screen.getAllByLabelText('allowed route')[0]);

        expect(screen.getAllByLabelText('allowed route')[0]).toHaveAttribute('class', 'link');
        expect(screen.getAllByLabelText('allowed route')[1]).toHaveAttribute('class', 'link-faded');
    });
});
