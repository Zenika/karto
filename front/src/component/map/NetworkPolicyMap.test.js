import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/extend-expect';
import NetworkPolicyMap from './NetworkPolicyMap';

describe('NetworkPolicyMap component', () => {

    it('displays pods and their labels', () => {
        const noOpHandler = () => null;
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
        const noOpHandler = () => null;
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
        const noOpHandler = () => null;
        const podFocusHandler = jest.fn();
        const dataSet = {
            podIsolations: [
                { namespace: 'ns', name: 'pod1', displayName: 'ns/pod1' }
            ],
            allowedRoutes: []
        };
        render(<NetworkPolicyMap onPodFocus={podFocusHandler} onAllowedRouteFocus={noOpHandler} dataSet={dataSet}/>);

        waitFor(() => expect(screen.getByLabelText('pod').getAttribute('x')).not.toBeNull());
        screen.debug();
        console.log();
        // fireEvent.mouseMove();
        // expect().toHaveLength(2);
    });
});
